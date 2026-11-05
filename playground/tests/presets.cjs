const { chromium } = require('playwright');
const BASE = process.env.PG_URL;
const out = []; const ok = (n, c, x) => out.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
const ready = async p => { await p.waitForFunction(() => { const d = document.getElementById('pg-frame').contentDocument; return d && d.body && d.body.hasAttribute('data-pg-ready'); }); await p.waitForTimeout(150); };
(async () => {
  const b = await chromium.launch();
  async function withStore(setup, url = BASE, route) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    if (route) await p.route(route, r => r.abort());
    await p.goto(BASE + '#empty'); await p.evaluate(setup); await p.goto(url); await ready(p);
    return { p, ctx, errs };
  }
  let r = await withStore(() => localStorage.setItem('aegisui:active-preset', JSON.stringify({ id: 'legal-slate', mode: 'dark' })));
  ok('inherits shared JSON preset', JSON.stringify(await r.p.evaluate(() => AegisPlayground.getState())).includes('"preset":"legal-slate","mode":"dark"'), await r.p.textContent('#pg-preset-note'));
  await r.ctx.close();
  r = await withStore(() => localStorage.setItem('aegisui:active-preset', 'swiss-editorial'));
  ok('inherits bare-id preset w/ default mode', JSON.stringify(await r.p.evaluate(() => [AegisPlayground.getState().preset, AegisPlayground.getState().mode])) === '["swiss-editorial","light"]');
  await r.ctx.close();
  r = await withStore(() => localStorage.setItem('aegisui:active-preset', '{"id":"nope"}'));
  ok('invalid preset → safe default + note', (await r.p.evaluate(() => AegisPlayground.getState().preset)) === 'enterprise-saas' && /Unknown preset/.test(await r.p.textContent('#pg-preset-note')) && (await r.p.evaluate(() => document.documentElement.dataset.aegisTheme)) === 'enterprise-saas');
  await r.ctx.close();
  r = await withStore(() => localStorage.setItem('aegisui:active-preset', 'legal-slate'), BASE + '?preset=gov-accessible&mode=dark');
  ok('URL overrides shared', JSON.stringify(await r.p.evaluate(() => [AegisPlayground.getState().preset, AegisPlayground.getState().mode])) === '["gov-accessible","dark"]');
  // storage event from a second tab
  const p2 = await r.ctx.newPage(); await p2.goto(BASE + '#empty');
  await p2.evaluate(() => localStorage.setItem('aegisui:active-preset', JSON.stringify({ id: 'retail-commerce', mode: 'light' })));
  await r.p.waitForTimeout(300);
  ok('cross-tab storage event updates preset', (await r.p.evaluate(() => AegisPlayground.getState().preset)) === 'retail-commerce');
  ok('never writes shared key', (await r.p.evaluate(() => localStorage.getItem('aegisui:active-preset'))) === JSON.stringify({ id: 'retail-commerce', mode: 'light' }));
  // own persistence: template + preset survive reload
  await r.p.evaluate(() => { AegisPlayground.select('kanban'); localStorage.removeItem('aegisui:active-preset'); });
  await r.p.goto(BASE); await ready(r.p);
  ok('own state restored after reload', JSON.stringify(await r.p.evaluate(() => [AegisPlayground.getState().template, AegisPlayground.getState().preset])) === '["kanban","retail-commerce"]');
  ok('no page errors in preset tests', r.errs.length === 0, r.errs);
  await r.ctx.close();

  // registry unavailable → fallback tokens
  r = await withStore(() => localStorage.clear(), BASE + '#data-grid', '**/presets/aegis-presets.js');
  const fb = await r.p.evaluate(() => ({ s: AegisPlayground.getState(), theme: document.documentElement.getAttribute('data-aegis-theme'), bg: getComputedStyle(document.body).backgroundColor, brand: getComputedStyle(document.documentElement).getPropertyValue('--aegis-brand-default').trim(), sel: document.getElementById('pg-preset').disabled, note: document.getElementById('pg-preset-note').textContent, check: AegisPlayground.lastCheck }));
  ok('fallback when registry missing', fb.s.registry === false && fb.theme === null && fb.brand !== '' && fb.sel && /fallback/i.test(fb.note) && fb.check.missing.length === 0, fb);
  await r.p.check('#pg-mode input[value="dark"]'); await r.p.waitForTimeout(150);
  ok('fallback dark mode', (await r.p.evaluate(() => getComputedStyle(document.body).backgroundColor)) !== fb.bg);
  ok('no page errors with registry missing', r.errs.length === 0, r.errs);
  await r.ctx.close();
  r = await withStore(() => localStorage.clear(), BASE + '#kanban', /aegis-presets\.(js|css)$/);
  ok('fallback when registry + preset CSS missing', (await r.p.evaluate(() => AegisPlayground.lastCheck.missing.length)) === 0 && r.errs.length === 0, r.errs);
  await r.ctx.close();

  // token resolution sweep across presets/modes
  r = await withStore(() => localStorage.clear());
  const ids = await r.p.evaluate(() => AegisPlayground.templates().map(t => t.id));
  const bad = [];
  for (const [preset, mode] of [['fintech-terminal', 'dark'], ['gov-accessible', 'light'], ['creative-agency', 'dark'], ['wellness-hr', 'light']]) {
    await r.p.evaluate(([a, m]) => AegisPlayground.setPreset(a, m), [preset, mode]);
    for (const id of ids) {
      await r.p.evaluate(i => AegisPlayground.select(i), id); await ready(r.p);
      const c = await r.p.evaluate(() => AegisPlayground.lastCheck);
      if (c.missing.length || c.raw) bad.push([preset, id, c.missing]);
    }
  }
  ok('all 39 templates resolve tokens in 4 presets/modes', bad.length === 0, bad.slice(0, 5));
  ok('no errors in sweep', r.errs.length === 0, r.errs);
  await r.ctx.close();
  console.log(out.join('\n')); console.log('\nFAILS:', out.filter(x => x.startsWith('FAIL')).length, '/', out.length);
  await b.close();
})();
