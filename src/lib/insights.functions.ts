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

/* ---------------- NEWS ---------------- */

const NewsCategory = z.enum(["ai", "technology", "finance", "crypto", "world"]);

export const getNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ category: NewsCategory }).parse)
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Generate 8 plausible TODAY (${today}) headlines for the "${data.category}" news category.
Return ONLY valid JSON, no prose, no code fences:
{"items":[{"title":"...","summary":"1-2 sentence AI summary","source":"Publication name","minutesAgo":12,"category":"${data.category}"}]}
- "minutesAgo": integer 5..600 indicating how recent the story is.
- Use real-sounding publications (Reuters, Bloomberg, The Verge, CoinDesk, TechCrunch, FT, BBC, CNBC).`;
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
      minutesAgo: z.number().optional().default(30),
      category: z.string().optional().default(data.category),
    });
    const items = z.array(Item).parse(parsed.items ?? []);
    return { items, generatedAt: new Date().toISOString() };
  });

/* ---------------- INDIA NEWS ---------------- */

const INDIAN_STATES = [
  "All India",
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "West Bengal",
  "Punjab",
  "Rajasthan",
  "Odisha",
  "Bihar",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Assam",
  "Jharkhand",
  "Chhattisgarh",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Goa",
  "Tripura",
  "Meghalaya",
  "Manipur",
  "Nagaland",
  "Mizoram",
  "Arunachal Pradesh",
  "Sikkim",
  "Puducherry",
  "Chandigarh",
  "Ladakh",
  "Andaman and Nicobar",
] as const;

const INDIA_CATEGORIES = [
  "Trending",
  "Politics",
  "Religion",
  "Sports",
  "Entertainment",
  "Technology",
  "Business",
  "World",
  "Education",
  "Health",
] as const;

export const getIndiaNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      state: z.enum(INDIAN_STATES),
      category: z.enum(INDIA_CATEGORIES).optional().default("Trending"),
    }).parse,
  )
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10);
    const region =
      data.state === "All India"
        ? "pan-India national"
        : `the Indian state/UT of ${data.state}`;
    const catDesc =
      data.category === "Trending"
        ? "the most trending and breaking stories across all topics"
        : `stories in the ${data.category} category`;
    const prompt = `Generate 10 plausible TODAY (${today}) headlines about ${catDesc} from ${region}.
Return ONLY valid JSON, no prose, no code fences:
{"items":[{"title":"...","summary":"1-2 sentence neutral summary","source":"Indian publication name","minutesAgo":12,"category":"${data.category}","trendingTag":"Breaking|Top|Most Viewed|Trending|null"}]}
- "minutesAgo": integer 5..600.
- Use real Indian publications (The Hindu, Times of India, Hindustan Times, Indian Express, NDTV, The Print, Mint, Moneycontrol, News18, Deccan Herald, The Telegraph India, ABP, India Today).
- Headlines must clearly reflect ${data.state === "All India" ? "India" : data.state} and the ${data.category} category.
- For "Trending" mix breaking/top/most-viewed tags; for others most items can have null trendingTag.`;
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You are an Indian news curator for Open1 AI. Produce concise, neutral, factual-sounding briefings. Output strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });
    const text: string = result?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text) as { items?: unknown[] };
    const Item = z.object({
      title: z.string(),
      summary: z.string(),
      source: z.string().optional().default("The Hindu"),
      minutesAgo: z.number().optional().default(30),
      category: z.string().optional().default(data.category),
      trendingTag: z.string().nullable().optional().default(null),
    });
    const items = z.array(Item).parse(parsed.items ?? []);
    return {
      items,
      state: data.state,
      category: data.category,
      generatedAt: new Date().toISOString(),
    };
  });

export const INDIA_STATES = INDIAN_STATES;
export const INDIA_NEWS_CATEGORIES = INDIA_CATEGORIES;

/* ---------------- MARKET ---------------- */

const MarketKind = z.enum(["nifty50", "banknifty", "crypto"]);

const STOCK_UNIVERSE = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel" },
  { symbol: "LT", name: "Larsen & Toubro" },
  { symbol: "ITC", name: "ITC Ltd" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever" },
];

const BANK_UNIVERSE = [
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank" },
  { symbol: "AXISBANK", name: "Axis Bank" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank" },
  { symbol: "BANKBARODA", name: "Bank of Baroda" },
  { symbol: "PNB", name: "Punjab National Bank" },
  { symbol: "FEDERALBNK", name: "Federal Bank" },
  { symbol: "IDFCFIRSTB", name: "IDFC First Bank" },
];

const CRYPTO_UNIVERSE = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "BNB", name: "BNB" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "XRP", name: "XRP" },
  { symbol: "DOGE", name: "Dogecoin" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "TRX", name: "TRON" },
  { symbol: "AVAX", name: "Avalanche" },
  { symbol: "LINK", name: "Chainlink" },
];

export const getMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ kind: MarketKind }).parse)
  .handler(async ({ data }) => {
    const universe =
      data.kind === "crypto" ? CYPTO_LABEL() : data.kind === "banknifty" ? BANK_LABEL() : STOCK_LABEL();
    const list =
      data.kind === "crypto" ? CRYPTO_UNIVERSE : data.kind === "banknifty" ? BANK_UNIVERSE : STOCK_UNIVERSE;
    const currency = data.kind === "crypto" ? "USD" : "INR";
    const indexName =
      data.kind === "crypto" ? "Crypto Total Market Cap" : data.kind === "banknifty" ? "Bank Nifty" : "Nifty 50";

    const prompt = `Provide a current-feeling market snapshot for ${universe}.
