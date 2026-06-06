import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#09090b] text-[#fafafa] flex flex-col justify-between py-12 px-6 grid-bg">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-600/35 to-purple-600/5 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-rose-500/15 to-indigo-500/5 blur-[100px] animate-pulse-glow" />

      {/* Header */}
      <header className="relative max-w-6xl mx-auto w-full flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-3.5 w-3.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.85)]" />
          <span className="text-sm font-semibold tracking-wider text-zinc-300 uppercase">AI PERSONA SYSTEM</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-4xl mx-auto w-full text-center py-12 z-10 flex-1 flex flex-col justify-center items-center">
        <div className="animate-float">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Scaler AI Persona
          </h1>
        </div>
        <p className="text-base md:text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Grounded conversational intelligence and live voice agent system powered by Deepanshu Chaudhary&apos;s professional background, code repositories, and schedule availability.
        </p>

        {/* Action Button */}
        <div className="mb-16">
          <Link
            href="/chat"
            className="group relative inline-flex items-center justify-center p-0.5 mb-2 overflow-hidden text-sm font-semibold rounded-xl group bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500 hover:text-white dark:text-white focus:ring-2 focus:outline-none focus:ring-purple-800 transition-all duration-300"
          >
            <span className="relative px-8 py-3.5 transition-all ease-in duration-200 bg-zinc-950 rounded-[10px] group-hover:bg-opacity-0 text-white font-medium flex items-center gap-2">
              Launch RAG Chatbot
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-6">
          {/* Card 1 */}
          <div className="glass p-6 rounded-2xl text-left border border-zinc-800 hover:border-zinc-700/60 transition-all">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/25">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-zinc-200 mb-2">Grounded RAG Chat</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Provides direct evidence-backed answers about skills, projects, and history, derived strictly from the candidate resume and GitHub repository metadata.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass p-6 rounded-2xl text-left border border-zinc-800 hover:border-zinc-700/60 transition-all">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 border border-purple-500/25">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-zinc-200 mb-2">Twilio Voice Agent</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Integrates Twilio webhook logic to support inbound calls, handling natural voice Q&A and executing calendar bookings over standard phone calls.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass p-6 rounded-2xl text-left border border-zinc-800 hover:border-zinc-700/60 transition-all">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/25">
              <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-zinc-200 mb-2">Calendar Booking</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Integrates directly with Google Calendar to fetch availability and secure slot reservations.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative max-w-6xl mx-auto w-full text-center z-10 border-t border-zinc-900 pt-6">
        <p className="text-xs text-zinc-500">&copy; 2026 Deepanshu Chaudhary • Scaler Screening Assignment</p>
      </footer>
    </main>
  );
}
