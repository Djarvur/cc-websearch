# Feature Research: Replacing Built-in WebSearch/WebFetch

**Domain:** Claude Code plugin -- tool replacement via skills + hooks
**Researched:** 2026-05-22
**Confidence:** MEDIUM

## Key Constraint: No Direct Tool Replacement Mechanism Exists

Claude Code does not provide a mechanism for plugin skills to directly replace built-in tools. Skills and built-in tools are separate systems. Skills are instruction sets invoked via the `Skill` tool; built-in tools (`WebSearch`, `WebFetch`) are native tool implementations invoked by name. There is no `tool_name` field in SKILL.md frontmatter, no tool shadowing by name, and no plugin manifest field that maps a skill to a built-in tool.

The viable approach is a **two-part strategy**: (1) use a PreToolUse hook to deny/redirect built-in WebSearch/WebFetch calls, and (2) rely on skill descriptions to make Claude invoke the plugin's Bash-based scripts instead. This is a behavioral redirect, not a structural replacement.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist in a "built-in tool replacement." Missing these = the plugin fails its core promise.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Built-in WebSearch blocked | Core premise: plugin replaces built-in. If built-in still fires, replacement is partial at best. | MEDIUM | Requires PreToolUse hook in plugin `hooks.json` matching `WebSearch`, returning deny decision. Plugin hooks.json supports this natively. |
| Built-in WebFetch blocked | Same as above for WebFetch. | MEDIUM | Same PreToolUse hook approach, matcher `WebFetch`. |
| Skill invocation still works after deny | When built-in is denied, Claude must fall back to using the plugin skill. This is the redirect mechanism. | HIGH | This is the hardest part. After a deny, Claude receives a denial reason. The reason must instruct Claude to use the plugin's Skill tool instead. This is behavioral, not guaranteed -- it depends on the model following instructions from the denial reason. MEDIUM confidence this works reliably. |
| Same input schema as built-in | Users should not need to change how they invoke WebSearch/WebFetch. The input JSON must match: `query`, `allowed_domains`, `blocked_domains` for WebSearch; `url`, `prompt` for WebFetch. | LOW | Already implemented. Plugin's Zod schemas match built-in tool schemas exactly. |
| Same output format as built-in | Output must be identical so downstream Claude processing is unaffected. | MEDIUM | WebSearch output currently uses `<search_results>` XML which matches. However, the built-in WebFetch returns a structured JSON object `{bytes, code, codeText, result, durationMs, url}` per Agent SDK docs, NOT raw markdown. The plugin currently outputs raw markdown to stdout. This may be a format mismatch that needs investigation. See Anti-Feature: "Raw markdown for WebFetch output." |
| Plugin works for all providers | Built-in WebSearch/WebFetch are Anthropic-provider-only features. Plugin must work regardless of provider (OpenAI, self-hosted, etc.). | LOW | Already true. Plugin uses Bash + node, which is provider-independent. |

### Differentiators (Competitive Advantage)

Features that make the replacement better than the built-in tools, not just equivalent.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Works with non-Anthropic providers | Primary use case: people using Claude Code with third-party API providers lose WebSearch/WebFetch. Plugin restores it. | LOW | Already works. Plugin's Bash+node invocation is provider-agnostic. |
| No API key required | DDG Lite requires zero configuration. Built-in tools route through Anthropic's backend (which costs API credits). | LOW | Already implemented. |
| Domain filtering actually filters | Plugin supports `allowed_domains` and `blocked_domains` on all code paths. Some built-in tool behaviors around domain filtering may be less transparent. | LOW | Already implemented. |
| Configurable retry behavior | Built-in tools have opaque retry logic. Plugin exposes retry configuration via config file and env vars. | LOW | Already implemented. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| MCP server-based tool replacement | "Just make an MCP server that exposes tools named WebSearch and WebFetch" | MCP tools coexist alongside built-in tools; they do not replace them. Two WebSearch tools would confuse the model. Also out of scope per PROJECT.md. | Use PreToolUse hook + skill redirect. |
| Raw markdown for WebFetch output | "Our WebFetch already outputs markdown, that matches the built-in" | The built-in WebFetch tool returns structured JSON with `{bytes, code, codeText, result, durationMs, url}` according to Agent SDK docs. However, what Claude actually shows the user may differ from the SDK schema -- the tool output that appears in the conversation may be the `result` field only (the markdown content). This needs verification against actual Claude Code behavior. | Test against real Claude Code to see what WebFetch output looks like in conversation. The current markdown output may already be correct for the skill-based path since skills output via stdout. |
| Suppressing built-in via `--tools` flag | "Users can pass `--tools` to exclude WebSearch" | Requires every user to modify their Claude Code CLI invocation. Not practical for a plugin that should work out of the box. The `--tools` flag is a CLI-level restriction, not a plugin-level one. | Use plugin hooks.json for automatic interception. |
| Skill name matching tool name | "Name the skill `WebSearch` and it will shadow the built-in" | Plugin skills are namespaced as `plugin-name:skill-name`. They never collide with built-in tool names. There is no name-based shadowing mechanism. | Use PreToolUse hook deny + redirect. |

