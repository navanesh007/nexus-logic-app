import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  Mail, FileText, BriefcaseBusiness, ScrollText,
  Code2, BookOpen, Bug, ImagePlus, ImageIcon,
  Loader2, Sparkles, Paperclip, X, Copy, Check,
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

function ToolsPage() {
  const run = useServerFn(runTool);
  const [active, setActive] = useState<ToolIdT | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: "text" | "image"; value: string } | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function go() {
    if (!active || busy) return;
    const p = prompt.trim();
    if (!p) return toast.error("Add a prompt first.");
    if (active === "image_edit" && !image) return toast.error("Attach an image to edit.");
    setBusy(true);
    setResult(null);
    try {
      const out = await run({
        data: { tool: active, prompt: p, ...(image ? { imageDataUrl: image } : {}) },
      });
      if (out.kind === "image") setResult({ kind: "image", value: out.url });
      else setResult({ kind: "text", value: out.text });
    } catch (err) {
      toast.error((err as Error).message || "Tool failed.");
    } finally {
      setBusy(false);
    }
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
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet" /> AI Tools
        </h1>
        <p className="text-[12px] text-muted-foreground">Writing, coding, and image studio — all in one place.</p>
      </div>

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
