import { readStdin, WebFetchInputSchema } from './lib/input.js';
import { createLogger } from './lib/logger.js';
import type { LogLevel } from './lib/logger.js';
import { loadConfig } from './lib/config.js';
import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError } from './lib/fetch.js';
import { extractMarkdown } from './lib/content.js';
import * as fetchModule from './lib/fetch.js';

function configureModuleLoggers(level: LogLevel): void {
  fetchModule.configureLogger(level);
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

    const html = await response.text();
    const markdown = extractMarkdown(html, finalUrl.href);
    process.stdout.write(markdown);
  } catch (err) {
    if (err instanceof CrossHostRedirectError) {
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
