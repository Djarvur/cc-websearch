# Phase 3: WebFetch Content Pipeline - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 8 (3 new, 3 modified, 1 rewrite, 1 config)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File                              | Role       | Data Flow        | Closest Analog                                       | Match Quality |
| ---------------------------------------------- | ---------- | ---------------- | ---------------------------------------------------- | ------------- |
| `src/lib/fetch.ts`                             | utility    | request-response | `src/lib/duckduckgo.ts`                              | role-match    |
| `src/lib/content.ts`                           | utility    | transform        | `src/lib/output.ts`                                  | role-match    |
| `src/lib/perplexity.ts` (add `summarize()`)    | service    | request-response | `src/lib/perplexity.ts` (existing `search()`)        | exact         |
| `src/lib/input.ts` (add `WebFetchInputSchema`) | utility    | transform        | `src/lib/input.ts` (existing `WebSearchInputSchema`) | exact         |
| `src/webfetch.ts` (rewrite)                    | controller | request-response | `src/websearch.ts`                                   | exact         |
| `skills/webfetch/SKILL.md` (update)            | config     | N/A              | `skills/websearch/SKILL.md`                          | exact         |
| `test/fetch.test.ts`                           | test       | N/A              | `test/duckduckgo.test.ts`                            | role-match    |
| `test/content.test.ts`                         | test       | N/A              | `test/output.test.ts`                                | role-match    |
| `test/webfetch.test.ts`                        | test       | N/A              | `test/websearch.test.ts`                             | exact         |

## Pattern Assignments

### `src/lib/fetch.ts` (utility, request-response) -- NEW

**Analog:** `src/lib/duckduckgo.ts`

The duckduckgo module is the closest analog: it wraps an external HTTP call and returns typed data. The new fetch module similarly wraps HTTP operations (native `fetch` with redirect handling) and returns typed results.

**Imports pattern** (from `src/lib/duckduckgo.ts`, lines 1-4):

```typescript
import { search as ddgSearch } from 'duck-duck-scrape';
import type { SearchResult } from '../types.js';
import { logger } from './logger.js';
```

For the new module, imports will be:

```typescript
// No external dependencies -- native fetch only
import { logger } from './logger.js';
```

**Core pattern** (from `src/lib/duckduckgo.ts`, lines 6-17) -- single exported async function returning typed data:

```typescript
export async function searchDDG(query: string): Promise<SearchResult[]> {
  const searchResults = await ddgSearch(query);

  if (searchResults.noResults) {
    logger.debug('DDG returned no results');
    return [];
  }

  return searchResults.results.map((r) => ({
    title: r.title,
    url: r.url,
  }));
}
```

