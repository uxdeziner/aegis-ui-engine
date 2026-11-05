#!/usr/bin/env node
/*
 * Integration tests for the canonical token contract (shared/aegis-contract.js):
 *   • Studio → aegis-tokens adapter for the Studio starters and all 12 presets
 *   • JSON-schema conformance (presets/schema/aegis-tokens.schema.json)
 *   • Parity with the Figma plugin's own validate() and a full plugin import
 *   • Old Studio exports (variables.css, DTCG tokens.json) unchanged in shape
 *   • Active-baseline store: empty, corrupt, invalid, quota, round trip
 * No dependencies:  node tests/contract.test.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
global.window = {};
['color', 'tokens', 'compiler'].forEach((f) => require(path.join(root, 'js', f + '.js')));
const A = global.window.Aegis;
const K = require(path.join(root, 'shared', 'aegis-contract.js'));
const VAULT = require(path.join(root, 'presets', 'aegis-presets.js'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'presets', 'schema', 'aegis-tokens.schema.json'), 'utf8'));
const { createFigma } = require(path.join(root, 'figma-plugin', 'test', 'figma-mock.cjs'));
const pluginCode = fs.readFileSync(path.join(root, 'figma-plugin', 'code.js'), 'utf8');

let failures = 0, passes = 0;
async function test(name, fn) {
  try { await fn(); passes++; console.log('✓ ' + name); }
  catch (e) { failures++; console.log('✗ ' + name + '\n    ' + (e && e.message ? e.message.split('\n').join('\n    ') : e)); }
}
const studioDoc = (state) => K.fromStudio(A.tokens.build(state));

/* ---------- Figma plugin harness (same fonts as figma-plugin/test/run.cjs) ---------- */
const STYLES = ['Thin', 'ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'];
const FAMILIES = ['Inter', 'JetBrains Mono', 'IBM Plex Sans', 'Lexend', 'Source Sans 3', 'Atkinson Hyperlegible', 'Fraunces', 'Manrope'];
const fonts = [];
FAMILIES.forEach((f) => STYLES.forEach((s) => fonts.push([f, f === 'Inter' ? s.replace('SemiBold', 'Semi Bold').replace('ExtraBold', 'Extra Bold') : s])));
const OPTIONS = { variables: true, hidePrimitives: true, textStyles: true, bindTextStyles: true, effectStyles: true, styleGuide: true, components: true, namespace: false };
function boot() {
  const env = createFigma({ fonts });
  // eslint-disable-next-line no-new-func
  new Function('figma', '__html__', 'console', pluginCode)(env.figma, '<html></html>', { log() {}, error() {} });
  return env;
}
async function pluginImport(doc) {
  const env = boot();
  env.state.messages.length = 0;
  env.figma.ui.onmessage({ type: 'import', doc, options: OPTIONS });
  for (let i = 0; i < 600; i++) {
    const last = env.state.messages.find((m) => m.type === 'done' || m.type === 'error');
    if (last) return { res: last, env };
    await new Promise((r) => setImmediate(r));
  }
  throw new Error('plugin import did not finish');
}

/* ---------- fake localStorage ---------- */
function fakeStorage(opts = {}) {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (opts.quota) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); },
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

