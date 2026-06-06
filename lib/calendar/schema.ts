import { z } from "zod";

export const normalizeDate = (val: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const parts = val.split(/[-/]/);
  if (parts.length === 3) {
    let day = "";
    let month = "";
    let year = "";
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, "0");
      day = parts[2].padStart(2, "0");
    } else if (parts[2].length === 4) {
      day = parts[0].padStart(2, "0");
      month = parts[1].padStart(2, "0");
      year = parts[2];
    }
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  }
  return val;
};

export const TimeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const BookingRequestSchema = z.object({
  date: z.string().transform(normalizeDate),
  time: z.string(),
  duration: z.number().positive().default(30),
  attendeeEmail: z.string().email().optional(),
  attendeeName: z.string().optional(),
});

export const AvailabilityRequestSchema = z.object({
  date: z.string().transform(normalizeDate),
});

export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type BookingRequest = z.infer<typeof BookingRequestSchema>;
export type AvailabilityRequest = z.infer<typeof AvailabilityRequestSchema>;
