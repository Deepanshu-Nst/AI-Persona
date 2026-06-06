import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CorpusChunk } from "./types";

const CORPUS_PATH = join(process.cwd(), "corpus", "chunks.json");

let cached: CorpusChunk[] | null = null;

export async function loadCorpus(): Promise<CorpusChunk[]> {
  if (cached) return cached;
  try {
    const raw = await readFile(CORPUS_PATH, "utf-8");
    const data = JSON.parse(raw);
    cached = data.chunks as CorpusChunk[];
    console.log("corpus loaded:", {
      path: CORPUS_PATH,
      chunks: cached.length,
    });
    return cached;
  } catch (err) {
    console.error("corpus load failed:", {
      path: CORPUS_PATH,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export async function saveCorpus(chunks: CorpusChunk[]): Promise<void> {
  cached = chunks;
  await writeFile(CORPUS_PATH, JSON.stringify({ chunks }, null, 2), "utf-8");
}

export function clearCache(): void {
  cached = null;
}
