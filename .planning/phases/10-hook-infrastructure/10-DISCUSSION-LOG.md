# Phase 10: Hook Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 10-Hook Infrastructure
**Areas discussed:** Hook implementation, Output format, Matcher strategy, Denial reason + error handling

---

## Hook Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Inline echo command | echo JSON string directly in hooks.json command field. Simplest — zero extra files. No access to tool_input at runtime — static denial reason only. | ✓ |
| Node.js script | Script reads stdin, parses tool_name/tool_input, emits deny with original query/URL in reason. Like nmindz reference impl. More code but context-aware denial. | |

**User's choice:** Inline echo command
**Notes:** User prefers simplest approach. Dynamic denial deferrable to Phase 11 if needed.

---

## Output Format

| Option | Description | Selected |
|--------|-------------|----------|
| hookSpecificOutput | Preferred style: {"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}} | ✓ |
| Legacy decision/reason | Simple: {"decision":"block","reason":"..."} | |

**User's choice:** hookSpecificOutput
**Notes:** Using preferred new-style format per authoritative hook schema reference.

---

## Matcher Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Combined regex | Single hook entry with matcher "WebSearch|WebFetch" — catches both tools. Cleaner, one command to maintain. | |
| Separate entries | Two hook entries, separate matchers for WebSearch and WebFetch. More explicit, easier to debug individual tool issues. | ✓ |

**User's choice:** Separate entries
**Notes:** Explicit per-tool approach chosen over combined regex.

---

## Denial Reason + Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Short redirect | WebSearch: "Use cc-websearch:websearch Skill tool instead." WebFetch: "Use cc-websearch:webfetch Skill tool instead." | ✓ |
| With param instruction | Include instructions to pass same params as JSON stdin. | |

**User's choice:** Short redirect
**Notes:** Static text since inline echo chosen. No dynamic query/URL inclusion.

**Error handling:** None needed — inline echo trivially reliable.

---

## Claude's Discretion

None — all decisions made by user.

## Deferred Ideas

- Dynamic denial reason with original query/URL — Phase 11 if needed
- Node.js script hook — Phase 11 if inline redirect unreliable
- Bash web-bypass blocking — consider post-v1.2
