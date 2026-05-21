# Phase 2: Search Resilience - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 13 (3 modified, 4 new source, 6 new test)
**Analogs found:** 13 / 13

## File Classification

| New/Modified File         | Role       | Data Flow        | Closest Analog                           | Match Quality  |
| ------------------------- | ---------- | ---------------- | ---------------------------------------- | -------------- |
| `src/lib/duckduckgo.ts`   | service    | request-response | `src/lib/perplexity.ts`                  | exact          |
| `src/lib/retry.ts`        | utility    | transform        | `src/lib/logger.ts` (module pattern)     | role-match     |
| `src/lib/filter.ts`       | utility    | transform        | (no close analog -- pure utility)        | none           |
| `src/lib/perplexity.ts`   | service    | request-response | (existing -- modify in place)            | self           |
| `src/lib/input.ts`        | utility    | transform        | (existing -- modify in place)            | self           |
| `src/lib/output.ts`       | utility    | transform        | (existing -- modify in place)            | self           |
| `src/websearch.ts`        | controller | request-response | (existing -- rewrite main)               | self           |
| `test/duckduckgo.test.ts` | test       | n/a              | `test/perplexity.test.ts`                | exact          |
| `test/retry.test.ts`      | test       | n/a              | `test/perplexity.test.ts`                | role-match     |
| `test/filter.test.ts`     | test       | n/a              | `test/output.test.ts`                    | role-match     |
| `test/websearch.test.ts`  | test       | n/a              | `test/websearch.test.ts` (existing)      | self (rewrite) |
| `test/helpers/mocks.ts`   | test       | n/a              | `test/websearch.test.ts` (mock patterns) | partial        |
| `package.json`            | config     | n/a              | (existing -- add dependency)             | self           |

## Pattern Assignments

### `src/lib/duckduckgo.ts` (service, request-response)

**Analog:** `src/lib/perplexity.ts`

This is the closest structural match. Both are provider modules that export a `search(query)` function returning `Promise<{results, content}>`. The DDG version omits `content` and `getApiKey`.

**Imports pattern** (copy from `src/lib/perplexity.ts` lines 1-2):

```typescript
import { search as ddgSearch } from 'duck-duck-scrape';
import { logger } from './logger.js';
```

**Core search pattern** (based on `src/lib/perplexity.ts` lines 21-59, adapted for DDG):

```typescript
// Perplexity pattern: function takes query, returns typed results, logs at debug level
// DDG follows same shape but simpler -- no API key, no content extraction
export async function searchDDG(query: string): Promise<SearchResult[]> {
  const searchResults = await ddgSearch(query);

  if (searchResults.noResults) {
    logger.debug('DDG returned no results');
    return [];
  }

  // Map to SearchResult type (title + url only, per D-01)
  return searchResults.results.map((r) => ({
    title: r.title,
    url: r.url,
  }));
}
```

**Error handling:** DDG errors are generic `Error` instances (no typed classes like Perplexity SDK). Let them propagate -- the retry wrapper in `src/lib/retry.ts` will catch and classify them.

---

### `src/lib/retry.ts` (utility, transform)

**Analog:** `src/lib/logger.ts` (same pattern: small stateless utility module, exports functions, reads config from env vars)

**Module pattern** (from `src/lib/logger.ts` lines 1-23 -- same env-var-driven config, same exported function object pattern):

```typescript
// Logger reads LOG_LEVEL from env at module load time.
// Retry module reads RETRY_BASE_DELAY, RETRY_MAX_DELAY, RETRY_MAX_RETRIES, RETRY_TIMEOUT similarly.
type RetryConfig = {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
};

function getRetryConfig(): RetryConfig {
  return {
    maxRetries: parseInt(process.env.RETRY_MAX_RETRIES || '4', 10),
    baseDelay: parseInt(process.env.RETRY_BASE_DELAY || '1000', 10),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '16000', 10),
    timeout: parseInt(process.env.RETRY_TIMEOUT || '30000', 10),
  };
}
```

