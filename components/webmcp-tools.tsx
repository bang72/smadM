"use client";

import { useEffect } from "react";
import { createPost } from "@/app/actions";

type ModelTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown) => Promise<unknown>;
};

declare global {
  interface Document {
    modelContext?: { registerTool(tool: ModelTool, options?: { signal?: AbortSignal }): void | Promise<void> };
  }
}

export default function WebMcpTools() {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "create_text_post",
      title: "Buat postingan teks",
      description: "Terbitkan satu postingan teks baru ke feed LOKA milik pengguna yang sedang masuk.",
      inputSchema: {
        type: "object",
        properties: { body: { type: "string", minLength: 1, maxLength: 1200, description: "Teks postingan." } },
        required: ["body"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const body = typeof input === "object" && input !== null && "body" in input ? String((input as { body: unknown }).body).trim() : "";
        if (!body || body.length > 1200) throw new Error("Isi harus 1–1200 karakter.");
        const result = await createPost({ body, media: [] });
        return { id: result.id, status: "published" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  return null;
}
