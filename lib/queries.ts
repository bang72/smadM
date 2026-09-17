import { createClient } from "@/lib/supabase/server";

export const postSelect = `
  id, author_id, body, kind, status, visibility, allow_comments, content_warning, edited_at, circle_id, created_at, updated_at,
  profiles!posts_author_id_fkey(*),
  media:post_media(id, post_id, url, storage_path, media_type, width, height, position, alt_text, file_size),
  likes(user_id), bookmarks(user_id), comments(count)
`;

async function signPrivatePostMedia<T extends { visibility: string; media?: Array<{ storage_path: string; url: string }> }>(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, rows: T[]): Promise<T[]> {
  const posts = rows;
  const items = posts.flatMap((post) => post.visibility === "public" ? [] : (post.media || []));
  if (!items.length) return rows;
  const { data } = await supabase.storage.from("private-media").createSignedUrls(items.map((item) => item.storage_path), 3600);
  const urls = new Map((data || []).map((item) => [item.path, item.signedUrl]));
  items.forEach((item) => { item.url = urls.get(item.storage_path) || ""; });
  return rows;
}

async function signPrivateStories<T extends { audience?: string; storage_path: string; media_url: string }>(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, rows: T[]): Promise<T[]> {
  const stories = rows;
  const items = stories.filter((story) => story.audience && story.audience !== "public");
  if (!items.length) return rows;
  const { data } = await supabase.storage.from("private-media").createSignedUrls(items.map((item) => item.storage_path), 3600);
  const urls = new Map((data || []).map((item) => [item.path, item.signedUrl]));
  items.forEach((item) => { item.media_url = urls.get(item.storage_path) || ""; });
  return rows;
}

export async function getViewer() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, profile: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { supabase, user, profile };
}

export async function getFeed(userId: string, before?: string) {
  const supabase = await createClient(); if (!supabase) return [];
  const [{ data: relations }, { data: muted }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase.from("mutes").select("muted_id").eq("muter_id", userId),
  ]);
  const mutedIds = new Set((muted || []).map((item) => item.muted_id));
  const authorIds = [userId, ...(relations || []).map((item) => item.following_id)].filter((id) => !mutedIds.has(id));
  let request = supabase.from("posts").select(postSelect).in("author_id", authorIds).eq("status", "active").order("created_at", { ascending: false }).limit(20);
  if (before) request = request.lt("created_at", before);
  const { data } = await request;
  return signPrivatePostMedia(supabase, data || []);
}

export async function getExplore(before?: string, query?: string) {
  const supabase = await createClient(); if (!supabase) return [];
  let request = supabase.from("posts").select(postSelect).eq("status", "active").eq("visibility", "public").order("created_at", { ascending: false }).limit(24);
  const clean = query?.trim().replace(/[%(),]/g, "");
  if (clean) request = request.ilike("body", `%${clean}%`);
  if (before) request = request.lt("created_at", before);
  const { data } = await request;
  return data || [];
}

export async function getSaved(userId: string) {
  const supabase = await createClient(); if (!supabase) return [];
  const { data } = await supabase.from("posts").select(postSelect).eq("bookmarks.user_id", userId).eq("status", "active").order("created_at", { ascending: false });
  return signPrivatePostMedia(supabase, data || []);
}

export async function getProfileByUsername(username: string) {
  const supabase = await createClient(); if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).neq("account_status", "banned").maybeSingle();
  return data;
}

export async function getProfilePage(profileId: string, viewerId: string) {
  const supabase = await createClient();
  if (!supabase) return { posts: [], followers: 0, following: 0, isFollowing: false, isRequested: false };
  const [posts, followers, following, relation, request] = await Promise.all([
    supabase.from("posts").select(postSelect).eq("author_id", profileId).eq("status", "active").order("created_at", { ascending: false }),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profileId),
    supabase.from("follows").select("follower_id").eq("follower_id", viewerId).eq("following_id", profileId).maybeSingle(),
    supabase.from("follow_requests").select("requester_id").eq("requester_id", viewerId).eq("target_id", profileId).eq("status", "pending").maybeSingle(),
  ]);
  return { posts: await signPrivatePostMedia(supabase, posts.data || []), followers: followers.count || 0, following: following.count || 0, isFollowing: Boolean(relation.data), isRequested: Boolean(request.data) };
}

