import { calendarClient, parseIstDateTime } from "@/lib/calendar/client";

export interface BookingInput {
  date: string;
  time: string;
  duration: number;
  attendeeEmail?: string;
  attendeeName?: string;
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
    let timeStr = input.time.trim();
    if (timeStr.split(":").length === 2) {
      timeStr += ":00";
    }

    const start = parseIstDateTime(input.date, timeStr);
    if (isNaN(start.getTime())) {
      console.error("bookSlot: invalid date/time conversion result", {
        date: input.date,
        time: timeStr,
      });
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
      description: input.attendeeEmail
        ? `Attendee: ${input.attendeeName ?? "Unknown"} (${input.attendeeEmail})`
        : undefined,
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
