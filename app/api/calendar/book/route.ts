import { NextRequest, NextResponse } from "next/server";
import { bookSlot } from "@/lib/agent/booking-tool";
import { BookingRequestSchema } from "@/lib/calendar/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await bookSlot({
      date: parsed.data.date,
      time: parsed.data.time,
      duration: parsed.data.duration,
      attendeeEmail: parsed.data.attendeeEmail,
      attendeeName: parsed.data.attendeeName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Booking failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      confirmationCode: result.confirmationCode,
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { error: "Failed to book slot" },
      { status: 500 },
    );
  }
}
