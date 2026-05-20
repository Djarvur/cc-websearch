# Phase 4: Config File and Logging - Research

**Researched:** 2026-05-20
**Domain:** Config file loading, env var precedence, Zod schema validation, logger enhancement
**Confidence:** HIGH

## Summary

Phase 4 adds a config file loader (`src/lib/config.ts`) that reads `~/.config/websearch/config.json`, validates it with Zod, and provides a merged config object following env > file > defaults precedence. The existing modules `logger.ts`, `retry.ts`, and `perplexity.ts` currently read env vars directly via `process.env` -- they must be refactored to accept config values instead. The logger gains ISO 8601 timestamps and module prefixes. All existing env var names change from unprefixed (`PPLX_API_KEY`, `RETRY_*`, `LOG_LEVEL`) to prefixed (`WEBSEARCH_*`).

The refactoring is mechanical but touches every module that currently reads configuration. The key risk is breaking existing tests that stub the old env var names. All 8 existing test files that stub `PPLX_API_KEY`, `RETRY_*`, or `LOG_LEVEL` must be updated to use the new `WEBSEARCH_*` names.

**Primary recommendation:** Build config.ts first with a `loadConfig()` function that returns a fully-resolved typed config object. Then refactor each consumer module to accept config from this object rather than reading env vars directly. Use synchronous `fs.readFileSync` -- config loads once at startup and CLI tools benefit from simpler synchronous control flow.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Nested JSON objects with three sections: `perplexity` (apiKey, model), `retry` (maxRetries, baseDelay, maxDelay, timeout), `logging` (level).
- **D-02:** Prefixed env vars only -- `WEBSEARCH_PERPLEXITY_API_KEY`, `WEBSEARCH_PERPLEXITY_MODEL`, `WEBSEARCH_RETRY_MAX_RETRIES`, `WEBSEARCH_RETRY_BASE_DELAY`, `WEBSEARCH_RETRY_MAX_DELAY`, `WEBSEARCH_RETRY_TIMEOUT`, `WEBSEARCH_LOGGING_LEVEL`. No backward compat with old env var names (`PPLX_API_KEY`, `RETRY_*`, `LOG_LEVEL`).
- **D-03:** Fixed config path `~/.config/websearch/config.json`. No XDG_CONFIG_HOME resolution.
- **D-04:** Precedence: env vars > config file > hardcoded defaults. Each setting resolved independently.
- **D-05:** Missing config file: silent, use defaults. No warning, no debug log.
- **D-06:** Invalid values: warn on stderr, use hardcoded defaults.
- **D-07:** Unknown config keys: warn on stderr.
- **D-08:** Add ISO 8601 timestamps to all log output: `[2026-05-20T14:45:00.123Z] [level] message`.
- **D-09:** Add module prefixes: `[timestamp] [level:module] message`. Modules: `config`, `retry`, `perplexity`, `ddg`, `fetch`, `content`, `filter`, `input`, `output`.
- **D-10:** Logger receives module name at initialization -- each module creates its own scoped logger instance.

### Claude's Discretion
- Exact Zod schema definitions for config validation
- Config file reading implementation (sync vs async)
- Default values for all config keys
- Logger module naming conventions
- How config module is structured (single `loadConfig()` function vs config object)
- Env var name formatting conventions

### Deferred Ideas (OUT OF SCOPE)
None.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-02 | Config file at `~/.config/websearch/config.json` with env variable override (env > file > defaults) | Config file reading via `fs.readFileSync` + Zod validation. Env precedence via per-key override. See Architecture Patterns. |
| CONF-03 | Config file supports: API keys, retry params (max retries, base delay, max delay), Perplexity model selection, log level | Zod strictObject schema with three nested sections matching D-01. All values optional, defaults hardcoded in code. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Config file reading | CLI script (Node) | -- | Single-process CLI tool reads config at startup |
| Config validation | CLI script (Zod) | -- | Schema validation runs once at load time |
| Env var precedence | CLI script (Node) | -- | `process.env` read at startup, merged with file config |
| Log formatting | CLI script (stderr) | -- | All logging goes to stderr per PLUG-05 |
| Module-scoped logging | All lib modules | -- | Each module creates its own logger instance with module name |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | 4.4.3 (installed) [VERIFIED: npm registry] | Config file schema validation | Already in deps. `z.strictObject` rejects unknown keys (D-07). `safeParse` enables warn-on-error behavior (D-06). |

