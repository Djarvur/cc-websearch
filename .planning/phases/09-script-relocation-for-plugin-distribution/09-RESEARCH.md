# Phase 9: Script Relocation for Plugin Distribution — Research

**Researched:** 2026-05-22
**Domain:** Plugin distribution, esbuild configuration, file path restructuring
**Confidence:** HIGH

## Summary

Phase 9 is a pure mechanical restructuring task with no new libraries, no new patterns, and no unknown dependencies. All decisions are locked in CONTEXT.md. Research confirms the approach is straightforward.

**Primary recommendation:** Update esbuild output paths in `build.ts`, update SKILL.md command paths, update test assertions, rebuild, remove old `scripts/` directory.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: esbuild outputs to `skills/websearch/scripts/websearch.cjs` and `skills/webfetch/scripts/webfetch.cjs`
- D-02: WebSearch SKILL.md uses `${CLAUDE_PLUGIN_ROOT}/skills/websearch/scripts/websearch.cjs`
- D-03: WebFetch SKILL.md uses `${CLAUDE_PLUGIN_ROOT}/skills/webfetch/scripts/webfetch.cjs`
- D-04: Old `scripts/` root directory deleted after relocation
- D-05: build.ts updated to emit bundles to new paths
- D-06: `test/skills.test.ts` updated to assert new bundle locations
- D-07: E2E test spawn paths updated

### Claude's Discretion
- README examples updated with new paths
- `.gitignore` updated if old bundles referenced
- `npm run build && npm run check` MUST pass after changes
</user_constraints>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIST-01 | Bundles output to `skills/<name>/scripts/` | esbuild `outdir`/`outfile` config — simple path change |
| DIST-02 | SKILL.md paths use new locations | String replacement in two files |
| DIST-03 | README examples updated | String replacement |
| DIST-04 | Path-dependent tests updated | Update 3 test files with new bundle paths |
| DIST-05 | Old `scripts/` root dir removed | `git rm -r scripts/` after relocation |
| DIST-06 | `npm run build && npm run check` pass | Full verification gate |

## Standard Stack

No new libraries. Existing stack unchanged:
- **esbuild** — currently configured with two entry points and `outdir: 'scripts'`
- **Vitest 4.1.6** — test framework, tests reference `scripts/*.cjs` paths
- **child_process.spawn** — E2E helpers construct script paths as constants

## Existing Code Patterns

### build.ts (current structure)
```typescript
// Two entry points, one output dir
const result = await esbuild.context({
  entryPoints: ['src/websearch.ts', 'src/webfetch.ts'],
  outdir: 'scripts',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outExtension: { '.js': '.cjs' },
});
```

### SKILL.md command pattern (current)
```bash
echo '{"query":"..."}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/websearch.cjs"
```

### E2E helper pattern (current)
```typescript
const scriptPath = path.join(__dirname, '../../scripts/websearch.cjs');
```

## Common Pitfalls

### Pitfall 1: Dangling references to old paths
**What goes wrong:** After moving bundles, old `scripts/` references in docs, comments, or configs cause breakage.
**How to avoid:** Grep for `/scripts/` across the entire repo before removing old directory.

### Pitfall 2: E2E test path constants
**What goes wrong:** E2E tests hardcode script paths in `test/e2e/helpers.ts`. If missed, E2E tests break.
**How to avoid:** Update `helpers.ts` path constant and verify E2E tests pass.

### Pitfall 3: `.gitignore` references to old patterns
**What goes wrong:** `.gitignore` may have entries for `scripts/*.cjs` that no longer apply.
**How to avoid:** Check `.gitignore` for path-specific entries, not just `scripts/`.

## Files to Modify

| File | Change |
|------|--------|
| `build.ts` | Change `outdir: 'scripts'` to per-entry output paths |
| `skills/websearch/SKILL.md` | Update script path |
| `skills/webfetch/SKILL.md` | Update script path |
| `test/skills.test.ts` | Update bundle existence assertions |
| `test/e2e/helpers.ts` | Update spawn path constant |
| `README.md` | Update example paths |
| `scripts/` | Delete after relocation |

## Security Domain

No security implications. Phase involves file path changes only — no data handling, no network changes, no auth/access control modifications. Security enforcement: N/A.

---

*Researched: 2026-05-22*
*Confidence: HIGH — all claims verified against local codebase*