The new module exports three things: `CrossHostRedirectError` (custom error class), `normalizeUrl()`, and `fetchWithRedirects()`. Error class pattern from `src/lib/retry.ts` (no custom error classes exist yet, but the retry module's pattern of exporting typed functions with logger usage is the template).

**Error handling pattern:** No try/catch in the utility itself. Errors propagate to the caller (`src/webfetch.ts`). This matches the duckduckgo module pattern where `ddgSearch` errors propagate naturally.

---

### `src/lib/content.ts` (utility, transform) -- NEW

**Analog:** `src/lib/output.ts`

The output module is a pure transform: takes typed input, produces a string. The content module follows the same pattern: takes HTML + URL, produces markdown string.

**Imports pattern** (from `src/lib/output.ts`, lines 1-9):

```typescript
import type { SearchResult } from '../types.js';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

For the new module:

```typescript
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
```

**Core pattern** (from `src/lib/output.ts`, lines 11-25) -- exported function, pure transform:

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

The new `extractMarkdown()` function follows the same pure-function pattern: synchronous (no I/O), takes input parameters, returns a string. Turndown and Readability setup are module-level constants (initialized once).

---

### `src/lib/perplexity.ts` (service, request-response) -- MODIFY (add `summarize()`)

**Analog:** `src/lib/perplexity.ts` itself (adding to existing file)

**Imports** (lines 1-2, unchanged):

```typescript
import Perplexity from '@perplexity-ai/perplexity_ai';
import { logger } from './logger.js';
```

**Existing `search()` pattern** (lines 25-70) to mirror for new `summarize()`:

```typescript
export async function search(
  query: string,
  domainFilter?: string[],
): Promise<{
  results: Array<{ title: string; url: string }>;
  content: string;
}> {
  const apiKey = getApiKey();
  const model = process.env.PPLX_MODEL || 'sonar';

  const client = new Perplexity({ apiKey });

  const params: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: query }],
  };

  if (domainFilter && domainFilter.length > 0) {
    params.search_domain_filter = domainFilter;
  }

  const response = await client.chat.completions.create(params);

  // Extract results from search_results array (preferred)
  const searchResults = (response as any).search_results;
  let results: Array<{ title: string; url: string }>;

  if (searchResults && searchResults.length > 0) {
    results = searchResults.map((r: any) => ({
      title: r.title || r.url,
      url: r.url,
    }));
    logger.debug(`Extracted ${results.length} results from search_results array`);
  } else if (response.citations && response.citations.length > 0) {
    results = response.citations.map((url: string) => ({
      title: url,
      url,
    }));
    logger.debug(`Extracted ${results.length} results from citations array (fallback)`);
  } else {
    results = [];
    logger.debug('No search_results or citations found in response');
  }

  const content = response.choices?.[0]?.message?.content ?? '';

  return { results, content };
}
```

**New `summarize()` follows the same structure:**

- Reuse `getApiKey()` for key retrieval (line 4-19)
- Reuse `process.env.PPLX_MODEL || 'sonar'` for model selection (line 30)
- Same `new Perplexity({ apiKey })` client instantiation (line 32)
- Same `client.chat.completions.create()` call pattern
- Key difference: add `disable_search: true`, use system+user messages (not single user message)
- Return type: `Promise<string>` (just the content, no results array)

**Key reuse:** `getApiKey()` (lines 4-19) and `hasApiKey()` (lines 21-23) are used as-is by the caller (`src/webfetch.ts`).

---

### `src/lib/input.ts` (utility, transform) -- MODIFY (add `WebFetchInputSchema`)

**Analog:** `src/lib/input.ts` itself

**Existing schema pattern** (lines 1-9):

```typescript
import { z } from 'zod';

