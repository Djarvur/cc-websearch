# Phase 10: Hook Infrastructure - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

PreToolUse hooks in plugin configuration that intercept and deny built-in WebSearch and WebFetch tool calls, redirecting Claude to use the cc-websearch plugin skills instead. Covers requirements HOOK-01 through HOOK-04.

This is purely plugin configuration — no changes to CLI scripts, no new runtime dependencies.

</domain>

<decisions>
## Implementation Decisions

### Hook Implementation
- **D-01:** Use inline `echo` command in hooks.json — no Node.js script. Simplest approach, zero extra files. Static denial reason is sufficient for this phase.
- **D-02:** Hook command emits JSON via inline echo, no external shell dependencies (satisfies HOOK-03).

### Output Format
- **D-03:** Use `hookSpecificOutput` format (preferred style): `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}` — not legacy `decision/reason`.

### Matcher Strategy
- **D-04:** Two separate hook entries — one for `WebSearch`, one for `WebFetch`. Each has its own denial reason text.

### Denial Reason
- **D-05:** Short redirect text. WebSearch: "Use cc-websearch:websearch Skill tool instead." WebFetch: "Use cc-websearch:webfetch Skill tool instead."
- **D-06:** Denial reason is static (inline echo cannot read tool_input at runtime). Dynamic query/URL inclusion deferred — not needed for Phase 10.

### Error Handling
- **D-07:** No error handling needed — inline echo is trivially reliable. Hook exits 0 after emitting deny JSON. Non-zero exit = tool proceeds (standard Claude Code hook behavior).

### Structure
- **D-08:** Hook configuration lives in `hooks/hooks.json` within the plugin directory, referenced from `.claude-plugin/plugin.json`.
- **D-09:** Matchers use exact case-sensitive tool names: `WebSearch` and `WebFetch`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specification
- `.planning/REQUIREMENTS.md` — HOOK-01 through HOOK-04 requirements, RDIR/OUTP traceability
- `.planning/ROADMAP.md` — Phase 10 goal, success criteria, dependency on Phase 9

### Research
- `.planning/research/FEATURES.md` — PreToolUse hook approach, hook structure, denial reason patterns
- `.planning/research/ARCHITECTURE.md` — v1.2 architecture diagram, component boundaries

### Project State
- `.planning/PROJECT.md` — Core value, key decisions, v1.2 goals
- `.planning/STATE.md` — Current session state, accumulated context

### External Reference (not in repo)
- `nmindz/claude-code-copilot-builtin` (GitHub) — Real-world reference implementation of PreToolUse deny for WebSearch/WebFetch. Uses Node.js script + `decision: "block"` + `hookSpecificOutput` with `permissionDecision: "deny"`. Confirms the pattern is viable.
- `code.claude.com/docs/en/hooks` — Official hooks reference: PreToolUse stdin schema, stdout output formats, exit code semantics.
- `blog.boucle.sh/posts/how-to-write-a-claude-code-pretooluse-hook/` — Hook contract: `tool_name` + `tool_input` on stdin, `{"decision":"block","reason":"..."}` on stdout to block.

### Existing Codebase Assets
- `.claude-plugin/plugin.json` — Current plugin manifest (minimal, no hooks field yet)
- `.claude/settings.json` — Existing PreToolUse hook patterns for Write/Edit/Bash (reference for hook JSON structure)
- `skills/websearch/SKILL.md` — Current websearch skill definition
- `skills/webfetch/SKILL.md` — Current webfetch skill definition

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.claude/settings.json` — PreToolUse hook pattern already established for Write/Edit/Bash guards. Same JSON structure applies to WebSearch/WebFetch.
- `.claude-plugin/plugin.json` — Existing manifest. Needs `hooks` field added referencing `hooks/hooks.json`.

### Established Patterns
- `hookSpecificOutput` with `permissionDecision` is the preferred output format per authoritative hook schema reference.
- Separate hook entries per tool (as used in `.claude/settings.json` for Write/Edit vs Bash).
- Inline command hooks work identically to script hooks — Claude Code passes stdin JSON regardless of hook type.

### Integration Points
- `hooks/hooks.json` must be created inside the plugin's root (`.claude-plugin/`)
- `.claude-plugin/plugin.json` needs `"hooks"` field added referencing the hooks file
- No changes needed to any `src/` files, `skills/`, or CLI scripts

</code_context>

<specifics>
## Specific Ideas

- Reference impl (nmindz) confirms `permissionDecision: "deny"` with `permissionDecisionReason` causes Claude to see the reason text and (ideally) follow the redirect.
- The `hookSpecificOutput` format is the "preferred" style per the authoritative gist — plan should use this over legacy `decision/reason`.

</specifics>

<deferred>
## Deferred Ideas

- Dynamic denial reason with original query/URL — belongs in Phase 11 (Redirect Reliability) if static redirect proves unreliable.
- Node.js script hook for richer logic — only needed if inline echo redirect isn't reliable enough. Revisit in Phase 11.
- Bash tool blocking for web-bypass attempts (like nmindz does) — out of scope for v1.2. Consider for future if Claude frequently falls back to curl/wget.

</deferred>

---

*Phase: 10-Hook Infrastructure*
*Context gathered: 2026-05-22*
