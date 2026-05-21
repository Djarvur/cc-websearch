import { search as ddgSearch } from 'duck-duck-scrape';
import type { SearchResult } from '../types.js';
import { createLogger } from './logger.js';
import type { LogLevel } from './logger.js';

const logger = createLogger('ddg');

export function configureLogger(level: LogLevel): void {
  logger.setLevel(level);
}

export async function searchDDG(query: string): Promise<SearchResult[]> {
  const searchResults = await ddgSearch(query);

  if (searchResults.noResults) {
    logger.debug('DDG returned no results');
    return [];
  }

  return searchResults.results.map((r) => ({
    title: r.title,
    url: r.url,
  }));
}
