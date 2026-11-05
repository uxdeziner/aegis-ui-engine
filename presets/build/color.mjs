// AegisUI color engine — OKLCH ramps, sRGB gamut mapping and WCAG contrast.
// Zero dependencies. All math follows Björn Ottosson's OKLab reference.

export const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const CHROMATIC_L = [0.975, 0.943, 0.89, 0.815, 0.725, 0.64, 0.56, 0.485, 0.415, 0.35, 0.275];
const CHROMA_CURVE = [0.1, 0.22, 0.42, 0.68, 0.88, 1.0, 0.97, 0.88, 0.76, 0.63, 0.5];
const NEUTRAL_L = [0.985, 0.965, 0.925, 0.87, 0.715, 0.56, 0.45, 0.375, 0.28, 0.21, 0.16];

function oklchToLinearRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
const encode = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const decode = (x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));

/** OKLCH → #rrggbb, reducing chroma (binary search) until the color fits sRGB. */
export function oklch(L, C, h) {
  let rgb = oklchToLinearRgb(L, C, h);
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb(L, mid, h))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinearRgb(L, lo, h);
  }
  return rgbToHex(rgb.map((v) => encode(Math.min(1, Math.max(0, v)))));
}

export function rgbToHex(rgb, alpha) {
  const hex = rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
  if (alpha === undefined || alpha >= 1) return '#' + hex;
  return '#' + hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

export function hexToRgba(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

export function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgba(hex);
  return rgbToHex([r, g, b], alpha);
}

export function luminance(hex) {
  const { r, g, b } = hexToRgba(hex);
  return 0.2126 * decode(r) + 0.7152 * decode(g) + 0.0722 * decode(b);
}

/** Composite a (possibly translucent) foreground over an opaque background. */
export function flatten(fgHex, bgHex) {
  const f = hexToRgba(fgHex);
  if (f.a >= 1) return fgHex;
  const b = hexToRgba(bgHex);
  return rgbToHex([f.r * f.a + b.r * (1 - f.a), f.g * f.a + b.g * (1 - f.a), f.b * f.a + b.b * (1 - f.a)]);
}

export function contrast(fgHex, bgHex) {
  const fg = flatten(fgHex, bgHex);
  const a = luminance(fg);
  const b = luminance(bgHex);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Build an 11-step ramp (50…950).
 * spec: { h, c, hueShift?, lightness?: number[], chromaCurve?: number[] }
 */
export function ramp(spec, kind = 'chromatic') {
  const Ls = spec.lightness || (kind === 'neutral' ? NEUTRAL_L : CHROMATIC_L);
  const curve = spec.chromaCurve || (kind === 'neutral' ? STEPS.map(() => 1) : CHROMA_CURVE);
  const shift = spec.hueShift || 0;
  const out = {};
  STEPS.forEach((step, i) => {
    const t = i / (STEPS.length - 1) - 0.5; // -0.5 … 0.5
    out[step] = oklch(Ls[i], spec.c * curve[i], spec.h + shift * t * 2);
  });
  return out;
}
