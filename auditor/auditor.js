/*!
 * Aegis · AI UI Slop Auditor & WCAG 2.2 Refactor Engine
 * ------------------------------------------------------------------
 * Pure vanilla JS. No dependencies, no network calls, no build step.
 *
 *   1. Utilities          7. Scoring
 *   2. Color math         8. Refactor engine
 *   3. CSS parser         9. Line diff
 *   4. Source model      10. Syntax highlighter
 *   5. Static CSS audit  11. X-Ray overlay
 *   6. DOM inspection    12. Presets  ·  13. App UI
 */
(() => {
  'use strict';

  /* ================================================================
   * 1. Utilities
   * ================================================================ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const uniq = (arr) => Array.from(new Set(arr));
  const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const plural = (n, word, pl) => `${n} ${n === 1 ? word : pl || word + 's'}`;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const humanize = (s) => String(s).replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());
  const mode = (arr) => { const m = new Map(); let best = null, n = 0; arr.forEach((v) => { const c = (m.get(v) || 0) + 1; m.set(v, c); if (c > n) { n = c; best = v; } }); return best; };
  const median = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  /* Active token baseline (shared/aegis-contract.js). The Studio writes the tokens the
   * user is working with to localStorage; the Auditor validates pasted code against them. */
  const K = window.AegisContract || null;
  const LS_BASELINE = 'aegis.auditor.baseline';
  const baseline = { mode: store.get(LS_BASELINE, 'active') === 'none' ? 'none' : 'active', read: { status: 'unavailable' }, flat: null, colors: [] };
  function loadBaseline() {
    baseline.read = K ? K.readBaseline() : { status: 'unavailable' };
    baseline.flat = null; baseline.colors = [];
    if (baseline.read.status === 'ok') {
      const rec = baseline.read.record;
      baseline.flat = K.flatten(rec.doc, 'light', rec.extraVars);
      baseline.prefixes = ['--aegis-'].concat(rec.prefix ? ['--' + rec.prefix + '-'] : []);
    }
  }
  const activeBaseline = () => (baseline.mode === 'active' && baseline.flat ? baseline : null);
  const SAFE_CSS_VALUE = (v) => typeof v === 'string' && !/[;{}<>]|\/\*/.test(v);

  function lineIndex(src) {
    const starts = [0];
    for (let i = 0; i < src.length; i++) if (src.charCodeAt(i) === 10) starts.push(i + 1);
    return (off) => {
      let lo = 0, hi = starts.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; }
      return lo + 1;
    };
  }
  const EMOJI_RE = /\p{Extended_Pictographic}/u;
  const EMOJI_ONLY_RE = /^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\s]+$/u;
  const LEADING_EMOJI_RE = /^(\s*)((?:\p{Extended_Pictographic}[\u{FE0F}\u{200D}]*)+)(\s*)/u;
  const GLYPH_ONLY_RE = /^[^\p{L}\p{N}]+$/u;

  /* ================================================================
   * 2. Color math
   * ================================================================ */
  const NAMED = {
    black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', gray: '#808080', grey: '#808080',
    silver: '#c0c0c0', navy: '#000080', orange: '#ffa500', purple: '#800080', yellow: '#ffff00', pink: '#ffc0cb', teal: '#008080',
    cyan: '#00ffff', aqua: '#00ffff', magenta: '#ff00ff', fuchsia: '#ff00ff', lime: '#00ff00', maroon: '#800000', olive: '#808000',
    gold: '#ffd700', coral: '#ff7f50', tomato: '#ff6347', salmon: '#fa8072', crimson: '#dc143c', indigo: '#4b0082', violet: '#ee82ee',
    tan: '#d2b48c', beige: '#f5f5dc', ivory: '#fffff0', lavender: '#e6e6fa', khaki: '#f0e68c', orchid: '#da70d6', plum: '#dda0dd',
    turquoise: '#40e0d0', skyblue: '#87ceeb', steelblue: '#4682b4', slategray: '#708090', slategrey: '#708090', lightgray: '#d3d3d3',
    lightgrey: '#d3d3d3', darkgray: '#a9a9a9', darkgrey: '#a9a9a9', whitesmoke: '#f5f5f5', gainsboro: '#dcdcdc', dimgray: '#696969',
    royalblue: '#4169e1', dodgerblue: '#1e90ff', firebrick: '#b22222', darkblue: '#00008b', darkgreen: '#006400', darkred: '#8b0000',
    hotpink: '#ff69b4', deeppink: '#ff1493', chocolate: '#d2691e', sienna: '#a0522d', peru: '#cd853f', wheat: '#f5deb3',
    aliceblue: '#f0f8ff', ghostwhite: '#f8f8ff', mintcream: '#f5fffa', honeydew: '#f0fff0', seagreen: '#2e8b57', forestgreen: '#228b22',
    limegreen: '#32cd32', mediumpurple: '#9370db', rebeccapurple: '#663399', darkorange: '#ff8c00', orangered: '#ff4500',
    lightblue: '#add8e6', lightgreen: '#90ee90', lightyellow: '#ffffe0', lightpink: '#ffb6c1', darkslategray: '#2f4f4f',
    midnightblue: '#191970', cornflowerblue: '#6495ed', cadetblue: '#5f9ea0', snow: '#fffafa', linen: '#faf0e6',
  };
  const toHex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  function hexToRgb(h) {
    h = h.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  function parseColor(str) {
    if (!str) return null;
    str = String(str).trim().toLowerCase();
    if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(str)) return hexToRgb(str);
    let m = str.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      if (p.length < 3) return null;
      const ch = (v) => (v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v));
      const a = p[3] !== undefined ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
      return { r: Math.round(clamp(ch(p[0]), 0, 255)), g: Math.round(clamp(ch(p[1]), 0, 255)), b: Math.round(clamp(ch(p[2]), 0, 255)), a: clamp(isNaN(a) ? 1 : a, 0, 1) };
    }
    m = str.match(/^hsla?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean);
      if (p.length < 3) return null;
      let h = parseFloat(p[0]); if (/turn$/.test(p[0])) h *= 360;
      const a = p[3] !== undefined ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1;
      return { ...hslToRgb(h, parseFloat(p[1]) / 100, parseFloat(p[2]) / 100), a: clamp(a, 0, 1) };
    }
    if (NAMED[str]) return hexToRgb(NAMED[str]);
    return null;
  }
  const rgbToHex = ({ r, g, b, a = 1 }) => '#' + toHex2(r) + toHex2(g) + toHex2(b) + (a < 0.999 ? toHex2(a * 255) : '');
  const normColor = (s) => { const c = parseColor(s); return c ? rgbToHex(c) : null; };
  function relLum({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function contrast(a, b) { const L1 = relLum(a), L2 = relLum(b); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }
  function blend(top, bottom) {
    const a = top.a === undefined ? 1 : top.a;
    return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
  }
  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s, l };
  }
  function hslToRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const t = (x) => { if (x < 0) x += 1; if (x > 1) x -= 1; if (x < 1 / 6) return p + (q - p) * 6 * x; if (x < 1 / 2) return q; if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6; return p; };
    return { r: Math.round(t(h + 1 / 3) * 255), g: Math.round(t(h) * 255), b: Math.round(t(h - 1 / 3) * 255) };
  }
  function rgbToLab({ r, g, b }) {
    const f = (v) => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; };
    const R = f(r), G = f(g), B = f(b);
    const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = g3((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047), y = g3(R * 0.2126 + G * 0.7152 + B * 0.0722), z = g3((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
    return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
  }
  function deltaE(c1, c2) { const a = rgbToLab(c1), b = rgbToLab(c2); return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b); }
  function hueName(h) {
    if (h < 15 || h >= 345) return 'red'; if (h < 40) return 'orange'; if (h < 65) return 'yellow'; if (h < 85) return 'lime';
    if (h < 160) return 'green'; if (h < 190) return 'teal'; if (h < 210) return 'cyan'; if (h < 245) return 'blue';
    if (h < 265) return 'indigo'; if (h < 290) return 'violet'; if (h < 320) return 'purple'; return 'pink';
  }
  const cssColor = (c) => (c.a < 0.999 ? `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)} / ${+c.a.toFixed(2)})` : rgbToHex(c));

  /** Nudge lightness of `color` until every target passes. Returns {hex, ratio, delta} or null. */
  function fixForeground(fg, targets) {
    // Keep the text's own hue (white stays neutral) instead of the bg-tinted blend.
    const { h, s, l } = rgbToHsl({ ...fg, a: 1 });
    const ratioOf = (c) => Math.min(...targets.map((t) => contrast(blend({ ...c, a: t.op === undefined ? 1 : t.op }, t.bg), t.bg)));
    const ok = (c) => targets.every((t) => contrast(blend({ ...c, a: t.op === undefined ? 1 : t.op }, t.bg), t.bg) >= t.req + 0.05);
    for (let step = 0; step <= 100; step++) {
      for (const dir of [-1, 1]) {
        const L = l + (dir * step) / 100;
        if (L < 0 || L > 1) continue;
        const c = { ...hslToRgb(h, s, L), a: 1 };
        if (ok(c)) return { hex: rgbToHex(c), ratio: ratioOf(c), delta: step / 100 };
      }
    }
    return null;
  }
  /** Nudge lightness of a background until it contrasts with `against`. */
  function fixBackground(bg, against, req) {
    const { h, s, l } = rgbToHsl(bg);
    for (let step = 0; step <= 100; step++) {
      for (const dir of [-1, 1]) {
        const L = l + (dir * step) / 100;
        if (L < 0 || L > 1) continue;
        const c = { ...hslToRgb(h, s, L), a: 1 };
        if (contrast(c, against) >= req + 0.05) return { hex: rgbToHex(c), ratio: contrast(c, against), delta: step / 100 };
      }
    }
    return null;
  }

  const COLOR_PROP_RE = /^(color|background(-color|-image)?|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-shadow|caret-color|accent-color|text-decoration(-color)?|column-rule(-color)?|-webkit-text-fill-color|text-emphasis-color|stop-color)$/;
  /** Find literal colors in a CSS value (var() already masked). Returns [{text, index}] */
  function findColors(value, prop) {
    const v = value.replace(/url\([^)]*\)/gi, (m) => ' '.repeat(m.length));
    const out = [];
    let m;
    const fnRe = /\b(?:rgba?|hsla?)\([^)]*\)/gi;
    while ((m = fnRe.exec(v))) out.push({ text: m[0], index: m.index });
    const hexRe = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
    while ((m = hexRe.exec(v))) out.push({ text: m[0], index: m.index });
    if (COLOR_PROP_RE.test(prop || '')) {
      const wordRe = /(^|[\s,(])([a-z]+)(?=$|[\s,)])/gi;
      while ((m = wordRe.exec(v))) {
        const w = m[2].toLowerCase();
        if (NAMED[w]) out.push({ text: m[2], index: m.index + m[1].length });
      }
    }
    return out.sort((a, b) => a.index - b.index);
  }
  /** Replace every var(...) with spaces of equal length so offsets stay aligned. */
  function stripVars(v) {
    let out = v, idx, from = 0;
    while ((idx = out.indexOf('var(', from)) !== -1) {
      let depth = 0, k = idx + 3;
      for (; k < out.length; k++) { if (out[k] === '(') depth++; else if (out[k] === ')') { depth--; if (depth === 0) break; } }
      out = out.slice(0, idx) + ' '.repeat(Math.min(k, out.length - 1) - idx + 1) + out.slice(k + 1);
      from = idx + 1;
    }
    return out;
  }
  const findVarUses = (v) => [...v.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)].map((m) => ({ name: m[1], fallback: !!m[2] }));
  const pxVals = (v) => [...v.matchAll(/(-?\d*\.?\d+)px\b/g)].map((m) => parseFloat(m[1]));
  const spliceAt = (s, i, len, rep) => s.slice(0, i) + rep + s.slice(i + len);

  /* ================================================================
   * 3. CSS parser (tolerant, offset-preserving)
   * ================================================================ */
  const blankComments = (t) => t.replace(/\/\*[\s\S]*?(\*\/|$)/g, (m) => m.replace(/[^\n]/g, ' '));
  function parseDecls(text, base = 0) {
    const out = [];
    let start = 0, depth = 0, q = null;
    const push = (s, e) => {
      const seg = text.slice(s, e);
      const k = seg.indexOf(':');
      if (k < 0) return;
      const lead = seg.length - seg.trimStart().length;
      const prop = seg.slice(0, k).trim();
      let value = seg.slice(k + 1).trim();
      if (!prop || /[{}\s]/.test(prop)) return;
      let important = false;
      if (/!\s*important\s*$/i.test(value)) { important = true; value = value.replace(/\s*!\s*important\s*$/i, ''); }
      out.push({ prop: prop.startsWith('--') ? prop : prop.toLowerCase(), value, important, offset: base + s + lead });
    };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '(' || c === '{') depth++;
      else if (c === ')' || c === '}') depth = Math.max(0, depth - 1);
      else if (c === ';' && depth === 0) { push(start, i); start = i + 1; }
    }
    push(start, text.length);
    return out;
  }
  const GROUP_AT = /^(media|supports|container|layer|document|-moz-document|scope|starting-style)$/;
  function parseCSS(text, base = 0) {
    const src = blankComments(text);
    function scanTo(i, stops) {
      let depth = 0, q = null;
      for (; i < src.length; i++) {
        const c = src[i];
        if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
        if (c === '"' || c === "'") { q = c; continue; }
        if (c === '(') { depth++; continue; }
        if (c === ')') { depth = Math.max(0, depth - 1); continue; }
        if (depth === 0 && stops.includes(c)) return i;
      }
      return src.length;
    }
    function matchBrace(i) {
      let depth = 0, q = null;
      for (; i < src.length; i++) {
        const c = src[i];
        if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
        if (c === '"' || c === "'") { q = c; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return i; }
      }
      return src.length;
    }
    function block(start, end) {
      const nodes = [];
      let i = start;
      while (i < end) {
        while (i < end && /\s/.test(src[i])) i++;
        if (i >= end) break;
        if (src[i] === '}') { i++; continue; }
        const j = Math.min(scanTo(i, '{;}'), end);
        const prelude = src.slice(i, j).trim();
        if (j >= end || src[j] === ';' || src[j] === '}') {
          if (prelude.startsWith('@')) nodes.push({ type: 'at-stmt', text: prelude, offset: base + i });
          i = j + 1;
          continue;
        }
        const close = Math.min(matchBrace(j), end);
        if (prelude.startsWith('@')) {
          const name = ((prelude.match(/^@([\w-]+)/) || [])[1] || '').toLowerCase();
          const kf = /keyframes$/.test(name);
          if (GROUP_AT.test(name) || kf) nodes.push({ type: 'at', name, prelude: prelude.replace(/\s+/g, ' '), keyframes: kf, children: block(j + 1, close), offset: base + i });
          else nodes.push({ type: 'rule', selector: prelude.replace(/\s+/g, ' '), decls: parseDecls(src.slice(j + 1, close), base + j + 1), offset: base + i, atRule: true });
        } else {
          nodes.push({ type: 'rule', selector: prelude.replace(/\s+/g, ' '), decls: parseDecls(src.slice(j + 1, close), base + j + 1), offset: base + i });
        }
        i = close + 1;
      }
      return nodes;
    }
    return block(0, src.length);
  }
  function serializeCSS(nodes, ind = '') {
    return nodes.map((n) => {
      if (n.type === 'comment') return `${ind}/* ${n.text} */`;
      if (n.type === 'at-stmt') return `${ind}${n.text};`;
      if (n.type === 'at') return `${ind}${n.prelude} {\n${serializeCSS(n.children, ind + '  ')}\n${ind}}`;
      if (!n.decls.length) return '';
      const body = n.decls.map((d) => `${ind}  ${d.prop}: ${d.value}${d.important ? ' !important' : ''};`).join('\n');
      return `${ind}${n.selector} {\n${body}\n${ind}}`;
    }).filter(Boolean).join('\n\n');
  }
  function walkRules(nodes, fn, ctx = { media: '', keyframes: false }) {
    nodes.forEach((n) => {
      if (n.type === 'rule') fn(n, ctx);
      else if (n.type === 'at') walkRules(n.children, fn, { media: (ctx.media + ' ' + n.prelude).trim(), keyframes: ctx.keyframes || n.keyframes });
    });
  }
  function splitSelectors(sel) {
    const parts = []; let depth = 0, cur = '';
    for (const c of sel) {
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += c;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }
  const STATE_PSEUDO_RE = /:(hover|focus|focus-visible|focus-within|active|visited|link|checked|disabled|enabled|target|placeholder-shown|invalid|valid|empty|-webkit-[\w-]+|-moz-[\w-]+)\b/gi;
  const stripPseudo = (sel) => sel.replace(/::?(before|after|placeholder|selection|marker|first-line|first-letter|backdrop|-webkit-[\w-]+|-moz-[\w-]+)(\([^)]*\))?/gi, '').replace(STATE_PSEUDO_RE, '').trim();
  function specificity(sel) {
    const s = sel.replace(/:(not|is|has)\(/g, '(').replace(/:where\([^)]*\)/g, '');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const cls = (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) || []).length;
    const types = (s.replace(/\[[^\]]*\]/g, '').match(/(^|[\s>+~(])[a-z][\w-]*/gi) || []).length + (s.match(/::[\w-]+/g) || []).length;
    return [ids, cls, types];
  }
  const cmpSpec = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
  function lastCompoundStart(sel) {
    let depth = 0;
    for (let i = sel.length - 1; i >= 0; i--) {
      const c = sel[i];
      if (c === ')' || c === ']') depth++;
      else if (c === '(' || c === '[') depth--;
      else if (depth === 0 && /[\s>+~]/.test(c)) return i + 1;
    }
    return 0;
  }

  /* ================================================================
   * 4. Source model: parse, map elements → source lines, instrument
   * ================================================================ */
  function buildModel(src) {
    const lineOf = lineIndex(src);
    const isFullDoc = /<!doctype|<html[\s>]/i.test(src);
    const doc = new DOMParser().parseFromString(src, 'text/html');
    // Ordered list of start tags in the raw source (skipping comments + raw-text bodies)
    const tags = [];
    const re = /<!--[\s\S]*?(?:-->|$)|<(script|style|textarea|title)\b[^>]*>[\s\S]*?<\/\1\s*>|<([a-zA-Z][\w:-]*)/gi;
    let m;
    while ((m = re.exec(src))) {
      if (m[1]) tags.push({ tag: m[1].toLowerCase(), off: m.index });
      else if (m[2]) tags.push({ tag: m[2].toLowerCase(), off: m.index });
    }
    const idMap = new Map();
    let p = 0;
    $$('*', doc).forEach((el, i) => {
      const id = String(i);
      el.setAttribute('data-aegis-id', id);
      const t = el.tagName.toLowerCase();
      let line = null;
      for (let k = p; k < Math.min(tags.length, p + 40); k++) {
        if (tags[k].tag === t) { line = lineOf(tags[k].off); p = k + 1; break; }
      }
      idMap.set(id, { line, tag: t });
    });
    const styles = [];
    const sre = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;
    while ((m = sre.exec(src))) styles.push({ text: m[1], offset: m.index + m[0].indexOf('>') + 1 });
    // Preview copy: scripts never run (sandbox), so drop them and park inline
    // handlers under data-aegis-* to keep the console clean but the signal intact.
    const clone = doc.documentElement.cloneNode(true);
    $$('script', clone).forEach((s) => s.parentNode.removeChild(s));
    $$('*', clone).forEach((el) => Array.from(el.attributes).forEach((a) => {
      if (/^on[a-z]+$/i.test(a.name)) { el.setAttribute('data-aegis-' + a.name.toLowerCase(), a.value); el.removeAttribute(a.name); }
    }));
    const bl = activeBaseline();
    if (bl) {
      const head = clone.querySelector('head');
      if (head) {
        const st = doc.createElement('style');
        st.setAttribute('data-aegis-baseline', '');
        st.textContent = ':root{' + Object.keys(bl.flat.vars).filter((k) => /^--[a-z0-9-]+$/i.test(k) && SAFE_CSS_VALUE(bl.flat.vars[k])).map((k) => k + ':' + bl.flat.vars[k] + ';').join('') + '}';
        head.insertBefore(st, head.firstChild);
      }
    }
    const srcdoc = '<!DOCTYPE html>\n' + clone.outerHTML;
    return { src, doc, isFullDoc, lineOf, idMap, styles, srcdoc, elementCount: idMap.size };
  }
  const onclickOf = (el) => el.getAttribute('onclick') ?? el.getAttribute('data-aegis-onclick');
  function snippetOf(el) {
    const t = el.tagName.toLowerCase();
    const attrs = [];
    ['id', 'class', 'role', 'href', 'type', 'onclick', 'placeholder', 'src', 'alt'].forEach((a) => {
      const v = a === 'onclick' ? onclickOf(el) : el.getAttribute(a);
      if (v !== null && v !== undefined) attrs.push(`${a}="${truncate(v, 26)}"`);
    });
    return `<${t}${attrs.length ? ' ' + attrs.slice(0, 2).join(' ') : ''}>`;
  }

  /* ================================================================
   * 5. Static CSS audit (Token Compliance + CSS-level a11y signals)
   * ================================================================ */
  const SPACING_RE = /^(margin|padding)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$|^(gap|row-gap|column-gap|grid-gap)$/;
  const RADIUS_RE = /^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/;
  const TYPE_SCALE_PX = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];

  function analyzeCSS(model) {
    const { lineOf } = model;
    const issues = [];
    const stats = { colorUses: [], defined: new Set(), used: new Map(), shadows: new Set(), tokenDefs: 0, rawDecls: 0, outlineKills: [], hasFocusStyle: false, slopGradient: null, gradientText: null, ruleCount: 0 };
    const add = (o) => issues.push(Object.assign({ count: 1, elIds: [], snippet: '' }, o));
    const sheets = model.styles.map((s) => parseCSS(s.text, s.offset));

    const inspect = (decls, where) => {
      const f = { colors: [], spacing: [], fonts: [], radius: [], magic: [], important: 0, line: null };
      const isRoot = /^(:root|html)$/i.test((where.selector || '').trim());
      const firstLine = (d) => { if (f.line === null) f.line = where.inline ? where.line : lineOf(d.offset); };
      decls.forEach((d) => {
        const line = where.inline ? where.line : lineOf(d.offset);
        if (d.prop.startsWith('--')) {
          stats.defined.add(d.prop);
          if (isRoot) stats.tokenDefs++;
          findColors(stripVars(d.value), 'color').forEach((c) => stats.colorUses.push({ key: normColor(c.text), def: true }));
          return;
        }
        findVarUses(d.value).forEach((v) => { const u = stats.used.get(v.name) || { fallback: false, line }; if (v.fallback) u.fallback = true; stats.used.set(v.name, u); });
        const v = stripVars(d.value);
        if (where.selector && /:focus/.test(where.selector) && (/^(outline|box-shadow|border(-color)?)$/.test(d.prop)) && !/^(none|0(px)?)$/i.test(v.trim())) stats.hasFocusStyle = true;
        if (d.important && !/prefers-reduced-motion/.test(where.media || '')) { f.important++; firstLine(d); }
        if ((d.prop === 'outline' || d.prop === 'outline-style') && /^(none|0(px)?)$/i.test(v.trim())) stats.outlineKills.push({ selector: where.selector, line, inline: where.inline, elId: where.elId, tag: where.tag });
        if (/^(-webkit-)?background-clip$/.test(d.prop) && /text/.test(v)) stats.gradientText = stats.gradientText || { selector: where.selector, line };
        if (where.keyframes) return;
        const cols = findColors(v, d.prop);
        if (cols.length) {
          cols.forEach((c) => { f.colors.push(c.text); stats.colorUses.push({ key: normColor(c.text), prop: d.prop }); });
          firstLine(d);
          if (/gradient/.test(v)) {
            const keys = cols.map((c) => normColor(c.text));
            if (keys.includes('#667eea') && keys.includes('#764ba2')) stats.slopGradient = stats.slopGradient || { selector: where.selector, line, elId: where.elId };
          }
        }
        if (SPACING_RE.test(d.prop)) pxVals(v).forEach((n) => { if (Math.abs(n) > 2) { f.spacing.push(n + 'px'); if (n % 4 !== 0) f.magic.push(n + 'px'); firstLine(d); } });
        if (d.prop === 'font-size') pxVals(v).forEach((n) => { f.fonts.push(n + 'px'); if (!TYPE_SCALE_PX.includes(n)) f.magic.push(n + 'px'); firstLine(d); });
        if (RADIUS_RE.test(d.prop)) pxVals(v).forEach((n) => { if (n > 2) { f.radius.push(n + 'px'); firstLine(d); } });
        if (d.prop === 'box-shadow' && v.trim() !== 'none' && /\d/.test(v)) stats.shadows.add(d.value.replace(/\s+/g, ' ').trim());
        if (cols.length || pxVals(v).length) stats.rawDecls++;
      });
      return f;
    };
    const emit = (f, where) => {
      const label = where.inline ? `Inline style on <${where.tag}>` : `\`${truncate(where.selector, 56)}\``;
      const base = { pillar: 'tokens', selector: where.inline ? null : where.selector, line: f.line ?? where.line, elIds: where.elId ? [where.elId] : [], snippet: where.inline ? where.snippet : where.selector };
      const list = (a) => uniq(a).slice(0, 6).join(', ') + (uniq(a).length > 6 ? ', …' : '');
      if (f.colors.length) add({ ...base, rule: 'Token · Color', sev: 'moderate', title: 'Hardcoded color values', count: f.colors.length, detail: `${label} uses ${plural(f.colors.length, 'raw color')}: ${list(f.colors)}.`, fix: 'Reference semantic color tokens instead, e.g. color: var(--color-text).' });
      if (f.spacing.length) add({ ...base, rule: 'Token · Spacing', sev: 'moderate', title: 'Hardcoded px spacing', count: f.spacing.length, detail: `${label} hardcodes spacing: ${list(f.spacing)}.`, fix: 'Use a 4px-grid spacing scale, e.g. padding: var(--space-4).' });
      if (f.fonts.length) add({ ...base, rule: 'Token · Typography', sev: 'moderate', title: 'Hardcoded px font sizes', count: f.fonts.length, detail: `${label} sets font-size in raw px: ${list(f.fonts)}.`, fix: 'Use a modular type scale in rem, e.g. font-size: var(--text-lg).' });
      if (f.radius.length) add({ ...base, rule: 'Token · Radius', sev: 'minor', title: 'Hardcoded border radius', count: f.radius.length, detail: `${label} uses radius ${list(f.radius)}.`, fix: 'Use radius tokens, e.g. border-radius: var(--radius-lg).' });
      if (f.magic.length) add({ ...base, rule: 'Token · Scale', sev: 'minor', title: 'Off-scale magic numbers', count: f.magic.length, detail: `${label} uses values that sit on no scale: ${list(f.magic)}.`, fix: 'Snap to the 4px spacing grid and the type scale (12/14/16/18/20/24/30/36/48).' });
      if (f.important) add({ ...base, rule: 'Token · Cascade', sev: 'moderate', title: '!important overrides', count: f.important, detail: `${label} uses !important ${plural(f.important, 'time')}, which breaks theming and token overrides.`, fix: 'Remove !important and fix specificity at the source.' });
    };

    sheets.forEach((nodes) => walkRules(nodes, (rule, ctx) => {
      if (rule.atRule) return;
      stats.ruleCount++;
      const where = { selector: rule.selector, media: ctx.media, keyframes: ctx.keyframes };
      const f = inspect(rule.decls, where);
      if (!ctx.keyframes) emit(f, where);
    }));

    $$('[style]', model.doc).forEach((el) => {
      const id = el.getAttribute('data-aegis-id');
      const info = model.idMap.get(id) || {};
      const decls = parseDecls(blankComments(el.getAttribute('style') || ''));
      if (!decls.length) return;
      const where = { inline: true, line: info.line, elId: id, tag: el.tagName.toLowerCase(), snippet: snippetOf(el) };
      add({ pillar: 'tokens', rule: 'Token · Inline style', sev: 'serious', title: 'Inline style attribute', line: info.line, elIds: [id], snippet: snippetOf(el), detail: `<${where.tag}> carries style="${truncate(el.getAttribute('style'), 70)}". Inline styles bypass the token system and can’t be themed.`, fix: 'Move declarations into a class that references tokens.' });
      emit(inspect(decls, where), where);
    });

    // Global token health
    const keys = uniq(stats.colorUses.map((c) => c.key).filter(Boolean));
    if (keys.length > 12) add({ pillar: 'tokens', rule: 'Token · Palette', sev: 'moderate', title: 'Palette sprawl', count: 1, detail: `${keys.length} distinct colors are used. A disciplined UI usually needs 8–12 primitives behind a few semantic aliases.`, fix: 'Consolidate into primitives (--color-neutral-*) and semantic aliases (--color-text, --color-bg, --color-primary).' });
    const opaque = keys.map((k) => ({ k, c: parseColor(k) })).filter((x) => x.c && x.c.a === 1);
    const dupes = [];
    for (let i = 0; i < opaque.length; i++) for (let j = i + 1; j < opaque.length; j++) {
      const d = deltaE(opaque[i].c, opaque[j].c);
      if (d > 0 && d < 4.5) dupes.push(`${opaque[i].k} ≈ ${opaque[j].k}`);
    }
    if (dupes.length) add({ pillar: 'tokens', rule: 'Token · Palette', sev: 'moderate', title: 'Near-duplicate colors', count: dupes.length, detail: `Perceptually identical colors (ΔE < 4.5) were defined separately: ${dupes.slice(0, 4).join(', ')}${dupes.length > 4 ? ', …' : ''}. Classic AI drift.`, fix: 'Merge them into a single token.' });
    if (stats.tokenDefs === 0 && stats.rawDecls >= 5) add({ pillar: 'tokens', rule: 'Token · System', sev: 'serious', title: 'No design tokens defined', count: 1, detail: `${stats.rawDecls} declarations use raw values and there is no :root token layer at all.`, fix: 'Introduce a :root block of CSS custom properties and reference it everywhere.' });
    const bl = activeBaseline();
    stats.used.forEach((u, name) => {
      if (stats.defined.has(name) || u.fallback) return;
      if (bl && bl.flat.vars[name] !== undefined) return; // provided by the active baseline
      const looksLikeBaseline = bl && bl.prefixes.some((pre) => name.startsWith(pre));
      if (looksLikeBaseline) add({ pillar: 'tokens', rule: 'Token · Baseline', sev: 'serious', title: 'Token not in the active baseline', line: u.line, detail: `var(${name}) uses the baseline's naming, but “${bl.read.record.name}” has no such token, so the declaration silently fails.`, fix: 'Pick an existing token from the baseline (see Studio → Code & Token Export), or add it in Studio.' });
      else add({ pillar: 'tokens', rule: 'Token · Reference', sev: 'serious', title: 'Undefined custom property', line: u.line, detail: `var(${name}) is used but never defined and has no fallback, so the declaration silently fails.`, fix: `Define ${name} in :root or add a fallback.` });
    });
    if (bl) {
      if (!bl.colors.length) bl.colors = bl.flat.palette.map((c) => ({ token: c.token, hex: c.hex, c: parseColor(c.hex) })).filter((x) => x.c);
      const off = [];
      opaque.forEach(({ k, c }) => {
        let best = null, dist = Infinity;
        bl.colors.forEach((b) => { if (b.c.a !== 1) return; const d = deltaE(c, b.c); if (d < dist) { dist = d; best = b; } });
        if (dist > 2.3) off.push({ k, best, dist });
      });
      if (off.length) add({ pillar: 'tokens', rule: 'Token · Baseline', sev: 'moderate', title: 'Colors outside the active token baseline', count: off.length, detail: `${plural(off.length, 'color')} ${off.length === 1 ? 'does' : 'do'} not match any token in “${bl.read.record.name}” (ΔE > 2.3): ${off.slice(0, 4).map((o) => `${o.k}${o.best ? ` (closest ${o.best.token}, ΔE ${o.dist.toFixed(1)})` : ''}`).join('; ')}${off.length > 4 ? '; …' : ''}.`, fix: 'Replace them with var(--…) tokens from the active baseline, or add the color to the system in Studio.' });
    }

    // CSS-level accessibility signal: focus indicator removed
    if (stats.outlineKills.length && !stats.hasFocusStyle) {
      stats.outlineKills.forEach((k) => add({ pillar: 'a11y', rule: 'WCAG 2.4.7 (AA)', sev: 'serious', title: 'Focus indicator removed', selector: k.inline ? null : k.selector, line: k.line, elIds: k.elId ? [k.elId] : [], snippet: k.inline ? `<${k.tag}>` : k.selector, detail: `${k.inline ? 'An inline style' : '`' + truncate(k.selector, 50) + '`'} sets outline: none and no :focus / :focus-visible replacement exists, so keyboard users lose track of focus.`, fix: 'Add a visible :focus-visible style (2px outline with 3:1 contrast).' }));
    }
    // Visual hierarchy signals that are easiest to read from CSS
    if (stats.slopGradient) add({ pillar: 'hierarchy', rule: 'AI slop signature', sev: 'minor', title: 'The default AI purple gradient', selector: stats.slopGradient.selector, line: stats.slopGradient.line, elIds: stats.slopGradient.elId ? [stats.slopGradient.elId] : [], detail: 'linear-gradient(#667eea → #764ba2) is the most recognisable “generated by AI” background on the web. It signals template, not brand.', fix: 'Use a brand-specific primary token; keep gradients subtle or drop them.' });
    if (stats.gradientText) add({ pillar: 'hierarchy', rule: 'AI slop signature', sev: 'minor', title: 'Gradient-clipped text', selector: stats.gradientText.selector, line: stats.gradientText.line, detail: 'background-clip: text gradients cannot be contrast-checked reliably and are a common AI flourish.', fix: 'Use a solid text color token.' });
    if (stats.shadows.size > 3) add({ pillar: 'hierarchy', rule: 'Hierarchy · Elevation', sev: 'minor', title: 'Shadow sprawl', count: stats.shadows.size - 3, detail: `${stats.shadows.size} different box-shadows. Elevation should come from 2–4 levels so depth reads as hierarchy.`, fix: 'Define --shadow-sm/md/lg and reuse them.' });

    return { issues, stats, sheets };
  }

  /* ================================================================
   * 6. DOM inspection (WCAG 2.2, semantics, visual hierarchy)
   * ================================================================ */
  const INTERACTIVE_SEL = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,label,[role="button"],[role="link"],[role="checkbox"],[role="tab"],[role="menuitem"],[role="switch"],[role="option"],[role="radio"],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';
  const FOCUSABLE_SEL = 'a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
  const CLICKY_CLASS_RE = /^(btn|button|cta|clickable)$|^(btn|button|cta)[-_][\w-]+$|[-_](btn|button)$/i;
  const VALID_ROLES = new Set('alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid gridcell group heading img insertion link list listbox listitem log main marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation none note option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox separator slider spinbutton status strong subscript superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem'.split(' '));
  const NON_HEADING_CLASS_RE = /logo|brand|badge|price|stat|value|number|amount|avatar|icon|kpi|metric|count/i;

  const directText = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  function textAlt(node) {
    let out = '';
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) { out += n.textContent; return; }
      if (n.nodeType !== 1 || n.getAttribute('aria-hidden') === 'true') return;
      const t = n.tagName.toLowerCase();
      if (t === 'img') out += ' ' + (n.getAttribute('alt') || '');
      else if (t === 'svg') { const ti = n.querySelector('title'); out += ' ' + (n.getAttribute('aria-label') || (ti ? ti.textContent : '')); }
      else out += ' ' + (n.getAttribute('aria-label') || textAlt(n));
    });
    return out.replace(/\s+/g, ' ');
  }
  function accName(el, doc) {
    const al = el.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const t = lb.split(/\s+/).map((id) => (doc.getElementById(id) || {}).textContent || '').join(' ').trim(); if (t) return t; }
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') return (el.getAttribute('alt') || '').trim();
    if (/^(input|select|textarea)$/.test(tag)) {
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (/^(submit|button|reset)$/.test(type)) return (el.getAttribute('value') || '').trim() || (type === 'submit' ? 'Submit' : type === 'reset' ? 'Reset' : '');
      if (type === 'image') return (el.getAttribute('alt') || '').trim();
      if (el.id) { const l = doc.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l && l.textContent.trim()) return l.textContent.trim(); }
      const wrap = el.closest('label');
      if (wrap && wrap.textContent.trim()) return wrap.textContent.trim();
      return (el.getAttribute('title') || '').trim();
    }
    const text = textAlt(el).trim();
    if (text) return text;
    return (el.getAttribute('title') || '').trim();
  }

  function analyzeDOM(doc, win, model) {
    const issues = [];
    const info = { el: {}, textPairs: [], clickables: [], linkButtons: [], fakeHeadings: [], navGroups: [], baseSize: 16 };
    const body = doc.body;
    if (!body) return { issues, info };
    const csCache = new Map();
    const cs = (el) => { let s = csCache.get(el); if (!s) { s = win.getComputedStyle(el); csCache.set(el, s); } return s; };
    const idOf = (el) => el.getAttribute('data-aegis-id');
    const lineOfEl = (el) => { const i = model.idMap.get(idOf(el)); return i ? i.line : null; };
    const add = (o, els) => {
      const list = (Array.isArray(els) ? els : els ? [els] : []).filter(Boolean);
      issues.push(Object.assign({ count: 1, elIds: list.map(idOf).filter(Boolean), line: list[0] ? lineOfEl(list[0]) : null, snippet: list[0] ? snippetOf(list[0]) : '' }, o));
    };
    const visible = (el) => { const s = cs(el); if (s.display === 'none' || s.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const SKIP = /^(script|style|noscript|template|meta|link|title|br|wbr|head)$/i;
    const els = $$('*', body).filter((el) => !SKIP.test(el.tagName) && !el.closest('#aegis-xray') && !(el.closest('svg') && el.tagName.toLowerCase() !== 'svg'));
    els.forEach((el) => { const p = el.parentElement; info.el[idOf(el)] = { display: cs(el).display, parentDisplay: p ? cs(p).display : 'block' }; });
    const isHeading = (el) => /^h[1-6]$/i.test(el.tagName) || el.getAttribute('role') === 'heading';

    /* ---------- text samples ---------- */
    const texts = [];
    els.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (/^(svg|img|input|select|textarea|option|video|audio|canvas|iframe)$/.test(tag)) return;
      const t = directText(el);
      if (!t || !visible(el)) return;
      const s = cs(el);
      texts.push({ el, tag, t, fs: parseFloat(s.fontSize) || 16, fw: parseInt(s.fontWeight, 10) || 400, fam: (s.fontFamily.split(',')[0] || '').replace(/["']/g, '').trim().toLowerCase(), lh: s.lineHeight, align: s.textAlign, rect: el.getBoundingClientRect() });
    });
    const bodyish = texts.filter((x) => x.t.length >= 25 && !isHeading(x.el));
    info.baseSize = mode(bodyish.map((x) => Math.round(x.fs))) || median(texts.map((x) => Math.round(x.fs))) || 16;
    const base = info.baseSize;

    /* ---------- WCAG 1.4.3 contrast ---------- */
    function bgLayers(el) {
      const layers = [];
      let ownerId = null;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const s = cs(n);
        const img = s.backgroundImage;
        if (img && img !== 'none') {
          if (/gradient/.test(img)) {
            const stops = (img.match(/rgba?\([^)]*\)/g) || []).map(parseColor).filter(Boolean);
            if (stops.length) {
              if (!layers.length) ownerId = idOf(n);
              layers.push({ gradient: stops, owner: idOf(n) });
              const bc = parseColor(s.backgroundColor);
              if (stops.every((c) => c.a >= 1)) return { layers, ownerId };
              if (bc && bc.a >= 1) { layers.push({ color: bc }); return { layers, ownerId }; }
              continue;
            }
          } else return { unknown: true };
        }
        const bc = parseColor(s.backgroundColor);
        if (bc && bc.a > 0) {
          if (!layers.length) ownerId = idOf(n);
          layers.push({ color: bc, owner: idOf(n) });
          if (bc.a >= 1) return { layers, ownerId };
        }
      }
      layers.push({ color: { r: 255, g: 255, b: 255, a: 1 } });
      return { layers, ownerId };
    }
    function bgCandidates(layers) {
      let cands = [{ r: 255, g: 255, b: 255, a: 1 }];
      for (let i = layers.length - 1; i >= 0; i--) {
        const L = layers[i];
        if (L.color) cands = cands.map((c) => blend(L.color, c));
        else cands = L.gradient.flatMap((st) => cands.map((c) => blend(st, c)));
      }
      const seen = new Set();
      return cands.filter((c) => { const k = rgbToHex(c); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    const opacityChain = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(cs(n).opacity || '1'); return o; };

    texts.forEach((x) => {
      const { el, t, fs, fw } = x;
      if (EMOJI_ONLY_RE.test(t) || el.closest('[disabled]')) return;
      const fg = parseColor(cs(el).color);
      if (!fg) return;
      const bl = bgLayers(el);
      if (bl.unknown) return;
      const cands = bgCandidates(bl.layers);
      const op = opacityChain(el);
      const fgEff = { ...fg, a: fg.a * op };
      let min = Infinity, worst = null;
      cands.forEach((bg) => { const r = contrast(blend(fgEff, bg), bg); if (r < min) { min = r; worst = bg; } });
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      const req = large ? 3 : 4.5;
      const single = bl.layers.length === 1 || (bl.layers.length === 2 && bl.layers[1].color && !bl.layers[1].owner);
      const pass = min >= req - 0.005;
      info.textPairs.push({ id: idOf(el), fgKey: rgbToHex(fg), bgs: cands, req, op, pass, ratio: min, bgOwner: single ? bl.ownerId : null });
      if (pass) return;
      const fix = fixForeground(fg, cands.map((bg) => ({ bg, req, op })));
      add({
        pillar: 'a11y', rule: 'WCAG 1.4.3 (AA)', sev: min < 3 ? 'critical' : 'serious', title: 'Insufficient text contrast',
        detail: `“${truncate(t, 40)}” is ${min.toFixed(2)}:1 (${cssColor(fgEff)} on ${rgbToHex(worst)}) — ${large ? 'large' : 'normal'} text needs ${req}:1.`,
        fix: fix ? `Use ${fix.hex} for this text (${fix.ratio.toFixed(2)}:1) or deepen the background.` : 'No text color passes on this background: change the background instead.',
      }, el);
    });

    /* ---------- names, ARIA, keyboard ---------- */
    const clickSet = new Set();
    els.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (/^(html|body|label|img|svg|option|main|header|footer|nav|section)$/.test(tag) || el.matches(INTERACTIVE_SEL)) return;
      if (el.parentElement && el.parentElement.closest(INTERACTIVE_SEL)) return;
      const s = cs(el), ps = el.parentElement ? cs(el.parentElement) : null;
      const hasOnclick = onclickOf(el) !== null;
      const pointer = s.cursor === 'pointer' && (!ps || ps.cursor !== 'pointer');
      const clsHit = (el.getAttribute('class') || '').split(/\s+/).some((c) => CLICKY_CLASS_RE.test(c));
      if (!(hasOnclick || pointer || clsHit)) return;
      if (el.querySelector(INTERACTIVE_SEL) || !visible(el)) return;
      clickSet.add(el);
      const role = el.getAttribute('role'), ti = el.getAttribute('tabindex');
      const kbOk = role && /^(button|link|tab|menuitem|checkbox|switch|option)$/.test(role) && ti !== null && +ti >= 0;
      if (!kbOk) add({ pillar: 'a11y', rule: 'WCAG 2.1.1 (A)', sev: 'critical', title: 'Click-only element is not keyboard accessible', detail: `<${tag}> responds to clicks but has no button role, no tabindex and no key handling. Keyboard and switch users cannot activate it.`, fix: 'Use a native <button type="button"> (or <a href> for navigation).' }, el);
      add({ pillar: 'semantic', rule: 'HTML · Native controls', sev: 'serious', title: 'Fake button built from a <div>/<span>', detail: `${snippetOf(el)} is styled and scripted like a button but is not one.`, fix: 'Replace with <button type="button"> and keep the class for styling.' }, el);
      const name = accName(el, doc);
      if (!name) add({ pillar: 'a11y', rule: 'WCAG 4.1.2 (A)', sev: 'critical', title: 'Interactive element has no accessible name', detail: `${snippetOf(el)} has no text, label or aria-label. Screen readers announce nothing useful.`, fix: 'Add visible text or aria-label="…".' }, el);
      else if (GLYPH_ONLY_RE.test(name)) add({ pillar: 'a11y', rule: 'WCAG 4.1.2 (A)', sev: 'serious', title: 'Icon glyph used as accessible name', detail: `${snippetOf(el)} is announced as “${name}”.`, fix: 'Add aria-label describing the action and hide the glyph with aria-hidden.' }, el);
      info.clickables.push({ id: idOf(el), blockKids: !!el.querySelector('div,p,h1,h2,h3,h4,h5,h6,ul,ol,section,article,table,form,header,footer,nav'), onclick: onclickOf(el) || '', display: s.display, parentDisplay: ps ? ps.display : 'block' });
    });

    els.filter((el) => el.matches('button, a[href], [role="button"], [role="link"], input[type="button"], input[type="submit"], input[type="reset"]') && visible(el)).forEach((el) => {
      const name = accName(el, doc);
      if (!name) add({ pillar: 'a11y', rule: 'WCAG 4.1.2 (A)', sev: 'critical', title: 'Interactive element has no accessible name', detail: `${snippetOf(el)} has no text, label or aria-label.`, fix: 'Add visible text or aria-label="…".' }, el);
      else if (GLYPH_ONLY_RE.test(name)) add({ pillar: 'a11y', rule: 'WCAG 4.1.2 (A)', sev: 'serious', title: 'Icon glyph used as accessible name', detail: `${snippetOf(el)} is announced as “${name}”.`, fix: 'Add aria-label describing the action.' }, el);
      else if (el.matches('a[href]') && /^(click here|here|read more|learn more|more|link|this)$/i.test(name)) add({ pillar: 'a11y', rule: 'WCAG 2.4.4 (A)', sev: 'moderate', title: 'Ambiguous link text', detail: `Link text “${name}” doesn’t describe its destination out of context.`, fix: 'Write descriptive link text or add aria-label.' }, el);
    });
    els.filter((el) => el.matches('a[href="#"], a[href^="javascript:"]')).forEach((el) => {
      if (onclickOf(el) !== null) {
        add({ pillar: 'semantic', rule: 'HTML · Native controls', sev: 'moderate', title: 'Link used as a button', detail: `${snippetOf(el)} runs script instead of navigating.`, fix: 'Use <button type="button"> for actions.' }, el);
        info.linkButtons.push({ id: idOf(el), display: cs(el).display, parentDisplay: el.parentElement ? cs(el.parentElement).display : 'block' });
      } else add({ pillar: 'semantic', rule: 'HTML · Links', sev: 'minor', title: 'Placeholder link (href="#")', detail: `${snippetOf(el)} goes nowhere.`, fix: 'Point it at a real URL, or make it a button if it performs an action.' }, el);
    });

    els.filter((el) => el.matches('img')).forEach((img) => {
      if (!img.hasAttribute('alt') && !/^(presentation|none)$/.test(img.getAttribute('role') || '')) add({ pillar: 'a11y', rule: 'WCAG 1.1.1 (A)', sev: 'critical', title: 'Image missing alt attribute', detail: `${snippetOf(img)} has no alt. Screen readers may read the file name.`, fix: 'Add alt="description", or alt="" if decorative.' }, img);
    });
    els.filter((el) => el.matches('input, select, textarea')).forEach((el) => {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (/^(hidden|submit|button|reset|image)$/.test(type)) return;
      if (!accName(el, doc)) {
        const ph = el.getAttribute('placeholder');
        add({ pillar: 'a11y', rule: 'WCAG 1.3.1 / 4.1.2 (A)', sev: 'critical', title: 'Form field has no label', detail: ph ? `<${el.tagName.toLowerCase()} type="${type}"> relies on placeholder “${truncate(ph, 30)}”, which disappears on input and is not a label.` : `<${el.tagName.toLowerCase()} type="${type}"> has no associated label.`, fix: 'Add <label for="…"> (preferred) or aria-label.' }, el);
      }
      if (/^(email|password|tel)$/.test(type) && !el.hasAttribute('autocomplete')) add({ pillar: 'a11y', rule: 'WCAG 1.3.5 (AA)', sev: 'minor', title: 'Missing autocomplete purpose', detail: `<input type="${type}"> has no autocomplete token, so browsers and assistive tech can’t autofill it.`, fix: `Add autocomplete="${type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'current-password'}".` }, el);
      // WCAG 1.4.11 non-text contrast of the field boundary
      if (visible(el) && !/^(checkbox|radio|range|color|file)$/.test(type)) {
        const s = cs(el);
        const parentBg = bgCandidates(bgLayers(el.parentElement || body).layers || [{ color: { r: 255, g: 255, b: 255, a: 1 } }]);
        const border = parseFloat(s.borderTopWidth) > 0 ? parseColor(s.borderTopColor) : null;
        const fill = parseColor(s.backgroundColor);
        const ratio = (c) => (c ? Math.min(...parentBg.map((bg) => contrast(blend(c, bg), bg))) : 1);
        if (Math.max(ratio(border), ratio(fill)) < 3) add({ pillar: 'a11y', rule: 'WCAG 1.4.11 (AA)', sev: 'moderate', title: 'Low-contrast form field boundary', detail: `The field’s border/fill is ${Math.max(ratio(border), ratio(fill)).toFixed(2)}:1 against its surroundings; it needs 3:1 to be perceivable.`, fix: 'Use a border token with ≥ 3:1 contrast against the surface.' }, el);
      }
    });
    els.filter((el) => el.hasAttribute('role')).forEach((el) => {
      const r = el.getAttribute('role').trim().split(/\s+/)[0].toLowerCase();
      if (r && !VALID_ROLES.has(r)) add({ pillar: 'a11y', rule: 'WCAG 4.1.2 (A)', sev: 'serious', title: 'Invalid ARIA role', detail: `role="${r}" is not a valid ARIA role and is ignored.`, fix: 'Use a valid role or a native element.' }, el);
    });
    els.filter((el) => el.getAttribute('aria-hidden') === 'true').forEach((el) => {
      if (el.matches(FOCUSABLE_SEL) || el.querySelector(FOCUSABLE_SEL)) add({ pillar: 'a11y', rule: 'WCAG 4.1.2 (A)', sev: 'serious', title: 'Focusable content hidden from assistive tech', detail: `${snippetOf(el)} is aria-hidden but can still receive keyboard focus, creating a “ghost” stop.`, fix: 'Remove aria-hidden, or remove it from the tab order.' }, el);
    });
    els.forEach((el) => {
      ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach((a) => {
        const v = el.getAttribute(a);
        if (v && v.split(/\s+/).some((id) => id && !doc.getElementById(id))) add({ pillar: 'a11y', rule: 'WCAG 4.1.2 (A)', sev: 'serious', title: 'Broken ARIA reference', detail: `${a}="${v}" points to an id that doesn’t exist.`, fix: 'Reference an existing id.' }, el);
      });
      const ti = el.getAttribute('tabindex');
      if (ti !== null && +ti > 0) add({ pillar: 'a11y', rule: 'WCAG 2.4.3 (A)', sev: 'serious', title: 'Positive tabindex', detail: `tabindex="${ti}" overrides the natural focus order.`, fix: 'Use tabindex="0" or rely on DOM order.' }, el);
    });
    const ids = new Map();
    els.forEach((el) => { if (el.id) ids.set(el.id, (ids.get(el.id) || []).concat(el)); });
    ids.forEach((list, id) => { if (list.length > 1) add({ pillar: 'a11y', rule: 'Best practice', sev: 'minor', title: 'Duplicate id', count: list.length, detail: `id="${id}" is used ${list.length} times, so labels and ARIA references become ambiguous.`, fix: 'Make ids unique.' }, list); });

    /* ---------- WCAG 2.5.8 target size (new in 2.2) ---------- */
    const targets = [];
    const TARGET_SEL = 'a[href],button,[role="button"],[role="link"],input[type="checkbox"],input[type="radio"],select,input[type="submit"],input[type="button"]';
    els.forEach((el) => {
      if (!(el.matches(TARGET_SEL) || clickSet.has(el)) || !visible(el)) return;
      if (el.tagName === 'A' && cs(el).display === 'inline' && el.parentElement && directText(el.parentElement)) return;
      if (/^(checkbox|radio)$/i.test(el.getAttribute('type') || '') && (el.closest('label') || (el.id && doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)))) return;
      targets.push({ el, r: el.getBoundingClientRect() });
    });
    targets.forEach((T) => {
      const r = T.r;
      if (r.width >= 24 && r.height >= 24) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const conflict = targets.some((O) => {
        if (O === T || O.el.contains(T.el) || T.el.contains(O.el)) return false;
        const o = O.r;
        if (o.width < 24 || o.height < 24) return Math.hypot(cx - (o.left + o.width / 2), cy - (o.top + o.height / 2)) < 24;
        const dx = Math.max(o.left - cx, 0, cx - o.right), dy = Math.max(o.top - cy, 0, cy - o.bottom);
        return Math.hypot(dx, dy) < 12;
      });
      if (conflict) add({ pillar: 'a11y', rule: 'WCAG 2.5.8 (AA · new in 2.2)', sev: 'serious', title: 'Target smaller than 24×24 px', detail: `${snippetOf(T.el)} is ${Math.round(r.width)}×${Math.round(r.height)}px and sits too close to neighbouring targets.`, fix: 'Give targets min-width/min-height of 24px or add spacing.' }, T.el);
    });

    /* ---------- document-level checks ---------- */
    if (model.isFullDoc) {
      if (!doc.documentElement.getAttribute('lang')) add({ pillar: 'a11y', rule: 'WCAG 3.1.1 (A)', sev: 'serious', title: 'Page language not set', line: 1, detail: '<html> has no lang attribute, so screen readers guess the pronunciation.', fix: 'Add <html lang="en">.' });
      if (!(doc.title || '').trim()) add({ pillar: 'a11y', rule: 'WCAG 2.4.2 (A)', sev: 'moderate', title: 'Missing page title', line: 1, detail: 'No <title> element. Tabs, history and screen readers have nothing to announce.', fix: 'Add a descriptive <title>.' });
      const vp = doc.querySelector('meta[name="viewport"]');
      if (vp && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0+)?(?![\d.])/i.test(vp.getAttribute('content') || '')) add({ pillar: 'a11y', rule: 'WCAG 1.4.4 (AA)', sev: 'serious', title: 'Zoom disabled in viewport meta', line: lineOfEl(vp), detail: 'user-scalable=no / maximum-scale=1 blocks pinch-zoom for low-vision users.', fix: 'Use content="width=device-width, initial-scale=1".' });
    }

    /* ---------- Semantic HTML ---------- */
    const headings = els.filter((el) => /^h[1-6]$/i.test(el.tagName) && visible(el));
    const page = els.length >= 12;
    const h1s = headings.filter((h) => h.tagName === 'H1');
    if (page && !h1s.length) add({ pillar: 'semantic', rule: 'WCAG 1.3.1 (A)', sev: 'moderate', title: 'No <h1> on the page', detail: 'There is no top-level heading, so the page has no announced title in the outline.', fix: 'Mark the main title up as <h1>.' });
    h1s.slice(1).forEach((h) => add({ pillar: 'semantic', rule: 'HTML · Outline', sev: 'moderate', title: 'Multiple <h1> elements', detail: `Additional <h1> “${truncate(h.textContent.trim(), 40)}” competes with the page title.`, fix: 'Keep one <h1>; demote the rest.' }, h));
    let prevLvl = 0;
    headings.forEach((h) => {
      const lvl = +h.tagName[1];
      if (prevLvl && lvl > prevLvl + 1) add({ pillar: 'semantic', rule: 'WCAG 1.3.1 (A)', sev: 'moderate', title: 'Skipped heading level', detail: `<h${prevLvl}> is followed by <h${lvl}> “${truncate(h.textContent.trim(), 34)}”.`, fix: `Use <h${prevLvl + 1}> here (style it with a class).` }, h);
      prevLvl = lvl;
    });
    texts.forEach((x) => {
      const { el, t, fs, fw } = x;
      if (isHeading(el) || el.parentElement.closest('h1,h2,h3,h4,h5,h6,button,a,label,[role="button"],summary,th') || clickSet.has(el) || el.matches('a,button,label,th,td,li,strong,b,em,span')) return;
      if (t.length < 2 || t.length > 80 || NON_HEADING_CLASS_RE.test(el.getAttribute('class') || '')) return;
      if (/^[\s$€£¥%+\-–\d.,:/×x]+$/.test(t) || /^[$€£¥]?\d/.test(t)) return;
      if (fs >= Math.max(base * 1.2, 16) && fw >= 600) {
        add({ pillar: 'semantic', rule: 'WCAG 1.3.1 (A)', sev: 'serious', title: 'Text styled as a heading but not marked up as one', detail: `<${x.tag}> “${truncate(t, 40)}” looks like a heading (${Math.round(fs)}px / ${fw}) but screen-reader users can’t navigate to it.`, fix: 'Use the appropriate <h2>–<h4> and keep the class.' }, el);
        info.fakeHeadings.push({ id: idOf(el), fs });
      }
    });
    const divs = els.filter((el) => /^(div|span)$/i.test(el.tagName)).length;
    if (els.length >= 15 && divs / els.length > 0.6) add({ pillar: 'semantic', rule: 'HTML · Structure', sev: divs / els.length > 0.75 ? 'serious' : 'moderate', title: 'Div soup', detail: `${Math.round((divs / els.length) * 100)}% of elements are <div>/<span> (${divs} of ${els.length}). Structure is invisible to assistive tech.`, fix: 'Use header, nav, main, section, article, ul/li, button.' });
    if (page && !els.some((el) => el.matches('main,[role="main"]'))) add({ pillar: 'semantic', rule: 'WCAG 1.3.1 / 2.4.1', sev: 'moderate', title: 'No <main> landmark', detail: 'Screen-reader users can’t jump straight to the primary content.', fix: 'Wrap the primary content in <main>.' });
    els.forEach((el) => {
      if (el.closest('nav,[role="navigation"]') || /^(ul|ol|nav)$/i.test(el.tagName)) return;
      const links = Array.from(el.children).filter((c) => c.matches('a[href]') || clickSet.has(c) || (c.tagName === 'LI' && c.querySelector('a[href]')));
      if (links.length >= 3 && links.length >= el.children.length - 1) {
        add({ pillar: 'semantic', rule: 'WCAG 1.3.1 (A)', sev: 'moderate', title: 'Navigation links not in a <nav>', detail: `${snippetOf(el)} groups ${links.length} links/menu items without a navigation landmark.`, fix: 'Wrap the group in <nav aria-label="…">.' }, el);
        info.navGroups.push(idOf(el));
      }
    });
    els.forEach((el) => {
      const cls = (el.getAttribute('class') || '').toLowerCase();
      const map = [[/(^|[\s_-])(header|topbar|masthead|navbar)([\s_-]|$)/, 'header'], [/(^|[\s_-])footer([\s_-]|$)/, 'footer']];
      map.forEach(([re, tag]) => {
        if (el.tagName === 'DIV' && re.test(cls) && !doc.querySelector(tag) && !el.parentElement.closest('header,footer,nav')) add({ pillar: 'semantic', rule: 'WCAG 1.3.1 (A)', sev: 'minor', title: 'Landmark built from a <div>', detail: `${snippetOf(el)} is a ${tag} region but uses a <div>.`, fix: `Use <${tag}>.` }, el);
      });
    });
    els.forEach((el) => {
      if (/^(ul|ol|nav|select|table|tbody|thead|tr|dl)$/i.test(el.tagName) || el.children.length < 3) return;
      const kids = Array.from(el.children);
      const sig = (c) => c.tagName + '.' + (c.getAttribute('class') || '');
      if (kids.every((c) => sig(c) === sig(kids[0]) && /^(DIV|SPAN|P)$/.test(c.tagName)) && kids.every((c) => c.textContent.trim().length < 140 && !c.children.length)) {
        add({ pillar: 'semantic', rule: 'HTML · Lists', sev: 'minor', title: 'Repeated items not marked up as a list', detail: `${kids.length} sibling ${snippetOf(kids[0])} items read as a list but aren’t one.`, fix: 'Use <ul>/<li> so the count is announced.' }, el);
      }
    });
    els.filter((el) => /^(center|font|marquee|blink|big|strike|tt)$/i.test(el.tagName)).forEach((el) => add({ pillar: 'semantic', rule: 'HTML · Deprecated', sev: 'moderate', title: 'Deprecated presentational element', detail: `<${el.tagName.toLowerCase()}> was removed from HTML. Styling belongs in CSS.`, fix: 'Replace with a semantic element + class.' }, el));
    els.filter((el) => /^(b|i)$/i.test(el.tagName) && el.textContent.trim()).forEach((el) => add({ pillar: 'semantic', rule: 'HTML · Emphasis', sev: 'minor', title: 'Presentational <b>/<i>', detail: `<${el.tagName.toLowerCase()}> conveys no meaning to assistive tech.`, fix: 'Use <strong>/<em> for emphasis, or a class for styling.' }, el));
    $$('br + br', body).forEach((el) => add({ pillar: 'semantic', rule: 'HTML · Structure', sev: 'minor', title: 'Consecutive <br> used for spacing', detail: 'Stacked line breaks fake vertical rhythm.', fix: 'Remove them and use margin tokens.' }, el.previousElementSibling || el));
    els.filter((el) => el.tagName === 'TABLE' && !el.querySelector('th')).forEach((el) => add({ pillar: 'semantic', rule: 'WCAG 1.3.1 (A)', sev: 'moderate', title: 'Table without header cells', detail: 'Data cells can’t be associated with headers.', fix: 'Use <th scope="col"> for headers.' }, el));
    const controls = els.filter((el) => el.matches('input:not([type="hidden"]), select, textarea'));
    if (controls.length >= 2 && controls.some((c) => !c.closest('form'))) add({ pillar: 'semantic', rule: 'HTML · Forms', sev: 'minor', title: 'Form controls outside a <form>', detail: `${controls.length} fields aren’t inside a <form>, so Enter-to-submit and form semantics are lost.`, fix: 'Wrap related fields in <form>.' }, controls.find((c) => !c.closest('form')));

    /* ---------- Visual hierarchy ---------- */
    const typeTexts = texts.filter((x) => !EMOJI_ONLY_RE.test(x.t));
    const sizes = uniq(typeTexts.map((x) => Math.round(x.fs * 2) / 2)).sort((a, b) => b - a);
    if (sizes.length > 6) add({ pillar: 'hierarchy', rule: 'Hierarchy · Type scale', sev: sizes.length > 8 ? 'serious' : 'moderate', title: 'Too many font sizes', count: sizes.length - 6, detail: `${sizes.length} distinct font sizes (${sizes.join(', ')}px). Hierarchy reads as noise past ~6 steps.`, fix: 'Collapse onto a type scale (12/14/16/18/20/24/30/36/48).' });
    const close = [];
    for (let i = 0; i < sizes.length - 1; i++) if (sizes[i] - sizes[i + 1] <= 1) close.push(`${sizes[i]}/${sizes[i + 1]}px`);
    if (close.length) add({ pillar: 'hierarchy', rule: 'Hierarchy · Type scale', sev: 'moderate', title: 'Font sizes too close to read as different levels', count: close.length, detail: `Sizes ${close.join(', ')} differ by ≤ 1px: users can’t perceive the difference, so it’s accidental.`, fix: 'Use steps with at least a 1.125× ratio.' });
    const lvlSize = {};
    headings.forEach((h) => { const l = +h.tagName[1]; const fs = parseFloat(cs(h).fontSize); lvlSize[l] = Math.max(lvlSize[l] || 0, fs); });
    const lvls = Object.keys(lvlSize).map(Number).sort();
    for (let i = 0; i < lvls.length - 1; i++) {
      if (lvlSize[lvls[i]] < lvlSize[lvls[i + 1]]) add({ pillar: 'hierarchy', rule: 'Hierarchy · Headings', sev: 'serious', title: 'Heading levels visually inverted', detail: `<h${lvls[i]}> renders at ${lvlSize[lvls[i]]}px but <h${lvls[i + 1]}> at ${lvlSize[lvls[i + 1]]}px.`, fix: 'Higher-level headings must be visually larger.' }, headings.find((h) => +h.tagName[1] === lvls[i + 1]));
    }
    headings.forEach((h) => { const fs = parseFloat(cs(h).fontSize); if (fs < base) add({ pillar: 'hierarchy', rule: 'Hierarchy · Headings', sev: 'moderate', title: 'Heading smaller than body text', detail: `<${h.tagName.toLowerCase()}> “${truncate(h.textContent.trim(), 30)}” is ${fs}px, below the ${base}px body size.`, fix: 'Headings should be at least body size and visually distinct.' }, h); });
    const fams = uniq(typeTexts.map((x) => x.fam).filter(Boolean));
    if (fams.length > 2) add({ pillar: 'hierarchy', rule: 'Hierarchy · Typography', sev: 'moderate', title: 'Too many font families', count: fams.length - 2, detail: `${fams.length} families render (${fams.join(', ')}). Use one for text and at most one for display.`, fix: 'Define --font-body and --font-heading tokens.' });
    const weights = uniq(typeTexts.map((x) => x.fw));
    if (weights.length > 4) add({ pillar: 'hierarchy', rule: 'Hierarchy · Typography', sev: 'minor', title: 'Too many font weights', detail: `${weights.length} weights in use (${weights.sort().join(', ')}).`, fix: 'Stick to 2–3 weights (400 / 600 / 700).' });
    const ctas = targets.map((t) => t.el).filter((el) => { const c = parseColor(cs(el).backgroundColor); if (!c || c.a < 0.9) return false; const { s, l } = rgbToHsl(c); return s >= 0.35 && l > 0.2 && l < 0.85; });
    const hues = uniq(ctas.map((el) => hueName(rgbToHsl(parseColor(cs(el).backgroundColor)).h)));
    if (hues.length > 2) add({ pillar: 'hierarchy', rule: 'Hierarchy · Emphasis', sev: 'moderate', title: 'Competing call-to-action colors', count: hues.length - 2, detail: `${ctas.length} buttons use ${hues.length} different saturated colors (${hues.join(', ')}). Nothing reads as the primary action.`, fix: 'One primary color for the main action; secondary actions use outline/ghost styles.' }, ctas);
    const tight = texts.filter((x) => x.t.length >= 60 && !isHeading(x.el) && x.lh !== 'normal' && parseFloat(x.lh) / x.fs < 1.3);
    tight.slice(0, 10).forEach((x) => add({ pillar: 'hierarchy', rule: 'Hierarchy · Readability (1.4.12)', sev: 'moderate', title: 'Tight line-height on body text', detail: `Line-height ${(parseFloat(x.lh) / x.fs).toFixed(2)} on a ${x.t.length}-character block. Body copy needs ≥ 1.4.`, fix: 'Use --leading-normal (1.5).' }, x.el));
    texts.filter((x) => x.fs < 12).slice(0, 10).forEach((x) => add({ pillar: 'hierarchy', rule: 'Hierarchy · Readability', sev: 'serious', title: 'Text below 12px', detail: `“${truncate(x.t, 30)}” renders at ${x.fs}px.`, fix: 'Minimum 12px for labels, 14–16px for reading text.' }, x.el));
    texts.filter((x) => x.fs >= 12 && x.fs < 14 && x.t.length >= 50).slice(0, 10).forEach((x) => add({ pillar: 'hierarchy', rule: 'Hierarchy · Readability', sev: 'minor', title: 'Reading text under 14px', detail: `${x.t.length}-character text at ${x.fs}px is tiring to read.`, fix: 'Use --text-sm (14px) or --text-base (16px).' }, x.el));
    texts.filter((x) => x.t.length > 200 && x.rect.width / x.fs > 45).slice(0, 5).forEach((x) => add({ pillar: 'hierarchy', rule: 'Hierarchy · Readability', sev: 'minor', title: 'Line length over ~90 characters', detail: `The block is ${Math.round(x.rect.width)}px wide at ${x.fs}px.`, fix: 'Cap reading width around 65ch.' }, x.el));
    texts.filter((x) => x.align === 'center' && x.t.length > 160 && x.rect.height / (parseFloat(x.lh) || x.fs * 1.2) >= 3).slice(0, 5).forEach((x) => add({ pillar: 'hierarchy', rule: 'Hierarchy · Readability', sev: 'minor', title: 'Long paragraph center-aligned', detail: 'Ragged left edges make multi-line text hard to scan.', fix: 'Left-align paragraphs longer than two lines.' }, x.el));
    const emojiEls = els.filter((el) => (isHeading(el) || el.matches('button,a,[role="button"]') || clickSet.has(el) || info.fakeHeadings.some((f) => f.id === idOf(el))) && !el.hasAttribute('aria-label') && LEADING_EMOJI_RE.test(el.textContent) && !(el.firstElementChild && el.firstElementChild.getAttribute('aria-hidden') === 'true' && LEADING_EMOJI_RE.test(el.firstElementChild.textContent)));
    if (emojiEls.length) add({ pillar: 'hierarchy', rule: 'AI slop signature', sev: 'minor', title: 'Emoji used as icons', count: emojiEls.length, detail: `${emojiEls.length} headings/buttons lead with emoji. Screen readers read them aloud (“rocket, Supercharge…”).`, fix: 'Use an icon set, or wrap decorative emoji in aria-hidden="true".' }, emojiEls);
    if (texts.length > 8 && texts.filter((x) => x.align === 'center').length / texts.length > 0.7) add({ pillar: 'hierarchy', rule: 'AI slop signature', sev: 'minor', title: 'Center-aligned everything', detail: `${Math.round((texts.filter((x) => x.align === 'center').length / texts.length) * 100)}% of text is centered, which flattens hierarchy.`, fix: 'Center only short display text; left-align the rest.' });

    return { issues, info };
  }

  function mapSelectorIssues(issues, doc) {
    issues.forEach((iss) => {
      if (!iss.selector || iss.elIds.length) return;
      const out = [];
      splitSelectors(iss.selector).forEach((part) => {
        const clean = stripPseudo(part);
        if (!clean || /^(:root|html|\*)$/.test(clean)) return;
        try { $$(clean, doc).forEach((el) => { const id = el.getAttribute('data-aegis-id'); if (id && !out.includes(id)) out.push(id); }); } catch (e) { /* unsupported selector */ }
      });
      iss.elIds = out.length > 40 ? [] : out;
    });
  }

  /* ================================================================
   * 7. Scoring
   * ================================================================ */
  const PILLARS = {
    tokens: { name: 'Token Compliance', short: 'Tokens', weight: 0.25 },
    a11y: { name: 'WCAG 2.2 Contrast & ARIA', short: 'WCAG', weight: 0.3 },
    semantic: { name: 'Semantic HTML', short: 'Semantics', weight: 0.25 },
    hierarchy: { name: 'Visual Hierarchy', short: 'Hierarchy', weight: 0.2 },
  };
  const SEV = { critical: { w: 10, label: 'Critical' }, serious: { w: 6, label: 'Serious' }, moderate: { w: 3, label: 'Moderate' }, minor: { w: 1, label: 'Minor' } };
  function scoreIssues(issues) {
    const out = {};
    Object.keys(PILLARS).forEach((p) => {
      const byRule = new Map();
      issues.filter((i) => i.pillar === p).forEach((i) => {
        const k = i.rule + '|' + i.title;
        const r = byRule.get(k) || { sev: i.sev, count: 0 };
        r.count += i.count || 1;
        if (SEV[i.sev].w > SEV[r.sev].w) r.sev = i.sev;
        byRule.set(k, r);
      });
      let P = 0;
      byRule.forEach((r) => { P += SEV[r.sev].w * (1 + Math.log2(r.count)); });
      out[p] = Math.round(100 * Math.exp(-P / 60));
    });
    out.overall = Math.round(Object.keys(PILLARS).reduce((s, k) => s + out[k] * PILLARS[k].weight, 0));
    return out;
  }
  function gradeOf(s) {
    if (s >= 90) return { letter: 'A', label: 'Production-ready' };
    if (s >= 80) return { letter: 'B', label: 'Solid · minor polish' };
    if (s >= 65) return { letter: 'C', label: 'Needs work' };
    if (s >= 45) return { letter: 'D', label: 'Heavy slop' };
    return { letter: 'F', label: 'Pure AI slop' };
  }

  /** Full audit: static + live DOM inspection inside a sandboxed iframe. */
  async function runAuditOn(src, frame) {
    const model = buildModel(src);
    const css = analyzeCSS(model);
    await loadFrame(frame, model.srcdoc);
    const doc = frame.contentDocument, win = frame.contentWindow;
    const dom = analyzeDOM(doc, win, model);
    const issues = [...css.issues, ...dom.issues];
    mapSelectorIssues(issues, doc);
    issues.forEach((i, n) => { i.uid = n; });
    return { model, issues, scores: scoreIssues(issues), dom: dom.info, css: css.stats, at: Date.now() };
  }
  function loadFrame(frame, html) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        frame.removeEventListener('load', onLoad);
        const d = frame.contentDocument;
        const fonts = d && d.fonts ? Promise.race([d.fonts.ready, wait(1200)]) : Promise.resolve();
        fonts.then(() => requestAnimationFrame(() => resolve()));
      };
      const onLoad = () => finish();
      frame.addEventListener('load', onLoad);
      setTimeout(finish, 4000);
      frame.srcdoc = html;
    });
  }

  /* ================================================================
   * 8. Refactor engine
   * ================================================================ */
  const SPACE_SCALE = [[2, '0-5'], [4, '1'], [6, '1-5'], [8, '2'], [12, '3'], [16, '4'], [20, '5'], [24, '6'], [32, '8'], [40, '10'], [48, '12'], [56, '14'], [64, '16'], [80, '20'], [96, '24'], [128, '32'], [160, '40']];
  const TEXT_SCALE = [[12, 'xs'], [14, 'sm'], [16, 'base'], [18, 'lg'], [20, 'xl'], [24, '2xl'], [30, '3xl'], [36, '4xl'], [48, '5xl'], [60, '6xl'], [72, '7xl'], [96, '8xl']];
  const RADIUS_SCALE = [[4, 'sm'], [6, 'md'], [8, 'lg'], [12, 'xl'], [16, '2xl'], [24, '3xl']];
  const WEIGHT_NAMES = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'regular', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' };
  const HEADING_SEL_RE = /(^|[\s>+~,(])h[1-6]\b|[\w-]*(title|heading|headline|display|logo|brand)[\w-]*/i;
  const isHeadingish = (sel) => HEADING_SEL_RE.test(sel) && !/(sub|desc|text|copy|body|lead|caption|paragraph|label)/i.test(sel.slice(lastCompoundStart(sel)));
  const nearest = (scale, v) => scale.reduce((b, s) => (Math.abs(s[0] - v) < Math.abs(b[0] - v) ? s : b));
  const rem = (px) => `${+(px / 16).toFixed(4)}rem`;
  const GLYPH_LABELS = { '×': 'Close', '✕': 'Close', '✖': 'Close', '☰': 'Open menu', '≡': 'Open menu', '🔍': 'Search', '🔎': 'Search', '🔔': 'Notifications', '⚙': 'Settings', '❤': 'Like', '♥': 'Like', '★': 'Favorite', '☆': 'Favorite', '→': 'Next', '←': 'Previous', '›': 'Next', '‹': 'Previous', '▶': 'Play', '⋮': 'More options', '⋯': 'More options', '+': 'Add', '🗑': 'Delete', '✏': 'Edit', '✎': 'Edit', '🛒': 'Cart', '👤': 'Account' };
  const WORD_LABELS = { close: 'Close', menu: 'Open menu', hamburger: 'Open menu', search: 'Search', notif: 'Notifications', notify: 'Notifications', notification: 'Notifications', notifications: 'Notifications', bell: 'Notifications', settings: 'Settings', gear: 'Settings', cog: 'Settings', delete: 'Delete', trash: 'Delete', remove: 'Remove', edit: 'Edit', share: 'Share', like: 'Like', heart: 'Like', next: 'Next', prev: 'Previous', previous: 'Previous', back: 'Back', play: 'Play', pause: 'Pause', cart: 'Cart', user: 'Account', profile: 'Profile', account: 'Account', more: 'More options', add: 'Add', google: 'Continue with Google', github: 'Continue with GitHub', apple: 'Continue with Apple', facebook: 'Continue with Facebook', twitter: 'Continue with X', download: 'Download', upload: 'Upload', home: 'Home', help: 'Help', info: 'Information' };

  function deriveLabel(el) {
    const txt = (el.textContent || '').trim();
    for (const ch of Object.keys(GLYPH_LABELS)) if (txt && txt.replace(/️/g, '') === ch) return GLYPH_LABELS[ch];
    const words = [
      ...(el.getAttribute('class') || '').split(/[\s_-]+/),
      ...(el.id || '').split(/[\s_-]+/),
      ...((el.getAttribute('onclick') || '').match(/^\s*([\w$]+)/) || [, ''])[1].replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s_]+/),
      ...(el.getAttribute('title') || '').split(/\s+/),
    ].map((w) => w.toLowerCase()).filter(Boolean);
    for (const w of words) if (WORD_LABELS[w]) return WORD_LABELS[w];
    const svgTitle = el.querySelector && el.querySelector('svg title');
    if (svgTitle && svgTitle.textContent.trim()) return svgTitle.textContent.trim();
    return null;
  }

  function refactorSource(src, audit) {
    const changes = [];
    const log = (pillar, text) => changes.push({ pillar, text });
    const isFullDoc = /<!doctype|<html[\s>]/i.test(src);
    const doc = new DOMParser().parseFromString(src, 'text/html');
    $$('*', doc).forEach((el, i) => el.setAttribute('data-aegis-id', String(i)));
    const byId = (id) => doc.querySelector(`[data-aegis-id="${id}"]`);
    const dom = audit.dom;
    const used = { btnReset: false, block: false, headingReset: false, center: false };
    const protectedColors = new Set();

    /* --- 1. Collect CSS ------------------------------------------- */
    let sheet = [];
    $$('style', doc).forEach((s) => { sheet.push(...parseCSS(s.textContent)); s.remove(); });
    const preservedVars = [];
    sheet = sheet.filter((n) => {
      if (n.type === 'rule' && /^(:root|html)$/i.test(n.selector.trim())) {
        preservedVars.push(...n.decls.filter((d) => d.prop.startsWith('--')));
        n.decls = n.decls.filter((d) => !d.prop.startsWith('--'));
        return n.decls.length > 0;
      }
      return true;
    });

    /* --- 2. Inline styles → reusable classes ---------------------- */
    const inlineRules = []; const inlineKey = new Map(); let inlineCount = 0;
    $$('[style]', doc).forEach((el) => {
      const decls = parseDecls(blankComments(el.getAttribute('style') || ''));
      el.removeAttribute('style');
      if (!decls.length) return;
      inlineCount++;
      const key = decls.map((d) => `${d.prop}:${d.value}${d.important ? '!' : ''}`).join(';');
      let cls = inlineKey.get(key);
      if (!cls) {
        const baseName = ((el.getAttribute('class') || '').split(/\s+/).filter(Boolean)[0] || el.tagName.toLowerCase()).replace(/[^\w-]/g, '');
        cls = `${baseName}-inline-${inlineRules.length + 1}`;
        inlineKey.set(key, cls);
        inlineRules.push({ type: 'rule', selector: '.' + cls, decls, _inline: true });
      }
      el.classList.add(cls);
    });
    if (inlineCount) log('tokens', `Extracted ${plural(inlineCount, 'inline style attribute')} into ${plural(inlineRules.length, 'reusable class', 'reusable classes')}.`);

    const rulesFlat = [];
    walkRules(sheet, (r, ctx) => { r._kf = ctx.keyframes; r._media = ctx.media; rulesFlat.push(r); });
    inlineRules.forEach((r) => rulesFlat.push(r));

    const ruleSpec = (el, rule) => {
      if (rule._kf || rule.atRule) return null;
      let best = null;
      for (const part of splitSelectors(rule.selector)) {
        if (/::|:(hover|focus|active|visited|focus-visible|focus-within|checked|disabled|placeholder-shown)\b/.test(part)) continue;
        try {
          if (el.matches(part)) { const sp = rule._inline ? [1, 0, 0, 0] : [0, ...specificity(part)]; if (!best || cmpSpec(sp, best) > 0) best = sp; }
        } catch (e) { /* ignore */ }
      }
      return best;
    };
    const winningDecl = (el, propRe) => {
      let best = null;
      rulesFlat.forEach((r) => {
        const sp = ruleSpec(el, r);
        if (!sp) return;
        const d = [...r.decls].reverse().find((x) => propRe.test(x.prop));
        if (d && (!best || cmpSpec(sp, best.sp) >= 0)) best = { rule: r, decl: d, sp };
      });
      return best;
    };
    const colorSource = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const w = winningDecl(n, /^color$/); if (w) return w; } return null; };

    /* --- 3. Contrast repair (WCAG 1.4.3) --------------------------- */
    const groups = new Map();
    (dom.textPairs || []).forEach((p) => {
      const el = byId(p.id); if (!el) return;
      const srcDecl = colorSource(el);
      if (!srcDecl || /var\(/.test(srcDecl.decl.value)) return;
      // Only trust the source if it really produces the computed color (not a <font color> etc.)
      const lit = findColors(stripVars(srcDecl.decl.value), 'color')[0];
      if (!lit || normColor(lit.text) !== p.fgKey) return;
      const g = groups.get(srcDecl.decl) || { decl: srcDecl.decl, rule: srcDecl.rule, pairs: [] };
      g.pairs.push(p); groups.set(srcDecl.decl, g);
    });
    let contrastFixed = 0;
    const fixedBgDecls = new Set();
    const chosenFg = [];
    groups.forEach((g) => {
      const failing = g.pairs.filter((p) => !p.pass);
      if (!failing.length) return;
      const found = findColors(stripVars(g.decl.value), 'color')[0];
      if (!found) return;
      const fg = parseColor(found.text);
      const all = g.pairs.flatMap((p) => p.bgs.map((bg) => ({ bg, req: p.req, op: p.op })));
      const fail = failing.flatMap((p) => p.bgs.map((bg) => ({ bg, req: p.req, op: p.op })));
      const fgAll = fixForeground(fg, all);
      let fgOpt = fgAll || fixForeground(fg, fail);
      if (fgOpt) {
        // Reuse a color we already picked if it also passes: fewer near-duplicate tokens.
        const tgt = fgAll ? all : fail;
        const okAll = (c) => tgt.every((t) => contrast(blend({ ...c, a: t.op }, t.bg), t.bg) >= t.req + 0.05);
        const reuse = chosenFg.map((hx) => parseColor(hx)).filter((c) => deltaE(c, parseColor(fgOpt.hex)) < 12 && okAll(c))
          .sort((a, b) => deltaE(a, parseColor(fgOpt.hex)) - deltaE(b, parseColor(fgOpt.hex)))[0];
        if (reuse) fgOpt = { ...fgOpt, hex: rgbToHex(reuse), ratio: Math.min(...tgt.map((t) => contrast(blend({ ...reuse, a: t.op }, t.bg), t.bg))) };
      }
      const applyFg = () => {
        if (normColor(found.text) === fgOpt.hex) return;
        chosenFg.push(fgOpt.hex);
        g.decl.value = spliceAt(g.decl.value, found.index, found.text.length, fgOpt.hex);
        protectedColors.add(fgOpt.hex); contrastFixed++;
        log('a11y', `Text color ${found.text} → ${fgOpt.hex} in \`${truncate(g.rule.selector, 40)}\` (${fgOpt.ratio.toFixed(2)}:1, WCAG 1.4.3).`);
      };
      if (fgOpt && fgOpt.delta <= 0.22) return applyFg();
      // Try deepening/lightening the background that owns the failing pairs.
      const fgSolid = { ...fg, a: 1 };
      const plan = [];
      let feasible = true, worstDelta = 0;
      failing.forEach((p) => {
        const owner = p.bgOwner && byId(p.bgOwner);
        const bgSrc = owner && winningDecl(owner, /^background(-color|-image)?$/);
        if (!bgSrc || /var\(/.test(bgSrc.decl.value)) { feasible = false; return; }
        if (plan.some((x) => x.decl === bgSrc.decl)) return;
        const cols = findColors(stripVars(bgSrc.decl.value), bgSrc.decl.prop);
        if (!cols.length) { feasible = false; return; }
        const reps = [];
        cols.forEach((c) => {
          const bc = parseColor(c.text);
          if (!bc || bc.a < 1) { feasible = false; return; }
          if (contrast(fgSolid, bc) >= p.req + 0.05) return;
          const nb = fixBackground(bc, fgSolid, p.req);
          if (!nb) { feasible = false; return; }
          worstDelta = Math.max(worstDelta, nb.delta);
          reps.push({ c, hex: nb.hex });
        });
        plan.push({ decl: bgSrc.decl, rule: bgSrc.rule, reps });
      });
      // Shift a background only for small nudges; big lightness jumps destroy the brand color.
      if (feasible && plan.length && (!fgOpt || (worstDelta < fgOpt.delta && worstDelta <= 0.2))) {
        if (fg.a < 1) { g.decl.value = spliceAt(g.decl.value, found.index, found.text.length, rgbToHex(fgSolid)); protectedColors.add(rgbToHex(fgSolid)); }
        plan.forEach((pl) => {
          if (fixedBgDecls.has(pl.decl)) return;
          let v = pl.decl.value;
          [...pl.reps].sort((a, b) => b.c.index - a.c.index).forEach((r) => { v = spliceAt(v, r.c.index, r.c.text.length, r.hex); protectedColors.add(r.hex); });
          if (v !== pl.decl.value) { log('a11y', `Background in \`${truncate(pl.rule.selector, 40)}\` deepened (${pl.reps.map((r) => `${r.c.text} → ${r.hex}`).join(', ')}) so text reaches ${failing[0].req}:1.`); pl.decl.value = v; fixedBgDecls.add(pl.decl); contrastFixed++; }
        });
        return;
      }
      if (fgOpt) applyFg();
    });

    /* --- 4. Semantic markup --------------------------------------- */
    const retag = (el, tag, drop = []) => {
      const old = el.tagName.toLowerCase();
      if (old === tag) return el;
      rulesFlat.forEach((r) => {
        if (r._kf || r.atRule) return;
        const parts = splitSelectors(r.selector);
        let changed = false;
        const next = parts.map((p) => {
          let hit = false;
          try { const clean = stripPseudo(p); hit = !!clean && el.matches(clean); } catch (e) { hit = false; }
          if (!hit) return p;
          const k = lastCompoundStart(p);
          const comp = p.slice(k);
          const wasCls = 'was-' + old;
          if (comp.includes(`.${wasCls}`)) { el.classList.add(wasCls); return p; }
          if (!new RegExp('^' + old + '(?![\\w-])', 'i').test(comp)) return p;
          changed = true; el.classList.add(wasCls);
          return p.slice(0, k) + `:is(${old}, ${tag}.${wasCls})` + comp.slice(old.length);
        });
        if (changed) r.selector = next.join(', ');
      });
      const n = doc.createElement(tag);
      for (const a of Array.from(el.attributes)) if (!drop.includes(a.name)) n.setAttribute(a.name, a.value);
      while (el.firstChild) n.appendChild(el.firstChild);
      el.replaceWith(n);
      return n;
    };
    const cls = (el) => (el.getAttribute('class') || '').toLowerCase();

    // 4a. Fake buttons → <button> / <a href>
    let btnCount = 0, linkCount = 0, roleCount = 0;
    (dom.clickables || []).forEach((c) => {
      const el = byId(c.id); if (!el) return;
      const url = (c.onclick.match(/(?:location(?:\.href)?\s*=\s*|window\.open\(\s*|navigate\(\s*)['"]([^'"]+)['"]/) || [])[1];
      if (c.blockKids) { el.setAttribute('role', url ? 'link' : 'button'); el.setAttribute('tabindex', '0'); roleCount++; return; }
      const n = retag(el, url ? 'a' : 'button', ['role', 'tabindex', 'href', ...(url ? ['onclick'] : [])]);
      if (url) { n.setAttribute('href', url); linkCount++; } else { n.setAttribute('type', 'button'); btnCount++; }
      n.classList.add('u-btn-reset'); used.btnReset = true;
      if (c.display === 'block' && !/flex|grid/.test(c.parentDisplay)) { n.classList.add('u-block'); used.block = true; }
    });
    (dom.linkButtons || []).forEach((c) => {
      const el = byId(c.id); if (!el) return;
      const n = retag(el, 'button', ['href', 'role', 'tabindex']);
      n.setAttribute('type', 'button'); n.classList.add('u-btn-reset'); used.btnReset = true; btnCount++;
    });
    if (btnCount) log('semantic', `Converted ${plural(btnCount, 'click-only <div>/<span>/<a>')} into native <button type="button"> (keyboard + screen-reader support for free).`);
    if (linkCount) log('semantic', `Converted ${plural(linkCount, 'scripted navigation element')} into real <a href> links.`);
    if (roleCount) log('semantic', `Added role="button" + tabindex="0" to ${plural(roleCount, 'clickable container')} that hold block content.`);

    // 4b. Fake headings → <hN>
    let haveH1 = !!doc.querySelector('h1');
    let fakeCount = 0;
    (dom.fakeHeadings || []).forEach((f) => {
      const el = byId(f.id); if (!el || !el.isConnected) return;
      let lvl;
      if (!haveH1) { lvl = 1; haveH1 = true; } else lvl = f.fs >= 28 ? 2 : f.fs >= 20 ? 3 : 4;
      const n = retag(el, 'h' + lvl, ['role', 'aria-level']);
      n.classList.add('u-heading-reset'); used.headingReset = true; fakeCount++;
    });
    if (fakeCount) log('semantic', `Promoted ${plural(fakeCount, 'visually-styled <div>')} to real headings.`);

    // 4c. Heading outline: one h1, no skipped levels
    let prev = 0, seenH1 = false, renum = 0;
    const anyH1 = !!doc.querySelector('h1');
    $$('h1,h2,h3,h4,h5,h6', doc).forEach((h) => {
      const lvl = +h.tagName[1];
      let target = lvl;
      if (lvl === 1 && seenH1) target = 2;
      else if (!anyH1 && prev === 0) target = 1;
      if (prev && target > prev + 1) target = prev + 1;
      if (target !== lvl) { retag(h, 'h' + target); renum++; }
      if (target === 1) seenH1 = true;
      prev = target;
    });
    if (renum) log('semantic', `Renumbered ${plural(renum, 'heading')} to remove skipped levels / duplicate <h1> (styles kept via :is() selectors).`);

    // 4d. Landmarks
    const landmarks = [];
    const outside = (el) => !el.parentElement || !el.parentElement.closest('header,nav,footer,aside,main');
    if (!doc.querySelector('header')) {
      const h = $$('div', doc.body).find((el) => outside(el) && /(^|[\s_-])(site-header|header|topbar|top-bar|masthead|navbar|nav-bar|appbar)([\s_-]|$)/.test(cls(el)) && !/(^|[\s_-])(card|panel|section|modal)/.test(cls(el)));
      if (h) { retag(h, 'header'); landmarks.push('<header>'); }
    }
    (dom.navGroups || []).forEach((id) => {
      const el = byId(id);
      if (!el || el.closest('nav') || /^(header|footer|main|aside|section)$/i.test(el.tagName)) return;
      if (el.tagName === 'DIV') { retag(el, 'nav'); landmarks.push('<nav>'); }
    });
    $$('div', doc.body).forEach((el) => {
      if (!el.isConnected || el.closest('nav')) return;
      const c = cls(el);
      if (/(^|[\s_-])(sidebar|side-bar|aside)([\s_-]|$)/.test(c)) {
        const items = el.querySelectorAll('a[href], button, [role="button"]').length;
        retag(el, items >= 3 ? 'nav' : 'aside'); landmarks.push(items >= 3 ? '<nav>' : '<aside>');
      } else if (/(^|[\s_-])(nav|navbar|nav-links|navigation|menu|main-nav|nav-menu)([\s_-]|$)/.test(c) && el.querySelectorAll('a[href], button').length >= 2) { retag(el, 'nav'); landmarks.push('<nav>'); }
    });
    if (!doc.querySelector('footer')) {
      const f = $$('div', doc.body).find((el) => outside(el) && /(^|[\s_-])(site-footer|footer)([\s_-]|$)/.test(cls(el)));
      if (f) { retag(f, 'footer'); landmarks.push('<footer>'); }
    }
    const navs = $$('nav', doc);
    if (navs.length > 1) navs.forEach((n) => { if (!n.hasAttribute('aria-label')) { const c = (n.getAttribute('class') || '').split(/\s+/)[0]; n.setAttribute('aria-label', c ? humanize(c.replace(/-inline-\d+$/, '')) : 'Secondary'); } });
    if (!doc.querySelector('main')) {
      const named = $$('div', doc.body).find((el) => outside(el) && /(^|[\s_-])(main|main-content|content|page-content)([\s_-]|$)/.test(cls(el)));
      const kids = Array.from(doc.body.children).filter((c) => !/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(c.tagName));
      if (named) { retag(named, 'main'); landmarks.push('<main>'); }
      else if (kids.length === 1 && kids[0].tagName === 'DIV') { retag(kids[0], 'main'); landmarks.push('<main>'); }
      else {
        const bodyInfo = dom.el[doc.body.getAttribute('data-aegis-id')] || {};
        const content = kids.filter((c) => !/^(HEADER|NAV|FOOTER|ASIDE)$/.test(c.tagName));
        if (content.length && !/flex|grid/.test(bodyInfo.display || '')) {
          const first = kids.indexOf(content[0]), last = kids.indexOf(content[content.length - 1]);
          const main = doc.createElement('main');
          kids[first].before(main);
          kids.slice(first, last + 1).forEach((k) => main.appendChild(k));
          landmarks.push('<main>');
        }
      }
    }
    $$('main > div, body > div', doc).forEach((el) => {
      if (/(^|[\s_-])(hero|features|pricing|plans|testimonials|faq|cta|section|stats|benefits|showcase)([\s_-]|$)/.test(cls(el)) && el.querySelector('h1,h2,h3,h4')) { retag(el, 'section'); landmarks.push('<section>'); }
    });
    if (landmarks.length) log('semantic', `Added landmarks: ${uniq(landmarks).join(', ')} (${landmarks.length} region${landmarks.length > 1 ? 's' : ''}).`);

    // 4e. Presentational tags
    let pres = 0;
    $$('b', doc).forEach((el) => { retag(el, 'strong'); pres++; });
    $$('i', doc).forEach((el) => { if (el.textContent.trim() && !/icon|fa-|bi-|material/.test(cls(el))) { retag(el, 'em'); pres++; } });
    $$('center', doc).forEach((el) => { const n = retag(el, 'div'); n.classList.add('u-center'); used.center = true; pres++; });
    $$('font', doc).forEach((el) => { retag(el, 'span', ['color', 'size', 'face']); pres++; });
    if (pres) log('semantic', `Replaced ${plural(pres, 'presentational tag')} (<b>, <i>, <center>, <font>) with semantic equivalents.`);

    /* --- 5. ARIA, names, forms ------------------------------------ */
    let alts = 0, names = 0, labels = 0, ac = 0, aria = 0, emoji = 0;
    $$('img:not([alt])', doc).forEach((img) => {
      if (/^(presentation|none)$/.test(img.getAttribute('role') || '')) return;
      const s = img.getAttribute('src') || '';
      const file = /^data:/.test(s) ? '' : (s.split(/[?#]/)[0].split('/').pop() || '');
      let alt = '';
      if (file && !/^(img|image|photo|pic|picture|\d+|[a-f0-9-]{8,})(\.\w+)?$/i.test(file)) alt = humanize(file);
      else { const c = (img.getAttribute('class') || '').split(/\s+/).find((x) => /avatar|logo|profile|user|hero|banner|photo/.test(x)); if (c) alt = humanize(c.replace(/-inline-\d+$/, '')); }
      img.setAttribute('alt', alt); alts++;
    });
    $$('button, a[href], [role="button"], [role="link"]', doc).forEach((el) => {
      const name = accName(el, doc);
      if (name && !GLYPH_ONLY_RE.test(name)) return;
      const label = deriveLabel(el) || (name ? null : 'Button');
      if (label) { el.setAttribute('aria-label', label); names++; }
    });
    $$('input, select, textarea', doc).forEach((el) => {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (/^(hidden|submit|button|reset|image)$/.test(type)) return;
      if (!accName(el, doc)) { el.setAttribute('aria-label', el.getAttribute('placeholder') || humanize(el.getAttribute('name') || el.id || type)); labels++; }
      if (!el.hasAttribute('autocomplete') && /^(email|password|tel)$/.test(type)) {
        const ctx = (doc.title + ' ' + doc.body.textContent).toLowerCase();
        el.setAttribute('autocomplete', type === 'email' ? 'email' : type === 'tel' ? 'tel' : /create account|sign up today|register/.test(ctx) && !/sign in|log in|welcome back/.test(ctx) ? 'new-password' : 'current-password');
        ac++;
      }
    });
    $$('[aria-hidden="true"]', doc).forEach((el) => { if (el.matches(FOCUSABLE_SEL) || el.querySelector(FOCUSABLE_SEL)) { el.removeAttribute('aria-hidden'); aria++; } });
    $$('[tabindex]', doc).forEach((el) => { if (+el.getAttribute('tabindex') > 0) { if (el.matches('a[href],button,input,select,textarea')) el.removeAttribute('tabindex'); else el.setAttribute('tabindex', '0'); aria++; } });
    $$('[role]', doc).forEach((el) => { const r = el.getAttribute('role').trim().split(/\s+/)[0].toLowerCase(); if (!VALID_ROLES.has(r)) { el.removeAttribute('role'); aria++; } });
    $$('div, p, span', doc).forEach((el) => { if (/(^|[\s_-])(error|alert|danger|form-error)([\s_-]|$)/.test(cls(el)) && el.textContent.trim() && !el.hasAttribute('role')) { el.setAttribute('role', 'alert'); aria++; } });
    // Decorative emoji: wrap leading emoji in headings/controls, hide emoji-only icon boxes
    $$('h1,h2,h3,h4,h5,h6,button,a,[role="button"],label', doc).forEach((el) => {
      const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const first = walker.nextNode();
      if (!first || first.parentElement.closest('[aria-hidden="true"]')) return;
      const m = first.textContent.match(LEADING_EMOJI_RE);
      if (!m || !first.textContent.slice(m[0].length).trim()) return;
      const span = doc.createElement('span'); span.setAttribute('aria-hidden', 'true'); span.textContent = m[2];
      first.textContent = m[3] + first.textContent.slice(m[0].length);
      first.before(span); emoji++;
    });
    $$('div, span', doc).forEach((el) => {
      if (!el.children.length && EMOJI_ONLY_RE.test(el.textContent) && el.textContent.trim() && !el.closest('button,a,[role="button"]') && !el.hasAttribute('aria-hidden')) { el.setAttribute('aria-hidden', 'true'); emoji++; }
    });
    if (alts) log('a11y', `Added alt text to ${plural(alts, 'image')} (derived from file/class names; verify wording).`);
    if (names) log('a11y', `Gave ${plural(names, 'icon-only control')} an accessible name via aria-label.`);
    if (labels) log('a11y', `Labelled ${plural(labels, 'form field')} with aria-label (consider a visible <label>).`);
    if (ac) log('a11y', `Added autocomplete purpose to ${plural(ac, 'field')} (WCAG 1.3.5).`);
    if (aria) log('a11y', `Cleaned ${plural(aria, 'ARIA / tabindex problem')} (aria-hidden on focusables, positive tabindex, invalid roles, error live regions).`);
    if (emoji) log('a11y', `Hid ${plural(emoji, 'decorative emoji', 'decorative emoji')} from screen readers with aria-hidden.`);
    if (isFullDoc) {
      if (!doc.documentElement.getAttribute('lang')) { doc.documentElement.setAttribute('lang', 'en'); log('a11y', 'Set <html lang="en"> (WCAG 3.1.1) — change it if the content is another language.'); }
      if (!(doc.title || '').trim()) { const t = doc.createElement('title'); t.textContent = ((doc.querySelector('h1') || {}).textContent || 'Untitled page').replace(/\p{Extended_Pictographic}|️/gu, '').trim(); doc.head.prepend(t); log('a11y', 'Added a <title> from the page heading.'); }
      const vp = doc.querySelector('meta[name="viewport"]');
      if (vp && /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0+)?(?![\d.])/i.test(vp.getAttribute('content') || '')) { vp.setAttribute('content', 'width=device-width, initial-scale=1'); log('a11y', 'Re-enabled pinch-zoom in the viewport meta (WCAG 1.4.4).'); }
      if (!vp) { const m = doc.createElement('meta'); m.setAttribute('name', 'viewport'); m.setAttribute('content', 'width=device-width, initial-scale=1'); doc.head.prepend(m); }
      if (!doc.querySelector('meta[charset]')) { const m = doc.createElement('meta'); m.setAttribute('charset', 'utf-8'); doc.head.prepend(m); }
    }

    /* --- 6. Token extraction -------------------------------------- */
    const rules = [];
    walkRules(sheet, (r, ctx) => { r._kf = ctx.keyframes; rules.push(r); });
    rules.push(...inlineRules);
    const roleOf = (p) => (/^(color|-webkit-text-fill-color|caret-color)$/.test(p) ? 'text' : /^background/.test(p) ? 'bg' : /^(border|outline|column-rule)/.test(p) ? 'border' : 'other');
    const firstFamily = (v) => (v.split(',')[0] || '').replace(/["']/g, '').trim().toLowerCase();
    const isLiteralShadow = (v) => v.trim() !== 'none' && !/var\(/.test(v) && /\d/.test(v);
    const normShadow = (v) => v.replace(/\s+/g, ' ').trim();
    const colorUse = new Map(), famUse = new Map(), shadowUse = new Map();
    let hasMotion = false;
    rules.forEach((r) => r.decls.forEach((d) => {
      const p = d.prop;
      if (p.startsWith('--')) return;
      if (/^(transition|animation)/.test(p)) hasMotion = true;
      if (p === 'box-shadow' && isLiteralShadow(d.value)) { const k = normShadow(d.value); shadowUse.set(k, (shadowUse.get(k) || 0) + 1); return; }
      if (p === 'font-family' && !/var\(/.test(d.value)) {
        const f = firstFamily(d.value);
        const u = famUse.get(f) || { stack: d.value.trim(), count: 0, heading: 0, mono: 0 };
        u.count++; if (isHeadingish(r.selector)) u.heading++; if (/(^|[\s,.>])(code|pre|kbd|samp|mono)/i.test(r.selector)) u.mono++;
        famUse.set(f, u); return;
      }
      const role = roleOf(p);
      findColors(stripVars(d.value), p).forEach((c) => {
        const k = normColor(c.text); if (!k) return;
        const u = colorUse.get(k) || { count: 0, roles: { text: 0, bg: 0, border: 0, other: 0 } };
        u.count++; u.roles[role]++; colorUse.set(k, u);
      });
    }));

    // Color clustering (near-duplicates collapse onto the most-used member)
    const keys = [...colorUse.keys()].sort((a, b) => (protectedColors.has(b) - protectedColors.has(a)) || colorUse.get(b).count - colorUse.get(a).count);
    const clusters = [];
    const keyToCluster = new Map();
    keys.forEach((k) => {
      const c = parseColor(k), u = colorUse.get(k);
      const cl = protectedColors.has(k) ? null : clusters.find((x) => { const rc = parseColor(x.rep); return Math.abs(rc.a - c.a) < 0.05 && deltaE(rc, c) < 4.5; });
      if (cl) { cl.members.push(k); cl.count += u.count; Object.keys(u.roles).forEach((r) => { cl.roles[r] += u.roles[r]; }); keyToCluster.set(k, cl); }
      else { const n = { rep: k, members: [k], count: u.count, roles: { ...u.roles } }; clusters.push(n); keyToCluster.set(k, n); }
    });
    const usedNames = new Set();
    clusters.forEach((cl) => {
      const c = parseColor(cl.rep), { h, s, l } = rgbToHsl(c);
      const step = clamp(Math.round((1 - l) * 20) * 50, 50, 950);
      cl.neutral = s < 0.12 || l > 0.97 || l < 0.03;
      let base = l >= 0.985 && cl.neutral ? 'white' : l <= 0.02 && cl.neutral ? 'black' : cl.neutral ? `neutral-${step}` : `${hueName(h)}-${step}`;
      if (c.a < 0.999) base += `-a${Math.round(c.a * 100)}`;
      let name = base, n = 2;
      while (usedNames.has(name)) name = `${base}-${n++}`;
      usedNames.add(name);
      cl.name = `--color-${name}`;
      cl.value = cssColor(c);
    });
    const merged = clusters.filter((cl) => cl.members.length > 1);
    const opaqueCl = (cl) => parseColor(cl.rep).a >= 0.999;
    const top = (role, pred, excl = []) => clusters.filter((cl) => cl.roles[role] > 0 && pred(cl) && !excl.includes(cl)).sort((a, b) => b.roles[role] - a.roles[role])[0];
    const A = {};
    A.text = top('text', opaqueCl);
    A['text-muted'] = top('text', (cl) => opaqueCl(cl) && cl.neutral, [A.text]);
    A.bg = top('bg', (cl) => opaqueCl(cl) && cl.neutral);
    A.surface = top('bg', (cl) => opaqueCl(cl) && cl.neutral, [A.bg]);
    A.primary = top('bg', (cl) => opaqueCl(cl) && !cl.neutral) || top('text', (cl) => opaqueCl(cl) && !cl.neutral);
    A.accent = top('bg', (cl) => opaqueCl(cl) && !cl.neutral, [A.primary]);
    A.border = top('border', () => true);
    const ALIAS_ROLES = { text: ['text'], 'text-muted': ['text'], bg: ['bg'], surface: ['bg'], primary: ['text', 'bg', 'border', 'other'], accent: ['text', 'bg', 'border', 'other'], border: ['border'] };
    const tokenFor = (cl, role) => {
      for (const [alias, roles] of Object.entries(ALIAS_ROLES)) if (A[alias] === cl && roles.includes(role)) return `--color-${alias}`;
      return cl.name;
    };
    const bgRep = A.bg ? parseColor(A.bg.rep) : { r: 255, g: 255, b: 255, a: 1 };
    const focusValue = A.primary && contrast(parseColor(A.primary.rep), bgRep) >= 3 ? `var(--color-primary)` : relLum(bgRep) > 0.4 ? '#1d4ed8' : '#93c5fd';

    // Shadows
    const shadowTok = new Map();
    const blurOf = (v) => { const nums = (v.split(/,(?![^(]*\))/)[0].match(/-?\d*\.?\d+(px)?/g) || []).map(parseFloat); return nums[2] || 0; };
    const shadowList = [...shadowUse.keys()].sort((a, b) => blurOf(a) - blurOf(b));
    const SH = shadowList.length <= 5 ? ['sm', 'md', 'lg', 'xl', '2xl'] : shadowList.map((_, i) => String(i + 1));
    shadowList.forEach((k, i) => shadowTok.set(k, { name: `--shadow-${SH[i]}`, value: k }));

    // Font families (≤ 2 + mono)
    const fams = [...famUse.entries()].map(([name, u]) => ({ name, ...u }));
    const monoF = fams.filter((f) => f.mono > 0 && f.mono >= f.count / 2);
    const rest = fams.filter((f) => !monoF.includes(f)).sort((a, b) => b.count - a.count);
    const headingF = rest.filter((f) => f.heading > 0 && f.heading >= f.count / 2).sort((a, b) => b.heading - a.heading)[0];
    const bodyF = rest.find((f) => f !== headingF) || headingF;
    const famTok = new Map(); const famDefs = new Map();
    const withGeneric = (stack) => (/\b(serif|sans-serif|monospace|system-ui|cursive|ui-sans-serif|ui-serif|ui-monospace)\b/.test(stack) ? stack : `${stack}, sans-serif`);
    fams.forEach((f) => {
      let tok;
      if (monoF.includes(f)) tok = '--font-mono';
      else if (f === headingF && headingF !== bodyF) tok = '--font-heading';
      else if (f === bodyF) tok = '--font-body';
      else tok = f.heading > 0 && headingF && headingF !== bodyF ? '--font-heading' : '--font-body';
      famTok.set(f.name, tok);
    });
    if (bodyF) famDefs.set('--font-body', withGeneric(bodyF.stack));
    if (headingF && headingF !== bodyF) famDefs.set('--font-heading', withGeneric(headingF.stack));
    if (monoF[0]) famDefs.set('--font-mono', /monospace/.test(monoF[0].stack) ? monoF[0].stack : `${monoF[0].stack}, monospace`);
    if (fams.length > famDefs.size) log('hierarchy', `Consolidated ${fams.length} font families into ${famDefs.size} token${famDefs.size > 1 ? 's' : ''} (${[...famDefs.keys()].join(', ')}).`);

    // Rewrite declarations
    const usedTok = { space: new Map(), text: new Map(), radius: new Map(), weight: new Map(), leading: new Map() };
    const stats = { important: 0, outline: 0, colors: 0, space: 0, text: 0, radius: 0, shadow: 0, leading: 0 };
    const snap = (kind, px) => {
      if (kind === 'space') { const [v, n] = nearest(SPACE_SCALE, px); return { name: `--space-${n}`, value: rem(v), px: v }; }
      if (kind === 'text') { const s = px < 16 ? TEXT_SCALE.find((x) => x[0] >= px - 0.01) || TEXT_SCALE[0] : px > 96 ? TEXT_SCALE[TEXT_SCALE.length - 1] : nearest(TEXT_SCALE, px); return { name: `--text-${s[1]}`, value: rem(s[0]), px: s[0] }; }
      if (px >= 28) return { name: '--radius-full', value: '9999px', px: 9999 };
      const [v, n] = nearest(RADIUS_SCALE, px); return { name: `--radius-${n}`, value: `${v}px`, px: v };
    };
    const replaceLengths = (value, kind) => {
      const s = stripVars(value);
      const ms = [...s.matchAll(/(-?\d*\.?\d+)(px|rem)\b/g)];
      let out = value;
      for (let i = ms.length - 1; i >= 0; i--) {
        const m = ms[i];
        let px = parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1);
        const neg = px < 0; px = Math.abs(px);
        if (kind === 'space' && (px <= 2 || px > 160)) continue;
        if (kind === 'radius' && px <= 2) continue;
        const tok = snap(kind, px);
        usedTok[kind].set(tok.name, tok);
        stats[kind]++;
        out = out.slice(0, m.index) + (neg ? `calc(var(${tok.name}) * -1)` : `var(${tok.name})`) + out.slice(m.index + m[0].length);
      }
      return out;
    };
    const replaceColors = (value, prop) => {
      const found = findColors(stripVars(value), prop);
      let out = value;
      for (let i = found.length - 1; i >= 0; i--) {
        const f = found[i];
        const cl = keyToCluster.get(normColor(f.text));
        if (!cl) continue;
        out = out.slice(0, f.index) + `var(${tokenFor(cl, roleOf(prop))})` + out.slice(f.index + f.text.length);
        stats.colors++;
      }
      return out;
    };
    rules.forEach((r) => {
      r.decls = r.decls.map((d) => {
        const p = d.prop;
        if (p.startsWith('--')) return d;
        if (d.important) { d.important = false; stats.important++; }
        if ((p === 'outline' || p === 'outline-style') && /^(none|0(px)?)$/i.test(d.value.trim())) { stats.outline++; return null; }
        if (p === 'box-shadow' && shadowTok.has(normShadow(d.value))) { d.value = `var(${shadowTok.get(normShadow(d.value)).name})`; stats.shadow++; return d; }
        if (p === 'font-family' && famTok.has(firstFamily(d.value)) && !/var\(/.test(d.value)) { d.value = `var(${famTok.get(firstFamily(d.value))})`; return d; }
        if (p === 'font-weight') {
          const w = d.value.trim() === 'bold' ? 700 : d.value.trim() === 'normal' ? 400 : /^\d{3}$/.test(d.value.trim()) ? clamp(Math.round(+d.value / 100) * 100, 100, 900) : null;
          if (w) { const name = `--font-weight-${WEIGHT_NAMES[w]}`; usedTok.weight.set(name, { name, value: String(w), px: w }); d.value = `var(${name})`; }
          return d;
        }
        if (p === 'line-height' && /^\d*\.?\d+$/.test(d.value.trim()) && parseFloat(d.value) < 1.3) {
          const tight = isHeadingish(r.selector);
          const name = tight ? '--leading-tight' : '--leading-normal';
          usedTok.leading.set(name, { name, value: tight ? '1.2' : '1.5', px: tight ? 1.2 : 1.5 });
          if (!tight) stats.leading++;
          d.value = `var(${name})`;
          return d;
        }
        d.value = replaceColors(d.value, p);
        if (SPACING_RE.test(p)) d.value = replaceLengths(d.value, 'space');
        else if (p === 'font-size') d.value = replaceLengths(d.value, 'text');
        else if (RADIUS_RE.test(p)) d.value = replaceLengths(d.value, 'radius');
        return d;
      }).filter(Boolean);
    });
    if (stats.colors) log('tokens', `Replaced ${plural(stats.colors, 'raw color')} with ${clusters.length} primitives + semantic aliases${merged.length ? `; merged ${merged.reduce((s, c) => s + c.members.length - 1, 0)} near-duplicates` : ''}.`);
    if (stats.space) log('tokens', `Snapped ${plural(stats.space, 'spacing value')} to a 4px grid (${usedTok.space.size} --space-* tokens, rem-based).`);
    if (stats.text) log('hierarchy', `Mapped ${plural(stats.text, 'font size')} onto a ${usedTok.text.size}-step type scale (sub-16px values round up for legibility).`);
    if (stats.radius) log('tokens', `Normalised ${plural(stats.radius, 'radius', 'radii')} to ${usedTok.radius.size} --radius-* tokens.`);
    if (stats.shadow) log('tokens', `Collapsed ${plural(shadowUse.size, 'box-shadow')} into elevation tokens.`);
    if (stats.leading) log('hierarchy', `Raised ${plural(stats.leading, 'tight line-height')} on body text to 1.5 (WCAG 1.4.12 friendly).`);
    if (stats.important) log('tokens', `Removed ${plural(stats.important, '!important flag')}.`);
    if (stats.outline) log('a11y', `Removed ${plural(stats.outline, 'outline: none reset')} and added a global :focus-visible ring (WCAG 2.4.7).`);
    if (contrastFixed) log('a11y', `Resolved contrast on ${plural(contrastFixed, 'color source')} — fixes live in the tokens, not per-element hacks.`);

    /* --- 7. Assemble the stylesheet ------------------------------- */
    const L = [];
    const section = (title, rows) => { if (!rows.length) return; L.push(`  /* ${title} */`); rows.forEach((r) => L.push(`  ${r.name}: ${r.value};`)); L.push(''); };
    const famOrder = (n) => { const m = n.match(/^--color-([a-z]+)/); return m ? m[1] : ''; };
    const primitives = [...clusters].sort((a, b) => famOrder(a.name).localeCompare(famOrder(b.name)) || a.name.localeCompare(b.name, undefined, { numeric: true }));
    section('Color · primitives', primitives.map((cl) => ({ name: cl.name, value: cl.value })));
    const aliasRows = Object.entries(A).filter(([, cl]) => cl).map(([alias, cl]) => ({ name: `--color-${alias}`, value: `var(${cl.name})` }));
    aliasRows.push({ name: '--color-focus', value: focusValue });
    section('Color · semantic aliases', aliasRows);
    const byScale = (m) => [...m.values()].sort((a, b) => a.px - b.px);
    section('Typography', [...[...famDefs.entries()].map(([name, value]) => ({ name, value })), ...byScale(usedTok.text), ...byScale(usedTok.weight), ...byScale(usedTok.leading)]);
    section('Spacing · 4px grid', byScale(usedTok.space));
    section('Radius', byScale(usedTok.radius));
    section('Elevation', [...shadowTok.values()]);
    if (preservedVars.length) section('Preserved from source', preservedVars.map((d) => ({ name: d.prop, value: d.value })));
    while (L.length && L[L.length - 1] === '') L.pop();
    const tokensCSS = `:root {\n${L.join('\n')}\n}`;

    const baseRules = [];
    baseRules.push({ type: 'rule', selector: ':where(a[href], button, input, select, textarea, summary, [tabindex], [role="button"]):focus-visible', decls: [{ prop: 'outline', value: '2px solid var(--color-focus)' }, { prop: 'outline-offset', value: '2px' }] });
    baseRules.push({ type: 'rule', selector: ':where(button, [role="button"])', decls: [{ prop: 'min-inline-size', value: '24px' }, { prop: 'min-block-size', value: '24px' }] });
    if (used.btnReset) baseRules.push({ type: 'rule', selector: '.u-btn-reset', decls: [{ prop: 'appearance', value: 'none' }, { prop: 'background', value: 'none' }, { prop: 'border', value: '0' }, { prop: 'margin', value: '0' }, { prop: 'padding', value: '0' }, { prop: 'font', value: 'inherit' }, { prop: 'color', value: 'inherit' }, { prop: 'text-align', value: 'inherit' }, { prop: 'text-decoration', value: 'none' }, { prop: 'cursor', value: 'pointer' }] });
    if (used.block) baseRules.push({ type: 'rule', selector: '.u-block', decls: [{ prop: 'display', value: 'block' }, { prop: 'width', value: '100%' }] });
    if (used.headingReset) baseRules.push({ type: 'rule', selector: '.u-heading-reset', decls: [{ prop: 'margin', value: '0' }, { prop: 'font-size', value: 'inherit' }, { prop: 'font-weight', value: 'inherit' }, { prop: 'line-height', value: 'inherit' }] });
    if (used.center) baseRules.push({ type: 'rule', selector: '.u-center', decls: [{ prop: 'text-align', value: 'center' }] });
    if (hasMotion) baseRules.push({ type: 'at', prelude: '@media (prefers-reduced-motion: reduce)', children: [{ type: 'rule', selector: '*, *::before, *::after', decls: [{ prop: 'animation-duration', value: '0.01ms', important: true }, { prop: 'transition-duration', value: '0.01ms', important: true }, { prop: 'scroll-behavior', value: 'auto', important: true }] }] });

    const parts = [
      '/* ==========================================================\n   Design tokens — generated by Aegis UI Slop Auditor\n   ========================================================== */',
      tokensCSS,
      '/* ---------- Accessibility base ---------- */',
      serializeCSS(baseRules),
      '/* ---------- Components ---------- */',
      serializeCSS(sheet),
    ];
    if (inlineRules.length) parts.push('/* ---------- Extracted from inline styles ---------- */', serializeCSS(inlineRules));
    const css = parts.filter(Boolean).join('\n\n');

    /* --- 8. Serialize ---------------------------------------------- */
    $$('[data-aegis-id]', doc).forEach((el) => el.removeAttribute('data-aegis-id'));
    let code;
    const indentCSS = (s, pad) => s.split('\n').map((l) => (l ? pad + l : l)).join('\n');
    if (isFullDoc) {
      const st = doc.createElement('style');
      st.textContent = '\n' + indentCSS(css, '    ') + '\n  ';
      doc.head.appendChild(doc.createTextNode('  '));
      doc.head.appendChild(st);
      doc.head.appendChild(doc.createTextNode('\n'));
      code = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML.replace(/<\/head><body/, '</head>\n<body') + '\n';
    } else {
      const extras = $$('head > *', doc).filter((e) => e.tagName !== 'STYLE').map((e) => e.outerHTML).join('\n');
      code = (extras ? extras + '\n' : '') + `<style>\n${indentCSS(css, '  ')}\n</style>\n\n` + doc.body.innerHTML.trim() + '\n';
    }
    code = code.replace(/[ \t]+$/gm, '');

    const tokens = {
      colors: primitives.map((cl) => ({ name: cl.name, value: cl.value, members: cl.members, count: cl.count })),
      aliases: aliasRows,
      groups: [
        ['Typography', [...[...famDefs.entries()].map(([name, value]) => ({ name, value })), ...byScale(usedTok.text), ...byScale(usedTok.weight), ...byScale(usedTok.leading)]],
        ['Spacing', byScale(usedTok.space)], ['Radius', byScale(usedTok.radius)], ['Elevation', [...shadowTok.values()]],
      ],
    };
    return { code, changes, tokens };
  }

  /* ================================================================
   * 9. Line diff (LCS)
   * ================================================================ */
  function diffLines(a, b) {
    const A = a.replace(/\s+$/, '').split('\n'), B = b.replace(/\s+$/, '').split('\n');
    const n = A.length, m = B.length;
    const ops = [];
    if (n * m > 4e6) { A.forEach((_, i) => ops.push({ t: 'del', a: i })); B.forEach((_, j) => ops.push({ t: 'add', b: j })); return { A, B, ops }; }
    const W = m + 1;
    const dp = new Uint32Array((n + 1) * W);
    const eq = (i, j) => A[i].trim() === B[j].trim();
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i * W + j] = eq(i, j) ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (eq(i, j)) { ops.push({ t: A[i] === B[j] ? 'eq' : 'mod', a: i, b: j }); i++; j++; }
      else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) ops.push({ t: 'del', a: i++ });
      else ops.push({ t: 'add', b: j++ });
    }
    while (i < n) ops.push({ t: 'del', a: i++ });
    while (j < m) ops.push({ t: 'add', b: j++ });
    return { A, B, ops };
  }
  function renderDiff({ A, B, ops }) {
    const rows = [];
    let dels = [], adds = [];
    const flush = () => {
      const k = Math.max(dels.length, adds.length);
      for (let x = 0; x < k; x++) rows.push({ t: 'chg', a: dels[x], b: adds[x] });
      dels = []; adds = [];
    };
    ops.forEach((o) => {
      if (o.t === 'del') dels.push(o.a);
      else if (o.t === 'add') adds.push(o.b);
      else { flush(); rows.push({ t: 'eq', a: o.a, b: o.b }); }
    });
    flush();
    const cell = (side, idx, cls) => (idx === undefined ? '<td class="ln"></td><td class="code empty"></td>' : `<td class="ln">${idx + 1}</td><td class="code ${cls}">${esc((side === 'a' ? A : B)[idx]) || ' '}</td>`);
    let html = '', run = [];
    let added = 0, removed = 0;
    const flushEq = () => {
      if (run.length > 8) {
        run.slice(0, 3).forEach((r) => { html += `<tr>${cell('a', r.a, '')}${cell('b', r.b, '')}</tr>`; });
        html += `<tr class="fold"><td colspan="4">⋯ ${run.length - 6} unchanged lines</td></tr>`;
        run.slice(-3).forEach((r) => { html += `<tr>${cell('a', r.a, '')}${cell('b', r.b, '')}</tr>`; });
      } else run.forEach((r) => { html += `<tr>${cell('a', r.a, '')}${cell('b', r.b, '')}</tr>`; });
      run = [];
    };
    rows.forEach((r) => {
      if (r.t === 'eq') { run.push(r); return; }
      flushEq();
      if (r.a !== undefined) removed++;
      if (r.b !== undefined) added++;
      html += `<tr>${cell('a', r.a, 'del')}${cell('b', r.b, 'add')}</tr>`;
    });
    flushEq();
    return { html: `<table class="diff"><colgroup><col class="c-ln"><col><col class="c-ln"><col></colgroup><thead><tr><th colspan="2">Original</th><th colspan="2">Refactored</th></tr></thead><tbody>${html}</tbody></table>`, added, removed };
  }

  /* ================================================================
   * 10. Syntax highlighter (HTML + embedded CSS)
   * ================================================================ */
  function hlValue(v) {
    const re = /(var\(\s*--[\w-]+[^)]*\))|(#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\))|(-?\d*\.?\d+px\b)|(-?\d*\.?\d+(?:%|rem|em|vh|vw|s|ms|deg|fr|ch)?)|(!\s*important)|("[^"]*"|'[^']*')/g;
    let out = '', last = 0, m;
    while ((m = re.exec(v))) {
      out += esc(v.slice(last, m.index));
      const cls = m[1] ? 'tk-var' : m[2] ? 'tk-hard' : m[3] ? 'tk-px' : m[4] ? 'tk-num' : m[5] ? 'tk-imp' : 'tk-str';
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(v.slice(last));
  }
  function hlDecl(text) {
    const m = text.match(/^(\s*)([-\w]+)(\s*:)([\s\S]*)$/);
    if (!m) return esc(text);
    return `${esc(m[1])}<span class="${m[2].startsWith('--') ? 'tk-var' : 'tk-prop'}">${esc(m[2])}</span>${esc(m[3])}${hlValue(m[4])}`;
  }
  function hlPrelude(text) {
    const m = text.match(/^(\s*)(@[\w-]+)([\s\S]*)$/);
    if (m) return `${esc(m[1])}<span class="tk-at">${esc(m[2])}</span>${esc(m[3])}`;
    const lead = text.match(/^\s*/)[0];
    const trail = text.slice(lead.length).match(/\s*$/)[0];
    const core = text.slice(lead.length, text.length - trail.length);
    return esc(lead) + (core ? `<span class="tk-sel">${esc(core)}</span>` : '') + esc(trail);
  }
  function hlCSS(src) {
    let out = '', buf = '', i = 0;
    const stack = [];
    const inDecl = () => stack.length && stack[stack.length - 1] === 'decl';
    const flush = () => { if (!buf) return; out += inDecl() ? hlDecl(buf) : hlPrelude(buf); buf = ''; };
    while (i < src.length) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const end = e < 0 ? src.length : e + 2; flush(); out += `<span class="tk-com">${esc(src.slice(i, end))}</span>`; i = end; continue; }
      if (c === '"' || c === "'") { let k = i + 1; while (k < src.length && src[k] !== c && src[k] !== '\n') { if (src[k] === '\\') k++; k++; } buf += src.slice(i, k + 1); i = k + 1; continue; }
      if (c === '{') { const pre = buf; out += hlPrelude(buf); buf = ''; stack.push(/^\s*@(media|supports|container|layer|document|scope)|^\s*@[\w-]*keyframes/i.test(pre) ? 'group' : 'decl'); out += '<span class="tk-punc">{</span>'; i++; continue; }
      if (c === '}') { flush(); stack.pop(); out += '<span class="tk-punc">}</span>'; i++; continue; }
      if (c === ';' && inDecl()) { flush(); out += '<span class="tk-punc">;</span>'; i++; continue; }
      buf += c; i++;
    }
    flush();
    return out;
  }
  function hlTag(tag) {
    const m = tag.match(/^(<\/?)([\w:-]+)([\s\S]*?)(\/?>)?$/);
    if (!m) return esc(tag);
    const attrs = m[3].replace(/(\s+)|([^\s=]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+))?/g, (all, ws, name, eq, val) => {
      if (ws) return ws;
      let out = `<span class="tk-attr">${esc(name)}</span>`;
      if (eq) {
        out += esc(eq);
        if (name.toLowerCase() === 'style' && val && /^["']/.test(val)) {
          const q = val[0], inner = val.slice(1, val.endsWith(q) ? -1 : undefined);
          out += `<span class="tk-str">${q}</span>` + inner.split(';').map(hlDecl).join('<span class="tk-punc">;</span>') + (val.endsWith(q) && val.length > 1 ? `<span class="tk-str">${q}</span>` : '');
        } else if (val) out += `<span class="tk-str">${esc(val)}</span>`;
      }
      return out;
    });
    return `<span class="tk-punc">${esc(m[1])}</span><span class="tk-tag">${esc(m[2])}</span>${attrs}<span class="tk-punc">${esc(m[4] || '')}</span>`;
  }
  function hlHTML(src) {
    const re = /(<!--[\s\S]*?(?:-->|$))|(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>|$)|(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>|$)|(<!doctype[^>]*>)|(<\/?[a-zA-Z][\w:-]*(?:"[^"]*"|'[^']*'|[^'">])*>?)/gi;
    let out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += `<span class="tk-com">${esc(m[1])}</span>`;
      else if (m[2]) out += hlTag(m[2]) + hlCSS(m[3]) + (m[4] ? hlTag(m[4]) : '');
      else if (m[5]) out += hlTag(m[5]) + `<span class="tk-js">${esc(m[6])}</span>` + (m[7] ? hlTag(m[7]) : '');
      else if (m[8]) out += `<span class="tk-doc">${esc(m[8])}</span>`;
      else if (m[9]) out += hlTag(m[9]);
      last = re.lastIndex;
      if (m[0] === '') re.lastIndex++;
    }
    return out + esc(src.slice(last));
  }

  /* ================================================================
   * 11. X-Ray overlay (rendered inside the preview document)
   * ================================================================ */
  const XRAY_CSS = `
    #aegis-xray{position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;font:600 11px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:0;text-transform:none;text-align:left}
    #aegis-xray *{box-sizing:border-box}
    #aegis-xray .ax-box{position:absolute;outline:2px dashed rgba(239,68,68,.95);outline-offset:-1px;background:rgba(239,68,68,.06);border-radius:2px;transition:background-color .15s}
    #aegis-xray .ax-box.is-hot{background:rgba(239,68,68,.2);outline-style:solid}
    #aegis-xray .ax-box.is-flash{animation:ax-flash 1.4s ease-out 1}
    @keyframes ax-flash{0%{background:rgba(239,68,68,.45);outline-width:4px}100%{background:rgba(239,68,68,.06)}}
    #aegis-xray .ax-badge{position:absolute;pointer-events:auto;cursor:pointer;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:#dc2626;color:#fff;display:flex;align-items:center;justify-content:center;gap:3px;box-shadow:0 0 0 2px #fff,0 2px 8px rgba(0,0,0,.35);border:0;font:inherit}
    #aegis-xray .ax-badge.sev-critical{background:#b91c1c}
    #aegis-xray .ax-badge:hover{transform:scale(1.12)}
    #aegis-xray .ax-badge::before{content:"!";font-weight:800;opacity:.85}
    #aegis-xray .ax-tip{position:absolute;width:280px;background:#0f1117;color:#f3f4f6;padding:10px 12px;border-radius:10px;font:500 12px/1.45 ui-sans-serif,system-ui,sans-serif;box-shadow:0 12px 32px rgba(0,0,0,.45);border:1px solid #2a2f3a;pointer-events:none}
    #aegis-xray .ax-tip b{display:block;color:#fca5a5;font-size:10px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}
    #aegis-xray .ax-tip li{margin:0 0 4px 14px;padding:0}
    #aegis-xray .ax-tip ul{margin:0;padding:0}
    #aegis-xray .ax-tip em{font-style:normal;color:#9ca3af}`;

  function renderXRay(frame, issues, opts) {
    const doc = frame.contentDocument, win = frame.contentWindow;
    if (!doc || !doc.body) return;
    const old = doc.getElementById('aegis-xray');
    if (old) old.remove();
    if (!opts.enabled) return;
    if (!doc.getElementById('aegis-xray-style')) {
      const st = doc.createElement('style'); st.id = 'aegis-xray-style'; st.textContent = XRAY_CSS; doc.head.appendChild(st);
    }
    const layer = doc.createElement('div');
    layer.id = 'aegis-xray';
    layer.setAttribute('aria-hidden', 'true');
    const byEl = new Map();
    issues.filter((i) => opts.layers.has(i.pillar)).forEach((i) => (i.elIds || []).slice(0, 8).forEach((id) => { if (!byEl.has(id)) byEl.set(id, []); byEl.get(id).push(i); }));
    const docW = Math.max(doc.documentElement.scrollWidth, win.innerWidth);
    const placed = [];
    byEl.forEach((list, id) => {
      const el = doc.querySelector(`[data-aegis-id="${id}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const x = r.left + win.scrollX, y = r.top + win.scrollY;
      const box = doc.createElement('div');
      box.className = 'ax-box'; box.dataset.id = id;
      Object.assign(box.style, { left: x + 'px', top: y + 'px', width: r.width + 'px', height: r.height + 'px' });
      layer.appendChild(box);
      let bx = clamp(x - 6, 2, docW - 30), by = Math.max(2, y - 10);
      let guard = 0;
      while (placed.some((p) => Math.abs(p.x - bx) < 26 && Math.abs(p.y - by) < 18) && guard++ < 30) bx += 28;
      placed.push({ x: bx, y: by });
      const badge = doc.createElement('div');
      const worst = list.reduce((w, i) => (SEV[i.sev].w > SEV[w].w ? i.sev : w), 'minor');
      badge.className = `ax-badge sev-${worst}`;
      badge.dataset.id = id;
      badge.textContent = String(list.length);
      Object.assign(badge.style, { left: bx + 'px', top: by + 'px' });
      layer.appendChild(badge);
    });
    doc.documentElement.appendChild(layer);
    let tip = null;
    const hideTip = () => { if (tip) { tip.remove(); tip = null; } $$('.ax-box.is-hot', layer).forEach((b) => b.classList.remove('is-hot')); };
    layer.addEventListener('mouseover', (e) => {
      const b = e.target.closest && e.target.closest('.ax-badge');
      if (!b) return;
      hideTip();
      const list = byEl.get(b.dataset.id) || [];
      const box = layer.querySelector(`.ax-box[data-id="${b.dataset.id}"]`);
      if (box) box.classList.add('is-hot');
      tip = doc.createElement('div'); tip.className = 'ax-tip';
      tip.innerHTML = `<b>${plural(list.length, 'issue')} · click to inspect</b><ul>${list.slice(0, 6).map((i) => `<li>${esc(i.title)} <em>${esc(SEV[i.sev].label)}</em></li>`).join('')}${list.length > 6 ? `<li><em>+${list.length - 6} more</em></li>` : ''}</ul>`;
      const bl = parseFloat(b.style.left), bt = parseFloat(b.style.top);
      Object.assign(tip.style, { left: clamp(bl, 4, Math.max(4, docW - 290)) + 'px', top: bt + 26 + 'px' });
      layer.appendChild(tip);
    });
    layer.addEventListener('mouseout', (e) => { if (e.target.closest && e.target.closest('.ax-badge')) hideTip(); });
    layer.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.ax-badge');
      if (b && opts.onPick) { e.preventDefault(); e.stopPropagation(); opts.onPick(b.dataset.id, byEl.get(b.dataset.id) || []); }
    });
  }
  function flashInFrame(frame, id) {
    const doc = frame.contentDocument, win = frame.contentWindow;
    if (!doc) return;
    const el = doc.querySelector(`[data-aegis-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => {
      let layer = doc.getElementById('aegis-xray');
      if (!layer) { layer = doc.createElement('div'); layer.id = 'aegis-xray'; doc.documentElement.appendChild(layer); if (!doc.getElementById('aegis-xray-style')) { const st = doc.createElement('style'); st.id = 'aegis-xray-style'; st.textContent = XRAY_CSS; doc.head.appendChild(st); } }
      const r = el.getBoundingClientRect();
      const box = doc.createElement('div');
      box.className = 'ax-box is-flash';
      Object.assign(box.style, { left: r.left + win.scrollX + 'px', top: r.top + win.scrollY + 'px', width: r.width + 'px', height: r.height + 'px' });
      layer.appendChild(box);
      setTimeout(() => box.remove(), 1500);
    }, 350);
  }

  /* ================================================================
   * 12. Presets — four flavours of “Bad AI UI”
   * ================================================================ */
  const PRESETS = [
    {
      id: 'saas', name: 'Gradient SaaS Landing', tag: 'ChatGPT-style one-shot',
      code: `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
body { margin: 0; font-family: 'Poppins', sans-serif; background: #ffffff; color: #333; }
.navbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 50px; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.logo { font-size: 26px; font-weight: 700; color: #667eea; }
.nav-links { display: flex; gap: 30px; }
.nav-links a { color: #999; text-decoration: none; font-size: 15px; }
.hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 100px 50px; text-align: center; color: white; }
.hero-title { font-size: 52px; font-weight: 800; margin-bottom: 20px; }
.hero-subtitle { font-size: 19px; color: rgba(255,255,255,0.7); max-width: 600px; margin: 0 auto 40px; line-height: 1.2; }
.btn-primary { display: inline-block; background: #ff6b6b; color: #fff; padding: 15px 35px; border-radius: 30px; font-size: 17px; font-weight: 600; cursor: pointer; box-shadow: 0 10px 30px rgba(255,107,107,0.4); }
.btn-primary:focus { outline: none; }
.features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; padding: 80px 50px; background: #f8f9fa; }
.feature-card { background: #fff; padding: 35px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }
.feature-icon { font-size: 40px; margin-bottom: 15px; }
.feature-title { font-size: 22px; font-weight: 700; color: #2d3748; margin-bottom: 10px; }
.feature-text { font-size: 14px; color: #a0aec0; line-height: 1.6; }
.footer { padding: 30px; text-align: center; background: #2d3748; color: #718096; font-size: 13px; }
</style>
</head>
<body>
<div class="navbar">
  <div class="logo">✨ SynthAI</div>
  <div class="nav-links">
    <a href="#">Features</a>
    <a href="#">Pricing</a>
    <a href="#">About</a>
    <a href="#">Contact</a>
  </div>
</div>
<div class="hero">
  <div class="hero-title">🚀 Supercharge Your Workflow with AI</div>
  <div class="hero-subtitle">Unlock the power of artificial intelligence to transform the way you work. Seamlessly integrate cutting-edge technology into your daily tasks.</div>
  <div class="btn-primary" onclick="signup()">Get Started Free →</div>
</div>
<div class="features">
  <div class="feature-card">
    <div class="feature-icon">⚡</div>
    <div class="feature-title">Lightning Fast</div>
    <div class="feature-text">Experience blazing-fast performance that keeps up with your ambitions and scales effortlessly with your team.</div>
  </div>
  <div class="feature-card">
    <div class="feature-icon">🔒</div>
    <div class="feature-title">Secure by Default</div>
    <div class="feature-text">Enterprise-grade security keeps your data safe, so you can focus on what truly matters: innovation.</div>
  </div>
  <div class="feature-card">
    <div class="feature-icon">🎯</div>
    <div class="feature-title">Laser Focused</div>
    <div class="feature-text">Our intelligent algorithms surface exactly what you need, exactly when you need it. No noise.</div>
  </div>
</div>
<div class="footer">© 2026 SynthAI. All rights reserved.</div>
</body>
</html>
`,
    },
    {
      id: 'dashboard', name: 'Div-Soup Dashboard', tag: 'Cursor-style inline styles',
      code: `<style>
  .dashboard { display: flex; min-height: 100vh; background: #f4f5f7; font-family: Inter, Arial, sans-serif; }
  .sidebar { width: 220px; background: #1a1d23; padding: 20px 14px; }
  .sidebar-item { color: #6b7280; padding: 10px 13px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-bottom: 3px; }
  .sidebar-item.active { background: #2a2e37; color: #ffffff !important; }
  .main { flex: 1; padding: 28px 34px; }
  .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 26px; }
  .page-title { font-size: 25px; font-weight: 700; color: #333; }
  .icon-btn { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; cursor: pointer; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
  .stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px 22px; }
  .stat-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
  .stat-value { font-size: 30px; font-weight: 700; color: #343434; margin-top: 6px; }
  .stat-delta { font-size: 12px; color: #22c55e; }
  .panel { background: #ffffff; border: 1px solid #e6e8eb; border-radius: 11px; padding: 22px; margin-top: 22px; }
  .panel-header { font-size: 17px; font-weight: 600; color: #3a3a3a; margin-bottom: 14px; }
  .row { display: flex; justify-content: space-between; padding: 11px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #555; }
</style>
<div class="dashboard">
  <div class="sidebar">
    <div class="logo" style="color:#fff;font-size:19px;font-weight:700;margin-bottom:28px;padding:0 13px">⚡ Metricly</div>
    <div class="sidebar-item active" onclick="go('home')">🏠 Dashboard</div>
    <div class="sidebar-item" onclick="go('analytics')">📊 Analytics</div>
    <div class="sidebar-item" onclick="go('customers')">👥 Customers</div>
    <div class="sidebar-item" onclick="go('settings')">⚙️ Settings</div>
  </div>
  <div class="main">
    <div class="topbar">
      <div class="page-title">Overview</div>
      <div style="display:flex;gap:4px;align-items:center">
        <span class="icon-btn" onclick="search()">🔍</span>
        <span class="icon-btn" onclick="notify()">🔔</span>
        <img class="avatar" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23c7d2fe'/%3E%3C/svg%3E" style="width:32px;height:32px;border-radius:50%;margin-left:10px">
      </div>
    </div>
    <div class="stats">
      <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">$48,291</div><div class="stat-delta">↑ 12.5% vs last month</div></div>
      <div class="stat-card"><div class="stat-label">Users</div><div class="stat-value">2,847</div><div class="stat-delta">↑ 8.1% vs last month</div></div>
      <div class="stat-card"><div class="stat-label">Churn</div><div class="stat-value">1.9%</div><div class="stat-delta" style="color:#ef4444">↓ 0.4% vs last month</div></div>
      <div class="stat-card"><div class="stat-label">MRR</div><div class="stat-value">$12.4k</div><div class="stat-delta">↑ 3.2% vs last month</div></div>
    </div>
    <div class="panel">
      <div class="panel-header">Recent Transactions</div>
      <div class="row"><span>Acme Corp</span><span style="color:#999;font-size:12px">2 min ago</span><span style="font-weight:600;color:#333">$1,200.00</span></div>
      <div class="row"><span>Globex Inc</span><span style="color:#999;font-size:12px">1 hour ago</span><span style="font-weight:600;color:#333">$890.00</span></div>
      <div class="row"><span>Initech</span><span style="color:#999;font-size:12px">3 hours ago</span><span style="font-weight:600;color:#333">$2,450.00</span></div>
    </div>
  </div>
</div>
`,
    },
    {
      id: 'login', name: 'Glassmorphism Login', tag: 'Trend-chasing auth form',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
<title>Login</title>
<style>
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(45deg, #ff9a9e, #fad0c4, #a18cd1); font-family: 'Segoe UI', sans-serif; }
.glass { width: 380px; padding: 45px 38px; background: rgba(255,255,255,0.25); backdrop-filter: blur(12px); border-radius: 22px; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 8px 32px rgba(31,38,135,0.2); }
.title { font-size: 31px; font-weight: 700; color: #fff; text-align: center; margin-bottom: 7px; }
.subtitle { font-size: 14px; color: rgba(255,255,255,0.8); text-align: center; margin-bottom: 33px; }
input { width: 100%; box-sizing: border-box; padding: 13px 17px; margin-bottom: 17px; border: 1px solid rgba(255,255,255,0.5); border-radius: 11px; background: rgba(255,255,255,0.2); color: #fff; font-size: 15px; outline: none; }
input::placeholder { color: rgba(255,255,255,0.7); }
.error { color: #ff6b6b; font-size: 12px; margin: -8px 0 14px; }
.options { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #fff; margin-bottom: 25px; }
.forgot { color: #fff; }
.login-btn { background: #fff; color: #a18cd1; text-align: center; padding: 14px; border-radius: 11px; font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.3s ease; }
.login-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
.divider { text-align: center; color: rgba(255,255,255,0.6); font-size: 12px; margin: 22px 0; }
.socials { display: flex; justify-content: center; gap: 3px; }
.social { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.signup { text-align: center; font-size: 13px; color: rgba(255,255,255,0.75); margin-top: 28px; }
.signup a { color: #fff; font-weight: 600; }
</style>
</head>
<body>
<div class="glass">
  <div class="title">Welcome Back 👋</div>
  <div class="subtitle">Please enter your details to sign in</div>
  <input type="email" placeholder="Email address" tabindex="2">
  <input type="password" placeholder="Password" tabindex="1">
  <div class="error">Invalid password. Please try again.</div>
  <div class="options">
    <label><input type="checkbox" style="width:auto;margin:0 6px 0 0"> Remember me</label>
    <a href="#" class="forgot" aria-hidden="true">Forgot password?</a>
  </div>
  <div class="login-btn" onclick="login()">Sign In</div>
  <div class="divider">— OR CONTINUE WITH —</div>
  <div class="socials">
    <div class="social" onclick="google()"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#fff"/></svg></div>
    <div class="social" onclick="github()"><svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fff"/></svg></div>
    <div class="social" onclick="apple()"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l9 18H3z" fill="#fff"/></svg></div>
  </div>
  <div class="signup">Don't have an account? <a href="javascript:void(0)" onclick="signup()">Sign up</a></div>
</div>
</body>
</html>
`,
    },
    {
      id: 'pricing', name: 'Pricing Page Chaos', tag: 'Copy-paste component mashup',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
<title>Pricing</title>
<style>
body { font-family: Arial, sans-serif; margin: 0; padding: 40px 20px; background: #fafafa; color: #444; }
h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 44px; text-align: center; color: #111; margin: 0 0 10px; }
.sub { text-align: center; color: #888; font-size: 17px; margin: 0 0 50px; font-weight: normal; }
.plans { display: flex; gap: 25px; justify-content: center; flex-wrap: wrap; }
.plan { background: white; width: 290px; padding: 30px 25px; border-radius: 14px; border: 2px solid #eee; text-align: center; position: relative; }
.plan.popular { border-color: #8b5cf6; transform: scale(1.05); box-shadow: 0 20px 50px rgba(139,92,246,0.25); }
.badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: #fde047; color: #fff; font-size: 11px; font-weight: 700; padding: 5px 13px; border-radius: 20px; }
.plan h4 { font-family: 'Courier New', monospace; font-size: 21px; margin: 10px 0; color: #222; }
.price { font-size: 46px; font-weight: 900; color: #111; }
.price span { font-size: 15px; color: #aaa; font-weight: 400; }
.desc { font-size: 13.5px; color: #999; margin: 12px 0 20px; line-height: 1.25; }
.feature { font-size: 14px; padding: 9px 0; border-bottom: 1px dashed #eee; color: #666; }
.cta { display: block; margin-top: 25px; padding: 14px; border-radius: 9px; color: white; font-weight: 700; font-size: 15px; text-decoration: none; cursor: pointer; }
.cta.blue { background: #3b82f6; }
.cta.purple { background: #8b5cf6; }
.cta.green { background: #10b981; }
.faq { max-width: 640px; margin: 60px auto 0; }
.faq-q { font-size: 18px; font-weight: bold; color: #222; margin-top: 24px; }
.faq-a { font-size: 15px; color: #777; margin-top: 6px; line-height: 1.2; }
</style>
</head>
<body>
<h1>Simple, Transparent Pricing</h1>
<h1 class="sub">No hidden fees. Cancel anytime. Upgrade or downgrade whenever you like.</h1>
<div class="plans">
  <div class="plan">
    <h4>Starter</h4>
    <div class="price">$9<span>/month</span></div>
    <div class="desc">Perfect for individuals and small side projects getting off the ground.</div>
    <div class="feature">✓ 5 projects</div>
    <div class="feature">✓ 10 GB storage</div>
    <div class="feature">✓ Email support</div>
    <a href="#" class="cta blue">Get Started</a>
  </div>
  <div class="plan popular">
    <div class="badge">MOST POPULAR</div>
    <h4>Pro</h4>
    <div class="price">$29<span>/month</span></div>
    <div class="desc">For growing teams that need more power, more seats and more flexibility.</div>
    <div class="feature">✓ Unlimited projects</div>
    <div class="feature">✓ 100 GB storage</div>
    <div class="feature">✓ Priority support</div>
    <a href="#" class="cta purple">Start Free Trial</a>
  </div>
  <div class="plan">
    <h4>Enterprise</h4>
    <div class="price">$99<span>/month</span></div>
    <div class="desc">Advanced security, SSO and dedicated success management for large orgs.</div>
    <div class="feature">✓ Everything in Pro</div>
    <div class="feature">✓ SSO &amp; SAML</div>
    <div class="feature">✓ Dedicated manager</div>
    <a class="cta green" onclick="contactSales()">Contact Sales</a>
  </div>
</div>
<br><br>
<center><b>Have questions?</b> <font color="#999">We have answers.</font></center>
<div class="faq">
  <div class="faq-q">Can I change plans later?</div>
  <div class="faq-a">Absolutely! You can upgrade or downgrade your plan at any time from your account settings, and we will prorate the difference automatically on your next invoice.</div>
  <div class="faq-q">Do you offer refunds?</div>
  <div class="faq-a">Yes, we offer a 30-day money-back guarantee on all plans, no questions asked. Simply reach out to our support team and we will process it within two business days.</div>
</div>
</body>
</html>
`,
    },
  ];

  /* ================================================================
   * 13. App UI
   * ================================================================ */
  const ui = {
    code: $('#code'), hl: $('#highlight'), gutter: $('#gutter'), lineHl: $('#line-hl'), editor: $('#editor'),
    meta: $('#editor-meta'), preview: $('#preview'), sandbox: $('#sandbox'), stage: $('#preview-stage'),
    ring: $('#score-ring-value'), scoreNum: $('#score-num'), grade: $('#score-grade'), gradeLabel: $('#score-grade-label'),
    sevSummary: $('#sev-summary'), pillars: $('#pillars'), issues: $('#issues'), docInfo: $('#doc-info'),
    status: $('#audit-status'), toasts: $('#toasts'), dialog: $('#rf-dialog'), auto: $('#auto-audit'),
    xray: $('#xray-toggle'), layerBtns: $$('[data-layer]'), presetBtns: $('#presets'),
  };
  const state = { result: null, seq: 0, layers: new Set(Object.keys(PILLARS)), filter: 'all', refactor: null, escTab: false, viewport: 'desktop' };
  const LS_CODE = 'aegis.auditor.code', LS_THEME = 'aegis.auditor.theme';

  function toast(msg, kind = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${kind}`;
    t.textContent = msg;
    ui.toasts.appendChild(t);
    setTimeout(() => { t.classList.add('is-leaving'); setTimeout(() => t.remove(), 300); }, 3200);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (er) { ok = false; }
      ta.remove(); return ok;
    }
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/html' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- Editor ---------- */
  const LINE_H = 20, PAD = 12;
  function renderEditor() {
    const v = ui.code.value;
    ui.hl.innerHTML = hlHTML(v) + '\n ';
    const lines = v.split('\n').length;
    const issueLines = new Map();
    if (state.result) state.result.issues.forEach((i) => { if (!i.line) return; const prev = issueLines.get(i.line); if (!prev || SEV[i.sev].w > SEV[prev].w) issueLines.set(i.line, i.sev); });
    let g = '';
    for (let n = 1; n <= lines; n++) { const s = issueLines.get(n); g += `<span${s ? ` class="has-issue sev-${s}"` : ''}>${n}</span>`; }
    ui.gutter.innerHTML = g;
    ui.meta.textContent = `${plural(lines, 'line')} · ${(v.length / 1024).toFixed(1)} KB`;
    syncScroll();
  }
  function syncScroll() {
    const { scrollTop, scrollLeft } = ui.code;
    ui.hl.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    ui.gutter.style.transform = `translateY(${-scrollTop}px)`;
    if (!ui.lineHl.hidden) ui.lineHl.style.transform = `translateY(${(+ui.lineHl.dataset.line - 1) * LINE_H + PAD - scrollTop}px)`;
  }
  function revealLine(line) {
    if (!line) return;
    ui.lineHl.hidden = false;
    ui.lineHl.dataset.line = line;
    ui.code.scrollTop = Math.max(0, (line - 1) * LINE_H - ui.code.clientHeight / 3);
    syncScroll();
    ui.lineHl.classList.remove('is-flash'); void ui.lineHl.offsetWidth; ui.lineHl.classList.add('is-flash');
  }
  function setCode(text, { audit = true } = {}) {
    ui.code.value = text;
    ui.code.scrollTop = 0; ui.code.scrollLeft = 0;
    ui.lineHl.hidden = true;
    store.set(LS_CODE, text);
    renderEditor();
    if (audit) runAudit();
  }
  const autoAudit = debounce(() => { if (ui.auto.checked) runAudit(); }, 700);
  ui.code.addEventListener('input', () => { store.set(LS_CODE, ui.code.value); ui.lineHl.hidden = true; renderEditor(); autoAudit(); });
  ui.code.addEventListener('scroll', syncScroll);
  ui.code.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { state.escTab = true; ui.editor.classList.add('tab-escapes'); return; }
    if (e.key === 'Tab' && !state.escTab && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (!document.execCommand('insertText', false, '  ')) ui.code.setRangeText('  ', ui.code.selectionStart, ui.code.selectionEnd, 'end');
      return;
    }
    if (e.key !== 'Tab') { state.escTab = false; ui.editor.classList.remove('tab-escapes'); }
  });
  ui.code.addEventListener('blur', () => { state.escTab = false; ui.editor.classList.remove('tab-escapes'); });

  /* ---------- Audit ---------- */
  async function runAudit() {
    const src = ui.code.value;
    const seq = ++state.seq;
    if (!src.trim()) { state.result = null; renderReport(); ui.preview.srcdoc = ''; return; }
    ui.status.textContent = 'Auditing…';
    document.body.classList.add('is-auditing');
    const scrollY = ui.preview.contentWindow ? ui.preview.contentWindow.scrollY : 0;
    try {
      const res = await runAuditOn(src, ui.preview);
      if (seq !== state.seq) return;
      state.result = res;
      const win = ui.preview.contentWindow, doc = ui.preview.contentDocument;
      if (doc) doc.addEventListener('click', (e) => { if (e.target.closest && !e.target.closest('#aegis-xray') && e.target.closest('a[href]')) e.preventDefault(); }, true);
      if (win && scrollY) win.scrollTo(0, scrollY);
      drawXRay();
      renderReport();
      renderEditor();
      ui.status.textContent = `Audited ${new Date(res.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch (err) {
      console.error(err);
      ui.status.textContent = 'Audit failed — see console';
      toast('The audit hit an error on this input. Check the browser console.', 'error');
    } finally {
      if (seq === state.seq) document.body.classList.remove('is-auditing');
    }
  }
  function drawXRay() {
    if (!state.result) return;
    renderXRay(ui.preview, state.result.issues, { enabled: ui.xray.checked, layers: state.layers, onPick: pickElement });
  }
  function pickElement(id, list) {
    if (!list.length) return;
    const first = [...list].sort((a, b) => SEV[b.sev].w - SEV[a.sev].w)[0];
    if (state.filter !== 'all' && state.filter !== first.pillar) { state.filter = 'all'; renderReport(); }
    const li = ui.issues.querySelector(`[data-key="${CSS.escape(groupKey(first))}"]`);
    if (li) {
      const det = li.querySelector('details'); det.open = true;
      li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      li.classList.remove('is-flash'); void li.offsetWidth; li.classList.add('is-flash');
      const inst = li.querySelector(`[data-uid="${first.uid}"]`);
      if (inst) inst.focus({ preventScroll: true });
    }
    revealLine(first.line);
  }
  const groupKey = (i) => `${i.pillar}|${i.rule}|${i.title}`;

  /* ---------- Report ---------- */
  const RING_C = 2 * Math.PI * 52;
  const bandOf = (s) => (s >= 85 ? 'good' : s >= 65 ? 'ok' : s >= 45 ? 'warn' : 'bad');
  function renderReport() {
    const res = state.result;
    if (!res) {
      ui.scoreNum.textContent = '–'; ui.grade.textContent = ''; ui.gradeLabel.textContent = 'Paste code or pick a preset to start';
      ui.ring.style.strokeDashoffset = RING_C; ui.pillars.innerHTML = ''; ui.issues.innerHTML = ''; ui.sevSummary.innerHTML = ''; ui.docInfo.textContent = '';
      return;
    }
    const { scores, issues } = res;
    const g = gradeOf(scores.overall);
    ui.scoreNum.textContent = scores.overall;
    ui.grade.textContent = g.letter;
    ui.gradeLabel.textContent = g.label;
    ui.ring.style.strokeDashoffset = RING_C * (1 - scores.overall / 100);
    ui.ring.closest('.score-ring').dataset.band = bandOf(scores.overall);
    const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    issues.forEach((i) => { counts[i.sev]++; });
    ui.sevSummary.innerHTML = Object.entries(counts).map(([k, n]) => `<li class="sev-${k}"><span class="sev-dot" aria-hidden="true"></span><strong>${n}</strong> ${SEV[k].label.toLowerCase()}</li>`).join('');
    ui.docInfo.textContent = `${res.model.isFullDoc ? 'Full document' : 'Fragment (document-level checks skipped)'} · ${res.model.elementCount} elements · ${res.css.ruleCount} CSS rules`;
    ui.pillars.innerHTML = `<button type="button" class="pillar pillar-all" aria-pressed="${state.filter === 'all'}" data-filter="all"><span class="pillar-name">All issues</span><span class="pillar-score">${issues.length}</span><span class="pillar-sub">${uniq(issues.map(groupKey)).length} rules</span></button>` +
      Object.entries(PILLARS).map(([k, p]) => {
        const n = issues.filter((i) => i.pillar === k).length;
        return `<button type="button" class="pillar pillar-${k}" data-band="${bandOf(scores[k])}" aria-pressed="${state.filter === k}" data-filter="${k}">
          <span class="pillar-name">${p.name}</span>
          <span class="pillar-score">${scores[k]}<small>/100</small></span>
          <span class="pillar-bar" aria-hidden="true"><span style="width:${scores[k]}%"></span></span>
          <span class="pillar-sub">${plural(n, 'issue')} · weight ${Math.round(p.weight * 100)}%</span>
        </button>`;
      }).join('');
    const list = issues.filter((i) => state.filter === 'all' || i.pillar === state.filter);
    const groups = new Map();
    list.forEach((i) => { const k = groupKey(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); });
    const sorted = [...groups.values()].sort((a, b) => {
      const sa = Math.max(...a.map((i) => SEV[i.sev].w)), sb = Math.max(...b.map((i) => SEV[i.sev].w));
      return sb - sa || b.reduce((s, i) => s + i.count, 0) - a.reduce((s, i) => s + i.count, 0);
    });
    if (!sorted.length) {
      ui.issues.innerHTML = `<li class="empty-state"><strong>${state.filter === 'all' ? 'No issues found.' : 'No issues in this pillar.'}</strong><span>${state.filter === 'all' ? 'This UI is clean across all four pillars.' : 'Pick another pillar or “All issues”.'}</span></li>`;
      return;
    }
    ui.issues.innerHTML = sorted.map((grp) => {
      const head = grp.reduce((w, i) => (SEV[i.sev].w > SEV[w.sev].w ? i : w), grp[0]);
      const total = grp.reduce((s, i) => s + (i.count || 1), 0);
      return `<li class="issue sev-${head.sev}" data-key="${esc(groupKey(head))}">
        <details${sorted.length <= 3 ? ' open' : ''}>
          <summary>
            <span class="sev-chip">${SEV[head.sev].label}</span>
            <span class="issue-title">${esc(head.title)}</span>
            ${total > 1 ? `<span class="issue-count" aria-label="${total} occurrences">×${total}</span>` : ''}
            <span class="issue-meta"><span class="pill pill-${head.pillar}">${PILLARS[head.pillar].short}</span>${esc(head.rule)}</span>
          </summary>
          <div class="issue-body">
            <p class="issue-fix"><strong>Fix</strong> ${esc(head.fix || '')}</p>
            <ul class="instances">
              ${grp.slice(0, 25).map((i) => `<li><button type="button" class="instance" data-uid="${i.uid}">
                <span class="ln">${i.line ? 'L' + i.line : '—'}</span>
                <span class="inst-text">${i.snippet ? `<code>${esc(truncate(i.snippet, 48))}</code>` : ''}<span>${esc(i.detail)}</span></span>
              </button></li>`).join('')}
              ${grp.length > 25 ? `<li class="more">+ ${grp.length - 25} more</li>` : ''}
            </ul>
          </div>
        </details>
      </li>`;
    }).join('');
  }
  ui.pillars.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    state.filter = state.filter === b.dataset.filter && b.dataset.filter !== 'all' ? 'all' : b.dataset.filter;
    renderReport();
    const again = ui.pillars.querySelector(`[data-filter="${state.filter}"]`);
    if (again) again.focus();
  });
  ui.issues.addEventListener('click', (e) => {
    const b = e.target.closest('.instance');
    if (!b || !state.result) return;
    const iss = state.result.issues.find((i) => i.uid === +b.dataset.uid);
    if (!iss) return;
    revealLine(iss.line);
    if (iss.elIds && iss.elIds[0]) flashInFrame(ui.preview, iss.elIds[0]);
  });

  /* ---------- Preview controls ---------- */
  ui.xray.addEventListener('change', drawXRay);
  ui.layerBtns.forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.layer;
    if (state.layers.has(k)) state.layers.delete(k); else state.layers.add(k);
    b.setAttribute('aria-pressed', state.layers.has(k));
    drawXRay();
  }));
  $$('[data-viewport]').forEach((b) => b.addEventListener('click', () => {
    state.viewport = b.dataset.viewport;
    $$('[data-viewport]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    ui.stage.dataset.viewport = state.viewport;
    runAudit();
  }));
  if ('ResizeObserver' in window) new ResizeObserver(debounce(drawXRay, 150)).observe(ui.preview);

  /* ---------- Presets ---------- */
  ui.presetBtns.innerHTML = PRESETS.map((p, i) => `<button type="button" class="preset" data-preset="${p.id}"><span class="preset-n">${i + 1}</span><span class="preset-text"><strong>${esc(p.name)}</strong><small>${esc(p.tag)}</small></span></button>`).join('');
  ui.presetBtns.addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    const p = PRESETS.find((x) => x.id === b.dataset.preset);
    setCode(p.code);
    $$('.preset', ui.presetBtns).forEach((x) => x.setAttribute('aria-current', x === b ? 'true' : 'false'));
    toast(`Loaded preset: ${p.name}`);
  });

  /* ---------- Toolbar ---------- */
  $('#run-audit').addEventListener('click', runAudit);
  $('#clear-code').addEventListener('click', () => { setCode('', { audit: true }); ui.code.focus(); });
  $('#copy-prompt').addEventListener('click', async () => {
    if (!state.result) return toast('Run an audit first.');
    const ok = await copyText(buildFixPrompt(state.result, ui.code.value));
    toast(ok ? 'AI fix prompt copied — paste it into ChatGPT, Claude or Cursor.' : 'Copy failed: your browser blocked clipboard access.', ok ? 'success' : 'error');
  });
  function buildFixPrompt(res, src) {
    const lines = [`You are a senior front-end engineer. Refactor the HTML/CSS below so it passes this audit (Aegis UI Slop Auditor — current score ${res.scores.overall}/100).`, ''];
    Object.entries(PILLARS).forEach(([k, p]) => {
      const list = res.issues.filter((i) => i.pillar === k);
      if (!list.length) return;
      lines.push(`## ${p.name} — ${res.scores[k]}/100`);
      const groups = new Map();
      list.forEach((i) => { const g = groupKey(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); });
      groups.forEach((grp) => { const i = grp[0]; lines.push(`- [${i.sev}] ${i.title} (${i.rule}) ×${grp.reduce((s, x) => s + x.count, 0)} — e.g. ${i.detail}${i.line ? ` (line ${i.line})` : ''} Fix: ${i.fix}`); });
      lines.push('');
    });
    lines.push('Requirements: put every color, spacing, font size, radius and shadow in :root CSS custom properties (primitives + semantic aliases) on a 4px spacing grid and a modular type scale; use semantic HTML (landmarks, real headings, native <button>/<a>); meet WCAG 2.2 AA (4.5:1 text contrast, visible :focus-visible, 24×24px targets, labelled fields). Return the complete corrected file.', '', '```html', src.trim(), '```');
    return lines.join('\n');
  }

  /* ---------- Refactor dialog ---------- */
  const rf = { tabs: $$('[role="tab"]', ui.dialog), panels: $$('[role="tabpanel"]', ui.dialog) };
  function selectTab(tab, focus) {
    rf.tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    rf.panels.forEach((p) => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
    if (focus) tab.focus();
  }
  rf.tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const n = rf.tabs.length;
      const k = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (k !== undefined) { e.preventDefault(); selectTab(rf.tabs[k], true); }
    });
  });
  $('#rf-close').addEventListener('click', () => ui.dialog.close());
  ui.dialog.addEventListener('click', (e) => { if (e.target === ui.dialog) ui.dialog.close(); });

  async function openRefactor() {
    if (!ui.code.value.trim()) return toast('Paste some HTML/CSS or choose a preset first.');
    if (!state.result || state.seq === 0) await runAudit();
    if (!state.result) return;
    ui.dialog.classList.add('is-loading');
    $('#rf-before').textContent = state.result.scores.overall;
    $('#rf-after').textContent = '…';
    ['#panel-diff', '#panel-code', '#panel-tokens', '#panel-changes'].forEach((s) => { $(s).innerHTML = '<p class="loading-line">Rewriting tokens, markup and contrast…</p>'; });
    $('#rf-pillars').innerHTML = '';
    if (!ui.dialog.open) ui.dialog.showModal();
    selectTab(rf.tabs[0]);
    await wait(30);
    try {
      const src = ui.code.value;
      const before = state.result;
      const out = refactorSource(src, before);
      ui.sandbox.style.width = Math.max(320, ui.preview.clientWidth) + 'px';
      const after = await runAuditOn(out.code, ui.sandbox);
      state.refactor = { ...out, after, src };
      renderRefactor(before, after, out, src);
    } catch (err) {
      console.error(err);
      $('#panel-diff').innerHTML = '<p class="loading-line">The refactor engine hit an error on this input. Details are in the browser console.</p>';
    } finally {
      ui.dialog.classList.remove('is-loading');
    }
  }
  function renderRefactor(before, after, out, src) {
    const b = before.scores, a = after.scores;
    $('#rf-before').textContent = b.overall;
    $('#rf-after').textContent = a.overall;
    $('#rf-delta').dataset.band = bandOf(a.overall);
    $('#rf-pillars').innerHTML = Object.entries(PILLARS).map(([k, p]) => `<li><span>${p.short}</span><strong>${b[k]} → ${a[k]}</strong><span class="delta ${a[k] >= b[k] ? 'up' : 'down'}">${a[k] >= b[k] ? '+' : ''}${a[k] - b[k]}</span></li>`).join('');
    const d = renderDiff(diffLines(src, out.code));
    $('#panel-diff').innerHTML = `<p class="panel-note"><span class="add-dot"></span>${d.added} lines added · <span class="del-dot"></span>${d.removed} removed</p><div class="diff-wrap">${d.html}</div>`;
    $('#panel-code').innerHTML = `<pre class="code-view"><code>${hlHTML(out.code)}</code></pre>`;
    const swatch = (v) => `<span class="swatch" style="--sw:${esc(v)}" aria-hidden="true"></span>`;
    $('#panel-tokens').innerHTML = `
      <h3>Color primitives <small>${out.tokens.colors.length}</small></h3>
      <ul class="token-grid">${out.tokens.colors.map((c) => `<li>${swatch(c.value)}<code>${esc(c.name)}</code><span>${esc(c.value)}</span>${c.members.length > 1 ? `<small>merged ${c.members.length}: ${esc(c.members.join(', '))}</small>` : `<small>used ${c.count}×</small>`}</li>`).join('')}</ul>
      <h3>Semantic aliases <small>${out.tokens.aliases.length}</small></h3>
      <ul class="token-list">${out.tokens.aliases.map((t) => `<li><code>${esc(t.name)}</code><span>${esc(t.value)}</span></li>`).join('')}</ul>
      ${out.tokens.groups.filter(([, rows]) => rows.length).map(([title, rows]) => `<h3>${title} <small>${rows.length}</small></h3><ul class="token-list">${rows.map((t) => `<li><code>${esc(t.name)}</code><span>${esc(t.value)}</span></li>`).join('')}</ul>`).join('')}`;
    const remaining = new Map();
    after.issues.forEach((i) => { const k = groupKey(i); if (!remaining.has(k)) remaining.set(k, i); });
    $('#panel-changes').innerHTML = `
      <h3>What the engine changed <small>${out.changes.length}</small></h3>
      <ul class="change-list">${out.changes.map((c) => `<li><span class="pill pill-${c.pillar}">${PILLARS[c.pillar].short}</span><span>${esc(c.text).replace(/`([^`]+)`/g, '<code>$1</code>')}</span></li>`).join('') || '<li>No automatic changes were needed.</li>'}</ul>
      <h3>Manual follow-ups <small>${remaining.size}</small></h3>
      <p class="panel-note">These need a human design decision (copy, brand color, layout), so the engine flags them instead of guessing.</p>
      <ul class="change-list followups">${[...remaining.values()].sort((x, y) => SEV[y.sev].w - SEV[x.sev].w).map((i) => `<li><span class="sev-chip sev-${i.sev}">${SEV[i.sev].label}</span><span><strong>${esc(i.title)}</strong> — ${esc(i.fix || i.detail)}</span></li>`).join('') || '<li>Nothing left. Ship it.</li>'}</ul>`;
    $('#rf-stats').textContent = `${out.changes.length} transformations · ${out.tokens.colors.length + out.tokens.aliases.length + out.tokens.groups.reduce((s, [, r]) => s + r.length, 0)} tokens`;
  }
  $('#refactor-btn').addEventListener('click', openRefactor);
  $('#rf-apply').addEventListener('click', () => {
    if (!state.refactor) return;
    const { after } = state.refactor;
    const before = state.result ? state.result.scores.overall : '–';
    setCode(state.refactor.code);
    ui.dialog.close();
    toast(`Refactor applied · score ${before} → ${after.scores.overall}`, 'success');
  });
  $('#rf-copy').addEventListener('click', async () => {
    if (!state.refactor) return;
    const ok = await copyText(state.refactor.code);
    toast(ok ? 'Refactored code copied.' : 'Copy failed: your browser blocked clipboard access.', ok ? 'success' : 'error');
  });
  $('#rf-download').addEventListener('click', () => { if (state.refactor) download('refactored.html', state.refactor.code); });

  /* ---------- Theme + shortcuts ---------- */
  const themeBtn = $('#theme-toggle');
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    themeBtn.setAttribute('aria-pressed', t === 'light');
  }
  themeBtn.addEventListener('click', () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(t); store.set(LS_THEME, t); });
  applyTheme(store.get(LS_THEME, 'dark'));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) openRefactor(); else runAudit(); }
  });

  /* ---------- Token baseline ---------- */
  const blSelect = $('#baseline-mode'), blInfo = $('#baseline-info'), blClear = $('#baseline-clear');
  function ago(iso) {
    const t = Date.parse(iso); if (!Number.isFinite(t)) return '';
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleDateString();
  }
  function renderBaseline() {
    if (!blSelect) return;
    blSelect.value = baseline.mode;
    const r = baseline.read;
    blClear.hidden = r.status !== 'corrupt';
    document.body.dataset.baseline = r.status;
    if (!K) { blInfo.textContent = 'Baseline support did not load (shared/aegis-contract.js), so only generic checks run.'; return; }
    if (r.status === 'ok') {
      const rec = r.record;
      const from = rec.origin === 'studio' ? `Studio${rec.presetId ? ` · seeded from ${rec.presetId}` : ''}` : rec.origin;
      blInfo.textContent = `${rec.name} · ${from} · ${baseline.flat.names.length} tokens · saved ${ago(rec.savedAt)}${baseline.mode === 'none' ? ' · not applied' : ''}`;
    } else if (r.status === 'empty') blInfo.textContent = 'No active tokens yet. Open the Studio (or pick a preset there) and this panel picks them up automatically.';
    else if (r.status === 'corrupt') blInfo.textContent = `Saved tokens were ignored: ${r.reason} Generic checks only.`;
    else blInfo.textContent = 'Browser storage is unavailable here, so the Auditor cannot read the Studio\u2019s tokens. Generic checks only.';
  }
  const reauditSoon = debounce(() => { if (ui.code.value.trim()) runAudit(); }, 250);
  loadBaseline();
  if (blSelect) {
    blSelect.addEventListener('change', () => { baseline.mode = blSelect.value === 'none' ? 'none' : 'active'; store.set(LS_BASELINE, baseline.mode); renderBaseline(); reauditSoon(); });
    blClear.addEventListener('click', () => { if (K) K.clearBaseline(); loadBaseline(); renderBaseline(); reauditSoon(); toast('Cleared the unreadable saved tokens.'); });
  }
  if (K) K.onBaselineChange(() => { loadBaseline(); renderBaseline(); if (baseline.mode === 'active') reauditSoon(); });
  renderBaseline();

  /* ---------- Boot ---------- */
  const saved = store.get(LS_CODE, '');
  if (saved.trim()) setCode(saved);
  else { setCode(PRESETS[0].code); const first = $('.preset', ui.presetBtns); if (first) first.setAttribute('aria-current', 'true'); }

  // Expose the engine for power users / tests (no globals otherwise).
  window.AegisAuditor = { runAuditOn, refactorSource, parseCSS, contrast, parseColor, PRESETS, get baseline() { return { mode: baseline.mode, status: baseline.read.status, name: baseline.read.record ? baseline.read.record.name : null, tokens: baseline.flat ? baseline.flat.names.length : 0 }; } };
})();
