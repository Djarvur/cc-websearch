import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock provider modules
const mockSearch = vi.fn();
const mockHasApiKey = vi.fn();
const mockSearchDDG = vi.fn();
const mockRetryWithBackoff = vi.fn();

vi.mock('../src/lib/perplexity.js', () => ({
  search: (...args: any[]) => mockSearch(...args),
  hasApiKey: () => mockHasApiKey(),
  getApiKey: vi.fn().mockReturnValue('test-key'),
}));

vi.mock('../src/lib/duckduckgo.js', () => ({
  searchDDG: (...args: any[]) => mockSearchDDG(...args),
}));

vi.mock('../src/lib/retry.js', () => ({
  retryWithBackoff: (...args: any[]) => mockRetryWithBackoff(...args),
  isTransientError: vi.fn(),
  isDDGTransientError: vi.fn(),
}));

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn((msg: string) => process.stderr.write(`[debug] ${msg}\n`)),
    info: vi.fn((msg: string) => process.stderr.write(`[info] ${msg}\n`)),
    warn: vi.fn((msg: string) => process.stderr.write(`[warn] ${msg}\n`)),
    error: vi.fn((msg: string) => process.stderr.write(`[error] ${msg}\n`)),
  },
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
const mockBuildPerplexityDomainFilter = vi.fn();
const mockFilterByDomains = vi.fn();

vi.mock('../src/lib/filter.js', () => ({
  buildPerplexityDomainFilter: (...args: any[]) => mockBuildPerplexityDomainFilter(...args),
  filterByDomains: (...args: any[]) => mockFilterByDomains(...args),
}));

