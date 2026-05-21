import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return result on first successful call', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const { retryWithBackoff } = await import('../src/lib/retry.js');
    const result = await retryWithBackoff(fn, () => true);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on transient errors and succeed', async () => {
    vi.useFakeTimers();
    const transientErr = new Error('transient');
    const fn = vi.fn()
      .mockRejectedValueOnce(transientErr)
      .mockResolvedValueOnce('recovered');

    const { retryWithBackoff } = await import('../src/lib/retry.js');
    const promise = retryWithBackoff(fn, () => true, { maxRetries: 3, baseDelay: 100, maxDelay: 1000 });

    // Advance past the jitter delay
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw immediately on non-transient errors', async () => {
    const nonTransientErr = new Error('permanent failure');
    const fn = vi.fn().mockRejectedValue(nonTransientErr);
    const isTransient = () => false;

    const { retryWithBackoff } = await import('../src/lib/retry.js');

    await expect(retryWithBackoff(fn, isTransient)).rejects.toThrow('permanent failure');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries exhausted on transient errors', async () => {
    const transientErr = new Error('keep failing');
    const fn = vi.fn().mockRejectedValue(transientErr);

    const { retryWithBackoff } = await import('../src/lib/retry.js');

    await expect(
      retryWithBackoff(fn, () => true, { maxRetries: 2, baseDelay: 1, maxDelay: 2 }),
    ).rejects.toThrow('keep failing');
    // 1 initial + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('getRetryConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should return values from ResolvedConfig', async () => {
    const config: ResolvedConfig = {
      retry: { maxRetries: 6, baseDelay: 500, maxDelay: 8000, timeout: 60000 },
      logging: { level: 'info' },
    };

    const { getRetryConfig } = await import('../src/lib/retry.js');
    const retryConfig = getRetryConfig(config);

    expect(retryConfig.maxRetries).toBe(6);
    expect(retryConfig.baseDelay).toBe(500);
    expect(retryConfig.maxDelay).toBe(8000);
    expect(retryConfig.timeout).toBe(60000);
  });

  it('should return defaults when config has default values', async () => {
    const config: ResolvedConfig = {
      retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
      logging: { level: 'info' },
    };

    const { getRetryConfig } = await import('../src/lib/retry.js');
    const retryConfig = getRetryConfig(config);

    expect(retryConfig.maxRetries).toBe(4);
    expect(retryConfig.baseDelay).toBe(1000);
    expect(retryConfig.maxDelay).toBe(16000);
    expect(retryConfig.timeout).toBe(30000);
  });
});

describe('isDDGTransientError', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should detect ECONNREFUSED as transient', async () => {
    const { isDDGTransientError } = await import('../src/lib/retry.js');
    expect(isDDGTransientError(new Error('connect ECONNREFUSED 127.0.0.1:443'))).toBe(true);
  });

  it('should detect ETIMEDOUT as transient', async () => {
    const { isDDGTransientError } = await import('../src/lib/retry.js');
    expect(isDDGTransientError(new Error('request ETIMEDOUT'))).toBe(true);
  });

  it('should detect ENOTFOUND as transient', async () => {
    const { isDDGTransientError } = await import('../src/lib/retry.js');
    expect(isDDGTransientError(new Error('getaddrinfo ENOTFOUND example.com'))).toBe(true);
  });

  it('should detect 429 in message as transient', async () => {
    const { isDDGTransientError } = await import('../src/lib/retry.js');
    expect(isDDGTransientError(new Error('HTTP 429 Too Many Requests'))).toBe(true);
  });

  it('should detect 503 in message as transient', async () => {
    const { isDDGTransientError } = await import('../src/lib/retry.js');
    expect(isDDGTransientError(new Error('HTTP 503 Service Unavailable'))).toBe(true);
  });

  it('should NOT detect non-transient errors', async () => {
    const { isDDGTransientError } = await import('../src/lib/retry.js');
    expect(isDDGTransientError(new Error('Something else'))).toBe(false);
  });
});
