import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CorpusChunk } from "./types";
import corpusJson from "../../corpus/chunks.json";

let cached: CorpusChunk[] | null = corpusJson.chunks as CorpusChunk[];

export async function loadCorpus(): Promise<CorpusChunk[]> {
  if (cached) return cached;
  try {
    cached = corpusJson.chunks as CorpusChunk[];
    console.log("corpus loaded statically:", {
      chunks: cached.length,
    });
    return cached;
  } catch (err) {
    console.error("corpus load failed:", err);
    return [];
  }
}

export async function saveCorpus(chunks: CorpusChunk[]): Promise<void> {
  cached = chunks;
  const CORPUS_PATH = join(process.cwd(), "corpus", "chunks.json");
  await writeFile(CORPUS_PATH, JSON.stringify({ chunks }, null, 2), "utf-8");
}

export function clearCache(): void {
  cached = null;
}
