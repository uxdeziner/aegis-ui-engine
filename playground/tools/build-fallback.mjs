#!/usr/bin/env node
/* Regenerates playground/fallback-tokens.css from a generated preset stylesheet.
 *
 * The fallback is a re-scoped copy of presets/css/<id>.css that applies only when
 * no preset is active (`:root:not([data-aegis-theme])`), so the playground and its
 * previews still render if aegis-presets.js / aegis-presets.css fail to load or a
 * stored preset id is unknown. Google Fonts @import is dropped (system font stacks
 * remain in the variables).
 *
 *   node playground/tools/build-fallback.mjs [presetId]   (default: enterprise-saas)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const id = process.argv[2] || 'enterprise-saas';
const src = readFileSync(join(here, '../../presets/css', id + '.css'), 'utf8');
const sel = '[data-aegis-theme="' + id + '"]';
const SCOPE = ':root:not([data-aegis-theme])';

let out = src
  .replace(/^\/\*![\s\S]*?\*\/\s*/, '')
  .replace(/@import\s+url\([^)]*\)\s*;\s*/g, '')
  .split(sel + '[data-aegis-mode="auto"]').join(SCOPE + '[data-aegis-mode="auto"]')
  .split(sel + '[data-aegis-mode="dark"]').join(SCOPE + '[data-aegis-mode="dark"]')
  .split(sel + ':not([data-aegis-mode="light"]):not([data-aegis-mode="dark"])').join(SCOPE + ':not([data-aegis-mode="light"]):not([data-aegis-mode="dark"])')
  .split(sel).join(SCOPE);

if (out.indexOf('data-aegis-theme="') > -1) throw new Error('Unscoped selector left in fallback output');
if (/@import|^[^\s:/@}]/m.test(out.split('\n').filter(function (l) { return !/^\s*$/.test(l); })[0])) throw new Error('Unexpected leading content in fallback output');

const header = '/*! AegisUI Playground fallback tokens: generated from presets/css/' + id + '.css by\n' +
  ' *  playground/tools/build-fallback.mjs. Do not edit. Applies only when no preset is active. */\n';
writeFileSync(join(here, '../fallback-tokens.css'), header + out);
console.log('fallback-tokens.css written from', id, '(' + out.length + ' bytes)');
