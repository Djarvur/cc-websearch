import { readStdin, WebSearchInputSchema } from './lib/input.js';
import { formatSearchResults } from './lib/output.js';
import { logger } from './lib/logger.js';
import { hasApiKey, search } from './lib/perplexity.js';
import { searchDDG } from './lib/duckduckgo.js';
import { retryWithBackoff, isTransientError, isDDGTransientError } from './lib/retry.js';
import type { SearchResult } from './types.js';

async function main(): Promise<void> {
  try {
    const parsed = await readStdin(WebSearchInputSchema);
    logger.info(`Searching for: ${parsed.query}`);

    let results: SearchResult[];
    let provider: string;

    if (hasApiKey()) {
      // Primary: Perplexity with retries
      try {
        const pplxResult = await retryWithBackoff(
          () => search(parsed.query),
          isTransientError,
        );
        results = pplxResult.results;
        provider = 'perplexity';
        logger.debug(`Perplexity content: ${pplxResult.content}`);
      } catch (pplxErr) {
        const pplxErrorMsg = pplxErr instanceof Error ? pplxErr.message : String(pplxErr);
        logger.debug(`Perplexity failed, falling back to DDG: ${pplxErrorMsg}`);

        // Fallback: DDG with retries
        try {
          results = await retryWithBackoff(
            () => searchDDG(parsed.query),
            isDDGTransientError,
          );
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
      results = await retryWithBackoff(
        () => searchDDG(parsed.query),
        isDDGTransientError,
      );
      provider = 'duckduckgo';
    }

    process.stdout.write(formatSearchResults(results, provider));
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
