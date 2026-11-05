#!/usr/bin/env node
/*
 * aegis-init — scaffold an AegisUI preset into a project.
 *
 *   node cli/aegis-init.js --preset=fintech --out=./my-app
 *
 * Writes four files generated from the repository's real preset build output
 * (presets/tokens/<id>.json + presets/css/<id>.css):
 *
 *   tokens.json     the AegisUI token document, byte-identical to presets/tokens/<id>.json
 *   variables.css   the preset's CSS custom properties (light, dark, auto)
 *   CLAUDE.md       token rules for Claude Code
 *   .cursorrules    the same rules, condensed for Cursor
 *
 * Zero dependencies, no network access (only node:fs / node:path).
 * Exit codes: 0 ok · 1 usage error · 2 would overwrite files · 3 invalid preset data / IO failure.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VERSION = '1.0.0';
const REPO_ROOT = path.resolve(__dirname, '..');
const PRESETS_DIR = path.join(REPO_ROOT, 'presets');
const TOKENS_DIR = path.join(PRESETS_DIR, 'tokens');
const CSS_DIR = path.join(PRESETS_DIR, 'css');
const SCHEMA_PATH = path.join(PRESETS_DIR, 'schema', 'aegis-tokens.schema.json');

const OUTPUT_FILES = ['tokens.json', 'variables.css', 'CLAUDE.md', '.cursorrules'];

/** Short names → real preset ids. Every target is checked against presets/tokens/index.json at runtime. */
const ALIASES = {
  saas: 'enterprise-saas', enterprise: 'enterprise-saas',
  fintech: 'fintech-terminal', finance: 'fintech-terminal', terminal: 'fintech-terminal',
  healthcare: 'healthcare-clean', health: 'healthcare-clean',
  ai: 'ai-studio-dark', 'ai-studio': 'ai-studio-dark',
  swiss: 'swiss-editorial', editorial: 'swiss-editorial',
  gov: 'gov-accessible', government: 'gov-accessible', a11y: 'gov-accessible', 'high-contrast': 'gov-accessible',
  retail: 'retail-commerce', commerce: 'retail-commerce', ecommerce: 'retail-commerce',
  legal: 'legal-slate', compliance: 'legal-slate',
  dev: 'developer-console', developer: 'developer-console', console: 'developer-console',
  logistics: 'logistics-ops', ops: 'logistics-ops',
  creative: 'creative-agency', agency: 'creative-agency',
  wellness: 'wellness-hr', hr: 'wellness-hr', people: 'wellness-hr',
};

class CliError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}
const usage = (m) => new CliError(m, 1);

/* ───────────────────────────────────────────── preset catalogue */

function loadIndex() {
  const file = path.join(TOKENS_DIR, 'index.json');
  let idx;
  try { idx = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {
    throw new CliError(`Cannot read preset index ${path.relative(process.cwd(), file)} — run \`npm run build\` first. (${e.message})`, 3);
  }
  if (!idx || !Array.isArray(idx.presets) || !idx.presets.length) throw new CliError('Preset index is empty or malformed.', 3);
  return idx.presets;
}

function aliasesFor(id) { return Object.keys(ALIASES).filter((a) => ALIASES[a] === id); }

function resolvePresetId(input, presets) {
  const key = String(input).trim().toLowerCase();
  const ids = presets.map((p) => p.id);
  if (ids.includes(key)) return key;
  if (ALIASES[key] && ids.includes(ALIASES[key])) return ALIASES[key];
  const near = [...ids, ...Object.keys(ALIASES)].filter((c) => c.includes(key) || key.includes(c) || levenshtein(c, key) <= 2);
  const hint = near.length ? ` Did you mean: ${[...new Set(near)].slice(0, 4).join(', ')}?` : '';
  throw usage(`Unknown preset "${input}".${hint} Run with --list to see all presets.`);
}

function levenshtein(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/* ───────────────────────────────────────────── arguments */

const FLAGS = {
  preset: 'value', out: 'value', mode: 'value',
  force: 'bool', 'dry-run': 'bool', 'no-fonts': 'bool', list: 'bool', help: 'bool', version: 'bool', json: 'bool',
};
const SHORT = { '-h': 'help', '-f': 'force', '-l': 'list', '-v': 'version' };

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    if (SHORT[arg]) arg = '--' + SHORT[arg];
    if (!arg.startsWith('--')) throw usage(`Unexpected argument "${arg}". Options take the form --name=value (see --help).`);
    const eq = arg.indexOf('=');
    const name = arg.slice(2, eq < 0 ? undefined : eq);
    const kind = FLAGS[name];
    if (!kind) throw usage(`Unknown option "--${name}". See --help.`);
    if (opts[name] !== undefined) throw usage(`Option --${name} was given more than once.`);
    if (kind === 'bool') {
      if (eq >= 0) throw usage(`--${name} does not take a value.`);
      opts[name] = true;
    } else {
      let value = eq >= 0 ? arg.slice(eq + 1) : argv[++i];
      if (value === undefined || value === '' || (eq < 0 && value.startsWith('--'))) throw usage(`--${name} requires a value, e.g. --${name}=${name === 'out' ? './my-app' : name === 'mode' ? 'dark' : 'fintech'}.`);
      opts[name] = value;
    }
  }
  if (opts.mode !== undefined && !['light', 'dark', 'auto'].includes(opts.mode)) throw usage(`--mode must be light, dark or auto (got "${opts.mode}").`);
  return opts;
}

