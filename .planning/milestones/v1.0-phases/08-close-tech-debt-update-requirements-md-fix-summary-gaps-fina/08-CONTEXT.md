# Phase 8: close-tech-debt-update-requirements-md-fix-summary-gaps-fina - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Close tech debt accumulated during v1.0 development. Fix tracking and documentation debt so the v1.0 milestone can be cleanly closed. No new features. Three work streams plus code debt:

1. **REQUIREMENTS.md** — Update stale checkboxes, rewrite outdated descriptions for DDG-only reality, add CI requirements, standardize traceability convention
2. **SUMMARY gaps** — Fix known 03-01 frontmatter gap, audit all 17 SUMMARY files, create phase-level and milestone-level aggregations
3. **Nyquist finalization** — Complete VALIDATION.md checklists for all 7 phases, set `nyquist_compliant: true` and `wave_0_complete: true`
4. **Code debt** — Fix 4 low-severity code items: withTimeout, readStdin crash, normalizeUrl schemes, @types/jsdom mismatch

</domain>

<decisions>
## Implementation Decisions

### REQUIREMENTS.md Scope

- **D-01:** Rewrite SRCH-04 to reflect DDG as sole search provider with citation snippets (was "Perplexity as primary provider").
- **D-02:** Move FTEC-04 to Out of Scope with reason "removed Phase 5 — Perplexity summarization no longer needed".
- **D-03:** Add CI-01 through CI-08 requirement definitions to REQUIREMENTS.md, mapped to Phase 6.
- **D-04:** Rewrite CONF-01 for DDG-only: "No API keys required — DDG is sole provider, zero-config setup".
- **D-05:** Rewrite CONF-03: remove "Perplexity model selection", keep retry params and logging level.
- **D-06:** Standardize traceability table statuses to "Complete" / "In progress" / "Not started".
- **D-07:** Update PLUG-02/03 requirement text to match actual `.cjs` script paths with `CLAUDE_PLUGIN_ROOT`.
- **D-08:** Update SRCH-02 to include `<snippet>` tag alongside `<title>/<url>`.
- **D-09:** Checkbox sync: mark all 10 SATISFIED requirements as [x].

### SUMMARY Audit Depth

- **D-10:** Audit all 17 existing SUMMARY.md files for frontmatter completeness (requirements_completed, tech-stack, provides).
- **D-11:** Create phase-level SUMMARY.md files for each phase (01-07) aggregating plan data.
- **D-12:** Create v1.0 milestone-level SUMMARY.md.

### Nyquist Compliance Bar

- **D-13:** Full checklist completion: complete Validation Sign-Off and Wave 0 Requirements checklists in all 7 VALIDATION.md files.
- **D-14:** Set `nyquist_compliant: true` and `wave_0_complete: true` for all phases.
- **D-15:** Update VALIDATION.md frontmatter status from "draft" to completed state.

### Code Debt Inclusion

- **D-16:** Fix withTimeout non-functional (CR-02, pre-existing Phase 2) — `src/lib/retry.ts`.
- **D-17:** Fix readStdin crashes on empty stdin (WR-01, pre-existing Phase 1) — `src/lib/input.ts`.
- **D-18:** Fix normalizeUrl accepts non-HTTP schemes (WR-03) — `src/lib/fetch.ts`.
- **D-19:** Fix @types/jsdom vs jsdom version mismatch — `package.json`.

### Claude's Discretion

- Specific REQUIREMENTS.md wording for rewritten requirements.
- SUMMARY.md frontmatter details (exact items to list per phase).
- VALIDATION.md checklist completion order and sign-off wording.
- Code fix implementation approach for each debt item.
- Order of operations (tracking/documentation first, then code fixes).

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Primary Targets

- `.planning/REQUIREMENTS.md` — Primary update target. Stale checkboxes, outdated descriptions, missing CI requirements.
- `.planning/v1.0-MILESTONE-AUDIT.md` — Source of all identified gaps. Requirements coverage table (lines 96-121), tech debt summary (lines 155-176), Nyquist coverage (lines 141-153).

