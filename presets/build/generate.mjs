// Expands a compact AegisUI theme definition (presets/themes/*.mjs) into a full
// AegisUI Token document (format "aegis-tokens" v1). See presets/schema/.

import { STEPS, ramp, oklch, contrast, withAlpha } from './color.mjs';

export const FORMAT = { format: 'aegis-tokens', version: '1.0.0' };
export const MODES = ['light', 'dark'];
const STATUSES = ['success', 'warning', 'danger', 'info'];
const NEUTRAL_STEPS = [...STEPS, '1000'];

/* ------------------------------------------------------------------ helpers */

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function deepMerge(base, over) {
  if (!isObj(over)) return over === undefined ? base : over;
  const out = { ...(isObj(base) ? base : {}) };
  for (const k of Object.keys(over)) out[k] = deepMerge(out[k], over[k]);
  return out;
}
const leaf = (type, value, cssVar, description) => {
  const t = { $type: type, $value: value };
  if (description) t.$description = description;
  t.$extensions = { aegis: { cssVar } };
  return t;
};
const modedLeaf = (type, modes, cssVar, description) => {
  const t = { $type: type, $modes: modes };
  if (description) t.$description = description;
  t.$extensions = { aegis: { cssVar } };
  return t;
};

/* ------------------------------------------------------------- base scales */

const SPACING = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];

const TYPE_SCALES = {
  compact: { caption: 11, 'body-sm': 12, 'body-md': 13, 'body-lg': 15, 'label-sm': 11, 'label-md': 12, 'label-lg': 13, 'heading-sm': 15, 'heading-md': 18, 'heading-lg': 22, 'heading-xl': 28, 'display-md': 36, 'display-lg': 48, code: 12, overline: 10, numeric: 13 },
  default: { caption: 12, 'body-sm': 13, 'body-md': 14, 'body-lg': 16, 'label-sm': 12, 'label-md': 13, 'label-lg': 14, 'heading-sm': 16, 'heading-md': 20, 'heading-lg': 24, 'heading-xl': 30, 'display-md': 40, 'display-lg': 52, code: 13, overline: 11, numeric: 14 },
  comfortable: { caption: 13, 'body-sm': 14, 'body-md': 16, 'body-lg': 18, 'label-sm': 13, 'label-md': 14, 'label-lg': 16, 'heading-sm': 18, 'heading-md': 22, 'heading-lg': 28, 'heading-xl': 36, 'display-md': 48, 'display-lg': 64, code: 14, overline: 12, numeric: 16 },
  accessible: { caption: 16, 'body-sm': 16, 'body-md': 19, 'body-lg': 22, 'label-sm': 16, 'label-md': 19, 'label-lg': 19, 'heading-sm': 19, 'heading-md': 24, 'heading-lg': 36, 'heading-xl': 48, 'display-md': 56, 'display-lg': 72, code: 16, overline: 16, numeric: 19 },
  editorial: { caption: 12, 'body-sm': 14, 'body-md': 17, 'body-lg': 20, 'label-sm': 11, 'label-md': 13, 'label-lg': 15, 'heading-sm': 18, 'heading-md': 24, 'heading-lg': 34, 'heading-xl': 48, 'display-md': 72, 'display-lg': 104, code: 13, overline: 11, numeric: 15 },
};

// [name, family slot, role] — role picks weight / line-height / tracking.
const TEXT_STYLES = [
  ['display-lg', 'display', 'display'],
  ['display-md', 'display', 'display'],
  ['heading-xl', 'display', 'heading'],
  ['heading-lg', 'display', 'heading'],
  ['heading-md', 'heading', 'heading'],
  ['heading-sm', 'heading', 'heading'],
  ['body-lg', 'body', 'body'],
  ['body-md', 'body', 'body'],
  ['body-sm', 'body', 'body'],
  ['label-lg', 'label', 'label'],
  ['label-md', 'label', 'label'],
  ['label-sm', 'label', 'label'],
  ['caption', 'body', 'caption'],
  ['overline', 'label', 'overline'],
  ['code', 'mono', 'code'],
  ['numeric', 'numeric', 'numeric'],
];

