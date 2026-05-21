# Phase 4: Config File and Logging - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 12 (1 new, 5 modify source, 6 modify tests)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File         | Role       | Data Flow           | Closest Analog                      | Match Quality                        |
| ------------------------- | ---------- | ------------------- | ----------------------------------- | ------------------------------------ |
| `src/lib/config.ts`       | utility    | file-I/O, transform | `src/lib/input.ts`                  | role-match (Zod schema + validation) |
| `src/lib/logger.ts`       | utility    | transform           | `src/lib/logger.ts` (current)       | exact (self-refactor)                |
| `src/lib/retry.ts`        | service    | request-response    | `src/lib/retry.ts` (current)        | exact (self-refactor)                |
| `src/lib/perplexity.ts`   | service    | request-response    | `src/lib/perplexity.ts` (current)   | exact (self-refactor)                |
| `src/websearch.ts`        | controller | request-response    | `src/websearch.ts` (current)        | exact (self-refactor)                |
| `src/webfetch.ts`         | controller | request-response    | `src/webfetch.ts` (current)         | exact (self-refactor)                |
| `test/config.test.ts`     | test       | file-I/O            | `test/input.test.ts`                | role-match (Zod schema testing)      |
| `test/logger.test.ts`     | test       | transform           | `test/logger.test.ts` (current)     | exact (self-refactor)                |
| `test/retry.test.ts`      | test       | request-response    | `test/retry.test.ts` (current)      | exact (self-refactor)                |
| `test/perplexity.test.ts` | test       | request-response    | `test/perplexity.test.ts` (current) | exact (self-refactor)                |
| `test/websearch.test.ts`  | test       | request-response    | `test/websearch.test.ts` (current)  | exact (self-refactor)                |
| `test/webfetch.test.ts`   | test       | request-response    | `test/webfetch.test.ts` (current)   | exact (self-refactor)                |

## Pattern Assignments

### `src/lib/config.ts` (utility, file-I/O + transform)

**Analog:** `src/lib/input.ts` (Zod schema validation pattern)

**Imports pattern** -- copy from `src/lib/input.ts` lines 1-2:

```typescript
import { z } from 'zod';
```

