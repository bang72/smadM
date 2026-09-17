import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthScreen from "@/components/auth-screen";
import SetupScreen from "@/components/setup-screen";

export default async function Home() {
  const supabase = await createClient();
  if (!supabase) return <SetupScreen />;
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/feed");
  return <AuthScreen />;
}
