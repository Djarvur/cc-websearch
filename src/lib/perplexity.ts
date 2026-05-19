import Perplexity from '@perplexity-ai/perplexity_ai';
import { logger } from './logger.js';

export function getApiKey(): string {
  const pplxKey = process.env.PPLX_API_KEY;
  const perpKey = process.env.PERPLEXITY_API_KEY;

  if (pplxKey) {
    logger.debug('Using API key from PPLX_API_KEY');
    return pplxKey;
  }

  if (perpKey) {
    logger.debug('Using API key from PERPLEXITY_API_KEY');
    return perpKey;
  }

  throw new Error('No API key found. Set PPLX_API_KEY or PERPLEXITY_API_KEY environment variable.');
}

export async function search(query: string): Promise<{
  results: Array<{ title: string; url: string }>;
  content: string;
}> {
  const apiKey = getApiKey();
  const model = process.env.PPLX_MODEL || 'sonar';

  const client = new Perplexity({ apiKey });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: query }],
  });

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
