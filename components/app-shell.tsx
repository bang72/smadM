import Link from "next/link";
import Image from "next/image";
import { Bell, Bookmark, Home, LogOut, MessageCircle, Plus, Search, Settings, ShieldCheck, UserRound } from "lucide-react";
import type { Profile } from "@/lib/database.types";
import NavLink from "./nav-link";
import { signOut } from "@/app/actions";

const nav = [
  { href: "/feed", label: "Ruang", icon: Home },
  { href: "/explore", label: "Temukan", icon: Search },
  { href: "/messages", label: "Pesan", icon: MessageCircle },
  { href: "/notifications", label: "Sinyal", icon: Bell },
  { href: "/saved", label: "Simpan", icon: Bookmark },
  { href: "/profile", label: "Profil", icon: UserRound },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export default function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/feed" className="wordmark" aria-label="LOKA beranda"><span>L</span><b>LOKA</b><small>living space</small></Link>
      <nav className="desktop-nav" aria-label="Navigasi utama">
        {nav.map(({ href, label, icon: Icon }) => <NavLink key={href} href={href} label={label}><Icon size={21} /></NavLink>)}
        {profile.role === "admin" && <NavLink href="/admin" label="Kendali"><ShieldCheck size={21} /></NavLink>}
      </nav>
      <Link href="/feed#compose" className="compose-shortcut"><Plus size={19} /> Buat jejak</Link>
      <div className="sidebar-account">
        <Link href={`/u/${profile.username}`} aria-label="Buka profil"><Avatar profile={profile} /></Link>
        <span><strong>{profile.display_name}</strong><small>@{profile.username}</small></span>
        <form action={signOut}><button aria-label="Keluar"><LogOut size={18} /></button></form>
      </div>
    </aside>

    <div className="mobile-topbar">
      <Link href="/feed" className="wordmark"><span>L</span><b>LOKA</b></Link>
      <Link href="/explore" className="mobile-search" aria-label="Cari orang"><Search size={19} /></Link>
      <Link href="/feed#compose" className="mobile-compose" aria-label="Buat postingan"><Plus size={20} /></Link>
    </div>

    <main className="main-column" id="main-content">
      {profile.warning_count > 0 && <Link href="/guidelines" className="account-warning"><ShieldCheck size={17} /><span><b>{profile.warning_count} peringatan akun</b><small>Tinjau Pedoman Komunitas agar ruangmu tetap aman.</small></span></Link>}
      {children}
    </main>

    <aside className="context-rail">
      <div className="pulse-card"><span className="eyebrow">DENYUT LOKA</span><strong>Sosial tanpa riuh.</strong><p>Bagikan yang bermakna. Temukan manusia, bukan metrik.</p><i><span /> ruang terasa tenang</i></div>
      <Link href="/explore" className="discover-card"><Search size={19} /><span><b>Perluas lingkaranmu</b><small>Temukan orang dan perspektif baru</small></span></Link>
      <footer>LOKA 2050 · Dibuat untuk manusia</footer>
    </aside>

    <nav className="mobile-nav" aria-label="Navigasi utama">
      {nav.slice(0, 4).map(({ href, label, icon: Icon }) => <NavLink key={href} href={href} label={label}><Icon size={22} /></NavLink>)}
      <NavLink href="/profile" label="Profil"><Avatar profile={profile} small /></NavLink>
    </nav>
  </div>;
}

export function Avatar({ profile, small = false, large = false }: { profile: Pick<Profile, "avatar_url" | "display_name" | "username">; small?: boolean; large?: boolean }) {
  const className = `avatar${small ? " avatar-small" : ""}${large ? " avatar-large" : ""}`;
  const size = large ? 112 : small ? 25 : 42;
  if (profile.avatar_url) return <Image className={className} src={profile.avatar_url} width={size} height={size} sizes={`${size}px`} alt={`Foto profil ${profile.display_name}`} />;
  return <span className={`${className} avatar-fallback`}>{(profile.display_name || profile.username).charAt(0).toUpperCase()}</span>;
}
