---
phase: 04-config-file-and-logging
reviewed: 2026-05-20T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - src/lib/config.ts
  - src/lib/logger.ts
  - src/lib/retry.ts
  - src/lib/perplexity.ts
  - src/lib/duckduckgo.ts
  - src/lib/fetch.ts
  - src/websearch.ts
  - src/webfetch.ts
  - test/config.test.ts
  - test/logger.test.ts
  - test/retry.test.ts
  - test/perplexity.test.ts
  - test/duckduckgo.test.ts
  - test/fetch.test.ts
  - test/websearch.test.ts
  - test/webfetch.test.ts
  - test/io-separation.test.ts
findings:
  critical: 3
  warning: 5
  info: 5
  total: 13
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-05-20
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed all 18 source and test files at standard depth. The codebase shows a generally clean architecture with good separation of concerns (config, logger, retry, provider abstraction). However, three critical bugs were found: a dead-code timeout mechanism that silently ignores the configured timeout, a type-safety hole where env var number coercion bypasses integer validation, and an off-by-one redirect loop check that allows one extra hop beyond the documented limit. Five warnings cover unhandled edge cases and cross-module inconsistencies.

## Critical Issues

### CR-01: withTimeout is a no-op -- AbortController signal is never passed to the promise

**File:** `src/lib/retry.ts:34-43`
**Issue:** The `withTimeout` function creates an `AbortController` and calls `controller.abort()` on timeout, but the `signal` is never passed to the underlying promise. The function simply `await`s the promise with no connection between the timeout and the operation being timed. If the underlying API call hangs, it will never be aborted -- the timeout fires but nothing happens. Meanwhile, `withTimeout` does not reject the promise on timeout either: the `return await promise` just keeps waiting. The `finally` block clears the timer but does not reject. This means the configured `timeout` value in `ResolvedConfig` (default 30000ms) is completely ignored.

**Fix:**

```typescript
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}
```

### CR-02: Env var number coercion bypasses Zod integer/minimum validation

**File:** `src/lib/config.ts:103-109`
**Issue:** When a numeric env var like `WEBSEARCH_RETRY_MAX_RETRIES` is set to `"3.5"` or `"-5"`, the `resolveFromEnv` function converts it with `Number(envValue)`, which succeeds (returns 3.5 or -5), and it is returned as the resolved value. The Zod schema requires `z.number().int().min(0)`, but that schema is only applied during `validateFileConfig` for file-based config. Env var values skip schema validation entirely and are cast directly via `resolveFromEnv`. This means a user setting `WEBSEARCH_RETRY_MAX_RETRIES=-1` gets a negative retry count, or `WEBSEARCH_RETRY_BASE_DELAY=0.5` gets a fractional delay -- both of which would be rejected if set via the config file.

**Fix:**

```typescript
if (NUMBER_KEYS.has(key)) {
  const num = Number(envValue);
  if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) {
    process.stderr.write(`[warn] Invalid number for ${envName}: "${envValue}"\n`);
    return undefined;
  }
  return num;
}
```

### CR-03: Redirect loop allows maxHops+1 hops due to off-by-one loop boundary

**File:** `src/lib/fetch.ts:29`
**Issue:** The loop condition is `for (let hop = 0; hop <= maxHops; hop++)`, which iterates `maxHops + 1` times (0 through maxHops inclusive). The "too many hops" check on line 53 (`if (hop === maxHops)`) fires on the last iteration but only after a redirect response has already been received and parsed. The final throw on line 71 is dead code -- the loop never reaches it because `hop` never exceeds `maxHops`. The result is that `fetchWithRedirects(url, 10)` actually follows 11 requests, not 10 as the parameter name and error message imply.

**Fix:**

```typescript
for (let hop = 0; hop < maxHops; hop++) {
  // ... existing body ...
  // Remove the "if (hop === maxHops)" check inside the redirect handling
  // The fallthrough throw at the end of the function becomes reachable
}
```

## Warnings

### WR-01: Module-level logger instances ignore the configured log level

**File:** `src/lib/perplexity.ts:5`, `src/lib/duckduckgo.ts:5`, `src/lib/retry.ts:17`, `src/lib/fetch.ts:3`
**Issue:** Each of these modules creates a logger at import time with `createLogger('module')` using the default `'info'` level. The `loadConfig()` function is never called in these modules, so the configured log level from `~/.config/websearch/config.json` or `WEBSEARCH_LOGGING_LEVEL` is never applied to these loggers. Debug-level messages in these modules are permanently suppressed regardless of user configuration.

The main entry points (`websearch.ts`, `webfetch.ts`) create their own loggers with the configured level, but these are separate instances from the module-level loggers.

**Fix:** Either pass the logger instance into each function (dependency injection), or export a `configure(config)` function that calls `setLevel` on each module-level logger after config is loaded.