const DENSITY = {
  compact: { control: [24, 28, 34], padX: [8, 10, 14], inputPadX: 8, card: 16, row: 32, cell: 10, badge: 18, badgePad: 6, modal: 20, tabs: 34, nav: 28, icon: [14, 16, 18] },
  default: { control: [30, 36, 44], padX: [12, 14, 18], inputPadX: 12, card: 20, row: 44, cell: 14, badge: 22, badgePad: 8, modal: 24, tabs: 40, nav: 34, icon: [16, 18, 20] },
  comfortable: { control: [34, 40, 48], padX: [14, 18, 22], inputPadX: 14, card: 24, row: 52, cell: 16, badge: 24, badgePad: 10, modal: 32, tabs: 44, nav: 40, icon: [16, 20, 24] },
  accessible: { control: [40, 48, 56], padX: [16, 20, 24], inputPadX: 14, card: 24, row: 56, cell: 16, badge: 28, badgePad: 10, modal: 32, tabs: 52, nav: 48, icon: [20, 24, 28] },
};

const FALLBACKS = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
};

/* ---------------------------------------------------------- semantic colors */

// Refs: "ramp.step" | "white" | "black" | "auto" | "#hex" | { ref, alpha } | "@key+n" (relative step).
const SEMANTIC_DEFAULTS = {
  light: {
    'bg.canvas': 'neutral.50',
    'bg.surface': 'white',
    'bg.surface-raised': 'white',
    'bg.surface-sunken': 'neutral.100',
    'bg.hover': 'neutral.100',
    'bg.selected': 'brand.50',
    'bg.emphasis': 'neutral.900',
    'bg.overlay': { ref: 'neutral.1000', alpha: 0.48 },
    'fg.default': 'neutral.900',
    'fg.muted': 'neutral.600',
    'fg.subtle': 'neutral.500',
    'fg.disabled': 'neutral.400',
    'fg.inverse': 'white',
    'fg.on-brand': 'auto',
    'fg.link': 'brand.600',
    'border.subtle': 'neutral.100',
    'border.default': 'neutral.200',
    'border.strong': 'neutral.500',
    'border.focus': 'brand.500',
    'brand.default': 'brand.600',
    'brand.hover': '@brand.default+1',
    'brand.active': '@brand.default+2',
    'brand.subtle': 'brand.50',
    'brand.muted': 'brand.100',
    'brand.fg': 'brand.700',
    'brand.border': 'brand.300',
    'accent.default': 'accent.600',
    'accent.hover': '@accent.default+1',
    'accent.subtle': 'accent.50',
    'accent.fg': 'accent.700',
    'accent.on': 'auto',
  },
  dark: {
    'bg.canvas': 'neutral.950',
    'bg.surface': 'neutral.900',
    'bg.surface-raised': 'neutral.800',
    'bg.surface-sunken': 'neutral.1000',
    'bg.hover': 'neutral.800',
    'bg.selected': 'brand.950',
    'bg.emphasis': 'neutral.100',
    'bg.overlay': { ref: 'black', alpha: 0.66 },
    'fg.default': 'neutral.50',
    'fg.muted': 'neutral.300',
    'fg.subtle': 'neutral.400',
    'fg.disabled': 'neutral.600',
    'fg.inverse': 'neutral.950',
    'fg.on-brand': 'auto',
    'fg.link': 'brand.400',
    'border.subtle': 'neutral.800',
    'border.default': 'neutral.700',
    'border.strong': 'neutral.500',
    'border.focus': 'brand.400',
    'brand.default': 'brand.500',
    'brand.hover': '@brand.default-1',
    'brand.active': '@brand.default-2',
    'brand.subtle': 'brand.950',
    'brand.muted': 'brand.900',
    'brand.fg': 'brand.300',
    'brand.border': 'brand.700',
    'accent.default': 'accent.500',
    'accent.hover': '@accent.default-1',
    'accent.subtle': 'accent.950',
    'accent.fg': 'accent.300',
    'accent.on': 'auto',
  },
};
for (const s of STATUSES) {
  Object.assign(SEMANTIC_DEFAULTS.light, {
    [`${s}.default`]: `${s}.600`, [`${s}.hover`]: `@${s}.default+1`, [`${s}.subtle`]: `${s}.50`,
    [`${s}.fg`]: `${s}.700`, [`${s}.border`]: `${s}.200`, [`${s}.on`]: 'auto',
  });
  Object.assign(SEMANTIC_DEFAULTS.dark, {
    [`${s}.default`]: `${s}.500`, [`${s}.hover`]: `@${s}.default-1`, [`${s}.subtle`]: `${s}.950`,
    [`${s}.fg`]: `${s}.300`, [`${s}.border`]: `${s}.800`, [`${s}.on`]: 'auto',
  });
}
const AUTO_PARTNER = { 'fg.on-brand': 'brand.default', 'accent.on': 'accent.default' };
for (const s of STATUSES) AUTO_PARTNER[`${s}.on`] = `${s}.default`;

