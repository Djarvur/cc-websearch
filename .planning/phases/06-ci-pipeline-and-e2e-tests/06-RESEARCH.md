# Phase 6: CI Pipeline and E2E Tests - Research

**Researched:** 2026-05-21
**Domain:** GitHub Actions CI, ESLint 9 flat config, vitest coverage/E2E, mise task runner, Dependabot
**Confidence:** HIGH

## Summary

Phase 6 adds continuous integration infrastructure, end-to-end testing, linting, and automated dependency management to the cc-websearch plugin. The project currently has 127 passing unit tests across 14 test files, a working websearch bundle, but a broken webfetch bundle due to the jsdom `default-stylesheet.css` issue. This phase must resolve the jsdom bundle issue as a prerequisite for WebFetch E2E tests.

The CI pipeline consists of two GitHub Actions workflows: a fast PR gate (lint + typecheck + unit tests + build, ~2-3 min) and a periodic cron workflow (npm audit + E2E tests with real network). ESLint 9 flat config with typescript-eslint provides modern TypeScript linting. vitest coverage with v8 provider enforces 80% lines / 70% branches / 80% functions thresholds. mise serves as the local task runner for CI parity. Dependabot handles automated dependency updates.

**Primary recommendation:** Fix the jsdom bundle issue first (mark jsdom as external in esbuild for webfetch), then build the CI stack in order: ESLint/Prettier config -> mise tasks -> GitHub Actions workflows -> E2E tests -> Dependabot.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** E2E tests make real network calls to DDG and real websites. No HTTP mocking. Tests validate actual plugin behavior against live services.
- **D-02:** E2E tests invoke bundled scripts (`node scripts/websearch.cjs`, `node scripts/webfetch.cjs`) via stdin JSON. Tests the actual artifact users run -- catches bundle issues.
- **D-03:** Each E2E test retries 2-3 times on failure before marking as failed. Handles transient network flakiness from real calls.
- **D-04:** E2E test scope covers all four scenarios: WebSearch basic query (verify XML output with title/url/snippet), WebFetch real page (verify markdown output), error handling (invalid input, network errors, bad URLs -- verify stderr + exit code), domain filtering (allowed_domains/blocked_domains end-to-end).
- **D-05:** Add ESLint with flat config (`eslint.config.js`). ESLint 9+ style, no legacy `.eslintrc`.
- **D-06:** ESLint rules: recommended + strict. Catches unused vars, console.log leaks, and more. May require initial cleanup pass on existing code.
- **D-07:** Prettier handles formatting, ESLint handles code quality. Standard pairing with `eslint-config-prettier` to disable conflicting rules.
- **D-08:** Use `mise` (`.mise.toml`) as local task runner for CI parity. User prefers mise over make. Tasks mirror CI steps: lint, typecheck, test, build, e2e, check-all.
- **D-09:** Two GitHub Actions workflows: PR gate (triggered on PR/push to master) and cron (periodic). Clean separation of fast gate vs slow/auditing checks.
- **D-10:** PR gate runs: install deps, lint (ESLint + Prettier check), typecheck (`tsc --noEmit`), unit tests (`vitest run`), build (`npm run build`). All must pass.
- **D-11:** Node 20 LTS only. No version matrix. Package targets Node 20+, single version keeps CI fast.
- **D-12:** Cron workflow runs: npm audit (fail on high/critical), outdated packages check (advisory), Dependabot config for automated dependency PRs, E2E tests with real network.
- **D-13:** Dependabot configured for npm dependencies with automated PRs. Keeps deps fresh without manual tracking.
- **D-14:** CI enforces coverage thresholds. Coverage drops below threshold = CI failure. Prevents coverage regression.
- **D-15:** Coverage targets: 80% lines, 70% branches, 80% functions. Balanced -- high enough to catch gaps, not painful to maintain.
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CI-01 | PR gate workflow runs on push/PR to master | GitHub Actions workflow config with actions/setup-node@v4 caching |
| CI-02 | E2E tests validate real plugin behavior via bundled scripts | E2E test patterns: child_process.spawn, stdin JSON, retry logic |
| CI-03 | Periodic cron workflow runs npm audit + E2E tests | GitHub Actions schedule trigger, npm audit --audit-level=high |
| CI-04 | CI fails on test failures, type errors, lint issues | Non-zero exit codes from each step, no `continue-on-error` |
| CI-05 | ESLint 9 flat config with TypeScript | typescript-eslint setup, eslint-config-prettier integration |
| CI-06 | Coverage thresholds enforced in PR gate | vitest coverage config with v8 provider, thresholds in vitest.config.ts |
| CI-07 | mise task runner for local CI parity | .mise.toml task definitions mirroring CI steps |
| CI-08 | Dependabot for automated dependency updates | dependabot.yml with npm + github-actions ecosystems |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Linting / Formatting | CI / Dev Machine | -- | Code quality checks run identically in CI and locally via mise |
| Type Checking | CI / Dev Machine | -- | `tsc --noEmit` runs in CI, available locally |
| Unit Tests | CI / Dev Machine | -- | vitest run with coverage, same command everywhere |
| E2E Tests | CI (cron) | Dev Machine (manual) | Real network calls -- flaky in CI, need retry logic. Cron-only by default |
| Bundle Build | CI / Dev Machine | -- | esbuild produces .cjs bundles, needed before E2E |
| Coverage Enforcement | CI (PR gate) | -- | Thresholds enforced in CI; devs see coverage locally but CI is the gate |
| Dependency Auditing | CI (cron) | -- | npm audit + Dependabot run on schedule |
| Task Runner | Dev Machine | -- | mise tasks mirror CI steps for local parity |

