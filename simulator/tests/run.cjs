#!/usr/bin/env node
/*
 * End-to-end tests for the AegisUI Accessibility Simulator.
 *
 *   node simulator/tests/run.cjs            (needs Playwright + Chromium available)
 *
 * Serves the repository under the /aegis-ui-engine/ subpath (as GitHub Pages
 * would), so relative asset paths are exercised for real. Zero dependencies
 * besides Playwright, which is test-only and never loaded by the page.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.error('Playwright is required for these tests: npm i -D playwright (or run where it is preinstalled).');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..', '..');
const BASE = '/aegis-ui-engine/';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (!url.startsWith(BASE)) { res.writeHead(404); return res.end('outside subpath'); }
      const file = path.join(ROOT, url.slice(BASE.length));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

let passed = 0, failed = 0;
const results = [];
function check(name, cond, extra) {
  if (cond) { passed++; results.push('  ✓ ' + name); }
  else { failed++; results.push('  ✗ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

(async () => {
  const srv = await serve();
  const origin = 'http://127.0.0.1:' + srv.address().port;
  const PAGE = origin + BASE + 'simulator/simulator.html';
  const browser = await chromium.launch();
  const problems = [];
  const watch = (page, label) => {
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(label + ' console.' + m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => problems.push(label + ' pageerror: ' + e.message));
    page.on('requestfailed', (r) => { if (r.url().startsWith(origin)) problems.push(label + ' requestfailed: ' + r.url()); });
    page.on('response', (r) => { if (r.url().startsWith(origin) && r.status() >= 400) problems.push(label + ' HTTP ' + r.status() + ': ' + r.url()); });
  };

  try {
    /* ---------------- Load + defaults ---------------- */
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();
    watch(page, 'main');
    await page.goto(PAGE);
    await page.waitForFunction(() => window.AegisSimulator && document.querySelectorAll('#sim-preset option').length > 0);
    results.push('Load');
    check('API exposed', await page.evaluate(() => typeof window.AegisSimulator.review === 'function'));
    check('12 presets listed from the shared registry', (await page.$$eval('#sim-preset option', (o) => o.length)) === 12);
    check('default preset is enterprise-saas/light', await page.evaluate(() => { const w = document.getElementById('ws'); return w.dataset.aegisTheme === 'enterprise-saas' && w.dataset.aegisMode === 'light'; }));
    check('preset tokens resolve on the workspace', await page.evaluate(() => getComputedStyle(document.getElementById('ws')).getPropertyValue('--aegis-brand-default').trim().length > 0));

    /* ---------------- Color simulations ---------------- */
    results.push('Color vision + washout');
    const shotNone = await page.locator('#ws .ws-kpis').screenshot();
    for (const v of ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']) {
      await page.check(`input[name="vision"][value="${v}"]`);
      const info = await page.evaluate(() => {
        const ws = document.getElementById('ws'), f = document.getElementById('sim-filter');
        const cm = f.querySelector('feColorMatrix[type="matrix"]');
        return { filter: ws.style.filter, matrix: cm && cm.getAttribute('values'), cif: cm && cm.getAttribute('color-interpolation-filters'), chip: document.getElementById('sim-chips').textContent };
      });
      check(v + ': SVG color matrix applied in linearRGB', /url\("?#sim-filter"?\)/.test(info.filter) && info.matrix && info.matrix.split(' ').length === 20 && info.cif === 'linearRGB', info);
      check(v + ': active chip shown', info.chip.toLowerCase().includes(v));
      const shot = await page.locator('#ws .ws-kpis').screenshot();
      check(v + ': rendering actually changes', !shot.equals(shotNone));
    }
    const math = await page.evaluate(() => {
      const S = window.AegisSimulator;
      return { gray: S.simulateColor('#ff0000', { vision: 'achromatopsia' }), protRed: S.simulateColor('#ff0000', { vision: 'protanopia' }), deutGreen: S.simulateColor('#00ff00', { vision: 'deuteranopia' }), wash: S.simulateColor('#000000', { washout: true, washoutLevel: 100 }), c: S.contrast('#000000', '#ffffff') };
    });
    check('achromatopsia produces gray', /^#([0-9a-f]{2})\1\1$/.test(math.gray), math.gray);
    check('protanopia shifts pure red away from red', math.protRed !== '#ff0000', math.protRed);
    check('washout lifts black', math.wash !== '#000000', math.wash);
    check('contrast math (21:1)', Math.abs(math.c - 21) < 0.01, math.c);
    await page.check('input[name="vision"][value="none"]');
    check('typical vision removes the filter', await page.evaluate(() => document.getElementById('ws').style.filter === ''));
    await page.check('#sim-washout');
    const w1 = await page.evaluate(() => { const f = document.querySelector('#sim-filter feFuncR'); return f && f.getAttribute('intercept'); });
    await page.locator('#sim-washout-level').fill('100');
    const w2 = await page.evaluate(() => document.querySelector('#sim-filter feFuncR').getAttribute('intercept'));
    check('washout uses feComponentTransfer and follows intensity', w1 && w2 && parseFloat(w2) > parseFloat(w1), { w1, w2 });
    check('washout observations mention UI boundaries', (await page.textContent('#sim-obs')).includes('1.4.11'));
    await page.uncheck('#sim-washout');

    /* ---------------- Text scaling ---------------- */
    results.push('Text scaling');
    const fs100 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ae-stat__value')).fontSize));
    const body100 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ws-sub')).fontSize));
    const navW100 = await page.evaluate(() => document.querySelector('.ws-nav').getBoundingClientRect().width);
    await page.selectOption('#sim-text-scale', '200');
    const fs200 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ae-stat__value')).fontSize));
    const body200 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ws-sub')).fontSize));
    const navW200 = await page.evaluate(() => document.querySelector('.ws-nav').getBoundingClientRect().width);
    check('200% doubles heading text', Math.abs(fs200 - 2 * fs100) < 0.6, { fs100, fs200 });
    check('200% doubles body text', Math.abs(body200 - 2 * body100) < 0.6, { body100, body200 });
    check('layout tokens (nav width) unchanged', Math.abs(navW200 - navW100) < 1, { navW100, navW200 });
    check('chrome text is not scaled', await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.sim-brand h1')).fontSize) < 24));
    check('text observations rendered', /clip|overflow|box|Controls/i.test(await page.textContent('#sim-obs')));
    await page.selectOption('#sim-text-scale', '100');
    check('back to 100% restores sizes', Math.abs((await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.ae-stat__value')).fontSize))) - fs100) < 0.1);

    /* ---------------- RTL ---------------- */
    results.push('RTL');
    await page.check('#sim-rtl');
    const rtl = await page.evaluate(() => { const ws = document.getElementById('ws'); const nav = ws.querySelector('.ws-nav').getBoundingClientRect(), main = ws.querySelector('.ws-main').getBoundingClientRect(); return { dir: ws.getAttribute('dir'), navRight: nav.left > main.left, chromeDir: document.documentElement.getAttribute('dir') }; });
    check('workspace gets dir="rtl"', rtl.dir === 'rtl', rtl);
    check('sidebar mirrors to the right', rtl.navRight, rtl);
    check('simulator chrome stays LTR', rtl.chromeDir === null, rtl);
    await page.uncheck('#sim-rtl');

    /* ---------------- Keyboard focus order ---------------- */
    results.push('Keyboard focus order');
    await page.check('#sim-focus');
    await page.waitForFunction(() => document.querySelectorAll('#sim-focus-overlay .fo-badge').length > 0);
    const stopsInfo = await page.evaluate(() => {
      const st = window.AegisSimulator.focusOrder();
      return { n: st.length, badges: document.querySelectorAll('#sim-focus-overlay .fo-badge').length, paths: document.querySelectorAll('#sim-focus-overlay .fo-path').length, list: document.querySelectorAll('#sim-stops li').length, tabs: st.filter((s) => s.role === 'tab').length, radios: st.filter((s) => s.role === 'radio').length, disabled: st.some((s) => s.element.disabled) };
    });
    check('overlay draws a numbered badge per stop', stopsInfo.n > 30 && stopsInfo.badges === stopsInfo.n, stopsInfo);
    check('overlay draws SVG paths between stops', stopsInfo.paths === stopsInfo.n - 1, stopsInfo);
    check('panel lists every stop', stopsInfo.list === stopsInfo.n, stopsInfo);
    check('roving tabs contribute one stop', stopsInfo.tabs === 1, stopsInfo);
    check('radio group contributes one stop', stopsInfo.radios === 1, stopsInfo);
    check('disabled controls are skipped', !stopsInfo.disabled, stopsInfo);
    // Compare with the browser's real Tab sequence.
    const real = await (async () => {
      await page.evaluate(() => document.getElementById('ws').focus());
      const n = await page.evaluate(() => window.AegisSimulator.focusOrder().length);
      const seq = [];
      for (let i = 0; i < n; i++) { await page.keyboard.press('Tab'); seq.push(await page.evaluate(() => { const a = document.activeElement; return window.AegisSimulator.focusOrder().findIndex((s) => s.element === a); })); }
      return seq;
    })();
    // Chrome adds extra Tab stops for the day/month/year segments inside <input type="date">; collapse repeats.
    const collapsed = real.filter((v, i) => i === 0 || v !== real[i - 1]);
    check('computed order matches real Tab presses', collapsed.every((v, i) => v === i) && collapsed.length >= real.length - 6, collapsed);
    check('overlay highlights the focused stop', (await page.$$('#sim-focus-overlay .is-current')).length >= 1);
    // Positive tabindex goes first, like the browser.
    const pos = await page.evaluate(() => {
      const btns = document.querySelectorAll('#ws .ws-pagehead .ae-btn');
      btns[1].setAttribute('tabindex', '1'); btns[0].setAttribute('tabindex', '2');
      const st = window.AegisSimulator.focusOrder();
      return { first: st[0].name, second: st[1].name };
    });
    // A fresh load resets the browser's sequential-focus starting point to the top of the document.
    await page.reload(); await page.waitForFunction(() => window.AegisSimulator);
    await page.evaluate(() => { const btns = document.querySelectorAll('#ws .ws-pagehead .ae-btn'); btns[1].setAttribute('tabindex', '1'); btns[0].setAttribute('tabindex', '2'); window.AegisSimulator.setState({}); });
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    const t1 = await page.evaluate(() => document.activeElement.textContent.trim());
    await page.keyboard.press('Tab');
    const t2 = await page.evaluate(() => document.activeElement.textContent.trim());
    check('positive tabindex ordered first (matches browser)', pos.first === 'New order' && pos.second === 'Export CSV' && t1 === 'New order' && t2 === 'Export CSV', { pos, t1, t2 });
    check('positive tabindex flagged in observations', (await page.textContent('#sim-obs')).includes('positive tabindex'));
    await page.evaluate(() => document.querySelectorAll('#ws .ws-pagehead .ae-btn').forEach((b) => b.removeAttribute('tabindex')));
    // Step buttons move real focus.
    await page.click('#sim-step-next');
    check('“Next stop” focuses a workspace element', await page.evaluate(() => document.getElementById('ws').contains(document.activeElement)));
    // Roving tablist keyboard support.
    await page.focus('#ws-tab-all');
    await page.keyboard.press('ArrowRight');
    check('ArrowRight moves the selected tab', await page.evaluate(() => document.activeElement.id === 'ws-tab-approval' && document.activeElement.getAttribute('aria-selected') === 'true'));
    await page.keyboard.press('Home');

    /* ---------------- Persistence + reset + inheritance ---------------- */
    results.push('Persistence, reset, preset inheritance');
    await page.check('input[name="vision"][value="deuteranopia"]');
    await page.selectOption('#sim-text-scale', '150');
    await page.reload();
    await page.waitForFunction(() => window.AegisSimulator);
    const kept = await page.evaluate(() => window.AegisSimulator.getState());
    check('settings persist across reload', kept.vision === 'deuteranopia' && kept.textScale === 150 && kept.focusOrder === true, kept);
    await page.click('#sim-reset');
    const after = await page.evaluate(() => ({ s: window.AegisSimulator.getState(), filter: document.getElementById('ws').style.filter, dir: document.getElementById('ws').getAttribute('dir'), fsz: document.getElementById('ws').style.fontSize }));
    check('reset clears every simulation', after.s.vision === 'none' && !after.s.washout && after.s.textScale === 100 && !after.s.rtl && !after.s.focusOrder && after.filter === '' && after.dir === null && after.fsz === '', after);

    const ctx2 = await browser.newContext();
    await ctx2.addInitScript(() => { try { localStorage.setItem('aegis:active-preset', JSON.stringify({ id: 'fintech-terminal', mode: 'dark' })); } catch (e) {} });
    const p2 = await ctx2.newPage(); watch(p2, 'bridge');
    await p2.goto(PAGE); await p2.waitForFunction(() => window.AegisSimulator);
    check('inherits shared active preset from storage', await p2.evaluate(() => { const p = window.AegisSimulator.getPreset(); return p.id === 'fintech-terminal' && p.mode === 'dark' && p.source.startsWith('storage:'); }));
    await p2.goto(PAGE + '?theme=healthcare-clean&mode=dark&vision=tritanopia&scale=200&rtl=1');
    await p2.waitForFunction(() => window.AegisSimulator);
    check('URL parameters win and deep-link settings', await p2.evaluate(() => { const p = window.AegisSimulator.getPreset(), s = window.AegisSimulator.getState(); return p.id === 'healthcare-clean' && p.mode === 'dark' && s.vision === 'tritanopia' && s.textScale === 200 && s.rtl; }));
    await p2.goto(PAGE + '#theme=not-a-preset');
    await p2.waitForFunction(() => window.AegisSimulator);
    check('unknown preset falls back safely', await p2.evaluate(() => window.AegisSimulator.getPreset().id === 'fintech-terminal'));
    await p2.evaluate(() => window.dispatchEvent(new CustomEvent('aegis:preset-change', { detail: { id: 'gov-accessible', mode: 'light' } })));
    check('follows aegis:preset-change events', await p2.evaluate(() => document.getElementById('ws').dataset.aegisTheme === 'gov-accessible'));
    await ctx2.close();

    // Registry missing → hardcoded fallback list, still no errors from the simulator itself.
    const ctx3 = await browser.newContext();
    await ctx3.route('**/aegis-presets.js', (r) => r.abort());
    const p3 = await ctx3.newPage();
    const p3errors = []; p3.on('pageerror', (e) => p3errors.push(e.message));
    await p3.goto(PAGE); await p3.waitForFunction(() => window.AegisSimulator);
    check('works without the preset registry (fallback list)', (await p3.$$eval('#sim-preset option', (o) => o.length)) === 12 && p3errors.length === 0 && await p3.evaluate(() => document.getElementById('ws').dataset.aegisTheme === 'enterprise-saas'), p3errors);
    await ctx3.close();

    /* ---------------- Report ---------------- */
    results.push('Review report + print');
    await page.check('input[name="vision"][value="protanopia"]');
    await page.check('#sim-rtl');
    await page.click('#sim-export');
    await page.waitForSelector('#sim-report-dialog[open]');
    const frame = page.frameLocator('#sim-report-frame');
    await frame.locator('h1').waitFor();
    const reportText = await frame.locator('body').innerText();
    check('report states it is a simulation/review aid', /simulation (&|and) review aid/i.test(reportText));
    check('report says it is NOT a compliance certificate', /not a compliance certificate/i.test(reportText) && /not an accessibility audit, a compliance certificate, or proof of conformance/i.test(reportText));
    check('report lists settings', ['Preset', 'Color vision (on screen)', 'Protanopia', 'Right-to-left', 'Text size'].every((t) => reportText.includes(t)));
    check('report covers all 8 simulations', ['Protanopia', 'Deuteranopia', 'Tritanopia', 'Achromatopsia', 'washout', '200% text scaling', 'Right-to-left layout', 'Keyboard focus order'].every((t) => reportText.includes(t)));
    check('report contains automated observations + focus table', /focus stop/i.test(reportText) && (await frame.locator('table.grid').count()) >= 2);
    check('report never claims conformance', !/\b(certified|certifies|is compliant|conforms to|passes wcag)\b/i.test(reportText.replace(/not a compliance certificate|not an accessibility audit, a compliance certificate, or proof of conformance/gi, '')));
    const restored = await page.evaluate(() => ({ s: window.AegisSimulator.getState(), dir: document.getElementById('ws').getAttribute('dir'), filter: document.getElementById('ws').style.filter }));
    check('review sweep restores on-screen settings', restored.s.vision === 'protanopia' && restored.s.rtl && restored.dir === 'rtl' && /sim-filter/.test(restored.filter), restored);
    check('dialog has accessible name + close button', await page.evaluate(() => { const d = document.getElementById('sim-report-dialog'); return !!document.getElementById(d.getAttribute('aria-labelledby')) && !!document.getElementById('sim-report-close').getAttribute('aria-label'); }));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#sim-report-download')]);
    check('report downloads as .html', /\.html$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    const html = await page.evaluate(() => window.AegisSimulator.buildReport());
    const pp = await browser.newPage();
    watch(pp, 'report');
    await pp.setContent(html);
    await pp.emulateMedia({ media: 'print' });
    const pdf = await pp.pdf({ format: 'A4' });
    check('report prints to PDF', pdf.length > 20000, pdf.length);
    check('report has print stylesheet', html.includes('@media print') && html.includes('@page'));
    await pp.close();
    await page.keyboard.press('Escape');
    await page.click('#sim-reset');

    /* ---------------- Chrome accessibility + mobile ---------------- */
    results.push('Chrome accessibility + responsive');
    const unlabeled = await page.evaluate(() => Array.from(document.querySelectorAll('.sim-header, .sim-panel')).flatMap((r) => Array.from(r.querySelectorAll('input, select, button'))).filter((el) => {
      const n = (el.getAttribute('aria-label') || (el.labels && Array.from(el.labels).map((l) => l.textContent).join('')) || el.textContent || '').trim();
      return !n;
    }).map((el) => el.outerHTML.slice(0, 80)));
    check('every simulator control has a name', unlabeled.length === 0, unlabeled);
    check('only one h1 and one main-like landmark per page', await page.evaluate(() => document.querySelectorAll('h1').length === 1 && document.querySelectorAll('main').length === 0));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const mob = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, panel: getComputedStyle(document.querySelector('.sim-layout')).gridTemplateColumns.split(' ').length, narrow: document.getElementById('ws').classList.contains('is-narrow') }));
    check('mobile: no page-level horizontal scroll', mob.sw <= 390, mob);
    check('mobile: panel stacks above the stage', mob.panel === 1, mob);
    check('mobile: workspace switches to narrow layout', mob.narrow, mob);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.selectOption('#sim-width', '390');
    check('preview width 390 → narrow workspace', await page.evaluate(() => Math.round(document.getElementById('ws').getBoundingClientRect().width) === 390 && document.getElementById('ws').classList.contains('is-narrow')));
    await page.click('#sim-reset');

    /* ---------------- Every preset loads cleanly ---------------- */
    results.push('All presets');
    const ids = await page.$$eval('#sim-preset option', (o) => o.map((x) => x.value));
    let allOk = true;
    for (const id of ids) {
      await page.selectOption('#sim-preset', id);
      const ok = await page.evaluate((id) => document.getElementById('ws').dataset.aegisTheme === id && getComputedStyle(document.getElementById('ws')).getPropertyValue('--aegis-bg-canvas').trim() !== '', id);
      if (!ok) { allOk = false; check('preset ' + id + ' applies', false); }
    }
    check('all ' + ids.length + ' presets apply to the workspace', allOk);
    await page.screenshot({ path: path.join(__dirname, 'last-run.png') });
    await ctx.close();

    results.push('Console');
    check('no console errors, warnings or failed requests', problems.length === 0, problems);
  } catch (err) {
    failed++;
    results.push('  ✗ test run crashed: ' + (err && err.stack || err));
  } finally {
    await browser.close();
    srv.close();
  }
  console.log(results.join('\n'));
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
