"use client";
import { useTransition } from "react";
import { Check, CheckCheck, X } from "lucide-react";
import { toast } from "sonner";
import { markNotificationsRead, respondFollowRequest } from "@/app/actions";

export function MarkAllRead(){const [pending,start]=useTransition();return <button className="mark-read" disabled={pending} onClick={()=>start(async()=>{try{await markNotificationsRead();toast.success("Semua sinyal dibaca.");}catch{toast.error("Gagal memperbarui sinyal.");}})}><CheckCheck size={16}/>Tandai dibaca</button>}
export function FollowRequestActions({requesterId}:{requesterId:string}){const [pending,start]=useTransition();const act=(accept:boolean)=>start(async()=>{try{await respondFollowRequest(requesterId,accept);toast.success(accept?"Permintaan diterima.":"Permintaan ditolak.");}catch{toast.error("Tindakan gagal.");}});return <div className="request-actions"><button disabled={pending} onClick={()=>act(true)}><Check size={15}/>Terima</button><button disabled={pending} onClick={()=>act(false)}><X size={15}/>Tolak</button></div>}
