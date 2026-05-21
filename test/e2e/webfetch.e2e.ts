import { describe, it, expect } from 'vitest';
import { runScript, withRetry } from './helpers.js';

describe('WebFetch E2E', () => {
  it('fetches real page and returns markdown', async () => {
    await withRetry(async () => {
      const result = await runScript('scripts/webfetch.cjs', {
        url: 'https://example.com',
        prompt: 'describe this page',
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
      const hasMarkdown =
        result.stdout.includes('#') ||
        result.stdout.includes('**') ||
        result.stdout.includes('[') ||
        result.stdout.includes('http');
      expect(hasMarkdown).toBe(true);
    });
  });

  it('returns error for bad URL', async () => {
    const result = await runScript('scripts/webfetch.cjs', {
      url: 'not-a-valid-url',
      prompt: 'test',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
