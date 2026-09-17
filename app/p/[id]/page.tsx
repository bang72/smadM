import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import PostCard from "@/components/post-card";
import CommentForm from "@/components/comment-form";
import { Avatar } from "@/components/app-shell";
import { getComments, getPost, getViewer } from "@/lib/queries";
import type { Comment, Post } from "@/lib/database.types";
import CommentActions from "@/components/comment-actions";
import type { Metadata } from "next";

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;const post=await getPost(id);if(!post)return{title:"Jejak tidak ditemukan"};const item=post as unknown as Post;const image=item.media?.find(media=>media.media_type==="image")?.url;return{title:`Jejak ${item.profiles.display_name}`,description:item.body.slice(0,160)||"Jejak multimodal di LOKA",openGraph:{title:`${item.profiles.display_name} di LOKA`,description:item.body.slice(0,160),type:"article",images:image?[{url:image,alt:item.media.find(media=>media.url===image)?.alt_text||"Media LOKA"}]:undefined}}}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const [post, viewer, comments] = await Promise.all([getPost(id), getViewer(), getComments(id)]); if (!post) notFound();
  return <div className="shared-page"><header className="shared-top"><Link href={viewer.user ? "/feed" : "/"} className="wordmark"><span>L</span><b>LOKA</b></Link><Link href={viewer.user ? "/feed" : "/"} className="secondary-button"><ArrowLeft size={17} />{viewer.user ? "Kembali ke ruang" : "Masuk ke LOKA"}</Link></header><main className="shared-main"><div className="shared-label"><span className="eyebrow">TAUTAN JEJAK</span><h1>Sesuatu yang hidup di LOKA.</h1></div><PostCard post={post as unknown as Post} viewerId={viewer.user?.id || ""} hideCounts={viewer.profile?.hide_counts} /><section className="comments-panel"><h2>Tanggapan <span>{viewer.profile?.hide_counts ? "" : comments.length}</span></h2>{viewer.user && (post as unknown as Post).allow_comments ? <CommentForm postId={id} /> : viewer.user ? <p className="comment-signin">Tanggapan dinonaktifkan.</p> : <Link href="/" className="comment-signin">Masuk untuk ikut menanggapi</Link>}<div className="comments-list">{(comments as unknown as Comment[]).map((comment) => <article className={comment.parent_id ? "reply" : ""} key={comment.id}><Link href={`/u/${comment.profiles.username}`}><Avatar profile={comment.profiles} /></Link><div><p><strong>{comment.profiles.display_name}</strong><span>@{comment.profiles.username}</span></p><div>{comment.body}</div>{viewer.user && <CommentActions commentId={comment.id} postId={id} own={comment.profiles.id === viewer.user.id} />}</div></article>)}</div></section></main></div>;
}
