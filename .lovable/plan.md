# Phases 9–15 Implementation Plan

This is a large batch. I'll ship it in 3 sequential turns so each piece is verifiable. No existing UI is redesigned — only new modes, new routes, and additive logic.

## Turn A — AI brains & voice (Phases 9, 10, 13-writing/coding)

**Deep Search mode (Phase 9)**
- Add `mode: "search"` to `chat-stream.ts`. When active, call Lovable AI with `google/gemini-3-flash-preview` plus a web-grounded system prompt that requires inline `[n]` citations and a final `Sources:` list.
- Add a "🔎 Search" toggle in chat composer (no UI redesign — same button row as existing modes).
- Add Deep Research sub-mode: multi-step (decompose → search → synthesize) using same model with longer context.

**Voice AI (Phase 10)**
- New `src/routes/api/voice-stt.ts` → proxies to Lovable AI `/audio/transcriptions` (`openai/gpt-4o-mini-transcribe`, streaming SSE).
- New `src/routes/api/voice-tts.ts` → proxies to `/audio/speech` (`openai/gpt-4o-mini-tts`, PCM SSE).
- Extend `src/lib/voice.ts` with `recordAndTranscribe()` and `speak(text)` helpers (MediaRecorder + WebAudio PCM playback). Wire to existing mic button.

**AI Tools page (Phase 13 writing + coding)**
- New route `/_authenticated/tools` with cards: Email, Blog, Resume, Cover Letter, Code Gen, Code Explain, Code Debug, Image Gen, Image Edit.
- Each card opens an inline drawer that calls a new `runTool` serverFn (reuses Lovable AI).
- Image gen/edit calls `google/gemini-3-flash-image-preview` via existing pattern.

## Turn B — Market & News (Phases 11, 12)

**Market upgrades (Phase 11)**
- Extend `insights.functions.ts` with `getIndianIndices` (Nifty 50, Bank Nifty, Sensex via Yahoo Finance `^NSEI`, `^NSEBANK`, `^BSESN`).
- Add `getTechnicals(symbol, range)` computing RSI, MACD, EMA-20, SMA-50, Bollinger Bands from Yahoo historical data.
- Add `getSectorPerformance()` for Bank/IT/FMCG/Pharma/Auto sector indices.
- Add new tabs/strips to existing Market page (Indices, Sectors, Indicators) — no redesign, glassmorphism preserved.

**News expansion (Phase 12)**
- Extend `insights.functions.ts` with `getCategorizedNews(state, category)` covering all categories.
- Use GNews/Google News RSS fallback chain with image extraction; cache 5 min in-memory.
- Add category chips + state selector to existing India News page (additive, same theme).
- Add "Breaking" and "Today" sections.

## Turn C — Finance system (Phase 15)

- DB migration: `portfolio_holdings` and `watchlist` tables (RLS + GRANTs).
- New route `/_authenticated/portfolio`: holdings table with live P&L (Yahoo quote), watchlist, add/remove.
- New route `/_authenticated/calculators`: SIP, EMI, Compound Interest (pure-client math, no API).
- BottomNav: add "Tools" and "Portfolio" entries (keep 5-tab layout — move existing items or add overflow menu).

## Technical notes
- All new server logic uses `createServerFn` + `requireSupabaseAuth` (or server routes for SSE streaming endpoints under `src/routes/api/`).
- News/market APIs gracefully fall back to cached/mock data on failure (per existing pattern).
- Chat streaming, memory distillation, verification pipeline from Phase 1 stay intact.
- No edits to: auth pages, profile, Market existing rows, News existing layout, image upload, chat bubble UI, supabase client files.

**Scope check:** Phase 14 wasn't in your list — skipping. Confirm to proceed with Turn A, or tell me to reorder.
