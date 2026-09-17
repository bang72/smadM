import { redirect } from "next/navigation";
import { getViewer } from "@/lib/queries";

export default async function ProfilePage() {
  const { profile } = await getViewer();
  if (!profile) return null;
  redirect(`/u/${profile.username}`);
}
