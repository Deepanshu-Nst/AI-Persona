import type { RetrievalResult } from "./retrieval-tool";

export function prepareContextForLLM(results: RetrievalResult[]): string {
  if (results.length === 0) return "";

  // 1. Deduplicate by source label
  const seenSources = new Set<string>();
  const uniqueResults: RetrievalResult[] = [];
  for (const r of results) {
    if (!seenSources.has(r.source)) {
      seenSources.add(r.source);
      uniqueResults.push(r);
    }
  }

  // 2. Group by type (Resume vs GitHub Repos)
  const resumeSections: { heading: string; content: string }[] = [];
  const repoSections: { name: string; content: string }[] = [];

  for (const r of uniqueResults) {
    if (r.source.startsWith("Resume > ")) {
      const heading = r.source.replace("Resume > ", "").trim();
      let cleanContent = r.content;
      const headingPrefix = `# ${heading}`;
      if (cleanContent.startsWith(headingPrefix)) {
        cleanContent = cleanContent.slice(headingPrefix.length).trim();
      }
      resumeSections.push({ heading, content: cleanContent });
    } else if (r.source.startsWith("GitHub > ")) {
      const name = r.source.replace("GitHub > ", "").trim();
      let cleanContent = r.content;
      const headingPrefix = `# ${name}`;
      if (cleanContent.startsWith(headingPrefix)) {
        cleanContent = cleanContent.slice(headingPrefix.length).trim();
      }
      repoSections.push({ name, content: cleanContent });
    } else {
      resumeSections.push({ heading: r.source, content: r.content });
    }
  }

  // 3. Construct clean segment blocks
  const parts: string[] = [];

  if (resumeSections.length > 0) {
    parts.push("=== RESUME INFORMATION ===");
    for (const sec of resumeSections) {
      parts.push(`Section: ${sec.heading}\n${sec.content}`);
    }
  }

  if (repoSections.length > 0) {
    parts.push("=== GITHUB REPOSITORIES ===");
    for (const repo of repoSections) {
      parts.push(`Repository: ${repo.name}\n${repo.content}`);
    }
  }

  return parts.join("\n\n");
}

type ResponseStyle = "factual" | "reflective" | "technical";

function detectResponseStyle(query: string): ResponseStyle {
  const q = query.toLowerCase();
  
  const technicalKeywords = [
    "how does", "explain your", "explain how", "architecture", "workings",
    "workflow", "pipeline", "deep dive", "implementation", "technical details",
    "technically", "design"
  ];
  const reflectiveKeywords = [
    "why should we hire", "why hire", "best project", "most proud", "strengths",
    "weaknesses", "roles are you looking", "looking for", "long term", 
    "what do you want to build", "why you", "about yourself", "tell me about you",
    "why should", "hire you", "strength", "weakness"
  ];

  if (technicalKeywords.some(kw => q.includes(kw))) {
    return "technical";
  }
  if (reflectiveKeywords.some(kw => q.includes(kw))) {
    return "reflective";
  }
  return "factual";
}

export async function generateResponse(
  query: string,
  results: RetrievalResult[],
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const context = prepareContextForLLM(results);
  const style = detectResponseStyle(query);

  let styleInstructions = "";
  if (style === "technical") {
    styleInstructions = `STYLE: TECHNICAL DEEP DIVE
- Explain with architectural depth and technical precision.
- Detail the workflow, pipelines, technology choices, and data flow.
- Use clear bullet points or numbered lists where appropriate to structure complex details.
- Avoid generic high-level fluff or hand-waving summaries; go straight to the engineering facts.`;
  } else if (style === "reflective") {
    styleInstructions = `STYLE: REFLECTIVE & RECRUITER
- Answer thoughtfully by synthesizing my strengths, projects, and work history.
- Maintain a direct, confident, and professional developer/founder energy.
- Avoid over-enthusiastic roleplay or corporate support speak.
- Frame answers around real problem-solving, independent product execution, and shipping production-ready systems.
- Keep responses natural, human-like, and highly conversational.`;
  } else {
    styleInstructions = `STYLE: CONCISE FACTUAL
- Keep your response extremely direct and brief (aim for 2-3 sentences max).
- State the core facts and tech stack immediately without preambles or wrap-ups.`;
  }

  const systemPrompt = `You are Deepanshu Chaudhary himself (acting as his first-person AI Persona). Answer the user's query in the first person ("I", "me", "my").

Role & Tone Guidelines:
- You are a sharp AI engineer and full-stack developer. Speak with startup-founder energy: technically precise, confident, professional, and recruiter-friendly.
- Do NOT sound like a robotic customer support chatbot.
- Respond conversationally and naturally, as if in a real conversation or interview.
- Never dump raw markdown headings, metadata blocks (like "Stars: 0", "Language: Python"), or internal source headers (like "Based on Resume > EXPERIENCES").
- Integrate details from my projects, repository metadata, and experience smoothly (e.g., weave in technologies and stars naturally instead of listing them as raw key-value lines).
- Synthesize information across my resume and GitHub repositories when relevant to give cohesive responses.

Tone & Word Choices Rules:
- STRICTLY avoid generic AI language, filler phrases, or overenthusiastic corporate speak, such as: "I'm really excited about", "I'm proud of", "Overall", "This project allowed me", "I’m confident in my ability", "I'm passionate about", "As an AI assistant".
- Speak directly, calmly, and technically, prioritizing signal over fluff.
- Never mention the word "Context", "corpus", "chunks", or internal system terms. Speak naturally as if from your own memory.

${styleInstructions}

Context:
${context}

User Query: ${query}`;

  if (groqKey) {
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

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      } else {
        console.error("Groq API returned status:", res.status);
      }
    } catch (err) {
      console.error("Groq API call failed:", err);
    }
  }

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

