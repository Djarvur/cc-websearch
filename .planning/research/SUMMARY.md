# Project Research Summary

**Project:** cc-websearch
**Domain:** Claude Code plugin -- built-in tool replacement via PreToolUse hooks
**Researched:** 2026-05-22
**Confidence:** HIGH

## Executive Summary

cc-websearch is a Claude Code plugin that provides WebSearch and WebFetch capabilities via DDG-powered CLI scripts invoked through plugin skills. The v1.2 milestone replaces the built-in WebSearch and WebFetch tools so the plugin takes over transparently. The core challenge is architectural: Claude Code has no native tool-replacement mechanism. Skills and built-in tools are separate systems -- skills run through the `Skill` tool and are namespaced (`cc-websearch:websearch`), so they cannot shadow or override built-in tool names like `WebSearch` or `WebFetch`.

The recommended approach is a two-part strategy using PreToolUse hooks declared in `plugin.json`. First, hooks matching `WebSearch` and `WebFetch` deny every invocation of the built-in tools with a `permissionDecision: "deny"` response. Second, the denial reason (`permissionDecisionReason`) instructs Claude to invoke the plugin skill instead. This is a behavioral redirect, not a structural replacement -- the model receives the denial reason and must choose to follow it. The existing skill scripts, build pipeline, and output formats remain unchanged; only `plugin.json`, a hook configuration, and skill descriptions need modification.

The primary risk is redirect reliability. The denial reason is a string that becomes part of the model's context, but the model's next action is not guaranteed. Mitigations include explicit skill naming in the denial reason, reinforced skill descriptions that self-document their purpose, and optional `permissions.deny` configuration for users who want belt-and-suspenders reliability. A secondary risk is output format parity between the built-in WebFetch (which may return structured JSON) and the plugin (which returns raw markdown) -- this needs empirical verification against actual Claude Code behavior.

## Key Findings

### Recommended Stack

No new runtime dependencies are required. The existing stack (TypeScript, Node.js 20+, cheerio, jsdom, Readability, Turndown, Commander, Zod) is complete. The v1.2 change is purely a plugin configuration concern.

**New components:**
- PreToolUse hooks in `plugin.json` (or `hooks/hooks.json`): inline `echo` commands that output deny decisions with redirect reasons. No shell script or `jq` dependency needed.
- Updated `plugin.json` manifest: adds a `hooks` key with PreToolUse matchers for `WebSearch` and `WebFetch`.
- Updated SKILL.md descriptions: add language reinforcing skill availability when built-in tools are denied.

### Expected Features

**Must have (table stakes):**
- PreToolUse hook deny for WebSearch -- built-in tool must be blocked when plugin is installed
- PreToolUse hook deny for WebFetch -- same
- Denial reason that reliably redirects to plugin skill -- the critical behavioral link between deny and redirect
- Output format verification -- confirm plugin XML/markdown output matches what Claude expects after built-in is blocked
- Provider-agnostic operation -- plugin works on all providers, not just Anthropic

**Should have (competitive):**
- Works with non-Anthropic providers (already true) -- this is the primary user value
- No API key required (already true) -- DDG Lite needs zero configuration
- Error handling parity -- plugin errors should be as useful as built-in errors

**Defer (v1.x+):**
- Redirect success telemetry -- measure how often denial reason leads to skill invocation
- Fallback to built-in -- skip deny if DDG is down
- Caching parity -- built-in WebFetch has a 15-minute cache; plugin has none

**Defer (v2+):**
- Official tool replacement API -- migrate if Claude Code adds native replacement mechanism
- Multiple search providers -- additional fallback beyond DDG

### Architecture Approach

The architecture adds a hook-based interception layer on top of the existing skill invocation pipeline. PreToolUse hooks in `plugin.json` deny built-in tool calls and redirect to plugin skills. The existing skill-to-Bash-to-CLI-script chain remains unchanged. This is the only viable approach -- MCP servers cannot match built-in tool names (`mcp__server__tool` naming convention), skills cannot shadow built-in names (they are namespaced), and `permissions.deny` requires manual user configuration.

