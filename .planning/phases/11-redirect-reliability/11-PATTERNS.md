# Phase 11: Redirect Reliability - Pattern Map

**Mapped:** 2026-05-24
**Files analyzed:** 4 (3 modified, 1 created)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.claude-plugin/hooks/hooks.json` | config/hook | event-driven | `.claude-plugin/hooks/hooks.json` (same file, current state) | exact |
| `skills/websearch/SKILL.md` | config/skill-definition | N/A (static config) | `skills/websearch/SKILL.md` (same file, current state) | exact |
| `skills/webfetch/SKILL.md` | config/skill-definition | N/A (static config) | `skills/webfetch/SKILL.md` (same file, current state) | exact |
| `test/e2e/redirect-reliability.test.ts` | test/e2e | request-response | `test/e2e/helpers.ts` (spawn/process pattern) + `test/e2e/websearch.e2e.ts` (test structure) | partial-match |

## Pattern Assignments

### `.claude-plugin/hooks/hooks.json` (config/hook, event-driven)

**Analog:** `.claude-plugin/hooks/hooks.json` lines 1-24 (same file, current state before modification)

**Current hook structure (lines 1-24):**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "WebSearch",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Use cc-websearch:websearch Skill tool instead.\"}}'"
          }
        ]
      },
      {
        "matcher": "WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Use cc-websearch:webfetch Skill tool instead.\"}}'"
          }
        ]
      }
    ]
  }
}
```

**Modification pattern — only the `permissionDecisionReason` strings change:**

The two strings to update (decisions D-02, D-03):
- WebSearch entry (line 9): Replace `"permissionDecisionReason":"Use cc-websearch:websearch Skill tool instead."` with `"permissionDecisionReason":"WebSearch tool is unavailable. Use cc-websearch:websearch Skill instead."`
- WebFetch entry (line 18): Replace `"permissionDecisionReason":"Use cc-websearch:webfetch Skill tool instead."` with `"permissionDecisionReason":"WebFetch tool is unavailable. Use cc-websearch:webfetch Skill instead."`

**No structural changes.** The JSON structure, inline echo pattern, `hookSpecificOutput` format, `permissionDecision: "deny"`, and separate matcher entries remain identical to the current state. Only the denial reason string values are replaced.

**JSON escaping verification (run this command to validate):**
```bash
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"WebSearch tool is unavailable. Use cc-websearch:websearch Skill instead."}}' | python3 -m json.tool
```

---

### `skills/websearch/SKILL.md` (config/skill-definition, N/A static config)

**Analog:** `skills/websearch/SKILL.md` lines 1-28 (same file, current state)

**Current SKILL.md structure (lines 1-28):**
```markdown
---
description: Search the web using DuckDuckGo. Use this skill when the user needs current information, web search results, or to find web pages about a topic.
allowed-tools: Bash(node *)
---

# WebSearch

Execute a web search by piping JSON input to the search script.

## Usage

Run the search script with the query as JSON stdin:

```bash
echo '{"query":"SEARCH_TERMS"}' | node "${CLAUDE_PLUGIN_ROOT}/skills/websearch/scripts/websearch.cjs"
```

The script accepts JSON on stdin with this schema:

- `query` (string, required, minimum 2 characters): The search query
- `allowed_domains` (string[], optional): Only return results from these domains
- `blocked_domains` (string[], optional): Exclude results from these domains

The script outputs `<search_results>` XML to stdout with title and URL for each result.
Errors and diagnostic messages are written to stderr.

Always use the search results to inform your response. Include source URLs when citing information.
```

**Modification pattern — two changes (D-05, D-06):**

**Change 1 — Frontmatter `description` field** (line 2):
Replace the description value with:
```
description: Replacement for built-in WebSearch — search the web using DuckDuckGo. Use this skill when the user needs current information, web search results, or to find web pages about a topic.
```
The prefix `"Replacement for built-in WebSearch — "` is the key addition.

**Change 2 — Body first paragraph** (lines 7-8):
Insert a new first paragraph before the existing `## Usage` section that states the replacement role. Example wording:
```
This skill replaces the built-in WebSearch tool when unavailable.
```
Followed by the existing usage instructions. The exact phrasing is at Claude's discretion per CONTEXT.md D-06.

**No structural changes to the file.** The YAML frontmatter (`---` delimiters, `allowed-tools` field), the `## Usage` section, the code block, the schema list, and the trailing instruction paragraph remain unchanged. Only the `description` field text and the body opening content change.

---

### `skills/webfetch/SKILL.md` (config/skill-definition, N/A static config)

**Analog:** `skills/webfetch/SKILL.md` lines 1-28 (same file, current state)

**Identical modification pattern to websearch SKILL.md (D-05, D-06):**

**Change 1 — Frontmatter `description` field** (line 2):
Replace the description value with:
```
description: Replacement for built-in WebFetch — fetch and summarize web page content. Use this skill when the user provides a URL and asks about its content.
```
The prefix `"Replacement for built-in WebFetch — "` is the key addition.