export async function searchProfiles(query: string, viewerId: string) {
  const supabase = await createClient(); if (!supabase) return [];
  let request = supabase.from("profiles").select("*").neq("id", viewerId).neq("account_status", "banned").eq("discoverable", true).limit(12);
  const clean = query.trim().replace(/[%(),]/g, "");
  if (clean) request = request.or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`);
  const { data } = await request.order("created_at", { ascending: false });
  return data || [];
}

export async function getFollowingIds(userId: string) {
  const supabase = await createClient(); if (!supabase) return [];
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  return (data || []).map((item) => item.following_id);
}

export async function getActiveStories() {
  const supabase = await createClient(); if (!supabase) return [];
  const { data } = await supabase.from("stories").select(`id, user_id, caption, media_url, storage_path, media_type, accent, audience, created_at, expires_at, profiles!stories_user_id_fkey(*), story_views(count)`).eq("status", "active").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(40);
  return signPrivateStories(supabase, data || []);
}

export async function getPost(postId: string) {
  const supabase = await createClient(); if (!supabase) return null;
  const { data } = await supabase.from("posts").select(postSelect).eq("id", postId).eq("status", "active").maybeSingle();
  if (!data) return null;
  return (await signPrivatePostMedia(supabase, [data]))[0];
}

export async function getComments(postId: string) {
  const supabase = await createClient(); if (!supabase) return [];
  const { data } = await supabase.from("comments").select(`id, body, created_at, parent_id, status, profiles!comments_user_id_fkey(id, username, display_name, avatar_url)`).eq("post_id", postId).eq("status", "active").order("created_at", { ascending: true });
  return data || [];
}

export async function getConnections(profileId: string, type: "followers" | "following") {
  const supabase = await createClient(); if (!supabase) return [];
  const field = type === "followers" ? "follower_id" : "following_id";
  const match = type === "followers" ? "following_id" : "follower_id";
  const { data } = await supabase.from("follows").select(`${field}, profiles!follows_${field}_fkey(*)`).eq(match, profileId).order("created_at", { ascending: false }).limit(100);
  return data || [];
}

export async function getSafetyState(viewerId: string, targetId: string) {
  const supabase = await createClient(); if (!supabase) return { blocked: false, muted: false };
  const [block, mute] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", viewerId).eq("blocked_id", targetId).maybeSingle(),
    supabase.from("mutes").select("muted_id").eq("muter_id", viewerId).eq("muted_id", targetId).maybeSingle(),
  ]);
  return { blocked: Boolean(block.data), muted: Boolean(mute.data) };
}

export async function getConversations(userId: string) {
  const supabase = await createClient(); if (!supabase) return [];
  const { data: memberships } = await supabase.from("conversation_members").select("conversation_id").eq("profile_id", userId);
  const ids = (memberships || []).map((item) => item.conversation_id); if (!ids.length) return [];
  const { data } = await supabase.from("conversations").select(`id, updated_at, conversation_members(profile_id, profiles(*)), messages(id, body, created_at, sender_id)`).in("id", ids).order("updated_at", { ascending: false }).order("created_at", { referencedTable: "messages", ascending: false }).limit(1, { referencedTable: "messages" }).limit(30);
  return data || [];
}

export async function getConversation(conversationId: string) {
  const supabase = await createClient(); if (!supabase) return null;
  const { data } = await supabase.from("conversations").select(`id, updated_at, conversation_members(profile_id, profiles(*)), messages(id, body, created_at, sender_id)`).eq("id", conversationId).order("created_at", { referencedTable: "messages", ascending: false }).limit(100, { referencedTable: "messages" }).maybeSingle();
  if (data) await supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId);
  return data;
}

export async function getCloseFriendIds(userId:string){const supabase=await createClient();if(!supabase)return[];const {data:circle}=await supabase.from("circles").select("id").eq("owner_id",userId).ilike("name","Teman Dekat").maybeSingle();if(!circle)return[];const {data}=await supabase.from("circle_members").select("profile_id").eq("circle_id",circle.id);return(data||[]).map(item=>item.profile_id)}