// Mock output module - captures the provider argument
let capturedProvider: string | undefined;
let capturedResults: any[] = [];
vi.mock('../src/lib/output.js', () => ({
  formatSearchResults: vi.fn((results: any[], provider?: string) => {
    capturedResults = results;
    capturedProvider = provider;
    const lines: string[] = [];
    if (provider) {
      lines.push(`<!-- provider: ${provider} -->`);
    }
    lines.push('<search_results>');
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

describe('WebSearch fallback orchestration', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv('PPLX_API_KEY', 'test-key');
    vi.stubEnv('PPLX_MODEL', '');
    vi.resetModules();
    mockSearch.mockReset();
    mockHasApiKey.mockReset();
    mockSearchDDG.mockReset();
    mockRetryWithBackoff.mockReset();
    mockReadStdin.mockReset();
    mockValidateDomainExclusivity.mockReset();
    mockBuildPerplexityDomainFilter.mockReset();
    mockFilterByDomains.mockReset();
    capturedProvider = undefined;
    capturedResults = [];
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should use DDG directly when no API key (hasApiKey returns false)', async () => {
    mockHasApiKey.mockReturnValue(false);
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    // retryWithBackoff delegates to the DDG search function
    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());

    mockSearchDDG.mockResolvedValue([
      { title: 'DDG Result', url: 'https://ddg.example.com' },
    ]);

    // filterByDomains passes through when no domains
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    // DDG should be called through retryWithBackoff
    expect(mockRetryWithBackoff).toHaveBeenCalled();
    expect(mockSearchDDG).toHaveBeenCalledWith('test query');
    // Perplexity search should NOT be called
    expect(mockSearch).not.toHaveBeenCalled();

    // Provider comment should say duckduckgo
    expect(capturedProvider).toBe('duckduckgo');
  });

  it('should return Perplexity results when API key present and Perplexity succeeds', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    // First retryWithBackoff call (Perplexity) succeeds
    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());

    mockSearch.mockResolvedValue({
      results: [{ title: 'Perplexity Result', url: 'https://pplx.example.com' }],
      content: 'test content',
    });

    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockSearch).toHaveBeenCalledWith('test query', undefined);
    expect(mockSearchDDG).not.toHaveBeenCalled();
    expect(capturedProvider).toBe('perplexity');
  });

  it('should fall back to DDG when Perplexity fails after retries', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    let callCount = 0;
    mockRetryWithBackoff.mockImplementation(async (fn: any) => {
      callCount++;
      if (callCount === 1) {
        // First call: Perplexity fails
        throw new Error('Perplexity 429 after retries');
      }
      // Second call: DDG succeeds
      return fn();
    });

    mockSearchDDG.mockResolvedValue([
      { title: 'DDG Fallback Result', url: 'https://ddg.example.com/fallback' },
    ]);

    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockSearchDDG).toHaveBeenCalledWith('test query');
    expect(capturedProvider).toBe('duckduckgo');
  });

  it('should exit with error when both providers fail', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    mockRetryWithBackoff.mockRejectedValue(new Error('provider failure'));
    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/\[error\]/);
    expect(process.exitCode).toBe(1);
  });

  it('should include provider comment in stdout output', async () => {
    mockHasApiKey.mockReturnValue(false);
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());

    mockSearchDDG.mockResolvedValue([
      { title: 'DDG Result', url: 'https://ddg.example.com' },
    ]);

    mockFilterByDomains.mockImplementation((results: any[]) => results);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).toContain('<!-- provider: duckduckgo -->');
    expect(stdoutOutput).toContain('<search_results>');
  });

  // Domain filtering integration tests

  it('should call validateDomainExclusivity with parsed input', async () => {
    mockHasApiKey.mockReturnValue(false);
    mockReadStdin.mockResolvedValue({ query: 'test query', allowed_domains: ['github.com'] });

    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSearchDDG.mockResolvedValue([{ title: 'GH', url: 'https://github.com/test' }]);
    mockBuildPerplexityDomainFilter.mockReturnValue(['github.com']);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockValidateDomainExclusivity).toHaveBeenCalledWith({
      query: 'test query',
      allowed_domains: ['github.com'],
    });
  });

  it('should exit with error when both allowed and blocked domains provided (SRCH-03)', async () => {
    mockHasApiKey.mockReturnValue(true);
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

  it('should pass allowed_domains domain filter to Perplexity search', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query', allowed_domains: ['github.com'] });

    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSearch.mockResolvedValue({
      results: [{ title: 'GH Result', url: 'https://github.com/test' }],
      content: 'content',
    });
    mockBuildPerplexityDomainFilter.mockReturnValue(['github.com']);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    // Perplexity search should be called with domain filter
    expect(mockSearch).toHaveBeenCalledWith('test query', ['github.com']);
    // buildPerplexityDomainFilter should be called with the domains
    expect(mockBuildPerplexityDomainFilter).toHaveBeenCalledWith(['github.com'], undefined);
  });

  it('should pass blocked_domains filter with -prefix to Perplexity search', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query', blocked_domains: ['reddit.com'] });

    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSearch.mockResolvedValue({
      results: [{ title: 'Result', url: 'https://example.com' }],
      content: 'content',
    });
    mockBuildPerplexityDomainFilter.mockReturnValue(['-reddit.com']);
    // Safety net filter for blocked domains
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockSearch).toHaveBeenCalledWith('test query', ['-reddit.com']);
    expect(mockBuildPerplexityDomainFilter).toHaveBeenCalledWith(undefined, ['reddit.com']);
    // Safety net filter should be applied for blocked domains
    expect(mockFilterByDomains).toHaveBeenCalled();
  });

  it('should apply filterByDomains to DDG results after fallback', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query', allowed_domains: ['github.com'] });

    let callCount = 0;
    mockRetryWithBackoff.mockImplementation(async (fn: any) => {
      callCount++;
      if (callCount === 1) throw new Error('Perplexity failed');
      return fn();
    });

    mockSearchDDG.mockResolvedValue([
      { title: 'GH', url: 'https://github.com/guide' },
      { title: 'Other', url: 'https://other.com/page' },
    ]);

    mockBuildPerplexityDomainFilter.mockReturnValue(['github.com']);
    mockFilterByDomains.mockImplementation((results: any[]) =>
      results.filter((r: any) => r.url.includes('github.com')),
    );

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    // filterByDomains should be called on DDG results with allowed domains
    expect(mockFilterByDomains).toHaveBeenCalled();
    expect(capturedResults).toHaveLength(1);
    expect(capturedResults[0].title).toBe('GH');
  });

  it('should apply filterByDomains on DDG-only path (no API key)', async () => {
    mockHasApiKey.mockReturnValue(false);
    mockReadStdin.mockResolvedValue({ query: 'test query', blocked_domains: ['spam.com'] });

    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSearchDDG.mockResolvedValue([
      { title: 'Good', url: 'https://good.com/page' },
      { title: 'Spam', url: 'https://spam.com/page' },
    ]);

    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);
    mockFilterByDomains.mockImplementation((results: any[]) =>
      results.filter((r: any) => !r.url.includes('spam.com')),
    );

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockFilterByDomains).toHaveBeenCalled();
    expect(capturedResults).toHaveLength(1);
    expect(capturedResults[0].title).toBe('Good');
  });

  it('should not apply filtering when no domains specified', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSearch.mockResolvedValue({
      results: [{ title: 'Result', url: 'https://example.com' }],
      content: 'content',
    });
    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    // filterByDomains should NOT be called when no domains
    expect(mockFilterByDomains).not.toHaveBeenCalled();
    expect(mockSearch).toHaveBeenCalledWith('test query', undefined);
  });

  // Plan 03: Partial result merging and detailed errors (D-17, D-18, D-19, D-15)

  it('should merge partial Perplexity results with DDG fallback (D-17)', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    // First retryWithBackoff call: Perplexity returns partial results, then fails on retry
    let pplxCallCount = 0;
    mockRetryWithBackoff.mockImplementation(async (fn: any) => {
      pplxCallCount++;
      if (pplxCallCount === 1) {
        // Perplexity attempt: capture partial results via fn(), then throw
        try {
          return await fn();
        } catch {
          throw new Error('Perplexity 429 after retries');
        }
      }
      // DDG fallback: succeed
      return fn();
    });

    mockSearch.mockResolvedValue({
      results: [
        { title: 'Partial Pplx 1', url: 'https://pplx1.com' },
        { title: 'Partial Pplx 2', url: 'https://pplx2.com' },
      ],
      content: 'partial content',
    });

    mockSearchDDG.mockResolvedValue([
      { title: 'DDG Result 1', url: 'https://ddg1.com' },
      { title: 'DDG Result 2', url: 'https://ddg2.com' },
    ]);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    // Provider should reflect merged sources
    expect(capturedProvider).toBe('perplexity+duckduckgo');
    // Results should contain both Perplexity and DDG results
    expect(capturedResults).toHaveLength(4);
  });

  it('should order merged results: Perplexity first, DDG appended (D-18)', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    let pplxCallCount = 0;
    mockRetryWithBackoff.mockImplementation(async (fn: any) => {
      pplxCallCount++;
      if (pplxCallCount === 1) {
        try {
          return await fn();
        } catch {
          throw new Error('Perplexity failed after retries');
        }
      }
      return fn();
    });

    mockSearch.mockResolvedValue({
      results: [{ title: 'Pplx First', url: 'https://pplx-first.com' }],
      content: 'content',
    });

    mockSearchDDG.mockResolvedValue([
      { title: 'DDG Second', url: 'https://ddg-second.com' },
    ]);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(capturedResults).toHaveLength(2);
    // Perplexity result comes first
    expect(capturedResults[0].title).toBe('Pplx First');
    // DDG result comes second
    expect(capturedResults[1].title).toBe('DDG Second');
  });

  it('should deduplicate by URL when merging (D-18)', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    let pplxCallCount = 0;
    mockRetryWithBackoff.mockImplementation(async (fn: any) => {
      pplxCallCount++;
      if (pplxCallCount === 1) {
        try {
          return await fn();
        } catch {
          throw new Error('Perplexity failed');
        }
      }
      return fn();
    });

    mockSearch.mockResolvedValue({
      results: [
        { title: 'Pplx Title', url: 'https://shared.com/page' },
        { title: 'Pplx Only', url: 'https://pplx-only.com' },
      ],
      content: 'content',
    });

    // DDG returns same URL as one Perplexity result plus a unique one
    mockSearchDDG.mockResolvedValue([
      { title: 'DDG Title', url: 'https://shared.com/page' },
      { title: 'DDG Only', url: 'https://ddg-only.com' },
    ]);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    // Deduped: shared URL appears only once (Perplexity version kept)
    expect(capturedResults).toHaveLength(3);
    // Perplexity version of the shared URL should be kept
    const sharedResult = capturedResults.find((r: any) => r.url === 'https://shared.com/page');
    expect(sharedResult.title).toBe('Pplx Title');
  });

  it('should show perplexity+duckduckgo provider comment for merged results (D-15)', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    let pplxCallCount = 0;
    mockRetryWithBackoff.mockImplementation(async (fn: any) => {
      pplxCallCount++;
      if (pplxCallCount === 1) {
        try {
          return await fn();
        } catch {
          throw new Error('Perplexity failed');
        }
      }
      return fn();
    });

    mockSearch.mockResolvedValue({
      results: [{ title: 'Pplx', url: 'https://pplx.com' }],
      content: 'content',
    });
    mockSearchDDG.mockResolvedValue([
      { title: 'DDG', url: 'https://ddg.com' },
    ]);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).toContain('<!-- provider: perplexity+duckduckgo -->');
  });

  it('should include provider names and error types in total failure message (D-19)', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);

    let callCount = 0;
    mockRetryWithBackoff.mockImplementation(async (fn: any) => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Perplexity returned 429 after 4 retries');
      }
      throw new Error('DDG network error: connection refused');
    });

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    // Error message should include both provider names
    expect(stderrOutput).toMatch(/Perplexity/);
    expect(stderrOutput).toMatch(/DDG/);
    // Error message should include specific error types
    expect(stderrOutput).toMatch(/429/);
    expect(stderrOutput).toMatch(/connection refused/);
    expect(process.exitCode).toBe(1);
  });

  it('should show duckduckgo provider when Perplexity fails with no partial results', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });
    mockBuildPerplexityDomainFilter.mockReturnValue(undefined);
    mockFilterByDomains.mockImplementation((results: any[]) => results);

    let callCount = 0;
    mockRetryWithBackoff.mockImplementation(async (fn: any) => {
      callCount++;
      if (callCount === 1) {
        // Perplexity fails without any results
        throw new Error('Perplexity error');
      }
      // DDG succeeds
      return fn();
    });

    mockSearchDDG.mockResolvedValue([
      { title: 'DDG Only', url: 'https://ddg-only.com' },
    ]);

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    // No partial results, so provider is just duckduckgo (not merged)
    expect(capturedProvider).toBe('duckduckgo');
  });
});
