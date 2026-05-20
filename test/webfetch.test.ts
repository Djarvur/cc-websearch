import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch module
const mockFetchWithRedirects = vi.fn();
const mockNormalizeUrl = vi.fn();
const MockCrossHostRedirectError = class extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Cross-host redirect from ${from} to ${to}`);
  }
};

vi.mock('../src/lib/fetch.js', () => ({
  fetchWithRedirects: (...args: any[]) => mockFetchWithRedirects(...args),
  normalizeUrl: (...args: any[]) => mockNormalizeUrl(...args),
  CrossHostRedirectError: MockCrossHostRedirectError,
}));

// Mock content module
const mockExtractMarkdown = vi.fn();

vi.mock('../src/lib/content.js', () => ({
  extractMarkdown: (...args: any[]) => mockExtractMarkdown(...args),
}));

// Mock perplexity module
const mockHasApiKey = vi.fn();
const mockSummarize = vi.fn();

vi.mock('../src/lib/perplexity.js', () => ({
  hasApiKey: () => mockHasApiKey(),
  summarize: (...args: any[]) => mockSummarize(...args),
  getApiKey: vi.fn().mockReturnValue('test-key'),
  search: vi.fn(),
}));

// Mock retry module
const mockRetryWithBackoff = vi.fn();

vi.mock('../src/lib/retry.js', () => ({
  retryWithBackoff: (...args: any[]) => mockRetryWithBackoff(...args),
  isTransientError: vi.fn(),
}));

// Mock logger
vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn((msg: string) => process.stderr.write(`[error] ${msg}\n`)),
  },
}));

// Mock input module
const mockReadStdin = vi.fn();

vi.mock('../src/lib/input.js', () => ({
  readStdin: (...args: any[]) => mockReadStdin(...args),
  WebFetchInputSchema: {},
  WebSearchInputSchema: {},
  validateDomainExclusivity: vi.fn(),
}));

describe('WebFetch pipeline', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    mockFetchWithRedirects.mockReset();
    mockNormalizeUrl.mockReset();
    mockReadStdin.mockReset();
    mockExtractMarkdown.mockReset();
    mockHasApiKey.mockReset();
    mockSummarize.mockReset();
    mockRetryWithBackoff.mockReset();
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should write response text to stdout on successful fetch', async () => {
    const testUrl = new URL('https://example.com/');
    mockReadStdin.mockResolvedValue({ url: 'https://example.com/', prompt: 'summarize' });
    mockNormalizeUrl.mockReturnValue(testUrl);

    const mockResponse = {
      text: vi.fn().mockResolvedValue('<html><body>Hello World</body></html>'),
    };
    mockFetchWithRedirects.mockResolvedValue({
      response: mockResponse,
      finalUrl: testUrl,
    });
    mockExtractMarkdown.mockReturnValue('Hello World');
    mockHasApiKey.mockReturnValue(false);

    await import('../src/webfetch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).toContain('Hello World');
  });

  it('should write redirect message to stdout for CrossHostRedirectError (D-10)', async () => {
    const testUrl = new URL('https://example.com/');
    mockReadStdin.mockResolvedValue({ url: 'https://example.com/', prompt: 'summarize' });
    mockNormalizeUrl.mockReturnValue(testUrl);

    const redirectError = new MockCrossHostRedirectError(
      'https://example.com/',
      'https://other.com/page',
    );
    mockFetchWithRedirects.mockRejectedValue(redirectError);

    await import('../src/webfetch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).toContain('cross-host redirect not followed');
    expect(stdoutOutput).toContain('https://example.com/');
    expect(stdoutOutput).toContain('https://other.com/page');
    // Should NOT be on stderr
    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).not.toContain('cross-host redirect');
  });

  it('should write error to stderr and set exitCode to 1 for generic errors', async () => {
    const testUrl = new URL('https://example.com/');
    mockReadStdin.mockResolvedValue({ url: 'https://example.com/', prompt: 'summarize' });
    mockNormalizeUrl.mockReturnValue(testUrl);

    mockFetchWithRedirects.mockRejectedValue(new Error('HTTP 404: Not Found at https://example.com/'));

    await import('../src/webfetch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/\[error\]/);
    expect(process.exitCode).toBe(1);
  });

  it('should produce error on stderr for invalid input (schema validation)', async () => {
    // Simulate Zod validation failure
    mockReadStdin.mockRejectedValue(new Error('Invalid URL format'));

    await import('../src/webfetch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/\[error\]/);
    expect(process.exitCode).toBe(1);
  });

  // Plan 02 tests: summarize and raw markdown paths

  it('should write summarize result to stdout when hasApiKey is true (D-07)', async () => {
    const testUrl = new URL('https://example.com/');
    mockReadStdin.mockResolvedValue({ url: 'https://example.com/', prompt: 'What is this about?' });
    mockNormalizeUrl.mockReturnValue(testUrl);

    const mockResponse = {
      text: vi.fn().mockResolvedValue('<html><body>Article content here.</body></html>'),
    };
    mockFetchWithRedirects.mockResolvedValue({
      response: mockResponse,
      finalUrl: testUrl,
    });
    mockExtractMarkdown.mockReturnValue('Article content here.');
    mockHasApiKey.mockReturnValue(true);
    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSummarize.mockResolvedValue('This page is about a topic.');

    await import('../src/webfetch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).toBe('This page is about a topic.');
  });

  it('should write raw markdown to stdout when hasApiKey is false (D-08)', async () => {
    const testUrl = new URL('https://example.com/');
    mockReadStdin.mockResolvedValue({ url: 'https://example.com/', prompt: 'summarize' });
    mockNormalizeUrl.mockReturnValue(testUrl);

    const mockResponse = {
      text: vi.fn().mockResolvedValue('<html><body>Raw HTML content.</body></html>'),
    };
    mockFetchWithRedirects.mockResolvedValue({
      response: mockResponse,
      finalUrl: testUrl,
    });
    mockExtractMarkdown.mockReturnValue('# Raw Markdown\n\nContent here.');
    mockHasApiKey.mockReturnValue(false);

    await import('../src/webfetch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stdoutOutput = stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stdoutOutput).toContain('# Raw Markdown');
    expect(stdoutOutput).toContain('Content here.');
    // summarize should NOT have been called
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it('should write error to stderr and set exitCode 1 when summarize fails after retries', async () => {
    const testUrl = new URL('https://example.com/');
    mockReadStdin.mockResolvedValue({ url: 'https://example.com/', prompt: 'What is this?' });
    mockNormalizeUrl.mockReturnValue(testUrl);

    const mockResponse = {
      text: vi.fn().mockResolvedValue('<html><body>Content</body></html>'),
    };
    mockFetchWithRedirects.mockResolvedValue({
      response: mockResponse,
      finalUrl: testUrl,
    });
    mockExtractMarkdown.mockReturnValue('Content');
    mockHasApiKey.mockReturnValue(true);
    mockRetryWithBackoff.mockRejectedValue(new Error('Perplexity API 429 after retries'));

    await import('../src/webfetch.js');
    await new Promise((r) => setTimeout(r, 100));

    const stderrOutput = stderrWriteSpy.mock.calls.map((c: any) => String(c[0])).join('');
    expect(stderrOutput).toMatch(/\[error\]/);
    expect(process.exitCode).toBe(1);
  });

  it('should call summarize with extracted markdown and user prompt (D-05)', async () => {
    const testUrl = new URL('https://example.com/article');
    mockReadStdin.mockResolvedValue({ url: 'https://example.com/article', prompt: 'Summarize the key points' });
    mockNormalizeUrl.mockReturnValue(testUrl);

    const mockResponse = {
      text: vi.fn().mockResolvedValue('<html><body>Article body text.</body></html>'),
    };
    mockFetchWithRedirects.mockResolvedValue({
      response: mockResponse,
      finalUrl: testUrl,
    });
    mockExtractMarkdown.mockReturnValue('Article body text.');
    mockHasApiKey.mockReturnValue(true);
    mockRetryWithBackoff.mockImplementation(async (fn: any) => fn());
    mockSummarize.mockResolvedValue('Key points summary.');

    await import('../src/webfetch.js');
    await new Promise((r) => setTimeout(r, 100));

    // summarize should be called with (markdown, userPrompt)
    expect(mockSummarize).toHaveBeenCalledWith('Article body text.', 'Summarize the key points');
  });
});
