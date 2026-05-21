# Phase 5: DDG-Only with Citations - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 14 (8 source, 6 test)
**Analogs found:** 14 / 14

## File Classification

| New/Modified File            | Role       | Data Flow        | Closest Analog   | Match Quality |
| ---------------------------- | ---------- | ---------------- | ---------------- | ------------- |
| `src/lib/perplexity.ts`      | (DELETE)   | --               | --               | --            |
| `src/lib/duckduckgo.ts`      | service    | request-response | itself (modify)  | exact         |
| `src/lib/output.ts`          | utility    | transform        | itself (modify)  | exact         |
| `src/lib/config.ts`          | config     | request-response | itself (modify)  | exact         |
| `src/lib/retry.ts`           | utility    | request-response | itself (modify)  | exact         |
| `src/types.ts`               | model      | --               | itself (modify)  | exact         |
| `src/websearch.ts`           | controller | request-response | itself (rewrite) | exact         |
| `src/webfetch.ts`            | controller | request-response | itself (modify)  | exact         |
| `package.json`               | config     | --               | itself (modify)  | exact         |
| `test/perplexity.test.ts`    | (DELETE)   | --               | --               | --            |
| `test/duckduckgo.test.ts`    | test       | --               | itself (modify)  | exact         |
| `test/websearch.test.ts`     | test       | --               | itself (rewrite) | exact         |
| `test/config.test.ts`        | test       | --               | itself (modify)  | exact         |
| `test/output.test.ts`        | test       | --               | itself (modify)  | exact         |
| `test/webfetch.test.ts`      | test       | --               | itself (modify)  | exact         |
| `test/io-separation.test.ts` | test       | --               | itself (modify)  | exact         |
| `test/retry.test.ts`         | test       | --               | itself (modify)  | exact         |

All files are modifications of themselves. No new files are created. The patterns are the existing code, with specific deletions and additions documented below.

## Pattern Assignments

### `src/types.ts` (model, add snippet field)

**Analog:** `src/types.ts` (current)

**Current pattern** (lines 1-4):

```typescript
export interface SearchResult {
  title: string;
  url: string;
}
```

**Target pattern:** Add `snippet?: string` field. The existing two-field interface is the simplest possible pattern -- add one optional field.

---

### `src/lib/duckduckgo.ts` (service, add snippet extraction)

**Analog:** `src/lib/duckduckgo.ts` (current)

**Current mapping pattern** (lines 20-23):

```typescript
return searchResults.results.map((r) => ({
  title: r.title,
  url: r.url,
}));
```

**Target pattern:** Add `snippet` field mapping `r.description` with HTML tag stripping:

```typescript
return searchResults.results.map((r) => ({
  title: r.title,
  url: r.url,
  snippet: r.description?.replace(/<[^>]*>/g, '') || '',
}));
```

**Key detail:** `duck-duck-scrape` `description` field is HTML-entity-decoded but retains `<b>` tags from DDG bold highlighting. The regex `replace(/<[^>]*>/g, '')` strips these.

**Import pattern** (lines 1-4, unchanged):

```typescript
import { search as ddgSearch } from 'duck-duck-scrape';
import type { SearchResult } from '../types.js';
import { createLogger } from './logger.js';
import type { LogLevel } from './logger.js';
```

---

### `src/lib/output.ts` (utility, add snippet tag, remove provider)

**Analog:** `src/lib/output.ts` (current)

**Current core pattern** (lines 11-25):

```typescript
export function formatSearchResults(results: SearchResult[], provider?: string): string {
  const lines: string[] = [];
  if (provider) {
    lines.push(`<!-- provider: ${provider} -->`);
  }
  lines.push('<search_results>');
  for (const result of results) {
    lines.push('  <result>');
    lines.push(`    <title>${escapeXml(result.title)}</title>`);
    lines.push(`    <url>${escapeXml(result.url)}</url>`);
    lines.push('  </result>');
  }
  lines.push('</search_results>');
  return lines.join('\n');
}
```

**Target pattern (D-05, D-13):** Remove `provider` parameter entirely. Add `<snippet>` element:

