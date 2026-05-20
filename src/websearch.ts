import { readStdin, WebSearchInputSchema, validateDomainExclusivity } from './lib/input.js';
import { formatSearchResults } from './lib/output.js';
import { logger } from './lib/logger.js';
import { hasApiKey, search } from './lib/perplexity.js';
import { searchDDG } from './lib/duckduckgo.js';
import { retryWithBackoff, isTransientError, isDDGTransientError } from './lib/retry.js';
import { filterByDomains, buildPerplexityDomainFilter } from './lib/filter.js';
import type { SearchResult } from './types.js';

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
      try {
        const pplxResult = await retryWithBackoff(
          () => search(parsed.query, domainFilter),
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
        logger.debug(`Perplexity failed, falling back to DDG: ${pplxErrorMsg}`);

        // Fallback: DDG with retries
        try {
          const ddgResults = await retryWithBackoff(
            () => searchDDG(parsed.query),
            isDDGTransientError,
          );
          // Post-filter DDG results with subdomain-inclusive matching
          results = filterByDomains(ddgResults, parsed.allowed_domains, parsed.blocked_domains);
          provider = 'duckduckgo';
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