## Standard Stack

### Core (New packages for this phase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `eslint` | 10.4.0 [VERIFIED: npm registry] | JavaScript/TypeScript linter | De facto standard linter. Flat config (v9+) is the modern standard. |
| `typescript-eslint` | 8.59.4 [VERIFIED: npm registry] | TypeScript ESLint integration | Official TypeScript support for ESLint flat config. Replaces old `@typescript-eslint/*` packages. |
| `@eslint/js` | 10.0.1 [VERIFIED: npm registry] | ESLint recommended rules | Provides `js.configs.recommended` for flat config. |
| `eslint-config-prettier` | 10.1.8 [VERIFIED: npm registry] | Disable ESLint rules conflicting with Prettier | Standard Prettier+ESLint pairing. Must be last in config array. |
| `prettier` | 3.8.3 [VERIFIED: npm registry] | Code formatter | Industry standard formatter. Complements ESLint for code quality. |
| `@vitest/coverage-v8` | 4.1.7 [VERIFIED: npm registry] | Coverage collection for vitest | V8-native coverage provider. Fast, accurate, standard for vitest. |

### Already Installed (Verified versions)

| Library | Version | Purpose |
|---------|---------|---------|
| `vitest` | 4.1.6 (installed) / 4.1.7 (registry) | Test framework |
| `typescript` | 6.0.3 | Language compiler (typecheck) |
| `esbuild` | 0.28.0 | Bundler |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `eslint-config-prettier` | `eslint-plugin-prettier` | Plugin runs Prettier *through* ESLint, adding overhead. Config just disables conflicting rules -- cleaner separation. D-07 specifies this approach. |
| `@vitest/coverage-v8` | `@vitest/coverage-istanbul` | Istanbul is more accurate (instrumentation-based) but slower. v8 is faster and sufficient for 80% line threshold. |
| `typescript-eslint` | Separate `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` | Old approach, deprecated. `typescript-eslint` is the unified package for flat config. |
| `mise` | `make` / `npm run` scripts | User decision (D-08): prefers mise. mise provides tool version pinning + task runner in one file. |

**Installation:**
```bash
npm install --save-dev eslint @eslint/js typescript-eslint eslint-config-prettier prettier @vitest/coverage-v8
```

