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
  "repo", "app", "hire", "why", "strength", "weakness", "role", "position",
  "fit", "choose", "proud", "strengths", "weaknesses", "candidate", "about"
];

function matchesResumeTopic(query: string): boolean {
  const lower = query.toLowerCase();
  return RESUME_TOPICS.some((t) => lower.includes(t));
}

function scoreHeadingMatch(chunkHeading: string, query: string): number {
  const q = query.toLowerCase();
  const h = chunkHeading.toLowerCase();
  let score = 0;

  // Experience / work / internship queries
  if (q.includes("experience") || q.includes("intern") || q.includes("work") || q.includes("previously") || q.includes("job")) {
    if (h.includes("experience") || h.includes("intern") || h.includes("work")) score += 5;
    if (h.includes("summary")) score += 2;
  }

  // Project / app / github queries
  if (q.includes("project") || q.includes("app") || q.includes("build") || q.includes("repo") || q.includes("codebase")) {
    if (h.includes("projects") || h.includes("repository") || h.includes("github")) score += 5;
    if (h.includes("fitcheck") || h.includes("devasya") || h.includes("tournify") || h.includes("riddle")) score += 3;
    if (h.includes("summary")) score += 1;
  }

  // Skills / stack queries
  if (q.includes("skill") || q.includes("tech") || q.includes("stack") || q.includes("language") || q.includes("database")) {
    if (h.includes("skills")) score += 5;
    if (h.includes("summary")) score += 1;
  }

  // Education / background / college
  if (q.includes("education") || q.includes("background") || q.includes("bachelor") || q.includes("college") || q.includes("school") || q.includes("study")) {
    if (h.includes("education")) score += 5;
    if (h.includes("summary")) score += 2;
  }

  // Recruiter / reflective questions (Why hire you, strengths, proud project, roles, etc.)
  if (
    q.includes("hire") || q.includes("why should") || q.includes("why we") ||
    q.includes("strength") || q.includes("proud") || q.includes("roles") ||
    q.includes("looking for") || q.includes("about you") || q.includes("value") ||
    q.includes("choose") || q.includes("fit") || q.includes("long term") ||
    q.includes("team") || q.includes("leadership") || q.includes("ownership") || q.includes("impact")
  ) {
    if (h.includes("summary")) score += 5;
    if (h.includes("experience")) score += 4;
    if (h.includes("skills")) score += 3;
    if (h.includes("projects")) score += 3;
  }

  return score;
}

async function fallbackByHeading(query: string): Promise<RetrievalResponse | null> {
  if (!matchesResumeTopic(query)) return null;

  const chunks = await loadCorpus();
  if (chunks.length === 0) return null;

  const scored = chunks
    .map((c) => ({
      chunk: c,
      score: scoreHeadingMatch(c.heading, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const topItems = scored.slice(0, 4);
  return {
    results: topItems.map((item) => ({
      content: item.chunk.text,
      source: item.chunk.sourceLabel,
      score: 0.01 + item.score / 100,
    })),
    sources: topItems.map((item) => item.chunk.sourceLabel),
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

  const isRecruiterQuery = [
    "hire", "why should", "why we", "strength", "proud", "roles",
    "looking for", "about you", "value", "choose", "fit", "long term",
    "strengths", "weakness", "weaknesses", "why you", "fit for role",
    "what kind of roles", "what are you looking for", "team", "leadership",
    "ownership", "impact"
  ].some(term => query.toLowerCase().includes(term));

  if (isRecruiterQuery || searchResults.length === 0) {
    const fallback = await fallbackByHeading(query);
    if (fallback) {
      const seen = new Set(searchResults.map(r => r.sourceLabel));
      const mergedResults = [
        ...searchResults.map(r => ({ content: r.text, source: r.sourceLabel, score: r.score })),
      ];
      for (const fallbackResult of fallback.results) {
        if (!seen.has(fallbackResult.source)) {
          seen.add(fallbackResult.source);
          mergedResults.push(fallbackResult);
        }
      }
      return {
        results: mergedResults.slice(0, 5),
        sources: mergedResults.slice(0, 5).map(r => r.source),
        rejected: false,
        rejectReason: null,
        fallback: true,
      };
    }
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
