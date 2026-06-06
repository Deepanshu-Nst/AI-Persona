import type { AgentContext, AgentResponse } from "@/types";
import { retrieve } from "@/lib/agent/retrieval-tool";

const BOOKING_KEYWORDS = [
  "book", "schedule", "call", "meeting", "appointment",
  "availability", "free slot", "free time", "available",
  "talk to", "speak with", "chat with",
];

function detectBookingIntent(query: string): boolean {
  const lower = query.toLowerCase();
  return BOOKING_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractSources(result: Awaited<ReturnType<typeof retrieve>>) {
  return result.results.slice(0, 3).map((r) => ({
    label: r.source,
    snippet: r.content.slice(0, 200),
  }));
}

export async function orchestrate(context: AgentContext): Promise<AgentResponse> {
  const result = await retrieve(context.query);
  const bookingIntent = detectBookingIntent(context.query);

  if (result.rejected) {
    return {
      answer: "I can only answer questions grounded in the candidate's resume and public GitHub repositories. Please ask something related to their background, experience, or projects.",
      sources: [],
      metadata: { bookingAvailable: false, conversationId: context.conversationId },
    };
  }

  if (result.results.length === 0 && !bookingIntent) {
    return {
      answer: "I don't have information about that in the corpus. I can answer questions about Deepanshu's resume, projects, GitHub repositories, and availability. Could you try rephrasing or asking something else?",
      sources: [],
      metadata: { bookingAvailable: false, conversationId: context.conversationId },
    };
  }

  if (result.results.length === 0 && bookingIntent) {
    return {
      answer: "Yes, you can book a call with Deepanshu! Click the button below to request a slot.",
      sources: [],
      metadata: { bookingAvailable: true, conversationId: context.conversationId },
    };
  }

  const topResult = result.results[0];
  const reply = `Based on the ${topResult.source}:\n\n${topResult.content}`;

  return {
    answer: reply,
    sources: result.results.map((r) => r.source),
    metadata: {
      sourceSnippets: extractSources(result),
      bookingAvailable: bookingIntent,
      conversationId: context.conversationId,
    },
  };
}
