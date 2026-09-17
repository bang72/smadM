# LOKA — Living Social Space

LOKA adalah jejaring sosial multimodal untuk teks, foto, video, audio, dan **Sekilas** (story 24 jam). Postgres menyimpan akun/relasi/konten dan Supabase Storage menyimpan file, jadi unggahan tidak hilang saat refresh atau redeploy Vercel.

## Fitur final v3

- Auth email/password dan onboarding profil.
- Jejak bertipe **Catatan, Momen, Suara,** atau **Tanya**.
- Upload foto, video, audio; suka, tanggapan, simpan, hapus, dan tautan berbagi publik.
- Profil publik `/u/username`, foto profil yang bisa diperbesar, lokasi, situs web, statistik, follow/unfollow.
- Pencarian orang, rekomendasi akun, feed relasi, dan jelajah publik.
- Sekilas foto/video/audio yang otomatis tidak ditampilkan setelah 24 jam.
- Notifikasi suka, komentar, dan follow.
- Pelaporan post/profil serta dashboard admin untuk moderasi konten dan penangguhan akun.
- UI responsif: tiga zona di desktop lebar, dua zona di laptop/tablet, dan satu fokus di ponsel.
- Akun privat, persetujuan follow, daftar relasi, blok, mute, Teman Dekat, dan Mode Hening.
- Pesan pribadi, preferensi notifikasi, balasan komentar, edit post, content warning, alt text, dan pagination.
- Audiens post/story, bucket privat + signed URL, banding moderasi, audit admin, ekspor data, PWA, serta penghapusan akun 14 hari.

## 1. Pasang database Supabase

Di **Supabase → SQL Editor → New query**:

- Instalasi baru: jalankan berurutan `supabase/schema.sql`, `supabase/migration_v2.sql`, lalu `supabase/migration_v3.sql`.
- Jika v2 sudah terpasang: jalankan `supabase/migration_v3.sql` satu kali.

## 2. Masukkan environment variable di Vercel

Buka **Vercel → project LOKA → Settings → Environment Variables**. Buat entri berikut secara terpisah:

| Type | Key | Value |
|---|---|---|
| Secret | `NEXT_PUBLIC_SUPABASE_URL` | Project URL dari Supabase |
| Secret | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key dari Supabase |
| Config | `NEXT_PUBLIC_SITE_URL` | URL produksi Vercel |
| Secret | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role; server only |
| Secret | `CRON_SECRET` | String acak panjang untuk endpoint cron |

Untuk setiap entri:

1. Isi kolom **Key** hanya dengan nama variabel, tanpa tanda `=`.
2. Isi kolom **Value** hanya dengan nilainya.
3. Pilih **Production, Preview, dan Development**.
4. Tekan **Save**.
5. Setelah keduanya tersimpan, buka **Deployments → deployment terbaru → Redeploy**. Environment variable baru tidak masuk ke deployment lama secara otomatis.

Anon key memang dirancang untuk frontend; keamanan data tetap ditentukan Row Level Security. Jangan pernah memberi awalan `NEXT_PUBLIC_` pada service-role.

## 3. Atur Auth Supabase

Di **Authentication → URL Configuration**:

- **Site URL**: domain produksi Vercel, misalnya `https://nama-project.vercel.app`.
- **Redirect URLs**: tambahkan domain produksi dan pola preview yang memang dipakai.

Untuk pengujian, konfirmasi email dapat dimatikan sementara. Untuk produksi, aktifkan konfirmasi email.

## 4. Jadikan akun sebagai admin

Daftar/login dulu melalui LOKA. Setelah profil akun terbentuk, jalankan ini di SQL Editor dan ganti emailnya:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'EMAIL_ADMIN_KAMU');
```

Keluar lalu masuk lagi. Menu **Kendali** akan muncul. Status admin divalidasi kembali oleh Server Action dan fungsi database.

## Menjalankan lokal

```bash
cp .env.example .env.local
npm install
npm run dev
```

Pemeriksaan sebelum deploy:

```bash
npm run lint
npm run build
```

## Catatan produksi

- Maksimal 4 media per post dan 50 MB per file; avatar maksimal 5 MB.
- Media publik berada di `media`; media terbatas berada di `private-media` dan memakai signed URL setelah pemeriksaan RLS.
- Vercel Cron membersihkan Sekilas kedaluwarsa, rate-limit lama, dan akun yang melewati masa tunggu setiap hari.
- Sebelum membuka pendaftaran luas, aktifkan proteksi bot/rate-limit di lapisan hosting dan pantau penggunaan Storage.
