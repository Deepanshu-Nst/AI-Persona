export interface ConversationMemory {
  lastTopics: string[];
  lastQuery?: string;
  lastResponse?: string;
  lastDiscussedProject?: string;
}

const memoryStore = new Map<string, ConversationMemory>();

export function getMemory(conversationId: string): ConversationMemory {
  if (!memoryStore.has(conversationId)) {
    memoryStore.set(conversationId, { lastTopics: [] });
  }
  return memoryStore.get(conversationId)!;
}

export function updateMemory(
  conversationId: string,
  query: string,
  response: string
): void {
  const memory = getMemory(conversationId);
  memory.lastQuery = query;
  memory.lastResponse = response;

  const lowerQuery = query.toLowerCase();
  const lowerResponse = response.toLowerCase();

  const projects = [
    { name: "Devasya AI", keywords: ["devasya", "devasya ai", "devasya-ai"] },
    { name: "FitCheck", keywords: ["fitcheck", "fit check", "clothing app", "fitting room"] },
    { name: "Tournify", keywords: ["tournify", "event management", "esports platform"] },
    { name: "Daily Reasoning Platform", keywords: ["daily reasoning", "riddle", "dailymathsriddle", "math riddle"] }
  ];

  for (const p of projects) {
    if (p.keywords.some(kw => lowerQuery.includes(kw) || lowerResponse.includes(kw))) {
      memory.lastDiscussedProject = p.name;
      break;
    }
  }

  const topics: string[] = [];
  if (lowerQuery.includes("experience") || lowerQuery.includes("work") || lowerQuery.includes("intern")) {
    topics.push("experience");
  }
  if (lowerQuery.includes("skill") || lowerQuery.includes("tech") || lowerQuery.includes("stack")) {
    topics.push("skills");
  }
  if (lowerQuery.includes("education") || lowerQuery.includes("college") || lowerQuery.includes("school")) {
    topics.push("education");
  }
  if (topics.length > 0) {
    memory.lastTopics = [...new Set([...topics, ...memory.lastTopics])].slice(0, 5);
  }
}