### Node.js Built-in APIs
| API | Purpose | Why |
|-----|---------|-----|
| `fs.readFileSync` | Read config file synchronously | CLI loads config once at startup. Sync is simpler and avoids async initialization ordering issues. |
| `path.join` + `os.homedir` | Resolve `~/.config/websearch/config.json` | Standard Node.js path resolution. No extra deps needed. |
| `JSON.parse` | Parse config file content | Config is JSON. No need for YAML/TOML parser. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fs.readFileSync` | `fs.promises.readFile` | Async is unnecessary -- config loads once at CLI startup. Sync avoids top-level await or async initialization chains. |
| Fixed `~/.config/` path | `xdg-basedir` npm package | D-03 locks this to fixed path. No XDG resolution needed. |
| Zod `strictObject` | Zod `object` with `.strict()` | Same effect in Zod v4. `z.strictObject()` is more concise. Both work. [VERIFIED: tested against zod 4.4.3] |

**No new packages needed.** This phase uses only Zod (already installed) and Node.js built-in APIs (`fs`, `path`, `os`).

## Package Legitimacy Audit

No new packages are installed in this phase. Zod 4.4.3 is already a project dependency.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none new) | | | | | | |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*No new packages introduced. All dependencies already vetted in prior phases.*

## Architecture Patterns

### System Architecture Diagram

```
websearch.ts / webfetch.ts (entry points)
       |
       v
  config.ts :: loadConfig()
       |-- reads ~/.config/websearch/config.json (sync)
       |-- validates with Zod strictObject schema
       |-- merges: env vars > file values > hardcoded defaults
       |-- warns on stderr for unknown keys / invalid values
       |
       v
  Resolved Config Object
       |
       +---> logger.ts :: createLogger(moduleName)
       |       reads config.logging.level
       |       formats: [ISO8601] [level:module] message
       |
       +---> retry.ts :: getRetryConfig()
       |       reads config.retry.*
       |
       +---> perplexity.ts :: getApiKey() / search() / summarize()
               reads config.perplexity.*
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── config.ts       # NEW -- config loader, Zod schema, loadConfig()
│   ├── logger.ts       # REFACTOR -- createLogger(moduleName), timestamps, module prefixes
│   ├── retry.ts        # REFACTOR -- getRetryConfig() reads from config object
│   ├── perplexity.ts   # REFACTOR -- reads API key, model from config object
│   ├── content.ts      # No changes
│   ├── duckduckgo.ts   # No changes (uses logger)
│   ├── fetch.ts        # No changes (uses logger)
│   ├── filter.ts       # No changes (no logger usage)
│   ├── input.ts        # No changes
│   └── output.ts       # No changes
├── websearch.ts        # UPDATE -- initialize config, pass to modules
├── webfetch.ts         # UPDATE -- initialize config, pass to modules
└── types.ts            # No changes
```

### Pattern 1: Config Loading (Synchronous, load once)
**What:** Single `loadConfig()` function called at entry point startup
**When to use:** This is the only config loading pattern needed
**Example:**
```typescript
// src/lib/config.ts
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const ConfigSchema = z.strictObject({
  perplexity: z.strictObject({
    apiKey: z.string().optional(),
    model: z.string().optional(),
  }).optional(),
  retry: z.strictObject({
    maxRetries: z.number().int().min(0).optional(),
    baseDelay: z.number().int().min(0).optional(),
    maxDelay: z.number().int().min(0).optional(),
    timeout: z.number().int().min(0).optional(),
  }).optional(),
  logging: z.strictObject({
    level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  }).optional(),
});

type Config = z.infer<typeof ConfigSchema>;

const CONFIG_PATH = join(homedir(), '.config', 'websearch', 'config.json');

