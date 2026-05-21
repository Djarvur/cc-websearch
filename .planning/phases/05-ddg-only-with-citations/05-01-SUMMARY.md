---
phase: 05-ddg-only-with-citations
plan: 01
subsystem: search
tags: [duck-duck-scrape, ddg, xml-output, snippet, citation]

# Dependency graph
requires:
  - phase: 02-search-resilience
    provides: DDG search via duck-duck-scrape, domain filtering, retry logic
provides:
  - DDG-only search with citation snippets (description field)
  - Simplified config without Perplexity section
  - WebFetch as pure fetch-extract-markdown pipeline
  - XML output with <snippet> tags
affects: [all future phases, tests, build]

# Tech tracking
tech-stack:
  added: []
  patterns: [snippet extraction via regex HTML stripping, single-provider search flow]

key-files:
  created: []
  modified:
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
  deleted:
    - src/lib/perplexity.ts
    - test/perplexity.test.ts

key-decisions:
  - "Snippet field uses HTML tag stripping via replace(/<[^>]*>/g, '') for DDG bold highlights"
  - "formatSearchResults signature changed to single parameter (no provider arg)"
  - "webfetch.ts removed retry imports entirely -- fetch pipeline has no retry wrapping"
  - "buildPerplexityDomainFilter removed from filter.ts (dead code cleanup per research)"

patterns-established:
  - "SearchResult.snippet: optional string, always emitted in XML even when empty"
  - "Single-provider DDG flow: loadConfig -> readStdin -> validateDomains -> searchDDG -> filterByDomains -> formatSearchResults -> stdout"
  - "Config simplified to {retry, logging} only -- no API key required"

requirements-completed: [SRCH-01, SRCH-04]

# Metrics
duration: 10min
completed: 2026-05-21
---

# Phase 5 Plan 01: DDG-Only with Citations Summary

**DDG-only search with citation snippets, Perplexity fully removed from source, config, and dependencies**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-21T11:59:33Z
- **Completed:** 2026-05-21T12:09:36Z
- **Tasks:** 2
- **Files modified:** 18 (16 modified, 2 deleted)

## Accomplishments
- Added snippet extraction from DDG description field with HTML tag stripping
- Removed all Perplexity code, imports, dependencies, and configuration
- Plugin now works with zero API keys using DDG as sole search provider
- WebFetch simplified to pure fetch-extract-markdown pipeline with no LLM summarization

## Task Commits

Each task was committed atomically:

1. **Task 1: Add snippet support (TDD)** - RED: `a9349f0` (test), GREEN: `681ad22` (feat)
2. **Task 2: Remove Perplexity from config, retry, entry points, and dependencies** - `b067beb` (feat)

## Files Created/Modified
- `src/types.ts` - Added `snippet?: string` to SearchResult interface
- `src/lib/duckduckgo.ts` - Maps `r.description` with HTML tag stripping to snippet field
- `src/lib/output.ts` - Emits `<snippet>` tag, removed provider parameter and comment
- `src/lib/config.ts` - Removed perplexity section from schema, defaults, env map, ResolvedConfig
- `src/lib/retry.ts` - Removed isTransientError function and Perplexity SDK imports
- `src/lib/filter.ts` - Removed buildPerplexityDomainFilter function
- `src/websearch.ts` - Rewritten: single DDG path with retry, no fallback/merge
- `src/webfetch.ts` - Simplified: fetch-extract-markdown pipeline, no retry/summarize
- `src/lib/perplexity.ts` - DELETED
- `package.json` - Removed @perplexity-ai/perplexity_ai dependency
- `test/duckduckgo.test.ts` - Added snippet extraction assertions and HTML stripping tests
- `test/output.test.ts` - Added snippet tag assertions, removed provider comment tests
- `test/config.test.ts` - Removed perplexity section tests
- `test/retry.test.ts` - Removed isTransientError tests, updated ResolvedConfig mocks
- `test/filter.test.ts` - Removed buildPerplexityDomainFilter import and tests
- `test/websearch.test.ts` - Rewritten for simplified single-provider DDG flow
- `test/webfetch.test.ts` - Removed Perplexity summarization tests/mocks
- `test/io-separation.test.ts` - Removed Perplexity mocks, uses mockSearchDDG
- `test/perplexity.test.ts` - DELETED

## Decisions Made
- Stripped HTML tags from DDG descriptions using `replace(/<[^>]*>/g, '')` since DDG bold highlights with `<b>` tags
- Removed retry imports from webfetch.ts entirely since fetch pipeline was never wrapped in retryWithBackoff (retry was only for Perplexity summarization)
- Removed buildPerplexityDomainFilter from filter.ts as dead code cleanup per research recommendation (plan listed it as optional)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed buildPerplexityDomainFilter import from filter.test.ts**
- **Found during:** Task 2 (Perplexity removal)
- **Issue:** filter.test.ts imported deleted function buildPerplexityDomainFilter, causing tsc error TS2305
- **Fix:** Removed import and entire test describe block for buildPerplexityDomainFilter
- **Files modified:** test/filter.test.ts
- **Verification:** tsc --noEmit no longer shows TS2305 error
- **Committed in:** b067beb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor -- removed dead code that was explicitly identified in research as removable. No scope creep.

## Issues Encountered
None - clean execution following the plan.

## User Setup Required
None - no external service configuration required. DDG scraping works without API keys.

## Next Phase Readiness
- Plugin is now DDG-only with citation snippets
- Ready for test updates in Plan 02 (if any remaining test adjustments needed)
- All 127 tests pass, all 7 verification checks pass

## Self-Check: PASSED

All files verified present/modified/deleted as documented. All commits verified in git log.

---
*Phase: 05-ddg-only-with-citations*
*Completed: 2026-05-21*
