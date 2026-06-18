import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RefreshCw, AlertCircle, Clock, MapPin, Flame, TrendingUp, Zap, Eye } from "lucide-react";
import { getIndiaNews, INDIA_STATES, INDIA_NEWS_CATEGORIES } from "@/lib/insights.functions";
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
type Category = (typeof INDIA_NEWS_CATEGORIES)[number];

const TRENDING_BUCKETS = [
  { key: "Breaking", label: "Breaking News", icon: Zap },
  { key: "Top", label: "Top Headlines", icon: Flame },
  { key: "Most Viewed", label: "Most Viewed", icon: Eye },
  { key: "Trending", label: "Trending Today", icon: TrendingUp },
] as const;

function IndiaNewsPage() {
  const fetchNews = useServerFn(getIndiaNews);
  const [state, setState] = useState<State>("All India");
  const [category, setCategory] = useState<Category>("Trending");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["india-news", state, category],
    queryFn: async () => {
      try {
        const res = await fetchNews({ data: { state, category } });
        if (!res?.items?.length && state !== "All India") {
          const fb = await fetchNews({ data: { state: "All India", category } });
          return { ...fb, fallback: true as const };
        }
        return res;
      } catch (err) {
        if (state !== "All India") {
          try {
            const fb = await fetchNews({ data: { state: "All India", category } });
            return { ...fb, fallback: true as const };
          } catch {
            throw err;
          }
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const items = data?.items ?? [];
  const usedFallback = (data as { fallback?: boolean } | undefined)?.fallback;

  const trendingByBucket = useMemo(() => {
    const map: Record<string, typeof items> = { Breaking: [], Top: [], "Most Viewed": [], Trending: [] };
    items.forEach((it, i) => {
      const tag = (it as { trendingTag?: string | null }).trendingTag;
      if (tag && map[tag]) map[tag].push(it);
      else if (i < 4) map.Trending.push(it);
    });
    return map;
  }, [items]);

  const showTrending = category === "Trending" && items.length > 0;

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
              {state}{usedFallback ? " (showing All India)" : ""} · {category} ·{" "}
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
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

        {/* State selector */}
        <div className="mb-3 flex gap-2 overflow-x-auto scrollbar-none">
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

        {/* Category tabs */}
        <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none">
          {INDIA_NEWS_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3.5 py-1 text-[12px] font-medium transition border ${
                category === c
                  ? "bg-white/10 text-white border-white/20"
                  : "text-muted-foreground border-transparent hover:text-white/80"
              }`}
            >
              {c}
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

      {error && !isLoading && (
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

      {/* Trending horizontal scrollers */}
      {showTrending &&
        TRENDING_BUCKETS.map(({ key, label, icon: Icon }) => {
          const list = trendingByBucket[key];
          if (!list || list.length === 0) return null;
          return (
            <section key={key} className="mb-5">
              <h2 className="mb-2 px-5 flex items-center gap-1.5 text-[13px] font-semibold text-white/90">
                <Icon className="h-3.5 w-3.5 text-violet" />
                {label}
              </h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-none px-5 pb-1">
                {list.slice(0, 8).map((item, i) => (
                  <article
                    key={`${key}-${i}`}
                    className="market-card overflow-hidden shrink-0 w-60 transition-transform hover:-translate-y-0.5"
                  >
                    <NewsThumb title={item.title} category={item.category} className="h-28 w-full" width={400} height={240}>
                      <span className="absolute left-2 top-2 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                        {item.category}
                      </span>
                    </NewsThumb>
                    <div className="p-3">
                      <h3 className="text-[12.5px] font-semibold leading-snug line-clamp-2">{item.title}</h3>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="font-medium text-white/80">{item.source}</span>
                        <span>·</span>
                        <Clock className="h-2.5 w-2.5" />
                        <span>{timeAgo(item.minutesAgo)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

      {/* Main feed */}
      {data && (
        <div className="px-5 space-y-3">
          {showTrending && (
            <h2 className="pt-1 text-[13px] font-semibold text-white/90">Latest</h2>
          )}
          {items.map((item, i) => (
            <article
              key={i}
              className="market-card overflow-hidden animate-card-enter transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 40}ms` }}
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
