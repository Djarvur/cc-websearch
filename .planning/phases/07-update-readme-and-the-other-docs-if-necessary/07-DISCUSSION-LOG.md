# Phase 7: update README and the other docs if necessary - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 7-update-readme-and-the-other-docs-if-necessary
**Areas discussed:** README content & structure, Plugin distribution structure, Plugin hooks for deps, Verification scope

---

## README Content & Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal + practical | Installation, quick usage, config reference. ~1-2 min read. | |
| Full project README | Install, usage, config, development setup, build, test, CI, architecture overview, contributing. ~5 min read. | ✓ |

**User's choice:** Full project README
**Notes:** Plugin-user focused as primary audience.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — comparison table | Show feature parity or differences vs built-in tools. | ✓ |
| Not needed | Focus on usage. Users already know built-in tools. | |

**User's choice:** Include comparison table
**Notes:** Helps users decide if they want this plugin.

| Option | Description | Selected |
|--------|-------------|----------|
| Quick start only | Prerequisites, install deps, build, test, lint. One paragraph each. | ✓ |
| Full dev guide | Architecture overview, build pipeline explanation, testing patterns, CI/CD flow. | |
| Minimal — just link | Single line: See CONTRIBUTING.md for development setup. | |

**User's choice:** Quick start only
**Notes:** Dev section secondary to plugin-user-facing content.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — real examples | Show search result XML and fetched page markdown output. | ✓ |
| Just describe format | Text explanation of output format. | |

**User's choice:** Yes — include real examples

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — architecture section | Brief architecture diagram/flow: Perplexity optional → DDG fallback → fetch. | ✓ |
| Mention in intro only | Single sentence in description. | |

**User's choice:** Yes — include architecture section
**Notes:** Explain zero-API-key DDG design.

---

## Plugin Distribution Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Fix SKILL.md to .cjs | Change reference to webfetch.cjs. Matches actual file. | ✓ |
| Rename both to .js | Rebuild with .js extension. | |

**User's choice:** Fix SKILL.md to .cjs

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — use ${CLAUDE_PLUGIN_ROOT} | Standard Claude Code variable. Works everywhere plugin installed. | ✓ |
| Let me think of another approach | Different path strategy. | |

**User's choice:** Both use `${CLAUDE_PLUGIN_ROOT}` with .cjs extension
**Notes:** Scripts must be runnable from skill install dir. `${CLAUDE_PLUGIN_ROOT}` resolves that.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current structure | skills/ at project root. Simple, clear. | ✓ |
| Move inside .claude-plugin/ | .claude-plugin/skills/websearch/ etc. | |

**User's choice:** Keep current structure (skills/ at project root)

---

## Plugin Hooks for Deps

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add hooks/hooks.json | SessionStart hook runs npm install if node_modules missing. | |
| Not needed | Assume user runs npm install manually after git clone. | ✓ |

**User's choice:** Not needed
**Notes:** Compiled scripts tracked in git — `claude plugin add` from repo URL gets everything.

| Option | Description | Selected |
|--------|-------------|----------|
| Just npm install | Run npm install from plugin root. | ✓ |
| npm install + build | Also run npm run build after install. | |

**User's choice:** Just npm install

---

## Verification Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full validation | Lint, typecheck, test, build, verify output format matches Claude Code exactly. | ✓ |
| Build + test only | Build succeeds, tests pass. | |

**User's choice:** Full validation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — dry-run check | Validate plugin.json schema, skill structure, hook references. | ✓ |
| No — trust structure | Structure already correct from design. | |

**User's choice:** Yes — dry-run check of plugin structure

| Option | Description | Selected |
|--------|-------------|----------|
| .env.example | Template for config file at ~/.config/websearch/config.json. | ✓ |
| CHANGELOG.md | Track releases and version history. | |
| CONTRIBUTING.md | How to set up dev environment, run tests, submit PRs. | |
| SECURITY.md | How to report security vulnerabilities. | |

**User's choice:** .env.example only (no CHANGELOG/CONTRIBUTING/SECURITY for initial release)

---

## Claude's Discretion

- README section ordering and specific wording within agreed structure.
- `.env.example` specific option names and comments.
- Verification command details (exact lint/typecheck/test/build commands).

## Deferred Ideas

None.
