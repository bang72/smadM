import Link from "next/link";
import { MessageCircle } from "lucide-react";
import SectionHeader from "@/components/section-header";
import EmptyState from "@/components/empty-state";
import { Avatar } from "@/components/app-shell";
import { getConversations, getViewer } from "@/lib/queries";
import type { Conversation, Profile } from "@/lib/database.types";

export default async function MessagesPage(){const {user}=await getViewer();if(!user)return null;const conversations=await getConversations(user.id) as unknown as Conversation[];return <><SectionHeader title="Percakapan" subtitle="Pesan pribadi dengan batas yang kamu tentukan."/>{!conversations.length?<EmptyState title="Belum ada percakapan" text="Buka profil seseorang lalu pilih ikon pesan untuk memulai."/>:<div className="conversation-list">{conversations.map(item=>{const other=item.conversation_members.map(member=>member.profiles as unknown as Profile).find(person=>person?.id!==user.id);const latest=[...(item.messages||[])].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];if(!other)return null;return <Link href={`/messages/${item.id}`} key={item.id}><Avatar profile={other}/><div><b>{other.display_name}</b><span>@{other.username}</span><p>{latest?.body||"Percakapan baru"}</p></div><MessageCircle size={18}/></Link>})}</div>}</>}
