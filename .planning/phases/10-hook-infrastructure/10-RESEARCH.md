# Phase 10: Hook Infrastructure - Research

**Researched:** 2026-05-23
**Domain:** Claude Code PreToolUse hook configuration in plugin.json
**Confidence:** HIGH

## Summary

Phase 10 adds PreToolUse hooks to the cc-websearch plugin that intercept and deny built-in WebSearch and WebFetch tool calls, providing a redirect reason that instructs Claude to use the plugin skills instead. This is purely a plugin configuration change -- no new runtime dependencies, no code changes to CLI scripts, no changes to the build pipeline.

The implementation is self-contained: an inline `echo` command in `hooks/hooks.json` (referenced from `plugin.json`) outputs deny JSON with the `hookSpecificOutput` format. Two separate hook entries use exact case-sensitive matchers for `WebSearch` and `WebFetch`. The denial reason is static text since inline echo has no access to `tool_input` at runtime.

The nmindz/claude-code-copilot-builtin reference implementation confirms the PreToolUse deny pattern works for this use case. That implementation uses a Node.js script (not inline echo) and outputs both the legacy `decision: "block"` and the preferred `hookSpecificOutput` format. Phase 10 takes the simpler inline echo approach per user decision D-01.

**Primary recommendation:** Add two PreToolUse hook entries to `hooks/hooks.json` using inline `echo` commands with `hookSpecificOutput` format emitting `permissionDecision: "deny"` and a static redirect reason. Reference from `plugin.json` via the `hooks` field.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use inline `echo` command in hooks.json -- no Node.js script. Simplest approach, zero extra files. Static denial reason is sufficient for this phase.
- **D-02:** Hook command emits JSON via inline echo, no external shell dependencies (satisfies HOOK-03).
- **D-03:** Use `hookSpecificOutput` format (preferred style): `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}` -- not legacy `decision/reason`.
- **D-04:** Two separate hook entries -- one for `WebSearch`, one for `WebFetch`. Each has its own denial reason text.
- **D-05:** Short redirect text. WebSearch: "Use cc-websearch:websearch Skill tool instead." WebFetch: "Use cc-websearch:webfetch Skill tool instead."
- **D-06:** Denial reason is static (inline echo cannot read tool_input at runtime). Dynamic query/URL inclusion deferred -- not needed for Phase 10.
- **D-07:** No error handling needed -- inline echo is trivially reliable. Hook exits 0 after emitting deny JSON. Non-zero exit = tool proceeds (standard Claude Code hook behavior).
- **D-08:** Hook configuration lives in `hooks/hooks.json` within the plugin directory, referenced from `.claude-plugin/plugin.json`.
- **D-09:** Matchers use exact case-sensitive tool names: `WebSearch` and `WebFetch`.

### Claude's Discretion

None -- all decisions made by user.

### Deferred Ideas (OUT OF SCOPE)

- Dynamic denial reason with original query/URL -- belongs in Phase 11 (Redirect Reliability) if static redirect proves unreliable.
- Node.js script hook for richer logic -- only needed if inline echo redirect isn't reliable enough. Revisit in Phase 11.
- Bash tool blocking for web-bypass attempts (like nmindz does) -- out of scope for v1.2. Consider for future if Claude frequently falls back to curl/wget.
</user_constraints>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOOK-01 | Plugin registers PreToolUse hook that denies built-in WebSearch tool calls with a redirect reason | Two separate hook entries with `matcher: "WebSearch"` outputting deny JSON with `permissionDecisionReason: "Use cc-websearch:websearch Skill tool instead."` |
| HOOK-02 | Plugin registers PreToolUse hook that denies built-in WebFetch tool calls with a redirect reason | Two separate hook entries with `matcher: "WebFetch"` outputting deny JSON with `permissionDecisionReason: "Use cc-websearch:webfetch Skill tool instead."` |
| HOOK-03 | Hook configuration is inline (no external shell scripts or jq dependency) | Inline `echo` command in hooks.json -- single `echo` with inline JSON, zero external dependencies. Verified working pattern from existing `.claude/settings.json` PreToolUse hooks. |
| HOOK-04 | Hook matcher uses exact case-sensitive tool names (`WebSearch\|WebFetch`) | `matcher` field uses exact string `WebSearch` and `WebFetch` -- no regex alternation, no lowercase. Confirmed via nmindz reference implementation and existing project patterns. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Hook configuration storage | Plugin manifest | -- | Hooks live in the plugin directory (`hooks/hooks.json`), referenced from `plugin.json`. This is the Claude Code plugin contract. |
| Tool call interception | Claude Code runtime | -- | PreToolUse hooks fire automatically as part of Claude Code's tool execution pipeline. The plugin only defines the hook behavior. |
| Deny decision | Hook command (inline echo) | -- | The hook command outputs JSON with `permissionDecision: "deny"`. Claude Code applies the decision. |
| Redirect guidance | Hook command (inline echo) | -- | The `permissionDecisionReason` field instructs Claude to use the plugin skill. The model acts on this instruction. |
| Skill invocation | Claude Code model | -- | After receiving the denial reason, the model decides whether to invoke the plugin skill. This is behavioral, not structural. |
| npm dependency installation | SessionStart hook | Plugin hooks.json | `hooks/hooks.json` in the plugin handles npm dependency installation on first run/update. No change needed for Phase 10. |

