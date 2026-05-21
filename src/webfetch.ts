import { readStdin, WebFetchInputSchema } from './lib/input.js';
import { createLogger } from './lib/logger.js';
import type { LogLevel } from './lib/logger.js';
import { loadConfig } from './lib/config.js';
import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError } from './lib/fetch.js';
import { extractMarkdown } from './lib/content.js';
import { hasApiKey, summarize } from './lib/perplexity.js';
import { retryWithBackoff, getRetryConfig, isTransientError } from './lib/retry.js';
import * as perplexityModule from './lib/perplexity.js';
import * as fetchModule from './lib/fetch.js';
import * as retryModule from './lib/retry.js';

function configureModuleLoggers(level: LogLevel): void {
  perplexityModule.configureLogger(level);
  fetchModule.configureLogger(level);
  retryModule.configureLogger(level);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('webfetch', config.logging.level);
  configureModuleLoggers(config.logging.level);

  try {
    const input = await readStdin(WebFetchInputSchema);
    logger.info(`Fetching: ${input.url}`);

    const url = normalizeUrl(input.url);

    const { response, finalUrl } = await fetchWithRedirects(url);

    // Extract content from HTML (FTEC-03)
    const html = await response.text();
    const markdown = extractMarkdown(html, finalUrl.href);

    // D-07/D-08: If no API key, return raw markdown
    if (!hasApiKey(config)) {
      process.stdout.write(markdown);
      return;
    }

    // Summarize via Perplexity (FTEC-04)
    const summary = await retryWithBackoff(
      () => summarize(markdown, input.prompt, config),
      isTransientError,
      getRetryConfig(config),
    );
    process.stdout.write(summary);
  } catch (err) {
    if (err instanceof CrossHostRedirectError) {
      // D-10: Cross-host redirect message to stdout
      process.stdout.write(
        `Redirect from ${err.from} to ${err.to} -- cross-host redirect not followed`,
      );
      return;
    }
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
