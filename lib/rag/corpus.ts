import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CorpusChunk } from "./types";

function getCorpusPath(): string {
  const cwdPath = join(process.cwd(), "corpus", "chunks.json");
  console.log({
    cwd: process.cwd(),
    corpusPath: cwdPath,
    exists: existsSync(cwdPath),
  });

  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  try {
    const fileDir = dirname(fileURLToPath(import.meta.url));
    const fallbackPath = join(fileDir, "..", "..", "corpus", "chunks.json");
    console.log({
      fallbackPath,
      exists: existsSync(fallbackPath),
    });
    if (existsSync(fallbackPath)) {
      return fallbackPath;
    }
  } catch (err) {
    console.error("Fallback path calculation failed:", err);
  }

  return cwdPath;
}

const CORPUS_PATH = getCorpusPath();

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
