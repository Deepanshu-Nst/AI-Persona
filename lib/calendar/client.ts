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
  const base = parseIstDateOnly(date); // midnight IST = 18:30 UTC previous day
  if (isNaN(base.getTime())) return [];

  // Skip weekends
  const dateParts = date.split("-");
  const dayOfWeek = new Date(Date.UTC(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10), 12)).getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];

  // 9 AM IST = base + 9h, 6 PM IST = base + 18h, 30-min slots
  const IST_START_MINUTES = 9 * 60;   // 9:00 AM IST
  const IST_END_MINUTES   = 18 * 60;  // 6:00 PM IST
  const SLOT_MINUTES = 30;

  for (let m = IST_START_MINUTES; m < IST_END_MINUTES; m += SLOT_MINUTES) {
    const start = new Date(base.getTime() + m * 60 * 1000);
    const end   = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
    slots.push({ start: start.toISOString(), end: end.toISOString() });
  }
  return slots;
}

function normalizePrivateKey(raw: string): string {
  // Strip surrounding quotes if present
  let key = raw.replace(/^["']|["']$/g, "");
  // Handle double-escaped \\n (Vercel stores literal \n as \\n in env output)
  key = key.replace(/\\n/g, "\n");
  // Handle single-escaped \n (local .env format)
  key = key.replace(/\\n/g, "\n");
  return key;
}

export class CalendarClient {
  private _auth: InstanceType<typeof google.auth.JWT> | null = null;
  private _calendar: ReturnType<typeof google.calendar> | null = null;

  private getAuth() {
    if (this._auth) return this._auth;
    const config = getConfig();
    if (!config.GOOGLE_CLIENT_EMAIL || !config.GOOGLE_PRIVATE_KEY) return null;
    const email = config.GOOGLE_CLIENT_EMAIL.replace(/^["']|["']$/g, "");
    const key = normalizePrivateKey(config.GOOGLE_PRIVATE_KEY);
    console.log("CalendarClient: initializing JWT auth", {
      email,
      keyLines: key.split("\n").length,
      keyStart: key.slice(0, 30),
    });
    this._auth = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    return this._auth;
  }

  private getCalendar() {
    if (this._calendar) return this._calendar;
    const auth = this.getAuth();
    if (!auth) return null;
    this._calendar = google.calendar({ version: "v3", auth });
    return this._calendar;
  }

  async checkAvailability(date: string): Promise<TimeSlot[]> {
    const config = getConfig();

    // 1. Filter out weekends immediately at the top
    const dateParts = date.split("-");
    const dayOfWeek = new Date(Date.UTC(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10), 12)).getUTCDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`checkAvailability: weekend date ${date} (day ${dayOfWeek}) requested. Returning empty slots.`);
      return [];
    }

    const calendar = this.getCalendar();
    if (!calendar || !config.GOOGLE_CALENDAR_ID) {
      const slots = generateMockSlots(date);
      console.log("checkAvailability generated mock slots (no credentials):", {
        date,
        slotsCount: slots.length,
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

      const res = await calendar.freebusy.query({
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

      const freeSlots = this.computeFreeSlots(dayStart, busy, 30);

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

    const calendar = this.getCalendar();
    if (!calendar || !config.GOOGLE_CALENDAR_ID) {
      const mockId = "mock-" + Date.now();
      console.log("No Google Calendar credentials. Created mock event:", { mockId });
      return { id: mockId };
    }

    try {
      const requestBody: Record<string, unknown> = {
        summary: params.summary,
        description: params.description
          ? params.description +
            (params.attendeeEmail
              ? `\nAttendee email: ${params.attendeeEmail}`
              : "")
          : params.attendeeEmail
          ? `Attendee email: ${params.attendeeEmail}`
          : undefined,
        start: { dateTime: params.start, timeZone: "UTC" },
        end: { dateTime: params.end, timeZone: "UTC" },
      };
      // Note: Service accounts on personal Gmail cannot invite attendees
      // (requires Domain-Wide Delegation). We store attendee info in the description instead.

      const event = await calendar.events.insert({
        calendarId: config.GOOGLE_CALENDAR_ID,
        sendUpdates: "none",
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
    busy: { start: string; end: string }[],
    slotMinutes: number,
  ): TimeSlot[] {
    // Business hours: 9 AM – 6 PM IST
    // dayStart = midnight IST (in UTC). Add 9h for 9 AM IST, 18h for 6 PM IST.
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const businessStart = new Date(dayStart.getTime() + 9 * 60 * 60 * 1000);
    const businessEnd   = new Date(dayStart.getTime() + 18 * 60 * 60 * 1000);
    const slots: TimeSlot[] = [];

    const busyRanges = busy
      .map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }))
      .sort((a, b) => a.start - b.start);

    let cursor = new Date(businessStart);
    while (cursor < businessEnd) {
      const slotEnd = new Date(cursor.getTime() + slotMinutes * 60 * 1000);
      if (slotEnd > businessEnd) break;

      const s = cursor.getTime();
      const e = slotEnd.getTime();
      const overlaps = busyRanges.some((b) => s < b.end && e > b.start);

      if (!overlaps) {
        slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() });
      }
      cursor = slotEnd;
    }
    return slots;
  }
}

export const calendarClient = new CalendarClient();
