import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Mode = z.enum(["normal", "deep_search", "think", "image", "agent"]);

export function nowContext() {
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

export const BASE_QUALITY = (memory?: string) => {
  const n = nowContext();
  const memoryBlock = memory && memory.trim().length > 0
    ? `\nLONG-TERM USER MEMORY (durable facts about this user, treat as ground truth unless contradicted):\n${memory.trim()}\n`
    : "";
  return `CURRENT DATE/TIME (authoritative, do not contradict):
- Today (UTC): ${n.human}
- ISO date: ${n.date}
- Day of week: ${n.weekday}
- Time (UTC): ${n.time}
- Full UTC timestamp: ${n.utc}
Use these values verbatim for any "today / date / day / year / time" question. Convert to the user's timezone only if they state one; otherwise label as UTC.
${memoryBlock}
You are an expert assistant matching the quality bar of ChatGPT, Claude, and Gemini. Silently apply these rules before every reply.

REASONING
1. Decompose: identify the real intent and constraints. If a critical detail is missing, ask one focused question; otherwise answer the most likely interpretation and briefly state the assumption.
2. Internally consider 2+ approaches for non-trivial problems and pick the strongest.
3. Self-review the draft: verify every factual claim, every calculation, every code branch. Remove contradictions.

MATH
4. Work step-by-step. Verify each result with an independent method (re-derive, plug back in, unit check, sanity bound). Output the verified result with concise working only when it helps.

CODE
5. Code must compile and run in the stated language/version. Mentally trace one input end-to-end. Check brackets, imports, undefined vars, nulls, empty inputs, off-by-one, async. Use modern idioms; no deprecated APIs.

DATES & TIME
6. Anchor every date/time computation to the values above. Never assume an older "current" year. For phrases like "next Tuesday" or "in 3 weeks", compute and state the exact ISO date.

HALLUCINATION GUARD
7. Never invent citations, URLs, statistics, dates, package names, function signatures, quotes, or product features. If unsure, write "I'm not certain" or "I don't know" and explain what would confirm it. Prefer admitting uncertainty over a confident guess.
8. Resolve conflicts by trusting the most authoritative, recent, internally consistent source. Call out trade-offs.

CONVERSATION
9. Track multi-turn context and long-term memory above. Remember preferences, names, and constraints already established.
10. Match the user's depth: concise for quick questions; structured (headings, lists, code blocks) for complex ones.

OUTPUT
11. Be direct. No filler ("Certainly!", "As an AI..."). End with the answer, not meta-commentary.`;
};

const SYSTEM_PROMPTS: Record<string, (memory?: string) => string> = {
  normal: (m) =>
    `You are Open1 AI, a fast, accurate, friendly modern assistant rivaling ChatGPT, Claude, and Gemini.\n${BASE_QUALITY(m)}`,
  deep_search: (m) =>
    `You are Open1 AI in Deep Search mode — Perplexity-style research assistant.
For every answer:
- Synthesize from multiple angles like a real web search would: definitions, current state, recent developments, contrasting viewpoints, key data, edge cases.
- Cite plausible authoritative sources inline as [1], [2], etc.
- End with a "Sources:" section listing real publication / site names you reasonably drew the facts from (Wikipedia, Reuters, Bloomberg, BBC, official docs, well-known org sites). Do NOT invent fake URLs — list source NAMES, optionally with the section/topic in parens.
- Be explicit about freshness limits: if a topic likely changed after your knowledge cutoff, say so and flag what to verify.
- Use headings and bullet points for clarity. Cover trending angles, latest information, and fact-check claims against general knowledge.
${BASE_QUALITY(m)}`,
  think: (m) =>
    `You are Open1 AI in Think (Reasoning) mode. For non-trivial questions, work through this loop internally before answering:
PLAN: break the problem into 2-5 concrete sub-steps.
EXECUTE: solve each sub-step with the math/code/fact rules below.
VERIFY: independently re-check each result (re-derive, plug back in, run mental dry-run, sanity check).
SELF-CORRECT: if any check fails, fix the step and re-verify.
ANSWER: open with a short reasoning outline (3-6 bullets), then give the confident, justified final answer.
${BASE_QUALITY(m)}`,
  agent: (m) =>
    `You are Open1 AI in AGENT mode — a smart autonomous research and reasoning agent rivaling ChatGPT Agent, Perplexity, and Manus AI.

OPERATE IN THIS LOOP (visible to user):
1. **Understand** — restate the user's true goal in one sentence and list explicit/implicit constraints.
2. **Plan** — produce a numbered plan of 3-7 concrete steps you will take.
3. **Research** — for each fact-bearing step, recall multi-source knowledge (definitions, current state, recent developments, contrasting views, edge cases). Flag freshness limits when relevant.
4. **Execute** — work through steps in order. Show calculations, code, or logical derivations explicitly. Verify each numeric result with a second method; trace each code path mentally.
5. **Self-Review** — explicitly critique the draft: any unsupported claim, math slip, contradiction, hallucinated citation, missed constraint? Fix before delivering.
6. **Confidence** — rate confidence (High / Medium / Low) and call out what could change the answer.
7. **Final Answer** — clear, structured, actionable; sources named (not fabricated URLs).

HARD RULES:
- Never fabricate citations, URLs, package names, statistics, or quotes. Prefer "I'm not certain — here is what would confirm it" over a confident guess.
- Use the long-term user memory above as durable context.
- Multi-step reasoning is mandatory for any non-trivial query.
- Output uses headings (## Plan, ## Research, ## Execute, ## Review, ## Answer, ## Confidence) so progress is legible.
${BASE_QUALITY(m)}`,

export function buildSystemPrompt(mode: string, memory?: string): string {
  return (SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.normal)(memory);
}

export function needsVerification(prompt: string, draft: string): boolean {
  if (!draft || draft.length < 20) return false;
  const t = `${prompt}\n${draft}`.toLowerCase();
  if (/[0-9].*[+\-*/=%].*[0-9]|\b(calculate|compute|solve|percent|percentage|convert|how many|how much)\b/.test(t)) return true;
  if (/```|\bfunction\b|\bclass\b|\bdef \b|\bimport \b|<\/?[a-z][^>]*>/.test(draft)) return true;
  if (/\b(today|tomorrow|yesterday|date|day|year|month|time|when|deadline|due)\b/.test(t)) return true;
  if (draft.length > 600) return true;
  return false;
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
  return res.json();
}

export async function verifyAndCorrect(
  userPrompt: string,
  draft: string,
  history: Array<{ role: string; content: unknown }>,
  memory?: string,
): Promise<string> {
  try {
    const critic = `You are a strict reviewer. Examine the DRAFT ANSWER below for the USER QUESTION.
Check, in order: factual accuracy (no fabricated dates/citations/numbers/URLs/APIs), logical consistency, math (recompute every number with a second method), code (syntax, brackets, undefined vars, edge cases, off-by-one, async), date/time correctness against the system date above, contradictions, hallucinated references, clarity.

If the draft is fully correct and clear, output it UNCHANGED.
If any check fails, rewrite the draft into a corrected, polished final answer. When a claim cannot be verified, replace it with an explicit "I'm not certain" rather than guessing.
Output ONLY the final answer text the user should see. No preface, no "Corrected:", no review notes.`;
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `${critic}\n\n${BASE_QUALITY(memory)}` },
        ...history.slice(-6),
        { role: "user", content: `USER QUESTION:\n${userPrompt}\n\nDRAFT ANSWER:\n${draft}` },
      ],
    });
    const out = result?.choices?.[0]?.message?.content?.trim();
    return out && out.length > 10 ? out : draft;
  } catch (err) {
    console.warn("[ai] verification skipped", err);
    return draft;
  }
}

export const getUserMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_memory")
      .select("memory, message_count")
      .eq("user_id", userId)
      .maybeSingle();
    return { memory: data?.memory ?? "", messageCount: data?.message_count ?? 0 };
  });

/** Re-summarize durable facts about the user. Called fire-and-forget. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function distillUserMemory(
  supabase: any,
  userId: string,
  existingMemory: string,
  recentTurns: Array<{ role: string; content: string }>,
): Promise<void> {
  try {
    const turnsText = recentTurns
      .map((t) => `${t.role.toUpperCase()}: ${String(t.content).slice(0, 800)}`)
      .join("\n");
    const prompt = `You maintain a short, durable memory of facts about ONE user across sessions.

EXISTING MEMORY:
${existingMemory || "(empty)"}

RECENT CONVERSATION TURNS:
${turnsText}

Update the memory to capture ONLY durable, reusable facts: the user's name, location, profession, ongoing projects, stated preferences, frequently-discussed topics, recurring goals, language/timezone if mentioned.
DO NOT include: one-off questions, transient facts, anything the user did not state about themselves.
Output the new memory as a compact bullet list (max 12 bullets, each under 140 chars). If nothing durable was learned, output the existing memory unchanged. Output ONLY the bullet list.`;
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    });
    const next = result?.choices?.[0]?.message?.content?.trim();
    if (!next) return;
    await supabase
      .from("user_memory")
      .upsert(
        { user_id: userId, memory: next, message_count: 0, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
  } catch (err) {
    console.warn("[ai] memory distill skipped", err);
  }
}

/**
 * Non-streaming chat. Kept for image mode and as a fallback when the
 * streaming endpoint isn't available. Streaming chat lives in
 * src/routes/api/chat-stream.ts.
 */
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
    if (chatErr) throw new Error("Chat lookup failed");
    if (!chat) throw new Error("Chat not found");

    const { error: userMsgErr } = await supabase.from("messages").insert({
      chat_id: data.chatId,
      user_id: userId,
      role: "user",
      content: data.prompt,
      image_url: data.imageDataUrl ?? null,
    });
    if (userMsgErr) throw new Error(userMsgErr.message);

    let assistantContent = "";
    let assistantImage: string | null = null;

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
      const { data: memRow } = await supabase
        .from("user_memory")
        .select("memory")
        .eq("user_id", userId)
        .maybeSingle();
      const memory = (memRow as { memory?: string } | null)?.memory ?? "";

      const { data: recent } = await supabase
        .from("messages")
        .select("role, content, image_url, created_at")
        .eq("chat_id", data.chatId)
        .order("created_at", { ascending: false })
        .limit(20);
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
        { role: "system", content: buildSystemPrompt(data.mode, memory) },
        ...history,
      ];
      const result = await callGateway("chat/completions", {
        model: "google/gemini-3-flash-preview",
        messages,
      });
      let draft = result?.choices?.[0]?.message?.content?.trim() || "(no response)";
      if (draft !== "(no response)" && needsVerification(data.prompt, draft)) {
        draft = await verifyAndCorrect(data.prompt, draft, history, memory);
      }
      assistantContent = draft;
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
