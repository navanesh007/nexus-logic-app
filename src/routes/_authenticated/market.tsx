import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus, ShieldAlert } from "lucide-react";
import { getMarket } from "@/lib/insights.functions";

type Kind = "stocks" | "crypto";

export const Route = createFileRoute("/_authenticated/market")({
  component: MarketPage,
});

function MarketPage() {
  const fetchMarket = useServerFn(getMarket);
  const [kind, setKind] = useState<Kind>("stocks");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["market", kind],
    queryFn: () => fetchMarket({ data: { kind } }),
    staleTime: 2 * 60 * 1000,
  });

  return (
    <main className="mx-auto max-w-md px-5 pt-12 animate-fade-up">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Market</h1>
        <button
          onClick={() => refetch()}
          className="rounded-full p-2 hover:bg-muted transition"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["stocks", "crypto"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize transition ${
              kind === k ? "gradient-brand text-white" : "glass-strong text-muted-foreground"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[88px] market-card animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-3xl glass-strong p-6 text-center">
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
        <div className="space-y-4">
          <div className="space-y-3">
            {data.assets.map((a, i) => {
              const up = a.trend === "up" || a.changePct > 0;
              const down = a.trend === "down" || a.changePct < 0;
              return (
                <div
                  key={a.symbol}
                  className="market-card animate-card-enter flex items-center justify-between px-6 py-5"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-bold tracking-tight">{a.symbol}</span>
                    <span className="text-[11px] font-medium text-muted-foreground leading-none">{a.name}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[15px] font-semibold tabular-nums tracking-tight">
                      ${a.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                        up
                          ? "bg-green-500/12 text-green-400 border-green-500/20"
                          : down
                          ? "bg-red-500/12 text-red-400 border-red-500/20"
                          : "bg-muted/60 text-muted-foreground border-border"
                      }`}
                    >
                      {up ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : down ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      {a.changePct > 0 ? "+" : ""}
                      {a.changePct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-3xl glass-strong p-5">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
                <LineChart className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-sm font-semibold">AI Market Analysis</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{data.analysis}</p>
          </div>

          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold text-destructive">Risk Warnings</h2>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {data.risks.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-destructive">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Not financial advice. AI-generated estimates — verify against live data before
              trading.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
