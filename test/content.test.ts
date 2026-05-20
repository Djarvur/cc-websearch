import { describe, it, expect } from 'vitest';
import { extractMarkdown } from '../src/lib/content.js';

// Generate article-like HTML with enough text to pass Readability's charThreshold (500)
function makeArticleHtml(bodyContent: string, title = 'Test Article'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><title>${title}</title></head>
<body>
  <article>
    <h1>${title}</h1>
    <p>${bodyContent}</p>
  </article>
</body>
</html>`;
}

// Generate non-article HTML that will cause Readability to return null
// (nav-heavy, short content, mostly scripts/nav tags)
function makeNonArticleHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><title>Page</title><script>var x = 1;</script></head>
<body>
  <nav><a href="/home">Home</a><a href="/about">About</a></nav>
  <div class="sidebar"><a href="/link1">Link 1</a></div>
  <footer><a href="/privacy">Privacy</a></footer>
</body>
</html>`;
}

describe('extractMarkdown', () => {
  it('should produce markdown containing article text from article-like HTML', () => {
    const articleText = 'This is a substantial article about web development. '.repeat(15);
    const html = makeArticleHtml(articleText);
    const result = extractMarkdown(html, 'https://example.com/article');

    expect(result).toContain('substantial article');
    // Readability extracts article body content; h1 is moved to article.title
    // and excluded from article.content. Verify body text is present.
    expect(result.length).toBeGreaterThan(0);
  });

  it('should fall back to raw Turndown on full HTML when Readability returns null (D-13)', () => {
    const html = makeNonArticleHtml();
    const result = extractMarkdown(html, 'https://example.com/nav-page');

    // Should NOT be empty -- raw Turndown on full HTML should produce content
    expect(result.length).toBeGreaterThan(0);
    // Should contain elements from the full HTML (nav links, etc.)
    expect(result).toContain('Home');
    expect(result).toContain('About');
  });

  it('should truncate content exceeding 100KB with marker (D-06)', () => {
    // Create HTML with a very large body (> 100KB of text)
    const hugeContent = 'A'.repeat(150_000);
    const html = makeArticleHtml(hugeContent);
    const result = extractMarkdown(html, 'https://example.com/huge');

    expect(result.length).toBeLessThanOrEqual(100_000 + '\n\n[... content truncated ...]'.length);
    expect(result).toContain('[... content truncated ...]');
    // Marker should be at the end
    expect(result.endsWith('[... content truncated ...]')).toBe(true);
  });

  it('should NOT truncate content under 100KB', () => {
    const articleText = 'This is a normal article with moderate content. '.repeat(10);
    const html = makeArticleHtml(articleText);
    const result = extractMarkdown(html, 'https://example.com/normal');

    expect(result).not.toContain('[... content truncated ...]');
  });

  it('should produce ATX headings (# style, not setext underlines)', () => {
    const articleText = 'Content paragraph with enough text for Readability to work properly. '.repeat(15);
    const html = `<!DOCTYPE html>
<html lang="en">
<head><title>ATX Test</title></head>
<body>
  <article>
    <h1>Main Title</h1>
    <h2>Section Two</h2>
    <h3>Subsection</h3>
    <p>${articleText}</p>
  </article>
</body>
</html>`;
    const result = extractMarkdown(html, 'https://example.com/headings');

    expect(result).toContain('# Main Title');
    expect(result).toContain('## Section Two');
    expect(result).toContain('### Subsection');
  });

  it('should produce fenced code blocks (triple backtick style)', () => {
    const articleText = 'Article body with enough text to satisfy Readability requirements. '.repeat(15);
    const html = `<!DOCTYPE html>
<html lang="en">
<head><title>Code Test</title></head>
<body>
  <article>
    <h1>Code Example</h1>
    <p>${articleText}</p>
    <pre><code>const x = 42;
console.log(x);</code></pre>
  </article>
</body>
</html>`;
    const result = extractMarkdown(html, 'https://example.com/code');

    expect(result).toContain('```');
    expect(result).toContain('const x = 42');
  });

  it('should convert GFM tables (not lose them)', () => {
    const articleText = 'Article with a data table for further reading and analysis. '.repeat(15);
    const html = `<!DOCTYPE html>
<html lang="en">
<head><title>Table Test</title></head>
<body>
  <article>
    <h1>Data Table</h1>
    <p>${articleText}</p>
    <table>
      <thead>
        <tr><th>Name</th><th>Value</th></tr>
      </thead>
      <tbody>
        <tr><td>alpha</td><td>100</td></tr>
        <tr><td>beta</td><td>200</td></tr>
      </tbody>
    </table>
  </article>
</body>
</html>`;
    const result = extractMarkdown(html, 'https://example.com/table');

    // Table should be preserved in markdown (pipe characters)
    expect(result).toContain('Name');
    expect(result).toContain('alpha');
    expect(result).toContain('beta');
    // Should have pipe-based table format
    expect(result).toContain('|');
  });
});
