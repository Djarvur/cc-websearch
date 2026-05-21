import * as cheerio from 'cheerio';
import type { SearchResult } from '../types.js';
import { createLogger } from './logger.js';
import type { LogLevel } from './logger.js';

const logger = createLogger('ddg');

const DDG_LITE_URL = 'https://lite.duckduckgo.com/lite/';

// Standard browser user-agent for DDG Lite requests
const FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

export function configureLogger(level: LogLevel): void {
  logger.setLevel(level);
}

/**
 * Extract the actual URL from a DDG redirect URL.
 * DDG Lite wraps result links: //duckduckgo.com/l/?uddg=<encoded_url>&rut=...
 */
function extractUrlFromDdgRedirect(href: string): string {
  try {
    // Handle protocol-relative URLs (//duckduckgo.com/l/?uddg=...)
    const fullHref = href.startsWith('//') ? `https:${href}` : href;
    const parsed = new URL(fullHref);
    const uddg = parsed.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    return fullHref;
  } catch {
    return href;
  }
}

export async function searchDDG(query: string): Promise<SearchResult[]> {
  const url = `${DDG_LITE_URL}?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, { headers: FETCH_HEADERS });
  if (!response.ok) {
    throw new Error(`DDG Lite returned HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  if (html.includes('DDG.deep.anomalyDetectionBlock')) {
    throw new Error('DDG detected an anomaly in the request, you are likely making requests too quickly.');
  }

  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $('a.result-link').each((_i, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr('href') || '';
    const resultUrl = extractUrlFromDdgRedirect(href);

    // Snippet is in the next <tr> after the result link's parent row
    let snippet = '';
    const parentTr = $(el).closest('tr');
    const snippetTr = parentTr.next('tr');
    const snippetTd = snippetTr.find('td.result-snippet');
    if (snippetTd.length) {
      snippet = snippetTd.text().trim();
    }

    if (title && resultUrl) {
      results.push({ title, url: resultUrl, snippet });
    }
  });

  if (results.length === 0) {
    logger.debug('DDG Lite returned no results');
  }

  return results;
}
