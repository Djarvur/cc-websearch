---
phase: 03-webfetch-content-pipeline
reviewed: 2026-05-20T18:30:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - scripts/webfetch.js
  - skills/webfetch/SKILL.md
  - src/lib/content.ts
  - src/lib/fetch.ts
  - src/lib/input.ts
  - src/lib/perplexity.ts
  - src/webfetch.ts
  - test/content.test.ts
  - test/fetch.test.ts
  - test/skills.test.ts
  - test/webfetch.test.ts
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-20T18:30:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the WebFetch content pipeline implementation: fetch-with-redirects, Readability/Turndown content extraction, Perplexity summarization, and CLI entry point. Found 2 critical issues, 3 warnings, and 2 info items.

The most severe finding is that the `SKILL.md` invokes `scripts/webfetch.cjs`, which is a stub that prints "WebFetch is not yet implemented" and exits. The real implementation lives in `scripts/webfetch.js`. This means the plugin will always return the stub message when invoked through Claude Code's skill system. A second critical issue is that `withTimeout` in retry.ts creates an `AbortController` but never connects its signal to the operation, making the timeout entirely non-functional.

## Critical Issues

### CR-01: SKILL.md invokes stub script instead of real implementation

**File:** `skills/webfetch/SKILL.md:15`
**Issue:** The skill definition references `scripts/webfetch.cjs`, which is a 28-line stub that prints "WebFetch is not yet implemented. This feature will be added in a future update." and calls `process.exit(0)`. The actual implementation with Readability extraction, redirect handling, and Perplexity summarization is in `scripts/webfetch.js` (the esbuild bundle). When Claude Code invokes the skill, it will always hit the stub and never reach the real code.
**Fix:**

```
# In skills/webfetch/SKILL.md, change line 15 from:
echo '{"url":"URL","prompt":"QUESTION"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.cjs"
# to:
echo '{"url":"URL","prompt":"QUESTION"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.js"
```

Additionally, delete or update `scripts/webfetch.cjs` so there is no confusion about which file is the entry point.

### CR-02: withTimeout creates AbortController but never connects signal -- timeout is non-functional

**File:** `src/lib/retry.ts:29-38`
**Issue:** The `withTimeout` function creates an `AbortController` and sets a timeout to call `controller.abort()`, but the `controller.signal` is never passed to any operation. The `fn()` call at line 34 is `fn()` which returns a `Promise<T>` -- the promise is already in flight by the time `withTimeout` receives it. There are two problems: (a) the signal is not wired to the fetch call, and (b) even if it were, the function receives a pre-created promise rather than a factory. This means if the Perplexity API hangs, the retry logic will wait indefinitely instead of timing out after `RETRY_TIMEOUT` ms (default 30000).
**Fix:**

```typescript
// Option A: Accept a factory function and pass signal through
async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Then in retryWithBackoff, change the call:
return await withTimeout((signal) => fn(), config.timeout);

// And update fetchWithRedirects to accept+forward signal to fetch():
const response = await fetch(currentUrl.toString(), {
  redirect: 'manual',
  signal,
});
```

## Warnings

### WR-01: readStdin crashes with unhelpful error on empty stdin

**File:** `src/lib/input.ts:24`
**Issue:** `JSON.parse(raw)` is called without a try/catch. If stdin is empty (e.g., the script is invoked without piping data), `raw` will be an empty string and `JSON.parse('')` throws `SyntaxError: Unexpected end of JSON input`. This error propagates up to the generic catch in `webfetch.ts` which logs it via `logger.error`, but the message is not user-friendly and does not indicate the root cause (missing stdin input).
**Fix:**

```typescript
export async function readStdin<T>(schema: z.ZodType<T>): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    throw new Error('No input received on stdin. Provide JSON input via pipe.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON input: ${raw.substring(0, 100)}`);
  }
  return schema.parse(parsed);
}
```

### WR-02: skills.test.ts checks wrong filename -- asserts webfetch.js exists but SKILL.md references webfetch.cjs

**File:** `test/skills.test.ts:74-77`
**Issue:** The test "scripts/webfetch.js should exist at the path referenced by SKILL.md" asserts that `scripts/webfetch.js` exists, but the actual `SKILL.md` file references `scripts/webfetch.cjs`. The test passes because both files exist, but it does not verify that the path in SKILL.md matches the path being tested. This test gave a false sense of correctness while the SKILL.md was pointing at the wrong file.
**Fix:**

```typescript
// Parse the actual script path from SKILL.md and verify THAT file exists
it('should reference a script file that exists', () => {
  const skillPath = resolve(ROOT, 'skills', 'webfetch', 'SKILL.md');
  const content = readFileSync(skillPath, 'utf8');
  const scriptMatch = content.match(/node "\\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)"/);
  expect(scriptMatch).not.toBeNull();
  const scriptRelPath = scriptMatch![1];
  const scriptAbsPath = resolve(ROOT, scriptRelPath);
  expect(existsSync(scriptAbsPath)).toBe(true);
});
```

### WR-03: normalizeUrl accepts non-HTTP schemes (data:, ftp:) without validation

**File:** `src/lib/fetch.ts:12-18`
**Issue:** `normalizeUrl` only upgrades `http:` to `https:` but does not reject non-HTTP schemes. `data:` URLs pass through unchanged and Node.js `fetch()` will resolve them, returning the inline content as a response. While this is low-severity in a CLI tool context, it violates the documented contract ("HTTP URLs are automatically upgraded to HTTPS") and could allow unexpected behavior (e.g., a crafted `data:text/html,...` URL bypasses network fetch entirely).
**Fix:**

```typescript
export function normalizeUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported URL scheme: ${url.protocol}. Only http: and https: are allowed.`);
  }
  if (url.protocol === 'http:') {
    url.protocol = 'https:';
  }
  return url;
}
```

## Info

### IN-01: Perplexity response typed as `any` for search_results access

**File:** `src/lib/perplexity.ts:46`
**Issue:** `(response as any).search_results` bypasses TypeScript's type system to access a field not present in the SDK's type definitions. This is pragmatically justified since the Perplexity API returns `search_results` in the response body but the SDK types may not expose it. However, it silently accepts any shape of data.
**Fix:** Define a minimal interface for the expected shape and use a type assertion against that interface rather than bare `any`:

```typescript
interface PerplexityResponseWithSearch {
  search_results?: Array<{ title?: string; url: string }>;
  citations?: string[];
  choices?: Array<{ message?: { content?: string } }>;
}
const searchResults = (response as unknown as PerplexityResponseWithSearch).search_results;
```

### IN-02: JSDOM instance not explicitly closed after use in extractMarkdown

**File:** `src/lib/content.ts:23`
**Issue:** `new JSDOM(html, { url })` creates a DOM with potentially running event listeners and timers. While Readability extraction is synchronous and the JSDOM instance will be garbage-collected when `dom` goes out of scope, explicitly calling `dom.window.close()` after extraction would release resources deterministically, especially important if the function is called in a loop.
**Fix:**

```typescript
export function extractMarkdown(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  try {
    const document = dom.window.document;
    const reader = new Readability(document);
    const article = reader.parse();
    // ... rest of extraction logic
    return markdown;
  } finally {
    dom.window.close();
  }
}
```

---

_Reviewed: 2026-05-20T18:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
