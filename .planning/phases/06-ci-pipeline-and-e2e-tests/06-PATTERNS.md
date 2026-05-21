# Phase 6: CI Pipeline and E2E Tests - Pattern Map

**Mapped:** 2026-05-21
**Files analyzed:** 13 (8 new, 5 modify)
**Analogs found:** 8 / 13 (5 files have no existing analog -- CI/infra files)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.github/workflows/ci.yml` | config | batch | No analog (new CI infra) | none |
| `.github/workflows/cron.yml` | config | batch | No analog (new CI infra) | none |
| `.github/dependabot.yml` | config | N/A | No analog (new CI infra) | none |
| `eslint.config.js` | config | transform | `tsconfig.json` (tool config) | partial |
| `.prettierrc` | config | N/A | No analog (new tool config) | none |
| `.mise.toml` | config | batch | `package.json` scripts section | partial |
| `vitest.config.ts` | config | transform | `vitest.config.ts` (current, self-modify) | exact |
| `test/e2e/helpers.ts` | utility | request-response | `test/helpers/mocks.ts` | role-match |
| `test/e2e/websearch.e2e.ts` | test | request-response | `test/websearch.test.ts` | role-match |
| `test/e2e/webfetch.e2e.ts` | test | request-response | `test/webfetch.test.ts` | role-match |
| `package.json` | config | N/A | `package.json` (current, self-modify) | exact |
| `build.ts` | utility | batch | `build.ts` (current, self-modify) | exact |
| `scripts/webfetch.cjs` | output | batch | `scripts/websearch.cjs` | exact |

## Pattern Assignments

### `vitest.config.ts` (config, transform) -- MODIFY

**Analog:** `vitest.config.ts` (current, self-modify)

**Current config** (full file, lines 1-7):
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
```

