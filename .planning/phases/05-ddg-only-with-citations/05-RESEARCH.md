# Phase 5: DDG-Only with Citations - Research

**Researched:** 2026-05-21
**Domain:** Provider removal, DDG snippet extraction, output format enhancement
**Confidence:** HIGH

## Summary

Phase 5 removes the Perplexity provider entirely (code, config, dependencies) and makes DuckDuckGo the sole search provider. The key new capability is adding citation snippets -- DDG's `description` field -- to search results in a `<snippet>` XML tag. WebFetch simplifies to pure content extraction with no LLM summarization layer. Config drops the `perplexity` section entirely.

The scope is well-defined: 8 source files to modify/delete, 6 test files to modify/delete, 1 dependency to remove from package.json. The `duck-duck-scrape` library already exposes a `description` field on search results (HTML-entity-decoded), so snippet extraction is a straightforward field mapping. The main risk is ensuring all Perplexity references are fully purged -- the grep audit found references across 13 files (source + tests).

**Primary recommendation:** Execute as two waves -- Wave 1 removes Perplexity (source, config, dependency, tests) and Wave 2 adds snippet support (types, output format, DDG mapping, tests). This minimizes merge conflicts and keeps each wave independently testable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Include DDG snippet/description text in search results. Supersedes Phase 2 D-01.
- D-02: Use `<snippet>` XML tag for DDG description. Format: `<result><title>...</title><url>...</url><snippet>...</snippet></result>`.
- D-03: Always emit `<snippet>` tag, even when empty.
- D-04: `SearchResult` type gains optional `snippet?: string` field. `searchDDG()` extracts `r.description`.
- D-05: `formatSearchResults()` always includes `<snippet>` element.
- D-06: Remove `summarize()` and `hasApiKey()` from usage. WebFetch: fetch -> extractMarkdown -> stdout.
- D-07: Keep `retryWithBackoff` for HTTP fetch failures in WebFetch.
- D-08: No changes to content extraction pipeline (Readability + Turndown, 100KB truncation).
- D-09: Fully simplify websearch.ts. Main function: loadConfig -> readStdin -> validateDomains -> searchDDG -> filterByDomains -> formatResults -> stdout.
- D-10: Single retry path: `retryWithBackoff(() => searchDDG(query), isDDGTransientError, retryConfig)`.
- D-11: Remove `perplexity` section from ConfigSchema, ResolvedConfig, DEFAULTS, ENV_MAP.
- D-12: Remove `WEBSEARCH_PERPLEXITY_API_KEY` and `WEBSEARCH_PERPLEXITY_MODEL` env var mappings.
- D-13: Remove `<!-- provider: X -->` XML comment from search output.
- D-14: Delete `src/lib/perplexity.ts` entirely.
- D-15: Remove `@perplexity-ai/perplexity_ai` from package.json dependencies.
- D-16: Remove all perplexity imports from websearch.ts and webfetch.ts.
- D-17: Delete `test/perplexity.test.ts` entirely.
- D-18: Update DDG tests: verify snippet extraction.
- D-19: Update websearch tests: remove fallback/merge/dedupe tests, test simplified single-provider flow.
- D-20: Update config tests: remove perplexity section tests.
- D-21: Update output tests: add `<snippet>` tag assertions, remove provider comment assertions.

### Claude's Discretion
- Exact wording of simplified websearch.ts main function
- Specific test case structure for updated tests
- Order of removal operations (source vs tests vs config vs dependencies)

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-01 | Script accepts `{query: string (required, >= 2 chars), allowed_domains?: string[], blocked_domains?: string[]}` | Already implemented in Phase 1 (`src/lib/input.ts`). No changes needed -- input schema stays identical. |
| SRCH-04 | Reinterpreted: search with citations from DDG (was: Perplexity Chat Completions API as primary search provider) | `duck-duck-scrape` v2.2.7 `SearchResult.description` field provides citation text. `SearchResult.snippet?: string` in our types maps to it. Output format adds `<snippet>` XML tag. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Search result retrieval | API / Backend | -- | DDG scraping via `duck-duck-scrape` runs in Node.js CLI |
| Citation snippet extraction | API / Backend | -- | Maps `duck-duck-scrape` result `description` field to output |
| Output formatting | API / Backend | -- | `formatSearchResults()` generates XML with snippet tags |
| Config management | API / Backend | -- | Removes perplexity section from Zod schema and resolution |
| Content extraction (WebFetch) | API / Backend | -- | Readability + Turndown pipeline unchanged, just removes LLM layer |

