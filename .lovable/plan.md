# Advanced AI Upgrade — Phased Plan

Scope is large. Shipping it all in one pass will introduce regressions in the chat, market, and news flows you've asked me to protect. I'll deliver it in 4 phases, each independently usable.

## Phase 1 — AI Core (this turn)
The brain upgrade. No new pages, no UI redesign.

- **Real token streaming**: new server route `src/routes/api/chat-stream.ts` that pipes the Lovable AI Gateway SSE response straight to the client. Chat page switches to fetch-stream, appending tokens to a live "typing" bubble.
- **Async verification**: streamed answer shows first; for math/code/date/factual prompts a background verify pass runs after stream completes and, if it finds a correction, replaces the saved message and shows a subtle "refined" badge.
- **Deep Think mode**: stronger reasoning system prompt with explicit verify-self-correct loop. Already partially in place — tightened.
- **Hallucination guard**: critic prompt updated to require "I'm not certain" instead of inventing facts; bans fabricated URLs/citations/stats.
- **Long-term memory**: new `user_memory` table (RLS, per-user). After each chat ends or every N turns, a tiny serverFn distills durable facts (name, preferences, recurring topics) and stores them. Injected into the system prompt on every new chat.
- **Agent mode**: enabled inside Think mode — model is instructed to plan → execute → verify in sequence.

## Phase 2 — Multimodal & Web (next turn)
- **Image understanding**: already wired (vision via Gemini). Add OCR/chart-reading prompts and a "Describe / Read text / Solve" quick-action row when an image is attached.
- **Document analysis**: paperclip accepts PDF/DOCX/TXT, parsed client-side (pdfjs-dist + mammoth), text injected as context with a "Summarize / Key points / Q&A" quick-action row.
- **Web search mode**: new mode pill "Search". Server fn calls a search API and feeds top snippets into the model with inline source links.

## Phase 3 — Finance tools (next turn)
- New tables: `portfolio_holdings`, `watchlist` (RLS, per-user).
- New route `/portfolio` with add/edit/delete holdings, live P&L using existing market API.
- "Star" button on market rows to add to watchlist; watchlist section on market page (without redesigning it).
- **Market AI**: serverFn that takes a symbol + recent price action and returns `{ stance: bullish|bearish|neutral, confidence: 0-100, reasoning }`. Shown as a card on each symbol.

## Phase 4 — Utility pages & Voice (final turn)
- `/weather`: location-based, OpenWeather (free tier) — temp/humidity/AQI/rain.
- `/calendar`: tasks, notes, reminders. New `reminders` table. Local notification when due.
- **Voice assistant**: replace browser SpeechRecognition with Lovable AI `/audio/transcriptions` (streaming STT), and current `speechSynthesis` with Lovable AI `/audio/speech` (streaming TTS). English only.
- Add nav entries for Portfolio, Weather, Calendar in BottomNav.

## Technical notes
- Streaming uses a TanStack server route (not `createServerFn`) so we can return a raw `ReadableStream`. Auth checked via Supabase session in the route handler.
- Long-term memory uses `requireSupabaseAuth` serverFn, summarization with `google/gemini-3-flash-preview`.
- All new tables get explicit GRANTs + RLS policies in their migration.
- Glassmorphism theme + news/market/profile pages stay untouched.

## What won't change
Auth, profile page, market page design, news page design, image upload pipeline, existing APIs, existing chat history.

Approve and I'll ship Phase 1 (streaming + memory + verification + deep think + hallucination guard) now.
