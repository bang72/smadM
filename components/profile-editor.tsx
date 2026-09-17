"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/app/actions";
import type { Profile } from "@/lib/database.types";
import { validateMediaFile } from "@/lib/media-validation";

export default function ProfileEditor({ profile, userId }: { profile: Profile; userId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      let avatarUrl: string | undefined;
      if (avatar) {
        const supabase = createClient();
        const ext = avatar.name.split(".").pop() || "jpg";
        const path = `${userId}/avatar-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(path, avatar, { contentType: avatar.type });
        if (error) throw error;
        avatarUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      }
      await updateProfile({ displayName: String(form.get("displayName")), username: String(form.get("username")), bio: String(form.get("bio")), website: String(form.get("website")), location: String(form.get("location")), avatarUrl });
      toast.success("Profil diperbarui."); setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Profil gagal disimpan."); }
    finally { setBusy(false); }
  }

  async function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await validateMediaFile(file, 5 * 1024 * 1024); if (!file.type.startsWith("image/")) throw new Error("Avatar harus berupa gambar."); setAvatar(file); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Foto tidak valid."); }
  }

  return <>
    <button className="secondary-button" onClick={() => setOpen(true)}>Edit profil</button>
    {open && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <header><div><p className="eyebrow">PENGATURAN</p><h2 id="edit-profile-title">Edit profil</h2></div><button className="icon-button" onClick={() => setOpen(false)}><X /></button></header>
        <form onSubmit={save}>
          <button type="button" className="avatar-picker" onClick={() => inputRef.current?.click()}><Camera size={20} /><span>{avatar ? avatar.name : "Ganti foto profil"}</span></button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
          <label>Nama tampilan<input name="displayName" defaultValue={profile.display_name} maxLength={40} required /></label>
          <label>Username<input name="username" defaultValue={profile.username} minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" required /></label>
          <label>Bio<textarea name="bio" defaultValue={profile.bio} maxLength={160} rows={4} /></label>
          <div className="form-row"><label>Lokasi<input name="location" defaultValue={profile.location || ""} maxLength={60} placeholder="Kota, negara" /></label><label>Situs web<input name="website" defaultValue={profile.website || ""} maxLength={160} placeholder="https://…" /></label></div>
          <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : "Simpan perubahan"}</button>
        </form>
      </section>
    </div>}
  </>;
}
