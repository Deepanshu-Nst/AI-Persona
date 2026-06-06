"use client";

import { useState, type FormEvent } from "react";

export interface BookingFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function BookingForm({ onClose, onSuccess }: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  const reset = () => {
    setName("");
    setEmail("");
    setDate("");
    setMessage("");
    setSubmitting(false);
    setStatus("idle");
    setErrorText("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !date.trim()) {
      setErrorText("Name, email, and date are required.");
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
          date,
          message,
        }),
      });

      if (!res.ok) {
        throw new Error("Booking failed");
      }

      setStatus("success");
      onSuccess?.();
    } catch {
      setErrorText("Something went wrong. Please try again.");
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "success") {
    return (
      <div className="border border-green-300 bg-green-50 rounded-lg p-4 mt-3">
        <p className="text-green-800 text-sm font-medium">
          Your booking request has been received. We will confirm shortly.
        </p>
        <button
          onClick={() => { reset(); onClose(); }}
          className="mt-2 text-xs text-green-700 underline"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-lg p-4 mt-3 space-y-3 bg-gray-50">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Book a Call
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name *</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email *</label>
          <input
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Preferred Date *</label>
        <input
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="e.g. 2026-06-10"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Message (optional)</label>
        <textarea
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything you'd like to discuss..."
          rows={2}
        />
      </div>

      {errorText && (
        <p className="text-red-600 text-xs">{errorText}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Request Booking"}
        </button>
        <button
          type="button"
          onClick={() => { reset(); onClose(); }}
          className="px-4 py-1.5 text-sm text-gray-500 rounded hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
