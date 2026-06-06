export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSource {
  label: string;
  snippet: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  reply: string;
  sources?: ChatSource[];
  bookingAvailable: boolean;
  conversationId: string;
}

export interface BookingFormData {
  name: string;
  email: string;
  date: string;
  message: string;
}