### WR-02: Module-level side effects cause shared mutable state across test files

**File:** `src/lib/perplexity.ts:5`, `src/lib/duckduckgo.ts:5`, `src/lib/retry.ts:17`, `src/lib/fetch.ts:3`
**Issue:** Each module executes `const logger = createLogger(...)` at module scope. When multiple test files import the same module, they share the same logger instance. Tests that mock `createLogger` in one file may not properly isolate from logger state created by another test file's imports. While the tests currently mock `logger.js`, any test that does not mock it will get real logger instances writing to stderr during test runs.

**Fix:** Initialize logger lazily (on first use) or accept logger as a parameter to exported functions.

### WR-03: Config file unknown keys cause ALL valid fields to be silently dropped

**File:** `src/lib/config.ts:75-85`
**Issue:** `validateFileConfig` uses Zod's `strictObject`, which rejects the entire parsed object when any unknown key is present. The function returns `{}` (empty config) on parse failure, meaning a single typo like `"retriy": { "maxRetries": 5 }` alongside a valid `"perplexity": { "apiKey": "real-key" }` silently drops the API key and all other valid settings. The user gets defaults with no API key and wonders why Perplexity is not being used.

**Fix:** Consider using `z.object` with `passthrough()` and then stripping unknown keys, or at minimum warn explicitly that the entire config file is being ignored due to unrecognized keys:

```typescript
function validateFileConfig(raw: Record<string, unknown>): Config {
  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    process.stderr.write(
      '[warn] Config file has unrecognized keys or invalid values -- entire file ignored\n',
    );
    for (const issue of result.error.issues) {
      // ...existing warning logic
    }
    return {};
  }
  return result.data;
}
```

### WR-04: `fetchWithRedirects` does not consume response bodies for redirect responses

**File:** `src/lib/fetch.ts:30`
**Issue:** When `fetch` receives a redirect response with `redirect: 'manual'`, the response body is never consumed (`.text()` or `.body.cancel()`). In Node.js, unconsumed response bodies can leak file descriptors and memory in some fetch implementations, especially under high concurrency. While Node's `fetch` implementation does eventually garbage-collect these, the behavior is implementation-dependent.

**Fix:** Add `await response.text().catch(() => {})` after detecting a redirect response, or use `response.body?.cancel()`.

### WR-05: `readStdin` throws unhelpful error on empty stdin

**File:** `src/lib/input.ts:24`
**Issue:** If stdin is completely empty (no input piped), `Buffer.concat(chunks).toString('utf8')` returns an empty string, and `JSON.parse('')` throws `SyntaxError: Unexpected end of JSON input`. This is a confusing error message for the user. The function should check for empty input and produce a clear error.

**Fix:**

```typescript
const raw = Buffer.concat(chunks).toString('utf8').trim();
if (!raw) {
  throw new Error('No input received on stdin. Provide JSON input via pipe.');
}
```

## Info

### IN-01: Unused import `join` from `path` could be replaced with `path.join`

**File:** `src/lib/config.ts:3`
**Issue:** `import { join } from 'path'` is used for constructing the config path. This is fine, but the destructured import is the only one from `path`. No action required, just noting it is consistent.

### IN-02: `retryWithBackoff` uses `lastError!` non-null assertion at line 84

**File:** `src/lib/retry.ts:84`
**Issue:** The `throw lastError!` at the end of `retryWithBackoff` uses a TypeScript non-null assertion. This is technically safe because the loop always executes at least once (setting `lastError`), but it would be cleaner to initialize `lastError` with a sentinel value or restructure the loop.

### IN-03: `content.ts` was not in the review scope but is imported by `webfetch.ts`

**File:** `src/lib/content.ts` (not reviewed)
**Issue:** The `extractMarkdown` function is imported by `webfetch.ts` but was not included in the review file list. This is a gap in review coverage. The function takes HTML and returns markdown -- its behavior is critical for the webfetch pipeline.

### IN-04: `normalizeUrl` silently upgrades HTTP to HTTPS without warning

**File:** `src/lib/fetch.ts:14-19`
**Issue:** All HTTP URLs are silently upgraded to HTTPS. This may break for development servers or internal HTTP-only endpoints. Consider logging a debug message when this happens.

### IN-05: Test files use `setTimeout` waits instead of proper async completion

**File:** `test/websearch.test.ts:127`, `test/websearch.test.ts:153`, `test/webfetch.test.ts:116`, `test/io-separation.test.ts:99`
**Issue:** Multiple tests use `await new Promise((r) => setTimeout(r, 100))` to wait for the `main()` function in imported modules to complete. This is a race condition -- if `main()` takes longer than 100ms (e.g., under load), the test may read assertions before the code finishes. The tests should either mock `main()` exports or use a more deterministic completion signal.

---

_Reviewed: 2026-05-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