Plus Node built-ins:

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
```

**Zod strictObject schema pattern** -- copy from `src/lib/input.ts` lines 3-7:

```typescript
export const WebSearchInputSchema = z.strictObject({
  query: z.string().min(2, 'Query must be at least 2 characters'),
  allowed_domains: z.array(z.string()).optional(),
  blocked_domains: z.array(z.string()).optional(),
});
```

Adapt to three nested sections with `.optional()` on each section and each field:

```typescript
const ConfigSchema = z.strictObject({
  perplexity: z
    .strictObject({
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
  retry: z
    .strictObject({
      maxRetries: z.number().int().min(0).optional(),
      baseDelay: z.number().int().min(0).optional(),
      maxDelay: z.number().int().min(0).optional(),
      timeout: z.number().int().min(0).optional(),
    })
    .optional(),
  logging: z
    .strictObject({
      level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    })
    .optional(),
});
```

**Critical: No logger import.** The config module writes warnings directly to `process.stderr.write()` to avoid circular dependency with logger. See Shared Patterns below.

**Config reading + safeParse pattern** (new, but follows established conventions):

```typescript
// Read config file (sync, per RESEARCH recommendation)
const CONFIG_PATH = join(homedir(), '.config', 'websearch', 'config.json');

function readConfigFile(): Record<string, unknown> | null {
  if (!existsSync(CONFIG_PATH)) return null; // D-05: silent
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    process.stderr.write('[warn] Failed to parse config file\n');
    return null;
  }
}

// Validate with safeParse, warn on errors
export function loadConfig(): ResolvedConfig {
  const raw = readConfigFile();
  // ... validate, merge env > file > defaults ...
}
```

**Type inference pattern** -- copy from `src/lib/input.ts` line 9:

```typescript
export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
```

Adapt to:

```typescript
export type Config = z.infer<typeof ConfigSchema>;
export interface ResolvedConfig {
  /* fully resolved with all defaults applied */
}
```

---

### `src/lib/logger.ts` (utility, transform) -- REFACTOR

**Analog:** `src/lib/logger.ts` (current, self-refactor)

**Current pattern** (lines 1-23) being refactored:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function log(level: LogLevel, message: string): void {
  if (LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]) {
    process.stderr.write(`[${level}] ${message}\n`);
  }
}

export const logger = {
  debug: (msg: string) => log('debug', msg),
  info: (msg: string) => log('info', msg),
  warn: (msg: string) => log('warn', msg),
  error: (msg: string) => log('error', msg),
};
```

**Target pattern** -- factory function instead of singleton:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(module: string, level: LogLevel = 'info') {
  let currentLevel = level;

  function log(level: LogLevel, message: string): void {
    if (LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]) {
      const timestamp = new Date().toISOString();
      process.stderr.write(`[${timestamp}] [${level}:${module}] ${message}\n`);
    }
  }

  return {
    debug: (msg: string) => log('debug', msg),
    info: (msg: string) => log('info', msg),
    warn: (msg: string) => log('warn', msg),
    error: (msg: string) => log('error', msg),
    setLevel: (newLevel: LogLevel) => {
      currentLevel = newLevel;
    },
  };
}
```

**Key changes:**

1. Remove `let currentLevel` at module scope (was reading `process.env.LOG_LEVEL` at import time)
2. Change `export const logger = { ... }` to `export function createLogger(module: string, level: LogLevel)`
3. Add timestamp: `new Date().toISOString()` to format
4. Add module prefix: `[${level}:${module}]` to format
5. Add `setLevel()` method for runtime level changes

---

### `src/lib/retry.ts` (service, request-response) -- REFACTOR

**Analog:** `src/lib/retry.ts` (current, self-refactor)

**Current `getRetryConfig()` pattern** (lines 16-23) being refactored:

```typescript
export function getRetryConfig(): RetryConfig {
  return {
    maxRetries: parseInt(process.env.RETRY_MAX_RETRIES || '4', 10),
    baseDelay: parseInt(process.env.RETRY_BASE_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '16000', 10),
    timeout: parseInt(process.env.RETRY_TIMEOUT || '30000', 10),
  };
}
```

**Target pattern** -- accept config object parameter:

```typescript
export function getRetryConfig(config: ResolvedConfig): RetryConfig {
  return {
    maxRetries: config.retry.maxRetries,
    baseDelay: config.retry.baseDelay,
    maxDelay: config.retry.maxDelay,
    timeout: config.retry.timeout,
  };
}
```

**Unchanged sections** (lines 25-80): `sleep()`, `withTimeout()`, `isTransientError()`, `isDDGTransientError()`, `retryWithBackoff()` -- these remain identical. Only `getRetryConfig()` and its call site in `retryWithBackoff()` (line 60) need updating.

**Import change** (line 7): Change from `import { logger } from './logger.js'` to `import { createLogger } from './logger.js'` and create module-scoped logger:

```typescript
import { createLogger } from './logger.js';
// Logger created at call time with config, or passed in
```

Note: Since `retryWithBackoff` calls `getRetryConfig()` internally (line 60), the config must be threaded through. The cleanest approach is to accept config as a parameter to `retryWithBackoff` or have `getRetryConfig` accept it.

---

### `src/lib/perplexity.ts` (service, request-response) -- REFACTOR

**Analog:** `src/lib/perplexity.ts` (current, self-refactor)

**Current env var reading pattern** (lines 4-19, 30, 79) being refactored:

```typescript
export function getApiKey(): string {
  const pplxKey = process.env.PPLX_API_KEY;
  const perpKey = process.env.PERPLEXITY_API_KEY;
  // ...
  throw new Error('No API key found. Set PPLX_API_KEY or PERPLEXITY_API_KEY environment variable.');
}

