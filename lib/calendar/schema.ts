import { z } from "zod";

export const TimeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const BookingRequestSchema = z.object({
  date: z.string(),
  time: z.string(),
  duration: z.number().positive().default(30),
  attendeeEmail: z.string().email().optional(),
  attendeeName: z.string().optional(),
});

export const AvailabilityRequestSchema = z.object({
  date: z.string(),
});

export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type BookingRequest = z.infer<typeof BookingRequestSchema>;
export type AvailabilityRequest = z.infer<typeof AvailabilityRequestSchema>;
