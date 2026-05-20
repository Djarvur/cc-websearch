import { readStdin, WebSearchInputSchema, validateDomainExclusivity } from './lib/input.js';
import { formatSearchResults } from './lib/output.js';
import { logger } from './lib/logger.js';
import { hasApiKey, search } from './lib/perplexity.js';
import { searchDDG } from './lib/duckduckgo.js';
import { retryWithBackoff, isTransientError, isDDGTransientError } from './lib/retry.js';
import { filterByDomains, buildPerplexityDomainFilter } from './lib/filter.js';
import type { SearchResult } from './types.js';

/**
 * Deduplicate and merge results: Perplexity results first, DDG appended.
 * Removes DDG results whose URL already exists in Perplexity results (D-18).
 */
function dedupeAndMerge(pplxResults: SearchResult[], ddgResults: SearchResult[]): SearchResult[] {
  const pplxUrls = new Set(pplxResults.map((r) => r.url));
  const uniqueDdg = ddgResults.filter((r) => !pplxUrls.has(r.url));
  return [...pplxResults, ...uniqueDdg];
}

async function main(): Promise<void> {
  try {
    const parsed = await readStdin(WebSearchInputSchema);
    logger.info(`Searching for: ${parsed.query}`);

    // Validate mutual exclusivity of allowed/block domains (SRCH-03)
    validateDomainExclusivity(parsed);

    // Build Perplexity domain filter from user input
    const domainFilter = buildPerplexityDomainFilter(parsed.allowed_domains, parsed.blocked_domains);
    const hasDomainFilter = !!(parsed.allowed_domains?.length || parsed.blocked_domains?.length);

    let results: SearchResult[];
    let provider: string;

    if (hasApiKey()) {
      // Primary: Perplexity with retries
      // Capture partial results in case retry wrapper fails after a successful call (D-17)
      let pplxPartial: SearchResult[] = [];

      try {
        const pplxResult = await retryWithBackoff(
          // Wrap search to capture partial results from any successful attempt
          async () => {
            const result = await search(parsed.query, domainFilter);
            if (result.results.length > 0) {
              pplxPartial = result.results;
            }
            return result;
          },
          isTransientError,
        );
        results = pplxResult.results;
        provider = 'perplexity';
        logger.debug(`Perplexity content: ${pplxResult.content}`);

        // Safety net: post-filter Perplexity results for blocked domains
        if (parsed.blocked_domains && parsed.blocked_domains.length > 0) {
          results = filterByDomains(results, undefined, parsed.blocked_domains);
        }
      } catch (pplxErr) {
        const pplxErrorMsg = pplxErr instanceof Error ? pplxErr.message : String(pplxErr);
        logger.debug(`Perplexity failed, falling back to DDG: ${pplxPartial.length > 0 ? `(preserving ${pplxPartial.length} partial results) ` : ''}${pplxErrorMsg}`);

        // Fallback: DDG with retries
        try {
          const ddgResults = await retryWithBackoff(
            () => searchDDG(parsed.query),
            isDDGTransientError,
          );
          // Post-filter DDG results with subdomain-inclusive matching
          const filteredDdg = filterByDomains(ddgResults, parsed.allowed_domains, parsed.blocked_domains);

          // Merge partial Perplexity results with DDG results (D-17, D-18)
          results = dedupeAndMerge(pplxPartial, filteredDdg);
          provider = pplxPartial.length > 0 ? 'perplexity+duckduckgo' : 'duckduckgo';
        } catch (ddgErr) {
          const ddgErrorMsg = ddgErr instanceof Error ? ddgErr.message : String(ddgErr);
          throw new Error(
            `Search failed: Perplexity error: ${pplxErrorMsg}; DDG error: ${ddgErrorMsg}`,
          );
        }
      }
    } else {
      // No API key: use DDG directly (first-class, D-04)
      const ddgResults = await retryWithBackoff(
        () => searchDDG(parsed.query),
        isDDGTransientError,
      );
      // Post-filter DDG results with subdomain-inclusive matching
      results = filterByDomains(ddgResults, parsed.allowed_domains, parsed.blocked_domains);
      provider = 'duckduckgo';
    }

    process.stdout.write(formatSearchResults(results, provider));
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