## Feature Dependencies

```
[PreToolUse hook deny for WebSearch]
    └──requires──> [Plugin hooks.json with WebSearch matcher]
    └──requires──> [Denial reason instructing Claude to use plugin skill]

[PreToolUse hook deny for WebFetch]
    └──requires──> [Plugin hooks.json with WebFetch matcher]
    └──requires──> [Denial reason instructing Claude to use plugin skill]

[Plugin skill redirect works reliably]
    └──depends on──> [Claude model follows denial reason instructions]
    └──depends on──> [Skill description is compelling enough to be invoked]

[Output format match]
    └──requires──> [Verify built-in tool actual output format]
    └──requires──> [Adjust plugin output if format mismatch found]

[Provider-agnostic operation]
    └──enhances──> [Core value proposition]
    └──requires──> [Bash tool available (always true in Claude Code)]
```

### Dependency Notes

- **PreToolUse hook deny requires denial reason:** The `permissionDecisionReason` field is how the hook tells Claude what to do instead. The reason must be carefully crafted to reliably trigger skill invocation. Example: `"Use the cc-websearch:websearch Skill tool instead with the same query."` This is behavioral guidance, not a hard redirect -- Claude must choose to follow it.
- **Skill redirect depends on model behavior:** After a deny, Claude receives the denial reason and decides what to do next. There is no guarantee Claude will invoke the plugin skill. The denial reason must be very specific. This is the highest-risk dependency.
- **Output format requires verification:** The Agent SDK docs show WebFetch returns structured JSON, but the actual conversation output may differ. If the built-in tool's conversation-visible output is just the markdown content, the plugin's current markdown output is correct. If it's the full JSON object, the plugin needs to change. This must be tested.

## MVP Definition

### Launch With (v1.2)

Minimum features for "plugin replaces built-in WebSearch/WebFetch."

- [ ] **Plugin hooks.json** -- PreToolUse hooks for `WebSearch` and `WebFetch` that deny with redirect reason. Essential because without it, built-in tools still fire.
- [ ] **Denial reason engineering** -- Carefully crafted `permissionDecisionReason` that reliably causes Claude to invoke the plugin skill. This is the core mechanism and must be tested extensively.
- [ ] **Output format verification** -- Confirm that the plugin's XML output (WebSearch) and markdown output (WebFetch) match what Claude expects after the built-in is denied and the skill takes over. May need adjustment.
- [ ] **Error handling parity** -- When plugin scripts fail, the error output must be as useful as built-in tool errors. Currently, errors go to stderr with exit code 1. This needs to match Claude's error reporting expectations for skills.

### Add After Validation (v1.x)

- [ ] **Telemetry/logging for redirect success rate** -- Log when PreToolUse deny fires and when skill invocation follows, to measure redirect reliability.
- [ ] **Fallback to built-in** -- If the plugin determines DDG is down or rate-limited, optionally allow the built-in tool to proceed (skip the deny).

### Future Consideration (v2+)

- [ ] **Official tool replacement API** -- If Claude Code adds a plugin mechanism for direct tool replacement, migrate from the hook+redirect approach to the official mechanism.
- [ ] **Multiple search providers** -- Add additional fallback providers beyond DDG for higher reliability.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| PreToolUse hook for WebSearch deny | HIGH | LOW | P1 |
| PreToolUse hook for WebFetch deny | HIGH | LOW | P1 |
| Denial reason that reliably redirects | HIGH | MEDIUM | P1 |
| Output format verification + fix | HIGH | MEDIUM | P1 |
| Error handling parity | MEDIUM | LOW | P2 |
| Redirect success telemetry | MEDIUM | MEDIUM | P3 |
| Fallback to built-in | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- the replacement does not work without these
- P2: Should have -- improves robustness
- P3: Nice to have -- future consideration

## Technical Implementation Notes

### Plugin hooks.json Structure

