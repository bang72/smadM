"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { Profile } from "@/lib/database.types";
import { Avatar } from "./app-shell";

export default function AvatarViewer({ profile }: { profile: Pick<Profile, "avatar_url" | "display_name" | "username"> }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [open]);
  return <>
    <button className="avatar-view-button" onClick={() => setOpen(true)} aria-label={`Perbesar foto profil ${profile.display_name}`}><Avatar profile={profile} large /></button>
    {open && <div className="avatar-modal" role="dialog" aria-modal="true" aria-label="Foto profil" onClick={() => setOpen(false)}>
      <button className="modal-close" aria-label="Tutup"><X /></button>
      <div className="avatar-modal-content" onClick={(event) => event.stopPropagation()}>
        {profile.avatar_url ? <Image src={profile.avatar_url} alt={`Foto profil ${profile.display_name}`} fill sizes="min(88vw, 620px)" /> : <Avatar profile={profile} large />}
        <div><strong>{profile.display_name}</strong><span>@{profile.username}</span></div>
      </div>
    </div>}
  </>;
}
