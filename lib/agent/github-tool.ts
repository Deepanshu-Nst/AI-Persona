export interface RepoInfo {
  name: string;
  description: string;
  language: string;
  stars: number;
}

export async function queryGithub(query: string): Promise<RepoInfo[]> {
  return [];
}
