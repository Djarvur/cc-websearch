# Phase 4: Config File and Logging - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Config file loader at `~/.config/websearch/config.json` with nested JSON schema ({perplexity, retry, logging}), env > file > defaults precedence, wired into existing modules (logger, retry, perplexity). Logger enhanced with ISO 8601 timestamps and module prefixes. Prefixed env vars (`WEBSEARCH_*`) replace current unprefixed vars — no backward compat. All env var references in existing code must be updated.

</domain>

<decisions>
## Implementation Decisions

### Config Schema Structure

- **D-01:** Nested JSON objects with three sections: `perplexity` (apiKey, model), `retry` (maxRetries, baseDelay, maxDelay, timeout), `logging` (level).
- **D-02:** Prefixed env vars only — `WEBSEARCH_PERPLEXITY_API_KEY`, `WEBSEARCH_PERPLEXITY_MODEL`, `WEBSEARCH_RETRY_MAX_RETRIES`, `WEBSEARCH_RETRY_BASE_DELAY`, `WEBSEARCH_RETRY_MAX_DELAY`, `WEBSEARCH_RETRY_TIMEOUT`, `WEBSEARCH_LOGGING_LEVEL`. No backward compat with old env var names (`PPLX_API_KEY`, `RETRY_*`, `LOG_LEVEL`).
- **D-03:** Fixed config path `~/.config/websearch/config.json`. No XDG_CONFIG_HOME resolution.

### Config Precedence

- **D-04:** Precedence: env vars > config file > hardcoded defaults. Each setting resolved independently — env can override some keys while file provides others.
- **D-05:** Missing config file: silent, use defaults. No warning, no debug log. No file is the common case.

### Config Validation

- **D-06:** Invalid values: warn on stderr, use hardcoded defaults. Plugin continues working. E.g. `[warn] Invalid log level "verbose", using "info"`.
- **D-07:** Unknown config keys: warn on stderr. Helps catch typos. E.g. `[warn] Unknown config key "caching"`.

### Logging Format

- **D-08:** Add ISO 8601 timestamps to all log output: `[2026-05-20T14:45:00.123Z] [level] message`.
- **D-09:** Add module prefixes: `[timestamp] [level:module] message`. Modules: `config`, `retry`, `perplexity`, `ddg`, `fetch`, `content`, `filter`, `input`, `output`.
- **D-10:** Logger receives module name at initialization — each module creates its own scoped logger instance.

### Claude's Discretion

- Exact Zod schema definitions for config validation
- Config file reading implementation (sync vs async)
- Default values for all config keys
- Logger module naming conventions
- How config module is structured (single `loadConfig()` function vs config object)
- Env var name formatting conventions (e.g., `WEBSEARCH_PERPLEXITY_API_KEY` vs `WEBSEARCH_PERPLEXITY_APIKEY`)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level

- `CLAUDE.md` — Locked technology stack: Zod for schema validation, TypeScript/Node runtime, esbuild bundling. Contains version constraints.
- `.planning/PROJECT.md` — Core value, requirements (CONF-02, CONF-03), constraints
- `.planning/REQUIREMENTS.md` — Phase 4 requirements: CONF-02 (config file with env override), CONF-03 (config supports API keys, retry params, model, log level)
- `.planning/ROADMAP.md` — Phase 4 goal, 3 success criteria, plan breakdown

### Prior Phase Context

- `.planning/phases/01-plugin-foundation-and-primary-search/01-CONTEXT.md` — Distribution strategy, Perplexity integration, output format
- `.planning/phases/02-search-resilience/02-CONTEXT.md` — Retry logic (D-06/07/08/09), retry env vars, provider comment output (D-15), error messages (D-19). D-08 explicitly deferred config file support to Phase 4.
- `.planning/phases/03-webfetch-content-pipeline/03-CONTEXT.md` — Perplexity summarization, model reuse, content pipeline

### Source Files to Refactor

- `src/lib/logger.ts` — Current logger reads `LOG_LEVEL` env var. Must update to read from config with module prefix support.
- `src/lib/retry.ts` — `getRetryConfig()` reads `RETRY_*` env vars. Must update to read from config.
- `src/lib/perplexity.ts` — `getApiKey()` and model selection read `PPLX_*` env vars. Must update to read from config.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/lib/logger.ts` — Logger with level-based stderr output. Refactor to accept module name and add timestamps. Current format: `[level] message`.
- `src/lib/retry.ts` — `RetryConfig` interface and `getRetryConfig()` function. Refactor to read from config instead of raw env vars. Current defaults: maxRetries=4, baseDelay=1000, maxDelay=16000, timeout=30000.
- `src/lib/perplexity.ts` — `getApiKey()` and model selection. Refactor to read from config. Current env vars: `PPLX_API_KEY`, `PERPLEXITY_API_KEY`, `PPLX_MODEL`.
- Zod already in dependencies for input schema validation — reuse for config validation.

### Established Patterns

- Pre-compiled esbuild bundles in `scripts/` directory
- All output to stdout, all errors/logging to stderr
- Zod schema validation on stdin input — same pattern applies to config file

### Integration Points

- New module: `src/lib/config.ts` — config file reader, schema validation, precedence resolution
- `src/lib/logger.ts` — refactor to accept module name, add timestamp/prefix format, read level from config
- `src/lib/retry.ts` — refactor `getRetryConfig()` to read from config
- `src/lib/perplexity.ts` — refactor `getApiKey()` and model to read from config
- `src/websearch.ts` and `src/webfetch.ts` — may need config initialization at entry point

</code_context>

<specifics>
## Specific Ideas

No specific references or examples — implementation follows requirements and captured decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 4-Config File and Logging_
_Context gathered: 2026-05-20_
