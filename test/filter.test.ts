import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  matchesDomain,
  filterByDomains,
} from '../src/lib/filter.js';
import type { SearchResult } from '../src/types.js';

describe('normalizeDomain', () => {
  it('should strip https:// protocol', () => {
    expect(normalizeDomain('https://github.com/path/')).toBe('github.com');
  });

  it('should strip http:// protocol', () => {
    expect(normalizeDomain('http://example.com/page')).toBe('example.com');
  });

  it('should strip www prefix', () => {
    expect(normalizeDomain('http://www.example.com/page')).toBe('example.com');
  });

  it('should strip path and trailing slash', () => {
    expect(normalizeDomain('https://github.com/some/deep/path')).toBe('github.com');
  });

  it('should lowercase the domain', () => {
    expect(normalizeDomain('RAW.DOMAIN.COM')).toBe('raw.domain.com');
  });

  it('should return bare domain unchanged', () => {
    expect(normalizeDomain('github.com')).toBe('github.com');
  });

  it('should handle domain with trailing slash only', () => {
    expect(normalizeDomain('github.com/')).toBe('github.com');
  });

  it('should handle domain with www only', () => {
    expect(normalizeDomain('www.github.com')).toBe('github.com');
  });
});

describe('matchesDomain', () => {
  it('should match exact domain', () => {
    expect(matchesDomain('https://github.com/guide', 'github.com')).toBe(true);
  });

  it('should match subdomain', () => {
    expect(matchesDomain('https://docs.github.com/guide', 'github.com')).toBe(true);
  });

  it('should NOT match different domain', () => {
    expect(matchesDomain('https://notgithub.com/guide', 'github.com')).toBe(false);
  });

  it('should match deep subdomain', () => {
    expect(matchesDomain('https://api.staging.example.com/endpoint', 'example.com')).toBe(true);
  });

  it('should NOT match partial domain (prefix only)', () => {
    // "notgithub.com" should not match "github.com" -- it's not a subdomain
    expect(matchesDomain('https://notgithub.com/guide', 'github.com')).toBe(false);
  });
});

describe('filterByDomains', () => {
  const sampleResults: SearchResult[] = [
    { title: 'GitHub Docs', url: 'https://docs.github.com/guide' },
    { title: 'GitHub Main', url: 'https://github.com/guide' },
    { title: 'Reddit Post', url: 'https://www.reddit.com/r/test' },
    { title: 'StackOverflow', url: 'https://stackoverflow.com/questions/123' },
  ];

  it('should return only results matching allowed domains (with subdomain matching)', () => {
    const filtered = filterByDomains(sampleResults, ['github.com'], undefined);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].title).toBe('GitHub Docs');
    expect(filtered[1].title).toBe('GitHub Main');
  });

  it('should return results excluding blocked domains (with subdomain matching)', () => {
    const filtered = filterByDomains(sampleResults, undefined, ['reddit.com']);
    expect(filtered).toHaveLength(3);
    expect(filtered.map((r) => r.title)).not.toContain('Reddit Post');
  });

  it('should return all results when neither filter is provided', () => {
    const filtered = filterByDomains(sampleResults, undefined, undefined);
    expect(filtered).toHaveLength(4);
  });

  it('should return empty array when all results are filtered out (D-12 strict)', () => {
    const filtered = filterByDomains(sampleResults, ['nonexistent.com'], undefined);
    expect(filtered).toEqual([]);
  });

  it('should return empty array when all results are blocked', () => {
    const allBlocked = filterByDomains(
      sampleResults,
      undefined,
      ['github.com', 'reddit.com', 'stackoverflow.com'],
    );
    expect(allBlocked).toEqual([]);
  });

  it('should handle empty results array', () => {
    const filtered = filterByDomains([], ['github.com'], undefined);
    expect(filtered).toEqual([]);
  });
});
