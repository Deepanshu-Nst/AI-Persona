import { NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/twilio/voice";
import { answerWithGather, answerOnly, bookingConfirm, hangup } from "@/lib/twilio/twiml";
import { handleVoiceQuery } from "@/lib/agent/voice-orchestrator";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const callSid = (formData.get("CallSid") as string) ?? "unknown";
    const speechResult = (formData.get("SpeechResult") as string)?.trim();
    const confidence = formData.get("Confidence") as string;

    if (!speechResult) {
      const twiml = answerWithGather("Sorry, I didn't hear anything. Could you please repeat that?");
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const session = getSession(callSid);
    updateSession(callSid, { lastQuery: speechResult, turnCount: session.turnCount + 1 });

    const response = await handleVoiceQuery(speechResult, session);

    updateSession(callSid, { lastAnswer: response.text });

    let twiml: string;

    switch (response.phase) {
      case "hangup": {
        twiml = answerOnly(response.text);
        break;
      }
      case "booking": {
        twiml = answerWithGather(response.text);
        break;
      }
      default: {
        twiml = answerWithGather(response.text);
        break;
      }
    }

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Voice response error:", error);
    const twiml = answerOnly("Sorry, something went wrong. Please try again later.");
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
