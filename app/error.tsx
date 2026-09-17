"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="route-state"><span className="brand-mark">L</span><h1>Ruang ini tersendat.</h1><p>Tidak ada kontenmu yang hilang. Coba sambungkan kembali.</p><button className="primary-button" onClick={reset}>Coba lagi</button></main>}
