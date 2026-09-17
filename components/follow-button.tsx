"use client";
import { useState, useTransition } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { toggleFollow } from "@/app/actions";

export default function FollowButton({ profileId, initial, initialRequested = false }: { profileId: string; initial: boolean; initialRequested?: boolean }) {
  const [state, setState] = useState<"following" | "idle" | "requested">(initial ? "following" : initialRequested ? "requested" : "idle"); const [pending, startTransition] = useTransition();
  return <button className={state !== "idle" ? "follow-button following" : "follow-button"} disabled={pending || state === "requested"} onClick={() => { const previous = state; setState(state === "following" ? "idle" : "following"); startTransition(async () => { try { const result = await toggleFollow(profileId); setState(result.state === "followed" ? "following" : result.state === "requested" ? "requested" : "idle"); if (result.state === "requested") toast.success("Permintaan mengikuti dikirim."); } catch (error) { setState(previous); toast.error(error instanceof Error ? error.message : "Gagal memperbarui relasi."); } }); }}>
    {state !== "idle" ? <UserCheck size={18} /> : <UserPlus size={18} />}{state === "following" ? "Mengikuti" : state === "requested" ? "Diminta" : "Ikuti"}
  </button>;
}
