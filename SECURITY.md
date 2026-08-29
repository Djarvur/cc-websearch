# Security Policy

## Supported Versions

Only the latest released version of `cc-websearch` receives security fixes. The plugin ships
compiled bundles in git, so "latest" means the current `master` tag/release — older tags are not
patched.

| Version        | Supported |
| -------------- | --------- |
| latest release | ✅        |
| older releases | ❌        |

## Reporting a Vulnerability

Please report security issues privately through GitHub's private vulnerability reporting:

<https://github.com/Djarvur/cc-websearch/security/advisories/new>

Do not open a public issue for an unfixed vulnerability.

Include, where possible:

- the affected skill (`websearch` or `webfetch`) and plugin version,
- the JSON stdin payload or URL that triggers the issue,
- what happens versus what you expected,
- Node.js version and operating system.

You can expect an initial acknowledgement within 7 days and a status update within 30 days.

## Scope

This plugin runs locally as two Node scripts invoked by Claude Code. Reports are in scope when they
concern:

- **Command or code injection** — stdin payloads that lead to code execution, shell invocation, or
  escape from the intended `fetch` → parse → stdout pipeline.
- **SSRF and request forgery** — bypasses of the `allowed_domains` / `blocked_domains` filtering in
  `src/lib/filter.ts`, or of the redirect and HTTPS-upgrade handling in `src/lib/fetch.ts`.
- **Data exfiltration** — fetched page content or local files reaching an unintended destination.
- **Supply chain** — a committed bundle in `skills/*/scripts/*.cjs` that does not correspond to the
  sources in `src/` plus the pinned dependencies in `package-lock.json`.
- **Configuration handling** — issues in `~/.config/websearch/config.json` or `WEBSEARCH_*`
  environment variable parsing.

Out of scope:

- Vulnerabilities in DuckDuckGo itself or in the remote pages that WebFetch retrieves. Fetched
  content is untrusted input by design; treat scraped results accordingly.
- Denial of service caused by pointing the plugin at a hostile or extremely large page.
- Findings that require an attacker to already control the local machine or the user's shell.

## Hardening Notes

- The scripts take JSON on stdin only. There is no flag parsing and no shell interpolation of user
  input.
- `jsdom` is instantiated without `runScripts`, so scripts inside fetched pages are never executed.
- All external input is validated by a zod `strictObject` before use; unknown keys are rejected.
- No API keys or credentials are used or stored by the plugin.