Currency: ${currency}. Index: "${indexName}".
Return ONLY valid JSON, no prose, no code fences:
{
  "index": { "name": "${indexName}", "value": 12345.67, "changePct": 0.42, "spark": [12 numbers showing intraday trend] },
  "assets": [
    ${list.map((a) => `{ "symbol": "${a.symbol}", "name": "${a.name}", "price": 0, "changePct": 0, "trend": "up|down|flat", "spark": [12 numbers] }`).join(",\n    ")}
  ],
  "insights": [
    { "title": "Top gainer", "value": "SYMBOL +x.x%" },
    { "title": "Top loser", "value": "SYMBOL -x.x%" },
    { "title": "Sentiment", "value": "Bullish | Neutral | Bearish" },
    { "title": "Volatility", "value": "Low | Medium | High" }
  ]
}
- Use realistic prices for each symbol in ${currency}.
- "spark" arrays must be exactly 12 numbers reflecting the intraday shape.`;

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
    const parsed = extractJson(text) as Record<string, unknown>;

    const Asset = z.object({
      symbol: z.string(),
      name: z.string(),
      price: z.number(),
      changePct: z.number(),
      trend: z.enum(["up", "down", "flat"]).optional().default("flat"),
      spark: z.array(z.number()).optional().default([]),
    });
    const Index = z.object({
      name: z.string(),
      value: z.number(),
      changePct: z.number(),
      spark: z.array(z.number()).optional().default([]),
    });
    const Insight = z.object({ title: z.string(), value: z.string() });

    const index = Index.parse(parsed.index ?? { name: indexName, value: 0, changePct: 0, spark: [] });
    const assets = z.array(Asset).parse(parsed.assets ?? []);
    const insights = z.array(Insight).parse(parsed.insights ?? []);
    return { index, assets, insights, currency, generatedAt: new Date().toISOString() };
  });

function STOCK_LABEL() {
  return "major Indian Nifty 50 stocks: " + STOCK_UNIVERSE.map((s) => s.symbol).join(", ");
}
function BANK_LABEL() {
  return "major Indian Bank Nifty stocks: " + BANK_UNIVERSE.map((s) => s.symbol).join(", ");
}
function CYPTO_LABEL() {
  return "major cryptocurrencies: " + CRYPTO_UNIVERSE.map((s) => s.symbol).join(", ");
}

/* ---------------- MARKET EXTRAS: indices, sectors, indicators ---------------- */

export const getMarketExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      symbol: z.string().min(1).max(20).optional().default("NIFTY"),
      range: z.enum(["1D", "1W", "1M", "1Y"]).optional().default("1M"),
    }).parse,
  )
  .handler(async ({ data }) => {
    const prompt = `Provide a current-feeling Indian market snapshot.
