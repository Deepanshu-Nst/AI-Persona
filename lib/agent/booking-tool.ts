import { calendarClient } from "@/lib/calendar/client";

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
  try {
    const start = new Date(`${input.date}T${input.time}Z`);
    if (isNaN(start.getTime())) {
      return { success: false, error: "Invalid date or time" };
    }

    const end = new Date(start.getTime() + input.duration * 60 * 1000);

    const event = await calendarClient.createEvent({
      summary: `Call with Deepanshu${input.attendeeName ? ` (${input.attendeeName})` : ""}`,
      start: start.toISOString(),
      end: end.toISOString(),
      description: input.attendeeEmail
        ? `Attendee: ${input.attendeeName ?? "Unknown"} (${input.attendeeEmail})`
        : undefined,
    });

    const code = event.id.startsWith("mock-")
      ? event.id.replace("mock-", "CONF-")
      : `CONF-${event.id.slice(0, 8).toUpperCase()}`;

    return {
      success: true,
      eventId: event.id,
      confirmationCode: code,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