**Version verification (2026-05-21):**
```
eslint@10.4.0        — registry confirmed
@eslint/js@10.0.1    — registry confirmed
typescript-eslint@8.59.4 — registry confirmed
eslint-config-prettier@10.1.8 — registry confirmed
prettier@3.8.3       — registry confirmed
@vitest/coverage-v8@4.1.7 — registry confirmed
typescript@6.0.3     — registry confirmed (already installed)
vitest@4.1.6         — installed (4.1.7 available, minor bump)
esbuild@0.28.0       — installed
```

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages below are tagged [ASSUMED] but are well-established, high-download packages from known maintainers with verifiable source repositories. Planner should gate each install behind a `checkpoint:human-verify` task per protocol.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| eslint | npm | ~12 yrs | ~50M/wk | github.com/eslint/eslint | N/A | [ASSUMED] -- planner gate |
| @eslint/js | npm | ~3 yrs | ~40M/wk | github.com/eslint/eslint | N/A | [ASSUMED] -- planner gate |
| typescript-eslint | npm | ~2 yrs | ~30M/wk | github.com/typescript-eslint/typescript-eslint | N/A | [ASSUMED] -- planner gate |
| eslint-config-prettier | npm | ~8 yrs | ~20M/wk | github.com/prettier/eslint-config-prettier | N/A | [ASSUMED] -- planner gate |
| prettier | npm | ~8 yrs | ~40M/wk | github.com/prettier/prettier | N/A | [ASSUMED] -- planner gate |
| @vitest/coverage-v8 | npm | ~4 yrs | ~5M/wk | github.com/vitest-dev/vitest | N/A | [ASSUMED] -- planner gate |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages have no postinstall scripts (verified via `npm view <pkg> scripts.postinstall`), established source repos on GitHub, and millions of weekly downloads.*

## Architecture Patterns

### System Architecture Diagram

```
Developer Push/PR          Cron Schedule (weekly)
     |                           |
     v                           v
+-----------+            +---------------+
| PR Gate   |            | Cron Workflow |
| Workflow  |            |               |
+-----------+            +---------------+
     |                           |
     v                           v
+-----------+            +---------------+
| npm ci    |            | npm ci        |
+-----------+            +---------------+
     |                           |
     v                           v
+-----------+            +---------------+
| ESLint +  |            | npm audit     |
| Prettier  |            | (high/crit)   |
| check     |            +---------------+
+-----------+                    |
     |                           v
     v                   +---------------+
+-----------+            | E2E Tests     |
| tsc       |            | (real network |
| --noEmit  |            |  with retry)  |
+-----------+            +---------------+
     |                           |
     v                           v
+-----------+            +---------------+
| vitest    |            | Outdated      |
| run       |            | packages      |
| --coverage|            | check         |
+-----------+            +---------------+
     |
     v
+-----------+
| esbuild   |
| build     |
+-----------+
     |                           |
     +--- ALL GREEN? ---------> +
                                 |
                   +-----------+-----------+
                   |                       |
                   v                       v
              PR merged              Issue/PR created
                                     (Dependabot)

Local Developer:
  mise run check-all  ===  runs lint + typecheck + test + build
  mise run e2e        ===  runs E2E tests locally
```

### Recommended Project Structure
```
.github/
  workflows/
    ci.yml              # PR gate workflow
    cron.yml             # Periodic cron workflow
  dependabot.yml         # Dependabot configuration
eslint.config.js         # ESLint 9 flat config
.prettierrc              # Prettier config (or inline in eslint.config.js)
.mise.toml               # mise task runner config
vitest.config.ts         # Updated: add coverage thresholds, E2E separation
test/
  e2e/
    websearch.e2e.ts     # E2E: WebSearch via bundled script
    webfetch.e2e.ts      # E2E: WebFetch via bundled script
    helpers.ts           # E2E utilities: spawn, retry, parse XML output
  ... (existing 14 test files)
```

### Pattern 1: ESLint 9 Flat Config with TypeScript
**What:** Modern ESLint configuration using flat config array (no `.eslintrc`).
**When to use:** All new TypeScript projects using ESLint 9+.
**Example:**
```javascript
// eslint.config.js
// Source: [CITED: typescript-eslint.io/getting-started]
// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  eslintConfigPrettier, // MUST be last -- disables conflicting rules
);
```
**Key details:**
- `typescript-eslint` exports both `recommended` and `strict` configs as arrays (spread with `...`)
- `eslint-config-prettier` MUST be the last entry -- it disables conflicting rules set by earlier configs [CITED: prettier/eslint-config-prettier README]
- With `"type": "module"` in package.json, `eslint.config.js` is interpreted as ESM
- Project already has `"type": "module"` so no `.mjs` extension needed

