# Phase 8: Close tech debt - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 8-close-tech-debt-update-requirements-md-fix-summary-gaps-fina
**Areas discussed:** REQUIREMENTS.md scope, SUMMARY audit depth, Nyquist compliance bar, Code debt inclusion

---

## REQUIREMENTS.md Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite descriptions | Update SRCH-04 to say 'DDG as sole search provider with citation snippets'. Move FTEC-04 to Out of Scope with reason 'removed Phase 5 — Perplexity summarization no longer needed'. | ✓ |
| Checkbox-only update | Keep original requirement text, just mark SRCH-04 [x] (reinterpreted) and FTEC-04 [x] (intentionally removed). Update traceability status accordingly. | |

**User's choice:** Rewrite descriptions
**Notes:** Full rewrite of SRCH-04 and FTEC-04 to match DDG-only reality.

| Option | Description | Selected |
|--------|-------------|----------|
| Add CI requirements | Add CI-01 through CI-08 requirement definitions and map to Phase 6. Updates traceability table to include them. | ✓ |
| Skip CI requirements | Leave CI requirements out of REQUIREMENTS.md since they're documented in ROADMAP.md and VERIFICATION.md already. | |

**User's choice:** Add CI requirements
**Notes:** CI-01 through CI-08 need proper requirement definitions with traceability mapped to Phase 6.

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite for DDG-only | Update CONF-01 to 'No API keys required — DDG is sole provider, zero-config setup'. Removes env var config section from requirements. | ✓ |
| Keep as-is, mark done | Keep CONF-01 as-is (API keys from env vars) — still valid since config system supports env var overrides even without Perplexity. Mark [x] for satisfied. | |

**User's choice:** Rewrite for DDG-only

| Option | Description | Selected |
|--------|-------------|----------|
| Update for DDG-only | Update to remove 'Perplexity model selection' since Perplexity removed. Rewrite: 'retry params, logging level' only. | ✓ |
| Mark done, keep text | Mark [x] as satisfied — Perplexity model was a config option that no longer applies, but the config system still works. | |

**User's choice:** Update for DDG-only

| Option | Description | Selected |
|--------|-------------|----------|
| Complete/In progress/Not started | Standardize all entries to 'Complete' / 'In progress' / 'Not started' — clear milestone-friendly status. | ✓ |
| Just make them consistent | One clear format, pick what makes sense — as long as it's consistent across all 22+ entries. | |
| Keep current mixed convention | Keep 'Done' / 'Complete' / 'Pending' mix — the distinction adds information (e.g. Done = minor, Complete = full). | |

**User's choice:** Complete/In progress/Not started
**Notes:** Consistent milestone-friendly status convention across all entries.

| Option | Description | Selected |
|--------|-------------|----------|
| Update to match actual paths | Update PLUG-02/03 requirement text to match reality: `${CLAUDE_PLUGIN_ROOT}/scripts/websearch.cjs` instead of outdated `$CLAUDE_SKILL_DIR/../scripts/websearch.js`. | ✓ |
| Just mark [x], leave text | Mark [x] and leave text as-is — the implementation details changed but the functional meaning (skill invokes script) is satisfied. | |

**User's choice:** Update to match actual paths

| Option | Description | Selected |
|--------|-------------|----------|
| Add snippet to requirement | Update SRCH-02 to mention <snippet> tag alongside existing <title>/<url> tags. | ✓ |
| Keep text, mark [x] | Keep SRCH-02 as-is. Snippet is an extension, not a core contract change. | |

**User's choice:** Add snippet to requirement

---

## SUMMARY Audit Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Audit all 17 files | Audit all 17 SUMMARY.md files for frontmatter completeness (requirements_completed, tech-stack, provides). Fix all gaps found. More thorough but safer. | ✓ |
| Known gap only | Fix only the known 03-01 gap (add FTEC-01/02/05 to requirements_completed). Skip other files unless a problem is found. | |

**User's choice:** Audit all 17 files

| Option | Description | Selected |
|--------|-------------|----------|
| Phase + milestone summaries | Create phase-level SUMMARY.md for each phase (01-07) aggregating plan data. Plus a milestone-level SUMMARY.md for v1.0. | ✓ |
| Plan-level only | 17 plan-level SUMMARYs are sufficient. No aggregation needed. | |

**User's choice:** Phase + milestone summaries

---

## Nyquist Compliance Bar

| Option | Description | Selected |
|--------|-------------|----------|
| Full checklist completion | Complete VALIDATION.md checklists for each phase, set nyquist_compliant: true and wave_0_complete: true. This marks all items in each VALIDATION.md as done. | ✓ |
| Set flag, skip re-validation | Set nyquist_compliant: true for all phases based on pre-existing verification evidence. Wave 0 remains false for incomplete phases. | |
| Document only, defer fixes | Just add Nyquist section to CONTEXT.md noting the status, leave VALIDATION.md files as-is. Defer full compliance to post-v1.0. | |

**User's choice:** Full checklist completion

---

## Code Debt Inclusion

| Option | Description | Selected |
|--------|-------------|----------|
| Fix all 4 now | Fix all 4 code debt items in this phase alongside the tracking/documentation work. | ✓ |
| Fix some, defer rest | Only fix highest-priority items. Defer rest to post-v1.0. | |
| Document only, defer all | Document code debt in CONTEXT.md but don't fix. Address post-v1.0. | |

**User's choice:** Fix all 4 now
**Notes:** All 4 items included: withTimeout, readStdin crash, normalizeUrl schemes, @types/jsdom mismatch.

## Claude's Discretion

- Specific REQUIREMENTS.md wording for rewritten requirements
- SUMMARY.md frontmatter details (exact items to list per phase)
- VALIDATION.md checklist completion order
- Code fix implementation approach for each debt item
- Order of operations (tracking before code or vice versa)

## Deferred Ideas

None — discussion stayed within phase scope.
