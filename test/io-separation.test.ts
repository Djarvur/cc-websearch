import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
const mockSearch = vi.fn();

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

const mockReadStdin = vi.fn();

vi.mock('../src/lib/input.js', () => ({
  readStdin: (...args: any[]) => mockReadStdin(...args),
  WebSearchInputSchema: {},
}));

vi.mock('../src/lib/output.js', () => ({
  formatSearchResults: vi.fn((results: any[]) => {
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

describe('IO separation', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv('PPLX_API_KEY', 'test-key');
    vi.stubEnv('PPLX_MODEL', '');
    vi.stubEnv('LOG_LEVEL', 'debug');
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

  it('should have stdout contain only XML (no log messages)', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockSearch.mockResolvedValue({
      results: [{ title: 'Result', url: 'https://example.com' }],
      content: 'content',
    });

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 50));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');

    // stdout should start with XML
    expect(stdoutOutput).toContain('<search_results>');
    // stdout should NOT contain log-level prefixes
    expect(stdoutOutput).not.toMatch(/\[(debug|info|warn|error)\]/);
  });

  it('should have stderr contain log messages (no XML)', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockSearch.mockResolvedValue({
      results: [{ title: 'Result', url: 'https://example.com' }],
      content: 'content',
    });

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 50));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');

    // stderr should contain log messages
    expect(stderrOutput).toMatch(/\[(debug|info|warn|error)\]/);
    // stderr should NOT contain XML tags
    expect(stderrOutput).not.toContain('<search_results>');
    expect(stderrOutput).not.toContain('<result>');
  });

  it('should write to stderr only on error case (stdout empty or clean)', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockSearch.mockRejectedValue(new Error('API failure'));

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 50));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');

    // Error goes to stderr
    expect(stderrOutput).toContain('[error]');
    expect(stderrOutput).toContain('API failure');

    // stdout should not contain error messages
    expect(stdoutOutput).not.toContain('API failure');
  });
});
