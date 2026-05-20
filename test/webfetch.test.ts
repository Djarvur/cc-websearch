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
});
