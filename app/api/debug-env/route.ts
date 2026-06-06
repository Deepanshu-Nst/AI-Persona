import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const email = process.env.GOOGLE_CLIENT_EMAIL ?? "";
  const calId = process.env.GOOGLE_CALENDAR_ID ?? "";

  // Step by step normalization
  const step1 = rawKey.replace(/^["']|["']$/g, "");
  const step2 = step1.replace(/\\\\n/g, "\n"); // double-escaped
  const step3 = step2.replace(/\\n/g, "\n"); // single-escaped

  const result: Record<string, unknown> = {
    email,
    calId,
    rawKeyLength: rawKey.length,
    rawKeyFirst60: rawKey.slice(0, 60),
    step1First60: step1.slice(0, 60),
    step2Lines: step2.split("\n").length,
    step3Lines: step3.split("\n").length,
    step3First60: step3.slice(0, 60),
  };

  if (!email || !rawKey || !calId) {
    return NextResponse.json({ ...result, error: "Missing credentials" });
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: step3,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });

    // Try a simple freebusy query
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: tomorrow.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: calId }],
      },
    });

    return NextResponse.json({
      ...result,
      calendarQuerySuccess: true,
      busySlots: res.data.calendars?.[calId]?.busy ?? [],
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ...result,
      calendarQuerySuccess: false,
      error: errMsg,
    });
  }
}
