"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAuthenticated() {
  const supabase = await createClient();
  if (!supabase) throw new Error("Backend belum dikonfigurasi.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Silakan masuk kembali.");
  const { data: profile } = await supabase.from("profiles").select("account_status, role, username").eq("id", user.id).single();
  return { supabase, user, profile };
}

async function requireUser() {
  const context = await requireAuthenticated();
  const { profile } = context;
  if (profile?.account_status !== "active") throw new Error("Akun sedang dibatasi. Hubungi admin LOKA.");
  return context;
}

function assertUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new Error("ID tidak valid.");
}

async function enforceLimit(supabase: Awaited<ReturnType<typeof createClient>>, action: string, max: number, seconds: number) {
  if (!supabase) throw new Error("Backend belum dikonfigurasi.");
  const { data, error } = await supabase.rpc("consume_action_limit", { action_name: action, max_actions: max, window_seconds: seconds });
  if (error) throw error;
  if (!data) throw new Error("Terlalu banyak aktivitas. Beri ruang sebentar lalu coba lagi.");
}

export async function createPost(input: {
  id?: string;
  body: string;
  kind?: "note" | "moment" | "sound" | "question";
  visibility?: "public" | "followers" | "private";
  allowComments?: boolean;
  contentWarning?: string;
  media: { url: string; storagePath: string; mediaType: "image" | "video" | "audio"; altText?: string; fileSize?: number }[];
}) {
  const { supabase, user } = await requireUser();
  await enforceLimit(supabase, "post", 10, 3600);
  const body = input.body.trim().slice(0, 1200);
  if (input.id) assertUuid(input.id);
  if (!body && input.media.length === 0) throw new Error("Postingan masih kosong.");

  const { data: post, error } = await supabase
    .from("posts")
    .insert({ ...(input.id ? { id: input.id } : {}), author_id: user.id, body, kind: input.kind || "note", visibility: input.visibility || "public", allow_comments: input.allowComments !== false, content_warning: input.contentWarning?.trim().slice(0, 120) || null })
    .select("id")
    .single();
  if (error) throw error;

  if (input.media.length) {
    const { error: mediaError } = await supabase.from("post_media").insert(
      input.media.slice(0, 4).map((item, position) => ({
        post_id: post.id,
        url: item.url,
        storage_path: item.storagePath,
        media_type: item.mediaType,
        alt_text: item.altText?.trim().slice(0, 300) || "",
        file_size: item.fileSize || null,
        position,
      })),
    );
    if (mediaError) throw mediaError;
  }
  revalidatePath("/feed");
  revalidatePath("/explore");
  return { id: post.id };
}

export async function toggleLike(postId: string) {
  const { supabase, user } = await requireUser();
  assertUuid(postId); await enforceLimit(supabase, "like", 120, 3600);
  const { data } = await supabase.from("likes").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  const result = data
    ? await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id)
    : await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
  if (result.error) throw result.error;
  revalidatePath("/feed");
  revalidatePath(`/p/${postId}`);
  return { liked: !data };
}

export async function toggleBookmark(postId: string) {
  const { supabase, user } = await requireUser();
  assertUuid(postId);
  const { data } = await supabase.from("bookmarks").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
  const result = data
    ? await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", user.id)
    : await supabase.from("bookmarks").insert({ post_id: postId, user_id: user.id });
  if (result.error) throw result.error;
  revalidatePath("/saved");
  revalidatePath(`/p/${postId}`);
  return { bookmarked: !data };
}

export async function addComment(postId: string, body: string, parentId?: string) {
  const { supabase, user } = await requireUser();
  assertUuid(postId); if (parentId) assertUuid(parentId); await enforceLimit(supabase, "comment", 40, 3600);
  const clean = body.trim().slice(0, 500);
  if (!clean) throw new Error("Komentar kosong.");
  const { data: post } = await supabase.from("posts").select("allow_comments,status").eq("id", postId).maybeSingle();
  if (!post?.allow_comments || post.status !== "active") throw new Error("Tanggapan dinonaktifkan untuk jejak ini.");
  const { error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, body: clean, parent_id: parentId || null });
  if (error) throw error;
  revalidatePath("/feed");
  revalidatePath(`/p/${postId}`);
}