**Core pattern -- retryWithBackoff** (from RESEARCH.md Pattern 1, no existing codebase analog):

```typescript
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
      if (!isTransient(err) || attempt === config.maxRetries) throw err;
      const delay =
        Math.random() * Math.min(config.maxDelay, config.baseDelay * Math.pow(2, attempt));
      logger.debug(
        `Retry ${attempt + 1}/${config.maxRetries} after ${Math.round(delay)}ms: ${lastError.message}`,
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
```

---

### `src/lib/filter.ts` (utility, transform)

**No close analog.** This is a pure utility module with no I/O. The closest pattern is `src/lib/output.ts` -- small, stateless, purely functional, no env vars, no logger needed.

**Module pattern** (from `src/lib/output.ts` -- small utility with exported functions, no class):

```typescript
// output.ts pattern: import types, export pure functions
import type { SearchResult } from '../types.js';

// filter.ts follows same pattern:
export function filterByDomains(
  results: SearchResult[],
  allowedDomains?: string[],
  blockedDomains?: string[],
): SearchResult[];
```

**Core functions** (from RESEARCH.md Pattern 3):

```typescript
export function normalizeDomain(input: string): string {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

export function matchesDomain(url: string, domain: string): boolean {
  const urlHost = normalizeDomain(new URL(url).hostname);
  const normalizedDomain = normalizeDomain(domain);
  return urlHost === normalizedDomain || urlHost.endsWith('.' + normalizedDomain);
}
```

---

### `src/lib/perplexity.ts` (service, request-response) -- MODIFY

**Self-modification.** Add `search_domain_filter` parameter to `search()` function signature.

**Current signature** (line 21):

```typescript
export async function search(query: string): Promise<{
  results: Array<{ title: string; url: string }>;
  content: string;
}>;
```

**Modified signature:**

```typescript
export async function search(
  query: string,
  domainFilter?: string[], // pre-formatted: plain for allowed, "-domain" for blocked
): Promise<{
  results: Array<{ title: string; url: string }>;
  content: string;
}>;
```

**Insert domain filter into API call** (line 30-33, add `search_domain_filter`):

```typescript
const params: Record<string, any> = {
  model,
  messages: [{ role: 'user', content: query }],
};
if (domainFilter && domainFilter.length > 0) {
  params.search_domain_filter = domainFilter;
}
const response = await client.chat.completions.create(params);
```

---

### `src/lib/input.ts` (utility, transform) -- MODIFY

**Self-modification.** Add mutual exclusivity validation for `allowed_domains`/`blocked_domains`.

**Current schema** (lines 3-7, unchanged):

```typescript
export const WebSearchInputSchema = z.strictObject({
  query: z.string().min(2, 'Query must be at least 2 characters'),
  allowed_domains: z.array(z.string()).optional(),
  blocked_domains: z.array(z.string()).optional(),
});
```

**Add a refinement or a post-parse check** (two options):

1. Zod `.refine()` on the schema
2. A separate `validateMutualExclusion()` function called in `websearch.ts`

Option 2 is simpler and matches the existing pattern where `websearch.ts` orchestrates logic:

```typescript
// In input.ts, add:
export function validateDomainExclusivity(input: {
  allowed_domains?: string[];
  blocked_domains?: string[];
}): void {
  if (input.allowed_domains && input.blocked_domains) {
    throw new Error('Cannot specify both allowed_domains and blocked_domains in the same request.');
  }
}
```

---

### `src/lib/output.ts` (utility, transform) -- MODIFY

**Self-modification.** Add `provider` parameter to `formatSearchResults`.

**Current signature** (line 11):

```typescript
export function formatSearchResults(results: SearchResult[]): string;
```

**Modified signature:**

```typescript
export function formatSearchResults(results: SearchResult[], provider?: string): string;
```

**Insert provider comment** (line 12, before `<search_results>`):

```typescript
const lines: string[] = [];
if (provider) {
  lines.push(`<!-- provider: ${provider} -->`);
}
lines.push('<search_results>');
```

