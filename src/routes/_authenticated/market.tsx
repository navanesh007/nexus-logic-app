import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getMarket } from "@/lib/insights.functions";
import { Sparkline } from "@/components/Sparkline";

type Kind = "nifty50" | "banknifty" | "crypto";

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
  const [kind, setKind] = useState<Kind>("nifty50");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["market", kind],
    queryFn: () => fetchMarket({ data: { kind } }),
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
    </main>
  );
}
