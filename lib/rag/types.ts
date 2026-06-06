export interface CorpusChunk {
  id: string;
  text: string;
  source: string;
  sourceLabel: string;
  heading: string;
  headingLevel: number;
  tokenCount: number;
}

export interface SearchResult {
  chunkId: string;
  text: string;
  source: string;
  sourceLabel: string;
  score: number;
}

export interface CorpusData {
  chunks: CorpusChunk[];
}
