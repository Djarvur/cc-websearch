---
phase: 01-plugin-foundation-and-primary-search
plan: 02
subsystem: plugin
tags: [perplexity-api, websearch, api-key-config, tdd, esbuild, stdin-stdout]

# Dependency graph
requires: [01-01]
provides:
  - Perplexity API client wrapper with search() and getApiKey()
  - WebSearch entry point wired end-to-end (stdin -> Perplexity -> XML stdout)
  - API key configuration with PPLX_API_KEY and PERPLEXITY_API_KEY fallback
  - Model configuration via PPLX_MODEL env var (defaults to sonar)
  - Rebuilt scripts/websearch.js with real Perplexity integration
  - 16 new tests (9 perplexity/config + 7 websearch/io-separation)
affects: [phase-2, phase-3]

# Tech tracking
tech-stack:
  added: []
  patterns: [perplexity-sdk-integration, api-key-env-var-fallback, search-results-extraction, citations-fallback, tdd-red-green]

key-files:
  created:
    - src/lib/perplexity.ts
    - test/perplexity.test.ts
    - test/config.test.ts
    - test/websearch.test.ts
    - test/io-separation.test.ts
  modified:
    - src/websearch.ts
    - scripts/websearch.js

key-decisions:
  - "Mocked logger in tests to call process.stderr.write directly for IO separation verification"
  - "Used function syntax in vi.mock for Perplexity SDK constructor (arrow functions cannot be constructors)"
  - "Used vi.doMock with vi.resetModules for per-test module isolation instead of stdin mocking"
  - "search() destructured response: results array to formatSearchResults, content logged at debug level only"

patterns-established:
  - "Perplexity client pattern: create instance per request with explicit apiKey, call chat.completions.create"
  - "Result extraction pattern: prefer search_results array, fallback to citations with URL-as-title"
  - "API key pattern: PPLX_API_KEY primary, PERPLEXITY_API_KEY fallback, explicit error if neither set"
  - "Module test isolation pattern: mock all dependencies with vi.mock, use vi.resetModules + dynamic import"

requirements-completed: [CONF-01, SRCH-04]

# Metrics
duration: 10min
completed: 2026-05-20
---

# Phase 1 Plan 02: Perplexity API Integration and WebSearch Wiring Summary

**End-to-end WebSearch with Perplexity Sonar API: JSON stdin to Perplexity chat completions to XML stdout, with API key configuration and 37 passing tests**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-19T23:28:33Z
- **Completed:** 2026-05-19T23:38:46Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Perplexity API client wrapper extracts search results from response.search_results array with citations fallback
- API key read from PPLX_API_KEY (primary) with fallback to PERPLEXITY_API_KEY, clear error when missing
- Model configurable via PPLX_MODEL env var, defaults to "sonar" per D-04
- WebSearch entry point reads JSON stdin, validates with Zod, calls Perplexity, outputs XML to stdout
- All citations/search_results returned per D-05, all diagnostic output to stderr only
- Full TDD cycle executed: RED commits before GREEN commits for both tasks
- Total test suite: 37 passing (21 Plan 01 + 16 Plan 02)

## Task Commits

Each task was committed atomically with TDD RED/GREEN separation:

1. **Task 1 RED: Perplexity client tests** - `afc4d71` (test)
2. **Task 1 GREEN: Perplexity client implementation** - `75651da` (feat)
3. **Task 2 RED: WebSearch entry point tests** - `3fb6f6d` (test)
4. **Task 2 GREEN: WebSearch entry point implementation** - `c3263de` (feat)

## Files Created/Modified
- `src/lib/perplexity.ts` - Perplexity API client wrapper with getApiKey() and search() functions
- `src/websearch.ts` - WebSearch entry point replacing placeholder with real Perplexity integration
- `scripts/websearch.js` - Rebuilt esbuild bundle (608KB standalone with SDK inlined)
- `test/perplexity.test.ts` - 6 tests for search() function with mocked SDK
- `test/config.test.ts` - 3 tests for getApiKey() env var resolution
- `test/websearch.test.ts` - 4 tests for WebSearch entry point end-to-end flow
- `test/io-separation.test.ts` - 3 tests for stdout/stderr separation verification

## Decisions Made
- Mocked logger in tests to call process.stderr.write directly, enabling IO separation verification without relying on real logger implementation
- Used `function` syntax in vi.mock for Perplexity SDK constructor because arrow functions cannot be used as constructors (SDK uses `new Perplexity()`)
- Used vi.doMock with vi.resetModules for per-test module isolation instead of mocking process.stdin directly, which caused OOM from infinite async iteration
- search() return value destructured: results array passed to formatSearchResults for XML output, content string logged at debug level only (not written to stdout)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test approach changed from stdin mocking to module mocking**
- **Found during:** Task 2 RED phase
- **Issue:** Direct stdin mocking via async iterator caused OOM (infinite loop because mock never signaled done)
- **Fix:** Used vi.doMock to mock readStdin and all dependencies, then dynamic import for per-test isolation
- **Files modified:** test/websearch.test.ts, test/io-separation.test.ts
- **Commit:** c3263de

**2. [Rule 1 - Bug] vi.mock arrow function cannot serve as SDK constructor**
- **Found during:** Task 1 GREEN phase
- **Issue:** `vi.mock` with arrow function mock for Perplexity SDK failed with "not a constructor" error
- **Fix:** Changed to `function` syntax in mock factory
- **Files modified:** test/perplexity.test.ts
- **Commit:** 75651da

## Issues Encountered
None beyond auto-fixed issues above. All dependencies installed cleanly.

## Next Phase Readiness
- WebSearch fully functional end-to-end with real Perplexity API calls
- Walking skeleton complete: plugin installs, WebSearch reads stdin, calls API, returns XML
- Phase 2 can build on this for DDG fallback, domain filtering, and retry logic
- WebFetch stub remains for Phase 3 implementation

## Self-Check: PASSED

All 7 files verified present. All 4 commits verified in git log.

---
*Phase: 01-plugin-foundation-and-primary-search*
*Completed: 2026-05-20*