---

### `src/websearch.ts` (controller, request-response) -- REWRITE MAIN

**Self-modification.** Rewrite `main()` to add retry/fallback orchestration and domain filtering.

**Current pattern** (lines 6-22):

```typescript
async function main(): Promise<void> {
  try {
    const parsed = await readStdin(WebSearchInputSchema);
    logger.info(`Searching for: ${parsed.query}`);
    const { results, content } = await search(parsed.query);
    logger.debug(`Perplexity content: ${content}`);
    process.stdout.write(formatSearchResults(results));
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
```

**New orchestration pattern** (preserve same try/catch shape, add provider chain):

```typescript
async function main(): Promise<void> {
  try {
    const parsed = await readStdin(WebSearchInputSchema);
    validateDomainExclusivity(parsed);
    logger.info(`Searching for: ${parsed.query}`);

    let results: SearchResult[];
    let provider: string;

    if (getApiKeySafe()) {
      // Primary: Perplexity with retry + domain filter
      const domainFilter = buildPerplexityDomainFilter(
        parsed.allowed_domains,
        parsed.blocked_domains,
      );
      try {
        const pplxResult = await retryWithBackoff(
          () => search(parsed.query, domainFilter),
          isTransientError,
        );
        results = pplxResult.results;
        provider = 'perplexity';
      } catch (pplxErr) {
        // Fallback to DDG
        logger.debug(`Perplexity failed, falling back to DDG: ${(pplxErr as Error).message}`);
        results = await retryWithBackoff(() => searchDDG(parsed.query), isDDGTransientError);
        results = filterByDomains(results, parsed.allowed_domains, parsed.blocked_domains);
        provider = 'duckduckgo';
      }
    } else {
      // No API key: DDG is primary (D-04)
      results = await retryWithBackoff(() => searchDDG(parsed.query), isDDGTransientError);
      results = filterByDomains(results, parsed.allowed_domains, parsed.blocked_domains);
      provider = 'duckduckgo';
    }

    process.stdout.write(formatSearchResults(results, provider));
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
```

---

### `test/duckduckgo.test.ts` (test) -- NEW

**Analog:** `test/perplexity.test.ts` (exact match -- provider test with mocked SDK)

**Test structure pattern** (from `test/perplexity.test.ts`):

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the external library (like perplexity.test.ts mocks @perplexity-ai/perplexity_ai)
const mockDdgSearch = vi.fn();

vi.mock('duck-duck-scrape', () => ({
  search: mockDdgSearch,
}));

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('searchDDG', () => {
  beforeEach(() => {
    mockDdgSearch.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return title+URL results from DDG search', async () => { ... });
  it('should return empty array when noResults is true', async () => { ... });
  it('should propagate errors for retry wrapper to handle', async () => { ... });
});
```

---

### `test/retry.test.ts` (test) -- NEW

**Analog:** `test/perplexity.test.ts` (role-match -- same test structure)

**Test structure pattern:** Same `describe`/`it`/`beforeEach`/`afterEach` shape. Key difference: mock `Math.random` for deterministic delay testing.

```typescript
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
  it('should return result on first successful call');
  it('should retry on transient errors up to maxRetries');
  it('should throw immediately on non-transient errors');
  it('should use exponential backoff with jitter between retries');
  it('should respect timeout parameter');
});
```

---

### `test/filter.test.ts` (test) -- NEW

**Analog:** `test/output.test.ts` (role-match -- pure function tests with no mocking needed)

**Test structure pattern** (from `test/output.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeDomain, matchesDomain, filterByDomains } from '../src/lib/filter.js';

describe('normalizeDomain', () => {
  it('should strip protocol', () => { ... });
  it('should strip path', () => { ... });
  it('should strip www prefix', () => { ... });
});

describe('matchesDomain', () => {
  it('should match exact domain', () => { ... });
  it('should match subdomain', () => { ... });
});