### Nyquist Targets (VALIDATION.md files)

- `.planning/phases/01-plugin-foundation-and-primary-search/01-VALIDATION.md` — nyquist_compliant: false → needs completion
- `.planning/phases/02-search-resilience/02-VALIDATION.md` — nyquist_compliant: true, wave_0_complete: false → needs wave 0 finish
- `.planning/phases/03-webfetch-content-pipeline/03-VALIDATION.md` — nyquist_compliant: false → needs completion
- `.planning/phases/04-config-file-and-logging/04-VALIDATION.md` — already compliant, verify status
- `.planning/phases/05-ddg-only-with-citations/05-VALIDATION.md` — nyquist_compliant: false → needs completion
- `.planning/phases/06-ci-pipeline-and-e2e-tests/06-VALIDATION.md` — nyquist_compliant: false → needs completion
- `.planning/phases/07-update-readme-and-the-other-docs-if-necessary/07-VALIDATION.md` — nyquist_compliant: false → needs completion

### SUMMARY Fix Targets

- `.planning/phases/03-webfetch-content-pipeline/03-01-SUMMARY.md` — Known gap: requirements_completed: [] missing FTEC-01/02/05
- All 17 plan-level SUMMARY.md files under `.planning/phases/*/*-SUMMARY.md` — need frontmatter audit

### Code Debt Targets

- `src/lib/retry.ts` — withTimeout non-functional (CR-02)
- `src/lib/input.ts` — readStdin crashes on empty stdin (WR-01)
- `src/lib/fetch.ts` — normalizeUrl accepts non-HTTP schemes (WR-03)
- `package.json` — @types/jsdom version mismatch with jsdom

### Project Context

- `.planning/ROADMAP.md` — Phase 8 entry, phase dependencies
- `.planning/STATE.md` — Current project state and accumulated decisions
- `.planning/PROJECT.md` — Core value, constraints, key decisions

### No External Specs

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `v1.0-MILESTONE-AUDIT.md` — Comprehensive gap analysis with per-phase tech debt items
- 17 SUMMARY.md files — existing plan-level summaries needing frontmatter audit
- 7 VALIDATION.md files — existing per-phase validation contracts needing finalization
- `src/lib/retry.ts` — existing retry logic with non-functional withTimeout to fix
- `src/lib/input.ts` — existing stdin parser with empty-input crash to fix
- `src/lib/fetch.ts` — existing fetch wrapper with permissive URL scheme check to fix

### Established Patterns

- REQUIREMENTS.md uses `[ ]`/`[x]` checkbox format with `**REQ-ID**` identifiers
- Traceability table follows `| Requirement | Phase | Status |` format
- VALIDATION.md uses frontmatter with nyquist flags + markdown checklists
- SUMMARY.md uses frontmatter with requirements_completed array
- Plan-level SUMMARYs at `{phase}-{plan}-SUMMARY.md`, phase-level directories separate

### Integration Points

- REQUIREMENTS.md updates must maintain existing `[ ]`/`[x]` format and ID references
- SUMMARY audit must preserve existing frontmatter structure when adding missing items
- VALIDATION.md checklist completion sets nyquist flags in frontmatter
- Code fixes in lib/ modules require rebuild (`npm run build`) to update script bundles
- No new modules needed — all changes are modifications to existing files

</code_context>

<specifics>

## Specific Ideas

- Use v1.0-MILESTONE-AUDIT.md requirements coverage table (lines 96-121) as authoritative source for checkbox status — every row with "SATISFIED (update checkbox)" maps to a [ ] → [x] change.
- Phase 3 VAILDATION.md checklist items reference tests that already pass — completion is documentation, not re-validation.
- Code debt fixes should maintain backward compatibility (no API changes to existing function signatures).

</specifics>

<deferred>

## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 8-close-tech-debt-update-requirements-md-fix-summary-gaps-fina*
*Context gathered: 2026-05-21*
