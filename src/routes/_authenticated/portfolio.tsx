import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Briefcase, Plus, Trash2, Star, RefreshCw, Loader2,
  TrendingUp, TrendingDown, X, Eye,
} from "lucide-react";
import {
  listHoldings, addHolding, removeHolding,
  listWatchlist, addWatch, removeWatch, getQuotes,
} from "@/lib/portfolio.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portfolio")({
  component: PortfolioPage,
});

type Holding = {
  id: string;
  symbol: string;
  name: string | null;
  kind: string;
  quantity: number;
  avg_price: number;
  currency: string;
  notes: string | null;
  created_at: string;
};
type Watch = {
  id: string;
  symbol: string;
  name: string | null;
  kind: string;
  created_at: string;
};
type Quote = { symbol: string; price: number; changePct: number; currency: string };

function PortfolioPage() {
  const qc = useQueryClient();
  const fetchHoldings = useServerFn(listHoldings);
  const fetchWatchlist = useServerFn(listWatchlist);
  const fetchQuotes = useServerFn(getQuotes);
  const addH = useServerFn(addHolding);
  const delH = useServerFn(removeHolding);
  const addW = useServerFn(addWatch);
  const delW = useServerFn(removeWatch);

  const holdings = useQuery({ queryKey: ["holdings"], queryFn: () => fetchHoldings() as Promise<Holding[]> });
  const watchlist = useQuery({ queryKey: ["watchlist"], queryFn: () => fetchWatchlist() as Promise<Watch[]> });

  const symbols = useMemo(() => {
    const set = new Map<string, { symbol: string; kind: "stock" | "crypto" }>();
    (holdings.data ?? []).forEach((h) => set.set(`${h.symbol}|${h.kind}`, { symbol: h.symbol, kind: h.kind as "stock" | "crypto" }));
    (watchlist.data ?? []).forEach((w) => set.set(`${w.symbol}|${w.kind}`, { symbol: w.symbol, kind: w.kind as "stock" | "crypto" }));
    return Array.from(set.values());
  }, [holdings.data, watchlist.data]);

  const quotes = useQuery({
    queryKey: ["quotes", symbols.map((s) => `${s.symbol}|${s.kind}`).join(",")],
    queryFn: async () => (symbols.length ? (await fetchQuotes({ data: { symbols } })).quotes as Quote[] : []),
    enabled: symbols.length > 0,
    staleTime: 60 * 1000,
  });

  const quoteFor = (sym: string) => (quotes.data ?? []).find((q) => q.symbol.toUpperCase() === sym.toUpperCase());

  const totals = useMemo(() => {
    let invested = 0;
    let current = 0;
    (holdings.data ?? []).forEach((h) => {
      const q = quoteFor(h.symbol);
      const price = q?.price ?? h.avg_price;
      invested += h.avg_price * h.quantity;
      current += price * h.quantity;
    });
    return { invested, current, pl: current - invested, plPct: invested > 0 ? ((current - invested) / invested) * 100 : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.data, quotes.data]);

  const [showAdd, setShowAdd] = useState<"holding" | "watch" | null>(null);
  const [form, setForm] = useState({
    symbol: "", name: "", kind: "stock" as "stock" | "crypto",
    quantity: "", avg_price: "", currency: "INR" as "INR" | "USD",
  });

  async function submit() {
    if (!form.symbol.trim()) return toast.error("Symbol is required");
    try {
      if (showAdd === "holding") {
        const qty = parseFloat(form.quantity);
        const px = parseFloat(form.avg_price);
        if (!isFinite(qty) || qty <= 0) return toast.error("Quantity must be > 0");
        if (!isFinite(px) || px < 0) return toast.error("Price invalid");
        await addH({
          data: {
            symbol: form.symbol.trim(),
            name: form.name.trim() || undefined,
            kind: form.kind,
            quantity: qty,
            avg_price: px,
            currency: form.kind === "crypto" ? "USD" : form.currency,
          },
        });
        toast.success("Holding added");
        qc.invalidateQueries({ queryKey: ["holdings"] });
      } else {
        await addW({
          data: { symbol: form.symbol.trim(), name: form.name.trim() || undefined, kind: form.kind },
        });
        toast.success("Added to watchlist");
        qc.invalidateQueries({ queryKey: ["watchlist"] });
      }
      setShowAdd(null);
      setForm({ symbol: "", name: "", kind: "stock", quantity: "", avg_price: "", currency: "INR" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function rmHolding(id: string) {
    try {
      await delH({ data: { id } });
      qc.invalidateQueries({ queryKey: ["holdings"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function rmWatch(id: string) {
    try {
      await delW({ data: { id } });
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-10 pb-28 animate-fade-up">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-violet" /> Portfolio
        </h1>
        <button
          onClick={() => quotes.refetch()}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Refresh quotes"
        >
          <RefreshCw className={`h-4 w-4 ${quotes.isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Totals */}
      <div className="mb-5 market-card p-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current value</p>
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
          ₹{totals.current.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
        <div className="mt-2 flex items-center gap-2 text-[12px]">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold border ${
            totals.pl >= 0
              ? "bg-green-500/12 text-green-400 border-green-500/20"
              : "bg-red-500/12 text-red-400 border-red-500/20"
          }`}>
            {totals.pl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {totals.pl >= 0 ? "+" : ""}
            {totals.pl.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({totals.plPct.toFixed(2)}%)
          </span>
          <span className="text-muted-foreground">on ₹{totals.invested.toLocaleString(undefined, { maximumFractionDigits: 2 })} invested</span>
        </div>
      </div>

      {/* Holdings */}
      <section className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Holdings</h2>
          <button
            onClick={() => { setShowAdd("holding"); setForm((f) => ({ ...f, kind: "stock" })); }}
            className="inline-flex items-center gap-1 rounded-full gradient-brand px-3 py-1 text-[11px] font-semibold text-white"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        {holdings.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {!holdings.isLoading && (holdings.data?.length ?? 0) === 0 && (
          <div className="market-card p-5 text-center text-[12px] text-muted-foreground">
            No holdings yet. Tap Add to start tracking.
          </div>
        )}
        <div className="space-y-2">
          {(holdings.data ?? []).map((h) => {
            const q = quoteFor(h.symbol);
            const price = q?.price ?? h.avg_price;
            const val = price * h.quantity;
            const cost = h.avg_price * h.quantity;
            const pl = val - cost;
            const plPct = cost > 0 ? (pl / cost) * 100 : 0;
            const sym = h.currency === "USD" ? "$" : "₹";
            return (
              <div key={h.id} className="market-card flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-brand text-[11px] font-bold text-white">
                  {h.symbol.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold tracking-tight">{h.symbol}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {h.quantity} × {sym}{h.avg_price.toLocaleString()}
                  </p>
                </div>
                <div className="flex w-[100px] flex-col items-end">
                  <span className="text-[13px] font-semibold tabular-nums">{sym}{val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className={`text-[10px] font-semibold ${pl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {pl >= 0 ? "+" : ""}{plPct.toFixed(2)}%
                  </span>
                </div>
                <button onClick={() => rmHolding(h.id)} className="rounded-full p-1.5 text-muted-foreground hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Watchlist */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-violet" /> Watchlist</h2>
          <button
            onClick={() => { setShowAdd("watch"); setForm((f) => ({ ...f, kind: "stock" })); }}
            className="inline-flex items-center gap-1 rounded-full glass px-3 py-1 text-[11px] font-semibold"
          >
            <Plus className="h-3 w-3" /> Watch
          </button>
        </div>
        {(watchlist.data?.length ?? 0) === 0 && !watchlist.isLoading && (
          <div className="market-card p-5 text-center text-[12px] text-muted-foreground">
            Nothing on your watchlist yet.
          </div>
        )}
        <div className="space-y-2">
          {(watchlist.data ?? []).map((w) => {
            const q = quoteFor(w.symbol);
            const sym = w.kind === "crypto" ? "$" : "₹";
            const up = (q?.changePct ?? 0) >= 0;
            return (
              <div key={w.id} className="market-card flex items-center gap-3 px-4 py-3">
                <Star className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold tracking-tight">{w.symbol}</p>
                  <p className="text-[11px] text-muted-foreground truncate capitalize">{w.kind}</p>
                </div>
                <div className="flex w-[100px] flex-col items-end">
                  <span className="text-[13px] font-semibold tabular-nums">
                    {q ? `${sym}${q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                  </span>
                  {q && (
                    <span className={`text-[10px] font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
                      {up ? "+" : ""}{q.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <button onClick={() => rmWatch(w.id)} className="rounded-full p-1.5 text-muted-foreground hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <p className="pt-3 text-center text-[10px] text-muted-foreground">
          AI-estimated quotes for illustration. Not financial advice.
        </p>
      </section>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setShowAdd(null)}>
          <div className="w-full max-w-md rounded-3xl glass-strong p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">{showAdd === "holding" ? "Add holding" : "Add to watchlist"}</h3>
              <button onClick={() => setShowAdd(null)} className="rounded-full p-1 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="flex gap-2">
                {(["stock", "crypto"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setForm((f) => ({ ...f, kind: k }))}
                    className={`flex-1 rounded-xl px-3 py-2 text-[12px] font-semibold capitalize ${
                      form.kind === k ? "gradient-brand text-white" : "glass text-muted-foreground"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <input
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                placeholder={form.kind === "crypto" ? "Symbol (e.g. BTC)" : "Symbol (e.g. RELIANCE)"}
                className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none"
              />
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name (optional)"
                className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none"
              />
              {showAdd === "holding" && (
                <>
                  <input
                    inputMode="decimal"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    placeholder="Quantity"
                    className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none"
                  />
                  <input
                    inputMode="decimal"
                    value={form.avg_price}
                    onChange={(e) => setForm((f) => ({ ...f, avg_price: e.target.value }))}
                    placeholder="Average buy price"
                    className="w-full rounded-xl glass px-3 py-2.5 text-sm outline-none"
                  />
                </>
              )}
              <button
                onClick={submit}
                className="mt-1 w-full rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
