import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('../src/lib/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  })),
}));

describe('fetch module', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // normalizeUrl tests

  describe('normalizeUrl', () => {
    it('should convert http:// to https://', async () => {
      const { normalizeUrl } = await import('../src/lib/fetch.js');
      const url = normalizeUrl('http://example.com/path');
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('example.com');
      expect(url.pathname).toBe('/path');
    });

    it('should leave https:// unchanged', async () => {
      const { normalizeUrl } = await import('../src/lib/fetch.js');
      const url = normalizeUrl('https://example.com/path');
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('example.com');
    });
  });

  // fetchWithRedirects tests

  describe('fetchWithRedirects', () => {
    it('should return response directly when status 200', async () => {
      const mockResponse = new Response('<html>ok</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
      mockFetch.mockResolvedValue(mockResponse);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');
      const result = await fetchWithRedirects(new URL('https://example.com/'));

      expect(result.response).toBe(mockResponse);
      expect(result.finalUrl.href).toBe('https://example.com/');
    });

    it('should follow same-host 301 redirect by resolving Location header', async () => {
      const redirectResponse = new Response(null, {
        status: 301,
        headers: { location: '/new-path' },
      });
      const finalResponse = new Response('<html>ok</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

      mockFetch.mockResolvedValueOnce(redirectResponse).mockResolvedValueOnce(finalResponse);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');
      const result = await fetchWithRedirects(new URL('https://example.com/old'));

      expect(result.response).toBe(finalResponse);
      expect(result.finalUrl.href).toBe('https://example.com/new-path');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should follow chain of same-host redirects (3 hops)', async () => {
      const r1 = new Response(null, { status: 302, headers: { location: '/hop1' } });
      const r2 = new Response(null, { status: 301, headers: { location: '/hop2' } });
      const r3 = new Response(null, { status: 302, headers: { location: '/hop3' } });
      const final = new Response('<html>ok</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });

      mockFetch
        .mockResolvedValueOnce(r1)
        .mockResolvedValueOnce(r2)
        .mockResolvedValueOnce(r3)
        .mockResolvedValueOnce(final);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');
      const result = await fetchWithRedirects(new URL('https://example.com/start'));

      expect(result.response).toBe(final);
      expect(result.finalUrl.href).toBe('https://example.com/hop3');
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should throw CrossHostRedirectError when Location hostname differs', async () => {
      const redirectResponse = new Response(null, {
        status: 301,
        headers: { location: 'https://other.com/page' },
      });
      mockFetch.mockResolvedValue(redirectResponse);

      const { fetchWithRedirects, CrossHostRedirectError } = await import('../src/lib/fetch.js');

      await expect(fetchWithRedirects(new URL('https://example.com/'))).rejects.toThrow(
        CrossHostRedirectError,
      );
    });

    it('should throw error after exceeding maxHops (default 10) same-host redirects', async () => {
      // Return a redirect response for every fetch call (infinite loop)
      const redirectResponse = new Response(null, {
        status: 301,
        headers: { location: '/loop' },
      });
      mockFetch.mockResolvedValue(redirectResponse);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');

      await expect(fetchWithRedirects(new URL('https://example.com/'))).rejects.toThrow(
        /Too many redirects/,
      );
    });

    it('should throw error with HTTP status code for 404 response (D-14)', async () => {
      const errorResponse = new Response('Not Found', { status: 404 });
      mockFetch.mockResolvedValue(errorResponse);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');

      await expect(fetchWithRedirects(new URL('https://example.com/missing'))).rejects.toThrow(
        /HTTP 404/,
      );
    });

    it('should throw error with Content-Type for application/pdf response (D-12/D-15)', async () => {
      const pdfResponse = new Response('binary data', {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      });
      mockFetch.mockResolvedValue(pdfResponse);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');

      await expect(fetchWithRedirects(new URL('https://example.com/doc.pdf'))).rejects.toThrow(
        /application\/pdf/,
      );
    });

    it('should allow text/html and application/xhtml Content-Type through (D-15)', async () => {
      const htmlResponse = new Response('<html>ok</html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
      mockFetch.mockResolvedValue(htmlResponse);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');
      const result = await fetchWithRedirects(new URL('https://example.com/'));

      expect(result.response).toBe(htmlResponse);
    });

    it('should allow application/xhtml Content-Type through (D-15)', async () => {
      const xhtmlResponse = new Response('<html>ok</html>', {
        status: 200,
        headers: { 'content-type': 'application/xhtml+xml' },
      });
      mockFetch.mockResolvedValue(xhtmlResponse);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');
      const result = await fetchWithRedirects(new URL('https://example.com/'));

      expect(result.response).toBe(xhtmlResponse);
    });

    it('should use redirect: manual option for all fetch calls (D-09)', async () => {
      const mockResponse = new Response('<html>ok</html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      });
      mockFetch.mockResolvedValue(mockResponse);

      const { fetchWithRedirects } = await import('../src/lib/fetch.js');
      await fetchWithRedirects(new URL('https://example.com/'));

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/',
        expect.objectContaining({ redirect: 'manual' }),
      );
    });
  });

  // CrossHostRedirectError tests

  describe('CrossHostRedirectError', () => {
    it('should have from and to string properties', async () => {
      const { CrossHostRedirectError } = await import('../src/lib/fetch.js');
      const err = new CrossHostRedirectError('https://a.com/', 'https://b.com/');
      expect(err.from).toBe('https://a.com/');
      expect(err.to).toBe('https://b.com/');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