## Standard Stack

### Core (Unchanged)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `duck-duck-scrape` | 2.2.7 | DDG search provider | Sole search provider now. Provides `description` field for citation snippets. [VERIFIED: npm registry] |
| `zod` | 4.4.3 | Schema validation | Config schema simplified (removes perplexity section). [VERIFIED: package.json] |
| `vitest` | 4.1.6 | Testing framework | Existing test infrastructure. [VERIFIED: package.json] |

### Removed
| Library | Version | Removal Action |
|---------|---------|----------------|
| `@perplexity-ai/perplexity_ai` | 0.29.0 | Remove from package.json dependencies. Delete `src/lib/perplexity.ts`. Remove error class imports from `src/lib/retry.ts`. [VERIFIED: package.json] |

**No new packages installed.** This phase is purely removal + enhancement of existing code.

## Package Legitimacy Audit

> No new packages are installed in this phase. The only package change is REMOVING `@perplexity-ai/perplexity_ai` from dependencies.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@perplexity-ai/perplexity_ai` | npm | ~2 yrs | ~50K/wk | github.com/perplexityai/perplexity-node | N/A (removing) | REMOVING |
| `duck-duck-scrape` | npm | ~5 yrs | ~30K/wk | github.com/nickytonline/duck-duck-scrape (assumed) | N/A (existing) | Already installed |

*No new packages require legitimacy checking. slopcheck was unavailable at research time.*

## Architecture Patterns

### System Architecture Diagram

```
Before (current):                     After (Phase 5):

stdin JSON                             stdin JSON
    |                                      |
    v                                      v
websearch.ts                          websearch.ts
    |                                      |
    +--> hasApiKey? --Y--> Perplexity      +--> searchDDG(query)
    |         |                  |              |
    |         +--> retryWithBackoff          +--> retryWithBackoff
    |                  |                         |
    |         +--------+--------+          DDG results (title, url, description)
    |         v                 v               |
    |    Perplexity OK     Perplexity Fail       +--> filterByDomains
    |         |                 |                     |
    |    provider:       +--> DDG fallback            +--> formatSearchResults
    |    perplexity      |       |                         |
    |         |          |  dedupeAndMerge              <snippet> tags added
    |         |          |       |                     provider comment removed
    |         +----+-----+       |                         |
    |              |             |                         v
    |         formatSearchResults                      stdout XML
    |              |
    |         stdout XML
    |
stdin JSON
    |
    v
webfetch.ts
    |
    +--> fetchWithRedirects
    |         |
    |    extractMarkdown
    |         |
    |    hasApiKey? --Y--> summarize (Perplexity)
    |         |                  |
    |         |            retryWithBackoff
    |         |                  |
    |         +------------------+
    |                   |
    |              stdout

                                    stdin JSON
                                        |
                                        v
                                   webfetch.ts
                                        |
                                        +--> fetchWithRedirects
                                        |         |
                                        |    extractMarkdown
                                        |         |
                                        |    retryWithBackoff
                                        |    (for HTTP errors only)
                                        |         |
                                        |         v
                                        |      stdout
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── config.ts        # Simplified: removes perplexity section
│   ├── content.ts       # UNCHANGED
│   ├── duckduckgo.ts    # MODIFIED: adds snippet extraction (r.description)
│   ├── fetch.ts         # UNCHANGED
│   ├── filter.ts        # UNCHANGED
│   ├── input.ts         # UNCHANGED
│   ├── logger.ts        # UNCHANGED
│   ├── output.ts        # MODIFIED: adds <snippet>, removes provider param
│   ├── retry.ts         # MODIFIED: removes Perplexity error imports, removes isTransientError
│   └── perplexity.ts    # DELETED
├── types.ts             # MODIFIED: adds snippet?: string to SearchResult
├── websearch.ts         # REWRITTEN: simplified single-provider DDG flow
└── webfetch.ts          # SIMPLIFIED: removes Perplexity summarization

