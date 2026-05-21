import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock provider modules
const mockSearchDDG = vi.fn();

vi.mock('../src/lib/duckduckgo.js', () => ({
  searchDDG: (...args: any[]) => mockSearchDDG(...args),
  configureLogger: vi.fn(),
}));

vi.mock('../src/lib/retry.js', () => ({
  retryWithBackoff: (fn: () => Promise<any>) => fn(),
  getRetryConfig: vi.fn(() => ({ maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 })),
  isDDGTransientError: vi.fn(),
  configureLogger: vi.fn(),
}));

vi.mock('../src/lib/config.js', () => ({
  loadConfig: vi.fn(() => ({
    retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
    logging: { level: 'debug' },
  })),
}));

vi.mock('../src/lib/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn((msg: string) => process.stderr.write(`[debug] ${msg}\n`)),
    info: vi.fn((msg: string) => process.stderr.write(`[info] ${msg}\n`)),
    warn: vi.fn((msg: string) => process.stderr.write(`[warn] ${msg}\n`)),
    error: vi.fn((msg: string) => process.stderr.write(`[error] ${msg}\n`)),
    setLevel: vi.fn(),
  })),
}));

const mockReadStdin = vi.fn();

vi.mock('../src/lib/input.js', () => ({
  readStdin: (...args: any[]) => mockReadStdin(...args),
  WebSearchInputSchema: {},
  validateDomainExclusivity: vi.fn(),
}));

vi.mock('../src/lib/filter.js', () => ({
  filterByDomains: vi.fn((results: any[]) => results),
}));

vi.mock('../src/lib/fetch.js', () => ({
  fetchWithRedirects: vi.fn(),
  normalizeUrl: vi.fn((u: string) => u),
  CrossHostRedirectError: class extends Error {},
  configureLogger: vi.fn(),
}));

vi.mock('../src/lib/output.js', () => ({
  formatSearchResults: vi.fn((results: any[]) => {
    const lines: string[] = [];
    lines.push('<search_results>');
    for (const r of results) {
      lines.push('  <result>');
      lines.push(`    <title>${r.title}</title>`);
      lines.push(`    <url>${r.url}</url>`);
      lines.push(`    <snippet>${r.snippet ?? ''}</snippet>`);
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
    vi.resetModules();
    mockSearchDDG.mockReset();
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
    mockSearchDDG.mockResolvedValue([
      { title: 'Result', url: 'https://example.com', snippet: 'test' },
    ]);

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
    mockSearchDDG.mockResolvedValue([
      { title: 'Result', url: 'https://example.com', snippet: 'test' },
    ]);

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
    mockSearchDDG.mockRejectedValue(new Error('DDG failure'));

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 50));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');

    // Error goes to stderr
    expect(stderrOutput).toContain('[error]');
    expect(stderrOutput).toContain('DDG failure');

    // stdout should not contain error messages
    expect(stdoutOutput).not.toContain('DDG failure');
  });
});
