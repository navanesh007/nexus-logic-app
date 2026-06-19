import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  buildSystemPrompt,
  needsVerification,
  verifyAndCorrect,
  distillUserMemory,
} from "@/lib/ai.functions";

type ReqBody = {
  chatId?: string;
  mode?: "normal" | "deep_search" | "think" | "agent";
  prompt?: string;
  imageDataUrl?: string;
};

type HistMsg = {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

function sseEvent(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export const Route = createFileRoute("/api/chat-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Supabase not configured", { status: 500 });
        }
        if (!LOVABLE_API_KEY) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub as string;

        let body: ReqBody;
        try {
          body = (await request.json()) as ReqBody;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const chatId = body.chatId;
        const prompt = (body.prompt ?? "").trim();
        const mode = body.mode === "deep_search" || body.mode === "think" ? body.mode : "normal";
        const imageDataUrl = body.imageDataUrl;
        if (!chatId || !prompt) return new Response("Bad request", { status: 400 });
        if (imageDataUrl && !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(imageDataUrl)) {
          return new Response("Bad image", { status: 400 });
        }
        if (imageDataUrl && imageDataUrl.length > 10_000_000) {
          return new Response("Image too large", { status: 400 });
        }

        // Verify chat belongs to user
        const { data: chat } = await supabase
          .from("chats")
          .select("id, title")
          .eq("id", chatId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!chat) return new Response("Chat not found", { status: 404 });

        // Insert user message
        const { error: userMsgErr } = await supabase.from("messages").insert({
          chat_id: chatId,
          user_id: userId,
          role: "user",
          content: prompt,
          image_url: imageDataUrl ?? null,
        });
        if (userMsgErr) return new Response(userMsgErr.message, { status: 500 });

        // Load memory + history
        const { data: memRow } = await supabase
          .from("user_memory")
          .select("memory, message_count")
          .eq("user_id", userId)
          .maybeSingle();
        const memory = memRow?.memory ?? "";
        const messageCount = memRow?.message_count ?? 0;

        const { data: recent } = await supabase
          .from("messages")
          .select("role, content, image_url, created_at")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: false })
          .limit(20);
        const history: HistMsg[] = (recent ?? [])
          .slice()
          .reverse()
          .map((m) => {
            const role = m.role === "assistant" ? "assistant" : "user";
            if (role === "user" && m.image_url && m.image_url.startsWith("data:image/")) {
              return {
                role,
                content: [
                  { type: "text", text: m.content || "" },
                  { type: "image_url", image_url: { url: m.image_url } },
                ],
              };
            }
            return { role, content: m.content };
          });

        const messages = [
          { role: "system", content: buildSystemPrompt(mode, memory) },
          ...history,
        ];

        // Call gateway with streaming
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Lovable-API-Key": LOVABLE_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages,
            stream: true,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          if (upstream.status === 429) {
            return new Response("Rate limit reached. Try again shortly.", { status: 429 });
          }
          if (upstream.status === 402) {
            return new Response("AI credits exhausted.", { status: 402 });
          }
          return new Response(`Gateway error: ${text.slice(0, 200)}`, { status: 502 });
        }

        const encoder = new TextEncoder();

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            let draft = "";

            const send = (obj: unknown) => controller.enqueue(encoder.encode(sseEvent(obj)));

            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                // Parse SSE chunks
                const parts = buf.split("\n\n");
                buf = parts.pop() ?? "";
                for (const part of parts) {
                  const line = part.split("\n").find((l) => l.startsWith("data:"));
                  if (!line) continue;
                  const data = line.slice(5).trim();
                  if (!data || data === "[DONE]") continue;
                  try {
                    const json = JSON.parse(data);
                    const delta: string | undefined = json?.choices?.[0]?.delta?.content;
                    if (delta) {
                      draft += delta;
                      send({ type: "token", text: delta });
                    }
                  } catch {
                    // ignore non-JSON keepalives
                  }
                }
              }

              if (!draft.trim()) draft = "(no response)";

              // Save assistant message
              const { data: saved } = await supabase
                .from("messages")
                .insert({
                  chat_id: chatId,
                  user_id: userId,
                  role: "assistant",
                  content: draft,
                  image_url: null,
                })
                .select("id")
                .single();
              const msgId = saved?.id ?? null;
              send({ type: "saved", id: msgId, content: draft });

              // Bump chat title/updated_at
              if (chat.title === "New chat") {
                const title = prompt.slice(0, 60) || "New chat";
                await supabase.from("chats").update({ title, mode }).eq("id", chatId);
              } else {
                await supabase
                  .from("chats")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", chatId);
              }

              // Async verification — emit refined if it changed
              if (draft !== "(no response)" && needsVerification(prompt, draft)) {
                const flatHistory = history.map((h) => ({
                  role: h.role,
                  content: typeof h.content === "string"
                    ? h.content
                    : h.content.map((p) => (p.type === "text" ? p.text : "")).join(" "),
                }));
                const refined = await verifyAndCorrect(prompt, draft, flatHistory, memory);
                if (refined && refined.trim() !== draft.trim() && msgId) {
                  await supabase
                    .from("messages")
                    .update({ content: refined })
                    .eq("id", msgId)
                    .eq("user_id", userId);
                  send({ type: "refined", content: refined });
                }
              }

              // Fire-and-forget memory distill every 6 user turns
              const nextCount = messageCount + 1;
              if (nextCount >= 6) {
                const recentForMemory = [
                  ...history.slice(-8).map((h) => ({
                    role: h.role,
                    content: typeof h.content === "string"
                      ? h.content
                      : (h.content.find((p) => p.type === "text")?.text ?? ""),
                  })),
                  { role: "user", content: prompt },
                  { role: "assistant", content: draft },
                ];
                // intentionally not awaited beyond the stream lifecycle
                void distillUserMemory(supabase, userId, memory, recentForMemory);
              } else {
                await supabase
                  .from("user_memory")
                  .upsert(
                    { user_id: userId, memory, message_count: nextCount, updated_at: new Date().toISOString() },
                    { onConflict: "user_id" },
                  );
              }

              send({ type: "done" });
            } catch (err) {
              console.error("[chat-stream]", err);
              send({ type: "error", message: (err as Error).message || "Stream error" });
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
