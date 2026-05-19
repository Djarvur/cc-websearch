# Phase 1: Plugin Foundation and Primary Search - Research

**Researched:** 2026-05-20
**Domain:** Claude Code plugin system, Perplexity Sonar API, esbuild bundling
**Confidence:** HIGH

## Summary

Phase 1 creates an installable Claude Code plugin that provides a Perplexity-powered WebSearch skill. The plugin registers two skills (WebSearch active, WebFetch stub) via standard plugin directory structure. Each skill's SKILL.md tells Claude Code to invoke a Node.js script via the Bash tool, passing JSON on stdin and receiving XML results on stdout. Scripts are pre-compiled with esbuild into standalone bundles committed to the repo, eliminating runtime dependency installation.

The Claude Code plugin system uses a `.claude-plugin/plugin.json` manifest at the plugin root, with skills organized as `skills/<name>/SKILL.md` directories. Skills are auto-discovered when the plugin is installed. The `${CLAUDE_PLUGIN_ROOT}` variable provides the absolute path to the plugin installation directory for referencing bundled scripts. The Perplexity Sonar Chat Completions API (`POST /v1/sonar`) returns an OpenAI-compatible response with a `citations` array (URLs) and `search_results` array (with title, url, snippet, date fields). The official SDK is `@perplexity-ai/perplexity_ai` v0.29.0 (NOT v2.x as stated in CLAUDE.md).

**Primary recommendation:** Use the standard plugin layout with `skills/websearch/SKILL.md` and `skills/webfetch/SKILL.md`, each instructing Claude to run `node "${CLAUDE_PLUGIN_ROOT}/scripts/websearch.js"` via the Bash tool. Bundle all TypeScript into standalone JS files with esbuild.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pre-compiled bundles via esbuild -- each script compiled to a single `.js` file in `scripts/`. Zero runtime dependencies, no npm install hook needed.
- **D-02:** Compiled bundles committed to the repo. Plugin install is instant -- no build step at install time.
- **D-03:** Dev workflow: skill definitions always reference `scripts/*.js`. Edit `src/*.ts`, run esbuild to rebuild, test. No hot-reload in skills.
- **D-04:** Model is configurable via `PPLX_MODEL` env var (and future config file), defaults to `sonar`.
- **D-05:** Return all available citations from Perplexity response (typically 5-10 results). Let the model decide relevance.
- **D-06:** Exact output format deferred to research -- researcher must examine Claude Code's actual WebSearch output to determine the precise format.
- **D-07:** WebFetch skill registered in Phase 1 as a stub. Both WebSearch and WebFetch SKILL.md files created. WebFetch script returns a clear "not yet implemented" message.