export async function updateProfile(input: { displayName: string; username: string; bio: string; avatarUrl?: string; website?: string; location?: string }) {
  const { supabase, user } = await requireUser();
  const username = input.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (username.length < 3) throw new Error("Username minimal 3 karakter.");
  const { error } = await supabase.from("profiles").update({
    display_name: input.displayName.trim().slice(0, 40),
    username,
    bio: input.bio.trim().slice(0, 160),
    website: input.website?.trim().slice(0, 160) || null,
    location: input.location?.trim().slice(0, 60) || null,
    ...(input.avatarUrl ? { avatar_url: input.avatarUrl } : {}),
  }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/profile");
  revalidatePath(`/u/${username}`);
}

export async function toggleFollow(targetId: string) {
  const { supabase, user } = await requireUser(); assertUuid(targetId); await enforceLimit(supabase, "follow", 60, 3600);
  if (targetId === user.id) throw new Error("Kamu tidak bisa mengikuti diri sendiri.");
  const { data, error } = await supabase.rpc("follow_or_request", { target_uuid: targetId }); if (error) throw error;
  revalidatePath("/feed"); revalidatePath("/explore"); revalidatePath("/u", "layout");
  return { state: data as "followed" | "unfollowed" | "requested" };
}

export async function createStory(input: { id?: string; caption: string; mediaUrl: string; storagePath: string; mediaType: "image" | "video" | "audio"; accent: string; audience?: "public" | "followers" | "close_friends" }) {
  const { supabase, user } = await requireUser();
  await enforceLimit(supabase, "story", 20, 86400);
  if (input.id) assertUuid(input.id);
  const { error } = await supabase.from("stories").insert({
    ...(input.id ? { id: input.id } : {}), user_id: user.id, caption: input.caption.trim().slice(0, 180), media_url: input.mediaUrl,
    storage_path: input.storagePath, media_type: input.mediaType, accent: input.accent.slice(0, 24), audience: input.audience || "public",
  });
  if (error) throw error;
  revalidatePath("/feed");
}

export async function deleteStory(storyId: string) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("stories").select("storage_path").eq("id", storyId).eq("user_id", user.id).maybeSingle();
  const { error } = await supabase.from("stories").delete().eq("id", storyId).eq("user_id", user.id);
  if (error) throw error;
  if (data?.storage_path) await Promise.all([supabase.storage.from("media").remove([data.storage_path]), supabase.storage.from("private-media").remove([data.storage_path])]);
  revalidatePath("/feed");
}

export async function reportContent(input: { targetType: "post" | "profile"; targetId: string; reason: string; details?: string }) {
  const { supabase, user } = await requireUser();
  assertUuid(input.targetId); await enforceLimit(supabase, "report", 10, 86400);
  const allowed = ["spam", "harassment", "hate", "nudity", "violence", "misinformation", "other"];
  if (!allowed.includes(input.reason)) throw new Error("Alasan laporan tidak valid.");
  const targetTable = input.targetType === "post" ? "posts" : "profiles";
  const { data: target } = await supabase.from(targetTable).select(input.targetType === "post" ? "id,body,author_id,created_at" : "id,username,display_name,bio").eq("id", input.targetId).maybeSingle();
  if (!target) throw new Error("Konten yang dilaporkan tidak ditemukan.");
  const { error } = await supabase.from("reports").insert({ reporter_id: user.id, target_type: input.targetType, target_id: input.targetId, reason: input.reason, details: input.details?.trim().slice(0, 500) || "", snapshot: target, priority: ["violence","hate","nudity"].includes(input.reason) ? 1 : 2 });
  if (error?.code === "23505") throw new Error("Konten ini sudah pernah kamu laporkan.");
  if (error) throw error;
}

async function requireAdmin() {
  const context = await requireUser();
  if (context.profile?.role !== "admin") throw new Error("Akses admin diperlukan.");
  return context;
}

