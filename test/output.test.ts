import { describe, it, expect } from 'vitest';
import { formatSearchResults } from '../src/lib/output.js';

describe('formatSearchResults', () => {
  it('should return empty XML for empty results array', () => {
    const result = formatSearchResults([]);
    expect(result).toBe('<search_results>\n</search_results>');
  });

  it('should produce valid XML with result, title, url tags for single result', () => {
    const result = formatSearchResults([
      { title: 'Test Page', url: 'https://example.com' },
    ]);
    expect(result).toContain('<result>');
    expect(result).toContain('<title>Test Page</title>');
    expect(result).toContain('<url>https://example.com</url>');
    expect(result).toContain('</result>');
    expect(result).toContain('<search_results>');
    expect(result).toContain('</search_results>');
  });

  it('should escape XML entities in title and URL', () => {
    const result = formatSearchResults([
      { title: 'A & B < C > D "E"', url: 'https://example.com?q=1&b=2' },
    ]);
    expect(result).toContain('<title>A &amp; B &lt; C &gt; D &quot;E&quot;</title>');
    expect(result).toContain('<url>https://example.com?q=1&amp;b=2</url>');
  });

  it('should produce correct multi-element output for multiple results', () => {
    const result = formatSearchResults([
      { title: 'First', url: 'https://first.com' },
      { title: 'Second', url: 'https://second.com' },
    ]);
    expect(result).toContain('<title>First</title>');
    expect(result).toContain('<title>Second</title>');
    expect(result).toContain('<url>https://first.com</url>');
    expect(result).toContain('<url>https://second.com</url>');
    // Count result tags
    const resultCount = (result.match(/<result>/g) || []).length;
    expect(resultCount).toBe(2);
  });
});
