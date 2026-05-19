// Placeholder - TDD RED phase: tests should fail
export function getApiKey(): string {
  throw new Error('Not implemented');
}

export async function search(query: string): Promise<{ results: Array<{ title: string; url: string }>; content: string }> {
  throw new Error('Not implemented');
}