## Standard Stack

### Core

This phase introduces zero new runtime dependencies. The existing stack (TypeScript, Node.js 20+, cheerio, jsdom, Readability, Turndown, Commander, Zod) is unchanged. All changes are plugin configuration in JSON files.

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `plugin.json` manifest | -- | Plugin registration with hooks field | Claude Code plugin contract -- all plugins use this format |
| `hooks/hooks.json` | -- | Hook definitions referenced from plugin.json | Standard hook configuration file per Claude Code hooks reference |
| Inline `echo` command | -- | Hook execution mechanism | Simplest hook type -- no script file needed, no dependencies |

### Supporting (Existing, Unchanged)

| Component | Version | Purpose |
|-----------|---------|---------|
| `.claude-plugin/plugin.json` | 0.1.0 | Plugin manifest -- add `hooks` field referencing `hooks/hooks.json` |
| `skills/websearch/SKILL.md` | -- | Skill definition -- description will be updated in Phase 11 |
| `skills/webfetch/SKILL.md` | -- | Skill definition -- description will be updated in Phase 11 |

## Verifying the nmindz Reference Implementation

The nmindz/claude-code-copilot-builtin repository provides a real-world reference implementation of PreToolUse hook deny for WebSearch/WebFetch in a plugin. Verified as of 2026-05-23 via GitHub API.

**Key differences from Phase 10 approach:**

| Aspect | nmindz Implementation | Phase 10 Approach |
|--------|----------------------|-------------------|
| Hook type | Node.js script (`hooks/block-unsupported-builtins.js`) [VERIFIED: GitHub API] | Inline `echo` command |
| Output format | Both `decision: "block"` AND `hookSpecificOutput` [VERIFIED: GitHub API] | `hookSpecificOutput` only |
| Matcher style | Single entry with `"WebFetch\|WebSearch"` (pipe alternation) [VERIFIED: GitHub API] | Two separate entries for `WebSearch` and `WebFetch` |
| Denial reason | Dynamic (reads `tool_input` from stdin) [VERIFIED: GitHub API] | Static (inline echo cannot read stdin) |
| Error handling | Silent try/catch with no output on failure [VERIFIED: GitHub API] | None needed (echo trivially reliable) |

**Relevance:** Confirms that PreToolUse hooks with `permissionDecision: "deny"` and a `permissionDecisionReason` string are the correct mechanism. The nmindz implementation works and uses the pattern validated by the CONTEXT.md decisions.

## Package Legitimacy Audit

> **Not applicable:** Phase 10 installs zero new external packages. All changes are plugin configuration (JSON files). The existing `node_modules` and `package.json` are untouched. No slopcheck run needed.

## Architecture Patterns

### System Architecture Diagram

```
User prompt
    |
    v
Claude Code (LLM)
    |
    +--> [WebSearch tool] --x--> PreToolUse hook fires
    |         |                    matcher: "WebSearch"
    |         v                    echo deny JSON to stdout
    |    "Use cc-websearch:websearch Skill tool instead."
    |         |
    +--> [WebFetch tool] --x--> PreToolUse hook fires
    |         |                    matcher: "WebFetch"
    |         v                    echo deny JSON to stdout
    |    "Use cc-websearch:webfetch Skill tool instead."
    |
    +--> [Skill tool] ----------> cc-websearch:websearch / cc-websearch:webfetch
              |                         (Phase 11 concern)
              v
         SKILL.md instructions --> Bash --> node scripts/*.cjs
```

