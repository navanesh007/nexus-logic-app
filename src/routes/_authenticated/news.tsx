import { createFileRoute } from "@tanstack/react-router";
import { Newspaper } from "lucide-react";

export const Route = createFileRoute("/_authenticated/news")({
  component: NewsPage,
});

function NewsPage() {
  return (
    <main className="mx-auto max-w-md px-5 pt-12 animate-fade-up">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">News</h1>
      <div className="rounded-3xl glass-strong p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand">
          <Newspaper className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Curated AI news is coming soon.</p>
      </div>
    </main>
  );
}