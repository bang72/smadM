"use client";
import { useState, useTransition } from "react";
import { MoreHorizontal, UserMinus, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { toggleBlock, toggleMute } from "@/app/actions";

export default function SafetyMenu({ targetId, initialBlocked, initialMuted }: { targetId: string; initialBlocked: boolean; initialMuted: boolean }) {
  const [open,setOpen]=useState(false); const [blocked,setBlocked]=useState(initialBlocked); const [muted,setMuted]=useState(initialMuted); const [pending,start]=useTransition();
  return <div className="safety-menu"><button className="secondary-button icon-secondary" onClick={() => setOpen(!open)} aria-label="Keamanan profil"><MoreHorizontal size={18}/></button>{open && <div className="safety-popover">
    <button disabled={pending} onClick={() => start(async()=>{try{const result=await toggleMute(targetId);setMuted(result.muted);toast.success(result.muted?"Akun dibisukan.":"Bisukan dibatalkan.");}catch(error){toast.error(error instanceof Error?error.message:"Tindakan gagal.");}})}><VolumeX size={16}/>{muted?"Bunyikan kembali":"Bisukan"}</button>
    <button className="danger" disabled={pending} onClick={() => start(async()=>{try{const result=await toggleBlock(targetId);setBlocked(result.blocked);toast.success(result.blocked?"Akun diblokir.":"Blokir dibatalkan.");}catch(error){toast.error(error instanceof Error?error.message:"Tindakan gagal.");}})}><UserMinus size={16}/>{blocked?"Buka blokir":"Blokir"}</button>
  </div>}</div>;
}