describe('filterByDomains', () => {
  it('should filter by allowed_domains with subdomain matching', () => { ... });
  it('should filter by blocked_domains', () => { ... });
  it('should return empty array when all results filtered (D-12)', () => { ... });
});
```

---

### `test/websearch.test.ts` (test) -- REWRITE

**Self-modification.** Existing file will be rewritten to test the new fallback orchestration.

**Current test pattern** (from `test/websearch.test.ts` lines 1-43): Heavily mocked with `vi.mock()` at top level, `vi.spyOn` for stdout/stderr, dynamic `import()` in each test.

The rewritten version needs additional mocks for `duckduckgo`, `retry`, and `filter` modules, following the same `vi.mock()` at top-level pattern.

---

### `test/helpers/mocks.ts` (test) -- NEW

**Analog:** Mock definitions in `test/websearch.test.ts` lines 4-42

Extract shared mock fixtures:

```typescript
// Shared test fixtures
export const mockPerplexityResults = [
  { title: 'Perplexity Result 1', url: 'https://example.com/1' },
];
export const mockDDGResults = [{ title: 'DDG Result 1', url: 'https://example.com/ddg1' }];
```

---

### `package.json` (config) -- MODIFY

Add `duck-duck-scrape` to dependencies:

```json
"duck-duck-scrape": "2.2.7"
```

---

## Shared Patterns

### Logger Mock

**Source:** `test/perplexity.test.ts` lines 18-25
**Apply to:** All new test files (`test/duckduckgo.test.ts`, `test/retry.test.ts`)

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

### Provider Mock Pattern

**Source:** `test/perplexity.test.ts` lines 4-16
**Apply to:** `test/duckduckgo.test.ts` (mock `duck-duck-scrape` the same way Perplexity SDK is mocked)

```typescript
const mockDdgSearch = vi.fn();

vi.mock('duck-duck-scrape', () => ({
  search: mockDdgSearch,
}));
```

### ESM Import Pattern

**Source:** All source files use `.js` extension in imports despite writing `.ts` files
**Apply to:** All new source files

```typescript
import { logger } from './logger.js'; // NOT './logger.ts'
import type { SearchResult } from '../types.js'; // .js extension required by NodeNext module resolution
```

### Error Propagation Pattern

**Source:** `src/lib/perplexity.ts` -- no try/catch in the search function; errors propagate to caller
**Apply to:** `src/lib/duckduckgo.ts` -- let errors propagate to retry wrapper

```typescript
// Provider modules do NOT catch errors. They throw.
// The retry wrapper (retry.ts) catches and decides whether to retry.
// The orchestrator (websearch.ts) catches for fallback.
```

### Stdout/Stderr Separation

**Source:** `src/websearch.ts` lines 15-16, `src/lib/logger.ts` line 14
**Apply to:** All output in modified `websearch.ts`

```typescript
// Results go to stdout
process.stdout.write(formatSearchResults(results, provider));
// All logging goes to stderr via logger
logger.error(err instanceof Error ? err.message : String(err));
```

### Env Var Configuration Pattern

**Source:** `src/lib/perplexity.ts` lines 5-19 (getApiKey), `src/lib/logger.ts` line 3 (LOG_LEVEL)
**Apply to:** `src/lib/retry.ts` (retry config from env vars)

```typescript
// Pattern: read env var at call time, provide default fallback
const value = process.env.SOME_VAR || 'default';
```

## No Analog Found

| File                    | Role    | Data Flow | Reason                                                                                                                                                |
| ----------------------- | ------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/filter.ts`     | utility | transform | No existing pure-utility transform module in codebase. Closest is `output.ts` but that has I/O (string building). Use RESEARCH.md Pattern 3 directly. |
| `test/helpers/mocks.ts` | test    | n/a       | No shared test helper exists. New pattern.                                                                                                            |

## Metadata

**Analog search scope:** `src/`, `test/`, root config files
**Files scanned:** 17
**Pattern extraction date:** 2026-05-20
