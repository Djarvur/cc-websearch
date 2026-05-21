import { describe, it, expect } from 'vitest';
import { formatSearchResults } from '../src/lib/output.js';

describe('formatSearchResults', () => {
  it('should return empty XML for empty results array', () => {
    const result = formatSearchResults([]);
    expect(result).toBe('<search_results>\n</search_results>');
  });

  it('should produce valid XML with result, title, url, snippet tags for single result', () => {
    const result = formatSearchResults([
      { title: 'Test Page', url: 'https://example.com', snippet: 'A test page' },
    ]);
    expect(result).toContain('<result>');
    expect(result).toContain('<title>Test Page</title>');
    expect(result).toContain('<url>https://example.com</url>');
    expect(result).toContain('<snippet>A test page</snippet>');
    expect(result).toContain('</result>');
    expect(result).toContain('<search_results>');
    expect(result).toContain('</search_results>');
  });

  it('should escape XML entities in title, URL, and snippet', () => {
    const result = formatSearchResults([
      {
        title: 'A & B < C > D "E"',
        url: 'https://example.com?q=1&b=2',
        snippet: 'foo & bar < baz',
      },
    ]);
    expect(result).toContain('<title>A &amp; B &lt; C &gt; D &quot;E&quot;</title>');
    expect(result).toContain('<url>https://example.com?q=1&amp;b=2</url>');
    expect(result).toContain('<snippet>foo &amp; bar &lt; baz</snippet>');
  });

  it('should produce correct multi-element output for multiple results', () => {
    const result = formatSearchResults([
      { title: 'First', url: 'https://first.com', snippet: 'first snippet' },
      { title: 'Second', url: 'https://second.com', snippet: 'second snippet' },
    ]);
    expect(result).toContain('<title>First</title>');
    expect(result).toContain('<title>Second</title>');
    expect(result).toContain('<url>https://first.com</url>');
    expect(result).toContain('<url>https://second.com</url>');
    expect(result).toContain('<snippet>first snippet</snippet>');
    expect(result).toContain('<snippet>second snippet</snippet>');
    // Count result tags
    const resultCount = (result.match(/<result>/g) || []).length;
    expect(resultCount).toBe(2);
  });

  it('should always include snippet tag even when snippet is undefined', () => {
    const result = formatSearchResults([{ title: 'Test', url: 'https://example.com' }]);
    expect(result).toContain('<snippet></snippet>');
  });

  it('should include snippet tag with empty content when snippet is empty string', () => {
    const result = formatSearchResults([
      { title: 'Test', url: 'https://example.com', snippet: '' },
    ]);
    expect(result).toContain('<snippet></snippet>');
  });

  it('should place snippet tag between url and result closing tag', () => {
    const result = formatSearchResults([
      { title: 'Test', url: 'https://example.com', snippet: 'test snippet' },
    ]);
    const urlIdx = result.indexOf('<url>');
    const snippetIdx = result.indexOf('<snippet>');
    const resultCloseIdx = result.indexOf('</result>');
    expect(snippetIdx).toBeGreaterThan(urlIdx);
    expect(snippetIdx).toBeLessThan(resultCloseIdx);
  });

  it('should NOT include provider comment', () => {
    const result = formatSearchResults([{ title: 'Test', url: 'https://example.com' }]);
    expect(result).not.toContain('<!-- provider:');
  });
});
