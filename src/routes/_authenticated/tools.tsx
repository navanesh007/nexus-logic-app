import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  Mail, FileText, BriefcaseBusiness, ScrollText,
  Code2, BookOpen, Bug, ImagePlus, ImageIcon,
  Languages, AlignLeft, SpellCheck,
  Loader2, Sparkles, Paperclip, X, Copy, Check, History, Trash2, Download, RefreshCw,
} from "lucide-react";
import { runTool, type ToolIdT } from "@/lib/tools.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tools")({
  component: ToolsPage,
});

const TOOLS: {
  id: ToolIdT;
  label: string;
  desc: string;
  Icon: typeof Mail;
  placeholder: string;
  takesImage?: boolean;
  group: string;
}[] = [
  { id: "email", label: "Email Writer", desc: "Polished emails in seconds.", Icon: Mail, placeholder: "e.g. Apologize to a client for a missed deadline, polite + reassuring.", group: "Writing" },
  { id: "blog", label: "Blog Writer", desc: "Full Markdown articles.", Icon: FileText, placeholder: "Topic, audience, tone. e.g. 'How AI is changing personal finance, for beginners, friendly tone.'", group: "Writing" },
  { id: "resume", label: "Resume Builder", desc: "ATS-friendly resume.", Icon: BriefcaseBusiness, placeholder: "Paste your raw experience + target role.", group: "Writing" },
  { id: "cover_letter", label: "Cover Letter", desc: "Tailored cover letter.", Icon: ScrollText, placeholder: "Role + company + your top 3 wins.", group: "Writing" },
  { id: "summarizer", label: "Summarizer", desc: "Tighten any long text.", Icon: AlignLeft, placeholder: "Paste the text to summarize.", group: "Writing" },
  { id: "grammar", label: "Grammar Fixer", desc: "Polish grammar & clarity.", Icon: SpellCheck, placeholder: "Paste the text to proofread.", group: "Writing" },
  { id: "translator", label: "Translator", desc: "Translate to any language.", Icon: Languages, placeholder: "e.g. 'Translate to Spanish: Good morning, how are you?'", group: "Writing" },
  { id: "code_gen", label: "Code Generator", desc: "Runnable code from a spec.", Icon: Code2, placeholder: "e.g. 'Python function that returns Fibonacci(n) iteratively with memoization.'", group: "Coding" },
  { id: "code_explain", label: "Code Explainer", desc: "Understand any snippet.", Icon: BookOpen, placeholder: "Paste the code to explain.", group: "Coding" },
  { id: "code_debug", label: "Code Debugger", desc: "Find & fix bugs.", Icon: Bug, placeholder: "Paste the code + the error you're seeing.", group: "Coding" },
  { id: "image_gen", label: "Image Generation", desc: "Create images from text.", Icon: ImagePlus, placeholder: "e.g. 'A cyberpunk cat DJ at sunset, neon, cinematic, 4k.'", group: "Image" },
  { id: "image_edit", label: "Image Editing", desc: "Edit an attached image.", Icon: ImageIcon, placeholder: "e.g. 'Replace background with a snowy mountain.'", takesImage: true, group: "Image" },
];

const GROUPS = ["Writing", "Coding", "Image"] as const;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

type HistoryItem = {
  id: string;
  tool: ToolIdT;
  prompt: string;
  kind: "text" | "image";
  value: string;
  at: number;
};
const HISTORY_KEY = "open1.tools.history.v1";
const HISTORY_MAX = 30;

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}
function saveHistory(items: HistoryItem[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
  } catch {
    /* ignore */
  }
}

const IMG_STYLES = [
  { id: "none", label: "Default" },
  { id: "realistic", label: "Realistic" },
  { id: "3d", label: "3D Prototype" },
  { id: "anime", label: "Anime" },
  { id: "illustration", label: "Illustration" },
  { id: "cinematic", label: "Cinematic" },
] as const;

const PROGRESS_STEPS = ["Composing prompt…", "Generating pixels…", "Polishing details…", "Almost there…"];

