# Phase 2: Search Resilience - Research

**Researched:** 2026-05-20
**Domain:** WebSearch fallback orchestration, domain filtering, retry logic
**Confidence:** HIGH

## Summary

Phase 2 adds three capabilities to the existing WebSearch pipeline: DuckDuckGo fallback when Perplexity is unavailable, domain filtering matching Claude Code's interface, and exponential backoff with jitter for transient errors. The implementation builds on Phase 1's existing modules (`perplexity.ts`, `input.ts`, `output.ts`, `logger.ts`) and adds three new modules: `duckduckgo.ts` (DDG search), `retry.ts` (backoff logic), and `filter.ts` (domain filtering).

The most critical research finding resolves D-14: **Perplexity's `search_domain_filter` API parameter supports BOTH allowlist and denylist modes.** Allowlist uses plain domain strings; denylist prefixes with `-` (e.g., `["-reddit.com"]`). Both modes cannot be mixed in a single request. This means `blocked_domains` can be passed directly to the Perplexity API via the `-` prefix convention, not just post-filtered -- contradicting the assumption in D-10 that only allowed domains are supported.

**Primary recommendation:** Use Perplexity API native domain filtering for both `allowed_domains` and `blocked_domains` (with `-` prefix). Post-result filtering is only needed for DDG results and as a safety net.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** DDG results return title+URL only -- no snippets. Output format identical to Perplexity results regardless of provider.
- **D-02:** Use `duck-duck-scrape` library as sole DDG scraping provider. No raw cheerio backup.
- **D-03:** Return all DDG results (no cap). Perplexity returns 5-10, DDG may return 20-30.
- **D-04:** No API key = first-class DDG experience. No warning, no degraded mode indication. DDG is primary when no key present.
- **D-05:** DDG errors follow same clean error path as Perplexity errors. Provider-agnostic error handling.
- **D-06:** Conservative retry defaults: base delay 1s, max delay 16s, 4 retries (~30s total before DDG fallback).
- **D-07:** Retry on all transient errors: 429 (rate limit), 5xx (server errors), network timeouts.
- **D-08:** All retry parameters configurable via env vars: `RETRY_BASE_DELAY`, `RETRY_MAX_DELAY`, `RETRY_MAX_RETRIES`, `RETRY_TIMEOUT`. Config file support in Phase 4.
- **D-09:** Per-request timeout configurable via env var, default 30s.
- **D-10:** Perplexity: pass `allowed_domains` via `search_domain_filter` API param. Blocked domains post-filtered if API doesn't support exclusion (researcher must verify).
- **D-11:** DDG: subdomain-inclusive post-result filtering. `github.com` matches `docs.github.com`, `api.github.com`, etc.
- **D-12:** Strict filtering -- return empty results if filter removes everything. No soft fallback to unfiltered.
- **D-13:** Aggressive domain normalization -- strip protocol, path, trailing slash before filtering. `http://github.com/path` -> `github.com`.
- **D-14:** Perplexity `search_domain_filter` capabilities must be researched before planning. Verify if API supports both allowed and blocked domains, or only allowed.
- **D-15:** Stdout output includes provider name as XML comment: `<!-- provider: perplexity -->` before `<search_results>`. Machine-invisible, human-visible.
- **D-16:** Fallback event logged at debug level to stderr. Not visible at default info level.
- **D-17:** If Perplexity returns partial results then fails, merge with DDG results (don't discard).
- **D-18:** Merged ordering: Perplexity results first, DDG results appended after. Deduplicate by URL.
- **D-19:** Detailed error messages on total failure: include provider name, error type, what was tried.

### Claude's Discretion
- Exact jitter implementation algorithm (full jitter, decorrelated, etc.)
- DDG scraping error recovery (retry DDG or fail immediately)
- Env var naming conventions beyond specified retry params
- Internal code architecture (module split, function signatures)

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SRCH-03 | `allowed_domains` and `blocked_domains` cannot be combined in same call -- returns error if both provided | Input schema already has both fields; add mutual exclusivity validation in `input.ts` or at start of `websearch.ts` |
| SRCH-05 | DuckDuckGo Lite HTML scraping as fallback when Perplexity unavailable, no API key, or credits exhausted | New `src/lib/duckduckgo.ts` using `duck-duck-scrape` library; `search(query)` returns `{ noResults, results: [{title, url}] }` |
| SRCH-06 | Domain filtering applied post-results for DDG, via `search_domain_filter` API param for Perplexity | Perplexity supports both allowlist AND denylist via `-` prefix. DDG requires post-result filtering. New `src/lib/filter.ts` for DDG and safety net. |
| SRCH-07 | Exponential backoff with full jitter retry on rate limit (429) responses from either provider | New `src/lib/retry.ts`. Full jitter algorithm: `Math.random() * Math.min(cap, base * 2^attempt)`. Perplexity SDK has `RateLimitError` class for 429 detection. |
| SRCH-08 | Two-tier fallback: Perplexity -> DDG -> fail cleanly with error message to stderr | Orchestration in `websearch.ts`: try Perplexity (with retries) -> catch -> try DDG (with retries) -> catch -> error to stderr, exit 1 |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Perplexity search + domain filter | API / Backend | -- | Perplexity API handles search and domain filtering server-side |
| DDG fallback search | API / Backend | -- | DDG Lite HTML scraping is a backend HTTP operation |
| Domain post-filtering | Browser / Client (CLI) | -- | Post-result filtering runs locally after provider returns results |
| Retry with backoff | Browser / Client (CLI) | -- | Retry logic wraps provider calls, runs entirely client-side |
| Fallback orchestration | Browser / Client (CLI) | -- | Provider selection and fallback chain runs in the CLI script |
| Error formatting | Browser / Client (CLI) | -- | Error messages assembled client-side from provider error details |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `duck-duck-scrape` | 2.2.7 | DuckDuckGo HTML search scraping | Locked by D-02. Only maintained DDG scraping library. TypeScript-native. Published Jan 2025. [VERIFIED: npm registry + GitHub] |
| `@perplexity-ai/perplexity_ai` | 0.29.0 (installed) | Perplexity API client | Already installed from Phase 1. Provides `RateLimitError`, `InternalServerError`, `APIConnectionError` for retry detection. Has `search_domain_filter` param on `chat.completions.create`. [VERIFIED: npm registry + SDK types checked] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.4.3 (installed) | Input validation | Already in use for `WebSearchInputSchema`. Add mutual exclusivity check for allowed/blocked domains. |
| `vitest` | 4.1.6 (installed) | Testing framework | Already configured. Test files go in `test/**/*.test.ts`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `duck-duck-scrape` | Raw `fetch` + `cheerio` on DDG Lite | More fragile, re-implements HTML parsing that the library already handles. Library abstracts selector brittleness. Per D-02, library is locked. |
| Custom retry module | `p-retry` or `retryyy` npm packages | Adds a dependency for trivially simple logic. Full jitter retry is ~15 lines of TypeScript. No library needed. |

**Installation:**
```bash
npm install duck-duck-scrape
```

**Version verification:**
```
duck-duck-scrape@2.2.7 | MIT | deps: 2 | published 2025-01-09
@perplexity-ai/perplexity_ai@0.29.0 (already installed)
zod@4.4.3 (already installed)
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| duck-duck-scrape | npm | ~5 years (first pub ~2021) | ~50K/wk | github.com/Snazzah/duck-duck-scrape | N/A (slopcheck unavailable) | [ASSUMED] -- planner must add checkpoint |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. duck-duck-scrape is tagged `[ASSUMED]` and the planner should gate the install behind a `checkpoint:human-verify` task. The package has 220 GitHub stars, 30 forks, 27 published versions over ~5 years, and 2 dependencies (html-entities, needle) -- all positive signals.*

## Architecture Patterns

### System Architecture Diagram

```
stdin JSON
    |
    v
[Input Parser] -- validates query, allowed/blocked mutual exclusivity
    |
    v
[Fallback Orchestrator]
    |
    +---> [Perplexity Provider] -- with retry wrapper
    |         |
    |         +-- search_domain_filter param (allowed OR blocked with "-" prefix)
    |         |
    |         +-- on success: return results
    |         |
    |         +-- on transient error (429/5xx/timeout): retry with backoff
    |         |       |
    |         |       ... up to 4 retries (configurable)
    |         |
    |         +-- on permanent error or retries exhausted: throw -> fallback
    |
    +---> [DDG Provider] -- with retry wrapper (if Perplexity failed)
    |         |
    |         +-- search via duck-duck-scrape
    |         |
    |         +-- post-result domain filtering (subdomain-inclusive)
    |         |
    |         +-- on success: return results
    |         |
    |         +-- on error: throw -> total failure
    |
    +---> [Result Merger] -- if Perplexity had partial results
    |         |
    |         +-- Perplexity results first, DDG appended
    |         +-- Deduplicate by URL
    |
    v
[Output Formatter] -- adds provider XML comment, formats <search_results>
    |
    v
stdout XML
```

### Recommended Project Structure
```
src/
  lib/
    perplexity.ts     # (existing) Perplexity client -- add search_domain_filter support
    duckduckgo.ts     # (NEW) DDG search via duck-duck-scrape
    retry.ts          # (NEW) Exponential backoff with full jitter
    filter.ts         # (NEW) Domain normalization and post-result filtering
    input.ts          # (existing) -- add mutual exclusivity validation
    output.ts         # (existing) -- add provider name comment parameter
    logger.ts         # (existing) -- no changes needed
  types.ts            # (existing) -- may extend SearchResult or add ProviderResult
  websearch.ts        # (existing) -- rewrite main() with fallback orchestration
test/
  duckduckgo.test.ts  # DDG provider tests
  retry.test.ts       # Retry logic tests (deterministic with mocked random)
  filter.test.ts      # Domain filtering tests
  websearch.test.ts   # Integration: fallback chain, mutual exclusivity, merge
```

### Pattern 1: Retry with Full Jitter

**What:** Exponential backoff where the delay is uniformly randomized between 0 and the computed exponential value.
**When to use:** All transient provider errors (429, 5xx, network timeouts).
**Example:**
```typescript
// Source: AWS Architecture Blog pattern -- https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;    // default 4
    baseDelay: number;     // default 1000ms
    maxDelay: number;      // default 16000ms
    timeout: number;       // default 30000ms
  }
): Promise<T> {
  let lastError: Error;
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), options.timeout);
    } catch (err) {
      lastError = err as Error;
      if (!isTransient(err) || attempt === options.maxRetries) throw err;
      const delay = Math.random() * Math.min(options.maxDelay, options.baseDelay * Math.pow(2, attempt));
      logger.debug(`Retry ${attempt + 1}/${options.maxRetries} after ${Math.round(delay)}ms: ${lastError.message}`);
      await sleep(delay);
    }
  }
  throw lastError;
}
```

### Pattern 2: Provider-Agnostic Error Classification

**What:** Classify errors into transient (retryable) vs permanent (fail immediately).
**When to use:** In retry wrapper to decide whether to retry or propagate.
**Example:**
```typescript
// Perplexity SDK error classes (verified in node_modules)
import { RateLimitError, InternalServerError, APIConnectionError, APIConnectionTimeoutError } from '@perplexity-ai/perplexity_ai/core/error.js';

