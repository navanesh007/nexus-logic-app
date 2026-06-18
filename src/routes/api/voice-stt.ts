import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/voice-stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !LOVABLE_API_KEY) {
          return new Response("Misconfigured", { status: 500 });
        }
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = auth.slice(7).trim();
        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: claims, error } = await supabase.auth.getClaims(token);
        if (error || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

        const incoming = await request.formData();
        const raw = incoming.get("file");
        if (!raw || typeof raw === "string") {
          return new Response("Missing audio file", { status: 400 });
        }
        const file = raw as Blob;
        if (file.size < 1024) return new Response("Empty audio", { status: 400 });
        if (file.size > 24 * 1024 * 1024) return new Response("Audio too large", { status: 413 });

        const upstream = new FormData();
        const blob = file as Blob;
        const type = blob.type.split(";")[0];
        const ext =
          type === "audio/mp4" ? "mp4" :
          type === "audio/mpeg" ? "mp3" :
          type === "audio/wav" ? "wav" :
          "webm";
        upstream.append("file", blob, `recording.${ext}`);
        upstream.append("model", "openai/gpt-4o-mini-transcribe");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: upstream,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return new Response(text || `STT failed (${res.status})`, { status: res.status });
        }
        const json = (await res.json().catch(() => ({}))) as { text?: string };
        return Response.json({ text: json.text ?? "" });
      },
    },
  },
});
