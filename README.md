# Scaler AI Persona

Live AI persona system for the Scaler AI Engineer Intern screening assignment.
Answers questions about the candidate's background and GitHub projects through a chat interface and a Twilio-powered voice agent. Can check real calendar availability and book slots.

**Zero LLM API cost** — all answers are grounded in a pre-built corpus using BM25 + n-gram retrieval.

```
no-llm  ·  bm25+ngram  ·  nextjs15  ·  typescript  ·  tailwindcss-v4
```

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                            │
│                                                                    │
│  ┌─────────────────┐        ┌─────────────┐      ┌──────────────┐ │
│  │   Browser Chat   │        │Twilio Voice │      │   API Client │ │
│  │   /chat (page)   │        │  (phone ☎)  │      │ (curl, etc.) │ │
│  └────────┬─────────┘        └──────┬──────┘      └──────┬───────┘ │
└───────────┼─────────────────────────┼─────────────────────┼─────────┘
            │                         │                      │
            ▼                         ▼                      ▼
┌───────────────────────────────────────────────────────────────────┐
│                       API ROUTES (Next.js 15)                      │
│                                                                    │
│  /api/chat      /api/voice      /api/voice/response               │
│  /api/calendar/availability    /api/calendar/book                 │
│  /api/health                                                      │
│                                                                    │
│  All inputs validated with Zod before processing                   │
└──────────┬──────────────────────────┬──────────────────┬──────────┘
           │                          │                  │
           ▼                          ▼                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATION LAYER                             │
│                                                                    │
│  ┌────────────────────────┐  ┌────────────────────────────────┐   │
│  │   Chat Orchestrator    │  │   Voice Orchestrator           │   │
│  │  (orchestrator.ts)     │  │  (voice-orchestrator.ts)       │   │
│  │                        │  │  State machine:                │   │
│  │  retrieve + detect     │  │  greeting → qa → booking_date  │   │
│  │  booking intent →      │  │  → booking_time → confirming   │   │
│  │  format answer          │  │  → done                        │   │
│  └────────┬───────────────┘  └────────┬───────────────────────┘   │
└───────────┼───────────────────────────┼────────────────────────────┘
            │                           │
            ▼                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                         TOOL LAYER                                 │
│                                                                    │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │  Retrieval   │  │   Availability   │  │      Booking       │   │
│  │  retrieval-  │  │  availability-   │  │    booking-        │   │
│  │  tool.ts     │  │  tool.ts         │  │    tool.ts         │   │
│  │  + guard     │  │  ↓ calendar      │  │  → creates event   │   │
│  │  (prompt-    │  │  client.check    │  │  → returns CONF-   │   │
│  │   guard.ts)  │  │  Availability()  │  │  code              │   │
│  └──────┬───────┘  └────────┬─────────┘  └─────────┬──────────┘   │
└─────────┼───────────────────┼──────────────────────┼───────────────┘
          │                   │                      │
          ▼                   ▼                      ▼
