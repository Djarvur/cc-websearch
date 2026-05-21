# Phase 6: CI Pipeline and E2E Tests - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

GitHub Actions CI infrastructure: PR gate workflow (build + lint + typecheck + unit tests), cron workflow (npm audit + outdated packages + E2E tests), Dependabot config, ESLint + Prettier setup, mise task runner for local CI parity, coverage enforcement. E2E tests validate real plugin behavior via bundled scripts with real network calls.

</domain>

<decisions>
## Implementation Decisions

### E2E Test Approach
- **D-01:** E2E tests make real network calls to DDG and real websites. No HTTP mocking. Tests validate actual plugin behavior against live services.
- **D-02:** E2E tests invoke bundled scripts (`node scripts/websearch.cjs`, `node scripts/webfetch.cjs`) via stdin JSON. Tests the actual artifact users run — catches bundle issues.
- **D-03:** Each E2E test retries 2-3 times on failure before marking as failed. Handles transient network flakiness from real calls.
- **D-04:** E2E test scope covers all four scenarios: WebSearch basic query (verify XML output with title/url/snippet), WebFetch real page (verify markdown output), error handling (invalid input, network errors, bad URLs — verify stderr + exit code), domain filtering (allowed_domains/blocked_domains end-to-end).

### Linting Setup
- **D-05:** Add ESLint with flat config (`eslint.config.js`). ESLint 9+ style, no legacy `.eslintrc`.
- **D-06:** ESLint rules: recommended + strict. Catches unused vars, console.log leaks, and more. May require initial cleanup pass on existing code.
- **D-07:** Prettier handles formatting, ESLint handles code quality. Standard pairing with `eslint-config-prettier` to disable conflicting rules.
- **D-08:** Use `mise` (`.mise.toml`) as local task runner for CI parity. User prefers mise over make. Tasks mirror CI steps: lint, typecheck, test, build, e2e, check-all.

### CI Workflow Structure
- **D-09:** Two GitHub Actions workflows: PR gate (triggered on PR/push to master) and cron (periodic). Clean separation of fast gate vs slow/auditing checks.
- **D-10:** PR gate runs: install deps, lint (ESLint + Prettier check), typecheck (`tsc --noEmit`), unit tests (`vitest run`), build (`npm run build`). All must pass.
- **D-11:** Node 20 LTS only. No version matrix. Package targets Node 20+, single version keeps CI fast.
- **D-12:** Cron workflow runs: npm audit (fail on high/critical), outdated packages check (advisory), Dependabot config for automated dependency PRs, E2E tests with real network.
- **D-13:** Dependabot configured for npm dependencies with automated PRs. Keeps deps fresh without manual tracking.

### Coverage & Quality Gates
- **D-14:** CI enforces coverage thresholds. Coverage drops below threshold = CI failure. Prevents coverage regression.
- **D-15:** Coverage targets: 80% lines, 70% branches, 80% functions. Balanced — high enough to catch gaps, not painful to maintain.
- **D-16:** Coverage enforced in PR gate workflow. Unit tests run with `--coverage` flag, vitest config sets thresholds.

### Claude's Discretion
- Exact ESLint rule configuration (which strict rules to enable/disable)
- Prettier config specifics (print width, single quotes, etc.)
- E2E test file structure and helper utilities
- mise task definitions and naming
- Specific URLs/queries used in E2E tests
- Cron schedule frequency
- Dependabot config details (reviewers, labels, auto-merge)
- Coverage reporter format (text, lcov, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level
- `CLAUDE.md` — Locked technology stack: TypeScript/Node, vitest for testing, esbuild for bundling. Contains version constraints and "What NOT to Use" list.
- `.planning/PROJECT.md` — Core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Requirements traceability
- `.planning/ROADMAP.md` — Phase 6 goal, 4 success criteria

### Source Files
- `package.json` — Existing scripts (build, test, typecheck), dependencies, devDependencies
- `build.ts` — esbuild config for bundling both entry points
- `tsconfig.json` — TypeScript config (strict, ES2022, NodeNext)
- `src/websearch.ts` — WebSearch entry point (E2E test target)
- `src/webfetch.ts` — WebFetch entry point (E2E test target)

### Test Files
- `test/` — Existing unit tests (13 test files, vitest framework)
- `test/helpers/mocks.ts` — Test utilities

### Prior Phase Context
- `.planning/phases/05-ddg-only-with-citations/05-CONTEXT.md` — Current codebase state: DDG-only, no Perplexity, config = {retry, logging}
- `.planning/phases/04-config-file-and-logging/04-CONTEXT.md` — Config schema structure, logger patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `package.json` scripts: `build` (tsx build.ts), `test` (vitest run --reporter=verbose), `typecheck` (tsc --noEmit). Add `lint`, `e2e`, `check` scripts.
- `test/helpers/mocks.ts` — Existing test mock patterns. E2E tests may not need mocks (real network), but error handling tests might.
- `vitest` — Already configured as test framework. Add coverage config and E2E test patterns.
- `build.ts` — esbuild bundles both scripts. E2E tests need bundles to exist before running.

### Established Patterns
- Bundles output to `scripts/*.cjs` (esbuild CJS format)
- All output to stdout, errors to stderr (E2E tests validate this)
- Zod schema validation on stdin input
- Config: `~/.config/websearch/config.json` with env > file > defaults
- 13 existing unit test files in `test/`

### Integration Points
- New files: `.github/workflows/ci.yml`, `.github/workflows/cron.yml`, `.github/dependabot.yml`
- New files: `eslint.config.js`, `.prettierrc` (or inline config)
- New files: `.mise.toml` for local task runner
- New directory: `test/e2e/` or `e2e/` for E2E tests
- Modify: `package.json` (add lint/e2e scripts, add eslint/prettier devDeps)
- May need: `vitest.config.ts` for coverage thresholds and E2E test separation

### Known Issue
- jsdom bundle runtime error (deferred from Phase 05): webfetch.cjs fails at runtime because jsdom requires a default-stylesheet.css file not available in the bundled context. E2E tests for WebFetch will likely hit this. May need to address or work around in this phase.

</code_context>

<specifics>
## Specific Ideas

No specific references or examples — implementation follows captured decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 6-CI Pipeline and E2E Tests*
*Context gathered: 2026-05-21*
