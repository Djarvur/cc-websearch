# Architecture Research: cc-websearch v1.2 -- Replace Built-in WebSearch/WebFetch

**Domain:** Claude Code plugin -- tool replacement architecture
**Researched:** 2026-05-22
**Confidence:** HIGH

## System Overview

### Current Architecture (v1.1)

```
User prompt
    |
    v
Claude Code (LLM)
    |
    +--> [WebSearch tool] -----> Anthropic backend (provider-locked)
    +--> [WebFetch tool] ------> Anthropic backend (provider-locked)
    +--> [Skill tool] ---------> cc-websearch:websearch / cc-websearch:webfetch
              |
              v
         SKILL.md instructions
              |
              v
         Bash tool
              |
              v
         node skills/<name>/scripts/<name>.cjs
              |
              v
         DDG Lite / HTTP fetch
```

**Problem:** Built-in `WebSearch` and `WebFetch` tools coexist alongside plugin skills. Claude Code invokes the built-in tools preferentially (especially for Anthropic provider). Skills are instruction-based workflows invoked through the `Skill` tool, NOT direct tool replacements. Plugin skills use namespaced names (`cc-websearch:websearch`) that cannot collide with or shadow built-in tool names.

### Proposed Architecture (v1.2)

```
User prompt
    |
    v
Claude Code (LLM)
    |
    +--> [WebSearch tool] --x--> PreToolUse hook DENIES
    |         |
    |         v
    |    "Use cc-websearch:websearch Skill instead"
    |         |
    +--> [WebFetch tool] --x--> PreToolUse hook DENIES
    |         |
    |         v
    |    "Use cc-websearch:webfetch Skill instead"
    |
    +--> [Skill tool] ----------> cc-websearch:websearch / cc-websearch:webfetch
              |
              v
         SKILL.md instructions
              |
              v
         Bash tool
              |
              v
         node ${CLAUDE_PLUGIN_ROOT}/skills/<name>/scripts/<name>.cjs
              |
              v
         DDG Lite / HTTP fetch
```

**Mechanism:** PreToolUse hooks in plugin.json intercept built-in tool calls and deny them with a reason that instructs Claude to invoke the plugin skill instead. The existing skill + CLI script pipeline remains unchanged.

### Rejected Alternative: MCP Server Approach

```
User prompt
    |
    v
Claude Code (LLM)
    |
    +--> [mcp__cc-websearch__WebSearch] --> MCP server process
    +--> [mcp__cc-websearch__WebFetch] ---> MCP server process
```

**Why rejected:**
- MCP tool names follow `mcp__<server>__<tool>` naming convention -- they CANNOT be named `WebSearch` or `WebFetch` directly
- `toolAliases` option maps built-in names to MCP names but is Agent SDK only, not available in settings.json or plugin.json
- Even with MCP tools available, built-in tools would still appear and cause confusion (two competing WebSearch options)
- Would require adding an MCP server process, significantly increasing complexity
- PROJECT.md explicitly states "MCP server implementation -- Out of Scope"

## Component Boundaries

### Current Components (Unchanged)

