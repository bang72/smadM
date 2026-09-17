"use client";
import { FormEvent, useState, useTransition } from "react";
import { Flag, X } from "lucide-react";
import { toast } from "sonner";
import { reportContent } from "@/app/actions";

const reasons = [["spam", "Spam / penipuan"], ["harassment", "Pelecehan"], ["hate", "Ujaran kebencian"], ["nudity", "Konten seksual"], ["violence", "Kekerasan"], ["misinformation", "Informasi menyesatkan"], ["other", "Lainnya"]];

export default function ReportDialog({ targetType, targetId, triggerClass }: { targetType: "post" | "profile"; targetId: string; triggerClass?: string }) {
  const [open, setOpen] = useState(false); const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    startTransition(async () => { try { await reportContent({ targetType, targetId, reason: String(form.get("reason")), details: String(form.get("details") || "") }); setOpen(false); toast.success("Laporan diterima. Admin akan meninjaunya."); } catch (error) { toast.error(error instanceof Error ? error.message : "Laporan gagal dikirim."); } });
  }
  return <>
    <button className={triggerClass || "menu-action"} onClick={() => setOpen(true)}><Flag size={16} /> Laporkan</button>
    {open && <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <form className="dialog-card" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Tutup"><X /></button>
        <span className="eyebrow">JAGA RUANG BERSAMA</span><h2 id="report-title">Apa yang mengganggu?</h2><p>Laporanmu bersifat rahasia dan masuk ke ruang kendali admin.</p>
        <label>Alasan<select name="reason" required>{reasons.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Detail tambahan<textarea name="details" maxLength={500} placeholder="Opsional, bantu admin memahami konteks…" /></label>
        <button className="primary-button" disabled={pending}>{pending ? "Mengirim…" : "Kirim laporan"}</button>
      </form>
    </div>}
  </>;
}
