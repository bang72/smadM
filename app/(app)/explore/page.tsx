import { Search } from "lucide-react";
import FeedList from "@/components/feed-list";
import PeopleCard from "@/components/people-card";
import SectionHeader from "@/components/section-header";
import { getExplore, getFollowingIds, getViewer, searchProfiles } from "@/lib/queries";
import type { Post, Profile } from "@/lib/database.types";
import Link from "next/link";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string; before?: string }> }) {
  const { user, profile: viewer } = await getViewer(); if (!user || !viewer) return null;
  const { q = "", before } = await searchParams;
  const [posts, people, following] = await Promise.all([getExplore(before, q), searchProfiles(q, user.id), getFollowingIds(user.id)]);
  return <><SectionHeader title="Temukan" subtitle="Cari manusia, bukan sekadar konten." />
    <form className="people-search"><Search size={20} /><input name="q" defaultValue={q} placeholder="Cari orang atau isi jejak" maxLength={40} /><button>Cari</button></form>
    <section className="people-section"><div className="section-minihead"><span className="eyebrow">LINGKARAN BARU</span><strong>{q ? `Hasil untuk “${q}”` : "Orang yang mungkin nyambung"}</strong></div><div className="people-grid">{(people as unknown as Profile[]).map((profile) => <PeopleCard key={profile.id} profile={profile} following={following.includes(profile.id)} />)}</div></section>
    <div className="stream-divider"><span>{q ? `Jejak tentang “${q}”` : "Jejak publik terbaru"}</span></div><FeedList posts={posts as unknown as Post[]} viewerId={user.id} hideCounts={viewer.hide_counts} />
    {posts.length === 24 && <Link className="load-more" href={`/explore?${q ? `q=${encodeURIComponent(q)}&` : ""}before=${posts[posts.length-1].created_at}`}>Temukan lebih banyak</Link>}
  </>;
}
