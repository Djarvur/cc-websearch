import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/lib/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  })),
}));

// Helper to build DDG Lite result rows
function resultRows(items: Array<{ title: string; url: string; snippet: string }>): string {
  return items
    .map(
      (item, i) => `
            <tr>
              <td valign="top">${i + 1}.&nbsp;</td>
              <td>
                <a rel="nofollow" href="//duckduckgo.com/l/?uddg=${encodeURIComponent(item.url)}&amp;rut=xxx" class="result-link">${item.title}</a>
              </td>
            </tr>
            <tr>
              <td>&nbsp;&nbsp;&nbsp;</td>
              <td class="result-snippet">${item.snippet}</td>
            </tr>
            <tr>
              <td>&nbsp;&nbsp;&nbsp;</td>
              <td><span class="link-text">${item.url.replace(/^https?:\/\//, '')}</span></td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>`,
    )
    .join('');
}

function buildLitePage(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><title>DuckDuckGo</title></head><body>${bodyHtml}</body></html>`;
}

describe('searchDDG', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should return mapped title+URL+snippet results from DDG Lite HTML', async () => {
    const html = buildLitePage(
      `<table>${resultRows([
        { title: 'Result 1', url: 'https://example.com/1', snippet: 'desc 1' },
        { title: 'Result 2', url: 'https://example.com/2', snippet: 'desc 2' },
      ])}</table>`,
    );
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('test query');

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'Result 1',
      url: 'https://example.com/1',
      snippet: 'desc 1',
    });
    expect(results[1]).toEqual({
      title: 'Result 2',
      url: 'https://example.com/2',
      snippet: 'desc 2',
    });
  });

  it('should make request to DDG Lite with encoded query', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(buildLitePage('')),
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    await searchDDG('my search terms');

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe('https://lite.duckduckgo.com/lite/?q=my%20search%20terms');
  });

  it('should return empty array when no results found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(buildLitePage('<p>No results</p>')),
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('obscure query with no results');

    expect(results).toEqual([]);
  });

  it('should propagate fetch errors', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const { searchDDG } = await import('../src/lib/duckduckgo.js');

    await expect(searchDDG('test query')).rejects.toThrow('ECONNREFUSED');
  });

  it('should propagate non-OK HTTP status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');

    await expect(searchDDG('test query')).rejects.toThrow(
      'DDG Lite returned HTTP 503: Service Unavailable',
    );
  });

  it('should strip HTML tags from snippet text', async () => {
    const html = buildLitePage(
      `<table>${resultRows([
        { title: 'Result', url: 'https://example.com', snippet: 'This is a <b>bold</b> term' },
      ])}</table>`,
    );
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('test query');

    // cheerio.text() strips HTML tags, so snippet is plain text
    expect(results[0].snippet).toBe('This is a bold term');
  });

  it('should return empty string for snippet when snippet td is empty', async () => {
    const html = buildLitePage(
      `<table>${resultRows([
        { title: 'Result', url: 'https://example.com', snippet: '' },
      ])}</table>`,
    );
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('test query');

    expect(results[0].snippet).toBe('');
  });

  it('should handle DDG anomaly detection block', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('DDG.deep.anomalyDetectionBlock'),
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');

    await expect(searchDDG('test query')).rejects.toThrow('DDG detected an anomaly in the request');
  });

  it('should use the correct User-Agent header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(buildLitePage('')),
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    await searchDDG('test');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['User-Agent']).toMatch(/Mozilla\/5.0/);
  });
});
