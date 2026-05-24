---
phase: 11-redirect-reliability
reviewed: 2026-05-24T16:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - .claude-plugin/hooks/hooks.json
  - skills/websearch/SKILL.md
  - skills/webfetch/SKILL.md
  - test/e2e/redirect-reliability.e2e.ts
findings:
  critical: 2
  warning: 3
  info: 0
  total: 5
status: fixes_applied
fixed:
  all: true
  via:
    - 59b50e5 — tighten assertions to cc-websearch:* patterns
    - f846bf6 — child cleanup, stderr diagnostics, exit code check
    - e3b9a16 — add afterEach import
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-24T16:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files from the phase 11 redirect reliability work were reviewed: hooks.json (denial reason strings), two SKILL.md files (description and body updates), and a new e2e test suite for redirect reliability. The configuration files (hooks.json, both SKILL.md files) are clean -- the changes match the plan and introduce no defects.

The e2e test file at `test/e2e/redirect-reliability.e2e.ts` contains a critical defect that invalidates all 8 test cases: the substring-matching assertions (`.includes('websearch')` and `.includes('webfetch')`) produce false positives because the built-in tool names "WebSearch" and "WebFetch" are themselves substrings of the expected skill name. The test can pass when Claude only attempted the built-in tool (which was denied) and never invoked the plugin skill. Additionally, the wrong skill name ("cc-websearch:webfetch") also matches the search test assertion, enabling a second false positive path.

Additional warnings cover zombie child processes on test timeout and lost diagnostic information.

## Critical Issues

### CR-01: False positive in all 4 search test assertions -- substring match matches the denied built-in tool name and the wrong skill

**File:** `test/e2e/redirect-reliability.e2e.ts:123-124`

**Issue:**
The search test assertions use a substring match that is too broad:
```typescript
result.toolNames.some((n) => n.toLowerCase().includes('websearch'))
```
The built-in tool name `"WebSearch"` (which is captured by the parser after being denied by the PreToolUse hook) lowers to `"websearch"`, which satisfies `includes('websearch')`. This creates a false positive -- the test passes even when Claude only proposed the denied built-in tool and never invoked the `cc-websearch:websearch` skill.

Additionally, the wrong skill `"cc-websearch:webfetch"` also satisfies `includes('websearch')` because `"webfetch"` contains `"websearch"` as a substring. This means calling the wrong skill (webfetch instead of websearch) would also falsely pass the search tests.

Confirmed empirically:
```
"WebSearch".toLowerCase().includes('websearch') → true      (false positive path)
"cc-websearch:webfetch".includes('websearch')   → true      (wrong skill path)
```

This defect undermines all 4 search test cases (lines 102-142).

**Fix:**
Replace the substring match with an exact-or-prefixed check on the skill namespace. The safest fix is to check against the full expected skill name pattern:

```typescript
// Option A: Check for the full prefixed skill name
expect(
  result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:websearch')),
).toBe(true);

// Option B: Only check Skill-tool invocations (skip built-in tool names in collection)
// Modify the parser to only push skill names, not built-in tool names:
// Change lines 81-83 from:
//   if (content.name === 'Skill' && content.input?.skill) {
//     toolNames.push(content.input.skill);
//   } else if (content.name) {
//     toolNames.push(content.name);
//   }
// To:
//   if (content.name === 'Skill' && content.input?.skill) {
//     toolNames.push(content.input.skill);
//   }
// Then the assertion becomes:
//   result.toolNames.some((n) => n.toLowerCase().includes('websearch'))
// (safe because toolNames only contains skill names)
```

Option B is the cleaner fix because it prevents built-in tool names from contaminating the toolNames array at all.

---

### CR-02: False positive in all 4 fetch test assertions -- substring match matches the denied built-in tool name

**File:** `test/e2e/redirect-reliability.e2e.ts:169-171`

**Issue:**
The fetch test assertions use the same vulnerable pattern:
```typescript
result.toolNames.some((n) => n.toLowerCase().includes('webfetch'))
```
The built-in tool name `"WebFetch"` lowers to `"webfetch"`, which satisfies `includes('webfetch')`. This creates the same false positive -- the test passes when Claude only attempted the denied WebFetch tool and never invoked the `cc-websearch:webfetch` skill.

Confirmed empirically:
```
"WebFetch".toLowerCase().includes('webfetch') → true      (false positive path)
```

This defect undermines all 4 fetch test cases (lines 162-215).

**Fix:**
Same approach as CR-01. Apply the fix consistently to all 8 test assertions:

```typescript
// Check for the full prefixed skill name
expect(
  result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:webfetch')),
).toBe(true);
```

