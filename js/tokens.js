/* AegisUI — token engine
 * Turns Studio state into a resolved design-token model, then serialises it
 * as CSS custom properties or W3C Design Tokens (DTCG 2025.10) JSON.
 */
(function (Aegis) {
  'use strict';
  const C = Aegis.color;

  /* ---------------- Defaults & presets ---------------- */
  const FONT_STACKS = {
    'system-sans': { label: 'System Sans', stack: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'] },
    'neo-grotesque': { label: 'Neo-Grotesque', stack: ['Inter', 'Roboto', 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', 'Arial', 'sans-serif'] },
    humanist: { label: 'Humanist', stack: ['Seravek', 'Gill Sans Nova', 'Ubuntu', 'Calibri', 'DejaVu Sans', 'source-sans-pro', 'sans-serif'] },
    geometric: { label: 'Geometric', stack: ['Avenir', 'Montserrat', 'Corbel', 'URW Gothic', 'source-sans-pro', 'sans-serif'] },
    'industrial': { label: 'Industrial', stack: ['Bahnschrift', 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', 'sans-serif'] },
    transitional: { label: 'Transitional Serif', stack: ['Charter', 'Bitstream Charter', 'Sitka Text', 'Cambria', 'serif'] },
    'old-style': { label: 'Old Style Serif', stack: ['Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', 'P052', 'serif'] },
    'mono-code': { label: 'Monospace Code', stack: ['ui-monospace', 'Cascadia Code', 'Source Code Pro', 'Menlo', 'Consolas', 'DejaVu Sans Mono', 'monospace'] }
  };

  const RATIOS = [
    { value: 1.125, label: 'Major Second · 1.125' },
    { value: 1.2, label: 'Minor Third · 1.200' },
    { value: 1.25, label: 'Major Third · 1.250' },
    { value: 1.333, label: 'Perfect Fourth · 1.333' },
    { value: 1.414, label: 'Augmented Fourth · 1.414' },
    { value: 1.5, label: 'Perfect Fifth · 1.500' },
    { value: 1.618, label: 'Golden Ratio · 1.618' }
  ];

  const EASINGS = {
    standard: { label: 'Standard (Material 3)', curve: [0.2, 0, 0, 1] },
    productive: { label: 'Productive (Carbon)', curve: [0.2, 0, 0.38, 0.9] },
    expressive: { label: 'Expressive', curve: [0.4, 0.14, 0.3, 1] },
    smooth: { label: 'Smooth in-out', curve: [0.45, 0, 0.55, 1] },
    overshoot: { label: 'Overshoot', curve: [0.34, 1.56, 0.64, 1] },
    linear: { label: 'Linear', curve: [0, 0, 1, 1] },
    custom: { label: 'Custom…', curve: null }
  };

  const DEFAULT_STATE = {
    name: 'Aegis',
    prefix: 'ae',
    color: {
      primary: '#1d63d8',
      neutral: '#5f6b7a',
      neutralTint: 50,
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626',
      info: '#0891b2'
    },
    type: { heading: 'system-sans', body: 'system-sans', mono: 'mono-code', base: 16, ratio: 1.25, lineHeight: 1.5, headingWeight: 650 },
    space: { grid: 4 },
    radius: { base: 8 },
    shadow: { depth: 2 },
    motion: { duration: 200, easing: 'standard', curve: [0.2, 0, 0, 1] }
  };

  const PRESETS = {
    aegis: { label: 'Aegis Default', state: DEFAULT_STATE },
    fintech: {
      label: 'Fintech Trust',
      state: {
        name: 'Ledgerline', prefix: 'll',
        color: { primary: '#123c7a', neutral: '#55606e', neutralTint: 35, success: '#15803d', warning: '#b45309', danger: '#b91c1c', info: '#0369a1' },
        type: { heading: 'transitional', body: 'neo-grotesque', mono: 'mono-code', base: 15, ratio: 1.2, lineHeight: 1.5, headingWeight: 600 },
        space: { grid: 4 }, radius: { base: 4 }, shadow: { depth: 1 },
        motion: { duration: 160, easing: 'productive', curve: [0.2, 0, 0.38, 0.9] }
      }
    },
    health: {
      label: 'Clinical Calm',
      state: {
        name: 'Verdant Health', prefix: 'vh',
        color: { primary: '#0f7a6c', neutral: '#5c6b68', neutralTint: 60, success: '#178a3e', warning: '#c27803', danger: '#c8322b', info: '#2874b8' },
        type: { heading: 'humanist', body: 'humanist', mono: 'mono-code', base: 17, ratio: 1.2, lineHeight: 1.6, headingWeight: 600 },
        space: { grid: 8 }, radius: { base: 12 }, shadow: { depth: 2 },
        motion: { duration: 240, easing: 'smooth', curve: [0.45, 0, 0.55, 1] }
      }
    },
    creator: {
      label: 'Creator Bold',
      state: {
        name: 'Fable Studio', prefix: 'fs',
        color: { primary: '#e0531f', neutral: '#6b625e', neutralTint: 70, success: '#2f9e44', warning: '#e8a317', danger: '#d6336c', info: '#4263eb' },
        type: { heading: 'geometric', body: 'system-sans', mono: 'mono-code', base: 16, ratio: 1.333, lineHeight: 1.5, headingWeight: 800 },
        space: { grid: 8 }, radius: { base: 16 }, shadow: { depth: 4 },
        motion: { duration: 280, easing: 'overshoot', curve: [0.34, 1.56, 0.64, 1] }
      }
    },
    mono: {
      label: 'Monochrome Enterprise',
      state: {
        name: 'Graphite', prefix: 'gr',
        color: { primary: '#2b2f36', neutral: '#6a6d73', neutralTint: 10, success: '#1f8a4c', warning: '#b7791f', danger: '#c53030', info: '#2b6cb0' },
        type: { heading: 'industrial', body: 'neo-grotesque', mono: 'mono-code', base: 14, ratio: 1.2, lineHeight: 1.45, headingWeight: 700 },
        space: { grid: 4 }, radius: { base: 2 }, shadow: { depth: 1 },
        motion: { duration: 120, easing: 'linear', curve: [0, 0, 1, 1] }
      }
    }
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));

  /** Merge a possibly partial / untrusted state object onto defaults. */
  function sanitizeState(input) {
    const s = clone(DEFAULT_STATE);
    if (!input || typeof input !== 'object') return s;
    const str = (v, d, max = 40) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : d);
    const num = (v, d, lo, hi) => (Number.isFinite(+v) ? C.clamp(+v, lo, hi) : d);
    const hex = (v, d) => (C.isHex(v) ? C.normalizeHex(v) : d);
    s.name = str(input.name, s.name);
    s.prefix = /^[a-z][a-z0-9-]{0,11}$/.test(input.prefix || '') ? input.prefix : s.prefix;
    const ic = input.color || {};
    ['primary', 'neutral', 'success', 'warning', 'danger', 'info'].forEach((k) => { s.color[k] = hex(ic[k], s.color[k]); });
    s.color.neutralTint = num(ic.neutralTint, s.color.neutralTint, 0, 100);
    const it = input.type || {};
    ['heading', 'body', 'mono'].forEach((k) => { if (FONT_STACKS[it[k]]) s.type[k] = it[k]; });
    s.type.base = num(it.base, s.type.base, 12, 22);
    s.type.ratio = num(it.ratio, s.type.ratio, 1.05, 1.7);
    s.type.lineHeight = num(it.lineHeight, s.type.lineHeight, 1.2, 1.9);
    s.type.headingWeight = num(it.headingWeight, s.type.headingWeight, 400, 900);
    s.space.grid = (input.space && +input.space.grid === 8) ? 8 : 4;
    s.radius.base = num(input.radius && input.radius.base, s.radius.base, 0, 32);
    s.shadow.depth = num(input.shadow && input.shadow.depth, s.shadow.depth, 0, 5);
    const im = input.motion || {};
    s.motion.duration = num(im.duration, s.motion.duration, 0, 1000);
    s.motion.easing = EASINGS[im.easing] ? im.easing : s.motion.easing;
    if (Array.isArray(im.curve) && im.curve.length === 4 && im.curve.every((n) => Number.isFinite(+n))) {
      s.motion.curve = im.curve.map((n, i) => (i % 2 === 0 ? C.clamp(+n, 0, 1) : C.clamp(+n, -1, 2)));
    } else if (EASINGS[s.motion.easing].curve) {
      s.motion.curve = EASINGS[s.motion.easing].curve.slice();
    }
    return s;
  }

  /* ---------------- Resolution helpers ---------------- */
  const STOPS = C.STOPS;
  const WHITE = '#ffffff';

  /** Walk a scale from `start` in `dir` until `test(hex)` passes. Returns {stop, hex}. */
  function walk(scale, start, dir, test) {
    let i = STOPS.indexOf(start);
    while (i >= 0 && i < STOPS.length) {
      if (test(scale[STOPS[i]])) return { stop: STOPS[i], hex: scale[STOPS[i]] };
      i += dir;
    }
    const last = dir > 0 ? STOPS[STOPS.length - 1] : STOPS[0];
    return { stop: last, hex: scale[last] };
  }
  const step = (stop, n) => STOPS[C.clamp(STOPS.indexOf(stop) + n, 0, STOPS.length - 1)];
  const ref = (family, stop, scales) => ({ ref: `${family}.${stop}`, hex: scales[family][stop] });
  const lit = (hex) => ({ ref: null, hex });

  /** Pick the brand fill + on-colour pair for a mode, enforcing 4.5:1 for button labels. */
  function resolveBrand(scale, anchor, mode, darkText) {
    const candidates = mode === 'light'
      ? [anchor, 600, 700, 800, 900].filter((s, i, a) => s && s >= 400 && a.indexOf(s) === i)
      : [400, 300, 500, 200, 600].filter((s, i, a) => a.indexOf(s) === i);
    if (mode === 'light' && anchor && anchor < 400) candidates.unshift(anchor);
    for (const stop of candidates) {
      const fill = scale[stop];
      const onWhite = C.contrast(fill, WHITE), onDark = C.contrast(fill, darkText);
      const on = onWhite >= onDark ? WHITE : darkText;
      const ratio = Math.max(onWhite, onDark);
      if (ratio >= 4.5) return { stop, on, ratio };
    }
    const stop = mode === 'light' ? 700 : 300;
    return { stop, on: mode === 'light' ? WHITE : darkText, ratio: C.contrast(scale[stop], mode === 'light' ? WHITE : darkText) };
  }

  /* ---------------- Build ---------------- */
  function build(stateIn) {
    const state = sanitizeState(stateIn);
    const notes = [];

    // Colour primitives
    const tintCap = 0.004 + (state.color.neutralTint / 100) * 0.036;
    const gen = {
      primary: C.generateScale(state.color.primary),
      neutral: C.generateScale(state.color.neutral, { neutral: true, chromaCap: tintCap }),
      success: C.generateScale(state.color.success),
      warning: C.generateScale(state.color.warning),
      danger: C.generateScale(state.color.danger),
      info: C.generateScale(state.color.info)
    };
    const scales = {};
    Object.keys(gen).forEach((k) => { scales[k] = gen[k].scale; });
    const anchor = gen.primary.anchor;
    const N = scales.neutral;

    const semantic = { light: {}, dark: {} };

    // ---- Light mode ----
    {
      const s = semantic.light;
      const surface = WHITE;
      s['bg'] = ref('neutral', 50, scales);
      s['surface'] = lit(surface);
      s['surface-raised'] = lit(surface);
      s['surface-sunken'] = ref('neutral', 100, scales);
      s['surface-inverse'] = ref('neutral', 900, scales);
      s['border'] = ref('neutral', 200, scales);
      const bs = walk(N, 400, 1, (h) => C.contrast(h, surface) >= 3 && C.contrast(h, N[50]) >= 3);
      s['border-strong'] = ref('neutral', bs.stop, scales);
      s['text'] = ref('neutral', 900, scales);
      s['text-muted'] = ref('neutral', 700, scales);
      const sub = walk(N, 500, 1, (h) => C.contrast(h, surface) >= 4.5 && C.contrast(h, N[50]) >= 4.5);
      s['text-subtle'] = ref('neutral', sub.stop, scales);
      s['text-inverse'] = ref('neutral', 50, scales);
      const brand = resolveBrand(scales.primary, anchor, 'light', N[950]);
      if (anchor && brand.stop !== anchor) notes.push(`Light mode: primary ${anchor} → ${brand.stop} so button labels reach ${brand.ratio.toFixed(2)}:1.`);
      s['primary'] = ref('primary', brand.stop, scales);
      s['primary-hover'] = ref('primary', step(brand.stop, 1), scales);
      s['primary-active'] = ref('primary', step(brand.stop, 2), scales);
      s['on-primary'] = brand.on === WHITE ? lit(WHITE) : ref('neutral', 950, scales);
      s['primary-subtle'] = ref('primary', 50, scales);
      const pst = walk(scales.primary, 700, 1, (h) => C.contrast(h, scales.primary[50]) >= 4.5);
      s['primary-subtle-text'] = ref('primary', pst.stop, scales);
      const link = walk(scales.primary, Math.max(600, brand.stop), 1, (h) => C.contrast(h, surface) >= 4.5 && C.contrast(h, N[50]) >= 4.5);
      s['link'] = ref('primary', link.stop, scales);
      s['focus-ring'] = ref('primary', link.stop, scales);
      ['success', 'warning', 'danger', 'info'].forEach((k) => {
        const sc = scales[k];
        const fg = walk(sc, 600, 1, (h) => C.contrast(h, surface) >= 4.5);
        s[k] = ref(k, fg.stop, scales);
        s[`${k}-subtle`] = ref(k, 50, scales);
        const st = walk(sc, 700, 1, (h) => C.contrast(h, sc[50]) >= 4.5);
        s[`${k}-subtle-text`] = ref(k, st.stop, scales);
        const onC = C.contrast(sc[fg.stop], WHITE) >= 4.5 ? lit(WHITE) : ref('neutral', 950, scales);
        s[`on-${k}`] = onC;
      });
      s['overlay'] = lit('rgb(' + C.hexToRgbString(N[950]).split(' ').join(' ') + ' / 0.5)');
    }

    // ---- Dark mode ----
    {
      const s = semantic.dark;
      const surface = N[900];
      const bg = N[950];
      s['bg'] = ref('neutral', 950, scales);
      s['surface'] = ref('neutral', 900, scales);
      s['surface-raised'] = ref('neutral', 800, scales);
      s['surface-sunken'] = ref('neutral', 950, scales);
      s['surface-inverse'] = ref('neutral', 100, scales);
      s['border'] = ref('neutral', 800, scales);
      const bs = walk(N, 600, -1, (h) => C.contrast(h, surface) >= 3 && C.contrast(h, N[800]) >= 2);
      s['border-strong'] = ref('neutral', bs.stop, scales);
      s['text'] = ref('neutral', 50, scales);
      s['text-muted'] = ref('neutral', 300, scales);
      const sub = walk(N, 400, -1, (h) => C.contrast(h, N[800]) >= 4.5);
      s['text-subtle'] = ref('neutral', sub.stop, scales);
      s['text-inverse'] = ref('neutral', 900, scales);
      const brand = resolveBrand(scales.primary, anchor, 'dark', N[950]);
      s['primary'] = ref('primary', brand.stop, scales);
      s['primary-hover'] = ref('primary', step(brand.stop, -1), scales);
      s['primary-active'] = ref('primary', step(brand.stop, -2), scales);
      s['on-primary'] = brand.on === WHITE ? lit(WHITE) : ref('neutral', 950, scales);
      s['primary-subtle'] = ref('primary', 950, scales);
      const pst = walk(scales.primary, 200, -1, (h) => C.contrast(h, scales.primary[950]) >= 4.5);
      s['primary-subtle-text'] = ref('primary', pst.stop, scales);
      const link = walk(scales.primary, Math.min(300, brand.stop), -1, (h) => C.contrast(h, surface) >= 4.5 && C.contrast(h, N[800]) >= 4.5);
      s['link'] = ref('primary', link.stop, scales);
      s['focus-ring'] = ref('primary', link.stop, scales);
      ['success', 'warning', 'danger', 'info'].forEach((k) => {
        const sc = scales[k];
        const fg = walk(sc, 400, -1, (h) => C.contrast(h, surface) >= 4.5 && C.contrast(h, N[800]) >= 4.5);
        s[k] = ref(k, fg.stop, scales);
        s[`${k}-subtle`] = ref(k, 950, scales);
        const st = walk(sc, 200, -1, (h) => C.contrast(h, sc[950]) >= 4.5);
        s[`${k}-subtle-text`] = ref(k, st.stop, scales);
        s[`on-${k}`] = C.contrast(sc[fg.stop], N[950]) >= C.contrast(sc[fg.stop], WHITE) ? ref('neutral', 950, scales) : lit(WHITE);
      });
      s['overlay'] = lit('rgb(0 0 0 / 0.6)');
      void bg;
    }

    // Typography
    const t = state.type;
    const SIZE_NAMES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
    const sizes = SIZE_NAMES.map((name, i) => {
      const n = i - 2;
      const px = Math.round(t.base * Math.pow(t.ratio, n) * 100) / 100;
      const lh = n <= 1 ? t.lineHeight : Math.max(1.1, Math.round((t.lineHeight - (n - 1) * 0.08) * 100) / 100);
      const tracking = n >= 4 ? -0.02 : n >= 2 ? -0.01 : 0;
      return { name, step: n, px, rem: Math.round((px / 16) * 10000) / 10000, lineHeight: lh, tracking };
    });
    const typography = {
      families: { heading: FONT_STACKS[t.heading], body: FONT_STACKS[t.body], mono: FONT_STACKS[t.mono] },
      sizes,
      weights: { regular: 400, medium: 500, semibold: 600, bold: 700, heading: Math.round(t.headingWeight) },
      ratio: t.ratio,
      base: t.base,
      lineHeight: t.lineHeight
    };

    // Spacing
    const g = state.space.grid;
    const mult = g === 4 ? [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32] : [0, 0.5, 1, 2, 3, 4, 6, 8, 10, 12, 16];
    const space = mult.map((m, i) => ({ name: String(i), px: m * g }));
    const controls = [{ name: 'sm', px: 32 }, { name: 'md', px: 40 }, { name: 'lg', px: 48 }];

    // Radius
    const r = state.radius.base;
    const radius = [
      { name: 'none', px: 0 }, { name: 'sm', px: Math.round(r * 0.5) }, { name: 'md', px: r },
      { name: 'lg', px: Math.round(r * 1.5) }, { name: 'xl', px: r * 2 }, { name: 'full', px: 9999 }
    ];

    // Shadows
    const d = state.shadow.depth;
    const shadowRgb = C.hexToRgbString(N[950]);
    function shadowSet(alphaMul) {
      const k = d / 2;
      const a = (v) => Math.min(0.7, Math.round(v * k * alphaMul * 1000) / 1000);
      const s = (v) => Math.round(v * (0.6 + 0.2 * d) * 10) / 10;
      const layer = (x, y, blur, spread, alpha) => ({ x, y: s(y), blur: s(blur), spread, alpha: a(alpha), rgb: shadowRgb });
      if (d === 0) return ['xs', 'sm', 'md', 'lg', 'xl'].map((name) => ({ name, layers: [] }));
      return [
        { name: 'xs', layers: [layer(0, 1, 2, 0, 0.05)] },
        { name: 'sm', layers: [layer(0, 1, 3, 0, 0.08), layer(0, 1, 2, -1, 0.06)] },
        { name: 'md', layers: [layer(0, 4, 8, -2, 0.09), layer(0, 2, 4, -2, 0.06)] },
        { name: 'lg', layers: [layer(0, 12, 24, -4, 0.1), layer(0, 4, 8, -4, 0.05)] },
        { name: 'xl', layers: [layer(0, 24, 48, -12, 0.18)] }
      ];
    }
    const shadows = { light: shadowSet(1), dark: shadowSet(3) };

    // Motion
    const m = state.motion;
    const curve = m.easing !== 'custom' && EASINGS[m.easing].curve ? EASINGS[m.easing].curve.slice() : m.curve.slice();
    const durations = [
      { name: 'instant', ms: 0 }, { name: 'fast', ms: Math.round(m.duration * 0.6) }, { name: 'base', ms: m.duration },
      { name: 'slow', ms: Math.round(m.duration * 1.5) }, { name: 'slower', ms: Math.round(m.duration * 2.25) }
    ];
    const easings = [
      { name: 'standard', curve },
      { name: 'enter', curve: [0, 0, curve[2], curve[3]] },
      { name: 'exit', curve: [curve[0], curve[1], 1, 1] },
      { name: 'linear', curve: [0, 0, 1, 1] }
    ];

    const tokens = { state, scales, anchor, semantic, typography, space, controls, radius, shadows, motion: { durations, easings }, notes };
    tokens.audit = audit(tokens);
    return tokens;
  }

  /* ---------------- Accessibility audit ---------------- */
  function audit(tk) {
    const rows = [];
    const add = (mode, label, fg, bg, min, kind) => {
      const S = tk.semantic[mode];
      const f = S[fg].hex, b = S[bg].hex;
      if (f.startsWith('rgb') || b.startsWith('rgb')) return;
      const ratio = C.contrast(f, b);
      rows.push({ mode, label, fg, bg, fgHex: f, bgHex: b, ratio, min, kind, pass: ratio >= min });
    };
    ['light', 'dark'].forEach((mode) => {
      add(mode, 'Body text on background', 'text', 'bg', 4.5, '1.4.3');
      add(mode, 'Muted text on surface', 'text-muted', 'surface', 4.5, '1.4.3');
      add(mode, 'Subtle text on surface', 'text-subtle', 'surface', 4.5, '1.4.3');
      add(mode, 'Button label on primary', 'on-primary', 'primary', 4.5, '1.4.3');
      add(mode, 'Link on surface', 'link', 'surface', 4.5, '1.4.3');
      add(mode, 'Badge text on primary-subtle', 'primary-subtle-text', 'primary-subtle', 4.5, '1.4.3');
      add(mode, 'Input border on surface', 'border-strong', 'surface', 3, '1.4.11');
      add(mode, 'Focus ring on background', 'focus-ring', 'bg', 3, '1.4.11');
      ['success', 'warning', 'danger', 'info'].forEach((k) => {
        add(mode, `${k[0].toUpperCase() + k.slice(1)} text on surface`, k, 'surface', 4.5, '1.4.3');
        add(mode, `${k[0].toUpperCase() + k.slice(1)} badge text`, `${k}-subtle-text`, `${k}-subtle`, 4.5, '1.4.3');
      });
    });
    return rows;
  }

  /* ---------------- Serialisers ---------------- */
  const px2rem = (px) => `${Math.round((px / 16) * 10000) / 10000}rem`;
  const bez = (c) => `cubic-bezier(${c.map((n) => +n.toFixed(3)).join(', ')})`;
  const fontStack = (arr) => arr.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
  const shadowCss = (s) => (s.layers.length ? s.layers.map((l) => `${l.x}px ${l.y}px ${l.blur}px ${l.spread}px rgb(${l.rgb} / ${l.alpha})`).join(', ') : 'none');

  function semanticDecls(tk, mode, p) {
    const S = tk.semantic[mode];
    return Object.keys(S).map((k) => {
      const v = S[k];
      const val = v.ref ? `var(--${p}-${v.ref.replace('.', '-')})` : v.hex;
      return `  --${p}-color-${k}: ${val};`;
    });
  }

  /**
   * CSS custom properties.
   * opts.root: selector for light/base tokens; opts.dark: selector for dark overrides;
   * opts.media: also emit prefers-color-scheme + prefers-reduced-motion blocks.
   */
  function toCSS(tk, opts = {}) {
    const p = opts.prefix || tk.state.prefix;
    const root = opts.root || ':root';
    const dark = opts.dark || ':root[data-theme="dark"]';
    const media = opts.media !== false;
    const L = [];
    const ty = tk.typography;
    const head = opts.header !== false;
    if (head) {
      L.push('/**');
      L.push(` * ${tk.state.name} Design System — variables.css`);
      L.push(' * Generated by AegisUI. Do not edit by hand; change tokens in the Studio and re-export.');
      L.push(' * Colour scales are generated in OKLCH and gamut-mapped to sRGB.');
      L.push(' * Semantic colour pairs are checked against WCAG 2.2 AA (1.4.3 / 1.4.11).');
      L.push(' */');
      L.push('');
    }
    L.push(`${root} {`);
    L.push('  color-scheme: light;');
    L.push('');
    L.push('  /* ── Colour primitives (do not use directly in components) ── */');
    Object.keys(tk.scales).forEach((fam) => {
      STOPS.forEach((st) => L.push(`  --${p}-${fam}-${st}: ${tk.scales[fam][st]};`));
    });
    L.push('');
    L.push('  /* ── Semantic colour (use these in components) ── */');
    L.push(...semanticDecls(tk, 'light', p));
    L.push('');
    L.push('  /* ── Typography ── */');
    L.push(`  --${p}-font-heading: ${fontStack(ty.families.heading.stack)};`);
    L.push(`  --${p}-font-body: ${fontStack(ty.families.body.stack)};`);
    L.push(`  --${p}-font-mono: ${fontStack(ty.families.mono.stack)};`);
    ty.sizes.forEach((s) => {
      L.push(`  --${p}-font-size-${s.name}: ${s.rem}rem; /* ${s.px}px */`);
      L.push(`  --${p}-line-height-${s.name}: ${s.lineHeight};`);
      L.push(`  --${p}-tracking-${s.name}: ${s.tracking}em;`);
    });
    Object.keys(ty.weights).forEach((w) => L.push(`  --${p}-font-weight-${w}: ${ty.weights[w]};`));
    L.push('');
    L.push(`  /* ── Spacing (${tk.state.space.grid}px grid) ── */`);
    L.push(`  --${p}-space-unit: ${tk.state.space.grid}px;`);
    tk.space.forEach((s) => L.push(`  --${p}-space-${s.name}: ${s.px === 0 ? '0' : px2rem(s.px)}; /* ${s.px}px */`));
    tk.controls.forEach((s) => L.push(`  --${p}-size-control-${s.name}: ${px2rem(s.px)}; /* ${s.px}px */`));
    L.push(`  --${p}-size-target-min: 1.5rem; /* 24px — WCAG 2.2 SC 2.5.8 */`);
    L.push('');
    L.push('  /* ── Radius ── */');
    tk.radius.forEach((r) => L.push(`  --${p}-radius-${r.name}: ${r.px === 9999 ? '9999px' : r.px === 0 ? '0' : px2rem(r.px)};`));
    L.push('');
    L.push('  /* ── Elevation ── */');
    tk.shadows.light.forEach((s) => L.push(`  --${p}-shadow-${s.name}: ${shadowCss(s)};`));
    L.push('');
    L.push('  /* ── Motion ── */');
    tk.motion.durations.forEach((d) => L.push(`  --${p}-duration-${d.name}: ${d.ms}ms;`));
    tk.motion.easings.forEach((e) => L.push(`  --${p}-ease-${e.name}: ${bez(e.curve)};`));
    L.push('');
    L.push('  /* ── Focus (WCAG 2.2 SC 2.4.7 / 2.4.11) ── */');
    L.push(`  --${p}-focus-ring-width: 2px;`);
    L.push(`  --${p}-focus-ring-offset: 2px;`);
    L.push('}');
    L.push('');

    const darkBody = () => {
      const D = ['  color-scheme: dark;'];
      D.push(...semanticDecls(tk, 'dark', p));
      tk.shadows.dark.forEach((s) => D.push(`  --${p}-shadow-${s.name}: ${shadowCss(s)};`));
      return D;
    };
    L.push(`${dark} {`);
    L.push(...darkBody());
    L.push('}');
    if (media) {
      L.push('');
      L.push('@media (prefers-color-scheme: dark) {');
      L.push(`  ${root}:not([data-theme="light"]) {`);
      L.push(...darkBody().map((l) => '  ' + l));
      L.push('  }');
      L.push('}');
      L.push('');
      L.push('/* WCAG 2.2 SC 2.3.3 — honour reduced-motion preferences */');
      L.push('@media (prefers-reduced-motion: reduce) {');
      L.push(`  ${root} {`);
      tk.motion.durations.filter((d) => d.ms > 0).forEach((d) => L.push(`    --${p}-duration-${d.name}: 0.01ms;`));
      L.push('  }');
      L.push('}');
    }
    return L.join('\n') + '\n';
  }

  /** W3C Design Tokens Community Group format (2025.10). legacy=true emits string values. */
  function toDTCG(tk, { legacy = false } = {}) {
    const colorVal = (hex) => {
      if (legacy) return hex;
      const { L, C: ch, H } = C.hexToOklch(hex);
      return { colorSpace: 'oklch', components: [C.round(L, 4), C.round(ch, 4), C.round(H, 2)], alpha: 1, hex };
    };
    const dim = (px, unit = 'px') => (legacy ? (unit === 'rem' ? `${px}rem` : `${px}px`) : { value: px, unit });
    const dur = (ms) => (legacy ? `${ms}ms` : { value: ms, unit: 'ms' });

    const out = {
      $description: `${tk.state.name} design tokens generated by AegisUI. Colour scales are OKLCH-derived; semantic pairs meet WCAG 2.2 AA.`,
      color: {}
    };
    Object.keys(tk.scales).forEach((fam) => {
      out.color[fam] = { $type: 'color' };
      STOPS.forEach((st) => { out.color[fam][st] = { $value: colorVal(tk.scales[fam][st]) }; });
    });

    const semGroup = (mode) => {
      const g = { $type: 'color', $description: `Semantic colour roles — ${mode} mode.` };
      const S = tk.semantic[mode];
      Object.keys(S).forEach((k) => {
        const v = S[k];
        if (v.ref) g[k] = { $value: `{color.${v.ref}}` };
        else if (v.hex.startsWith('#')) g[k] = { $value: colorVal(v.hex) };
        else {
          const m = v.hex.match(/rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)/);
          if (m) {
            const hex = C.rgbToHex({ r: m[1] / 255, g: m[2] / 255, b: m[3] / 255 });
            g[k] = { $value: legacy ? v.hex : { colorSpace: 'srgb', components: [m[1] / 255, m[2] / 255, m[3] / 255].map((n) => C.round(n, 4)), alpha: +m[4], hex } };
          }
        }
      });
      return g;
    };
    out.semantic = { light: semGroup('light'), dark: semGroup('dark') };

    const ty = tk.typography;
    out.font = {
      family: {
        $type: 'fontFamily',
        heading: { $value: ty.families.heading.stack },
        body: { $value: ty.families.body.stack },
        mono: { $value: ty.families.mono.stack }
      },
      size: { $type: 'dimension', $description: `Modular scale: base ${ty.base}px × ${ty.ratio}^n` },
      weight: { $type: 'fontWeight' },
      lineHeight: { $type: 'number' }
    };
    ty.sizes.forEach((s) => {
      out.font.size[s.name] = { $value: dim(s.rem, 'rem') };
      out.font.lineHeight[s.name] = { $value: s.lineHeight };
    });
    Object.keys(ty.weights).forEach((w) => { out.font.weight[w] = { $value: ty.weights[w] }; });
    out.typography = { $type: 'typography' };
    ty.sizes.forEach((s) => {
      const isHeading = s.step >= 2;
      out.typography[s.name] = {
        $value: {
          fontFamily: isHeading ? '{font.family.heading}' : '{font.family.body}',
          fontSize: `{font.size.${s.name}}`,
          fontWeight: isHeading ? '{font.weight.heading}' : '{font.weight.regular}',
          letterSpacing: legacy ? `${s.tracking}em` : { value: s.tracking, unit: 'em' },
          lineHeight: `{font.lineHeight.${s.name}}`
        }
      };
    });

    out.space = { $type: 'dimension', $description: `${tk.state.space.grid}px grid` };
    tk.space.forEach((s) => { out.space[s.name] = { $value: dim(s.px) }; });
    out.size = { $type: 'dimension', control: {}, target: { min: { $value: dim(24), $description: 'WCAG 2.2 SC 2.5.8 minimum target size' } } };
    tk.controls.forEach((c) => { out.size.control[c.name] = { $value: dim(c.px) }; });
    out.radius = { $type: 'dimension' };
    tk.radius.forEach((r) => { out.radius[r.name] = { $value: dim(r.px) }; });

    const shadowGroup = (list) => {
      const g = { $type: 'shadow' };
      list.forEach((s) => {
        const layers = s.layers.map((l) => {
          const [r, gg, b] = l.rgb.split(' ').map(Number);
          const hex = C.rgbToHex({ r: r / 255, g: gg / 255, b: b / 255 });
          return {
            color: legacy ? `rgb(${l.rgb} / ${l.alpha})` : { colorSpace: 'srgb', components: [r / 255, gg / 255, b / 255].map((n) => C.round(n, 4)), alpha: l.alpha, hex },
            offsetX: dim(l.x), offsetY: dim(l.y), blur: dim(l.blur), spread: dim(l.spread)
          };
        });
        if (layers.length) g[s.name] = { $value: layers.length === 1 ? layers[0] : layers };
      });
      return g;
    };
    out.shadow = { light: shadowGroup(tk.shadows.light), dark: shadowGroup(tk.shadows.dark) };

    out.duration = { $type: 'duration' };
    tk.motion.durations.forEach((d) => { out.duration[d.name] = { $value: dur(d.ms) }; });
    out.easing = { $type: 'cubicBezier' };
    tk.motion.easings.forEach((e) => { out.easing[e.name] = { $value: e.curve.map((n) => +n.toFixed(3)) }; });
    out.transition = {
      $type: 'transition',
      default: { $value: { duration: '{duration.base}', delay: dur(0), timingFunction: '{easing.standard}' } },
      enter: { $value: { duration: '{duration.base}', delay: dur(0), timingFunction: '{easing.enter}' } },
      exit: { $value: { duration: '{duration.fast}', delay: dur(0), timingFunction: '{easing.exit}' } }
    };
    return JSON.stringify(out, null, 2) + '\n';
  }

  Aegis.tokens = {
    FONT_STACKS, RATIOS, EASINGS, DEFAULT_STATE, PRESETS,
    sanitizeState, build, toCSS, toDTCG, fontStack, bez, shadowCss, px2rem, clone
  };
})(window.Aegis = window.Aegis || {});