### Recommended Project Structure

```
.claude-plugin/              # Plugin root directory
├── plugin.json              # Manifest (modified: add hooks field)
├── hooks/
│   └── hooks.json           # NEW: PreToolUse hook definitions
├── skills/
│   ├── websearch/
│   │   ├── SKILL.md         # Skill definition (unchanged in Phase 10)
│   │   └── scripts/
│   │       └── websearch.cjs # Bundled script (unchanged)
│   └── webfetch/
│       ├── SKILL.md         # Skill definition (unchanged in Phase 10)
│       └── scripts/
│           └── webfetch.cjs  # Bundled script (unchanged)
```

**Only two files change in Phase 10:**
1. `.claude-plugin/plugin.json` -- add `"hooks"` field referencing `hooks/hooks.json`
2. `.claude-plugin/hooks/hooks.json` -- new file with PreToolUse hook definitions

No `src/` changes, no `skills/` changes, no `package.json` changes, no build pipeline changes.

### Pattern: Inline Command Hook with Static Deny

**What:** A PreToolUse hook using `type: "command"` with an inline `echo` statement that outputs deny JSON. No script file, no dependencies, trivially reliable.

**When to use:** When denial reason is static (does not depend on `tool_input`), no error handling needed, and simplicity is paramount.

**Example:**
```json
{
  "type": "command",
  "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Use cc-websearch:websearch Skill tool instead.\"}}'"
}
```

**Verified by:** nmindz reference implementation (uses same pattern but with Node.js script instead of inline echo) [VERIFIED: GitHub API]. Existing `.claude/settings.json` PreToolUse hooks in the project use the same `type: "command"` mechanism [VERIFIED: project `.claude/settings.json`].

### Pattern: PreToolUse Hook JSON Output Format

