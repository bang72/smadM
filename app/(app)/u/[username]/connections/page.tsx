import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PeopleCard from "@/components/people-card";
import { getConnections, getFollowingIds, getProfileByUsername, getViewer } from "@/lib/queries";
import type { Profile } from "@/lib/database.types";

export default async function ConnectionsPage({ params, searchParams }: { params: Promise<{username:string}>; searchParams: Promise<{tab?:string}> }) {
  const [{username},{tab},viewer]=await Promise.all([params,searchParams,getViewer()]); if(!viewer.user) return null;
  const profile=await getProfileByUsername(username); if(!profile) notFound();
  const type=tab==="following"?"following":"followers"; const following=await getFollowingIds(viewer.user.id); const allowed=!profile.private_account||profile.id===viewer.user.id||following.includes(profile.id); const rows=allowed?await getConnections(profile.id,type):[];
  return <><header className="subpage-header"><Link href={`/u/${profile.username}`} aria-label="Kembali"><ArrowLeft/></Link><div><h1>{profile.display_name}</h1><span>@{profile.username}</span></div></header><nav className="connection-tabs"><Link className={type==="followers"?"active":""} href={`?tab=followers`}>Pengikut</Link><Link className={type==="following"?"active":""} href={`?tab=following`}>Mengikuti</Link></nav><div className="connections-list">{!allowed?<p className="private-note">Daftar relasi akun privat hanya terlihat oleh pengikut yang disetujui.</p>:rows.map((row) => { const person=(row as unknown as {profiles:Profile}).profiles; return person?<PeopleCard key={person.id} profile={person} following={following.includes(person.id)}/>:null; })}</div></>;
}