Or apply Option B from CR-01 (filter to only skill names in the parser), which would fix both search and fetch tests in one change.

## Warnings

### WR-01: Spawned child processes are never killed on test timeout -- zombie accumulation

**File:** `test/e2e/redirect-reliability.e2e.ts:25-93`

**Issue:**
Each test case spawns a `claude` child process via `spawn('claude', [...])`. The `runClaude` function returns a promise that resolves on the `child.on('close')` event. If vitest terminates the test due to timeout (180s), the spawned `claude` process is never killed. With 8 test cases running sequentially or in parallel (vitest defaults), this can accumulate zombie processes that continue running in the background, consuming API quota and system resources.

Vitest's timeout mechanism rejects the promise but does not send SIGTERM/SIGKILL to spawned children. Over multiple test runs (e.g., during development or CI retries), orphaned claude processes can accumulate.

**Fix:**
Add a child process cleanup mechanism using vitest's `afterEach` hook and an `AbortController`:

```typescript
const activeChildren = new Set<ChildProcess>();

afterEach(() => {
  for (const child of activeChildren) {
    child.kill('SIGTERM');
  }
  activeChildren.clear();
});
```

And in `runClaude`:
```typescript
const child = spawn('claude', [...args]);
activeChildren.add(child);
child.on('close', () => {
  activeChildren.delete(child);
  // ... rest of handler
});
```

Alternatively, wrap with an AbortController and pass a timeout signal to a custom wrapper that kills the child on abort.

---

### WR-02: stderr collected but never used -- lost diagnostic information

**File:** `test/e2e/redirect-reliability.e2e.ts:46-48`

**Issue:**
The `stderr` variable is collected from `child.stderr.on('data', ...)` but is never read, inspected, or included in any error message. When a test fails (e.g., because claude CLI exited with an error), the stderr output that contains the actual failure reason (authentication error, API error, bad arguments, etc.) is silently discarded. The developer sees only a generic assertion failure like "expected true to be true" with no context about why the test failed.

The close handler at line 61 never checks `stderr` and never includes it in resolved/rejected output. The `runClaude` return type `{ toolNames: string[] }` has no field for stderr or error diagnostics.

**Fix:**
Include stderr in the return type and surface it in error messages when no tools were found:

```typescript
interface RunClaudeResult {
  toolNames: string[];
  stderr: string;     // Add stderr for diagnostics
  exitCode: number | null;
}

// In the close handler:
resolvePromise({
  toolNames,
  stderr,
  exitCode: child.exitCode ?? child.exitCode,
});

// In each test, when toolNames is empty, include stderr in the error message:
if (result.toolNames.length === 0) {
  console.error('Claude stderr output:', result.stderr);
}
```

---

### WR-03: Exit code not checked on close -- non-zero exit produces misleading failures

**File:** `test/e2e/redirect-reliability.e2e.ts:61-92`

**Issue:**
The `child.on('close')` handler at line 61 ignores the exit code argument that Node.js provides:
```typescript
child.on('close', () => {
```
The `close` event signature in Node.js is `(code: number | null, signal: string | null)`. The exit code is discarded. When claude CLI exits with a non-zero code (e.g., authentication failure, network error), the test still tries to parse stdout and resolves the promise with whatever was accumulated (likely empty toolNames). The test then fails with an unhelpful assertion error like "expected true to be false" instead of "claude CLI exited with code 1: authentication failed".

This makes debugging CI failures significantly harder because the root cause (claude CLI error) is invisible to the developer.

**Fix:**
Capture and include the exit code in diagnostic output:

```typescript
child.on('close', (code, signal) => {
  if (settled) return;
  settled = true;

  // If exit code is non-zero, the process did not complete successfully
  if (code !== 0 && stdout.trim().length === 0) {
    reject(new Error(
      `claude CLI exited with code ${code} (signal: ${signal}). ` +
      `Stderr: ${stderr.substring(0, 500)}`
    ));
    return;
  }

  // ...continue with normal parsing
});
```

Alternatively, include the exit code in the returned object and let the test assertions surface it naturally, combined with the fix from WR-02.

## Verdict

The configuration files (hooks.json, both SKILL.md files) are clean and correctly implement the phase 11 requirements. The e2e test file has a critical flaw that renders the entire test suite unreliable as a redirect reliability measurement -- the test can pass when Claude never invoked the plugin skill. This must be fixed before the test suite can serve its intended purpose. The two warning-level issues (zombie processes and lost diagnostics) compound the problem by making test failures hard to diagnose.

---

_Reviewed: 2026-05-24T16:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