export const WebSearchInputSchema = z.strictObject({
  query: z.string().min(2, 'Query must be at least 2 characters'),
  allowed_domains: z.array(z.string()).optional(),
  blocked_domains: z.array(z.string()).optional(),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;
```

**New schema follows identical pattern:**

```typescript
export const WebFetchInputSchema = z.strictObject({
  url: z.string().url('Invalid URL format'),
  prompt: z.string().min(1, 'Prompt is required'),
});

export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;
```

**`readStdin()`** (lines 11-19) is reused as-is:

```typescript
export async function readStdin<T>(schema: z.ZodType<T>): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}
```

---

### `src/webfetch.ts` (controller, request-response) -- REWRITE

**Analog:** `src/websearch.ts` (exact match -- sibling entry point)

**Imports pattern** (from `src/websearch.ts`, lines 1-8):

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

For the new webfetch.ts:

```typescript
import { readStdin, WebFetchInputSchema } from './lib/input.js';
import { logger } from './lib/logger.js';
import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError } from './lib/fetch.js';
import { extractMarkdown } from './lib/content.js';
import { hasApiKey, summarize } from './lib/perplexity.js';
import { retryWithBackoff, isTransientError } from './lib/retry.js';
```

**Main function pattern** (from `src/websearch.ts`, lines 20-101):

```typescript
async function main(): Promise<void> {
  try {
    const parsed = await readStdin(WebSearchInputSchema);
    logger.info(`Searching for: ${parsed.query}`);
    // ... pipeline logic ...
    process.stdout.write(formatSearchResults(results, provider));
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
```

**Core structure to replicate:**

1. `async function main(): Promise<void>` with try/catch
2. `readStdin()` with Zod schema for input validation
3. `logger.info()` for operation start
4. Pipeline steps as sequential function calls
5. `process.stdout.write()` for output
6. `catch` block: `logger.error()` + `process.exitCode = 1`
7. `main()` call at module level (no export, IIFE-style)

**Key difference from websearch.ts:** webfetch has a `CrossHostRedirectError` branch in the catch block that writes a user-facing message to stdout instead of stderr (D-10).

---

### `skills/webfetch/SKILL.md` (config) -- UPDATE

**Analog:** `skills/websearch/SKILL.md`

**Existing websearch skill** (reference for format):
The websearch SKILL.md follows Claude Code plugin skill format: YAML frontmatter with `description` and `allowed-tools`, then markdown body with invocation instructions.

**Current webfetch skill** (`skills/webfetch/SKILL.md`, lines 1-17):

````markdown
---
description: Fetch and summarize web page content. Use this skill when the user provides a URL and asks about its content.
allowed-tools: Bash(node *)
---

# WebFetch (Not Yet Implemented)

This skill is a placeholder. WebFetch functionality will be added in a future update.

Run the stub script:

```bash
echo '{"url":"URL","prompt":"QUESTION"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.js"
```
````

The script will return a message indicating this feature is not yet available.

````

**Update:** Change the description and body from "Not Yet Implemented" to actual usage instructions. The invocation pattern (`echo '...' | node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.js"`) stays the same.

---

### `test/fetch.test.ts` (test) -- NEW

**Analog:** `test/duckduckgo.test.ts`

**Test pattern** (from `test/retry.test.ts` and `test/perplexity.test.ts`):

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
````

**Established test conventions:**

- `vi.mock()` for all external dependencies at top level
- `beforeEach`: `vi.stubEnv()` for env vars, `vi.resetModules()`, `mockFn.mockReset()`
- `afterEach`: `vi.restoreAllMocks()`, `vi.unstubAllEnvs()`
- Dynamic imports via `await import('../src/lib/fetch.js')` inside tests (required due to module mocking)
- `describe`/`it` blocks, `expect` assertions
- No external test fixtures; mock data inline

For `fetch.test.ts`, the global `fetch` must be mocked using `vi.fn()` or `vi.stubGlobal('fetch', ...)`.

---

### `test/content.test.ts` (test) -- NEW

**Analog:** `test/output.test.ts`

Same test conventions as above. The content module is a pure function (no I/O, no env vars), so mocking is lighter -- only need mock HTML inputs and verify markdown output. No need to mock `fetch`, `process.stdin`, or env vars. May need to verify Turndown/Readability behavior with specific HTML fixtures.

---

### `test/webfetch.test.ts` (test) -- NEW

**Analog:** `test/websearch.test.ts` (exact match)

**Test pattern** (from `test/websearch.test.ts`, lines 1-101):

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock provider modules
const mockSearch = vi.fn();
const mockHasApiKey = vi.fn();
// ... more mock declarations ...

vi.mock('../src/lib/perplexity.js', () => ({
  search: (...args: any[]) => mockSearch(...args),
  hasApiKey: () => mockHasApiKey(),
  getApiKey: vi.fn().mockReturnValue('test-key'),
}));

vi.mock('../src/lib/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('WebSearch fallback orchestration', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv('PPLX_API_KEY', 'test-key');
    vi.resetModules();
    // ... reset all mocks ...
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  // ... tests ...
});
```

**Key patterns to replicate for webfetch tests:**

- Spy on `process.stdout.write` and `process.stderr.write` to capture output
- Mock all lib modules (`fetch.js`, `content.js`, `perplexity.js`, `retry.js`, `logger.js`, `input.js`)
- Use `mockRetryWithBackoff.mockImplementation(async (fn: any) => fn())` to bypass retry logic
- Use `await import('../src/webfetch.js'); await new Promise((r) => setTimeout(r, 100));` pattern for module-under-test loading
- Verify stdout/stderr content with `stdoutWriteSpy.mock.calls.map((c: any) => String(c[0])).join('')`

## Shared Patterns

### Import Convention

**Source:** All `src/lib/*.ts` files
**Apply to:** All new source files

```typescript
// Relative imports with .js extension (NodeNext module resolution)
import { something } from './other.js';
// Type-only imports use 'type' keyword
import type { SomeType } from '../types.js';
// External packages: default or named imports per package convention
import Perplexity from '@perplexity-ai/perplexity_ai';
```

### Logger Usage

**Source:** `src/lib/logger.ts`
**Apply to:** `src/lib/fetch.ts`, `src/lib/content.ts`, `src/webfetch.ts`

```typescript
import { logger } from './logger.js';
// All output to stderr via logger -- never console.log
logger.info(`Fetching: ${url}`);
logger.debug(`Redirect hop ${hop}: ${currentUrl} -> ${targetUrl}`);
logger.error(errorMessage);
```

### Error Propagation (No try/catch in utility modules)

**Source:** `src/lib/duckduckgo.ts`, `src/lib/output.ts`
**Apply to:** `src/lib/fetch.ts`, `src/lib/content.ts`

Utility modules throw errors naturally. The controller (`src/webfetch.ts` or `src/websearch.ts`) catches all errors in its top-level try/catch:

```typescript
// In utility: throw naturally
export async function fetchWithRedirects(url: URL): Promise<...> {
  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status}: ...`);
  }
}

// In controller: catch all
async function main(): Promise<void> {
  try {
    // ... pipeline ...
  } catch (err: any) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
```

### Stdout for Output, Stderr for Errors

**Source:** `src/websearch.ts` (lines 94-98)
**Apply to:** `src/webfetch.ts`

```typescript
// Success path: write to stdout
process.stdout.write(output);

// Error path: write to stderr via logger, set exit code
logger.error(err instanceof Error ? err.message : String(err));
process.exitCode = 1;
```

### Zod Schema + readStdin Pattern

**Source:** `src/lib/input.ts`
**Apply to:** Adding `WebFetchInputSchema` to same file

```typescript
export const WebFetchInputSchema = z.strictObject({
  // fields...
});
export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;

// readStdin is generic -- reuse with different schema:
const input = await readStdin(WebFetchInputSchema);
```

### Vitest Mock Convention

**Source:** `test/perplexity.test.ts`, `test/websearch.test.ts`
**Apply to:** All new test files

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Declare mock functions at top level
const mockFn = vi.fn();

// 2. vi.mock() calls at module level (hoisted by vitest)
vi.mock('../src/lib/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// 3. beforeEach: stub env, reset modules, reset mocks
beforeEach(() => {
  vi.stubEnv('PPLX_API_KEY', 'test-key');
  vi.resetModules();
  mockFn.mockReset();
});

// 4. afterEach: restore mocks, unstub envs
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// 5. Dynamic import inside tests (required due to vi.mock hoisting)
const { functionName } = await import('../src/lib/module.js');
```

### esbuild Bundle Convention

**Source:** `build.ts` (lines 1-23)
**Apply to:** Already configured for webfetch.ts (line 18-21)

```typescript
const commonOptions = {
  bundle: true,
  platform: 'node' as const,
  target: 'node20',
  format: 'cjs' as const,
  outExtension: { '.js': '.cjs' },
  banner: { js: '#!/usr/bin/env node' },
};

// webfetch is already in the build config:
build({
  ...commonOptions,
  entryPoints: ['src/webfetch.ts'],
  outfile: 'scripts/webfetch.js',
}),
```

No build.ts changes needed -- webfetch entry is already configured.

## No Analog Found

No files without analogs. All new files have close existing matches in the codebase:

| File                           | Closest Analog                                        | Match      |
| ------------------------------ | ----------------------------------------------------- | ---------- |
| `src/lib/fetch.ts`             | `src/lib/duckduckgo.ts` + `src/lib/retry.ts` patterns | role-match |
| `src/lib/content.ts`           | `src/lib/output.ts`                                   | role-match |
| `src/lib/perplexity.ts` modify | itself                                                | exact      |
| `src/lib/input.ts` modify      | itself                                                | exact      |
| `src/webfetch.ts` rewrite      | `src/websearch.ts`                                    | exact      |
| `skills/webfetch/SKILL.md`     | `skills/websearch/SKILL.md`                           | exact      |
| `test/fetch.test.ts`           | `test/duckduckgo.test.ts` / `test/retry.test.ts`      | role-match |
| `test/content.test.ts`         | `test/output.test.ts`                                 | role-match |
| `test/webfetch.test.ts`        | `test/websearch.test.ts`                              | exact      |

## Metadata

**Analog search scope:** `src/`, `test/`, `skills/`, `build.ts`, `vitest.config.ts`, `tsconfig.json`
**Files scanned:** 25
**Pattern extraction date:** 2026-05-20
