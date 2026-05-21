import { createLogger } from './logger.js';
import type { LogLevel } from './logger.js';
import type { ResolvedConfig } from './config.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
}

const logger = createLogger('retry');

export function configureLogger(level: LogLevel): void {
  logger.setLevel(level);
}

const DEFAULTS: RetryConfig = { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 };

export function getRetryConfig(config: ResolvedConfig): RetryConfig {
  return {
    maxRetries: config.retry.maxRetries,
    baseDelay: config.retry.baseDelay,
    maxDelay: config.retry.maxDelay,
    timeout: config.retry.timeout,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`Request timed out after ${ms}ms (ETIMEDOUT)`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export function isDDGTransientError(err: unknown): boolean {
  if (err instanceof Error) {
    return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|429|503/.test(err.message);
  }
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  isTransient: (err: unknown) => boolean,
  options?: Partial<RetryConfig>,
): Promise<T> {
  const config = { ...DEFAULTS, ...options };
  let lastError: Error = new Error('unreachable');

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), config.timeout);
    } catch (err) {
      lastError = err as Error;

      if (!isTransient(err) || attempt === config.maxRetries) {
        throw err;
      }

      const delay =
        Math.random() * Math.min(config.maxDelay, config.baseDelay * Math.pow(2, attempt));
      logger.debug(
        `Retry ${attempt + 1}/${config.maxRetries} after ${Math.round(delay)}ms: ${lastError.message}`,
      );
      await sleep(delay);
    }
  }

  // The loop always throws before reaching here (either via re-throw on last attempt
  // or via the catch block above), but TypeScript needs an explicit throw for control flow.
  throw lastError;
}
