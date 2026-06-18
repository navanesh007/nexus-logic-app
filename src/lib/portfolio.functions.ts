import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function callGateway(path: string, body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(`https://ai.gateway.lovable.dev/v1/${path}`, {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Gateway error (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json();
}

const Kind = z.enum(["stock", "crypto"]);

export const listHoldings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("portfolio_holdings")
      .select("id, symbol, name, kind, quantity, avg_price, currency, notes, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      symbol: z.string().min(1).max(20),
      name: z.string().max(100).optional(),
      kind: Kind,
      quantity: z.number().min(0),
      avg_price: z.number().min(0),
      currency: z.enum(["INR", "USD"]).default("INR"),
      notes: z.string().max(500).optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("portfolio_holdings")
      .insert({ ...data, symbol: data.symbol.toUpperCase(), user_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const removeHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("portfolio_holdings")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("watchlist")
      .select("id, symbol, name, kind, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      symbol: z.string().min(1).max(20),
      name: z.string().max(100).optional(),
      kind: Kind,
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("watchlist")
      .upsert(
        { ...data, symbol: data.symbol.toUpperCase(), user_id: context.userId },
        { onConflict: "user_id,symbol,kind" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("watchlist")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** AI-estimated live quote (no live data source attached — illustrative). */
export const getQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      symbols: z.array(z.object({ symbol: z.string(), kind: Kind })).min(1).max(40),
    }).parse,
  )
  .handler(async ({ data }) => {
    const list = data.symbols
      .map((s) => `${s.symbol} (${s.kind === "crypto" ? "crypto USD" : "Indian stock INR"})`)
      .join(", ");
    const prompt = `Provide a CURRENT-feeling price snapshot for these tickers: ${list}.
Return ONLY valid JSON, no prose, no code fences:
{"quotes":[{"symbol":"...","price":0,"changePct":0,"currency":"INR|USD"}]}
- Prices realistic for today's range.
- Indian stocks in INR, crypto in USD.
- changePct between -8 and +8.`;
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Output strict JSON only. Numbers are illustrative AI estimates." },
        { role: "user", content: prompt },
      ],
    });
    const text: string = result?.choices?.[0]?.message?.content ?? "";
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const raw = fenced ? fenced[1] : text;
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s === -1 || e === -1) return { quotes: [] as Array<{ symbol: string; price: number; changePct: number; currency: string }> };
    try {
      const parsed = JSON.parse(raw.slice(s, e + 1)) as { quotes?: Array<{ symbol: string; price: number; changePct: number; currency: string }> };
      return { quotes: parsed.quotes ?? [] };
    } catch {
      return { quotes: [] };
    }
  });
