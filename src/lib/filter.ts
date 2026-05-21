import type { SearchResult } from '../types.js';

/**
 * Aggressively normalize a domain string (D-13).
 * Strips protocol, www prefix, path, trailing slash, lowercases.
 */
export function normalizeDomain(input: string): string {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

/**
 * Check if a URL matches a given domain with subdomain-inclusive matching (D-11).
 * "github.com" matches "docs.github.com", "api.github.com", etc.
 */
export function matchesDomain(url: string, domain: string): boolean {
  const urlHost = normalizeDomain(new URL(url).hostname);
  const normalizedDomain = normalizeDomain(domain);
  return urlHost === normalizedDomain || urlHost.endsWith('.' + normalizedDomain);
}

/**
 * Filter search results by allowed or blocked domains (D-12 strict).
 * Returns empty array if all results are filtered out -- no soft fallback.
 */
export function filterByDomains(
  results: SearchResult[],
  allowedDomains?: string[],
  blockedDomains?: string[],
): SearchResult[] {
  // No filtering needed
  if ((!allowedDomains || allowedDomains.length === 0) && (!blockedDomains || blockedDomains.length === 0)) {
    return results;
  }

  // Allowed domains: include only matching results
  if (allowedDomains && allowedDomains.length > 0) {
    return results.filter((result) =>
      allowedDomains.some((domain) => matchesDomain(result.url, domain)),
    );
  }

  // Blocked domains: exclude matching results
  if (blockedDomains && blockedDomains.length > 0) {
    return results.filter((result) =>
      !blockedDomains.some((domain) => matchesDomain(result.url, domain)),
    );
  }

  return results;
}
