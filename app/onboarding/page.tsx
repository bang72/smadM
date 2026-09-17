import { redirect } from "next/navigation";
import { completeOnboarding } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/feed");
  return <main className="onboarding-shell"><section className="onboarding-card">
    <div className="brand-mark">L</div><p className="eyebrow">LANGKAH TERAKHIR</p><h1>Pilih identitasmu.</h1><p className="muted">Kamu bisa mengubahnya lagi kapan saja.</p>
    <form action={completeOnboarding} className="auth-form">
      <label>Nama tampilan<input name="displayName" defaultValue={String(user.user_metadata.display_name || "")} required maxLength={40} /></label>
      <label>Username<input name="username" defaultValue={String(user.user_metadata.username || "")} required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" /></label>
      <button className="primary-button">Masuk ke LOKA</button>
    </form>
  </section></main>;
}
