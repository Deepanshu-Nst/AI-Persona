import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chunkMarkdown, chunkRepos } from "../lib/rag/chunker";
import { saveCorpus } from "../lib/rag/corpus";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("Ingesting corpus...");

  const contentDir = join(__dirname, "..", "content");

  const resumeMd = await readFile(join(contentDir, "resume.md"), "utf-8");
  const resumeChunks = chunkMarkdown(resumeMd, "resume.md", "Resume");
  console.log(`  resume.md → ${resumeChunks.length} chunks`);

  const reposRaw = await readFile(join(contentDir, "github", "repos.json"), "utf-8");
  const reposData = JSON.parse(reposRaw);
  const repoChunks = chunkRepos(reposData.repos, "github/repos.json");
  console.log(`  github/repos.json → ${repoChunks.length} chunks`);

  const allChunks = [...resumeChunks, ...repoChunks];
  await saveCorpus(allChunks);

  console.log(`  total: ${allChunks.length} chunks written to corpus/chunks.json`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Ingest failed:", err);
  process.exit(1);
});