const DEFAULTS = {
  perplexity: { model: 'sonar' },
  retry: { maxRetries: 4, baseDelay: 1000, maxDelay: 16000, timeout: 30000 },
  logging: { level: 'info' as const },
};

export function loadConfig() { /* ... */ }
```
Source: Zod v4 API verified against installed zod 4.4.3 [VERIFIED]

### Pattern 2: Environment Variable Override
**What:** Each config key has a corresponding `WEBSEARCH_*` env var that overrides file values
**When to use:** Resolving each setting independently per D-04
**Example:**
```typescript
// Env var mapping for override resolution
const ENV_MAP = {
  perplexityApiKey: 'WEBSEARCH_PERPLEXITY_API_KEY',
  perplexityModel: 'WEBSEARCH_PERPLEXITY_MODEL',
  retryMaxRetries: 'WEBSEARCH_RETRY_MAX_RETRIES',
  retryBaseDelay: 'WEBSEARCH_RETRY_BASE_DELAY',
  retryMaxDelay: 'WEBSEARCH_RETRY_MAX_DELAY',
  retryTimeout: 'WEBSEARCH_RETRY_TIMEOUT',
  loggingLevel: 'WEBSEARCH_LOGGING_LEVEL',
} as const;

// Per-key resolution: env > file > default
function resolve<T>(envVar: string, fileValue: T | undefined, defaultValue: T): T {
  const envValue = process.env[envVar];
  if (envValue !== undefined && envValue !== '') return coerce(envValue);
  if (fileValue !== undefined) return fileValue;
  return defaultValue;
}
```

### Pattern 3: Module-Scoped Logger
**What:** Each module creates its own logger with a module name prefix
**When to use:** All modules that log to stderr
**Example:**
```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(module: string, level: LogLevel = 'info') {
  const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0, info: 1, warn: 2, error: 3,
  };

  function log(level: LogLevel, message: string): void {
    if (LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]) {
      const timestamp = new Date().toISOString();
      process.stderr.write(`[${timestamp}] [${level}:${module}] ${message}\n`);
    }
  }

  return {
    debug: (msg: string) => log('debug', msg),
    info: (msg: string) => log('info', msg),
    warn: (msg: string) => log('warn', msg),
    error: (msg: string) => log('error', msg),
    setLevel: (newLevel: LogLevel) => { currentLevel = newLevel; },
  };
}
```

### Pattern 4: Config Consumer Interface
**What:** Modules receive config rather than reading env vars directly
**When to use:** All modules that currently read `process.env` for configuration
**Example:**
```typescript
// Before (current code in retry.ts):
export function getRetryConfig(): RetryConfig {
  return {
    maxRetries: parseInt(process.env.RETRY_MAX_RETRIES || '4', 10),
    // ...
  };
}

// After (refactored):
export function getRetryConfig(config: ResolvedConfig): RetryConfig {
  return {
    maxRetries: config.retry.maxRetries,
    baseDelay: config.retry.baseDelay,
    maxDelay: config.retry.maxDelay,
    timeout: config.retry.timeout,
  };
}
```

### Anti-Patterns to Avoid
- **Reading env vars in lib modules:** Lib modules should receive config from the entry point, not read `process.env` directly. This makes testing hard and breaks the config precedence chain.
- **Async config loading:** Using async file reads forces every consumer to handle promises. Sync `readFileSync` at startup is simpler and this is a CLI tool, not a server.
- **Config singleton at module level:** Reading config at module load time (like the current logger reads `LOG_LEVEL` at import) makes testing require `vi.resetModules()`. Instead, pass config explicitly or use a function call.
- **Creating config directory:** The config loader should only READ, never create directories or files. D-05 says missing file is the common case.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config validation | Manual type checks / if-statements | Zod `strictObject` + `safeParse` | Zod provides structured error paths for D-06/D-07 warning messages. Already in deps. |
| Env var type coercion | `parseInt()` with fallback | Zod `z.coerce.number()` or explicit coercion in config module | parseInt returns NaN on bad input. Zod handles validation and produces clear error messages. |
| Unknown key detection | Manual key comparison | Zod `strictObject` | Built-in "Unrecognized key" errors. [VERIFIED: tested against zod 4.4.3] |
| ISO 8601 timestamps | Manual date formatting | `new Date().toISOString()` | Built into JavaScript. No libraries needed. |

**Key insight:** Zod is already installed and the codebase uses it (`input.ts` uses `z.strictObject`). Config validation reuses the same pattern.

## Common Pitfalls

### Pitfall 1: Logger Module-Level State
**What goes wrong:** The current logger reads `LOG_LEVEL` at import time via `let currentLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'`. Tests must use `vi.resetModules()` to re-import.
**Why it happens:** Module-level variables are initialized once when the module is first imported.
**How to avoid:** Refactor to factory pattern: `createLogger(module, level)` returns a logger instance. Config is passed in, not read from env at import time. Entry point creates loggers after loading config.
**Warning signs:** Tests needing `vi.resetModules()` to test different config values.

