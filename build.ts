import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const commonOptions = {
  bundle: true,
  platform: 'node' as const,
  target: 'node20',
  format: 'cjs' as const,
  outExtension: { '.js': '.cjs' },
  banner: { js: '#!/usr/bin/env node' },
};

// jsdom reads default-stylesheet.css via fs.readFileSync at runtime with __dirname-relative paths
// and uses require.resolve for xhr-sync-worker.js loaded via new Worker().
// Inline both so the CJS bundle has zero external fs dependencies.
const jsdomCss = fs.readFileSync(
  path.resolve('node_modules/jsdom/lib/jsdom/browser/default-stylesheet.css'),
  'utf8',
);
const jsdomWorkerSrc = fs.readFileSync(
  path.resolve('node_modules/jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js'),
  'utf8',
);

const jsdomInlinePlugin = {
  name: 'inline-jsdom-fs-deps',
  setup(build) {
    build.onLoad({
      filter: /jsdom[\\/]lib[\\/]jsdom[\\/]living[\\/]helpers[\\/]style-rules\.js$/,
    }, (args) => {
      let code = fs.readFileSync(args.path, 'utf8');
      code = code.replace(
        `const defaultStyleSheet = fs.readFileSync(\n  path.resolve(__dirname, "../../browser/default-stylesheet.css"),\n  { encoding: "utf-8" }\n);`,
        `const defaultStyleSheet = ${JSON.stringify(jsdomCss)};`,
      );
      return { contents: code, loader: 'js' };
    });

    build.onLoad({
      filter: /jsdom[\\/]lib[\\/]jsdom[\\/]living[\\/]xhr[\\/]XMLHttpRequest-impl\.js$/,
    }, (args) => {
      let code = fs.readFileSync(args.path, 'utf8');
      code = code.replace(
        `const syncWorkerFile = require.resolve("./xhr-sync-worker.js");`,
        `const syncWorkerSrc = ${JSON.stringify(jsdomWorkerSrc)};`,
      );
      code = code.replace(
        `new Worker(syncWorkerFile)`,
        `new Worker(syncWorkerSrc, { eval: true })`,
      );
      return { contents: code, loader: 'js' };
    });

    // @acemir/cssom CSSStyleRule sets parentRule via plain assignment (sloppy mode).
    // Bundled strict mode throws because cssstyle defines parentRule as getter-only.
    // Use _parentRule (cssstyle's internal backing field for the getter) instead.
    build.onLoad({
      filter: /@acemir[\\/]cssom[\\/]lib[\\/]CSSStyleRule\.js$/,
    }, (args) => {
      let code = fs.readFileSync(args.path, 'utf8');
      code = code.replace(
        `this.__style.parentRule = this;`,
        `this.__style._parentRule = this;`,
      );
      return { contents: code, loader: 'js' };
    });
  },
};

await Promise.all([
  build({
    ...commonOptions,
    entryPoints: ['src/websearch.ts'],
    outfile: 'skills/websearch/scripts/websearch.cjs',
  }),
  build({
    ...commonOptions,
    entryPoints: ['src/webfetch.ts'],
    outfile: 'skills/webfetch/scripts/webfetch.cjs',
    plugins: [jsdomInlinePlugin],
  }),
]);
