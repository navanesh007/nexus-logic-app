import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function callGateway(path: string, body: unknown) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(`https://ai.gateway.lovable.dev/v1/${path}`, {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("Rate limit reached.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway error (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json();
}

export const ToolId = z.enum([
  "email",
  "blog",
  "resume",
  "cover_letter",
  "code_gen",
  "code_explain",
  "code_debug",
  "image_gen",
  "image_edit",
]);
export type ToolIdT = z.infer<typeof ToolId>;

const SYSTEMS: Record<ToolIdT, string> = {
  email:
    "You are an expert email writer. Produce a polished, well-structured email with a clear subject line on the first line as 'Subject: …'. Match the requested tone. Concise and professional unless asked otherwise.",
  blog:
    "You are an expert long-form blog writer. Produce a complete article in Markdown with an SEO title (# heading), intro hook, scannable H2/H3 sections, examples, and a strong conclusion. 600-1000 words unless asked otherwise.",
  resume:
    "You are an expert resume builder. Produce a polished, ATS-friendly resume in clean Markdown using sections: Summary, Skills, Experience (bullets with metrics), Education, Projects. Use strong action verbs and quantified impact.",
  cover_letter:
    "You are an expert cover-letter writer. Produce a 3-4 paragraph cover letter tailored to the role: hook, why-fit with measurable wins, why-this-company, confident close.",
  code_gen:
    "You are an elite software engineer. Generate clean, correct, idiomatic, runnable code in the language requested. Wrap code in a single fenced block. Add brief comments only where non-obvious. Include a 1-line usage example after the code block.",
  code_explain:
    "You are an elite code teacher. Explain what the provided code does: high-level intent, walkthrough by block, time/space complexity if relevant, potential bugs or edge cases, and improvement suggestions.",
  code_debug:
    "You are an elite debugger. Diagnose the bug in the provided code/error. Output: (1) root cause in 1-2 sentences, (2) fixed code in a fenced block, (3) why the fix works.",
  image_gen: "",
  image_edit: "",
};

export const runTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      tool: ToolId,
      prompt: z.string().min(1).max(8000),
      imageDataUrl: z
        .string()
        .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/i)
        .max(10_000_000)
        .optional(),
    }).parse,
  )
  .handler(async ({ data }) => {
    if (data.tool === "image_gen") {
      const result = await callGateway("images/generations", {
        model: "google/gemini-2.5-flash-image",
        prompt: data.prompt,
      });
      const first = result?.data?.[0];
      const url: string | undefined = first?.url
        ? first.url
        : first?.b64_json
          ? `data:image/png;base64,${first.b64_json}`
          : undefined;
      if (!url) throw new Error("No image returned");
      return { kind: "image" as const, url };
    }

    if (data.tool === "image_edit") {
      if (!data.imageDataUrl) throw new Error("Attach an image to edit.");
      const result = await callGateway("chat/completions", {
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: data.prompt },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      });
      const msg = result?.choices?.[0]?.message;
      const imgUrl: string | undefined =
        msg?.images?.[0]?.image_url?.url ||
        (typeof msg?.content === "string" && msg.content.startsWith("data:image/")
          ? msg.content
          : undefined);
      if (!imgUrl) {
        return { kind: "text" as const, text: typeof msg?.content === "string" ? msg.content : "(no image)" };
      }
      return { kind: "image" as const, url: imgUrl };
    }

    const system = SYSTEMS[data.tool];
    const result = await callGateway("chat/completions", {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: data.prompt },
      ],
    });
    const text: string = result?.choices?.[0]?.message?.content?.trim() || "(no response)";
    return { kind: "text" as const, text };
  });
