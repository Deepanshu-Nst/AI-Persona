import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/twilio/voice";
import { welcome } from "@/lib/twilio/twiml";

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = (formData.get("CallSid") as string) ?? crypto.randomUUID();

  const session = getSession(callSid);
  updateSession(callSid, { phase: "qa", turnCount: 0 });

  const twiml = welcome();

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}
