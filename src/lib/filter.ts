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

/**
 * Build Perplexity API search_domain_filter array.
 * Allowed domains: pass as-is (normalized).
 * Blocked domains: prefix with "-" per Perplexity API convention.
 * Max 20 domains per request.
 */
export function buildPerplexityDomainFilter(
  allowedDomains?: string[],
  blockedDomains?: string[],
): string[] | undefined {
  if (allowedDomains && allowedDomains.length > 0) {
    return allowedDomains.slice(0, 20).map((d) => normalizeDomain(d));
  }

  if (blockedDomains && blockedDomains.length > 0) {
    return blockedDomains.slice(0, 20).map((d) => '-' + normalizeDomain(d));
  }

  return undefined;
}
