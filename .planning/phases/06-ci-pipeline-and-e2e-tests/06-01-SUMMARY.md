---
phase: 06-ci-pipeline-and-e2e-tests
plan: 01
subsystem: infra
tags: [eslint, prettier, vitest, coverage, mise, esbuild, jsdom, typescript]

# Dependency graph
requires:
  - phase: 05-ddg-only-with-citations
    provides: working source code, tests, bundles
provides:
  - ESLint 9 flat config with typescript-eslint recommended + strict
  - Prettier formatting config
  - vitest coverage thresholds (80/70/80)
  - jsdom bundle fix (external in esbuild)
  - mise task runner config for local CI parity
  - npm run check command for full CI chain
  - Type-safe project (tsconfig types: ["node"])
affects: [06-02, 06-03]

# Tech tracking
tech-stack:
  added: [eslint@10.4.0, @eslint/js@10.0.1, typescript-eslint@8.59.4, eslint-config-prettier@10.1.8, prettier@3.8.3, @vitest/coverage-v8@4.1.6, @types/jsdom@28.0.3, @types/turndown@5.0.6]
  patterns: [ESLint 9 flat config, coverage thresholds, mise task runner, jsdom external bundling]

key-files:
  created: [eslint.config.js, .prettierrc, .prettierignore, .mise.toml, src/turndown-plugin-gfm.d.ts]
  modified: [package.json, build.ts, vitest.config.ts, tsconfig.json, src/lib/retry.ts, src/websearch.ts, test/config.test.ts]

key-decisions:
  - "Disable @typescript-eslint/no-explicit-any for test files (mock signatures need any)"
  - "Allow underscore-prefixed unused vars in test files"
  - "Install @vitest/coverage-v8@4.1.6 (not 4.1.7) to match vitest@4.1.6 peer dependency"
  - "Add .claude/ to ESLint ignores (GSD tooling, not project code)"

patterns-established:
  - "ESLint flat config pattern: js.configs.recommended, spread tseslint configs, ignores block, eslint-config-prettier last"
  - "Coverage enforcement: v8 provider, 80/70/80 thresholds, E2E tests excluded"
  - "jsdom external bundling: mark jsdom as external in esbuild for webfetch entry"
  - "mise tasks mirror npm scripts for local CI parity"

requirements-completed: [CI-04, CI-05, CI-06, CI-07]

# Metrics
duration: 14min
completed: 2026-05-21
---

# Phase 6: Local CI Toolchain Summary

**ESLint 9 flat config + Prettier + coverage enforcement + mise tasks + jsdom bundle fix, all passing npm run check**

## Performance

- **Duration:** 14 min
- **Started:** 2026-05-21T15:36:06Z
- **Completed:** 2026-05-21T15:50:54Z
- **Tasks:** 3
- **Files modified:** 107 (mostly Prettier formatting)

## Accomplishments

- Fixed deferred jsdom bundle bug by marking jsdom as external in esbuild for webfetch
- Established ESLint 9 flat config with typescript-eslint recommended + strict rules
- Set up Prettier with project conventions (singleQuote, trailingComma: all, printWidth: 100)
- Configured vitest coverage with v8 provider and 80/70/80 thresholds
- Created mise task runner config mirroring CI steps
- Fixed pre-existing typecheck failures (missing types: ["node"] in tsconfig, missing type declarations)
- Single `npm run check` command validates: lint + typecheck + test with coverage + build

## Task Commits

Each task was committed atomically:

1. **Task 1: Install devDependencies, create config files, fix jsdom bundle** - `7bbd64f` (feat)
2. **Task 2: Lint cleanup pass, Prettier formatting, typecheck fixes** - `14c1828` (fix)
3. **Task 3: Create mise task runner config** - `60ef47d` (feat)

## Files Created/Modified