**Major components (existing, unchanged):**
1. `src/websearch.ts` / `src/webfetch.ts` -- CLI entry points
2. `src/lib/duckduckgo.ts`, `src/lib/content.ts`, `src/lib/fetch.ts` -- search, extraction, HTTP
3. `build.ts` -- esbuild bundling to `skills/*/scripts/*.cjs`

**New/modified components:**
1. `plugin.json` -- add `hooks` key with inline PreToolUse matchers
2. `hooks/hooks.json` (alternative) -- external hook configuration file
3. `skills/websearch/SKILL.md`, `skills/webfetch/SKILL.md` -- update descriptions

### Critical Pitfalls

1. **Skills cannot shadow built-in tool names** -- Plugin skills are namespaced (`cc-websearch:websearch`) and invoked through the `Skill` tool, not as top-level tools. No name-based shadowing exists. Must use PreToolUse hooks instead.
2. **Denial reason redirect is behavioral, not guaranteed** -- After a deny, the model receives the reason string and decides what to do next. It may retry, fall back to Bash+curl, or ask the user. Mitigate with explicit skill naming, directive language, and testing across prompt patterns.
3. **Built-in WebSearch does not exist on non-Anthropic providers** -- On Bedrock, Vertex, OpenAI-compatible endpoints, the built-in tool is hidden entirely. The plugin must provide self-contained search that works regardless of provider. The skill descriptions must not assume the model knows about built-in WebSearch/WebFetch.
4. **Built-in WebFetch runs a Haiku summarization pass** -- The built-in tool fetches, converts to markdown, truncates to 100KB, then runs a Haiku model pass to answer the user's prompt. The plugin returns raw markdown without LLM summarization. This is a deliberate design difference, but the plugin should implement 100KB truncation to match.
5. **PreToolUse hook matcher is case-sensitive** -- Tool names must be `WebSearch|WebFetch` (exact case). Using lowercase will silently fail to match.

## Implications for Roadmap

Based on combined research, the v1.2 work is narrow in scope (no new runtime code, only plugin configuration and testing) but high in risk (behavioral redirect reliability). The phases should be structured around the dependency chain: hooks first (foundation), then denial reason tuning (critical link), then validation.

### Phase 1: Hook Infrastructure
**Rationale:** Everything depends on the built-in tools being intercepted. Without hooks, the replacement mechanism does not exist. This is the smallest possible change (plugin.json only) but the most important.
**Delivers:** Plugin that automatically blocks built-in WebSearch/WebFetch when installed.
**Addresses:** Table stakes features -- built-in WebSearch blocked, built-in WebFetch blocked.
**Avoids:** Pitfalls 1 (skills cannot shadow names) and 5 (case-sensitive matchers).
**Files:** `.claude-plugin/plugin.json`, optionally `hooks/hooks.json`.

### Phase 2: Denial Reason Engineering and Skill Description Tuning
**Rationale:** The denial reason is the critical behavioral link. If Claude does not follow the redirect instruction, the whole replacement fails. This phase requires iterative testing with diverse prompt patterns.
**Delivers:** Reliable redirect from denied built-in tool to plugin skill invocation.
**Addresses:** Table stakes -- skill invocation works after deny; differentiators -- no API key, provider-agnostic.
**Avoids:** Pitfalls 2 (behavioral redirect) and 3 (non-Anthropic providers).
**Files:** `.claude-plugin/plugin.json` (denial reason text), `skills/websearch/SKILL.md`, `skills/webfetch/SKILL.md`.

### Phase 3: Output Format Verification and Cross-Provider Testing
**Rationale:** Output format parity must be verified empirically. The WebFetch output format gap (raw markdown vs structured JSON) is a MEDIUM risk that needs testing against actual Claude Code behavior. Cross-provider testing ensures the plugin works where the built-in does not.
**Delivers:** Verified format parity and provider compatibility.
**Addresses:** Table stakes -- same output format; provider-agnostic operation.
**Avoids:** Pitfall 4 (WebFetch summarization difference) and content truncation.
**Files:** Possibly `src/lib/output.ts`, `src/webfetch.ts` if format adjustments needed.

### Phase Ordering Rationale

