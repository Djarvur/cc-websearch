import { afterEach, describe, it, expect } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginDir = resolve(__dirname, '../../.claude-plugin');

const activeChildren = new Set<ChildProcess>();

/**
 * Parse NDJSON stream-json output and extract all assistant text content.
 * Collects every message.content[].type === 'text' entry across all
 * assistant messages in the stream.
 */
function getAllAssistantText(stdout: string): string {
  const textFragments: string[] = [];
  const lines = stdout.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const event = JSON.parse(trimmed);
      if (event.type === 'assistant' && event.message?.content) {
        for (const content of event.message.content) {
          if (content.type === 'text') {
            textFragments.push(content.text);
          }
        }
      }
    } catch {
      // Skip non-JSON lines
    }
  }

  return textFragments.join('\n');
}

/**
 * Spawn claude CLI with the given prompt, parse NDJSON output, and return
 * the full assistant text response along with stderr diagnostics.
 *
 * Uses spawn() with args array per T-11-01 security pattern. Hardcoded
 * prompts only — no external input flows into subprocess args.
 */
async function runClaude(prompt: string): Promise<{ assistantText: string; stderr: string }> {
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
          new Error(
            `claude CLI exited with code ${code}. Stderr: ${stderr.substring(0, 500)}`,
          ),
        );
        return;
      }

      const assistantText = getAllAssistantText(stdout);
      resolvePromise({ assistantText, stderr });
    });
  });
}

describe('Output Compatibility', () => {
  afterEach(() => {
    for (const child of activeChildren) {
      child.kill('SIGTERM');
    }
    activeChildren.clear();
  });

  // ── Search test cases ────────────────────────────────────────────────────────
  // Each verifies Claude cites search result URLs in its response, proving the
  // XML search results were parsed and consumed (D-07 pass threshold).

  it(
    'cites URLs when asked "Search the web for: What is the capital of Australia?"',
    async () => {
      const result = await runClaude(
        'Search the web for: What is the capital of Australia?',
      );
      expect(result.assistantText).toMatch(/https?:\/\/[^\s)]+/);
    },
    180000,
  );

  it(
    'cites URLs when asked "Search the web for: latest AI news 2026"',
    async () => {
      const result = await runClaude(
        'Search the web for: latest AI news 2026',
      );
      expect(result.assistantText).toMatch(/https?:\/\/[^\s)]+/);
    },
    180000,
  );

  it(
    'cites URLs when asked "Search the web for: TypeScript release notes"',
    async () => {
      const result = await runClaude(
        'Search the web for: TypeScript release notes',
      );
      expect(result.assistantText).toMatch(/https?:\/\/[^\s)]+/);
    },
    180000,
  );

  it(
    'cites URLs when asked "Search the web for: PostgreSQL vs MongoDB comparison"',
    async () => {
      const result = await runClaude(
        'Search the web for: PostgreSQL vs MongoDB comparison',
      );
      expect(result.assistantText).toMatch(/https?:\/\/[^\s)]+/);
    },
    180000,
  );

  // ── Fetch test cases ─────────────────────────────────────────────────────────
  // Each verifies Claude references page-specific content in its response,
  // proving the markdown output was consumed (OUTP-02 consumption proof).

  it(
    'references page content when asked "Fetch the content at https://example.com"',
    async () => {
      const result = await runClaude(
        'Fetch the content at https://example.com',
      );
      expect(result.assistantText).toMatch(/Example Domain/i);
    },
    180000,
  );

  it(
    'references page content when asked "Read https://example.com and tell me what it contains"',
    async () => {
      const result = await runClaude(
        'Read https://example.com and tell me what it contains',
      );
      expect(result.assistantText).toMatch(/Example Domain/i);
    },
    180000,
  );

  it(
    'references page content when asked "Summarize the content at https://www.wikipedia.org"',
    async () => {
      const result = await runClaude(
        'Summarize the content at https://www.wikipedia.org',
      );
      expect(result.assistantText).toMatch(/Wikipedia/i);
    },
    180000,
  );

  it(
    'references page content when asked "Check the API documentation at https://jsonplaceholder.typicode.com"',
    async () => {
      const result = await runClaude(
        'Check the API documentation at https://jsonplaceholder.typicode.com',
      );
      expect(result.assistantText).toMatch(/JSON|placeholder|typicode|api/i);
    },
    180000,
  );
});
