import { build } from 'esbuild';

const commonOptions = {
  bundle: true,
  platform: 'node' as const,
  target: 'node20',
  format: 'cjs' as const,
  outExtension: { '.js': '.cjs' },
  banner: { js: '#!/usr/bin/env node' },
};

await Promise.all([
  build({
    ...commonOptions,
    entryPoints: ['src/websearch.ts'],
    outfile: 'scripts/websearch.cjs',
  }),
  build({
    ...commonOptions,
    entryPoints: ['src/webfetch.ts'],
    outfile: 'scripts/webfetch.cjs',
    external: ['jsdom'], // jsdom must be external -- reads CSS via fs at runtime
  }),
]);
