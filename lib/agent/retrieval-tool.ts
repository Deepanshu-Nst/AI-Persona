import { search } from "@/lib/rag/search";
import { guardQuery } from "@/lib/rag/prompt-guard";
import type { SearchResult } from "@/lib/rag/types";

export interface RetrievalResult {
  content: string;
  source: string;
  score: number;
}

export interface RetrievalResponse {
  results: RetrievalResult[];
  sources: string[];
  rejected: boolean;
  rejectReason: string | null;
}

export async function retrieve(query: string): Promise<RetrievalResponse> {
  const guard = guardQuery(query);
  if (guard.flagged) {
    return { results: [], sources: [], rejected: true, rejectReason: guard.reason };
  }

  const searchResults = await search(query, 5);

  if (searchResults.length === 0) {
    return { results: [], sources: [], rejected: false, rejectReason: null };
  }

  return {
    results: searchResults.map((r: SearchResult) => ({
      content: r.text,
      source: r.sourceLabel,
      score: r.score,
    })),
    sources: [...new Set(searchResults.map((r: SearchResult) => r.sourceLabel))],
    rejected: false,
    rejectReason: null,
  };
}
