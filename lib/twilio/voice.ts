import { createSession, isExpired, type VoiceSession } from "./session";

const SESSION_TTL = 10 * 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

const store = new Map<string, VoiceSession>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [sid, session] of store) {
      if (isExpired(session, SESSION_TTL)) {
        store.delete(sid);
      }
    }
  }, CLEANUP_INTERVAL);
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export function getSession(callSid: string): VoiceSession {
  startCleanup();
  let session = store.get(callSid);
  if (!session) {
    session = createSession(callSid);
    store.set(callSid, session);
  }
  return session;
}

export function updateSession(callSid: string, updates: Partial<VoiceSession>): VoiceSession {
  const session = getSession(callSid);
  Object.assign(session, updates, { updatedAt: Date.now() });
  return session;
}

export function deleteSession(callSid: string): void {
  store.delete(callSid);
}

export function getStoreSize(): number {
  return store.size;
}