- `eslint.config.js` - ESLint 9 flat config with typescript-eslint recommended + strict, eslint-config-prettier last
- `.prettierrc` - Prettier config: semi, singleQuote, trailingComma: all, printWidth: 100, tabWidth: 2
- `.prettierignore` - Prettier exclusions: scripts/, coverage/, node_modules/, dist/
- `.mise.toml` - 6 mise tasks: lint, typecheck, test, build, e2e, check-all
- `build.ts` - Added external: ['jsdom'] to webfetch esbuild entry
- `vitest.config.ts` - Added coverage thresholds (80/70/80) and E2E test exclusion
- `package.json` - Added lint, e2e, check scripts + 8 new devDependencies
- `tsconfig.json` - Added types: ["node"] to fix pre-existing typecheck failures
- `src/turndown-plugin-gfm.d.ts` - Type declarations for turndown-plugin-gfm (no @types available)
- `src/lib/retry.ts` - Replaced non-null assertions with proper null checks
- `src/websearch.ts` - Changed catch type from any to unknown
- `test/config.test.ts` - Prefixed unused config variables with underscore

## Decisions Made

- Disabled `@typescript-eslint/no-explicit-any` for test files since mock function signatures legitimately need any type flexibility
- Allowed underscore-prefixed unused vars in test files (`_config`) to satisfy strict no-unused-vars
- Installed `@vitest/coverage-v8@4.1.6` (not 4.1.7) because the 4.1.7 peer dependency requires vitest@4.1.7, which caused npm arborist crash
- Added `.claude/` to ESLint ignores since those are GSD tooling files, not project code
- Fixed pre-existing typecheck failures (missing types: ["node"] in tsconfig, missing type declarations for jsdom/turndown/turndown-plugin-gfm) as part of making `npm run check` work

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed pre-existing typecheck failures**

- **Found during:** Task 2 (lint cleanup pass)
- **Issue:** `npm run typecheck` was failing with 50+ errors before any changes. Missing `types: ["node"]` in tsconfig.json, missing type declarations for jsdom, turndown, and turndown-plugin-gfm
- **Fix:** Added `types: ["node"]` to tsconfig.json compilerOptions, installed `@types/jsdom` and `@types/turndown`, created `src/turndown-plugin-gfm.d.ts` declaration file
- **Files modified:** tsconfig.json, package.json, src/turndown-plugin-gfm.d.ts
- **Verification:** `npm run typecheck` exits 0
- **Committed in:** 14c1828 (Task 2 commit)

**2. [Rule 3 - Blocking] npm install fails for @vitest/coverage-v8@4.1.7**

- **Found during:** Task 1 (install devDependencies)
- **Issue:** Installing all 6 packages at once caused npm arborist crash. Root cause: @vitest/coverage-v8@4.1.7 has peerDependency on vitest@4.1.7 but installed vitest is 4.1.6
- **Fix:** Installed packages individually and used @vitest/coverage-v8@4.1.6 to match installed vitest version
- **Files modified:** package.json, package-lock.json
- **Verification:** npm install succeeds, coverage collection works
- **Committed in:** 7bbd64f (Task 1 commit)

**3. [Rule 2 - Missing Critical] Added .claude/ to ESLint ignores**

- **Found during:** Task 2 (lint cleanup pass)
- **Issue:** ESLint was reporting 100+ errors in .claude/ directory (GSD tooling files written as CommonJS, not ESM)
- **Fix:** Added `.claude/**` to ESLint ignores block
- **Files modified:** eslint.config.js
- **Verification:** `npx eslint .` exits 0
- **Committed in:** 14c1828 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 missing critical, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness. The typecheck fix addresses a pre-existing issue that would have blocked CI. The coverage-v8 version alignment resolves a package compatibility issue.

## Issues Encountered

- npm arborist crash when installing all 6 devDependencies simultaneously -- resolved by installing individually and matching peer dependency versions

## Coverage Baseline

| Metric     | Threshold | Actual | Status |
| ---------- | --------- | ------ | ------ |
| Statements | 80%       | 90.69% | Pass   |
| Branches   | 70%       | 88.11% | Pass   |
| Functions  | 80%       | 84.78% | Pass   |
| Lines      | 80%       | 91.04% | Pass   |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Local CI toolchain fully operational: `npm run check` validates everything CI will check
- jsdom bundle fix resolves the deferred issue from Phase 05, unblocking WebFetch E2E tests in Plan 06-02
- Coverage thresholds at 80/70/80; actual coverage well above thresholds

---

_Phase: 06-ci-pipeline-and-e2e-tests_
_Completed: 2026-05-21_
