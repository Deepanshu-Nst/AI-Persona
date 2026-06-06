"use client";

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Search, Bot, User, ArrowRight, Loader2, Calendar, FileText } from "lucide-react";
import clsx from "clsx";
import type { ChatMessage, ChatSource, ChatResponse } from "@/types";
import { BookingForm } from "@/components/booking-form";

const SUGGESTIONS = [
  "What experience do you have?",
  "Tell me about your AI projects",
  "How did you build the reasoning platform?",
  "Can I book a call with you?",
];

export default function AppCanvas() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [bookingAvailableMsgIndex, setBookingAvailableMsgIndex] = useState<number | null>(null);

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
  }, [messages, loading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

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
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setLoading(true);
    setError(null);
    setBookingAvailableMsgIndex(null);

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

      const contentType = res.headers.get("content-type");

      // Handle Instant JSON replies (Greetings, Error fallbacks)
      if (contentType && contentType.includes("application/json")) {
        const data: ChatResponse = await res.json();
        
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toISOString(),
        };

        if (data.sources && data.sources.length > 0) {
          assistantMsg.sources = data.sources;
        }

        setMessages((prev) => [...prev, assistantMsg]);
        if (data.bookingAvailable) {
          setBookingAvailableMsgIndex(messages.length + 1);
        }
        setLoading(false);
        return;
      }

      // Handle Streaming Responses
      const sourcesHeader = res.headers.get("X-Sources");
      const bookingHeader = res.headers.get("X-Booking-Available");
      
      let parsedSources = undefined;
      if (sourcesHeader) {
        try {
          parsedSources = JSON.parse(atob(sourcesHeader));
        } catch {}
      }

      // Add empty assistant message placeholder
      const newAssistantMsgIndex = messages.length + 1;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          sources: parsedSources?.length > 0 ? parsedSources : undefined,
        }
      ]);
      setLoading(false); // Stop loading state, we are streaming now

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let streamText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          streamText += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            updated[newAssistantMsgIndex].content = streamText;
            return updated;
          });
        }
      }

      if (bookingHeader === "true") {
        setBookingAvailableMsgIndex(newAssistantMsgIndex);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950/20 to-[#09090b] pointer-events-none" />

      {/* Main scrollable area */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 sm:px-6 w-full flex flex-col items-center">
        
        {messages.length === 0 ? (
          // Initial Landing State
          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-3xl min-h-[70vh]">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center w-full"
            >
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-200 mb-3">
                Explore Deepanshu's Work
              </h1>
              <p className="text-zinc-500 mb-10 text-[15px] max-w-md mx-auto leading-relaxed">
                A grounded conversational portfolio built to discuss engineering experience, system architecture, and AI development.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto mb-8 text-left">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (i * 0.05) }}
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/20 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all text-sm text-zinc-400 hover:text-zinc-200 group"
                  >
                    <span>{s}</span>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          // Active Chat State
          <div className="w-full max-w-4xl py-12 flex flex-col gap-10">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsx(
                    "flex flex-col w-full",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  {msg.role === "user" ? (
                    <div className="bg-zinc-800/80 text-zinc-200 px-5 py-3 rounded-2xl max-w-[85%] text-[15px] font-medium leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="flex flex-col w-full prose-custom text-[15px] text-zinc-300">
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {msg.sources.map((s: ChatSource, i: number) => (
                            <div key={i} className="group relative">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 cursor-default hover:text-zinc-200 hover:border-zinc-600 transition-colors">
                                {s.label.includes("GitHub") ? <Search size={12} /> : <FileText size={12} />}
                                {s.label.split(">").pop()?.trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {msg.content ? (
                        <div className="leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div className="flex items-center gap-2 text-zinc-500 text-sm py-1 animate-pulse">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0ms]"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:150ms]"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:300ms]"></span>
                          </div>
                          Thinking...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Booking Form attached to Assistant message if needed */}
                  {bookingAvailableMsgIndex === idx && msg.role === "assistant" && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 w-full overflow-hidden"
                    >
                      <div className="border border-zinc-800/60 rounded-2xl bg-zinc-900/30 overflow-hidden">
                        <div className="px-5 py-3 border-b border-zinc-800/60 bg-zinc-900/50 flex items-center gap-2">
                          <Calendar size={16} className="text-zinc-400" />
                          <span className="text-sm font-semibold text-zinc-300">Schedule a call</span>
                        </div>
                        <div className="p-5">
                          <BookingForm onClose={() => setBookingAvailableMsgIndex(null)} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col w-full items-start"
                >
                  <div className="flex items-center gap-2 text-zinc-500 text-sm py-1">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:0ms]"></span>
                      <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce [animation-delay:300ms]"></span>
                    </div>
                    Analyzing experience...
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="underline hover:text-red-300">Dismiss</button>
              </div>
            )}
            
            {/* Bottom padding to ensure last message isn't hidden behind input */}
            <div className="h-10"></div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Input Area */}
      <div className="w-full flex justify-center pb-6 pt-2 px-4 sm:px-6 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent z-10">
        <div className="w-full max-w-3xl relative">
          <form 
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex items-end gap-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-2 focus-within:border-zinc-700 focus-within:bg-zinc-900/80 transition-all shadow-lg backdrop-blur-md"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              className="flex-1 bg-transparent px-3 py-2.5 text-[15px] resize-none focus:outline-none placeholder-zinc-500 font-medium max-h-40 overflow-y-auto min-h-[44px]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-zinc-100 text-zinc-900 rounded-xl hover:bg-white disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors shrink-0 mb-0.5"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[11px] text-zinc-600 font-medium">Grounded AI Persona • Deepanshu Chaudhary</span>
          </div>
        </div>
      </div>
    </div>
  );
}
