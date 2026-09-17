"use client";
import { ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, FileAudio, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createStory, deleteStory, registerStoryView } from "@/app/actions";
import type { Profile, Story } from "@/lib/database.types";
import { Avatar } from "./app-shell";
import { validateMediaFile } from "@/lib/media-validation";

export default function StoryRail({ stories, profile, userId }: { stories: Story[]; profile: Profile; userId: string }) {
  const [createOpen, setCreateOpen] = useState(false); const [active, setActive] = useState<Story | null>(null); const [file, setFile] = useState<File | null>(null); const [caption, setCaption] = useState(""); const [audience,setAudience]=useState<"public"|"followers"|"close_friends">("public"); const [busy, setBusy] = useState(false);
  const [activeList,setActiveList]=useState<Story[]>([]); const [activeIndex,setActiveIndex]=useState(0);
  const grouped = stories.filter((story, index, list) => list.findIndex((item) => item.user_id === story.user_id) === index);
  function showAt(list:Story[],index:number){const next=list[index];if(!next)return;setActiveList(list);setActiveIndex(index);setActive(next);if(next.user_id!==userId)void registerStoryView(next.id);}
  function move(delta:number){const next=activeIndex+delta;if(next>=0&&next<activeList.length)showAt(activeList,next);else if(next>=activeList.length)setActive(null);}
  useEffect(()=>{if(!active)return;function onKey(event:KeyboardEvent){if(event.key==="Escape")setActive(null);if(event.key==="ArrowRight")move(1);if(event.key==="ArrowLeft")move(-1);}window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);});
  async function pick(event: ChangeEvent<HTMLInputElement>) { const selected = event.target.files?.[0]; if (!selected) return; try { await validateMediaFile(selected); setFile(selected); } catch (error) { toast.error(error instanceof Error ? error.message : "File tidak valid."); } }
  async function publish() {
    if (!file) return; setBusy(true); const supabase = createClient(); const storyId=crypto.randomUUID(); const ext = file.name.split(".").pop()?.toLowerCase() || "bin"; const path = `${userId}/stories/${storyId}.${ext}`; const bucket=audience==="public"?"media":"private-media";
    try { const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type }); if (error) throw error; const mediaUrl=bucket==="media"?supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl:""; const mediaType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "audio"; await createStory({ id:storyId, caption, mediaUrl, storagePath: path, mediaType, accent: "cobalt", audience }); setCreateOpen(false); setFile(null); setCaption(""); setAudience("public"); toast.success("Sekilas aktif selama 24 jam."); } catch (error) { await supabase.storage.from(bucket).remove([path]); toast.error(error instanceof Error ? error.message : "Gagal mengunggah Sekilas."); } finally { setBusy(false); }
  }
  return <section className="story-section" aria-label="Sekilas">
    <div className="story-heading"><div><span className="eyebrow">SEKILAS · 24 JAM</span><h2>Yang sedang hidup</h2></div><span>{stories.length} jejak</span></div>
    <div className="story-rail">
      <button className="story-add" onClick={() => setCreateOpen(true)}><span><Avatar profile={profile} /><i><Plus size={15} /></i></span><b>Tambah</b></button>
      {grouped.map((story) => <button className="story-bubble" key={story.id} onClick={() => showAt(stories.filter(item=>item.user_id===story.user_id).reverse(),0)}><span><Avatar profile={story.profiles} /></span><b>{story.user_id === userId ? "Sekilasmu" : story.profiles.display_name.split(" ")[0]}</b></button>)}
    </div>
    {createOpen && <div className="dialog-backdrop"><div className="dialog-card story-create"><button className="modal-close" onClick={() => setCreateOpen(false)}><X /></button><span className="eyebrow">BUAT SEKILAS</span><h2>Satu momen, 24 jam.</h2><label className="story-file"><input type="file" accept="image/*,video/*,audio/*" onChange={pick} />{file ? file.name : "Pilih foto, video, atau audio"}</label><textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={180} placeholder="Beri konteks singkat…" /><select value={audience} onChange={event=>setAudience(event.target.value as typeof audience)} aria-label="Audiens Sekilas"><option value="public">Publik</option><option value="followers">Pengikut</option><option value="close_friends">Teman dekat</option></select><button className="primary-button" disabled={!file || busy} onClick={publish}>{busy ? <Loader2 className="spin" /> : "Hidupkan Sekilas"}</button></div></div>}
    {active && <div className="story-viewer" role="dialog" aria-modal="true" aria-label={`Sekilas ${active.profiles.display_name}`} onClick={() => setActive(null)}><button className="modal-close" aria-label="Tutup Sekilas"><X /></button><div className="story-frame" onClick={(event) => event.stopPropagation()}><div className="story-progress">{activeList.map((item,index)=><i key={item.id} className={index<=activeIndex?"active":""}/>)}</div><header><Avatar profile={active.profiles} /><span><b>{active.profiles.display_name}</b><small>@{active.profiles.username} · {activeIndex+1}/{activeList.length}{active.user_id===userId?` · ${active.story_views?.[0]?.count||0} melihat`:""}</small></span>{active.user_id === userId && <button aria-label="Hapus Sekilas" onClick={async () => { await deleteStory(active.id); setActive(null); }}><Trash2 size={18} /></button>}</header><div className="story-media">{active.media_type === "image" && <Image src={active.media_url} alt={active.caption || "Sekilas"} fill sizes="min(90vw, 520px)" />}{active.media_type === "video" && <video src={active.media_url} autoPlay controls playsInline />}{active.media_type === "audio" && <div className="story-audio"><FileAudio size={54} /><b>Suara dari LOKA</b><audio src={active.media_url} controls autoPlay /></div>}<button className="story-prev" disabled={activeIndex===0} onClick={()=>move(-1)} aria-label="Sekilas sebelumnya"><ChevronLeft/></button><button className="story-next" onClick={()=>move(1)} aria-label="Sekilas berikutnya"><ChevronRight/></button></div>{active.caption && <p>{active.caption}</p>}</div></div>}
  </section>;
}
