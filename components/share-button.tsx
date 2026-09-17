"use client";
import { Share2 } from "lucide-react";
import { toast } from "sonner";

export default function ShareButton({ postId, text }: { postId: string; text: string }) {
  async function share() {
    const url = `${window.location.origin}/p/${postId}`;
    try {
      if (navigator.share) await navigator.share({ title: "Jejak di LOKA", text: text.slice(0, 120), url });
      else { await navigator.clipboard.writeText(url); toast.success("Tautan disalin."); }
    } catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; toast.error("Tautan belum bisa dibagikan."); }
  }
  return <button onClick={share} aria-label="Bagikan tautan"><Share2 size={20} /></button>;
}
