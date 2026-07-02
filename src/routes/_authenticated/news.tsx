import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, AlertCircle, Clock } from "lucide-react";
import { getNews } from "@/lib/insights.functions";
import { NewsThumb } from "@/components/NewsThumb";
import { AdSlot } from "@/components/ads/AdSlot";



type Category = "ai" | "technology" | "finance" | "crypto" | "world";
const CATEGORIES: { id: Category; label: string }[] = [
  { id: "ai", label: "AI" },
  { id: "technology", label: "Technology" },
  { id: "finance", label: "Finance" },
  { id: "crypto", label: "Crypto" },
  { id: "world", label: "World" },
];

export const Route = createFileRoute("/_authenticated/news")({
  component: NewsPage,
});

// deterministic gradient thumbnail per title
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

function NewsPage() {
  const fetchNews = useServerFn(getNews);
  const [category, setCategory] = useState<Category>("ai");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["news", category],
    queryFn: () => fetchNews({ data: { category } }),
    staleTime: 5 * 60 * 1000,
  });

  const top = data?.items.slice(0, 5) ?? [];
  const rest = data?.items.slice(5) ?? [];

  return (
    <main className="mx-auto max-w-md pt-10 pb-24 animate-fade-up">
      <div className="px-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">News</h1>
            <p className="text-[11px] text-muted-foreground">Today, {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
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
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                category === c.id
                  ? "gradient-brand text-white shadow-lg shadow-primary/30"
                  : "glass-strong text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mb-4"><AdSlot slot="news-top" label="Sponsored" /></div>


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
        <>
          {/* Horizontal top headlines */}
          {top.length > 0 && (
            <div className="mb-5">
              <h2 className="px-5 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Top Headlines</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-none px-5 pb-1 snap-x snap-mandatory">
                {top.map((item, i) => (
                  <article
                    key={i}
                    className="snap-start shrink-0 w-[82%] market-card overflow-hidden animate-card-enter transition-transform hover:-translate-y-0.5"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <NewsThumb
                      title={item.title}
                      category={item.category}
                      className="h-44 w-full"
                    >
                      <span className="absolute left-3 top-3 rounded-full bg-black/50 backdrop-blur px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        {item.category}
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
              </div>
            </div>
          )}

          {/* Stack */}
          <div className="px-5 space-y-3">
            {rest.map((item, i) => (
              <article
                key={i}
                className="market-card overflow-hidden animate-card-enter flex gap-3 p-3 transition-transform hover:-translate-y-0.5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <NewsThumb
                  title={item.title}
                  category={item.category}
                  className="h-24 w-24 shrink-0 rounded-2xl"
                  width={240}
                  height={240}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                      {item.category}
                    </span>
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full gradient-brand text-[7px] font-bold text-white">
                      {sourceInitial(item.source)}
                    </span>
                    <span className="font-medium">{item.source}</span>
                    <span>·</span>
                    <span>{timeAgo(item.minutesAgo)}</span>
                  </div>
                  <h3 className="text-[14px] font-semibold leading-snug line-clamp-2">{item.title}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug line-clamp-2">{item.summary}</p>
                </div>
              </article>
            ))}
            <p className="pb-4 pt-2 text-center text-[10px] text-muted-foreground">
              AI-curated summaries. Verify before acting on them.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