- Phase 1 is a configuration-only change with zero risk of breaking existing plugin functionality. It must come first because Phase 2 and Phase 3 depend on hooks being in place.
- Phase 2 is the highest-risk phase because redirect reliability is behavioral, not structural. It must come before Phase 3 because format verification requires a working end-to-end redirect.
- Phase 3 is validation and adjustment. It comes last because it assumes the redirect mechanism works and focuses on output correctness.
- The entire v1.2 scope is 3-5 files total (plugin.json, optionally hooks.json, two SKILL.md files, possibly one source file for format adjustment). This is deliberately narrow.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** Denial reason wording and redirect reliability. The research confirms the mechanism works (HIGH confidence from official docs) but does not provide empirical data on which phrasing produces the most reliable redirect. Needs iterative testing with real Claude Code sessions.
- **Phase 3:** WebFetch output format. The Agent SDK docs describe structured JSON output, but what actually appears in conversation may differ. Needs testing against real Claude Code to determine if raw markdown from stdout is correct or if a format change is needed.

Phases with standard patterns (skip research-phase):
- **Phase 1:** PreToolUse hook configuration is thoroughly documented in official Claude Code docs. The hook JSON format, matcher syntax, and deny decision structure are well-established patterns. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies. All existing dependencies verified. Hook mechanism verified across multiple official docs sources. |
| Features | HIGH | Feature landscape is narrow (v1.2 is a configuration change). All features map to documented plugin capabilities. |
| Architecture | HIGH | PreToolUse hook approach is the only viable path. All alternatives (MCP, name shadowing, disallowedTools) are ruled out with documented evidence. |
| Pitfalls | HIGH | Pitfalls are well-documented with official sources. The mikhail.io reverse-engineering source (MEDIUM confidence) is supplementary -- all critical pitfalls are confirmed by official docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **Redirect reliability is untested:** Research confirms the mechanism (PreToolUse deny with reason) exists and is documented. Research does not provide empirical redirect success rates. Phase 2 must include testing across diverse prompt patterns to measure and improve reliability.
- **WebFetch output format needs empirical verification:** Agent SDK types show structured JSON with `bytes`, `code`, `codeText`, `result`, `durationMs`, `url` fields. Whether the conversation-visible output is the full JSON or just the `result` field is unclear. Phase 3 must test against actual Claude Code behavior.
- **Subagent compatibility is untested:** Research notes that PreToolUse hooks fire for all tool calls including subagents, but this has not been verified in practice. The "Looks Done But Isn't" checklist in PITFALLS.md flags this as a verification item.

## Sources

### Primary (HIGH confidence)
- Claude Code Hooks Reference (code.claude.com/docs/en/hooks) -- PreToolUse matcher syntax, deny decision, JSON output format
- Claude Code Hooks Guide (code.claude.com/docs/en/hooks-guide) -- Multi-hook configuration, deny-with-reason pattern
- Claude Code Plugins Reference (code.claude.com/docs/en/plugins-reference) -- Plugin manifest schema, hooks field, `${CLAUDE_PLUGIN_ROOT}`
- Claude Code Tools Reference (code.claude.com/docs/en/tools-reference) -- Tool names in permission rules, WebSearch/WebFetch as valid matchers
- Claude Code CLI Reference (code.claude.com/docs/en/cli-reference) -- `--disallowedTools`, `--tools` flags
- Claude Code Settings (code.claude.com/docs/en/settings) -- `permissions.deny` format, `skipWebFetchPreflight`
- Claude Code Skills Reference (code.claude.com/docs/en/skills) -- Skill frontmatter, namespacing, disable-model-invocation
- Claude Code Network Config (code.claude.com/docs/en/network-config) -- WebFetch preflight check behavior
- Claude Code Agent SDK TypeScript Types (code.claude.com/docs/en/agent-sdk/typescript) -- WebSearchOutput, WebFetchOutput types

### Secondary (MEDIUM confidence)
- Inside Claude Code's Web Tools (mikhail.io) -- Reverse-engineered WebFetch pipeline (domain check, Turndown, Haiku pass, 15-min cache) and WebSearch (Anthropic-only backend)

### Tertiary (LOW confidence)
- Reddit: WebSearch/Fetch on Z.ai -- Community report of WebSearch not working on non-Anthropic providers (Reddit blocked content, could not fully verify)

---
*Research completed: 2026-05-22*
*Ready for roadmap: yes*
