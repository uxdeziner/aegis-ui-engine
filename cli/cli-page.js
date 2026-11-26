/* AegisUI · aegis-init CLI page (vanilla ES, zero runtime dependencies).
 *
 * Builds an aegis-init command and shows the exact output the CLI would print, using
 * cli/manifest.js (generated from the CLI's own --dry-run --json). Nothing runs here.
 *
 * Preset order: ?preset=<id|alias>, then the preset behind the canonical active tokens
 * (localStorage "aegis:active-tokens:v1" via ../shared/aegis-contract.js, read-only),
 * then enterprise-saas. Picks made on this page update the URL, never storage.
 * Public API: window.AegisCliPage { getState(), command(), validateOut(path), setPreset(id) }.
 */
(function () {
  'use strict';

  var P = window.AegisPresets || null;
  var K = window.AegisContract || null;
  var M = window.AegisCliManifest || null;
  var DEFAULT_ID = 'enterprise-saas';
  var MODES = ['light', 'dark', 'auto'];
  var $ = function (s) { return document.querySelector(s); };

  if (!P || !M) {
    document.querySelector('main').insertAdjacentHTML('afterbegin', '<p class="ae-alert ae-alert--danger cl-wide" role="alert">The preset registry or CLI manifest failed to load. Check that presets/aegis-presets.js and cli/manifest.js are deployed.</p>');
    return;
  }

  var FILE_INFO = {
    'tokens.json': ['presets/tokens/<id>.json, byte for byte', 'The full token document. The AegisUI Figma plugin imports it as is.'],
    'variables.css': ['presets/css/<id>.css plus a banner line', 'Every token as a --aegis-* custom property, with light, dark and auto blocks.'],
    'CLAUDE.md': ['Generated from tokens.json', 'Rules for Claude Code: setup, never-hardcode rules, color table, text styles, scales and component recipes.'],
    '.cursorrules': ['Generated from tokens.json', 'The same rules in condensed form for Cursor.']
  };

  /* --------------------------------------------------------------- preset resolution */
  function resolveId(input) {
    if (!input) return null;
    var key = String(input).trim().toLowerCase();
    if (M.presets[key]) return key;
    for (var id in M.presets) if (M.presets[id].aliases.indexOf(key) > -1) return id;
    return null;
  }

  function activeTokensPreset() {
    if (!K || typeof K.readBaseline !== 'function') return null;
    var r;
    try { r = K.readBaseline(); } catch (e) { return null; }
    if (!r || r.status !== 'ok' || !r.record.presetId) return null;
    return resolveId(r.record.presetId);
  }

  var q = new URLSearchParams(location.search);
  var fromUrl = resolveId(q.get('preset') || q.get('theme'));
  var fromActive = fromUrl ? null : activeTokensPreset();
  var source = fromUrl ? 'url' : fromActive ? 'active-tokens' : 'default';

  var state = {
    preset: fromUrl || fromActive || DEFAULT_ID,
    out: './my-app',
    cliPath: 'cli/aegis-init.js',
    mode: MODES.indexOf(q.get('mode')) > -1 ? q.get('mode') : '',
    force: false,
    dryRun: false,
    noFonts: false,
    json: false
  };

  /* --------------------------------------------------------------- pure helpers */
  /** Same rules as resolveOutDir() in aegis-init.js, minus the checks that need a filesystem. */
  function validateOut(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '--out is required, e.g. --out=./my-app';
    if (raw.indexOf('\0') > -1) return '--out contains a NUL byte.';
    if (raw.split(/[\\/]+/).indexOf('..') > -1) return '--out must not contain ".." segments (got "' + raw + '").';
    if (/^([\\/]|[a-zA-Z]:)/.test(raw) || raw.charAt(0) === '~') return '--out must be inside the current directory. Change into the project first, then use a relative path.';
    return '';
  }

  function shellQuote(s) {
    return /^[A-Za-z0-9_./@:+=-]+$/.test(s) ? s : "'" + s.replace(/'/g, "'\\''") + "'";
  }

  function command(s) {
    s = s || state;
    var parts = ['node', shellQuote(s.cliPath.trim() || 'cli/aegis-init.js'), '--preset=' + s.preset, '--out=' + shellQuote(s.out.trim())];
    if (s.mode) parts.push('--mode=' + s.mode);
    if (s.noFonts) parts.push('--no-fonts');
    if (s.force) parts.push('--force');
    if (s.dryRun) parts.push('--dry-run');
    if (s.json) parts.push('--json');
    return parts.join(' ');
  }

  function pad(s, n, left) { var sp = new Array(Math.max(0, n - s.length) + 1).join(' '); return left ? sp + s : s + sp; }

  function effectiveMode() { return state.mode || M.presets[state.preset].defaultMode; }

  function sizes() {
    var entry = M.presets[state.preset];
    return entry.sizes[effectiveMode() + (state.noFonts ? '+nofonts' : '')] || entry.sizes[entry.defaultMode];
  }

  function displayDir(raw) {
    var d = raw.trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/+$/, '');
    return d === '' || d === '.' ? '.' : d + '/';
  }

  function terminal() {
    var err = validateOut(state.out);
    if (err) return { code: 1, text: 'aegis-init: ' + err };
    var entry = M.presets[state.preset];
    var b = sizes();
    if (state.json) {
      return { code: 0, text: JSON.stringify({
        preset: state.preset, name: entry.name, mode: effectiveMode(), outDir: '<current folder>/' + displayDir(state.out).replace(/\/$/, ''),
        files: M.files.map(function (f, i) { return { name: f, bytes: b[i], overwritten: false }; }),
        dryRun: state.dryRun
      }, null, 2) };
    }
    var lines = [(state.dryRun ? 'Dry run — would write' : 'Wrote') + ' AegisUI preset ' + entry.name + ' (' + state.preset + ') to ' + displayDir(state.out)];
    // Same layout as aegis-init: name padded to 14, bytes padded to 7.
    M.files.forEach(function (f, i) { lines.push('  ' + pad(f, 14, false) + ' ' + pad(String(b[i]), 7, true) + ' bytes'); });
    return { code: 0, text: lines.join('\n') };
  }

  /* --------------------------------------------------------------- rendering */
  var presetSel = $('#cl-preset');
  var byCat = {};
  P.list().forEach(function (m) { if (M.presets[m.id]) (byCat[m.category] = byCat[m.category] || []).push(m); });
  Object.keys(byCat).forEach(function (cat) {
    var g = document.createElement('optgroup');
    g.label = cat;
    byCat[cat].forEach(function (m) {
      var o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.name;
      g.appendChild(o);
    });
    presetSel.appendChild(g);
  });

  function swatches(meta, mode) {
    var list = $('#cl-swatches');
    list.textContent = '';
    var hexes = (meta.swatches && (meta.swatches[mode === 'dark' ? 'dark' : 'light'])) || [];
    ['Canvas', 'Brand', 'Accent', 'Text'].forEach(function (label, i) {
      if (!hexes[i]) return;
      var li = document.createElement('li');
      li.className = 'cl-swatch';
      var chip = document.createElement('span');
      chip.className = 'cl-swatch__chip';
      chip.style.background = hexes[i];
      var cap = document.createElement('span');
      cap.className = 'cl-swatch__cap';
      cap.textContent = label + ' ' + hexes[i];
      li.appendChild(chip); li.appendChild(cap);
      list.appendChild(li);
    });
  }

  function render() {
    var meta = P.get(state.preset).meta;
    var entry = M.presets[state.preset];
    var mode = effectiveMode();
    var root = document.documentElement;
    root.setAttribute('data-aegis-theme', state.preset);
    root.setAttribute('data-aegis-mode', mode);
    try { P.loadFonts(state.preset, document); } catch (e) { /* offline: system fonts */ }

    presetSel.value = state.preset;
    var help = (entry.aliases.length ? 'Also: ' + entry.aliases.join(', ') + '. ' : '') + meta.density + ' density · WCAG ' + meta.a11yTarget + ' contrast target';
    if (source === 'active-tokens') help += ' · from your active Studio tokens';
    $('#cl-preset-help').textContent = help;
    $('#cl-mode-default').textContent = 'Preset default (' + entry.defaultMode + ')';
    document.querySelectorAll('#cl-mode input').forEach(function (r) { r.checked = r.value === state.mode; });

    var err = validateOut(state.out);
    var outInput = $('#cl-out');
    $('#cl-out-error').hidden = !err;
    $('#cl-out-error').textContent = err;
    if (err) outInput.setAttribute('aria-invalid', 'true'); else outInput.removeAttribute('aria-invalid');

    $('#cl-cmd').textContent = command();
    var t = terminal();
    $('#cl-term').textContent = '$ ' + command() + '\n' + t.text;
    var exit = $('#cl-exit');
    exit.textContent = 'Exit ' + t.code;
    exit.className = 'ae-badge ' + (t.code === 0 ? 'ae-badge--success' : 'ae-badge--danger');

    $('#cl-snippet').textContent = '<html data-aegis-theme="' + state.preset + '" data-aegis-mode="' + mode + '">\n  <head>\n    <link rel="stylesheet" href="variables.css">\n  </head>';

    var b = sizes();
    var body = $('#cl-files');
    body.textContent = '';
    M.files.forEach(function (f, i) {
      var tr = document.createElement('tr');
      var info = FILE_INFO[f] || ['', ''];
      [[f, 'code'], [b[i].toLocaleString('en-US'), 'num'], [info[0].replace('<id>', state.preset), ''], [info[1], '']].forEach(function (cell, ci) {
        var el = document.createElement(ci === 0 ? 'th' : 'td');
        if (ci === 0) el.scope = 'row';
        if (cell[1] === 'code') { var c = document.createElement('code'); c.className = 'ae-code'; c.textContent = cell[0]; el.appendChild(c); }
        else el.textContent = cell[0];
        if (cell[1] === 'num') el.className = 'cl-num';
        tr.appendChild(el);
      });
      body.appendChild(tr);
    });
    swatches(meta, mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : mode);
  }

  function syncUrl() {
    try {
      var u = new URL(location.href);
      u.searchParams.set('preset', state.preset);
      if (state.mode) u.searchParams.set('mode', state.mode); else u.searchParams.delete('mode');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* file:// in some browsers */ }
  }

  var toastTimer;
  function toast(msg) {
    var el = $('#cl-toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 1800);
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? resolve() : reject(new Error('copy failed')); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  /* --------------------------------------------------------------- events */
  presetSel.addEventListener('change', function () { state.preset = presetSel.value; source = 'you'; syncUrl(); render(); });
  $('#cl-out').addEventListener('input', function (e) { state.out = e.target.value; render(); });
  $('#cl-path').addEventListener('input', function (e) { state.cliPath = e.target.value; render(); });
  document.querySelectorAll('#cl-mode input').forEach(function (r) {
    r.addEventListener('change', function () { state.mode = r.value; syncUrl(); render(); });
  });
  [['#cl-force', 'force'], ['#cl-dry', 'dryRun'], ['#cl-nofonts', 'noFonts'], ['#cl-json', 'json']].forEach(function (pair) {
    $(pair[0]).addEventListener('change', function (e) { state[pair[1]] = e.target.checked; render(); });
  });
  $('#cl-copy').addEventListener('click', function () {
    if (validateOut(state.out)) { toast('Fix the output folder first'); $('#cl-out').focus(); return; }
    copy(command()).then(function () { toast('Command copied'); }, function () { toast('Copy failed. Select the command and copy it.'); });
  });
  if (K && typeof K.onBaselineChange === 'function') {
    K.onBaselineChange(function () {
      if (source === 'you' || source === 'url') return; // a choice made on this page wins
      var id = activeTokensPreset();
      if (id && id !== state.preset) { state.preset = id; source = 'active-tokens'; render(); }
    });
  }
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', function () { if (effectiveMode() === 'auto') render(); });
  }

  window.AegisCliPage = {
    version: '1.0.0',
    getState: function () { return { preset: state.preset, mode: effectiveMode(), source: source, out: state.out, force: state.force, dryRun: state.dryRun, noFonts: state.noFonts, json: state.json }; },
    command: function () { return command(); },
    validateOut: validateOut,
    resolveId: resolveId,
    setPreset: function (id) { var r = resolveId(id); if (!r) return false; state.preset = r; source = 'you'; syncUrl(); render(); return true; }
  };

  render();
})();