const DESCRIPTIONS = {
  'bg.canvas': 'App background behind all surfaces',
  'bg.surface': 'Cards, panels, inputs',
  'bg.surface-raised': 'Popovers, menus, dialogs',
  'bg.surface-sunken': 'Wells, code blocks, table headers',
  'bg.emphasis': 'Tooltips and inverse chips',
  'bg.overlay': 'Modal scrim',
  'fg.default': 'Primary text',
  'fg.muted': 'Secondary text (AA on surfaces)',
  'fg.subtle': 'Placeholder / tertiary text',
  'fg.on-brand': 'Text on brand.default',
  'border.strong': 'Input boundaries (≥3:1 non-text contrast)',
  'border.focus': 'Focus ring',
  'brand.default': 'Primary action fill',
};

function contrastRules(level) {
  const T = level === 'AAA' ? 7 : 4.5;
  const U = level === 'AAA' ? 4.5 : 3;
  const r = [];
  for (const bg of ['bg.canvas', 'bg.surface', 'bg.surface-raised', 'bg.surface-sunken']) r.push(['fg.default', bg, T, 'fg']);
  for (const bg of ['bg.canvas', 'bg.surface', 'bg.surface-raised']) r.push(['fg.muted', bg, T, 'fg']);
  r.push(['fg.subtle', 'bg.surface', U, 'fg']);
  r.push(['fg.link', 'bg.surface', T, 'fg'], ['fg.link', 'bg.canvas', T, 'fg']);
  r.push(['fg.on-brand', 'brand.default', T, 'bg'], ['fg.on-brand', 'brand.hover', T, 'bg']);
  r.push(['brand.fg', 'brand.subtle', T, 'fg'], ['brand.fg', 'bg.surface', T, 'fg']);
  r.push(['accent.on', 'accent.default', T, 'bg'], ['accent.fg', 'accent.subtle', T, 'fg']);
  for (const s of STATUSES) {
    r.push([`${s}.on`, `${s}.default`, T, 'bg'], [`${s}.fg`, `${s}.subtle`, T, 'fg'], [`${s}.fg`, 'bg.surface', T, 'fg']);
  }
  r.push(['border.strong', 'bg.surface', U, 'fg'], ['border.focus', 'bg.canvas', U, 'fg'], ['border.focus', 'bg.surface', U, 'fg']);
  r.push(['fg.inverse', 'bg.emphasis', T, 'fg']);
  r.push(['brand.default', 'bg.surface', U, 'fg']);
  return r;
}