export function hasApiKey(): boolean {
  return !!(process.env.PPLX_API_KEY || process.env.PERPLEXITY_API_KEY);
}
```

**Target pattern** -- accept config object:

```typescript
export function getApiKey(config: ResolvedConfig): string {
  if (config.perplexity.apiKey) {
    return config.perplexity.apiKey;
  }
  throw new Error(
    'No API key found. Set WEBSEARCH_PERPLEXITY_API_KEY or add apiKey to config file.',
  );
}

export function hasApiKey(config: ResolvedConfig): boolean {
  return !!config.perplexity.apiKey;
}
```

**Model selection** (lines 30, 79):

```typescript
// Before: const model = process.env.PPLX_MODEL || 'sonar';
// After:  const model = config.perplexity.model;
```

**Unchanged sections**: `search()` function body (lines 25-69) and `summarize()` function body (lines 77-99) -- the Perplexity SDK interaction logic stays the same. Only the API key retrieval and model selection change.

---

### `src/websearch.ts` (controller, request-response) -- UPDATE

**Analog:** `src/websearch.ts` (current, self-refactor)

**Current import pattern** (lines 1-8):

```typescript
import { readStdin, WebSearchInputSchema, validateDomainExclusivity } from './lib/input.js';
import { formatSearchResults } from './lib/output.js';
import { logger } from './lib/logger.js';
import { hasApiKey, search } from './lib/perplexity.js';
import { searchDDG } from './lib/duckduckgo.js';
import { retryWithBackoff, isTransientError, isDDGTransientError } from './lib/retry.js';
import { filterByDomains, buildPerplexityDomainFilter } from './lib/filter.js';
import type { SearchResult } from './types.js';
```

**Target pattern** -- add config initialization at entry point:

```typescript
import { loadConfig } from './lib/config.js';
import { createLogger } from './lib/logger.js';
import { readStdin, WebSearchInputSchema, validateDomainExclusivity } from './lib/input.js';
// ... other imports unchanged

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('websearch', config.logging.level);
  // Pass config to modules that need it
  // ... rest of main() logic, passing config where needed
}

main();
```

**Key change**: Config loads once at startup, logger created with module name and config level. All downstream module calls pass config or logger.

---

### `src/webfetch.ts` (controller, request-response) -- UPDATE

**Analog:** `src/webfetch.ts` (current, self-refactor)

**Same pattern as websearch.ts** -- add config initialization, create logger with module name `'webfetch'`.

**Current import pattern** (lines 1-6):

```typescript
import { readStdin, WebFetchInputSchema } from './lib/input.js';
import { logger } from './lib/logger.js';
import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError } from './lib/fetch.js';
import { extractMarkdown } from './lib/content.js';
import { hasApiKey, summarize } from './lib/perplexity.js';
import { retryWithBackoff, isTransientError } from './lib/retry.js';
```

**Target**: Add `loadConfig` and `createLogger` imports, create scoped logger with `'webfetch'` module name, pass config to perplexity and retry functions.

---

### `test/config.test.ts` (test, file-I/O) -- EXPAND

**Analog:** `test/input.test.ts` (Zod schema testing pattern)

**Note:** Current `test/config.test.ts` (lines 1-96) contains perplexity getApiKey/hasApiKey tests using `vi.resetModules()` + dynamic imports. This file should be repurposed for the new config module tests. The perplexity-specific tests likely belong in `test/perplexity.test.ts` or may already be there.

**Test structure pattern** from `test/input.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

**Test cases needed** (per RESEARCH.md Wave 0):

- loadConfig returns defaults when no config file and no env vars
- loadConfig reads config file values
- loadConfig merges env > file > defaults per key
- loadConfig returns defaults when config file missing (silent, D-05)
- loadConfig warns on stderr for invalid values (D-06)
- loadConfig warns on stderr for unknown keys (D-07)
- loadConfig coerces env var strings to numbers for retry fields

---

### `test/logger.test.ts` (test, transform) -- REFACTOR

**Analog:** `test/logger.test.ts` (current, self-refactor)

**Current pattern** (lines 1-43):

