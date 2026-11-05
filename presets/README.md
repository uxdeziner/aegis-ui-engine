# AegisUI Presets

Twelve production-ready enterprise design-system themes. Each one ships as:

| Output | Path | Use it for |
| --- | --- | --- |
| Token JSON | `tokens/<id>.json` | The interchange format: Studio import/export and the Figma plugin |
| CSS variables | `css/<id>.css` | One theme, light and dark, plus its Google Fonts `@import` |
| CSS bundle | `aegis-presets.css` | All 12 themes in one file (fonts are loaded on demand) |
| Component recipes | `aegis-components.css` | `.ae-*` components that every theme styles through its tokens |
| Runtime registry | `aegis-presets.js` | `window.AegisPresets` / CommonJS: list, apply, resolve, export |
| Gallery | `index.html` | Preview, inspect and export every preset (opens straight from `file://`) |

Everything is generated from small source definitions in `themes/*.mjs` by `build/build.mjs` (Node ≥ 18, no dependencies):

```bash
npm run build          # regenerate tokens, CSS, registry and the Figma plugin's bundled presets
npm run build:strict   # same, but exits 1 if any contrast check fails
```

## The 12 presets

| # | Preset | `id` | Default | Density | Type pairing | Character |
|---|---|---|---|---|---|---|
| 1 | Enterprise SaaS | `enterprise-saas` | light | default | Inter · JetBrains Mono | Calm indigo, crisp shadows, 8px radii |
| 2 | Fintech Terminal | `fintech-terminal` | **dark** | compact | IBM Plex Sans / Condensed · Plex Mono | Amber signal, tabular mono figures, 2px radii, uppercase controls |
| 3 | Healthcare Clean | `healthcare-clean` | light | comfortable | Lexend · Source Sans 3 | Clinical teal, generous spacing, 3px focus ring |
| 4 | AI Studio Dark | `ai-studio-dark` | **dark** | default | Geist · Geist Mono | Luminous violet, glow elevation, expressive easing |
| 5 | Swiss Editorial | `swiss-editorial` | light | default | Inter Tight · Source Serif 4 | Black/white + signal red, 0 radius, 104px display |
| 6 | High-Contrast Gov | `gov-accessible` | light | accessible | Atkinson Hyperlegible | **WCAG AAA**, 19px body, 48px targets, underlined links, yellow focus halo |
| 7 | Retail Commerce | `retail-commerce` | light | comfortable | DM Serif Display · DM Sans | Coral CTA, pill buttons, soft cards |
| 8 | Legal & Compliance Slate | `legal-slate` | light | default | Source Serif 4 · Source Sans 3 | Ink navy, oxblood accent, underlined links |
| 9 | Developer Console | `developer-console` | **dark** | compact | JetBrains Mono · Inter | Phosphor green, monospace labels, lowercase overlines |
| 10 | Logistics Ops | `logistics-ops` | light | compact | Barlow Condensed · Barlow · Roboto Mono | Steel blue + safety orange, uppercase table headers |
| 11 | Creative Agency Bold | `creative-agency` | light | comfortable | Syne · Space Grotesk · Space Mono | Neo-brutalist lime/pink, hard offset shadows, 2px ink borders |
| 12 | Calm Wellness & HR | `wellness-hr` | light | comfortable | Fraunces · Manrope | Sage and peach on warm paper, 16px radii, gentle motion |

## Using a preset

```html
<link rel="stylesheet" href="presets/css/fintech-terminal.css">   <!-- or aegis-presets.css for all -->
<link rel="stylesheet" href="presets/aegis-components.css">

<html data-aegis-theme="fintech-terminal" data-aegis-mode="dark">   <!-- light | dark | auto -->
  <body class="ae-root">
    <button class="ae-btn ae-btn--primary">Place order</button>
  </body>
</html>
```

`data-aegis-mode="auto"` follows `prefers-color-scheme`. Put both attributes on the same element; you can scope a theme to any subtree, and several themes can live on one page.

### Runtime API (`aegis-presets.js`)

```js
AegisPresets.list();                              // [{ id, name, category, defaultMode, fonts, swatches, … }]
AegisPresets.apply('healthcare-clean', { mode: 'dark', target: el });  // sets attributes + loads Google Fonts
AegisPresets.get('legal-slate');                  // full token document
AegisPresets.toJSON('legal-slate');               // string for the Figma plugin / Studio export
AegisPresets.resolve('legal-slate', '{semantic.color.brand.default}', 'dark'); // → "#a5c5f3"
```

