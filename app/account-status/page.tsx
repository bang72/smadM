import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban, Clock3, LogOut, ShieldAlert } from "lucide-react";
import AppealForm from "@/components/appeal-form";
import { signOut } from "@/app/actions";
import { getViewer } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AccountStatusPage() {
  const { supabase, user, profile } = await getViewer();
  if (!user || !supabase) redirect("/");
  if (!profile) redirect("/onboarding");
  if (profile.account_status === "active") redirect("/feed");
  const { data: appeals } = await supabase.from("appeals").select("id,reason,status,created_at,reviewed_at").eq("appellant_id", user.id).eq("target_type", "profile").order("created_at", { ascending: false });
  const banned = profile.account_status === "banned";
  return <main className="account-status-page">
    <section className="account-status-card">
      <Link href="/" className="wordmark"><span>L</span><b>LOKA</b></Link>
      <div className="status-symbol">{banned ? <Ban /> : <ShieldAlert />}</div>
      <span className="eyebrow">STATUS AKUN</span>
      <h1>{banned ? "Akun dinonaktifkan" : "Akun sedang dibatasi"}</h1>
      <p>{banned ? "Akses akun dihentikan karena keputusan moderasi." : "Akunmu sementara tidak dapat membuat atau berinteraksi dengan konten."} Kamu tetap berhak meminta peninjauan manusia.</p>
      <AppealForm profileId={profile.id} />
      {!!appeals?.length && <div className="appeal-history"><h2>Riwayat banding</h2>{appeals.map((appeal) => <article key={appeal.id}><span className={`appeal-state ${appeal.status}`}>{appeal.status === "open" ? "Ditinjau" : appeal.status === "accepted" ? "Diterima" : "Ditolak"}</span><p>{appeal.reason}</p><small><Clock3 size={13} /> {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(appeal.created_at))}</small></article>)}</div>}
      <form action={signOut}><button className="secondary-button"><LogOut size={17} /> Keluar dari akun</button></form>
      <p className="status-help">Darurat keamanan? Hubungi pengelola melalui kanal dukungan yang tercantum pada kebijakan privasi.</p>
    </section>
  </main>;
}
