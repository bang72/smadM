import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import PwaRegister from "@/components/pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://loka-mauve.vercel.app"),
  title: { default: "LOKA — Living Social Space", template: "%s · LOKA" },
  description: "Ruang sosial yang hidup untuk catatan, momen, foto, video, dan suara—tanpa kebisingan.",
  openGraph: { title: "LOKA — Living Social Space", description: "Sosial tanpa riuh. Manusia sebelum metrik.", type: "website", locale: "id_ID" },
  twitter: { card: "summary_large_image", title: "LOKA — Living Social Space", description: "Sosial tanpa riuh. Manusia sebelum metrik." },
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <a className="skip-link" href="#main-content">Lewati ke konten</a>
        {children}
        <PwaRegister />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
