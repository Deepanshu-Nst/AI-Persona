# Architecture

## Layer Overview

The system follows a five-layer architecture with strict separation of concerns:

```
  [User Interfaces]    ← Browser, Twilio Voice, API clients
  [API Routes]          ← Next.js 15 route handlers
  [Orchestration]       ← Chat + Voice orchestrators
  [Tools]               ← Retrieval, Availability, Booking
  [Knowledge & Data]    ← BM25 RAG, Google Calendar, Sessions
```

Each layer communicates through well-defined interfaces. The ingestion pipeline runs offline and is not part of the request path.

---

## 1. User Interface Layer

### Web Chat (`app/chat/page.tsx`)

A client-side React component with `useState`/`useRef` for state management. No external state library. Uses `crypto.randomUUID()` for conversation IDs. Renders:

- Message list with alternating user/assistant bubbles
- Suggestion chips for common queries
- Typing indicator during loading
- Collapsible source citations on each assistant message
- Embedded booking form when booking intent is detected
- Error banner for failed requests

### Twilio Voice (`POST /api/voice`, `POST /api/voice/response`)

Twilio's `<Gather input="speech">` creates a request-response loop. Each spoken turn is a separate HTTP POST. The TwiML response either:

- Includes `<Gather>` to continue listening (qa, booking_date, booking_time phases)
- Returns `<Say>` without `<Gather>` followed by `<Hangup>` (done phase)
- Returns `<Gather>` with booking confirmation rendering

Amazon Polly Joanna voice is used for all spoken output.

### API Clients

Any HTTP client can call the API routes directly with JSON payloads. All routes validate input with Zod.

---

## 2. API Route Layer

Six route handlers under `app/api/`:

| Route | Method | Input | Output |
|---|---|---|---|
| `/api/chat` | POST | `{ message, conversationId? }` | `{ reply, sources[], bookingAvailable, conversationId }` |
| `/api/voice` | POST | Twilio webhook params (CallSid, etc.) | TwiML XML (welcome + Gather) |
| `/api/voice/response` | POST | Twilio webhook params (SpeechResult, CallSid) | TwiML XML (answer + Gather or hangup) |
| `/api/calendar/availability` | POST | `{ date }` (ISO string) | `{ slots: TimeSlot[] }` |
| `/api/calendar/book` | POST | `{ date, time, duration, name?, email? }` | `{ success, eventId, confirmationCode }` |
| `/api/health` | GET | — | `{ status: "ok", timestamp }` |

Every route handler has the same pattern: Zod schema validation → business logic call → structured response. Error handling returns `{ error: string }` with appropriate HTTP status codes.

---

## 3. Orchestration Layer

### Chat Orchestrator (`lib/agent/orchestrator.ts`)

Single function `orchestrate(context)` that produces an `AgentResponse`:

1. Calls `retrieve(query)` — which runs `guardQuery()` then `search()`
2. Detects booking intent via keyword matching
3. Returns one of four response types:
   - **Rejected**: query matched an injection pattern → refusal message
   - **Empty + no booking**: no corpus match, no booking intent → "don't know" message
   - **Empty + booking**: no corpus match but booking keyword detected → booking prompt with `bookingAvailable: true`
   - **Results**: `generateResponse(query, results)` converts retrieved chunks into a natural first-person reply using the LLM Synthesis layer

### Voice Orchestrator (`lib/agent/voice-orchestrator.ts`)

State machine with five phases managed by a `VoiceSession` object:

| Phase | Trigger | Action | Output |
|---|---|---|---|
| `greeting` | Call answered | Welcome message, start listening | TwiML with Gather |
| `qa` | User asks a question | `retrieve(transcript)` → `generateResponse()` via LLM | TwiML with Gather |
| `booking_date` | Booking keyword detected | `parseDate(transcript)` → `getAvailability(date)` → list slots | TwiML with Gather |
| `booking_time` | User says a time | `parseTime(transcript)` → `bookSlot(...)` → confirmation | TwiML with confirmation or Gather |
| `done` | Booking confirmed or user hangs up | Thank you message + Hangup | TwiML without Gather |

The voice orchestrator uses the same `retrieve()`, `generateResponse()`, `getAvailability()`, and `bookSlot()` tools as the chat orchestrator, but formats output differently (stripping markdown headings and newlines).

#### Date/time parsing

Date parsing handles: `"today"`, `"tomorrow"`, `"next Tuesday"`, `"March 15"`, `"03/15"`, ISO dates. Falls back to `"I didn't catch that date"` on failure.

Time parsing handles: `"2pm"`, `"2:00pm"`, `"2:30 PM"`, `"14:00"`, `"10:30"`. Falls back to asking for a time format on failure.

---

## 4. Tool Layer

### Retrieval Tool (`lib/agent/retrieval-tool.ts`)

Wraps the RAG search with injection detection:

```
retrieve(query)
  ├─ guardQuery(query)     ← pre-search injection check
  │    └─ flagged → { rejected: true, reason: "..." }
  └─ search(query, 5)      ← BM25 + n-gram
       └─ results → { results[], sources[], rejected: false }
```

### LLM Synthesis Layer (`lib/agent/llm.ts`)

