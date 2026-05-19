import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fork } from 'node:child_process';
import { resolve } from 'node:path';

describe('WebSearch entry point', () => {
  // Test the main function directly via module import with mocking
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv('PPLX_API_KEY', 'test-key');
    vi.stubEnv('PPLX_MODEL', '');
    vi.resetModules();
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should produce XML stdout with search results for valid JSON stdin', async () => {
    // Mock stdin
    const originalStdin = process.stdin;
    const mockStdin = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return Promise.resolve({ value: Buffer.from('{"query":"test query"}'), done: false });
      },
    };

    // Mock the search module
    vi.doMock('../src/lib/perplexity.js', () => ({
      search: vi.fn().mockResolvedValue({
        results: [
          { title: 'Test Result', url: 'https://example.com' },
        ],
        content: 'test content',
      }),
    }));

    // Override stdin temporarily
    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true, configurable: true });

    try {
      await import('../src/websearch.js');

      // Wait for async main to complete
      await new Promise((r) => setTimeout(r, 100));

      const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
      expect(stdoutOutput).toContain('<search_results>');
      expect(stdoutOutput).toContain('<title>Test Result</title>');
      expect(stdoutOutput).toContain('<url>https://example.com</url>');
      expect(stdoutOutput).toContain('</search_results>');
    } finally {
      // Restore stdin
      Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true, configurable: true });
    }
  });

  it('should write error to stderr for invalid JSON (missing query)', async () => {
    // Mock stdin with missing query
    const mockStdin = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return Promise.resolve({ value: Buffer.from('{}'), done: false });
      },
    };

    vi.doMock('../src/lib/perplexity.js', () => ({
      search: vi.fn(),
    }));

    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true, configurable: true });

    try {
      await import('../src/websearch.js');
      await new Promise((r) => setTimeout(r, 100));

      const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
      expect(stderrOutput).toMatch(/\[(error|warn)\]/);
    } finally {
      Object.defineProperty(process, 'stdin', { value: process.stdin, writable: true, configurable: true });
    }
  });

  it('should write validation error to stderr for query too short', async () => {
    const mockStdin = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return Promise.resolve({ value: Buffer.from('{"query":"a"}'), done: false });
      },
    };

    vi.doMock('../src/lib/perplexity.js', () => ({
      search: vi.fn(),
    }));

    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true, configurable: true });

    try {
      await import('../src/websearch.js');
      await new Promise((r) => setTimeout(r, 100));

      const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
      expect(stderrOutput).toMatch(/\[(error|warn)\]/);
    } finally {
      Object.defineProperty(process, 'stdin', { value: process.stdin, writable: true, configurable: true });
    }
  });

  it('should write error to stderr on network error from Perplexity', async () => {
    const mockStdin = {
      [Symbol.asyncIterator]() {
        return this;
      },
      next() {
        return Promise.resolve({ value: Buffer.from('{"query":"test query"}'), done: false });
      },
    };

    vi.doMock('../src/lib/perplexity.js', () => ({
      search: vi.fn().mockRejectedValue(new Error('Network error: connection refused')),
    }));

    Object.defineProperty(process, 'stdin', { value: mockStdin, writable: true, configurable: true });

    try {
      await import('../src/websearch.js');
      await new Promise((r) => setTimeout(r, 100));

      const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
      expect(stderrOutput).toMatch(/\[error\]/);
      expect(stderrOutput).toContain('Network error');
    } finally {
      Object.defineProperty(process, 'stdin', { value: process.stdin, writable: true, configurable: true });
    }
  });
});
