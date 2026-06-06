import { calendarClient } from "@/lib/calendar/client";

export interface TimeSlot {
  start: string;
  end: string;
}

export async function getAvailability(date: string): Promise<TimeSlot[]> {
  try {
    return await calendarClient.checkAvailability(date);
  } catch {
    return [];
  }
}
