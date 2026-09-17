"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Eye, Heart, Lock, MessageCircle, MoreHorizontal, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deletePost, toggleBookmark, toggleLike } from "@/app/actions";
import type { Post } from "@/lib/database.types";
import { Avatar } from "./app-shell";
import ShareButton from "./share-button";
import ReportDialog from "./report-dialog";
import EditPostDialog from "./edit-post-dialog";

const kindLabel = { note: "Catatan", moment: "Momen", sound: "Suara", question: "Tanya" };

function timeAgo(value: string) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "baru saja";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mnt`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} hari`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(value));
}

export default function PostCard({ post, viewerId, hideCounts = false }: { post: Post; viewerId: string; hideCounts?: boolean }) {
  const [liked, setLiked] = useState(post.likes.some((item) => item.user_id === viewerId));
  const [saved, setSaved] = useState(post.bookmarks.some((item) => item.user_id === viewerId));
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [revealed, setRevealed] = useState(!post.content_warning);
  const [pending, startTransition] = useTransition();
  const media = useMemo(() => [...(post.media || [])].sort((a, b) => a.position - b.position), [post.media]);

  function like() {
    const next = !liked; setLiked(next); setLikeCount((value) => value + (next ? 1 : -1));
    startTransition(async () => { try { await toggleLike(post.id); } catch { setLiked(!next); setLikeCount((value) => value + (next ? -1 : 1)); toast.error("Gagal memperbarui suka."); } });
  }
  function save() {
    const next = !saved; setSaved(next);
    startTransition(async () => { try { await toggleBookmark(post.id); toast.success(next ? "Disimpan." : "Dihapus dari simpanan."); } catch { setSaved(!next); toast.error("Gagal menyimpan."); } });
  }

  return (
    <article className="post-card" aria-busy={pending}>
      <header className="post-header">
        <Link href={`/u/${post.profiles.username}`}><Avatar profile={post.profiles} /></Link>
        <div><Link href={`/u/${post.profiles.username}`}><strong>{post.profiles.display_name}</strong></Link><span>@{post.profiles.username} · {timeAgo(post.created_at)}</span></div>
        <span className="post-visibility" title={`Audiens: ${post.visibility}`}>{post.visibility === "public" ? <Eye size={14} /> : post.visibility === "followers" ? <Users size={14} /> : <Lock size={14} />}</span><span className={`kind-pill kind-${post.kind}`}>{kindLabel[post.kind] || "Catatan"}</span>
        <div className="post-menu-wrap">
          <button className="icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu postingan"><MoreHorizontal size={20} /></button>
          {menuOpen && <div className="post-popover">
            {post.author_id === viewerId ? <><EditPostDialog postId={post.id} body={post.body} allowComments={post.allow_comments} contentWarning={post.content_warning}/><button className="menu-action danger" onClick={() => startTransition(async () => { await deletePost(post.id); toast.success("Postingan dihapus."); })}><Trash2 size={16} /> Hapus</button></> : <ReportDialog targetType="post" targetId={post.id} />}
          </div>}
        </div>
      </header>
      {post.body && <p className="post-copy">{post.body}</p>}
      {post.content_warning && !revealed && <button className="content-warning" onClick={() => setRevealed(true)}><strong>Peringatan konten</strong><span>{post.content_warning}</span><i>Tampilkan media</i></button>}
      {media.length > 0 && revealed && <div className={`post-media count-${media.length}`}>
        {media.map((item) => <div className={`media-item ${item.media_type}`} key={item.id}>
          {item.media_type === "image" && <Image src={item.url} alt={item.alt_text || "Media postingan"} fill sizes="(max-width: 720px) 100vw, 620px" />}
          {item.media_type === "video" && <video src={item.url} controls playsInline preload="metadata" />}
          {item.media_type === "audio" && <div className="audio-player"><div className="audio-art"><span>LOKA</span><i /><i /><i /><i /><i /></div><audio src={item.url} controls preload="metadata" /></div>}
        </div>)}
      </div>}
      <footer className="post-actions">
        <button className={liked ? "liked" : ""} onClick={like} aria-label={liked ? "Batal resonansi" : "Beri resonansi"}><Heart size={20} fill={liked ? "currentColor" : "none"} /><span>{hideCounts ? "Resonansi" : likeCount || ""}</span></button>
        <Link className="post-action-link" href={`/p/${post.id}`} aria-label="Buka tanggapan"><MessageCircle size={20} /><span>{hideCounts ? "Tanggapi" : post.comments?.[0]?.count || ""}</span></Link>
        <ShareButton postId={post.id} text={post.body} />
        <button className={saved ? "saved" : ""} onClick={save} aria-label={saved ? "Batal simpan" : "Simpan"}><Bookmark size={20} fill={saved ? "currentColor" : "none"} /></button>
      </footer>
    </article>
  );
}
