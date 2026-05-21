# cc-websearch

A Claude Code plugin providing WebSearch and WebFetch skills as a drop-in replacement for Claude Code's built-in tools. Powered by DuckDuckGo (no API keys required). Zero configuration for basic use.

- **WebSearch** -- Search the web using DuckDuckGo, returning structured XML results
- **WebFetch** -- Fetch a web page, extract its main content, and convert to markdown

No API keys, no accounts, no subscriptions. Install the plugin and start searching.

## Quick Install

```bash
claude plugin add https://github.com/your-org/cc-websearch
```

Compiled scripts are shipped in git (built via esbuild), so the plugin works immediately after install -- no build step is needed.

## Usage

Both skills accept JSON input on stdin and write results to stdout. Errors and diagnostic messages are written to stderr.

### WebSearch

Pipe a JSON object with a `query` field:

```bash
echo '{"query":"latest ECMAScript specification"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/websearch.cjs"
```

The script produces `<search_results>` XML on stdout:

```xml
<search_results>
  <result>
    <title>ECMAScript 2024 specification finalized</title>
    <url>https://example.com/ecmascript-2024</url>
    <snippet>ECMAScript 2024, the 15th edition, adds new array grouping, Promise.withResolvers, and RegExp v flag.</snippet>
  </result>
</search_results>
```

Optional fields:
- `allowed_domains` (string[]): Only return results from these domains
- `blocked_domains` (string[]): Exclude results from these domains

`allowed_domains` and `blocked_domains` cannot be used together.

### WebFetch

Pipe a JSON object with a `url` and `prompt` field:

```bash
echo '{"url":"https://example.com/article","prompt":"Summarize this article"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.cjs"
```

The script fetches the page, extracts the main content using Mozilla's Readability library, converts it to markdown, and writes the result to stdout.

The `prompt` field describes what the user wants to know about the page. The script does not answer the prompt -- it returns the page content so the calling agent can answer.

## Configuration

Configuration is optional. By default the plugin works with sensible defaults.

### Config file

Create `~/.config/websearch/config.json`:

```json
{
  "retry": {
    "maxRetries": 4,
    "baseDelay": 1000,
    "maxDelay": 16000,
    "timeout": 30000
  },
  "logging": {
    "level": "info"
  }
}
```

See `.env.example` at the project root for a complete template with all options documented.

### Options

| Key                   | Type                                   | Default  | Description                      |
| --------------------- | -------------------------------------- | -------- | -------------------------------- |
| `retry.maxRetries`    | integer (0+)                           | 4        | Maximum retry attempts           |
| `retry.baseDelay`     | integer ms (0+)                        | 1000     | Initial backoff delay            |
| `retry.maxDelay`      | integer ms (0+)                        | 16000    | Maximum backoff delay            |
| `retry.timeout`       | integer ms (0+)                        | 30000    | Request timeout                  |
| `logging.level`       | `"debug"` \| `"info"` \| `"warn"` \| `"error"` | `"info"` | Logging verbosity        |

### Environment variable overrides

Each config option has a corresponding environment variable that takes precedence over the config file:

| Environment variable          | Overrides           |
| ----------------------------- | ------------------- |
| `WEBSEARCH_RETRY_MAX_RETRIES` | `retry.maxRetries`  |
| `WEBSEARCH_RETRY_BASE_DELAY`  | `retry.baseDelay`   |
| `WEBSEARCH_RETRY_MAX_DELAY`   | `retry.maxDelay`    |
| `WEBSEARCH_RETRY_TIMEOUT`     | `retry.timeout`     |
| `WEBSEARCH_LOGGING_LEVEL`     | `logging.level`     |

Precedence (highest to lowest):
1. Environment variable
2. Config file value
3. Hardcoded default

## Feature Comparison

### WebSearch

| Feature             | Built-in WebSearch            | cc-websearch WebSearch           |
| ------------------- | ----------------------------- | -------------------------------- |
| Search provider     | Claude internal               | DuckDuckGo (HTML scraping)       |
| API key required    | No                            | No                               |
| `query`             | Supported                     | Supported                        |
| `allowed_domains`   | Supported                     | Supported                        |
| `blocked_domains`   | Supported                     | Supported                        |
| Output format       | `<search_results>` XML        | `<search_results>` XML           |
| Result fields       | title, url, snippet           | title, url, snippet              |
| Domain filter limit | Neither required              | Cannot use both simultaneously   |

### WebFetch

| Feature              | Built-in WebFetch             | cc-websearch WebFetch              |
| -------------------- | ----------------------------- | ---------------------------------- |
| Content source       | Claude internal               | Fetch + Readability extraction     |
| API key required     | No                            | No                                 |
| `url`                | Supported                     | Supported                          |
| `prompt`             | Supported                     | Supported                          |
| Output format        | Markdown text                 | Markdown text                      |
| Redirect handling    | Follows redirects             | HTTP-to-HTTPS upgrade, reports cross-host redirects |
| Content type filter  | HTML only                     | HTML only (`text/html`, `application/xhtml`) |

## Architecture

cc-websearch uses DuckDuckGo as its sole search provider. There is no API key dependency -- search works out of the box with no account registration.

### WebSearch pipeline

```
JSON input -> duck-duck-scrape (DDG Lite scraping) -> XML output with title, url, snippet
```

The websearch script sends a query to `lite.duckduckgo.com`, parses the HTML response, and formats results as `<search_results>` XML matching Claude Code's built-in output format. Citations are extracted from search result descriptions.

### WebFetch pipeline

```
URL input -> HTTP fetch -> Readability extraction -> Turndown markdown -> stdout
```

WebFetch is a standalone content pipeline. It fetches the raw HTML, runs Mozilla's Readability library (the same engine powering Firefox Reader View) to extract the main article content, then converts the cleaned HTML to markdown via Turndown. No LLM or search interaction is involved.

### Key design decisions

- **No API keys** -- DuckDuckGo is free and requires no authentication
- **No LLM in the pipeline** -- WebFetch extracts content, it does not analyze or summarize
- **Plugin distribution** -- standard Claude Code plugin, installed via `claude plugin add`
- **Scripts compiled to .cjs** -- esbuild bundles TypeScript into standalone Node.js executables

## Output Examples

### WebSearch XML output

```xml
<search_results>
  <result>
    <title>Example result title</title>
    <url>https://example.com/page</url>
    <snippet>A brief description of the page content extracted from search results.</snippet>
  </result>
  <result>
    <title>Second result</title>
    <url>https://example.com/other</url>
    <snippet>Another search result with relevant information.</snippet>
  </result>
</search_results>
```

### WebFetch markdown output

```markdown
# Article Title

This is the main content of the article, extracted by Readability and
converted to markdown. Navigation, ads, sidebars, and other clutter
are stripped during extraction.

- Bullet points are preserved
- **Bold text** is preserved
- [Links](https://example.com) are preserved
```

## Development

### Prerequisites

- Node.js 20 LTS or later
- npm (ships with Node.js)

### Setup

```bash
npm install
```

### Commands

| Command                  | Description                              |
| ------------------------ | ---------------------------------------- |
| `npm run build`          | Compile scripts with esbuild to `.cjs`   |
| `npm test`               | Run vitest unit tests                    |
| `npm run typecheck`      | TypeScript type checking (`tsc --noEmit`) |
| `npm run lint`           | ESLint + Prettier formatting check       |
| `npm run e2e`            | Build + run end-to-end tests             |
| `npm run check`          | Run lint + typecheck + test + build      |
| `npm run test:watch`     | Run tests in watch mode                  |
