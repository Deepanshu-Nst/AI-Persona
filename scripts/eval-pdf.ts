import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Metrics {
  generatedAt: string;
  testCases: number;
  passed: number;
  failed: number;
  summary: {
    knownHitRate: number | null;
    unknownRejectionRate: number | null;
    injectionFlagRate: number | null;
    avgKnownScore: number | null;
    avgLatencyMs: number | null;
    avgKnownLatencyMs: number | null;
    avgUnknownLatencyMs: number | null;
    avgInjectionLatencyMs: number | null;
  };
  voiceLatency: { average: number | null; p95: number | null };
  transcriptionAccuracy: number | null;
  hallucinationRate: number | null;
  bookingSuccess: { attempts: number; succeeded: number; failed: number };
  results: unknown[];
}

function pct(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

function num(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}

function placeholderBlock(label: string): string {
  return `<div class="placeholder">⏳ ${label}</div>`;
}

function row(label: string, value: string): string {
  return `<tr><td class="label">${label}</td><td class="val">${value}</td></tr>`;
}

function generateHtml(m: Metrics): string {
  const generatedDate = new Date(m.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const bookingRate =
    m.bookingSuccess.attempts > 0
      ? `${m.bookingSuccess.succeeded}/${m.bookingSuccess.attempts} (${(m.bookingSuccess.succeeded / m.bookingSuccess.attempts * 100).toFixed(0)}%)`
      : "⏳ Requires real call testing";

  const hallucinationSection = m.hallucinationRate !== null
    ? `<div class="stat">Hallucination rate: <strong>${num(m.hallucinationRate, 1)}%</strong></div>`
    : placeholderBlock("Requires manual review of 20+ out-of-corpus queries to measure false-positive answers");

  const voiceLatencySection =
    m.voiceLatency.average !== null
      ? `<div class="stat">Average: <strong>${num(m.voiceLatency.average, 0)}ms</strong> &nbsp;|&nbsp; P95: <strong>${num(m.voiceLatency.p95, 0)}ms</strong></div><div class="footnote">Measured from Twilio webhook receive to TwiML response body</div>`
      : placeholderBlock("Requires real Twilio call testing with timed webhook responses");

  const transcriptionSection = m.transcriptionAccuracy !== null
    ? `<div class="stat">Accuracy: <strong>${num(m.transcriptionAccuracy, 1)}%</strong> (Word Error Rate: ${num(100 - m.transcriptionAccuracy, 1)}%)</div>`
    : placeholderBlock("Requires human eval — place 10 varied calls, transcribe responses, compute WER");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=794, initial-scale=1">
<title>Eval Report — Scaler AI Persona</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1f2937;
    background: #fff;
    padding: 0;
  }
  h1 {
    font-size: 16pt;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin-bottom: 2px;
  }
  h2 {
    font-size: 11pt;
    font-weight: 700;
    margin-top: 10px;
    margin-bottom: 4px;
    padding-bottom: 2px;
    border-bottom: 1.5px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .subtitle {
    color: #6b7280;
    font-size: 8.5pt;
    margin-bottom: 10px;
  }
  .section {
    margin-bottom: 6px;
  }
  .stat {
    font-size: 9.5pt;
    margin: 2px 0;
  }
  .footnote {
    font-size: 8pt;
    color: #6b7280;
    margin-top: 1px;
  }
  .placeholder {
    color: #9ca3af;
    font-style: italic;
    font-size: 9pt;
    padding: 4px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
    margin: 3px 0;
  }
  td {
    padding: 1.5px 4px;
  }
  td.label {
    width: 55%;
    color: #374151;
  }
  td.val {
    width: 45%;
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .fail-list {
    font-size: 9pt;
    margin: 3px 0;
    padding-left: 16px;
  }
  .fail-list li {
    margin-bottom: 1px;
  }
  .meta {
    color: #6b7280;
    font-size: 7.5pt;
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px solid #e5e7eb;
  }
  .badge {
    display: inline-block;
    background: #e5e7eb;
    padding: 0 5px;
    border-radius: 3px;
    font-size: 8pt;
    font-weight: 600;
    color: #374151;
  }
  .badge-ok { background: #d1fae5; color: #065f46; }
  .badge-warn { background: #fef3c7; color: #92400e; }
  .highlight { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 8.5pt; }
  .flex-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .flex-row > * { flex: 1; min-width: 140px; }
</style>
</head>
<body>

<h1>🧠 Eval Report — Scaler AI Persona System</h1>
<div class="subtitle">${generatedDate}  •  ${m.testCases} automated tests (${m.passed} passed, ${m.failed} failed)  •  <span class="badge badge-ok">groq-llm</span> <span class="badge">bm25+ngram</span></div>

<div class="section">
  <h2>⚡ 1. Voice First-Response Latency</h2>
  ${voiceLatencySection}
</div>

<div class="section">
  <h2>🎯 2. Transcription Accuracy</h2>
  ${transcriptionSection}
</div>

<div class="section">
  <h2>✅ 3. Booking Success Rate</h2>
  <div class="stat">
    ${m.bookingSuccess.attempts > 0
      ? `<span class="badge badge-ok">${m.bookingSuccess.succeeded}/${m.bookingSuccess.attempts} succeeded</span>`
      : `<span class="badge badge-warn">not measured</span>`}
    &nbsp; Rate: <strong>${bookingRate}</strong>
  </div>
</div>

<div class="section">
  <h2>🛡️ 4. Hallucination Rate</h2>
  ${hallucinationSection}
</div>

<div class="section">
  <h2>📊 5. Retrieval Quality</h2>
  <table>
    ${row("Total pass rate", `${m.passed}/${m.testCases} (${pct(m.passed / m.testCases)})`)}
    ${row("Known-query hit rate", pct(m.summary.knownHitRate))}
    ${row("Unknown-query rejection rate", pct(m.summary.unknownRejectionRate))}
    ${row("Injection flag rate", pct(m.summary.injectionFlagRate))}
    ${row("Average BM25 score (known queries)", num(m.summary.avgKnownScore, 4))}
    ${row("Average latency (all queries)", `${num(m.summary.avgLatencyMs, 1)}ms`)}
    ${row("Average latency (known queries)", `${num(m.summary.avgKnownLatencyMs, 1)}ms`)}
    ${row("Average latency (injection queries)", `${num(m.summary.avgInjectionLatencyMs, 1)}ms`)}
    ${row("Corpus size", "17 chunks (8 resume + 9 GitHub repos)")}
  </table>
</div>

<div class="section">
  <h2>⚠️ 6. Three Failure Modes</h2>
  <ol class="fail-list">
    <li><strong>Date/time parsing fails on ambiguous speech</strong> — The voice agent parses dates like "today", "tomorrow", "next Tuesday" from raw Twilio transcripts. Accented or mumbled speech can produce unparseable tokens, causing the booking flow to stall.</li>
    <li><strong>Google Calendar unconfigured → mock fallback</strong> — When <code>GOOGLE_CLIENT_EMAIL</code> / <code>GOOGLE_PRIVATE_KEY</code> are unset, the calendar client returns synthetic 9am–5pm slots. The booking flow works in dev, but real availability is not reflected.</li>
    <li><strong>In-memory sessions lost on server restart</strong> — Voice session state lives in a plain <code>Map&lt;CallSid, VoiceSession&gt;</code>. Any server restart drops all active calls mid-conversation.</li>
  </ol>
</div>

<div class="section">
  <h2>⚖️ 7. Tradeoff</h2>
  <div class="highlight">
    <strong>Hybrid LLM RAG → natural first-person dialogue with strict grounding.</strong>
    Answers are retrieved via local BM25 + Jaccard similarity and synthesized in real-time by Groq's Llama 3 8B (with Gemini/OpenAI fallbacks).
    This balances conversational fluidity with strict data boundaries, preventing hallucinations while speaking in first-person as the candidate.
    The tradeoff is that it introduces a minor network call latency for the LLM API and requires API key configuration, but maintains a local fallback format if keys are absent.
  </div>
</div>

<div class="section">
  <h2>🚀 8. What I'd Build in 2 More Weeks</h2>
  <ol class="fail-list">
    <li><strong>Hybrid semantic search</strong> — integrate local vector embeddings (like SentenceTransformers or a lightweight client-side vector search library) alongside BM25 to capture deeper query intent.</li>
    <li><strong>Persistent session store</strong> — Swap the in-memory <code>Map</code> for Upstash Redis (free tier, 100MB). Survives restarts, enables multi-instance deploys.</li>
    <li><strong>Real STT accuracy tracking</strong> — Log Twilio <code>Transcription</code> callbacks, compute WER against expected queries, build a dashboard.</li>
    <li><strong>Voicemail detection + callback</strong> — Detect answering machines via <code>AnsweredBy</code> parameter, schedule a retry with a polite callback link.</li>
    <li><strong>Multi-language corpus</strong> — Add a Hindi/English parallel corpus so the agent can answer in both languages.</li>
    <li><strong>A/B test framework</strong> — Route a % of voice calls to alternate response phrasings, log user engagement (call duration, re-prompt rate).</li>
  </ol>
</div>

<div class="meta">
  <strong>How to generate PDF:</strong> Open this file in Chrome or Firefox → Cmd+P (or Ctrl+P) → <em>Save as PDF</em> (A4, margins: none, check "Background graphics").<br>
  <strong>Data source:</strong> <code>scripts/eval-metrics.json</code> — generated by <code>npm run eval:test</code>. Edit values manually after real call testing.<br>
  <strong>System version:</strong> Next.js 15 + TypeScript + TailwindCSS v4 + Zod 3 + Twilio + Google Calendar API + BM25 + n-gram
</div>

</body>
</html>`;
}

async function main() {
  const metricsPath = join(__dirname, "eval-metrics.json");
  let metrics: Metrics;

  try {
    const raw = await readFile(metricsPath, "utf-8");
    metrics = JSON.parse(raw) as Metrics;
    console.log(`  Loaded metrics from ${metricsPath}`);
  } catch {
    console.log("  No eval-metrics.json found, using defaults");
    metrics = {
      generatedAt: new Date().toISOString(),
      testCases: 15,
      passed: 0,
      failed: 0,
      summary: {
        knownHitRate: null,
        unknownRejectionRate: null,
        injectionFlagRate: null,
        avgKnownScore: null,
        avgLatencyMs: null,
        avgKnownLatencyMs: null,
        avgUnknownLatencyMs: null,
        avgInjectionLatencyMs: null,
      },
      voiceLatency: { average: null, p95: null },
      transcriptionAccuracy: null,
      hallucinationRate: null,
      bookingSuccess: { attempts: 0, succeeded: 0, failed: 0 },
      results: [],
    };
  }

  const html = generateHtml(metrics);
  const htmlPath = join(__dirname, "eval-report.html");
  await writeFile(htmlPath, html, "utf-8");

  console.log(`  Report written to ${htmlPath}`);
  console.log("");
  console.log("  ─────────────────────────────────────────────");
  console.log("  To generate PDF:");
  console.log("    1. Open the HTML file in Chrome or Firefox");
  console.log("    2. Cmd+P (or Ctrl+P on Linux/Windows)");
  console.log("    3. Select 'Save as PDF'");
  console.log("    4. Set paper size: A4, margins: none");
  console.log("    5. Check 'Background graphics'");
  console.log("    6. Save");
  console.log("  ─────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("Eval report failed:", err);
  process.exit(1);
});
