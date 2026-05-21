import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock duck-duck-scrape module
const mockDdgSearch = vi.fn();

vi.mock('duck-duck-scrape', () => ({
  search: mockDdgSearch,
}));

vi.mock('../src/lib/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  })),
}));

describe('searchDDG', () => {
  beforeEach(() => {
    vi.resetModules();
    mockDdgSearch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return mapped title+URL+snippet results from duck-duck-scrape', async () => {
    mockDdgSearch.mockResolvedValue({
      noResults: false,
      vqd: 'test-vqd',
      results: [
        {
          title: 'Result 1',
          url: 'https://example.com/1',
          hostname: 'example.com',
          description: 'desc 1',
        },
        {
          title: 'Result 2',
          url: 'https://example.com/2',
          hostname: 'example.com',
          description: 'desc 2',
        },
      ],
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('test query');

    expect(results).toEqual([
      { title: 'Result 1', url: 'https://example.com/1', snippet: 'desc 1' },
      { title: 'Result 2', url: 'https://example.com/2', snippet: 'desc 2' },
    ]);
  });

  it('should return empty array when noResults is true', async () => {
    mockDdgSearch.mockResolvedValue({
      noResults: true,
      vqd: 'test-vqd',
      results: [],
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('obscure query with no results');

    expect(results).toEqual([]);
  });

  it('should propagate errors (no try/catch)', async () => {
    mockDdgSearch.mockRejectedValue(new Error('ECONNREFUSED'));

    const { searchDDG } = await import('../src/lib/duckduckgo.js');

    await expect(searchDDG('test query')).rejects.toThrow('ECONNREFUSED');
  });

  it('should pass query string to duck-duck-scrape search', async () => {
    mockDdgSearch.mockResolvedValue({
      noResults: false,
      vqd: 'test-vqd',
      results: [],
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    await searchDDG('my search terms');

    expect(mockDdgSearch).toHaveBeenCalledWith('my search terms');
  });

  it('should strip HTML tags from description for snippet', async () => {
    mockDdgSearch.mockResolvedValue({
      noResults: false,
      vqd: 'test-vqd',
      results: [
        {
          title: 'Result',
          url: 'https://example.com',
          hostname: 'example.com',
          description: 'This is a <b>bold</b> term',
        },
      ],
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('test query');

    expect(results[0].snippet).toBe('This is a bold term');
  });

  it('should return empty string for snippet when description is undefined', async () => {
    mockDdgSearch.mockResolvedValue({
      noResults: false,
      vqd: 'test-vqd',
      results: [{ title: 'Result', url: 'https://example.com', hostname: 'example.com' }],
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('test query');

    expect(results[0].snippet).toBe('');
  });

  it('should return empty string for snippet when description is empty string', async () => {
    mockDdgSearch.mockResolvedValue({
      noResults: false,
      vqd: 'test-vqd',
      results: [
        { title: 'Result', url: 'https://example.com', hostname: 'example.com', description: '' },
      ],
    });

    const { searchDDG } = await import('../src/lib/duckduckgo.js');
    const results = await searchDDG('test query');

    expect(results[0].snippet).toBe('');
  });
});
