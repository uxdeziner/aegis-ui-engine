const { chromium } = require('playwright');
const URL = process.env.PG_URL;
const out = [];
const ok = (name, cond, extra) => out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : ''));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::ERR/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(600);
  const ready = async () => { await p.waitForFunction(() => { const d = document.getElementById('pg-frame').contentDocument; return d && d.body && d.body.hasAttribute('data-pg-ready'); }); await p.waitForTimeout(120); return p.frameLocator('#pg-frame'); };
  const sel = async id => { await p.click(`.pg-list__item[data-id="${id}"]`); return ready(); };

  // --- Data grid
  let f = await sel('data-grid');
  const cell = f.locator('[data-dg-body] tr').first().locator('td[data-col="account"]');
  await cell.dblclick();
  await f.locator('td.is-editing input').fill('Acme Corp');
  await f.locator('td.is-editing input').press('Enter');
  ok('grid inline edit commits', (await f.locator('[data-dg-body] tr').first().locator('td[data-col="account"]').textContent()) === 'Acme Corp');
  // keyboard: focused cell after commit, ArrowRight then Enter edits owner, Escape cancels
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
  ok('grid keyboard edit opens on owner', await f.locator('td[data-col="owner"].is-editing').count() === 1);
  await p.keyboard.type('zzz'); await p.keyboard.press('Escape');
  ok('grid escape cancels', (await f.locator('[data-dg-body] tr').first().locator('td[data-col="owner"]').textContent()) === 'Priya Shah');
  // stage edit via select
  await f.locator('[data-dg-body] tr').nth(1).locator('td[data-col="stage"]').dblclick();
  await f.locator('td.is-editing select').selectOption('At risk'); await f.locator('td.is-editing select').press('Enter');
  ok('grid select edit', (await f.locator('[data-dg-body] tr').nth(1).locator('td[data-col="stage"]').textContent()) === 'At risk');
  const totalBefore = await f.locator('[data-dg-total]').textContent();
  await f.locator('[data-sort="arr"]').click(); await f.locator('[data-sort="arr"]').click();
  ok('grid sort desc', (await f.locator('th:has([data-sort="arr"])').getAttribute('aria-sort')) === 'descending' && (await f.locator('[data-dg-body] tr').first().locator('td[data-col="account"]').textContent()) === 'Umbrella Retail');
  await f.locator('[data-dg-filter]').fill('priya');
  ok('grid filter', (await f.locator('[data-dg-body] tr').count()) === 2, await f.locator('[data-dg-count]').textContent());
  await f.locator('[data-dg-filter]').fill('');
  await f.locator('[data-dg-body] tr').first().locator('input[type=checkbox]').check();
  await f.locator('[data-dg-delete]').click();
  ok('grid delete row', (await f.locator('[data-dg-body] tr').count()) === 4 && (await f.locator('[data-dg-total]').textContent()) !== totalBefore);
  await f.locator('[data-dg-add]').click();
  ok('grid add row starts editing', await f.locator('td.is-editing input').count() === 1);
  await p.keyboard.press('Enter');
  ok('grid now 5 rows', (await f.locator('[data-dg-body] tr').count()) === 5);

  // --- Kanban: native drag & drop + keyboard
  f = await sel('kanban');
  const colCount = async i => f.locator('.kb__col').nth(i).locator('.kb__card').count();
  const c0 = await colCount(0), c3 = await colCount(3);
  await f.locator('[data-id="c1"]').dragTo(f.locator('.kb__col').nth(3).locator('.kb__list'));
  ok('kanban drag to Done', (await colCount(0)) === c0 - 1 && (await colCount(3)) === c3 + 1 && await f.locator('.kb__col').nth(3).locator('[data-id="c1"]').count() === 1);
  // same-column reorder: drag c4 above c3
  const r3 = await f.locator('[data-id="c3"]').boundingBox();
  await f.locator('[data-id="c4"]').dragTo(f.locator('[data-id="c3"]'), { targetPosition: { x: 20, y: 4 } });
  const order = await f.locator('.kb__col').nth(1).locator('.kb__card').evaluateAll(n => n.map(x => x.dataset.id));
  ok('kanban same-column reorder', order[0] === 'c4' && order[1] === 'c3', order);
  await f.locator('[data-id="c5"]').focus(); await p.keyboard.press('Space'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Space');
  ok('kanban keyboard move', await f.locator('.kb__col').nth(3).locator('[data-id="c5"]').count() === 1, await f.locator('[data-kb-live]').textContent());
  await f.locator('#kb-new-backlog').fill('Write release notes'); await f.locator('#kb-new-backlog').press('Enter');
  ok('kanban add card', (await colCount(0)) === c0);
  ok('kanban WIP over-limit text', await f.locator('.kb__count.is-over-limit').count() >= 0);

  // --- Command palette
  f = await sel('command-palette');
  await f.locator('[data-cp-open]').click();
  ok('palette opens', await f.locator('[data-cp-dialog][open]').count() === 1);
  await p.keyboard.type('inv');
  const opts = await f.locator('.cp__opt').allTextContents();
  ok('palette fuzzy filter', opts.length === 3 && opts.every(o => /inv/i.test(o)), opts);
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter');
  ok('palette runs + closes', await f.locator('[data-cp-dialog][open]').count() === 0 && /Ran/.test(await f.locator('[data-cp-last]').textContent()), await f.locator('[data-cp-last]').textContent());
  await f.locator('body').click({ position: { x: 600, y: 300 } });
  await p.keyboard.press('Control+k');
  ok('palette ctrl+k', await f.locator('[data-cp-dialog][open]').count() === 1);
  await p.keyboard.press('Escape');
  ok('palette escape', await f.locator('[data-cp-dialog][open]').count() === 0);

  // --- Wizard
  f = await sel('wizard');
  await f.locator('[data-wz-next]').click();
  ok('wizard blocks invalid', (await f.locator('#wz-co').getAttribute('aria-invalid')) === 'true' && /required/.test(await f.locator('#wz-co-e').textContent()));
  await f.locator('#wz-co').fill('Northwind'); await f.locator('#wz-size').selectOption('11–50'); await f.locator('[data-wz-next]').click();
  await f.locator('input[value="Enterprise"]').check(); await f.locator('[data-wz-next]').click();
  await f.locator('#wz-domain').fill('bad domain'); await f.locator('[data-wz-next]').click();
  ok('wizard domain validation', /domain/.test(await f.locator('#wz-domain-e').textContent()));
  await f.locator('#wz-domain').fill('northwind.io'); await f.locator('[data-wz-next]').click();
  ok('wizard review', /Enterprise/.test(await f.locator('[data-wz-review]').textContent()) && /northwind\.io/.test(await f.locator('[data-wz-review]').textContent()));
  await f.locator('[data-wz-next]').click();
  ok('wizard done', await f.locator('[data-wz-done]').isVisible());

  // --- Notification center
  f = await sel('notification-center');
  await f.locator('[data-nc-bell]').click();
  ok('notifications open', await f.locator('[data-nc-panel]').isVisible() && (await f.locator('[data-nc-count]').textContent()) === '3');
  await f.locator('[data-open="1"]').click();
  ok('notification mark read', (await f.locator('[data-nc-count]').textContent()) === '2');
  await f.locator('[data-f="unread"]').click();
  ok('notification filter unread', (await f.locator('.nc__item').count()) === 2);
  await f.locator('[data-nc-all]').click();
  ok('mark all read + empty', (await f.locator('[data-nc-count]').textContent()) === '' && await f.locator('.nc__empty').count() === 1);
  await p.keyboard.press('Escape');
  ok('notification escape closes', !(await f.locator('[data-nc-panel]').isVisible()));

  // --- Split editor
  f = await sel('split-editor');
  await f.locator('[data-lang="html"]').fill('<h1 id="x">Edited live</h1>');
  await p.waitForTimeout(500);
  const inner = f.frameLocator('[data-ce-frame]');
  ok('split editor live preview', (await inner.locator('#x').textContent()) === 'Edited live');
  await f.locator('[data-ce-sep]').focus(); await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft');
  ok('splitter keyboard resize', (await f.locator('[data-ce-sep]').getAttribute('aria-valuenow')) === '40');

  // --- A11y drawer
  f = await sel('a11y-drawer');
  await f.locator('[data-ad-open]').click();
  ok('a11y drawer opens modal', await f.locator('[data-ad-dialog][open]').count() === 1);
  await f.locator('#ad-size').fill('140');
  await f.locator('input[name="dyslexia"]').check();
  const scale = await f.locator('[data-ad-content]').evaluate(e => getComputedStyle(e).getPropertyValue('--ad-scale').trim());
  ok('a11y drawer applies prefs', scale === '1.4' && await f.locator('[data-ad-content].is-dyslexia').count() === 1, scale);
  await p.keyboard.press('Escape');
  ok('a11y drawer closes + focus returns', await f.locator('[data-ad-dialog][open]').count() === 0 && await f.locator('[data-ad-open]').evaluate(e => document.activeElement === e));

  // --- Date range
  f = await sel('date-range');
  await f.locator('[data-preset="7"]').click();
  ok('date preset 7 days', /7 days/.test(await f.locator('[data-dp-out]').textContent()), await f.locator('[data-dp-out]').textContent());

  // --- Tree keyboard
  f = await sel('tree-view');
  await f.locator('[role=tree] > li').first().focus();
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
  ok('tree keyboard', /src \/ components \/ Button\.tsx/.test(await f.locator('[data-tv-path]').textContent()), await f.locator('[data-tv-path]').textContent());

  // --- Copy HTML / CSS / JS
  await sel('data-grid');
  await p.click('[data-copy="html"]'); await p.waitForTimeout(150);
  let clip = await p.evaluate(() => navigator.clipboard.readText());
  ok('copy HTML', clip.startsWith('<section class="dg'));
  await p.click('[data-copy="css"]'); await p.waitForTimeout(150);
  clip = await p.evaluate(() => navigator.clipboard.readText());
  ok('copy CSS has tokens', /var\(--aegis-/.test(clip) && !/#[0-9a-f]{6}/i.test(clip));
  await p.click('[data-copy="js"]'); await p.waitForTimeout(150);
  clip = await p.evaluate(() => navigator.clipboard.readText());
  ok('copy JS self-invoking', /^\/\*[\s\S]*\(function \(root\)[\s\S]*document\.querySelector\("\.dg"\)\);/.test(clip));
  // copied JS actually runs standalone: build page from copied pieces
  const src = await p.evaluate(() => AegisPlayground.source('data-grid'));
  const p2 = await ctx.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.goto(process.env.PG_ROOT + 'playground/fallback-tokens.css');
  await p2.setContent(`<!doctype html><html data-aegis-theme="legal-slate" data-aegis-mode="dark"><head><base href="${process.env.PG_ROOT}"><link rel="stylesheet" href="presets/aegis-presets.css"><link rel="stylesheet" href="presets/aegis-components.css"><style>${src.css}</style></head><body class="ae-root">${src.html}<script>${src.js}<\/script></body></html>`);
  await p2.waitForTimeout(300);
  ok('copied snippet runs standalone in another preset', e2.length === 0 && (await p2.locator('[data-dg-body] tr').count()) === 5, e2);
  await p2.close();

  // --- AI prompt
  await p.click('#pg-gen');
  const prompt = await p.inputValue('#pg-prompt-text');
  ok('prompt has preset + tokens + a11y + code', /Active preset: \*\*Enterprise SaaS\*\*/.test(prompt) && /`--aegis-table-row-height`/.test(prompt) && /Accessibility/.test(prompt) && /```js/.test(prompt) && /Token requirements/.test(prompt));
  ok('prompt resolves token values', /`--aegis-[a-z-]+` = #[0-9a-f]{6}/.test(prompt) && /- \*\*Radius & border\*\*: `--aegis-border-width-thin` = 1px/.test(prompt));
  await p.fill('#pg-req', 'Columns: customer, plan, MRR'); await p.waitForTimeout(250);
  ok('prompt includes user request', /## My request\nColumns: customer, plan, MRR/.test(await p.inputValue('#pg-prompt-text')));

  // --- Matcher
  const m = await p.evaluate(() => ({
    k: AegisPlayground.match('kanban board for support tickets')[0],
    g: AegisPlayground.match('editable table of invoices with inline status changes')[0],
    c: AegisPlayground.match('cmd k quick actions launcher')[0],
    w: AegisPlayground.match('multi-step onboarding wizard')[0],
    a: AegisPlayground.match('accessibility settings panel for text size')[0],
    f: AegisPlayground.match('stock portfolio pie chart')[0],
    l: AegisPlayground.match('stream server logs')[0]
  }));
  ok('matcher results', m.k === 'kanban' && m.g === 'data-grid' && m.c === 'command-palette' && m.w === 'wizard' && m.a === 'a11y-drawer' && m.f === 'allocation-donut' && m.l === 'log-viewer', m);
  await p.fill('#pg-prompt-input', 'notification bell with unread inbox');
  await p.click('#pg-prompt-form button[type=submit]'); await ready();
  ok('prompt form selects best match + prompt tab', (await p.evaluate(() => AegisPlayground.getState().template)) === 'notification-center' && !(await p.locator('#pg-panel-prompt').isHidden()));

  // --- Preset switching + iframe theme
  await p.click('#pg-tab-preview');
  await p.selectOption('#pg-preset', 'fintech-terminal');
  await p.waitForTimeout(200);
  const th = await p.evaluate(() => [document.documentElement.dataset.aegisTheme, document.documentElement.dataset.aegisMode, document.getElementById('pg-frame').contentDocument.documentElement.dataset.aegisTheme]);
  ok('preset applies to page + preview, default mode', th[0] === 'fintech-terminal' && th[1] === 'dark' && th[2] === 'fintech-terminal', th);
  await p.check('#pg-mode input[value="light"]');
  ok('mode switch', (await p.evaluate(() => document.getElementById('pg-frame').contentDocument.documentElement.dataset.aegisMode)) === 'light');
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('aegis:preset-change', { detail: { id: 'healthcare-clean', mode: 'dark' } })));
  ok('aegis:preset-change hook', JSON.stringify(await p.evaluate(() => [AegisPlayground.getState().preset, AegisPlayground.getState().mode])) === '["healthcare-clean","dark"]');

  ok('no console errors (main page)', errs.length === 0, errs);
  console.log(out.join('\n'));
  console.log('\nFAILS:', out.filter(x => x.startsWith('FAIL')).length, '/', out.length);
  await b.close();
})();