### Pitfall 2: Breaking Tests with Env Var Rename
**What goes wrong:** Existing tests stub `PPLX_API_KEY`, `RETRY_MAX_RETRIES`, `LOG_LEVEL` etc. After refactoring, these env vars are no longer read -- tests silently pass with default values instead of the stubbed values.
**Why it happens:** `vi.stubEnv('PPLX_API_KEY', 'test-key')` has no effect if the code now reads from config instead of env.
**How to avoid:** Update ALL test files to stub the new `WEBSEARCH_*` env var names. Explicitly list all affected test files in the plan:
- `test/logger.test.ts` -- `LOG_LEVEL` -> `WEBSEARCH_LOGGING_LEVEL`
- `test/retry.test.ts` -- `RETRY_*` -> `WEBSEARCH_RETRY_*`
- `test/perplexity.test.ts` -- `PPLX_API_KEY`, `PPLX_MODEL` -> `WEBSEARCH_PERPLEXITY_*`
- `test/config.test.ts` -- already exists, update to test new config module
- `test/websearch.test.ts` -- stubs `PPLX_API_KEY`
- `test/webfetch.test.ts` -- stubs `PPLX_API_KEY`
- `test/duckduckgo.test.ts` -- no env var stubs (may need logger mock update)
- `test/fetch.test.ts` -- no env var stubs (may need logger mock update)
**Warning signs:** Tests pass but exercise default code paths instead of stubbed values.

### Pitfall 3: Circular Import Between config.ts and logger.ts
**What goes wrong:** `config.ts` needs to warn on stderr about invalid config (D-06, D-07). If config imports logger, and logger imports config, you get a circular dependency.
**Why it happens:** Both modules need each other -- config wants to log warnings, logger wants config for log level.
**How to avoid:** Config module writes warnings directly to `process.stderr.write()` -- does NOT import logger. Logger is initialized AFTER config is loaded. This breaks the cycle cleanly.
**Warning signs:** `ReferenceError: Cannot access 'x' before initialization` at runtime.

### Pitfall 4: Number Coercion from Env Vars
**What goes wrong:** Env vars are always strings. `process.env.WEBSEARCH_RETRY_MAX_RETRIES` is `"4"`, not `4`. If config file has a number but env var overrides it, the merged config would have a string where a number is expected.
**Why it happens:** `process.env` values are always `string | undefined`.
**How to avoid:** Config module must coerce env var strings to numbers before merging. Use `Number()` or `parseInt()` with validation. The resolved config object must have properly typed values, not raw strings.
**Warning signs:** `config.retry.maxRetries` being `"4"` instead of `4`, causing subtle bugs in retry logic.

### Pitfall 5: Logger Mock Updates in Tests
**What goes wrong:** Tests mock `../src/lib/logger.js` to provide `{ logger: { debug, info, warn, error } }`. After refactoring to `createLogger()`, the mock must change to export `createLogger` returning the same shape.
**Why it happens:** Logger API changes from a singleton `logger` object to a `createLogger()` factory.
**How to avoid:** Update the logger mock in all test files. The mock should export `createLogger` that returns an object with the same `debug/info/warn/error` spy functions.
**Warning signs:** Tests fail with "createLogger is not a function" or logger calls not being captured.

