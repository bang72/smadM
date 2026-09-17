"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import Image from "next/image";
import { Eye, FileAudio, HelpCircle, ImageIcon, Loader2, Lock, MessageSquareText, Send, Smile, Sparkles, Users, Video, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/app/actions";
import { Avatar } from "./app-shell";
import type { Profile } from "@/lib/database.types";
import { validateMediaFile } from "@/lib/media-validation";

type PendingFile = { file: File; preview: string; type: "image" | "video" | "audio"; altText: string };

export default function Composer({ profile, userId }: { profile: Profile; userId: string }) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"note" | "moment" | "sound" | "question">("note");
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("public");
  const [allowComments, setAllowComments] = useState(true);
  const [contentWarning, setContentWarning] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(accept: string) {
    if (!inputRef.current) return;
    inputRef.current.accept = accept;
    inputRef.current.click();
  }

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    const next: PendingFile[] = [];
    for (const file of selected.slice(0, 4 - files.length)) {
      try { await validateMediaFile(file); } catch (error) { toast.error(error instanceof Error ? error.message : "File tidak valid."); continue; }
      const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : null;
      if (!type) { toast.error(`${file.name} bukan format media yang didukung.`); continue; }
      next.push({ file, preview: URL.createObjectURL(file), type, altText: "" });
    }
    setFiles((current) => [...current, ...next]);
    event.target.value = "";
  }

  function remove(index: number) {
    setFiles((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() && !files.length) return;
    setBusy(true);
    const supabase = createClient();
    const postId = crypto.randomUUID();
    const bucket = visibility === "public" ? "media" : "private-media";
    const uploaded: { url: string; storagePath: string; mediaType: "image" | "video" | "audio"; altText: string; fileSize: number }[] = [];
    try {
      for (const item of files) {
        const ext = item.file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${userId}/posts/${postId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, item.file, { contentType: item.file.type, upsert: false });
        if (error) throw error;
        const url = bucket === "media" ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : "";
        uploaded.push({ url, storagePath: path, mediaType: item.type, altText: item.altText, fileSize: item.file.size });
      }
      await createPost({ id: postId, body, media: uploaded, kind, visibility, allowComments, contentWarning });
      files.forEach((item) => URL.revokeObjectURL(item.preview));
      setFiles([]);
      setBody("");
      setKind("note");
      setVisibility("public"); setAllowComments(true); setContentWarning("");
      toast.success("Jejak diterbitkan.");
    } catch (error) {
      if (uploaded.length) await supabase.storage.from(bucket).remove(uploaded.map((item) => item.storagePath));
      toast.error(error instanceof Error ? error.message : "Postingan gagal diterbitkan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="compose" className="composer" onSubmit={publish}>
      <Avatar profile={profile} />
      <div className="composer-body">
        <div className="composer-kinds" aria-label="Jenis jejak">
          <button type="button" className={kind === "note" ? "active" : ""} onClick={() => setKind("note")}><MessageSquareText size={15} /> Catatan</button>
          <button type="button" className={kind === "moment" ? "active" : ""} onClick={() => setKind("moment")}><Sparkles size={15} /> Momen</button>
          <button type="button" className={kind === "sound" ? "active" : ""} onClick={() => setKind("sound")}><FileAudio size={15} /> Suara</button>
          <button type="button" className={kind === "question" ? "active" : ""} onClick={() => setKind("question")}><HelpCircle size={15} /> Tanya</button>
        </div>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1200} placeholder={kind === "question" ? "Apa yang ingin kamu tanyakan?" : kind === "sound" ? "Ceritakan suara ini…" : "Tinggalkan sesuatu yang bermakna…"} aria-label="Isi postingan" />
        {files.length > 0 && <div className={`preview-grid count-${files.length}`}>
          {files.map((item, index) => <div className="media-preview" key={item.preview}>
            {item.type === "image" && <Image src={item.preview} alt="Pratinjau unggahan" fill sizes="(max-width: 680px) 100vw, 560px" unoptimized />}
            {item.type === "video" && <video src={item.preview} controls />}
            {item.type === "audio" && <div className="audio-preview"><FileAudio size={28} /><span>{item.file.name}</span><audio src={item.preview} controls /></div>}
            <button type="button" onClick={() => remove(index)} aria-label="Hapus media"><X size={17} /></button>
            {item.type === "image" && <input className="alt-input" value={item.altText} onChange={(event) => setFiles((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, altText: event.target.value } : entry))} maxLength={300} placeholder="Deskripsikan foto untuk pembaca layar…" aria-label={`Teks alternatif media ${index + 1}`} />}
          </div>)}
        </div>}
        <details className="composer-options"><summary>Privasi & keamanan</summary><div>
          <label>Siapa yang melihat<select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}><option value="public">Publik</option><option value="followers">Pengikut</option><option value="private">Hanya saya</option></select></label>
          <label>Peringatan konten<input value={contentWarning} onChange={(event) => setContentWarning(event.target.value)} maxLength={120} placeholder="Opsional" /></label>
          <label className="check-label"><input type="checkbox" checked={allowComments} onChange={(event) => setAllowComments(event.target.checked)} /> Izinkan tanggapan</label>
        </div></details>
        <div className="composer-footer">
          <div className="media-buttons">
            <button type="button" onClick={() => choose("image/jpeg,image/png,image/webp,image/gif")} aria-label="Tambah foto"><ImageIcon size={20} /></button>
            <button type="button" onClick={() => choose("video/mp4,video/webm,video/quicktime")} aria-label="Tambah video"><Video size={20} /></button>
            <button type="button" onClick={() => choose("audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm")} aria-label="Tambah audio"><FileAudio size={20} /></button>
            <button type="button" aria-label="Emoji" onClick={() => setBody((value) => `${value} ✦`)}><Smile size={20} /></button>
            <input ref={inputRef} type="file" hidden multiple onChange={addFiles} />
          </div>
          <div className="publish-area"><span className="visibility-indicator">{visibility === "public" ? <Eye size={14} /> : visibility === "followers" ? <Users size={14} /> : <Lock size={14} />}{body.length}/1200</span><button className="publish-button" disabled={busy || (!body.trim() && !files.length)}>{busy ? <Loader2 className="spin" size={18} /> : <><span>Terbitkan</span><Send size={17} /></>}</button></div>
        </div>
      </div>
    </form>
  );
}