Return ONLY valid JSON, no prose, no code fences:
{
  "indices": [
    { "name": "Nifty 50", "value": 0, "changePct": 0, "spark": [12 numbers] },
    { "name": "Bank Nifty", "value": 0, "changePct": 0, "spark": [12 numbers] },
    { "name": "Sensex", "value": 0, "changePct": 0, "spark": [12 numbers] }
  ],
  "sectors": [
    { "name": "Banking", "changePct": 0 },
    { "name": "IT", "changePct": 0 },
    { "name": "FMCG", "changePct": 0 },
    { "name": "Pharma", "changePct": 0 },
    { "name": "Auto", "changePct": 0 }
  ],
  "topGainers": [ { "symbol": "...", "name": "...", "changePct": 0 } ],
  "topLosers":  [ { "symbol": "...", "name": "...", "changePct": 0 } ],
  "indicators": {
    "symbol": "${data.symbol}",
    "range": "${data.range}",
    "rsi14": 0,
    "macd": { "value": 0, "signal": 0, "hist": 0 },
    "ema20": 0,
    "ema50": 0,
    "ema100": 0,
    "ema200": 0,
    "sma50": 0,
    "bollinger": { "upper": 0, "middle": 0, "lower": 0 },
    "support": 0,
    "resistance": 0,
    "trend": { "daily": "Up | Down | Sideways", "weekly": "Up | Down | Sideways", "monthly": "Up | Down | Sideways" },
    "signal": "Buy | Hold | Sell",
    "confidence": "High | Medium | Low",
    "summary": "1-2 sentence plain-English read of the technicals."
  },
  "chart": [24 numbers approximating the ${data.range} price path for ${data.symbol}]
}
- topGainers / topLosers: 5 items each, from NIFTY 50 universe.
- RSI 0-100, sectors changePct -3..+3, realistic Indian numbers.
- EMAs/SMAs/support/resistance must be near the latest price; longer EMAs lag more.`;
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are an Indian market analyst. Output strict JSON only. Illustrative AI estimates, not live data." },
        { role: "user", content: prompt },
      ],
    });
    const text: string = result?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(text) as Record<string, unknown>;

    const Index = z.object({
      name: z.string(),
      value: z.number(),
      changePct: z.number(),
      spark: z.array(z.number()).optional().default([]),
    });
    const Sector = z.object({ name: z.string(), changePct: z.number() });
    const Mover = z.object({ symbol: z.string(), name: z.string(), changePct: z.number() });
    const Indicators = z.object({
      symbol: z.string(),
      range: z.string(),
      rsi14: z.number(),
      macd: z.object({ value: z.number(), signal: z.number(), hist: z.number() }),
      ema20: z.number(),
      ema50: z.number().optional().default(0),
      ema100: z.number().optional().default(0),
      ema200: z.number().optional().default(0),
      sma50: z.number(),
      bollinger: z.object({ upper: z.number(), middle: z.number(), lower: z.number() }),
      support: z.number().optional().default(0),
      resistance: z.number().optional().default(0),
      trend: z
        .object({ daily: z.string(), weekly: z.string(), monthly: z.string() })
        .optional()
        .default({ daily: "Sideways", weekly: "Sideways", monthly: "Sideways" }),
      signal: z.string(),
      confidence: z.string().optional().default("Medium"),
      summary: z.string(),
    });

    return {
      indices: z.array(Index).parse(parsed.indices ?? []),
      sectors: z.array(Sector).parse(parsed.sectors ?? []),
      topGainers: z.array(Mover).parse(parsed.topGainers ?? []),
      topLosers: z.array(Mover).parse(parsed.topLosers ?? []),
      indicators: Indicators.parse(parsed.indicators ?? {
        symbol: data.symbol, range: data.range, rsi14: 50,
        macd: { value: 0, signal: 0, hist: 0 }, ema20: 0, ema50: 0, ema100: 0, ema200: 0, sma50: 0,
        bollinger: { upper: 0, middle: 0, lower: 0 }, support: 0, resistance: 0,
        trend: { daily: "Sideways", weekly: "Sideways", monthly: "Sideways" },
        signal: "Hold", confidence: "Medium", summary: "",
      }),
      chart: z.array(z.number()).parse(parsed.chart ?? []),
      generatedAt: new Date().toISOString(),
    };
  });
