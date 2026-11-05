/* AegisUI Playground — Prompt-to-Component Sandbox (vanilla ES, zero runtime deps).
 *
 * Integration hooks (see README.md):
 *   - reads the active preset from ?preset=&mode=, then localStorage "aegisui:active-preset"
 *     ({ id, mode } JSON or a bare id), then its own "aegisui:playground:v1", then falls back
 *   - listens for window "aegis:preset-change" CustomEvents ({ detail: { id, mode } }) and
 *     cross-tab "storage" events on "aegisui:active-preset"
 *   - emits window "aegis:playground-change" ({ detail: { preset, mode, template } })
 *   - exposes window.AegisPlayground
 *   - never writes the shared key; only its own "aegisui:playground:v1"
 */
(function () {
  'use strict';

  var SHARED_KEY = 'aegisui:active-preset';
  var OWN_KEY = 'aegisui:playground:v1';
  var FALLBACK_ID = 'enterprise-saas';
  var MODES = ['light', 'dark', 'auto'];

  var P = window.AegisPresets || null;
  var T = window.AegisPlaygroundTemplates;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var store = {
    get: function (k) { try { var v = localStorage.getItem(k); return v === null ? null : v; } catch (e) { return null; } },
    getJSON: function (k) { var v = store.get(k); if (v === null) return null; try { return JSON.parse(v); } catch (e) { return v; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  if (!T || !T.all().length) {
    document.body.insertAdjacentHTML('afterbegin', '<p class="ae-alert ae-alert--danger" role="alert">Template modules failed to load. Check that /playground/templates/*.js are deployed.</p>');
    return;
  }
  var TEMPLATES = T.all();

  /* ==================================================================== preset state */
  var ids = P && P.ids ? P.ids.slice() : [];
  function validId(id) { return typeof id === 'string' && ids.indexOf(id) > -1; }
  function metaOf(id) { try { return P && validId(id) ? P.get(id).meta : null; } catch (e) { return null; } }

  function parseShared(v) {
    if (!v) return {};
    if (typeof v === 'string') return { id: v };
    return { id: v.id || v.preset || v.theme, mode: v.mode };
  }

  function resolveInitial() {
    var q = new URLSearchParams(location.search);
    var shared = parseShared(store.getJSON(SHARED_KEY));
    var own = store.getJSON(OWN_KEY);
    own = own && typeof own === 'object' ? own : {};
    var candidates = [
      { id: q.get('preset') || q.get('theme'), mode: q.get('mode'), src: 'URL' },
      { id: shared.id, mode: shared.mode, src: 'shared preset (' + SHARED_KEY + ')' },
      { id: own.preset, mode: own.mode, src: 'last playground session' }
    ];
    var note = '';
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (!c.id) continue;
      if (validId(c.id)) return { id: c.id, mode: MODES.indexOf(c.mode) > -1 ? c.mode : metaOf(c.id).defaultMode, src: c.src, note: note, own: own };
      note = 'Unknown preset “' + c.id + '” from ' + c.src + '; using a safe default.';
    }
    if (validId(FALLBACK_ID)) return { id: FALLBACK_ID, mode: metaOf(FALLBACK_ID).defaultMode, src: 'default', note: note, own: own };
    if (ids.length) return { id: ids[0], mode: metaOf(ids[0]).defaultMode, src: 'default', note: note, own: own };
    return { id: null, mode: MODES.indexOf(own.mode) > -1 ? own.mode : 'light', src: 'fallback', note: 'Preset registry unavailable: using built-in fallback tokens (Enterprise SaaS).', own: own };
  }

  var init = resolveInitial();
  var state = {
    preset: init.id,
    mode: init.mode,
    template: null,
    tab: 'preview',
    vp: ['desktop', 'tablet', 'mobile'].indexOf(init.own.vp) > -1 ? init.own.vp : 'desktop',
    cat: 'All',
    q: ''
  };

  function applyTheme(doc) {
    var el = doc.documentElement;
    if (state.preset) {
      el.setAttribute('data-aegis-theme', state.preset);
      if (P && P.loadFonts) { try { P.loadFonts(state.preset, doc); } catch (e) { /* offline: system fonts */ } }
    } else el.removeAttribute('data-aegis-theme');
    el.setAttribute('data-aegis-mode', state.mode);
  }

  function persist() {
    store.set(OWN_KEY, { preset: state.preset, mode: state.mode, template: state.template && state.template.id, vp: state.vp });
  }

  function emit() {
    try { window.dispatchEvent(new CustomEvent('aegis:playground-change', { detail: { preset: state.preset, mode: state.mode, template: state.template && state.template.id } })); } catch (e) {}
  }

  function setPreset(id, mode, silent) {
    if (id !== null && id !== undefined && !validId(id)) { toast('Unknown preset “' + id + '”'); return false; }
    var changed = id !== state.preset;
    if (id !== undefined) state.preset = id;
    if (mode && MODES.indexOf(mode) > -1) state.mode = mode;
    else if (changed && state.preset) state.mode = metaOf(state.preset).defaultMode;
    applyTheme(document);
    var fdoc = frameDoc(); if (fdoc) { applyTheme(fdoc); scheduleTokenRefresh(); }
    syncControls();
    persist();
    if (!silent) emit();
    if (state.tab === 'prompt') renderPrompt();
    return true;
  }

  /* ==================================================================== controls */
  var presetSel = $('#pg-preset');
  if (ids.length) {
    var byCat = {};
    P.list().forEach(function (m) { (byCat[m.category] = byCat[m.category] || []).push(m); });
    presetSel.innerHTML = Object.keys(byCat).map(function (c) {
      return '<optgroup label="' + esc(c) + '">' + byCat[c].map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
  } else {
    presetSel.innerHTML = '<option value="">Fallback (built-in)</option>';
    presetSel.disabled = true;
  }
  presetSel.addEventListener('change', function () { setPreset(presetSel.value); });
  $$('#pg-mode input').forEach(function (r) { r.addEventListener('change', function () { setPreset(undefined, r.value); }); });

  function syncControls() {
    if (state.preset) presetSel.value = state.preset;
    $$('#pg-mode input').forEach(function (r) { r.checked = r.value === state.mode; });
    var m = metaOf(state.preset);
    $('#pg-preset-note').textContent = init.note || (m ? m.category + ' · ' + m.density + ' density · WCAG ' + m.a11yTarget + (init.src !== 'default' ? ' · inherited from ' + init.src : '') : '');
  }

  window.addEventListener('aegis:preset-change', function (e) { var d = e.detail || {}; init.note = ''; init.src = 'host page'; setPreset(d.id || d.preset, d.mode); });
  window.addEventListener('storage', function (e) {
    if (e.key !== SHARED_KEY) return;
    var s = parseShared(store.getJSON(SHARED_KEY));
    if (validId(s.id)) { init.note = ''; init.src = 'shared preset (' + SHARED_KEY + ')'; setPreset(s.id, s.mode); }
  });

  /* ==================================================================== library */
  var CATS = ['All'].concat(TEMPLATES.map(function (t) { return t.category; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
  $('#pg-count').textContent = TEMPLATES.length;
  $('#pg-cats').innerHTML = CATS.map(function (c) { return '<button type="button" aria-pressed="' + (c === 'All') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  $('#pg-cats').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    state.cat = b.getAttribute('data-cat');
    $$('#pg-cats [data-cat]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    renderList();
  });
  var search = $('#pg-search');
  search.addEventListener('input', function () { state.q = search.value.trim().toLowerCase(); renderList(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {
      e.preventDefault(); openLib(true); search.focus();
    }
  });

  function haystack(t) { return (t.name + ' ' + t.category + ' ' + t.tags.join(' ') + ' ' + t.description).toLowerCase(); }
  function renderList() {
    var list = TEMPLATES.filter(function (t) { return (state.cat === 'All' || t.category === state.cat) && (!state.q || haystack(t).indexOf(state.q) > -1); });
    var html = '', last = '';
    list.forEach(function (t) {
      if (t.category !== last) { html += '<li class="pg-list__group" role="presentation">' + esc(t.category) + '</li>'; last = t.category; }
      html += '<li><button type="button" class="pg-list__item" data-id="' + t.id + '"' + (state.template && state.template.id === t.id ? ' aria-current="true"' : '') + '><strong>' + esc(t.name) + '</strong><span>' + esc(t.description) + '</span></button></li>';
    });
    $('#pg-list').innerHTML = html || '<li class="pg-list__empty">No templates match. Try the prompt box above.</li>';
  }
  $('#pg-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]'); if (!b) return;
    select(b.getAttribute('data-id'));
    if (window.matchMedia('(max-width: 960px)').matches) { openLib(false); $('#pg-main').focus(); }
  });
  function openLib(open) { $('.pg-lib').classList.toggle('is-open', open); $('#pg-lib-toggle').setAttribute('aria-expanded', String(open)); $('#pg-lib-toggle').textContent = open ? 'Close' : 'Browse'; }
  $('#pg-lib-toggle').addEventListener('click', function () { openLib(!$('.pg-lib').classList.contains('is-open')); });

  /* ==================================================================== template helpers */
  function rootSelector(t) { var m = /^\s*<[a-z0-9-]+[^>]*?\sclass="([^"\s]+)/i.exec(t.html); return m ? '.' + m[1] : 'body > :first-child'; }
  function jsSource(t) {
    if (!t.js) return '';
    return '/* ' + t.name + ': vanilla JS, no dependencies. Run after the markup is in the DOM. */\n(' + t.js.toString() + ')(document.querySelector(' + JSON.stringify(rootSelector(t)) + '));\n';
  }
  function cssSource(t) {
    return '/* ' + t.name + ': AegisUI component CSS.\n * Requires an AegisUI preset (presets/css/<id>.css or presets/aegis-presets.css)\n * and presets/aegis-components.css, with data-aegis-theme / data-aegis-mode set. */\n' + t.css + '\n';
  }
  function tokensOf(t) {
    var src = t.html + '\n' + t.css + '\n' + (t.js ? t.js.toString() : '');
    var seen = {}, out = [];
    (src.match(/--aegis-[a-z0-9-]*[a-z0-9]/g) || []).forEach(function (v) { if (!seen[v]) { seen[v] = 1; out.push(v); } });
    return out.sort();
  }
  function recipesOf(t) {
    var src = t.html + '\n' + (t.js ? t.js.toString() : '');
    var seen = {}, out = [];
    (src.match(/\bae-[a-z]+(?:-[a-z]+)*(?:__[a-z-]+)?(?:--[a-z-]+)?/g) || []).forEach(function (c) { if (!seen[c]) { seen[c] = 1; out.push(c); } });
    return out.sort();
  }
  var GROUPS = [
    ['Radius & border', /^--aegis-(radius|border-width)-/],
    ['Focus', /^--aegis-focus-/],
    ['Color', /^--aegis-(bg|fg|border|brand|accent|success|warning|danger|info|data|color)-/],
    ['Typography', /^--aegis-(text|font)-/],
    ['Spacing & size', /^--aegis-(space|size)-/],
    ['Elevation', /^--aegis-shadow-/],
    ['Motion', /^--aegis-(duration|easing)-/],
    ['Component', /./]
  ];
  function groupTokens(list) {
    var g = {};
    list.forEach(function (v) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][1].test(v)) { (g[GROUPS[i][0]] = g[GROUPS[i][0]] || []).push(v); break; } });
    return GROUPS.map(function (x) { return [x[0], g[x[0]] || []]; }).filter(function (x) { return x[1].length; });
  }
  function rawColorCount(t) { return (t.css.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi) || []).length; }

  /* ==================================================================== preview */
  var frame = $('#pg-frame'), errorBox = $('#pg-error');
  function frameDoc() { try { return frame.contentDocument && frame.contentDocument.documentElement && frame.contentDocument.body && frame.contentDocument.body.hasAttribute('data-pg-ready') ? frame.contentDocument : null; } catch (e) { return null; } }
  var baseHref = new URL('.', location.href).href;

  function buildDoc(t) {
    var js = t.js ? '(' + t.js.toString() + ')(document.querySelector(' + JSON.stringify(rootSelector(t)) + '));' : '';
    return '<!doctype html><html lang="en"' + (state.preset ? ' data-aegis-theme="' + state.preset + '"' : '') + ' data-aegis-mode="' + state.mode + '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"><base href="' + esc(baseHref) + '">' +
      '<link rel="stylesheet" href="../presets/aegis-presets.css"><link rel="stylesheet" href="../presets/aegis-components.css"><link rel="stylesheet" href="fallback-tokens.css">' +
      '<style>html,body{margin:0}body{padding:var(--aegis-space-24);min-height:100vh;box-sizing:border-box}\n' + t.css.replace(/<\/style/gi, '<\\/style') + '</style></head>' +
      '<body class="ae-root">' + t.html +
      '<script>window.addEventListener("error",function(e){try{parent.postMessage({type:"aegis-pg-error",message:String(e.message||e)},"*")}catch(_){}});' +
      'try{' + js.replace(/<\/script/gi, '<\\/script') + '}catch(err){parent.postMessage({type:"aegis-pg-error",message:String(err&&err.stack||err)},"*")}' +
      'document.body.setAttribute("data-pg-ready","");<\/script></body></html>';
  }

  var resizeObs = null;
  function renderPreview() {
    var t = state.template; if (!t) return;
    errorBox.hidden = true; errorBox.textContent = '';
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    frame.srcdoc = buildDoc(t);
  }
  frame.addEventListener('load', function () {
    var doc = frameDoc(); if (!doc) return;
    applyTheme(doc);
    var fit = function () { try { frame.style.height = Math.max(560, doc.documentElement.scrollHeight) + 'px'; } catch (e) {} };
    fit();
    if ('ResizeObserver' in window) { resizeObs = new ResizeObserver(fit); resizeObs.observe(doc.body); }
    scheduleTokenRefresh();
  });
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'aegis-pg-error' || e.source !== frame.contentWindow) return;
    errorBox.hidden = false; errorBox.textContent = 'Preview error in “' + (state.template && state.template.name) + '”: ' + e.data.message;
    console.error('[AegisUI Playground] preview error:', e.data.message);
  });

  function setVp(vp) {
    state.vp = vp;
    $('#pg-stage').setAttribute('data-vp', vp);
    $$('#pg-vp input').forEach(function (r) { r.checked = r.value === vp; });
    persist();
  }
  $$('#pg-vp input').forEach(function (r) { r.addEventListener('change', function () { setVp(r.value); }); });

  /* ==================================================================== tokens panel */
  var tokTimer = null;
  function scheduleTokenRefresh() { clearTimeout(tokTimer); tokTimer = setTimeout(renderTokens, 60); }
  function resolved(v) {
    var doc = frameDoc(), target = doc ? doc.documentElement : document.documentElement;
    try { return (doc ? doc.defaultView : window).getComputedStyle(target).getPropertyValue(v).trim(); } catch (e) { return ''; }
  }
  function isColor(v) { return /^(#|rgb|hsl|oklch|color\()/.test(v); }
  function renderTokens() {
    var t = state.template; if (!t) return;
    var list = tokensOf(t), missing = [];
    $('#pg-tok-count').textContent = list.length;
    $('#pg-tokens').innerHTML = groupTokens(list).map(function (g) {
      return '<div class="pg-tok-group"><h3>' + g[0] + '</h3><ul>' + g[1].map(function (v) {
        var val = resolved(v); if (!val) missing.push(v);
        return '<li class="pg-tok' + (val ? '' : ' is-missing') + '" title="' + esc(val || 'not defined by the active preset') + '">' + (isColor(val) ? '<i style="background:' + esc(val) + '"></i>' : '') + esc(v.replace('--aegis-', '')) + '</li>';
      }).join('') + '</ul></div>';
    }).join('');
    var raw = rawColorCount(t);
    $('#pg-tok-check').innerHTML = (missing.length ? '<span class="pg-bad">' + missing.length + ' token(s) not defined by this preset</span>' : '<span class="pg-ok">All tokens resolve in ' + esc(presetName()) + ' (' + state.mode + ')</span>') +
      ' · ' + (raw ? '<span class="pg-bad">' + raw + ' raw color value(s)</span>' : '<span class="pg-ok">0 raw colors</span>') + ' · recipes: ' + (recipesOf(t).filter(function (c) { return !/^ae-(root)$/.test(c); }).length);
    root.lastCheck = { template: t.id, tokens: list.length, missing: missing, raw: raw };
  }
  function presetName() { var m = metaOf(state.preset); return m ? m.name : 'fallback tokens'; }
  var root = window.AegisPlayground = window.AegisPlayground || {};

  /* ==================================================================== code + meta */
  function renderCode() {
    var t = state.template;
    $('#pg-code-html').textContent = t.html;
    $('#pg-code-css').textContent = cssSource(t);
    $('#pg-code-js').textContent = t.js ? jsSource(t) : '// This template is CSS-only. No JavaScript is required.';
    $('#pg-copy-js').disabled = !t.js;
    $('#pg-copy-js').title = t.js ? '' : 'This template has no JavaScript';
    $('#pg-a11y').innerHTML = t.a11y.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('#pg-behavior').innerHTML = t.behavior.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') || '<li>Static pattern.</li>';
  }

  /* ==================================================================== AI prompt */
  function buildPrompt(t, request) {
    var m = metaOf(state.preset);
    var toks = tokensOf(t), recipes = recipesOf(t);
    var L = [];
    L.push('# Build: ' + t.name + (request ? ' (customised)' : ''));
    L.push('');
    L.push('You are a senior front-end engineer working in a codebase that uses the AegisUI design system. Produce a production-ready, accessible component in vanilla HTML, CSS and JavaScript (ES2017+, no frameworks, no runtime dependencies).');
    L.push('');
    if (request) { L.push('## My request', request.trim(), ''); }
    L.push('## Component', t.description, '');
    L.push('## Design system context');
    if (m) {
      L.push('- Active preset: **' + m.name + '** (`' + m.id + '`), mode `' + state.mode + '`, density `' + m.density + '`, accessibility target **WCAG ' + m.a11yTarget + '**.');
      L.push('- Load `presets/css/' + m.id + '.css` (or the `presets/aegis-presets.css` bundle) and `presets/aegis-components.css`.');
      L.push('- Theme by attribute: `<html data-aegis-theme="' + m.id + '" data-aegis-mode="' + state.mode + '">`, with `class="ae-root"` on the app root. Do not hard-code the preset: the component must re-skin when these attributes change.');
    } else {
      L.push('- Preset registry unavailable; reference values come from the built-in fallback (Enterprise SaaS, light/dark). Target WCAG AA.');
    }
    L.push('- Token contract: `presets/schema/aegis-tokens.schema.json`. Semantic roles are `bg`, `fg`, `border`, `brand`, `accent`, `success|warning|danger|info` and `data.1…8`. There are 16 text styles exposed as `font` shorthands (`var(--aegis-text-<style>)`), plus spacing, radius, shadow and motion scales. Each is exposed as `--aegis-<group>-<name>`.');
    L.push('');
    L.push('## Token requirements (hard rules)');
    L.push('1. Use **only** `var(--aegis-*)` custom properties for color, typography, spacing, radius, borders, shadows and motion. No hex, rgb(), hsl(), named colors or magic numbers. 1px hairlines and layout widths are the only exceptions.');
    L.push('2. Use semantic tokens (e.g. `--aegis-fg-muted`, `--aegis-bg-surface`), never primitives (`--aegis-color-<ramp>-<step>`), so light/dark and all 12 presets work unchanged.');
    L.push('3. Reuse AegisUI recipes instead of re-styling them: ' + (recipes.length ? recipes.map(function (c) { return '`.' + c + '`'; }).join(', ') : '(none in the reference)') + '.');
    L.push('4. Typography uses the text-style shorthands, e.g. `font: var(--aegis-text-body-sm)`. Numbers use tabular figures.');
    L.push('5. Motion uses `--aegis-duration-*` and `--aegis-easing-*` and is disabled under `prefers-reduced-motion`.');
    L.push('6. Prefix component classes (BEM-style, e.g. `.' + rootSelector(t).replace(/^\./, '') + '__part`) so they never collide with `.ae-*`.');
    L.push('');
    L.push('### Tokens used by the reference (' + toks.length + '), with values resolved in ' + (m ? m.name : 'fallback') + ' / ' + state.mode);
    groupTokens(toks).forEach(function (g) {
      L.push('- **' + g[0] + '**: ' + g[1].map(function (v) { var r = resolved(v); return '`' + v + '`' + (r && r.length < 48 ? ' = ' + r : ''); }).join(', '));
    });
    L.push('');
    L.push('## Accessibility (WCAG 2.2 AA minimum' + (m && m.a11yTarget === 'AAA' ? ', this preset targets AAA' : '') + ')');
    t.a11y.forEach(function (x) { L.push('- ' + x); });
    L.push('- Text contrast ≥ ' + (m && m.a11yTarget === 'AAA' ? '7:1' : '4.5:1') + ', UI boundaries and focus ≥ 3:1. Use the preset tokens, which are contrast-verified at build time.');
    L.push('- Visible `:focus-visible` on every interactive element (`--aegis-focus-ring-*`). Targets are at least 24×24 CSS px. Never show status by color alone.');
    L.push('');
    if (t.behavior.length) { L.push('## Behavior'); t.behavior.forEach(function (x) { L.push('- ' + x); }); L.push(''); }
    L.push('## Reference implementation (adapt it; keep the token and accessibility contract)');
    L.push('```html', t.html, '```', '', '```css', t.css, '```');
    if (t.js) L.push('', '```js', jsSource(t).trim(), '```');
    L.push('');
    L.push('## Deliverables');
    L.push('1. HTML, CSS and JS in three separate code blocks, ready to paste.');
    L.push('2. A list of every `--aegis-*` token you used, and any token you think is missing (propose its name; do not invent a raw value).');
    L.push('3. A short keyboard and screen-reader test script I can follow to verify the component.');
    return L.join('\n');
  }
  function renderPrompt() {
    var t = state.template; if (!t) return;
    var text = buildPrompt(t, $('#pg-req').value);
    $('#pg-prompt-text').value = text;
    $('#pg-prompt-meta').textContent = text.length.toLocaleString() + ' characters · ~' + Math.round(text.length / 4).toLocaleString() + ' tokens · ' + tokensOf(t).length + ' design tokens · preset ' + presetName() + ' / ' + state.mode;
  }
  var reqTimer;
  $('#pg-req').addEventListener('input', function () { clearTimeout(reqTimer); reqTimer = setTimeout(renderPrompt, 150); });
  $('#pg-prompt-copy').addEventListener('click', function () { copy($('#pg-prompt-text').value, 'AI prompt copied'); });
  $('#pg-prompt-dl').addEventListener('click', function () {
    var blob = new Blob([$('#pg-prompt-text').value], { type: 'text/markdown' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'aegis-prompt-' + state.template.id + '.md'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Downloaded ' + a.download);
  });
  $('#pg-gen').addEventListener('click', function () { showTab('prompt', true); });

  /* ==================================================================== tabs */
  var tabs = $$('#pg-tabs [role="tab"]');
  function showTab(name, focus) {
    state.tab = name;
    tabs.forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      $('#' + b.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) b.focus();
    });
    $('#pg-vp').hidden = name !== 'preview';
    if (name === 'prompt') renderPrompt();
  }
  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); });
    b.addEventListener('keydown', function (e) {
      var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault(); showTab(tabs[(n + tabs.length) % tabs.length].getAttribute('data-tab'), true);
    });
  });

  /* ==================================================================== copy + toast */
  var toastTimer;
  function toast(msg) { var el = $('#pg-toast'); el.textContent = msg; el.classList.add('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2200); }
  function copy(text, msg) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); toast(ok ? msg : 'Copy blocked: select the code and copy it manually');
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { toast(msg); }, fallback);
    else fallback();
    root.lastCopied = text;
  }
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = state.template, k = b.getAttribute('data-copy');
      copy(k === 'html' ? t.html : k === 'css' ? cssSource(t) : jsSource(t), k.toUpperCase() + ' copied: ' + t.name);
    });
  });

  /* ==================================================================== prompt-to-component matcher */
  var STOP = 'a an the with and or of for to in on my our your that this is are be it as at by from i we need want build create make component please using use some like show which'.split(' ');
  var SYN = { table: 'grid', spreadsheet: 'grid', modal: 'dialog', popup: 'dialog', dropdown: 'menu', graph: 'chart', pie: 'donut', board: 'kanban', trello: 'kanban', tickets: 'kanban', steps: 'wizard', onboarding: 'wizard', login: 'sign', signin: 'sign', password: 'sign', bell: 'notifications', inbox: 'notifications', snackbar: 'toast', spotlight: 'command', cmdk: 'command', shortcut: 'command', sidebar: 'shell', calendar: 'date', datepicker: 'date', upload: 'dropzone', attachments: 'dropzone', pricing: 'plans', subscription: 'plans', billing: 'invoice', ledger: 'transactions', payments: 'transactions', logs: 'log', terminal: 'log', chat: 'assistant', copilot: 'assistant', ai: 'assistant', secrets: 'keys', tokens: 'keys', faq: 'accordion', loading: 'skeleton', a11y: 'accessibility', contrast: 'accessibility', tree: 'tree', explorer: 'tree', breadcrumb: 'header', users: 'members', roles: 'members', audit: 'timeline', history: 'timeline', kpi: 'kpi', sparkline: 'sparkline', editor: 'editor', ide: 'editor' };
  function words(s) { return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(function (w) { return w && STOP.indexOf(w) < 0; }); }
  function match(query) {
    var q = query.toLowerCase(), ws = words(query);
    ws = ws.concat(ws.map(function (w) { return SYN[w] || SYN[w.replace(/s$/, '')]; }).filter(Boolean));
    return TEMPLATES.map(function (t) {
      var s = 0, name = t.name.toLowerCase(), desc = t.description.toLowerCase();
      t.tags.forEach(function (tag) { if (q.indexOf(tag) > -1) s += tag.indexOf(' ') > -1 ? 8 : 5; });
      ws.forEach(function (w) {
        var stem = w.length > 4 ? w.replace(/(ing|es|s)$/, '') : w;
        if (name.indexOf(stem) > -1) s += 4;
        if (t.tags.some(function (tag) { return tag.indexOf(stem) > -1; })) s += 3;
        if (t.category.toLowerCase() === w) s += 2;
        if (desc.indexOf(stem) > -1) s += 1;
      });
      return { t: t, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 4);
  }
  $('#pg-prompt-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var text = $('#pg-prompt-input').value.trim(), out = $('#pg-matches');
    if (!text) { out.innerHTML = '<span class="ae-help ae-help--error">Describe the component you need first.</span>'; $('#pg-prompt-input').focus(); return; }
    var res = match(text);
    if (!res.length) { out.innerHTML = '<span class="ae-muted">No close template. Showing the AI prompt for the current template with your request.</span>'; $('#pg-req').value = text; showTab('prompt'); return; }
    out.innerHTML = '<span class="ae-muted">Best match:</span>' + res.map(function (x, i) {
      return '<button type="button" class="pg-chip' + (i === 0 ? ' pg-chip--best' : '') + '" data-match="' + x.t.id + '">' + esc(x.t.name) + ' <small>' + esc(x.t.category) + '</small></button>';
    }).join('');
    $('#pg-req').value = text;
    select(res[0].t.id);
    showTab('prompt');
    root.lastMatch = res.map(function (x) { return x.t.id; });
  });
  $('#pg-matches').addEventListener('click', function (e) {
    var b = e.target.closest('[data-match]'); if (!b) return;
    $$('#pg-matches .pg-chip').forEach(function (c) { c.classList.toggle('pg-chip--best', c === b); });
    select(b.getAttribute('data-match')); showTab('prompt');
  });

  /* ==================================================================== select */
  function select(id, opts) {
    var t = T.get(id) || TEMPLATES[0];
    state.template = t;
    $('#pg-tpl-cat').textContent = t.category;
    $('#pg-tpl-name').textContent = t.name;
    $('#pg-tpl-desc').textContent = t.description;
    document.title = t.name + ' · AegisUI Playground';
    renderList(); renderCode(); renderPreview(); scheduleTokenRefresh();
    if (state.tab === 'prompt') renderPrompt();
    if (!(opts && opts.noHash)) { try { history.replaceState(null, '', location.pathname + location.search + '#' + t.id); } catch (e) {} }
    persist(); emit();
  }
  window.addEventListener('hashchange', function () { var id = location.hash.slice(1); if (T.get(id) && (!state.template || state.template.id !== id)) select(id, { noHash: true }); });

  /* ==================================================================== public API */
  root.version = '1.0.0';
  root.templates = function () { return TEMPLATES.map(function (t) { return { id: t.id, name: t.name, category: t.category, tags: t.tags.slice() }; }); };
  root.select = function (id) { if (!T.get(id)) return false; select(id); return true; };
  root.setPreset = function (id, mode) { init.note = ''; init.src = 'API'; return setPreset(id, mode); };
  root.getState = function () { return { preset: state.preset, mode: state.mode, template: state.template && state.template.id, viewport: state.vp, registry: !!P }; };
  root.buildPrompt = function (id, request) { var t = T.get(id); return t ? buildPrompt(t, request || '') : null; };
  root.match = function (q) { return match(q).map(function (x) { return x.t.id; }); };
  root.tokensOf = function (id) { var t = T.get(id); return t ? tokensOf(t) : []; };
  root.source = function (id) { var t = T.get(id); return t ? { html: t.html, css: cssSource(t), js: jsSource(t) } : null; };

  /* ==================================================================== boot */
  var topH = function () { document.documentElement.style.setProperty('--pg-top-h', $('.pg-top').offsetHeight + 'px'); };
  topH(); window.addEventListener('resize', topH);
  applyTheme(document);
  syncControls();
  setVp(state.vp);
  var startId = location.hash.slice(1);
  select(T.get(startId) ? startId : (T.get(init.own.template) ? init.own.template : TEMPLATES[0].id), { noHash: !T.get(startId) });
  showTab('preview');
})();
