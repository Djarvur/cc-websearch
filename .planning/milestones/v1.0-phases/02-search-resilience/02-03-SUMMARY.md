---
phase: 02-search-resilience
plan: 03
subsystem: search
tags: [partial-result-merge, url-deduplication, detailed-errors, fallback-chain, provider-comment]

# Dependency graph
requires:
  - 02-01
  - 02-02
provides:
  - Partial Perplexity result capture via closure before retry wrapper exhaustion
  - dedupeAndMerge helper: Perplexity-first ordering with URL deduplication
  - Merged provider comment: perplexity+duckduckgo when both sources contribute
  - Detailed error messages on total failure with both provider names and error types
  - 6 new tests (115 total)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [partial-result-capture, url-deduplication-merge, dual-provider-comment]

key-files:
  created: []
  modified:
    - src/websearch.ts
    - test/websearch.test.ts
    - scripts/websearch.js

key-decisions:
  - 'Capture partial results via closure wrapper inside retryWithBackoff fn parameter, not by modifying retry module'
  - "Provider comment 'perplexity+duckduckgo' only when pplxPartial has results, else 'duckduckgo'"

patterns-established:
  - 'Partial result capture pattern: wrap search() in closure that writes to outer variable, retryWithBackoff may still throw but partial data is preserved'
  - 'Merge pattern: dedupeAndMerge(pplxResults, ddgResults) using Set for O(1) URL lookup'

requirements-completed: [SRCH-08]

# Metrics
duration: 6min
completed: 2026-05-20
---

# Phase 2 Plan 03: Partial Result Merging and Detailed Errors Summary

**Partial Perplexity result capture via closure, URL-deduped merge with DDG fallback, dual-provider comment, and detailed error messages on total failure**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-20T09:37:34Z
- **Completed:** 2026-05-20T09:43:41Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Partial Perplexity results captured via closure wrapper before retryWithBackoff exhaustion (D-17)
- dedupeAndMerge helper concatenates Perplexity results first, DDG appended, deduplicated by URL using Set (D-18)
- Provider comment reflects merged sources: "perplexity+duckduckgo" when both contribute, "duckduckgo" when only DDG (D-15)
- Detailed error messages on total failure include both provider names, error types, and what was tried (D-19)
- Full TDD cycle: RED commit before GREEN commit
- Total test suite: 115 passing (109 prior + 6 new)

## Task Commits

Each task committed atomically with TDD RED/GREEN separation:

1. **Task 1 RED: Partial result merging and detailed error tests** - `ddd75ac` (test)
2. **Task 1 GREEN: Partial result merging, deduplication, and detailed errors** - `23ec56c` (feat)

## Files Created/Modified

- `src/websearch.ts` - Added dedupeAndMerge helper, closure-based partial result capture, merged provider comment logic, detailed error messages
- `test/websearch.test.ts` - 6 new tests for partial merge, ordering, deduplication, provider comment, detailed errors, no-partial fallback
- `scripts/websearch.js` - Rebuilt esbuild bundle

## Decisions Made

- Captured partial results via closure wrapper inside the `fn` parameter passed to `retryWithBackoff`, not by modifying the retry module -- this keeps the retry module generic and avoids adding callback parameters
- Provider comment "perplexity+duckduckgo" only when `pplxPartial.length > 0`, otherwise "duckduckgo" -- avoids misleading merge indication when Perplexity failed before returning any results

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test mocks to properly simulate partial-results-then-failure scenario**

- **Found during:** Task 1 GREEN phase
- **Issue:** Initial test mocks used `try { return await fn(); } catch { throw }` pattern which returned the result on success, never triggering the fallback path. The mocks needed to call `fn()` to populate `pplxPartial` via the closure, then throw regardless.
- **Fix:** Changed mock pattern to `await fn(); throw new Error(...)` -- calls fn() to capture partial results, then throws to simulate retry exhaustion
- **Files modified:** test/websearch.test.ts
- **Commit:** 23ec56c

## Issues Encountered

None beyond auto-fixed issues above.

## Next Phase Readiness

- Two-tier fallback chain fully complete: Perplexity -> DDG -> detailed error
- Partial result merging preserves useful data during partial failures
- Error messages are actionable with specific provider names and error types
- Phase 2 is complete: all search resilience features implemented

## Self-Check: PASSED

All 3 files verified present. Both commits verified in git log. Full test suite: 115 passed.

---

_Phase: 02-search-resilience_
_Completed: 2026-05-20_
