/*!
 * AegisUI · canonical token contract
 * ------------------------------------------------------------------
 * One place that every module agrees on:
 *
 *   • CANONICAL FORMAT  The AegisUI token document ("aegis-tokens" v1),
 *     specified by presets/schema/aegis-tokens.schema.json. Presets are
 *     authored in it, the Figma plugin imports it, the Auditor validates
 *     against it, and Studio exports it as `aegis-tokens.json`.
 *
 *   • ADAPTER           fromStudio(tokenModel) → canonical document
 *                       toStudioState(document) → Studio generator settings
 *     Studio's older exports (variables.css with --<prefix>-* names and the
 *     W3C DTCG tokens.json) are untouched; the canonical document is an
 *     additional export.
 *
 *   • VALIDATION        validateForPlugin(doc) is a line-for-line port of the
 *     Figma plugin's own validate() (figma-plugin/code.js); the test suite
 *     checks both produce identical messages. validateSchema(doc, schema) is a
 *     small JSON-Schema (2020-12 subset) checker for the schema file.
 *
 *   • ACTIVE BASELINE   The token document the user is currently working with,
 *     kept in localStorage so the Auditor (and any other tab) can validate
 *     against it. Reads survive missing, blocked or corrupt storage.
 *
 * Plain ES2017, no dependencies. Works as a browser global (window.AegisContract)
 * and as a CommonJS module for Node tests.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AegisContract = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FORMAT = 'aegis-tokens';
  var VERSION = '1.0.0';
  var SUPPORTED_MAJOR = 1;
  var STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  var STATUS = ['success', 'warning', 'danger', 'info'];

  /* ───────────── helpers ───────────── */
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function isLeaf(node) { return isObj(node) && ('$value' in node || '$modes' in node); }
  function isAlias(v) { return typeof v === 'string' && v.charAt(0) === '{' && v.charAt(v.length - 1) === '}'; }
  function aliasPath(v) { return v.slice(1, -1); }
  function getPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) { if (!isObj(cur) || !(parts[i] in cur)) return undefined; cur = cur[parts[i]]; }
    return cur;
  }
  function walk(node, fn, trail) {
    trail = trail || [];
    if (!isObj(node)) return;
    if (isLeaf(node)) { fn(node, trail); return; }
    Object.keys(node).forEach(function (k) { if (k.charAt(0) !== '$') walk(node[k], fn, trail.concat(k)); });
  }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'studio'; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function round(n, d) { var f = Math.pow(10, d == null ? 2 : d); return Math.round(n * f) / f; }
  function hex2(n) { return Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0'); }

  /** "rgb(r g b / a)" | "#rgb" | "#rrggbb" | "#rrggbbaa" → "#rrggbb" or "#rrggbbaa". */
  function toHex8(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s.slice(1).split('').map(function (c) { return c + c; }).join('');
    if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/.test(s)) return s;
    var m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/);
    if (!m) return null;
    var a = m[4] == null ? 1 : (m[4].slice(-1) === '%' ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    var out = '#' + hex2(+m[1]) + hex2(+m[2]) + hex2(+m[3]);
    return a >= 1 ? out : out + hex2(a * 255);
  }

  /** Follow aliases until a concrete value; returns undefined on a broken chain. */
  function resolve(doc, value, mode, depth) {
    depth = depth || 0;
    if (depth > 24) return undefined;
    if (isAlias(value)) {
      var tok = getPath(doc.tokens, aliasPath(value));
      if (!isLeaf(tok)) return undefined;
      var raw = tok.$modes ? (tok.$modes[mode] !== undefined ? tok.$modes[mode] : tok.$modes[doc.modes && doc.modes[0]]) : tok.$value;
      return resolve(doc, raw, mode, depth + 1);
    }
    return value;
  }
  function resolvePath(doc, path, mode) { return resolve(doc, '{' + path + '}', mode); }

  /* ═══════════════════════════════════════════ Studio → canonical */

  var GENERIC_FONTS = /^(system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|sans-serif|serif|monospace|cursive|fantasy|emoji|math|fangsong)$/i;
  function primaryFamily(stack) {
    var list = (stack || []).map(function (f) { return String(f).replace(/^["']|["']$/g, ''); });
    for (var i = 0; i < list.length; i++) if (!GENERIC_FONTS.test(list[i])) return list[i];
    return list[0] || 'Inter';
  }
  function stackString(stack) { return (stack || []).map(function (f) { return /\s/.test(f) && !/^["']/.test(f) ? '"' + f + '"' : f; }).join(', '); }

  /**
   * Convert a Studio token model (window.Aegis.tokens.build(state)) into a
   * canonical AegisUI token document with the same structure the presets use.
   * Mapping is documented in README → "Token contract".
   */
  function fromStudio(tk, opts) {
    opts = opts || {};
    var state = tk.state;
    var cssVar = function (name) { return { aegis: { cssVar: '--aegis-' + name } }; };
    var leaf = function (type, value, name, extra) {
      var t = { $type: type, $value: value };
      if (extra && extra.description) t.$description = extra.description;
      t.$extensions = cssVar(name);
      if (extra && extra.stack) t.$extensions.aegis.stack = extra.stack;
      if (extra && extra.category) t.$extensions.aegis.category = extra.category;
      return t;
    };
    var moded = function (type, light, dark, name, description) {
      var t = { $type: type, $modes: { light: light, dark: dark } };
      if (description) t.$description = description;
      t.$extensions = cssVar(name);
      return t;
    };

    // Studio family names → canonical primitive ramps.
    var FAMILY = { primary: 'brand', neutral: 'neutral', success: 'success', warning: 'warning', danger: 'danger', info: 'info' };
    var prim = { white: leaf('color', '#ffffff', 'color-white'), black: leaf('color', '#000000', 'color-black') };
    Object.keys(FAMILY).forEach(function (fam) {
      var ramp = {};
      STOPS.forEach(function (st) { ramp[st] = leaf('color', tk.scales[fam][st], 'color-' + FAMILY[fam] + '-' + st); });
      prim[FAMILY[fam]] = ramp;
    });
    var P = function (fam, st) { return '{primitive.color.' + fam + '.' + st + '}'; };

    // Studio semantic entry {ref:'primary.600'|null, hex} → alias or literal.
    var fromRef = function (entry) {
      if (!entry) return '#00000000';
      if (entry.ref) { var p = entry.ref.split('.'); return P(FAMILY[p[0]] || p[0], p[1]); }
      var hx = toHex8(entry.hex);
      if (hx === '#ffffff') return '{primitive.color.white}';
      if (hx === '#000000') return '{primitive.color.black}';
      return hx || '#00000000';
    };
    var L = tk.semantic.light, D = tk.semantic.dark;
    var sem = function (key) { return [fromRef(L[key]), fromRef(D[key])]; };
    var shift = function (entry, n) { // a neighbouring stop of a Studio reference
      if (!entry || !entry.ref) return fromRef(entry);
      var p = entry.ref.split('.'), i = STOPS.indexOf(+p[1]);
      return P(FAMILY[p[0]], STOPS[clamp(i + n, 0, STOPS.length - 1)]);
    };

    var C = {};
    var put = function (group, name, pair, description) { C[group] = C[group] || {}; C[group][name] = moded('color', pair[0], pair[1], (group === 'data' ? 'data-' : group + '-') + name, description); };
    put('bg', 'canvas', sem('bg'), 'App background behind all surfaces');
    put('bg', 'surface', sem('surface'), 'Cards, panels, inputs');
    put('bg', 'surface-raised', sem('surface-raised'), 'Menus, popovers, modals');
    put('bg', 'surface-sunken', sem('surface-sunken'), 'Wells, table headers, code');
    put('bg', 'hover', [fromRef(L['surface-sunken']), fromRef(D['surface-raised'])], 'Hover fill for rows and ghost controls');
    put('bg', 'selected', sem('primary-subtle'), 'Selected rows and nav items');
    put('bg', 'emphasis', sem('surface-inverse'), 'Tooltips and inverse toasts');
    put('bg', 'overlay', sem('overlay'), 'Modal scrim');
    put('fg', 'default', sem('text'), 'Primary text');
    put('fg', 'muted', sem('text-muted'), 'Secondary text');
    put('fg', 'subtle', sem('text-subtle'), 'Captions, placeholders (still ≥ 4.5:1)');
    put('fg', 'disabled', [P('neutral', 400), P('neutral', 600)], 'Disabled text (exempt from contrast minimums)');
    put('fg', 'inverse', sem('text-inverse'), 'Text on bg.emphasis');
    put('fg', 'on-brand', sem('on-primary'), 'Text and icons on brand.default');
    put('fg', 'link', sem('link'), 'Inline links');
    put('border', 'subtle', [P('neutral', 100), P('neutral', 800)], 'Hairline dividers');
    put('border', 'default', sem('border'), 'Card and table borders');
    put('border', 'strong', sem('border-strong'), 'Form-control boundaries (≥ 3:1, WCAG 1.4.11)');
    put('border', 'focus', sem('focus-ring'), 'Focus indicator (≥ 3:1)');
    put('brand', 'default', sem('primary'), 'Primary action fill');
    put('brand', 'hover', sem('primary-hover'));
    put('brand', 'active', sem('primary-active'));
    put('brand', 'subtle', sem('primary-subtle'));
    put('brand', 'muted', [P('brand', 100), P('brand', 900)]);
    put('brand', 'fg', sem('primary-subtle-text'), 'Brand-coloured text on surfaces and brand.subtle');
    put('brand', 'border', [P('brand', 300), P('brand', 700)]);
    // Studio has no separate accent hue; the canonical accent role aliases the info ramp.
    put('accent', 'default', sem('info'));
    put('accent', 'hover', [shift(L.info, 1), shift(D.info, -1)]);
    put('accent', 'subtle', sem('info-subtle'));
    put('accent', 'fg', sem('info-subtle-text'));
    put('accent', 'on', sem('on-info'));
    STATUS.forEach(function (k) {
      put(k, 'default', sem(k));
      put(k, 'hover', [shift(L[k], 1), shift(D[k], -1)]);
      put(k, 'subtle', sem(k + '-subtle'));
      put(k, 'fg', sem(k + '-subtle-text'));
      put(k, 'border', [P(k, 200), P(k, 800)]);
      put(k, 'on', sem('on-' + k));
    });
    [['brand', 500, 400], ['info', 500, 400], ['success', 500, 400], ['warning', 500, 400], ['danger', 500, 400], ['brand', 300, 200], ['info', 300, 200], ['neutral', 500, 400]]
      .forEach(function (d, i) { put('data', String(i + 1), [P(d[0], d[1]), P(d[0], d[2])]); });

    // Dimensions
    var spacing = {};
    tk.space.forEach(function (s) { spacing[s.px] = leaf('dimension', s.px, 'space-' + s.px); });
    var radius = {};
    tk.radius.forEach(function (r) { radius[r.name] = leaf('dimension', r.px, 'radius-' + r.name); });
    var size = {};
    tk.controls.forEach(function (c) { size['control-' + c.name] = leaf('dimension', c.px, 'size-control-' + c.name); });
    [['sm', 16], ['md', 20], ['lg', 24]].forEach(function (s) { size['icon-' + s[0]] = leaf('dimension', s[1], 'size-icon-' + s[0]); });
    var borderWidth = { none: leaf('dimension', 0, 'border-width-none'), thin: leaf('dimension', 1, 'border-width-thin'), thick: leaf('dimension', 2, 'border-width-thick'), focus: leaf('dimension', 2, 'border-width-focus') };

    // Typography
    var ty = tk.typography;
    var fam = function (role, key) {
      var f = ty.families[role];
      return leaf('fontFamily', primaryFamily(f.stack), 'font-' + key, { stack: stackString(f.stack), category: /mono/i.test(f.label) ? 'mono' : /serif/i.test(f.label) ? 'serif' : 'sans' });
    };
    var sizeOf = {}; ty.sizes.forEach(function (s) { sizeOf[s.name] = s; });
    var TS = [
      ['display-lg', '5xl', 'display', 'heading'], ['display-md', '4xl', 'display', 'heading'],
      ['heading-xl', '3xl', 'display', 'heading'], ['heading-lg', '2xl', 'display', 'heading'],
      ['heading-md', 'xl', 'display', 'heading'], ['heading-sm', 'lg', 'display', 'heading'],
      ['body-lg', 'lg', 'body', 400], ['body-md', 'base', 'body', 400], ['body-sm', 'sm', 'body', 400],
      ['label-lg', 'base', 'body', 500], ['label-md', 'sm', 'body', 500], ['label-sm', 'xs', 'body', 500],
      ['caption', 'xs', 'body', 400], ['overline', 'xs', 'body', 600], ['code', 'sm', 'mono', 400], ['numeric', 'base', 'body', 500]
    ];
    var textStyle = {};
    TS.forEach(function (t) {
      var s = sizeOf[t[1]];
      var isLabel = /^label|overline/.test(t[0]);
      var lh = isLabel ? Math.min(s.lineHeight, 1.3) : s.lineHeight;
      var v = {
        fontFamily: '{typography.fontFamily.' + t[2] + '}',
        fontWeight: t[3] === 'heading' ? Math.round(ty.weights.heading) : t[3],
        fontSize: round(s.px, 2),
        lineHeight: Math.round(s.px * lh),
        letterSpacing: t[0] === 'overline' ? 0.06 : s.tracking,
        textTransform: t[0] === 'overline' ? 'uppercase' : 'none'
      };
      if (t[0] === 'numeric') v.fontFeatures = ['tnum'];
      textStyle[t[0]] = leaf('typography', v, 'text-' + t[0]);
    });

    // Shadows: Studio layers {x,y,blur,spread,alpha,rgb:"r g b"} → canonical layer objects.
    var shadow = {};
    var layers = function (s) {
      return s.layers.map(function (l) {
        var c = l.rgb.split(' ').map(Number);
        return { x: l.x, y: l.y, blur: l.blur, spread: l.spread, color: '#' + hex2(c[0]) + hex2(c[1]) + hex2(c[2]) + hex2(l.alpha * 255) };
      });
    };
    tk.shadows.light.forEach(function (s, i) { shadow[s.name] = moded('shadow', layers(s), layers(tk.shadows.dark[i]), 'shadow-' + s.name); });

    // Motion
    var duration = {};
    tk.motion.durations.forEach(function (d) { duration[d.name] = leaf('duration', d.ms, 'duration-' + d.name); });
    var ease = {}; tk.motion.easings.forEach(function (e) { ease[e.name] = e.curve.map(function (n) { return round(n, 3); }); });
    var easing = {
      standard: leaf('cubicBezier', ease.standard, 'easing-standard'),
      emphasized: leaf('cubicBezier', ease.standard, 'easing-emphasized'),
      decelerate: leaf('cubicBezier', ease.enter, 'easing-decelerate'),
      accelerate: leaf('cubicBezier', ease.exit, 'easing-accelerate'),
      linear: leaf('cubicBezier', ease.linear, 'easing-linear')
    };

    // Component recipes (same recipe set as the presets; values follow Studio's grid).
    var g = state.space.grid;
    var cp = function (comp, prop, type, value) { return leaf(type, value, comp + '-' + prop); };
    var A = function (p) { return '{' + p + '}'; };
    var comp = function (name, rows) { var o = {}; rows.forEach(function (r) { o[r[0]] = cp(name, r[0], r[1], r[2]); }); return o; };
    var component = {
      button: comp('button', [
        ['height-sm', 'dimension', A('dimension.size.control-sm')], ['height-md', 'dimension', A('dimension.size.control-md')], ['height-lg', 'dimension', A('dimension.size.control-lg')],
        ['padding-x-sm', 'dimension', 3 * 4], ['padding-x-md', 'dimension', 4 * 4], ['padding-x-lg', 'dimension', 6 * 4],
        ['gap', 'dimension', A('dimension.spacing.8')], ['radius', 'dimension', A('dimension.radius.md')], ['border-width', 'dimension', A('dimension.borderWidth.thin')],
        ['font-weight', 'fontWeight', A('typography.fontWeight.semibold')], ['text-style', 'string', 'label-md'], ['text-transform', 'string', 'none'], ['letter-spacing', 'number', 0],
        ['shadow', 'shadow', A('shadow.xs')],
        ['primary-bg', 'color', A('semantic.color.brand.default')], ['primary-bg-hover', 'color', A('semantic.color.brand.hover')], ['primary-fg', 'color', A('semantic.color.fg.on-brand')], ['primary-border', 'color', A('semantic.color.brand.default')],
        ['secondary-bg', 'color', A('semantic.color.bg.surface')], ['secondary-bg-hover', 'color', A('semantic.color.bg.hover')], ['secondary-fg', 'color', A('semantic.color.fg.default')], ['secondary-border', 'color', A('semantic.color.border.strong')],
        ['ghost-fg', 'color', A('semantic.color.brand.fg')], ['ghost-bg-hover', 'color', A('semantic.color.brand.subtle')],
        ['danger-bg', 'color', A('semantic.color.danger.default')], ['danger-fg', 'color', A('semantic.color.danger.on')]
      ]),
      input: comp('input', [
        ['height', 'dimension', A('dimension.size.control-md')], ['padding-x', 'dimension', 12], ['radius', 'dimension', A('dimension.radius.md')], ['border-width', 'dimension', A('dimension.borderWidth.thin')],
        ['bg', 'color', A('semantic.color.bg.surface')], ['border', 'color', A('semantic.color.border.strong')], ['border-hover', 'color', A('semantic.color.fg.subtle')], ['placeholder', 'color', A('semantic.color.fg.subtle')], ['text-style', 'string', 'body-md']
      ]),
      card: comp('card', [
        ['radius', 'dimension', A('dimension.radius.lg')], ['padding', 'dimension', g === 8 ? 32 : 20], ['border-width', 'dimension', A('dimension.borderWidth.thin')],
        ['bg', 'color', A('semantic.color.bg.surface')], ['border', 'color', A('semantic.color.border.default')], ['shadow', 'shadow', A('shadow.sm')]
      ]),
      badge: comp('badge', [
        ['height', 'dimension', 24], ['padding-x', 'dimension', 8], ['radius', 'dimension', A('dimension.radius.full')], ['font-weight', 'fontWeight', A('typography.fontWeight.medium')], ['text-style', 'string', 'label-sm'], ['text-transform', 'string', 'none']
      ]),
      table: comp('table', [
        ['row-height', 'dimension', 48], ['cell-padding-x', 'dimension', 16], ['header-bg', 'color', A('semantic.color.bg.surface-sunken')], ['header-fg', 'color', A('semantic.color.fg.muted')],
        ['header-text-style', 'string', 'label-sm'], ['header-text-transform', 'string', 'uppercase'], ['row-hover-bg', 'color', A('semantic.color.bg.hover')], ['border', 'color', A('semantic.color.border.default')]
      ]),
      tabs: comp('tabs', [
        ['height', 'dimension', A('dimension.size.control-md')], ['gap', 'dimension', A('dimension.spacing.8')], ['indicator-height', 'dimension', 2], ['indicator-color', 'color', A('semantic.color.brand.default')],
        ['active-fg', 'color', A('semantic.color.fg.default')], ['inactive-fg', 'color', A('semantic.color.fg.muted')]
      ]),
      modal: comp('modal', [
        ['radius', 'dimension', A('dimension.radius.xl')], ['padding', 'dimension', 24], ['shadow', 'shadow', A('shadow.xl')], ['overlay', 'color', A('semantic.color.bg.overlay')], ['bg', 'color', A('semantic.color.bg.surface-raised')]
      ]),
      tooltip: comp('tooltip', [
        ['radius', 'dimension', A('dimension.radius.sm')], ['padding-x', 'dimension', A('dimension.spacing.8')], ['bg', 'color', A('semantic.color.bg.emphasis')], ['fg', 'color', A('semantic.color.fg.inverse')]
      ]),
      nav: comp('nav', [
        ['width', 'dimension', 240], ['item-height', 'dimension', A('dimension.size.control-md')], ['item-radius', 'dimension', A('dimension.radius.md')],
        ['item-active-bg', 'color', A('semantic.color.bg.selected')], ['item-active-fg', 'color', A('semantic.color.brand.fg')], ['bg', 'color', A('semantic.color.bg.surface')]
      ]),
      avatar: comp('avatar', [['radius', 'dimension', A('dimension.radius.full')]]),
      switch: comp('switch', [['radius', 'dimension', A('dimension.radius.full')], ['track-on', 'color', A('semantic.color.brand.default')]]),
      link: comp('link', [['decoration', 'string', 'underline'], ['decoration-hover', 'string', 'underline'], ['underline-offset', 'dimension', 3], ['font-weight', 'fontWeight', A('typography.fontWeight.medium')]]),
      focus: comp('focus', [['ring-width', 'dimension', A('dimension.borderWidth.focus')], ['ring-offset', 'dimension', 2], ['ring-color', 'color', A('semantic.color.border.focus')], ['halo', 'color', '#00000000']])
    };

    // a11y report from Studio's audit, expressed in canonical role names.
    var ROLE = {
      text: 'fg.default', 'text-muted': 'fg.muted', 'text-subtle': 'fg.subtle', 'on-primary': 'fg.on-brand', link: 'fg.link',
      'primary-subtle-text': 'brand.fg', 'border-strong': 'border.strong', 'focus-ring': 'border.focus',
      bg: 'bg.canvas', surface: 'bg.surface', primary: 'brand.default', 'primary-subtle': 'brand.subtle'
    };
    STATUS.forEach(function (k) { ROLE[k] = k + '.default'; ROLE[k + '-subtle'] = k + '.subtle'; ROLE[k + '-subtle-text'] = k + '.fg'; });
    var checks = (tk.audit || []).map(function (r) {
      return { mode: r.mode, fg: ROLE[r.fg] || r.fg, bg: ROLE[r.bg] || r.bg, ratio: round(r.ratio, 2), min: r.min, pass: r.pass };
    });

    var name = opts.name || state.name;
    var src = state.source && state.source.presetId ? state.source : null;
    var doc = {
      $schema: 'https://aegisui.dev/schema/aegis-tokens/1.0.0.json',
      aegis: { format: FORMAT, version: VERSION, generator: 'aegis-studio' },
      meta: {
        id: slug(name),
        name: name,
        category: 'Studio',
        description: 'Generated in AegisUI Studio' + (src ? ' from the ' + (src.presetName || src.presetId) + ' preset' : '') + '. Studio CSS prefix: --' + state.prefix + '-.',
        tags: ['studio'].concat(src ? ['preset:' + src.presetId] : []),
        defaultMode: opts.defaultMode === 'dark' ? 'dark' : 'light',
        density: g === 8 ? 'comfortable' : 'default',
        a11yTarget: 'AA',
        fonts: { families: ['heading', 'body', 'mono'].map(function (r) { return { family: primaryFamily(ty.families[r].stack) }; }) },
        swatches: {
          light: [L.bg.hex, L.primary.hex, L.info.hex, L.text.hex].map(toHex8),
          dark: [D.bg.hex, D.primary.hex, D.info.hex, D.text.hex].map(toHex8)
        }
      },
      modes: ['light', 'dark'],
      tokens: {
        primitive: { color: prim },
        semantic: { color: C },
        dimension: { spacing: spacing, radius: radius, borderWidth: borderWidth, size: size },
        typography: {
          fontFamily: { display: fam('heading', 'display'), body: fam('body', 'body'), mono: fam('mono', 'mono') },
          fontWeight: { regular: leaf('fontWeight', 400, 'font-weight-regular'), medium: leaf('fontWeight', 500, 'font-weight-medium'), semibold: leaf('fontWeight', 600, 'font-weight-semibold'), bold: leaf('fontWeight', 700, 'font-weight-bold') },
          textStyle: textStyle
        },
        shadow: shadow,
        motion: { duration: duration, easing: easing },
        component: component
      },
      a11y: { target: 'AA', pass: checks.every(function (c) { return c.pass; }), checks: checks, adjustments: (tk.notes || []).slice(), exemptions: [] }
    };
    return doc;
  }

  /* ═══════════════════════════════════════════ canonical → Studio */

  var RATIOS = [1.125, 1.2, 1.25, 1.333, 1.414, 1.5, 1.618];
  var EASINGS = { standard: [0.2, 0, 0, 1], productive: [0.2, 0, 0.38, 0.9], expressive: [0.4, 0.14, 0.3, 1], smooth: [0.45, 0, 0.55, 1], overshoot: [0.34, 1.56, 0.64, 1], linear: [0, 0, 1, 1] };

  function hexOnly(v) { var h = toHex8(v); return h ? h.slice(0, 7) : null; }
  function chromaOf(hex) { // OKLCH chroma, enough precision to pick a neutral tint
    var n = parseInt(hex.slice(1, 7), 16);
    var lin = function (c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    var r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return Math.sqrt(A * A + B * B);
  }
  function initials(id) { var p = String(id).split('-').filter(Boolean); var s = p.map(function (w) { return w[0]; }).join(''); return /^[a-z]/.test(s) ? s.slice(0, 12) : 'ae'; }

  /**
   * Seed Studio's generator from a canonical document (a preset).
   * Studio regenerates ramps with its own OKLCH algorithm, so this is a
   * faithful approximation, not a byte-for-byte copy: the brand fill, status
   * hues, neutral hue, fonts, type metrics, grid, radius, elevation strength
   * and motion are carried over. Exact preset values stay available in
   * presets/tokens/<id>.json.
   */
  function toStudioState(doc) {
    var light = function (path) { return hexOnly(resolvePath(doc, path, 'light')); };
    var t = doc.tokens || {};
    var ts = (t.typography && t.typography.textStyle) || {};
    var val = function (tok) { return tok ? resolve(doc, tok.$value, 'light') : undefined; };
    var body = val(ts['body-md']) || { fontSize: 16, lineHeight: 24 };
    var headLg = val(ts['heading-lg']) || { fontSize: body.fontSize * 1.95 };
    var headMd = val(ts['heading-md']) || { fontWeight: 600 };
    var rawRatio = Math.pow(headLg.fontSize / body.fontSize, 1 / 3);
    var ratio = RATIOS.reduce(function (best, r) { return Math.abs(r - rawRatio) < Math.abs(best - rawRatio) ? r : best; }, 1.25);

    var neutral = light('primitive.color.neutral.500') || '#6b7280';
    var tint = clamp(Math.ceil(((chromaOf(neutral) - 0.004) / 0.036) * 20) * 5, 0, 100);

    var fams = (t.typography && t.typography.fontFamily) || {};
    var custom = {};
    [['heading', 'display'], ['body', 'body'], ['mono', 'mono']].forEach(function (r) {
      var f = fams[r[1]];
      if (!f) return;
      var stack = f.$extensions && f.$extensions.aegis && f.$extensions.aegis.stack;
      var list = (stack ? stack.split(',') : [String(f.$value), r[0] === 'mono' ? 'monospace' : 'sans-serif'])
        .map(function (s) { return s.trim().replace(/^["']|["']$/g, ''); }).filter(Boolean).slice(0, 12);
      custom[r[0]] = { label: String(f.$value) + ' (preset)', stack: list };
    });

    var md = t.shadow && t.shadow.md ? resolve(doc, t.shadow.md.$modes ? t.shadow.md.$modes.light : t.shadow.md.$value, 'light') : [];
    var alpha = 0;
    (Array.isArray(md) ? md : []).forEach(function (l) { var h = toHex8(l.color); if (h && h.length === 9) alpha = Math.max(alpha, parseInt(h.slice(7), 16) / 255); else if (h) alpha = Math.max(alpha, 1); });
    var depth = !md || !md.length ? 0 : clamp(Math.round((alpha * 2) / 0.09), 1, 5);

    var dur = t.motion && t.motion.duration && t.motion.duration.base ? +val(t.motion.duration.base) : 200;
    var curve = t.motion && t.motion.easing && t.motion.easing.standard ? val(t.motion.easing.standard) : EASINGS.standard;
    var easing = 'custom';
    Object.keys(EASINGS).forEach(function (k) { if (EASINGS[k].every(function (n, i) { return Math.abs(n - curve[i]) < 0.005; })) easing = k; });

    var density = doc.meta && doc.meta.density;
    var md2 = t.dimension && t.dimension.radius && t.dimension.radius.md ? +val(t.dimension.radius.md) : 8;
    return {
      name: (doc.meta && doc.meta.name) || 'Imported',
      prefix: initials((doc.meta && doc.meta.id) || 'ae'),
      color: {
        primary: light('semantic.color.brand.default') || light('primitive.color.brand.600') || '#1d63d8',
        neutral: neutral,
        neutralTint: tint,
        success: light('primitive.color.success.600') || '#16a34a',
        warning: light('primitive.color.warning.600') || '#d97706',
        danger: light('primitive.color.danger.600') || '#dc2626',
        info: light('primitive.color.info.600') || '#0891b2'
      },
      type: {
        heading: custom.heading ? 'custom' : 'system-sans',
        body: custom.body ? 'custom' : 'system-sans',
        mono: custom.mono ? 'custom' : 'mono-code',
        custom: custom,
        base: clamp(Math.round(body.fontSize), 12, 20),
        ratio: ratio,
        lineHeight: clamp(Math.round((body.lineHeight / body.fontSize) * 20) / 20, 1.3, 1.8),
        headingWeight: clamp(Math.round((headMd.fontWeight || 600) / 50) * 50, 400, 900)
      },
      space: { grid: density === 'comfortable' || density === 'accessible' ? 8 : 4 },
      radius: { base: clamp(Math.round(md2), 0, 24) },
      shadow: { depth: depth },
      motion: { duration: clamp(Math.round(dur / 10) * 10, 80, 600), easing: easing, curve: curve.slice() },
      source: { presetId: doc.meta && doc.meta.id, presetName: doc.meta && doc.meta.name, defaultMode: doc.meta && doc.meta.defaultMode }
    };
  }

  /* ═══════════════════════════════════════════ validation */

  /** Exact port of figma-plugin/code.js validate(); keep the two in sync (tests enforce it). */
  function validateForPlugin(doc) {
    var errors = [];
    if (!doc || typeof doc !== 'object') return ['Input is not a JSON object.'];
    if (!doc.aegis || doc.aegis.format !== FORMAT) errors.push('Missing "aegis.format": "' + FORMAT + '" — is this an AegisUI token export?');
    else if (parseInt(String(doc.aegis.version).split('.')[0], 10) !== SUPPORTED_MAJOR) errors.push('Unsupported format version ' + doc.aegis.version + ' (plugin supports ' + SUPPORTED_MAJOR + '.x).');
    if (!doc.meta || !doc.meta.id || !doc.meta.name) errors.push('Missing meta.id / meta.name.');
    if (!doc.tokens) errors.push('Missing "tokens" object.');
    else {
      ['primitive', 'semantic'].forEach(function (k) { if (!doc.tokens[k]) errors.push('Missing tokens.' + k + '.'); });
      if (!Array.isArray(doc.modes) || doc.modes.indexOf('light') < 0) errors.push('"modes" must include "light".');
      if (!errors.length) {
        walk(doc.tokens, function (tok, trail) {
          var vals = tok.$modes ? Object.keys(tok.$modes).map(function (m) { return tok.$modes[m]; }) : [tok.$value];
          vals.forEach(function (v) {
            if (isAlias(v) && !getPath(doc.tokens, aliasPath(v))) errors.push('Unresolved alias ' + v + ' at ' + trail.join('.'));
            if (typeof v === 'object' && v && !Array.isArray(v)) {
              Object.keys(v).forEach(function (k) { if (isAlias(v[k]) && !getPath(doc.tokens, aliasPath(v[k]))) errors.push('Unresolved alias ' + v[k] + ' at ' + trail.join('.') + '.' + k); });
            }
          });
        });
      }
    }
    return errors.slice(0, 20);
  }

  /**
   * Minimal JSON Schema 2020-12 checker covering the keywords used by
   * aegis-tokens.schema.json: type, required, properties, additionalProperties,
   * items, minItems, maxItems, contains, enum, const, pattern, minimum, maximum,
   * anyOf, oneOf, $ref (#/$defs/…). Returns up to `limit` "path: message" strings.
   */
  function validateSchema(doc, schema, limit) {
    limit = limit || 50;
    var errors = [];
    var typeOk = function (v, t) {
      switch (t) {
        case 'object': return isObj(v);
        case 'array': return Array.isArray(v);
        case 'string': return typeof v === 'string';
        case 'number': return typeof v === 'number' && isFinite(v);
        case 'integer': return typeof v === 'number' && Math.floor(v) === v;
        case 'boolean': return typeof v === 'boolean';
        case 'null': return v === null;
        default: return true;
      }
    };
    var deref = function (s) { return s && s.$ref ? getPath(schema, s.$ref.replace(/^#\//, '').replace(/\//g, '.')) : s; };
    var check = function (v, s, path, out) {
      s = deref(s);
      if (!s || out.length >= limit) return;
      if (s.type && !typeOk(v, s.type)) { out.push(path + ': expected ' + s.type); return; }
      if ('const' in s && v !== s.const) out.push(path + ': must be ' + JSON.stringify(s.const));
      if (s.enum && s.enum.indexOf(v) < 0) out.push(path + ': must be one of ' + s.enum.join(', '));
      if (s.pattern && typeof v === 'string' && !new RegExp(s.pattern).test(v)) out.push(path + ': does not match ' + s.pattern);
      if (typeof s.minimum === 'number' && typeof v === 'number' && v < s.minimum) out.push(path + ': below ' + s.minimum);
      if (typeof s.maximum === 'number' && typeof v === 'number' && v > s.maximum) out.push(path + ': above ' + s.maximum);
      if (Array.isArray(v)) {
        if (typeof s.minItems === 'number' && v.length < s.minItems) out.push(path + ': needs at least ' + s.minItems + ' items');
        if (typeof s.maxItems === 'number' && v.length > s.maxItems) out.push(path + ': allows at most ' + s.maxItems + ' items');
        if (s.items) v.forEach(function (x, i) { check(x, s.items, path + '[' + i + ']', out); });
        if (s.contains && !v.some(function (x) { var o = []; check(x, s.contains, path, o); return !o.length; })) out.push(path + ': must contain ' + JSON.stringify(deref(s.contains).const || 'a matching item'));
      }
      if (isObj(v)) {
        (s.required || []).forEach(function (k) { if (!(k in v)) out.push(path + ': missing "' + k + '"'); });
        var props = s.properties || {};
        Object.keys(v).forEach(function (k) {
          if (props[k]) check(v[k], props[k], path + '.' + k, out);
          else if (s.additionalProperties && typeof s.additionalProperties === 'object') check(v[k], s.additionalProperties, path + '.' + k, out);
          else if (s.additionalProperties === false) out.push(path + ': unexpected "' + k + '"');
        });
      }
      if (s.anyOf && !s.anyOf.some(function (alt) { var o = []; check(v, alt, path, o); return !o.length; })) out.push(path + ': does not match any allowed shape');
      if (s.oneOf) {
        var n = s.oneOf.filter(function (alt) { var o = []; check(v, alt, path, o); return !o.length; }).length;
        if (n !== 1) out.push(path + ': must match exactly one of ' + s.oneOf.length + ' shapes (matched ' + n + ')');
      }
    };
    check(doc, schema, '$', errors);
    return errors.slice(0, limit);
  }

  /* ═══════════════════════════════════════════ active baseline store */

  var BASELINE_KEY = 'aegis:active-tokens:v1';
  var BASELINE_SCHEMA = 'aegis-active-tokens@1';

  function storage() { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } }

  /**
   * Read the active baseline. Never throws.
   * → { status: 'ok', record } | { status: 'empty' } | { status: 'unavailable' } | { status: 'corrupt', reason }
   */
  function readBaseline() {
    var ls = storage();
    if (!ls) return { status: 'unavailable' };
    var raw;
    try { raw = ls.getItem(BASELINE_KEY); } catch (e) { return { status: 'unavailable' }; }
    if (raw === null || raw === '') return { status: 'empty' };
    return parseBaseline(raw);
  }
  function parseBaseline(raw) {
    var rec;
    try { rec = JSON.parse(raw); } catch (e) { return { status: 'corrupt', reason: 'Saved tokens are not valid JSON.' }; }
    if (!isObj(rec) || rec.schema !== BASELINE_SCHEMA) return { status: 'corrupt', reason: 'Saved tokens use an unknown record format.' };
    var errs = validateForPlugin(rec.doc);
    if (errs.length) return { status: 'corrupt', reason: 'Saved tokens failed validation: ' + errs[0] };
    if (rec.extraVars && !isObj(rec.extraVars)) return { status: 'corrupt', reason: 'Saved tokens have a malformed variable map.' };
    return { status: 'ok', record: rec };
  }

  /**
   * Save the active baseline. `extraVars` maps additional CSS variable names
   * (e.g. Studio's --ae-* names) to their light-mode values.
   * → { ok: true } | { ok: false, reason }
   */
  function writeBaseline(doc, info) {
    info = info || {};
    var errs = validateForPlugin(doc);
    if (errs.length) return { ok: false, reason: errs[0] };
    var ls = storage();
    if (!ls) return { ok: false, reason: 'Browser storage is unavailable.' };
    var rec = {
      schema: BASELINE_SCHEMA,
      savedAt: new Date().toISOString(),
      origin: info.origin || 'studio',
      presetId: info.presetId || null,
      name: doc.meta.name,
      prefix: info.prefix || null,
      extraVars: info.extraVars || {},
      doc: doc
    };
    try { ls.setItem(BASELINE_KEY, JSON.stringify(rec)); return { ok: true, record: rec }; }
    catch (e) { return { ok: false, reason: /quota/i.test(String(e && (e.name || e.message))) ? 'Browser storage is full.' : 'Browser storage refused the write.' }; }
  }
  function clearBaseline() { var ls = storage(); if (!ls) return false; try { ls.removeItem(BASELINE_KEY); return true; } catch (e) { return false; } }

  /** Call fn(readResult) whenever another tab changes the baseline. Returns an unsubscribe function. */
  function onBaselineChange(fn) {
    if (typeof window === 'undefined') return function () {};
    var h = function (e) {
      if (e.key !== BASELINE_KEY && e.key !== null) return; // null = storage.clear()
      fn(e.newValue === null || e.newValue === '' ? { status: 'empty' } : parseBaseline(e.newValue));
    };
    window.addEventListener('storage', h);
    return function () { window.removeEventListener('storage', h); };
  }

  /**
   * Flatten a canonical document for validation and preview injection.
   * → { vars: {cssVar: cssValue}, names: [...], palette: [{hex, token}] }
   * Colour values resolve for `mode` (default light); palette holds both modes.
   */
  function flatten(doc, mode, extraVars) {
    mode = mode || 'light';
    var vars = {}, palette = [], seen = {};
    var addColor = function (hex, token) { var h = toHex8(hex); if (!h) return; var k = h.length === 9 && h.slice(7) === 'ff' ? h.slice(0, 7) : h; if (seen[k]) return; seen[k] = 1; palette.push({ hex: k, token: token }); };
    walk(doc.tokens, function (tok, trail) {
      var name = tok.$extensions && tok.$extensions.aegis && tok.$extensions.aegis.cssVar;
      var raw = tok.$modes ? tok.$modes[mode] : tok.$value;
      var v = resolve(doc, raw, mode);
      if (tok.$type === 'color') {
        (doc.modes || ['light']).forEach(function (m) { addColor(resolve(doc, tok.$modes ? tok.$modes[m] : tok.$value, m), name || trail.join('.')); });
      }
      if (!name) return;
      var css = cssValue(tok.$type, v, tok, doc);
      if (css !== null) vars[name] = css;
    });
    Object.keys(extraVars || {}).forEach(function (k) {
      if (!/^--[a-z0-9-]+$/i.test(k)) return;
      var v = String(extraVars[k]);
      if (/[;{}<>]/.test(v)) return; // never let stored values escape a declaration
      vars[k] = v;
      if (/^#[0-9a-f]{3,8}$/i.test(v.trim())) addColor(v.trim(), k);
    });
    return { vars: vars, names: Object.keys(vars), palette: palette };
  }
  function cssValue(type, v, tok, doc) {
    if (v === undefined || v === null) return null;
    switch (type) {
      case 'color': return toHex8(v) || null;
      case 'dimension': return typeof v === 'number' ? (v === 0 ? '0' : v === 9999 ? '9999px' : v + 'px') : null;
      case 'duration': return typeof v === 'number' ? v + 'ms' : null;
      case 'cubicBezier': return Array.isArray(v) ? 'cubic-bezier(' + v.join(', ') + ')' : null;
      case 'fontWeight': case 'number': return typeof v === 'number' ? String(v) : null;
      case 'fontFamily': return (tok.$extensions && tok.$extensions.aegis && tok.$extensions.aegis.stack) || ('"' + v + '"');
      case 'shadow': return Array.isArray(v) ? (v.length ? v.map(function (l) { return l.x + 'px ' + l.y + 'px ' + l.blur + 'px ' + l.spread + 'px ' + l.color; }).join(', ') : 'none') : null;
      case 'typography':
        if (!isObj(v)) return null;
        var fam = resolve(doc, v.fontFamily, 'light');
        var famTok = isAlias(v.fontFamily) ? getPath(doc.tokens, aliasPath(v.fontFamily)) : null;
        var stack = famTok && famTok.$extensions && famTok.$extensions.aegis && famTok.$extensions.aegis.stack;
        return v.fontWeight + ' ' + v.fontSize + 'px/' + v.lineHeight + 'px ' + (stack || '"' + fam + '"');
      case 'string': return typeof v === 'string' && !/[;{}<>]/.test(v) ? v : null;
      default: return null;
    }
  }

  return {
    FORMAT: FORMAT, VERSION: VERSION, BASELINE_KEY: BASELINE_KEY,
    isAlias: isAlias, getPath: getPath, walk: walk, resolve: resolve, resolvePath: resolvePath, toHex8: toHex8,
    fromStudio: fromStudio, toStudioState: toStudioState,
    validateForPlugin: validateForPlugin, validateSchema: validateSchema,
    readBaseline: readBaseline, parseBaseline: parseBaseline, writeBaseline: writeBaseline, clearBaseline: clearBaseline, onBaselineChange: onBaselineChange,
    flatten: flatten
  };
});