**Change 2 — Body first paragraph** (lines 7-8):
Insert a new first paragraph before `## Usage`:
```
This skill replaces the built-in WebFetch tool when unavailable.
```

**Shared SKILL.md pattern — both files follow identical structure:**

| Element | Current | After Phase 11 |
|---------|---------|----------------|
| Frontmatter `description` | `Search the web using DuckDuckGo. ...` / `Fetch and summarize web page content. ...` | `Replacement for built-in WebSearch — Search the web using DuckDuckGo. ...` / `Replacement for built-in WebFetch — Fetch and summarize web page content. ...` |
| Frontmatter `allowed-tools` | `Bash(node *)` | Unchanged |
| Body before `## Usage` | (none / empty first paragraph) | `This skill replaces the built-in [WebSearch|WebFetch] tool when unavailable.` |
| Rest of body | `## Usage`, code block, schema, trailing instruction | Unchanged |

---

### `test/e2e/redirect-reliability.test.ts` (test/e2e, request-response)

**Analog:** `test/e2e/helpers.ts` lines 1-46 + `test/e2e/websearch.e2e.ts` lines 1-42

This is a new file. No existing file invokes `claude` CLI and parses NDJSON tool_use events. The closest analogs are:

1. **`test/e2e/helpers.ts`** (lines 1-46) — Spawn pattern for running child processes with JSON input/output
2. **`test/e2e/websearch.e2e.ts`** (lines 1-42) — Test structure (vitest `describe`/`it`/`expect` pattern for e2e assertions)
3. **`test/skills.test.ts`** (lines 1-121) — SKILL.md frontmatter validation pattern (if part of the harness validates file content before running CLI tests)

**Spawn pattern from `test/e2e/helpers.ts` lines 1-30:**
```typescript
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface E2EResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function runScript(script: string, input: object): Promise<E2EResult> {
  return new Promise((done) => {
    const scriptPath = resolve(__dirname, '..', '..', script);
    const child = spawn('node', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('close', (code) => done({ stdout, stderr, exitCode: code }));
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}
```

**Key pattern to adapt for the test harness:**

The harness must:
1. **Spawn `claude` CLI** instead of `node`: `spawn('claude', ['-p', prompt, '--output-format', 'stream-json', '--plugin-dir', pluginDir])`
2. **Parse NDJSON stream** from stdout — each line is a JSON event. Look for `type: "tool_use"` events and check whether the tool name contains the expected skill name.
3. **Set appropriate timeout** — Claude CLI responses may take 30-60+ seconds per prompt.
4. **Run 8 test cases** sequentially — 4 search prompts + 4 fetch prompts.
5. **Assert all 8 pass** — each prompt should produce a `tool_use` event with the expected cc-websearch skill name.
6. **Report results clearly** — print PASS/FAIL per test case, final score out of 8.

**Vitest e2e test structure from `test/e2e/websearch.e2e.ts` lines 1-17:**
```typescript
import { describe, it, expect } from 'vitest';
import { runScript, withRetry } from './helpers.js';

describe('WebSearch E2E', () => {
  it('returns search results in XML format', async () => {
    await withRetry(async () => {
      const result = await runScript('skills/websearch/scripts/websearch.cjs', {
        query: 'example domain website',
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<search_results>');
      expect(result.stdout).toContain('<result>');
      expect(result.stdout).toContain('<title>');
      expect(result.stdout).toContain('<url>');
      expect(result.stdout).toContain('<snippet>');
    });
  });
  // ... more tests
});
```

**Recommended test harness architecture:**

Option A — Vitest e2e test file (preferred, consistent with existing patterns):
```
test/e2e/redirect-reliability.test.ts
```
- Uses `describe`/`it`/`expect` from vitest (matching `test/e2e/websearch.e2e.ts` pattern)
- Uses `spawn` from `node:child_process` (matching `test/e2e/helpers.ts` pattern)
- Each of the 8 prompts is a separate `it()` block
- Each `it()` spawns `claude -p "<prompt>" --output-format stream-json --plugin-dir .claude-plugin`
- Parses NDJSON lines looking for `type: "tool_use"` with `input` containing the expected skill name
- Requires a new helper in `test/e2e/helpers.ts` or inline in the test file:
  ```typescript
  function runClaude(prompt: string): Promise<{ toolCalls: string[] }> {
    return new Promise((done) => {
      const child = spawn('claude', [
        '-p', prompt,
        '--output-format', 'stream-json',
        '--plugin-dir', resolve(__dirname, '../../.claude-plugin'),
      ]);
      let toolCalls: string[] = [];
      child.stdout.on('data', (data) => {
        for (const line of data.toString().split('\n').filter(Boolean)) {
          try {
            const event = JSON.parse(line);
            if (event.type === 'tool_use' && event.input?.name) {
              toolCalls.push(event.input.name);
            }
          } catch { /* skip non-JSON lines */ }
        }
      });
      child.on('close', (code) => done({ toolCalls }));
    });
  }
  ```
