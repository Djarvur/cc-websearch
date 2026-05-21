# Requirements: cc-websearch

**Defined:** 2026-05-20
**Core Value:** Exact drop-in replacement for Claude Code's WebSearch and WebFetch — same interface, same output format, no behavior changes for the user.

## v1 Requirements

### Plugin Structure

- [x] **PLUG-01**: Plugin installs via `claude plugin add` with correct `.claude-plugin/plugin.json` manifest
- [x] **PLUG-02**: WebSearch skill defined in `skills/websearch/SKILL.md`, invokes script via `node "${CLAUDE_PLUGIN_ROOT}/scripts/websearch.cjs"` using Bash tool
- [x] **PLUG-03**: WebFetch skill defined in `skills/webfetch/SKILL.md`, invokes script via `node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.cjs"` using Bash tool
- [x] **PLUG-04**: Scripts accept JSON on stdin matching exact Claude Code tool schemas
- [x] **PLUG-05**: Scripts output results to stdout, errors and logs to stderr

### WebSearch

- [x] **SRCH-01**: Script accepts `{query: string (required, >= 2 chars), allowed_domains?: string[], blocked_domains?: string[]}`
- [x] **SRCH-02**: Script outputs `<search_results>` XML format with `<result>`, `<title>`, `<url>`, `<snippet>` tags matching Claude Code exactly
- [x] **SRCH-03**: `allowed_domains` and `blocked_domains` cannot be combined in same call — returns error if both provided
- [x] **SRCH-04**: DuckDuckGo Lite HTML is sole search provider — search results include citation URLs and `<snippet>` descriptions extracted from DDG result HTML
- [x] **SRCH-05**: DuckDuckGo Lite HTML scraping as fallback when Perplexity unavailable, no API key, or credits exhausted
- [x] **SRCH-06**: Domain filtering applied post-results for DDG, via `search_domain_filter` API param for Perplexity
- [x] **SRCH-07**: Exponential backoff with full jitter retry on rate limit (429) responses from either provider
- [x] **SRCH-08**: Two-tier fallback: Perplexity → DDG → fail cleanly with error message to stderr

### WebFetch

- [x] **FTEC-01**: Script accepts `{url: string (required), prompt: string (required)}`
- [x] **FTEC-02**: URL normalization: HTTP auto-upgraded to HTTPS
- [x] **FTEC-03**: HTML-to-Markdown conversion using Readability (content extraction) + Turndown (HTML→MD), with fallback to raw Turndown when Readability returns null
- [x] **FTEC-05**: Same-host redirects followed automatically; cross-host redirects return redirect metadata instead of following

### CI Pipeline

- [ ] **CI-01**: GitHub Actions PR gate workflow — runs on push/PR, installs deps, builds, runs lint, typecheck, unit tests with coverage
- [ ] **CI-02**: E2E test suite validates real plugin behavior — bundled scripts produce correct XML output against live DDG and web
- [ ] **CI-03**: Periodic cron workflow (weekly) runs npm audit and E2E tests against live services
- [ ] **CI-04**: CI fails on test failures, type errors, lint violations, coverage threshold drops — no silent passes
- [ ] **CI-05**: Local toolchain mirrors CI: ESLint flat config, Prettier formatting, mise task runner
- [ ] **CI-06**: Coverage thresholds enforced (80% statements, 70% branches, 80% functions)
- [ ] **CI-07**: mise task runner provides `mise run check-all` for local CI parity
- [ ] **CI-08**: Dependabot configured for npm and GitHub Actions ecosystem with weekly updates

### Config & Infrastructure

- [x] **CONF-01**: No API keys required — DDG is sole provider, zero-config setup
- [x] **CONF-02**: Config file at `~/.config/websearch/config.json` with env variable override (env > file > defaults)
- [x] **CONF-03**: Config file supports: retry params (max retries, base delay, max delay), log level
- [x] **CONF-04**: Configurable logging levels (debug, info, warn, error) output to stderr

## v2 Requirements

### Caching

- **CACH-01**: Optional result caching with configurable cache directory, disabled by default
- **CACH-02**: Cache TTL configurable per-provider (search results vs fetched pages)

### Developer Experience

- **DEVX-01**: CLI flags for testing outside Claude Code (`--query`, `--url`, `--prompt`, `--allowed-domains`, `--blocked-domains`)

## Out of Scope

| Feature                                    | Reason                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| MCP server implementation                  | Skills invoke CLI scripts directly — simpler, no transport layer needed                     |
| Additional search providers (Google, Bing) | Two-tier fallback covers use cases; adding providers is scope creep                         |
| Auto-following links from search results   | Violates WebSearch/WebFetch separation of concerns                                          |
| Raw content return from WebFetch           | Built-in WebFetch never returns raw content; breaking contract breaks Claude's expectations |
| Three-tier or deeper fallback chains       | Adds complexity without proportional value                                                  |
| Streaming results                          | Architecturally different from CLI script output; future consideration                      |
| Custom search backend configuration        | Increases testing burden and config complexity                                              |
| LLM summarization via Perplexity (FTEC-04) | removed Phase 5 — Perplexity summarization no longer needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| PLUG-01     | Phase 1 | Complete     |
| PLUG-02     | Phase 1 | Complete     |
| PLUG-03     | Phase 1 | Complete     |
| PLUG-04     | Phase 1 | Complete     |
| PLUG-05     | Phase 1 | Complete     |
| SRCH-01     | Phase 1 | Complete     |
| SRCH-02     | Phase 1 | Complete     |
| SRCH-03     | Phase 2 | Complete     |
| SRCH-04     | Phase 1 | Complete     |
| SRCH-05     | Phase 2 | Complete |
| SRCH-06     | Phase 2 | Complete     |
| SRCH-07     | Phase 2 | Complete |
| SRCH-08     | Phase 2 | Complete |
| FTEC-01     | Phase 3 | Complete     |
| FTEC-02     | Phase 3 | Complete     |
| FTEC-03     | Phase 3 | Complete     |
| FTEC-04     | Phase 3 | Complete     |
| FTEC-05     | Phase 3 | Complete     |
| CONF-01     | Phase 1 | Complete     |
| CONF-02     | Phase 4 | Complete     |
| CONF-03     | Phase 4 | Complete     |
| CONF-04     | Phase 1 | Complete     |
| CI-01      | Phase 6 | Complete |
| CI-02      | Phase 6 | Complete |
| CI-03      | Phase 6 | Complete |
| CI-04      | Phase 6 | Complete |
| CI-05      | Phase 6 | Complete |
| CI-06      | Phase 6 | Complete |
| CI-07      | Phase 6 | Complete |
| CI-08      | Phase 6 | Complete |

**Coverage:**

- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---

_Requirements defined: 2026-05-20_
_Last updated: 2026-05-20 after roadmap creation_
