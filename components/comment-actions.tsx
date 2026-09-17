"use client";
import { useState, useTransition } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteComment } from "@/app/actions";
import CommentForm from "./comment-form";
export default function CommentActions({commentId,postId,own}:{commentId:string;postId:string;own:boolean}){const [reply,setReply]=useState(false);const [pending,start]=useTransition();return <div className="comment-actions"><button onClick={()=>setReply(!reply)}><MessageCircle size={13}/>Balas</button>{own&&<button disabled={pending} onClick={()=>start(async()=>{try{await deleteComment(commentId,postId);toast.success("Tanggapan dihapus.");}catch{toast.error("Gagal menghapus.");}})}><Trash2 size={13}/>Hapus</button>}{reply&&<CommentForm postId={postId} parentId={commentId} compact/>}</div>}
