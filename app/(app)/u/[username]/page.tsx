import { notFound } from "next/navigation";
import { Link2, MapPin } from "lucide-react";
import FeedList from "@/components/feed-list";
import ProfileEditor from "@/components/profile-editor";
import AvatarViewer from "@/components/avatar-viewer";
import FollowButton from "@/components/follow-button";
import ReportDialog from "@/components/report-dialog";
import { getProfileByUsername, getProfilePage, getSafetyState, getViewer } from "@/lib/queries";
import SafetyMenu from "@/components/safety-menu";
import { startConversation } from "@/app/actions";
import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({params}:{params:Promise<{username:string}>}):Promise<Metadata>{const {username}=await params;const profile=await getProfileByUsername(username);if(!profile)return{title:"Profil tidak ditemukan"};return{title:`${profile.display_name} (@${profile.username})`,description:profile.bio||`Profil ${profile.display_name} di LOKA`,openGraph:{title:`${profile.display_name} di LOKA`,description:profile.bio||"Ruang sosial yang hidup",images:profile.avatar_url?[{url:profile.avatar_url,alt:`Foto profil ${profile.display_name}`}]:undefined}}}
import type { Post } from "@/lib/database.types";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params; const { user } = await getViewer(); if (!user) return null;
  const profile = await getProfileByUsername(username); if (!profile) notFound();
  const [data, safety] = await Promise.all([getProfilePage(profile.id, user.id), getSafetyState(user.id, profile.id)]); const own = profile.id === user.id;
  return <><section className="profile-hero"><div className="profile-cover"><span>LOKA / @{profile.username}</span><i /></div><div className="profile-main">
    <AvatarViewer profile={profile} /><div className="profile-actions">{own ? <ProfileEditor profile={profile} userId={user.id} /> : <><FollowButton profileId={profile.id} initial={data.isFollowing} initialRequested={data.isRequested} /><form action={startConversation.bind(null, profile.id)}><button className="secondary-button icon-secondary" aria-label="Kirim pesan"><MessageCircle size={18} /></button></form><SafetyMenu targetId={profile.id} initialBlocked={safety.blocked} initialMuted={safety.muted} /><ReportDialog targetType="profile" targetId={profile.id} triggerClass="secondary-button report-profile" /></>}</div>
    <div className="profile-text"><h1>{profile.display_name}</h1><p className="handle">@{profile.username}</p>{profile.bio && <p className="profile-bio">{profile.bio}</p>}<div className="profile-meta">{profile.location && <span><MapPin size={15} />{profile.location}</span>}{profile.website && <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer"><Link2 size={15} />{profile.website.replace(/^https?:\/\//, "")}</a>}</div></div>
    <div className="profile-stats"><span><strong>{data.posts.length}</strong> jejak</span><a href={`/u/${profile.username}/connections?tab=followers`}><strong>{profile.hide_counts && !own ? "—" : data.followers}</strong> pengikut</a><a href={`/u/${profile.username}/connections?tab=following`}><strong>{profile.hide_counts && !own ? "—" : data.following}</strong> mengikuti</a></div>
  </div></section><div className="profile-feed-title"><strong>Jejak</strong><span>{own ? "Ruang personalmu" : `Dari ${profile.display_name}`}</span></div><FeedList posts={data.posts as unknown as Post[]} viewerId={user.id} hideCounts={profile.hide_counts} emptyTitle="Belum ada jejak" emptyText="Saat sesuatu dibagikan, ia akan hidup di sini." /></>;
}
