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
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  })),
}));

import type { ResolvedConfig } from '../src/lib/config.js';

function makeConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    perplexity: { apiKey: 'test-pplx-key', model: 'sonar', ...overrides.perplexity },
    retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000, ...overrides.retry },
    logging: { level: 'info', ...overrides.logging },
  };
}

describe('getApiKey and hasApiKey', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return API key from config', async () => {
    const { getApiKey } = await import('../src/lib/perplexity.js');
    const config = makeConfig();
    expect(getApiKey(config)).toBe('test-pplx-key');
  });

  it('should throw with WEBSEARCH_PERPLEXITY_API_KEY in message when key is undefined', async () => {
    const { getApiKey } = await import('../src/lib/perplexity.js');
    const config = makeConfig({ perplexity: { apiKey: undefined, model: 'sonar' } });

    expect(() => getApiKey(config)).toThrow(/WEBSEARCH_PERPLEXITY_API_KEY/);
  });

  it('hasApiKey returns true when config has API key', async () => {
    const { hasApiKey } = await import('../src/lib/perplexity.js');
    const config = makeConfig();
    expect(hasApiKey(config)).toBe(true);
  });

  it('hasApiKey returns false when config API key is undefined', async () => {
    const { hasApiKey } = await import('../src/lib/perplexity.js');
    const config = makeConfig({ perplexity: { apiKey: undefined, model: 'sonar' } });
    expect(hasApiKey(config)).toBe(false);
  });
});

describe('search', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call Perplexity chat.completions.create with model from config', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'test answer', role: 'assistant' }, index: 0, delta: { content: 'test answer', role: 'assistant' }, finish_reason: 'stop' }],
      citations: [],
      search_results: [],
    });

    const config = makeConfig({ perplexity: { apiKey: 'test-key', model: 'sonar-pro' } });
    const { search } = await import('../src/lib/perplexity.js');
    await search('test query', config);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'sonar-pro',
        messages: [{ role: 'user', content: 'test query' }],
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

    const config = makeConfig();
    const { search } = await import('../src/lib/perplexity.js');
    const result = await search('test query', config);

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

    const config = makeConfig();
    const { search } = await import('../src/lib/perplexity.js');
    const result = await search('test query', config);

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

    const config = makeConfig();
    const { search } = await import('../src/lib/perplexity.js');
    const result = await search('test query', config);

    expect(result.content).toBe('This is the AI answer');
  });

  it('should throw descriptive error when API key is missing in config', async () => {
    const config = makeConfig({ perplexity: { apiKey: undefined, model: 'sonar' } });
    const { search } = await import('../src/lib/perplexity.js');

    await expect(search('test query', config)).rejects.toThrow(
      /WEBSEARCH_PERPLEXITY_API_KEY/,
    );
  });
});

describe('summarize', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call Perplexity with disable_search and model from config', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'summary text', role: 'assistant' }, index: 0, delta: { content: 'summary text', role: 'assistant' }, finish_reason: 'stop' }],
    });

    const config = makeConfig({ perplexity: { apiKey: 'test-key', model: 'sonar-pro' } });
    const { summarize } = await import('../src/lib/perplexity.js');
    await summarize('page content', 'Summarize this', config);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'sonar-pro',
        disable_search: true,
      }),
    );
  });

  it('should throw descriptive error when API key is missing in config', async () => {
    const config = makeConfig({ perplexity: { apiKey: undefined, model: 'sonar' } });
    const { summarize } = await import('../src/lib/perplexity.js');

    await expect(summarize('content', 'prompt', config)).rejects.toThrow(
      /WEBSEARCH_PERPLEXITY_API_KEY/,
    );
  });
});