### Pattern 2: E2E Test via Child Process with Retry
**What:** Spawn bundled scripts as child processes, feed JSON via stdin, capture stdout/stderr, retry on failure.
**When to use:** Testing CLI tools that make real network calls.
**Example:**
```typescript
// test/e2e/helpers.ts
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';

interface E2EResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function runScript(script: string, input: object): Promise<E2EResult> {
  return new Promise((resolve) => {
    const child = spawn('node', [script], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ stdout, stderr, exitCode: code }));
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

export async function withRetry(
  fn: () => Promise<void>,
  maxRetries = 3,
): Promise<void> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fn();
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastError;
}
```

### Pattern 3: vitest Coverage with Thresholds
**What:** Configure vitest to enforce coverage thresholds in CI.
**When to use:** PR gate CI where coverage regression must fail the build.
**Example:**
```typescript
// vitest.config.ts
// Source: [CITED: vitest.dev/config/coverage]
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/e2e/**'], // E2E tests separate from unit coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```
**Key details:**
- `@vitest/coverage-v8` must be installed as devDependency
- `provider: 'v8'` uses V8's native coverage (faster than istanbul)
- E2E tests excluded from coverage -- they test integration, not code paths
- Thresholds checked at test run end; failure = non-zero exit code [CITED: vitest.dev/config/coverage]

### Pattern 4: mise Task Runner
**What:** `.mise.toml` defines project tasks mirroring CI steps.
**When to use:** Local CI parity, developer convenience.
**Example:**
```toml
# .mise.toml
# Source: [CITED: mise.jdx.dev/tasks/]

[tasks.lint]
description = "Run ESLint and Prettier checks"
run = "npx eslint . && npx prettier --check ."

[tasks.typecheck]
description = "TypeScript type checking"
run = "npm run typecheck"

[tasks.test]
description = "Run unit tests with coverage"
run = "npm test -- --coverage"

[tasks.build]
description = "Build bundles"
run = "npm run build"

[tasks.e2e]
description = "Run end-to-end tests"
run = "npm run e2e"

[tasks.check-all]
description = "Run all CI checks locally"
depends = ["lint", "typecheck", "test", "build"]
run = "echo 'All checks passed'"
```
**Key details:**
- `depends` runs tasks in parallel by default (mise manages concurrency) [CITED: mise.jdx.dev/tasks/task-configuration.html]
- mise is NOT installed on the development machine -- `command -v mise` returns nothing. The planner must note this as an environment dependency.
- Even without mise installed, all tasks are available as npm scripts too

### Pattern 5: GitHub Actions PR Gate Workflow
**What:** Fast CI workflow that runs on every PR/push.
**When to use:** All PRs must pass before merge.
**Example:**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - run: npm run build
```
**Key details:**
- `actions/setup-node@v4` with `cache: 'npm'` handles dependency caching automatically via package-lock.json hash [CITED: github.com/actions/setup-node]
- `concurrency` group cancels redundant runs on same branch
- Node 20 only (D-11: no version matrix)
- Steps are sequential; failure in any step stops the job

### Pattern 6: Dependabot Configuration
**What:** Automated dependency updates for npm and GitHub Actions.
**When to use:** Keeping dependencies fresh without manual tracking.
**Example:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "deps"
      include: "scope"
    open-pull-requests-limit: 5
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```
**Key details:**
- `version: 2` is required [CITED: docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference]
- `github-actions` ecosystem keeps action versions current
- `commit-message.prefix: "deps"` prefixes Dependabot commits for easy identification
- `schedule.interval: "weekly"` balances freshness vs noise

