import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

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
    vi.useFakeTimers();
    const transientErr = new Error('keep failing');
    const fn = vi.fn().mockRejectedValue(transientErr);

    const { retryWithBackoff } = await import('../src/lib/retry.js');
    const promise = retryWithBackoff(fn, () => true, { maxRetries: 2, baseDelay: 10, maxDelay: 100 });

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).rejects.toThrow('keep failing');
    // 1 initial + 2 retries = 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should read retry config from env vars with correct defaults', async () => {
    const { getRetryConfig } = await import('../src/lib/retry.js');
    const config = getRetryConfig();

    expect(config.maxRetries).toBe(4);
    expect(config.baseDelay).toBe(1000);
    expect(config.maxDelay).toBe(16000);
    expect(config.timeout).toBe(30000);
  });

  it('should override defaults with env vars', async () => {
    vi.stubEnv('RETRY_MAX_RETRIES', '6');
    vi.stubEnv('RETRY_BASE_DELAY', '500');
    vi.stubEnv('RETRY_MAX_DELAY', '8000');
    vi.stubEnv('RETRY_TIMEOUT', '60000');

    vi.resetModules();
    const { getRetryConfig } = await import('../src/lib/retry.js');
    const config = getRetryConfig();

    expect(config.maxRetries).toBe(6);
    expect(config.baseDelay).toBe(500);
    expect(config.maxDelay).toBe(8000);
    expect(config.timeout).toBe(60000);

    vi.unstubAllEnvs();
  });
});

describe('isTransientError', () => {
  it('should detect RateLimitError as transient', async () => {
    const { RateLimitError } = await import('@perplexity-ai/perplexity_ai/error.js');
    const { isTransientError } = await import('../src/lib/retry.js');

    const err = new RateLimitError(429, undefined, 'rate limited', undefined);
    expect(isTransientError(err)).toBe(true);
  });

  it('should detect InternalServerError as transient', async () => {
    const { InternalServerError } = await import('@perplexity-ai/perplexity_ai/error.js');
    const { isTransientError } = await import('../src/lib/retry.js');

    const err = new InternalServerError(500, undefined, 'server error', undefined);
    expect(isTransientError(err)).toBe(true);
  });

  it('should detect APIConnectionError as transient', async () => {
    const { APIConnectionError } = await import('@perplexity-ai/perplexity_ai/error.js');
    const { isTransientError } = await import('../src/lib/retry.js');

    const err = new APIConnectionError({ message: 'connection failed', cause: undefined });
    expect(isTransientError(err)).toBe(true);
  });

  it('should detect APIConnectionTimeoutError as transient', async () => {
    const { APIConnectionTimeoutError } = await import('@perplexity-ai/perplexity_ai/error.js');
    const { isTransientError } = await import('../src/lib/retry.js');

    const err = new APIConnectionTimeoutError({ message: 'timeout' });
    expect(isTransientError(err)).toBe(true);
  });

  it('should NOT detect generic Error as transient', async () => {
    vi.resetModules();
    const { isTransientError } = await import('../src/lib/retry.js');

    expect(isTransientError(new Error('some error'))).toBe(false);
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
