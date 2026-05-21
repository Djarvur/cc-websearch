---
phase: 05-ddg-only-with-citations
reviewed: 2026-05-21T15:30:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/types.ts
  - src/lib/duckduckgo.ts
  - src/lib/output.ts
  - src/lib/config.ts
  - src/lib/retry.ts
  - src/lib/filter.ts
  - src/websearch.ts
  - src/webfetch.ts
  - package.json
  - test/duckduckgo.test.ts
  - test/output.test.ts
  - test/config.test.ts
  - test/retry.test.ts
  - test/filter.test.ts
  - test/websearch.test.ts
  - test/webfetch.test.ts
  - test/io-separation.test.ts
  - scripts/websearch.cjs
  - scripts/webfetch.cjs
  - scripts/websearch.js
  - scripts/webfetch.js
  - test/logger.test.ts
  - test/helpers/mocks.ts
findings:
  critical: 1
  warning: 3
  info: 4
  total: 8
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-05-21T15:30:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed all source, test, and bundle files changed in Phase 5 (DDG-Only with Citations). The Perplexity removal from source code is clean -- no imports, no runtime references remain. The snippet extraction and XML output are correct and properly escaped. All 127 tests pass.

One critical issue: the stale `.cjs` bundle `scripts/websearch.cjs` still contains the full Perplexity SDK (~24K lines, 1.3MB) from a pre-Phase-5 build. If any execution path loads this file instead of the rebuilt `.js` bundle, it would execute the old dual-provider code. Additionally, the HTML-tag-stripping regex in `duckduckgo.ts` has a correctness edge case with certain malformed HTML patterns, and two metadata files still reference "Perplexity" in their descriptions.

## Critical Issues

### CR-01: Stale CJS bundle contains full Perplexity SDK and old dual-provider logic

**File:** `scripts/websearch.cjs`
**Issue:** The `scripts/websearch.cjs` file was last built on 2026-05-20 (before Phase 5 changes) and still bundles the entire `@perplexity-ai/perplexity_ai` SDK (~4700 lines of Perplexity code). It also does NOT include the new `<snippet>` tag in its output format -- confirmed by `grep -n "snippet" scripts/websearch.cjs` returning no matches. The current `build.ts` config produces `.cjs` output (`outExtension: { '.js': '.cjs' }`), which means a fresh build would overwrite the `.cjs` files with correct output. However, the rebuilt `.js` files (from commit `fed2ac2`) sit alongside the stale `.cjs` files. Any tool, plugin loader, or deployment script that loads the `.cjs` extension would execute the old code with Perplexity imports and without snippet support. This is a distribution-correctness risk.

**Fix:**
Either rebuild to regenerate the `.cjs` files (`npm run build`), or delete the stale `.cjs` files if they are no longer the target format:

```bash
npm run build  # rebuilds .cjs files from current source
# OR, if .js is the new target format:
rm scripts/websearch.cjs scripts/webfetch.cjs
# And update build.ts to remove: outExtension: { '.js': '.cjs' }
```

## Warnings

### WR-01: HTML tag stripping regex can corrupt content with `<` in text

**File:** `src/lib/duckduckgo.ts:23`
**Issue:** The regex `/<[^>]*>/g` used to strip HTML tags from DDG descriptions will incorrectly consume text when a `<` appears in non-HTML context (e.g., `"if a < b then"` becomes `"if a "`). DuckDuckGo descriptions sometimes contain mathematical or comparison expressions where `<` is a literal less-than sign. The regex matches from `<` to the next `>`, eating everything in between. This produces silently corrupted snippet content rather than preserving the original text.

**Fix:**
Use a more conservative regex that only strips actual HTML tags (matching known tag patterns):

```typescript
snippet: r.description?.replace(/<\/?[a-zA-Z][^>]*>/g, '') || '',
```

This requires tags to start with a letter after `<`, which excludes bare `<` comparison operators while correctly stripping `<b>`, `<span>`, `</strong>`, etc.

### WR-02: Stale Perplexity references in metadata descriptions

**File:** `package.json:4`, `.claude-plugin/plugin.json:5`
**Issue:** Both `package.json` and `plugin.json` still have `"description": "Perplexity-powered WebSearch and WebFetch replacement for Claude Code"`. Phase 5 removed the Perplexity provider entirely. These descriptions are now inaccurate and misleading -- the tool is DDG-powered, not Perplexity-powered.

**Fix:**
Update both descriptions:

```json
"description": "DDG-powered WebSearch and WebFetch replacement for Claude Code"
```

