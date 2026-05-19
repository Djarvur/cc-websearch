import { readStdin, WebSearchInputSchema } from './lib/input.js';
import { formatSearchResults } from './lib/output.js';
import { logger } from './lib/logger.js';
import { search } from './lib/perplexity.js';

async function main(): Promise<void> {
  try {
    const parsed = await readStdin(WebSearchInputSchema);
    logger.info(`Searching for: ${parsed.query}`);

    const { results, content } = await search(parsed.query);

    logger.debug(`Perplexity content: ${content}`);

    process.stdout.write(formatSearchResults(results));
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