test/
├── config.test.ts       # MODIFIED: removes perplexity section tests
├── content.test.ts      # UNCHANGED
├── duckduckgo.test.ts   # MODIFIED: adds snippet extraction tests
├── filter.test.ts       # UNCHANGED
├── io-separation.test.ts # MODIFIED: removes Perplexity mocks
├── logger.test.ts       # UNCHANGED
├── output.test.ts       # MODIFIED: adds snippet assertions, removes provider comment tests
├── perplexity.test.ts   # DELETED
├── retry.test.ts        # MODIFIED: removes isTransientError tests, Perplexity error imports
├── webfetch.test.ts     # MODIFIED: removes Perplexity summarization tests/mocks
└── websearch.test.ts    # REWRITTEN: simplified single-provider flow tests
```

### Pattern 1: Snippet Extraction from duck-duck-scrape
**What:** Map `r.description` from duck-duck-scrape results to `snippet` field on `SearchResult`.
**When to use:** In `searchDDG()` function.
**Important detail:** The `description` field is HTML-entity-decoded but may contain `<b>` tags from DDG bold highlighting. These should be stripped before output. [VERIFIED: node_modules/duck-duck-scrape/lib/search/search.js]
**Example:**
```typescript
// In src/lib/duckduckgo.ts
export async function searchDDG(query: string): Promise<SearchResult[]> {
  const searchResults = await ddgSearch(query);

  if (searchResults.noResults) {
    logger.debug('DDG returned no results');
    return [];
  }

  return searchResults.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description?.replace(/<[^>]*>/g, '') || '',
  }));
}
```

### Pattern 2: XML Output with Snippet Tags
**What:** Always include `<snippet>` element in output, even when empty.
**When to use:** In `formatSearchResults()`.
**Example:**
```typescript
// In src/lib/output.ts
export function formatSearchResults(results: SearchResult[]): string {
  const lines: string[] = [];
  // No provider comment (D-13)
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

### Pattern 3: Simplified WebSearch Entry Point
**What:** Single DDG path with retry, no branching.
**When to use:** Complete rewrite of `websearch.ts` main function.
**Example:**
```typescript
// Simplified websearch.ts main function (D-09, D-10)
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
```

### Anti-Patterns to Avoid
- **Leaving dead imports:** Any `import ... from './lib/perplexity.js'` or `import ... from '@perplexity-ai/perplexity_ai/...'` will break at compile time. The grep audit found references in 6 source files and 7 test files. Every one must be removed or the file deleted.
- **Keeping `isTransientError` in retry.ts:** This function exists solely to detect Perplexity SDK error classes. After removing the SDK, it cannot work. Either delete it or replace with a generic HTTP error detector. The DDG path already has `isDDGTransientError`.
- **Forgetting to update `ResolvedConfig` consumers:** Three modules import `ResolvedConfig` type: `retry.ts`, `perplexity.ts` (deleting), and test files. After removing the `perplexity` section from the type, all references to `config.perplexity.*` will fail type-checking.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML tag stripping in DDG description | Custom regex or parser | Simple regex `replace(/<[^>]*>/g, '')` | DDG descriptions only contain `<b>` tags. No complex HTML. A full parser would be overkill; the regex is sufficient and the same approach DDG scrapers have used for years. |
| Retry logic for DDG | New retry module | Existing `retryWithBackoff` with `isDDGTransientError` | Already implemented and tested in Phase 2. Just remove the Perplexity-specific `isTransientError`. |

## Common Pitfalls

### Pitfall 1: Incomplete Perplexity Purge
**What goes wrong:** A stray import or reference to Perplexity code causes runtime crash or build failure.
**Why it happens:** Perplexity references are spread across 13 files. The `isTransientError` function in `retry.ts` imports from `@perplexity-ai/perplexity_ai/error.js` -- easy to miss since the import is for error classes, not the main SDK.
**How to avoid:** After all edits, run `grep -r "perplexity\|@perplexity" src/ test/` and verify zero matches. Then run `tsc --noEmit` and `npm test`.
**Warning signs:** Build fails with "Cannot find module '@perplexity-ai/perplexity_ai'".

### Pitfall 2: DDG Description Contains HTML Tags
**What goes wrong:** Snippet output contains `<b>search term</b>` from DDG highlighting, breaking the XML structure or looking ugly.
**Why it happens:** The `duck-duck-scrape` `description` field is HTML-entity-decoded but retains bold tags. The type declaration explicitly states: "Bold tags will still be present in this string." [VERIFIED: node_modules/duck-duck-scrape/lib/search/search.d.ts]
**How to avoid:** Strip HTML tags from `r.description` before using as snippet. A simple `replace(/<[^>]*>/g, '')` suffices.
**Warning signs:** Output contains `<b>` or `</b>` inside `<snippet>` tags.

### Pitfall 3: Test Mocks Still Reference Perplexity
**What goes wrong:** Tests pass locally but fail in CI because mock setup still imports or references deleted Perplexity module.
**Why it happens:** Several test files (`websearch.test.ts`, `webfetch.test.ts`, `io-separation.test.ts`, `retry.test.ts`) have `vi.mock('../src/lib/perplexity.js', ...)` declarations. These must be removed along with all references to `mockSearch`, `mockHasApiKey`, `mockSummarize`, etc.
**How to avoid:** Delete `test/perplexity.test.ts` entirely. For other test files, remove all Perplexity mock blocks and any test cases that test Perplexity-specific behavior (fallback, merge, dedupe).
**Warning signs:** `vitest` fails with "Cannot find module '../src/lib/perplexity.js'".

### Pitfall 4: Config Type Mismatch After Removing Perplexity Section
**What goes wrong:** `ResolvedConfig` no longer has `perplexity` property, but test helpers or other code still access `config.perplexity.*`.
**Why it happens:** The `makeConfig()` helper in test files, `ResolvedConfig` imports in `retry.ts`, and inline config objects in test mocks all reference `perplexity: { apiKey, model }`.
**How to avoid:** After editing `config.ts`, update `ResolvedConfig` type. Then search for `config.perplexity` and `perplexity:` across all test files and fix each occurrence.
**Warning signs:** TypeScript compilation fails with "Property 'perplexity' does not exist on type 'ResolvedConfig'".

### Pitfall 5: `buildPerplexityDomainFilter` Still Called
**What goes wrong:** `websearch.ts` simplified main function still calls `buildPerplexityDomainFilter`, which was designed for the Perplexity API's `search_domain_filter` parameter.
**Why it happens:** Domain filtering was wired through both Perplexity-native (API parameter) and post-filter (for DDG results). After removing Perplexity, the Perplexity-specific builder function is dead code.
**How to avoid:** The simplified `websearch.ts` should only use `filterByDomains()` directly. The `buildPerplexityDomainFilter()` import and call should be removed. The function itself can remain in `filter.ts` (dead code) or be removed -- either works.
**Warning signs:** Unused import warning, or confusion about which filter function to call.

## Code Examples

### Simplified websearch.ts (Complete Rewrite)
```typescript
// Source: Phase 5 CONTEXT.md D-09, D-10
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

### Simplified webfetch.ts
```typescript
// Source: Phase 5 CONTEXT.md D-06, D-07, D-08
import { readStdin, WebFetchInputSchema } from './lib/input.js';
import { createLogger } from './lib/logger.js';
import type { LogLevel } from './lib/logger.js';
import { loadConfig } from './lib/config.js';
import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError } from './lib/fetch.js';
import { extractMarkdown } from './lib/content.js';
import { retryWithBackoff, getRetryConfig, isTransientError } from './lib/retry.js';
import * as fetchModule from './lib/fetch.js';
import * as retryModule from './lib/retry.js';