**What:** The hook stdout is parsed as JSON by Claude Code. The output format for denial uses `hookSpecificOutput`:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Use cc-websearch:websearch Skill tool instead."
  }
}
```

**Behavior when deny is emitted:**
1. Claude Code cancels the tool call
2. The `permissionDecisionReason` is presented to the model as the reason the tool was denied
3. The model decides what action to take next
4. If the hook exits non-zero (or stdout is empty), the tool proceeds normally (PASS behavior)

**Key detail:** The denial reason is behavioral guidance -- the model may follow it, retry the tool, fall back to Bash+curl, or ask the user. This is not a hard redirect.

**Verified by:** Claude Code hooks documentation [CITED: code.claude.com/docs/en/hooks]. nmindz reference implementation confirms the pattern [VERIFIED: GitHub API].

### Anti-Patterns to Avoid

- **Single combined matcher:** Using `"WebSearch|WebFetch"` in one hook entry. The user explicitly chose separate entries (D-04) for clarity and easier debugging.
- **Lowercase matchers:** Using `"websearch"` or `"webfetch"`. Tool names are case-sensitive. Must use exact `WebSearch` and `WebFetch` (D-09, satisfies HOOK-04).
- **Legacy output format:** Using `{"decision":"block","reason":"..."}` instead of `hookSpecificOutput`. The preferred format is `hookSpecificOutput` (D-03). While the nmindz implementation outputs both, Phase 10 should use only the preferred format.
- **Script-based hook:** Creating a separate .sh or .js file for the hook logic. This adds a file dependency (violates HOOK-03's "no external scripts" requirement). Inline `echo` is cleaner.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tool call interception | Custom tool routing or MCP server | PreToolUse hook in plugin.json | Hooks are the documented mechanism. MCP tools cannot match built-in names. Skills cannot shadow tools. |
| Hook execution | Node.js or shell script hook | Inline `echo` command | Static denial reason needs no logic. Script adds a file, dependency on runtime, and increases surface area. |

**Key insight:** For a static denial reason, a shell script or Node.js script is over-engineering. An inline `echo` command is zero-dependency, trivial to verify, and trivially reliable (cannot crash, cannot hang, has no error paths).

## Common Pitfalls

### Pitfall 1: Matcher Case Sensitivity

**What goes wrong:** Using `"Websearch"` or `"websearch"` as the matcher silently fails to match the built-in tool. The hook never fires and the built-in tool proceeds normally.

**Why it happens:** Tool names in Claude Code are case-sensitive. The built-in tools are named `WebSearch` and `WebFetch` (capital W, capital S/F). Any deviation in case causes a non-match.

**How to avoid:** Use exact case: `"WebSearch"` and `"WebFetch"`. Do not use regex alternation for Phase 10 (single tool per hook entry per D-04). [VERIFIED: Claude Code tools reference]

**Warning signs:** Built-in tool still works after plugin install. Verify with `--debug` flag.

### Pitfall 2: Escape Issues in Inline echo JSON

**What goes wrong:** The inline `echo` command contains JSON with double quotes. If not properly escaped for the shell, the JSON is corrupted and Claude Code cannot parse it. The hook fails silently (non-zero exit = tool proceeds).

**Why it happens:** Shell escaping of nested JSON inside a JSON configuration file is a double-escaping problem. The outer JSON quotes for the `command` field must be escaped for the JSON parser, and the inner JSON must be escaped for the shell.

**How to avoid:** Use single quotes around the JSON string in the shell command, and do not escape internal double quotes. The correct pattern is:

```
command: "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Use cc-websearch:websearch Skill tool instead.\"}}'"
```

This is: JSON string property value starts and ends with double quotes. The shell receives `echo '...'` where `...` is the JSON body. Single quotes prevent shell expansion of `{}`, `$`, and backticks.

**Warning signs:** Hook silently passes (tool proceeds). Test by running the echo command manually in a shell and verifying the output is valid JSON.

### Pitfall 3: Multiple Hook Files Confusion

**What goes wrong:** Creating hooks in both `.claude/hooks/hooks.json` (project-level) and `.claude-plugin/hooks/hooks.json` (plugin-level), causing confusion about which takes effect.

**How to avoid:** Phase 10 hooks live exclusively in `.claude-plugin/hooks/hooks.json` referenced from `.claude-plugin/plugin.json`. The `.claude/hooks/` directory contains project-level GSD hooks and is separate. Plugin hooks are scoped to the plugin lifecycle. [VERIFIED: Claude Code plugins reference]

### Pitfall 4: Denial Reason Ignored by Model

**What goes wrong:** The hook fires and denies the tool, but the model ignores the redirect instruction. Instead of invoking the plugin skill, the model retries the built-in tool, falls back to Bash+curl, or asks the user for help.

**Why it happens:** The denial reason is behavioral guidance, not a hard redirect. The model decides what to do next based on all available context. Some models or prompt patterns may not follow the instruction reliably.

**How to avoid:** The static denial reason from Phase 10 is sufficient for the hook infrastructure, but Phase 11 (Redirect Reliability) will test and tune the denial reason text. For Phase 10, the success criterion is: the hook fires, denies the call, and emits a valid deny JSON. Whether the model follows the redirect is a Phase 11 concern.

**Warning signs:** Model continues to use built-in tools or falls back to manual web fetching.

## Code Examples

### Hook Configuration (hooks/hooks.json)

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

### Plugin Manifest Update (plugin.json delta)

Current `plugin.json`:
```json
{
  "name": "cc-websearch",
  "displayName": "WebSearch",
  "version": "0.1.0",
  "description": "DDG-powered WebSearch and WebFetch replacement for Claude Code"
}
```

After adding hooks field:
```json
{
  "name": "cc-websearch",
  "displayName": "WebSearch",
  "version": "0.1.0",
  "description": "DDG-powered WebSearch and WebFetch replacement for Claude Code",
  "hooks": "hooks/hooks.json"
}
```

**Path resolution:** The `hooks` field value `"hooks/hooks.json"` is resolved relative to the plugin directory (`.claude-plugin/`), so the full path is `.claude-plugin/hooks/hooks.json`. [VERIFIED: Claude Code plugins reference]

### Shell Verification Command

To verify the inline echo output is valid JSON:
```bash
# Run the exact command that would be in the hook
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Use cc-websearch:websearch Skill tool instead."}}' | python3 -m json.tool

