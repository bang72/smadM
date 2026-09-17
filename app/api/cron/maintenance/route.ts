import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function listAllPaths(client: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return [];
  const paths: string[] = [];
  for (const item of data) {
    const path = `${prefix}/${item.name}`;
    if (item.id) paths.push(path);
    else paths.push(...await listAllPaths(client, bucket, path));
  }
  return paths;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Server storage belum dikonfigurasi." }, { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date().toISOString();

  const { data: expiredStories, error: storyReadError } = await admin.from("stories").select("id,storage_path,media_url").lt("expires_at", now);
  if (storyReadError) return NextResponse.json({ error: storyReadError.message }, { status: 500 });
  const publicStoryPaths = (expiredStories || []).filter((story) => story.media_url).map((story) => story.storage_path);
  const privateStoryPaths = (expiredStories || []).filter((story) => !story.media_url).map((story) => story.storage_path);
  if (publicStoryPaths.length) await admin.storage.from("media").remove(publicStoryPaths);
  if (privateStoryPaths.length) await admin.storage.from("private-media").remove(privateStoryPaths);
  if (expiredStories?.length) await admin.from("stories").delete().in("id", expiredStories.map((story) => story.id));

  const { data: dueAccounts, error: accountReadError } = await admin.from("account_deletion_requests").select("profile_id").is("cancelled_at", null).lte("execute_after", now);
  if (accountReadError) return NextResponse.json({ error: accountReadError.message }, { status: 500 });
  const deleted: string[] = [];
  const failures: Array<{ id: string; reason: string }> = [];
  for (const account of dueAccounts || []) {
    try {
      for (const bucket of ["media", "private-media"]) {
        const paths = await listAllPaths(admin, bucket, account.profile_id);
        for (let index = 0; index < paths.length; index += 100) await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
      }
      const { error } = await admin.auth.admin.deleteUser(account.profile_id);
      if (error) throw error;
      deleted.push(account.profile_id);
    } catch (error) {
      failures.push({ id: account.profile_id, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  await admin.from("action_rate_limits").delete().lt("window_start", new Date(Date.now() - 2 * 86400000).toISOString());
  return NextResponse.json({ expiredStories: expiredStories?.length || 0, deletedAccounts: deleted.length, failures });
}
