'use strict';
// Run: node --test cli/test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(ROOT, 'cli', 'aegis-init.js');
const { validateDoc, checkCssConsistency, ALIASES, OUTPUT_FILES } = require(CLI);
const INDEX = JSON.parse(fs.readFileSync(path.join(ROOT, 'presets', 'tokens', 'index.json'), 'utf8')).presets;
const IDS = INDEX.map((p) => p.id);

function tmp() { return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-init-'))); }
function cli(args, cwd) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
function walkLeaves(node, fn) {
  if (node && typeof node === 'object' && ('$value' in node || '$modes' in node)) return fn(node);
  if (node && typeof node === 'object') for (const k of Object.keys(node)) if (!k.startsWith('$')) walkLeaves(node[k], fn);
}

test('catalogue has the 12 real presets and every alias targets one of them', () => {
  assert.equal(IDS.length, 12);
  for (const [alias, id] of Object.entries(ALIASES)) assert.ok(IDS.includes(id), `${alias} → ${id}`);
});

test('generates all four files for every preset, consistent with the preset build', () => {
  const cwd = tmp();
  for (const id of IDS) {
    const r = cli([`--preset=${id}`, `--out=out/${id}`], cwd);
    assert.equal(r.code, 0, r.err);
    const dir = path.join(cwd, 'out', id);
    assert.deepEqual(fs.readdirSync(dir).sort(), [...OUTPUT_FILES].sort());

    // tokens.json is byte-identical to the build output and passes schema validation
    const tokensText = fs.readFileSync(path.join(dir, 'tokens.json'), 'utf8');
    assert.equal(tokensText, fs.readFileSync(path.join(ROOT, 'presets', 'tokens', `${id}.json`), 'utf8'));
    const doc = JSON.parse(tokensText);
    assert.deepEqual(validateDoc(doc, id), []);

    // variables.css declares every token's cssVar, and contains the source CSS verbatim
    const css = fs.readFileSync(path.join(dir, 'variables.css'), 'utf8');
    assert.deepEqual(checkCssConsistency(doc, css), []);
    assert.ok(css.endsWith(fs.readFileSync(path.join(ROOT, 'presets', 'css', `${id}.css`), 'utf8')));
    let n = 0;
    walkLeaves(doc.tokens, (t) => { n++; assert.match(css, new RegExp(t.$extensions.aegis.cssVar.replace(/-/g, '\\-') + '\\s*:')); });
    assert.ok(n > 250, 'non-trivial token count');

    // CLAUDE.md / .cursorrules reference only variables that exist in variables.css
    const declared = new Set([...css.matchAll(/(--aegis-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    for (const file of ['CLAUDE.md', '.cursorrules']) {
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      assert.ok(text.includes(id), `${file} names the preset`);
      for (const [, v] of text.matchAll(/(--aegis-[a-z0-9-]+[a-z0-9])(?![a-z0-9-]*[<*{])/g)) {
        if (/^--aegis-(color|text|space|radius)$/.test(v)) continue; // prefixes used in prose
        assert.ok(declared.has(v), `${id}/${file} references undeclared ${v}`);
      }
    }
    const md = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
    assert.match(md, /data-aegis-mode="(light|dark)"/);
    assert.match(md, /not an accessibility audit or certification/);
    assert.match(md, new RegExp(`WCAG 2\\.x ${doc.a11y.target}`));
  }
});

test('alias resolves to the real preset; --mode and --no-fonts are honoured', () => {
  const cwd = tmp();
  const r = cli(['--preset=fintech', '--out=app', '--mode=light', '--no-fonts'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /fintech-terminal/);
  const doc = JSON.parse(fs.readFileSync(path.join(cwd, 'app', 'tokens.json'), 'utf8'));
  assert.equal(doc.meta.id, 'fintech-terminal');
  assert.match(fs.readFileSync(path.join(cwd, 'app', 'CLAUDE.md'), 'utf8'), /data-aegis-mode="light"/);
  assert.doesNotMatch(fs.readFileSync(path.join(cwd, 'app', 'variables.css'), 'utf8'), /@import/);
  // default mode comes from the preset (fintech is dark-first)
  cli(['--preset=fintech', '--out=app2'], cwd);
  assert.match(fs.readFileSync(path.join(cwd, 'app2', 'CLAUDE.md'), 'utf8'), /data-aegis-mode="dark"/);
});

test('--help, --list, --list --json and --version', () => {
  const cwd = tmp();
  const h = cli(['--help'], cwd);
  assert.equal(h.code, 0);
  assert.match(h.out, /--preset=<id>/);
  const l = cli(['--list'], cwd);
  assert.equal(l.code, 0);
  for (const id of IDS) assert.ok(l.out.includes(id));
  const j = JSON.parse(cli(['--list', '--json'], cwd).out);
  assert.deepEqual(j.map((p) => p.id), IDS);
  assert.ok(j.find((p) => p.id === 'gov-accessible').aliases.includes('gov'));
  assert.match(cli(['-v'], cwd).out, /^\d+\.\d+\.\d+/);
  assert.deepEqual(fs.readdirSync(cwd), [], 'informational commands write nothing');
});

test('rejects unknown presets, unknown/malformed args and missing values', () => {
  const cwd = tmp();
  const cases = [
    [['--preset=fintek', '--out=x'], /Unknown preset "fintek".*fintech/],
    [['--preset=nope', '--out=x'], /Unknown preset "nope"/],
    [['--bogus'], /Unknown option "--bogus"/],
    [['fintech'], /Unexpected argument "fintech"/],
    [['--preset'], /--preset requires a value/],
    [['--preset=', '--out=x'], /--preset requires a value/],
    [['--out=x'], /--preset is required/],
    [['--preset=saas'], /--out is required/],
    [['--preset=saas', '--out=x', '--mode=sepia'], /--mode must be/],
    [['--preset=saas', '--preset=gov', '--out=x'], /more than once/],
    [['--force=yes', '--preset=saas', '--out=x'], /does not take a value/],
  ];
  for (const [args, re] of cases) {
    const r = cli(args, cwd);
    assert.equal(r.code, 1, `${args.join(' ')} → ${r.code} ${r.err}`);
    assert.match(r.err, re);
  }
  assert.deepEqual(fs.readdirSync(cwd), [], 'nothing written on usage errors');
});

test('never overwrites existing files without --force, and writes nothing on conflict', () => {
  const cwd = tmp();
  fs.mkdirSync(path.join(cwd, 'app'));
  fs.writeFileSync(path.join(cwd, 'app', 'CLAUDE.md'), '# my own notes\n');
  const r = cli(['--preset=saas', '--out=app'], cwd);
  assert.equal(r.code, 2);
  assert.match(r.err, /CLAUDE\.md/);
  assert.match(r.err, /--force/);
  assert.equal(fs.readFileSync(path.join(cwd, 'app', 'CLAUDE.md'), 'utf8'), '# my own notes\n');
  assert.deepEqual(fs.readdirSync(path.join(cwd, 'app')), ['CLAUDE.md'], 'no partial output');

  const f = cli(['--preset=saas', '--out=app', '--force'], cwd);
  assert.equal(f.code, 0, f.err);
  assert.match(f.out, /CLAUDE\.md.*overwritten/);
  assert.match(fs.readFileSync(path.join(cwd, 'app', 'CLAUDE.md'), 'utf8'), /Enterprise SaaS/);
  assert.equal(fs.readdirSync(path.join(cwd, 'app')).length, 4);
  assert.ok(!fs.readdirSync(path.join(cwd, 'app')).some((n) => n.includes('aegis-tmp')), 'no temp files left');

  // Switching preset with --force replaces the content
  assert.equal(cli(['--preset=gov', '--out=app', '-f'], cwd).code, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(cwd, 'app', 'tokens.json'), 'utf8')).meta.id, 'gov-accessible');
});

test('--dry-run validates but writes nothing', () => {
  const cwd = tmp();
  const r = cli(['--preset=swiss', '--out=app', '--dry-run'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /Dry run/);
  assert.equal(fs.existsSync(path.join(cwd, 'app')), false);
});

test('blocks path traversal, paths outside cwd and symlinks', () => {
  const cwd = tmp();
  const outside = tmp();
  for (const out of ['../escape', 'a/../../escape', outside, '/']) {
    const r = cli(['--preset=saas', `--out=${out}`], cwd);
    assert.equal(r.code, 1, `${out}: ${r.err}`);
  }
  assert.deepEqual(fs.readdirSync(outside), []);

  // symlinked directory pointing outside
  fs.symlinkSync(outside, path.join(cwd, 'linkdir'));
  const s = cli(['--preset=saas', '--out=linkdir/app'], cwd);
  assert.equal(s.code, 1);
  assert.match(s.err, /symlink/);
  assert.deepEqual(fs.readdirSync(outside), []);

  // symlinked output file is refused even with --force
  fs.mkdirSync(path.join(cwd, 'app'));
  const victim = path.join(outside, 'victim.txt');
  fs.writeFileSync(victim, 'keep');
  fs.symlinkSync(victim, path.join(cwd, 'app', 'tokens.json'));
  const f = cli(['--preset=saas', '--out=app', '--force'], cwd);
  assert.equal(f.code, 1);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'keep');

  // a file where the directory should be
  fs.writeFileSync(path.join(cwd, 'afile'), '');
  assert.equal(cli(['--preset=saas', '--out=afile'], cwd).code, 1);

  // "." is allowed
  const dot = tmp();
  assert.equal(cli(['--preset=saas', '--out=.'], dot).code, 0);
});

test('validator rejects corrupted documents', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'presets', 'tokens', 'legal-slate.json'), 'utf8'));
  assert.deepEqual(validateDoc(doc, 'legal-slate'), []);
  assert.match(validateDoc(doc, 'other').join(), /does not match/);
  const bad = JSON.parse(JSON.stringify(doc));
  bad.tokens.semantic.color.bg.canvas.$modes.light = '{primitive.color.nope.1}';
  delete bad.tokens.semantic.color.fg.default.$modes.dark;
  bad.aegis.version = '2.0.0';
  const errs = validateDoc(bad, 'legal-slate').join('\n');
  assert.match(errs, /version/);
  const bad2 = JSON.parse(JSON.stringify(doc));
  bad2.tokens.semantic.color.bg.canvas.$modes.light = '{primitive.color.nope.1}';
  delete bad2.tokens.semantic.color.fg.default.$modes.dark;
  const e2 = validateDoc(bad2, 'legal-slate').join('\n');
  assert.match(e2, /unresolved alias/);
  assert.match(e2, /no value for mode "dark"/);
  assert.deepEqual(validateDoc([], 'x'), ['Document is not a JSON object.']);
  assert.ok(checkCssConsistency(doc, '[data-aegis-theme="legal-slate"] { --aegis-bg-canvas: red; }').length > 100);
});

test('makes no network calls: only fs/path are required', () => {
  const src = fs.readFileSync(CLI, 'utf8');
  const requires = [...src.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(requires, ['node:fs', 'node:path']);
  assert.doesNotMatch(src, /\bfetch\(|https?\.request|net\.connect/);
});
