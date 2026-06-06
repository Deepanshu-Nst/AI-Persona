import { retrieve } from "@/lib/agent/retrieval-tool";
import { getAvailability } from "@/lib/agent/availability-tool";
import { bookSlot } from "@/lib/agent/booking-tool";
import { generateStreamingResponse } from "@/lib/agent/llm";
import type { VoiceSession } from "@/lib/twilio/session";

const BOOKING_KEYWORDS = [
  "book", "schedule", "appointment", "call", "meeting",
  "availability", "free slot", "free time", "available",
  "talk to", "speak with",
];

const DAY_NAMES: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function detectBookingIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return BOOKING_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseDate(text: string): string | null {
  const lower = text.toLowerCase().trim();

  if (lower === "today") {
    return new Date().toISOString().slice(0, 10);
  }
  if (lower === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  for (const [key, dayName] of Object.entries(DAY_NAMES)) {
    if (lower.includes(`next ${key}`) || lower.includes(`this ${key}`) || lower === key) {
      const d = new Date();
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const targetDay = days.indexOf(key);
      if (targetDay === -1) continue;
      const currentDay = d.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      if (lower.startsWith("next") || lower.includes("next ")) {
        if (targetDay > currentDay) diff += 7;
      }
      d.setDate(d.getDate() + diff);
      return d.toISOString().slice(0, 10);
    }
  }

  const dateMatch = lower.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) return dateMatch[1];

  const usMatch = lower.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    const year = y ?? new Date().getFullYear().toString();
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

function parseTime(text: string): string | null {
  const lower = text.toLowerCase().trim();

  const hourMin = lower.match(/(\d{1,2})\s*[:.]?\s*(\d{2})?\s*(am|pm)/);
  if (hourMin) {
    let hours = parseInt(hourMin[1], 10);
    const minutes = hourMin[2] ? parseInt(hourMin[2], 10) : 0;
    const meridian = hourMin[3];
    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const hourOnly = lower.match(/(\d{1,2})\s*(am|pm)/);
  if (hourOnly) {
    let hours = parseInt(hourOnly[1], 10);
    const meridian = hourOnly[2];
    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:00`;
  }

  const numeric = lower.match(/(\d{1,2})/);
  if (numeric) {
    const h = parseInt(numeric[1], 10);
    if (h >= 8 && h <= 18) {
      return `${String(h).padStart(2, "0")}:00`;
    }
  }

  return null;
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}

export interface VoiceResponse {
  text: string;
  phase: "continue" | "booking" | "hangup";
}

export async function handleVoiceQuery(
  transcript: string,
  session: VoiceSession,
): Promise<VoiceResponse> {
  const lower = transcript.toLowerCase().trim();

  if (session.phase === "booking_date") {
    const date = parseDate(transcript);
    if (!date) {
      return {
        text: "I didn't catch the date. Could you say it again, like next Tuesday or tomorrow?",
        phase: "continue",
      };
    }

    const slots = await getAvailability(date);
    if (slots.length === 0) {
      return {
        text: `Sorry, there are no available slots on ${formatDate(date)}. Would you like to try a different day?`,
        phase: "continue",
      };
    }

    const timeList = slots
      .slice(0, 5)
      .map((s) => formatTime(s.start))
      .join(", ");

    session.phase = "booking_time";
    session.booking.date = date;
    session.booking.time = undefined;

    return {
      text: `Great. On ${formatDate(date)}, I have slots at ${timeList}. Which time works best for you?`,
      phase: "booking",
    };
  }

  if (session.phase === "booking_time") {
    const time = parseTime(transcript);
    if (!time) {
      return {
        text: "I didn't catch the time. Could you say it again, like 2pm or 10am?",
        phase: "continue",
      };
    }

    const date = session.booking.date;
    if (!date) {
      return {
        text: "Sorry, I lost track of the date. Could you start again by saying you'd like to book a call?",
        phase: "continue",
      };
    }

    const result = await bookSlot({
      date,
      time,
      duration: session.booking.duration,
    });

    if (result.success) {
      session.phase = "done";
      const d = new Date(`${date}T${time}Z`);
      const timeFormatted = d.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
      return {
        text: `All set! Your ${session.booking.duration}-minute call has been confirmed for ${formatDate(date)} at ${timeFormatted}. Your confirmation code is ${result.confirmationCode}. A calendar invite is on the way. Thank you for your interest in Deepanshu!`,
        phase: "hangup",
      };
    }

    session.phase = "qa";
    return {
      text: `I wasn't able to book that slot. ${result.error ?? "Please try again later."} Is there anything else I can help with?`,
      phase: "continue",
    };
  }

  if (session.phase === "greeting" || session.phase === "qa" || session.phase === "done") {
    const bookingIntent = detectBookingIntent(transcript);

    if (bookingIntent) {
      session.phase = "booking_date";
      return {
        text: "I'd be happy to help book a call with Deepanshu. What date works for you?",
        phase: "booking",
      };
    }

    const result = await retrieve(transcript);

    if (result.rejected) {
      return {
        text: "I mostly stay focused on my work, projects, and technical background here. Happy to talk about AI systems, products, engineering, or anything from my portfolio.",
        phase: "continue",
      };
    }

    if (result.results.length === 0) {
      return {
        text: "I don't really have enough context around that specifically, but I'm happy to talk about my projects, AI work, engineering experience, or anything from my portfolio.",
        phase: "continue",
      };
    }

    const streamResult = await generateStreamingResponse(transcript, result.results);
    const reply = await streamResult.text;
    const text = reply
      .replace(/#+\s*/g, "")
      .replace(/\n+/g, " ")
      .trim();

    return {
      text,
      phase: "continue",
    };
  }

  return {
    text: "Sorry, I didn't understand that. Could you repeat what you said?",
    phase: "continue",
  };
}
