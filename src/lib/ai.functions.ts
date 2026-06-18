import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Mode = z.enum(["normal", "deep_search", "think", "image"]);

function nowContext() {
  const d = new Date();
  const iso = d.toISOString();
  const utc = d.toUTCString();
  const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const human = d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" });
  return { iso, utc, weekday, human, time, date: iso.slice(0, 10) };
}

const TODAY = () => nowContext().date;

const BASE_QUALITY = () => {
  const n = nowContext();
  return `CURRENT DATE/TIME (authoritative, do not contradict):
- Today (UTC): ${n.human}
- ISO date: ${n.date}
- Day of week: ${n.weekday}
- Time (UTC): ${n.time}
- Full UTC timestamp: ${n.utc}
When the user asks the date, day, month, year, or time, use the values above verbatim. Convert to the user's stated timezone if they give one; otherwise state UTC.

You are an expert assistant on par with ChatGPT, Claude, and Gemini. Apply these quality rules silently before sending:

REASONING
1. Decompose the request: identify real intent, constraints, ambiguity. If a critical detail is missing, ask one focused question; otherwise answer the most likely interpretation and state the assumption briefly.
2. Plan step-by-step internally. For non-trivial problems consider 2+ approaches and pick the strongest.
3. Self-review your draft before sending: verify each factual claim, each calculation, each code branch, and remove any contradictions. If uncertain, say so plainly rather than guessing.

MATH
4. Work step-by-step internally. Verify every result with an independent method (re-derive, plug back in, unit check, sanity bound). Double-check arithmetic, percentages, and conversions. Output only the verified result with concise working when helpful.

CODE
5. Produce code that compiles and runs in the stated language/version. Mentally trace a sample input end-to-end. Check brackets, indentation, imports, undefined variables, nulls, empty inputs, off-by-one, and async errors. Prefer idiomatic, modern patterns; no deprecated APIs.

DATES & TIME
6. Anchor every date/time computation to the values above. Never assume an older "current" year. For phrases like "next Tuesday" or "in 3 weeks", compute and state the exact ISO date.

FACTS
7. Prefer authoritative, recent, well-known information. Never fabricate citations, URLs, statistics, APIs, package names, function signatures, or quotes. If unsure, say "I'm not certain" and explain what would confirm it.
8. Resolve conflicts by trusting the most authoritative, recent, internally consistent source. Call out trade-offs.

CONVERSATION
9. Track multi-turn context. Refer back to earlier user messages when relevant. Maintain previously established preferences, names, and constraints.
10. Match the user's depth: concise for quick questions; thorough and structured (markdown headings, lists, code blocks) for complex ones.

OUTPUT
11. Be direct. No filler ("Certainly!", "As an AI..."). End with the answer, not meta-commentary.`;
};

const SYSTEM_PROMPTS: Record<string, () => string> = {
  normal: () =>
    `You are Open1 AI, a fast, accurate, friendly modern assistant rivaling ChatGPT, Claude, and Gemini.\n${BASE_QUALITY()}`,
  deep_search: () =>
    `You are Open1 AI in Deep Search mode. Provide thorough, well-researched, multi-angle answers. Cover relevant facts, trade-offs, edge cases, and caveats. Structure with headings and lists.\n${BASE_QUALITY()}`,
  think: () =>
    `You are Open1 AI in Think mode. Reason step-by-step internally with extra rigor. Provide a brief reasoning outline (3-6 bullets), then a confident, well-justified final answer.\n${BASE_QUALITY()}`,
};

// Heuristic: only run the verification pass when it's likely to matter.
// Keeps latency low for chit-chat while catching math/code/date/factual mistakes.
function needsVerification(prompt: string, draft: string): boolean {
  if (!draft || draft.length < 20) return false;
  const t = `${prompt}\n${draft}`.toLowerCase();
  if (/[0-9].*[+\-*/=%].*[0-9]|\b(calculate|compute|solve|percent|percentage|convert|how many|how much)\b/.test(t)) return true;
  if (/```|\bfunction\b|\bclass\b|\bdef \b|\bimport \b|<\/?[a-z][^>]*>/.test(draft)) return true;
  if (/\b(today|tomorrow|yesterday|date|day|year|month|time|when|deadline|due)\b/.test(t)) return true;
  if (draft.length > 600) return true;
  return false;
}

async function verifyAndCorrect(
  userPrompt: string,
  draft: string,
  history: Array<{ role: string; content: unknown }>,
): Promise<string> {
  try {
    const critic = `You are a strict reviewer. Examine the DRAFT ANSWER below for the USER QUESTION.
Check: factual accuracy, logical consistency, math (recompute every number), code (syntax, brackets, undefined vars, edge cases), date/time correctness against the system date, contradictions, hallucinated references, and clarity.

If the draft is fully correct and clear, output it unchanged.
If there are any errors, rewrite the draft into a corrected, polished final answer.
Output ONLY the final answer text the user should see. No preface, no "Corrected:", no review notes.`;
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `${critic}\n\n${BASE_QUALITY()}` },
        ...history.slice(-6),
        { role: "user", content: `USER QUESTION:\n${userPrompt}\n\nDRAFT ANSWER:\n${draft}` },
      ],
    });
    const out = result?.choices?.[0]?.message?.content?.trim();
    return out && out.length > 10 ? out : draft;
  } catch (err) {
    console.warn("[sendChat] verification skipped", err);
    return draft;
  }
}

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
        let draft = choice?.message?.content?.trim() || "(no response)";
        if (choice?.finish_reason && choice.finish_reason !== "stop") {
          console.warn("[sendChat] non-stop finish_reason:", choice.finish_reason);
        }
        if (draft !== "(no response)" && needsVerification(data.prompt, draft)) {
          draft = await verifyAndCorrect(data.prompt, draft, history);
        }
        assistantContent = draft;
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