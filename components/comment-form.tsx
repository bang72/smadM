"use client";
import { FormEvent, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { addComment } from "@/app/actions";

export default function CommentForm({ postId, parentId, compact = false }: { postId: string; parentId?: string; compact?: boolean }) {
  const [value, setValue] = useState(""); const [pending, startTransition] = useTransition();
  function submit(event: FormEvent) { event.preventDefault(); startTransition(async () => { try { await addComment(postId, value, parentId); setValue(""); toast.success(parentId ? "Balasan dikirim." : "Tanggapan dikirim."); } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal mengirim tanggapan."); } }); }
  return <form className={compact ? "detail-comment-form compact" : "detail-comment-form"} onSubmit={submit}><input value={value} onChange={(event) => setValue(event.target.value)} maxLength={500} placeholder={parentId ? "Tulis balasan…" : "Tinggalkan tanggapan yang baik…"} required /><button disabled={pending} aria-label="Kirim"><Send size={18} /></button></form>;
}
