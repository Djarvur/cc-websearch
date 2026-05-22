# Phase 9: Script Relocation for Plugin Distribution — Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Relocate compiled esbuild bundles from root `scripts/` directory into skill subdirectories so that `claude plugin install` distributes scripts alongside their skill definitions automatically. Updates build config, SKILL.md paths, README, and tests. Removes old `scripts/` root directory after confirming zero dangling references.

</domain>

<decisions>
## Implementation Decisions

### Bundle Output Paths
- **D-01:** esbuild outputs to `skills/websearch/scripts/websearch.cjs` and `skills/webfetch/scripts/webfetch.cjs` (not root `scripts/`)

### SKILL.md References
- **D-02:** WebSearch SKILL.md uses `${CLAUDE_PLUGIN_ROOT}/skills/websearch/scripts/websearch.cjs`
- **D-03:** WebFetch SKILL.md uses `${CLAUDE_PLUGIN_ROOT}/skills/webfetch/scripts/webfetch.cjs`

### Cleanup
- **D-04:** Old `scripts/` root directory deleted after relocation (verify no dangling refs first)
- **D-05:** build.ts updated to emit bundles to both new paths (replace old single output)

### Tests
- **D-06:** `test/skills.test.ts` updated to assert new bundle locations
- **D-07:** E2E tests in `test/e2e/` verify bundled scripts via child_process — update spawn paths

### Claude's Discretion
- README examples updated with new script paths
- `.gitignore` updated if old bundles referenced
- `npm run build && npm run check` MUST pass after changes

</decisions>

<canonical_refs>
## Canonical References

### Phase Requirements
- `.planning/REQUIREMENTS.md` — DIST-01 through DIST-06 define scope

### Build Config
- `build.ts` — esbuild config: entry points, output paths to update

### Skill Definitions
- `skills/websearch/SKILL.md` — command path to update
- `skills/webfetch/SKILL.md` — command path to update

### Tests
- `test/skills.test.ts` — bundle existence assertions to update
- `test/e2e/websearch.e2e.ts` — spawn path to update
- `test/e2e/webfetch.e2e.ts` — spawn path to update

### Docs
- `README.md` — installation and usage examples to update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `build.ts` — esbuild config using `context.build()` with async/await, two entry points. Currently outputs to `scripts/<name>.cjs`. Simple path changes only.

### Established Patterns
- Skills invoke scripts via `${CLAUDE_PLUGIN_ROOT}` for portability — must preserve this
- Bundles are `.cjs` extension for Node.js CJS require compatibility
- E2E tests spawn bundled `.cjs` scripts via `child_process.spawn`

### Integration Points
- SKILL.md files reference scripts via Bash tool command strings — change the literal path
- E2E helpers construct script paths from constants — update the path constants

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard plugin distribution approach. Scripts live in `skills/<name>/scripts/` matching the plugin-dev skill convention.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-Script Relocation for Plugin Distribution*
*Context gathered: 2026-05-22*
