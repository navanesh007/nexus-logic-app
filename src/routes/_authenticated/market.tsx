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
            <div key={i} className="h-16 rounded-2xl glass-strong animate-pulse" />
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
          <div className="space-y-2">
            {data.assets.map((a) => {
              const up = a.trend === "up" || a.changePct > 0;
              const down = a.trend === "down" || a.changePct < 0;
              const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
              const color = up ? "text-green-500" : down ? "text-red-500" : "text-muted-foreground";
              return (
                <div
                  key={a.symbol}
                  className="flex items-center justify-between rounded-2xl glass-strong px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold">{a.symbol}</div>
                    <div className="text-xs text-muted-foreground">{a.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${a.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className={`flex items-center justify-end gap-1 text-xs ${color}`}>
                      <Icon className="h-3 w-3" />
                      {a.changePct > 0 ? "+" : ""}
                      {a.changePct.toFixed(2)}%
                    </div>
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
