---
phase: 6
slug: ci-pipeline-and-e2e-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| **Framework**          | vitest 4.x                                               |
| **Config file**        | vitest.config.ts (exists, needs coverage + E2E updates)  |
| **Quick run command**  | `npm test` (unit tests only, ~2.4s)                      |
| **Full suite command** | `npm test -- --coverage && npm run build && npm run e2e` |
| **Estimated runtime**  | ~30 seconds                                              |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (~2.4s)
- **After every plan wave:** Run `npm test -- --coverage && npm run lint && npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite green: unit tests + coverage + lint + typecheck + build + E2E
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement  | Threat Ref     | Secure Behavior       | Test Type   | Automated Command      | File Exists | Status     |
| -------- | ---- | ---- | ------------ | -------------- | --------------------- | ----------- | ---------------------- | ----------- | ---------- |
| 06-01-01 | 01   | 1    | CI-05, CI-06 | —              | N/A                   | unit        | `npx eslint .`         | ❌ W0       | ⬜ pending |
| 06-01-02 | 01   | 1    | CI-07        | —              | N/A                   | manual      | `mise run check-all`   | ❌ W0       | ⬜ pending |
| 06-02-01 | 02   | 2    | CI-02        | —              | N/A                   | e2e         | `npm run e2e`          | ❌ W0       | ⬜ pending |
| 06-02-02 | 02   | 2    | CI-01, CI-04 | —              | Pin action SHAs       | integration | `git push` triggers CI | ❌ W0       | ⬜ pending |
| 06-03-01 | 03   | 2    | CI-03, CI-08 | T-6-01, T-6-02 | npm audit, Dependabot | integration | `workflow_dispatch`    | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `test/e2e/websearch.e2e.ts` — covers CI-02 (WebSearch E2E)
- [ ] `test/e2e/webfetch.e2e.ts` — covers CI-02 (WebFetch E2E)
- [ ] `test/e2e/helpers.ts` — shared E2E utilities
- [ ] `eslint.config.js` — ESLint flat config
- [ ] `.prettierrc` — Prettier config
- [ ] `vitest.config.ts` — update with coverage thresholds + E2E exclusion
- [ ] `.github/workflows/ci.yml` — PR gate workflow
- [ ] `.github/workflows/cron.yml` — periodic workflow
- [ ] `.github/dependabot.yml` — Dependabot config
- [ ] `.mise.toml` — mise task definitions
- [ ] `build.ts` — fix jsdom external for webfetch entry point
- [ ] `package.json` — add lint/e2e/check scripts + new devDependencies

---

## Manual-Only Verifications

| Behavior                         | Requirement | Why Manual                      | Test Instructions                       |
| -------------------------------- | ----------- | ------------------------------- | --------------------------------------- |
| Dependabot creates automated PRs | CI-08       | Requires GitHub to run schedule | Check Dependabot tab after config merge |
| mise tasks mirror CI locally     | CI-07       | mise may not be installed       | Run `mise run check-all` if available   |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
