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

function generateMockSlots(date: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const base = new Date(date);
  if (isNaN(base.getTime())) return [];

  for (let h = 9; h <= 17; h++) {
    if (h === 12 || h === 13) continue;
    const start = new Date(base);
    start.setHours(h, 0, 0, 0);
    const end = new Date(base);
    end.setHours(h, 30, 0, 0);
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
        email: getConfig().GOOGLE_CLIENT_EMAIL,
        key: getConfig().GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/calendar"],
      })
    : null;

  private calendar = this.auth ? google.calendar({ version: "v3", auth: this.auth }) : null;

  async checkAvailability(date: string): Promise<TimeSlot[]> {
    const config = getConfig();

    if (!this.calendar || !config.GOOGLE_CALENDAR_ID) {
      return generateMockSlots(date);
    }

    const cached = cachedSlots.get(date);
    if (cached && Date.now() - cached.fetchedAt < SESSION_TTL) {
      return cached.slots;
    }

    const dayStart = new Date(date + "T00:00:00Z");
    const dayEnd = new Date(date + "T23:59:59Z");

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
    const freeSlots = this.computeFreeSlots(dayStart, dayEnd, busy, 30);

    cachedSlots.set(date, { slots: freeSlots, fetchedAt: Date.now() });
    return freeSlots;
  }

  async createEvent(params: {
    summary: string;
    start: string;
    end: string;
    description?: string;
  }): Promise<CalendarEvent> {
    const config = getConfig();

    if (!this.calendar || !config.GOOGLE_CALENDAR_ID) {
      const mockId = "mock-" + Date.now();
      return { id: mockId };
    }

    const event = await this.calendar.events.insert({
      calendarId: config.GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.start, timeZone: "UTC" },
        end: { dateTime: params.end, timeZone: "UTC" },
      },
    });

    return { id: event.data.id ?? "unknown", htmlLink: event.data.htmlLink ?? undefined };
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

    let cursor = new Date(dayStart);
    cursor.setHours(BUSINESS_START, 0, 0, 0);
    const end = new Date(dayStart);
    end.setHours(BUSINESS_END, 0, 0, 0);

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
