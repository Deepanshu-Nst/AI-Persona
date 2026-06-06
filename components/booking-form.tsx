"use client";

import { useState, type FormEvent, useEffect } from "react";

export interface BookingFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

function normalizeDate(val: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const parts = val.split(/[-/]/);
  if (parts.length === 3) {
    let day = "";
    let month = "";
    let year = "";
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1].padStart(2, "0");
      day = parts[2].padStart(2, "0");
    } else if (parts[2].length === 4) {
      day = parts[0].padStart(2, "0");
      month = parts[1].padStart(2, "0");
      year = parts[2];
    }
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  }
  return val;
}

export function BookingForm({ onClose, onSuccess }: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      const normalizedDate = normalizeDate(date);
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(normalizedDate)) {
        setAvailableSlots([]);
        setSelectedTime("");
        setHasFetched(false);
        return;
      }

      setLoadingSlots(true);
      setHasFetched(false);
      setErrorText("");
      try {
        console.log(`BookingForm: fetching slots for date: ${normalizedDate}`);
        const res = await fetch(`/api/calendar/availability?date=${normalizedDate}`);
        if (!res.ok) {
          throw new Error("Failed to load slots");
        }
        const data = await res.json();
        const slots = data.slots || [];
        console.log("BookingForm: retrieved available slots from API:", slots);
        setAvailableSlots(slots);
        
        // Auto-select first available slot
        if (slots.length > 0) {
          const startDate = new Date(slots[0].start);
          const pad = (n: number) => String(n).padStart(2, "0");
          const timeValue = `${pad(startDate.getUTCHours())}:${pad(startDate.getUTCMinutes())}:${pad(startDate.getUTCSeconds())}`;
          setSelectedTime(timeValue);
        } else {
          setSelectedTime("");
        }
        setHasFetched(true);
      } catch (err) {
        console.error("BookingForm error fetching slots:", err);
        setErrorText("Could not fetch available slots for this date.");
        setAvailableSlots([]);
        setHasFetched(true);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [date]);

  const reset = () => {
    setName("");
    setEmail("");
    setDate("");
    setMessage("");
    setSelectedTime("");
    setAvailableSlots([]);
    setSubmitting(false);
    setStatus("idle");
    setErrorText("");
    setHasFetched(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedDate = normalizeDate(date);
    console.log("BookingForm: submitting slot booking request:", {
      name,
      email,
      date: normalizedDate,
      time: selectedTime,
      message,
    });
    if (!name.trim() || !email.trim() || !normalizedDate.trim() || !selectedTime.trim()) {
      setErrorText("Name, email, date, and time slot are required.");
      return;
    }
    setSubmitting(true);
    setErrorText("");

    try {
      const res = await fetch("/api/calendar/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeName: name,
          attendeeEmail: email,
          date: normalizedDate,
          time: selectedTime,
          message,
        }),
      });

      if (!res.ok) {
        throw new Error("Booking failed");
      }

      console.log("BookingForm: booking request confirmed by API");
      setStatus("success");
      onSuccess?.();
    } catch (err) {
      console.error("BookingForm: booking submission failed:", err);
      setErrorText("Something went wrong. Please try again.");
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "success") {
    return (
      <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-4.5 mt-3 shadow-lg">
        <p className="text-green-400 text-sm font-semibold">
          🎉 Your booking request has been received and confirmed.
        </p>
        <button
          onClick={() => { reset(); onClose(); }}
          className="mt-3 text-xs text-green-500 hover:text-green-400 font-semibold underline"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 mt-3 space-y-4 border border-zinc-800 text-left shadow-lg">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        📅 Request a Call Slot
      </p>

      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs text-zinc-400 font-semibold mb-1">Name *</label>
          <input
            className="w-full glass-input rounded-xl px-3 py-2 text-sm focus:outline-none placeholder-zinc-600"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 font-semibold mb-1">Email *</label>
          <input
            className="w-full glass-input rounded-xl px-3 py-2 text-sm focus:outline-none placeholder-zinc-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 font-semibold mb-1">Preferred Date *</label>
        <input
          type="date"
          className="w-full glass-input rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {date && (
        <div className="space-y-1.5">
          <label className="block text-xs text-zinc-400 font-semibold">Select Time *</label>
          {loadingSlots ? (
            <p className="text-xs text-zinc-500 animate-pulse font-medium">Loading slots...</p>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot, i) => {
                const startDate = new Date(slot.start);
                const pad = (n: number) => String(n).padStart(2, "0");
                const timeValue = `${pad(startDate.getUTCHours())}:${pad(startDate.getUTCMinutes())}:${pad(startDate.getUTCSeconds())}`;
                const timeLabel = startDate.toLocaleTimeString("en-US", {
                  timeZone: "UTC",
                  hour: "numeric",
                  minute: "2-digit",
                });
                const isSelected = selectedTime === timeValue;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedTime(timeValue)}
                    className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white shadow-md"
                        : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                    }`}
                  >
                    {timeLabel}
                  </button>
                );
              })}
            </div>
          ) : hasFetched ? (
            <p className="text-xs text-red-400 font-medium">No slots available for this date.</p>
          ) : null}
        </div>
      )}

      <div>
        <label className="block text-xs text-zinc-400 font-semibold mb-1">Message (optional)</label>
        <textarea
          className="w-full glass-input rounded-xl px-3 py-2 text-sm focus:outline-none resize-none placeholder-zinc-600"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything you'd like to discuss..."
          rows={2}
        />
      </div>

      {errorText && (
        <p className="text-red-400 text-xs font-medium">{errorText}</p>
      )}

      <div className="flex gap-2.5 pt-2">
        <button
          type="submit"
          disabled={submitting || !name.trim() || !email.trim() || !date.trim() || !selectedTime}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
        >
          {submitting ? "Submitting..." : "Confirm Slot"}
        </button>
        <button
          type="button"
          onClick={() => { reset(); onClose(); }}
          className="px-4 py-2 text-xs font-semibold text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 bg-zinc-900 rounded-xl transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