The plugin should include a `hooks/hooks.json` file referenced from `plugin.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "WebSearch",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Use the cc-websearch:websearch Skill tool instead. Pass the same query as JSON on stdin.\"}}'"
          }
        ]
      },
      {
        "matcher": "WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"Use the cc-websearch:webfetch Skill tool instead. Pass the same url and prompt as JSON on stdin.\"}}'"
          }
        ]
      }
    ]
  }
}
```

This uses `${CLAUDE_PLUGIN_ROOT}` paths if a script-based approach is needed, or inline `echo` for the simple deny-with-reason case. The `matcher` field supports exact tool name matching, and `WebSearch`/`WebFetch` are documented as valid matcher targets.

### Skill Description Engineering

The SKILL.md descriptions must be strong enough that when Claude sees the denial reason, it immediately connects to the plugin skill. Current descriptions focus on "when user needs web search" which is correct for standalone use. For replacement mode, the description should also mention "Use when the built-in WebSearch tool is unavailable" to reinforce the redirect.

### Output Format Gap Analysis

**WebSearch:**
- Built-in returns: Structured with `query`, `results[]`, `durationSeconds`
- Plugin returns: `<search_results>` XML with `<title>`, `<url>`, `<snippet>`
- **Gap:** The XML format appears to match what Claude shows in conversation (the Agent SDK schema is the API-level representation, not necessarily what appears in conversation). The XML format was chosen specifically to match. LOW risk of mismatch.

**WebFetch:**
- Built-in returns: Structured with `bytes`, `code`, `codeText`, `result`, `durationMs`, `url`
- Plugin returns: Raw markdown content via stdout
- **Gap:** Medium risk. The built-in tool's `result` field contains the processed content (markdown), which is what Claude sees in conversation. The other fields are metadata. When invoked via a skill script, the stdout output IS the content Claude sees, so raw markdown may be correct. But this needs testing against actual behavior to confirm.

## Competitor Feature Analysis

| Feature | Built-in WebSearch/WebFetch | cc-websearch Plugin | Approach |
|---------|-----------------------------|---------------------|----------|
| Search provider | Anthropic backend | DuckDuckGo Lite | DDG is free, no API key, stable |
| Provider requirement | Anthropic API only | Any provider | Plugin works with all providers |
| Output format | XML (search) / JSON+markdown (fetch) | XML (search) / markdown (fetch) | Near-identical, needs verification |
| Domain filtering | Supported | Supported | Same interface |
| Error behavior | Anthropic handles internally | Exits with code 1, stderr message | May need alignment |
| Tool replacement | N/A (it IS the tool) | PreToolUse deny + skill redirect | Behavioral, not structural |

## Sources

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- PreToolUse hook matcher syntax, deny decision with reason, JSON output format. HIGH confidence.
- [Claude Code Agent SDK Hooks](https://code.claude.com/docs/en/agent-sdk/hooks) -- Hook callback types, PreToolUse decision control (allow/deny/ask/defer), updatedInput for input modification. HIGH confidence.
- [Claude Code Plugin Reference](https://code.claude.com/docs/en/plugins-reference) -- Plugin manifest schema, hooks.json location within plugin, `${CLAUDE_PLUGIN_ROOT}` variable. HIGH confidence.
- [Claude Code Skills Reference](https://code.claude.com/docs/en/skills) -- Skill frontmatter fields (name, description, disable-model-invocation, allowed-tools), skill name namespacing for plugins (`plugin-name:skill-name`), skillOverrides. HIGH confidence.
- [Claude Code Tools Reference](https://code.claude.com/docs/en/tools-reference) -- Tool names in permission rules, WebSearch/WebFetch as valid matcher targets, `--tools` flag for restricting built-in tools. HIGH confidence.
- [Claude Code Agent SDK TypeScript Types](https://code.claude.com/docs/en/agent-sdk/typescript) -- WebSearchOutput type, WebFetchOutput type, WebFetchInput type. HIGH confidence.
- [Claude Code Changelog](https://code.claude.com/docs/en/changelog) -- "Deferred tools (e.g., WebSearch, WebFetch) are now correctly available to skills with `context: fork`" -- confirms WebSearch/WebFetch are deferred tools. HIGH confidence.
- [Claude Code Settings](https://code.claude.com/docs/en/settings) -- `permissions.deny` array format for disabling tools. HIGH confidence.

---
*Feature research for: Claude Code plugin tool replacement (cc-websearch v1.2)*
*Researched: 2026-05-22*
