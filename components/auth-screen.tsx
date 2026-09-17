"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    const supabase = createClient();

    if(mode === "forgot"){
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/auth/update-password`});
      setMessage(error?error.message:"Tautan pemulihan telah dikirim. Cek emailmu.");setLoading(false);return;
    }
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: String(form.get("username") || "").toLowerCase(),
              display_name: String(form.get("displayName") || ""),
            },
          },
        });

    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Cek email untuk mengaktifkan akunmu.");
      setLoading(false);
      return;
    }
    router.replace("/feed");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="auth-logo"><span>L</span> LOKA</div>
        <div>
          <p className="eyebrow">SOSIAL, TANPA RIUH</p>
          <h1>Berbagi yang terasa seperti ruang sendiri.</h1>
          <p>Foto, video, suara, dan pikiranmu—ditampilkan dengan tenang, tanpa angka yang berteriak.</p>
        </div>
        <div className="auth-orbit" aria-hidden="true">
          <div className="orbit-card orbit-photo" />
          <div className="orbit-card orbit-wave"><i /><i /><i /><i /><i /></div>
          <div className="orbit-dot" />
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-tabs" role="tablist" aria-label="Pilihan akun">
            <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Masuk</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Daftar</button>
          </div>
          <h2>{mode === "signin" ? "Selamat datang lagi." : mode === "signup" ? "Buat ruangmu." : "Pulihkan aksesmu."}</h2>
          <p className="muted">{mode === "signin" ? "Lanjutkan dari tempat terakhir kamu berhenti." : mode === "signup" ? "Cukup satu menit untuk mulai berbagi." : "Kami akan mengirim tautan aman ke emailmu."}</p>

          <form onSubmit={submit} className="auth-form">
            {mode === "signup" && (
              <div className="field-row">
                <label>Nama tampilan<input name="displayName" required maxLength={40} placeholder="Cania" /></label>
                <label>Username<input name="username" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" placeholder="caniaxthink" /></label>
              </div>
            )}
            <label>Email<input name="email" type="email" autoComplete="email" required placeholder="kamu@email.com" /></label>
            {mode !== "forgot" && <label>Password
              <span className="password-field">
                <input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} required placeholder="Minimal 8 karakter" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>}
            {mode === "signup" && <label className="terms-check"><input type="checkbox" required /> <span>Saya menyetujui <a href="/terms" target="_blank">Ketentuan</a>, <a href="/privacy" target="_blank">Privasi</a>, dan <a href="/guidelines" target="_blank">Pedoman Komunitas</a>.</span></label>}
            {message && <p className="form-message" role="status">{message}</p>}
            <button className="primary-button" disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} /> : <>{mode === "signin" ? "Masuk ke LOKA" : mode === "signup" ? "Buat akun" : "Kirim tautan"}<ArrowRight size={18} /></>}
            </button>
            {mode === "signin" && <button type="button" className="text-button" onClick={()=>{setMode("forgot");setMessage("");}}>Lupa password?</button>}
            {mode === "forgot" && <button type="button" className="text-button" onClick={()=>{setMode("signin");setMessage("");}}>Kembali ke masuk</button>}
          </form>
        </div>
      </section>
    </main>
  );
}