Converts raw search results into professional, recruiter-friendly first-person answers.
- Checks `GROQ_API_KEY` to call Groq endpoint (`llama3-8b-8192`)
- Falls back to `GEMINI_API_KEY` (Gemini 1.5 Flash)
- Falls back to `OPENAI_API_KEY` (GPT-4o-Mini)
- Falls back to local formatting template if no API keys are present.
- Applies a helper function `prepareContextForLLM(results)` to deduplicate chunks, merge related resume sections, and structure context cleanly.

### Availability Tool (`lib/agent/availability-tool.ts`)

Thin wrapper around the calendar client:

```
getAvailability(date)
  └─ calendarClient.checkAvailability(date)
       ├─ Google Calendar freebusy.query (with 10-min cache)
       └─ Unconfigured or Query Exception → generateMockSlots(date)
            Returns TimeSlot[] (9am–5pm, 30-min intervals, skip 12–1pm)
```

### Booking Tool (`lib/agent/booking-tool.ts`)

Creates calendar events with confirmation codes:

```
bookSlot({ date, time, duration, attendeeEmail?, attendeeName? })
  ├─ Construct Date objects for start/end
  ├─ calendarClient.createEvent({ summary, start, end, description })
  │    ├─ Google Calendar → events.insert() → real eventId
  │    └─ Unconfigured → mock eventId = "mock-{timestamp}"
  └─ Generate confirmation code:
       mock: "CONF-{timestamp}"
       real: "CONF-{first 8 chars of Google eventId}"
```

---

## 5. Knowledge & Data Layer

### RAG Search (`lib/rag/search.ts`)

Hybrid BM25 + bigram Jaccard similarity:

**BM25 scoring** (weight: 0.8):
```
k1 = 1.5, b = 0.75
score = IDF * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / avgDocLen))
```

**Bigram Jaccard** (weight: 0.2):
```
bigrams = set of adjacent token pairs ("hello world" → {"hello world"})
jaccard = |intersection(query, doc)| / |union(query, doc)|
```

**Hybrid score**: `0.8 * BM25 + 0.2 * Jaccard`

The index is built on every search call (17 chunks → negligible overhead). Results are filtered to only return chunks with score > 0.

### Tokeniser (`lib/rag/chunker.ts`)

Simple tokeniser: lowercase → split on `[^a-z0-9]+` → filter single chars → remove ~90 common English stop words.

### Prompt Guard (`lib/rag/prompt-guard.ts`)

13 regex patterns grouped into categories:

| Category | Examples |
|---|---|
| Instruction override | `ignore all instructions`, `new instructions` |
| Identity override | `you are not an AI assistant` |
| Context manipulation | `forget everything you know` |
| Meta reference | `system prompt`, `[system]`, `<system>` |
| Role assignment | `act as if`, `role:`, `you will now` |
| Bypass | `answer without using`, `do not follow` |

### Corpus Ingestion (`scripts/ingest.ts`)

Runs offline. Reads two source files:

- **`content/resume.md`** — 16 chunks created by splitting on `#`, `##`, `###` headings (Contact, Summary, Experience sections, Projects, Skills, etc.)
- **`content/github/repos.json`** — 9 chunks (one per repo) with name, description, language, stars, and topics

Output: 17 chunks written to `corpus/chunks.json` (gitignored).

### Session Store (`lib/twilio/voice.ts`)

In-memory `Map<CallSid, VoiceSession>` with TTL-based cleanup:

- Each session has a 10-minute TTL (reset on each interaction)
- A cleanup interval runs every 5 minutes, evicting expired sessions
- State is lost on server restart (documented in eval report as failure mode #3)

### Calendar Cache (`lib/calendar/client.ts`)

Availability responses are cached in memory with a 10-minute TTL to avoid redundant `freebusy` queries during a single conversation.

---

## Key Design Decisions

### Hybrid LLM RAG Architecture

The most important architectural decision. BM25 + Jaccard similarity retrieval selects relevant context chunks from the 17-chunk corpus, and then an LLM (Groq `llama3-8b-8192` preferred, with Gemini/OpenAI fallbacks) synthesizes a natural first-person response. This gives:
- **Zero hallucination** — the LLM is strictly constrained via system instructions to only use the retrieved context, and the orchestrator bypasses LLM calls entirely if no relevant chunks are found.
- **Extremely low per-query cost** — using Groq/Gemini keeps token charges virtually negligible.
- **Prompt injection protection** — the guard checks 13 patterns *before* the search is executed, blocking adversarial queries before they can reach the LLM.
- **Low latency** — Groq's completions return in sub-150ms.

### Tool-Based Orchestration

Each tool has a single responsibility and can be tested independently. The orchestrators compose tools without knowing their internals. This makes it easy to swap implementations (e.g., replace mock calendar with real API).

### In-Memory State

No external databases or caches. Sessions and calendar responses live in Node.js Maps. This keeps deployment trivial but means state is lost on restart — acceptable for a scaffold, would use Redis for production.

### Google Calendar Mock Fallback

When credentials are absent or calendar queries encounter failures, the system generates synthetic slots. This lets the full booking flow work in development or staging without any setup. The mock is clearly labeled in logs so it's never confused with real availability.
