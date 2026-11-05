#!/usr/bin/env node
/*
 * Tiny static server that mounts the repository under a sub-path, the way
 * GitHub Pages serves a project site: http://localhost:4173/aegis-ui-engine/
 * Anything outside the mount returns 404, so an absolute "/…" URL in the app
 * shows up as a missing asset in tests.
 *   node tests/serve.cjs [port] [mount]
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.cjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

function start(port = 4173, mount = '/aegis-ui-engine/') {
  const log = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (!rel.startsWith(mount)) { log.push({ status: 404, path: rel }); res.writeHead(404); res.end('Outside mount'); return; }
    rel = rel.slice(mount.length);
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep) || /(^|[\\/])\.git([\\/]|$)/.test(file)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { log.push({ status: 404, path: url.pathname }); res.writeHead(404); res.end('Not found'); return; }
      log.push({ status: 200, path: url.pathname });
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, log, base: `http://127.0.0.1:${server.address().port}${mount}` })));
}

module.exports = { start };

if (require.main === module) {
  const port = +process.argv[2] || 4173;
  const mount = process.argv[3] || '/aegis-ui-engine/';
  start(port, mount).then(({ base }) => console.log('Serving ' + ROOT + ' at ' + base));
}
