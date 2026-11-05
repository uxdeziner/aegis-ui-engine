#!/usr/bin/env node
/*
 * Runs figma-plugin/code.js end-to-end against the strict Figma API mock for
 * every built preset, then asserts on the generated document.
 *   node figma-plugin/test/run.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createFigma } = require('./figma-mock.cjs');

const root = path.resolve(__dirname, '..', '..');
const code = fs.readFileSync(path.join(root, 'figma-plugin', 'code.js'), 'utf8');
const tokensDir = path.join(root, 'presets', 'tokens');
const presets = JSON.parse(fs.readFileSync(path.join(tokensDir, 'index.json'), 'utf8')).presets;

// Simulated font availability: common families with Figma-style style names.
// "Geist" is intentionally missing to exercise the Inter fallback path.
const STYLES = ['Thin', 'ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black', 'Italic', 'Bold Italic'];
const FAMILIES = ['Inter', 'JetBrains Mono', 'IBM Plex Sans', 'IBM Plex Sans Condensed', 'IBM Plex Mono', 'Lexend', 'Source Sans 3', 'Source Code Pro', 'Geist Mono',
  'Inter Tight', 'Source Serif 4', 'Atkinson Hyperlegible', 'DM Sans', 'DM Serif Display', 'DM Mono', 'Barlow', 'Barlow Condensed', 'Roboto Mono',
  'Syne', 'Space Grotesk', 'Space Mono', 'Fraunces', 'Manrope'];
const fonts = [];
FAMILIES.forEach((f) => STYLES.forEach((s) => fonts.push([f, f === 'Inter' ? s.replace('SemiBold', 'Semi Bold').replace('ExtraBold', 'Extra Bold') : s])));

const OPTIONS = { variables: true, hidePrimitives: true, textStyles: true, bindTextStyles: true, effectStyles: true, styleGuide: true, components: true, namespace: false };

async function importDoc(env, doc, options) {
  env.state.messages.length = 0;
  env.figma.ui.onmessage({ type: 'import', doc, options });
  for (let i = 0; i < 400; i++) {
    const last = env.state.messages.find((m) => m.type === 'done' || m.type === 'error');
    if (last) return last;
    await new Promise((r) => setImmediate(r));
  }
  throw new Error('import did not finish');
}

function boot(extra = {}) {
  const env = createFigma({ fonts });
  Object.assign(env.state, extra);
  // eslint-disable-next-line no-new-func
  new Function('figma', '__html__', 'console', code)(env.figma, '<html></html>', { log() {}, error: console.error });
  return env;
}

(async () => {
  let failures = 0;
  const t0 = Date.now();

  for (const p of presets) {
    const doc = JSON.parse(fs.readFileSync(path.join(tokensDir, p.file), 'utf8'));
    const env = boot();
    try {
      const res = await importDoc(env, doc, OPTIONS);
      if (res.type === 'error') throw new Error(res.message + ' ' + (res.details || []).join('; '));
      const s = res.summary;
      const { state } = env;

      // Collections & modes
      const names = state.collections.map((c) => c.name).sort();
      assert.deepStrictEqual(names, ['Components', 'Dimensions', 'Motion', 'Primitives', 'Semantic', 'Typography']);
      const sem = state.collections.find((c) => c.name === 'Semantic');
      assert.deepStrictEqual(sem.modes.map((m) => m.name), ['Light', 'Dark']);

      // Every semantic variable has a value for both modes, primitives aliased where declared
      const semVars = state.variables.filter((v) => v.variableCollectionId === sem.id);
      semVars.forEach((v) => sem.modes.forEach((m) => assert.ok(v.valuesByMode[m.modeId], `${v.name} missing ${m.name}`)));
      const aliased = semVars.filter((v) => Object.values(v.valuesByMode).some((x) => x.type === 'VARIABLE_ALIAS')).length;
      assert.ok(aliased / semVars.length > 0.9, 'most semantic tokens alias primitives');
      assert.ok(semVars.every((v) => /^var\(--aegis-/.test(v.codeSyntax.WEB)), 'code syntax set');

      // Text & effect styles
      assert.strictEqual(state.textStyles.length, 16);
      assert.ok(state.textStyles.every((t) => t.boundVariables.fontSize && t.boundVariables.lineHeight), 'text styles bound');
      const shadowCount = Object.values(doc.tokens.shadow).reduce((n, t) => n + doc.modes.filter((m) => t.$modes[m].length).length, 0);
      assert.strictEqual(state.effectStyles.length, shadowCount);

      // Page & frames
      const page = env.figma.root.children.find((n) => n.name === 'AegisUI · ' + doc.meta.name);
      assert.ok(page, 'style guide page');
      const frameNames = page.children.map((f) => f.name);
      assert.ok(frameNames.includes('Foundations · Light') && frameNames.includes('Foundations · Dark'), 'light/dark foundations');
      const dark = page.children.find((f) => f.name === 'Foundations · Dark');
      assert.strictEqual(dark.explicitModes[sem.id], sem.modes[1].modeId, 'dark frame pinned to Dark mode');
      const sets = page.findAll((n) => n.type === 'COMPONENT_SET').map((n) => n.name).sort();
      assert.deepStrictEqual(sets, ['Badge', 'Button']);
      const buttons = page.findAll((n) => n.type === 'COMPONENT' && /^Variant=/.test(n.name));
      assert.strictEqual(buttons.length, 12);
      assert.ok(buttons.every((b) => b.boundVariables.height && b.boundVariables.paddingLeft && b.fills.every((f) => !f || f.boundVariables)), 'buttons bound to component tokens');
      const tables = page.findAll((n) => /^Tokens \//.test(n.name));
      assert.strictEqual(tables.length, Object.keys(doc.tokens.component).length);
      const unboundTextFills = page.findAll((n) => n.type === 'TEXT' && !(n.fills[0] && n.fills[0].boundVariables));
      assert.strictEqual(unboundTextFills.length, 0, 'every text fill is bound to a variable');

      // Idempotency: second import updates in place
      const before = state.variables.length;
      const res2 = await importDoc(env, doc, OPTIONS);
      assert.strictEqual(res2.type, 'done', res2.message);
      assert.strictEqual(state.variables.length, before, 'no duplicate variables');
      assert.strictEqual(res2.summary.created, 0);
      assert.strictEqual(state.textStyles.length, 16, 'no duplicate text styles');
      assert.strictEqual(env.figma.root.children.filter((n) => n.name === page.name).length, 1, 'page reused');

      console.log(`✓ ${doc.meta.id.padEnd(20)} ${String(s.variables).padStart(3)} vars · ${s.textStyles} text · ${s.effectStyles} fx · ${page.findAll(() => true).length} nodes${s.warnings.length ? ' · ⚠ ' + s.warnings.join(' | ') : ''}`);
    } catch (e) {
      failures++;
      console.log(`✗ ${p.id}: ${e.stack}`);
    }
  }

  // Namespaced import of two presets into one file
  {
    const env = boot();
    for (const id of ['enterprise-saas', 'fintech-terminal']) {
      const doc = JSON.parse(fs.readFileSync(path.join(tokensDir, id + '.json'), 'utf8'));
      const r = await importDoc(env, doc, { ...OPTIONS, namespace: true, styleGuide: false });
      if (r.type !== 'done') { failures++; console.log('✗ namespace', r.message); }
    }
    const n = env.state.collections.length;
    if (n !== 12) { failures++; console.log(`✗ namespace: expected 12 collections, got ${n}`); } else console.log('✓ namespaced import keeps presets side by side (12 collections)');
  }

  // Plan limit: only 1 mode allowed → split collection fallback with warning
  {
    const env = boot({ maxModes: 1 });
    const doc = JSON.parse(fs.readFileSync(path.join(tokensDir, 'enterprise-saas.json'), 'utf8'));
    const r = await importDoc(env, doc, OPTIONS);
    const ok = r.type === 'done' && env.state.collections.some((c) => c.name === 'Semantic (Dark)') && r.summary.warnings.length > 0;
    if (!ok) { failures++; console.log('✗ single-mode plan fallback', r.message || r.summary); } else console.log('✓ single-mode plan falls back to a "Semantic (Dark)" collection');
  }

  // Validation errors are reported, not thrown
  {
    const env = boot();
    const r = await importDoc(env, { hello: 'world' }, OPTIONS);
    if (r.type !== 'error' || !r.details.length) { failures++; console.log('✗ invalid input not rejected'); } else console.log('✓ invalid JSON rejected with ' + r.details.length + ' messages');
    const doc = JSON.parse(fs.readFileSync(path.join(tokensDir, 'enterprise-saas.json'), 'utf8'));
    doc.tokens.semantic.color.bg.canvas.$modes.light = '{primitive.color.nope.500}';
    const r2 = await importDoc(env, doc, OPTIONS);
    if (r2.type !== 'error' || !/nope/.test(r2.details.join())) { failures++; console.log('✗ broken alias not rejected'); } else console.log('✓ broken alias reported: ' + r2.details[0]);
  }

  console.log(`\n${failures ? failures + ' failure(s)' : 'All plugin checks passed'} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failures ? 1 : 0);
})();
