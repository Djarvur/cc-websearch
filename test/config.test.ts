import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger to avoid stderr output during tests
vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('getApiKey', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return PPLX_API_KEY value when set', async () => {
    vi.stubEnv('PPLX_API_KEY', 'pplx-test-key');
    vi.stubEnv('PERPLEXITY_API_KEY', 'perp-test-key');

    const { getApiKey } = await import('../src/lib/perplexity.js');

    expect(getApiKey()).toBe('pplx-test-key');
  });

  it('should fall back to PERPLEXITY_API_KEY when PPLX_API_KEY not set', async () => {
    vi.stubEnv('PPLX_API_KEY', '');
    vi.stubEnv('PERPLEXITY_API_KEY', 'perp-test-key');

    const { getApiKey } = await import('../src/lib/perplexity.js');

    expect(getApiKey()).toBe('perp-test-key');
  });

  it('should throw error when neither env var is set', async () => {
    vi.stubEnv('PPLX_API_KEY', '');
    vi.stubEnv('PERPLEXITY_API_KEY', '');

    const { getApiKey } = await import('../src/lib/perplexity.js');

    expect(() => getApiKey()).toThrow(
      'No API key found. Set PPLX_API_KEY or PERPLEXITY_API_KEY environment variable.',
    );
  });
});

describe('hasApiKey', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return true when PPLX_API_KEY is set', async () => {
    vi.stubEnv('PPLX_API_KEY', 'test-key');
    vi.stubEnv('PERPLEXITY_API_KEY', '');

    const { hasApiKey } = await import('../src/lib/perplexity.js');

    expect(hasApiKey()).toBe(true);
  });

  it('should return true when PERPLEXITY_API_KEY is set', async () => {
    vi.stubEnv('PPLX_API_KEY', '');
    vi.stubEnv('PERPLEXITY_API_KEY', 'test-key');

    const { hasApiKey } = await import('../src/lib/perplexity.js');

    expect(hasApiKey()).toBe(true);
  });

  it('should return false when neither env var is set', async () => {
    vi.stubEnv('PPLX_API_KEY', '');
    vi.stubEnv('PERPLEXITY_API_KEY', '');

    const { hasApiKey } = await import('../src/lib/perplexity.js');

    expect(hasApiKey()).toBe(false);
  });

  it('should not throw when API key is missing', async () => {
    vi.stubEnv('PPLX_API_KEY', '');
    vi.stubEnv('PERPLEXITY_API_KEY', '');

    const { hasApiKey } = await import('../src/lib/perplexity.js');

    expect(() => hasApiKey()).not.toThrow();
  });
});