## Token architecture

```
primitive.color.<ramp>.<50…950>          raw OKLCH ramps (neutral adds 1000) ── hidden in Figma
        ▲ aliased by
semantic.color.<role>.<variant>          $modes { light, dark }          --aegis-bg-canvas, --aegis-brand-default …
        ▲ aliased by
component.<component>.<prop>             recipes                          --aegis-button-radius, --aegis-input-border …

dimension.{spacing,radius,borderWidth,size}   typography.{fontFamily,fontWeight,textStyle}   shadow.*   motion.*
```

**Semantic roles** (each ends up as a CSS variable `--aegis-<group>-<name>`):

- `bg`: canvas, surface, surface-raised, surface-sunken, hover, selected, emphasis, overlay
- `fg`: default, muted, subtle, disabled, inverse, on-brand, link
- `border`: subtle, default, strong, focus
- `brand`: default, hover, active, subtle, muted, fg, border
- `accent`, `success`, `warning`, `danger`, `info`: default, hover, subtle, fg, on (plus border for statuses)
- `data.1…n`: categorical chart palette, tuned per mode

**Text styles** (16): `display-lg/md`, `heading-xl/lg/md/sm`, `body-lg/md/sm`, `label-lg/md/sm`, `caption`, `overline`, `code`, `numeric` (tabular figures). Each style is exposed as a `font` shorthand (`font: var(--aegis-text-body-md)`) plus `-size`, `-line`, `-weight`, `-tracking`, `-transform` and `-features` parts, and as `.ae-text-*` utility classes.

**Component recipes**: button, input, card, badge, table, tabs, modal, tooltip, nav, avatar, switch, link and focus. They mostly alias other tokens, so a theme re-skins every component from one place.

## Accessibility is enforced at build time

For each mode, the build checks about 39 foreground/background pairs: text on every surface, on-brand and on-status text, link text, status text on tints, input borders and focus rings (WCAG 1.4.11), data-viz colors and more. Targets:

| Target | Text | UI boundaries |
| --- | --- | --- |
| AA (default) | 4.5:1 | 3:1 |
| AAA (`gov-accessible`) | 7:1 | 4.5:1 |

When a pair fails, the build walks the color ramp to the nearest step that passes and records the change under `a11y.adjustments`. `on-*` colors set to `"auto"` pick white or ink, whichever contrasts more. A theme can declare a reasoned exemption (`a11yExemptions`). Example: Creative Agency's lime buttons always carry a 2px ink border. The gallery's **Accessibility** tab shows the full report.

## Authoring a new preset

Create `themes/my-theme.mjs`:

```js
export default {
  id: 'my-theme', order: 13, name: 'My Theme', category: 'Product',
  description: '…', defaultMode: 'light', density: 'default',      // compact | default | comfortable | accessible
  fonts: { display: { family: 'Inter Tight', weights: [600, 700] }, body: { family: 'Inter', weights: [400, 500, 600] },
           mono: { family: 'JetBrains Mono', weights: [400], category: 'mono' } },
  palette: {                                                        // OKLCH hue + peak chroma
    neutral: { h: 260, c: 0.01 }, brand: { h: 265, c: 0.2 }, accent: { h: 190, c: 0.12 },
    success: { h: 150, c: 0.15 }, warning: { h: 75, c: 0.16 }, danger: { h: 25, c: 0.2 }, info: { h: 240, c: 0.14 },
  },
  semantic: { light: { 'brand.default': 'brand.700' }, dark: { 'bg.canvas': 'neutral.1000' } },  // optional overrides
  type: { scale: 'default', weights: { display: 700 }, tracking: { display: -0.03 } },
  radius: { sm: 4, md: 8, lg: 12 }, shadow: 'soft',                 // soft | crisp | hard | glow | none
  components: { button: { radius: ['dimension', '{dimension.radius.full}'] } },
};
```

Then run `npm run build`. The theme appears in the gallery, the registry and the Figma plugin.

The token format is specified in [`schema/aegis-tokens.schema.json`](schema/aegis-tokens.schema.json).