(async () => {
  const t0 = Date.now();

  await test('schema checker accepts all 12 preset documents', () => {
    const list = VAULT.list();
    assert.strictEqual(list.length, 12, 'expected 12 presets, got ' + list.length);
    list.forEach((p) => {
      const errs = K.validateSchema(VAULT.get(p.id), schema);
      assert.deepStrictEqual(errs, [], p.id + ': ' + errs.slice(0, 3).join('; '));
    });
  });

  await test('schema checker rejects malformed documents', () => {
    const bad = JSON.parse(JSON.stringify(VAULT.get('enterprise-saas')));
    bad.aegis.format = 'nope'; bad.modes = ['dark']; bad.meta.id = 'Has Spaces';
    bad.tokens.dimension.spacing['4'].$type = 'length';
    const errs = K.validateSchema(bad, schema);
    ['$.aegis.format', '$.modes', '$.meta.id', '$.tokens.dimension.spacing'].forEach((needle) => assert.ok(errs.some((e) => e.includes(needle)), 'missing error for ' + needle + ' in ' + errs.join(' | ')));
  });

  await test('Studio export (every Studio starter) conforms to schema and plugin validation', () => {
    Object.entries(A.tokens.PRESETS).forEach(([k, p]) => {
      const doc = studioDoc(p.state);
      assert.deepStrictEqual(K.validateForPlugin(doc), [], k + ' plugin');
      assert.deepStrictEqual(K.validateSchema(doc, schema), [], k + ' schema');
      assert.strictEqual(doc.aegis.format, 'aegis-tokens');
      assert.ok(doc.a11y.pass, k + ': a11y block reports a failing pair');
    });
  });

  await test('all 12 presets load into Studio through the adapter and re-export cleanly', () => {
    VAULT.list().forEach((p) => {
      const preset = VAULT.get(p.id);
      const state = A.tokens.sanitizeState(K.toStudioState(preset));
      assert.strictEqual(state.source.presetId, p.id);
      assert.strictEqual(state.name, preset.meta.name);
      assert.strictEqual(state.color.primary, K.resolvePath(preset, 'semantic.color.brand.default', 'light'), p.id + ' brand fill not carried over');
      ['heading', 'body', 'mono'].forEach((r) => assert.strictEqual(state.type[r], 'custom', p.id + ' ' + r + ' font stack not carried over'));
      const tk = A.tokens.build(state);
      assert.ok(tk.audit.every((r) => r.pass), p.id + ': Studio contrast audit fails after adaptation');
      const doc = K.fromStudio(tk);
      assert.deepStrictEqual(K.validateSchema(doc, schema), [], p.id);
      assert.ok(doc.meta.tags.includes('preset:' + p.id));
    });
  });

  await test('sanitizeState rejects hostile font stacks and unknown preset ids', () => {
    const s = A.tokens.sanitizeState({ type: { heading: 'custom', custom: { heading: { label: 'X<script>', stack: ['Inter; } body { color: red', 'Inter'] } } }, source: { presetId: '../../etc' } });
    assert.deepStrictEqual(s.type.custom.heading.stack, ['Inter']);
    assert.ok(!/[<>]/.test(s.type.custom.heading.label));
    assert.strictEqual(s.source, undefined);
    const s2 = A.tokens.sanitizeState({ type: { heading: 'custom' } });
    assert.strictEqual(s2.type.heading, 'system-sans', 'custom without a stack must fall back');
  });

  await test('validateForPlugin matches the plugin’s own messages', async () => {
    const good = studioDoc(A.tokens.DEFAULT_STATE);
    const broken = JSON.parse(JSON.stringify(good));
    broken.tokens.semantic.color.bg.canvas.$modes.light = '{primitive.color.nope.500}';
    broken.tokens.component.button.radius.$value = '{dimension.radius.missing}';
    const cases = [
      { aegis: { format: 'x' } },
      { aegis: { format: 'aegis-tokens', version: '2.0.0' }, meta: { id: 'a', name: 'A' }, modes: ['light'], tokens: { primitive: {}, semantic: {} } },
      Object.assign({}, good, { modes: ['dark'] }),
      broken,
    ];
    for (const doc of cases) {
      const { res } = await pluginImport(doc);
      assert.strictEqual(res.type, 'error', 'plugin accepted an invalid doc');
      assert.deepStrictEqual(K.validateForPlugin(doc), res.details, 'messages differ');
    }
  });

  await test('Figma plugin imports a Studio export end to end', async () => {
    const doc = studioDoc(A.tokens.PRESETS.health.state);
    const { res, env } = await pluginImport(doc);
    assert.strictEqual(res.type, 'done', res.message + ' ' + (res.details || []).join('; '));
    const s = res.summary;
    assert.ok(s.variables > 250, 'only ' + s.variables + ' variables');
    assert.strictEqual(s.textStyles, 16);
    assert.ok(s.effectStyles >= 10, 'effect styles ' + s.effectStyles);
    const cols = env.state.collections.map((c) => c.name);
    ['Primitives', 'Semantic', 'Dimensions', 'Typography', 'Motion', 'Components'].forEach((n) => assert.ok(cols.includes(n), 'missing collection ' + n));
    const sem = env.state.collections.find((c) => c.name === 'Semantic');
    assert.deepStrictEqual(sem.modes.map((m) => m.name), ['Light', 'Dark']);
  });

  await test('Figma plugin imports an adapted preset round trip (Fintech Terminal → Studio → plugin)', async () => {
    const state = A.tokens.sanitizeState(K.toStudioState(VAULT.get('fintech-terminal')));
    const { res } = await pluginImport(K.fromStudio(A.tokens.build(state)));
    assert.strictEqual(res.type, 'done', res.message);
  });

  await test('old Studio exports keep their shape (variables.css + DTCG tokens.json)', () => {
    const tk = A.tokens.build(A.tokens.DEFAULT_STATE);
    const css = A.tokens.toCSS(tk);
    ['--ae-color-bg:', '--ae-primary-600:', '--ae-font-size-base:', '--ae-space-4:', '--ae-radius-md:', '--ae-shadow-md:', '--ae-duration-base:', '--ae-ease-standard:', ':root[data-theme="dark"]', 'prefers-reduced-motion'].forEach((n) => assert.ok(css.includes(n), 'variables.css lost ' + n));
    const dtcg = JSON.parse(A.tokens.toDTCG(tk));
    assert.deepStrictEqual(Object.keys(dtcg), ['$description', 'color', 'semantic', 'font', 'typography', 'space', 'size', 'radius', 'shadow', 'duration', 'easing', 'transition']);
    assert.strictEqual(dtcg.color.primary.$type, 'color');
  });

  await test('flatten exposes canonical CSS variables and both-mode palette', () => {
    const doc = studioDoc(A.tokens.DEFAULT_STATE);
    const f = K.flatten(doc, 'light', { '--ae-color-bg': '#f7faff', '--bad': 'red;}<x' });
    assert.ok(/^#/.test(f.vars['--aegis-bg-canvas']));
    assert.strictEqual(f.vars['--aegis-space-8'], '8px');
    assert.ok(f.vars['--aegis-text-body-md'].includes('px/'));
    assert.strictEqual(f.vars['--ae-color-bg'], '#f7faff');
    assert.strictEqual(f.vars['--bad'], undefined, 'unsafe extra var was kept');
    const dark = K.resolvePath(doc, 'semantic.color.bg.canvas', 'dark');
    assert.ok(f.palette.some((c) => c.hex === dark), 'dark-mode colors missing from palette');
  });

  await test('baseline store survives empty, corrupt, invalid, full and missing storage', () => {
    const doc = studioDoc(A.tokens.DEFAULT_STATE);
    delete global.localStorage;
    assert.strictEqual(K.readBaseline().status, 'unavailable');
    assert.strictEqual(K.writeBaseline(doc).ok, false);
    global.localStorage = fakeStorage();
    assert.strictEqual(K.readBaseline().status, 'empty');
    localStorage.setItem(K.BASELINE_KEY, '{not json');
    assert.strictEqual(K.readBaseline().status, 'corrupt');
    localStorage.setItem(K.BASELINE_KEY, JSON.stringify({ schema: 'other' }));
    assert.strictEqual(K.readBaseline().status, 'corrupt');
    localStorage.setItem(K.BASELINE_KEY, JSON.stringify({ schema: 'aegis-active-tokens@1', doc: { aegis: { format: 'aegis-tokens', version: '1.0.0' } } }));
    const r = K.readBaseline();
    assert.strictEqual(r.status, 'corrupt'); assert.ok(/validation/.test(r.reason));
    const w = K.writeBaseline(doc, { origin: 'studio', presetId: 'legal-slate', prefix: 'ae', extraVars: { '--ae-color-bg': '#fff' } });
    assert.ok(w.ok);
    const back = K.readBaseline();
    assert.strictEqual(back.status, 'ok');
    assert.strictEqual(back.record.presetId, 'legal-slate');
    assert.deepStrictEqual(back.record.doc, doc);
    assert.ok(K.clearBaseline());
    assert.strictEqual(K.readBaseline().status, 'empty');
    assert.strictEqual(K.writeBaseline({ nope: true }).ok, false, 'invalid doc was stored');
    global.localStorage = fakeStorage({ quota: true });
    const q = K.writeBaseline(doc);
    assert.strictEqual(q.ok, false); assert.ok(/full/.test(q.reason));
    delete global.localStorage;
  });

  await test('bridge API surface and storage constants are stable (docs/INTEGRATION.md)', () => {
    assert.strictEqual(K.API_VERSION.split('.')[0], '1');
    assert.strictEqual(K.BASELINE_KEY, 'aegis:active-tokens:v1');
    assert.strictEqual(K.BASELINE_SCHEMA, 'aegis-active-tokens@1');
    assert.strictEqual(K.FORMAT, 'aegis-tokens');
    ['readBaseline', 'parseBaseline', 'writeBaseline', 'clearBaseline', 'onBaselineChange', 'validateForPlugin', 'validateSchema', 'flatten',
      'resolve', 'resolvePath', 'fromStudio', 'toStudioState', 'walk', 'getPath', 'isAlias', 'toHex8'].forEach((n) => assert.strictEqual(typeof K[n], 'function', 'missing export ' + n));
    const doc = fs.readFileSync(path.join(root, 'docs', 'INTEGRATION.md'), 'utf8');
    [K.BASELINE_KEY, K.BASELINE_SCHEMA, 'API_VERSION', 'aegis-nav:future-modules'].forEach((n) => assert.ok(doc.includes(n), 'docs/INTEGRATION.md does not mention ' + n));
  });

  console.log(`\n${failures ? failures + ' failed, ' : ''}${passes} contract checks passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failures ? 1 : 0);
})();