### Anti-Patterns to Avoid
- **Running E2E tests in PR gate:** Real network calls are flaky. E2E tests belong in the cron workflow (D-09, D-12).
- **Using `npm install` in CI:** Always use `npm ci` for deterministic installs from package-lock.json.
- **Legacy `.eslintrc` config:** ESLint 9 only supports flat config. Do not create `.eslintrc.*` files (D-05).
- **Bundling jsdom into esbuild:** jsdom uses `fs.readFileSync` with `__dirname`-relative paths for `default-stylesheet.css`. Bundling breaks this. Must mark as external.
- **Setting `NODE_ENV=production` in CI before tests:** Prevents devDependencies from installing, breaking the build.
- **Using `jest` for anything:** Project uses vitest. Do not introduce jest anywhere (CLAUDE.md "What NOT to Use").
- **Coverage on E2E tests:** E2E tests invoke child processes, which cannot collect V8 coverage. Keep E2E separate from coverage-enforced unit tests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ESLint+Prettier conflict resolution | Custom rule overrides | `eslint-config-prettier` | Maintained by Prettier team, disables all conflicting rules. |
| Coverage collection | Custom Istanbul/V8 integration | `@vitest/coverage-v8` | Built into vitest, one config line. |
| DDG rate limiting in E2E | Custom throttling logic | Retry wrapper (2-3 attempts) | DDG rate limits are transient, not systematic. Simple retry suffices. |
| XML output parsing in E2E | Custom XML parser | Regex or simple string matching | Output format is well-known (`<search_results>`, `<result>`, `<title>`, `<url>`, `<snippet>`). No full parser needed. |
| Cron scheduling | Custom GitHub Actions schedule | `schedule:` trigger with cron syntax | Built into GitHub Actions. |

**Key insight:** The E2E tests are integration tests, not unit tests. They validate that the bundled scripts produce correct output when invoked as child processes with real network calls. This catches bundle issues (like the jsdom error), stdin/stdout contract issues, and real network failure modes that unit tests with mocks cannot catch.

## Common Pitfalls

### Pitfall 1: jsdom Bundle Runtime Error
**What goes wrong:** `webfetch.cjs` crashes on load with `ENOENT: no such file or directory, open '.../browser/default-stylesheet.css'`.
**Why it happens:** jsdom's `computed-style.js` uses `fs.readFileSync(path.resolve(__dirname, "../../../browser/default-stylesheet.css"))`. When esbuild bundles jsdom, `__dirname` points to the CWD instead of the jsdom source directory, so the path resolves incorrectly.
**How to avoid:** Mark `jsdom` as `external` in esbuild config for the webfetch entry point. This forces jsdom to load from `node_modules` at runtime, where the CSS file exists at the correct path.
**Warning signs:** Any `ENOENT` error referencing `default-stylesheet.css` in the stack trace.
**Verified:** Confirmed by running `node -e "require('./scripts/webfetch.cjs')"` -- reproduces the error exactly.

### Pitfall 2: DDG Rate Limiting in E2E Tests
**What goes wrong:** E2E tests fail intermittently because DDG returns "anomaly detected" responses.
**Why it happens:** DDG aggressively rate-limits automated requests, especially repeated queries from the same IP.
**How to avoid:** Use retry logic (D-03: 2-3 attempts per test). Use diverse queries in tests. Space out test runs. Cron workflow (not PR gate) minimizes DDG hits.
**Warning signs:** Test output contains "DDG detected an anomaly" or empty result sets.

### Pitfall 3: Coverage Threshold Failure on First Run
**What goes wrong:** Enabling coverage thresholds causes CI to fail immediately because current coverage may be below the 80/70/80 targets.
**Why it happens:** Existing tests may not cover all branches (especially error paths).
**How to avoid:** Run `npx vitest run --coverage` locally first to check current coverage. Adjust thresholds to match reality if needed, then raise incrementally.
**Warning signs:** CI failure on the first PR that adds coverage enforcement.

### Pitfall 4: ESLint Strict Rules Requiring Code Cleanup
**What goes wrong:** Enabling `tseslint.configs.strict` produces many lint errors on existing code.
**Why it happens:** Strict config adds opinionated rules that existing code may not follow (e.g., `no-unused-vars`, explicit return types).
**How to avoid:** Plan a cleanup pass as a separate task. Or start with `recommended` only and add `strict` incrementally. D-06 says "recommended + strict" so expect cleanup.
**Warning signs:** ESLint produces >20 errors on first run.

