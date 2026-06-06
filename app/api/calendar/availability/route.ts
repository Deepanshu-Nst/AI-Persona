import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/agent/availability-tool";
import { AvailabilityRequestSchema } from "@/lib/calendar/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AvailabilityRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const slots = await getAvailability(parsed.data.date);

    return NextResponse.json({ date: parsed.data.date, slots });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 },
    );
  }
}
