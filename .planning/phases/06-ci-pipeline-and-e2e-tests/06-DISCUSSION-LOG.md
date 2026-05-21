# Phase 6: CI Pipeline and E2E Tests - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 06-ci-pipeline-and-e2e-tests
**Areas discussed:** E2E test approach, Linting setup, CI workflow structure, Coverage & quality gates

---

## E2E Test Approach

| Option             | Description                                                         | Selected |
| ------------------ | ------------------------------------------------------------------- | -------- |
| Mocked HTTP        | Mock duck-duck-scrape and fetch calls. Deterministic, no flakiness. |          |
| Real network calls | Hit real DDG and fetch real pages. Authentic but flaky.             | ✓        |
| Hybrid             | Mock for PR CI, real calls in cron.                                 |          |

**User's choice:** Real network calls
**Notes:** User values authentic validation over stability.

| Option          | Description                                                              | Selected |
| --------------- | ------------------------------------------------------------------------ | -------- |
| Bundled scripts | Run `node scripts/websearch.cjs` with stdin JSON. Tests actual artifact. | ✓        |
| Source imports  | Import from src/ via vitest. Simpler but skips build step.               |          |
| Both layers     | Unit tests import source, E2E tests run bundles.                         |          |

**User's choice:** Bundled scripts

| Option                    | Description                                    | Selected |
| ------------------------- | ---------------------------------------------- | -------- |
| Retry in test             | Each E2E test retries 2-3x before failing.     | ✓        |
| No retry                  | Fail immediately on any error.                 |          |
| Retry + separate workflow | E2E in own workflow, unit tests are main gate. |          |

**User's choice:** Retry in test

| Option                | Description                                               | Selected |
| --------------------- | --------------------------------------------------------- | -------- |
| WebSearch basic query | Verify XML output with title/url/snippet                  | ✓        |
| WebFetch real page    | Verify markdown output                                    | ✓        |
| Error handling        | Invalid input, network errors — verify stderr + exit code | ✓        |
| Domain filtering      | allowed_domains/blocked_domains end-to-end                | ✓        |

**User's choice:** All four selected

---

## Linting Setup

| Option         | Description                                 | Selected |
| -------------- | ------------------------------------------- | -------- |
| Add ESLint     | Flat config, catches code quality issues    | ✓        |
| Typecheck only | tsc --noEmit, interpret "lint" as typecheck |          |
| Prettier only  | Formatting only, no quality rules           |          |

**User's choice:** Add ESLint

| Option           | Description                              | Selected |
| ---------------- | ---------------------------------------- | -------- |
| Flat config      | eslint.config.js, ESLint 9+ modern style | ✓        |
| Legacy .eslintrc | .eslintrc.json, deprecated path          |          |

**User's choice:** Flat config

| Option               | Description                          | Selected |
| -------------------- | ------------------------------------ | -------- |
| Recommended only     | Minimal rules, can tighten later     |          |
| Recommended + strict | More rules, may need initial cleanup | ✓        |

**User's choice:** Recommended + strict

| Option             | Description                         | Selected |
| ------------------ | ----------------------------------- | -------- |
| Enforce formatting | Prettier or ESLint formatting rules | ✓        |
| Code quality only  | No formatting rules                 |          |

**User's choice:** Enforce formatting

| Option                | Description                                                    | Selected |
| --------------------- | -------------------------------------------------------------- | -------- |
| Prettier + ESLint     | Prettier for formatting, ESLint for quality. Standard pairing. | ✓        |
| ESLint Stylistic only | Single tool, less mature ecosystem                             |          |

**User's choice:** Prettier + ESLint

| Option           | Description                                            | Selected |
| ---------------- | ------------------------------------------------------ | -------- |
| mise             | .mise.toml task runner. Modern, handles tool versions. | ✓        |
| make             | Classic Makefile. Universal but clunky for Node.       |          |
| npm scripts only | package.json scripts. Simplest but limited.            |          |

**User's choice:** mise
**Notes:** User explicitly stated preference for mise over make.

---

## CI Workflow Structure

| Option           | Description                                           | Selected |
| ---------------- | ----------------------------------------------------- | -------- |
| Split: PR + cron | One workflow for PR gate, separate cron for audit+E2E | ✓        |
| Single workflow  | Everything in one with different triggers             |          |
| Three workflows  | PR gate, E2E, cron — max isolation                    |          |

**User's choice:** Split: PR + cron

| Option            | Description                       | Selected |
| ----------------- | --------------------------------- | -------- |
| Node 20 only      | Fast CI, matches package target   | ✓        |
| Node 20 + 22      | Future-proofs but doubles CI time |          |
| Node 18 + 20 + 22 | Broadest check, triples CI time   |          |

**User's choice:** Node 20 only

| Option            | Description                                  | Selected |
| ----------------- | -------------------------------------------- | -------- |
| npm audit         | Known vulnerabilities, fail on high/critical | ✓        |
| Outdated packages | Advisory check for stale deps                | ✓        |
| E2E tests         | Real network validation                      | ✓        |
| Dependabot        | Automated dependency update PRs              | ✓        |

**User's choice:** All four selected

---

## Coverage & Quality Gates

| Option             | Description                              | Selected |
| ------------------ | ---------------------------------------- | -------- |
| Enforce thresholds | CI fails if coverage drops below minimum | ✓        |
| Advisory only      | Generate reports, don't block CI         |          |
| No coverage        | Keep CI minimal                          |          |

**User's choice:** Enforce thresholds

| Option   | Description                            | Selected |
| -------- | -------------------------------------- | -------- |
| 80/70/80 | Lines 80%, Branches 70%, Functions 80% | ✓        |
| 90/80/90 | Aggressive, may slow development       |          |
| 70/60/70 | Relaxed, basic safety net              |          |

**User's choice:** 80/70/80 (lines/branches/functions)

---

## Claude's Discretion

- Exact ESLint rule configuration
- Prettier config specifics
- E2E test file structure and helpers
- mise task definitions
- Specific URLs/queries in E2E tests
- Cron schedule frequency
- Dependabot config details
- Coverage reporter format

## Deferred Ideas

None — discussion stayed within phase scope.
