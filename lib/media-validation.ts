const signatures: Record<string, number[][]> = {
  "image/jpeg": [[0xff,0xd8,0xff]], "image/png": [[0x89,0x50,0x4e,0x47]], "image/gif": [[0x47,0x49,0x46,0x38]],
  "image/webp": [[0x52,0x49,0x46,0x46]], "video/webm": [[0x1a,0x45,0xdf,0xa3]],
  "audio/mpeg": [[0x49,0x44,0x33],[0xff,0xfb],[0xff,0xf3],[0xff,0xf2]], "audio/wav": [[0x52,0x49,0x46,0x46]], "audio/ogg": [[0x4f,0x67,0x67,0x53]], "audio/webm": [[0x1a,0x45,0xdf,0xa3]],
};

export async function validateMediaFile(file: File, maxBytes = 50 * 1024 * 1024) {
  if (!file.size || file.size > maxBytes) throw new Error(`${file.name}: ukuran file tidak diizinkan.`);
  const isIsoMedia = ["video/mp4", "video/quicktime", "audio/mp4"].includes(file.type);
  const allowed = signatures[file.type]; if (!allowed && !isIsoMedia) throw new Error(`${file.name}: format tidak didukung.`);
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const valid = isIsoMedia
    ? String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
    : allowed!.some((signature) => signature.every((byte, index) => bytes[index] === byte));
  if (!valid) throw new Error(`${file.name}: isi file tidak cocok dengan formatnya.`);
  if (file.type === "image/webp" && String.fromCharCode(...bytes.slice(8,12)) !== "WEBP") throw new Error(`${file.name}: WebP tidak valid.`);
  return true;
}
