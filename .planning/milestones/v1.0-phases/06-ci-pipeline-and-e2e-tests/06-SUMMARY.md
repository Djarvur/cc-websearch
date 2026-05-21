---
phase: "06-ci-pipeline-and-e2e-tests"
plans: 3
tags: [eslint, prettier, vitest, coverage, mise, esbuild, jsdom, typescript, e2e, github-actions, ci, child-process, cron, dependabot, npm-audit]
requires: [05-ddg-only-with-citations]
provides:
  - ESLint 9 flat config with typescript-eslint recommended + strict
  - Prettier formatting config and coverage enforcement (80/70/80 thresholds)
  - Local CI parity via mise task runner
  - E2E test suite with child_process.spawn and withRetry utilities
  - GitHub Actions PR gate workflow (lint, typecheck, test, coverage, build)
  - Weekly cron workflow for npm audit + E2E tests
  - Dependabot config for npm and github-actions ecosystems
affects: []
tech-stack:
  added: [eslint@10.4.0, @eslint/js@10.0.1, typescript-eslint@8.59.4, eslint-config-prettier@10.1.8, prettier@3.8.3, @vitest/coverage-v8@4.1.6, @types/jsdom@28.0.3, @types/turndown@5.0.6]
  patterns:
    - ESLint 9 flat config
    - coverage thresholds
    - mise task runner
    - jsdom external bundling
    - e2e-via-child-process
    - retry-on-network-failure
    - cron workflow with workflow_dispatch
    - dependabot dual-ecosystem config
key-files:
  created:
    - eslint.config.js
    - .prettierrc
    - .prettierignore
    - .mise.toml
    - src/turndown-plugin-gfm.d.ts
    - test/e2e/helpers.ts
    - test/e2e/websearch.e2e.ts
    - test/e2e/webfetch.e2e.ts
    - vitest.config.e2e.ts
    - .github/workflows/ci.yml
    - .github/workflows/cron.yml
    - .github/dependabot.yml
  modified:
    - package.json
    - build.ts
    - vitest.config.ts
    - tsconfig.json
    - src/lib/retry.ts
    - src/websearch.ts
    - test/config.test.ts
key-decisions:
  - "ESLint 9 flat config with typescript-eslint recommended + strict, eslint-config-prettier last"
  - "jsdom marked as external in esbuild for webfetch entry (fixes deferred bundle bug)"
  - "E2E tests invoke bundled scripts via child_process.spawn with withRetry exponential backoff (3s/6s/9s)"
  - "E2E tests excluded from PR gate (cron only) per plan decision D-09"
  - "Dependabot dual-ecosystem (npm + github-actions) with weekly schedule and open-pull-requests-limit: 5"
  - "Cron workflow runs Monday 6 AM UTC with npm audit (fail on high/critical) and E2E tests (10min timeout)"
  - ".planning/ added to .prettierignore to avoid formatting orchestrator-managed artifacts"
requirements-completed: [CI-01, CI-02, CI-03, CI-04, CI-05, CI-06, CI-07, CI-08]
duration: 24min
completed: "2026-05-21"
---

# Phase 06: CI Pipeline and E2E Tests Summary

**ESLint 9 flat config, Prettier, coverage enforcement (80/70/80), mise task runner, E2E tests via child_process, GitHub Actions PR gate + cron workflow + Dependabot, and 131 passing tests**

## Performance

- **Duration:** 24 min (3 plans)
- **Completed:** 2026-05-21
- **Total plans executed:** 3

## Accomplishments

- Established ESLint 9 flat config with typescript-eslint recommended + strict rules, Prettier formatting with project conventions, and vitest coverage enforcement (80/70/80 thresholds)
- Fixed pre-existing typecheck failures (missing `types: ["node"]` in tsconfig, missing type declarations for jsdom/turndown/turndown-plugin-gfm)
- Fixed deferred jsdom bundle bug by marking jsdom as external in esbuild for webfetch entry
- Created E2E test suite (5 tests) with runScript spawning bundled scripts via child_process.spawn and withRetry wrapper for DDG rate limit handling
- Created GitHub Actions PR gate workflow (ci.yml) validating all CI steps: lint, typecheck, unit tests with coverage, build
- Created weekly cron workflow for npm audit (fail on high/critical) + E2E tests with workflow_dispatch trigger
- Configured Dependabot for npm and github-actions ecosystems with weekly update schedule
- Single `npm run check` command validates full CI chain
- Coverage: statements 90.69%, branches 88.11%, functions 84.78%, lines 91.04%

## Key Decisions

- Disabled `@typescript-eslint/no-explicit-any` for test files (mock signatures legitimately need any)
- Allowed underscore-prefixed unused vars in test files to satisfy strict no-unused-vars
- Installed @vitest/coverage-v8@4.1.6 (not 4.1.7) to match vitest@4.1.6 peer dependency
- Added `.claude/` and `.planning/` to ESLint ignores and Prettier ignore respectively
- E2E tests invoke bundled .cjs scripts (not source) to validate build output
- withRetry uses 3s/6s/9s backoff based on DDG rate limit testing

## Next Phase Readiness

- Full CI toolchain operational: lint, typecheck, test with coverage, build
- E2E tests ready for cron workflow execution
- PR gate CI workflow ready for GitHub
- Phase 7 (Documentation) can proceed independently