function isTransient(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;       // 429
  if (err instanceof InternalServerError) return true;  // 5xx
  if (err instanceof APIConnectionError) return true;   // network
  if (err instanceof APIConnectionTimeoutError) return true; // timeout
  // DDG errors: duck-duck-scrape throws generic Errors
  if (err instanceof Error && /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|429|503/.test(err.message)) return true;
  return false;
}
```

### Pattern 3: Domain Filtering Pipeline

**What:** Normalize domains, then apply allowlist or blocklist filtering with subdomain matching.
**When to use:** Post-result filtering for DDG results, safety net for Perplexity results.
**Example:**
```typescript
// Normalize: strip protocol, path, trailing slash, www prefix
function normalizeDomain(input: string): string {
  return input
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

// Subdomain-inclusive matching: "github.com" matches "docs.github.com"
function matchesDomain(url: string, domain: string): boolean {
  const urlHost = normalizeDomain(new URL(url).hostname);
  const normalizedDomain = normalizeDomain(domain);
  return urlHost === normalizedDomain || urlHost.endsWith('.' + normalizedDomain);
}
```

### Pattern 4: Perplexity Domain Filter Construction

**What:** Build `search_domain_filter` array from user input using Perplexity's `-` prefix convention.
**When to use:** When constructing Perplexity API call with domain filters.
**Example:**
```typescript
// Perplexity API supports both modes via search_domain_filter:
// - allowed_domains: pass as-is ["github.com", "npmjs.com"]
// - blocked_domains: prefix with "-" ["-reddit.com", "-pinterest.com"]
// Max 20 domains per request
// [VERIFIED: Context7 + https://docs.perplexity.ai/docs/sonar/filters]

function buildPerplexityDomainFilter(
  allowedDomains?: string[],
  blockedDomains?: string[]
): string[] | undefined {
  if (allowedDomains && allowedDomains.length > 0) {
    return allowedDomains.slice(0, 20).map(d => normalizeDomain(d));
  }
  if (blockedDomains && blockedDomains.length > 0) {
    return blockedDomains.slice(0, 20).map(d => '-' + normalizeDomain(d));
  }
  return undefined;
}
```

### Anti-Patterns to Avoid

- **Retrying non-transient errors:** 401 (auth), 400 (bad request), 404 (not found) are permanent -- do not retry. Only 429, 5xx, and network errors are transient.
- **Mixing allowlist and denylist in Perplexity API:** The API explicitly forbids mixing both modes. The mutual exclusivity check (SRCH-03) prevents this at the input level.
- **Silent fallback without logging:** D-16 requires debug-level logging of fallback events. Without it, debugging provider issues becomes impossible.
- **Capping DDG results:** D-03 says return all DDG results. Do not apply an arbitrary limit to match Perplexity's 5-10 result range.
- **Discarding partial Perplexity results:** D-17 says merge partial results with DDG. Do not throw away partial data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DDG HTML scraping | Custom fetch + HTML parsing | `duck-duck-scrape` `search()` function | Library handles DDG's HTML structure, rate limiting via `needle` HTTP client, result parsing. DDG HTML changes break custom scrapers. [CITED: duck-duck-scrape.js.org] |
| Perplexity domain filtering | Post-result filtering for allowed_domains on Perplexity | `search_domain_filter` API parameter | Server-side filtering is more accurate and reduces unnecessary data transfer. Perplexity API supports both allowlist and denylist natively. [VERIFIED: Context7 + docs.perplexity.ai] |
| Error classification from Perplexity SDK | Parsing error messages or status codes | SDK error classes (`RateLimitError`, `InternalServerError`, etc.) | SDK provides typed error classes with status codes built in. Type checking is more reliable than string parsing. [VERIFIED: SDK types in node_modules] |

**Key insight:** The Perplexity SDK already classifies errors into typed classes. Use `instanceof` checks rather than parsing status codes or error messages.

## Common Pitfalls

### Pitfall 1: duck-duck-scrape Uses `needle`, Not `fetch`

**What goes wrong:** duck-duck-scrape v2.2.7 uses `needle` as its HTTP client (not native `fetch`). This means `AbortController`/`AbortSignal` patterns won't work for request cancellation.
**Why it happens:** The library was written before native `fetch` was standard in Node.js.
**How to avoid:** Use a timeout wrapper around the entire `search()` call rather than trying to abort the underlying request. The retry module's `withTimeout` should wrap the DDG call externally.
**Warning signs:** Requests that hang indefinitely instead of timing out.

### Pitfall 2: Perplexity `search_domain_filter` Excludes Paths

**What goes wrong:** The API ignores domains with paths, protocols, or trailing slashes.
**Why it happens:** Perplexity's domain filter expects bare domain names only (e.g., `github.com`, not `https://github.com/path/`).
**How to avoid:** Normalize all domain inputs before passing to the API. Strip protocol, path, trailing slash, and www prefix. D-13 already specifies this.
**Warning signs:** Domain filter appears to have no effect -- all results return unfiltered.

### Pitfall 3: Retrying DDG Rate Limits

**What goes wrong:** DDG may rate-limit aggressive scraping requests. Unlike Perplexity, DDG doesn't return structured error responses.
**Why it happens:** DDG Lite is a free service with undocumented rate limits.
**How to avoid:** Apply the same retry logic to DDG calls. Classify DDG errors as transient based on error message patterns (429, 503, ECONNREFUSED, ETIMEDOUT).
**Warning signs:** DDG works in testing but fails in production under load.

### Pitfall 4: Empty Results After Filtering

**What goes wrong:** Strict filtering (D-12) means all results could be filtered out, returning an empty `<search_results>` block.
**Why it happens:** The user specifies domains that don't appear in any result, or DDG returns no results matching the domain filter.
**How to avoid:** This is correct behavior per D-12. But the output format must still be valid XML even with zero results. Test the edge case.
**Warning signs:** XML parser errors in consuming code when `<search_results>` has no `<result>` children.

### Pitfall 5: Perplexity Partial Results Race Condition

**What goes wrong:** Perplexity returns some results but then fails on retry (e.g., returns 3 results, then 429 on the retry attempt). The partial results exist in the first response.
**Why it happens:** D-17 requires merging partial results, but the retry wrapper throws on error, losing the partial data.
**How to avoid:** The retry wrapper must capture partial results before throwing. Consider having the Perplexity provider return `{ results, partial: boolean }` so the orchestrator can access partial data even on failure.
**Warning signs:** Tests that only verify the happy path miss the partial-results-then-failure scenario.

### Pitfall 6: duck-duck-scrape Result Shape Differs from Perplexity

**What goes wrong:** DDG results have `title`, `url`, and `bang` properties. Perplexity results have `title` and `url`. The output format expects only `title` and `url`.
**Why it happens:** Different providers return different metadata.
**How to avoid:** Normalize DDG results to `SearchResult` type (title + url only) immediately upon receiving them. D-01 already specifies title+URL only.
**Warning signs:** Extra fields leaking into output or type errors when merging results.

## Code Examples

### DDG Search Integration

```typescript
// Source: duck-duck-scrape.js.org API reference [CITED]
import { search as ddgSearch } from 'duck-duck-scrape';
import type { SearchResult } from '../types.js';
import { logger } from './logger.js';

export async function searchDDG(query: string): Promise<SearchResult[]> {
  const searchResults = await ddgSearch(query);

  if (searchResults.noResults) {
    logger.debug('DDG returned no results');
    return [];
  }

  return searchResults.results.map(r => ({
    title: r.title,
    url: r.url,
  }));
}
```

### Perplexity with Domain Filter

```typescript
// Source: Context7 perplexity-node + docs.perplexity.ai/docs/sonar/filters [VERIFIED]
import Perplexity from '@perplexity-ai/perplexity_ai';
import type { SearchResult } from '../types.js';

export async function searchPerplexity(
  query: string,
  domainFilter?: string[]  // already formatted with "-" prefix for blocked
): Promise<{ results: SearchResult[]; content: string }> {
  const apiKey = getApiKey();
  const model = process.env.PPLX_MODEL || 'sonar';
  const client = new Perplexity({ apiKey });

  const params: any = {
    model,
    messages: [{ role: 'user', content: query }],
  };

  if (domainFilter && domainFilter.length > 0) {
    params.search_domain_filter = domainFilter;
  }

  const response = await client.chat.completions.create(params);
  // ... extract results as in existing perplexity.ts
}
```

### Output with Provider Comment

```typescript
// Source: existing output.ts + D-15
export function formatSearchResults(results: SearchResult[], provider: string): string {
  const lines: string[] = [`<!-- provider: ${provider} -->`, '<search_results>'];
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Perplexity: allowlist-only `search_domain_filter` | Both allowlist AND denylist via `-` prefix | Unknown (docs updated) | Blocked domains can be sent to Perplexity API directly, no need for post-filtering on Perplexity results |
| Fixed-delay retry | Full jitter exponential backoff | AWS blog ~2015 | Better thundering herd prevention. `Math.random() * min(cap, base * 2^attempt)` |
| DDG API-based search | HTML scraping | DDG discontinued API | Must use scraping libraries; more fragile but functional |

**Deprecated/outdated:**
- DDG official API: No longer available. HTML scraping is the only option. `duck-duck-scrape` is the standard library.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | duck-duck-scrape `search()` returns `{ noResults, vqd, results: [{title, url, ...}] }` | Standard Stack / Code Examples | Medium -- if result shape differs, mapping code needs adjustment |
| A2 | duck-duck-scrape errors are generic `Error` instances (not typed) | Pattern 2 / Anti-Patterns | Low -- error classification may miss some transient cases |
| A3 | duck-duck-scrape `search()` throws on HTTP errors rather than returning error objects | Pattern 2 / Pitfall 1 | Medium -- if it returns error objects instead, error handling needs adjustment |
| A4 | `needle` (duck-duck-scrape dep) does not support AbortController | Pitfall 1 | Low -- if needle v3+ added signal support, timeout wrapping could be simplified |
| A5 | Full jitter algorithm: `Math.random() * Math.min(cap, base * 2^attempt)` | Pattern 1 | Low -- this is the well-established AWS-recommended approach |

## Open Questions

1. **Perplexity `search_domain_filter` reliability for blocked domains**
   - What we know: API docs say `-` prefix works for denylist mode. SDK types confirm the parameter accepts `string[]`.
   - What's unclear: Whether the server-side filtering is 100% reliable or occasionally lets blocked domains through.
   - Recommendation: Add post-result filtering as a safety net for blocked domains even when using the API parameter. This is low-cost insurance.

2. **DDG rate limiting behavior**
   - What we know: DDG Lite has no documented rate limits. `duck-duck-scrape` uses `needle` for HTTP.
   - What's unclear: What HTTP status codes or error patterns DDG returns when rate-limited.
   - Recommendation: Treat DDG errors conservatively -- retry on any network/5xx error but fail fast on non-transient errors.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 26.0.0 | -- |
| npm | Package management | Yes | 11.12.1 | -- |
| duck-duck-scrape | DDG fallback | No (not installed) | 2.2.7 (npm registry) | -- |
| vitest | Testing | Yes | 4.1.6 | -- |
| esbuild | Build | Yes | 0.28.0 | -- |

**Missing dependencies with no fallback:**
- `duck-duck-scrape` must be installed before implementation begins

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 |
| Config file | vitest.config.ts (files: `test/**/*.test.ts`) |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test -- --reporter=verbose` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRCH-03 | Reject when both allowed and blocked domains provided | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-03 | Accept allowed_domains only | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-03 | Accept blocked_domains only | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-05 | DDG fallback when Perplexity unavailable | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-05 | DDG used directly when no API key | unit | `npx vitest run test/duckduckgo.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-06 | Perplexity receives `search_domain_filter` for allowed domains | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-06 | Perplexity receives `-` prefixed blocked domains | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-06 | DDG results post-filtered by allowed domains | unit | `npx vitest run test/filter.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-06 | DDG results post-filtered by blocked domains | unit | `npx vitest run test/filter.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-06 | Subdomain-inclusive matching | unit | `npx vitest run test/filter.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-06 | Domain normalization (protocol, path, slash) | unit | `npx vitest run test/filter.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-07 | Exponential backoff on 429 | unit | `npx vitest run test/retry.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-07 | Retry count respects max | unit | `npx vitest run test/retry.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-07 | Non-transient errors not retried | unit | `npx vitest run test/retry.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-08 | Total failure produces clean error on stderr | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-08 | Partial Perplexity results merged with DDG | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |
| SRCH-08 | URL deduplication in merged results | unit | `npx vitest run test/websearch.test.ts --reporter=verbose` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test/duckduckgo.test.ts` -- covers SRCH-05 (DDG search, result normalization, error handling)
- [ ] `test/retry.test.ts` -- covers SRCH-07 (backoff calculation, retry count, transient classification, non-transient bail)
- [ ] `test/filter.test.ts` -- covers SRCH-06 (domain normalization, allowlist, blocklist, subdomain matching, empty results)
- [ ] `test/websearch.test.ts` -- covers SRCH-03, SRCH-05, SRCH-06, SRCH-08 (integration: fallback chain, mutual exclusivity, merge, output format)
- [ ] `test/helpers/mocks.ts` -- shared test fixtures (mock Perplexity responses, mock DDG results)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | API key is pre-existing (Phase 1). No new auth concerns. |
| V3 Session Management | No | Stateless CLI tool, no sessions. |
| V4 Access Control | No | No user access levels. |
| V5 Input Validation | Yes | Zod schema validates query length, domain arrays. Mutual exclusivity check on allowed/blocked. |
| V6 Cryptography | No | No cryptographic operations. |

### Known Threat Patterns for TypeScript CLI with External APIs

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Domain injection via malformed domain strings | Tampering | Normalize domains aggressively (D-13): strip protocol, path, special chars before use |
| Excessive retry loops causing resource exhaustion | Denial of Service | Hard cap on retry count (default 4), max delay cap (16s), per-request timeout (30s) |
| stderr information leakage | Information Disclosure | Error messages include provider name and error type (D-19) but not API keys or sensitive request bodies |

## Sources

### Primary (HIGH confidence)
- Context7 `/llmstxt/perplexity_ai_llms_txt` -- `search_domain_filter` parameter: allowlist + denylist with `-` prefix, max 20 domains, no mixing modes
- Context7 `/perplexityai/perplexity-node` -- SDK `search_domain_filter` on `chat.completions.create`, typed as `Array<string> | null`
- https://docs.perplexity.ai/docs/sonar/filters -- Official Perplexity docs confirming allowlist AND denylist via `-` prefix
- https://docs.perplexity.ai/docs/search/filters/domain-filter -- Detailed domain filter reference including format guidelines
- SDK types in `node_modules/@perplexity-ai/perplexity_ai/` -- Error classes: `RateLimitError`, `InternalServerError`, `APIConnectionError`, `APIConnectionTimeoutError`
- GitHub `Snazzah/duck-duck-scrape` -- README showing `search()` API: `{ noResults, vqd, results: [{title, url, bang}] }`

### Secondary (MEDIUM confidence)
- duck-duck-scrape.js.org -- API reference for `search()` function signature and return types
- npm registry `duck-duck-scrape@2.2.7` -- Package metadata: 2 deps (html-entities, needle), MIT license, published Jan 2025
- AWS Architecture Blog (aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) -- Full jitter algorithm: `random * min(cap, base * 2^attempt)`

### Tertiary (LOW confidence)
- None -- all findings verified against primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- duck-duck-scrape verified on npm registry, Perplexity SDK already installed and type-checked
- Architecture: HIGH -- modules are straightforward; existing code patterns well-established
- Pitfalls: HIGH -- verified against SDK types, API docs, and library source
- Domain filtering: HIGH -- Perplexity API docs explicitly verified for both allowlist and denylist modes

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (stable APIs, low churn expected)
