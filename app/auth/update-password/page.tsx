"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage(){const router=useRouter();const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const form=new FormData(event.currentTarget);const password=String(form.get("password")||"");const {error}=await createClient().auth.updateUser({password});if(error){setMessage(error.message);setBusy(false);return;}router.replace("/feed");router.refresh();}return <main className="setup-shell"><section className="onboarding-card"><div className="brand-mark">L</div><p className="eyebrow">PEMULIHAN AKUN</p><h1>Buat password baru.</h1><form className="auth-form" onSubmit={submit}><label>Password baru<input type="password" name="password" minLength={10} required autoComplete="new-password"/></label>{message&&<p className="form-message">{message}</p>}<button className="primary-button" disabled={busy}>{busy?"Menyimpan…":"Simpan password"}</button></form></section></main>}
