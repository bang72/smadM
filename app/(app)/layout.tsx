import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import { getViewer } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getViewer();
  if (!user) redirect("/");
  if (!profile) redirect("/onboarding");
  if (profile.account_status !== "active") redirect("/account-status");
  return <AppShell profile={profile}>{children}</AppShell>;
}
