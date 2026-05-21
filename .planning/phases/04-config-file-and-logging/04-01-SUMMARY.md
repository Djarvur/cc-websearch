---
phase: 04-config-file-and-logging
plan: 01
subsystem: config
tags: [zod, config, schema-validation, env-vars, file-reading]

# Dependency graph
requires:
  - phase: 01-plugin-foundation-and-primary-search
    provides: Zod dependency, src/lib/input.ts strictObject pattern
provides:
  - ConfigSchema Zod strictObject schema with three nested sections
  - loadConfig() function with env > file > defaults precedence
  - ResolvedConfig interface (fully resolved, no undefined except apiKey)
affects: [04-02, 04-03, logger.ts, retry.ts, perplexity.ts]

# Tech tracking
tech-stack:
  added: []
  patterns: [z.strictObject config schema, env var override per-key, sync config file reading]

key-files:
  created:
    - src/lib/config.ts
  modified:
    - test/config.test.ts

key-decisions:
  - 'Config writes warnings directly to process.stderr.write (no logger import) to avoid circular dependency'
  - 'z.strictObject used for all nested sections to catch unknown keys at every level'
  - 'apiKey defaults to undefined while all other fields have concrete defaults'

patterns-established:
  - 'Config precedence: env > file > defaults, resolved per-key independently'
  - 'Number env var coercion with NaN validation and stderr warning'
  - 'Invalid config values produce [warn] on stderr and fall back to defaults'

requirements-completed: [CONF-02, CONF-03]

# Metrics
duration: 3min
completed: 2026-05-20
---

# Phase 4 Plan 01: Config Loader Module Summary

**Config loader with Zod strictObject schema, sync file reading from ~/.config/websearch/config.json, per-key env > file > defaults precedence, and 24 passing tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-20T16:40:12Z
- **Completed:** 2026-05-20T16:43:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Config module with Zod strictObject schema covering perplexity, retry, and logging sections
- Per-key env > file > defaults resolution with all 7 WEBSEARCH\_\* env vars mapped
- Invalid value warnings to stderr (malformed JSON, unknown keys, bad types)
- Comprehensive test suite with 24 passing tests across 7 test groups

## Task Commits

Each task was committed atomically:

1. **Task 1: Create config.ts with Zod schema, file reading, env precedence, and warning output** - `26ef171` (feat)
2. **Task 2: Create comprehensive config tests** - `15d820d` (test)

## Files Created/Modified

- `src/lib/config.ts` - Config loader: Zod schema, file reading, env var override, warning output. Exports loadConfig(), ConfigSchema, ResolvedConfig.
- `test/config.test.ts` - Fully rewritten from old perplexity getApiKey/hasApiKey tests to config loader tests with 24 cases.

## Decisions Made

- Config writes warnings directly to `process.stderr.write()` -- no logger import -- to avoid circular dependency with logger module (RESEARCH.md Pitfall 3)
- `z.strictObject` used for all nested objects, catching unknown keys at every nesting level
- `apiKey` is the only field that defaults to `undefined`; all other fields have concrete defaults

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed apiKey default value using model default instead of undefined**

- **Found during:** Task 2 (test writing)
- **Issue:** `loadConfig()` resolved `perplexity.apiKey` with `DEFAULTS.perplexity.model` (`'sonar'`) as default, meaning apiKey would be `'sonar'` instead of `undefined` when no file/env provided it
- **Fix:** Changed default parameter to `undefined` with explicit type `resolve<string | undefined>`
- **Files modified:** src/lib/config.ts
- **Verification:** Tests confirm `config.perplexity.apiKey === undefined` when no env/file provides it
- **Committed in:** 15d820d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minimal -- caught by own tests during development, fixed before commit.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Config module ready for consumption by logger.ts, retry.ts, and perplexity.ts refactors in plans 04-02 and 04-03
- ResolvedConfig type available for import by downstream modules
- loadConfig() is a pure function with no side effects beyond stderr warnings

## Self-Check: PASSED

- FOUND: src/lib/config.ts
- FOUND: test/config.test.ts
- FOUND: 04-01-SUMMARY.md
- FOUND: commit 26ef171
- FOUND: commit 15d820d

---

_Phase: 04-config-file-and-logging_
_Completed: 2026-05-20_
