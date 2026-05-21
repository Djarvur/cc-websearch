---
phase: 08-close-tech-debt-update-requirements-md-fix-summary-gaps-fina
plan: 04
subsystem: core
tags: [retry, timeout, input, stdin, url-validation, fetch, jsdom, version-alignment]

requires:
  - phase: 08-close-tech-debt-update-requirements-md-fix-summary-gaps-fina
    provides: Context for code debt items identified during v1.0 milestone audit

provides:
  - withTimeout error now includes ETIMEDOUT, enabling retry for timed-out operations
  - readStdin has isTTY guard preventing hang when no pipe is connected
  - normalizeUrl rejects non-HTTP(S) URL schemes (ftp, file, data)
  - jsdom and @types/jsdom versions aligned at major version 28

affects: []

tech-stack:
  added: []
  patterns:
    - "Timeout error messages include retry-relevant error codes"
    - "URL scheme validation at normalizeUrl boundary"
    - "Stdin TTY guard pattern for CLI input handling"

key-files:
  created: []
  modified:
    - src/lib/retry.ts
    - src/lib/input.ts
    - src/lib/fetch.ts
    - package.json
    - package-lock.json
    - scripts/websearch.cjs
    - scripts/webfetch.cjs

key-decisions:
  - "withTimeout error message changed to include ETIMEDOUT so isDDGTransientError recognizes timeouts as retryable"
  - "readStdin early-returns with descriptive error when process.stdin.isTTY is true"
  - "normalizeUrl validates protocol before http->https upgrade, rejecting non-HTTP schemes"
  - "jsdom pinned to ^28.1.0 to match @types/jsdom@^28.0.3 (constructor API identical)"

patterns-established: []

requirements-completed: [D-16, D-17, D-18, D-19]

duration: 6min
completed: 2026-05-21
---

# Phase 8 Plan 4: Code Debt Fixes Summary

**Four low-severity code debt items resolved: withTimeout ETIMEDOUT message, readStdin isTTY guard, normalizeUrl scheme validation, jsdom/@types/jsdom version alignment**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-21T23:24:25Z
- **Completed:** 2026-05-21T23:30:32Z
- **Tasks:** 2 (each followed TDD: RED/GREEN cycles)
- **Files modified:** 7

## Accomplishments

- **D-16 (withTimeout):** Changed timeout error message from "Operation timed out after Xms" to "Request timed out after Xms (ETIMEDOUT)" so `isDDGTransientError` recognizes timeouts as transient and retries them instead of treating them as permanent failures
- **D-17 (readStdin):** Added `process.stdin.isTTY` guard that throws immediately when stdin is connected to a terminal (no pipe), preventing hangs. Existing empty-buffer check preserved for piped stdin with no data.
- **D-18 (normalizeUrl):** Added protocol validation that rejects non-HTTP(S) URL schemes with a descriptive error before the http-to-https upgrade, mitigating T-08-01 (spoofing through URL scheme injection)
- **D-19 (jsdom/@types/jsdom):** Pinned jsdom from ^29.1.1 to ^28.1.0 to match @types/jsdom@^28.0.3. The `new JSDOM(html, { url })` API is identical across v28 and v29.

## Task Commits

Each task was committed atomically following TDD pattern (RED test first, then GREEN implementation):

1. **Task 1: Fix withTimeout and readStdin**
   - `7015f80` (test) -- Add failing tests for ETIMEDOUT and isTTY guard (RED)
   - `59ab9a1` (feat) -- Fix withTimeout message and add isTTY guard (GREEN)

2. **Task 2: Fix normalizeUrl and @types/jsdom**
   - `b095ce8` (test) -- Add failing tests for normalizeUrl scheme validation (RED)
   - `24b9477` (feat) -- Fix normalizeUrl validation and jsdom version alignment (GREEN + rebuild)

## Files Modified

- `src/lib/retry.ts` - Changed withTimeout rejection message to include ETIMEDOUT
- `src/lib/input.ts` - Added process.stdin.isTTY guard to readStdin
- `src/lib/fetch.ts` - Added protocol validation to normalizeUrl
- `package.json` - Pinned jsdom to ^28.1.0
- `package-lock.json` - Updated by npm install
- `scripts/websearch.cjs` - Rebuilt bundle
- `scripts/webfetch.cjs` - Rebuilt bundle

## Test Files Modified

- `test/retry.test.ts` - Added 3 tests: timeout ETIMEDOUT, retry-on-timeout, fast resolution
- `test/input.test.ts` - Added 4 tests: empty stdin, TTY guard, valid JSON parsing, stdin mock infrastructure
- `test/fetch.test.ts` - Added 3 tests: reject ftp, file, data schemes

## Decisions Made

- Changed withTimeout error message to include "ETIMEDOUT" rather than modifying `isDDGTransientError` regex, keeping the error detection pattern stable
- Added isTTY guard as an early check before the read loop, not replacing the existing empty-buffer check (which handles the case where piped stdin produces empty content)
- Pinned jsdom to v28 rather than upgrading @types/jsdom to match v29, because no jsdom 29-specific features are used and pinning avoids a @types/jsdom@29 installation (which may not exist yet)

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

- Vitest fake timer implementation produces 2 "errors" (unhandled rejection warnings) during the retry-on-timeout test. These are internal vitest artifacts from scheduling rejections via fake setTimeout -- all 140 tests pass correctly, no test failures.

## Threat Flags

None -- all threat surface introduced in this plan was already present (the four functions existed before). The fixes only added validation and better error messages within existing functions.

## TDD Gate Compliance

Both tasks followed TDD cycle with RED and GREEN gate commits verified in git log:
- Task 1: `test(08-04)` at 7015f80, `feat(08-04)` at 59ab9a1
- Task 2: `test(08-04)` at b095ce8, `feat(08-04)` at 24b9477

## User Setup Required

None -- no external service configuration required. All changes are code-level fixes with no new dependencies.

## Next Phase Readiness

All four code debt items from the v1.0 milestone audit resolved. The test suite is at 140 passing tests with no regressions.

---

*Phase: 08-close-tech-debt-update-requirements-md-fix-summary-gaps-fina*
*Completed: 2026-05-21*