| Component | Responsibility | Modified in v1.2? |
|-----------|---------------|-------------------|
| `src/websearch.ts` | CLI entry point: reads stdin JSON, calls DDG search, outputs XML | NO |
| `src/webfetch.ts` | CLI entry point: reads stdin JSON, fetches URL, extracts markdown | NO |
| `src/lib/duckduckgo.ts` | DDG Lite HTML scraping via fetch + cheerio | NO |
| `src/lib/content.ts` | HTML-to-markdown via Readability + Turndown | NO |
| `src/lib/fetch.ts` | HTTP fetch with redirect handling | NO |
| `src/lib/input.ts` | Zod schema validation for stdin JSON | NO |
| `src/lib/output.ts` | XML formatting for search results | NO |
| `src/lib/filter.ts` | Domain filtering (allowed/blocked) | NO |
| `src/lib/config.ts` | Config file loading and env variable override | NO |
| `src/lib/retry.ts` | Exponential backoff with jitter | NO |
| `src/lib/logger.ts` | Configurable logging levels | NO |
| `skills/websearch/SKILL.md` | Skill definition with Bash invocation | YES -- minor description update |
| `skills/webfetch/SKILL.md` | Skill definition with Bash invocation | YES -- minor description update |
| `build.ts` | esbuild bundling to skills/*/scripts/*.cjs | NO |
| `.claude-plugin/plugin.json` | Plugin manifest | YES -- add hooks |
| `skills/*/scripts/*.cjs` | Bundled CLI scripts | NO (rebuilt from source) |

### New Components

| Component | Responsibility | Type |
|-----------|---------------|------|
| `hooks/deny-builtins.sh` (or inline in plugin.json) | PreToolUse hook that denies WebSearch/WebFetch with redirect reason | Shell script or inline echo |

### Modified Components

| Component | Change | Why |
|-----------|--------|-----|
| `.claude-plugin/plugin.json` | Add `hooks` key with PreToolUse matchers for `WebSearch` and `WebFetch` | Intercept and deny built-in tool calls |
| `skills/websearch/SKILL.md` | Update description to mention "Use when built-in WebSearch is unavailable" | Reinforce redirect behavior after deny |
| `skills/webfetch/SKILL.md` | Update description to mention "Use when built-in WebFetch is unavailable" | Reinforce redirect behavior after deny |

## Integration Points

### 1. Plugin hooks in plugin.json (PRIMARY)

**Integration point:** The `hooks` key in plugin.json supports inline PreToolUse hook definitions.

**Documented behavior (HIGH confidence, Context7 verified):**
- `matcher` field accepts tool names: `WebSearch`, `WebFetch`
- `PreToolUse` hooks run after Claude creates tool parameters, before execution
- Hook output with `permissionDecision: "deny"` blocks the tool call
- `permissionDecisionReason` is shown to Claude as guidance for what to do instead
- Plugin hooks fire automatically when plugin is enabled

**Example plugin.json with hooks:**
```json
{
  "name": "cc-websearch",
  "displayName": "WebSearch",
  "version": "0.2.0",
  "description": "DDG-powered WebSearch and WebFetch replacement for Claude Code",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "WebSearch",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"The built-in WebSearch tool is replaced by the cc-websearch plugin. Use the cc-websearch:websearch Skill instead with the same query.\"}}'"
          }
        ]
      },
      {
        "matcher": "WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"deny\",\"permissionDecisionReason\":\"The built-in WebFetch tool is replaced by the cc-websearch plugin. Use the cc-websearch:webfetch Skill instead with the same url.\"}}'"
          }
        ]
      }
    ]
  }
}
```

**Source:** Official Claude Code docs -- hooks reference, hooks guide, plugins reference. All verified via Context7. HIGH confidence.

### 2. PreToolUse deny decision flow

**Integration point:** When a PreToolUse hook returns `deny`, Claude Code:
1. Cancels the tool call
2. Presents the `permissionDecisionReason` to the model
3. The model decides what to do next (behavioral, not structural)

**Key risk:** The model must CHOOSE to invoke the plugin skill based on the denial reason. This is not a guaranteed redirect -- it depends on Claude following the instruction in the denial reason.

**Mitigation:**
- Craft denial reasons that explicitly name the skill: `cc-websearch:websearch`
- Update SKILL.md descriptions to reinforce availability when built-in is denied
- Test redirect reliability across different prompt patterns

### 3. Skill invocation pipeline (existing, unchanged)

**Integration point:** The existing skill invocation chain remains:
```
Claude invokes Skill tool with cc-websearch:websearch
    --> SKILL.md instructions parsed
    --> Bash tool invoked with node ${CLAUDE_PLUGIN_ROOT}/skills/websearch/scripts/websearch.cjs
    --> CLI script reads JSON stdin, writes XML/markdown stdout
```

This pipeline is stable and does not need modification for v1.2.

### 4. permissions.deny in settings.json (NOT USED)

**Why not used:**
- `permissions.deny` in settings.json also blocks built-in tools, but requires user-side configuration
- Plugin hooks in plugin.json are automatic -- no user action needed
- If plugin hooks prove unreliable, `permissions.deny` is a fallback requiring manual setup

**Format for reference:**
```json
{
  "permissions": {
    "deny": ["WebSearch", "WebFetch"]
  }
}
```

## Architectural Patterns

### Pattern 1: Hook-Based Tool Interception

**What:** PreToolUse hook denies built-in tool calls and provides redirect instructions.
**When:** When a plugin needs to replace built-in tool behavior.
**Mechanism:**
```
1. Claude generates tool call for WebSearch
2. PreToolUse hook fires (matcher: "WebSearch")
3. Hook script outputs JSON with permissionDecision: "deny"
4. Claude receives denial reason
5. Claude decides to invoke cc-websearch:websearch Skill instead
```
**Reliance:** Model follows denial reason instructions. Not guaranteed, but highly reliable with explicit skill naming.

### Pattern 2: Skill-as-Tool-Implementation

**What:** Skills provide the actual implementation logic while hooks handle interception.
**When:** When Claude Code has no native tool replacement mechanism.
**Separation of concerns:**
- Hooks: interception (deny built-in) + guidance (redirect reason)
- Skills: implementation (DDG search, content extraction)
- CLI scripts: execution (bundled, invoked via Bash)

### Pattern 3: Dual Output Format Compatibility

**What:** Plugin output format matches built-in tool output format.
**WebSearch:** `<search_results>` XML with `<title>`, `<url>`, `<snippet>` -- matches built-in format.
**WebFetch:** Raw markdown via stdout -- the built-in WebFetch's `result` field contains markdown content, and that is what appears in conversation. Plugin output matches.

## Data Flow

### v1.2 WebSearch Flow (after hook installed)

```
1. User: "search for X"
2. Claude decides to use WebSearch tool
3. PreToolUse hook fires (matcher: WebSearch)
4. Hook outputs: {permissionDecision: "deny", permissionDecisionReason: "Use cc-websearch:websearch Skill..."}
5. Tool call cancelled
6. Claude receives denial reason
7. Claude decides to invoke Skill tool: cc-websearch:websearch
8. SKILL.md instructions parsed
9. Claude generates Bash command: echo '{"query":"X"}' | node "${CLAUDE_PLUGIN_ROOT}/skills/websearch/scripts/websearch.cjs"
10. CLI script runs: reads stdin, validates with Zod, scrapes DDG Lite
11. Results formatted as <search_results> XML, written to stdout
12. Claude receives XML results, responds to user
```

### v1.2 WebFetch Flow (after hook installed)

```
1. User: "fetch https://example.com and summarize"
2. Claude decides to use WebFetch tool
3. PreToolUse hook fires (matcher: WebFetch)
4. Hook outputs: {permissionDecision: "deny", permissionDecisionReason: "Use cc-websearch:webfetch Skill..."}
5. Tool call cancelled
6. Claude receives denial reason
7. Claude decides to invoke Skill tool: cc-websearch:webfetch
8. SKILL.md instructions parsed
9. Claude generates Bash command: echo '{"url":"https://example.com","prompt":"summarize"}' | node "${CLAUDE_PLUGIN_ROOT}/skills/webfetch/scripts/webfetch.cjs"
10. CLI script runs: reads stdin, validates with Zod, fetches URL, extracts markdown
11. Markdown written to stdout
12. Claude receives markdown content, responds to user
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: MCP Server for Tool Replacement

**What:** Building an MCP server that exposes `WebSearch`/`WebFetch` tools.
**Why bad:**
- MCP tools use `mcp__<server>__<tool>` naming -- cannot match built-in names
- Built-in tools still appear alongside MCP tools, causing model confusion
- Adds process management complexity (server lifecycle, stdio transport)
- Explicitly out of scope per PROJECT.md
**Instead:** Use PreToolUse hooks to deny built-in tools + existing skills for implementation.

### Anti-Pattern 2: Skill Name Shadowing

**What:** Naming a skill "WebSearch" hoping it shadows the built-in.
**Why bad:** Plugin skills are namespaced as `plugin-name:skill-name`. They cannot collide with built-in tool names. No shadowing mechanism exists.
**Instead:** Use hooks to deny built-in, redirect to namespaced skill.

### Anti-Pattern 3: Requiring User Configuration

**What:** Instructing users to add `permissions.deny` to their settings.json.
**Why bad:** Plugin should work out of the box. Requiring manual configuration defeats the purpose of a plugin.
**Instead:** Use plugin.json hooks for automatic interception.

### Anti-Pattern 4: Over-Engineering the Denial Reason

**What:** Complex denial reasons with multi-step instructions or conditional logic.
**Why bad:** The denial reason is a string shown to the model. It should be simple, direct, and name the replacement skill explicitly. Over-complication reduces reliability.
**Instead:** Single sentence: "Use the cc-websearch:websearch Skill instead with the same query."

## Build Order

### Phase 1: Hook Implementation (Foundation)

**What:** Add PreToolUse hooks to plugin.json.
**Why first:** Everything else depends on the built-in tools being blocked. Without hooks, the replacement does not work.
**Files changed:** `.claude-plugin/plugin.json`
**Dependencies:** None (self-contained).

### Phase 2: Denial Reason Engineering (Critical)

**What:** Craft and test denial reason strings that reliably redirect to plugin skills.
**Why second:** The denial reason is the critical link between "deny built-in" and "use plugin skill." If it fails, the whole replacement fails.
**Approach:** Test with various prompt patterns, measure redirect success rate, iterate on wording.
**Dependencies:** Phase 1 hooks must be in place.

### Phase 3: SKILL.md Description Updates (Reinforcement)

**What:** Update skill descriptions to reinforce availability when built-in tools are denied.
**Why third:** Provides secondary signal to the model. The denial reason is primary; skill descriptions are reinforcement.
**Files changed:** `skills/websearch/SKILL.md`, `skills/webfetch/SKILL.md`
**Dependencies:** Phase 2 (know the denial reason wording to align descriptions).

### Phase 4: Output Format Verification (Validation)

**What:** Confirm that plugin output formats match built-in tool output formats in the actual conversation context.
**Why last:** Output formats are already close. This is validation, not construction. If gaps found, fix them here.
**Dependencies:** Phase 2 (need working redirect to test end-to-end).

## Risk Assessment

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Model ignores denial reason | HIGH | MEDIUM | Explicit skill naming, SKILL.md description reinforcement, testing |
| Denial reason varies by context | MEDIUM | MEDIUM | Test across diverse prompt patterns |
| Output format mismatch | LOW | LOW | Current XML/markdown formats are close matches |
| Plugin hooks not firing | HIGH | LOW | Documented behavior, verified via Context7 |
| Performance impact of hook echo | LOW | LOW | Inline echo is near-instantaneous |

## Sources

- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- PreToolUse matcher syntax, deny decision, JSON output format. Context7 verified. HIGH confidence.
- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide) -- Multi-hook configuration, deny-with-reason pattern. Context7 verified. HIGH confidence.
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) -- Plugin manifest schema, inline hooks, mcpServers. Context7 verified. HIGH confidence.
- [Claude Code Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) -- Advanced plugin.json with hooks, mcpServers, full schema. Context7 verified. HIGH confidence.
- [Claude Code MCP Reference](https://code.claude.com/docs/en/mcp) -- MCP tool naming convention (`mcp__<server>__<tool>`), .mcp.json format. Context7 verified. HIGH confidence.
- [Claude Code Agent SDK TypeScript Types](https://code.claude.com/docs/en/agent-sdk/typescript) -- toolAliases option (Agent SDK only, not available in settings.json). Context7 verified. HIGH confidence.
- [Claude Code Settings](https://code.claude.com/docs/en/settings) -- permissions.deny format. Context7 verified. HIGH confidence.
- [Claude Code Changelog](https://code.claude.com/docs/en/changelog) -- "Deferred tools (e.g., WebSearch, WebFetch) are now correctly available to skills with context: fork." Context7 verified. HIGH confidence.

---

*Architecture research for: cc-websearch v1.2 -- Replace Built-in WebSearch/WebFetch*
*Researched: 2026-05-22*
