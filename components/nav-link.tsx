"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return <Link href={href} className={pathname === href ? "nav-link active" : "nav-link"}>{children}<span>{label}</span></Link>;
}
