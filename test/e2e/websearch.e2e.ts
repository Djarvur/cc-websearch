import { describe, it, expect } from 'vitest';
import { runScript, withRetry } from './helpers.js';

describe('WebSearch E2E', () => {
  it('returns search results in XML format', async () => {
    await withRetry(async () => {
      const result = await runScript('skills/websearch/scripts/websearch.cjs', {
        query: 'example domain website',
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<search_results>');
      expect(result.stdout).toContain('<result>');
      expect(result.stdout).toContain('<title>');
      expect(result.stdout).toContain('<url>');
      expect(result.stdout).toContain('<snippet>');
    });
  });

  it('filters results by allowed domains', async () => {
    await withRetry(async () => {
      const result = await runScript('skills/websearch/scripts/websearch.cjs', {
        query: 'github',
        allowed_domains: ['github.com'],
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<search_results>');
      const urlMatches = result.stdout.match(/<url>(.*?)<\/url>/g);
      if (urlMatches) {
        for (const urlMatch of urlMatches) {
          const url = urlMatch.replace(/<\/?url>/g, '');
          expect(url).toContain('github.com');
        }
      }
    });
  });

  it('returns error for invalid input', async () => {
    const result = await runScript('skills/websearch/scripts/websearch.cjs', {});
    expect(result.exitCode).toBe(1);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});
