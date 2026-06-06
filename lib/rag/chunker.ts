import type { CorpusChunk } from "./types";

export interface HeadingBlock {
  heading: string;
  level: number;
  content: string;
}

export function splitMarkdownByHeadings(markdown: string): HeadingBlock[] {
  const lines = markdown.split("\n");
  const blocks: HeadingBlock[] = [];

  let currentHeading = "(root)";
  let currentLevel = 1;
  let currentContent: string[] = [];

  function flush() {
    const body = currentContent.join("\n").trim();
    if (body) {
      blocks.push({
        heading: currentHeading,
        level: currentLevel,
        content: body,
      });
    }
  }

  for (const line of lines) {
    const h1Match = line.match(/^# (.+)/);
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);

    if (h1Match) {
      flush();
      currentHeading = h1Match[1];
      currentLevel = 1;
      currentContent = [];
    } else if (h2Match) {
      flush();
      currentHeading = h2Match[1];
      currentLevel = 2;
      currentContent = [];
    } else if (h3Match) {
      flush();
      currentHeading = h3Match[1];
      currentLevel = 3;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  flush();
  return blocks;
}

export function chunkMarkdown(
  markdown: string,
  source: string,
  sourceLabel: string,
): CorpusChunk[] {
  const blocks = splitMarkdownByHeadings(markdown);
  return blocks.map((block, i) => {
    const text = `# ${block.heading}\n\n${block.content}`;
    const tokens = tokenise(text);
    return {
      id: `${source.replace(/[^a-zA-Z0-9]/g, "-")}-${i}`,
      text,
      source,
      sourceLabel: `${sourceLabel} > ${block.heading}`,
      heading: block.heading,
      headingLevel: block.level,
      tokenCount: tokens.length,
    };
  });
}

export function chunkRepos(
  repos: { name: string; description: string | null; language: string | null; stars: number; topics?: string[] }[],
  source: string,
): CorpusChunk[] {
  return repos.map((repo) => {
    const topics = (repo.topics ?? []).join(", ");
    const text = [
      `# ${repo.name}`,
      repo.description ? `\n${repo.description}` : "",
      `\nLanguage: ${repo.language ?? "N/A"}`,
      `\nStars: ${repo.stars}`,
      topics ? `\nTopics: ${topics}` : "",
    ].join("");
    const tokens = tokenise(text);
    return {
      id: `gh-${repo.name}`,
      text,
      source,
      sourceLabel: `GitHub > ${repo.name}`,
      heading: repo.name,
      headingLevel: 1,
      tokenCount: tokens.length,
    };
  });
}

export function tokenise(text: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "need",
    "it", "its", "this", "that", "these", "those", "i", "me", "my",
    "we", "us", "our", "you", "your", "he", "him", "his", "she", "her",
    "they", "them", "their", "what", "which", "who", "whom", "when",
    "where", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "about", "above",
    "after", "again", "against", "below", "between", "during", "before",
    "after", "up", "down", "out", "off", "over", "under", "here", "there",
  ]);

  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !stopWords.has(t));
}

export function getBigrams(tokens: string[]): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}
