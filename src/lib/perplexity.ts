import Perplexity from '@perplexity-ai/perplexity_ai';
import { createLogger } from './logger.js';
import type { ResolvedConfig } from './config.js';

const logger = createLogger('perplexity');

export function getApiKey(config: ResolvedConfig): string {
  if (config.perplexity.apiKey) {
    logger.debug('Using API key from config');
    return config.perplexity.apiKey;
  }

  throw new Error('No API key found. Set WEBSEARCH_PERPLEXITY_API_KEY or add apiKey to config file.');
}

export function hasApiKey(config: ResolvedConfig): boolean {
  return !!config.perplexity.apiKey;
}

export async function search(query: string, config: ResolvedConfig, domainFilter?: string[]): Promise<{
  results: Array<{ title: string; url: string }>;
  content: string;
}> {
  const apiKey = getApiKey(config);
  const model = config.perplexity.model;

  const client = new Perplexity({ apiKey });

  const params: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: query }],
  };

  if (domainFilter && domainFilter.length > 0) {
    params.search_domain_filter = domainFilter;
  }

  const response = await client.chat.completions.create(params);

  // Extract results from search_results array (preferred)
  const searchResults = (response as any).search_results;
  let results: Array<{ title: string; url: string }>;

  if (searchResults && searchResults.length > 0) {
    results = searchResults.map((r: any) => ({
      title: r.title || r.url,
      url: r.url,
    }));
    logger.debug(`Extracted ${results.length} results from search_results array`);
  } else if (response.citations && response.citations.length > 0) {
    // Fallback to citations array (URLs only, use URL as title)
    results = response.citations.map((url: string) => ({
      title: url,
      url,
    }));
    logger.debug(`Extracted ${results.length} results from citations array (fallback)`);
  } else {
    results = [];
    logger.debug('No search_results or citations found in response');
  }

  const content = response.choices?.[0]?.message?.content ?? '';

  return { results, content };
}

/**
 * Summarize content using Perplexity Chat Completions with disable_search: true.
 * User prompt is sent as system instruction, content as user message (D-05).
 * Returns raw answer text with citations naturally embedded (D-02, D-03).
 */
export async function summarize(content: string, userPrompt: string, config: ResolvedConfig): Promise<string> {
  const apiKey = getApiKey(config);
  const model = config.perplexity.model;

  const client = new Perplexity({ apiKey });

  const response = await client.chat.completions.create({
    model,
    disable_search: true, // Prevent web search -- summarize provided content (D-04)
    messages: [
      {
        role: 'system',
        content: userPrompt, // D-05: user's prompt as system instruction
      },
      {
        role: 'user',
        content: content, // D-05: page content as user message
      },
    ],
  });

  return response.choices?.[0]?.message?.content ?? ''; // D-03: raw answer text
}
