"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import type { ChatMessage, ChatSource, ChatResponse } from "@/types";
import { BookingForm } from "@/components/booking-form";

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "👋 Hi! I'm an AI assistant grounded in Deepanshu's resume and public GitHub repositories. Ask me about their background, projects, skills, or any public repo. I can also help you book a call.",
  timestamp: new Date().toISOString(),
};

const SUGGESTIONS = [
  "What is FitCheck?",
  "What experience does Deepanshu have?",
  "Tell me about Aforro Dashboard",
  "What are Deepanshu's skills?",
  "Can I book a call?",
];

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [bookingOpenIndex, setBookingOpenIndex] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setConversationId(crypto.randomUUID());
    }
  }, [conversationId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const data: ChatResponse = await res.json();

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.sources && data.sources.length > 0) {
        const sourceMsg: ChatMessage = {
          role: "assistant",
          content: JSON.stringify(data.sources),
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, sourceMsg]);
      }

      if (data.bookingAvailable) {
        setBookingOpenIndex(messages.length + 2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (text: string) => {
    sendMessage(text);
  };

  const renderSources = (sources: ChatSource[]) => {
    return (
      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-400 font-medium mb-1">Sources</p>
        {sources.map((s, i) => (
          <details key={i} className="text-xs text-gray-500 mb-1">
            <summary className="cursor-pointer hover:text-gray-700">
              {s.label}
            </summary>
            <p className="mt-1 pl-2 border-l-2 border-gray-200 text-gray-400">
              {s.snippet}
            </p>
          </details>
        ))}
      </div>
    );
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    if (msg.role === "user") {
      return (
        <div key={index} className="flex justify-end mb-4">
          <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5">
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            <p className="text-[10px] text-blue-200 mt-1 text-right">
              {formatTimestamp(msg.timestamp)}
            </p>
          </div>
        </div>
      );
    }

    if (index === 0 && messages.length === 1) {
      // Welcome message with suggestions
      return (
        <div key={index} className="flex mb-4">
          <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Try to parse as sources JSON (stored as assistant message with JSON)
    let sources: ChatSource[] | null = null;
    try {
      const parsed = JSON.parse(msg.content);
      if (Array.isArray(parsed) && parsed.length > 0 && "label" in parsed[0]) {
        sources = parsed as ChatSource[];
      }
    } catch {
      // not a sources message
    }

    if (sources) {
      // This is a hidden sources message — already rendered with the previous assistant message
      return null;
    }

    return (
      <div key={index} className="flex mb-4">
        <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {formatTimestamp(msg.timestamp)}
          </p>
        </div>
      </div>
    );
  };

  // Process messages to pair assistant replies with their source messages
  const pairedMessages: { msg: ChatMessage; sources: ChatSource[] | null }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      pairedMessages.push({ msg, sources: null });
      continue;
    }

    // Try to parse the NEXT message as sources
    let sources: ChatSource[] | null = null;
    const nextMsg = messages[i + 1];
    if (nextMsg && nextMsg.role === "assistant") {
      try {
        const parsed = JSON.parse(nextMsg.content);
        if (Array.isArray(parsed) && parsed.length > 0 && "label" in parsed[0]) {
          sources = parsed as ChatSource[];
          i++; // skip the sources message
        }
      } catch {
        // not a sources message
      }
    }

    pairedMessages.push({ msg, sources });
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-sm font-semibold text-gray-800">Scaler AI Persona</h1>
        <p className="text-xs text-gray-400">Grounded assistant for Deepanshu Chaudhary</p>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {pairedMessages.map(({ msg, sources }, index) => (
          <div key={`paired-${index}`}>
            {renderMessage(msg, messages.indexOf(msg))}
            {sources && msg.role === "assistant" && index === pairedMessages.length - 1 && (
              <div className="flex mb-4">
                <div className="max-w-[85%] ml-0">
                  {renderSources(sources)}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex mb-4">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-500 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {bookingOpenIndex !== null && (
          <div className="flex mb-4">
            <div className="max-w-[85%]">
              <BookingForm
                onClose={() => setBookingOpenIndex(null)}
              />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about Deepanshu..."
            rows={1}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-400 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
