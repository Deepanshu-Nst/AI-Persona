import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/lib/agent/orchestrator";
import type { ChatRequest, ChatResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }

    const conversationId = body.conversationId ?? crypto.randomUUID();

    const response = await orchestrate({
      query: body.message,
      conversationId,
      source: "chat",
    });

    const sources = (response.metadata?.sourceSnippets as { label: string; snippet: string }[]) ?? [];
    const bookingAvailable = (response.metadata?.bookingAvailable as boolean) ?? false;

    if (response.stream) {
      const headers = new Headers();
      // Only send labels to keep header size small, and encode to base64 to avoid HTTP header unicode crashes
      const safeSources = sources.map(s => ({ label: s.label }));
      const encodedSources = Buffer.from(JSON.stringify(safeSources)).toString('base64');
      headers.set("X-Sources", encodedSources);
      headers.set("X-Booking-Available", bookingAvailable ? "true" : "false");

      return new Response(response.stream.textStream, { headers });
    } else {
      // For instant replies like greetings
      const chatResponse: ChatResponse = {
        reply: response.answer,
        sources,
        bookingAvailable,
        conversationId,
      };
      return NextResponse.json(chatResponse);
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
