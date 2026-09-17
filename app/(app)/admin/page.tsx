import { redirect } from "next/navigation";
import { Activity, Flag, ShieldCheck, Users } from "lucide-react";
import SectionHeader from "@/components/section-header";
import { Avatar } from "@/components/app-shell";
import { AppealControls, ReportControls, UserControls } from "@/components/admin-controls";
import { getViewer } from "@/lib/queries";
import type { Profile } from "@/lib/database.types";

export default async function AdminPage() {
  const { supabase, profile } = await getViewer(); if (!supabase || profile?.role !== "admin") redirect("/feed");
  const [profiles, posts, openReports, reports, users, appeals, actions] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("reports").select("id, target_type, target_id, reason, details, snapshot, priority, status, created_at, reporter:profiles!reports_reporter_id_fkey(*)").eq("status", "open").order("priority", { ascending: true }).order("created_at", { ascending: false }).limit(30),
    supabase.from("profiles").select("*").neq("id", profile.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("appeals").select("id,target_type,target_id,reason,status,created_at,appellant:profiles!appeals_appellant_id_fkey(*)").eq("status","open").order("created_at",{ascending:false}).limit(20),
    supabase.from("moderation_actions").select("id,action,target_type,target_id,note,created_at").order("created_at",{ascending:false}).limit(12),
  ]);
  return <><SectionHeader title="Ruang Kendali" subtitle="Moderasi transparan untuk menjaga LOKA tetap manusiawi." /><section className="admin-stats"><div><Users /><span><strong>{profiles.count || 0}</strong> akun</span></div><div><Activity /><span><strong>{posts.count || 0}</strong> jejak</span></div><div><Flag /><span><strong>{openReports.count || 0}</strong> laporan terbuka</span></div><div><ShieldCheck /><span><strong>Aktif</strong> proteksi komunitas</span></div></section>
  <section className="admin-panel"><div className="section-minihead"><span className="eyebrow">ANTRIAN MODERASI</span><strong>Laporan berdasarkan risiko</strong></div>{!reports.data?.length ? <p className="admin-empty">Tidak ada laporan terbuka. Ruang sedang tenang.</p> : reports.data.map((report) => { const reporter = report.reporter as unknown as Profile; const snapshot=report.snapshot as Record<string,unknown>; return <article className="report-row" key={report.id}><div><span className="report-reason">P{report.priority} · {report.reason}</span><b>{report.target_type} · {report.target_id.slice(0, 8)}</b><p>{report.details || "Tanpa detail tambahan."}</p>{snapshot?.body?<blockquote>{String(snapshot.body).slice(0,240)}</blockquote>:snapshot?.username?<blockquote>@{String(snapshot.username)} · {String(snapshot.display_name||"")}</blockquote>:null}<small>Dilaporkan oleh @{reporter?.username || "pengguna"}</small></div><ReportControls reportId={report.id} postId={report.target_type === "post" ? report.target_id : null} /></article>; })}</section>
  <section className="admin-panel"><div className="section-minihead"><span className="eyebrow">HAK BANDING</span><strong>Permohonan peninjauan</strong></div>{!appeals.data?.length?<p className="admin-empty">Tidak ada banding terbuka.</p>:appeals.data.map(item=>{const appellant=item.appellant as unknown as Profile;return <article className="report-row" key={item.id}><div><b>{item.target_type} · {item.target_id.slice(0,8)}</b><p>{item.reason}</p><small>Diajukan @{appellant?.username||"pengguna"}</small></div><AppealControls appealId={item.id}/></article>})}</section>
  <section className="admin-panel"><div className="section-minihead"><span className="eyebrow">AKUN TERBARU</span><strong>Kesehatan komunitas</strong></div>{(users.data as unknown as Profile[] || []).map((user) => <article className="admin-user" key={user.id}><Avatar profile={user} /><div><b>{user.display_name}</b><span>@{user.username} · {user.account_status} · {user.warning_count} peringatan</span></div><UserControls profileId={user.id} status={user.account_status} /></article>)}</section><section className="admin-panel"><div className="section-minihead"><span className="eyebrow">AUDIT LOG</span><strong>Tindakan moderator terbaru</strong></div>{actions.data?.map(item=><div className="audit-row" key={item.id}><b>{item.action.replaceAll("_"," ")}</b><span>{item.target_type} · {item.target_id.slice(0,8)}</span><small>{new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.created_at))}</small></div>)}</section></>;
}
