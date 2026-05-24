import { afterEach, describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginDir = resolve(__dirname, '../../.claude-plugin');

const activeChildren = new Set<ChildProcess>();

/**
 * Spawn claude CLI with the given prompt and parse NDJSON stream-json output
 * for tool_use events. Returns the names of tools invoked by Claude.
 *
 * The stream-json format emits events at the top level (system, assistant,
 * user, result). tool_use events are nested inside assistant messages at
 * message.content[].{type:"tool_use",name:"Skill",input:{skill:"...",...}}.
 *
 * Uses spawn() with args array (not exec/shell string) per T-11-01 mitigation.
 * All prompt values are hardcoded string literals — no external input flows
 * into the subprocess args array.
 *
 * Requires --verbose flag when using --output-format stream-json with -p/--print
 * (claude CLI constraint).
 */
async function runClaude(prompt: string): Promise<{ toolNames: string[]; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    let settled = false;

    const child = spawn('claude', [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--plugin-dir',
      pluginDir,
    ]);
    activeChildren.add(child);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (err: Error) => {
      if (settled) return;
      settled = true;
      reject(
        new Error(
          `Failed to spawn claude CLI: ${err.message}. ` +
            'Ensure Claude Code CLI is installed and on PATH.',
        ),
      );
    });

    child.on('close', (code: number | null) => {
      activeChildren.delete(child);
      if (settled) return;
      settled = true;

      if (code !== 0) {
        reject(
          new Error(`claude CLI exited with code ${code}. Stderr: ${stderr.substring(0, 500)}`),
        );
        return;
      }

      const toolNames: string[] = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          // tool_use events are nested inside assistant message content
          if (event.type === 'assistant' && event.message?.content) {
            for (const content of event.message.content) {
              if (content.type === 'tool_use') {
                // For Skill invocations, push the skill name (e.g. "cc-websearch:websearch")
                // Otherwise push the tool name (e.g. "WebSearch", "Bash")
                if (content.name === 'Skill' && content.input?.skill) {
                  toolNames.push(content.input.skill);
                } else if (content.name) {
                  toolNames.push(content.name);
                }
              }
            }
          }
        } catch {
          // Skip non-JSON lines (stdout may contain diagnostic output interleaved)
        }
      }

      resolvePromise({ toolNames, stderr });
    });
  });
}

describe('Redirect Reliability', () => {
  afterEach(() => {
    for (const child of activeChildren) {
      child.kill('SIGTERM');
    }
    activeChildren.clear();
  });

  // ── Search test cases ────────────────────────────────────────────────────────
  // Each verifies that after a built-in WebSearch denial, Claude invokes the
  // cc-websearch:websearch skill.

  it('invokes websearch skill for "Search the web for: What is the capital of Australia?"', async () => {
    const result = await runClaude('Search the web for: What is the capital of Australia?');
    expect(result.toolNames.length).toBeGreaterThan(0);
    expect(result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:websearch'))).toBe(
      true,
    );
  }, 180000);

  it('invokes websearch skill for "Search the web for: latest AI news 2026"', async () => {
    const result = await runClaude('Search the web for: latest AI news 2026');
    expect(result.toolNames.length).toBeGreaterThan(0);
    expect(result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:websearch'))).toBe(
      true,
    );
  }, 180000);

  it('invokes websearch skill for "Search the web for: TypeScript release notes"', async () => {
    const result = await runClaude('Search the web for: TypeScript release notes');
    expect(result.toolNames.length).toBeGreaterThan(0);
    expect(result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:websearch'))).toBe(
      true,
    );
  }, 180000);

  it('invokes websearch skill for "Search the web for: PostgreSQL vs MongoDB comparison"', async () => {
    const result = await runClaude('Search the web for: PostgreSQL vs MongoDB comparison');
    expect(result.toolNames.length).toBeGreaterThan(0);
    expect(result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:websearch'))).toBe(
      true,
    );
  }, 180000);

  // ── Fetch test cases ─────────────────────────────────────────────────────────
  // Each verifies that after a built-in WebFetch denial, Claude invokes the
  // cc-websearch:webfetch skill.

  it('invokes webfetch skill for "Fetch the content at https://example.com"', async () => {
    const result = await runClaude('Fetch the content at https://example.com');
    expect(result.toolNames.length).toBeGreaterThan(0);
    expect(result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:webfetch'))).toBe(
      true,
    );
  }, 180000);

  it('invokes webfetch skill for "Read https://example.com and tell me what it contains"', async () => {
    const result = await runClaude('Read https://example.com and tell me what it contains');
    expect(result.toolNames.length).toBeGreaterThan(0);
    expect(result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:webfetch'))).toBe(
      true,
    );
  }, 180000);

  it('invokes webfetch skill for "Summarize the content at https://www.wikipedia.org"', async () => {
    const result = await runClaude('Summarize the content at https://www.wikipedia.org');
    expect(result.toolNames.length).toBeGreaterThan(0);
    expect(result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:webfetch'))).toBe(
      true,
    );
  }, 180000);

  it('invokes webfetch skill for "Check the API documentation at https://jsonplaceholder.typicode.com"', async () => {
    const result = await runClaude(
      'Check the API documentation at https://jsonplaceholder.typicode.com',
    );
    expect(result.toolNames.length).toBeGreaterThan(0);
    expect(result.toolNames.some((n) => n.toLowerCase().includes('cc-websearch:webfetch'))).toBe(
      true,
    );
  }, 180000);
});
