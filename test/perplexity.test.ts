import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Shared mock create function accessible to tests
const mockCreate = vi.fn();

vi.mock('@perplexity-ai/perplexity_ai', () => {
  return {
    default: vi.fn().mockImplementation(function(this: any, { apiKey }: { apiKey: string }) {
      this.chat = {
        completions: {
          create: mockCreate,
        },
      };
    }),
  };
});

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('search', () => {
  beforeEach(() => {
    vi.stubEnv('PPLX_API_KEY', 'test-pplx-key');
    vi.stubEnv('PPLX_MODEL', '');
    vi.resetModules();
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should call Perplexity chat.completions.create with model "sonar" by default', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'test answer', role: 'assistant' }, index: 0, delta: { content: 'test answer', role: 'assistant' }, finish_reason: 'stop' }],
      citations: [],
      search_results: [],
    });

    const { search } = await import('../src/lib/perplexity.js');
    await search('test query');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'sonar',
        messages: [{ role: 'user', content: 'test query' }],
      }),
    );
  });

  it('should use PPLX_MODEL env var for model when set', async () => {
    vi.stubEnv('PPLX_MODEL', 'sonar-pro');

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'test answer', role: 'assistant' }, index: 0, delta: { content: 'test answer', role: 'assistant' }, finish_reason: 'stop' }],
      citations: [],
      search_results: [],
    });

    const { search } = await import('../src/lib/perplexity.js');
    await search('test query');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'sonar-pro',
      }),
    );
  });

  it('should return extracted title/URL pairs from response search_results array', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'test content', role: 'assistant' }, index: 0, delta: { content: 'test content', role: 'assistant' }, finish_reason: 'stop' }],
      citations: ['https://example.com/old'],
      search_results: [
        { title: 'Result 1', url: 'https://example.com/1', snippet: 'snippet 1' },
        { title: 'Result 2', url: 'https://example.com/2', snippet: 'snippet 2' },
      ],
    });

    const { search } = await import('../src/lib/perplexity.js');
    const result = await search('test query');

    expect(result.results).toEqual([
      { title: 'Result 1', url: 'https://example.com/1' },
      { title: 'Result 2', url: 'https://example.com/2' },
    ]);
  });

  it('should fall back to citations array when search_results is empty', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'test content', role: 'assistant' }, index: 0, delta: { content: 'test content', role: 'assistant' }, finish_reason: 'stop' }],
      citations: ['https://example.com/cite1', 'https://example.com/cite2'],
      search_results: [],
    });

    const { search } = await import('../src/lib/perplexity.js');
    const result = await search('test query');

    expect(result.results).toEqual([
      { title: 'https://example.com/cite1', url: 'https://example.com/cite1' },
      { title: 'https://example.com/cite2', url: 'https://example.com/cite2' },
    ]);
  });

  it('should return content string from response choices', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'This is the AI answer', role: 'assistant' }, index: 0, delta: { content: 'This is the AI answer', role: 'assistant' }, finish_reason: 'stop' }],
      citations: [],
      search_results: [],
    });

    const { search } = await import('../src/lib/perplexity.js');
    const result = await search('test query');

    expect(result.content).toBe('This is the AI answer');
  });

  it('should throw descriptive error when API key is missing', async () => {
    vi.stubEnv('PPLX_API_KEY', '');
    vi.stubEnv('PERPLEXITY_API_KEY', '');

    const { search } = await import('../src/lib/perplexity.js');

    await expect(search('test query')).rejects.toThrow(
      'No API key found. Set PPLX_API_KEY or PERPLEXITY_API_KEY environment variable.',
    );
  });
});
