import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, AlertCircle, Clock, MapPin } from "lucide-react";
import { getIndiaNews, INDIA_STATES } from "@/lib/insights.functions";
import { NewsThumb } from "@/components/NewsThumb";

export const Route = createFileRoute("/_authenticated/india-news")({
  component: IndiaNewsPage,
});

function sourceInitial(src: string) {
  return src
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function timeAgo(min: number) {
  if (min < 60) return `${Math.max(1, Math.round(min))}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

type State = (typeof INDIA_STATES)[number];

function IndiaNewsPage() {
  const fetchNews = useServerFn(getIndiaNews);
  const [state, setState] = useState<State>("All India");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["india-news", state],
    queryFn: () => fetchNews({ data: { state } }),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];

  return (
    <main className="mx-auto max-w-md pt-10 pb-24 animate-fade-up">
      <div className="px-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <MapPin className="h-5 w-5 text-violet" />
              India News
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {state} · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-full p-2 hover:bg-muted transition"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none">
          {INDIA_STATES.map((s) => (
            <button
              key={s}
              onClick={() => setState(s)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                state === s
                  ? "gradient-brand text-white shadow-lg shadow-primary/30"
                  : "glass-strong text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="px-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 market-card animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="mx-5 market-card p-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {(error as Error).message || "Failed to load news."}
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
        <div className="px-5 space-y-3">
          {items.map((item, i) => (
            <article
              key={i}
              className="market-card overflow-hidden animate-card-enter transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <NewsThumb title={item.title} category={item.category} className="h-40 w-full">
                <span className="absolute left-3 top-3 rounded-full bg-black/50 backdrop-blur px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {item.category}
                </span>
                <span className="absolute right-3 top-3 rounded-full gradient-brand px-2.5 py-0.5 text-[10px] font-semibold text-white">
                  {state}
                </span>
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 text-[11px] text-white/90">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full gradient-brand text-[8px] font-bold text-white">
                    {sourceInitial(item.source)}
                  </span>
                  <span className="font-medium">{item.source}</span>
                  <span>·</span>
                  <Clock className="h-2.5 w-2.5" />
                  <span>{timeAgo(item.minutesAgo)}</span>
                </div>
              </NewsThumb>
              <div className="p-4">
                <h3 className="text-[15px] font-semibold leading-snug line-clamp-3">{item.title}</h3>
                <p className="mt-1.5 text-[12px] text-muted-foreground leading-snug line-clamp-2">{item.summary}</p>
              </div>
            </article>
          ))}
          <p className="pb-4 pt-2 text-center text-[10px] text-muted-foreground">
            AI-curated India news. Verify before acting on them.
          </p>
        </div>
      )}
    </main>
  );
}
