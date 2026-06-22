import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import {
  ArrowLeft,
  Send,
  Loader2,
  Sparkles,
  Search,
  Brain,
  Bot,
  Image as ImageIcon,
  Paperclip,
  X,
  Mic,
  Volume2,
  Square,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendChat } from "@/lib/ai.functions";
import { startRecording, transcribeBlob, speak, speakWithServer, stopSpeaking, stopServerSpeech, isTtsSupported, type Recorder } from "@/lib/voice";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatPage,
});

type Mode = "normal" | "deep_search" | "think" | "agent" | "image";
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
  { id: "agent", label: "Agent", Icon: Bot },
  { id: "image", label: "Image", Icon: ImageIcon },
];

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none break-words
      prose-p:my-1.5 prose-p:leading-relaxed
      prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:font-semibold
      prose-h1:text-base prose-h2:text-base prose-h3:text-sm
      prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
      prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none
      prose-pre:my-2 prose-pre:rounded-lg prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:p-3 prose-pre:text-xs prose-pre:overflow-x-auto
      prose-a:text-primary prose-a:underline-offset-2
      prose-strong:text-foreground
      prose-blockquote:border-l-2 prose-blockquote:border-white/20 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground
      prose-table:text-xs prose-th:border prose-th:border-white/10 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-white/10 prose-td:px-2 prose-td:py-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
});

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastFailedPayload, setLastFailedPayload] = useState<{ prompt: string; image: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<Recorder | null>(null);

  const toggleMic = useCallback(async () => {
    if (listening) {
      const rec = recRef.current;
      recRef.current = null;
      setListening(false);
      if (!rec) return;
      try {
        const blob = await rec.stop();
        const text = await transcribeBlob(blob);
        if (text) setInput((prev) => (prev ? prev + " " + text : text));
      } catch (err) {
        toast.error((err as Error).message || "Couldn't transcribe.");
      }
      return;
    }
    try {
      recRef.current = await startRecording();
      setListening(true);
    } catch (err) {
      toast.error((err as Error).message || "Mic permission needed.");
      setListening(false);
    }
  }, [listening]);

  const toggleSpeak = useCallback((msgId: string, text: string) => {
    if (speakingId === msgId) {
      stopServerSpeech();
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(msgId);
    void speakWithServer(text, () => setSpeakingId((cur) => (cur === msgId ? null : cur))).catch(() => {
      if (!isTtsSupported()) {
        toast.error("Text-to-speech isn't supported in this browser.");
        setSpeakingId(null);
        return;
      }
      speak(text, () => setSpeakingId((cur) => (cur === msgId ? null : cur)));
    });
  }, [speakingId]);

  const copyMessage = useCallback(async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId((cur) => (cur === msgId ? null : cur)), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard.");
    }
  }, []);

  useEffect(() => () => { stopServerSpeech(); stopSpeaking(); }, []);

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

  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(dist > 200);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);

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
      if (mode === "image") setMode("normal");
    } catch {
      toast.error("Could not read the image.");
    }
  }

  const runSend = useCallback(async (promptText: string, imageToSend: string | null) => {
    setLastError(null);
    setSending(true);
    const optimisticUser: Message = {
      id: `tmp-u-${Date.now()}`,
      role: "user",
      content: promptText,
      image_url: imageToSend,
      created_at: new Date().toISOString(),
    };
    const streamingId = `streaming-${Date.now()}`;
    const optimisticAssistant: Message = {
      id: streamingId,
      role: "assistant",
      content: "",
      image_url: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimisticUser, optimisticAssistant]);

    try {
      if (mode === "image") {
        await send({
          data: {
            chatId: id,
            mode,
            prompt: promptText,
            ...(imageToSend ? { imageDataUrl: imageToSend } : {}),
          },
        });
        const { data: msgs } = await supabase
          .from("messages")
          .select("id, role, content, image_url, created_at")
          .eq("chat_id", id)
          .order("created_at", { ascending: true });
        setMessages((msgs ?? []) as Message[]);
      } else {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error("Not signed in.");
        const res = await fetch("/api/chat-stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chatId: id,
            mode,
            prompt: promptText,
            ...(imageToSend ? { imageDataUrl: imageToSend } : {}),
          }),
        });
        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Stream failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let acc = "";
        let savedId: string | null = null;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            try {
              const evt = JSON.parse(line.slice(5).trim());
              if (evt.type === "token") {
                acc += evt.text;
                setMessages((m) =>
                  m.map((x) => (x.id === streamingId ? { ...x, content: acc } : x)),
                );
              } else if (evt.type === "saved") {
                savedId = evt.id ?? null;
                acc = evt.content ?? acc;
                setMessages((m) =>
                  m.map((x) =>
                    x.id === streamingId
                      ? { ...x, id: savedId ?? streamingId, content: acc }
                      : x,
                  ),
                );
              } else if (evt.type === "refined") {
                acc = evt.content;
                const targetId = savedId ?? streamingId;
                setMessages((m) =>
                  m.map((x) => (x.id === targetId ? { ...x, content: acc } : x)),
                );
                toast.success("Answer refined", { duration: 1500 });
              } else if (evt.type === "error") {
                throw new Error(evt.message || "Stream error");
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
      setLastFailedPayload(null);
    } catch (err) {
      const msg = (err as Error).message || "Something went wrong.";
      setLastError(msg);
      setLastFailedPayload({ prompt: promptText, image: imageToSend });
      toast.error(msg);
      setMessages((m) =>
        m.filter((x) => x.id !== optimisticUser.id && x.id !== streamingId),
      );
    } finally {
      setSending(false);
    }
  }, [id, mode, send]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    const hasImage = !!attachedImage;
    const prompt = input.trim() || (hasImage ? "What's in this image?" : "");
    if (!prompt) return;
    const imageToSend = attachedImage;
    setInput("");
    setAttachedImage(null);
    await runSend(prompt, imageToSend);
  }

  const onRetry = useCallback(() => {
    if (!lastFailedPayload || sending) return;
    void runSend(lastFailedPayload.prompt, lastFailedPayload.image);
  }, [lastFailedPayload, sending, runSend]);

  const onRegenerate = useCallback(async () => {
    if (sending) return;
    // find the last user message (and its image), drop the trailing assistant message
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const idx = messages.length - 1 - lastUserIdx;
    const userMsg = messages[idx];
    // delete the most recent assistant message (after that user msg) from DB if persisted
    const trailingAssistant = messages.slice(idx + 1).find((m) => m.role === "assistant");
    if (trailingAssistant && !trailingAssistant.id.startsWith("streaming-") && !trailingAssistant.id.startsWith("tmp-")) {
      await supabase.from("messages").delete().eq("id", trailingAssistant.id);
    }
    setMessages((m) => m.slice(0, idx + 1));
    await runSend(userMsg.content, userMsg.image_url);
  }, [messages, sending, runSend]);

  const onClearChat = useCallback(async () => {
    if (sending) return;
    if (!confirm("Clear all messages in this chat?")) return;
    const { error } = await supabase.from("messages").delete().eq("chat_id", id);
    if (error) {
      toast.error("Couldn't clear chat.");
      return;
    }
    setMessages([]);
    setLastError(null);
    setLastFailedPayload(null);
    toast.success("Chat cleared");
  }, [id, sending]);

  const renderedMessages = useMemo(() => messages, [messages]);

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col">
      <header className="flex items-center gap-2 px-3 py-3 glass-strong">
        <button
          onClick={() => navigate({ to: "/" })}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 truncate text-sm font-medium">{title}</h1>
        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            disabled={sending}
            className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-40"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-3 sm:px-4 pb-4 pt-4 space-y-4 scroll-smooth">
        {renderedMessages.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            Start the conversation below.
          </div>
        )}
        {renderedMessages.map((m) => {
          const isUser = m.role === "user";
          const isStreaming = m.id.startsWith("streaming-");
          return (
            <div
              key={m.id}
              className={`animate-fade-up flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-2xl gradient-brand px-4 py-2.5 text-white shadow-lg"
                    : "max-w-[92%] text-foreground"
                }
              >
                {m.image_url && (
                  <img
                    src={m.image_url}
                    alt={isUser ? "Uploaded" : "Generated"}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                    className="mb-2 max-h-80 rounded-xl border border-white/10 object-cover"
                  />
                )}
                {m.content ? (
                  isUser ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                  ) : (
                    <>
                      <MarkdownMessage content={m.content} />
                      {isStreaming && (
                        <span className="ml-0.5 inline-block h-3.5 w-1.5 -mb-0.5 animate-pulse bg-current align-baseline" />
                      )}
                    </>
                  )
                ) : (
                  !isUser && (
                    <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
                      </span>
                      <span>
                        {mode === "deep_search" ? "Searching…" : mode === "think" ? "Thinking…" : mode === "agent" ? "Planning…" : "Generating…"}
                      </span>
                    </div>
                  )
                )}
              </div>
              <div className={`mt-1 flex items-center gap-2 text-[10px] text-muted-foreground ${isUser ? "justify-end" : "justify-start"}`}>
                <span>{formatTime(m.created_at)}</span>
                {!isUser && m.content && !isStreaming && (
                  <>
                    <button
                      type="button"
                      onClick={() => copyMessage(m.id, m.content)}
                      className="inline-flex items-center gap-1 rounded-full glass px-2 py-0.5 hover:text-foreground"
                      aria-label="Copy"
                    >
                      {copiedId === m.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedId === m.id ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSpeak(m.id, m.content)}
                      className="inline-flex items-center gap-1 rounded-full glass px-2 py-0.5 hover:text-foreground"
                      aria-label={speakingId === m.id ? "Stop speaking" : "Read aloud"}
                    >
                      {speakingId === m.id ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                      {speakingId === m.id ? "Stop" : "Listen"}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!sending && messages.length >= 2 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].id.startsWith("streaming-") && (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 rounded-full glass px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Regenerate
            </button>
          </div>
        )}
        {lastError && !sending && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Request failed</div>
              <div className="opacity-80 break-words">{lastError}</div>
            </div>
            {lastFailedPayload && (
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 rounded-full bg-white/10 px-2 py-1 hover:bg-white/20"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {showScrollBtn && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute right-4 bottom-44 z-10 flex h-9 w-9 items-center justify-center rounded-full glass-strong shadow-lg hover:bg-white/10"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}

      <div className="px-3 sm:px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2">
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
            type="button"
            onClick={toggleMic}
            disabled={sending}
            title={listening ? "Stop listening" : "Voice input"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-40 ${
              listening ? "gradient-brand text-white animate-pulse" : "glass"
            }`}
            aria-label="Voice input"
          >
            <Mic className="h-4 w-4" />
          </button>
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
