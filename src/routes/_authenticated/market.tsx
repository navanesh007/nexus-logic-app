import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { getMarket, getMarketExtras } from "@/lib/insights.functions";
import { Sparkline } from "@/components/Sparkline";

type Kind = "nifty50" | "banknifty" | "crypto";
type Range = "1D" | "1W" | "1M" | "1Y";

const TABS: { id: Kind; label: string }[] = [
  { id: "nifty50", label: "Nifty 50" },
  { id: "banknifty", label: "Bank Nifty" },
  { id: "crypto", label: "Crypto" },
];

export const Route = createFileRoute("/_authenticated/market")({
  component: MarketPage,
});

function MarketPage() {
  const fetchMarket = useServerFn(getMarket);
  const fetchExtras = useServerFn(getMarketExtras);
  const [kind, setKind] = useState<Kind>("nifty50");
  const [range, setRange] = useState<Range>("1M");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["market", kind],
    queryFn: () => fetchMarket({ data: { kind } }),
    staleTime: 2 * 60 * 1000,
  });

  const extras = useQuery({
    queryKey: ["market-extras", range],
    queryFn: () => fetchExtras({ data: { symbol: "NIFTY", range } }),
    staleTime: 2 * 60 * 1000,
  });

  const currencySymbol = data?.currency === "INR" ? "₹" : "$";
  const indexUp = (data?.index.changePct ?? 0) >= 0;

  return (
    <main className="mx-auto max-w-md px-5 pt-10 pb-24 animate-fade-up">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Market</h1>
        <button
          onClick={() => refetch()}
          className="rounded-full p-2 hover:bg-muted transition"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setKind(t.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
              kind === t.id ? "gradient-brand text-white shadow-lg shadow-primary/30" : "glass-strong text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Hero */}
      <div className="mb-5 market-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {data?.index.name ?? TABS.find((t) => t.id === kind)?.label}
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight tabular-nums">
                {data ? `${currencySymbol}${data.index.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
              </span>
            </div>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold border ${
                indexUp
                  ? "bg-green-500/12 text-green-400 border-green-500/20"
                  : "bg-red-500/12 text-red-400 border-red-500/20"
              }`}
            >
              {indexUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {(data?.index.changePct ?? 0) > 0 ? "+" : ""}
              {(data?.index.changePct ?? 0).toFixed(2)}%
            </span>
          </div>
          <Sparkline
            data={data?.index.spark ?? []}
            width={120}
            height={56}
            color={indexUp ? "up" : "down"}
          />
        </div>
      </div>

      {/* Insights compact */}
      {data?.insights && data.insights.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-2.5">
          {data.insights.slice(0, 4).map((ins) => (
            <div key={ins.title} className="market-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{ins.title}</p>
              <p className="mt-1 text-[13px] font-semibold tracking-tight">{ins.value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[84px] market-card animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      )}

      {error && (
        <div className="market-card p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {(error as Error).message || "Failed to load market data."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded-full gradient-brand px-4 py-1.5 text-sm text-white"
          >
            Try again
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {data.assets.map((a, i) => {
            const up = a.trend === "up" || a.changePct > 0;
            const down = a.trend === "down" || a.changePct < 0;
            const initial = a.symbol.slice(0, 2);
            return (
              <div
                key={a.symbol}
                className="market-card animate-card-enter flex items-center gap-3 px-4 py-3.5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-brand text-[11px] font-bold text-white shadow-md shadow-primary/30">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold tracking-tight leading-tight">{a.symbol}</p>
                  <p className="truncate text-[11px] text-muted-foreground leading-tight">{a.name}</p>
                </div>
                <Sparkline data={a.spark ?? []} width={56} height={24} color={up ? "up" : down ? "down" : "flat"} />
                <div className="flex w-[88px] flex-col items-end gap-1">
                  <span className="text-[13px] font-semibold tabular-nums tracking-tight">
                    {currencySymbol}
                    {a.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      up
                        ? "bg-green-500/12 text-green-400 border-green-500/20"
                        : down
                        ? "bg-red-500/12 text-red-400 border-red-500/20"
                        : "bg-muted/60 text-muted-foreground border-border"
                    }`}
                  >
                    {up ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : down ? (
                      <TrendingDown className="h-2.5 w-2.5" />
                    ) : (
                      <Minus className="h-2.5 w-2.5" />
                    )}
                    {a.changePct > 0 ? "+" : ""}
                    {a.changePct.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
          <p className="pt-2 text-center text-[10px] text-muted-foreground">
            AI-generated estimates, not live quotes. Not financial advice.
          </p>
        </div>
      )}

      {/* Indices */}
      {extras.data?.indices && extras.data.indices.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[13px] font-semibold">Indian indices</h2>
          <div className="grid grid-cols-3 gap-2">
            {extras.data.indices.slice(0, 3).map((ix) => {
              const up = ix.changePct >= 0;
              return (
                <div key={ix.name} className="market-card p-3">
                  <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">{ix.name}</p>
                  <p className="mt-1 text-[14px] font-bold tabular-nums">{ix.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  <p className={`mt-0.5 text-[11px] font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                    {up ? "+" : ""}{ix.changePct.toFixed(2)}%
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sectors */}
      {extras.data?.sectors && extras.data.sectors.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[13px] font-semibold">Sector performance</h2>
          <div className="space-y-2">
            {extras.data.sectors.map((s) => {
              const up = s.changePct >= 0;
              const width = Math.min(50, Math.abs(s.changePct) * 12);
              return (
                <div key={s.name} className="market-card flex items-center gap-3 px-3 py-2.5">
                  <span className="w-20 text-[12px] font-semibold">{s.name}</span>
                  <div className="relative flex-1 h-1.5 rounded-full bg-muted/40">
                    <div
                      className={`absolute top-0 h-1.5 rounded-full ${up ? "bg-green-400" : "bg-red-400"}`}
                      style={{ width: `${width}%`, left: up ? "50%" : `${50 - width}%` }}
                    />
                    <div className="absolute left-1/2 top-[-2px] h-[10px] w-px bg-white/20" />
                  </div>
                  <span className={`w-14 text-right text-[11px] font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                    {up ? "+" : ""}{s.changePct.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top gainers / losers */}
      {extras.data && (extras.data.topGainers.length > 0 || extras.data.topLosers.length > 0) && (
        <section className="mt-6 grid grid-cols-2 gap-3">
          {(["topGainers", "topLosers"] as const).map((key) => {
            const list = extras.data![key];
            const isGain = key === "topGainers";
            return (
              <div key={key} className="market-card p-3">
                <p className={`mb-2 text-[11px] font-semibold ${isGain ? "text-green-400" : "text-red-400"}`}>
                  {isGain ? "Top gainers" : "Top losers"}
                </p>
                <div className="space-y-1.5">
                  {list.slice(0, 5).map((m) => (
                    <div key={m.symbol} className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold">{m.symbol}</span>
                      <span className={isGain ? "text-green-400" : "text-red-400"}>
                        {isGain ? "+" : ""}{m.changePct.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Technical indicators */}
      {extras.data?.indicators && (
        <section className="mt-6 market-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Activity className="h-3.5 w-3.5 text-violet" /> Technicals · {extras.data.indicators.symbol}
            </h2>
            <div className="flex gap-1">
              {(["1D", "1W", "1M", "1Y"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    range === r ? "gradient-brand text-white" : "glass text-muted-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {extras.data.chart.length > 0 && (
            <Sparkline data={extras.data.chart} width={320} height={60} color={extras.data.indicators.macd.hist >= 0 ? "up" : "down"} />
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Tech label="RSI (14)" value={extras.data.indicators.rsi14.toFixed(1)} />
            <Tech label="EMA 20" value={fmt(extras.data.indicators.ema20)} />
            <Tech label="EMA 50" value={fmt(extras.data.indicators.ema50)} />
            <Tech label="EMA 100" value={fmt(extras.data.indicators.ema100)} />
            <Tech label="EMA 200" value={fmt(extras.data.indicators.ema200)} />
            <Tech label="SMA 50" value={fmt(extras.data.indicators.sma50)} />
            <Tech label="MACD" value={`${extras.data.indicators.macd.value.toFixed(2)} / ${extras.data.indicators.macd.signal.toFixed(2)}`} />
            <Tech label="Bollinger U" value={fmt(extras.data.indicators.bollinger.upper)} />
            <Tech label="Bollinger L" value={fmt(extras.data.indicators.bollinger.lower)} />
            <Tech label="Support" value={fmt(extras.data.indicators.support)} />
            <Tech label="Resistance" value={fmt(extras.data.indicators.resistance)} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <Tech label="Daily" value={extras.data.indicators.trend.daily} />
            <Tech label="Weekly" value={extras.data.indicators.trend.weekly} />
            <Tech label="Monthly" value={extras.data.indicators.trend.monthly} />
          </div>
          <div className="mt-3 rounded-xl glass p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">AI signal</p>
              <span className="rounded-full glass px-2 py-0.5 text-[10px] font-semibold">
                {extras.data.indicators.confidence} confidence
              </span>
            </div>
            <p className="text-[14px] font-bold">{extras.data.indicators.signal}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{extras.data.indicators.summary}</p>
          </div>
        </section>
      )}
    </main>
  );
}

function Tech({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg glass px-2.5 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-[12px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}