### Claude's Discretion
- Error message verbosity -- balance between helpful debugging info and clean output
- Logging approach for CONF-04 -- simple level-prefixed stderr logging, no external logger library (keep bundles small)
- SessionStart hook -- not needed in Phase 1 with pre-compiled bundles; may add in Phase 4 if caching requires lifecycle hooks
- Directory structure -- follow Claude Code plugin conventions; researcher/planner determine exact layout

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLUG-01 | Plugin installs via `claude plugin add` with correct `.claude-plugin/plugin.json` manifest | Plugin manifest schema documented below -- only `name` field required |
| PLUG-02 | WebSearch skill defined in `skills/websearch/SKILL.md`, invokes script via `node` using Bash tool | Skills documentation and SKILL.md format documented below |
| PLUG-03 | WebFetch skill defined in `skills/webfetch/SKILL.md`, invokes script via `node` using Bash tool | Same pattern as PLUG-02; stub returns "not yet implemented" per D-07 |
| PLUG-04 | Scripts accept JSON on stdin matching exact Claude Code tool schemas | WebSearch input schema: `{query, allowed_domains?, blocked_domains?}` validated with Zod |
| PLUG-05 | Scripts output results to stdout, errors and logs to stderr | stdout/stderr separation pattern documented below |
| CONF-01 | API keys read from environment variables (`PPLX_API_KEY`, etc.) as primary config source | **IMPORTANT:** Official SDK uses `PERPLEXITY_API_KEY` -- discrepancy with REQUIREMENTS.md flagged |
| CONF-04 | Configurable logging levels (debug, info, warn, error) output to stderr | Simple level-prefixed stderr logging per discretion |
| SRCH-01 | Script accepts `{query: string (required, >= 2 chars), allowed_domains?: string[], blocked_domains?: string[]}` | Zod schema for validation documented below |
| SRCH-02 | Script outputs `<search_results>` XML format with `<result>`, `<title>`, `<url>` tags matching Claude Code exactly | Claude Code WebSearch output format analyzed below |
| SRCH-04 | Perplexity Chat Completions API as primary search provider -- extracts results from response citations and content | Perplexity Sonar API documented below with full request/response schema |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Plugin manifest and discovery | Plugin filesystem | -- | Claude Code owns plugin loading; plugin provides standard directory layout |
| Skill invocation | Claude Code runtime | -- | Claude Code reads SKILL.md and decides when to invoke skills |
| Script execution (WebSearch) | Node.js CLI process | -- | Script runs as standalone process, reads stdin, writes stdout/stderr |
| Perplexity API call | External API (Perplexity) | -- | Network call to api.perplexity.ai; no local processing of search |
| Input validation | Node.js CLI process | -- | Zod validates JSON stdin before any processing |
| Output formatting | Node.js CLI process | -- | Script formats Perplexity response into Claude Code's XML format |
| Error handling | Node.js CLI process | -- | Errors to stderr, results to stdout |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@perplexity-ai/perplexity_ai` | 0.29.0 | Perplexity API client | Official TypeScript SDK. Provides typed responses with `citations` and `search_results` arrays. Auto-reads `PERPLEXITY_API_KEY` env var. [VERIFIED: npm registry] |
| `zod` | 4.4.3 | Schema validation | Validates JSON stdin input matching Claude Code's WebSearch tool schema. Runtime type checking with TypeScript inference. [VERIFIED: npm registry] |
| `commander` | 14.0.3 | CLI argument parsing | De facto standard for Node CLI apps. Supports flags for dev-time testing (`--query`). [VERIFIED: npm registry] |
| `esbuild` | 0.28.0 | Production bundling | Bundles TypeScript into standalone JS. `--platform=node --bundle` produces single files with zero runtime deps. [VERIFIED: npm registry] |
| `typescript` | 5.x | Language | Type safety for API response handling, config validation, input parsing. [ASSUMED] |
| `vitest` | 4.1.6 | Testing framework | Fast, ESM-native, TypeScript-first testing. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tsx` | 4.x | Dev-time TypeScript execution | Run `.ts` files directly during development with `npx tsx script.ts`. [ASSUMED] |
| `@types/node` | 22.x | Node.js type definitions | TypeScript type checking for Node.js APIs (fs, process, etc.). [ASSUMED] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@perplexity-ai/perplexity_ai` SDK | Raw `fetch` to `/v1/sonar` | SDK provides typed responses, auto auth, retries. Raw fetch is simpler but loses type safety. Decision locked (D-01): use SDK, bundle with esbuild. |
| Pre-compiled bundles | SessionStart hook + npm install | Bundles are instant at install time. Hooks add latency and failure points. Decision locked (D-01, D-02). |

**Installation (dev dependencies):**
```bash
npm install --save-dev typescript @types/node tsx vitest esbuild
npm install @perplexity-ai/perplexity_ai zod commander
```

**Version verification (2026-05-20):**
```
@perplexity-ai/perplexity_ai: 0.29.0  (NOT 2.x as stated in CLAUDE.md)
zod:                           4.4.3   (NOT 3.x as stated in CLAUDE.md)
commander:                     14.0.3  (NOT 13.x as stated in CLAUDE.md)
esbuild:                       0.28.0
vitest:                        4.1.6
```

**CRITICAL VERSION DISCREPANCIES:** CLAUDE.md lists `@perplexity-ai/perplexity_ai` as 2.x, `zod` as 3.x, and `commander` as 13.x. The actual current versions are 0.29.0, 4.4.3, and 14.0.3 respectively. The planner and executor must use the verified npm registry versions, not the CLAUDE.md versions.

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages marked [ASSUMED].

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@perplexity-ai/perplexity_ai` | npm | ~2 yrs | Moderate | github.com/perplexityai/perplexity-node | N/A | [ASSUMED] -- official Perplexity SDK, verified repo URL |
| `zod` | npm | ~5 yrs | 40M+/wk | github.com/colinhacks/zod | N/A | [ASSUMED] -- ecosystem standard, verified repo URL |
| `commander` | npm | ~10 yrs | 30M+/wk | github.com/tj/commander.js | N/A | [ASSUMED] -- de facto CLI standard, verified repo URL |
| `esbuild` | npm | ~5 yrs | 30M+/wk | github.com/evanw/esbuild | N/A | [ASSUMED] -- industry standard bundler, verified repo URL |
| `vitest` | npm | ~4 yrs | 15M+/wk | github.com/vitest-dev/vitest | N/A | [ASSUMED] -- standard TS test framework, verified repo URL |

