export interface GitHubRepo {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
}

export async function fetchRepos(username: string): Promise<GitHubRepo[]> {
  return [];
}
