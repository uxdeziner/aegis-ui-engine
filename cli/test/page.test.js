'use strict';
/* Keeps the CLI page (cli/index.html) honest: its manifest must match what the CLI writes today. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');
const { build, render } = require('../tools/build-manifest.cjs');
const cli = require('../aegis-init.js');

function loadManifest() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'cli', 'manifest.js'), 'utf8'), sandbox);
  return JSON.parse(JSON.stringify(sandbox.window.AegisCliManifest)); // plain objects from this realm
}

test('cli/manifest.js matches a fresh dry run of every preset, mode and fonts setting', () => {
  const expected = render(build());
  const actual = fs.readFileSync(path.join(ROOT, 'cli', 'manifest.js'), 'utf8');
  assert.strictEqual(actual, expected, 'cli/manifest.js is stale: run node cli/tools/build-manifest.cjs');
});

test('manifest covers all 12 presets with the CLI aliases and output files', () => {
  const m = loadManifest();
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'presets', 'tokens', 'index.json'), 'utf8'));
  assert.deepStrictEqual(Object.keys(m.presets).sort(), index.presets.map((p) => p.id).sort());
  assert.deepStrictEqual(m.files, cli.OUTPUT_FILES);
  assert.strictEqual(m.version, cli.VERSION);
  for (const [alias, id] of Object.entries(cli.ALIASES)) assert.ok(m.presets[id].aliases.includes(alias), `${alias} → ${id} missing`);
  for (const entry of Object.values(m.presets)) {
    assert.strictEqual(Object.keys(entry.sizes).length, 6);
    for (const sizes of Object.values(entry.sizes)) {
      assert.strictEqual(sizes.length, 4);
      sizes.forEach((n) => assert.ok(Number.isInteger(n) && n > 0));
    }
  }
});

test('the CLI page only builds commands: it never touches storage writes or the network', () => {
  const src = fs.readFileSync(path.join(ROOT, 'cli', 'cli-page.js'), 'utf8');
  assert.ok(!/localStorage\.setItem|writeBaseline|clearBaseline/.test(src), 'page must not write storage');
  assert.ok(!/fetch\(|XMLHttpRequest|eval\(|new Function/.test(src), 'page must not fetch or eval');
  assert.ok(!/innerHTML\s*=/.test(src), 'page builds DOM with textContent only');
});
