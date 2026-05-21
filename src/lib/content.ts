import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const MAX_CONTENT_SIZE = 100_000; // ~100KB, matching Claude Code behavior (D-06)

// Initialize Turndown with GFM support (RESEARCH Pitfall 7)
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.use(gfm);

/**
 * Extract markdown from HTML content.
 * Uses Readability for article extraction, falls back to raw Turndown on full HTML (D-13).
 * Truncates output exceeding MAX_CONTENT_SIZE (D-06).
 */
export function extractMarkdown(html: string, url: string): string {
  // Create DOM with URL for relative URL resolution (RESEARCH Pitfall 3)
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // Try Readability first
  const reader = new Readability(document);
  const article = reader.parse();

  let markdown: string;

  if (article && article.content) {
    // D-13: Readability succeeded -- convert article HTML
    markdown = turndown.turndown(article.content);
  } else {
    // D-13: Null fallback -- raw Turndown on full HTML
    markdown = turndown.turndown(html);
  }

  // Truncate if needed (D-06)
  if (markdown.length > MAX_CONTENT_SIZE) {
    markdown = markdown.slice(0, MAX_CONTENT_SIZE) + '\n\n[... content truncated ...]';
  }

  return markdown;
}
