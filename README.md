# AegisUI Engine

Enterprise design-system tooling built in pure vanilla JS and CSS with **zero dependencies**.

| Module | What it is |
| --- | --- |
| [`presets/`](presets/README.md) | 12 enterprise themes (Fintech Terminal, Healthcare Clean, Enterprise SaaS, AI Studio Dark, Swiss Editorial, High-Contrast Gov and 6 more), each with complete CSS variables, light and dark modes, type pairings, component recipes, and contrast verified at build time. Includes a gallery for previewing and exporting them. |
| [`figma-plugin/`](figma-plugin/README.md) | **AegisUI Token Sync**: imports AegisUI JSON and generates Figma Local Variables (Light/Dark), text and effect styles, an auto-layout style guide, token-bound components and component-token docs. |

```bash
npm run build   # themes/*.mjs → tokens/*.json, css/*.css, aegis-presets.{css,js}, plugin presets
npm test        # strict build (fails on contrast regressions) + end-to-end plugin test
open presets/index.html
```

```
presets/themes/*.mjs ──build──► presets/tokens/<id>.json ──► Figma plugin ──► Variables · Styles · Style guide
                                presets/css/<id>.css      ──► your app (data-aegis-theme / data-aegis-mode)
                                presets/aegis-presets.js  ──► Studio / gallery (AegisPresets.apply / toJSON)
```

The shared contract is the **AegisUI token format**, defined in [`presets/schema/aegis-tokens.schema.json`](presets/schema/aegis-tokens.schema.json).