function resolveSemantic(spec, palette, level, mode, dataKeys, exemptions = []) {
  const overrides = {};
  const adjustments = [];
  const hexOf = (ref) => {
    if (ref.raw) return ref.raw;
    if (ref.ramp === 'white' || ref.ramp === 'black') return palette[ref.ramp];
    return palette[ref.ramp][rampSteps(ref.ramp)[ref.index]];
  };
  const rampSteps = (r) => (r === 'neutral' ? NEUTRAL_STEPS : STEPS);
  const parse = (s) => {
    if (s === 'white' || s === 'black') return { ramp: s, index: 0 };
    if (s.startsWith('#')) return { raw: s };
    const [r, step] = s.split('.');
    if (!palette[r]) throw new Error(`Unknown ramp "${r}" in semantic ref "${s}"`);
    const index = rampSteps(r).indexOf(step);
    if (index < 0) throw new Error(`Unknown step "${s}"`);
    return { ramp: r, index };
  };
  const darkFg = parse('neutral.950');
  const lightFg = parse('white');

  const resolve = (key, depth = 0) => {
    if (depth > 8) throw new Error('Cyclic semantic ref at ' + key);
    if (overrides[key]) return overrides[key];
    const s = spec[key];
    if (s === undefined) throw new Error(`Missing semantic key ${key}`);
    if (isObj(s)) {
      const base = parse(s.ref);
      return { raw: withAlpha(hexOf(base), s.alpha), alphaOf: s.ref, alpha: s.alpha };
    }
    if (s === 'auto') {
      const bg = hexOf(resolve(AUTO_PARTNER[key], depth + 1));
      return contrast(palette.white, bg) >= contrast(hexOf(darkFg), bg) ? lightFg : darkFg;
    }
    if (s.startsWith('@')) {
      const m = s.match(/^@([\w.-]+)([+-]\d+)$/);
      const base = resolve(m[1], depth + 1);
      if (!base.ramp || base.ramp === 'white' || base.ramp === 'black') return base;
      const n = rampSteps(base.ramp).length;
      return { ramp: base.ramp, index: Math.min(n - 1, Math.max(0, base.index + Number(m[2]))) };
    }
    return parse(s);
  };

  const exempt = new Set(exemptions.map((e) => e.pair));
  const rules = contrastRules(level).filter(([f, b]) => !exempt.has(`${f}/${b}`));
  for (const d of dataKeys) rules.push([d, 'bg.surface', 3, 'fg']);

  for (let iter = 0; iter < 8; iter++) {
    let changed = false;
    for (const [fgKey, bgKey, min, adjust] of rules) {
      const fg = resolve(fgKey);
      const bg = resolve(bgKey);
      if (contrast(hexOf(fg), hexOf(bg)) >= min - 1e-9) continue;
      const targetKey = adjust === 'fg' ? fgKey : bgKey;
      const target = adjust === 'fg' ? fg : bg;
      if (!target.ramp || target.ramp === 'white' || target.ramp === 'black') continue;
      const steps = rampSteps(target.ramp);
      const fgIsAuto = spec[fgKey] === 'auto';
      const passes = (idx) => {
        const cand = palette[target.ramp][steps[idx]];
        if (adjust === 'fg') return contrast(cand, hexOf(bg)) >= min;
        if (fgIsAuto) return Math.max(contrast(palette.white, cand), contrast(hexOf(darkFg), cand)) >= min;
        return contrast(hexOf(fg), cand) >= min;
      };
      let found = -1;
      for (let dist = 1; dist < steps.length && found < 0; dist++) {
        for (const idx of [target.index + dist, target.index - dist]) {
          if (idx >= 0 && idx < steps.length && passes(idx)) { found = idx; break; }
        }
      }
      if (found >= 0) {
        adjustments.push({ mode, token: targetKey, from: `${target.ramp}.${steps[target.index]}`, to: `${target.ramp}.${steps[found]}`, reason: `${fgKey} on ${bgKey} ≥ ${min}` });
        overrides[targetKey] = { ramp: target.ramp, index: found };
        changed = true;
      }
    }
    if (!changed) break;
  }

  const resolved = {};
  for (const key of Object.keys(spec)) {
    const r = resolve(key);
    resolved[key] = {
      hex: hexOf(r),
      ref: r.raw ? null : r.ramp === 'white' || r.ramp === 'black' ? r.ramp : `${r.ramp}.${rampSteps(r.ramp)[r.index]}`,
    };
  }
  const report = rules.map(([fgKey, bgKey, min]) => {
    const ratio = contrast(resolved[fgKey].hex, resolved[bgKey].hex);
    return { mode, fg: fgKey, bg: bgKey, ratio: Math.round(ratio * 100) / 100, min, pass: ratio >= min - 1e-9 };
  });
  return { resolved, report, adjustments };
}

/* -------------------------------------------------------------- shadows */