export async function resolveReport(reportId: string, resolution: "resolved" | "dismissed") {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_resolve_report", { report_uuid: reportId, resolution_value: resolution });
  if (error) throw error;
  revalidatePath("/admin");
}

export async function moderatePost(postId: string, status: "active" | "hidden" | "removed") {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_moderate_post", { post_uuid: postId, status_value: status });
  if (error) throw error;
  revalidatePath("/admin"); revalidatePath("/feed"); revalidatePath("/explore");
}

export async function setAccountStatus(profileId: string, status: "active" | "suspended" | "banned") {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_account_status", { profile_uuid: profileId, status_value: status });
  if (error) throw error;
  revalidatePath("/admin");
}

export async function warnProfile(profileId: string, note = "Pelanggaran Pedoman Komunitas") {
  const { supabase } = await requireAdmin(); assertUuid(profileId);
  const { error } = await supabase.rpc("admin_warn_profile", { profile_uuid: profileId, note_value: note.slice(0,500) }); if (error) throw error; revalidatePath("/admin");
}

export async function reviewAppeal(appealId: string, decision: "accepted" | "rejected") {
  const { supabase } = await requireAdmin(); assertUuid(appealId);
  const { error } = await supabase.rpc("admin_review_appeal", { appeal_uuid: appealId, decision }); if (error) throw error; revalidatePath("/admin");
}

export async function editPost(postId: string, input: { body: string; allowComments: boolean; contentWarning?: string }) {
  const { supabase, user } = await requireUser(); assertUuid(postId);
  const body = input.body.trim().slice(0, 1200);
  const { error } = await supabase.from("posts").update({ body, allow_comments: input.allowComments, content_warning: input.contentWarning?.trim().slice(0,120) || null, edited_at: new Date().toISOString() }).eq("id", postId).eq("author_id", user.id);
  if (error) throw error; revalidatePath("/feed"); revalidatePath(`/p/${postId}`); revalidatePath("/profile");
}

export async function deleteComment(commentId: string, postId: string) {
  const { supabase, user } = await requireUser(); assertUuid(commentId); assertUuid(postId);
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id); if (error) throw error;
  revalidatePath(`/p/${postId}`);
}

export async function toggleBlock(targetId: string) {
  const { supabase } = await requireUser(); assertUuid(targetId);
  const { data, error } = await supabase.rpc("toggle_block", { target_uuid: targetId }); if (error) throw error;
  revalidatePath("/feed"); revalidatePath("/explore"); revalidatePath("/u", "layout"); return { blocked: Boolean(data) };
}

export async function toggleMute(targetId: string) {
  const { supabase, user } = await requireUser(); assertUuid(targetId);
  const { data } = await supabase.from("mutes").select("muted_id").eq("muter_id", user.id).eq("muted_id", targetId).maybeSingle();
  const result = data ? await supabase.from("mutes").delete().eq("muter_id", user.id).eq("muted_id", targetId) : await supabase.from("mutes").insert({ muter_id: user.id, muted_id: targetId });
  if (result.error) throw result.error; revalidatePath("/feed"); return { muted: !data };
}

export async function respondFollowRequest(requesterId: string, accept: boolean) {
  const { supabase } = await requireUser(); assertUuid(requesterId);
  const { error } = await supabase.rpc("respond_follow_request", { requester_uuid: requesterId, accept_request: accept }); if (error) throw error;
  revalidatePath("/notifications"); revalidatePath("/profile");
}

export async function removeFollower(followerId: string) {
  const { supabase, user } = await requireUser(); assertUuid(followerId);
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", user.id); if (error) throw error;
  revalidatePath("/profile"); revalidatePath("/connections");
}

export async function updatePrivacy(input: { privateAccount: boolean; discoverable: boolean; hideCounts: boolean; allowMessages: "everyone" | "following" | "none" }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ private_account: input.privateAccount, discoverable: input.discoverable, hide_counts: input.hideCounts, allow_messages: input.allowMessages }).eq("id", user.id);
  if (error) throw error; revalidatePath("/settings"); revalidatePath("/profile");
}

export async function updateNotificationPreferences(input: { like: boolean; comment: boolean; follow: boolean; message: boolean }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ notification_preferences: input }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/settings");
}