## Code Examples

### Config Schema (Zod v4 strictObject) [VERIFIED against zod 4.4.3]
```typescript
// Verified: z.strictObject rejects unknown keys with "Unrecognized key" error
// Verified: safeParse returns { success: false, error: { issues: [{ path, message }] } }
// Verified: Optional nested objects work -- parse({}) succeeds
const ConfigSchema = z.strictObject({
  perplexity: z.strictObject({
    apiKey: z.string().optional(),
    model: z.string().optional(),
  }).optional(),
  retry: z.strictObject({
    maxRetries: z.number().int().min(0).optional(),
    baseDelay: z.number().int().min(0).optional(),
    maxDelay: z.number().int().min(0).optional(),
    timeout: z.number().int().min(0).optional(),
  }).optional(),
  logging: z.strictObject({
    level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  }).optional(),
});
```

### Config File Reading (Synchronous) [VERIFIED: tested Node.js v26.0.0]
```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(homedir(), '.config', 'websearch', 'config.json');

function readConfigFile(): Record<string, unknown> | null {
  if (!existsSync(CONFIG_PATH)) return null; // D-05: silent
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    process.stderr.write('[warn] Failed to parse config file\n');
    return null;
  }
}
```

### Invalid Value Warning (D-06) [VERIFIED: zod 4.4.3 safeParse error format]
```typescript
const result = ConfigSchema.safeParse(fileConfig);
if (!result.success) {
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    process.stderr.write(`[warn] Invalid config at ${path}: ${issue.message}\n`);
  }
}
```
Tested output for `{ logging: { level: 'verbose' } }`:
```
[warn] Invalid config at logging.level: Invalid option: expected one of "debug"|"info"|"warn"|"error"
```