- Higher timeout needed (`testTimeout: 120000` in vitest config or per-test timeout)

Option B — Standalone Node.js script:
```
test/e2e/redirect-harness.cjs
```
- Self-contained CJS script (no build step needed, works directly with `node`)
- Invokes `claude` CLI via `spawn`/`execSync`
- Hardcodes the 8 prompts, iterates, prints results
- Exit code 0 = all 8 pass, exit code 1 = any failure
- Run via `node test/e2e/redirect-harness.cjs`

**NDJSON stream parsing pattern (critical detail):**
The `--output-format stream-json` flag produces newline-delimited JSON where each line is one of these event types:
- `{ type: "text", text: "..." }` — text delta
- `{ type: "tool_use", input: { name: "WebSearch", ... } }` — tool call
- `{ type: "tool_result", ... }` — tool result
- `{ type: "message_stop", ... }` — end of response

The harness should filter for `type: "tool_use"` and check `input.name` for `"cc-websearch:websearch"` or `"cc-websearch:webfetch"`.

---

## Shared Patterns

### Inline Echo Hook Pattern
**Source:** `.claude-plugin/hooks/hooks.json` lines 1-24
**Apply to:** `.claude-plugin/hooks/hooks.json` (modification)

The JSON structure for PreToolUse hooks with inline echo command is established and unchanged. Only the `permissionDecisionReason` values are modified. The JSON escaping pattern (outer double quotes in `"command"` value, inner single quotes wrapping echo body, innermost escaped double quotes for JSON content) is identical to the current state.

### SKILL.md YAML Frontmatter Pattern
**Source:** `skills/websearch/SKILL.md` lines 1-4 / `skills/webfetch/SKILL.md` lines 1-4
**Apply to:** Both SKILL.md files (modification)

Both skill definition files use identical frontmatter structure:
- `---` delimiter line
- `description:` key with descriptive text value
- `allowed-tools:` key with `Bash(node *)` value
- `---` closing delimiter

The `description` field value is a single line of text. The Phase 11 change prepends the replacement tag to the existing description text, preserving everything after it.

### Child Process Spawn Pattern
**Source:** `test/e2e/helpers.ts` lines 14-30 (`runScript` function)
**Apply to:** `test/e2e/redirect-reliability.test.ts` (new file)

The `runScript` function establishes the project pattern for spawning child processes:
1. Use `spawn` (not `exec` or `execSync`) for streaming output
2. Pipe stdin/stdout/stderr with `{ stdio: ['pipe', 'pipe', 'pipe'] }`
3. Buffer stdout and stderr with `on('data')` event handlers
4. Return a Promise that resolves on the `close` event with `{ stdout, stderr, exitCode }`

The test harness adapts this pattern by spawning `claude` CLI instead of `node`, and parsing NDJSON lines from stdout instead of collecting raw output.

### JSON Stream Parsing Pattern
**Source:** No existing file in the codebase does NDJSON stream parsing. This pattern is new.
**Apply to:** `test/e2e/redirect-reliability.test.ts` (new file)

The NDJSON stream parsing follows this logic:
```
- Split stdout by newlines
- For each non-empty line, attempt JSON.parse
- Skip non-JSON lines (diagnostic output on stderr)
- For parsed events, filter on type: "tool_use"
- Extract and record tool name from event
```

---

## No Analog Found

All files have either an exact analog (same file, current state) or a partial-match analog. No file lacks a pattern reference entirely.

| File | Role | Data Flow | Analog | Match Quality |
|------|------|-----------|--------|---------------|
| `test/e2e/redirect-reliability.test.ts` | test/e2e | request-response | `test/e2e/helpers.ts` (spawn pattern) + `test/e2e/websearch.e2e.ts` (test structure) | partial-match |

The NDJSON stream parsing and `claude` CLI invocation have no existing analog in the codebase. The planner/researcher should verify the actual stream-json NDJSON format with a test invocation before finalizing the parsing logic.

---

## Metadata

**Analog search scope:**
- `.claude-plugin/hooks/hooks.json` (current hook configuration)
- `skills/websearch/SKILL.md` (current websearch skill definition)
- `skills/webfetch/SKILL.md` (current webfetch skill definition)
- `.claude-plugin/plugin.json` (plugin manifest — no change needed per CONTEXT.md)
- `.claude/settings.json` (GSD hook patterns for reference)
- `test/` directory (all existing tests for testing patterns)
- `test/e2e/helpers.ts` (e2e test helper with spawn pattern)
- `.planning/phases/10-hook-infrastructure/10-PATTERNS.md` (Phase 10 pattern assignments)

**Files scanned:** 10 (4 current-state files + 6 reference files)
**Pattern extraction date:** 2026-05-24