┌───────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE & DATA LAYER                         │
│                                                                    │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  BM25 + N-gram  │  │ Google Calendar  │  │  In-Memory       │  │
│  │  search (RAG)   │  │ API (JWT)        │  │  Session Map     │  │
│  │  (search.ts)    │  │ (client.ts)      │  │  w/ 10-min TTL   │  │
│  │         │        │  │   ↕ mock fallback│  │  (voice.ts)      │  │
│  │  corpus/        │  │  (when unconfig'd)│  │                  │  │
│  │  chunks.json    │  │                  │  │                  │  │
│  │  (25 chunks)    │  │                  │  │                  │  │
│  └─────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Offline Ingestion Pipeline (npm run ingest)               │   │
│  │  content/resume.md  ─→ chunkMarkdown() ─┐                  │   │
│  │  content/github/    ─→ chunkRepos() ────┤                  │   │
│  │    repos.json                          │→ corpus/          │   │
│  │                                        │   chunks.json     │   │
│  │  Total: 25 chunks                      │   (gitignored)    │   │
│  │  (16 resume sections + 9 GitHub repos) ┘                  │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Features

- **Grounded chat interface** — ask questions about the candidate's resume and GitHub repositories. Answers are verbatim corpus excerpts, not generated text.
- **Voice agent** — call a Twilio phone number to ask questions and book a meeting. State machine handles the conversation flow.
- **Calendar booking** — check real availability via Google Calendar API and book 30-minute slots. Falls back to mock slots when credentials are unset.
- **Prompt injection guard** — 13 regex patterns detect adversarial queries before they reach the retrieval layer. Blocked queries return a refusal response.
- **Eval report** — `npm run eval:test` runs 14 automated metric tests; `npm run eval:pdf` generates an A4-printable report.

---

## How It Works

### Chat Interface

A user types a question in the browser at `/chat`.

```
POST /api/chat { message: "what is FitCheck?" }
  │
  ├─ orchesrate({ query, source: "chat" })
  │    ├─ retrieve(query)
  │    │    ├─ guardQuery(query)       ← injection check (13 regex patterns)
  │    │    └─ search(query, topK=5)  ← BM25 + n-gram hybrid
  │    │         └─ loadCorpus() → 25 chunks
  │    │              ↓
  │    │         hybridScore = 0.8 * BM25 + 0.2 * Jaccard(bigrams)
  │    │
  │    ├─ If rejected → refusal: "I can only answer questions grounded in..."
  │    ├─ If no results + no booking → "I don't have information about that..."
  │    ├─ If no results + booking intent → shows booking form
  │    └─ If results → reply = top corpus chunk content + source citations
  │
  └─ Response { reply, sources[], bookingAvailable }
```

The chat UI displays the answer alongside collapsible source citations so the user can see exactly which corpus chunk was used.

### Voice Agent

A user calls the Twilio phone number. The conversation flows through a deterministic state machine:

```
Call rings
  │
  └─ Twilio <Gather> loop (each turn = one HTTP POST)
       │
       ├─ Phase: greeting
       │    → "Hi, I'm Deepanshu's AI assistant. Ask me anything!"
       │
       ├─ Phase: qa  (default — stay here until booking is detected)
       │    → retrieve(transcript)
       │    → speak top result (<400 chars, natural phrasing)
       │
       ├─ Phase: booking_date
       │    → parseDate(transcript) — "today", "tomorrow", "next Tuesday", MM/DD
       │    → getAvailability(date) — freeBusy query or mock slots
       │    → "I have slots at 9am, 9:30am, ... Which works for you?"
       │
       ├─ Phase: booking_time
       │    → parseTime(transcript) — "2pm", "10:30am", "14:00"
       │    → bookSlot({ date, time, duration: 30 })
       │    → "All set! Your confirmation code is CONF-XXXX"
       │
       └─ Phase: done → hangup
```

Booking intent is detected via keyword matching (`"book"`, `"schedule"`, `"call"`, `"meeting"`, `"availability"`). The voice agent stays in the `qa` phase until a booking keyword triggers the transition to `booking_date`.

### Grounding & Hallucination Prevention

The system uses **no LLM API**. Every answer is a verbatim excerpt from the pre-built corpus:

1. **No generation** — there is no model to jailbreak or hallucinate from. Answers are retrieved text blocks.
2. **Pre-search injection guard** — `guardQuery()` checks 13 adversarial patterns before any search runs. Blocked queries never touch the corpus.
3. **Empty-result handling** — if BM25 + n-gram returns no relevant chunk, the system says "I don't have information about that." It does not fabricate.
4. **Verifiable sources** — every chat answer includes source labels pointing to the specific corpus section. Users can inspect the exact text used.
5. **Automated eval** — 14 eval tests measure groundedness and refusal behavior on out-of-corpus queries. Unsupported prompts are rejected by design.

### Calendar Booking

```
User says "book a call" / clicks booking button
  │
  ├─ CHAT: <BookingForm> collects name, email, date
  │        → POST /api/calendar/book { date, time, duration }
  │
  └─ VOICE: state machine transitions to booking_date → booking_time
           → parseDate/parseTime extract date + time from speech
           → bookSlot({ date, time, duration: 30 })
              │
              ├─ calendarClient.createEvent()
              │    ├─ Google Calendar OAuth (JWT) → events.insert()
              │    └─ Unconfigured → mock event (id = "mock-{timestamp}")
              │
              └─ Returns confirmation code (CONF-XXXX)
                   → Chat: shows in UI; Voice: speaks aloud
```

The calendar client caches availability for 10 minutes to avoid redundant `freebusy` queries. When Google Calendar credentials are absent, the system generates synthetic 30-minute slots from 9am–5pm (skipping 12–1pm), so the full booking flow works in dev without setup.

---

## Quick Start

```bash
# Prerequisites: Node.js 18+, npm
npm install
cp .env.example .env.local

# (Optional) Edit .env.local to add Twilio + Google Calendar credentials
# The system works without them — booking falls back to mock data

npm run ingest     # Build the corpus from content/ files
npm run dev        # Start dev server at http://localhost:3000
```

Open `http://localhost:3000` (landing page) or `http://localhost:3000/chat` (chat interface).

Verify the server is running:

```bash
curl http://localhost:3000/api/health
# → { "status": "ok", "timestamp": "..." }
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public URL for Twilio webhooks |
| `GOOGLE_CLIENT_EMAIL` | No | — | Google Calendar service account email |
| `GOOGLE_PRIVATE_KEY` | No | — | Service account private key (use single quotes, preserve `\n`) |
| `GOOGLE_CALENDAR_ID` | No | — | Calendar ID for availability checks and booking |
| `TWILIO_ACCOUNT_SID` | No | — | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | — | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | — | Twilio phone number for inbound calls |
| `PORT` | No | `3000` | Dev server port |

All variables except `NEXT_PUBLIC_APP_URL` and `PORT` are optional. The system degrades gracefully when calendar/Twilio credentials are absent.

---

## Project Structure

```
app/                  API routes and pages
  api/chat           POST /api/chat — chat handler
  api/voice          POST /api/voice — Twilio inbound webhook
  api/voice/response POST /api/voice/response — speech result handler
  api/calendar/      availability + booking routes
  api/health         health check
  chat/page.tsx      chat UI (client component)
  page.tsx           landing page
lib/                  Core logic
  agent/             tools (retrieval, availability, booking) + orchestrators
  rag/               BM25 search, chunker, tokeniser, prompt guard
  calendar/          Google Calendar API client + schemas
  twilio/            session manager, TwiML builders, session types
  config.ts          Zod-validated environment config
content/              Raw source material
  resume.md          candidate resume (markdown)
  github/repos.json  public GitHub repo metadata
corpus/               Processed corpus (gitignored, generated by ingest)
  chunks.json        all 25 chunks in searchable format
components/           Reusable React components
  booking-form.tsx   booking form used by chat page
scripts/              CLI tools
  ingest.ts          corpus ingestion pipeline
  run-eval-tests.ts  automated eval test runner
  eval-pdf.ts        eval report HTML generator
types/                TypeScript type definitions
tests/                Unit tests (rag chunker + prompt guard)
prompts/              System prompt templates
docs/                 Documentation
```

---

## Deployment

### Vercel (recommended)

```bash
npx vercel --prod
```

Set environment variables in the Vercel dashboard under **Settings → Environment Variables**. Add all variables from `.env.example`. For the private key, paste the raw key including `\n` characters — Vercel handles encoding.

After deploying, configure Twilio:

1. In Twilio Console → Phone Numbers → your number → Voice Configuration
2. Set **A call comes in** to `Webhook`, URL: `https://your-app.vercel.app/api/voice`
3. Set HTTP method to `POST`
4. Save

### Manual (any Node.js host)

```bash
npm run build
npm start
```

Environment variables can be set via the platform's configuration UI or a `.env.local` file.

---

## Cost Breakdown

This system has **zero per-query API costs** because it uses no LLM. All inference is local BM25 retrieval.

| Component | Cost per unit | Monthly estimate (1,000 queries) | Notes |
|---|---|---|---|
| Chat query (BM25 search) | **$0.0000** | $0.00 | No external API calls. Pure local computation |
| Voice call (Twilio inbound) | ~$0.013 / min | ~$1.30 (100 min) | US carrier rates. Billed per-minute by Twilio |
| Google Calendar API | **Free** (1M queries/day) | $0.00 | Free tier covers typical usage |
| Vercel hosting | **Free** (100 GB bandwidth) | $0.00 | Hobby plan sufficient |
| **Total (chat-only usage)** | **$0.00** | **$0.00** | Entirely on free tier |
| **Total (with voice)** | ~$0.013/min | ~$1.30 | Only Twilio minutes incur cost |

Compared to an LLM-based system:

| Component | This system | LLM-based alternative |
|---|---|---|
| Per-query inference | $0.0000 | ~$0.002–0.01 (gpt-4o-mini) |
| Hallucination risk | None (retrieval-only) | Present (requires additional guardrails) |
| Latency | ~1 ms retrieval | ~500–2000 ms API round-trip |

---

## Eval Report

Generate a metrics-driven evaluation report:

```bash
npm run eval:test    # Run 14 automated tests → scripts/eval-metrics.json
npm run eval:pdf     # Generate HTML report → scripts/eval-report.html
```

Open `scripts/eval-report.html` in a browser and print to PDF (A4, no margins, background graphics on).

Metrics measured: known-query hit rate, out-of-corpus refusal behavior, injection flag rate, booking success rate, average latency, average BM25 score.

---

## Future Improvements

- **LLM paraphrasing layer** — use a small model (gpt-4o-mini, ~$0.15/day) to rewrite retrieved chunks into fluent spoken responses while keeping BM25 as the sole knowledge source.
- **Persistent session store** — replace the in-memory `Map` with Upstash Redis (free tier) so calls survive server restarts.
- **Voicemail detection** — detect answering machines via Twilio's `AnsweredBy` parameter and schedule a callback.
- **STT accuracy tracking** — log Twilio `Transcription` callbacks and compute word error rate against expected queries.
- **Multi-language corpus** — add a Hindi/English parallel corpus for bilingual responses.
- **A/B test framework** — route a percentage of calls to alternate response phrasings and log engagement metrics.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Lint all source files (0 warnings required) |
| `npm test` | Run unit tests (20 tests) |
| `npm run ingest` | Build corpus from `content/` files |
| `npm run eval:test` | Run 14 automated eval tests |
| `npm run eval:pdf` | Generate eval report HTML |