**Postinstall scripts found:**
- `esbuild`: runs `node install.js` -- this is esbuild's platform-specific binary download script. Standard and expected. Not flagged.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages are marked [ASSUMED] because slopcheck was unavailable. The planner should gate each install behind a `checkpoint:human-verify` task.*

## Architecture Patterns

### System Architecture Diagram

```
User prompt in Claude Code
         |
         v
Claude Code runtime reads SKILL.md descriptions
         |
         v (decides to invoke WebSearch)
         |
Bash tool: node "${CLAUDE_PLUGIN_ROOT}/scripts/websearch.js"
         |
         v
websearch.js reads JSON from stdin
         |
         v
Zod validates {query, allowed_domains?, blocked_domains?}
         |
         v
Perplexity Sonar API: POST /v1/sonar
  - Authorization: Bearer ${PERPLEXITY_API_KEY}
  - model: ${PPLX_MODEL:-sonar}
  - messages: [{role: "user", content: query}]
  - search_domain_filter: allowed_domains || blocked_domains
         |
         v
Perplexity Response:
  - citations: string[] (URLs)
  - search_results: [{title, url, snippet, date}]
  - choices[0].message.content (answer text)
         |
         v
Extract title+URL pairs from citations + search_results
         |
         v
Format as <search_results> XML to stdout
         |
         v
Claude Code receives XML as Bash tool output
```

### Recommended Project Structure

```
cc-websearch/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (only required field: "name")
├── skills/
│   ├── websearch/
│   │   └── SKILL.md             # WebSearch skill definition
│   └── webfetch/
│       └── SKILL.md             # WebFetch skill definition (stub)
├── scripts/
│   ├── websearch.js             # Pre-compiled bundle (committed to repo)
│   └── webfetch.js              # Pre-compiled stub bundle
├── src/
│   ├── websearch.ts             # WebSearch entry point
│   ├── webfetch.ts              # WebFetch stub entry point
│   ├── lib/
│   │   ├── input.ts             # Zod schemas, stdin reader
│   │   ├── output.ts            # <search_results> XML formatter
│   │   ├── logger.ts            # Level-prefixed stderr logger
│   │   └── perplexity.ts        # Perplexity API client wrapper
│   └── types.ts                 # Shared TypeScript types
├── test/
│   ├── websearch.test.ts        # WebSearch integration tests
│   ├── input.test.ts            # Input validation tests
│   └── output.test.ts           # Output formatting tests
├── package.json                 # Dependencies (dev + runtime)
├── tsconfig.json                # TypeScript config
├── build.ts                     # esbuild build script
└── vitest.config.ts             # Test config
```

### Pattern 1: Skill Invokes Script via Bash

**What:** SKILL.md instructs Claude to run a Node.js script via the Bash tool, passing JSON on stdin.
**When to use:** Every skill that needs programmatic execution (both WebSearch and WebFetch).
**Example:**

```markdown
---
description: Search the web using Perplexity API. Use when you need to find current information, look up facts, or discover web pages.
allowed-tools: Bash(node *)
---

# WebSearch

Run this command to search the web:

!`echo '{"query":"$ARGUMENTS"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/websearch.js"`

The script reads JSON from stdin and outputs search results as XML to stdout.
```

Source: [CITED: code.claude.com/docs/en/skills] -- Skills documentation shows `!`command`` syntax for dynamic context injection and `${CLAUDE_PLUGIN_ROOT}` for referencing plugin files.

### Pattern 2: Stdin/stdout Protocol

**What:** Scripts read JSON input from stdin, write results to stdout, write errors/logs to stderr.
**When to use:** All CLI scripts that Claude Code invokes via Bash.
**Example:**

```typescript
// Read JSON from stdin
const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));

// Validate with Zod
const parsed = WebSearchInputSchema.parse(input);

// Log to stderr (never stdout)
process.stderr.write('[info] Searching for: ' + parsed.query + '\n');

// Write results to stdout
process.stdout.write(formatSearchResults(results));
```

### Pattern 3: esbuild Bundling for Standalone Scripts

**What:** Bundle each TypeScript entry point into a single JS file with all dependencies inlined.
**When to use:** Production build for distribution. All scripts must be self-contained.
**Example:**

```typescript
// build.ts
import { build } from 'esbuild';

