import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Schema (D-01): nested strict objects, same pattern as input.ts
export const ConfigSchema = z.strictObject({
  perplexity: z.strictObject({
    apiKey: z.string().optional(),
    model: z.string().optional(),
  }).optional(),
  retry: z.strictObject({
    maxRetries: z.number().int().min(0).optional(),
    baseDelay: z.number().int().min(0).optional(),
    maxDelay: z.number().int().min(0).optional(),
    timeout: z.number().int().min(0).optional(),
  }).optional(),
  logging: z.strictObject({
    level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  }).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// Hardcoded defaults
const DEFAULTS = {
  perplexity: { model: 'sonar' },
  retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
  logging: { level: 'info' as const },
} as const;

// Env var mapping (D-02, D-04)
const ENV_MAP = {
  'perplexity.apiKey': 'WEBSEARCH_PERPLEXITY_API_KEY',
  'perplexity.model': 'WEBSEARCH_PERPLEXITY_MODEL',
  'retry.maxRetries': 'WEBSEARCH_RETRY_MAX_RETRIES',
  'retry.baseDelay': 'WEBSEARCH_RETRY_BASE_DELAY',
  'retry.maxDelay': 'WEBSEARCH_RETRY_MAX_DELAY',
  'retry.timeout': 'WEBSEARCH_RETRY_TIMEOUT',
  'logging.level': 'WEBSEARCH_LOGGING_LEVEL',
} as const;

// Config path (D-03)
const CONFIG_PATH = join(homedir(), '.config', 'websearch', 'config.json');

// Fully resolved config type -- all fields present, no undefined except apiKey
export interface ResolvedConfig {
  perplexity: {
    apiKey: string | undefined;
    model: string;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    timeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

// Read config file (D-03, D-05)
function readConfigFile(): Record<string, unknown> | null {
  if (!existsSync(CONFIG_PATH)) return null; // D-05: silent
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    process.stderr.write('[warn] Failed to parse config file\n');
    return null;
  }
}

// Validate config file content and emit warnings (D-06, D-07)
function validateFileConfig(raw: Record<string, unknown>): Config {
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      process.stderr.write(`[warn] Invalid config at ${path}: ${issue.message}\n`);
    }
    return {};
  }
  return result.data;
}

// Env var resolution helpers
const NUMBER_KEYS = new Set([
  'retry.maxRetries',
  'retry.baseDelay',
  'retry.maxDelay',
  'retry.timeout',
]);

const VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error']);

function resolveFromEnv(key: string): string | number | undefined {
  const envName = ENV_MAP[key as keyof typeof ENV_MAP];
  if (!envName) return undefined;
  const envValue = process.env[envName];
  if (envValue === undefined || envValue === '') return undefined;

  if (NUMBER_KEYS.has(key)) {
    const num = Number(envValue);
    if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
      process.stderr.write(`[warn] Invalid number for ${envName}: "${envValue}"\n`);
      return undefined;
    }
    return num;
  }

  if (key === 'logging.level') {
    if (!VALID_LEVELS.has(envValue)) {
      process.stderr.write(`[warn] Invalid log level: "${envValue}"\n`);
      return undefined;
    }
    return envValue;
  }

  return envValue;
}

// Per-key resolution: env > file > default (D-04)
function resolve<T>(key: string, fileValue: T | undefined, defaultValue: T): T {
  const envValue = resolveFromEnv(key);
  if (envValue !== undefined) return envValue as T;
  if (fileValue !== undefined) return fileValue;
  return defaultValue;
}

// Main export
export function loadConfig(): ResolvedConfig {
  const rawFile = readConfigFile();
  const fileConfig = rawFile ? validateFileConfig(rawFile) : {};

  return {
    perplexity: {
      apiKey: resolve<string | undefined>('perplexity.apiKey', fileConfig.perplexity?.apiKey, undefined),
      model: resolve('perplexity.model', fileConfig.perplexity?.model, DEFAULTS.perplexity.model),
    },
    retry: {
      maxRetries: resolve('retry.maxRetries', fileConfig.retry?.maxRetries, DEFAULTS.retry.maxRetries),
      baseDelay: resolve('retry.baseDelay', fileConfig.retry?.baseDelay, DEFAULTS.retry.baseDelay),
      maxDelay: resolve('retry.maxDelay', fileConfig.retry?.maxDelay, DEFAULTS.retry.maxDelay),
      timeout: resolve('retry.timeout', fileConfig.retry?.timeout, DEFAULTS.retry.timeout),
    },
    logging: {
      level: resolve('logging.level', fileConfig.logging?.level, DEFAULTS.logging.level),
    },
  };
}
