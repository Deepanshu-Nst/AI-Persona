import type { RetrievalResult } from "./retrieval-tool";

export async function generateResponse(
  query: string,
  results: RetrievalResult[],
): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const context = results
    .map((r) => `[Source: ${r.source}]\n${r.content}`)
    .join("\n\n");

  const systemPrompt = `You are Deepanshu Chaudhary's AI Persona, responding to a user query in the first person ("I", "me", "my", "we").
You are answering questions about your background, experience, skills, projects, and availability.

Instructions:
1. ALWAYS ground your answer strictly in the provided Context.
2. DO NOT hallucinate, assume, or invent facts.
3. If the Context does not support the answer, politely state: "I don't have that information in my corpus. Please feel free to ask about my experience, skills, projects, or availability."
4. Respond in a friendly, professional, intelligent, and natural conversational tone (as if you are the candidate himself).
5. Do NOT dump raw markdown blocks. Format your response into structured, elegant sentences or short bullet points if needed.

Context:
${context}

User Query: ${query}`;

  if (geminiKey) {
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

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } else {
        console.error("Gemini API returned status:", res.status);
      }
    } catch (err) {
      console.error("Gemini API call failed:", err);
    }
  }

  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.15,
          max_tokens: 350,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } else {
        console.error("OpenAI API returned status:", res.status);
      }
    } catch (err) {
      console.error("OpenAI API call failed:", err);
    }
  }

  // Fallback: Elegant first-person formatting of retrieved content
  if (results.length === 0) {
    return "I don't have that information in my corpus. Please feel free to ask about my experience, skills, projects, or availability.";
  }

  const top = results[0];
  const cleaned = top.content
    .replace(/#+\s*/g, "")
    .replace(/\n+/g, "\n")
    .trim();

  return `Based on my ${top.source}:\n\n${cleaned}`;
}
