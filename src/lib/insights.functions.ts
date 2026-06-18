import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    console.error("[insights.gateway]", res.status, text.slice(0, 400));
    if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway error (${res.status})`);
  }
  return res.json();
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const startA = raw.indexOf("[");
  const s = startA !== -1 && (startA < start || start === -1) ? startA : start;
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (s === -1 || end === -1) throw new Error("No JSON in model response");
  return JSON.parse(raw.slice(s, end + 1));
}

const NewsCategory = z.enum(["ai", "technology", "finance", "world"]);

export const getNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ category: NewsCategory }).parse)
  .handler(async ({ data }) => {
    const prompt = `Generate 6 plausible, current-feeling headlines for the "${data.category}" news category.
Return ONLY valid JSON in this exact shape, no prose, no code fences:
{"items":[{"title":"...","summary":"2-3 sentence AI summary","source":"Publication name","category":"${data.category}"}]}`;
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a news curator for Open1 AI. Produce concise, neutral, factual-sounding briefings. Output strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });
    const text: string = result?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text) as { items?: unknown[] };
    const Item = z.object({
      title: z.string(),
      summary: z.string(),
      source: z.string().optional().default("Open1 AI"),
      category: z.string().optional().default(data.category),
    });
    const items = z.array(Item).parse(parsed.items ?? []);
    return { items, generatedAt: new Date().toISOString() };
  });

const MarketKind = z.enum(["stocks", "crypto"]);

export const getMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ kind: MarketKind }).parse)
  .handler(async ({ data }) => {
    const universe =
      data.kind === "stocks"
        ? "major US stocks (AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META)"
        : "major cryptocurrencies (BTC, ETH, SOL, BNB, XRP, ADA, DOGE)";
    const prompt = `Provide a current-feeling market snapshot for ${universe}.
Return ONLY valid JSON, no prose, no code fences:
{
  "assets":[{"symbol":"...","name":"...","price":123.45,"changePct":1.23,"trend":"up|down|flat"}],
  "analysis":"3-4 sentence AI market analysis covering momentum, sentiment, and notable movers.",
  "risks":["short risk warning 1","short risk warning 2","short risk warning 3"]
}`;
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a market analyst for Open1 AI. Output strict JSON only. Numbers are illustrative AI estimates, not live quotes.",
        },
        { role: "user", content: prompt },
      ],
    });
    const text: string = result?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text) as {
      assets?: unknown[];
      analysis?: string;
      risks?: unknown[];
    };
    const Asset = z.object({
      symbol: z.string(),
      name: z.string(),
      price: z.number(),
      changePct: z.number(),
      trend: z.enum(["up", "down", "flat"]).optional().default("flat"),
    });
    const assets = z.array(Asset).parse(parsed.assets ?? []);
    const analysis = z.string().parse(parsed.analysis ?? "");
    const risks = z.array(z.string()).parse(parsed.risks ?? []);
    return { assets, analysis, risks, generatedAt: new Date().toISOString() };
  });
