import type { RetrievalResult } from "./retrieval-tool";
import { getMemory } from "./memory";

export function prepareContextForLLM(results: RetrievalResult[]): string {
  if (results.length === 0) return "";

  // Group chunks by high-level semantic category for semantic diversity
  const groups: Record<string, RetrievalResult[]> = {};

  for (const r of results) {
    let category = "other";
    const label = r.source.toLowerCase();

    if (label.includes("summary")) {
      category = "summary";
    } else if (label.includes("experience") || label.includes("intern")) {
      category = "experience";
    } else if (label.includes("skills")) {
      category = "skills";
    } else if (label.includes("devasya")) {
      category = "project-devasya";
    } else if (label.includes("fitcheck")) {
      category = "project-fitcheck";
    } else if (label.includes("tournify")) {
      category = "project-tournify";
    } else if (label.includes("riddle") || label.includes("reasoning")) {
      category = "project-riddle";
    } else if (label.startsWith("github > ")) {
      const repoName = r.source.replace(/^github\s*>\s*/i, "").trim();
      category = `github-${repoName}`;
    } else if (label.includes("project")) {
      category = "projects";
    }

    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(r);
  }

  // Interleave chunks from groups to prioritize semantic diversity
  const selected: RetrievalResult[] = [];
  const groupKeys = Object.keys(groups);
  let hasMore = true;
  let index = 0;

  while (hasMore && selected.length < 5) {
    hasMore = false;
    for (const key of groupKeys) {
      const groupList = groups[key];
      if (index < groupList.length) {
        selected.push(groupList[index]);
        hasMore = true;
      }
    }
    index++;
  }

  // Deduplicate and process content
  const processedBlocks: string[] = [];
  const seenHeadings = new Set<string>();

  for (const item of selected.slice(0, 4)) { // keep context compact
    let cleanContent = item.content;

    // Strip noisy metadata: Stars, Topics, Language
    cleanContent = cleanContent
      .split("\n")
      .filter(line => {
        const lower = line.toLowerCase().trim();
        return !(lower.startsWith("stars:") || lower.startsWith("topics:") || lower.startsWith("language:"));
      })
      .join("\n");

    // Deduplicate top headings
    const lines = cleanContent.split("\n");
    if (lines[0] && lines[0].startsWith("#")) {
      const headingText = lines[0].replace(/#+\s*/g, "").trim().toLowerCase();
      if (seenHeadings.has(headingText)) {
        lines.shift(); // remove duplicate top heading
        cleanContent = lines.join("\n");
      } else {
        seenHeadings.add(headingText);
      }
    }

    cleanContent = cleanContent.trim();
    if (cleanContent) {
      let sourceLabel = "Resume / Portfolio Info";
      if (item.source.startsWith("Resume > ")) {
        sourceLabel = `Resume > ${item.source.replace("Resume > ", "")}`;
      } else if (item.source.startsWith("GitHub > ")) {
        sourceLabel = `GitHub Repository Info > ${item.source.replace("GitHub > ", "")}`;
      }
      processedBlocks.push(`[source: "${sourceLabel}"]\n${cleanContent}`);
    }
  }

  return processedBlocks.join("\n\n");
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
    "why should", "hire you", "strength", "weakness", "fit for role", "what kind of roles",
    "what are you looking for", "team", "leadership", "ownership", "impact", "roles", "kind of roles"
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
  conversationId?: string,
): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const context = prepareContextForLLM(results);
  const style = detectResponseStyle(query);

  let styleInstructions = "";
  if (style === "technical") {
    styleInstructions = `STYLE: TECHNICAL DEEP DIVE (CONCISE)
- Explain with architectural depth and technical precision.
- Detail the workflow, pipelines, technology choices, and data flow.
- Use clear, structured bullet points or numbered lists.
- Keep explanation of architecture concise and avoid repeating technology stack names excessively.
- Target a length of 2-3 short, dense paragraphs or a neat bulleted list. No conversational fluff or preamble.`;
  } else if (style === "reflective") {
    styleInstructions = `STYLE: REFLECTIVE & RECRUITER (1-2 CONCISE PARAGRAPHS)
- Target exactly 1 or 2 concise paragraphs. Do NOT write more than 2 paragraphs.
- Frame answers around real problem-solving, product ownership, and shipping live apps.
- Maintain a direct, calm, and professional founder-engineer tone.
- Do NOT use motivational filler, over-roleplayed enthusiasm, or self-praise exaggeration (e.g., avoid "I am proud of", "I'm excited about", "Overall", "This project allowed me", "I'm confident in my ability").
- Speak in the first person ("I", "my") naturally. Do not mention "my resume" or "the corpus".`;
  } else {
    styleInstructions = `STYLE: CONCISE FACTUAL (2-4 SENTENCES MAX)
- Target exactly 2 to 4 sentences. Do NOT write more.
- State the core facts and tech stack immediately.
- Absolutely NO introductory or concluding paragraphs (e.g., do not say "Based on the information...", "Here is...", or "Let me know if you need more details").`;
  }

  // Inject conversational context if memory is present
  let memoryContext = "";
  if (conversationId) {
    const memory = getMemory(conversationId);
    if (memory.lastDiscussedProject) {
      memoryContext = `\n\nCONVERSATIONAL MEMORY / CONTEXT:
- The user is currently discussing the project: ${memory.lastDiscussedProject}.
- Previous user query: "${memory.lastQuery ?? ""}"
- Your previous answer: "${memory.lastResponse ?? ""}"
Keep this flow in mind. If the user asks follow-up questions (e.g. "How does it work?" or "Explain its architecture"), answer directly in context without reintroducing the project name from scratch. Do not repeat the project's background info unless asked.`;
    }
  }

  const systemPrompt = `You are Deepanshu Chaudhary himself (acting as his first-person AI Persona). Answer the user's query in the first person ("I", "me", "my").

Role & Tone Guidelines:
- You are a sharp AI engineer and full-stack developer. Speak with startup-founder energy: technically precise, confident, professional, and recruiter-friendly.
- Do NOT sound like a robotic customer support chatbot.
- Respond conversationally and naturally, as if in a real conversation or interview.
- Never dump raw markdown headings, metadata blocks, or internal source headers.
- Integrate details from my projects, repository metadata, and experience smoothly.
- Synthesize information across my resume and GitHub repositories when relevant to give cohesive responses.

Tone & Word Choices Rules:
- STRICTLY avoid generic AI language, filler phrases, or overenthusiastic corporate speak, such as: "I'm really excited about", "I'm proud of", "Overall", "This project allowed me", "I’m confident in my ability", "I'm passionate about", "As an AI assistant".
- Speak directly, calmly, and technically, prioritizing signal over fluff.
- Never mention the word "Context", "corpus", "chunks", or internal system terms. Speak naturally as if from your own memory.
- If a question is reflective or opinion-based (e.g., "Why should we hire you?"), synthesize a thoughtful first-person answer using the facts in the context. Never hallucinate facts not in the context, but reason about them naturally.

STRICT LENGTH CONTROLS:
- Factual queries: 2-4 sentences max, no intro/outro.
- Reflective/Recruiter queries: 1-2 concise paragraphs max.
- Technical queries: structured and concise architecture details.

${styleInstructions}${memoryContext}

Context:
${context}

User Query: ${query}`;

  const activeModel = "llama-3.1-8b-instant";

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: activeModel,
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

  if (results.length === 0) {
    return "I don't really have enough context around that specifically, but I'm happy to talk about my projects, AI work, engineering experience, or anything from my portfolio.";
  }

  const top = results[0];
  const cleaned = top.content
    .replace(/#+\s*/g, "")
    .replace(/\n+/g, "\n")
    .trim();

  return `Based on my ${top.source}:\n\n${cleaned}`;
}
