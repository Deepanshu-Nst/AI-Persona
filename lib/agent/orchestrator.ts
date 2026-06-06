import type { AgentContext, AgentResponse } from "@/types";
import { retrieve } from "@/lib/agent/retrieval-tool";

const BOOKING_KEYWORDS = [
  "book", "schedule", "call", "meeting", "appointment",
  "availability", "free slot", "free time", "available",
  "talk to", "speak with", "chat with",
];

const GREETINGS = [
  "hi", "hello", "hey", "greetings", "good morning",
  "good afternoon", "good evening", "good day", "hey there",
  "what's up", "howdy", "hi there", "hello there",
];

function detectBookingIntent(query: string): boolean {
  const lower = query.toLowerCase();
  return BOOKING_KEYWORDS.some((kw) => lower.includes(kw));
}

function isGreeting(query: string): boolean {
  const n = query.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
  return GREETINGS.some(
    (g) => n === g || n.startsWith(g + " ") || n.endsWith(" " + g) || n.includes(" " + g + " "),
  );
}

function extractSources(result: Awaited<ReturnType<typeof retrieve>>) {
  return result.results.slice(0, 3).map((r) => ({
    label: r.source,
    snippet: r.content.slice(0, 200),
  }));
}

export async function orchestrate(context: AgentContext): Promise<AgentResponse> {
  const { query, conversationId } = context;

  if (isGreeting(query)) {
    return {
      answer:
        "Hi! I'm an AI assistant here to answer questions about Deepanshu's background, experience, and projects. You can ask me things like 'What experience does Deepanshu have?', 'Tell me about his projects', or 'What skills does he have?' — or you can book a call with him directly.",
      sources: [],
      metadata: { bookingAvailable: false, conversationId },
    };
  }

  const result = await retrieve(query);
  const bookingIntent = detectBookingIntent(query);

  if (result.rejected) {
    return {
      answer: "I can only answer questions grounded in the candidate's resume and public GitHub repositories. Please ask something related to their background, experience, or projects.",
      sources: [],
      metadata: { bookingAvailable: false, conversationId },
    };
  }

  if (result.results.length === 0 && !bookingIntent) {
    return {
      answer: "I don't have information about that in the corpus. I can answer questions about Deepanshu's resume, projects, GitHub repositories, and availability. Could you try rephrasing or asking something else?",
      sources: [],
      metadata: { bookingAvailable: false, conversationId },
    };
  }

  if (result.results.length === 0 && bookingIntent) {
    return {
      answer: "Yes, you can book a call with Deepanshu! Click the button below to request a slot.",
      sources: [],
      metadata: { bookingAvailable: true, conversationId },
    };
  }

  const topResult = result.results[0];
  const prefix = result.fallback
    ? "Based on the available information:"
    : `Based on the ${topResult.source}:`;
  const reply = `${prefix}\n\n${topResult.content}`;

  return {
    answer: reply,
    sources: result.results.map((r) => r.source),
    metadata: {
      sourceSnippets: extractSources(result),
      bookingAvailable: bookingIntent,
      conversationId,
    },
  };
}