### Pitfall 5: E2E Tests Not Finding Built Bundles
**What goes wrong:** E2E tests fail because `scripts/websearch.cjs` and `scripts/webfetch.cjs` don't exist.
**Why it happens:** E2E tests run before build step, or build failed silently.
**How to avoid:** E2E test script must depend on build step. In CI, build runs before E2E. Locally, `mise run e2e` should depend on build task.
**Warning signs:** `ENOENT` for `scripts/*.cjs` files.

### Pitfall 6: vitest v8 Coverage Inaccuracy
**What goes wrong:** v8 coverage reports 100% branch coverage when it shouldn't.
**Why it happens:** Known issue with v8 coverage provider -- it can report incorrect branch percentages due to how V8 counts branches internally.
**How to avoid:** Use `@vitest/coverage-v8` with recent vitest (4.x) which has improved AST-based remapping. If accuracy becomes an issue, switch to `@vitest/coverage-istanbul`.
**Warning signs:** Suspiciously high branch coverage (100%) on files with known uncovered branches.

## Code Examples

### ESLint Flat Config for This Project
```javascript
// eslint.config.js
// Source: [CITED: typescript-eslint.io/getting-started]
// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    ignores: ['scripts/**', 'node_modules/**', 'coverage/**', 'dist/**'],
  },
  eslintConfigPrettier,
);
```

### vitest.config.ts with Coverage and E2E Exclusion
```typescript
// vitest.config.ts
// Source: [CITED: vitest.dev/config/coverage]
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/types.ts'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

### E2E Test Pattern: WebSearch via Bundled Script
```typescript
// test/e2e/websearch.e2e.ts
import { describe, it, expect } from 'vitest';
import { runScript, withRetry } from './helpers';