**Target pattern** -- add coverage config and E2E exclusion (from RESEARCH.md Pattern 3):
```typescript
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

**Key changes:**
1. Add `exclude: ['test/e2e/**']` to keep E2E tests out of unit coverage
2. Add `coverage` block with v8 provider and thresholds (D-14, D-15)
3. Keep existing `include` pattern unchanged

---

### `build.ts` (utility, batch) -- MODIFY

**Analog:** `build.ts` (current, self-modify)

**Current config** (full file, lines 1-23):
```typescript
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
  }),
]);
```

**Target change** -- add `external: ['jsdom']` to the webfetch entry only:
```typescript
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
    external: ['jsdom'],  // jsdom must be external -- reads CSS via fs at runtime
  }),
]);
```

**Rationale:** jsdom uses `fs.readFileSync(path.resolve(__dirname, "../../../browser/default-stylesheet.css"))` which breaks when bundled because `__dirname` resolves to CWD instead of the jsdom source directory. Marking as external forces jsdom to load from `node_modules` at runtime.

---

### `package.json` (config) -- MODIFY

**Analog:** `package.json` (current, self-modify)

**Current scripts** (lines 6-10):
```json
"scripts": {
  "build": "tsx build.ts",
  "test": "vitest run --reporter=verbose",
  "test:watch": "vitest --reporter=verbose",
  "typecheck": "tsc --noEmit"
}
```

**New scripts to add:**
```json
"lint": "eslint . && prettier --check .",
"e2e": "npm run build && vitest run --config vitest.config.e2e.ts test/e2e/",
"check": "npm run lint && npm run typecheck && npm test -- --coverage && npm run build"
```

**New devDependencies to add:**
```json
"@vitest/coverage-v8": "^4.1.7",
"eslint": "^10.4.0",
"@eslint/js": "^10.0.1",
"typescript-eslint": "^8.59.4",
"eslint-config-prettier": "^10.1.8",
"prettier": "^3.8.3"
```

**Note on E2E script:** Two approaches: (a) separate vitest config file for E2E (`vitest.config.e2e.ts`) that includes only `test/e2e/**` with longer timeouts, or (b) use the main vitest config with a `test/e2e` include filter. The planner decides the exact approach. If using a separate E2E vitest config, it needs to be created too.

---

### `eslint.config.js` (config) -- NEW

**Analog:** `tsconfig.json` (tool configuration pattern)

**tsconfig.json structure** (full file, for config convention reference):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "build.ts"],
  "exclude": ["node_modules", "dist", "scripts"]
}
```

**Pattern to follow from RESEARCH.md Pattern 1:**
```javascript
// eslint.config.js
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
  eslintConfigPrettier,  // MUST be last -- disables conflicting rules
);
```

**Key notes:**
- Project has `"type": "module"` in package.json, so `eslint.config.js` is ESM (no `.mjs` needed)
- `eslint-config-prettier` MUST be the last entry in the config array
- `scripts/**` is ignored because those are bundled output files
- D-06 specifies "recommended + strict" -- expect a cleanup pass on existing code

---

### `.prettierrc` (config) -- NEW

**Analog:** No existing analog. New tool config file.

**Pattern from RESEARCH.md:**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Planner decides** exact config values (Claude's discretion per CONTEXT.md).

---

### `.mise.toml` (config) -- NEW

**Analog:** `package.json` scripts section (task definitions that mirror CI steps)

**Pattern from RESEARCH.md Pattern 4:**
```toml
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

**Note:** mise is NOT installed on the dev machine. All tasks must also exist as npm scripts in package.json. mise is optional for local CI parity.

---

### `test/e2e/helpers.ts` (utility, request-response) -- NEW

**Analog:** `test/helpers/mocks.ts` (test helper pattern)

**Current test helpers** (`test/helpers/mocks.ts`, full file):
```typescript
import type { SearchResult } from '../../src/types.js';

export const mockDDGResults: SearchResult[] = [
  { title: 'DDG Result 1', url: 'https://ddg.example.com/1' },
  { title: 'DDG Result 2', url: 'https://ddg.example.com/2' },
];
```

**E2E helpers pattern** (from RESEARCH.md Pattern 2):
```typescript
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

interface E2EResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function runScript(script: string, input: object): Promise<E2EResult> {
  return new Promise((resolve) => {
    const scriptPath = resolve(import.meta.dirname, '..', '..', script);
    const child = spawn('node', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
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

**Key differences from unit test helpers:**
- Uses `child_process.spawn` to run bundled scripts as real processes
- No mocking -- real network calls
- `withRetry` wrapper for transient DDG rate limiting
- Resolves script paths relative to test file location

---

### `test/e2e/websearch.e2e.ts` (test, request-response) -- NEW

**Analog:** `test/websearch.test.ts` (unit test for same entry point)

**Unit test pattern** (`test/websearch.test.ts` imports and structure, lines 1, 79-99):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('WebSearch single-provider DDG flow', () => {
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    // ...
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should search DDG and output results', async () => {
    // ... mock setup ...
    await import('../src/websearch.js');
    await new Promise((r) => setTimeout(r, 100));
    expect(stdoutOutput).toContain('<search_results>');
  });
});
```

**E2E test pattern** (from RESEARCH.md Pattern 2):
```typescript
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

**E2E test scope** (from D-04):
1. WebSearch basic query -- verify XML output with title/url/snippet
2. Domain filtering -- allowed_domains/blocked_domains end-to-end
3. Error handling -- invalid input, verify stderr + exit code

**Output format to validate** (from `src/lib/output.ts` lines 11-23):
```typescript
// Expected XML structure:
<search_results>
  <result>
    <title>...</title>
    <url>...</url>
    <snippet>...</snippet>
  </result>
</search_results>
```

**Input schema** (from `src/lib/input.ts` lines 3-7):
```typescript
// WebSearch stdin JSON format:
{ "query": "search terms" }
{ "query": "search terms", "allowed_domains": ["github.com"] }
{ "query": "search terms", "blocked_domains": ["reddit.com"] }
```

---

### `test/e2e/webfetch.e2e.ts` (test, request-response) -- NEW

**Analog:** `test/webfetch.test.ts` (unit test for same entry point)

**E2E test scope** (from D-04):
1. WebFetch real page -- verify markdown output
2. Error handling -- bad URLs, network errors, verify stderr + exit code

**Input schema** (from `src/lib/input.ts` lines 11-14):
```typescript
// WebFetch stdin JSON format:
{ "url": "https://example.com", "prompt": "Summarize this page" }
```

**Key note:** The jsdom bundle bug must be fixed first (build.ts change). E2E tests for WebFetch will fail until `external: ['jsdom']` is added to the esbuild config for the webfetch entry point. The E2E test itself validates the fix works.

**Output format:** Raw markdown text to stdout. E2E test can validate presence of common markdown patterns (headings, paragraphs, links) rather than exact output.

---

### `.github/workflows/ci.yml` (config) -- NEW

**Analog:** No existing analog. New CI infrastructure file.

**Pattern from RESEARCH.md Pattern 5:**
```yaml
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

**Step sequence** (from D-10):
1. `npm ci` -- deterministic install
2. `npm run lint` -- ESLint + Prettier
3. `npm run typecheck` -- `tsc --noEmit`
4. `npm test -- --coverage` -- vitest with coverage thresholds
5. `npm run build` -- esbuild bundles

---

### `.github/workflows/cron.yml` (config) -- NEW

**Analog:** No existing analog. New CI infrastructure file.

**Pattern from RESEARCH.md:**
```yaml
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

**Key:** E2E tests run in cron only (D-09, D-12), not in PR gate. Real network calls are flaky.

---

### `.github/dependabot.yml` (config) -- NEW

**Analog:** No existing analog. New CI infrastructure file.

**Pattern from RESEARCH.md Pattern 6:**
```yaml
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

---

## Shared Patterns

### Test Import Convention
**Source:** All existing test files
**Apply to:** `test/e2e/helpers.ts`, `test/e2e/websearch.e2e.ts`, `test/e2e/webfetch.e2e.ts`
```typescript
import { describe, it, expect } from 'vitest';
```
Note: E2E tests do NOT need `vi`, `beforeEach`, `afterEach` since there is no mocking. They may need `beforeAll`/`afterAll` if build setup is needed.

### E2E vs Unit Test Separation
**Apply to:** All E2E test files, vitest.config.ts
- Unit tests: `test/**/*.test.ts` -- mocked, fast, coverage enforced
- E2E tests: `test/e2e/**/*.e2e.ts` -- real network, slower, no coverage
- vitest.config.ts `exclude: ['test/e2e/**']` keeps them separate
- E2E tests may use a separate vitest config with longer timeouts

### Stdout/Stderr Contract
**Source:** `src/websearch.ts` (lines 35, 36-38), `src/webfetch.ts` (lines 27, 35-36)
**Apply to:** E2E test assertions
```typescript
// Success: output goes to stdout
process.stdout.write(output);