function ToolsPage() {
  const run = useServerFn(runTool);
  const [active, setActive] = useState<ToolIdT | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ kind: "text" | "image"; value: string } | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<string>("none");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (!busy) { setProgress(0); return; }
    setProgress(0);
    const t = setInterval(() => setProgress((p) => (p + 1) % PROGRESS_STEPS.length), 1500);
    return () => clearInterval(t);
  }, [busy]);

  const activeTool = TOOLS.find((t) => t.id === active);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) return toast.error("Image too large (max 6 MB).");
    try {
      setImage(await fileToDataUrl(f));
    } catch {
      toast.error("Couldn't read image.");
    }
  }

  function friendlyErr(msg: string): string {
    if (/rate/i.test(msg)) return "Slow down a moment — rate limit hit. Try again shortly.";
    if (/credit/i.test(msg)) return "AI credits exhausted. Add credits to keep generating.";
    if (/no image/i.test(msg)) return "No image came back. Try again with a more detailed prompt.";
    return msg || "Generation failed. Please try again.";
  }

  async function go(promptOverride?: string) {
    if (!active || busy) return;
    const p = (promptOverride ?? prompt).trim();
    if (!p) return toast.error("Add a prompt first.");
    if (active === "image_edit" && !image) return toast.error("Attach an image to edit.");
    setBusy(true);
    setResult(null);
    try {
      const out = await run({
        data: {
          tool: active,
          prompt: p,
          ...(active === "image_gen" && style !== "none" ? { style } : {}),
          ...(image ? { imageDataUrl: image } : {}),
        },
      });
      const r = out.kind === "image"
        ? { kind: "image" as const, value: out.url }
        : { kind: "text" as const, value: out.text };
      setResult(r);
      const item: HistoryItem = { id: crypto.randomUUID(), tool: active, prompt: p, ...r, at: Date.now() };
      const next = [item, ...history].slice(0, HISTORY_MAX);
      setHistory(next);
      saveHistory(next);
    } catch (err) {
      toast.error(friendlyErr((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function downloadImage() {
    if (!result || result.kind !== "image") return;
    try {
      const res = await fetch(result.value);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `open1-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't download. Long-press the image to save.");
    }
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }
  function openHistoryItem(it: HistoryItem) {
    setActive(it.tool);
    setPrompt(it.prompt);
    setResult({ kind: it.kind, value: it.value });
    setShowHistory(false);
  }

  function reset() {
    setActive(null);
    setPrompt("");
    setResult(null);
    setImage(null);
    setCopied(false);
  }

  function copyResult() {
    if (!result || result.kind !== "text") return;
    navigator.clipboard.writeText(result.value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-10 pb-28 animate-fade-up">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet" /> AI Tools
          </h1>
          <p className="text-[12px] text-muted-foreground">Writing, coding, and image studio — all in one place.</p>
        </div>
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="rounded-full glass px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5 hover:text-foreground"
          aria-label="History"
        >
          <History className="h-3.5 w-3.5" /> {history.length}
        </button>
      </div>

      {showHistory && (
        <div className="mb-5 rounded-2xl glass-strong p-3 animate-fade-up">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Recent</p>
            {history.length > 0 && (
              <button onClick={clearHistory} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="py-3 text-center text-[12px] text-muted-foreground">No history yet.</p>
          ) : (
            <ul className="max-h-72 space-y-1.5 overflow-auto">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => openHistoryItem(h)}
                    className="w-full rounded-xl glass px-3 py-2 text-left hover:bg-white/5"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {TOOLS.find((t) => t.id === h.tool)?.label ?? h.tool}
                    </p>
                    <p className="line-clamp-2 text-[12px]">{h.prompt}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}


      {!active && (
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g}</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {TOOLS.filter((t) => t.group === g).map(({ id, label, desc, Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActive(id)}
                    className="market-card p-3 text-left transition hover:-translate-y-0.5"
                  >
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-[13px] font-semibold tracking-tight">{label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {active && activeTool && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl gradient-brand text-white">
                <activeTool.Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[14px] font-semibold">{activeTool.label}</p>
                <p className="text-[11px] text-muted-foreground">{activeTool.desc}</p>
              </div>
            </div>
            <button onClick={reset} className="rounded-full p-2 hover:bg-white/10" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeTool.takesImage && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
              {image ? (
                <div className="relative inline-block">
                  <img src={image} alt="To edit" className="h-32 w-32 rounded-xl border border-white/10 object-cover" />
                  <button
                    onClick={() => setImage(null)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl glass p-4 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-4 w-4" /> Attach an image
                </button>
              )}
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder={activeTool.placeholder}
            className="w-full resize-none rounded-2xl glass-strong p-4 text-sm outline-none placeholder:text-muted-foreground"
          />

          <button
            onClick={go}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-brand px-4 py-3 font-semibold text-white shadow-lg shadow-violet/30 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Working…" : "Run"}
          </button>

          {result && (
            <div className="rounded-2xl glass p-4">
              {result.kind === "image" ? (
                <img src={result.value} alt="Result" className="w-full rounded-xl" />
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Result</p>
                    <button
                      onClick={copyResult}
                      className="inline-flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[11px] hover:text-foreground"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{result.value}</pre>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
