"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import type { ChatMessage, ChatSource, ChatResponse } from "@/types";
import { BookingForm } from "@/components/booking-form";

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "👋 Hi! I'm Deepanshu's AI assistant, grounded in my resume and public GitHub repositories. Ask me about my experience, skills, projects, or public code repos. I can also help you check my availability and book a call!",
  timestamp: new Date().toISOString(),
};

const SUGGESTIONS = [
  "What experience do you have?",
  "What are your skills?",
  "Tell me about Aforro Dashboard",
  "What is FitCheck?",
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
      <div className="mt-3.5 pt-2 border-t border-zinc-900/60">
        <details className="group">
          <summary className="list-none flex items-center gap-1.5 cursor-pointer text-[10px] text-zinc-500 hover:text-zinc-400 font-bold uppercase tracking-wider select-none focus:outline-none">
            <span className="transition-transform group-open:rotate-90 text-[8px]">▶</span>
            <span>Grounded Sources ({sources.length})</span>
          </summary>
          <div className="mt-2.5 space-y-1.5 pl-2 animate-[fadeIn_0.15s_ease-out]">
            {sources.map((s, i) => (
              <details key={i} className="group/item text-[11px] text-zinc-400 bg-zinc-950/45 hover:bg-zinc-950/70 border border-zinc-900/80 rounded-xl px-3 py-2 transition-all">
                <summary className="cursor-pointer hover:text-zinc-200 font-semibold list-none flex justify-between items-center select-none focus:outline-none">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/80" />
                    {s.label}
                  </span>
                  <span className="text-[9px] text-zinc-600 group-open/item:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-2 text-zinc-500 pl-2.5 border-l border-indigo-500/25 whitespace-pre-wrap leading-relaxed text-[10.5px]">
                  {s.snippet}
                </div>
              </details>
            ))}
          </div>
        </details>
      </div>
    );
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    if (msg.role === "user") {
      return (
        <div key={index} className="flex justify-end mb-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="max-w-[80%] bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-sm px-4.5 py-3 shadow-[0_4px_12px_rgba(99,102,241,0.15)]">
            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
            <p className="text-[9px] text-indigo-200 mt-1.5 text-right font-medium">
              {formatTimestamp(msg.timestamp)}
            </p>
          </div>
        </div>
      );
    }

    if (index === 0 && messages.length === 1) {
      // Welcome message with suggestions
      return (
        <div key={index} className="flex mb-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="max-w-[85%] glass rounded-2xl rounded-bl-sm p-4 md:p-5 border border-zinc-800 shadow-lg">
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-indigo-500 hover:text-indigo-400 rounded-full px-3.5 py-1.5 transition-all font-medium duration-200"
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
      return null;
    }

    return (
      <div key={index} className="flex mb-4 animate-[fadeIn_0.2s_ease-out]">
        <div className="max-w-[85%] glass rounded-2xl rounded-bl-sm px-4.5 py-3 border border-zinc-800/80 shadow-md">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
          <p className="text-[9px] text-zinc-500 mt-2 font-medium">
            {formatTimestamp(msg.timestamp)}
          </p>
        </div>
      </div>
    );
  };

  const pairedMessages: { msg: ChatMessage; sources: ChatSource[] | null }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      pairedMessages.push({ msg, sources: null });
      continue;
    }

    let sources: ChatSource[] | null = null;
    const nextMsg = messages[i + 1];
    if (nextMsg && nextMsg.role === "assistant") {
      try {
        const parsed = JSON.parse(nextMsg.content);
        if (Array.isArray(parsed) && parsed.length > 0 && "label" in parsed[0]) {
          sources = parsed as ChatSource[];
          i++;
        }
      } catch {
        // not a sources message
      }
    }

    pairedMessages.push({ msg, sources });
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col justify-between grid-bg relative">
      <div className="absolute top-[-10%] right-[-10%] w-[35%] h-[35%] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-purple-600/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 glass px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h1 className="text-sm font-bold text-zinc-100 tracking-wide glow-text flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Scaler AI Persona
          </h1>
          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Grounded Assistant for Deepanshu Chaudhary</p>
        </div>
        <div>
          <button
            onClick={() => setMessages([WELCOME_MESSAGE])}
            className="text-xs border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 bg-zinc-900 px-3 py-1.5 rounded-lg transition-all"
          >
            Clear Chat
          </button>
        </div>
      </header>

      {/* Message List */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-3 z-10">
        {pairedMessages.map(({ msg, sources }, index) => (
          <div key={`paired-${index}`}>
            {renderMessage(msg, messages.indexOf(msg))}
            {sources && msg.role === "assistant" && (
              <div className="flex mb-4">
                <div className="max-w-[85%] w-full">
                  {renderSources(sources)}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex mb-4">
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 border border-zinc-800">
              <div className="flex gap-1.5 items-center py-1">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3 mb-4 flex justify-between items-center">
            <p className="text-xs text-red-400 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-500 hover:text-red-400 underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {bookingOpenIndex !== null && (
          <div className="flex mb-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="max-w-[85%] w-full">
              <BookingForm
                onClose={() => setBookingOpenIndex(null)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-900 glass px-6 py-4 z-10">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about Deepanshu..."
            rows={1}
            className="flex-1 glass-input rounded-xl px-4 py-3 text-sm resize-none focus:outline-none placeholder-zinc-600 font-medium"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(99,102,241,0.2)]"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
