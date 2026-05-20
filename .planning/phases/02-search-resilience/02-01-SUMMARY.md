---
phase: 02-search-resilience
plan: 01
subsystem: search
tags: [ddg-fallback, retry-backoff, two-tier-fallback, provider-comment, duck-duck-scrape]

# Dependency graph
requires: [01-02]
provides:
  - DDG search provider via duck-duck-scrape with SearchResult[] output
  - Exponential backoff retry module with full jitter, configurable via env vars
  - Two-tier fallback orchestration: Perplexity -> DDG -> clean error
  - hasApiKey() boolean check without throwing
  - formatSearchResults with provider XML comment parameter
  - 31 new tests (68 total, all passing)
affects: [02-02, 02-03]

# Tech tracking
tech-stack:
  added: [duck-duck-scrape@2.2.7]
  patterns: [full-jitter-retry, two-tier-fallback, provider-comment-xml, ddg-search-wrapper]

key-files:
  created:
    - src/lib/duckduckgo.ts
    - src/lib/retry.ts
    - test/duckduckgo.test.ts
    - test/retry.test.ts
    - test/helpers/mocks.ts
  modified:
    - src/lib/perplexity.ts
    - src/lib/output.ts
    - src/websearch.ts
    - scripts/websearch.js
    - test/websearch.test.ts
    - test/io-separation.test.ts
    - test/config.test.ts
    - test/output.test.ts
    - package.json

key-decisions:
  - "Used real timers instead of vi.useFakeTimers for max-retries test to avoid unhandled rejection leaks"
  - "Import error classes from @perplexity-ai/perplexity_ai/error.js (re-export from core/error.js)"
  - "retryWithBackoff uses a generic isTransient callback so the same function works for both Perplexity and DDG"
  - "Updated io-separation test to mock both providers failing, since new fallback chain means single provider failure no longer reaches stderr"

patterns-established:
  - "DDG provider pattern: import search from duck-duck-scrape, map to SearchResult[], let errors propagate"
  - "Retry pattern: full jitter (random * min(maxDelay, baseDelay * 2^attempt)), configurable via env vars"
  - "Fallback pattern: try Perplexity with retry -> catch -> try DDG with retry -> catch -> error with both provider names"
  - "Provider comment pattern: <!-- provider: NAME --> before <search_results> XML"

requirements-completed: [SRCH-05, SRCH-07, SRCH-08]

# Metrics
duration: 12min
completed: 2026-05-20
---

# Phase 2 Plan 01: DDG Fallback and Retry Summary

**DDG fallback provider, exponential backoff with full jitter, two-tier Perplexity-to-DDG orchestration, provider comment in output, and 68 passing tests**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-20T09:09:25Z
- **Completed:** 2026-05-20T09:21:21Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- DDG search provider using duck-duck-scrape library, returns SearchResult[] with title+URL only (D-01)
- Exponential backoff with full jitter retry module, configurable via RETRY_BASE_DELAY, RETRY_MAX_DELAY, RETRY_MAX_RETRIES, RETRY_TIMEOUT env vars (D-06/D-08/D-09)
- Two-tier fallback orchestration: Perplexity with retries -> DDG with retries -> descriptive error on stderr (D-04/D-07/D-19)
- No API key triggers DDG as primary with no warning or degraded mode indication (D-04)
- Provider name appears as XML comment before search_results: <!-- provider: NAME --> (D-15)
- Fallback events logged at debug level to stderr, not visible at default info level (D-16)
- hasApiKey() returns boolean without throwing, enabling clean key-presence checks
- search() accepts optional domainFilter parameter for search_domain_filter API param
- Full TDD cycle: RED commits before GREEN commits for both tasks
- Total test suite: 68 passing (37 prior + 31 new)

## Task Commits

Each task committed atomically with TDD RED/GREEN separation:

1. **Task 1 RED: DDG provider, retry, and provider extension tests** - `2ef2707` (test)
2. **Task 1 GREEN: DDG provider, retry, and provider extension implementation** - `6bbc739` (feat)
3. **Task 2 RED: Fallback orchestration tests** - `b973466` (test)
4. **Task 2 GREEN: Fallback orchestration implementation** - `005d801` (feat)

## Files Created/Modified
- `src/lib/duckduckgo.ts` - DDG search via duck-duck-scrape, exports searchDDG(query) returning SearchResult[]
- `src/lib/retry.ts` - Exponential backoff with full jitter, exports retryWithBackoff, isTransientError, isDDGTransientError
- `src/lib/perplexity.ts` - Added hasApiKey() boolean and optional domainFilter parameter on search()
- `src/lib/output.ts` - formatSearchResults accepts optional provider parameter for XML comment
- `src/websearch.ts` - Rewritten with two-tier fallback: Perplexity -> DDG -> error
- `scripts/websearch.js` - Rebuilt esbuild bundle
- `test/duckduckgo.test.ts` - 4 tests for DDG provider
- `test/retry.test.ts` - 17 tests for retry logic, transient error classification
- `test/helpers/mocks.ts` - Shared mock fixtures for Perplexity and DDG results
- `test/websearch.test.ts` - 5 tests for fallback orchestration
- `test/config.test.ts` - 4 new tests for hasApiKey
- `test/output.test.ts` - 5 new tests for provider comment
- `test/io-separation.test.ts` - Updated mocks for new fallback behavior
- `package.json` - Added duck-duck-scrape@2.2.7 dependency

## Decisions Made
- Used real timers with minimal delays instead of vi.useFakeTimers for max-retries exhaustion test -- fake timers caused unhandled rejection leaks because the promise rejects before the test's expect().rejects handler runs
- Import Perplexity error classes from `@perplexity-ai/perplexity_ai/error.js` (the package re-exports from core/error.js)
- retryWithBackoff uses a generic `isTransient` callback parameter so the same retry function works for both Perplexity (typed SDK errors) and DDG (message-pattern errors)
- Updated io-separation test to make both providers fail since the new fallback chain means single-provider failure no longer surfaces as error on stderr

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated io-separation test mocks for new fallback behavior**
- **Found during:** Task 2 GREEN phase
- **Issue:** io-separation test failed because websearch.ts now falls back to DDG when Perplexity fails. The test mocked only Perplexity to fail, but DDG was mocked to succeed with empty results.
- **Fix:** Made both providers fail in the error test case, and added DDG mock to the io-separation test file.
- **Files modified:** test/io-separation.test.ts
- **Commit:** 005d801

**2. [Rule 1 - Bug] Fixed unhandled rejection in retry max-retries test**
- **Found during:** Task 1 GREEN phase
- **Issue:** vi.useFakeTimers caused unhandled promise rejection because the retry promise rejected before the test's expect().rejects handler could attach
- **Fix:** Switched to real timers with minimal delays (1-2ms) for the max-retries exhaustion test
- **Files modified:** test/retry.test.ts
- **Commit:** 6bbc739

## Issues Encountered
None beyond auto-fixed issues above. duck-duck-scrape@2.2.7 installed cleanly.

## Next Phase Readiness
- WebSearch works end-to-end with either Perplexity or DDG as provider
- Retry with exponential backoff handles 429, 5xx, and network errors for both providers
- Provider comment in output enables downstream visibility of which provider served results
- Phase 2 Plan 02 can add domain filtering (filter module, mutual exclusivity, Perplexity search_domain_filter)
- Phase 2 Plan 03 can add partial result merging and detailed error message polish

## Self-Check: PASSED

All 12 files verified present. All 4 commits verified in git log.

---
*Phase: 02-search-resilience*
*Completed: 2026-05-20*
