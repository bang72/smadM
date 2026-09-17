import type { Post } from "@/lib/database.types";
import PostCard from "./post-card";
import EmptyState from "./empty-state";

export default function FeedList({ posts, viewerId, hideCounts = false, emptyTitle = "Belum ada cerita", emptyText = "Jadilah orang pertama yang membagikan sesuatu di sini." }: { posts: Post[]; viewerId: string; hideCounts?: boolean; emptyTitle?: string; emptyText?: string }) {
  if (!posts.length) return <EmptyState title={emptyTitle} text={emptyText} />;
  return <div className="feed-list">{posts.map((post) => <PostCard key={post.id} post={post} viewerId={viewerId} hideCounts={hideCounts} />)}<div className="quiet-end"><span>✦</span><strong>Kamu sudah menyusul ruang ini.</strong><p>Berhenti sebentar juga bagian dari bersosial.</p></div></div>;
}
