import { retrieve } from "../lib/agent/retrieval-tool";
import { prepareContextForLLM } from "../lib/agent/llm";

async function main() {
  const query = "What experience do you have?";
  const result = await retrieve(query);
  const context = prepareContextForLLM(result.results);

  const systemPrompt = `You are Deepanshu Chaudhary himself (acting as his first-person AI Persona). Answer the user's query in the first person ("I", "me", "my").

Role & Tone Guidelines:
- You are a sharp AI engineer and full-stack developer. Speak with startup-founder energy: technically precise, confident, professional, and recruiter-friendly.
- Do NOT sound like a robotic customer support chatbot.
- Respond conversationally and naturally, as if in a real conversation or interview.
- Never dump raw markdown headings, metadata blocks (like "Stars: 0", "Language: Python"), or internal source headers (like "Based on Resume > EXPERIENCES").
- Integrate details from my projects, repository metadata, and experience smoothly (e.g., weave in technologies and stars naturally instead of listing them as raw key-value lines).
- Synthesize information across my resume and GitHub repositories when relevant to give cohesive responses.

Grounding Guidelines:
- You must ground your answer strictly in the provided Context.
- Do NOT hallucinate or assume facts that are not present. If the Context does not contain the answer, politely state: "I don't have that information in my corpus. Please feel free to ask about my experience, skills, projects, or availability."
- Do not mention the word "Context", "corpus", "chunks", or internal system terms to the user. Speak naturally as if from your own memory.

Context:
${context}

User Query: ${query}`;

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    console.log("Calling Groq API...");
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.15,
          max_tokens: 350,
        }),
      });
      console.log("Groq status:", res.status);
      const text = await res.text();
      console.log("Groq response text:", text);
    } catch (e) {
      console.error("Groq error:", e);
    }
  } else {
    console.log("No GROQ_API_KEY in process.env");
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    console.log("Calling Gemini API...");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.15,
              maxOutputTokens: 350,
            },
          }),
        }
      );
      console.log("Gemini status:", res.status);
      const text = await res.text();
      console.log("Gemini response text:", text);
    } catch (e) {
      console.error("Gemini error:", e);
    }
  }
}

main().catch(console.error);
