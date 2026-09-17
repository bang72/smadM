import Composer from "@/components/composer";
import FeedList from "@/components/feed-list";
import SectionHeader from "@/components/section-header";
import { getActiveStories, getFeed, getViewer } from "@/lib/queries";
import type { Post } from "@/lib/database.types";
import WebMcpTools from "@/components/webmcp-tools";
import StoryRail from "@/components/story-rail";
import Link from "next/link";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { user, profile } = await getViewer();
  if (!user || !profile) return null;
  const { before } = await searchParams;
  const [posts, stories] = await Promise.all([getFeed(user.id, before), getActiveStories()]);
  return <>
    <WebMcpTools />
    <SectionHeader title="Ruangmu" subtitle="Dekat, manusiawi, tanpa lomba menjadi paling ramai." />
    <StoryRail stories={stories as unknown as import("@/lib/database.types").Story[]} profile={profile} userId={user.id} />
    <Composer profile={profile} userId={user.id} />
    <FeedList posts={posts as unknown as Post[]} viewerId={user.id} hideCounts={profile.hide_counts} emptyTitle="Ruangmu masih hening" emptyText="Buat postingan pertama atau temukan orang baru di Jelajah." />
    {posts.length === 20 && <Link className="load-more" href={`/feed?before=${posts[posts.length-1].created_at}`}>Lihat jejak lebih lama</Link>}
  </>;
}
