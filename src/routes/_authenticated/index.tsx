import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Plus, MessageSquare, Loader2, Sparkles, Briefcase, Calculator, Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { AdSlot } from "@/components/ads/AdSlot";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

type Chat = { id: string; title: string; mode: string; updated_at: string };

function HomePage() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    // Dev mode: no real session, so just show empty state.
    const { data } = await supabase
      .from("chats")
      .select("id, title, mode, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    setChats((data ?? []) as Chat[]);
  }

  async function newChat() {
    if (creating) return;
    setCreating(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Please sign in again.");
      const { data, error } = await supabase
        .from("chats")
        .insert({ user_id: userData.user.id, title: "New chat", mode: "normal" })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Could not create chat");
      navigate({ to: "/chat/$id", params: { id: (data as { id: string }).id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const filtered = chats.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className="mx-auto max-w-md px-5 pt-12 animate-fade-up">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo size={72} />
        <h1 className="text-3xl font-semibold tracking-tight gradient-text">Open1 AI</h1>
        <p className="text-sm text-muted-foreground">Ask anything. Think deeper. Create images.</p>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-2xl glass px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your chats…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <button
        onClick={newChat}
        disabled={creating}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet/30 transition hover:opacity-95 disabled:opacity-50"
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        New chat
      </button>

      <div className="mb-6 grid grid-cols-4 gap-2">
        {[
          { to: "/tools", label: "AI Tools", Icon: Sparkles },
          { to: "/weather", label: "Weather", Icon: Cloud },
          { to: "/portfolio", label: "Portfolio", Icon: Briefcase },
          { to: "/calculators", label: "Calc", Icon: Calculator },
        ].map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to as never}
            className="flex flex-col items-center gap-1.5 rounded-2xl glass p-3 text-center transition hover:-translate-y-0.5"
          >
            <div className="rounded-xl gradient-brand p-2">
              <Icon className="h-4 w-4 text-white" />
            </div>
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        ))}
      </div>

      <AdSlot slot="home-top" className="mb-4" label="Sponsored" />

      <div className="space-y-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent
        </h2>
        {filtered.length === 0 && (
          <div className="rounded-2xl glass p-6 text-center text-sm text-muted-foreground">
            No chats yet. Start a new conversation.
          </div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate({ to: "/chat/$id", params: { id: c.id } })}
            className="flex w-full items-center gap-3 rounded-2xl glass px-4 py-3 text-left transition hover:bg-white/10"
          >
            <div className="rounded-xl gradient-brand p-2">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {c.mode.replace("_", " ")} · {new Date(c.updated_at).toLocaleDateString()}
              </div>
            </div>
          </button>
        ))}
      </div>

      <AdSlot slot="home-footer" className="mt-6" label="Sponsored" />
    </main>
  );
}