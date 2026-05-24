# Phase 10: Hook Infrastructure - Pattern Map

**Mapped:** 2026-05-23
**Files analyzed:** 2 (1 new, 1 modified)
**Analogs found:** 2 / 2

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.claude-plugin/hooks/hooks.json` | config/hook | event-driven | `.claude/settings.json` (PreToolUse hooks, lines 66-107) | exact |
| `.claude-plugin/plugin.json` | config/manifest | N/A (static config) | `.claude-plugin/plugin.json` (same file, existing) | exact |

## Pattern Assignments

### `.claude-plugin/hooks/hooks.json` (config/hook, event-driven)

**Analog:** `.claude/settings.json` lines 66-107

**Hook structure pattern** (`.claude/settings.json` lines 66-107):

The PreToolUse hook section in the existing settings file shows the canonical structure:

```json
"PreToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "\"/usr/local/bin/node\" \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/gsd-prompt-guard.js",
        "timeout": 5
      }
    ]
  },
  {
    "matcher": "Bash",
    "hooks": [
      {
        "type": "command",
        "command": "bash \"$CLAUDE_PROJECT_DIR\"/.claude/hooks/gsd-validate-commit.sh",
        "timeout": 5
      }
    ]
  }
]
```

**Key structural elements to replicate:**
- `PreToolUse` is a top-level key under `hooks`
- Value is an array of hook entry objects
- Each entry has a `matcher` (string) and a `hooks` (array of hook definitions)
- Each hook definition has `type` (string: `"command"`) and `command` (string: shell command to execute)
- `timeout` is optional (not needed for inline echo since it is trivially fast)

**Key differences from analog for Phase 10:**
- Use inline `echo` command instead of script path (D-01)
- Use separate entries per tool with exact matchers (`"WebSearch"`, `"WebFetch"`) instead of regex alternation (D-04, D-09)
- No `timeout` field needed -- inline echo completes instantly
- Hook file is standalone in `.claude-plugin/hooks/hooks.json`, not embedded in `settings.json`
- Root structure is `{ "hooks": { "PreToolUse": [...] } }` since this is a dedicated hooks file

**Resulting pattern for Phase 10:**

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

**JSON escaping pattern for inline echo (critical detail):**

The double-escaping follows this pattern:
1. Outer: JSON string value uses double quotes (`"command": "..."`)
2. Inner: Shell command uses single quotes to wrap the JSON body (`echo '...'`)
3. Innermost: JSON content uses escaped double quotes (`{\"hookSpecificOutput\":...}`)

Verification command:
```bash
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Use cc-websearch:websearch Skill tool instead."}}' | python3 -m json.tool
```

---

### `.claude-plugin/plugin.json` (config/manifest, N/A static config)

**Analog:** `.claude-plugin/plugin.json` lines 1-6 (same file, current state before modification)

**Current manifest structure** (`.claude-plugin/plugin.json` lines 1-6):

```json
{
  "name": "cc-websearch",
  "displayName": "WebSearch",
  "version": "0.1.0",
  "description": "DDG-powered WebSearch and WebFetch replacement for Claude Code"
}
```

**Modification pattern:**

Add the `"hooks"` field at the same nesting level as other metadata fields. The value is a relative path string resolved against the plugin directory:

```json
{
  "name": "cc-websearch",
  "displayName": "WebSearch",
  "version": "0.1.0",
  "description": "DDG-powered WebSearch and WebFetch replacement for Claude Code",
  "hooks": "hooks/hooks.json"
}
```

**Path resolution:** The value `"hooks/hooks.json"` is resolved relative to the plugin directory (`.claude-plugin/`), so the full path is `.claude-plugin/hooks/hooks.json`. This is the documented Claude Code plugin contract behavior (Claude Code plugins reference, HIGH confidence).

**Structural discipline:** The `hooks` field is a simple string (not an array or object). It points to a file that contains the full `{ "hooks": { ... } }` structure. This is distinct from `.claude/settings.json` where hooks are embedded inline.

---

## Shared Patterns

### Hook JSON Structure
**Source:** `.claude/settings.json` lines 7-108
**Apply to:** `.claude-plugin/hooks/hooks.json`

The overall hook JSON structure follows the same schema:
- `hooks` object at root
- Hook event name as key (`PreToolUse`, `SessionStart`, `PostToolUse`)
- Array of hook entries with `matcher` and `hooks` sub-array
- Each hook has `type` and `command` fields

### Plugin Manifest Schema
**Source:** `.claude-plugin/plugin.json` lines 1-6
**Apply to:** `.claude-plugin/plugin.json` (modification)

The plugin manifest uses a flat object with metadata fields (`name`, `displayName`, `version`, `description`). The `hooks` field joins these as another string-valued property at the same level.

### Inline Command Pattern
**Source:** `.claude/settings.json` lines 12-14 (type: "command" with script path)
**Apply to:** `.claude-plugin/hooks/hooks.json` (with inline echo instead of script path)

The `type: "command"` hook mechanism is the same whether the command is a script invocation or an inline echo. Both produce stdout that Claude Code parses as JSON. The existing GSD hooks validate that this mechanism works.

## No Analog Found

All files have an exact analog. No files lack a pattern reference.

| File | Role | Data Flow | Why No Analog |
|---|---|---|---|
| -- | -- | -- | -- |

## Metadata

**Analog search scope:**
- `.claude/settings.json` (GSD hook patterns)
- `.claude-plugin/plugin.json` (current manifest)
- `.claude/hooks/` (GSD hook scripts)

**Files scanned:** 3
**Pattern extraction date:** 2026-05-23
