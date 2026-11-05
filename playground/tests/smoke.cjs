const { chromium } = require('playwright');
const URL = process.env.PG_URL;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  const isExternal = t => /fonts\.(googleapis|gstatic)|ERR_|net::/.test(t);
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !isExternal(m.text())) errs.push('console: ' + m.text()); });
  p.on('requestfailed', r => { if (!/fonts\.g/.test(r.url())) errs.push('reqfail: ' + r.url()); });
  await p.goto(URL); await p.waitForTimeout(800);
  const ids = await p.evaluate(() => AegisPlayground.templates().map(t => t.id));
  console.log('templates', ids.length);
  const results = [];
  for (const id of ids) {
    await p.evaluate(i => AegisPlayground.select(i), id);
    await p.waitForFunction(() => { const d = document.getElementById('pg-frame').contentDocument; return d && d.body && d.body.hasAttribute('data-pg-ready'); }, null, { timeout: 5000 });
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => ({ check: AegisPlayground.lastCheck, err: document.getElementById('pg-error').hidden ? '' : document.getElementById('pg-error').textContent }));
    results.push([id, r.check && r.check.tokens, r.check && r.check.missing.join(','), r.check && r.check.raw, r.err]);
  }
  results.filter(r => r[2] || r[3] || r[4]).forEach(r => console.log('ISSUE', JSON.stringify(r)));
  console.log('ok templates:', results.filter(r => !r[2] && !r[3] && !r[4]).length);
  console.log('errors:', errs);
  await b.close();
})();
