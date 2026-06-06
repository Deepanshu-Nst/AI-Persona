# Setup Guide

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **npm** (ships with Node.js)
- **Twilio account** (free trial) — optional, only needed for voice
- **Google Cloud project** — optional, only needed for real calendar booking

---

## Local Development

### 1. Install dependencies

```bash
git clone <repo-url>
cd scaler-ai-persona
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set any values you need. The system works without credentials — missing values trigger graceful fallbacks.

**Minimal setup (no external services):**

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

This gives you a fully functional chat interface and voice agent logic (voice requires Twilio to receive calls, but the code path can be tested via curl).

**Full setup (Twilio + Google Calendar):**

See the Environment Variables section in the README for descriptions of each variable.

> **Google Calendar private key:** The key in `.env.local` should use single quotes. If the key contains `\n`, keep them as literal `\n` — the code handles the conversion:
> ```
> GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n'
> ```

### 3. Ingest the corpus

```bash
npm run ingest
```

This reads `content/resume.md` and `content/github/repos.json`, splits them into chunks, and writes `corpus/chunks.json`. The chunker splits by markdown headings and creates one chunk per repo.

The corpus is gitignored and needs to be regenerated on every deploy. The Vercel build command does this automatically if you add `npm run ingest` to the build step.

### 4. Start the server

```bash
npm run dev
```

Open `http://localhost:3000` (landing page) or `http://localhost:3000/chat` (chat interface).

### 5. Verify it works

```bash
# Health check
curl http://localhost:3000/api/health
# → { "status": "ok", "timestamp": "..." }

# Chat query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is FitCheck?"}'
# → { "reply": "Based on the Resume > FitCheck — Fashion-Tech Mobile App:...", "sources": [...], "bookingAvailable": false, "conversationId": "..." }

# Calendar availability
curl -X POST http://localhost:3000/api/calendar/availability \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-10"}'
# → { "slots": [{ "start": "...", "end": "..." }, ...] }

# Calendar booking
curl -X POST http://localhost:3000/api/calendar/book \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-06-10","time":"10:00:00","duration":30}'
# → { "success": true, "eventId": "mock-...", "confirmationCode": "CONF-..." }
```

---

## Twilio Voice Setup

To make the voice agent reachable by phone:

### 1. Expose your dev server (optional, for testing)

Use [ngrok](https://ngrok.com) to create a public URL:

```bash
ngrok http 3000
# → https://abc123.ngrok-free.app
```

Update `NEXT_PUBLIC_APP_URL` in `.env.local` to this URL.

### 2. Configure Twilio phone number

1. Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click your phone number
3. Under **Voice Configuration**, set **A call comes in** to `Webhook`
4. URL: `https://your-ngrok-url.vercel.app/api/voice` (or your deployed URL)
5. HTTP method: `POST`
6. Click **Save**

### 3. Test the voice agent

Call your Twilio number. You should hear:

> "Hi, I'm Deepanshu's AI assistant. I can answer questions about his background, experience, and projects, or help you book a call. What would you like to know?"

Speak a question like "What is FitCheck?" or "Book a call."

---

## Google Calendar Setup

For real calendar availability and booking:

### 1. Create a Google Cloud service account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Enable the **Google Calendar API**
4. Go to **IAM & Admin → Service Accounts**
5. Create a new service account (name: "calendar-bot")
6. Generate a JSON key and download it
7. Extract `client_email` and `private_key` from the JSON

### 2. Share your calendar

1. Open Google Calendar
2. Find your calendar in the left sidebar → click the three dots → **Settings and sharing**
3. Under **Share with specific people**, add the service account email as **Make changes to events**

### 3. Set environment variables

```
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
GOOGLE_CALENDAR_ID=your-email@gmail.com
```

> The calendar ID is usually your Gmail address, or a long ID ending in `@group.calendar.google.com` for shared calendars.

---

## Deployment

### Vercel

```bash
npx vercel --prod
```

**Important:** Set environment variables in the Vercel dashboard under **Settings → Environment Variables**. Add all variables from `.env.local`.

For the Google private key, paste the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` with `\n` intact. Vercel handles the encoding properly.

**Build command:** The default `next build` is sufficient. Run `npm run ingest` before building if the content files have changed. You can add a prebuild step:

```json
{
  "scripts": {
    "vercel-build": "npm run ingest && next build"
  }
}
```

### Other Node.js hosting

Any Node.js 18+ host works:

```bash
npm run build
npm start
```

Set environment variables via the platform's configuration mechanism or a `.env.local` file in production.

---

## Testing

```bash
# Unit tests (20 tests)
npm test

# Eval tests (14 automated metrics)
npm run eval:test

# Generate eval report
npm run eval:pdf

# Lint check
npm run lint
```

Expected results:

| Command | Expected |
|---|---|
| `npm test` | 20/20 pass |
| `npm run lint` | 0 warnings, 0 errors |
| `npm run eval:test` | 14/14 pass |
| `npm run build` | 11 routes compiled, 0 errors |

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Chat returns "I don't have information" for known topics | Corpus not ingested | Run `npm run ingest` |
| Google Calendar returns mock slots | Credentials missing or invalid | Check `.env.local` values |
| Voice call returns "no response" | Twilio webhook URL wrong | Check URL points to `/api/voice` |
| Build fails with missing module | Dependencies not installed | Run `npm install` |
| Lint errors | Code style issue | Run `npm run lint` and fix reported issues |
