# Phase 4: Config File and Logging - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 4-Config File and Logging
**Areas discussed:** Config schema shape, Logging format, Config validation behavior

---

## Config Schema Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Nested objects | `{perplexity: {apiKey, model}, retry: {...}, logging: {...}}` | ✓ |
| Flat keys | `{apiKey, model, maxRetries, logLevel}` at root | |
| You decide | Let Claude pick | |

**User's choice:** Nested objects

| Section layout | Description | Selected |
|----------------|-------------|----------|
| perplexity / retry / logging | Three sections matching env var groupings | ✓ |
| apiKeys / perplexity / retry / logging | Split secrets from behavior | |
| perplexity / logging | Simpler — retry is Perplexity-specific | |

**User's choice:** perplexity / retry / logging

| Env var naming | Description | Selected |
|----------------|-------------|----------|
| Keep current env vars | `PPLX_API_KEY`, `RETRY_*`, `LOG_LEVEL` | |
| Prefixed env vars | `WEBSEARCH_*` prefix, consistent naming | ✓ |

**User's choice:** Prefixed env vars

| Backward compat | Description | Selected |
|-----------------|-------------|----------|
| New + old fallback | Check WEBSEARCH_* first, fall back to old names | |
| New names only | Only WEBSEARCH_* recognized, clean cut | ✓ |

**User's choice:** New names only — clean break, no backward compat

| Config path | Description | Selected |
|-------------|-------------|----------|
| Fixed path only | `~/.config/websearch/config.json`, no XDG | ✓ |
| XDG-aware | Respect `XDG_CONFIG_HOME` if set | |

**User's choice:** Fixed path only

---

## Logging Format

| Log format | Description | Selected |
|------------|-------------|----------|
| Keep minimal | `[level] message`, no format changes | |
| Add timestamps | ISO 8601 timestamp prefix | ✓ |
| Add module prefixes | `[debug:retry]` style prefixes | |

**User's choice:** Add timestamps

| Timestamp format | Description | Selected |
|------------------|-------------|----------|
| ISO 8601 | `[2026-05-20T14:45:00.123Z]` | ✓ |
| Local HH:MM:SS | `[14:45:00]` | |

**User's choice:** ISO 8601

| Module prefixes | Description | Selected |
|-----------------|-------------|----------|
| Yes, add prefixes | `[debug:retry]` alongside timestamps | ✓ |
| No prefixes | Timestamps only, context from message text | |

**User's choice:** Yes, add module prefixes alongside timestamps

---

## Config Validation Behavior

| Invalid values | Description | Selected |
|----------------|-------------|----------|
| Warn + defaults | Warn on stderr, use defaults, plugin works | ✓ |
| Fail hard | Exit with error, must fix config | |

**User's choice:** Warn + defaults

| Unknown keys | Description | Selected |
|--------------|-------------|----------|
| Ignore silently | Forward-compatible, no noise | |
| Warn on unknowns | Help catch typos | ✓ |

**User's choice:** Warn on unknowns

| Missing file | Description | Selected |
|--------------|-------------|----------|
| Silent, use defaults | No file is the common case | ✓ |
| Debug log | Log at debug level when no file found | |

**User's choice:** Silent, use defaults

---

## Claude's Discretion

- Exact Zod schema definitions for config validation
- Config file reading implementation (sync vs async)
- Default values for all config keys
- Logger module naming conventions
- Config module structure (single `loadConfig()` vs config object)
- Env var name formatting conventions

## Deferred Ideas

None — discussion stayed within phase scope.