/* ───────────────────────────────────────────── safe output path */

/**
 * The output directory must resolve inside the current working directory, must not
 * use ".." segments, and neither it nor its existing parents may be symlinks. This
 * prevents `--out=../../etc` style traversal and writes redirected through links.
 */
function resolveOutDir(raw, cwd) {
  if (typeof raw !== 'string' || !raw.trim()) throw usage('--out is required, e.g. --out=./my-app');
  if (raw.includes('\0')) throw usage('--out contains a NUL byte.');
  if (raw.split(/[\\/]+/).includes('..')) throw usage(`--out must not contain ".." segments (got "${raw}").`);
  const realCwd = fs.realpathSync(cwd);
  const target = path.resolve(realCwd, raw);
  const rel = path.relative(realCwd, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw usage(`--out must be inside the current directory (${realCwd}). Change into the project first, then use a relative path.`);
  }
  // Walk each existing segment below cwd and refuse symlinks / non-directories.
  let cur = realCwd;
  for (const seg of rel.split(path.sep).filter(Boolean)) {
    cur = path.join(cur, seg);
    let st;
    try { st = fs.lstatSync(cur); } catch (e) { if (e.code === 'ENOENT') break; throw e; }
    if (st.isSymbolicLink()) throw usage(`Refusing to write through symlink ${path.relative(realCwd, cur) || '.'}.`);
    if (!st.isDirectory()) throw usage(`${path.relative(realCwd, cur)} exists and is not a directory.`);
  }
  return target;
}

/* ───────────────────────────────────────────── validation */

function isLeaf(n) { return n && typeof n === 'object' && ('$value' in n || '$modes' in n); }
function walk(node, fn, trail = []) {
  if (isLeaf(node)) return fn(node, trail);
  if (!node || typeof node !== 'object') return;
  for (const k of Object.keys(node)) if (!k.startsWith('$')) walk(node[k], fn, [...trail, k]);
}
const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const isAlias = (v) => typeof v === 'string' && /^\{[A-Za-z0-9_.-]+\}$/.test(v);

/**
 * Validates a token document against the rules in presets/schema/aegis-tokens.schema.json
 * that matter for consumers: required keys, format/version, token types, $value xor $modes,
 * cssVar naming, mode coverage and alias resolution. Returns a list of problems.
 */
