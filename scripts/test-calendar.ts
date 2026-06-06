import { calendarClient } from "../lib/calendar/client";
import { getConfig } from "../lib/config";
import { bookSlot } from "../lib/agent/booking-tool";

async function main() {
  console.log("Config ID: ", getConfig().GOOGLE_CALENDAR_ID);
  console.log("Config EMAIL: ", getConfig().GOOGLE_CLIENT_EMAIL);
  
  const res = await bookSlot({
    date: "2026-06-16",
    time: "10:00:00",
    duration: 30,
    attendeeName: "Test User",
    attendeeEmail: "test@example.com"
  });
  console.log("Result:", res);
}

main().catch(console.error);
