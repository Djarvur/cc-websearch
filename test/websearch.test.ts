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

vi.mock('../src/lib/input.js', () => ({
  readStdin: (...args: any[]) => mockReadStdin(...args),
  WebSearchInputSchema: {},
}));

// Mock output module - captures the provider argument
let capturedProvider: string | undefined;
vi.mock('../src/lib/output.js', () => ({
  formatSearchResults: vi.fn((results: any[], provider?: string) => {
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
    capturedProvider = undefined;
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

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockSearch).toHaveBeenCalledWith('test query');
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

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    expect(mockSearchDDG).toHaveBeenCalledWith('test query');
    expect(capturedProvider).toBe('duckduckgo');
  });

  it('should exit with error when both providers fail', async () => {
    mockHasApiKey.mockReturnValue(true);
    mockReadStdin.mockResolvedValue({ query: 'test query' });

    mockRetryWithBackoff.mockRejectedValue(new Error('provider failure'));

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

    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).toContain('<!-- provider: duckduckgo -->');
    expect(stdoutOutput).toContain('<search_results>');
  });
});
