import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Mode = z.enum(["normal", "deep_search", "think", "image"]);

const SYSTEM_PROMPTS: Record<string, string> = {
  normal:
    "You are Open1 AI, a fast, friendly, modern assistant. Answer clearly and concisely with markdown when helpful.",
  deep_search:
    "You are Open1 AI in Deep Search mode. Provide thorough, well-researched answers. Cite reasoning, break down complex topics, and surface relevant facts and considerations.",
  think:
    "You are Open1 AI in Think mode. Think step-by-step before answering. Show your reasoning briefly, then give a clear, confident final answer.",
};

async function callGateway(path: string, body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(`https://ai.gateway.lovable.dev/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please upgrade your workspace.");
    throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      chatId: z.string().uuid(),
      mode: Mode,
      prompt: z.string().min(1).max(8000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify chat ownership and get message history
    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("id, title, mode")
      .eq("id", data.chatId)
      .eq("user_id", userId)
      .maybeSingle();
    if (chatErr || !chat) throw new Error("Chat not found");

    // Save user message
    const { error: userMsgErr } = await supabase.from("messages").insert({
      chat_id: data.chatId,
      user_id: userId,
      role: "user",
      content: data.prompt,
    });
    if (userMsgErr) throw new Error(userMsgErr.message);

    let assistantContent = "";
    let assistantImage: string | null = null;

    if (data.mode === "image") {
      const result = await callGateway("images/generations", {
        model: "google/gemini-2.5-flash-image",
        prompt: data.prompt,
      });
      const url: string | undefined =
        result?.data?.[0]?.url ?? result?.data?.[0]?.b64_json
          ? result.data[0].url ?? `data:image/png;base64,${result.data[0].b64_json}`
          : undefined;
      if (!url) throw new Error("No image returned");
      assistantImage = url;
      assistantContent = `Generated image for: "${data.prompt}"`;
    } else {
      // Build history (last 20 messages) for context
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("chat_id", data.chatId)
        .order("created_at", { ascending: true })
        .limit(20);
      const messages = [
        { role: "system", content: SYSTEM_PROMPTS[data.mode] ?? SYSTEM_PROMPTS.normal },
        ...(history ?? []).map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      ];
      const result = await callGateway("chat/completions", {
        model: "google/gemini-3-flash-preview",
        messages,
      });
      assistantContent =
        result?.choices?.[0]?.message?.content ?? "(no response)";
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
    if (saveErr) throw new Error(saveErr.message);

    // Auto-title chat from first user prompt
    if (chat.title === "New chat") {
      const title = data.prompt.slice(0, 60);
      await supabase
        .from("chats")
        .update({ title, mode: data.mode })
        .eq("id", data.chatId);
    } else {
      await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", data.chatId);
    }

    return saved;
  });