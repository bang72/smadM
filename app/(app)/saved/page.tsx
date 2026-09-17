import FeedList from "@/components/feed-list";
import SectionHeader from "@/components/section-header";
import { getSaved, getViewer } from "@/lib/queries";
import type { Post } from "@/lib/database.types";

export default async function SavedPage() {
  const { user, profile } = await getViewer();
  if (!user || !profile) return null;
  const posts = await getSaved(user.id);
  return <><SectionHeader title="Tersimpan" subtitle="Hanya kamu yang dapat melihat koleksi ini." /><FeedList posts={posts as unknown as Post[]} viewerId={user.id} hideCounts={profile.hide_counts} emptyTitle="Belum ada yang disimpan" emptyText="Ketuk ikon simpan pada postingan yang ingin kamu temukan lagi." /></>;
}
