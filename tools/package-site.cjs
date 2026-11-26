#!/usr/bin/env node
/*
 * Packages the AegisUI static site for hosting.
 *
 *   node tools/package-site.cjs [outDir=_site]
 *
 * Copies the public pages and their assets, leaves out tests, build scripts,
 * internal docs and launch drafts, adds .nojekyll (the Playground has files that
 * start with "_", which Jekyll would drop), then checks that every local href,
 * src and CSS url() in the packaged files resolves. Exits 1 on a broken link.
 * Zero dependencies: Node built-ins only.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, process.argv[2] || '_site');

// Top-level entries that never ship.
const SKIP_TOP = new Set(['.git', '.github', 'node_modules', 'tests', 'tools', 'docs', 'launch-kit', 'package.json', 'package-lock.json', path.basename(OUT)]);
// Directory names that never ship, at any depth (test suites, generators).
const SKIP_DIR = new Set(['test', 'tests', 'build']);
const SKIP_PATH = new Set([path.join('cli', 'tools')]);
// Where Pages serves the site. Social-preview tags use absolute URLs under it; they are checked too.
const SITE_URL = 'https://uxdeziner.github.io/aegis-ui-engine/';

function copyTree(src, dst, rel) {
  fs.mkdirSync(dst, { recursive: true });
  let count = 0;
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const r = rel ? path.join(rel, ent.name) : ent.name;
    if (!rel && SKIP_TOP.has(ent.name)) continue;
    if (ent.isDirectory()) {
      if (SKIP_DIR.has(ent.name) || SKIP_PATH.has(r)) continue;
      count += copyTree(path.join(src, ent.name), path.join(dst, ent.name), r);
    } else if (ent.isFile()) {
      if (ent.name === '.DS_Store') continue;
      fs.copyFileSync(path.join(src, ent.name), path.join(dst, ent.name));
      count++;
    }
  }
  return count;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

function checkLinks(dir) {
  const broken = [];
  const files = walk(dir).filter((f) => /\.(html|css)$/.test(f));
  const attr = /\s(?:href|src)\s*=\s*"([^"]*)"/g;
  const cssUrl = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const refs = [];
    if (f.endsWith('.html')) {
      // Ignore inline <script> bodies: their strings are code, not links.
      const markup = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.slice(0, m.indexOf('>') + 1));
      for (const m of markup.matchAll(attr)) refs.push(m[1]);
      for (const m of markup.matchAll(/<meta\s[^>]*content="([^"]*)"/g)) {
        if (m[1].startsWith(SITE_URL)) refs.push(path.relative(path.dirname(f), path.join(dir, m[1].slice(SITE_URL.length) || 'index.html')).split(path.sep).join('/') || 'index.html');
      }
    }
    for (const m of text.matchAll(cssUrl)) refs.push(m[1]);
    for (const raw of refs) {
      const ref = raw.trim();
      if (!ref || /^(#|[a-z][a-z0-9+.-]*:|\/\/|\{|\$)/i.test(ref)) continue; // anchors, external, data:, templates
      const clean = decodeURI(ref.split('#')[0].split('?')[0]);
      if (!clean) continue;
      if (clean.startsWith('/')) { broken.push(`${path.relative(dir, f)} → ${ref} (root-absolute links break under a sub-path)`); continue; }
      let target = path.resolve(path.dirname(f), clean);
      if (clean.endsWith('/')) target = path.join(target, 'index.html');
      if (!target.startsWith(dir + path.sep) || !fs.existsSync(target)) broken.push(`${path.relative(dir, f)} → ${ref}`);
    }
  }
  return { checked: files.length, broken };
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  const n = copyTree(ROOT, OUT, '');
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
  for (const page of ['index.html']) {
    if (!fs.existsSync(path.join(OUT, page))) { console.error(`Missing ${page} in the package.`); process.exit(1); }
  }
  const { checked, broken } = checkLinks(OUT);
  if (broken.length) {
    console.error(`Broken links (${broken.length}):\n  ` + broken.join('\n  '));
    process.exit(1);
  }
  console.log(`Packaged ${n} files into ${path.relative(ROOT, OUT) || OUT}; ${checked} HTML/CSS files link-checked, 0 broken.`);
}

if (require.main === module) main();
module.exports = { checkLinks, copyTree };
