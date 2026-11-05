/*!
 * AegisUI Accessibility Simulator (Phase 2)
 * Vanilla JS, zero runtime dependencies. Works from file:// or any subpath.
 *
 * A SIMULATION AND REVIEW AID. Nothing here certifies or proves WCAG
 * conformance; automated observations are heuristics to guide manual review.
 *
 * Integration hooks are documented in simulator/README.md:
 *   window.AegisSimulator      public API (state, presets, review, report)
 *   URL ?theme=&mode=&vision=&washout=&scale=&rtl=&focus=&width=   (also #hash)
 *   localStorage bridge keys    read-only probe for the shared active preset
 *   window event "aegis:preset-change"  { detail: { id, mode } }
 */
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var STORE_KEY = 'aegis-simulator:v1';            // simulator settings (owned here)
  var SESSION_PRESET_KEY = 'aegis-simulator:preset'; // preset picked inside the simulator (this tab)
  var BRIDGE_KEYS = ['aegis:active-preset', 'aegisui:active-preset', 'aegis-active-preset', 'aegisui:preset']; // read-only
  var DEFAULT_PRESET = 'enterprise-saas';
  var FALLBACK_PRESETS = [
    ['enterprise-saas', 'Enterprise SaaS', 'light'], ['fintech-terminal', 'Fintech Terminal', 'dark'],
    ['healthcare-clean', 'Healthcare Clean', 'light'], ['ai-studio-dark', 'AI Studio Dark', 'dark'],
    ['swiss-editorial', 'Swiss Editorial', 'light'], ['gov-accessible', 'High-Contrast Gov', 'light'],
    ['retail-commerce', 'Retail Commerce', 'light'], ['legal-slate', 'Legal & Compliance Slate', 'light'],
    ['developer-console', 'Developer Console', 'dark'], ['logistics-ops', 'Logistics Ops', 'light'],
    ['creative-agency', 'Creative Agency Bold', 'light'], ['wellness-hr', 'Calm Wellness & HR', 'light'],
  ];
  var DEFAULTS = { vision: 'none', washout: false, washoutLevel: 60, textScale: 100, rtl: false, focusOrder: false, width: 'fit' };
  var VISIONS = {
    none: { label: 'Typical vision' },
    protanopia: { label: 'Protanopia', m: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998] },
    deuteranopia: { label: 'Deuteranopia', m: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881] },
    tritanopia: { label: 'Tritanopia', m: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039] },
    achromatopsia: { label: 'Achromatopsia', m: [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722] },
  };
  var SCALES = [100, 125, 150, 200];
  var WIDTHS = ['fit', '1280', '768', '390'];

  /* ================================================================
   * Small utilities
   * ================================================================ */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function truncate(s, n) { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function plural(n, w, p) { return n + ' ' + (n === 1 ? w : (p || w + 's')); }
  function storageGet(area, k) { try { return window[area].getItem(k); } catch (e) { return null; } }
  function storageSet(area, k, v) { try { window[area].setItem(k, v); } catch (e) { /* storage unavailable */ } }
  function storageDel(area, k) { try { window[area].removeItem(k); } catch (e) { /* storage unavailable */ } }
  function rafThrottle(fn) { var q = false; return function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; fn(); }); }; }

  /* ================================================================
   * Color math (mirrors the SVG filter chain exactly)
   * ================================================================ */
  function parseColor(str) {
    if (!str) return null;
    str = String(str).trim().toLowerCase();
    if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    var m = str.match(/^#([0-9a-f]{3,8})$/);
    if (m) {
      var h = m[1];
      if (h.length <= 4) h = h.split('').map(function (c) { return c + c; }).join('');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
    }
    m = str.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      var p = m[1].split(/[\s,/]+/).filter(Boolean);
      var ch = function (v) { return v.slice(-1) === '%' ? parseFloat(v) * 2.55 : parseFloat(v); };
      var a = p[3] === undefined ? 1 : (p[3].slice(-1) === '%' ? parseFloat(p[3]) / 100 : parseFloat(p[3]));
      return { r: ch(p[0]), g: ch(p[1]), b: ch(p[2]), a: isNaN(a) ? 1 : a };
    }
    m = str.match(/^color\(srgb\s+([^)]+)\)$/);
    if (m) {
      var q = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
      return { r: q[0] * 255, g: q[1] * 255, b: q[2] * 255, a: q[3] === undefined || isNaN(q[3]) ? 1 : q[3] };
    }
    return null;
  }
  function hex(c) { return '#' + [c.r, c.g, c.b].map(function (v) { return Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0'); }).join(''); }
  function toLin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function fromLin(v) { v = clamp(v, 0, 1); return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
  function blend(top, bottom) { var a = top.a === undefined ? 1 : top.a; return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 }; }
  function luminance(c) { return 0.2126 * toLin(c.r) + 0.7152 * toLin(c.g) + 0.0722 * toLin(c.b); }
  function contrast(a, b) { var L1 = luminance(a), L2 = luminance(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }
  function washoutParams(level) { var t = clamp(level, 0, 100) / 100; return { slope: 1 - 0.55 * t, intercept: 0.3 * t, saturate: 1 - 0.45 * t }; }
  /** Apply the active simulation to one opaque sRGB color. */
  function simulateColor(c, s) {
    var out = { r: c.r, g: c.g, b: c.b, a: 1 };
    var v = VISIONS[s.vision];
    if (v && v.m) {
      var m = v.m, R = toLin(out.r), G = toLin(out.g), B = toLin(out.b);
      out = { r: fromLin(m[0] * R + m[1] * G + m[2] * B), g: fromLin(m[3] * R + m[4] * G + m[5] * B), b: fromLin(m[6] * R + m[7] * G + m[8] * B), a: 1 };
    }
    if (s.washout) {
      var w = washoutParams(s.washoutLevel), k = w.saturate;
      var r = clamp(out.r / 255 * w.slope + w.intercept, 0, 1), g = clamp(out.g / 255 * w.slope + w.intercept, 0, 1), b = clamp(out.b / 255 * w.slope + w.intercept, 0, 1);
      out = {
        r: 255 * clamp((0.213 + 0.787 * k) * r + (0.715 - 0.715 * k) * g + (0.072 - 0.072 * k) * b, 0, 1),
        g: 255 * clamp((0.213 - 0.213 * k) * r + (0.715 + 0.285 * k) * g + (0.072 - 0.072 * k) * b, 0, 1),
        b: 255 * clamp((0.213 - 0.213 * k) * r + (0.715 - 0.715 * k) * g + (0.072 + 0.928 * k) * b, 0, 1),
        a: 1,
      };
    }
    return out;
  }
  function toLab(c) {
    var R = toLin(c.r), G = toLin(c.g), B = toLin(c.b);
    var f = function (t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; };
    var x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), y = f(R * 0.2126 + G * 0.7152 + B * 0.0722), z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
  }
  function deltaE(c1, c2) { var a = toLab(c1), b = toLab(c2); return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b); }

  /* ================================================================
   * DOM refs + state
   * ================================================================ */
  var ws, canvas, viewport, overlay, filterEl, live;
  var state = Object.assign({}, DEFAULTS);
  var preset = { id: DEFAULT_PRESET, mode: 'light', source: 'default' };
  var focusStops = [];
  var stepIndex = -1;
  var textTokenNames = null;

  function presetList() {
    var P = window.AegisPresets;
    if (P && typeof P.list === 'function') {
      try { return P.list().map(function (m) { return [m.id, m.name, m.defaultMode]; }); } catch (e) { /* fall through */ }
    }
    return FALLBACK_PRESETS;
  }
  function presetInfo(id) { var l = presetList(); for (var i = 0; i < l.length; i++) if (l[i][0] === id) return l[i]; return null; }
  function validMode(m) { return m === 'light' || m === 'dark'; }

  /* ================================================================
   * Preset inheritance (URL → this tab → shared bridge → default)
   * ================================================================ */
  function readParams() {
    var out = {};
    var add = function (str) { str.replace(/^[?#]/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); };
    add(location.hash || ''); add(location.search || '');
    return out;
  }
  function parsePresetValue(raw) {
    if (!raw) return null;
    var v = raw;
    try { v = JSON.parse(raw); } catch (e) { /* plain string */ }
    if (typeof v === 'string') return { id: v };
    if (v && typeof v === 'object') return { id: v.id || v.theme || v.preset, mode: v.mode };
    return null;
  }
  function resolvePreset() {
    var params = readParams();
    var candidates = [];
    if (params.theme || params.preset) candidates.push({ id: params.theme || params.preset, mode: params.mode, source: 'url' });
    var sess = parsePresetValue(storageGet('sessionStorage', SESSION_PRESET_KEY));
    if (sess) { sess.source = 'simulator'; candidates.push(sess); }
    try {
      var bridge = window.AegisTokenBridge;
      if (bridge && typeof bridge.getActivePreset === 'function') { var b = bridge.getActivePreset(); if (b) candidates.push({ id: b.id, mode: b.mode, source: 'bridge' }); }
    } catch (e) { /* ignore a faulty bridge */ }
    BRIDGE_KEYS.forEach(function (k) { var p = parsePresetValue(storageGet('localStorage', k)); if (p) { p.source = 'storage:' + k; candidates.push(p); } });
    var themeMode = storageGet('localStorage', 'aegis-theme'); // showcase light/dark preference
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i], info = c.id && presetInfo(c.id);
      if (info) return { id: info[0], mode: validMode(c.mode) ? c.mode : (validMode(params.mode) ? params.mode : (validMode(themeMode) ? themeMode : info[2] || 'light')), source: c.source };
    }
    var def = presetInfo(DEFAULT_PRESET) || FALLBACK_PRESETS[0];
    return { id: def[0], mode: validMode(params.mode) ? params.mode : (validMode(themeMode) ? themeMode : def[2]), source: 'default' };
  }

  function loadSettings() {
    var saved = {};
    try { saved = JSON.parse(storageGet('localStorage', STORE_KEY) || '{}') || {}; } catch (e) { saved = {}; }
    var s = sanitize(Object.assign({}, DEFAULTS, saved));
    var p = readParams();
    if (p.vision) s.vision = p.vision;
    if (p.washout !== undefined) { var n = parseInt(p.washout, 10); s.washout = p.washout !== '0' && p.washout !== 'false'; if (n > 0) s.washoutLevel = n; }
    if (p.scale) s.textScale = parseInt(p.scale, 10);
    if (p.rtl !== undefined) s.rtl = p.rtl !== '0' && p.rtl !== 'false';
    if (p.focus !== undefined) s.focusOrder = p.focus !== '0' && p.focus !== 'false';
    if (p.width) s.width = p.width;
    return sanitize(s);
  }
  function sanitize(s) {
    var o = Object.assign({}, DEFAULTS);
    if (VISIONS[s.vision]) o.vision = s.vision;
    o.washout = !!s.washout;
    o.washoutLevel = clamp(Math.round(+s.washoutLevel || DEFAULTS.washoutLevel), 10, 100);
    if (SCALES.indexOf(+s.textScale) !== -1) o.textScale = +s.textScale;
    o.rtl = !!s.rtl;
    o.focusOrder = !!s.focusOrder;
    if (WIDTHS.indexOf(String(s.width)) !== -1) o.width = String(s.width);
    return o;
  }
  function saveSettings() { storageSet('localStorage', STORE_KEY, JSON.stringify(state)); }

  /* ================================================================
   * Applying simulations
   * ================================================================ */
  function applyPreset(id, mode, opts) {
    opts = opts || {};
    var info = presetInfo(id) || presetInfo(DEFAULT_PRESET);
    preset.id = info[0];
    preset.mode = validMode(mode) ? mode : info[2] || 'light';
    if (opts.source) preset.source = opts.source;
    if (window.AegisPresets && typeof window.AegisPresets.apply === 'function') {
      try { window.AegisPresets.apply(preset.id, { mode: preset.mode, target: ws, loadFonts: false }); } catch (e) { setThemeAttrs(); }
    } else setThemeAttrs();
    var sel = $('#sim-preset'), msel = $('#sim-mode');
    if (sel) sel.value = preset.id;
    if (msel) msel.value = preset.mode;
    if (opts.persist) storageSet('sessionStorage', SESSION_PRESET_KEY, JSON.stringify({ id: preset.id, mode: preset.mode }));
    applyTextScale();
  }
  function setThemeAttrs() { ws.setAttribute('data-aegis-theme', preset.id); ws.setAttribute('data-aegis-mode', preset.mode); }

  function buildFilter(s) {
    var NS = 'http://www.w3.org/2000/svg';
    while (filterEl.firstChild) filterEl.removeChild(filterEl.firstChild);
    var v = VISIONS[s.vision];
    if (v && v.m) {
      var cm = document.createElementNS(NS, 'feColorMatrix');
      cm.setAttribute('type', 'matrix');
      cm.setAttribute('color-interpolation-filters', 'linearRGB');
      var m = v.m;
      cm.setAttribute('values', [m[0], m[1], m[2], 0, 0, m[3], m[4], m[5], 0, 0, m[6], m[7], m[8], 0, 0, 0, 0, 0, 1, 0].join(' '));
      filterEl.appendChild(cm);
    }
    if (s.washout) {
      var w = washoutParams(s.washoutLevel);
      var ct = document.createElementNS(NS, 'feComponentTransfer');
      ct.setAttribute('color-interpolation-filters', 'sRGB');
      ['feFuncR', 'feFuncG', 'feFuncB'].forEach(function (n) {
        var f = document.createElementNS(NS, n);
        f.setAttribute('type', 'linear'); f.setAttribute('slope', w.slope.toFixed(4)); f.setAttribute('intercept', w.intercept.toFixed(4));
        ct.appendChild(f);
      });
      filterEl.appendChild(ct);
      var sat = document.createElementNS(NS, 'feColorMatrix');
      sat.setAttribute('type', 'saturate'); sat.setAttribute('values', w.saturate.toFixed(4));
      sat.setAttribute('color-interpolation-filters', 'sRGB');
      filterEl.appendChild(sat);
    }
    return filterEl.childNodes.length > 0;
  }

  /** Collect every --aegis-* custom property that carries text size (cached once). */
  function collectTextTokens() {
    if (textTokenNames) return textTokenNames;
    var names = {};
    var re = /^--aegis-(text-|.*text-style$|.*font-size)/;
    for (var i = 0; i < document.styleSheets.length; i++) {
      var rules;
      try { rules = document.styleSheets[i].cssRules; } catch (e) { continue; }
      (function walk(list) {
        for (var j = 0; j < list.length; j++) {
          var r = list[j];
          if (r.cssRules && !r.style) { walk(r.cssRules); continue; }
          if (!r.style || !r.selectorText || r.selectorText.indexOf('data-aegis-theme') === -1) continue;
          for (var k = 0; k < r.style.length; k++) { var n = r.style[k]; if (re.test(n) && !/(tracking|transform|features|family|weight)$/.test(n)) names[n] = true; }
          if (r.cssRules) walk(r.cssRules);
        }
      })(rules);
    }
    textTokenNames = Object.keys(names);
    return textTokenNames;
  }
  function applyTextScale() {
    var names = collectTextTokens();
    names.forEach(function (n) { ws.style.removeProperty(n); });
    ws.style.removeProperty('font-size');
    var f = state.textScale / 100;
    ws.setAttribute('data-sim-text-scale', String(state.textScale));
    if (f === 1) return;
    var cs = getComputedStyle(ws);
    var vals = names.map(function (n) { return [n, cs.getPropertyValue(n).trim()]; });
    vals.forEach(function (nv) {
      if (!/\d(px|rem)/.test(nv[1])) return;
      var v = nv[1].replace(/(-?\d*\.?\d+)(px|rem)\b/g, function (_, num, unit) { return +(parseFloat(num) * f).toFixed(3) + unit; });
      ws.style.setProperty(nv[0], v);
    });
    ws.style.setProperty('font-size', (parseFloat(cs.fontSize) * f) + 'px');
  }

  function applyWidth() {
    if (state.width === 'fit') { canvas.removeAttribute('data-width'); canvas.style.removeProperty('--sim-canvas-w'); }
    else { canvas.setAttribute('data-width', state.width); canvas.style.setProperty('--sim-canvas-w', state.width + 'px'); }
    updateNarrow();
  }
  function updateNarrow() { ws.classList.toggle('is-narrow', ws.getBoundingClientRect().width < 680); }

  function applyAll(opts) {
    opts = opts || {};
    var hasFilter = buildFilter(state);
    ws.style.filter = hasFilter ? 'url(#sim-filter)' : '';
    if (state.rtl) ws.setAttribute('dir', 'rtl'); else ws.removeAttribute('dir');
    applyTextScale();
    applyWidth();
    syncControls();
    renderChips();
    if (opts.persist !== false) saveSettings();
    scheduleRefresh();
  }

  /* ================================================================
   * Keyboard focus order (real sequential navigation order)
   * ================================================================ */
  var CANDIDATES = 'a[href],area[href],button,input,select,textarea,summary,iframe,audio[controls],video[controls],[tabindex],[contenteditable]:not([contenteditable="false"])';
  function isTabbable(el) {
    if (el.tabIndex < 0) return false;
    if (el.disabled) return false;
    if (el.closest('[inert]')) return false;
    if (el.matches('input[type="hidden"]')) return false;
    var fs = el.closest('fieldset[disabled]');
    if (fs && !(fs.querySelector('legend') && fs.querySelector('legend').contains(el))) return false;
    var d = el.parentElement && el.parentElement.closest('details:not([open])');
    if (d && !(el.matches('summary') && el.parentElement === d)) return false;
    if (el.matches('summary') && el.parentElement.querySelector(':scope > summary') !== el) return false;
    if (!el.getClientRects().length) return false;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    return true;
  }
  function focusOrder(root) {
    root = root || ws;
    var list = $$(CANDIDATES, root).filter(isTabbable);
    // Radio groups expose one stop: the checked radio, else the first in the group.
    var groups = {};
    list = list.filter(function (el) {
      if (!el.matches('input[type="radio"]') || !el.name) return true;
      var key = (el.form ? 'f' : 'r') + ':' + el.name;
      if (!groups[key]) {
        var members = list.filter(function (o) { return o.matches('input[type="radio"]') && o.name === el.name && o.form === el.form; });
        groups[key] = members.filter(function (o) { return o.checked; })[0] || members[0];
      }
      return groups[key] === el;
    });
    var positive = list.filter(function (el) { return el.tabIndex > 0; }).map(function (el, i) { return { el: el, i: i }; })
      .sort(function (a, b) { return a.el.tabIndex - b.el.tabIndex || a.i - b.i; }).map(function (x) { return x.el; });
    return positive.concat(list.filter(function (el) { return el.tabIndex === 0; }));
  }
  function accName(el) {
    var t = el.getAttribute('aria-label');
    if (t && t.trim()) return t.trim();
    var lb = el.getAttribute('aria-labelledby');
    if (lb) { t = lb.split(/\s+/).map(function (id) { var n = document.getElementById(id); return n ? n.textContent : ''; }).join(' ').trim(); if (t) return t; }
    if (el.labels && el.labels.length) { t = Array.prototype.map.call(el.labels, function (l) { return l.textContent; }).join(' ').trim(); if (t) return t; }
    if (el.matches('img,input[type="image"],area')) return (el.getAttribute('alt') || '').trim();
    if (el.matches('input[type="submit"],input[type="button"],input[type="reset"]')) return (el.value || '').trim();
    if (!el.matches('input,select,textarea')) {
      var clone = el.cloneNode(true);
      $$('[aria-hidden="true"],.ws-sr-hidden', clone).forEach(function (n) { n.parentNode.removeChild(n); });
      t = clone.textContent.replace(/\s+/g, ' ').trim();
      if (t) return t;
    }
    return (el.getAttribute('title') || '').trim();
  }
  function describe(el) {
    var tag = el.tagName.toLowerCase();
    var role = el.getAttribute('role') || (tag === 'a' ? 'link' : tag === 'button' ? 'button' : tag === 'select' ? 'combobox' : tag === 'textarea' ? 'textbox' : tag === 'input' ? ({ checkbox: 'checkbox', radio: 'radio', search: 'searchbox', range: 'slider', submit: 'button', reset: 'button' }[el.type] || 'textbox') : tag);
    if (tag === 'input' && el.type === 'checkbox' && el.getAttribute('role') === 'switch') role = 'switch';
    return role;
  }
  function rectIn(el, base) { var r = el.getBoundingClientRect(); return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }; }

  function computeStops() {
    var base = canvas.getBoundingClientRect();
    var rtl = state.rtl;
    focusStops = focusOrder(ws).map(function (el, i) {
      var r = rectIn(el, base);
      return { el: el, n: i + 1, name: accName(el), role: describe(el), tabindex: el.getAttribute('tabindex'), rect: r, cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
    });
    focusStops.forEach(function (s, i) {
      var p = focusStops[i - 1];
      s.back = !!p && s.cy < p.cy - Math.max(12, p.rect.h / 2);
      // Same row, but moving against the reading direction.
      s.against = !!p && !s.back && Math.abs(s.cy - p.cy) < Math.max(10, p.rect.h / 2) && (rtl ? s.cx > p.cx + 4 : s.cx < p.cx - 4);
    });
    return focusStops;
  }

  function drawOverlay() {
    var NS = 'http://www.w3.org/2000/svg';
    overlay.innerHTML = '';
    if (!state.focusOrder) { overlay.setAttribute('hidden', ''); return; }
    overlay.removeAttribute('hidden');
    var W = Math.max(canvas.scrollWidth, canvas.clientWidth), H = Math.max(canvas.scrollHeight, canvas.clientHeight);
    overlay.setAttribute('width', W); overlay.setAttribute('height', H); overlay.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    overlay.innerHTML = '<defs><marker id="sim-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z"/></marker></defs>';
    var gPaths = document.createElementNS(NS, 'g'), gBoxes = document.createElementNS(NS, 'g'), gBadges = document.createElementNS(NS, 'g');
    focusStops.forEach(function (s, i) {
      var box = document.createElementNS(NS, 'rect');
      box.setAttribute('class', 'fo-box'); box.setAttribute('data-n', s.n);
      box.setAttribute('x', s.rect.x - 2); box.setAttribute('y', s.rect.y - 2); box.setAttribute('width', s.rect.w + 4); box.setAttribute('height', s.rect.h + 4); box.setAttribute('rx', 4);
      gBoxes.appendChild(box);
      if (i > 0) {
        var p = focusStops[i - 1];
        var path = document.createElementNS(NS, 'path');
        var mx = (p.cx + s.cx) / 2, my = (p.cy + s.cy) / 2 - Math.min(40, Math.abs(s.cx - p.cx) / 6 + 6);
        path.setAttribute('d', 'M' + p.cx.toFixed(1) + ' ' + p.cy.toFixed(1) + ' Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + s.cx.toFixed(1) + ' ' + s.cy.toFixed(1));
        path.setAttribute('class', 'fo-path' + (s.back || s.against ? ' is-back' : ''));
        path.setAttribute('marker-end', 'url(#sim-arrow)');
        gPaths.appendChild(path);
      }
      var g = document.createElementNS(NS, 'g');
      var flag = s.back || s.against || (s.tabindex !== null && +s.tabindex > 0) || !s.name;
      g.setAttribute('class', 'fo-badge' + (flag ? ' is-flag' : '')); g.setAttribute('data-n', s.n);
      var bx = state.rtl ? s.rect.x + s.rect.w : s.rect.x, by = s.rect.y;
      var c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', bx); c.setAttribute('cy', by); c.setAttribute('r', s.n > 99 ? 12 : 10);
      var t = document.createElementNS(NS, 'text'); t.setAttribute('x', bx); t.setAttribute('y', by); t.textContent = s.n;
      g.appendChild(c); g.appendChild(t); gBadges.appendChild(g);
    });
    overlay.appendChild(gPaths); overlay.appendChild(gBoxes); overlay.appendChild(gBadges);
    markCurrent();
  }
  function markCurrent() {
    var cur = document.activeElement;
    var idx = -1;
    focusStops.forEach(function (s, i) { if (s.el === cur) idx = i; });
    $$('.is-current', overlay).forEach(function (n) { n.classList.remove('is-current'); });
    $$('#sim-stops button').forEach(function (b, i) { b.setAttribute('aria-current', String(i === idx)); });
    if (idx >= 0) {
      stepIndex = idx;
      var n = String(idx + 1);
      $$('[data-n="' + n + '"]', overlay).forEach(function (x) { x.classList.add('is-current'); });
    }
    return idx;
  }
  function renderStopList() {
    $('#sim-stop-count').textContent = String(focusStops.length);
    $('#sim-stops').innerHTML = focusStops.map(function (s, i) {
      var flags = [];
      if (s.tabindex !== null && +s.tabindex > 0) flags.push('tabindex=' + s.tabindex);
      if (!s.name) flags.push('no name');
      if (s.back) flags.push('jumps up');
      if (s.against) flags.push('against reading direction');
      return '<li><button type="button" data-i="' + i + '"><b>' + s.n + '</b><span>' + esc(s.role) + ' · ' + esc(truncate(s.name || '(no accessible name)', 44)) + (flags.length ? ' <span class="is-flag">(' + esc(flags.join(', ')) + ')</span>' : '') + '</span></button></li>';
    }).join('');
  }
  function focusStop(i) {
    if (!focusStops.length) return;
    i = (i + focusStops.length) % focusStops.length;
    var s = focusStops[i];
    stepIndex = i;
    s.el.focus({ preventScroll: true });
    s.el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    announce('Focus stop ' + s.n + ' of ' + focusStops.length + ': ' + s.role + ', ' + (s.name || 'no accessible name'));
  }

  /* ================================================================
   * Automated observations (heuristic, never pass/fail)
   * ================================================================ */
  function effectiveBg(el) {
    var layers = [];
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null;
      var c = parseColor(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      if (n === ws) break;
    }
    var out = { r: 255, g: 255, b: 255, a: 1 };
    for (var i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out);
    return out;
  }
  function directText(el) { var t = ''; for (var i = 0; i < el.childNodes.length; i++) if (el.childNodes[i].nodeType === 3) t += el.childNodes[i].textContent; return t.replace(/\s+/g, ' ').trim(); }
  function label(el) {
    var tag = el.tagName.toLowerCase(), cls = (el.getAttribute('class') || '').split(/\s+/).filter(function (c) { return c && !/^ae-(text|muted)/.test(c); })[0];
    var txt = directText(el) || accName(el);
    return tag + (cls ? '.' + cls : '') + (txt ? ' “' + truncate(txt, 32) + '”' : '');
  }
  function textPairs() {
    var out = [];
    $$('*', ws).forEach(function (el) {
      if (el.closest('svg') || el.matches('script,style,option')) return;
      var t = directText(el);
      if (!t || !el.getClientRects().length) return;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || el.closest('[disabled],[aria-disabled="true"]') || cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return;
      var fg = parseColor(cs.color), bg = effectiveBg(el);
      if (!fg || !bg) return;
      var op = 1;
      for (var n = el; n && n !== ws.parentElement; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity || '1');
      var size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
      var large = size >= 24 || (size >= 18.66 && weight >= 700);
      out.push({ el: el, text: t, fg: blend({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * op }, bg), bg: bg, req: large ? 3 : 4.5 });
    });
    return out;
  }
  function tokenColor(name) { return parseColor(getComputedStyle(ws).getPropertyValue(name).trim()); }
  function categoricalSets() {
    var data = [];
    for (var i = 1; i <= 8; i++) { var c = tokenColor('--aegis-data-' + i); if (c) data.push({ name: 'Chart series ' + i, c: c }); }
    var status = ['success', 'warning', 'danger', 'info'].map(function (k) { return { name: k.charAt(0).toUpperCase() + k.slice(1), c: tokenColor('--aegis-' + k + '-default') }; }).filter(function (x) { return x.c; });
    return [{ title: 'Chart series (data.1–5 used in the chart)', items: data.slice(0, 5) }, { title: 'Status colors (badges, risk dots, alerts)', items: status }];
  }
  function confusablePairs(items, s) {
    var out = [];
    for (var i = 0; i < items.length; i++) for (var j = i + 1; j < items.length; j++) {
      var base = deltaE(items[i].c, items[j].c), sim = deltaE(simulateColor(items[i].c, s), simulateColor(items[j].c, s));
      if (base >= 20 && sim < 12) out.push(items[i].name + ' ≈ ' + items[j].name + ' (ΔE ' + base.toFixed(0) + ' → ' + sim.toFixed(0) + ')');
    }
    return out;
  }
  function uiBoundaryPairs() {
    var out = [];
    var surface = tokenColor('--aegis-bg-surface'), canvasBg = tokenColor('--aegis-bg-canvas');
    var add = function (label, tok, bgTok, bg) { var c = tokenColor(tok); if (c && bg) out.push({ label: label + ' on ' + bgTok, fg: c, bg: bg, req: 3 }); };
    add('Input border', '--aegis-input-border', 'surface', surface);
    add('Strong border', '--aegis-border-strong', 'surface', surface);
    add('Focus ring', '--aegis-focus-ring-color', 'surface', surface);
    add('Focus ring', '--aegis-focus-ring-color', 'canvas', canvasBg);
    add('Primary button', '--aegis-button-primary-bg', 'surface', surface);
    return out;
  }

  /** Observations for one simulation spec. Mutates layout only for text/rtl specs and restores it. */
  function observe(kind, s) {
    var obs = [];
    var add = function (level, title, detail, items) { obs.push({ kind: kind, level: level, title: title, detail: detail || '', items: items || [] }); };
    if (kind === 'baseline') {
      var pairs = textPairs(), fails = pairs.filter(function (p) { return contrast(p.fg, p.bg) < p.req - 0.005; });
      add(fails.length ? 'review' : 'info', plural(pairs.length, 'text sample') + ' measured',
        fails.length ? plural(fails.length, 'sample') + ' fall below the WCAG 1.4.3 ratio (4.5:1, or 3:1 for large text) before any simulation.' : 'All sampled text meets the WCAG 1.4.3 ratio for its size before simulation. Images, gradients and overlapping content are not measured.',
        fails.slice(0, 8).map(function (p) { return label(p.el) + ' ' + contrast(p.fg, p.bg).toFixed(2) + ':1'; }));
      return obs;
    }
    if (kind === 'protanopia' || kind === 'deuteranopia' || kind === 'tritanopia' || kind === 'achromatopsia' || kind === 'washout') {
      var spec = kind === 'washout' ? { vision: 'none', washout: true, washoutLevel: s.washoutLevel } : { vision: kind, washout: false };
      var tp = textPairs(), drop = [];
      tp.forEach(function (p) {
        var before = contrast(p.fg, p.bg), after = contrast(simulateColor(p.fg, spec), simulateColor(p.bg, spec));
        if (before >= p.req - 0.005 && after < p.req - 0.005) drop.push({ p: p, before: before, after: after });
      });
      drop.sort(function (a, b) { return a.after - b.after; });
      add(drop.length ? 'review' : 'info', drop.length ? plural(drop.length, 'text sample') + ' drop below the contrast ratio' : 'Text contrast holds under this simulation',
        drop.length ? 'These meet the ratio normally but not under this simulation. Treat them as candidates for review, not as failures.' : 'Among ' + plural(tp.length, 'measured text sample') + ', none crosses below its WCAG 1.4.3 ratio under this simulation.',
        drop.slice(0, 8).map(function (d) { return label(d.p.el) + ' ' + d.before.toFixed(2) + ' → ' + d.after.toFixed(2) + ':1'; }));
      if (kind !== 'washout') {
        categoricalSets().forEach(function (set) {
          var cp = confusablePairs(set.items, spec);
          add(cp.length ? 'review' : 'info', set.title + ': ' + (cp.length ? plural(cp.length, 'pair') + ' may be confused' : 'stay distinguishable'),
            cp.length ? 'Colors that differ clearly with typical vision become hard to tell apart. Make sure meaning also comes from text, icons or patterns.' : 'No pair falls below ΔE 12 under this simulation.', cp);
        });
        add('note', 'Color-only cues to check manually', 'Risk dots in the orders table and the Approval SLA list use color alone (their meaning is only in a tooltip or adjacent text). Status badges include a text label.', []);
      } else {
        var ui = uiBoundaryPairs().map(function (u) { return { u: u, before: contrast(u.fg, u.bg), after: contrast(simulateColor(u.fg, spec), simulateColor(u.bg, spec)) }; })
          .filter(function (x) { return x.after < x.u.req; });
        add(ui.length ? 'review' : 'info', 'UI boundaries (WCAG 1.4.11): ' + (ui.length ? plural(ui.length, 'token pair') + ' below 3:1 when washed out' : 'hold 3:1 when washed out'),
          ui.length ? 'Input borders, focus rings or button fills may disappear on a projector.' : 'Input borders, focus ring and primary button keep 3:1 against their surfaces.',
          ui.map(function (x) { return x.u.label + ' ' + x.before.toFixed(2) + ' → ' + x.after.toFixed(2) + ':1'; }));
      }
      return obs;
    }
    if (kind === 'text200' || kind === 'text') {
      var clipped = [], spill = [];
      $$('*', ws).forEach(function (el) {
        if (el.closest('svg') || !directText(el) || !el.getClientRects().length) return;
        var cs = getComputedStyle(el);
        if (cs.display === 'inline' || cs.display === 'contents') return;
        if (cs.clipPath === 'inset(50%)' || el.classList.contains('ws-sr')) return;
        var overX = el.scrollWidth > el.clientWidth + 1, overY = el.scrollHeight > el.clientHeight + 1;
        if (!overX && !overY) return;
        var scrolls = /(auto|scroll)/.test(cs.overflowX + cs.overflowY);
        if (scrolls) return;
        var hides = /(hidden|clip)/.test(cs.overflowX + cs.overflowY) || cs.textOverflow === 'ellipsis';
        (hides ? clipped : spill).push(label(el) + (overX ? ' (wider than its box)' : ' (taller than its box)'));
      });
      var hScroll = ws.scrollWidth > ws.clientWidth + 1;
      var fixedControls = $$('.ae-btn, .ae-input, .ae-select, .ae-tab', ws).filter(function (el) { var cs = getComputedStyle(el); return el.getClientRects().length && parseFloat(cs.lineHeight) > el.clientHeight + 1; }).map(label);
      add(clipped.length ? 'review' : 'info', clipped.length ? plural(clipped.length, 'element') + ' clip text' : 'No clipped text detected', 'Elements with overflow: hidden or ellipsis whose text no longer fits (WCAG 1.4.4 asks for no loss of content at 200%).', clipped.slice(0, 10));
      add(spill.length ? 'review' : 'info', spill.length ? plural(spill.length, 'element') + ' overflow their box' : 'No text overflowing its box', 'Text that spills outside a fixed-size box may overlap neighbours.', spill.slice(0, 10));
      add(fixedControls.length ? 'review' : 'info', fixedControls.length ? plural(fixedControls.length, 'fixed-height control') + ' shorter than their text' : 'Controls grow with their text', 'Buttons and inputs with a fixed height (component height tokens) do not grow with text size.', fixedControls.slice(0, 8));
      add(hScroll ? 'review' : 'info', hScroll ? 'Workspace needs horizontal scrolling' : 'No horizontal scrolling of the workspace', hScroll ? 'Content is ' + ws.scrollWidth + 'px wide in a ' + ws.clientWidth + 'px area.' : 'Content fits the workspace width.', []);
      return obs;
    }
    if (kind === 'rtl') {
      var physical = $$('*', ws).filter(function (el) { if (el.closest('svg') || !directText(el)) return false; var ta = getComputedStyle(el).textAlign; return ta === 'left'; }).map(label);
      var over = ws.scrollWidth > ws.clientWidth + 1;
      var stops = computeStops(), against = stops.filter(function (x) { return x.against; });
      add(physical.length ? 'review' : 'info', physical.length ? plural(physical.length, 'element') + ' keep physical left alignment' : 'Text alignment follows the direction', 'text-align: left does not flip in RTL; prefer start/end.', physical.slice(0, 8));
      add(against.length ? 'review' : 'info', against.length ? plural(against.length, 'focus step') + ' run left-to-right on a row' : 'Focus order follows the RTL reading direction', 'In RTL, focus should move right-to-left within a row.', against.slice(0, 8).map(function (x) { return '#' + x.n + ' ' + x.role + ' “' + truncate(x.name, 30) + '”'; }));
      add(over ? 'review' : 'info', over ? 'Mirrored layout overflows horizontally' : 'Mirrored layout fits', '', []);
      add('note', 'Directional icons', 'Breadcrumb chevrons mirror via [dir="rtl"]. Check other arrows (pagination, ▲/▼ trends) and numeric alignment manually.', []);
      return obs;
    }
    if (kind === 'focus') {
      var st = computeStops();
      var pos = st.filter(function (x) { return x.tabindex !== null && +x.tabindex > 0; });
      var noname = st.filter(function (x) { return !x.name; });
      var small = st.filter(function (x) { return (x.rect.w < 24 || x.rect.h < 24) && !(x.el.matches('a') && getComputedStyle(x.el).display === 'inline') && !x.el.matches('input[type="checkbox"],input[type="radio"]'); });
      var back = st.filter(function (x) { return x.back; });
      add('info', plural(st.length, 'focus stop') + ' in Tab order', 'Computed from the DOM: positive tabindex first, then document order. Roving-tabindex widgets (the tabs) contribute one stop.', []);
      add(pos.length ? 'review' : 'info', pos.length ? plural(pos.length, 'positive tabindex', 'positive tabindexes') : 'No positive tabindex', 'Positive tabindex values jump ahead of document order (WCAG 2.4.3).', pos.map(function (x) { return '#' + x.n + ' tabindex=' + x.tabindex + ' ' + x.role; }));
      add(noname.length ? 'review' : 'info', noname.length ? plural(noname.length, 'stop') + ' without an accessible name' : 'Every stop has an accessible name', 'Name computed from aria-label, aria-labelledby, label, alt and text content (simplified).', noname.map(function (x) { return '#' + x.n + ' ' + x.role; }));
      add(back.length ? 'review' : 'info', back.length ? plural(back.length, 'step') + ' jump back up the page' : 'Focus generally moves down the page', 'Upward jumps can mean visual order and DOM order disagree (WCAG 2.4.3). Some are expected, such as moving from a sidebar to the main column.', back.slice(0, 8).map(function (x) { return '#' + (x.n - 1) + ' → #' + x.n + ' ' + x.role + ' “' + truncate(x.name, 28) + '”'; }));
      add(small.length ? 'review' : 'info', small.length ? plural(small.length, 'target') + ' under 24×24px' : 'Targets are at least 24×24px', 'Candidates for WCAG 2.5.8 review. Spacing exceptions are not evaluated here.', small.slice(0, 8).map(function (x) { return '#' + x.n + ' ' + x.role + ' ' + Math.round(x.rect.w) + '×' + Math.round(x.rect.h) + 'px'; }));
      return obs;
    }
    return obs;
  }

  /** Observations for the CURRENT settings, shown live in the panel. */
  function currentObservations() {
    var obs = [];
    if (state.vision !== 'none') obs = obs.concat(observe(state.vision, state));
    if (state.washout) obs = obs.concat(observe('washout', state));
    if (state.textScale !== 100) obs = obs.concat(observe('text', state));
    if (state.rtl) obs = obs.concat(observe('rtl', state));
    if (state.focusOrder) obs = obs.concat(observe('focus', state));
    if (!obs.length) obs = observe('baseline', state);
    return obs;
  }
  function renderObservations() {
    var obs = currentObservations();
    $('#sim-obs').innerHTML = obs.map(function (o) {
      var cls = o.level === 'review' ? 'is-review' : o.level === 'note' ? 'is-note' : '';
      return '<li class="' + cls + '"><strong>' + esc(o.title) + '</strong>' + (o.detail ? esc(o.detail) : '') +
        (o.items.length ? '<ul>' + o.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
    }).join('');
  }

  /**
   * Full review sweep: runs every simulation in isolation against the current preset,
   * measuring synchronously and restoring the user's settings afterwards (no visible flash).
   */
  function review() {
    var saved = Object.assign({}, state);
    var result = { generatedAt: new Date(), preset: Object.assign({}, preset), settings: saved, sections: [] };
    var run = function (kind, title, temp) {
      state = Object.assign({}, DEFAULTS, { width: saved.width, washoutLevel: saved.washoutLevel }, temp || {});
      if (state.rtl) ws.setAttribute('dir', 'rtl'); else ws.removeAttribute('dir');
      applyTextScale();
      result.sections.push({ kind: kind, title: title, observations: observe(kind, state) });
    };
    try {
      run('baseline', 'Baseline (no simulation)');
      run('protanopia', 'Protanopia (red-blind)');
      run('deuteranopia', 'Deuteranopia (green-blind)');
      run('tritanopia', 'Tritanopia (blue-blind)');
      run('achromatopsia', 'Achromatopsia (no color)');
      run('washout', 'Projector / low-contrast washout (' + saved.washoutLevel + '%)', { washout: true });
      run('text', '200% text scaling', { textScale: 200 });
      run('rtl', 'Right-to-left layout', { rtl: true });
      run('focus', 'Keyboard focus order', { focusOrder: true });
      result.stops = focusStops.map(function (s) { return { n: s.n, role: s.role, name: s.name, tabindex: s.tabindex, w: Math.round(s.rect.w), h: Math.round(s.rect.h), back: s.back, against: s.against }; });
    } finally {
      state = saved;
      applyAll({ persist: false });
    }
    return result;
  }

  /* ================================================================
   * Printable HTML report
   * ================================================================ */
  var DISCLAIMER = 'This report is a simulation and review aid produced by the AegisUI Accessibility Simulator. It is NOT an accessibility audit, a compliance certificate, or proof of conformance with WCAG 2.2 or any other standard or law. Simulations approximate how some people may perceive the interface and do not represent every person’s experience. Automated observations are heuristics: they can miss issues and can flag things that are fine. Confirm every finding with manual testing, assistive technology, and people with disabilities.';
  function settingsRows(r) {
    var s = r.settings, info = presetInfo(r.preset.id) || [r.preset.id, r.preset.id];
    return [
      ['Generated', r.generatedAt.toLocaleString() + ' (' + r.generatedAt.toISOString() + ')'],
      ['Page', location.pathname],
      ['Preset', info[1] + ' (' + r.preset.id + ')'],
      ['Mode', r.preset.mode],
      ['Preset source', r.preset.source || 'default'],
      ['Color vision (on screen)', VISIONS[s.vision].label],
      ['Projector washout (on screen)', s.washout ? 'On · ' + s.washoutLevel + '%' : 'Off (sweep used ' + s.washoutLevel + '%)'],
      ['Text size (on screen)', s.textScale + '%'],
      ['Direction (on screen)', s.rtl ? 'Right-to-left' : 'Left-to-right'],
      ['Focus-order overlay', s.focusOrder ? 'On' : 'Off'],
      ['Preview width', s.width === 'fit' ? 'Fit (' + Math.round(ws.getBoundingClientRect().width) + 'px)' : s.width + 'px'],
      ['Browser viewport', window.innerWidth + '×' + window.innerHeight + ' · DPR ' + (window.devicePixelRatio || 1)],
      ['User agent', navigator.userAgent],
      ['Simulator version', VERSION],
    ];
  }
  function buildReport(r) {
    r = r || review();
    var rows = settingsRows(r).map(function (kv) { return '<tr><th scope="row">' + esc(kv[0]) + '</th><td>' + esc(kv[1]) + '</td></tr>'; }).join('');
    var reviewCount = 0;
    var summary = r.sections.map(function (sec) {
      var n = sec.observations.filter(function (o) { return o.level === 'review'; }).length;
      reviewCount += n;
      return '<tr><th scope="row">' + esc(sec.title) + '</th><td>' + (n ? n + ' to review' : 'None flagged') + '</td><td>' + esc(sec.observations.filter(function (o) { return o.level === 'review'; }).map(function (o) { return o.title; }).join('; ') || '—') + '</td></tr>';
    }).join('');
    var sections = r.sections.map(function (sec) {
      return '<section class="sec"><h2>' + esc(sec.title) + '</h2><ul class="obs">' + sec.observations.map(function (o) {
        return '<li class="lv-' + o.level + '"><span class="tag">' + (o.level === 'review' ? 'Review' : o.level === 'note' ? 'Manual check' : 'Observation') + '</span><strong>' + esc(o.title) + '</strong>' +
          (o.detail ? '<p>' + esc(o.detail) + '</p>' : '') + (o.items.length ? '<ul>' + o.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
      }).join('') + '</ul></section>';
    }).join('');
    var stops = (r.stops || []).map(function (s) {
      var f = [];
      if (s.tabindex !== null && +s.tabindex > 0) f.push('positive tabindex');
      if (!s.name) f.push('no accessible name');
      if (s.back) f.push('jumps up');
      if (s.against) f.push('against reading direction');
      if ((s.w < 24 || s.h < 24) && s.role !== 'checkbox' && s.role !== 'radio') f.push('under 24px');
      return '<tr><td>' + s.n + '</td><td>' + esc(s.role) + '</td><td>' + esc(s.name || '—') + '</td><td>' + esc(s.tabindex === null ? 'native' : s.tabindex) + '</td><td>' + s.w + '×' + s.h + '</td><td>' + esc(f.join(', ') || '—') + '</td></tr>';
    }).join('');
    var info = presetInfo(r.preset.id) || [r.preset.id, r.preset.id];
    return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Accessibility review report (simulation aid) · ' + esc(info[1]) + '</title><style>' + REPORT_CSS + '</style></head><body>' +
      '<header class="top"><p class="kicker">AegisUI · Accessibility Simulator</p><h1>Accessibility review report</h1>' +
      '<p class="sub">Simulation &amp; review aid · ' + esc(info[1]) + ' (' + esc(r.preset.mode) + ') · ' + esc(r.generatedAt.toLocaleDateString()) + '</p></header>' +
      '<aside class="disclaimer" role="note"><strong>Not a compliance certificate.</strong> ' + esc(DISCLAIMER) + '</aside>' +
      '<section class="sec"><h2>Session settings</h2><table class="kv">' + rows + '</table></section>' +
      '<section class="sec"><h2>Summary of automated observations</h2><p>' + reviewCount + ' observation' + (reviewCount === 1 ? '' : 's') + ' flagged for human review across ' + r.sections.length + ' simulation passes. “Review” means “look at this”, not “fails WCAG”.</p>' +
      '<table class="grid"><thead><tr><th scope="col">Simulation</th><th scope="col">Flagged</th><th scope="col">Topics</th></tr></thead><tbody>' + summary + '</tbody></table></section>' +
      sections +
      '<section class="sec"><h2>Keyboard focus order (' + (r.stops || []).length + ' stops)</h2><table class="grid"><thead><tr><th scope="col">#</th><th scope="col">Role</th><th scope="col">Accessible name</th><th scope="col">tabindex</th><th scope="col">Size (px)</th><th scope="col">Notes</th></tr></thead><tbody>' + stops + '</tbody></table></section>' +
      '<section class="sec"><h2>Method and limitations</h2><ul class="plain">' +
      '<li>Color vision: Machado, Oliveira &amp; Fernandes (2009) matrices at severity 1.0, applied in linear RGB. Achromatopsia uses Rec. 709 luminance. Real perception varies by person and display.</li>' +
      '<li>Projector washout: linear transfer (slope 1 − 0.55t, intercept 0.3t) plus desaturation (1 − 0.45t) in sRGB, with t = intensity.</li>' +
      '<li>Contrast: WCAG 2.x relative-luminance ratio on sampled text nodes over solid or composited backgrounds. Text over images is skipped; text over gradients uses the element background color only.</li>' +
      '<li>Text scaling: multiplies the preset’s text-size tokens only. Layout boxes keep their size, approximating browser text-only zoom (WCAG 1.4.4). This is not a 400% reflow test (WCAG 1.4.10).</li>' +
      '<li>RTL: sets dir="rtl" on the workspace. The content is not translated.</li>' +
      '<li>Focus order: positive tabindex first, then DOM order, skipping disabled, hidden, inert, tabindex="-1" and non-selected radios. It does not run page scripts or model focus traps.</li>' +
      '</ul></section>' +
      '<section class="sec"><h2>Manual checks still required</h2><ul class="checks">' +
      ['Navigate the real product with a keyboard only, including dialogs and menus.', 'Test with at least one screen reader (NVDA, JAWS, VoiceOver or TalkBack).', 'Zoom the browser to 200% and 400% and check reflow at 320 CSS px.', 'Check that color is never the only way information is conveyed.', 'Review with people who have disabilities and use assistive technology.', 'Confirm content, language and reading order in real RTL locales.']
        .map(function (t) { return '<li><span class="box" aria-hidden="true"></span>' + esc(t) + '</li>'; }).join('') +
      '</ul></section>' +
      '<footer class="foot"><p>' + esc(DISCLAIMER) + '</p></footer></body></html>';
  }
  var REPORT_CSS = [
    '*{box-sizing:border-box}body{margin:0 auto;max-width:960px;padding:32px 28px 48px;font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#151922;background:#fff}',
    'h1{font-size:28px;margin:4px 0}h2{font-size:18px;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #e3e6ee}',
    '.kicker{margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#3d4ee0}.sub{margin:0;color:#4b5466}',
    '.disclaimer{margin:20px 0;padding:14px 16px;border:2px solid #8a5300;background:#fff4e0;border-radius:8px;font-size:14px}',
    '.sec{margin:26px 0;break-inside:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;vertical-align:top;padding:6px 8px;border-bottom:1px solid #e3e6ee}',
    '.kv th{width:30%;color:#4b5466;font-weight:600}.grid thead th{background:#f1f3f7;font-weight:700}.grid tr{break-inside:avoid}',
    '.obs{list-style:none;margin:0;padding:0;display:grid;gap:8px}.obs>li{padding:10px 12px;border-radius:6px;border-left:4px solid #a9b0bf;background:#f6f7fa;break-inside:avoid}',
    '.obs>li.lv-review{border-left-color:#8a5300;background:#fff7e8}.obs>li.lv-note{border-left-color:#1d5a8a;background:#eef5fc}.obs p{margin:4px 0 0}.obs ul{margin:6px 0 0;padding-left:20px;font-size:13px}',
    '.tag{display:inline-block;margin-right:8px;padding:0 6px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:#e3e6ee;color:#151922}.lv-review .tag{background:#8a5300;color:#fff}.lv-note .tag{background:#1d5a8a;color:#fff}',
    '.plain{padding-left:20px}.checks{list-style:none;padding:0}.checks li{display:flex;gap:10px;align-items:flex-start;margin:6px 0}.box{flex:none;width:14px;height:14px;margin-top:4px;border:1.5px solid #151922;border-radius:2px}',
    '.foot{margin-top:36px;padding-top:12px;border-top:1px solid #e3e6ee;font-size:12px;color:#4b5466}',
    '@page{size:A4;margin:16mm}@media print{body{padding:0;max-width:none;font-size:11.5pt}.sec h2{break-after:avoid}.disclaimer{-webkit-print-color-adjust:exact;print-color-adjust:exact}}',
  ].join('');

  var lastReport = null;
  function openReport() {
    var html = buildReport();
    lastReport = html;
    var frame = $('#sim-report-frame');
    frame.srcdoc = html;
    var dlg = $('#sim-report-dialog');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    announce('Review report generated');
  }
  function downloadReport() {
    if (!lastReport) lastReport = buildReport();
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lastReport], { type: 'text/html' }));
    a.download = 'aegis-accessibility-review-' + preset.id + '-' + new Date().toISOString().slice(0, 10) + '.html';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 500);
  }

  /* ================================================================
   * UI wiring
   * ================================================================ */
  function announce(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
  function syncControls() {
    $$('input[name="vision"]').forEach(function (r) { r.checked = r.value === state.vision; });
    $('#sim-washout').checked = state.washout;
    $('#sim-washout-level').value = state.washoutLevel;
    $('#sim-washout-level').disabled = !state.washout;
    $('#sim-washout-out').textContent = state.washoutLevel + '%';
    $('#sim-text-scale').value = String(state.textScale);
    $('#sim-rtl').checked = state.rtl;
    $('#sim-focus').checked = state.focusOrder;
    $('#sim-width').value = state.width;
  }
  function chips() {
    var c = [];
    if (state.vision !== 'none') c.push(VISIONS[state.vision].label);
    if (state.washout) c.push('Washout ' + state.washoutLevel + '%');
    if (state.textScale !== 100) c.push('Text ' + state.textScale + '%');
    if (state.rtl) c.push('RTL');
    if (state.focusOrder) c.push('Focus order');
    return c;
  }
  function renderChips() {
    var c = chips();
    $('#sim-chips').innerHTML = c.length ? c.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') : '<li>No simulation</li>';
  }
  var refresh = rafThrottle(function () {
    updateNarrow();
    computeStops();
    drawOverlay();
    renderStopList();
    renderObservations();
  });
  function scheduleRefresh() { refresh(); }

  function setState(patch, msg) {
    state = sanitize(Object.assign({}, state, patch));
    applyAll();
    if (msg) announce(msg);
  }
  function reset() {
    storageDel('localStorage', STORE_KEY);
    state = Object.assign({}, DEFAULTS);
    applyAll();
    announce('All simulations reset');
  }

  function bind() {
    var sel = $('#sim-preset');
    sel.innerHTML = presetList().map(function (p) { return '<option value="' + esc(p[0]) + '">' + esc(p[1]) + '</option>'; }).join('');
    sel.addEventListener('change', function () { var info = presetInfo(sel.value); applyPreset(sel.value, info ? info[2] : 'light', { persist: true, source: 'simulator' }); scheduleRefresh(); announce('Preset ' + (info ? info[1] : sel.value)); });
    $('#sim-mode').addEventListener('change', function (e) { applyPreset(preset.id, e.target.value, { persist: true, source: 'simulator' }); scheduleRefresh(); announce(e.target.value + ' mode'); });
    $('#sim-vision').addEventListener('change', function (e) { if (e.target.name === 'vision') setState({ vision: e.target.value }, VISIONS[e.target.value].label + ' simulation ' + (e.target.value === 'none' ? 'off' : 'on')); });
    $('#sim-washout').addEventListener('change', function (e) { setState({ washout: e.target.checked }, 'Projector washout ' + (e.target.checked ? 'on' : 'off')); });
    $('#sim-washout-level').addEventListener('input', function (e) { $('#sim-washout-out').textContent = e.target.value + '%'; setState({ washoutLevel: +e.target.value }); });
    $('#sim-text-scale').addEventListener('change', function (e) { setState({ textScale: +e.target.value }, 'Text size ' + e.target.value + '%'); });
    $('#sim-rtl').addEventListener('change', function (e) { setState({ rtl: e.target.checked }, e.target.checked ? 'Right-to-left layout' : 'Left-to-right layout'); });
    $('#sim-focus').addEventListener('change', function (e) { setState({ focusOrder: e.target.checked }); announce(e.target.checked ? 'Focus-order overlay on, ' + plural(focusStops.length || focusOrder(ws).length, 'stop') : 'Focus-order overlay off'); });
    $('#sim-width').addEventListener('change', function (e) { setState({ width: e.target.value }, 'Preview width ' + e.target.selectedOptions[0].textContent); });
    $('#sim-reset').addEventListener('click', reset);
    $('#sim-step-next').addEventListener('click', function () { if (!state.focusOrder) setState({ focusOrder: true }); computeStops(); focusStop(stepIndex + 1); });
    $('#sim-step-prev').addEventListener('click', function () { if (!state.focusOrder) setState({ focusOrder: true }); computeStops(); focusStop(stepIndex <= 0 ? focusStops.length - 1 : stepIndex - 1); });
    $('#sim-stops').addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) focusStop(+b.getAttribute('data-i')); });
    $('#sim-export').addEventListener('click', openReport);
    $('#sim-report-close').addEventListener('click', function () { $('#sim-report-dialog').close(); });
    $('#sim-report-download').addEventListener('click', downloadReport);
    $('#sim-report-print').addEventListener('click', function () { var w = $('#sim-report-frame').contentWindow; if (w) { w.focus(); w.print(); } });

    // Workspace behaviour: inert demo links, roving tabs, refresh on any layout-affecting interaction.
    ws.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (a) e.preventDefault();
      var tab = e.target.closest('[role="tab"]');
      if (tab) selectTab(tab);
    });
    ws.addEventListener('keydown', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (!tab) return;
      var tabs = $$('[role="tab"]', tab.parentElement);
      var i = tabs.indexOf(tab), rtl = state.rtl;
      var next = { ArrowRight: rtl ? i - 1 : i + 1, ArrowLeft: rtl ? i + 1 : i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      next = (next + tabs.length) % tabs.length;
      selectTab(tabs[next]); tabs[next].focus();
    });
    ws.addEventListener('focusin', function () {
      if (!state.focusOrder) return;
      var idx = markCurrent();
      if (idx >= 0) announce('Focus stop ' + (idx + 1) + ' of ' + focusStops.length);
    });
    viewport.addEventListener('scroll', function () { /* overlay scrolls with the canvas; nothing to do */ });
    if ('ResizeObserver' in window) new ResizeObserver(scheduleRefresh).observe(ws);
    window.addEventListener('resize', scheduleRefresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleRefresh);

    // Integration: follow the shared active preset if another AegisUI page changes it.
    window.addEventListener('storage', function (e) {
      if (BRIDGE_KEYS.indexOf(e.key) === -1 || storageGet('sessionStorage', SESSION_PRESET_KEY)) return;
      var p = parsePresetValue(e.newValue);
      if (p && presetInfo(p.id)) { applyPreset(p.id, p.mode, { source: 'storage:' + e.key }); scheduleRefresh(); }
    });
    window.addEventListener('aegis:preset-change', function (e) {
      var d = e.detail || {};
      if (d.id && presetInfo(d.id)) { applyPreset(d.id, d.mode, { source: 'event' }); scheduleRefresh(); }
    });
  }
  function selectTab(tab) {
    $$('[role="tab"]', tab.parentElement).forEach(function (t) { var on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    var panel = $('#ws-panel');
    if (panel) panel.setAttribute('aria-labelledby', tab.id);
    scheduleRefresh();
  }

  function buildChart() {
    var g = $('#ws-bars');
    if (!g) return;
    var data = [[210, 140, 120, 60, 40], [235, 150, 110, 80, 42], [260, 135, 100, 95, 38], [280, 145, 90, 110, 41], [300, 140, 80, 130, 39], [320, 142, 70, 150, 40]];
    var months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    var NS = 'http://www.w3.org/2000/svg', x0 = 48, groupW = 84, barW = 12, y0 = 170, k = 150 / 300;
    data.forEach(function (row, gi) {
      row.forEach(function (v, si) {
        var r = document.createElementNS(NS, 'rect');
        r.setAttribute('class', 'ws-bar ws-s' + (si + 1));
        r.setAttribute('x', x0 + gi * groupW + si * (barW + 2)); r.setAttribute('y', y0 - v * k);
        r.setAttribute('width', barW); r.setAttribute('height', v * k);
        g.appendChild(r);
      });
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x0 + gi * groupW + 34); t.setAttribute('y', 190); t.setAttribute('class', 'ws-month');
      t.setAttribute('text-anchor', 'middle'); t.textContent = months[gi];
      g.appendChild(t);
    });
  }

  function init() {
    ws = $('#ws'); canvas = $('#sim-canvas'); viewport = $('#sim-viewport'); overlay = $('#sim-focus-overlay'); filterEl = $('#sim-filter'); live = $('#sim-live');
    if (!ws) return;
    buildChart();
    var form = $('.ws-filters');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
    bind();
    state = loadSettings();
    var p = resolvePreset();
    applyPreset(p.id, p.mode, { source: p.source });
    applyAll({ persist: false });
  }

  /* ================================================================
   * Public API (integration hooks — see README.md)
   * ================================================================ */
  window.AegisSimulator = {
    version: VERSION,
    getState: function () { return Object.assign({}, state); },
    setState: function (patch) { setState(patch || {}); return Object.assign({}, state); },
    reset: reset,
    getPreset: function () { return Object.assign({}, preset); },
    setPreset: function (id, mode) { if (!presetInfo(id)) return false; applyPreset(id, mode, { persist: true, source: 'api' }); scheduleRefresh(); return true; },
    focusOrder: function () { return computeStops().map(function (s) { return { n: s.n, role: s.role, name: s.name, tabindex: s.tabindex, element: s.el, back: s.back, against: s.against }; }); },
    observations: currentObservations,
    review: review,
    buildReport: function () { return buildReport(); },
    simulateColor: function (hexOrRgb, spec) { var c = typeof hexOrRgb === 'string' ? parseColor(hexOrRgb) : hexOrRgb; return hex(simulateColor(c, Object.assign({}, DEFAULTS, spec || {}))); },
    contrast: function (a, b) { return contrast(typeof a === 'string' ? parseColor(a) : a, typeof b === 'string' ? parseColor(b) : b); },
    VISIONS: Object.keys(VISIONS),
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
