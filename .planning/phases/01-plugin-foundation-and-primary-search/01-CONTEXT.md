# Phase 1: Plugin Foundation and Primary Search - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Installable Claude Code plugin with Perplexity-powered WebSearch producing Claude Code's exact output format. Plugin installs via `claude plugin add`, WebSearch skill accepts JSON stdin matching Claude Code's tool schema, returns `<search_results>` XML to stdout, errors to stderr. WebFetch skill registered as stub (not yet implemented).

</domain>

<decisions>
## Implementation Decisions

### Distribution Strategy
- **D-01:** Pre-compiled bundles via esbuild — each script compiled to a single `.js` file in `scripts/`. Zero runtime dependencies, no npm install hook needed.
- **D-02:** Compiled bundles committed to the repo. Plugin install is instant — no build step at install time.
- **D-03:** Dev workflow: skill definitions always reference `scripts/*.js`. Edit `src/*.ts`, run esbuild to rebuild, test. No hot-reload in skills.

### Perplexity Integration
- **D-04:** Model is configurable via `PPLX_MODEL` env var (and future config file), defaults to `sonar`.
- **D-05:** Return all available citations from Perplexity response (typically 5-10 results). Let the model decide relevance.

### Output Format
- **D-06:** Exact output format deferred to research — researcher must examine Claude Code's actual WebSearch output to determine the precise format. Requirements specify `<search_results>` XML with `<result>`, `<title>`, `<url>` tags but the exact structure (snippets, citation numbering, ordering) needs verification.

### WebFetch Scope
- **D-07:** WebFetch skill registered in Phase 1 as a stub. Both WebSearch and WebFetch SKILL.md files created. WebFetch script returns a clear "not yet implemented" message. Satisfies PLUG-03 as Phase 1 requirement.

### Claude's Discretion
- Error message verbosity — balance between helpful debugging info and clean output
- Logging approach for CONF-04 — simple level-prefixed stderr logging, no external logger library (keep bundles small)
- SessionStart hook — not needed in Phase 1 with pre-compiled bundles; may add in Phase 4 if caching requires lifecycle hooks
- Directory structure — follow Claude Code plugin conventions; researcher/planner determine exact layout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level
- `CLAUDE.md` — Project instructions with locked technology stack decisions (TypeScript, Commander.js, Zod, @perplexity-ai/perplexity_ai SDK, esbuild). Contains full stack rationale, version constraints, alternatives considered, and "What NOT to Use" list.
- `.planning/PROJECT.md` — Core value, requirements, key decisions, constraints
- `.planning/REQUIREMENTS.md` — v1 requirements with IDs (PLUG-01..05, SRCH-01,02,04, CONF-01,04), traceability matrix
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria (5 items), plan breakdown (01-01 through 01-03)

### Plugin Reference
- Claude Code plugin documentation — referenced in CLAUDE.md Sources section. Researcher should verify current plugin manifest schema, skill definition format, and `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_SKILL_DIR}` variable usage.

### API Reference
- Perplexity Chat Completions API — OpenAI-compatible endpoint. Response includes `citations` array. Referenced in CLAUDE.md with docs link.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing code outside planning documents.

### Established Patterns
- No code patterns established yet. This phase sets the patterns for all subsequent phases.
- CLAUDE.md defines the technology stack and conventions to follow.

### Integration Points
- Plugin manifest (`.claude-plugin/plugin.json`) — registers skills with Claude Code
- Skill definitions (`skills/*/SKILL.md`) — tell Claude Code how to invoke scripts
- Scripts (`scripts/*.js`) — compiled entry points called via `node` from skill Bash commands

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All implementation details follow from CLAUDE.md technology decisions and REQUIREMENTS.md specifications.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Plugin Foundation and Primary Search*
*Context gathered: 2026-05-20*