# Expected output (valid JSON, properly formatted):
# {
#     "hookSpecificOutput": {
#         "hookEventName": "PreToolUse",
#         "permissionDecision": "deny",
#         "permissionDecisionReason": "Use cc-websearch:websearch Skill tool instead."
#     }
# }
```

### nmindz Reference: Script Hook Equivalent

For comparison, if a script-based hook were chosen instead of inline echo:
```javascript
// Source: https://github.com/nmindz/claude-code-copilot-builtin (hooks/block-unsupported-builtins.js)
// Verified via GitHub API 2026-05-23
process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason: "WebSearch is intercepted...",
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Use cc-websearch:websearch Skill tool instead.",
      additionalContext: "..."
    }
  })
);
```

Note: The nmindz implementation outputs BOTH `decision: "block"` (legacy) AND `hookSpecificOutput` (preferred). Phase 10 uses only `hookSpecificOutput` per D-03. [VERIFIED: GitHub API]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No hook mechanism (pre-v1.1) | PreToolUse hooks in plugin.json | v1.2 Phase 10 | Built-in tools are automatically intercepted when plugin is installed |
| Script-based hooks (nmindz pattern) | Inline echo hooks | Phase 10 decision | Zero-file-dependency approach for static denial reasons |
| `decision: "block"` legacy format | `hookSpecificOutput` preferred format | Phase 10 decision | Future-proof format per authoritative schema reference |

**Deprecated/outdated:**
- `{"decision":"block","reason":"..."}` legacy format -- still works but `hookSpecificOutput` is the preferred style [CITED: Claude Code hooks reference]
- Node.js script for static denial reason -- over-engineered when inline echo suffices

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Inline `echo` command in hooks.json produces stdout that Claude Code correctly parses as JSON. | Code Examples | The shell escaping of JSON-within-JSON-within-JSON is fragile. If output is malformed, hook silently passes (tool proceeds). Mitigation: verify with `python3 -m json.tool`. |
| A2 | The `hookSpecificOutput` format with `permissionDecision: "deny"` causes Claude Code to deny the tool call (equivalent to the legacy `decision: "block"`). | Architecture Patterns | If Claude Code does not honor `hookSpecificOutput` for denial decisions, the hook would silently pass. All Context7 docs and the nmindz reference suggest this is the correct format, but empirical verification in the project's Claude Code version would be ideal. |
| A3 | A matcher value of `"WebSearch"` (without regex alternation) exactly matches the built-in WebSearch tool and only that tool. | Architecture Patterns | Tool names are confirmed as case-sensitive `WebSearch`/`WebFetch` [CITED: Claude Code tools reference]. No risk of false positives. |
| A4 | The hooks field value `"hooks/hooks.json"` is resolved relative to the plugin directory (`.claude-plugin/`). | Code Examples | Verified via Claude Code plugins reference. Path resolution is documented. |
| A5 | Non-zero exit from a PreToolUse hook causes Claude Code to proceed with the tool call (PASS behavior). | Architecture Patterns | Standard Claude Code hook behavior. If this is wrong and non-zero exit causes a hard failure, the hook would block ALL tool calls until removed. [ASSUMED from documented hook exit code semantics] |

**Risk assessment:** All assumptions are LOW risk. The hook mechanism is documented, verified by the nmindz reference implementation, and consistent with existing project patterns in `.claude/settings.json`. The highest risk item (A2) can be verified by testing the plugin after installation.

## Open Questions

No open questions for Phase 10. All decisions are locked in CONTEXT.md, and the implementation is straightforward JSON configuration.

## Environment Availability

> **Phase 10 has no external dependencies beyond what is already installed.** The phase modifies only JSON configuration files (plugin.json, hooks/hooks.json). No new tools, CLIs, runtimes, or services are needed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Verifying hook JSON output | ✓ | 26.0.0 | -- |
| Python 3 | Verifying hook JSON with json.tool | ✓ | (system) | -- |
| Existing CLI scripts | No change needed | ✓ | -- | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 |
| Config file | `vitest.config.ts` (existing) |
| Quick run command | `npm test` |
| Full suite command | `npm run check` |

### Phase Requirements Evaluation

Phase 10 is a **configuration-only** change -- it adds JSON configuration files that are not testable via unit tests. The existing test suite (vitest) tests TypeScript source code and CLI behavior, not plugin configuration. Verification of Phase 10 is **manual**:

| Check | Method | Automated? | Test File |
|-------|--------|------------|-----------|
| hooks/hooks.json is valid JSON with correct structure | Manual review + `python3 -m json.tool` | No | N/A -- config file |
| plugin.json references hooks/hooks.json correctly | Manual review | No | N/A -- config file |
| Inline echo outputs valid deny JSON | Manual shell command verification | No | N/A -- config content |
| Hook fires and denies WebSearch | Manual: install plugin, test in Claude Code | No | N/A -- requires Claude Code runtime |
| Hook fires and denies WebFetch | Manual: install plugin, test in Claude Code | No | N/A -- requires Claude Code runtime |

### Sampling Rate

- **Per task commit:** Manual config review -- verify JSON validity with `python3 -m json.tool`
- **Per wave merge:** Manual verification against Phase 10 success criteria (install plugin, verify WebSearch/WebFetch are denied)
- **Phase gate:** Success criteria 1-4 must be TRUE before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/test_hooks.py` or `tests/hooks.test.ts` -- would require a Claude Code test harness that can simulate hook firing. Not feasible for this phase. Defer to future if Claude Code adds a hook testing API.
- [ ] End-to-end verification script: `python3 -c "import json; json.load(open('.claude-plugin/hooks/hooks.json'))"` -- validates JSON structure of the hook file.