export async function toggleCloseFriend(profileId: string) {
  const { supabase, user } = await requireUser(); assertUuid(profileId);
  let { data: circle } = await supabase.from("circles").select("id").eq("owner_id",user.id).ilike("name","Teman Dekat").maybeSingle();
  if(!circle){const created=await supabase.from("circles").insert({owner_id:user.id,name:"Teman Dekat",color:"lime"}).select("id").single();if(created.error)throw created.error;circle=created.data;}
  const {data:member}=await supabase.from("circle_members").select("profile_id").eq("circle_id",circle.id).eq("profile_id",profileId).maybeSingle();
  const result=member?await supabase.from("circle_members").delete().eq("circle_id",circle.id).eq("profile_id",profileId):await supabase.from("circle_members").insert({circle_id:circle.id,profile_id:profileId});if(result.error)throw result.error;revalidatePath("/settings");return{added:!member};
}

export async function markNotificationsRead() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).is("read_at", null); if (error) throw error;
  revalidatePath("/notifications");
}

export async function startConversation(targetId: string) {
  const { supabase } = await requireUser(); assertUuid(targetId);
  const { data, error } = await supabase.rpc("start_conversation", { target_uuid: targetId }); if (error) throw error;
  redirect(`/messages/${data}`);
}

export async function sendMessage(conversationId: string, body: string) {
  const { supabase, user } = await requireUser(); assertUuid(conversationId); await enforceLimit(supabase, "message", 120, 3600);
  const clean = body.trim().slice(0, 2000); if (!clean) throw new Error("Pesan kosong.");
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body: clean }); if (error) throw error;
  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  revalidatePath(`/messages/${conversationId}`); revalidatePath("/messages");
}

export async function requestAccountDeletion() {
  const { supabase, user } = await requireUser();
  const now = new Date().toISOString();
  const { error } = await supabase.from("account_deletion_requests").upsert({ profile_id: user.id, requested_at: now, execute_after: new Date(Date.now()+14*86400000).toISOString(), cancelled_at: null }); if (error) throw error;
  await supabase.from("profiles").update({ deletion_requested_at: now }).eq("id", user.id);
  await supabase.auth.signOut(); redirect("/");
}

export async function cancelAccountDeletion() {
  const { supabase, user } = await requireUser();
  await supabase.from("account_deletion_requests").update({ cancelled_at: new Date().toISOString() }).eq("profile_id", user.id);
  await supabase.from("profiles").update({ deletion_requested_at: null }).eq("id", user.id); revalidatePath("/settings");
}

export async function submitAppeal(targetType: "post" | "profile" | "comment", targetId: string, reason: string) {
  const { supabase, user } = await requireAuthenticated(); assertUuid(targetId); const clean = reason.trim().slice(0,1000); if (clean.length < 10) throw new Error("Jelaskan alasan banding minimal 10 karakter.");
  const { error } = await supabase.from("appeals").insert({ appellant_id: user.id, target_type: targetType, target_id: targetId, reason: clean }); if (error) throw error;
  revalidatePath("/account-status");
}

export async function registerStoryView(storyId: string) {
  const { supabase, user } = await requireUser(); assertUuid(storyId);
  await supabase.from("story_views").upsert({ story_id: storyId, viewer_id: user.id });
}

export async function completeOnboarding(formData: FormData) {
  const { supabase, user } = await requireUser();
  const displayName = String(formData.get("displayName") || "").trim().slice(0, 40);
  const username = String(formData.get("username") || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!displayName || username.length < 3) throw new Error("Lengkapi nama dan username.");
  const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, username, bio: "" });
  if (error) throw error;
  redirect("/feed");
}

export async function deletePost(postId: string) {
  const { supabase, user } = await requireUser();
  const { data: media } = await supabase.from("post_media").select("storage_path").eq("post_id", postId);
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", user.id);
  if (error) throw error;
  const paths = (media || []).map((item) => item.storage_path);
  if (paths.length) await Promise.all([supabase.storage.from("media").remove(paths), supabase.storage.from("private-media").remove(paths)]);
  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath("/explore");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
