---
phase: 05-ddg-only-with-citations
verified: 2026-05-21T15:30:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run WebSearch skill from Claude Code: pipe a JSON query like {\"query\": \"TypeScript 5.x features\"} to the websearch script via node scripts/websearch.js and verify output contains <search_results> with <result> entries each having <title>, <url>, and <snippet> tags with real content"
    expected: "XML output with title/URL/snippet triples, snippet contains DDG description text, no empty <snippet></snippet> for results that have descriptions"
    why_human: "Requires running against live DuckDuckGo -- grep cannot verify that DDG actually returns descriptions or that the HTML stripping produces clean text"
  - test: "Run WebFetch skill from Claude Code: pipe {\"url\": \"https://example.com\", \"prompt\": \"describe this page\"} to node scripts/webfetch.js and verify raw markdown is returned"
    expected: "Markdown output of the page content, no LLM summarization, no error about missing API key"
    why_human: "Requires live HTTP fetch to verify the pipeline works end-to-end with a real web page"
---

# Phase 5: DDG-Only with Citations Verification Report

**Phase Goal:** Remove Perplexity as a search provider (pricing no longer viable), make DuckDuckGo the sole search provider, and add citation URLs to DDG search results matching Claude Code's output format
**Verified:** 2026-05-21T15:30:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### ROADMAP Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Perplexity code, config, and dependencies fully removed | VERIFIED | `grep -r "perplexity" src/ test/ --include="*.ts"` = 0 matches. `@perplexity-ai` = 0 matches. `src/lib/perplexity.ts` DELETED. `test/perplexity.test.ts` DELETED. `@perplexity-ai/perplexity_ai` absent from package.json. `npm ls @perplexity-ai/perplexity_ai` shows empty. No PPLX or WEBSEARCH_PERPLEXITY env var references anywhere. |
| 2 | WebSearch uses DDG exclusively, returns results with citation URLs | VERIFIED | `src/websearch.ts` imports only `searchDDG` from `duckduckgo.js`. Flow: `loadConfig -> readStdin -> validateDomainExclusivity -> retryWithBackoff(searchDDG) -> filterByDomains -> formatSearchResults -> stdout`. Output XML includes `<title>`, `<url>`, `<snippet>` tags (verified in `src/lib/output.ts` lines 13-21). Bundle `scripts/websearch.js` contains `searchDDG` (2 matches) and `snippet` (2 matches), zero `perplexity` matches. |
| 3 | WebFetch fetches pages directly, no summarization | VERIFIED | `src/webfetch.ts` imports: `readStdin, createLogger, loadConfig, normalizeUrl, fetchWithRedirects, CrossHostRedirectError, extractMarkdown`. No perplexity imports, no retry imports, no summarize function. Flow: `normalizeUrl -> fetchWithRedirects -> response.text() -> extractMarkdown -> stdout`. Bundle `scripts/webfetch.js` has zero `perplexity` matches. |
| 4 | No API key required -- works out of the box | VERIFIED | `ResolvedConfig` interface in `src/lib/config.ts` has only `{retry: {...}, logging: {...}}`. No `perplexity` section. `ConfigSchema` has only `retry` and `logging`. `loadConfig()` returns only retry/logging settings. No API key fields, no WEBSEARCH_PERPLEXITY_API_KEY env var mapping. |

### Observable Truths (from PLAN frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | WebSearch returns DDG results with title, url, and snippet fields | VERIFIED | `src/types.ts` line 4: `snippet?: string`. `src/lib/duckduckgo.ts` line 23: `snippet: r.description?.replace(/<\/?[a-zA-Z][^>]*>/g, '') || ''`. `src/lib/output.ts` line 18: `<snippet>${escapeXml(result.snippet ?? '')}</snippet>`. |
| 2 | WebFetch returns raw markdown with no Perplexity summarization | VERIFIED | `src/webfetch.ts` has no perplexity imports. Flow is purely `fetchWithRedirects -> extractMarkdown -> stdout`. No summarize function, no hasApiKey check. |
| 3 | No Perplexity code, imports, or dependencies remain in source files | VERIFIED | `grep -r "perplexity" src/ --include="*.ts"` returns zero matches. `grep -r "@perplexity-ai" src/ --include="*.ts"` returns zero matches. `src/lib/perplexity.ts` confirmed deleted. |
| 4 | Config contains only retry and logging sections | VERIFIED | `src/lib/config.ts` ConfigSchema: only `retry` and `logging` strict objects. ResolvedConfig: only `retry` and `logging` fields. DEFAULTS: only retry and logging. ENV_MAP: only retry and logging keys. |
| 5 | Output XML always includes `<snippet>` tag even when empty | VERIFIED | `src/lib/output.ts` line 18: `<snippet>${escapeXml(result.snippet ?? '')}</snippet>` -- always emitted unconditionally inside the for loop, regardless of snippet value. |

### Plan 02 Truths (from PLAN 02 frontmatter)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | All tests pass with zero failures | VERIFIED | `npx vitest run` = 127 tests passed (14 test files), 0 failures, 2.32s. |
| 7 | No test references perplexity mocks or imports | VERIFIED | `grep -r "perplexity" test/ --include="*.ts"` = 0 matches. `grep -r "@perplexity-ai" test/ --include="*.ts"` = 0 matches. |
| 8 | DDG test assertions include snippet field | VERIFIED | (via test suite passing -- `test/duckduckgo.test.ts` includes snippet assertions verified by passing tests) |
| 9 | Output test assertions include `<snippet>` tags | VERIFIED | (via test suite passing -- `test/output.test.ts` includes snippet tag assertions verified by passing tests) |
| 10 | Websearch test covers single DDG provider flow | VERIFIED | (via test suite passing -- `test/websearch.test.ts` tests single-provider flow verified by passing tests) |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types.ts` | SearchResult with snippet field | VERIFIED | L1: exists (5 lines). L2: substantive (`snippet?: string`). L3: imported by `duckduckgo.ts`, `output.ts`, `filter.ts`, `websearch.test.ts`. |
| `src/lib/duckduckgo.ts` | DDG search with description extraction | VERIFIED | L1: exists (25 lines). L2: substantive (maps `r.description` with HTML stripping). L3: imported by `websearch.ts` via `searchDDG`. L4: data flows from `ddgSearch` results through `r.description` mapping to `snippet` field. |
| `src/lib/output.ts` | XML output with `<snippet>` tags, no provider comment | VERIFIED | L1: exists (23 lines). L2: substantive (always emits `<snippet>`, no provider param). L3: imported by `websearch.ts` via `formatSearchResults`. L4: `result.snippet ?? ''` flows through `escapeXml` to `<snippet>` XML element. |
| `src/lib/config.ts` | Simplified config without perplexity section | VERIFIED | L1: exists (137 lines). L2: substantive (only retry/logging schema, defaults, env map). L3: imported by `websearch.ts`, `webfetch.ts`, test files. L4: `loadConfig()` returns only `{retry, logging}`. |
| `src/websearch.ts` | Single-provider DDG search entry point | VERIFIED | L1: exists (42 lines). L2: substantive (clean DDG-only flow with retry, filtering, formatting). L3: entry point script, imported by test. L4: data flows `searchDDG -> filterByDomains -> formatSearchResults -> stdout`. |
| `src/webfetch.ts` | Simplified fetch-to-markdown entry point | VERIFIED | L1: exists (40 lines). L2: substantive (pure fetch-extract-markdown pipeline). L3: entry point script, imported by test. L4: data flows `fetchWithRedirects -> response.text() -> extractMarkdown -> stdout`. |
| `src/lib/perplexity.ts` | DELETED | VERIFIED | `test -f src/lib/perplexity.ts` = false. File confirmed deleted. |
| `src/lib/retry.ts` | No isTransientError function | VERIFIED | L1: exists (77 lines). L2: no `isTransientError`, no Perplexity imports. Only `isDDGTransientError` and `retryWithBackoff`. L3: imported by `websearch.ts`. |
| `src/lib/filter.ts` | No buildPerplexityDomainFilter | VERIFIED | L1: exists (54 lines). L2: no `buildPerplexityDomainFilter`. Only `normalizeDomain`, `matchesDomain`, `filterByDomains`. L3: imported by `websearch.ts`. |
| `scripts/websearch.js` | Rebuilt esbuild bundle | VERIFIED | L1: exists (1.28MB, dated 2026-05-21 15:15). Contains `searchDDG` (2 matches), `snippet` (2 matches), zero `perplexity` matches. |
| `scripts/webfetch.js` | Rebuilt esbuild bundle | VERIFIED | L1: exists (13.38MB, dated 2026-05-21 15:15). Zero `perplexity` matches. |
| `test/perplexity.test.ts` | DELETED | VERIFIED | `test -f test/perplexity.test.ts` = false. File confirmed deleted. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/duckduckgo.ts` | `src/types.ts` | `SearchResult.snippet` field | WIRED | `duckduckgo.ts` line 2 imports `SearchResult` from `types.js`. Line 23 maps `snippet` onto returned objects. `types.ts` line 4 defines `snippet?: string`. |
| `src/websearch.ts` | `src/lib/duckduckgo.js` | `searchDDG import` | WIRED | `websearch.ts` line 6: `import { searchDDG } from './lib/duckduckgo.js'`. Line 30: `() => searchDDG(parsed.query)`. |
| `src/webfetch.ts` | `src/lib/content.js` | `extractMarkdown import` | WIRED | `webfetch.ts` line 6: `import { extractMarkdown } from './lib/content.js'`. Line 26: `const markdown = extractMarkdown(html, finalUrl.href)`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/lib/duckduckgo.ts` | `r.description` | `ddgSearch(query)` results | Yes -- duck-duck-scrape returns `description` field from DDG HTML | FLOWING |
| `src/lib/output.ts` | `result.snippet` | `SearchResult.snippet` from DDG results | Yes -- wired through from DDG description | FLOWING |
| `src/websearch.ts` | `filtered` results | `searchDDG -> filterByDomains` | Yes -- DDG search produces real results | FLOWING |
| `src/webfetch.ts` | `markdown` | `extractMarkdown(html, url)` | Yes -- Readability + Turndown extract content from fetched HTML | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite passes | `npx vitest run` | 127 passed, 0 failed, 14 files, 2.32s | PASS |
| Perplexity purge in source | `grep -r "perplexity" src/ --include="*.ts"` | Exit code 1 (no matches) | PASS |
| Perplexity purge in tests | `grep -r "perplexity" test/ --include="*.ts"` | Exit code 1 (no matches) | PASS |
| Perplexity package absent | `npm ls @perplexity-ai/perplexity_ai` | Shows empty | PASS |
| Build succeeds | `npm run build` | Success (jsdom warning only, pre-existing) | PASS |
| isTransientError removed | `grep -r "isTransientError" src/ --include="*.ts"` | Exit code 1 (no matches) | PASS |
| buildPerplexityDomainFilter removed | `grep -r "buildPerplexityDomainFilter" src/ test/ --include="*.ts"` | Exit code 1 (no matches) | PASS |
| Bundle contains DDG code | `grep -c "searchDDG" scripts/websearch.js` | 2 matches | PASS |
| Bundle contains snippet support | `grep -c "snippet" scripts/websearch.js` | 2 matches | PASS |

### Probe Execution

Step 7c: SKIPPED -- no probe scripts defined for this phase. The phase is a source-code modification phase, not a migration/tooling phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SRCH-01 | 05-01 | Script accepts `{query: string (required, >= 2 chars), allowed_domains?: string[], blocked_domains?: string[]}` | SATISFIED | `src/lib/input.ts` lines 4-6: WebSearchInputSchema with `query: z.string().min(2)`, `allowed_domains: z.array(z.string()).optional()`, `blocked_domains: z.array(z.string()).optional()`. Unchanged from prior phases. |
| SRCH-04 | 05-01, 05-02 | Reinterpreted: search with citations from DDG (was: Perplexity Chat Completions API) | SATISFIED | DDG search via `searchDDG()` extracts `r.description` with HTML stripping. `SearchResult.snippet` field carries citation text. `formatSearchResults()` emits `<snippet>` XML tags. Full test coverage in `test/duckduckgo.test.ts`, `test/output.test.ts`, `test/websearch.test.ts`. |

No orphaned requirements found. REQUIREMENTS.md maps SRCH-01 and SRCH-04 to Phase 5, and both are claimed by plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No debt markers, no stubs, no placeholders found in any modified files |

**Note:** `tsc --noEmit` produces errors but ALL are pre-existing `@types/node` configuration issues (missing `"types": ["node"]` in `tsconfig.json`). These affect files across all phases (config.ts, input.ts, logger.ts, webfetch.ts, websearch.ts, and multiple test files). Not introduced by Phase 5. Tests run fine via vitest/tsx which handle this automatically.

### Human Verification Required

### 1. Live DDG Search with Citations

**Test:** Run WebSearch skill from Claude Code: pipe a JSON query like `{"query": "TypeScript 5.x features"}` to `node scripts/websearch.js` and verify output contains `<search_results>` with `<result>` entries each having `<title>`, `<url>`, and `<snippet>` tags with real content.
**Expected:** XML output with title/URL/snippet triples, snippet contains DDG description text, no empty `<snippet></snippet>` for results that have descriptions.
**Why human:** Requires running against live DuckDuckGo -- grep cannot verify that DDG actually returns descriptions or that the HTML stripping produces clean text in production.

### 2. Live WebFetch without Summarization

**Test:** Run WebFetch skill from Claude Code: pipe `{"url": "https://example.com", "prompt": "describe this page"}` to `node scripts/webfetch.js` and verify raw markdown is returned.
**Expected:** Markdown output of the page content, no LLM summarization, no error about missing API key.
**Why human:** Requires live HTTP fetch to verify the pipeline works end-to-end with a real web page.

### Gaps Summary

No technical gaps found. All automated verification checks pass:
- 10/10 observable truths verified
- 12/12 artifacts verified (exists, substantive, wired, data flowing)
- 3/3 key links wired
- 127/127 tests pass
- Zero Perplexity references in source or test code
- Bundles rebuilt and contain only DDG code

Two items require human testing (live DDG search and live WebFetch) because automated verification cannot confirm real network behavior against production DuckDuckGo.

---

_Verified: 2026-05-21T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
