# Technology Stack: v1.2 Built-in Tool Replacement

**Project:** cc-websearch
**Researched:** 2026-05-22
**Updated:** 2026-08-29 -- reconciled with the shipped implementation (see "As-Built" notes)
**Focus:** Stack additions/changes for replacing Claude Code built-in WebSearch/WebFetch

## Recommended Stack Changes

### No New Runtime Dependencies Required

The existing stack (TypeScript, Node.js, cheerio, jsdom, Readability, Turndown) is complete for the v1.2 milestone. The tool replacement mechanism is purely a Claude Code configuration concern, not a code dependency.

**As-built:** the runtime floor is now `^22.22.2 || ^24.15.0 || >=26.0.0` (`engines` in `package.json`), raised by jsdom 30; CI runs on Node 24. `commander` and `duck-duck-scrape` are still listed as dependencies but nothing imports them -- DDG Lite is scraped with the global `fetch` plus `cheerio`, and both CLI entry points read JSON from stdin rather than parsing flags. Both should be dropped.

### What Changes: Plugin Configuration

| Component | Version | Purpose | Why |
|-----------|---------|---------|-----|
| `hooks/hooks.json` (new) | N/A | Plugin-level PreToolUse hook to intercept built-in WebSearch/WebFetch | Claude Code loads the standard `hooks/hooks.json` automatically. A PreToolUse hook matching the built-in tool can deny the call and instruct Claude to use the plugin skill instead. |
| Inline `echo` command | N/A | Executed by PreToolUse hook, returns deny decision with redirect instruction | The hook writes a fixed JSON object with `permissionDecision: "deny"` and a `permissionDecisionReason` telling Claude to use the plugin skill. |

**As-built:** the planned separate hook script was not needed. `hooks/hooks.json` declares two matchers -- `WebSearch` and `WebFetch` -- each running an inline `echo` of the deny JSON. No shell script, no `jq`, and no `hooks` field in `plugin.json`: the standard path is discovered automatically, and pointing the manifest at it as well produces a duplicate-hooks load error.

### Configuration Mechanisms (No New Dependencies)

| Mechanism | Scope | How It Works | Why This Approach |
|-----------|-------|--------------|-------------------|
| `permissions.deny` in settings.json | User/Project/Managed | Bare tool names (e.g., `"WebSearch"`, `"WebFetch"`) remove the tool from the model's context entirely | Most reliable: the model never sees WebSearch/WebFetch as available tools, so it must use plugin skills. But requires user to configure settings.json -- not automatable from a plugin. |
| `--disallowedTools` CLI flag | Session | `"WebSearch" "WebFetch"` as bare names removes from model context | Same effect as permissions.deny but per-invocation. Not persistent. |
| Plugin `hooks/hooks.json` with PreToolUse | Plugin (automatic) | Matchers `WebSearch` and `WebFetch` each run an inline `echo` that denies the call with a redirect reason | Plugin-controlled, no user configuration needed. The built-in tool still appears in the model's context, but the hook blocks every invocation and tells Claude to use the skill instead. |
| `--tools` CLI flag | Session | Whitelist approach: only list tools you want, omit WebSearch/WebFetch | Draconian: removes ALL unlisted built-in tools, not viable for general use. |

## Recommended Approach: Plugin PreToolUse Hook

### Why This Approach

1. **Plugin-controlled:** Works automatically when the plugin is installed. No user configuration of settings.json required.
2. **Declarative:** The hook is defined in the plugin's `hooks/hooks.json`, which Claude Code discovers on its own.
3. **Graceful redirect:** The deny reason tells Claude to use the plugin skill instead, so Claude learns the correct behavior.
4. **Idempotent:** If the user also configures `permissions.deny`, the hook simply never fires (the tool is already removed from context). No conflict.

### How It Works

When Claude attempts to call the built-in `WebSearch` or `WebFetch` tool:

1. Claude emits a tool_use for `WebSearch` or `WebFetch`
2. The PreToolUse hook fires (matcher: `WebSearch` or `WebFetch`)
3. The hook ignores its stdin and writes a fixed deny decision:
   ```json
   {
     "hookSpecificOutput": {
       "hookEventName": "PreToolUse",
       "permissionDecision": "deny",
       "permissionDecisionReason": "WebSearch tool is unavailable. Use cc-websearch:websearch Skill instead."
     }
   }
   ```
5. Claude receives the deny reason and uses the plugin skill instead

### Key Trade-off: permissions.deny vs PreToolUse Hook

| Aspect | permissions.deny (settings.json) | PreToolUse Hook (plugin) |
|--------|----------------------------------|--------------------------|
| Who configures | User manually | Plugin automatic |
| Tool in model context | No (completely removed) | Yes (model sees it but hook blocks) |
| Token cost | Lower (no tool definition in prompt) | Slightly higher (tool def present) |
| Reliability | Highest (model cannot attempt the tool) | High (hook blocks every attempt) |
| User effort | Must edit settings.json | Zero -- plugin handles it |
| On first attempt | N/A | One wasted tool call, then Claude learns |
| Works for non-Anthropic providers | Yes | Yes |

**Recommendation:** Implement the PreToolUse hook as the primary mechanism. Document `permissions.deny` as an optional optimization for users who want to reduce token usage.

### Alternative Considered: PostToolUse Output Replacement

PostToolUse hooks with `updatedToolOutput` can replace a tool's output after execution. This was considered but rejected because:
- The built-in tool still executes (makes actual network requests to Anthropic servers)
- On non-Anthropic providers (OpenAI, self-hosted), the built-in tool may fail entirely before the hook fires
- Wastes API calls and latency on the built-in tool before replacing the output

