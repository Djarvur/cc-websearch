import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock provider modules
const mockSearchDDG = vi.fn();
const mockRetryWithBackoff = vi.fn();

vi.mock('../src/lib/fetch.js', () => ({
  fetchWithRedirects: vi.fn(),
  normalizeUrl: vi.fn((u: string) => u),
  CrossHostRedirectError: class extends Error {},
  configureLogger: vi.fn(),
}));

vi.mock('../src/lib/duckduckgo.js', () => ({
  searchDDG: (...args: any[]) => mockSearchDDG(...args),
  configureLogger: vi.fn(),
}));

vi.mock('../src/lib/retry.js', () => ({
  retryWithBackoff: (...args: any[]) => mockRetryWithBackoff(...args),
  getRetryConfig: vi.fn(() => ({ maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 })),
  isDDGTransientError: vi.fn(),
  configureLogger: vi.fn(),
}));

vi.mock('../src/lib/config.js', () => ({
  loadConfig: vi.fn(() => ({
    retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
    logging: { level: 'info' },
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

// Mock input module
const mockReadStdin = vi.fn();
const mockValidateDomainExclusivity = vi.fn();

vi.mock('../src/lib/input.js', () => ({
  readStdin: (...args: any[]) => mockReadStdin(...args),
  WebSearchInputSchema: {},
  validateDomainExclusivity: (...args: any[]) => mockValidateDomainExclusivity(...args),
}));

// Mock filter module
const mockFilterByDomains = vi.fn();

vi.mock('../src/lib/filter.js', () => ({
  filterByDomains: (...args: any[]) => mockFilterByDomains(...args),
}));

// Mock output module - single provider, no provider comment
let capturedResults: any[] = [];
vi.mock('../src/lib/output.js', () => ({
  formatSearchResults: vi.fn((results: any[]) => {
    capturedResults = results;
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

describe('WebSearch single-provider DDG flow', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    mockSearchDDG.mockReset();
    mockRetryWithBackoff.mockReset();
    mockReadStdin.mockReset();
    mockValidateDomainExclusivity.mockReset();
    mockFilterByDomains.mockReset();
    capturedResults = [];
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should search DDG and output results', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    // retryWithBackoff delegates to the DDG search function
    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());

    mockSearchDDG.mockResolvedValue([
      { title: 'DDG Result', url: 'https://ddg.example.com', snippet: 'A result' },
    ]);

    // filterByDomains passes through when no domains
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    // DDG should be called through retryWithBackoff
    expect(mockRetryWithBackoff).toHaveBeenCalled();
    expect(mockSearchDDG).toHaveBeenCalledWith('test query');

    // Output should NOT contain provider comment
    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).not.toContain('<!-- provider:');
    expect(stdoutOutput).toContain('<search_results>');
  });

  it('should exit with error when DDG search fails', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    mockRetryWithBackoff.mockRejectedValue(new Error('DDG search failed'));

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/\[error\]/);
    expect(process.exitCode).toBe(1);
  });

  it('should call validateDomainExclusivity with parsed input', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query', allowed_domains: ['github.com'] });

    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSearchDDG.mockResolvedValue([{ title: 'GH', url: 'https://github.com/test', snippet: '' }]);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockValidateDomainExclusivity).toHaveBeenCalledWith({
      query: 'test query',
      allowed_domains: ['github.com'],
    });
  });

  it('should exit with error when both allowed and blocked domains provided (SRCH-03)', async () => {
    mockReadStdin.mockResolvedValue({
      query: 'test query',
      allowed_domains: ['github.com'],
      blocked_domains: ['reddit.com'],
    });

    // validateDomainExclusivity throws
    mockValidateDomainExclusivity.mockImplementation(() => {
      throw new Error('Cannot specify both allowed_domains and blocked_domains in the same request.');
    });

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/Cannot specify both allowed_domains and blocked_domains/);
    expect(process.exitCode).toBe(1);
  });

  it('should apply filterByDomains to DDG results', async () => {
    mockReadStdin.mockResolvedValue({ query: 'test query', blocked_domains: ['spam.com'] });

    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSearchDDG.mockResolvedValue([
      { title: 'Good', url: 'https://good.com/page', snippet: 'good' },
      { title: 'Spam', url: 'https://spam.com/page', snippet: 'spam' },
    ]);

    mockFilterByDomains.mockImplementation((results: any[]) =>
      results.filter((r: any) => !r.url.includes('spam.com')),
    );

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockFilterByDomains).toHaveBeenCalled();
    expect(capturedResults).toHaveLength(1);
    expect(capturedResults[0].title).toBe('Good');
  });
});