const entryPoints = [
  { in: 'src/websearch.ts', out: 'websearch' },
  { in: 'src/webfetch.ts', out: 'webfetch' },
];

for (const entry of entryPoints) {
  build({
    entryPoints: [entry.in],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: `scripts/${entry.out}.js`,
    // Mark node built-ins as external (not needed, esbuild handles this with platform: node)
    banner: { js: '#!/usr/bin/env node' },
  });
}
```

Source: [CITED: esbuild.github.io/getting-started] -- Official esbuild docs recommend `--platform=node --bundle` for Node.js scripts.

### Anti-Patterns to Avoid

- **Putting skills/ inside .claude-plugin/:** The official docs explicitly state "All other directories (commands/, agents/, skills/, ...) must be at the plugin root, not inside .claude-plugin/." This is a common mistake that causes skills not to appear.
- **Writing logs to stdout:** Any stderr output will contaminate the XML result that Claude Code reads. All diagnostic output must go to stderr.
- **Using absolute paths in plugin.json:** All paths in the manifest must be relative and start with `./`. Use `${CLAUDE_PLUGIN_ROOT}` in runtime references (hooks, MCP configs), not in manifest paths.
- **Referencing `${CLAUDE_SKILL_DIR}` for scripts:** Use `${CLAUDE_PLUGIN_ROOT}/scripts/` instead. `${CLAUDE_SKILL_DIR}` points to the skill's own directory (e.g., `skills/websearch/`), not the plugin root.
- **Using the wrong env var name for Perplexity API key:** The official SDK reads `PERPLEXITY_API_KEY`, not `PPLX_API_KEY`. REQUIREMENTS.md uses `PPLX_API_KEY` which will NOT work with the SDK's auto-detection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Perplexity API authentication | Manual `Authorization` header management | `@perplexity-ai/perplexity_ai` SDK constructor | SDK auto-reads `PERPLEXITY_API_KEY`, provides typed responses, built-in retry/error handling |
| Input validation | Manual JSON.parse + type checks | `zod` schema with `.parse()` | Zod provides clear error messages, TypeScript inference, and runtime type safety |
| CLI argument parsing | Raw `process.argv` splitting | `commander` with `.parseAsync()` | Handles quoted args, variadic params, help text, edge cases |
| XML output formatting | String concatenation with manual escaping | Template literal function with XML entity escaping | Must escape `&`, `<`, `>`, `"` in titles/URLs to produce valid XML |

**Key insight:** The esbuild bundle inlines all dependencies, so using the SDK does not add runtime install complexity. The bundle is a single file with everything included.

## Common Pitfalls

### Pitfall 1: Skills Directory Inside .claude-plugin/
**What goes wrong:** Plugin loads but skills never appear. No error message.
**Why it happens:** The official docs are clear that skills/, commands/, agents/ must be at the plugin root, not inside .claude-plugin/. Only plugin.json belongs in .claude-plugin/.
**How to avoid:** Structure: `plugin-root/.claude-plugin/plugin.json` + `plugin-root/skills/websearch/SKILL.md`.
**Warning signs:** `claude --debug` shows "loading plugin" but no skill registration. `claude plugin details` shows 0 skills.

