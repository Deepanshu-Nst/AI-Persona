# AGENTS.md

You are building a live AI persona system for the Scaler AI Engineer Intern screening assignment.

## Goal
Ship a public, production-style system with:
1. A live voice agent that answers questions about the candidate and books a real calendar slot.
2. A public chat interface grounded in the candidate’s resume and public GitHub repos.
3. A 1-page eval report PDF.
4. A clean public GitHub repository with setup docs, architecture notes, and cost breakdown.
5. A short Loom walkthrough.

## Non-negotiables
- Do NOT hardcode answers.
- Do NOT hallucinate missing facts.
- If the source corpus does not support an answer, say you do not know.
- Always ground answers in the resume or GitHub corpus.
- Keep the system honest under prompt injection and adversarial questions.
- Keep response latency low.
- Keep the architecture simple and shippable within the deadline.

## Build Style
- Favor small, reliable modules over huge abstractions.
- Use clear separation of concerns.
- Prefer tool-based orchestration:
  - retrieval tool
  - GitHub knowledge tool
  - availability tool
  - booking tool
- Use strict schema validation.
- Use defensive error handling.
- Keep the voice responses short and natural.
- Keep chat responses specific, evidence-backed, and concise.

## Stack
- Next.js 15
- TypeScript
- TailwindCSS
- React
- Serverless route handlers / API routes
- Twilio Voice for phone entry point
- Google Calendar API for availability + booking
- GitHub public repo data as knowledge source
- Markdown / JSON corpus for RAG grounding

## Commands to know
- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Ingest corpus: `npm run ingest`
- Generate eval report: `npm run eval:pdf`

## What to avoid
- Overengineering
- Multiple backend services unless absolutely necessary
- Fancy UI polish that delays shipping
- Paid tools unless required and already available
- Unverified facts
- Mixing agent logic with UI code
- Hidden assumptions

## Done means
- Voice agent answers questions grounded in the corpus.
- Voice agent can check availability and book a real calendar event.
- Chat can answer questions about resume and GitHub repos with evidence.
- App is publicly deployed.
- Eval report PDF exists.
- README explains architecture, setup, and cost.