## Implementation Architecture

### New Files (as built)

```
cc-websearch/
  hooks/
    hooks.json                    # Plugin hook configuration -- auto-discovered
```

`.claude-plugin/plugin.json` was left unchanged: no `hooks` field is needed or wanted.

### hooks/hooks.json

Two separate matchers rather than the alternation `"WebSearch|WebFetch"` originally sketched, because each tool needs its own skill name in the deny reason:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "WebSearch",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"WebSearch tool is unavailable. Use cc-websearch:websearch Skill instead.\"}}'"
          }
        ]
      }
    ]
  }
}
```

The `WebFetch` matcher is identical apart from the tool and skill names. Because the command is a fixed `echo`, the hook never reads its stdin -- the query or URL is not echoed back, and the reason names the skill instead of a ready-made shell command.

### .claude-plugin/plugin.json (unchanged)

```json
{
  "name": "cc-websearch",
  "displayName": "WebSearch",
  "version": "1.2.4",
  "description": "DDG-powered WebSearch and WebFetch replacement for Claude Code"
}
```

The `version` here is duplicated from `package.json` and the two must be bumped together.

## Stack NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| MCP server implementation | Project constraint: skills call CLI scripts directly. MCP tools use different routing (`mcp__server__tool`) and would not replace built-in tools named `WebSearch`/`WebFetch`. | PreToolUse hook + existing skill scripts |
| Any new npm dependency | The hook emits a fixed JSON string. It does not parse its input, so it needs neither Node.js nor `jq`. | A single inline `echo` in `hooks/hooks.json` |
| `permissions.deny` auto-configuration | A plugin cannot programmatically modify the user's settings.json. Claude Code has no plugin API for this. | PreToolUse hook (automatic) + documentation for manual `permissions.deny` |
| `hooks` field in `plugin.json` | The standard `hooks/hooks.json` is loaded automatically. Declaring it in the manifest too resolves to the same file and fails with "Duplicate hooks file detected". | Rely on auto-discovery; leave the manifest alone |
| Skill `disallowedTools` frontmatter | This field exists for subagents, not for the main conversation agent. It restricts tools for agents spawned BY the skill, not the skill's own conversation. | PreToolUse hook at plugin level |

## Token Cost Analysis

The built-in WebSearch and WebFetch tool definitions consume tokens in the system prompt even when intercepted by a hook. Approximate impact:

| Scenario | Extra Tokens per Turn | Mitigation |
|----------|----------------------|------------|
| Plugin hook only (built-in tools in context) | ~200-400 tokens for tool definitions | Negligible; Claude Code caches system prompt |
| + `permissions.deny` (tools removed from context) | 0 | Document as optional optimization |

The token cost is minimal because Claude Code uses prompt caching -- the tool definitions are in the cached system prompt layer and only invalidate when deny rules change.

## Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| PreToolUse hooks match on WebSearch/WebFetch | HIGH | Context7: code.claude.com docs, hooks reference explicitly lists these tool names |
| PreToolUse deny with reason causes Claude to adapt | HIGH | Context7: Official docs show deny + reason pattern |
| Plugin hooks load from `hooks/hooks.json` without a manifest entry | HIGH | As-built: the standard path is auto-discovered; a manifest `hooks` field duplicates it and errors |
| Bare tool names in permissions.deny remove from context | HIGH | Context7: CLI reference and permissions docs confirm |
| Plugin cannot programmatically modify settings.json | HIGH | Context7: No API for this; strictPluginOnlyCustomization exists for locking surfaces |
| PostToolUse updatedToolOutput works for all tools | HIGH | Context7: Week 18 2026 changelog confirms this is now universal |
| Hook script receives JSON on stdin, outputs JSON on stdout | HIGH | Context7: Multiple hook examples demonstrate this pattern |
| Non-Anthropic providers still have built-in WebSearch/WebFetch | MEDIUM | Context7 shows they exist as built-in tools regardless of provider; skipWebFetchPreflight setting confirms they work across providers |

## Sources

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- PreToolUse hook events, matcher syntax, deny/allow decisions. HIGH confidence.
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- Hook configuration patterns, JSON input/output format. HIGH confidence.
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) -- Plugin manifest schema, hooks field, SessionStart hooks, plugin component reference. HIGH confidence.
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference) -- `--tools`, `--disallowedTools`, `--allowedTools` flags. HIGH confidence.
- [Claude Code Permissions](https://code.claude.com/docs/en/permissions) -- Settings precedence, deny rules (bare vs scoped), permission evaluation order. HIGH confidence.
- [Claude Code Settings](https://code.claude.com/docs/en/settings) -- settings.json structure, permissions.deny, strictPluginOnlyCustomization. HIGH confidence.
- [Claude Code Skills](https://code.claude.com/docs/en/skills) -- SKILL.md frontmatter fields, disable-model-invocation, allowed-tools. HIGH confidence.
- [Claude Code Prompt Caching](https://code.claude.com/docs/en/prompt-caching) -- How deny rules invalidate cache with bare tool names. HIGH confidence.
- [Claude Code Changelog](https://code.claude.com/docs/en/changelog) -- Deferred tools fix, PostToolUse updatedToolOutput for all tools (Week 18, April 2026). HIGH confidence.
- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents) -- disallowedTools frontmatter field (subagent-only, not main conversation). HIGH confidence.
