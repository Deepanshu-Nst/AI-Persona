import { calendarClient, parseIstDateTime } from "@/lib/calendar/client";

export interface BookingInput {
  date?: string;
  time?: string;
  slotIso?: string; // raw ISO start time from the UI (most reliable)
  duration: number;
  attendeeEmail?: string;
  attendeeName?: string;
  message?: string;
}

export interface BookingResult {
  success: boolean;
  eventId?: string;
  confirmationCode?: string;
  error?: string;
}

export async function bookSlot(input: BookingInput): Promise<BookingResult> {
  console.log("bookSlot called with input:", input);
  try {
    let start: Date;

    if (input.slotIso) {
      // Most reliable path: ISO string sent directly from UI
      start = new Date(input.slotIso);
      console.log("bookSlot using slotIso directly:", input.slotIso);
    } else if (input.date && input.time) {
      // Fallback: parse from IST date + time
      let timeStr = input.time.trim();
      if (timeStr.split(":").length === 2) {
        timeStr += ":00";
      }
      start = parseIstDateTime(input.date, timeStr);
      console.log("bookSlot parsed from date+time:", { date: input.date, time: timeStr });
    } else {
      return { success: false, error: "Either slotIso or date+time must be provided" };
    }

    if (isNaN(start.getTime())) {
      console.error("bookSlot: invalid date/time conversion result", input);
      return { success: false, error: "Invalid date or time" };
    }

    const end = new Date(start.getTime() + input.duration * 60 * 1000);

    console.log("bookSlot parsed ISO intervals:", {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const event = await calendarClient.createEvent({
      summary: `Call with Deepanshu${input.attendeeName ? ` (${input.attendeeName})` : ""}`,
      start: start.toISOString(),
      end: end.toISOString(),
      description: [
        input.attendeeEmail
          ? `Attendee: ${input.attendeeName ?? "Unknown"} (${input.attendeeEmail})`
          : null,
        input.message ? `Message: ${input.message}` : null,
      ]
        .filter(Boolean)
        .join("\n") || undefined,
      attendeeEmail: input.attendeeEmail,
      attendeeName: input.attendeeName,
    });

    const code = event.id.startsWith("mock-")
      ? event.id.replace("mock-", "CONF-")
      : `CONF-${event.id.slice(0, 8).toUpperCase()}`;

    console.log("bookSlot success, confirmation code:", code);

    return {
      success: true,
      eventId: event.id,
      confirmationCode: code,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("bookSlot exception:", err);
    return { success: false, error: message };
  }
}
