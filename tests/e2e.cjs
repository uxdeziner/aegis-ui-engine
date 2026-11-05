#!/usr/bin/env node
/*
 * Browser integration tests. Serves the repo under /aegis-ui-engine/ (like a
 * GitHub Pages project site) and drives Chromium with Playwright.
 *
 *   node tests/e2e.cjs            (needs Playwright + Chromium installed locally;
 *                                  they are dev tooling, not a dependency of the app)
 *   SHOTS=dir node tests/e2e.cjs  also saves desktop/mobile screenshots
 *
 * Covers: every page at desktop and mobile (console errors, missing assets,
 * horizontal overflow, shared navigation), theme selection for all 12 presets,
 * state persistence, empty/corrupt storage, cross-tab sync, the Auditor's token
 * baseline, canonical JSON export + Figma Bridge validation, the zip bundle and
 * the Preset Vault → Studio hand-off.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { start } = require('./serve.cjs');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.log('Playwright is not installed; skipping browser tests. Install it locally (npm i -D playwright) to run them.');
  process.exit(0);
}
const K = require('../shared/aegis-contract.js');
const schema = require('../presets/schema/aegis-tokens.schema.json');
const VAULT = require('../presets/aegis-presets.js');

const PAGES = [
  { path: 'index.html', nav: 'Studio', ready: '#preview-root .ae-app' },
  { path: 'auditor/auditor.html', nav: 'Auditor', ready: '#score-num' },
  { path: 'presets/index.html', nav: 'Preset Vault', ready: '#g-stage .g-frame' },
  { path: 'figma-plugin/index.html', nav: 'Figma Bridge', ready: '#validate' },
  { path: 'showcase/showcase.html', nav: 'Showcase', ready: '#main' },
];
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, isMobile: true, hasTouch: true } };
const SHOTS = process.env.SHOTS ? path.resolve(process.env.SHOTS) : null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0, passes = 0;
const external = new Set();
async function test(name, fn) {
  try { await fn(); passes++; console.log('✓ ' + name); }
  catch (e) { failures++; console.log('✗ ' + name + '\n    ' + String(e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n    ') : e)); }
}

(async () => {
  const t0 = Date.now();
  const { server, log, base } = await start(0);
  const browser = await chromium.launch();

  /** New isolated context: external hosts (Google Fonts) are answered locally so runs are deterministic. */
  async function context(vp = 'desktop') {
    const ctx = await browser.newContext({ viewport: { width: VIEWPORTS[vp].width, height: VIEWPORTS[vp].height }, isMobile: !!VIEWPORTS[vp].isMobile, hasTouch: !!VIEWPORTS[vp].hasTouch, acceptDownloads: true });
    await ctx.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === '127.0.0.1' || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
      external.add(u.hostname);
      return route.fulfill({ status: 200, contentType: /css/.test(u.pathname) || u.hostname === 'fonts.googleapis.com' ? 'text/css' : 'application/octet-stream', body: '' });
    });
    return ctx;
  }
  /** Open a page and collect problems. */
  async function open(ctx, rel) {
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
    page.on('response', (r) => { const u = r.url(); if (u.startsWith(base.replace(/\/aegis-ui-engine\/$/, '')) && r.status() >= 400) problems.push('HTTP ' + r.status() + ' ' + u); });
    page.on('requestfailed', (r) => { if (r.url().startsWith('http://127.0.0.1')) problems.push('failed ' + r.url()); });
    await page.goto(base + rel, { waitUntil: 'load' });
    page.problems = problems;
    return page;
  }
  const noProblems = (page) => assert.deepStrictEqual(page.problems, [], page.problems.join('\n'));

  /* ───────── Every page × viewport: errors, assets, overflow, navigation ───────── */
  for (const vp of Object.keys(VIEWPORTS)) {
    for (const p of PAGES) {
      await test(`${p.path} @ ${vp}: loads under /aegis-ui-engine/ with no errors, no missing assets, no sideways scroll`, async () => {
        const ctx = await context(vp);
        const page = await open(ctx, p.path);
        await page.waitForSelector(p.ready, { state: 'attached', timeout: 8000 });
        await wait(700);
        const nav = await page.evaluate(() => {
          const n = document.querySelector('nav.aegis-nav[aria-label="AegisUI modules"]');
          if (!n) return null;
          const links = Array.from(n.querySelectorAll('a'));
          return { labels: links.map((a) => a.textContent.trim()), current: links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent.trim()), hrefs: links.map((a) => a.href), rawHrefs: links.map((a) => a.getAttribute('href')), first: document.body.firstElementChild && document.body.firstElementChild.tagName };
        });
        assert.ok(nav, 'shared navigation missing');
        assert.deepStrictEqual(nav.labels, ['Studio', 'Auditor', 'Preset Vault', 'Figma Bridge', 'Showcase']);
        assert.deepStrictEqual(nav.current, [p.nav], 'aria-current should mark exactly the current module');
        nav.rawHrefs.forEach((h) => assert.ok(!/^(\/|https?:)/.test(h), 'nav link is not relative: ' + h));
        for (const h of nav.hrefs) { const r = await page.request.get(h); assert.strictEqual(r.status(), 200, 'nav link broken: ' + h); }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 1, 'page scrolls sideways by ' + overflow + 'px');
        const clipped = await page.evaluate(() => Array.from(document.querySelectorAll('nav.aegis-nav a')).filter((a) => { const r = a.getBoundingClientRect(); return r.right > window.innerWidth + 0.5 || r.left < -0.5 || r.width < 24 || r.height < 24; }).map((a) => a.textContent.trim()));
        assert.deepStrictEqual(clipped, [], 'nav links off-screen or under 24px: ' + clipped.join(', '));
        const navBox = await page.locator('nav.aegis-nav').boundingBox();
        assert.ok(navBox && navBox.y < 5 && navBox.height >= 40, 'nav is not at the top of the page');
        if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${p.nav.toLowerCase().replace(/\s+/g, '-')}-${vp}.png`) }); }
        noProblems(page);
        await ctx.close();
      });
    }
  }

  await test('navigation: keyboard order (skip link, then modules) and links move between modules', async () => {
    const ctx = await context();
    const page = await open(ctx, 'index.html');
    await page.keyboard.press('Tab');
    assert.match(await page.evaluate(() => document.activeElement.textContent.trim()), /Skip to/);
    await page.keyboard.press('Tab');
    assert.strictEqual(await page.evaluate(() => document.activeElement.textContent.trim()), 'Studio');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert.notStrictEqual(outline, 'none', 'nav link has no visible focus outline');
    await page.click('nav.aegis-nav >> text=Auditor');
    await page.waitForURL(/auditor\/auditor\.html$/);
    await page.click('nav.aegis-nav >> text=Figma Bridge');
    await page.waitForURL(/figma-plugin\/index\.html$/);
    await page.click('nav.aegis-nav >> text=Preset Vault');
    await page.waitForURL(/presets\/index\.html/);
    await page.click('nav.aegis-nav >> text=Showcase');
    await page.waitForURL(/showcase\/showcase\.html$/);
    await page.click('nav.aegis-nav >> text=Studio');
    await page.waitForURL(/aegis-ui-engine\/index\.html$/);
    noProblems(page);
    await ctx.close();
  });

  /* ───────── Studio: theme selection + persistence ───────── */
  await test('Studio: all 12 presets apply (name, brand fill, default mode, baseline) with no errors', async () => {
    const ctx = await context();
    const page = await open(ctx, 'index.html');
    const opts = await page.$$eval('#ds-preset optgroup:nth-of-type(2) option', (os) => os.map((o) => o.value));
    assert.strictEqual(opts.length, 12, 'preset menu lists ' + opts.length + ' AegisUI presets');
    for (const v of opts) {
      const id = v.slice(6);
      const doc = VAULT.get(id);
      await page.selectOption('#ds-preset', v);
      await wait(120);
      const got = await page.evaluate(() => ({ name: document.querySelector('#ds-name').value, primary: window.Aegis.app.state.color.primary, mode: document.querySelector('#preview-root').dataset.mode, key: window.Aegis.app.presetKey, audit: window.Aegis.app.tokens.audit.every((r) => r.pass) }));
      assert.strictEqual(got.name, doc.meta.name);
      assert.strictEqual(got.primary, K.resolvePath(doc, 'semantic.color.brand.default', 'light'));
      assert.strictEqual(got.mode, doc.meta.defaultMode, id + ' preview mode');
      assert.strictEqual(got.key, v);
      assert.ok(got.audit, id + ' fails the Studio contrast audit');
    }
    await wait(600);
    const rec = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), K.BASELINE_KEY);
    assert.strictEqual(rec.presetId, opts[opts.length - 1].slice(6));
    assert.deepStrictEqual(K.validateForPlugin(rec.doc), []);
    noProblems(page);
    await ctx.close();
  });

  await test('Studio: settings persist across reloads (preset, edits, preview mode)', async () => {
    const ctx = await context();
    const page = await open(ctx, 'index.html');
    await page.selectOption('#ds-preset', 'vault:fintech-terminal');
    await wait(400);
    await page.reload(); await page.waitForSelector('#preview-root .ae-app');
    assert.strictEqual(await page.inputValue('#ds-preset'), 'vault:fintech-terminal');
    assert.strictEqual(await page.inputValue('#ds-name'), 'Fintech Terminal');
    assert.strictEqual(await page.getAttribute('#preview-root', 'data-mode'), 'dark');
    await page.fill('#ds-name', 'Terminal Edited');
    await page.fill('#c-primary-hex', '#0f766e');
    await wait(500);
    await page.reload(); await page.waitForSelector('#preview-root .ae-app');
    assert.strictEqual(await page.inputValue('#ds-name'), 'Terminal Edited');
    assert.strictEqual(await page.inputValue('#c-primary-hex'), '#0f766e');
    assert.strictEqual(await page.inputValue('#ds-preset'), 'custom', 'edited preset should read as Custom');
    noProblems(page);
    await ctx.close();
  });

  await test('Studio + Auditor: empty and corrupt storage fall back safely', async () => {
    const ctx = await context();
    const page = await open(ctx, 'auditor/auditor.html');
    await page.waitForSelector('#baseline-info');
    assert.match(await page.textContent('#baseline-info'), /No active tokens/);
    assert.ok(!(await page.isVisible('#baseline-clear')), 'clear button shown without corrupt storage');
    await page.evaluate((k) => { localStorage.setItem(k, '{broken'); localStorage.setItem('aegisui:v1', '{oops'); localStorage.setItem('aegisui:prefs:v1', '{"fmt":"nope","tab":42,"panelW":"wide"}'); }, K.BASELINE_KEY);
    await page.reload(); await page.waitForSelector('#baseline-info');
    assert.match(await page.textContent('#baseline-info'), /ignored/);
    assert.ok(await page.isVisible('#baseline-clear'));
    await page.click('#baseline-clear');
    assert.match(await page.textContent('#baseline-info'), /No active tokens/);
    assert.ok(!(await page.isVisible('#baseline-clear')), 'clear button still shown after clearing');
    const studio = await open(ctx, 'index.html');
    await studio.waitForSelector('#preview-root .ae-app');
    await studio.waitForSelector('.toast');
    const toasts = await studio.$$eval('.toast', (t) => t.map((x) => x.textContent));
    assert.ok(toasts.some((t) => /unreadable/.test(t)), 'no recovery notice: ' + toasts.join(' | '));
    assert.strictEqual(await studio.inputValue('#ds-name'), 'Aegis');
    assert.strictEqual(await studio.getAttribute('#tab-preview', 'aria-selected'), 'true');
    await wait(600);
    assert.strictEqual(await studio.evaluate((k) => JSON.parse(localStorage.getItem(k)).schema, K.BASELINE_KEY), 'aegis-active-tokens@1', 'Studio did not rewrite the baseline');
    noProblems(page); noProblems(studio);
    await ctx.close();
  });

  await test('cross-tab: a preset chosen in one Studio tab updates another Studio tab and the Auditor', async () => {
    const ctx = await context();
    const a = await open(ctx, 'index.html');
    const b = await open(ctx, 'index.html');
    const aud = await open(ctx, 'auditor/auditor.html');
    await a.waitForSelector('#preview-root .ae-app'); await b.waitForSelector('#preview-root .ae-app');
    await a.selectOption('#ds-preset', 'vault:legal-slate');
    await b.waitForFunction(() => document.querySelector('#ds-name').value === 'Legal & Compliance Slate', null, { timeout: 4000 });
    await aud.waitForFunction(() => /Legal & Compliance Slate/.test(document.querySelector('#baseline-info').textContent), null, { timeout: 4000 });
    assert.match(await aud.textContent('#baseline-info'), /seeded from legal-slate/);
    noProblems(a); noProblems(b); noProblems(aud);
    await ctx.close();
  });

  /* ───────── Auditor baseline ───────── */
  await test('Auditor validates against the active baseline and renders with its tokens', async () => {
    const ctx = await context();
    const studio = await open(ctx, 'index.html');
    await studio.waitForSelector('#preview-root .ae-app');
    await wait(600);
    const expected = await studio.evaluate(() => { const d = window.Aegis.app.canonicalDoc(); return window.AegisContract.resolvePath(d, 'semantic.color.fg.default', 'light'); });
    const aud = await open(ctx, 'auditor/auditor.html');
    await aud.waitForSelector('#baseline-info');
    const src = '<!doctype html><html lang="en"><head><title>T</title><style>.a{color:var(--aegis-fg-default);background:var(--ae-color-surface)}.b{color:#ff00aa}.c{color:var(--aegis-nope)}</style></head><body><main><h1 class="a">Hello</h1><p class="b">Pink</p><p class="c">Missing</p></main></body></html>';
    const run = () => aud.evaluate(async (s) => {
      const frame = document.querySelector('#sandbox');
      const r = await window.AegisAuditor.runAuditOn(s, frame);
      const h1 = frame.contentDocument.querySelector('h1');
      return { titles: r.issues.map((i) => i.title), color: getComputedStyle(h1).color, tokens: r.scores.tokens };
    }, src);
    const withBl = await run();
    assert.ok(withBl.titles.includes('Colors outside the active token baseline'), withBl.titles.join(' | '));
    assert.ok(withBl.titles.includes('Token not in the active baseline'), 'unknown --aegis- token not reported');
    assert.ok(!withBl.titles.includes('Undefined custom property'), 'baseline tokens reported as undefined');
    const rgb = (hex) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
    assert.strictEqual(withBl.color, rgb(expected), 'sandbox did not render with the baseline tokens');
    await aud.selectOption('#baseline-mode', 'none');
    const without = await run();
    assert.ok(!without.titles.some((t) => /baseline/i.test(t)), 'baseline checks still active with mode "none"');
    assert.ok(without.titles.includes('Undefined custom property'));
    await aud.reload(); await aud.waitForSelector('#baseline-info');
    assert.strictEqual(await aud.inputValue('#baseline-mode'), 'none', 'baseline mode not remembered');
    noProblems(studio); noProblems(aud);
    await ctx.close();
  });

  /* ───────── Exports + Figma Bridge ───────── */
  await test('Studio exports aegis-tokens.json that passes plugin validation and the schema; old exports remain', async () => {
    const ctx = await context();
    const page = await open(ctx, 'index.html');
    await page.selectOption('#ds-preset', 'vault:gov-accessible');
    await page.click('#tab-export');
    const files = await page.$$eval('#export-files [data-exp]', (b) => b.map((x) => x.querySelector('.file-btn__name').textContent));
    assert.deepStrictEqual(files, ['variables.css', 'tokens.json', 'aegis-tokens.json', 'aegis.config.json']);
    await page.click('[data-exp="canonical"]');
    const doc = JSON.parse(await page.textContent('#exp-output'));
    assert.deepStrictEqual(K.validateForPlugin(doc), []);
    assert.deepStrictEqual(K.validateSchema(doc, schema), []);
    assert.ok(doc.meta.tags.includes('preset:gov-accessible'));
    await page.click('[data-exp="css"]');
    assert.match(await page.textContent('#exp-output'), /--ga-color-bg:/);
    await page.click('[data-exp="json"]');
    assert.ok(JSON.parse(await page.textContent('#exp-output')).semantic, 'DTCG export changed shape');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-zip')]);
    const buf = fs.readFileSync(await dl.path());
    ['README.md', 'styles/variables.css', 'tokens/tokens.json', 'tokens/aegis-tokens.json', 'CLAUDE.md', '.cursorrules', 'AGENTS.md', 'SYSTEM_PROMPT.md', 'aegis.config.json']
      .forEach((f) => assert.ok(buf.includes(Buffer.from('-design-system/' + f)), 'zip is missing ' + f));
    noProblems(page);
    await ctx.close();
  });

  await test('Figma Bridge validates the active Studio tokens (plugin checks + schema over HTTP) and rejects bad input', async () => {
    const ctx = await context();
    const studio = await open(ctx, 'index.html');
    await studio.waitForSelector('#preview-root .ae-app');
    await wait(600);
    const page = await open(ctx, 'figma-plugin/index.html');
    await page.click('#use-active');
    await page.waitForSelector('#results h3');
    const text = await page.textContent('#results');
    assert.match(text, /Ready for the plugin/);
    assert.match(text, /Schema check passed/);
    await page.fill('#json-input', '{"aegis":{"format":"aegis-tokens","version":"1.0.0"},"meta":{"id":"x","name":"X"},"modes":["light"],"tokens":{"primitive":{},"semantic":{"a":{"$type":"color","$value":"{primitive.nope}"}}}}');
    await page.click('#validate');
    await page.waitForFunction(() => /reject/.test(document.querySelector('#results').textContent));
    assert.match(await page.textContent('#results'), /Unresolved alias \{primitive\.nope\}/);
    await page.fill('#json-input', 'not json');
    await page.click('#validate');
    assert.match(await page.textContent('#results'), /Not valid JSON/);
    noProblems(studio); noProblems(page);
    await ctx.close();
  });

  await test('Preset Vault "Open in Studio" seeds the Studio from the chosen preset', async () => {
    const ctx = await context();
    const page = await open(ctx, 'presets/index.html#theme=healthcare-clean&mode=light&view=dashboard');
    await page.waitForSelector('#g-stage .g-frame');
    assert.match(await page.getAttribute('#g-open-studio', 'href'), /^\.\.\/index\.html\?preset=healthcare-clean$/);
    await page.click('#g-open-studio');
    await page.waitForSelector('#preview-root .ae-app');
    await page.waitForFunction(() => document.querySelector('#ds-name').value === 'Healthcare Clean');
    assert.ok(!/preset=/.test(page.url()), 'query parameter left in the URL');
    noProblems(page);
    await ctx.close();
  });

  await test('Studio: unknown ?preset= is reported, not applied', async () => {
    const ctx = await context();
    const page = await open(ctx, 'index.html?preset=does-not-exist');
    await page.waitForSelector('.toast');
    assert.match((await page.$$eval('.toast', (t) => t.map((x) => x.textContent))).join(' '), /Unknown preset/);
    assert.strictEqual(await page.inputValue('#ds-name'), 'Aegis');
    noProblems(page);
    await ctx.close();
  });

  await test('Studio: saved state naming a preset that no longer exists loads as Custom', async () => {
    const ctx = await context();
    const page = await open(ctx, 'index.html');
    await page.evaluate(() => localStorage.setItem('aegisui:v1', JSON.stringify({ name: 'Stale', _preset: 'vault:retired-theme', source: { presetId: 'retired-theme' } })));
    await page.reload(); await page.waitForSelector('#preview-root .ae-app');
    assert.strictEqual(await page.inputValue('#ds-name'), 'Stale');
    assert.strictEqual(await page.inputValue('#ds-preset'), 'custom');
    noProblems(page);
    await ctx.close();
  });

  await test('Preset Vault mobile: the preset drawer opens below the top bar, not under it', async () => {
    const ctx = await context('mobile');
    const page = await open(ctx, 'presets/index.html');
    await page.waitForSelector('#g-stage .g-frame');
    await page.click('#g-menu');
    const gap = await page.evaluate(() => document.querySelector('#g-sidebar').getBoundingClientRect().top - document.querySelector('.g-topbar').getBoundingClientRect().bottom);
    assert.ok(Math.abs(gap) <= 1, 'drawer is offset from the top bar by ' + gap + 'px');
    assert.strictEqual(await page.getAttribute('#g-menu', 'aria-expanded'), 'true');
    noProblems(page);
    await ctx.close();
  });

  const outside = log.filter((l) => l.status === 404);
  await test('no request escaped the /aegis-ui-engine/ mount or hit a missing file', () => {
    assert.deepStrictEqual(outside.map((l) => l.path), []);
  });

  await browser.close();
  server.close();
  console.log(`\nExternal hosts requested (answered locally): ${[...external].join(', ') || 'none'}`);
  console.log(`${failures ? failures + ' failed, ' : ''}${passes} browser checks passed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failures ? 1 : 0);
})();
