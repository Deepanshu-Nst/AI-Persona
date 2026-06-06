# Loom Walkthrough Script: Deepanshu's AI Persona

**Target Length:** ~4 Minutes
**Tone:** Confident, concise, engineer-to-engineer, professional.
**Visuals:** 100% focused on the Live Web UI and Voice Demo. No codebase screens.

---

### 1. Introduction & The Canvas UI (0:00 - 0:45)

*(Screen: Show the live web UI of the AI Persona on your screen, looking clean and minimal. Move your mouse slightly to highlight the layout.)*

**You:** 
"Hi team, I’m Deepanshu Chaudhary, and this is my submission for the Scaler AI Engineer Intern role. Instead of just sending a PDF resume, I built a complete, live AI Persona system that acts as my proxy. 

As you can see, I’ve designed a premium, 'Conversation Canvas' interface inspired by platforms like Perplexity and Linear. Behind the scenes, this is a Next.js 15 app deployed on Vercel. It features both this public chat interface and a Twilio-powered voice agent, both strictly grounded in my real resume and GitHub repositories."

### 2. Live Demo: Chat & Architecture (0:45 - 1:30)

*(Screen: Type a query into the chat box like: "Tell me about your experience building AI products at AdvaitAI." Hit enter.)*

**You:** 
"Let’s see it in action. When I ask it about my AI experience...
*(Point out the 'Thinking...' animation and then the streaming text)*
You’ll notice two things instantly. First, the UI streams the response back seamlessly using the Vercel AI SDK. Second, look at these interactive source pills at the top of the message. 

The orchestration layer hits a custom Retrieval Tool that pulls relevant markdown chunks from my local corpus. It never hallucinates facts because it is strictly bounded by this retrieved context, maintaining total honesty. If you ask it a trap question, it will safely tell you it doesn't have the context."

### 3. Explaining the Hard Problem In Action (1:30 - 2:15)

*(Screen: Ask a follow-up question like: "What stack did you use for the daily reasoning platform?")*

**You:**
"One of the hardest problems I encountered while building this was **maintaining conversational memory without blowing up the context window** or causing the LLM to sound like a rambling robot. 

*(Highlight the concise, founder-like response the AI just generated)*
Notice how concise and natural the response is. To achieve this, I built a custom context-preparation layer before the LLM synthesis. Even if it retrieves a dozen overlapping project descriptions, the system actively deduplicates repository data, strips out noisy markdown metadata, and enforces strict length controls. If you ask a technical question, it gives you a dense architectural breakdown. If you ask a behavioral question, it gives you a short, professional paragraph."

### 4. Live Demo: Seamless Booking (2:15 - 3:00)

*(Screen: In the chat, type: "I want to book a call with you." or click the 'Can I book a call with you?' suggestion)*

**You:**
"Now let's look at the scheduling capability. If a recruiter wants to chat, they can just ask. 
*(Show the inline booking card appearing smoothly in the chat flow)*
The system recognizes the intent and surfaces an inline booking tool. This directly hits the Google Calendar API in real-time. It safely handles IST to UTC timezone conversions, cross-references my busy blocks, and generates accurate 30-minute free slots. 

When you submit this, it inserts the event into my live calendar, generates a Google Meet link, and emails an invite to both parties."

### 5. Voice Agent Demo & Wrap-up (3:00 - 4:00)

*(Screen: Keep the UI on screen, but pick up your phone and dial the Twilio number on speakerphone.)*

**You:**
"Finally, everything I just showed you works perfectly over the phone as well. Let’s do a quick live call.

*(Live Phone Audio)*
* **Twilio:** "Hi, I'm Deepanshu's AI assistant. How can I help you?"
* **You:** "Hi, I'd like to book a meeting for tomorrow."
* **Twilio:** "Great. On [Date], I have slots at 10 AM, 11 AM... Which works best?"
* **You:** "10 AM is perfect."
* **Twilio:** "All set! Your call is confirmed."
*(Hang up)*

**You:**
"And just like that, the event is on my calendar. The setup docs, architecture notes, and my 1-page evaluation report are all in the GitHub repository. Thanks for watching, and I’m looking forward to your feedback!"
