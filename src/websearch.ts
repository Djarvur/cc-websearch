import { readStdin, WebSearchInputSchema, validateDomainExclusivity } from './lib/input.js';
import { formatSearchResults } from './lib/output.js';
import { createLogger } from './lib/logger.js';
import type { LogLevel } from './lib/logger.js';
import { loadConfig } from './lib/config.js';
import { searchDDG } from './lib/duckduckgo.js';
import { retryWithBackoff, getRetryConfig, isDDGTransientError } from './lib/retry.js';
import { filterByDomains } from './lib/filter.js';
import * as ddgModule from './lib/duckduckgo.js';
import * as retryModule from './lib/retry.js';
import * as fetchModule from './lib/fetch.js';

function configureModuleLoggers(level: LogLevel): void {
  ddgModule.configureLogger(level);
  retryModule.configureLogger(level);
  fetchModule.configureLogger(level);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('websearch', config.logging.level);
  configureModuleLoggers(config.logging.level);

  try {
    const parsed = await readStdin(WebSearchInputSchema);
    logger.info(`Searching for: ${parsed.query}`);
    validateDomainExclusivity(parsed);

    const results = await retryWithBackoff(
      () => searchDDG(parsed.query),
      isDDGTransientError,
      getRetryConfig(config),
    );
    const filtered = filterByDomains(results, parsed.allowed_domains, parsed.blocked_domains);
    process.stdout.write(formatSearchResults(filtered));
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
