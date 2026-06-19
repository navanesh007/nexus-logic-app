// Voice helpers. STT/TTS go through our server proxies so the API key
// never reaches the browser. Web Speech APIs are kept as quick fallbacks.

import { supabase } from "@/integrations/supabase/client";

type SR = { new (): SpeechRecognition };
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export function getSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "en-US";
  r.continuous = false;
  r.interimResults = false;
  return r;
}

/* ---------------- Browser TTS fallback ---------------- */

export function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 4000));
    utter.lang = "en-US";
    utter.rate = 1;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const en =
      voices.find((v) => /en[-_]/i.test(v.lang) && /natural|google|samantha|aria/i.test(v.name)) ??
      voices.find((v) => /^en/i.test(v.lang));
    if (en) utter.voice = en;
    utter.onend = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function isTtsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/* ---------------- Lovable AI speech-to-text ---------------- */

async function authHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return `Bearer ${token}`;
}

export type Recorder = {
  stop: () => Promise<Blob>;
  cancel: () => void;
};

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  rec.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        };
        rec.stop();
      }),
    cancel: () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

export async function transcribeBlob(blob: Blob): Promise<string> {
  if (blob.size < 1024) throw new Error("Recording was empty — please try again.");
  const form = new FormData();
  const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("mpeg") ? "mp3" : "webm";
  form.append("file", blob, `recording.${ext}`);
  const res = await fetch("/api/voice-stt", {
    method: "POST",
    headers: { Authorization: await authHeader() },
    body: form,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Transcription failed (${res.status})`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

/* ---------------- Lovable AI text-to-speech (streamed PCM) ---------------- */

let activeCtx: AudioContext | null = null;
let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

export function stopServerSpeech() {
  try {
    activeReader?.cancel();
  } catch {
    /* ignore */
  }
  try {
    activeCtx?.close();
  } catch {
    /* ignore */
  }
  activeReader = null;
  activeCtx = null;
}

export async function pauseServerSpeech() {
  try {
    await activeCtx?.suspend();
  } catch {
    /* ignore */
  }
}

export async function resumeServerSpeech() {
  try {
    await activeCtx?.resume();
  } catch {
    /* ignore */
  }
}

export function isServerSpeechActive() {
  return !!activeCtx;
}

export async function speakWithServer(text: string, onEnd?: () => void): Promise<void> {
  stopServerSpeech();
  const res = await fetch("/api/voice-tts", {
    method: "POST",
    headers: {
      Authorization: await authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: text.slice(0, 3500) }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `TTS failed (${res.status})`);
  }
  const ctx = new AudioContext({ sampleRate: 24000 });
  activeCtx = ctx;
  if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  let playhead = 0;
  let pending = new Uint8Array(0);

  const playPcm = (incoming: Uint8Array) => {
    const bytes = new Uint8Array(pending.length + incoming.length);
    bytes.set(pending);
    bytes.set(incoming, pending.length);
    const usable = bytes.length - (bytes.length % 2);
    pending = bytes.slice(usable);
    if (usable === 0) return;
    const samples = new Int16Array(bytes.buffer, 0, usable / 2);
    const floats = Float32Array.from(samples, (s) => s / 32768);
    const buffer = ctx.createBuffer(1, floats.length, 24000);
    buffer.copyToChannel(floats, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (playhead === 0) playhead = ctx.currentTime + 0.05;
    else playhead = Math.max(playhead, ctx.currentTime);
    source.start(playhead);
    playhead += buffer.duration;
  };

  const reader = res.body.getReader();
  activeReader = reader;
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; audio?: string };
          if (evt.type === "speech.audio.delta" && evt.audio) {
            const bin = atob(evt.audio);
            const u8 = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
            playPcm(u8);
          }
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    const totalMs = Math.max(50, (playhead - ctx.currentTime) * 1000 + 200);
    window.setTimeout(() => {
      if (activeCtx === ctx) {
        stopServerSpeech();
        onEnd?.();
      }
    }, totalMs);
  }
}