// NOTE: isTransientError may need to be replaced with a generic HTTP error check
// if Perplexity error classes are removed from retry.ts.
// Consider using isDDGTransientError or a new isHttpTransientError function.

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

### Simplified Config (config.ts)
```typescript
// Source: Phase 5 CONTEXT.md D-11, D-12
export const ConfigSchema = z.strictObject({
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

const DEFAULTS = {
  retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
  logging: { level: 'info' as const },
} as const;

const ENV_MAP = {
  'retry.maxRetries': 'WEBSEARCH_RETRY_MAX_RETRIES',
  'retry.baseDelay': 'WEBSEARCH_RETRY_BASE_DELAY',
  'retry.maxDelay': 'WEBSEARCH_RETRY_MAX_DELAY',
  'retry.timeout': 'WEBSEARCH_RETRY_TIMEOUT',
  'logging.level': 'WEBSEARCH_LOGGING_LEVEL',
} as const;

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

### Simplified Retry (retry.ts) -- Key Change
```typescript
// REMOVE: The isTransientError function and its Perplexity SDK imports
// REMOVE: import { RateLimitError, InternalServerError, APIConnectionError, APIConnectionTimeoutError }
//         from '@perplexity-ai/perplexity_ai/error.js';

// KEEP: isDDGTransientError (used by websearch.ts)
// KEEP: retryWithBackoff, getRetryConfig, RetryConfig (unchanged)
// KEEP: configureLogger (unchanged)

