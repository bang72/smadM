import Link from "next/link";
import { Heart, MessageCircle, ShieldAlert, UserPlus } from "lucide-react";
import EmptyState from "@/components/empty-state";
import SectionHeader from "@/components/section-header";
import { Avatar } from "@/components/app-shell";
import { getViewer } from "@/lib/queries";
import type { Profile } from "@/lib/database.types";
import { FollowRequestActions, MarkAllRead } from "@/components/notification-controls";

export default async function NotificationsPage() {
  const { supabase, user } = await getViewer();
  if (!supabase || !user) return null;
  const [{ data }, { data: requests }] = await Promise.all([
    supabase.from("notifications").select("id, type, created_at, read_at, actor:profiles!notifications_actor_id_fkey(*), post_id, data").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("follow_requests").select("requester_id, created_at, requester:profiles!follow_requests_requester_id_fkey(*)").eq("target_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
  ]);

  return <>
    <SectionHeader title="Sinyal" subtitle="Aktivitas yang menyentuh ruangmu." /><div className="notification-tools"><MarkAllRead /></div>
    {requests?.length ? <section className="follow-requests"><span className="eyebrow">PERMINTAAN MENGIKUTI</span>{requests.map(item=>{const requester=item.requester as unknown as Profile;return <article key={item.requester_id}><Avatar profile={requester}/><div><b>{requester.display_name}</b><span>@{requester.username}</span></div><FollowRequestActions requesterId={item.requester_id}/></article>})}</section>:null}
    {!data?.length ? <EmptyState title="Belum ada kabar baru" text="Suka dan komentar pada postinganmu akan muncul di sini." /> :
      <div className="notification-list">{data.map((item) => {
        const actor = item.actor as unknown as Profile;
        return <div className={item.read_at ? "notification" : "notification unread"} key={item.id}>
          <span className="notification-icon">{item.type === "like" ? <Heart size={17} /> : item.type === "follow" || item.type === "follow_request" ? <UserPlus size={17} /> : item.type === "warning" ? <ShieldAlert size={17} /> : <MessageCircle size={17} />}</span>
          <Link href={`/u/${actor.username}`}><Avatar profile={actor} /></Link>
          <p><strong>{actor.display_name}</strong> {item.type === "like" ? "menyukai jejakmu." : item.type === "follow" ? "mulai mengikutimu." : item.type === "follow_request" ? "meminta mengikuti ruangmu." : item.type === "message" ? <Link href={`/messages/${String((item.data as Record<string,unknown>)?.conversation_id||"")}`}>mengirim pesan baru.</Link> : item.type === "warning" ? "mengirim peringatan moderasi." : "menanggapi jejakmu."}</p>
        </div>;
      })}</div>}
  </>;
}
