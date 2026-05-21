# Phase 7: update README and the other docs if necessary - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Update README and project documentation. Verify repo is production-ready for `claude plugin install` — confirm plugin.json, skill definitions, SKILL.md, hooks, and dependency management are correct for distribution. Includes fixing discovered issues (webfetch SKILL.md extension bug) and creating missing assets (.env.example).

</domain>

<decisions>
## Implementation Decisions

### README Content & Structure

- **D-01:** Full project README (not minimal one-liner) with installation, usage, config reference, comparison table, architecture section, output examples, and quick-start dev guide.
- **D-02:** Primary audience = plugin users (install/use focused). Plugin-user-facing sections first; dev section secondary.
- **D-03:** Include comparison table showing feature parity vs Claude Code built-in WebSearch/WebFetch tools.
- **D-04:** Development section = quick start only (prerequisites, install deps, build, test, lint). Link to CONTRIBUTING.md for deeper docs.
- **D-05:** Include real output examples — search result XML snippet and fetched page markdown.
- **D-06:** Include brief architecture section explaining zero-API-key DDG design (Perplexity optional → DDG fallback → fetch).

### Plugin Distribution Structure

- **D-07:** Keep skills at project-root `skills/` directory — current structure works with `claude plugin install`.
- **D-08:** Fix webfetch SKILL.md — change `webfetch.js` → `webfetch.cjs` to match actual compiled file.
- **D-09:** Both skills use `${CLAUDE_PLUGIN_ROOT}` for script paths (standard Claude Code variable, resolves regardless of install location).

### Plugin Hooks & Deps

- **D-10:** No SessionStart hook needed in `hooks/hooks.json`. User runs `npm install` manually if needed after clone.
- **D-11:** No auto-build in hooks. Compiled scripts (`scripts/*.cjs`) are tracked in git and ship with the repo.
- **D-12:** Distribution dependency strategy: scripts built and committed → `claude plugin add` from repo URL gets everything. Manual `npm install` for deps if needed.

### Verification Scope

- **D-13:** Full validation gate — lint passes, typecheck passes, tests pass, build succeeds, output format verified against Claude Code exact format.
- **D-14:** Dry-run structure check — validate plugin.json schema, skill directory structure, file path references, hook references without actually installing.

### Additional Documentation

- **D-15:** Create `.env.example` showing config template for `~/.config/websearch/config.json` with all supported options and defaults.
- **D-16:** No CHANGELOG.md, CONTRIBUTING.md, or SECURITY.md for initial release.

### Claude's Discretion

- README section ordering and specific wording within agreed structure.
- `.env.example` specific option names and comments.
- Verification command details (exact lint/typecheck/test/build commands to run).

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plugin Structure

- `.claude-plugin/plugin.json` — Plugin manifest (name, version, description)
- `skills/websearch/SKILL.md` — WebSearch skill definition (needs path reference check)
- `skills/webfetch/SKILL.md` — WebFetch skill definition (has .js→.cjs bug to fix)
- `scripts/websearch.cjs` — Compiled WebSearch CLI script
- `scripts/webfetch.cjs` — Compiled WebFetch CLI script (jsdom external)

### Configuration & Development

- `package.json` — Dependencies and scripts build/test/lint commands
- `build.ts` — esbuild configuration for compiling CLI scripts
- `.planning/STATE.md` — Project state and accumulated decisions
- `.planning/REQUIREMENTS.md` — Requirements traceability

### No External Specs

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `build.ts` — esbuild config. Reference for build commands in README dev section.
- `.gitignore` — Standard Node.js gitignore (includes `.claude/` directory).

### Established Patterns

- Skills reference scripts via `${CLAUDE_PLUGIN_ROOT}/scripts/*.cjs` — consistent path style.
- Project uses `esbuild` for bundling → CJS output in `scripts/` directory.
- CI pipeline in Phase 6 (cron + Dependabot + E2E) already configured.
- Config file at `~/.config/websearch/config.json` with env var override.

### Integration Points

- README is entrypoint for all users — installation instructions reference `claude plugin add`.
- `.env.example` mirrors `~/.config/websearch/config.json` schema.
- Dry-run structure check must follow Claude Code plugin reference layout.

</code_context>

<specifics>
## Specific Ideas

- README comparison table should show WebSearch capability (query, allowed_domains, blocked_domains) and WebFetch (url, prompt) side by side with built-in tools.
- Architecture section should explain: DDG is primary (zero API keys) → Perplexity optional if PPLX_API_KEY set → fetch is standalone.
- Output examples should show exact `<search_results>` XML format and markdown page content.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 7-update-readme-and-the-other-docs-if-necessary_
_Context gathered: 2026-05-21_