// webfetch.ts may still need a transient error checker for HTTP fetch failures.
// Option A: Use isDDGTransientError for HTTP errors too (it catches ECONNREFUSED, ETIMEDOUT, 429, 503)
// Option B: Create a generic isHttpTransientError function
// Option C: Remove retry wrapper from webfetch.ts (D-07 says "keep retryWithBackoff for HTTP fetch failures")
// Recommendation: Option A -- isDDGTransientError covers all relevant HTTP transient errors.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Perplexity + DDG two-tier fallback | DDG-only single provider | Phase 5 (2026-05-21) | Simpler code, no API key needed, no fallback complexity |
| `<result><title/><url/></result>` output | `<result><title/><url/><snippet/></result>` output | Phase 5 (2026-05-21) | Richer search results with citation context |
| `<!-- provider: X -->` comment in output | No provider comment | Phase 5 (2026-05-21) | Cleaner output, single provider makes comment redundant |
| WebFetch: Perplexity summarization | WebFetch: raw markdown only | Phase 5 (2026-05-21) | No API key needed, but loses LLM summarization |

**Deprecated/outdated:**
- `isTransientError()` function: Uses Perplexity SDK error classes. Must be removed along with SDK.
- `buildPerplexityDomainFilter()`: Designed for Perplexity API parameter. Becomes dead code but harmless to leave.
- `dedupeAndMerge()`: Only used for Perplexity+DDG merge. Becomes dead code.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DDG `description` field may contain `<b>` HTML tags that should be stripped | Architecture Patterns | Snippet output contains raw HTML tags |
| A2 | `isDDGTransientError` is sufficient for WebFetch HTTP retry (covers ECONNREFUSED, ETIMEDOUT, 429, 503) | Code Examples | WebFetch may not retry on some transient HTTP errors |
| A3 | `buildPerplexityDomainFilter` can be left as dead code in `filter.ts` without harm | Common Pitfalls | Slight code bloat, confusion for future readers |

**Note:** Claims A1 and A3 are low-risk. A2 should be confirmed by the planner -- if WebFetch uses `isTransientError` currently, it needs a replacement. The current `webfetch.ts` imports `isTransientError` (line 8) which uses Perplexity error classes, so a replacement IS needed.

## Open Questions

1. **WebFetch retry error detection**
   - What we know: `webfetch.ts` currently imports `isTransientError` from `retry.ts` for retrying failed fetch operations. This function detects Perplexity SDK error classes (RateLimitError, etc.).
   - What's unclear: After removing Perplexity SDK, `isTransientError` cannot work. Should webfetch use `isDDGTransientError` (which detects generic HTTP errors via regex) or should we create a new generic HTTP transient error function?
   - Recommendation: Use `isDDGTransientError` for webfetch HTTP retries. It already covers ECONNREFUSED, ETIMEDOUT, ENOTFOUND, 429, and 503 -- all relevant HTTP transient errors. Rename to `isHttpTransientError` for clarity, or just import it as-is.

