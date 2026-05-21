---
phase: "05-ddg-only-with-citations"
plans: 2
tags: [duck-duck-scrape, ddg, xml-output, snippet, citation, vitest, esbuild, ddg-only, test-cleanup]
requires: [02-search-resilience, 03-webfetch-content-pipeline]
provides:
  - DDG-only search with citation snippets (description field in XML output)
  - Single-provider DDG flow with no API keys required
  - Simplified config without Perplexity section
  - WebFetch as pure fetch-extract-markdown pipeline without summarization
  - Rebuilt bundles with ~4700 lines of Perplexity SDK code removed
affects: [06-ci-pipeline-and-e2e-tests]
tech-stack:
  added: []
  patterns:
    - snippet extraction via regex HTML stripping
    - single-provider search flow
    - bundle rebuild verification after dependency removal
key-files:
  created: []
  modified:
    - src/types.ts
    - src/lib/duckduckgo.ts
    - src/lib/output.ts
    - src/lib/config.ts
    - src/lib/retry.ts
    - src/lib/filter.ts
    - src/websearch.ts
    - src/webfetch.ts
    - package.json
    - scripts/websearch.js
    - scripts/webfetch.js
    - test/duckduckgo.test.ts
    - test/output.test.ts
    - test/config.test.ts
    - test/retry.test.ts
    - test/filter.test.ts
    - test/websearch.test.ts
    - test/webfetch.test.ts
    - test/io-separation.test.ts
  deleted:
    - src/lib/perplexity.ts
    - test/perplexity.test.ts
key-decisions:
  - "DDG-only with citation snippets after removing Perplexity from source, config, tests, and dependencies"
  - "Snippet extraction via HTML tag stripping for DDG bold highlights (replace(/<[^>]*>/g, ''))"
  - "SearchResult.snippet: optional string, always emitted in XML even when empty"
  - "Bundle rebuild removes ~4700 lines of Perplexity SDK dead code"
  - "WebFetch simplified to pure fetch-extract-markdown pipeline with no retry or summarization"
requirements-completed: [SRCH-01, SRCH-04]
duration: 13min
completed: "2026-05-21"
---

# Phase 05: DDG-Only with Citations Summary

**Complete Perplexity removal: DDG-only search with citation snippets, zero-API-key operation, simplified config, and 127 passing tests with rebuilt bundles**

## Performance

- **Duration:** 13 min (2 plans)
- **Completed:** 2026-05-21
- **Total plans executed:** 2

## Accomplishments

- Added snippet extraction from DDG description field with HTML tag stripping for bold highlights
- Removed all Perplexity code: source (src/lib/perplexity.ts), tests (test/perplexity.test.ts), config (perplexity section), dependencies (@perplexity-ai/perplexity_ai), and filters (buildPerplexityDomainFilter)
- Plugin now works with zero API keys using DDG as sole search provider
- WebFetch simplified to pure fetch-extract-markdown pipeline with no LLM summarization or retry wrapping
- Rebuilt esbuild bundles removing ~4700 lines of dead Perplexity SDK code
- 127 tests passing across 13 test files, zero Perplexity references remaining

## Key Decisions

- Stripped HTML tags from DDG descriptions using `replace(/<[^>]*>/g, '')` since DDG uses `<b>` tags for bold highlights
- formatSearchResults signature changed to single parameter (no provider arg) since Perplexity comments no longer needed
- buildPerplexityDomainFilter removed from filter.ts as dead code cleanup
- SearchResult.snippet emitted as optional string in XML, always present even when empty

## Next Phase Readiness

- DDG-only plugin ready for CI pipeline setup in Phase 6
- Full test suite green at 127 tests
- No external services or API keys required for core functionality
