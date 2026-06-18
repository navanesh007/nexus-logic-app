// Browser-only speech helpers (Web Speech API). English only.

type SR = {
  new (): SpeechRecognition;
};
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

export function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(0, 4000));
    utter.lang = "en-US";
    utter.rate = 1;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.find((v) => /en[-_]/i.test(v.lang) && /natural|google|samantha|aria/i.test(v.name))
      ?? voices.find((v) => /^en/i.test(v.lang));
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