function shadowSet(style, mode, palette, brandHex) {
  const ink = mode === 'light' ? palette.neutral['950'] : '#000000';
  const s = (x, y, blur, spread, alpha, color = ink) => ({ x, y, blur, spread, color: withAlpha(color, alpha) });
  const k = mode === 'light' ? 1 : 2.4;
  const sets = {
    none: () => ({ xs: [], sm: [], md: [], lg: [], xl: [] }),
    soft: () => ({
      xs: [s(0, 1, 2, 0, 0.05 * k)],
      sm: [s(0, 1, 3, 0, 0.1 * k), s(0, 1, 2, -1, 0.06 * k)],
      md: [s(0, 4, 8, -2, 0.1 * k), s(0, 2, 4, -2, 0.06 * k)],
      lg: [s(0, 12, 16, -4, 0.1 * k), s(0, 4, 6, -2, 0.05 * k)],
      xl: [s(0, 24, 48, -12, 0.18 * k)],
    }),
    crisp: () => ({
      xs: [s(0, 1, 1, 0, 0.06 * k)],
      sm: [s(0, 0, 0, 1, 0.06 * k), s(0, 1, 2, 0, 0.08 * k)],
      md: [s(0, 0, 0, 1, 0.06 * k), s(0, 4, 6, -1, 0.1 * k)],
      lg: [s(0, 0, 0, 1, 0.06 * k), s(0, 10, 15, -3, 0.12 * k)],
      xl: [s(0, 0, 0, 1, 0.06 * k), s(0, 20, 25, -5, 0.16 * k)],
    }),
    hard: () => {
      const c = mode === 'light' ? palette.neutral['950'] : brandHex;
      return { xs: [s(1, 1, 0, 0, 1, c)], sm: [s(2, 2, 0, 0, 1, c)], md: [s(4, 4, 0, 0, 1, c)], lg: [s(6, 6, 0, 0, 1, c)], xl: [s(10, 10, 0, 0, 1, c)] };
    },
    glow: () => {
      const base = shadowSet('soft', mode, palette, brandHex);
      if (mode === 'light') return base;
      return {
        xs: base.xs,
        sm: [...base.sm, s(0, 0, 12, 0, 0.12, brandHex)],
        md: [...base.md, s(0, 0, 24, 0, 0.16, brandHex)],
        lg: [...base.lg, s(0, 0, 40, 0, 0.2, brandHex)],
        xl: [...base.xl, s(0, 0, 64, 0, 0.24, brandHex)],
      };
    },
  };
  return sets[style]();
}

/* ------------------------------------------------------------- the build */

