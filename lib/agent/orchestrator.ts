import type { AgentContext, AgentResponse } from "@/types";
import { retrieve } from "@/lib/agent/retrieval-tool";
import { generateResponse } from "@/lib/agent/llm";

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
        "Hi! I'm Deepanshu's AI assistant here to answer questions about my background, experience, and projects. You can ask me things like 'What experience do you have?', 'Tell me about your projects', or 'What skills do you have?' — or you can book a call with me directly.",
      sources: [],
      metadata: { bookingAvailable: false, conversationId },
    };
  }

  const result = await retrieve(query);
  const bookingIntent = detectBookingIntent(query);

  if (result.rejected) {
    return {
      answer: "I mostly stay focused on my work, projects, and technical background here. Happy to talk about AI systems, products, engineering, or anything from my portfolio.",
      sources: [],
      metadata: { bookingAvailable: false, conversationId },
    };
  }

  if (result.results.length === 0 && !bookingIntent) {
    return {
      answer: "I don't really have enough context around that specifically, but I'm happy to talk about my projects, AI work, engineering experience, or anything from my portfolio.",
      sources: [],
      metadata: { bookingAvailable: false, conversationId },
    };
  }

  if (result.results.length === 0 && bookingIntent) {
    return {
      answer: "Yes, you can book a call with me! Click the button below to request a slot.",
      sources: [],
      metadata: { bookingAvailable: true, conversationId },
    };
  }

  const reply = await generateResponse(query, result.results);

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
