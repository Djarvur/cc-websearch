---
phase: 11-redirect-reliability
plan: 01
subsystem: plugin-config
tags: hooks, skill-definitions, denial-reason, redirect, websearch, webfetch

requires:
  - phase: 10-hook-infrastructure
    provides: PreToolUse hook entries in hooks.json, SKILL.md baseline structure

provides:
  - Updated denial reason strings adding "unavailable" context for better model comprehension (D-02/D-03)
  - Replacement-first skill descriptions for better model skill selection (D-05)
  - Opening body paragraphs stating replacement role in both SKILL.md files (D-06)

affects: [11-redirect-reliability plan 02, human UAT testing]

tech-stack:
  added: []
  patterns: ["PreToolUse hook denial reason format with 'unavailable' suffix", "Skill description prefix 'Replacement for built-in [ToolName] — '"]

key-files:
  created: []
  modified:
    - .claude-plugin/hooks/hooks.json
    - skills/websearch/SKILL.md
    - skills/webfetch/SKILL.md

key-decisions:
  - "D-02: Add 'unavailable' clause to denial reason for model comprehension"
  - "D-03: Revised denial reason text: '<Tool> tool is unavailable. Use cc-websearch:<skill> Skill instead.'"
  - "D-05: Prefix skill descriptions with 'Replacement for built-in [ToolName] — '"
  - "D-06: Add opening body paragraph stating replacement role in both SKILL.md files"
  - "D-07: allowed-tools Bash(node *) unchanged in both SKILL.md files"
  - "D-12: Static inline echo hooks preserved — no dynamic Node.js denial reason script"

patterns-established:
  - "Denial reasons follow format: '<Tool> tool is unavailable. Use cc-websearch:<skill> Skill instead.'"
  - "Skill descriptions begin with 'Replacement for built-in <Tool> — ' followed by original description"
  - "Skill body opening paragraph: 'This skill replaces the built-in <Tool> tool when unavailable.'"

requirements-completed:
  - RDIR-01
  - RDIR-02
  - RDIR-03
  - RDIR-04

duration: 5min
completed: 2026-05-24
---

# Phase 11 Redirection Reliability Plan 01: Update denial reason text and skill descriptions

**Updated hooks.json denial reasons with "unavailable" context and restructured SKILL.md descriptions with "Replacement for built-in" prefix for both websearch and webfetch skills**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-24T15:19:00Z
- **Completed:** 2026-05-24T15:24:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Updated WebSearch hook denial reason to include "unavailable" context, improving model comprehension that the built-in tool is blocked
- Updated WebFetch hook denial reason with the same pattern for consistency
- Prefixed websearch skill description with "Replacement for built-in WebSearch — " for better model skill selection
- Prefixed webfetch skill description with "Replacement for built-in WebFetch — " for better model skill selection
- Added "This skill replaces the built-in {WebSearch,WebFetch} tool when unavailable." as opening body paragraph in both SKILL.md files
- Verified all injected echo commands produce valid JSON and structural elements remain unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Update WebSearch and WebFetch denial reason strings in hooks.json** - `52b0063` (fix)
2. **Task 2: Update websearch and webfetch SKILL.md descriptions and body content** - `d3d8e58` (feat)

**Plan metadata:** (committed in this summary creation)

## Files Created/Modified

- `.claude-plugin/hooks/hooks.json` - Updated two `permissionDecisionReason` string values to include "unavailable" context
- `skills/websearch/SKILL.md` - Added "Replacement for built-in WebSearch — " description prefix and opening body paragraph
- `skills/webfetch/SKILL.md` - Added "Replacement for built-in WebFetch — " description prefix and opening body paragraph

## Decisions Made

- D-02/D-03: Denial reasons changed from "Use cc-websearch:{skill} Skill tool instead." to "{Tool} tool is unavailable. Use cc-websearch:{skill} Skill instead." - adding "unavailable" context signals the built-in tool is blocked, not that the skill is the wrong approach
- D-05: Description prefix "Replacement for built-in {ToolName} — " makes the skill's purpose immediately clear in model context window summaries
- D-06: Opening body paragraph states the same replacement role explicitly where the model reads skill content, reinforcing the redirect signal
- D-07: allowed-tools field left unchanged because these are configuration-only changes, no executable code changes
- Body paragraph placed after the heading (Option B) to keep heading as a clear section marker while making the replacement message the first content under the heading

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both tasks completed without issues. Initial verification grep patterns needed escaping for JSON backslash-quotes and shell glob characters, but those were test string formulation issues, not implementation problems.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01 completes the hooks.json text updates and SKILL.md description updates
- Ready for Plan 02 which covers human UAT testing of redirect reliability across diverse prompt patterns
- The phrase "unavailable" in denial reasons and "Replacement for built-in" in skill descriptions should together increase model redirect likelihood

## Threat Flags

None - this plan only modified configuration files (hooks.json, SKILL.md) with no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

---

*Phase: 11-redirect-reliability*
*Completed: 2026-05-24*
