---
phase: 02-search-resilience
plan: 02
subsystem: search
tags:
  [
    domain-filtering,
    subdomain-matching,
    mutual-exclusivity,
    perplexity-domain-filter,
    ddg-post-filter,
  ]

# Dependency graph
requires: [02-01]
provides:
  - Domain normalization with aggressive stripping (protocol, www, path, lowercase)
  - Subdomain-inclusive matching (github.com matches docs.github.com)
  - Strict allow/block domain filtering (empty results if all filtered)
  - Perplexity search_domain_filter API integration with -prefix for blocked domains
  - Mutual exclusivity validation (allowed+blocked rejected with error)
  - DDG post-result domain filtering
  - Perplexity safety-net post-filtering for blocked domains
affects: [02-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [domain-normalization, subdomain-matching, perplexity-domain-filter-api, strict-filtering]

key-files:
  created:
    - src/lib/filter.ts
    - test/filter.test.ts
  modified:
    - src/lib/input.ts
    - src/websearch.ts
    - scripts/websearch.js
    - test/input.test.ts
    - test/websearch.test.ts
    - test/io-separation.test.ts

key-decisions:
  - 'filterByDomains returns original array when no filters specified (no-copy optimization)'
  - 'Perplexity results get post-filter safety net only for blocked_domains, not allowed_domains (API handles allowed reliably)'
  - 'buildPerplexityDomainFilter returns undefined for empty arrays, triggering no API parameter'

patterns-established:
  - 'Domain filter pattern: normalizeDomain -> matchesDomain (subdomain-inclusive) -> filterByDomains (strict)'
  - 'Perplexity domain filter pattern: buildPerplexityDomainFilter produces [-domain] for blocked, [domain] for allowed, undefined for none'
  - 'Mutual exclusivity pattern: validateDomainExclusivity throws before provider dispatch, caught by main() error handler'

requirements-completed: [SRCH-03, SRCH-06]

# Metrics
duration: 6min
completed: 2026-05-20
---

# Phase 2 Plan 02: Domain Filtering Summary

**Domain normalization, subdomain-inclusive matching, Perplexity API native domain filtering, DDG post-result filtering, mutual exclusivity validation, and 109 passing tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-20T09:27:38Z
- **Completed:** 2026-05-20T09:34:15Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Domain filter module (src/lib/filter.ts) with normalizeDomain, matchesDomain, filterByDomains, buildPerplexityDomainFilter
- Aggressive domain normalization: strips protocol, www prefix, path, trailing slash, lowercases (D-13)
- Subdomain-inclusive matching: github.com matches docs.github.com, api.github.com (D-11)
- Strict filtering: returns empty array when all results filtered out, no soft fallback (D-12)
- Perplexity search_domain_filter integration: allowed domains as-is, blocked with -prefix (D-10, D-14)
- buildPerplexityDomainFilter caps at 20 domains per Perplexity API limit
- Mutual exclusivity validation: throws when both allowed_domains and blocked_domains provided (SRCH-03)
- DDG results post-filtered with subdomain-inclusive matching in both fallback and primary paths (SRCH-06)
- Perplexity results safety-net filtered for blocked domains
- Full TDD cycle: RED commits before GREEN commits for both tasks
- Total test suite: 109 passing (68 prior + 41 new)

## Task Commits

Each task committed atomically with TDD RED/GREEN separation:

1. **Task 1 RED: Domain filter and exclusivity validation tests** - `560b445` (test)
2. **Task 1 GREEN: Domain filter module and validation implementation** - `e2cde0c` (feat)
3. **Task 2 RED: Domain filtering integration tests in websearch** - `bd44275` (test)
4. **Task 2 GREEN: Wire domain filtering into websearch fallback chain** - `f2b8643` (feat)

## Files Created/Modified

- `src/lib/filter.ts` - Domain normalization, subdomain matching, allow/block filtering, Perplexity filter builder
- `src/lib/input.ts` - Added validateDomainExclusivity function for mutual exclusivity check
- `src/websearch.ts` - Wired domain filtering: validateDomainExclusivity, buildPerplexityDomainFilter, filterByDomains
- `scripts/websearch.js` - Rebuilt esbuild bundle
- `test/filter.test.ts` - 28 tests for normalizeDomain, matchesDomain, filterByDomains, buildPerplexityDomainFilter
- `test/input.test.ts` - 6 tests for validateDomainExclusivity
- `test/websearch.test.ts` - 7 new tests for domain filtering integration (12 total)
- `test/io-separation.test.ts` - Updated mocks for validateDomainExclusivity and filter.js imports

## Decisions Made

- filterByDomains returns the original array when no filters specified (no-copy optimization) -- since the function is called on every request including those without domain filters
- Perplexity results get post-filter safety net only for blocked_domains, not allowed_domains -- the API handles allowed_domains reliably per documentation, so no safety net needed
- buildPerplexityDomainFilter returns undefined for empty arrays -- triggers no search_domain_filter parameter on the API call

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated io-separation test mocks for new module imports**

- **Found during:** Task 2 GREEN phase
- **Issue:** io-separation.test.ts failed because websearch.ts now imports validateDomainExclusivity from input.js and filter.js -- both needed to be added to the vi.mock() declarations
- **Fix:** Added validateDomainExclusivity mock to input.js mock and created filter.js mock in io-separation.test.ts
- **Files modified:** test/io-separation.test.ts
- **Commit:** f2b8643

## Issues Encountered

None beyond auto-fixed issues above.

## Next Phase Readiness

- Domain filtering fully integrated into Perplexity and DDG paths
- Mutual exclusivity validation prevents API misuse (SRCH-03)
- Perplexity API receives search_domain_filter natively for both allowed and blocked modes
- DDG results filtered post-retrieval with subdomain matching (D-11)
- Phase 2 Plan 03 can add partial result merging and detailed error message polish

## Self-Check: PASSED

All 8 files verified present. All 4 commits verified in git log. Full test suite: 109 passed.

---

_Phase: 02-search-resilience_
_Completed: 2026-05-20_