2. **Whether to also remove `buildPerplexityDomainFilter` from `filter.ts`**
   - What we know: The function is designed for Perplexity API's `search_domain_filter` parameter format. After Perplexity removal, `websearch.ts` will use `filterByDomains()` directly.
   - What's unclear: Whether to also remove the dead function from `filter.ts` or leave it.
   - Recommendation: Remove it. Dead code confuses future readers and `filterByDomains` is all that's needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 22.x | -- |
| npm | Package management | Yes | 10.x | -- |
| vitest | Testing | Yes | 4.1.6 | -- |
| tsc | Type checking | Yes | 6.0.3 | -- |

**Missing dependencies with no fallback:** None
**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 |
| Config file | none -- uses package.json `test` script |
| Quick run command | `npm test` |
| Full suite command | `npm test` (168 tests, ~3s) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-01 | Input schema accepts query, allowed_domains, blocked_domains | unit | `npx vitest run test/input.test.ts -t "schema"` | Yes (existing) |
| SRCH-04 | DDG search returns results with citation snippets | unit | `npx vitest run test/duckduckgo.test.ts` | Yes (needs update) |
| SRCH-04 | Output format includes `<snippet>` tags | unit | `npx vitest run test/output.test.ts` | Yes (needs update) |
| SRCH-04 | Simplified single-provider flow works end-to-end | integration | `npx vitest run test/websearch.test.ts` | Yes (needs rewrite) |
| D-06 | WebFetch returns raw markdown (no summarization) | unit | `npx vitest run test/webfetch.test.ts` | Yes (needs update) |
| D-11 | Config no longer has perplexity section | unit | `npx vitest run test/config.test.ts` | Yes (needs update) |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test && tsc --noEmit`
- **Phase gate:** Full suite green, `tsc --noEmit` clean, `grep -r "perplexity" src/ test/` returns zero matches (except possibly dead function in filter.ts)

### Wave 0 Gaps
- None -- existing test infrastructure covers all phase requirements. Tests need modification, not creation.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth required (DDG has no API key) |
| V3 Session Management | No | No sessions |
| V4 Access Control | No | No access control needed |
| V5 Input Validation | Yes | Zod schema validation (existing `input.ts`) |
| V6 Cryptography | No | No crypto operations |

### Known Threat Patterns for Node.js CLI + Web Scraping

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XML injection via search result title/description | Tampering | `escapeXml()` in `output.ts` already handles `& < > "` |
| Malicious URL in search results | Tampering | Domain filtering (`filterByDomains`) with allow/block lists |

**Key security note:** This phase improves security posture by removing a third-party API dependency and its SDK. No new attack surface is introduced.

## Sources

### Primary (HIGH confidence)
- `node_modules/duck-duck-scrape/lib/search/search.d.ts` -- `SearchResult` interface with `description` and `rawDescription` fields [VERIFIED: file read]
- `node_modules/duck-duck-scrape/lib/search/search.js` -- `description` uses `html-entities.decode()` for sanitization [VERIFIED: file read]
- Phase 5 CONTEXT.md -- All locked decisions D-01 through D-21 [VERIFIED: file read]
- Source code: All 8 source files and 7 test files read and analyzed for Perplexity references [VERIFIED: file read]

### Secondary (MEDIUM confidence)
- `package.json` -- Current dependency versions confirmed [VERIFIED: file read]
- npm registry -- `duck-duck-scrape` v2.2.7 confirmed current [VERIFIED: `npm view`]

### Tertiary (LOW confidence)
- None -- all findings verified from codebase files and npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new packages, only removal. Existing packages verified.
- Architecture: HIGH - Complete codebase audit performed. All files read and analyzed.
- Pitfalls: HIGH - Grep audit found all 13 files with Perplexity references. DDG description field verified.
- Output format: HIGH - `<snippet>` tag is straightforward XML addition. Escape function already exists.

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (stable -- no fast-moving dependencies in this phase)
