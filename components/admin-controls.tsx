"use client";
import { useTransition } from "react";
import { Check, EyeOff, ShieldAlert, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { moderatePost, resolveReport, reviewAppeal, setAccountStatus, warnProfile } from "@/app/actions";

export function ReportControls({ reportId, postId }: { reportId: string; postId?: string | null }) {
  const [pending, start] = useTransition();
  const run = (task: () => Promise<void>, message: string) => start(async () => { try { await task(); toast.success(message); } catch (error) { toast.error(error instanceof Error ? error.message : "Tindakan gagal."); } });
  return <div className="admin-actions">{postId && <button disabled={pending} onClick={() => run(() => moderatePost(postId, "hidden"), "Postingan disembunyikan.")}><EyeOff size={15} /> Sembunyikan</button>}<button disabled={pending} onClick={() => run(() => resolveReport(reportId, "resolved"), "Laporan diselesaikan.")}><Check size={15} /> Selesai</button><button disabled={pending} onClick={() => run(() => resolveReport(reportId, "dismissed"), "Laporan ditolak.")}><X size={15} /> Tolak</button></div>;
}

export function UserControls({ profileId, status }: { profileId: string; status: string }) {
  const [pending, start] = useTransition();
  return <div className="admin-actions"><button className="admin-user-action" disabled={pending} onClick={() => start(async () => { try { await warnProfile(profileId); toast.success("Peringatan dicatat."); } catch(error){toast.error(error instanceof Error?error.message:"Tindakan gagal.");} })}><ShieldAlert size={15}/>Peringatkan</button><button className="admin-user-action" disabled={pending} onClick={() => start(async () => { try { await setAccountStatus(profileId, status === "active" ? "suspended" : "active"); toast.success(status === "active" ? "Akun ditangguhkan." : "Akun dipulihkan."); } catch (error) { toast.error(error instanceof Error ? error.message : "Tindakan gagal."); } })}>{status === "active" ? <><UserX size={15} /> Tangguhkan</> : <><ShieldAlert size={15} /> Pulihkan</>}</button></div>;
}

export function AppealControls({appealId}:{appealId:string}){const [pending,start]=useTransition();const run=(decision:"accepted"|"rejected")=>start(async()=>{try{await reviewAppeal(appealId,decision);toast.success("Banding ditinjau.");}catch(error){toast.error(error instanceof Error?error.message:"Tindakan gagal.");}});return <div className="admin-actions"><button disabled={pending} onClick={()=>run("accepted")}><Check size={15}/>Terima</button><button disabled={pending} onClick={()=>run("rejected")}><X size={15}/>Tolak</button></div>}
