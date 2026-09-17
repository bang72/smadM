"use client";
import { FormEvent, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { sendMessage } from "@/app/actions";

export default function MessageComposer({conversationId}:{conversationId:string}){const [body,setBody]=useState("");const [pending,start]=useTransition();function submit(event:FormEvent){event.preventDefault();start(async()=>{try{await sendMessage(conversationId,body);setBody("");}catch(error){toast.error(error instanceof Error?error.message:"Pesan gagal dikirim.");}})}return <form className="message-composer" onSubmit={submit}><textarea value={body} onChange={event=>setBody(event.target.value)} maxLength={2000} rows={1} placeholder="Tulis pesan…" aria-label="Pesan"/><button disabled={pending||!body.trim()} aria-label="Kirim pesan"><Send size={19}/></button></form>}
