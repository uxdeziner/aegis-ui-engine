#!/usr/bin/env node
/* AegisUI Playground browser tests.
 *
 *   node playground/tests/run.cjs
 *
 * Requires Playwright with Chromium (dev-only, not a runtime dependency; install it
 * globally or with `npx playwright`). Starts a static server for the repo under
 * /aegis-ui-engine/ to mirror GitHub Pages, then runs each suite. Exit code 1 on
 * any FAIL/ISSUE line or page error.
 */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!u.startsWith('/aegis-ui-engine/')) { res.writeHead(404); return res.end(); }
  const file = path.join(ROOT, u.slice('/aegis-ui-engine/'.length));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
function run(suite, env) {
  return new Promise(resolve => {
    const c = spawn(process.execPath, [path.join(__dirname, suite + '.cjs')], { env });
    let out = '';
    c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { out += d; });
    c.on('close', code => resolve({ code, out }));
  });
}
server.listen(0, '127.0.0.1', async () => {
  const root = 'http://127.0.0.1:' + server.address().port + '/aegis-ui-engine/';
  const env = Object.assign({}, process.env, { PG_ROOT: root, PG_URL: root + 'playground/playground.html' });
  let failed = false;
  for (const suite of ['smoke', 'interact', 'interact2', 'presets']) {
    console.log('\n=== ' + suite + ' ===');
    const r = await run(suite, env);
    process.stdout.write(r.out.split('\n').filter(l => !/^PASS /.test(l)).join('\n') + '\n');
    const passes = (r.out.match(/^PASS /gm) || []).length;
    if (passes) console.log(passes + ' passed');
    if (r.code !== 0 || /^(FAIL|ISSUE) /m.test(r.out) || /errors: \[\s*'/.test(r.out)) failed = true;
  }
  server.close();
  console.log(failed ? '\nPLAYGROUND TESTS FAILED' : '\nAll playground tests passed');
  process.exit(failed ? 1 : 0);
});
