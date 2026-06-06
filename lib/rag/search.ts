import type { CorpusChunk, SearchResult } from "./types";
import { tokenise, getBigrams, jaccardSimilarity } from "./chunker";

const K1 = 1.5;
const B = 0.75;
const BM25_WEIGHT = 0.8;
const NGRAM_WEIGHT = 0.2;

interface Bm25Index {
  chunks: CorpusChunk[];
  avgDocLen: number;
  docLengths: number[];
  idf: Map<string, number>;
  termFreqs: Map<number, Map<string, number>>;
}

function buildIndex(chunks: CorpusChunk[]): Bm25Index {
  const docLengths = chunks.map((c) => c.tokenCount);
  const avgDocLen =
    docLengths.reduce((a, b) => a + b, 0) / Math.max(docLengths.length, 1);

  const df = new Map<string, number>();
  const termFreqs = new Map<number, Map<string, number>>();
  const totalDocs = chunks.length;

  for (let i = 0; i < chunks.length; i++) {
    const tokens = tokenise(chunks[i].text);
    const tf = new Map<string, number>();
    const seen = new Set<string>();

    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
      if (!seen.has(t)) {
        seen.add(t);
        df.set(t, (df.get(t) ?? 0) + 1);
      }
    }
    termFreqs.set(i, tf);
  }

  const idf = new Map<string, number>();
  for (const [term, docFreq] of df) {
    idf.set(term, Math.log(1 + (totalDocs - docFreq + 0.5) / (docFreq + 0.5)));
  }

  return { chunks, avgDocLen, docLengths, idf, termFreqs };
}

function scoreBm25(
  queryTokens: string[],
  docIndex: number,
  index: Bm25Index,
): number {
  const { docLengths, avgDocLen, idf, termFreqs } = index;
  const docLen = docLengths[docIndex];
  const tf = termFreqs.get(docIndex) ?? new Map();

  let score = 0;
  for (const q of queryTokens) {
    const qtf = tf.get(q) ?? 0;
    if (qtf === 0) continue;
    const qidf = idf.get(q) ?? 0;
    score +=
      qidf *
      ((qtf * (K1 + 1)) / (qtf + K1 * (1 - B + B * (docLen / avgDocLen))));
  }
  return score;
}

export async function search(
  query: string,
  topK = 5,
): Promise<SearchResult[]> {
  const chunks = await (await import("./corpus")).loadCorpus();
  if (chunks.length === 0) return [];

  const index = buildIndex(chunks);
  const queryTokens = tokenise(query);
  const queryBigrams = getBigrams(queryTokens);

  if (queryTokens.length === 0) return [];

  const scored: { chunk: CorpusChunk; score: number }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const bm25 = scoreBm25(queryTokens, i, index);

    const docTokens = tokenise(chunk.text);
    const docBigrams = getBigrams(docTokens);
    const ngram = jaccardSimilarity(queryBigrams, docBigrams);

    const score = BM25_WEIGHT * bm25 + NGRAM_WEIGHT * ngram;
    scored.push({ chunk, score });
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0 || scored[0].score <= 0) {
    return [];
  }

  return scored.slice(0, topK).map((s) => ({
    chunkId: s.chunk.id,
    text: s.chunk.text,
    source: s.chunk.source,
    sourceLabel: s.chunk.sourceLabel,
    score: Math.round(s.score * 10000) / 10000,
  }));
}
