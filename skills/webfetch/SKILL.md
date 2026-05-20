---
description: Fetch and summarize web page content. Use this skill when the user provides a URL and asks about its content.
allowed-tools: Bash(node *)
---

# WebFetch

Fetch web page content and return it for analysis.

## Usage

Run the fetch script with the URL and prompt as JSON stdin:

```bash
echo '{"url":"URL","prompt":"QUESTION"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.js"
```

The script accepts JSON on stdin with this schema:
- `url` (string, required, must be a valid URL): The URL of the page to fetch
- `prompt` (string, required): The question to answer about the page content

The script outputs the page content to stdout. Errors and diagnostic messages are written to stderr.

HTTP URLs are automatically upgraded to HTTPS. Cross-host redirects are reported but not followed. Only HTML content types (`text/html`, `application/xhtml`) are supported.

Use the fetched content to answer the user's question about the page.