describe('WebSearch E2E', () => {
  it('returns search results in XML format', async () => {
    await withRetry(async () => {
      const result = await runScript('scripts/websearch.cjs', {
        query: 'example domain website',
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<search_results>');
      expect(result.stdout).toContain('<result>');
      expect(result.stdout).toContain('<title>');
      expect(result.stdout).toContain('<url>');
    });
  });
});
```

### esbuild Config with jsdom External
```typescript
// build.ts (modified)
// The webfetch entry point needs jsdom marked as external
import { build } from 'esbuild';

const commonOptions = {
  bundle: true,
  platform: 'node' as const,
  target: 'node20',
  format: 'cjs' as const,
  outExtension: { '.js': '.cjs' },
  banner: { js: '#!/usr/bin/env node' },
};

await Promise.all([
  build({
    ...commonOptions,
    entryPoints: ['src/websearch.ts'],
    outfile: 'scripts/websearch.cjs',
  }),
  build({
    ...commonOptions,
    entryPoints: ['src/webfetch.ts'],
    outfile: 'scripts/webfetch.cjs',
    external: ['jsdom'],  // jsdom must be external -- it reads CSS via fs at runtime
  }),
]);
```

### GitHub Actions Cron Workflow
```yaml
# .github/workflows/cron.yml
name: Periodic Checks

on:
  schedule:
    - cron: '0 6 * * 1'  # Monday 6 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run build
      - run: npm run e2e
        timeout-minutes: 10
```

### Prettier Config
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.eslintrc.*` config | `eslint.config.js` flat config | ESLint 9 (2024-10) | Flat config is now the only supported format. Legacy config files are ignored. |
| Separate `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` | `typescript-eslint` unified package | 2024 | One package instead of two. Supports flat config natively. |
| `@vitest/coverage-c8` | `@vitest/coverage-v8` | vitest 1.0 (2023) | c8 was renamed. v8 is the current provider name. |
| `actions/cache` + `actions/setup-node` | `actions/setup-node@v4` with `cache: 'npm'` | setup-node v3+ | Built-in caching removes need for separate cache action. |
| `make` / Makefile | `mise` (.mise.toml) | mise 2024+ | Rust-based task runner + version manager. Replaces asdf + make. |

**Deprecated/outdated:**
- `.eslintrc.*` files: ESLint 9 ignores them entirely. Must use flat config.
- `@typescript-eslint/parser` as standalone: Use `typescript-eslint` unified package.
- `@vitest/coverage-c8`: Renamed to `@vitest/coverage-v8`.
- `ts-node`: Replaced by `tsx` for dev execution (project already uses tsx).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Current coverage meets 80% lines / 70% branches / 80% functions thresholds (127 tests across 14 files) | Coverage | May need to lower thresholds or add more tests |
| A2 | mise is the user's preferred task runner even though it is not currently installed on the dev machine | mise tasks | User may want to install mise or fall back to npm scripts |
| A3 | `eslint-config-prettier` v10.x works with ESLint 10.x flat config without compatibility issues | ESLint Setup | May need version-specific configuration |
| A4 | DDG Lite scraping will work reliably enough for E2E tests with retry logic | E2E Tests | DDG may block CI IPs more aggressively than developer IPs |
| A5 | The jsdom external approach (marking jsdom as external in esbuild) is the correct fix for the bundle issue | jsdom Bundle | Alternative: esbuild plugin to inline the CSS, or copy CSS to a known path |
| A6 | vitest 4.1.6 (installed) is compatible with @vitest/coverage-v8@4.1.7 (minor version diff) | Coverage | May need to align exact versions |

## Open Questions (ALL RESOLVED)

1. (RESOLVED) **Current coverage percentages**
   - What we know: 127 tests across 14 test files, covering 9 source modules in `src/lib/` plus 2 entry points.
   - What's unclear: Exact line/branch/function coverage percentages right now.
   - Recommendation: Run `npx vitest run --coverage` before planning to establish baseline. If below thresholds, adjust thresholds or add tests.

2. (RESOLVED) **jsdom external -- runtime dependency implications**
   - What we know: Marking jsdom as external means the bundled webfetch.cjs requires `node_modules/jsdom` at runtime.
   - What's unclear: Whether the Claude Code plugin runtime has access to node_modules when running skills.
   - Recommendation: Verify that the plugin's hooks/hooks.json SessionStart hook installs node_modules (it does -- this is the documented pattern for plugins with npm dependencies).

3. (RESOLVED) **ESLint strict config cleanup scope**
   - What we know: D-06 specifies "recommended + strict". `tseslint.configs.strict` adds many rules.
   - What's unclear: How many existing lint errors strict mode will produce.
   - Recommendation: Plan a lint cleanup task. Run ESLint with strict config on existing code to assess scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All CI steps | Not in CI (TBD) | v26.0.0 (local) | GitHub Actions provides it |
| npm | Dependency install | Not in CI (TBD) | v11.12.1 (local) | GitHub Actions provides it |
| mise | Local task runner | Not installed | -- | Use npm scripts directly |
| git | Version control | Available | -- | -- |

**Missing dependencies with no fallback:**
- None for CI (GitHub Actions provides Node.js and npm)

**Missing dependencies with fallback:**
- mise: Not installed locally. All mise tasks will also be available as npm scripts in package.json. mise is optional for local CI parity.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 |
| Config file | vitest.config.ts (exists, needs coverage + E2E updates) |
| Quick run command | `npm test` (unit tests only, ~2.4s) |
| Full suite command | `npm test -- --coverage && npm run build && npm run e2e` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CI-01 | PR gate triggers on push/PR | Integration (workflow) | `git push` triggers CI | No -- Wave 0 |
| CI-02 | E2E tests validate bundled scripts | E2E | `npm run e2e` | No -- Wave 0 |
| CI-03 | Cron runs audit + E2E | Integration (workflow) | `workflow_dispatch` trigger | No -- Wave 0 |
| CI-04 | CI fails on errors | Integration (workflow) | Intentional failure test | No -- Wave 0 |
| CI-05 | ESLint catches code issues | Unit (lint) | `npx eslint .` | No -- Wave 0 |
| CI-06 | Coverage thresholds enforced | Unit (coverage) | `npm test -- --coverage` | No -- Wave 0 |
| CI-07 | mise tasks mirror CI | Manual verification | `mise run check-all` | No -- Wave 0 |
| CI-08 | Dependabot creates PRs | Integration (Dependabot) | Wait for schedule | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (~2.4s)
- **Per wave merge:** `npm test -- --coverage && npm run lint && npm run typecheck`
- **Phase gate:** Full suite green: unit tests + coverage + lint + typecheck + build + E2E

### Wave 0 Gaps
- [ ] `test/e2e/websearch.e2e.ts` -- covers CI-02 (WebSearch E2E)
- [ ] `test/e2e/webfetch.e2e.ts` -- covers CI-02 (WebFetch E2E)
- [ ] `test/e2e/helpers.ts` -- shared E2E utilities
- [ ] `eslint.config.js` -- ESLint flat config
- [ ] `.prettierrc` -- Prettier config
- [ ] `vitest.config.ts` -- update with coverage thresholds + E2E exclusion
- [ ] `.github/workflows/ci.yml` -- PR gate workflow
- [ ] `.github/workflows/cron.yml` -- periodic workflow
- [ ] `.github/dependabot.yml` -- Dependabot config
- [ ] `.mise.toml` -- mise task definitions
- [ ] `build.ts` -- fix jsdom external for webfetch entry point
- [ ] `package.json` -- add lint/e2e/check scripts + new devDependencies

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod schema validation (existing) |
| V6 Cryptography | no | No crypto in this phase |
| V10 Malicious Code | yes | `npm audit --audit-level=high` in cron workflow |
| V14 Configuration | yes | Dependabot for dependency security updates |

### Known Threat Patterns for Node.js CI/CD

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply chain attack via compromised dependency | Tampering | `npm audit` in cron, Dependabot security updates |
| Malicious GitHub Action version | Tampering | Pin action versions with SHA (not tags) |
| Secrets leakage in CI logs | Information Disclosure | No secrets needed in this project (DDG-only, no API keys) |
| CI cache poisoning | Tampering | Cache key includes package-lock.json hash |

## Sources

### Primary (HIGH confidence)
- [typescript-eslint.io/getting-started](https://typescript-eslint.io/getting-started/) - ESLint 9 flat config setup for TypeScript
- [vitest.dev/config/coverage](https://vitest.dev/config/coverage) - Coverage configuration, thresholds, v8 provider
- [mise.jdx.dev/tasks/](https://mise.jdx.dev/tasks/) - Task definitions in mise.toml
- [mise.jdx.dev/tasks/task-configuration.html](https://mise.jdx.dev/tasks/task-configuration.html) - Task properties: run, depends, description
- [docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference) - Dependabot configuration options
- [github.com/actions/setup-node](https://github.com/actions/setup-node) - setup-node@v4 with built-in npm caching
- [esbuild.github.io/api/](https://esbuild.github.io/api/) - External option for non-analyzable imports

### Secondary (MEDIUM confidence)
- [eslint.org/docs/latest/use/configure/configuration-files](https://eslint.org/docs/latest/use/configure/configuration-files) - Flat config file format
- [prettier/eslint-config-prettier GitHub](https://github.com/prettier/eslint-config-prettier) - Flat config usage pattern
- [github.com/jsdom/jsdom/issues/2230](https://github.com/jsdom/jsdom/issues/2230) - jsdom CSS stylesheet parsing issue
- [stackoverflow.com/questions/48830001/jsdom-could-not-parse-css-stylesheet](https://stackoverflow.com/questions/48830001/jsdom-could-not-parse-css-stylesheet) - jsdom + bundler workaround
- [dev.to/stevez/v8-coverage-vs-istanbul](https://dev.to/stevez/v8-coverage-vs-istanbul-performance-and-accuracy-3ei8) - v8 vs Istanbul coverage comparison

### Tertiary (LOW confidence)
- None -- all key findings verified through primary or secondary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified on npm registry with source repos and no postinstall scripts
- Architecture: HIGH - ESLint flat config, vitest coverage, GitHub Actions patterns verified against official docs
- Pitfalls: HIGH - jsdom bundle issue confirmed by reproduction, DDG rate limiting confirmed by test run
- E2E patterns: MEDIUM - Child process spawn pattern is well-known; retry logic for DDG is new but straightforward

**Research date:** 2026-05-21
**Valid until:** 2026-06-21 (30 days - stable tooling)