function validateDoc(doc, expectedId) {
  const errors = [];
  let schema = null;
  try { schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8')); } catch (e) { errors.push(`Cannot read schema: ${e.message}`); return errors; }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return ['Document is not a JSON object.'];
  for (const key of schema.required) if (!(key in doc)) errors.push(`Missing required key "${key}".`);
  if (errors.length) return errors;
  if (doc.aegis.format !== schema.properties.aegis.properties.format.const) errors.push(`aegis.format must be "aegis-tokens".`);
  if (!new RegExp(schema.properties.aegis.properties.version.pattern).test(String(doc.aegis.version))) errors.push(`Unsupported aegis.version "${doc.aegis.version}".`);
  if (!doc.meta || doc.meta.id !== expectedId) errors.push(`meta.id "${doc.meta && doc.meta.id}" does not match preset "${expectedId}".`);
  if (!Array.isArray(doc.modes) || !doc.modes.includes('light')) errors.push('"modes" must include "light".');
  for (const key of schema.properties.tokens.required) if (!doc.tokens || !doc.tokens[key]) errors.push(`Missing tokens.${key}.`);
  if (errors.length) return errors;

  const types = new Set(schema.$defs.token.properties.$type.enum);
  const cssVarRe = new RegExp(schema.$defs.extensions.properties.aegis.properties.cssVar.pattern);
  const seenVars = new Map();
  walk(doc.tokens, (tok, trail) => {
    const at = trail.join('.');
    if (!types.has(tok.$type)) errors.push(`${at}: unknown $type "${tok.$type}".`);
    if (('$value' in tok) === ('$modes' in tok)) errors.push(`${at}: needs exactly one of $value or $modes.`);
    const cssVar = tok.$extensions && tok.$extensions.aegis && tok.$extensions.aegis.cssVar;
    if (!cssVar || !cssVarRe.test(cssVar)) errors.push(`${at}: missing or invalid cssVar.`);
    else if (seenVars.has(cssVar)) errors.push(`${at}: cssVar ${cssVar} duplicates ${seenVars.get(cssVar)}.`);
    else seenVars.set(cssVar, at);
    const values = tok.$modes ? doc.modes.map((m) => {
      if (!(m in tok.$modes)) errors.push(`${at}: no value for mode "${m}".`);
      return tok.$modes[m];
    }) : [tok.$value];
    for (const v of values) {
      if (isAlias(v) && !getPath(doc.tokens, v.slice(1, -1))) errors.push(`${at}: unresolved alias ${v}.`);
      if (v && typeof v === 'object' && !Array.isArray(v)) for (const sub of Object.values(v)) if (isAlias(sub) && !getPath(doc.tokens, sub.slice(1, -1))) errors.push(`${at}: unresolved alias ${sub}.`);
    }
  });
  return errors.slice(0, 25);
}

/** Every token's cssVar must be declared in the CSS (text styles also expose -size/-line/… parts). */
function checkCssConsistency(doc, css) {
  const declared = new Set();
  for (const m of css.matchAll(/(--aegis-[a-z0-9-]+)\s*:/g)) declared.add(m[1]);
  const missing = [];
  walk(doc.tokens, (tok) => {
    const v = tok.$extensions.aegis.cssVar;
    if (!declared.has(v)) missing.push(v);
  });
  const sel = `[data-aegis-theme="${doc.meta.id}"]`;
  if (!css.includes(sel)) missing.push(`selector ${sel}`);
  if (!css.includes(`${sel}[data-aegis-mode="dark"]`)) missing.push('dark mode block');
  return missing;
}

/* ───────────────────────────────────────────── generators */

function resolveValue(doc, value, mode) {
  let guard = 0;
  while (isAlias(value) && guard++ < 20) {
    const node = getPath(doc.tokens, value.slice(1, -1));
    value = node.$modes ? node.$modes[mode] : node.$value;
  }
  return value;
}

function semanticRows(doc) {
  const rows = [];
  const sem = doc.tokens.semantic.color;
  for (const group of Object.keys(sem)) {
    for (const name of Object.keys(sem[group])) {
      const t = sem[group][name];
      rows.push({
        key: `${group}.${name}`,
        cssVar: t.$extensions.aegis.cssVar,
        light: resolveValue(doc, t.$modes.light, 'light'),
        dark: resolveValue(doc, t.$modes.dark, 'dark'),
        desc: t.$description || '',
      });
    }
  }
  return rows;
}

function textStyleRows(doc) {
  const ts = doc.tokens.typography.textStyle;
  return Object.keys(ts).map((k) => {
    const v = ts[k].$value;
    return { name: k, cssVar: ts[k].$extensions.aegis.cssVar, family: resolveValue(doc, v.fontFamily, 'light'), ...v };
  });
}

function scaleList(group, fmt) {
  return Object.keys(group).map((k) => `\`${group[k].$extensions.aegis.cssVar}\` = ${fmt(group[k].$value)}`).join(', ');
}

function contrastSummary(doc) {
  const a = doc.a11y || {};
  const checks = a.checks || [];
  const passed = checks.filter((c) => c.pass).length;
  return { target: a.target || doc.meta.a11yTarget || 'AA', passed, total: checks.length, adjustments: (a.adjustments || []).length, exemptions: a.exemptions || [] };
}

function buildClaudeMd(doc, mode, opts) {
  const m = doc.meta;
  const c = contrastSummary(doc);
  const comp = doc.tokens.component;
  const fonts = (m.fonts.families || []).map((f) => `${f.family} (${(f.weights || []).join('/')})`).join(', ');
  const L = [];
  L.push(`# CLAUDE.md — AegisUI · ${m.name}`, '');
  L.push(`This project uses the **${m.name}** preset (\`${m.id}\`) from AegisUI. ${m.description}`, '');
  L.push('Generated by `aegis-init` from the AegisUI preset build. Regenerate (from the AegisUI repository) instead of editing token values by hand:', '');
  L.push('```bash', `node cli/aegis-init.js --preset=${m.id} --out=<this directory> --force`, '```', '');
  L.push('## Files', '');
  L.push('- `variables.css` — every design token as a CSS custom property, scoped to `[data-aegis-theme]`, with light and dark mode blocks.');
  L.push('- `tokens.json` — the same tokens in the AegisUI token format (source of truth; importable by the AegisUI Figma plugin).', '');
  L.push('## Setup', '');
  L.push('```html', `<html data-aegis-theme="${m.id}" data-aegis-mode="${mode}">  <!-- light | dark | auto -->`, '  <head><link rel="stylesheet" href="variables.css"></head>', '```', '');
  L.push('Put both attributes on the same element; any subtree can carry its own theme/mode.', '');
  L.push(`Default mode for this preset: **${m.defaultMode}**. Density: **${m.density}**. Fonts: ${fonts}${opts.noFonts ? ' — the Google Fonts `@import` was stripped (`--no-fonts`); self-host or load these families yourself.' : ' (loaded by the `@import` at the top of variables.css).'}`, '');
  L.push('## Rules for generated code', '');
  L.push('1. **Never hardcode colors, font sizes, spacing, radii or shadows.** Use the `var(--aegis-…)` properties below. If a value is missing, ask rather than inventing a hex code.');
  L.push('2. **Use semantic color roles, not primitives.** `--aegis-color-<ramp>-<step>` primitives exist only as alias targets; component code should reference `--aegis-bg-*`, `--aegis-fg-*`, `--aegis-border-*`, `--aegis-brand-*` and status roles so dark mode works automatically.');
  L.push('3. **Pair foregrounds with their intended backgrounds.** Text on `--aegis-brand-default` uses `--aegis-fg-on-brand`; text on a status fill uses `--aegis-<status>-on`; text on a status tint uses `--aegis-<status>-fg`.');
  L.push('4. **Form controls use `--aegis-border-strong`** (or `--aegis-input-border`) for their boundary; `--aegis-border-default` is for decorative dividers.');
  L.push('5. **Typography comes from text styles:** `font: var(--aegis-text-<style>)` plus `letter-spacing: var(--aegis-text-<style>-tracking)` and `text-transform: var(--aegis-text-<style>-transform)`.');
  L.push('6. **Spacing only from the scale** (`--aegis-space-*`, px values named by size). Sizes of controls come from `--aegis-size-control-sm|md|lg`.');
  L.push('7. **Keep a visible focus state:** `outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: var(--aegis-focus-ring-offset);`. Never remove outlines without replacing them.');
  L.push('8. **Respect `prefers-reduced-motion`;** use `--aegis-duration-*` and `--aegis-easing-*` for transitions.', '');
  L.push('## Semantic colors', '', '| Token | CSS variable | Light | Dark | Use |', '| --- | --- | --- | --- | --- |');
  for (const r of semanticRows(doc)) L.push(`| ${r.key} | \`${r.cssVar}\` | ${r.light} | ${r.dark} | ${r.desc} |`);
  L.push('', '## Text styles', '', '| Style | Shorthand | Family | Size / line | Weight | Tracking | Case |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const t of textStyleRows(doc)) L.push(`| ${t.name} | \`font: var(${t.cssVar})\` | ${t.family} | ${t.fontSize}/${t.lineHeight}px | ${t.fontWeight} | ${t.letterSpacing}em | ${t.textTransform} |`);
  L.push('', '## Spacing, radius, elevation, motion', '');
  L.push(`- **Spacing:** ${scaleList(doc.tokens.dimension.spacing, (v) => v + 'px')}`);
  L.push(`- **Radius:** ${scaleList(doc.tokens.dimension.radius, (v) => (v > 999 ? 'full' : v + 'px'))}`);
  L.push(`- **Border width:** ${scaleList(doc.tokens.dimension.borderWidth, (v) => v + 'px')}`);
  L.push(`- **Shadows:** ${Object.keys(doc.tokens.shadow).map((k) => '`' + doc.tokens.shadow[k].$extensions.aegis.cssVar + '`').join(', ')}${Object.values(doc.tokens.shadow).every((s) => !s.$modes.light.length) ? ' — this preset is intentionally flat (all resolve to `none`); use borders for separation.' : ''}`);
  L.push(`- **Motion:** ${scaleList(doc.tokens.motion.duration, (v) => v + 'ms')}`, '');
  L.push('## Component recipes', '', 'Build components from these properties so they re-skin with the preset:', '');
  for (const name of Object.keys(comp)) {
    L.push(`- **${name}:** ${Object.keys(comp[name]).map((p) => '`' + comp[name][p].$extensions.aegis.cssVar + '`').join(', ')}`);
  }
  const strings = [];
  for (const [name, props] of Object.entries(comp)) for (const [p, t] of Object.entries(props)) if (t.$type === 'string' && /transform|decoration/.test(p) && t.$value !== 'none') strings.push(`${name} ${p}: \`${t.$value}\``);
  if (strings.length) L.push('', `Preset-specific recipe choices: ${strings.join('; ')}.`);
  L.push('', '## Accessibility', '');
  L.push(`The preset targets **WCAG 2.x ${c.target}** color contrast. At build time the AegisUI build checked ${c.total} foreground/background token pairs across light and dark (${c.passed}/${c.total} passing) and auto-adjusted ${c.adjustments} token(s) along their ramps to meet the target.`);
  for (const e of c.exemptions) L.push(`Documented exemption — \`${e.pair}\`: ${e.reason}`);
  L.push('');
  L.push('These are **automated contrast checks on token pairs, not an accessibility audit or certification.** They do not cover keyboard support, focus order, semantics, screen-reader behavior, motion, content or any colors you introduce. Test the real UI with keyboard and assistive technology.');
  L.push('');
  return L.join('\n');
}

function buildCursorRules(doc, mode) {
  const m = doc.meta;
  const rows = semanticRows(doc);
  const pick = (k) => rows.find((r) => r.key === k);
  const key = ['bg.canvas', 'bg.surface', 'fg.default', 'fg.muted', 'border.default', 'border.strong', 'border.focus', 'brand.default', 'fg.on-brand', 'danger.default', 'success.default'].map(pick).filter(Boolean);
  const c = contrastSummary(doc);
  return [
    `# AegisUI · ${m.name} (${m.id}) — Cursor rules`,
    `# Generated by aegis-init. Tokens: tokens.json · CSS: variables.css · Root: <html data-aegis-theme="${m.id}" data-aegis-mode="${mode}">`,
    '',
    'You are writing UI for a project themed with AegisUI. Follow these rules:',
    '- Never hardcode colors, px font sizes, spacing, radii or shadows. Use var(--aegis-*) custom properties from variables.css.',
    '- Use semantic roles (--aegis-bg-*, --aegis-fg-*, --aegis-border-*, --aegis-brand-*, --aegis-{success,warning,danger,info}-*). Do not use --aegis-color-* primitives in components.',
    '- Text on --aegis-brand-default uses --aegis-fg-on-brand. Text on status fills uses --aegis-<status>-on; on status tints, --aegis-<status>-fg.',
    '- Inputs, selects and checkboxes use --aegis-border-strong for their boundary.',
    '- Typography: font: var(--aegis-text-<style>) with -tracking and -transform parts. Styles: ' + Object.keys(doc.tokens.typography.textStyle).join(', ') + '.',
    '- Spacing: --aegis-space-{' + Object.keys(doc.tokens.dimension.spacing).join(',') + '} (px). Radius: --aegis-radius-{' + Object.keys(doc.tokens.dimension.radius).join(',') + '}.',
    '- Components use their recipe properties, e.g. --aegis-button-radius, --aegis-button-height-md, --aegis-input-border, --aegis-card-padding, --aegis-table-row-height.',
    '- Always keep a visible focus outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color), offset var(--aegis-focus-ring-offset).',
    '- Use native semantic HTML (button, a, label, nav, main, h1–h6) before ARIA. Respect prefers-reduced-motion.',
    `- Contrast target: WCAG ${c.target}, checked automatically on token pairs at build time. This is not an accessibility certification; test the UI with keyboard and screen readers.`,
    '',
    '# Key semantic colors (light / dark)',
    ...key.map((r) => `${r.cssVar}: ${r.light} / ${r.dark}`),
    '',
  ].join('\n');
}

function buildCss(css, doc, opts) {
  let out = css;
  if (opts.noFonts) out = out.replace(/^@import url\([^)]*\);\n\n?/m, '');
  const banner = `/* Generated by aegis-init ${VERSION} from presets/css/${doc.meta.id}.css. Regenerate with --force rather than editing. */\n`;
  return banner + out;
}

/* ───────────────────────────────────────────── main flow */

function generate({ presetInput, outRaw, mode, force, dryRun, noFonts, cwd = process.cwd() }) {
  const presets = loadIndex();
  const id = resolvePresetId(presetInput, presets);
  const outDir = resolveOutDir(outRaw, cwd);

  const tokensSrc = path.join(TOKENS_DIR, `${id}.json`);
  const cssSrc = path.join(CSS_DIR, `${id}.css`);
  let tokensText, cssText, doc;
  try {
    tokensText = fs.readFileSync(tokensSrc, 'utf8');
    cssText = fs.readFileSync(cssSrc, 'utf8');
    doc = JSON.parse(tokensText);
  } catch (e) {
    throw new CliError(`Cannot read preset "${id}" build output: ${e.message}. Run \`npm run build\`.`, 3);
  }
  const problems = validateDoc(doc, id);
  if (problems.length) throw new CliError(`Preset "${id}" failed validation:\n  - ${problems.join('\n  - ')}`, 3);
  const missing = checkCssConsistency(doc, cssText);
  if (missing.length) throw new CliError(`presets/css/${id}.css is out of sync with tokens (missing ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}). Run \`npm run build\`.`, 3);

  const resolvedMode = mode || doc.meta.defaultMode || 'light';
  const files = {
    'tokens.json': tokensText,
    'variables.css': buildCss(cssText, doc, { noFonts }),
    'CLAUDE.md': buildClaudeMd(doc, resolvedMode, { noFonts }),
    '.cursorrules': buildCursorRules(doc, resolvedMode),
  };

  // Conflict check for all files before writing anything.
  const conflicts = [];
  for (const name of OUTPUT_FILES) {
    const p = path.join(outDir, name);
    let st = null;
    try { st = fs.lstatSync(p); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (!st) continue;
    if (st.isSymbolicLink()) throw usage(`Refusing to overwrite symlink ${path.relative(cwd, p)} (even with --force).`);
    if (!st.isFile()) throw usage(`${path.relative(cwd, p)} exists and is not a regular file.`);
    conflicts.push(name);
  }
  if (conflicts.length && !force) {
    throw new CliError(`Not overwriting existing file(s) in ${path.relative(cwd, outDir) || '.'}: ${conflicts.join(', ')}.\nNothing was written. Re-run with --force to replace them.`, 2);
  }

  const result = { preset: id, name: doc.meta.name, mode: resolvedMode, outDir, files: OUTPUT_FILES.map((n) => ({ name: n, bytes: Buffer.byteLength(files[n]), overwritten: conflicts.includes(n) })), dryRun: !!dryRun };
  if (dryRun) return result;

  fs.mkdirSync(outDir, { recursive: true });
  for (const name of OUTPUT_FILES) {
    const dest = path.join(outDir, name);
    const tmp = path.join(outDir, `.${name}.aegis-tmp-${process.pid}`);
    fs.writeFileSync(tmp, files[name], { flag: 'wx' });
    fs.renameSync(tmp, dest);
  }
  // Verify what landed on disk.
  const written = JSON.parse(fs.readFileSync(path.join(outDir, 'tokens.json'), 'utf8'));
  const post = validateDoc(written, id).concat(checkCssConsistency(written, fs.readFileSync(path.join(outDir, 'variables.css'), 'utf8')));
  if (post.length) throw new CliError(`Output verification failed: ${post.slice(0, 3).join('; ')}`, 3);
  return result;
}

function helpText() {
  return `aegis-init ${VERSION} — scaffold an AegisUI preset into a project

Usage
  node cli/aegis-init.js --preset=<id|alias> --out=<directory> [options]
  node cli/aegis-init.js --list
  node cli/aegis-init.js --help

Writes tokens.json, variables.css, CLAUDE.md and .cursorrules into <directory>.

Options
  --preset=<id>   Preset id or alias (see --list). Required.
  --out=<dir>     Output directory, relative to and inside the current directory. Required.
  --mode=<mode>   data-aegis-mode used in the generated instructions: light | dark | auto
                  (default: the preset's own default mode).
  --force, -f     Replace existing output files. Without it, nothing is overwritten.
  --dry-run       Validate and show what would be written; write nothing.
  --no-fonts      Strip the Google Fonts @import from variables.css (for self-hosted fonts).
  --json          Machine-readable output for --list or a generation result.
  --list, -l      List presets and their aliases.
  --version, -v   Print the version.
  --help, -h      Show this help.

Examples
  node cli/aegis-init.js --preset=fintech --out=./apps/trading
  node cli/aegis-init.js --preset=gov-accessible --out=. --mode=light --force

Exit codes: 0 ok · 1 usage error · 2 existing files (use --force) · 3 invalid preset data or IO error.
No network access is performed.
`;
}

function listText(presets, asJson) {
  if (asJson) return JSON.stringify(presets.map((p) => ({ id: p.id, name: p.name, category: p.category, defaultMode: p.defaultMode, density: p.density, a11yTarget: p.a11yTarget, aliases: aliasesFor(p.id) })), null, 2) + '\n';
  const w = Math.max(...presets.map((p) => p.id.length));
  const lines = presets.map((p) => `  ${p.id.padEnd(w)}  ${p.name.padEnd(26)} ${p.defaultMode.padEnd(5)} ${p.a11yTarget.padEnd(3)}  aliases: ${aliasesFor(p.id).join(', ') || '—'}`);
  return `AegisUI presets (${presets.length})\n\n  ${'id'.padEnd(w)}  ${'name'.padEnd(26)} mode  wcag\n${lines.join('\n')}\n`;
}

function run(argv, { cwd = process.cwd(), stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const opts = parseArgs(argv);
    if (opts.help) { stdout.write(helpText()); return 0; }
    if (opts.version) { stdout.write(VERSION + '\n'); return 0; }
    if (opts.list) { stdout.write(listText(loadIndex(), opts.json)); return 0; }
    if (!opts.preset) throw usage('--preset is required. Run with --list to see presets, or --help for usage.');
    if (!opts.out) throw usage('--out is required, e.g. --out=./my-app');
    const r = generate({ presetInput: opts.preset, outRaw: opts.out, mode: opts.mode, force: !!opts.force, dryRun: !!opts['dry-run'], noFonts: !!opts['no-fonts'], cwd });
    if (opts.json) { stdout.write(JSON.stringify(r, null, 2) + '\n'); return 0; }
    const rel = path.relative(cwd, r.outDir) || '.';
    stdout.write(`${r.dryRun ? 'Dry run — would write' : 'Wrote'} AegisUI preset ${r.name} (${r.preset}) to ${rel}/\n`);
    for (const f of r.files) stdout.write(`  ${f.name.padEnd(14)} ${String(f.bytes).padStart(7)} bytes${f.overwritten ? '  (overwritten)' : ''}\n`);
    if (!r.dryRun) stdout.write(`\nNext: <link rel="stylesheet" href="variables.css"> and <html data-aegis-theme="${r.preset}" data-aegis-mode="${r.mode}">\n`);
    return 0;
  } catch (e) {
    if (e instanceof CliError) { stderr.write(`aegis-init: ${e.message}\n`); return e.code; }
    stderr.write(`aegis-init: unexpected error: ${e && e.stack ? e.stack : e}\n`);
    return 3;
  }
}

module.exports = { run, parseArgs, resolvePresetId, resolveOutDir, validateDoc, checkCssConsistency, ALIASES, OUTPUT_FILES, VERSION };

if (require.main === module) process.exitCode = run(process.argv.slice(2));
