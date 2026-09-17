"use client";
import { useState,useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/database.types";
import { Avatar } from "./app-shell";
import { toggleCloseFriend } from "@/app/actions";
export default function CloseFriends({people,initial}:{people:Profile[];initial:string[]}){const [selected,setSelected]=useState(new Set(initial));const [pending,start]=useTransition();return <section className="settings-card"><header><Star/><div><h2>Teman Dekat</h2><p>Sekilas berlabel Teman Dekat hanya terlihat oleh orang pilihanmu.</p></div></header>{!people.length?<p className="muted">Ikuti seseorang terlebih dahulu untuk menambahkannya.</p>:<div className="close-friend-list">{people.map(person=><article key={person.id}><Avatar profile={person}/><div><b>{person.display_name}</b><span>@{person.username}</span></div><button className={selected.has(person.id)?"selected":""} disabled={pending} onClick={()=>start(async()=>{try{const result=await toggleCloseFriend(person.id);setSelected(current=>{const next=new Set(current);if(result.added)next.add(person.id);else next.delete(person.id);return next});}catch(error){toast.error(error instanceof Error?error.message:"Gagal memperbarui.");}})}>{selected.has(person.id)?"Dipilih":"Tambah"}</button></article>)}</div>}</section>}
