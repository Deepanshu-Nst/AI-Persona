export interface AgentContext {
  query: string;
  conversationId: string;
  source: "voice" | "chat";
}

export interface AgentResponse {
  answer: string;
  stream?: any;
  isInstant?: boolean;
  sources?: string[];
  metadata?: Record<string, unknown>;
}

export type AgentTool = "retrieval" | "github" | "availability" | "booking";
