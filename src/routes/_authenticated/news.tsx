import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Newspaper, RefreshCw, AlertCircle } from "lucide-react";
import { getNews } from "@/lib/insights.functions";

type Category = "ai" | "technology" | "finance" | "world";
const CATEGORIES: { id: Category; label: string }[] = [
  { id: "ai", label: "AI" },
  { id: "technology", label: "Tech" },
  { id: "finance", label: "Finance" },
  { id: "world", label: "World" },
];

export const Route = createFileRoute("/_authenticated/news")({
  component: NewsPage,
});

function NewsPage() {
  const fetchNews = useServerFn(getNews);
  const [category, setCategory] = useState<Category>("ai");

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["news", category],
    queryFn: () => fetchNews({ data: { category } }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <main className="mx-auto max-w-md px-5 pt-12 animate-fade-up">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">News</h1>
        <button
          onClick={() => refetch()}
          className="rounded-full p-2 hover:bg-muted transition"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition ${
              category === c.id
                ? "gradient-brand text-white"
                : "glass-strong text-muted-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-3xl glass-strong animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-3xl glass-strong p-6 text-center">
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
        <div className="space-y-3">
          {data.items.map((item, i) => (
            <article key={i} className="rounded-3xl glass-strong p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
                  <Newspaper className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs text-muted-foreground">{item.source}</span>
              </div>
              <h2 className="mb-2 text-base font-semibold leading-snug">{item.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
            </article>
          ))}
          <p className="pb-4 pt-2 text-center text-[11px] text-muted-foreground">
            AI-curated summaries. Verify before acting on them.
          </p>
        </div>
      )}
    </main>
  );
}
