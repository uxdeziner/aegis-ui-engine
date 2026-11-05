# AegisUI Token Sync — Figma plugin

Turns AegisUI token JSON into a working Figma design system: **Local Variables with Light/Dark modes, text and effect styles, an auto-layout style guide, token-bound components and component-token documentation.** It needs no build step, makes no network requests, and is safe to re-run.

## Install (development)

1. In the Figma desktop app: **Plugins → Development → Import plugin from manifest…**
2. Select `figma-plugin/manifest.json`.
3. Run **Plugins → Development → AegisUI Token Sync**.

## Input

Use any of three sources:

- **Presets tab**: the 12 presets are bundled into `ui.html` (re-injected by `npm run build`).
- **Paste JSON**: from the gallery's **Copy JSON** button (`presets/index.html`), `AegisPresets.toJSON(id)`, or a Studio export.
- **Upload file**: any `presets/tokens/<id>.json`.

The input must follow the AegisUI token format (`"aegis": { "format": "aegis-tokens", "version": "1.x" }`); see [`presets/schema/aegis-tokens.schema.json`](../presets/schema/aegis-tokens.schema.json). The plugin validates the document and checks that every alias resolves before it changes anything.

## What gets generated

### Local Variables

| Collection | Modes | Contents | Scopes |
| --- | --- | --- | --- |
| **Primitives** | Value | `color/<ramp>/<step>`, white, black | none (hidden from pickers and publishing) |
| **Semantic** | **Light, Dark** | `color/bg/*`, `color/fg/*`, `color/border/*`, brand, accent, statuses, data viz. Aliases to Primitives | bg → fills · fg → text · border → strokes |
| **Dimensions** | Value | `spacing/*`, `radius/*`, `borderWidth/*`, `size/control-*`, `size/icon-*` | gap/size · corner radius · stroke |
| **Typography** | Value | `font-family/*` (string), `font-weight/*`, `font-size/<style>`, `line-height/<style>` | font family/weight/size/line height |
| **Motion** | Value | `duration/*` (ms), `easing/*` (string) | — |
| **Components** | Value | `button/*`, `input/*`, `card/*` … aliased to Semantic / Dimensions | per property |

Every variable gets **WEB code syntax** (`var(--aegis-…)`) so Dev Mode shows the exact CSS variable from `presets/css/<id>.css`.

### Styles

- **16 text styles** (`display/lg`, `heading/md`, `body/sm`, `label/md`, `caption`, `overline`, `code`, `numeric` …). Font size and line height are bound to Typography variables, and text case and tracking match the CSS.
- **Effect styles** `elevation/light/{xs…xl}` and `elevation/dark/{xs…xl}`. Presets with flat elevation (Swiss, Gov) intentionally ship none.

### Style guide page: `AegisUI · <Preset name>`

- **Foundations · Light** and **Foundations · Dark**: the same auto-layout frame, with the Semantic collection pinned to each mode. It covers the cover/meta, primitive ramps, semantic swatches with CSS variable names, the type scale, spacing bars (width bound to variables), radius tiles (bound), and elevation tiles.
- **Components**: real Figma components whose height, padding, gap, radius, fill and stroke are bound to Component variables:
  - `Button` set: Variant (Primary, Secondary, Ghost, Danger) × Size (SM, MD, LG), with an editable `Label` property
  - `Badge` set: Tone (Neutral, Brand, Success, Warning, Danger, Info)
  - `Input` and `Card`
- **Component tokens**: one documentation table per recipe, listing token, value (alias → resolved), and CSS variable.
- **Components · Dark preview**: instances pinned to Dark mode, to prove the components re-skin through variables.

## Re-running and updating

Collections, variables and styles are matched **by name** and updated in place. Variable IDs are kept, so every binding in your files survives a re-sync. The style guide page is rebuilt. To keep several presets in one file, tick **Namespace by preset name**; collections then become `<Preset> / Semantic` and so on.

On Figma plans that limit modes per collection, the plugin creates a separate `Semantic (Dark)` collection and reports a warning.

If a font isn't installed, the closest weight of **Inter** is used and the substitution is listed in the log and on the style-guide cover. All 12 presets use Google Fonts, which Figma provides.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | Plugin manifest (`documentAccess: dynamic-page`, no network access) |
| `code.js` | Main thread: validation, variables, styles, style guide (ES2017, no build step) |
| `ui.html` | Single-file UI. The build injects presets between the `AEGIS:PRESETS` markers |
| `test/run.cjs` | End-to-end test against a strict Figma API mock (`npm run test:plugin`) |
