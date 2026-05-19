import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies before importing the module under test
const mockSearch = vi.fn();
const mockStdinData = { data: '{"query":"test query"}', done: false };

vi.mock('../src/lib/perplexity.js', () => ({
  search: mockSearch,
  getApiKey: vi.fn().mockReturnValue('test-key'),
}));

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn((msg: string) => process.stderr.write(`[debug] ${msg}\n`)),
    info: vi.fn((msg: string) => process.stderr.write(`[info] ${msg}\n`)),
    warn: vi.fn((msg: string) => process.stderr.write(`[warn] ${msg}\n`)),
    error: vi.fn((msg: string) => process.stderr.write(`[error] ${msg}\n`)),
  },
}));

// Mock input module to control what readStdin returns
const mockReadStdin = vi.fn();

vi.mock('../src/lib/input.js', () => ({
  readStdin: (...args: any[]) => mockReadStdin(...args),
  WebSearchInputSchema: {},
}));

vi.mock('../src/lib/output.js', () => ({
  formatSearchResults: vi.fn((results: any[]) => {
    // Simple XML format matching the real implementation
    const lines = ['<search_results>'];
    for (const r of results) {
      lines.push('  <result>');
      lines.push(`    <title>${r.title}</title>`);
      lines.push(`    <url>${r.url}</url>`);
      lines.push('  </result>');
    }
    lines.push('</search_results>');
    return lines.join('\n');
  }),
}));

describe('WebSearch entry point', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv('PPLX_API_KEY', 'test-key');
    vi.stubEnv('PPLX_MODEL', '');
    vi.resetModules();
    mockSearch.mockReset();
    mockReadStdin.mockReset();
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should produce XML stdout with search results for valid JSON stdin', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockSearch.mockResolvedValue({
      results: [{ title: 'Test Result', url: 'https://example.com' }],
      content: 'test content',
    });

    await import('../src/websearch.js');

    // Wait for async main to complete
    await new Promise((r) => setTimeout(r, 50));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).toContain('<search_results>');
    expect(stdoutOutput).toContain('<title>Test Result</title>');
    expect(stdoutOutput).toContain('<url>https://example.com</url>');
    expect(stdoutOutput).toContain('</search_results>');
  });

  it('should write error to stderr for invalid JSON (missing query)', async () => {
    mockReadStdin.mockRejectedValue(new Error('Query must be at least 2 characters'));

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 50));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/\[error\]/);
  });

  it('should write validation error to stderr for query too short', async () => {
    mockReadStdin.mockRejectedValue(new Error('Query must be at least 2 characters'));

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 50));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/\[error\]/);
    expect(stderrOutput).toContain('Query must be at least 2 characters');
  });

  it('should write error to stderr on network error from Perplexity', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockSearch.mockRejectedValue(new Error('Network error: connection refused'));

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 50));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/\[error\]/);
    expect(stderrOutput).toContain('Network error');
  });
});