export function generate(def) {
  const level = def.a11y || 'AA';

  // 1. Primitive palette
  const palette = { white: '#ffffff', black: '#000000' };
  const pal = def.palette;
  const neutralSpec = pal.neutral;
  palette.neutral = ramp(neutralSpec, 'neutral');
  palette.neutral['1000'] = oklch(neutralSpec.darkest ?? 0.125, neutralSpec.c, neutralSpec.h);
  for (const [name, spec] of Object.entries(pal)) {
    if (name === 'neutral') continue;
    palette[name] = ramp(spec, 'chromatic');
  }
  for (const req of ['brand', 'accent', ...STATUSES]) {
    if (!palette[req]) throw new Error(`${def.id}: palette.${req} is required`);
  }

  // 2. Semantic colors with contrast enforcement
  const dataRamps = def.data || ['brand', 'accent', 'info', 'success', 'warning', 'danger'];
  const semanticSpecs = {};
  const resolvedModes = {};
  const a11yReport = [];
  const adjustments = [];
  for (const mode of MODES) {
    const spec = { ...SEMANTIC_DEFAULTS[mode], ...((def.semantic && def.semantic[mode]) || {}) };
    dataRamps.forEach((r, i) => { spec[`data.${i + 1}`] = `${r}.${mode === 'light' ? (def.dataStep?.light || '500') : (def.dataStep?.dark || '400')}`; });
    semanticSpecs[mode] = spec;
    const out = resolveSemantic(spec, palette, level, mode, dataRamps.map((_, i) => `data.${i + 1}`), def.a11yExemptions || []);
    resolvedModes[mode] = out.resolved;
    a11yReport.push(...out.report);
    adjustments.push(...out.adjustments);
  }

  const tokens = {};

  // primitive.color
  const prim = {};
  prim.white = leaf('color', palette.white, '--aegis-color-white');
  prim.black = leaf('color', palette.black, '--aegis-color-black');
  for (const [name, r] of Object.entries(palette)) {
    if (name === 'white' || name === 'black') continue;
    prim[name] = {};
    for (const [step, hex] of Object.entries(r)) prim[name][step] = leaf('color', hex, `--aegis-color-${name}-${step}`);
  }
  tokens.primitive = { color: prim };

  // semantic.color
  const sem = {};
  for (const key of Object.keys(semanticSpecs.light)) {
    const [group, name] = key.split('.');
    const modes = {};
    for (const mode of MODES) {
      const r = resolvedModes[mode][key];
      modes[mode] = r.ref ? `{primitive.color.${r.ref}}` : r.hex;
    }
    const cssVar = group === 'data' ? `--aegis-data-${name}` : `--aegis-${group}-${name}`;
    (sem[group] ||= {})[name] = modedLeaf('color', modes, cssVar, DESCRIPTIONS[key]);
  }
  tokens.semantic = { color: sem };

  // dimension
  const density = DENSITY[def.density || 'default'];
  const radius = { none: 0, xs: 2, sm: 4, md: 6, lg: 8, xl: 12, '2xl': 16, full: 9999, ...(def.radius || {}) };
  const bw = { none: 0, thin: 1, thick: 2, focus: 2, ...(def.borderWidth || {}) };
  const dim = { spacing: {}, radius: {}, borderWidth: {}, size: {} };
  for (const v of SPACING) dim.spacing[v] = leaf('dimension', v, `--aegis-space-${v}`);
  for (const [k, v] of Object.entries(radius)) dim.radius[k] = leaf('dimension', v, `--aegis-radius-${k}`);
  for (const [k, v] of Object.entries(bw)) dim.borderWidth[k] = leaf('dimension', v, `--aegis-border-width-${k}`);
  ['sm', 'md', 'lg'].forEach((s, i) => {
    dim.size[`control-${s}`] = leaf('dimension', density.control[i], `--aegis-size-control-${s}`);
    dim.size[`icon-${s}`] = leaf('dimension', density.icon[i], `--aegis-size-icon-${s}`);
  });
  tokens.dimension = dim;

  // typography
  const fonts = def.fonts;
  const typo = { fontFamily: {}, fontWeight: {}, textStyle: {} };
  const slots = { display: fonts.display || fonts.body, body: fonts.body, mono: fonts.mono };
  for (const [slot, f] of Object.entries(slots)) {
    const stack = `"${f.family}", ${FALLBACKS[f.category || (slot === 'mono' ? 'mono' : 'sans')]}`;
    typo.fontFamily[slot] = leaf('fontFamily', f.family, `--aegis-font-${slot}`);
    typo.fontFamily[slot].$extensions.aegis.stack = stack;
    typo.fontFamily[slot].$extensions.aegis.category = f.category || (slot === 'mono' ? 'mono' : 'sans');
  }
  const t = def.type || {};
  const weights = { regular: 400, medium: 500, semibold: 600, bold: 700, ...(t.weightTokens || {}) };
  for (const [k, v] of Object.entries(weights)) typo.fontWeight[k] = leaf('fontWeight', v, `--aegis-font-weight-${k}`);

  const sizes = { ...TYPE_SCALES[t.scale || 'default'], ...(t.sizes || {}) };
  const roleW = { display: 700, heading: 600, body: 400, label: 500, caption: 400, overline: 600, code: 400, numeric: 500, ...(t.weights || {}) };
  const roleLH = { display: 1.08, heading: 1.25, body: 1.5, label: 1.3, caption: 1.4, overline: 1.3, code: 1.55, numeric: 1.4, ...(t.lineHeights || {}) };
  const roleLS = { display: -0.02, heading: -0.01, body: 0, label: 0, caption: 0.01, overline: 0.08, code: 0, numeric: 0, ...(t.tracking || {}) };
  const roleTT = { overline: 'uppercase', ...(t.transforms || {}) };
  const familySlot = {
    display: 'display',
    heading: t.headingFamily || 'display',
    body: 'body',
    label: t.labelFamily || 'body',
    mono: 'mono',
    numeric: t.numericFamily || 'body',
  };
  for (const [name, slot, role] of TEXT_STYLES) {
    const size = sizes[name];
    const lh = Math.max(size, Math.round((size * roleLH[role]) / 2) * 2);
    const value = {
      fontFamily: `{typography.fontFamily.${familySlot[slot]}}`,
      fontWeight: (t.styleWeights && t.styleWeights[name]) || roleW[role],
      fontSize: size,
      lineHeight: lh,
      letterSpacing: roleLS[role],
      textTransform: (t.styleTransforms && t.styleTransforms[name]) || roleTT[role] || 'none',
    };
    if (role === 'numeric') value.fontFeatures = ['tnum', 'lnum'];
    typo.textStyle[name] = leaf('typography', value, `--aegis-text-${name}`);
  }
  tokens.typography = typo;

  // shadow (moded)
  const brandHexDark = resolvedModes.dark['brand.default'].hex;
  const shadows = {};
  const shadowStyle = def.shadow || 'soft';
  const light = shadowSet(shadowStyle, 'light', palette, brandHexDark);
  const dark = shadowSet(shadowStyle, 'dark', palette, brandHexDark);
  for (const k of ['xs', 'sm', 'md', 'lg', 'xl']) shadows[k] = modedLeaf('shadow', { light: light[k], dark: dark[k] }, `--aegis-shadow-${k}`);
  tokens.shadow = shadows;

  // motion
  const m = def.motion || {};
  const durations = { instant: 0, fast: 120, base: 200, slow: 320, slower: 480, ...(m.durations || {}) };
  const easings = {
    standard: [0.2, 0, 0, 1],
    emphasized: [0.3, 0, 0, 1],
    decelerate: [0, 0, 0, 1],
    accelerate: [0.3, 0, 1, 1],
    ...(m.easings || {}),
  };
  tokens.motion = { duration: {}, easing: {} };
  for (const [k, v] of Object.entries(durations)) tokens.motion.duration[k] = leaf('duration', v, `--aegis-duration-${k}`);
  for (const [k, v] of Object.entries(easings)) tokens.motion.easing[k] = leaf('cubicBezier', v, `--aegis-easing-${k}`);

  // components
  tokens.component = buildComponents(def, density);

  const fontFamilies = Object.values(slots);
  return {
    $schema: '../schema/aegis-tokens.schema.json',
    aegis: { ...FORMAT, generator: 'aegis-presets-build' },
    meta: {
      id: def.id,
      name: def.name,
      category: def.category,
      description: def.description,
      tags: def.tags || [],
      defaultMode: def.defaultMode || 'light',
      density: def.density || 'default',
      a11yTarget: level,
      fonts: {
        googleFontsUrl: googleFontsUrl(fontFamilies),
        families: uniqBy(fontFamilies, (f) => f.family).map((f) => ({ family: f.family, weights: f.weights })),
      },
      swatches: {
        light: [resolvedModes.light['bg.canvas'].hex, resolvedModes.light['brand.default'].hex, resolvedModes.light['accent.default'].hex, resolvedModes.light['fg.default'].hex],
        dark: [resolvedModes.dark['bg.canvas'].hex, resolvedModes.dark['brand.default'].hex, resolvedModes.dark['accent.default'].hex, resolvedModes.dark['fg.default'].hex],
      },
    },
    modes: MODES,
    tokens,
    a11y: {
      target: level,
      pass: a11yReport.every((r) => r.pass),
      checks: a11yReport,
      adjustments,
      exemptions: def.a11yExemptions || [],
    },
  };
}

