import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('IO separation', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv('PPLX_API_KEY', 'test-key');
    vi.stubEnv('PPLX_MODEL', '');
    vi.stubEnv('LOG_LEVEL', 'debug');
    vi.resetModules();
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should have stdout contain only XML (no log messages)', async () => {
    const mockStdin = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return Promise.resolve({ value: Buffer.from('{"query":"test query"}'), done: false });
      },
    };

    vi.doMock('../src/lib/perplexity.js', () => ({
      search: vi.fn().mockResolvedValue({
        results: [{ title: 'Result', url: 'https://example.com' }],
        content: 'content',
      }),
    }));

    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true, configurable: true });

    try {
      await import('../src/websearch.js');
      await new Promise((r) => setTimeout(r, 100));

      const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');

      // stdout should only contain XML
      expect(stdoutOutput).toMatch(/^<search_results>/);
      // stdout should NOT contain log-level prefixes
      expect(stdoutOutput).not.toMatch(/\[(debug|info|warn|error)\]/);
    } finally {
      Object.defineProperty(process, 'stdin', { value: process.stdin, writable: true, configurable: true });
    }
  });

  it('should have stderr contain log messages (no XML)', async () => {
    const mockStdin = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return Promise.resolve({ value: Buffer.from('{"query":"test query"}'), done: false });
      },
    };

    vi.doMock('../src/lib/perplexity.js', () => ({
      search: vi.fn().mockResolvedValue({
        results: [{ title: 'Result', url: 'https://example.com' }],
        content: 'content',
      }),
    }));

    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true, configurable: true });

    try {
      await import('../src/websearch.js');
      await new Promise((r) => setTimeout(r, 100));

      const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');

      // stderr should contain log messages
      expect(stderrOutput).toMatch(/\[(debug|info|warn|error)\]/);
      // stderr should NOT contain XML tags
      expect(stderrOutput).not.toContain('<search_results>');
      expect(stderrOutput).not.toContain('<result>');
    } finally {
      Object.defineProperty(process, 'stdin', { value: process.stdin, writable: true, configurable: true });
    }
  });

  it('should write to stderr only on error case (stdout empty or clean)', async () => {
    const mockStdin = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return Promise.resolve({ value: Buffer.from('{"query":"test query"}'), done: false });
      },
    };

    vi.doMock('../src/lib/perplexity.js', () => ({
      search: vi.fn().mockRejectedValue(new Error('API failure')),
    }));

    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true, configurable: true });

    try {
      await import('../src/websearch.js');
      await new Promise((r) => setTimeout(r, 100));

      const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
      const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');

      // Error goes to stderr
      expect(stderrOutput).toContain('[error]');
      expect(stderrOutput).toContain('API failure');

      // stdout should not contain error messages
      expect(stdoutOutput).not.toContain('API failure');
    } finally {
      Object.defineProperty(process, 'stdin', { value: process.stdin, writable: true, configurable: true });
    }
  });
});
