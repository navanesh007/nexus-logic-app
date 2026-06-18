import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Mode = z.enum(["normal", "deep_search", "think", "image"]);

const TODAY = () => new Date().toISOString().slice(0, 10);

const BASE_QUALITY = () => `Today's date is ${TODAY()}. Always reason about dates relative to this.
You are an expert assistant on par with ChatGPT, Claude, and Gemini. Apply these quality rules silently before sending:

REASONING
1. Decompose the user's request. Identify the real intent, constraints, and any ambiguity. If a critical detail is missing, ask one focused clarifying question; otherwise answer the most likely interpretation and note the assumption briefly.
2. Plan internally step-by-step. For non-trivial problems consider 2+ approaches and pick the strongest.
3. Self-check: re-read your draft and verify each factual claim, each calculation, and each code branch before sending. If anything is uncertain, say so plainly rather than guessing.

MATH
4. Work step-by-step internally. Then verify the final number with an independent method (re-derive, plug back in, dimensional/unit check, sanity bound). Only output the verified result. Show concise working when it aids understanding.

CODE
5. Produce code that compiles and runs in the stated language and version. Handle nulls, empty input, off-by-one, async errors, and obvious edge cases. Mentally trace a sample input end-to-end before sending. Prefer idiomatic, modern patterns; avoid deprecated APIs. Include short usage notes when non-obvious.

DATES & TIME
6. Use ISO dates anchored to ${TODAY()}. Never assume an older "current" year. For relative phrasing ("next Tuesday", "in 3 weeks") compute the exact date and state it.

FACTS & CITATIONS
7. Prefer well-known, authoritative, and recent information. Never fabricate citations, URLs, statistics, APIs, package names, or function signatures. If unsure, say "I'm not certain" and explain what would confirm it.
8. Resolve conflicting info by trusting the most authoritative, recent, internally consistent source. Call out trade-offs.

CONVERSATION
9. Track multi-turn context. Refer back to earlier user messages explicitly when relevant. Maintain previously established preferences, names, and constraints.
10. Match the user's depth: concise for quick questions; thorough, structured (markdown headings, lists, code blocks) for complex ones. Default to clear, well-organized explanations rather than terse one-liners when the topic warrants it.

OUTPUT
11. Be direct and useful. No filler ("Certainly!", "As an AI..."). Use markdown when it helps readability. End with the answer, not meta-commentary.`;

const SYSTEM_PROMPTS: Record<string, () => string> = {
  normal: () =>
    `You are Open1 AI, a fast, accurate, friendly modern assistant rivaling ChatGPT, Claude, and Gemini.\n${BASE_QUALITY()}`,
  deep_search: () =>
    `You are Open1 AI in Deep Search mode. Provide thorough, well-researched, multi-angle answers. Cover relevant facts, trade-offs, edge cases, and caveats. Structure with headings and lists.\n${BASE_QUALITY()}`,
  think: () =>
    `You are Open1 AI in Think mode. Reason step-by-step internally with extra rigor. Provide a brief reasoning outline (3-6 bullets), then a confident, well-justified final answer.\n${BASE_QUALITY()}`,
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