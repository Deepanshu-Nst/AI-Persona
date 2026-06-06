export interface TimeSlot {
  start: string;
  end: string;
}

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

export interface CalendarConfig {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
}
