import {
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from '@perplexity-ai/perplexity_ai/error.js';
import { logger } from './logger.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
}

export function getRetryConfig(): RetryConfig {
  return {
    maxRetries: parseInt(process.env.RETRY_MAX_RETRIES || '4', 10),
    baseDelay: parseInt(process.env.RETRY_BASE_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '16000', 10),
    timeout: parseInt(process.env.RETRY_TIMEOUT || '30000', 10),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);

  try {
    return await promise;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isTransientError(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (err instanceof InternalServerError) return true;
  if (err instanceof APIConnectionError) return true;
  if (err instanceof APIConnectionTimeoutError) return true;
  return false;
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
  const config = { ...getRetryConfig(), ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), config.timeout);
    } catch (err) {
      lastError = err as Error;

      if (!isTransient(err) || attempt === config.maxRetries) {
        throw err;
      }

      const delay = Math.random() * Math.min(config.maxDelay, config.baseDelay * Math.pow(2, attempt));
      logger.debug(`Retry ${attempt + 1}/${config.maxRetries} after ${Math.round(delay)}ms: ${lastError.message}`);
      await sleep(delay);
    }
  }

  throw lastError!;
}
