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
