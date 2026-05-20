import { readStdin, WebFetchInputSchema } from './lib/input.js';
import { logger } from './lib/logger.js';
import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError } from './lib/fetch.js';

async function main(): Promise<void> {
  try {
    const input = await readStdin(WebFetchInputSchema);
    logger.info(`Fetching: ${input.url}`);

    const url = normalizeUrl(input.url);

    const { response } = await fetchWithRedirects(url);

    const html = await response.text();
    process.stdout.write(html);
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
