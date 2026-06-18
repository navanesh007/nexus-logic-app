import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
  Search,
  Brain,
  Image as ImageIcon,
  Paperclip,
  X,
  Mic,
  Volume2,
  Square,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendChat } from "@/lib/ai.functions";
import { getSpeechRecognition, speak, stopSpeaking, isTtsSupported } from "@/lib/voice";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatPage,
});

type Mode = "normal" | "deep_search" | "think" | "image";
type Message = {
  id: string;
  role: string;
  content: string;
  image_url: string | null;
  created_at: string;
};

const MODES: { id: Mode; label: string; Icon: typeof Sparkles }[] = [
  { id: "normal", label: "Normal", Icon: Sparkles },
  { id: "deep_search", label: "Deep Search", Icon: Search },
  { id: "think", label: "Think", Icon: Brain },
  { id: "image", label: "Image", Icon: ImageIcon },
];

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB raw

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

function ChatPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const send = useServerFn(sendChat);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("normal");
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("New chat");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<ReturnType<typeof getSpeechRecognition>>(null);

  function toggleMic() {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const r = getSpeechRecognition();
    if (!r) {
      toast.error("Voice input isn't supported in this browser.");
      return;
    }
    recogRef.current = r;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) setInput((prev) => (prev ? prev + " " + text : text));
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    try {
      r.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function toggleSpeak(msgId: string, text: string) {
    if (speakingId === msgId) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    if (!isTtsSupported()) {
      toast.error("Text-to-speech isn't supported in this browser.");
      return;
    }
    setSpeakingId(msgId);
    speak(text, () => setSpeakingId((cur) => (cur === msgId ? null : cur)));
  }

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    void (async () => {
      const { data: chat } = await supabase
        .from("chats")
        .select("title, mode")
        .eq("id", id)
        .maybeSingle();
      if (chat) {
        setTitle((chat as { title: string }).title);
        setMode(((chat as { mode: string }).mode as Mode) ?? "normal");
      }
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, role, content, image_url, created_at")
        .eq("chat_id", id)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);
    })();
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large (max 6 MB).");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setAttachedImage(dataUrl);
      // Vision needs a normal chat model, not the image generator
      if (mode === "image") setMode("normal");
    } catch {
      toast.error("Could not read the image.");
    }
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    const hasImage = !!attachedImage;
    const prompt =
      input.trim() || (hasImage ? "What's in this image?" : "");
    if (!prompt) return;
    const imageToSend = attachedImage;
    setInput("");
    setAttachedImage(null);
    setSending(true);
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: prompt,
      image_url: imageToSend,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      await send({
        data: {
          chatId: id,
          mode,
          prompt,
          ...(imageToSend ? { imageDataUrl: imageToSend } : {}),
        },
      });
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, role, content, image_url, created_at")
        .eq("chat_id", id)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);
    } catch (err) {
      toast.error((err as Error).message || "Something went wrong.");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col">
      <header className="flex items-center gap-3 px-4 py-3 glass-strong">
        <button
          onClick={() => navigate({ to: "/" })}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 truncate text-sm font-medium">{title}</h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4 pt-4 space-y-4">
        {messages.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            Start the conversation below.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`animate-fade-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl gradient-brand px-4 py-2.5 text-white shadow-lg"
                  : "max-w-[90%] text-foreground"
              }
            >
              {m.image_url && (
                <img
                  src={m.image_url}
                  alt={m.role === "user" ? "Uploaded" : "Generated"}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                  className="mb-2 max-h-80 rounded-xl border border-white/10 object-cover"
                />
              )}
              {m.content && (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
              )}
              {m.role === "assistant" && m.content && (
                <button
                  type="button"
                  onClick={() => toggleSpeak(m.id, m.content)}
                  className="mt-1.5 inline-flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  aria-label={speakingId === m.id ? "Stop speaking" : "Read aloud"}
                >
                  {speakingId === m.id ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  {speakingId === m.id ? "Stop" : "Listen"}
                </button>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />{" "}
            {mode === "image" ? "Generating image…" : "Thinking…"}
          </div>
        )}
      </div>

      <div className="px-4 pb-28 pt-2">
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {MODES.map(({ id: mid, label, Icon }) => (
            <button
              key={mid}
              onClick={() => {
                setMode(mid);
                if (mid === "image") setAttachedImage(null);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mode === mid
                  ? "gradient-brand text-white shadow-md"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {attachedImage && (
          <div className="mb-2 relative inline-block">
            <img
              src={attachedImage}
              alt="Attached preview"
              className="h-20 w-20 rounded-xl border border-white/10 object-cover"
            />
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-white"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <form
          onSubmit={onSend}
          className="flex items-end gap-2 rounded-2xl glass-strong p-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickImage}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || mode === "image"}
            title={mode === "image" ? "Switch off Image mode to attach a photo" : "Attach image"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glass text-muted-foreground hover:text-foreground disabled:opacity-40"
            aria-label="Attach image"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend(e as unknown as React.FormEvent);
              }
            }}
            rows={1}
            placeholder={
              mode === "image"
                ? "Describe an image…"
                : attachedImage
                  ? "Ask about this image…"
                  : "Message Open1 AI…"
            }
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground max-h-32"
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !attachedImage)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-brand text-white disabled:opacity-40"
            aria-label="Send"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </main>
  );
}