import { Database, ImageUp, ShieldCheck } from "lucide-react";

export default function SetupScreen() {
  return (
    <main className="setup-shell">
      <section className="setup-card">
        <div className="brand-mark" aria-hidden="true">L</div>
        <p className="eyebrow">LOKA / SETUP</p>
        <h1>Satu sambungan lagi, lalu LOKA hidup.</h1>
        <p className="setup-copy">
          Aplikasi sudah siap. Tambahkan URL dan anon key Supabase di environment Vercel,
          lalu jalankan <code>supabase/schema.sql</code> dan <code>supabase/migration_v2.sql</code> satu kali.
        </p>
        <div className="setup-grid">
          <div><Database size={20} /><span>Post & profil permanen</span></div>
          <div><ImageUp size={20} /><span>Foto, video & audio</span></div>
          <div><ShieldCheck size={20} /><span>Auth & akses per pengguna</span></div>
        </div>
      </section>
    </main>
  );
}