### ISO 8601 Timestamp in Logger [ASSUMED -- standard JavaScript]
```typescript
const timestamp = new Date().toISOString();
// Output: "2026-05-20T14:45:00.123Z"
process.stderr.write(`[${timestamp}] [${level}:${module}] ${message}\n`);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct `process.env` reads in lib modules | Config object passed from entry point | This phase | Centralized config with precedence chain |
| Singleton logger from module import | `createLogger(module, level)` factory | This phase | Module-scoped log output with timestamps |
| `PPLX_API_KEY`, `RETRY_*`, `LOG_LEVEL` | `WEBSEARCH_PERPLEXITY_API_KEY`, `WEBSEARCH_RETRY_*`, `WEBSEARCH_LOGGING_LEVEL` | This phase | Consistent env var prefix, no backward compat |
| `[level] message` log format | `[timestamp] [level:module] message` | This phase | Structured log output with module context |

**Deprecated/outdated:**
- `PPLX_API_KEY` and `PERPLEXITY_API_KEY` env vars: replaced by `WEBSEARCH_PERPLEXITY_API_KEY`
- `PPLX_MODEL` env var: replaced by `WEBSEARCH_PERPLEXITY_MODEL`
- `RETRY_MAX_RETRIES`, `RETRY_BASE_DELAY`, `RETRY_MAX_DELAY`, `RETRY_TIMEOUT`: replaced by `WEBSEARCH_RETRY_*`
- `LOG_LEVEL`: replaced by `WEBSEARCH_LOGGING_LEVEL`
- Direct `process.env` reads in lib modules: replaced by config object

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `new Date().toISOString()` produces sufficient ISO 8601 timestamps | Code Examples | Low -- this is a standard JavaScript API, well-documented |
| A2 | Config file is always valid JSON (not YAML/TOML) | Architecture Patterns | None -- locked by project constraints |
| A3 | `os.homedir()` correctly resolves `~` on all target platforms | Architecture Patterns | Low -- standard Node.js API, works on macOS/Linux/Windows |
| A4 | Zod v4 `safeParse` error format remains stable for warning messages | Code Examples | Low -- tested against installed version, format is stable |

**All assumptions are LOW risk.** No user confirmation needed.

## Open Questions

None. All decisions are locked in CONTEXT.md. Claude's discretion areas have clear best-practice answers documented above.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 26.0.0 | -- |
| Zod | Config validation | Yes | 4.4.3 (installed) | -- |
| TypeScript | Build | Yes | 6.0.3 | -- |
| vitest | Testing | Yes | 4.1.6 | -- |
| esbuild | Bundling | Yes | 0.28.0 | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** N/A

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-02 | Config file read with env override precedence | unit | `npx vitest run test/config.test.ts --reporter=verbose` | Yes (exists, needs expansion) |
| CONF-02 | Missing config file uses defaults silently | unit | `npx vitest run test/config.test.ts --reporter=verbose` | No -- Wave 0 |
| CONF-02 | Env vars override file values | unit | `npx vitest run test/config.test.ts --reporter=verbose` | No -- Wave 0 |
| CONF-03 | Config schema accepts all required fields | unit | `npx vitest run test/config.test.ts --reporter=verbose` | No -- Wave 0 |
| CONF-03 | Invalid values produce stderr warnings | unit | `npx vitest run test/config.test.ts --reporter=verbose` | No -- Wave 0 |
| CONF-03 | Unknown keys produce stderr warnings | unit | `npx vitest run test/config.test.ts --reporter=verbose` | No -- Wave 0 |
| D-08/D-09 | Logger produces timestamped module-prefixed output | unit | `npx vitest run test/logger.test.ts --reporter=verbose` | Yes (exists, needs refactor) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test/config.test.ts` -- expand existing file with: loadConfig tests, env override tests, missing file tests, invalid value tests, unknown key tests
- [ ] `test/logger.test.ts` -- refactor for createLogger factory pattern, add timestamp/module prefix tests
- [ ] `test/retry.test.ts` -- update env var stubs from `RETRY_*` to `WEBSEARCH_RETRY_*`, add config-based tests
- [ ] `test/perplexity.test.ts` -- update env var stubs from `PPLX_*` to `WEBSEARCH_PERPLEXITY_*`, update error message expectations
- [ ] `test/websearch.test.ts` -- update env var stubs
- [ ] `test/webfetch.test.ts` -- update env var stubs

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | API key storage in config file / env var. Config file should have 0600 permissions. |
| V4 Access Control | No | -- |
| V5 Input Validation | Yes | Zod strictObject validates config file structure, rejects unknown keys |
| V6 Cryptography | No | -- |

### Known Threat Patterns for Node CLI Config

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key in world-readable config file | Information Disclosure | Document that config file should be `chmod 600`. Warn if file is world-readable (optional). |
| Malformed JSON crash | Denial of Service | `try/catch` around `JSON.parse`. D-06: warn and use defaults. |
| Path traversal via HOME env | Tampering | `os.homedir()` is standard. Config path is fixed (D-03). Low risk. |

## Sources

### Primary (HIGH confidence)
- Zod v4 API docs -- `z.strictObject`, `safeParse`, error format, `z.enum` [VERIFIED: tested against zod 4.4.3]
- Node.js `fs`, `path`, `os` built-in APIs [VERIFIED: tested against Node v26.0.0]
- Codebase source files: `src/lib/logger.ts`, `src/lib/retry.ts`, `src/lib/perplexity.ts`, `src/websearch.ts`, `src/webfetch.ts` [VERIFIED: read from filesystem]
- Test files: `test/logger.test.ts`, `test/retry.test.ts`, `test/perplexity.test.ts`, `test/config.test.ts` [VERIFIED: read from filesystem]

### Secondary (MEDIUM confidence)
- Existing Zod patterns in `src/lib/input.ts` -- `z.strictObject` usage confirmed as established pattern [VERIFIED: read from filesystem]

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or tested locally

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new packages, all existing dependencies verified
- Architecture: HIGH -- codebase fully read, all integration points identified
- Pitfalls: HIGH -- based on direct code analysis of existing modules and tests
- Config patterns: HIGH -- tested Zod v4 strictObject, safeParse, and error formatting against installed version

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (stable domain, no fast-moving dependencies)
