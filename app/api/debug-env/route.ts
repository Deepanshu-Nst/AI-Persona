import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const email = process.env.GOOGLE_CLIENT_EMAIL ?? "";
  const calId = process.env.GOOGLE_CALENDAR_ID ?? "";
  const groq = process.env.GROQ_API_KEY ?? "";

  return NextResponse.json({
    GOOGLE_CLIENT_EMAIL: email ? `${email.slice(0, 20)}...` : "MISSING",
    GOOGLE_CALENDAR_ID: calId ? `${calId.slice(0, 20)}...` : "MISSING",
    GOOGLE_PRIVATE_KEY_length: key.length,
    GOOGLE_PRIVATE_KEY_start: key ? key.slice(0, 30) : "MISSING",
    GROQ_API_KEY: groq ? `${groq.slice(0, 10)}...` : "MISSING",
  });
}