```typescript
describe('logger', () => {
  async function getFreshLogger() {
    vi.resetModules();
    const { logger } = await import('../src/lib/logger.js');
    return logger;
  }

  it('should write info message to stderr when LOG_LEVEL is info or debug', async () => {
    vi.stubEnv('LOG_LEVEL', 'info');
    const logger = await getFreshLogger();
    // ...
  });
});
```

**Target pattern** -- direct `createLogger()` calls, no module reset needed:

```typescript
import { createLogger } from '../src/lib/logger.js';

describe('createLogger', () => {
  it('should write info message with timestamp and module prefix', () => {
    const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logger = createLogger('test', 'info');
    logger.info('test message');
    expect(stderrWriteSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T.*\] \[info:test\] test message\n/),
    );
    stderrWriteSpy.mockRestore();
  });
});
```

**Key change**: No more `vi.resetModules()` or dynamic imports. `createLogger()` is a pure factory -- call directly.

---

### `test/retry.test.ts` (test, request-response) -- UPDATE

**Analog:** `test/retry.test.ts` (current, self-refactor)

**Env var stub updates needed:**

- Line 86: `vi.stubEnv('RETRY_MAX_RETRIES', '6')` -> `vi.stubEnv('WEBSEARCH_RETRY_MAX_RETRIES', '6')`
- Line 87: `vi.stubEnv('RETRY_BASE_DELAY', '500')` -> `vi.stubEnv('WEBSEARCH_RETRY_BASE_DELAY', '500')`
- Line 88: `vi.stubEnv('RETRY_MAX_DELAY', '8000')` -> `vi.stubEnv('WEBSEARCH_RETRY_MAX_DELAY', '8000')`
- Line 89: `vi.stubEnv('RETRY_TIMEOUT', '60000')` -> `vi.stubEnv('WEBSEARCH_RETRY_TIMEOUT', '60000')`

**Logger mock update** (lines 3-10): Change from:

```typescript
vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
```

To:

```typescript
vi.mock('../src/lib/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  }),
}));
```

---

### `test/perplexity.test.ts` (test, request-response) -- UPDATE

**Analog:** `test/perplexity.test.ts` (current, self-refactor)

**Note:** This file (`test/config.test.ts` content appears to be the perplexity tests -- verify file naming). The tests in `test/config.test.ts` test `getApiKey` and `hasApiKey` from perplexity module.

**Env var stub updates needed:**

- All `PPLX_API_KEY` -> `WEBSEARCH_PERPLEXITY_API_KEY`
- All `PERPLEXITY_API_KEY` -> can be removed (only `WEBSEARCH_PERPLEXITY_API_KEY` exists now)
- `PPLX_MODEL` -> `WEBSEARCH_PERPLEXITY_MODEL`
- Error message: `'No API key found. Set PPLX_API_KEY or PERPLEXITY_API_KEY environment variable.'` -> `'No API key found. Set WEBSEARCH_PERPLEXITY_API_KEY or add apiKey to config file.'`

---

### `test/websearch.test.ts` (test, request-response) -- UPDATE

**Analog:** `test/websearch.test.ts` (current, self-refactor)

**Env var stub updates needed** (line 81):

```typescript
// Before:
vi.stubEnv('PPLX_API_KEY', 'test-key');
vi.stubEnv('PPLX_MODEL', '');
// After:
vi.stubEnv('WEBSEARCH_PERPLEXITY_API_KEY', 'test-key');
vi.stubEnv('WEBSEARCH_PERPLEXITY_MODEL', '');
```

**Logger mock update** (lines 25-32): Change from `{ logger: { ... } }` to `{ createLogger: () => ({ ... }) }`.

**Config mock addition**: May need `vi.mock('../src/lib/config.js', ...)` to provide a mock `loadConfig()` returning default config values.

---

### `test/webfetch.test.ts` (test, request-response) -- UPDATE

**Analog:** `test/webfetch.test.ts` (current, self-refactor)

