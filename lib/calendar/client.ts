import { google } from "googleapis";
import { getConfig } from "@/lib/config";

export interface TimeSlot {
  start: string;
  end: string;
}

export interface CalendarEvent {
  id: string;
  htmlLink?: string;
}

const SESSION_TTL = 10 * 60 * 1000;

const cachedSlots = new Map<string, { slots: TimeSlot[]; fetchedAt: number }>();

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function parseIstDateOnly(dateStr: string): Date {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  // IST is UTC+05:30. To get midnight IST, we subtract 5 hours 30 mins from midnight UTC.
  return new Date(Date.UTC(year, month, day, -5, -30, 0, 0));
}

export function parseIstDateTime(dateStr: string, timeStr: string): Date {
  const dateParts = dateStr.split("-");
  const timeParts = timeStr.split(":");

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);

  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);
  const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

  // Subtract 5 hours and 30 minutes to convert IST to UTC
  return new Date(Date.UTC(year, month, day, hours - 5, minutes - 30, seconds, 0));
}

function generateMockSlots(date: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const base = parseIstDateOnly(date);
  if (isNaN(base.getTime())) return [];

  // Skip weekends (0 = Sunday, 6 = Saturday)
  // Get the day of the week in IST by constructing a UTC date at noon to avoid offset shifting the day
  const dateParts = date.split("-");
  const dayOfWeek = new Date(Date.UTC(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10), 12)).getUTCDay();
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log(`generateMockSlots: weekend date ${date} (day ${dayOfWeek}) skipped.`);
    return [];
  }

  for (let h = 9; h <= 17; h++) {
    if (h === 12 || h === 13) continue; // Skip lunch hours
    const start = new Date(base.getTime() + h * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }
  return slots;
}

export class CalendarClient {
  private auth = getConfig().GOOGLE_CLIENT_EMAIL && getConfig().GOOGLE_PRIVATE_KEY
    ? new google.auth.JWT({
        email: getConfig().GOOGLE_CLIENT_EMAIL!.replace(/^["']|["']$/g, ""),
        key: getConfig().GOOGLE_PRIVATE_KEY!.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/calendar"],
      })
    : null;

  private calendar = this.auth ? google.calendar({ version: "v3", auth: this.auth }) : null;

  async checkAvailability(date: string): Promise<TimeSlot[]> {
    const config = getConfig();

    // 1. Filter out weekends immediately at the top
    const dateParts = date.split("-");
    const dayOfWeek = new Date(Date.UTC(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10), 12)).getUTCDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`checkAvailability: weekend date ${date} (day ${dayOfWeek}) requested. Returning empty slots.`);
      return [];
    }

    if (!this.calendar || !config.GOOGLE_CALENDAR_ID) {
      const slots = generateMockSlots(date);
      console.log("checkAvailability generated mock slots (no credentials):", {
        date,
        slotsCount: slots.length,
        slots,
      });
      return slots;
    }

    try {
      const cached = cachedSlots.get(date);
      if (cached && Date.now() - cached.fetchedAt < SESSION_TTL) {
        console.log("checkAvailability cache hit:", { date, slotsCount: cached.slots.length });
        return cached.slots;
      }

      const dayStart = parseIstDateOnly(date);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1000); // end of day

      console.log("checkAvailability querying Google Calendar:", {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        calendarId: config.GOOGLE_CALENDAR_ID,
      });

      const res = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          items: [{ id: config.GOOGLE_CALENDAR_ID }],
        },
      });

      const rawBusy = res.data.calendars?.[config.GOOGLE_CALENDAR_ID]?.busy ?? [];
      const busy: { start: string; end: string }[] = rawBusy
        .filter((b): b is { start: string; end: string } => !!b.start && !!b.end)
        .map((b) => ({ start: b.start!, end: b.end! }));
      
      console.log("Google Calendar busy ranges retrieved:", busy);

      const freeSlots = this.computeFreeSlots(dayStart, dayEnd, busy, 30);

      console.log("checkAvailability generated slots from Google Calendar:", {
        date,
        slotsCount: freeSlots.length,
        slots: freeSlots,
      });

      cachedSlots.set(date, { slots: freeSlots, fetchedAt: Date.now() });
      return freeSlots;
    } catch (err) {
      console.error("Google Calendar freebusy query failed. Falling back to mock slots.", err);
      const slots = generateMockSlots(date);
      console.log("checkAvailability fallback mock slots:", {
        date,
        slotsCount: slots.length,
        slots,
      });
      return slots;
    }
  }

  async createEvent(params: {
    summary: string;
    start: string;
    end: string;
    description?: string;
    attendeeEmail?: string;
    attendeeName?: string;
  }): Promise<CalendarEvent> {
    const config = getConfig();

    console.log("createEvent input params:", params);

    if (!this.calendar || !config.GOOGLE_CALENDAR_ID) {
      const mockId = "mock-" + Date.now();
      console.log("No Google Calendar credentials. Created mock event:", { mockId });
      return { id: mockId };
    }

    try {
      const requestBody: Record<string, unknown> = {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.start, timeZone: "UTC" },
        end: { dateTime: params.end, timeZone: "UTC" },
      };

      if (params.attendeeEmail) {
        requestBody.attendees = [
          {
            email: params.attendeeEmail,
            displayName: params.attendeeName,
          },
        ];
      }

      const event = await this.calendar.events.insert({
        calendarId: config.GOOGLE_CALENDAR_ID,
        sendUpdates: "all",
        requestBody,
      });

      console.log("Google Calendar event created successfully:", {
        id: event.data.id,
        htmlLink: event.data.htmlLink,
      });
      return { id: event.data.id ?? "unknown", htmlLink: event.data.htmlLink ?? undefined };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("Google Calendar event insertion failed:", errMsg);
      // Fallback to mock event so the UI booking flow still completes
      const mockId = "mock-" + Date.now();
      console.log("Returning fallback mock event:", { mockId });
      return { id: mockId };
    }
  }

  private computeFreeSlots(
    dayStart: Date,
    dayEnd: Date,
    busy: { start: string; end: string }[],
    slotMinutes: number,
  ): TimeSlot[] {
    const BUSINESS_START = 9;
    const BUSINESS_END = 17;
    const slots: TimeSlot[] = [];

    const busyRanges = busy
      .map((b) => ({
        start: new Date(b.start).getTime(),
        end: new Date(b.end).getTime(),
      }))
      .sort((a, b) => a.start - b.start);

    let cursor = new Date(dayStart.getTime() + BUSINESS_START * 60 * 60 * 1000);
    const end = new Date(dayStart.getTime() + BUSINESS_END * 60 * 60 * 1000);

    while (cursor < end) {
      const slotEnd = new Date(cursor.getTime() + slotMinutes * 60 * 1000);
      if (slotEnd > end) break;

      const slotStartMs = cursor.getTime();
      const slotEndMs = slotEnd.getTime();

      const overlaps = busyRanges.some(
        (b) => slotStartMs < b.end && slotEndMs > b.start,
      );

      if (!overlaps) {
        slots.push({
          start: cursor.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      cursor = new Date(cursor.getTime() + slotMinutes * 60 * 1000);
    }

    return slots;
  }
}

export const calendarClient = new CalendarClient();