// Error: error message goes to stderr via logger, exit code set to 1
logger.error(err instanceof Error ? err.message : String(err));
process.exitCode = 1;
```
E2E tests validate: `result.exitCode === 0` for success, `result.exitCode === 1` for errors, output in `result.stdout`, errors in `result.stderr`.

### Node.js Version Constraint
**Source:** `build.ts` (line 5: `target: 'node20'`), CONTEXT.md (D-11)
**Apply to:** All CI workflow files
```yaml
node-version: 20
```
Single version, no matrix. Package targets Node 20 LTS+.

### npm ci for CI
**Source:** RESEARCH.md anti-patterns
**Apply to:** All GitHub Actions workflow steps
```yaml
- run: npm ci  # NOT npm install
```
Deterministic installs from package-lock.json.

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns directly):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/workflows/ci.yml` | config | batch | No GitHub Actions workflows exist in this project |
| `.github/workflows/cron.yml` | config | batch | No GitHub Actions workflows exist in this project |
| `.github/dependabot.yml` | config | N/A | No CI config files exist in this project |
| `.prettierrc` | config | N/A | No formatter config exists in this project |
| `.mise.toml` | config | batch | No task runner config exists in this project |

These files are all configuration/infrastructure with no existing analogs. The RESEARCH.md contains complete, copy-ready examples for all of them.

## Metadata

**Analog search scope:** `/` (project root), `src/`, `test/`, `build.ts`, `vitest.config.ts`, `package.json`, `tsconfig.json`
**Files scanned:** 25
**Pattern extraction date:** 2026-05-21
