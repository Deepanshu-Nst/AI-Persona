import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/agent/availability-tool";
import { AvailabilityRequestSchema } from "@/lib/calendar/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return await handleAvailability(body);
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    return await handleAvailability({ date });
  } catch (error) {
    console.error("Availability GET error:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 },
    );
  }
}

async function handleAvailability(body: unknown) {
  const parsed = AvailabilityRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const slots = await getAvailability(parsed.data.date);
  console.log({
    requestedDate: parsed.data.date,
    generatedSlots: slots,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  return NextResponse.json({ date: parsed.data.date, slots });
}
