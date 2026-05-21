import type { SearchResult } from '../types.js';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatSearchResults(results: SearchResult[]): string {
  const lines: string[] = [];
  lines.push('<search_results>');
  for (const result of results) {
    lines.push('  <result>');
    lines.push(`    <title>${escapeXml(result.title)}</title>`);
    lines.push(`    <url>${escapeXml(result.url)}</url>`);
    lines.push(`    <snippet>${escapeXml(result.snippet ?? '')}</snippet>`);
    lines.push('  </result>');
  }
  lines.push('</search_results>');
  return lines.join('\n');
}