### WR-03: Stale Perplexity references in test helper and logger test

**File:** `test/helpers/mocks.ts:3-5`, `test/logger.test.ts:60`
**Issue:** `test/helpers/mocks.ts` exports `mockPerplexityResults` (an array of SearchResult objects with "Perplexity" in titles). While this export is not currently imported by any test file, it represents dead code from the pre-Phase-5 era. `test/logger.test.ts:60` creates a logger with module name `'perplexity'` -- this is a cosmetic test artifact that no longer reflects any real module in the codebase. Neither causes test failures, but both create confusion about whether Perplexity code still exists.

**Fix:**
Remove `mockPerplexityResults` from `test/helpers/mocks.ts` and update the logger test to use a current module name:

```typescript
// test/helpers/mocks.ts -- remove lines 3-5
export const mockDDGResults: SearchResult[] = [
  { title: 'DDG Result 1', url: 'https://ddg.example.com/1' },
  { title: 'DDG Result 2', url: 'https://ddg.example.com/2' },
];

// test/logger.test.ts:60 -- change module name
const logger = createLogger('ddg', 'info');
// And update assertion on line 64:
expect(stderrWriteSpy).toHaveBeenCalledWith(expect.stringContaining('[info:ddg]'));
```

## Info

### IN-01: Dead code path in retryWithBackoff final throw

**File:** `src/lib/retry.ts:76`
**Issue:** The `throw lastError!` at line 76 is unreachable. The for loop iterates `attempt` from 0 to `maxRetries` inclusive. On the last iteration (`attempt === config.maxRetries`), the condition `attempt === config.maxRetries` at line 66 is always true, so the error is thrown inside the catch block. The loop never exits normally, meaning line 76 is dead code. The non-null assertion `!` suppresses TypeScript's concern, but the code path is logically impossible.

**Fix:**
This is a minor code clarity issue. Either add a comment explaining the unreachable nature, or restructure:

```typescript
// After the loop -- TypeScript can't prove this is unreachable
throw lastError!; // unreachable: loop always throws on maxRetries attempt
```

### IN-02: DuckDuckGo description may contain HTML entities that are not decoded

**File:** `src/lib/duckduckgo.ts:23`
**Issue:** The snippet extraction strips HTML tags but does not decode HTML entities. A DDG description like `"5 &amp; 10 &lt; 20"` would be output as `"5 &amp; 10 &lt; 20"` in the raw snippet. The XML output layer (`escapeXml` in `output.ts`) would then double-encode these, producing `"5 &amp;amp; 10 &amp;lt; 20"`. This is not a correctness bug for Claude (which consumes the XML), since the outer `escapeXml` correctly preserves whatever string `searchDDG` returns, and Claude will decode the XML entities. However, the raw text content that DDG provides typically already has entities decoded by `duck-duck-scrape`, so this is low risk in practice.

**Fix:**
No immediate action required. If entity double-encoding appears in real usage, add an entity decode step after tag stripping:

```typescript
import { decode } from 'html-entities';
// ...
snippet: decode(r.description?.replace(/<\/?[a-zA-Z][^>]*>/g, '') || ''),
```

### IN-03: Stale webfetch.cjs is a stub, not matching the rebuilt webfetch.js

**File:** `scripts/webfetch.cjs`
**Issue:** The `scripts/webfetch.cjs` file is a 27-line stub that just prints "WebFetch is not yet implemented" -- a remnant from an early development phase. The rebuilt `scripts/webfetch.js` (341K lines) contains the full working implementation. Same stale-bundle concern as CR-01, but lower severity since webfetch.cjs is obviously broken rather than silently wrong.

**Fix:** Rebuild (`npm run build`) or delete `scripts/webfetch.cjs` along with `scripts/websearch.cjs`.

### IN-04: Test assertions use setTimeout-based waiting pattern

**File:** `test/websearch.test.ts:114`, `test/webfetch.test.ts:92`, `test/io-separation.test.ts:94`
**Issue:** Multiple integration-style tests use `await new Promise((r) => setTimeout(r, 100))` to wait for the async `main()` function to complete. This is fragile -- on slow CI runners, 100ms may not be enough, causing flaky test failures. The pattern exists because `main()` is called at module level without exporting a promise to await.

**Fix:**
No immediate fix required for correctness, but for robustness, consider exporting the main promise from entry points, or increasing the timeout. This is a test-quality concern, not a production bug.

---

_Reviewed: 2026-05-21T15:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
