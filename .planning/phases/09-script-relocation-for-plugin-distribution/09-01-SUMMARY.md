---
phase: 09-script-relocation-for-plugin-distribution
plan: 01
subsystem: distribution
tags: [esbuild, skill-paths, plugin-distribution, build-config, test-paths]

# Dependency graph
requires:
  - phase: 07-update-readme-and-the-other-docs-if-necessary
    provides: Existing build pipeline and SKILL.md structure
provides:
  - Self-contained skill directories with compiled bundles
  - Cleaned root scripts/ directory
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bundles live in skills/<name>/scripts/<bundle>.cjs alongside SKILL.md
    - .gitignore and ESLint/Prettier ignore patterns cover skills/*/scripts/

key-files:
  created:
    - skills/websearch/scripts/websearch.cjs
    - skills/webfetch/scripts/webfetch.cjs
  modified:
    - build.ts
    - skills/websearch/SKILL.md
    - skills/webfetch/SKILL.md
    - README.md
    - CLAUDE.md
    - test/skills.test.ts
    - test/e2e/websearch.e2e.ts
    - test/e2e/webfetch.e2e.ts
    - eslint.config.js
    - .prettierignore
  deleted:
    - scripts/websearch.cjs
    - scripts/webfetch.cjs

key-decisions:
  - "Bundles output to skills/<name>/scripts/ instead of root scripts/ (D-01)"
  - "SKILL.md commands use ${CLAUDE_PLUGIN_ROOT}/skills/<name>/scripts/<bundle>.cjs (D-02)"

patterns-established:
  - "Bundles are distributed alongside their skill definitions"
  - "Lint/format ignore patterns updated for new bundle locations"

requirements-completed: [DIST-01, DIST-02, DIST-03, DIST-04, DIST-05, DIST-06]

# Metrics
duration: 8min
completed: 2026-05-22
---

# Phase 9 Plan 1: Relocate bundles to skill subdirectories

**esbuild output paths updated, SKILL.md/README/test paths updated, old scripts/ removed, lint ignores added — DIST-01 through DIST-06 complete**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-22T13:06:00Z
- **Completed:** 2026-05-22T13:14:00Z
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments
- Updated build.ts to output bundles to `skills/<name>/scripts/` (DIST-01)
- Updated SKILL.md command paths, README examples, and CLAUDE.md (DIST-02, DIST-03)
- Updated test/skills.test.ts and E2E test paths (DIST-04)
- Removed old `scripts/` root directory (DIST-05)
- Added `skills/*/scripts/` to ESLint ignores and .prettierignore (DIST-06)
- Full verification: lint clean, build clean, 142 tests pass

## Task Commits

1. **feat(09-01): output bundles to skill subdirectories** - `d717e32`
2. **feat(09-01): update skill and doc path references** - `7061b0f`
3. **feat(09-01): update test path assertions** - `84f24c4`
4. **feat(09-01): remove old scripts/ root directory** - `38da909`
5. **fix: add skill bundle paths to eslint/prettier ignores** - `ea5fc91`

## Files Created/Modified
- `build.ts` — Output paths changed to `skills/<name>/scripts/<bundle>.cjs`
- `skills/websearch/SKILL.md` — Command path updated
- `skills/webfetch/SKILL.md` — Command path updated
- `skills/websearch/scripts/websearch.cjs` — NEW bundle location
- `skills/webfetch/scripts/webfetch.cjs` — NEW bundle location
- `README.md` — Installation and usage examples updated
- `CLAUDE.md` — Architecture docs updated
- `test/skills.test.ts` — Bundle existence and path regex updated
- `test/e2e/websearch.e2e.ts` — Script spawn path updated
- `test/e2e/webfetch.e2e.ts` — Script spawn path updated
- `eslint.config.js` — Ignore patterns for new bundle locations
- `.prettierignore` — Ignore patterns for new bundle locations
- `scripts/websearch.cjs` — DELETED (old location)
- `scripts/webfetch.cjs` — DELETED (old location)

## Decisions Made
- Bundles live in `skills/<name>/scripts/` alongside SKILL.md, so `claude plugin install` distributes everything needed automatically
- ESLint and Prettier ignore patterns updated to prevent linting generated bundles

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- ESLint flagged generated `.cjs` bundles in skill dirs — fixed by adding `skills/*/scripts/**` to ignore patterns in both `eslint.config.js` and `.prettierignore`

## Next Phase Readiness
- Phase 9 complete. Plugin distribution is now self-contained — each skill carries its own scripts.

---
## Self-Check: PASSED

Build, lint, and all 142 tests pass. E2E tests verified with real network calls.

---

*Phase: 09-script-relocation-for-plugin-distribution*
*Completed: 2026-05-22*
