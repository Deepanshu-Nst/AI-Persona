export type VoicePhase =
  | "greeting"
  | "qa"
  | "booking_date"
  | "booking_time"
  | "confirming"
  | "done";

export interface BookingState {
  date?: string;
  time?: string;
  duration: number;
}

export interface VoiceSession {
  callSid: string;
  turnCount: number;
  phase: VoicePhase;
  lastQuery: string;
  lastAnswer: string;
  booking: BookingState;
  createdAt: number;
  updatedAt: number;
}

export function createSession(callSid: string): VoiceSession {
  return {
    callSid,
    turnCount: 0,
    phase: "greeting",
    lastQuery: "",
    lastAnswer: "",
    booking: { duration: 30 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function isExpired(session: VoiceSession, ttlMs: number): boolean {
  return Date.now() - session.updatedAt > ttlMs;
}
