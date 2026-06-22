import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, ImageIcon, Code2, Languages, AlignLeft, SpellCheck, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/models")({
  head: () => ({
    meta: [
      { title: "AI Models — Open1 AI" },
      { name: "description", content: "Models powering Open1 AI and what each one is used for." },
    ],
  }),
  component: ModelsPage,
});

type Section = {
  title: string;
  Icon: typeof Sparkles;
  models: { name: string; note?: string }[];
};

const SECTIONS: Section[] = [
  {
    title: "Text Generation",
    Icon: MessageSquare,
    models: [
      { name: "Gemini 2.5 Flash", note: "Fast everyday chat" },
      { name: "Gemini 2.5 Pro", note: "Deep reasoning & long context" },
      { name: "GPT-4o", note: "Multimodal flagship" },
      { name: "Claude Sonnet", note: "Long, nuanced writing" },
    ],
  },
  {
    title: "Image Generation",
    Icon: ImageIcon,
    models: [
      { name: "Gemini 2.5 Flash Image", note: "Primary image engine" },
      { name: "GPT Image 1", note: "Photoreal fallback" },
      { name: "DALL·E", note: "Creative styles" },
    ],
  },
  {
    title: "Code Generation",
    Icon: Code2,
    models: [
      { name: "Gemini 2.5 Pro" },
      { name: "GPT-4o" },
      { name: "Claude Sonnet" },
    ],
  },
  {
    title: "Translation",
    Icon: Languages,
    models: [{ name: "Gemini" }, { name: "GPT-4o" }],
  },
  {
    title: "Summarization",
    Icon: AlignLeft,
    models: [{ name: "Gemini" }, { name: "GPT-4o" }],
  },
  {
    title: "Grammar",
    Icon: SpellCheck,
    models: [{ name: "Gemini" }],
  },
];

function ModelsPage() {
  return (
    <main className="mx-auto max-w-md px-5 pt-10 pb-28 animate-fade-up">
      <div className="mb-5 flex items-center gap-2">
        <Link to="/tools" className="rounded-full p-2 hover:bg-white/10" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet" /> AI Models
          </h1>
          <p className="text-[12px] text-muted-foreground">The models powering Open1 AI and what each one does.</p>
        </div>
      </div>

      <div className="space-y-4">
        {SECTIONS.map(({ title, Icon, models }) => (
          <section key={title} className="rounded-2xl glass-strong p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-white">
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="text-[14px] font-semibold">{title}</h2>
            </div>
            <ul className="space-y-1.5">
              {models.map((m) => (
                <li
                  key={m.name}
                  className="flex items-center justify-between rounded-xl glass px-3 py-2 text-[13px]"
                >
                  <span className="font-medium">{m.name}</span>
                  {m.note && <span className="text-[11px] text-muted-foreground">{m.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="px-2 text-center text-[11px] text-muted-foreground">
          Models are routed automatically through the Lovable AI Gateway. Availability may vary by region and load.
        </p>
      </div>
    </main>
  );
}