**Same pattern as websearch.test.ts** -- update logger mock from `{ logger }` to `{ createLogger: () => ({ ... }) }`, add config mock if entry point calls `loadConfig()`.

**Logger mock** (lines 48-55):

```typescript
// Before:
vi.mock('../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
// After:
vi.mock('../src/lib/logger.js', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  }),
}));
```

---

## Shared Patterns

### Config Object Type (ResolvedConfig)

**Apply to:** `src/lib/config.ts` (defines), `src/lib/retry.ts`, `src/lib/perplexity.ts`, `src/websearch.ts`, `src/webfetch.ts` (consume)
**Pattern:** All config values resolved to concrete types (no `undefined`), no `process.env` reads outside config module:

```typescript
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
```

### Logger Factory Pattern (createLogger)

**Source:** `src/lib/logger.ts` (refactored)
**Apply to:** All lib modules that need logging (`retry.ts`, `perplexity.ts`, `duckduckgo.ts`, `fetch.ts`, `content.ts`, `output.ts`)
**Pattern:** Each module creates its own scoped logger instance:

```typescript
import { createLogger } from './logger.js';
const logger = createLogger('modulename', config.logging.level);
```

**Module names** (from D-09): `config`, `retry`, `perplexity`, `ddg`, `fetch`, `content`, `filter`, `input`, `output`

### Circular Dependency Avoidance (config -> logger)

**Source:** RESEARCH.md Pitfall 3
**Apply to:** `src/lib/config.ts`
**Rule:** Config module writes warnings directly to `process.stderr.write()`. It must NOT import logger. Logger is initialized AFTER config loads.

```typescript
// In config.ts -- write warnings directly, no logger import
process.stderr.write(`[warn] Invalid config at ${path}: ${issue.message}\n`);
```

### Env Var Naming Convention (WEBSEARCH\_\*)

**Source:** CONTEXT.md D-02
**Apply to:** `src/lib/config.ts` (reads them), all test files (stub them)
**Mapping:**
| Config Key | Env Var |
|------------|---------|
| `perplexity.apiKey` | `WEBSEARCH_PERPLEXITY_API_KEY` |
| `perplexity.model` | `WEBSEARCH_PERPLEXITY_MODEL` |
| `retry.maxRetries` | `WEBSEARCH_RETRY_MAX_RETRIES` |
| `retry.baseDelay` | `WEBSEARCH_RETRY_BASE_DELAY` |
| `retry.maxDelay` | `WEBSEARCH_RETRY_MAX_DELAY` |
| `retry.timeout` | `WEBSEARCH_RETRY_TIMEOUT` |
| `logging.level` | `WEBSEARCH_LOGGING_LEVEL` |

### Test Logger Mock Pattern (createLogger)

**Apply to:** All test files that mock the logger

```typescript
vi.mock('../src/lib/logger.js', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  })),
}));
```

### Test Config Mock Pattern

**Apply to:** `test/websearch.test.ts`, `test/webfetch.test.ts` (entry point tests that need config)

```typescript
vi.mock('../src/lib/config.js', () => ({
  loadConfig: vi.fn(() => ({
    perplexity: { apiKey: 'test-key', model: 'sonar' },
    retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
    logging: { level: 'info' },
  })),
}));
```

### Zod safeParse Error Inspection

**Source:** RESEARCH.md, verified against zod 4.4.3
**Apply to:** `src/lib/config.ts` (warning messages), `test/config.test.ts` (assertion pattern)

```typescript
const result = ConfigSchema.safeParse(raw);
if (!result.success) {
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    process.stderr.write(`[warn] Invalid config at ${path}: ${issue.message}\n`);
  }
}
```

## No Analog Found

No files without analogs. All new/modified files have direct analogs in the current codebase. The closest analog for the new `src/lib/config.ts` is `src/lib/input.ts` which demonstrates the established Zod `strictObject` schema validation pattern used throughout the project.

## Metadata

**Analog search scope:** `src/lib/`, `src/`, `test/`
**Files scanned:** 20 source + test files
**Pattern extraction date:** 2026-05-20
