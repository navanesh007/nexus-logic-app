import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Mode = z.enum(["normal", "deep_search", "think", "image"]);

const TODAY = () => new Date().toISOString().slice(0, 10);

const BASE_QUALITY = () => `Today's date is ${TODAY()}. Always reason about dates relative to this.
Quality rules (apply silently before sending the answer):
1. Verify facts. If you are not confident, say so plainly instead of guessing.
2. For math: work step-by-step internally, then double-check the final number by an independent method (re-derivation or unit check). Only output the verified result (plus a brief justification if useful).
3. For code: ensure it compiles/runs in the stated language, prefer standard library, handle edge cases, and mentally trace a sample input before answering.
4. For dates/time math: compute using ISO dates from ${TODAY()}; never assume an older "current" year.
5. Resolve conflicts by trusting the most authoritative, recent, and internally consistent source.
6. Track multi-turn context: refer to earlier user messages explicitly when relevant.
7. Self-review: if a draft answer is unclear, contradictory, or unsupported, rewrite it more clearly before responding.
8. Be concise. Use markdown when it helps. Never fabricate citations, URLs, or APIs.`;

const SYSTEM_PROMPTS: Record<string, () => string> = {
  normal: () =>
    `You are Open1 AI, a fast, accurate, friendly modern assistant.\n${BASE_QUALITY()}`,
  deep_search: () =>
    `You are Open1 AI in Deep Search mode. Provide thorough, well-researched, multi-angle answers. Surface relevant facts, trade-offs, and caveats.\n${BASE_QUALITY()}`,
  think: () =>
    `You are Open1 AI in Think mode. Reason step-by-step internally. Show a brief reasoning outline, then a clear confident final answer.\n${BASE_QUALITY()}`,
};

async function callGateway(path: string, body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(`https://ai.gateway.lovable.dev/v1/${path}`, {
    method: "POST",
    headers: {
      "Lovable-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[ai.gateway] error", res.status, text.slice(0, 500));
    if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please upgrade your workspace.");
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json;
}

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      chatId: z.string().uuid(),
      mode: Mode,
      prompt: z.string().min(1).max(8000),
      imageDataUrl: z
        .string()
        .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/i)
        .max(10_000_000)
        .optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("id, title, mode")
      .eq("id", data.chatId)
      .eq("user_id", userId)
      .maybeSingle();
    if (chatErr) {
      console.error("[sendChat] chat lookup failed", chatErr);
      throw new Error("Chat lookup failed");
    }
    if (!chat) throw new Error("Chat not found");

    const { error: userMsgErr } = await supabase.from("messages").insert({
      chat_id: data.chatId,
      user_id: userId,
      role: "user",
      content: data.prompt,
      image_url: data.imageDataUrl ?? null,
    });
    if (userMsgErr) {
      console.error("[sendChat] user message insert failed", userMsgErr);
      throw new Error(userMsgErr.message);
    }

    let assistantContent = "";
    let assistantImage: string | null = null;

    try {
      if (data.mode === "image") {
        const result = await callGateway("images/generations", {
          model: "google/gemini-2.5-flash-image",
          prompt: data.prompt,
        });
        const first = result?.data?.[0];
        const url: string | undefined = first?.url
          ? first.url
          : first?.b64_json
            ? `data:image/png;base64,${first.b64_json}`
            : undefined;
        if (!url) throw new Error("No image returned");
        assistantImage = url;
        assistantContent = `Generated image for: "${data.prompt}"`;
      } else {
        const { data: recent, error: histErr } = await supabase
          .from("messages")
          .select("role, content, image_url, created_at")
          .eq("chat_id", data.chatId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (histErr) console.error("[sendChat] history fetch failed", histErr);
        const history = (recent ?? [])
          .slice()
          .reverse()
          .map((m: { role: string; content: string; image_url: string | null }) => {
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
          { role: "system", content: (SYSTEM_PROMPTS[data.mode] ?? SYSTEM_PROMPTS.normal)() },
          ...history,
        ];
        const result = await callGateway("chat/completions", {
          model: "google/gemini-3-flash-preview",
          messages,
        });
        const choice = result?.choices?.[0];
        assistantContent = choice?.message?.content?.trim() || "(no response)";
        if (choice?.finish_reason && choice.finish_reason !== "stop") {
          console.warn("[sendChat] non-stop finish_reason:", choice.finish_reason);
        }
      }
    } catch (err) {
      console.error("[sendChat] model call failed", err);
      throw err;
    }

    const { data: saved, error: saveErr } = await supabase
      .from("messages")
      .insert({
        chat_id: data.chatId,
        user_id: userId,
        role: "assistant",
        content: assistantContent,
        image_url: assistantImage,
      })
      .select()
      .single();
    if (saveErr) {
      console.error("[sendChat] assistant insert failed", saveErr);
      throw new Error(saveErr.message);
    }

    if (chat.title === "New chat") {
      const title = data.prompt.slice(0, 60) || "New chat";
      await supabase.from("chats").update({ title, mode: data.mode }).eq("id", data.chatId);
    } else {
      await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.chatId);
    }

    return saved;
  });