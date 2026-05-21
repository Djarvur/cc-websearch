// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  {
    ignores: ['scripts/**', 'node_modules/**', 'coverage/**', 'dist/**'],
  },
  eslintConfigPrettier, // MUST be last -- disables conflicting rules
);