function uniqBy(arr, fn) {
  const seen = new Set();
  return arr.filter((x) => (seen.has(fn(x)) ? false : seen.add(fn(x))));
}

function googleFontsUrl(fonts) {
  const fams = uniqBy(fonts, (f) => f.family).map((f) => {
    const w = [...new Set(f.weights)].sort((a, b) => a - b).join(';');
    return `family=${f.family.replace(/ /g, '+')}:wght@${w}`;
  });
  return `https://fonts.googleapis.com/css2?${fams.join('&')}&display=swap`;
}

/* ------------------------------------------------------- component recipes */

function buildComponents(def, d) {
  const c = def.components || {};
  const R = (k) => `{dimension.radius.${k}}`;
  const S = (k) => `{semantic.color.${k}}`;
  const recipe = deepMerge(
    {
      button: {
        'height-sm': ['dimension', '{dimension.size.control-sm}'],
        'height-md': ['dimension', '{dimension.size.control-md}'],
        'height-lg': ['dimension', '{dimension.size.control-lg}'],
        'padding-x-sm': ['dimension', d.padX[0]],
        'padding-x-md': ['dimension', d.padX[1]],
        'padding-x-lg': ['dimension', d.padX[2]],
        gap: ['dimension', '{dimension.spacing.8}'],
        radius: ['dimension', R('md')],
        'border-width': ['dimension', '{dimension.borderWidth.thin}'],
        'font-weight': ['fontWeight', '{typography.fontWeight.semibold}'],
        'text-style': ['string', 'label-md'],
        'text-transform': ['string', 'none'],
        'letter-spacing': ['number', 0],
        shadow: ['shadow', '{shadow.xs}'],
        'primary-bg': ['color', S('brand.default')],
        'primary-bg-hover': ['color', S('brand.hover')],
        'primary-fg': ['color', S('fg.on-brand')],
        'primary-border': ['color', S('brand.default')],
        'secondary-bg': ['color', S('bg.surface')],
        'secondary-bg-hover': ['color', S('bg.hover')],
        'secondary-fg': ['color', S('fg.default')],
        'secondary-border': ['color', S('border.strong')],
        'ghost-fg': ['color', S('brand.fg')],
        'ghost-bg-hover': ['color', S('brand.subtle')],
        'danger-bg': ['color', S('danger.default')],
        'danger-fg': ['color', S('danger.on')],
      },
      input: {
        height: ['dimension', '{dimension.size.control-md}'],
        'padding-x': ['dimension', d.inputPadX],
        radius: ['dimension', R('md')],
        'border-width': ['dimension', '{dimension.borderWidth.thin}'],
        bg: ['color', S('bg.surface')],
        border: ['color', S('border.strong')],
        'border-hover': ['color', S('fg.subtle')],
        placeholder: ['color', S('fg.subtle')],
        'text-style': ['string', 'body-md'],
      },
      card: {
        radius: ['dimension', R('lg')],
        padding: ['dimension', d.card],
        'border-width': ['dimension', '{dimension.borderWidth.thin}'],
        bg: ['color', S('bg.surface')],
        border: ['color', S('border.default')],
        shadow: ['shadow', '{shadow.sm}'],
      },
      badge: {
        height: ['dimension', d.badge],
        'padding-x': ['dimension', d.badgePad],
        radius: ['dimension', R('full')],
        'font-weight': ['fontWeight', '{typography.fontWeight.medium}'],
        'text-style': ['string', 'label-sm'],
        'text-transform': ['string', 'none'],
      },
      table: {
        'row-height': ['dimension', d.row],
        'cell-padding-x': ['dimension', d.cell],
        'header-bg': ['color', S('bg.surface-sunken')],
        'header-fg': ['color', S('fg.muted')],
        'header-text-style': ['string', 'label-sm'],
        'header-text-transform': ['string', 'none'],
        'row-hover-bg': ['color', S('bg.hover')],
        border: ['color', S('border.default')],
      },
      tabs: {
        height: ['dimension', d.tabs],
        gap: ['dimension', '{dimension.spacing.24}'],
        'indicator-height': ['dimension', 2],
        'indicator-color': ['color', S('brand.default')],
        'active-fg': ['color', S('fg.default')],
        'inactive-fg': ['color', S('fg.muted')],
      },
      modal: {
        radius: ['dimension', R('xl')],
        padding: ['dimension', d.modal],
        shadow: ['shadow', '{shadow.xl}'],
        overlay: ['color', S('bg.overlay')],
        bg: ['color', S('bg.surface-raised')],
      },
      tooltip: {
        radius: ['dimension', R('sm')],
        'padding-x': ['dimension', '{dimension.spacing.8}'],
        bg: ['color', S('bg.emphasis')],
        fg: ['color', S('fg.inverse')],
      },
      nav: {
        width: ['dimension', 248],
        'item-height': ['dimension', d.nav],
        'item-radius': ['dimension', R('md')],
        'item-active-bg': ['color', S('bg.selected')],
        'item-active-fg': ['color', S('brand.fg')],
        bg: ['color', S('bg.surface')],
      },
      avatar: { radius: ['dimension', R('full')] },
      switch: { radius: ['dimension', R('full')], 'track-on': ['color', S('brand.default')] },
      link: {
        decoration: ['string', 'none'],
        'decoration-hover': ['string', 'underline'],
        'underline-offset': ['dimension', 3],
        'font-weight': ['fontWeight', '{typography.fontWeight.medium}'],
      },
      focus: {
        'ring-width': ['dimension', '{dimension.borderWidth.focus}'],
        'ring-offset': ['dimension', 2],
        'ring-color': ['color', S('border.focus')],
        halo: ['color', '#00000000'],
      },
    },
    c,
  );
  const out = {};
  for (const [comp, props] of Object.entries(recipe)) {
    out[comp] = {};
    for (const [prop, [type, value]] of Object.entries(props)) out[comp][prop] = leaf(type, value, `--aegis-${comp}-${prop}`);
  }
  return out;
}
