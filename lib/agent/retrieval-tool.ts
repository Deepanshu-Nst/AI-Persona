import { search } from "@/lib/rag/search";
import { guardQuery } from "@/lib/rag/prompt-guard";
import { loadCorpus } from "@/lib/rag/corpus";
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
  fallback: boolean;
}

const RESUME_TOPICS = [
  "experience", "project", "skill", "work", "intern", "internship",
  "education", "background", "tech", "technolog", "build", "develop",
  "repo", "app",
];

function matchesResumeTopic(query: string): boolean {
  const lower = query.toLowerCase();
  return RESUME_TOPICS.some((t) => lower.includes(t));
}

function scoreHeadingMatch(chunkHeading: string, query: string): number {
  const q = query.toLowerCase();
  const h = chunkHeading.toLowerCase();
  let score = 0;
  if (q.includes("experience") || q.includes("intern") || q.includes("work")) {
    if (h.includes("intern")) score += 3;
    if (h === "summary") score += 1;
  }
  if (q.includes("project") || q.includes("app") || q.includes("build") || q.includes("repo")) {
    if (h.includes("—") || h.includes("dashboard") || h.includes("agent")) score += 3;
    if (h.includes("fitcheck") || h.includes("aforro") || h.includes("devasya")) score += 2;
  }
  if (q.includes("skill") || q.includes("tech") || q.includes("stack")) {
    if (h === "skills") score += 5;
  }
  if (q.includes("education") || q.includes("background") || q.includes("bachelor")) {
    if (h.includes("bachelor")) score += 3;
    if (h === "summary") score += 2;
  }
  return score;
}

async function fallbackByHeading(query: string): Promise<RetrievalResponse | null> {
  if (!matchesResumeTopic(query)) return null;

  const chunks = await loadCorpus();
  if (chunks.length === 0) return null;

  const scored = chunks.map((c) => ({
    chunk: c,
    score: scoreHeadingMatch(c.heading, query),
  }));
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0 || scored[0].score <= 0) return null;

  const top = scored[0];
  return {
    results: [{
      content: top.chunk.text,
      source: top.chunk.sourceLabel,
      score: 0.01,
    }],
    sources: [top.chunk.sourceLabel],
    rejected: false,
    rejectReason: null,
    fallback: true,
  };
}

export async function retrieve(query: string): Promise<RetrievalResponse> {
  const guard = guardQuery(query);
  if (guard.flagged) {
    return { results: [], sources: [], rejected: true, rejectReason: guard.reason, fallback: false };
  }

  const searchResults = await search(query, 5);

  if (searchResults.length === 0) {
    const fallback = await fallbackByHeading(query);
    if (fallback) return fallback;
    return { results: [], sources: [], rejected: false, rejectReason: null, fallback: false };
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
    fallback: false,
  };
}
