import type { SearchResult } from '../types.js';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatSearchResults(results: SearchResult[], provider?: string): string {
  const lines: string[] = [];
  if (provider) {
    lines.push(`<!-- provider: ${provider} -->`);
  }
  lines.push('<search_results>');
  for (const result of results) {
    lines.push('  <result>');
    lines.push(`    <title>${escapeXml(result.title)}</title>`);
    lines.push(`    <url>${escapeXml(result.url)}</url>`);
    lines.push('  </result>');
  }
  lines.push('</search_results>');
  return lines.join('\n');
}
