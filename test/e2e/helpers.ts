import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface E2EResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function runScript(script: string, input: object): Promise<E2EResult> {
  return new Promise((done) => {
    const scriptPath = resolve(__dirname, '..', '..', script);
    const child = spawn('node', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('close', (code) => done({ stdout, stderr, exitCode: code }));
    child.stdin.write(JSON.stringify(input));
    child.stdin.end();
  });
}

export async function withRetry(fn: () => Promise<void>, maxRetries = 3): Promise<void> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await fn();
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      }
    }
  }
  throw lastError;
}
