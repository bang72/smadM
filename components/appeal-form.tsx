"use client";

import { FormEvent, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { submitAppeal } from "@/app/actions";

export default function AppealForm({ profileId }: { profileId: string }) {
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await submitAppeal("profile", profileId, reason);
        setSent(true);
        setReason("");
        toast.success("Banding terkirim ke tim LOKA.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Banding gagal dikirim.");
      }
    });
  }

  if (sent) return <p className="appeal-success">Bandingmu sudah masuk. Statusnya dapat dilihat di bawah.</p>;
  return <form className="appeal-form" onSubmit={submit}>
    <label htmlFor="appeal-reason">Jelaskan konteks yang perlu kami tinjau kembali</label>
    <textarea id="appeal-reason" minLength={10} maxLength={1000} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ceritakan alasanmu dengan jelas…" />
    <button className="primary-button" disabled={pending || reason.trim().length < 10}>{pending ? <Loader2 className="spin" /> : <><Send size={17} /> Kirim banding</>}</button>
  </form>;
}
