---
phase: 05-ddg-only-with-citations
plan: 02
subsystem: testing
tags: [vitest, esbuild, ddg-only, test-cleanup]

# Dependency graph
requires:
  - phase: 05-ddg-only-with-citations
    provides: DDG-only source code with snippet support from Plan 01
provides:
  - Rebuilt esbuild bundles reflecting Perplexity-free architecture
  - Verified zero Perplexity references in source and test code
  - Full test suite green (127 tests)
affects: [all future phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [bundle rebuild verification after dependency removal]

key-files:
  created: []
  modified:
    - scripts/websearch.js
    - scripts/webfetch.js

key-decisions:
  - 'Test changes were already completed in Plan 01 wave 1 -- Plan 02 verified and committed remaining bundle rebuild'

patterns-established:
  - 'Bundle rebuild is required after any dependency removal from package.json'

requirements-completed: [SRCH-04]

# Metrics
duration: 3min
completed: 2026-05-21
---

# Phase 5 Plan 02: Test Update and Bundle Rebuild Summary

**Verified complete Perplexity purge across all source and test files, rebuilt esbuild bundles removing ~4700 lines of dead SDK code**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-21T12:12:25Z
- **Completed:** 2026-05-21T12:15:36Z
- **Tasks:** 2 (both verified as already complete from Plan 01)
- **Files modified:** 2 (bundles)

## Accomplishments

- Verified all 127 tests pass with zero Perplexity references
- Rebuilt esbuild bundles, removing ~4700 lines of Perplexity SDK code
- Confirmed all 6 verification checks pass (test suite, perplexity grep, file deletion, build)

## Task Commits

All test changes were committed in Plan 01 (a9349f0, 681ad22, b067beb). Plan 02 committed the remaining bundle rebuild:

1. **Task 1: Delete perplexity tests, update DDG/output/config/retry tests** - Already completed in Plan 01 commits (a9349f0, 681ad22, b067beb)
2. **Task 2: Update websearch/webfetch/io-separation tests, rebuild bundles** - `fed2ac2` (chore: rebuild bundles)

## Files Created/Modified

- `scripts/websearch.js` - Rebuilt esbuild bundle (2425 lines removed, DDG-only)
- `scripts/webfetch.js` - Rebuilt esbuild bundle (2853 lines removed, no Perplexity)
- `test/perplexity.test.ts` - Already deleted in Plan 01
- `test/duckduckgo.test.ts` - Already updated in Plan 01 (snippet tests)
- `test/output.test.ts` - Already updated in Plan 01 (snippet tags, no provider)
- `test/config.test.ts` - Already updated in Plan 01 (no perplexity)
- `test/retry.test.ts` - Already updated in Plan 01 (no isTransientError)
- `test/websearch.test.ts` - Already rewritten in Plan 01 (single DDG provider)
- `test/webfetch.test.ts` - Already updated in Plan 01 (no Perplexity mocks)
- `test/io-separation.test.ts` - Already updated in Plan 01 (mockSearchDDG)

## Decisions Made

- Recognized Plan 01 already executed all test changes that Plan 02 specified -- committed only the uncommitted bundle rebuild rather than re-doing work

## Deviations from Plan

### Plan Redundancy

Plan 01's comprehensive execution included all test file updates that Plan 02 was designed to perform. Rather than re-modifying files that were already correctly updated, Plan 02 verified the done criteria and committed the remaining uncommitted bundle rebuild.

- **Impact:** Positive -- avoided redundant file modifications and duplicate commits
- **Verification:** All done criteria for both tasks verified against current file state

## Issues Encountered

- `tsc --noEmit` fails with `@types/node` errors -- pre-existing tsconfig issue (missing `"types": ["node"]`), not introduced by this phase

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 complete: DDG-only plugin with citation snippets
- All source and test code fully purged of Perplexity references
- Bundles rebuilt and committed
- 127 tests green

## Self-Check: PASSED

- `scripts/websearch.js` exists and updated
- `scripts/webfetch.js` exists and updated
- Commit `fed2ac2` verified in git log
- `test/perplexity.test.ts` confirmed deleted
- `src/lib/perplexity.ts` confirmed deleted
- All 127 tests pass
- Zero perplexity references in source and test code

---

_Phase: 05-ddg-only-with-citations_
_Completed: 2026-05-21_
