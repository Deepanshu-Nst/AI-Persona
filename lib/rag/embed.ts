export async function embed(text: string): Promise<number[]> {
  return [];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return texts.map(() => []);
}
