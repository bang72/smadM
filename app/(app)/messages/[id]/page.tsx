import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/app-shell";
import MessageComposer from "@/components/message-composer";
import { getConversation, getViewer } from "@/lib/queries";
import type { Conversation, Profile } from "@/lib/database.types";

export default async function ConversationPage({params}:{params:Promise<{id:string}>}){const [{id},{user}]=await Promise.all([params,getViewer()]);if(!user)return null;const item=await getConversation(id) as unknown as Conversation|null;if(!item)notFound();const other=item.conversation_members.map(member=>member.profiles as unknown as Profile).find(person=>person?.id!==user.id);if(!other)notFound();const messages=[...(item.messages||[])].sort((a,b)=>a.created_at.localeCompare(b.created_at));return <div className="conversation-page"><header className="chat-header"><Link href="/messages" aria-label="Kembali"><ArrowLeft/></Link><Avatar profile={other}/><div><b>{other.display_name}</b><span>@{other.username}</span></div></header><div className="message-stream">{messages.map(message=><div className={message.sender_id===user.id?"message mine":"message"} key={message.id}><p>{message.body}</p><time>{new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit"}).format(new Date(message.created_at))}</time></div>)}</div><MessageComposer conversationId={id}/></div>}
