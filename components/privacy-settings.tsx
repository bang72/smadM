"use client";

import { FormEvent, useState, useTransition } from "react";
import { Bell, Download, Loader2, LogOut, Shield, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Profile } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import {
  cancelAccountDeletion,
  requestAccountDeletion,
  updateNotificationPreferences,
  updatePrivacy,
} from "@/app/actions";

export default function PrivacySettings({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    start(async () => {
      try {
        await updatePrivacy({
          privateAccount: form.get("privateAccount") === "on",
          discoverable: form.get("discoverable") === "on",
          hideCounts: form.get("hideCounts") === "on",
          allowMessages: String(form.get("allowMessages")) as "everyone" | "following" | "none",
        });
        toast.success("Pengaturan disimpan.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan.");
      }
    });
  }

  function saveNotifications(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    start(async () => {
      try {
        await updateNotificationPreferences({
          like: form.get("like") === "on",
          comment: form.get("comment") === "on",
          follow: form.get("follow") === "on",
          message: form.get("message") === "on",
        });
        toast.success("Preferensi sinyal disimpan.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan.");
      }
    });
  }

  function logout() {
    start(async () => {
      const { error } = await createClient().auth.signOut();
      if (error) {
        toast.error(error.message || "Gagal keluar dari akun.");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <>
      <form className="settings-card" onSubmit={save}>
        <header>
          <Shield />
          <div>
            <h2>Privasi & ketenangan</h2>
            <p>Kamu menentukan siapa yang boleh masuk ke ruangmu.</p>
          </div>
        </header>
        <label className="setting-row">
          <span><b>Akun privat</b><small>Pengikut baru harus kamu setujui.</small></span>
          <input type="checkbox" name="privateAccount" defaultChecked={profile.private_account} />
        </label>
        <label className="setting-row">
          <span><b>Tampil di pencarian</b><small>Izinkan orang menemukan profilmu.</small></span>
          <input type="checkbox" name="discoverable" defaultChecked={profile.discoverable} />
        </label>
        <label className="setting-row">
          <span><b>Mode Hening</b><small>Sembunyikan jumlah suka, komentar dan pengikut.</small></span>
          <input type="checkbox" name="hideCounts" defaultChecked={profile.hide_counts} />
        </label>
        <label className="setting-select">
          <span><b>Pesan langsung</b><small>Siapa yang boleh memulai percakapan.</small></span>
          <select name="allowMessages" defaultValue={profile.allow_messages}>
            <option value="everyone">Semua orang</option>
            <option value="following">Orang yang kuikuti</option>
            <option value="none">Tidak seorang pun</option>
          </select>
        </label>
        <button className="primary-button" disabled={pending}>
          {pending ? <Loader2 className="spin" /> : "Simpan pengaturan"}
        </button>
      </form>

      <form className="settings-card" onSubmit={saveNotifications}>
        <header>
          <Bell />
          <div>
            <h2>Sinyal yang kamu terima</h2>
            <p>Pilih aktivitas yang layak meminta perhatianmu.</p>
          </div>
        </header>
        {([
          ["like", "Suka", "Saat seseorang menyukai jejakmu"],
          ["comment", "Tanggapan", "Saat ada tanggapan baru"],
          ["follow", "Relasi", "Follow dan permintaan follow"],
          ["message", "Pesan", "Saat percakapan menerima pesan"],
        ] as const).map(([key, title, description]) => (
          <label className="setting-row" key={key}>
            <span><b>{title}</b><small>{description}</small></span>
            <input type="checkbox" name={key} defaultChecked={profile.notification_preferences?.[key] !== false} />
          </label>
        ))}
        <button className="primary-button" disabled={pending}>
          {pending ? <Loader2 className="spin" /> : "Simpan sinyal"}
        </button>
      </form>

      <section className="settings-card">
        <header>
          <Download />
          <div>
            <h2>Data milikmu</h2>
            <p>Unduh salinan profil, post, relasi, pesan, dan aktivitasmu.</p>
          </div>
        </header>
        <a className="secondary-button export-button" href="/api/account/export">Unduh data JSON</a>
      </section>

      <section className="settings-card">
        <header>
          <LogOut />
          <div>
            <h2>Keluar akun</h2>
            <p>Akhiri sesi di perangkat ini tanpa menghapus akun atau data.</p>
          </div>
        </header>
        <button type="button" className="secondary-button" onClick={logout} disabled={pending}>
          {pending ? <Loader2 className="spin" /> : "Keluar"}
        </button>
      </section>

      <section className="settings-card danger-zone">
        <header>
          <Trash2 />
          <div>
            <h2>Hapus akun</h2>
            <p>Permintaan memiliki masa tunggu 14 hari agar bisa dibatalkan.</p>
          </div>
        </header>
        {profile.deletion_requested_at ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => start(async () => {
              await cancelAccountDeletion();
              toast.success("Penghapusan dibatalkan.");
            })}
          >
            Batalkan penghapusan
          </button>
        ) : confirmDelete ? (
          <div className="delete-confirm">
            <p>Semua profil, post, relasi dan media akan dijadwalkan untuk dihapus.</p>
            <button type="button" className="danger-button" onClick={() => start(() => requestAccountDeletion())}>
              Ya, jadwalkan penghapusan
            </button>
            <button type="button" className="secondary-button" onClick={() => setConfirmDelete(false)}>
              Batal
            </button>
          </div>
        ) : (
          <button type="button" className="danger-button" onClick={() => setConfirmDelete(true)}>
            Minta hapus akun
          </button>
        )}
      </section>
    </>
  );
}