```typescript
export function formatSearchResults(results: SearchResult[]): string {
  const lines: string[] = [];
  lines.push('<search_results>');
  for (const result of results) {
    lines.push('  <result>');
    lines.push(`    <title>${escapeXml(result.title)}</title>`);
    lines.push(`    <url>${escapeXml(result.url)}</url>`);
    lines.push(`    <snippet>${escapeXml(result.snippet ?? '')}</snippet>`);
    lines.push('  </result>');
  }
  lines.push('</search_results>');
  return lines.join('\n');
}
```

**escapeXml utility** (lines 3-9, unchanged):

```typescript
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

---

### `src/lib/config.ts` (config, remove perplexity section)

**Analog:** `src/lib/config.ts` (current)

**Changes required:**

1. **ConfigSchema** (lines 7-21): Remove `perplexity` section:

```typescript
export const ConfigSchema = z.strictObject({
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

2. **DEFAULTS** (lines 26-30): Remove `perplexity` key:

```typescript
const DEFAULTS = {
  retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
  logging: { level: 'info' as const },
} as const;
```

3. **ENV_MAP** (lines 33-41): Remove perplexity env vars:

```typescript
const ENV_MAP = {
  'retry.maxRetries': 'WEBSEARCH_RETRY_MAX_RETRIES',
  'retry.baseDelay': 'WEBSEARCH_RETRY_BASE_DELAY',
  'retry.maxDelay': 'WEBSEARCH_RETRY_MAX_DELAY',
  'retry.timeout': 'WEBSEARCH_RETRY_TIMEOUT',
  'logging.level': 'WEBSEARCH_LOGGING_LEVEL',
} as const;
```

4. **ResolvedConfig** (lines 47-61): Remove perplexity section:

```typescript
export interface ResolvedConfig {
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

5. **loadConfig()** (lines 133-152): Remove `perplexity` from return object:

```typescript
export function loadConfig(): ResolvedConfig {
  const rawFile = readConfigFile();
  const fileConfig = rawFile ? validateFileConfig(rawFile) : {};

  return {
    retry: {
      maxRetries: resolve(
        'retry.maxRetries',
        fileConfig.retry?.maxRetries,
        DEFAULTS.retry.maxRetries,
      ),
      baseDelay: resolve('retry.baseDelay', fileConfig.retry?.baseDelay, DEFAULTS.retry.baseDelay),
      maxDelay: resolve('retry.maxDelay', fileConfig.retry?.maxDelay, DEFAULTS.retry.maxDelay),
      timeout: resolve('retry.timeout', fileConfig.retry?.timeout, DEFAULTS.retry.timeout),
    },
    logging: {
      level: resolve('logging.level', fileConfig.logging?.level, DEFAULTS.logging.level),
    },
  };
}
```

**Unchanged patterns:** `readConfigFile()`, `validateFileConfig()`, `resolveFromEnv()`, `resolve()` -- these are generic helpers that work without perplexity references. Only `NUMBER_KEYS` set needs no change (it already excludes perplexity keys).

---

### `src/lib/retry.ts` (utility, remove Perplexity error imports)

**Analog:** `src/lib/retry.ts` (current)

**Changes required:**

1. **Remove Perplexity SDK imports** (lines 1-6): Delete entirely:

```typescript
// DELETE THESE LINES:
import {
  RateLimitError,
  InternalServerError,
  APIConnectionError,
  APIConnectionTimeoutError,
} from '@perplexity-ai/perplexity_ai/error.js';
```

2. **Remove `isTransientError` function** (lines 51-57): Delete entirely:

```typescript
// DELETE THIS FUNCTION:
export function isTransientError(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (err instanceof InternalServerError) return true;
  if (err instanceof APIConnectionError) return true;
  if (err instanceof APIConnectionTimeoutError) return true;
  return false;
}
```

3. **Keep `isDDGTransientError`** (lines 59-64): Unchanged. Will be used by both websearch.ts and webfetch.ts.

4. **Keep everything else**: `RetryConfig`, `getRetryConfig`, `retryWithBackoff`, `sleep`, `withTimeout`, `configureLogger` -- all unchanged.

**Import pattern after cleanup:**

```typescript
import { createLogger } from './logger.js';
import type { LogLevel } from './logger.js';
import type { ResolvedConfig } from './config.js';
```

---

### `src/websearch.ts` (controller, full rewrite)

**Analog:** `src/websearch.ts` (current)

**Current pattern** (complex): Has `hasApiKey` branching, Perplexity primary + DDG fallback, `dedupeAndMerge`, partial result capture, provider tracking, `buildPerplexityDomainFilter`.

**Target pattern (D-09, D-10):** Single DDG path with retry. The existing "no API key: use DDG directly" path (lines 103-113) is the template:

```typescript
import { readStdin, WebSearchInputSchema, validateDomainExclusivity } from './lib/input.js';
import { formatSearchResults } from './lib/output.js';
import { createLogger } from './lib/logger.js';
import type { LogLevel } from './lib/logger.js';
import { loadConfig } from './lib/config.js';
import { searchDDG } from './lib/duckduckgo.js';
import { retryWithBackoff, getRetryConfig, isDDGTransientError } from './lib/retry.js';
import { filterByDomains } from './lib/filter.js';
import * as ddgModule from './lib/duckduckgo.js';
import * as retryModule from './lib/retry.js';
import * as fetchModule from './lib/fetch.js';

function configureModuleLoggers(level: LogLevel): void {
  ddgModule.configureLogger(level);
  retryModule.configureLogger(level);
  fetchModule.configureLogger(level);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('websearch', config.logging.level);
  configureModuleLoggers(config.logging.level);

  try {
    const parsed = await readStdin(WebSearchInputSchema);
    logger.info(`Searching for: ${parsed.query}`);
    validateDomainExclusivity(parsed);

    const results = await retryWithBackoff(
      () => searchDDG(parsed.query),
      isDDGTransientError,
      getRetryConfig(config),
    );
    const filtered = filterByDomains(results, parsed.allowed_domains, parsed.blocked_domains);
    process.stdout.write(formatSearchResults(filtered));
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
```

**Removed:** `import { hasApiKey, search } from './lib/perplexity.js'`, `import * as perplexityModule`, `import { isTransientError, buildPerplexityDomainFilter }`, `dedupeAndMerge()` function, all `hasApiKey`/Perplexity/DDG-fallback branching, provider tracking, `buildPerplexityDomainFilter` call.

---

### `src/webfetch.ts` (controller, simplify)

**Analog:** `src/webfetch.ts` (current)

**Target pattern (D-06):** Remove Perplexity summarization. The existing "no API key" path (lines 37-40) becomes the only path:

```typescript
import { readStdin, WebFetchInputSchema } from './lib/input.js';
import { createLogger } from './lib/logger.js';
import type { LogLevel } from './lib/logger.js';
import { loadConfig } from './lib/config.js';
import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError } from './lib/fetch.js';
import { extractMarkdown } from './lib/content.js';
import { retryWithBackoff, getRetryConfig, isDDGTransientError } from './lib/retry.js';
import * as fetchModule from './lib/fetch.js';
import * as retryModule from './lib/retry.js';

function configureModuleLoggers(level: LogLevel): void {
  fetchModule.configureLogger(level);
  retryModule.configureLogger(level);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('webfetch', config.logging.level);
  configureModuleLoggers(config.logging.level);

  try {
    const input = await readStdin(WebFetchInputSchema);
    logger.info(`Fetching: ${input.url}`);

    const url = normalizeUrl(input.url);
    const { response, finalUrl } = await fetchWithRedirects(url);

    const html = await response.text();
    const markdown = extractMarkdown(html, finalUrl.href);
    process.stdout.write(markdown);
  } catch (err) {
    if (err instanceof CrossHostRedirectError) {
      process.stdout.write(
        `Redirect from ${err.from} to ${err.to} -- cross-host redirect not followed`,
      );
      return;
    }
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
```

**Removed:** `import { hasApiKey, summarize } from './lib/perplexity.js'`, `import { isTransientError }`, `import * as perplexityModule`, `perplexityModule.configureLogger(level)`, the `hasApiKey` check and `summarize` path.

**Note:** `isTransientError` replaced with `isDDGTransientError` (or import removed if retryWithBackoff is not used for fetch itself -- D-07 says keep retryWithBackoff for HTTP fetch failures, but current code does NOT wrap `fetchWithRedirects` in retryWithBackoff. The retry was only for Perplexity summarization. So the retry import may be removable entirely from webfetch.ts. Planner should decide.)

---

### `package.json` (config, remove dependency)

**Analog:** `package.json` (current)

**Change:** Remove line 14:

```
"@perplexity-ai/perplexity_ai": "0.29.0",
```

After removal, run `npm install` to update lockfile.

---

### `src/lib/perplexity.ts` (DELETE)

Delete the entire file. No pattern extraction needed.

---

### `test/perplexity.test.ts` (DELETE)

Delete the entire file. No pattern extraction needed.

---

### `test/duckduckgo.test.ts` (test, add snippet assertions)

**Analog:** `test/duckduckgo.test.ts` (current)

**Current mock result pattern** (lines 31-38):

```typescript
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
```

**Current assertion pattern** (lines 43-46):

```typescript
expect(results).toEqual([
  { title: 'Result 1', url: 'https://example.com/1' },
  { title: 'Result 2', url: 'https://example.com/2' },
]);
```

**Target pattern:** Assertions should include `snippet` field mapped from `description`:

```typescript
expect(results).toEqual([
  { title: 'Result 1', url: 'https://example.com/1', snippet: 'desc 1' },
  { title: 'Result 2', url: 'https://example.com/2', snippet: 'desc 2' },
]);
```

**New test cases to add:**

- Snippet strips `<b>` HTML tags from description
- Snippet is empty string when description is undefined/empty
- Snippet is empty string when description is null

**Test structure pattern** (lines 20-82): Keep the existing `describe/it/beforeEach/afterEach` pattern, `vi.mock('duck-duck-scrape')` pattern, `vi.resetModules()` in `beforeEach`, dynamic `await import('../src/lib/duckduckgo.js')` pattern. Add new `it` blocks within the existing `describe('searchDDG')`.

---

### `test/output.test.ts` (test, add snippet assertions, remove provider tests)

**Analog:** `test/output.test.ts` (current)

**Tests to remove (provider comment tests, lines 44-88):**

- "should include provider comment when provider argument is given"
- "should include duckduckgo provider comment"
- "should NOT include provider comment when provider is undefined"
- "should NOT include provider comment when provider is empty string"
- "should place provider comment before search_results tag"

**Tests to modify:** All existing tests that call `formatSearchResults` with two args -- remove the second `provider` argument.

**Tests to add:**

- `<snippet>` tag present with content when `snippet` field provided
- `<snippet>` tag present but empty when `snippet` is undefined
- `<snippet>` tag present but empty when `snippet` is empty string
- XML entities escaped in snippet content
- Snippet tag appears between `<url>` and `</result>`

**Existing assertion pattern** (lines 6-8, keep):

```typescript
const result = formatSearchResults([]);
expect(result).toBe('<search_results>\n</search_results>');
```

---

### `test/config.test.ts` (test, remove perplexity section tests)

**Analog:** `test/config.test.ts` (current)

**Tests to modify:**

- "should return all default values" (lines 32-43): Remove `config.perplexity.*` assertions, assert only `retry` and `logging` defaults
- "should return file values when config file exists" (lines 48-65): Remove `perplexity` from mock file JSON, remove `config.perplexity.*` assertions
- "should use defaults for keys not specified in file" (lines 67-79): Remove perplexity assertions
- "should resolve each key independently" (lines 107-124): Remove `WEBSEARCH_PERPLEXITY_API_KEY` env stub and perplexity assertions
- "should use defaults for keys with neither env nor file" (lines 126-136): Remove perplexity assertions
- "should accept valid api key from env" (lines 290-297): DELETE entirely
- "should accept valid model from env" (lines 299-306): DELETE entirely
- "should accept a fully populated config" (lines 316-323): Remove `perplexity` from mock object

**Mock config pattern** (used across test files):

```typescript
vi.mock('../src/lib/config.js', () => ({
  loadConfig: vi.fn(() => ({
    retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
    logging: { level: 'info' },
  })),
}));
```

Note: No `perplexity` key in the mock return value.

---

### `test/websearch.test.ts` (test, full rewrite)

**Analog:** `test/websearch.test.ts` (current)

**Tests to remove entirely:**

- All Perplexity-primary tests (hasApiKey=true, mockSearch, etc.)
- All fallback/merge tests (dedupeAndMerge, partial results, perplexity+duckduckgo)
- `mockSearch`, `mockHasApiKey` mock declarations
- `mockBuildPerplexityDomainFilter` mock declaration
- `vi.mock('../src/lib/perplexity.js', ...)` block
- Provider comment assertions

**Tests to keep (adapted):**

- DDG-only path test (lines 121-146): Adapt -- this is now the ONLY path
- Domain filtering tests (lines 236-252, 348-369): Keep structure, remove hasApiKey/mockBuildPerplexityDomainFilter
- Error exit test (lines 199-212): Simplify -- single failure message, not dual-provider
- validateDomainExclusivity test (lines 236-252): Keep as-is

**Simplified mock pattern:**

```typescript
vi.mock('../src/lib/duckduckgo.js', () => ({
  searchDDG: (...args: any[]) => mockSearchDDG(...args),
  configureLogger: vi.fn(),
}));

vi.mock('../src/lib/retry.js', () => ({
  retryWithBackoff: (...args: any[]) => mockRetryWithBackoff(...args),
  getRetryConfig: vi.fn(() => ({
    maxRetries: 4,
    baseDelay: 1000,
    maxDelay: 16000,
    timeout: 30000,
  })),
  isDDGTransientError: vi.fn(),
  configureLogger: vi.fn(),
}));

vi.mock('../src/lib/config.js', () => ({
  loadConfig: vi.fn(() => ({
    retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
    logging: { level: 'info' },
  })),
}));

vi.mock('../src/lib/output.js', () => ({
  formatSearchResults: vi.fn((results: any[]) => {
    const lines: string[] = [];
    lines.push('<search_results>');
    for (const r of results) {
      lines.push('  <result>');
      lines.push(`    <title>${r.title}</title>`);
      lines.push(`    <url>${r.url}</url>`);
      lines.push(`    <snippet>${r.snippet ?? ''}</snippet>`);
      lines.push('  </result>');
    }
    lines.push('</search_results>');
    return lines.join('\n');
  }),
}));
```

**No `perplexity.js` mock block at all.** No `mockSearch`, no `mockHasApiKey`, no `mockBuildPerplexityDomainFilter`.

---

### `test/webfetch.test.ts` (test, remove Perplexity summarization tests)

**Analog:** `test/webfetch.test.ts` (current)

**Mock blocks to remove:**

- `vi.mock('../src/lib/perplexity.js', ...)` (lines 33-39): DELETE entirely
- `mockHasApiKey`, `mockSummarize` declarations: DELETE

**Tests to remove:**

- "should write summarize result to stdout when hasApiKey is true" (lines 177-199)
- "should write error to stderr and set exitCode 1 when summarize fails after retries" (lines 226-248)
- "should call summarize with extracted markdown and user prompt" (lines 250-272)

**Tests to keep (adapted):**

- "should write response text to stdout on successful fetch" (lines 103-123): Remove `mockHasApiKey.mockReturnValue(false)` -- no hasApiKey check needed
- "should write redirect message to stdout for CrossHostRedirectError" (lines 125-146): Keep as-is
- "should write error to stderr and set exitCode to 1 for generic errors" (lines 148-161): Keep as-is
- "should produce error on stderr for invalid input" (lines 163-173): Keep as-is
- "should write raw markdown to stdout when hasApiKey is false" (lines 201-224): Simplify -- now the ONLY path, remove hasApiKey mock

**Mock config pattern** (update to remove perplexity):

```typescript
vi.mock('../src/lib/config.js', () => ({
  loadConfig: vi.fn(() => ({
    retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
    logging: { level: 'info' },
  })),
}));
```

---

### `test/io-separation.test.ts` (test, remove Perplexity mocks)

**Analog:** `test/io-separation.test.ts` (current)

**Mock blocks to remove:**

- `vi.mock('../src/lib/perplexity.js', ...)` (lines 7-12): DELETE entirely
- `mockSearch` declaration (line 4): DELETE

**Tests to modify:**

- All three tests currently use `mockSearch.mockResolvedValue/mockRejectedValue` -- switch to `mockSearchDDG`
- "should have stdout contain only XML" (lines 101-117): Use `mockSearchDDG` instead of `mockSearch`
- "should have stderr contain log messages" (lines 119-136): Use `mockSearchDDG` instead of `mockSearch`
- "should write to stderr only on error case" (lines 138-155): Use `mockSearchDDG.mockRejectedValue` instead of `mockSearch.mockRejectedValue`. Only one error message now (not dual-provider).

**Mock output pattern** (update to remove provider):

```typescript
vi.mock('../src/lib/output.js', () => ({
  formatSearchResults: vi.fn((results: any[]) => {
    const lines: string[] = [];
    lines.push('<search_results>');
    for (const r of results) {
      lines.push('  <result>');
      lines.push(`    <title>${r.title}</title>`);
      lines.push(`    <url>${r.url}</url>`);
      lines.push(`    <snippet>${r.snippet ?? ''}</snippet>`);
      lines.push('  </result>');
    }
    lines.push('</search_results>');
    return lines.join('\n');
  }),
}));
```

---

### `test/retry.test.ts` (test, remove isTransientError tests)

**Analog:** `test/retry.test.ts` (current)

**Test group to remove entirely:**

- `describe('isTransientError', ...)` (lines 117-156): DELETE entirely. These tests import from `@perplexity-ai/perplexity_ai/error.js`.

**Tests to modify:**

- `getRetryConfig` tests (lines 78-115): Remove `perplexity` from `ResolvedConfig` mock:

```typescript
const config: ResolvedConfig = {
  retry: { maxRetries: 6, baseDelay: 500, maxDelay: 8000, timeout: 60000 },
  logging: { level: 'info' },
};
```

**Tests to keep unchanged:**

- `retryWithBackoff` tests (lines 15-76): No Perplexity references
- `isDDGTransientError` tests (lines 158-192): No Perplexity references

## Shared Patterns

### Module Logger Configuration

**Source:** `src/websearch.ts` lines 16-21, `src/webfetch.ts` lines 13-17
**Apply to:** Both entry points (websearch.ts, webfetch.ts)

```typescript
import * as ddgModule from './lib/duckduckgo.js';
import * as retryModule from './lib/retry.js';
import * as fetchModule from './lib/fetch.js';

function configureModuleLoggers(level: LogLevel): void {
  ddgModule.configureLogger(level);
  retryModule.configureLogger(level);
  fetchModule.configureLogger(level);
}
```

### Entry Point Error Handling

**Source:** `src/websearch.ts` lines 116-119, `src/webfetch.ts` lines 49-59
**Apply to:** Both entry points

```typescript
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
```

### Test Mock Setup (vitest)

**Source:** `test/duckduckgo.test.ts` lines 1-19
**Apply to:** All modified test files

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Pattern: mock at module level, reset in beforeEach
const mockFn = vi.fn();
vi.mock('module-path', () => ({
  exportName: (...args: any[]) => mockFn(...args),
}));

beforeEach(() => {
  vi.resetModules();
  mockFn.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### Test Config Mock (Post-Perplexity)

**Source:** All test files that mock config
**Apply to:** All test files that import `loadConfig`

```typescript
vi.mock('../src/lib/config.js', () => ({
  loadConfig: vi.fn(() => ({
    retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
    logging: { level: 'info' },
  })),
}));
```

No `perplexity` key. Every test file that currently includes `perplexity: { apiKey: 'test-key', model: 'sonar' }` in its config mock must remove it.

## No Analog Found

All files have direct analogs (themselves). No new patterns introduced that lack codebase precedent.

| File | Role | Data Flow | Reason                   |
| ---- | ---- | --------- | ------------------------ |
| --   | --   | --        | No files without analogs |

## Metadata

**Analog search scope:** `src/`, `test/` (full project)
**Files scanned:** 17 source/test files
**Pattern extraction date:** 2026-05-21