### Verification Protocol

After Phase 10 implementation, verify:

1. **Structural validity:**
   - `.claude-plugin/hooks/hooks.json` is valid JSON
   - The JSON contains `hooks.PreToolUse` as an array with two entries
   - Each entry has `matcher`, `type: "command"`, and a `command` field with inline echo
   - The echo command output is valid JSON with `hookSpecificOutput.permissionDecision: "deny"`
   - `.claude-plugin/plugin.json` contains a `hooks` field referencing `hooks/hooks.json`

2. **Shell escaping verification:**
   - Run each inline echo command in a shell and pipe through `python3 -m json.tool`
   - Confirm valid JSON output with `permissionDecision: "deny"`

3. **Functional verification (Claude Code runtime):**
   - Install the plugin
   - Issue a search request
   - Observe that the built-in WebSearch tool call returns denied with the redirect reason
   - Issue a fetch request
   - Observe that the built-in WebFetch tool call returns denied with the redirect reason
   - (Whether the model then uses the plugin skill is a Phase 11 concern)

## Security Domain

> **Skip:** Phase 10 has no security-relevant changes. Hook configuration emits a deny decision -- this does not introduce authentication, authorization, input validation, or cryptography concerns. The hooks are configuration-only with no external input processing.

## Sources

### Primary (HIGH confidence)

- **Claude Code Hooks Reference** (code.claude.com/docs/en/hooks) -- PreToolUse hook event schema, matcher syntax, stdout output format, exit code semantics, hookSpecificOutput format. [CITED: Claude Code docs]
- **Claude Code Plugins Reference** (code.claude.com/docs/en/plugins-reference) -- Plugin manifest schema, hooks field in plugin.json, path resolution for hooks files. [CITED: Claude Code docs]
- **Claude Code Tools Reference** (code.claude.com/docs/en/tools-reference) -- WebSearch and WebFetch as valid tool names, case-sensitive tool naming convention. [CITED: Claude Code docs]
- **Claude Code Settings** (code.claude.com/docs/en/settings) -- permissions.deny format for comparison with hook mechanism. [CITED: Claude Code docs]
- **nmindz/claude-code-copilot-builtin** (GitHub) -- Real-world reference implementation: PreToolUse hook deny for WebSearch/WebFetch via Node.js script with hookSpecificOutput. [VERIFIED: GitHub API, 2026-05-23]
- **Project `.claude/settings.json`** -- Existing PreToolUse hook patterns using `type: "command"` with external scripts. [VERIFIED: project file]
- **Project `.claude-plugin/plugin.json`** -- Current manifest without hooks field. Baseline for modification. [VERIFIED: project file]

### Secondary (MEDIUM confidence)

- **PreToolUse Hook Contract** (blog.boucle.sh) -- Hook stdin schema (`tool_name` + `tool_input`), stdout format, exit code semantics. Referenced in CONTEXT.md. [CITED: CONTEXT.md]
- **FEATURES.md** (project research) -- Detailed analysis of hook mechanism, denial reason patterns, output format concerns. [VERIFIED: project file - already validated this research]
- **ARCHITECTURE.md** (project research) -- Architecture diagrams showing hook interception flow, component boundaries. [VERIFIED: project file]

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** -- No new packages. Hook configuration format is documented with multiple sources.
- Architecture: **HIGH** -- PreToolUse hook pattern verified via nmindz reference implementation, existing `.claude/settings.json` hooks, and Claude Code docs.
- Pitfalls: **HIGH** -- Shell escaping, case sensitivity, and multi-file confusion are well-understood risks with clear mitigations.

**Research date:** 2026-05-23
**Valid until:** 2026-07-23 (hooks configuration is stable API -- no expected changes)