### Pitfall 2: SKILL.md Description Too Long or Wrapping
**What goes wrong:** Skill is silently ignored by Claude Code.
**Why it happens:** A known bug (anthropics/claude-code#9817) where Prettier-wrapped multi-line descriptions cause skill discovery to fail silently.
**How to avoid:** Keep description as a single line. Keep combined `description` + `when_to_use` under 1,536 characters.
**Warning signs:** Skill appears in file system but not in `/skill-name` autocomplete.

### Pitfall 3: Perplexity API Key Not Found
**What goes wrong:** Script crashes with authentication error despite API key being set.
**Why it happens:** REQUIREMENTS.md specifies `PPLX_API_KEY` but the official Perplexity SDK reads `PERPLEXITY_API_KEY`. The SDK's constructor defaults to `PERPLEXITY_API_KEY`.
**How to avoid:** Support both env var names: read `PPLX_API_KEY` first (for backward compat with REQUIREMENTS.md), fall back to `PERPLEXITY_API_KEY` (for SDK compat), or pass the key explicitly to the SDK constructor. The planner must decide which takes precedence.
**Warning signs:** "Missing API key" error even when `PPLX_API_KEY` is set.

### Pitfall 4: esbuild Bundle Size Blow-up
**What goes wrong:** Bundled scripts are unexpectedly large (multi-MB).
**Why it happens:** The Perplexity SDK includes streaming support, error classes, and type definitions that may pull in more than expected.
**How to avoid:** Use esbuild's `--tree-shaking=true` (default with bundle), verify bundle size after build, consider `--minify` for production. Target should be small (<500KB per script).
**Warning signs:** Bundle exceeds 1MB; slow script startup time.

### Pitfall 5: stdout/stderr Cross-Contamination
**What goes wrong:** Claude Code receives garbled output mixing XML results with log messages.
**Why it happens:** `console.log()` writes to stdout. Any debug/info output using `console.log` will corrupt the XML result.
**How to avoid:** Create a logger that exclusively writes to stderr. Use `process.stderr.write()` or a custom logger function. Never use `console.log()` anywhere in the scripts.
**Warning signs:** Claude Code fails to parse XML results; "unexpected token" errors.

### Pitfall 6: Missing `#!/usr/bin/env node` Shebang in Bundled Scripts
**What goes wrong:** Scripts fail to execute with "no such file or directory" or use wrong interpreter.
**Why it happens:** esbuild does not add shebangs by default. Without it, the OS may not know to use Node.js.
**How to avoid:** Add esbuild `banner: { js: '#!/usr/bin/env node' }` to the build config. This is less critical since Claude Code invokes scripts explicitly via `node script.js`, but good practice for dev-time testing.
**Warning signs:** Works via `node script.js` but fails when invoked directly.

## Code Examples

### Plugin Manifest (.claude-plugin/plugin.json)

```json
{
  "name": "cc-websearch",
  "displayName": "WebSearch",
  "version": "0.1.0",
  "description": "Perplexity-powered WebSearch and WebFetch replacement for Claude Code",
  "repository": "https://github.com/daniel-podolsky/cc-websearch"
}
```

Source: [CITED: code.claude.com/docs/en/plugins-reference] -- Only `name` is required. Added `version` per best practices for explicit versioning.

### WebSearch SKILL.md

```markdown
---
description: Search the web using Perplexity AI. Use this skill when the user needs current information, web search results, or to find web pages about a topic.
allowed-tools: Bash(node *)
---

# WebSearch

Execute a web search by piping JSON input to the search script.

## Usage

Run the search script with the query as JSON stdin:

```bash
echo '{"query":"SEARCH_TERMS"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/websearch.js"
```

The script accepts JSON on stdin with this schema:
- `query` (string, required, minimum 2 characters): The search query
- `allowed_domains` (string[], optional): Only return results from these domains
- `blocked_domains` (string[], optional): Exclude results from these domains

The script outputs `<search_results>` XML to stdout with title and URL for each result.
Errors and diagnostic messages are written to stderr.

Always use the search results to inform your response. Include source URLs when citing information.
```

Source: [CITED: code.claude.com/docs/en/skills] -- SKILL.md format with YAML frontmatter.

### WebFetch SKILL.md (Stub)

```markdown
---
description: Fetch and summarize web page content. Use this skill when the user provides a URL and asks about its content.
allowed-tools: Bash(node *)
---

# WebFetch (Not Yet Implemented)

This skill is a placeholder. WebFetch functionality will be added in a future update.

Run the stub script:

```bash
echo '{"url":"URL","prompt":"QUESTION"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.js"
```

The script will return a message indicating this feature is not yet available.
```

### Zod Input Schema

```typescript
// src/lib/input.ts
import { z } from 'zod';

export const WebSearchInputSchema = z.object({
  query: z.string().min(2, 'Query must be at least 2 characters'),
  allowed_domains: z.array(z.string()).optional(),
  blocked_domains: z.array(z.string()).optional(),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

// Read and validate JSON from stdin
export async function readStdin<T>(schema: z.ZodType<T>): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}
```

### Search Results XML Formatter

```typescript
// src/lib/output.ts
export interface SearchResult {
  title: string;
  url: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatSearchResults(results: SearchResult[]): string {
  const lines: string[] = ['<search_results>'];
  for (const result of results) {
    lines.push('  <result>');
    lines.push(`    <title>${escapeXml(result.title)}</title>`);
    lines.push(`    <url>${escapeXml(result.url)}</url>`);
    lines.push('  </result>');
  }
  lines.push('</search_results>');
  return lines.join('\n');
}
```

Source: [ASSUMED] -- The exact XML format is inferred from Claude Code's behavior analysis (mikhail.io article) and REQUIREMENTS.md. The format uses `<search_results>` with `<result>`, `<title>`, `<url>` tags as specified in SRCH-02.

### Perplexity API Client Wrapper

```typescript
// src/lib/perplexity.ts
import Perplexity from '@perplexity-ai/perplexity_ai';

const client = new Perplexity({
  apiKey: process.env.PPLX_API_KEY || process.env.PERPLEXITY_API_KEY,
});

export async function search(query: string, model?: string): Promise<{
  citations: string[];
  search_results: Array<{ title: string; url: string; snippet: string }>;
  content: string;
}> {
  const response = await client.chat.completions.create({
    model: model || process.env.PPLX_MODEL || 'sonar',
    messages: [{ role: 'user', content: query }],
  });

  return {
    citations: response.citations || [],
    search_results: (response as any).search_results || [],
    content: response.choices[0]?.message?.content || '',
  };
}
```

Source: [CITED: docs.perplexity.ai/api-reference/sonar-post.md] -- Perplexity Sonar API reference shows request/response schema with `citations` and `search_results` fields.

### esbuild Build Script

```typescript
// build.ts
import { build } from 'esbuild';

const commonOptions = {
  bundle: true,
  platform: 'node' as const,
  target: 'node20',
  format: 'esm' as const,
  banner: { js: '#!/usr/bin/env node' },
};

await Promise.all([
  build({
    ...commonOptions,
    entryPoints: ['src/websearch.ts'],
    outfile: 'scripts/websearch.js',
  }),
  build({
    ...commonOptions,
    entryPoints: ['src/webfetch.ts'],
    outfile: 'scripts/webfetch.js',
  }),
]);
```

Source: [CITED: esbuild.github.io/getting-started] -- Official esbuild docs for Node.js bundling.

### Level-Prefixed Stderr Logger

```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function log(level: LogLevel, message: string): void {
  if (LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]) {
    process.stderr.write(`[${level}] ${message}\n`);
  }
}

export const logger = {
  debug: (msg: string) => log('debug', msg),
  info: (msg: string) => log('info', msg),
  warn: (msg: string) => log('warn', msg),
  error: (msg: string) => log('error', msg),
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@perplexity-ai/perplexity_ai` v2.x | v0.29.0 (current) | Pre-2026 | CLAUDE.md version wrong. SDK is still pre-1.0. API surface is stable but version numbering is different. |
| Zod v3.x | Zod v4.x (4.4.3) | 2025 | Breaking changes in v4 -- `z.object()` API mostly compatible but some edge cases differ. Must use v4 syntax. |
| Commander v13.x | Commander v14.x (14.0.3) | 2025 | Minor version bump, largely backward compatible. |
| Claude Code commands/ | Claude Code skills/ | 2025 | Skills are the new standard. Commands still work but skills add frontmatter, supporting files, and auto-invocation. |
| Perplexity `search_domain_filter` | Same field, now also in search_results | Ongoing | The `search_domain_filter` parameter in the request limits search to specific domains. Response includes `search_results` array with structured data. |

**Deprecated/outdated:**
- `.claude/commands/` pattern: Still works but superseded by `skills/` with richer features. Use `skills/` for new plugins.
- `ts-node`: Superseded by `tsx`. Do not use.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Perplexity SDK version is 0.29.0, not 2.x as in CLAUDE.md | Standard Stack | Low -- verified via `npm view` |
| A2 | Zod version is 4.4.3, not 3.x as in CLAUDE.md | Standard Stack | Medium -- Zod v4 has breaking changes from v3. The `.parse()` and `.object()` APIs are similar but not identical. |
| A3 | Commander version is 14.0.3, not 13.x as in CLAUDE.md | Standard Stack | Low -- minor version bump, backward compatible |
| A4 | The `<search_results>` XML format uses `<result>`, `<title>`, `<url>` tags exactly | Code Examples | Medium -- D-06 deferred this to research. Based on REQUIREMENTS.md SRCH-02 and mikhail.io analysis. The exact format needs runtime verification against actual Claude Code output. |
| A5 | TypeScript 5.x is appropriate (no specific patch version verified) | Standard Stack | Low -- TypeScript 5.x is the current major version |
| A6 | tsx v4.x is appropriate (not verified on npm) | Standard Stack | Low -- tsx is well-known esbuild-powered TS runner |
| A7 | The `search_results` field in Perplexity response has `{title, url, snippet, date}` | Code Examples | Low -- verified from Perplexity OpenAPI spec (`ApiPublicSearchResult` schema) |
| A8 | The `PERPLEXITY_API_KEY` env var (not `PPLX_API_KEY`) is the official SDK default | CONF-01 | High -- REQUIREMENTS.md uses `PPLX_API_KEY` which will NOT auto-detect with the SDK. Must be resolved. |

## Open Questions

1. **API Key Environment Variable Name**
   - What we know: REQUIREMENTS.md specifies `PPLX_API_KEY`. The official Perplexity SDK reads `PERPLEXITY_API_KEY`. The SDK accepts an explicit `apiKey` parameter that overrides the env var.
   - What's unclear: Which name should the plugin standardize on? Supporting both is simple but adds confusion.
   - Recommendation: Read `PPLX_API_KEY` first (per REQUIREMENTS.md), fall back to `PERPLEXITY_API_KEY`. Pass the resolved value explicitly to the SDK constructor. Document both in README.

2. **Exact Claude Code WebSearch Output Format**
   - What we know: Claude Code's internal WebSearch tool returns a plain-text format like `Web search results for query: "..." \n Links: [{title, url}]`. But REQUIREMENTS.md specifies `<search_results>` XML with `<result>`, `<title>`, `<url>` tags.
   - What's unclear: Is the XML format the exact format that Claude Code's built-in WebSearch returns, or is it a format that this plugin must produce to be compatible with how Claude Code processes tool results?
   - Recommendation: The mikhail.io analysis shows Claude Code receives results in a different format internally (JSON-style `Links: [{title, url}]`). Since this is a plugin that replaces the built-in tool via a skill, the output format must be something Claude can understand. Use the `<search_results>` XML format specified in REQUIREMENTS.md -- this is the contract this plugin defines. Runtime verification against actual Claude Code behavior during implementation would be ideal.

3. **Zod v4 Compatibility**
   - What we know: CLAUDE.md says Zod 3.x but npm shows 4.4.3. Zod v4 has some breaking changes from v3.
   - What's unclear: Whether all the patterns in CLAUDE.md (which assumed Zod 3) work with Zod 4.
   - Recommendation: Use Zod 4.4.3 (current). The basic `z.object()`, `z.string()`, `z.array()`, `.optional()`, `.parse()` API is compatible. The planner should note this version difference.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 26.0.0 (v26) | -- |
| npm | Package management | ✓ | 11.12.1 | -- |
| esbuild | Bundling | ✓ | 0.28.0 | -- |
| TypeScript | Type checking | ✗ | -- | Install via npm |
| tsx | Dev execution | ✗ | -- | Install via npm |
| Perplexity API | Search provider | ✓ (if key set) | -- | -- |

**Missing dependencies with no fallback:**
- TypeScript, tsx, vitest -- all installed via `npm install` as dev dependencies. Not blocking.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 |
| Config file | `vitest.config.ts` (to be created) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLUG-01 | Plugin manifest is valid JSON with required `name` field | unit | `npx vitest run test/manifest.test.ts` | ❌ Wave 0 |
| PLUG-02 | WebSearch SKILL.md exists and has valid frontmatter | unit | `npx vitest run test/skills.test.ts` | ❌ Wave 0 |
| PLUG-03 | WebFetch SKILL.md exists and has valid frontmatter | unit | `npx vitest run test/skills.test.ts` | ❌ Wave 0 |
| PLUG-04 | Scripts accept valid JSON on stdin | unit | `npx vitest run test/input.test.ts` | ❌ Wave 0 |
| PLUG-05 | stdout contains results, stderr contains logs | unit | `npx vitest run test/io-separation.test.ts` | ❌ Wave 0 |
| CONF-01 | API key read from PPLX_API_KEY env var | unit | `npx vitest run test/config.test.ts` | ❌ Wave 0 |
| CONF-04 | Logger respects LOG_LEVEL env var | unit | `npx vitest run test/logger.test.ts` | ❌ Wave 0 |
| SRCH-01 | Input validation accepts valid query, rejects <2 chars | unit | `npx vitest run test/input.test.ts` | ❌ Wave 0 |
| SRCH-02 | Output XML matches expected format | unit | `npx vitest run test/output.test.ts` | ❌ Wave 0 |
| SRCH-04 | Perplexity API call extracts citations | integration | `npx vitest run test/perplexity.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test/manifest.test.ts` -- covers PLUG-01 (manifest validation)
- [ ] `test/skills.test.ts` -- covers PLUG-02, PLUG-03 (SKILL.md existence and frontmatter)
- [ ] `test/input.test.ts` -- covers PLUG-04, SRCH-01 (stdin parsing and Zod validation)
- [ ] `test/output.test.ts` -- covers SRCH-02 (XML formatting)
- [ ] `test/io-separation.test.ts` -- covers PLUG-05 (stdout/stderr separation)
- [ ] `test/config.test.ts` -- covers CONF-01 (env var reading)
- [ ] `test/logger.test.ts` -- covers CONF-04 (log level filtering)
- [ ] `test/perplexity.test.ts` -- covers SRCH-04 (Perplexity API integration, mocked)
- [ ] `vitest.config.ts` -- test framework configuration
- [ ] Framework install: `npm install --save-dev vitest` -- if not already in package.json

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Perplexity API key via env var (bearer token auth) |
| V3 Session Management | no | No session state in Phase 1 |
| V4 Access Control | no | No user-facing access control in Phase 1 |
| V5 Input Validation | yes | Zod schema validation for all stdin input |
| V6 Cryptography | no | No cryptographic operations in Phase 1 |

### Known Threat Patterns for TypeScript CLI Scripts

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JSON injection via stdin | Tampering | Zod `.parse()` rejects unexpected fields and types |
| XML injection in output | Tampering | `escapeXml()` function escapes `&`, `<`, `>`, `"` characters |
| API key exposure in logs | Information Disclosure | Logger never outputs API key values; key passed directly to SDK |
| Command injection in query | Tampering | Query string passed as API parameter, not shell-executed |

## Sources

### Primary (HIGH confidence)
- [code.claude.com/docs/en/plugins-reference] -- Plugin manifest schema, directory structure, environment variables, CLI commands. Fetched 2026-05-20.
- [code.claude.com/docs/en/plugins] -- Plugin quickstart, testing with `--plugin-dir`, skill registration. Fetched 2026-05-20.
- [code.claude.com/docs/en/skills] -- SKILL.md format, frontmatter reference, `!`command`` syntax, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`. Fetched 2026-05-20.
- [docs.perplexity.ai/api-reference/sonar-post.md] -- Perplexity Sonar Chat Completions API full OpenAPI spec. Request schema (`ApiChatCompletionsRequest`), response schema (`CompletionResponse`), `search_results` field (`ApiPublicSearchResult`), `citations` field. Fetched 2026-05-20.
- [docs.perplexity.ai/openapi.json] -- Perplexity API OpenAPI specification. Full schema dump. Fetched 2026-05-20.
- [npm registry] -- Package versions verified: `@perplexity-ai/perplexity_ai` 0.29.0, `zod` 4.4.3, `commander` 14.0.3, `esbuild` 0.28.0, `vitest` 4.1.6. Verified 2026-05-20.

### Secondary (MEDIUM confidence)
- [mikhail.io/2025/10/claude-code-web-tools/] -- Reverse-engineered analysis of Claude Code's WebSearch and WebFetch tools. Shows WebSearch returns `Links: [{title, url}]` format. Cross-referenced with Anthropic API docs.
- [platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool] -- Anthropic's web search tool API. Shows result format includes `url`, `title`, `page_age`, `encrypted_content`. Cross-referenced with mikhail.io analysis.
- [docs.perplexity.ai/docs/sonar/models] -- Perplexity Sonar model lineup: `sonar`, `sonar-pro`, `sonar-deep-research`, `sonar-reasoning-pro`. Fetched 2026-05-20.
- [docs.perplexity.ai/docs/sonar/quickstart] -- Perplexity Sonar quickstart. Confirms `PERPLEXITY_API_KEY` env var. Fetched 2026-05-20.
- [esbuild.github.io/getting-started/] -- esbuild bundling guide. `--platform=node --bundle --target=node18` for Node.js scripts.

### Tertiary (LOW confidence)
- [anthropics/claude-code GitHub issue #9817] -- Known bug where multi-line SKILL.md descriptions cause silent skill discovery failure. Not verified directly, found via web search.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all package versions verified on npm registry, all API schemas verified from official docs
- Architecture: HIGH -- plugin directory structure and skill format verified from official Claude Code docs
- Pitfalls: HIGH -- based on official docs common issues section and known bug reports
- Output format: MEDIUM -- REQUIREMENTS.md specifies XML format but exact match with Claude Code's built-in behavior is inferred, not directly verified

**Research date:** 2026-05-20
**Valid until:** 2026-06-20 (stable libraries, but Perplexity SDK is pre-1.0 so check for updates)
