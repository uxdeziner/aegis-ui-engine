/* AegisUI — color science
 * sRGB <-> OKLab/OKLCH conversion, gamut mapping, perceptual shade
 * generation and WCAG 2.x contrast. No dependencies.
 */
(function (Aegis) {
  'use strict';

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

  const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const isHex = (v) => typeof v === 'string' && HEX_RE.test(v.trim());

  function normalizeHex(hex) {
    let h = String(hex).trim().replace('#', '').toLowerCase();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return '#' + h;
  }

  function hexToRgb(hex) {
    const n = parseInt(normalizeHex(hex).slice(1), 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
  }

  function rgbToHex({ r, g, b }) {
    const t = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
    return '#' + t(r) + t(g) + t(b);
  }

  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

  function rgbToOklab({ r, g, b }) {
    r = toLinear(r); g = toLinear(g); b = toLinear(b);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return {
      L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    };
  }

  function oklabToLinearRgb({ L, a, b }) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return {
      r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    };
  }

  function hexToOklch(hex) {
    const { L, a, b } = rgbToOklab(hexToRgb(hex));
    const C = Math.sqrt(a * a + b * b);
    let H = (Math.atan2(b, a) * 180) / Math.PI;
    if (H < 0) H += 360;
    return { L, C, H: C < 0.0001 ? 0 : H };
  }

  function oklchToLinear({ L, C, H }) {
    const hr = (H * Math.PI) / 180;
    return oklabToLinearRgb({ L, a: C * Math.cos(hr), b: C * Math.sin(hr) });
  }

  const inGamut = ({ r, g, b }) => [r, g, b].every((v) => v >= -0.0005 && v <= 1.0005);

  /** Reduce chroma (keeping L and H) until the colour fits in sRGB. */
  function gamutMap(lch) {
    if (inGamut(oklchToLinear(lch))) return lch;
    let lo = 0, hi = lch.C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ ...lch, C: mid }))) lo = mid; else hi = mid;
    }
    return { ...lch, C: lo };
  }

  function oklchToHex(lch) {
    const lin = oklchToLinear(gamutMap(lch));
    return rgbToHex({ r: toGamma(clamp(lin.r, 0, 1)), g: toGamma(clamp(lin.g, 0, 1)), b: toGamma(clamp(lin.b, 0, 1)) });
  }

  function oklchString(hex) {
    const { L, C, H } = hexToOklch(hex);
    return `oklch(${round(L * 100, 2)}% ${round(C, 4)} ${round(H, 2)})`;
  }

  /* ---------- WCAG contrast ---------- */
  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  /* ---------- Perceptual shade generation ---------- */
  const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  // Target OKLCH lightness per stop: evenly perceived steps, denser near the ends.
  const L_TARGET = [0.971, 0.936, 0.885, 0.812, 0.72, 0.635, 0.555, 0.48, 0.41, 0.35, 0.265];
  // Chroma envelope: saturated in the middle, muted at the extremes.
  const C_ENVELOPE = [0.1, 0.2, 0.36, 0.6, 0.85, 1, 1, 0.92, 0.8, 0.64, 0.46];
  // Neutrals need deeper darks for dark-mode canvases and crisper lights.
  const L_NEUTRAL = [0.985, 0.965, 0.925, 0.87, 0.72, 0.56, 0.46, 0.38, 0.29, 0.215, 0.155];
  const N_ENVELOPE = [0.45, 0.55, 0.65, 0.75, 0.88, 1, 1, 1, 1, 1, 1];

  /**
   * Build an 11-step scale (50–950) from one brand colour.
   * The input lands exactly on the stop with the nearest lightness ("anchor").
   */
  function generateScale(hex, opts = {}) {
    const base = hexToOklch(hex);
    const neutral = !!opts.neutral;
    const peakC = neutral ? Math.min(base.C, opts.chromaCap ?? 0.03) : Math.max(base.C, 0.02);
    const anchorIndex = neutral ? -1 : L_TARGET.reduce((best, l, i) =>
      Math.abs(l - base.L) < Math.abs(L_TARGET[best] - base.L) ? i : best, 0);

    const scale = {};
    STOPS.forEach((stop, i) => {
      if (i === anchorIndex) { scale[stop] = normalizeHex(hex); return; }
      const env = neutral ? N_ENVELOPE[i] : C_ENVELOPE[i];
      // Pull lightness slightly toward the anchor so neighbours stay related to the brand.
      let L = neutral ? L_NEUTRAL[i] : L_TARGET[i];
      if (!neutral) L = L + (base.L - L_TARGET[anchorIndex]) * Math.max(0, 1 - Math.abs(i - anchorIndex) / 3) * 0.6;
      scale[stop] = oklchToHex({ L, C: peakC * env, H: base.H });
    });
    return { scale, anchor: anchorIndex >= 0 ? STOPS[anchorIndex] : null };
  }

  function hexToRgbString(hex) {
    const { r, g, b } = hexToRgb(hex);
    return `${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}`;
  }

  Aegis.color = {
    STOPS, isHex, normalizeHex, hexToRgb, rgbToHex, hexToOklch, oklchToHex, oklchString,
    luminance, contrast, generateScale, hexToRgbString, round, clamp
  };
})(window.Aegis = window.Aegis || {});
