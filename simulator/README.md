# AegisUI Accessibility Simulator (Phase 2)

`simulator.html` shows a dense enterprise workspace, built from AegisUI preset tokens and `.ae-*` components, through eight accessibility simulations. It can then export a printable **review report**.

> **A simulation and review aid, not a compliance tool.** Nothing here is an audit, a certificate or proof of WCAG conformance. Simulations approximate how some people may perceive the interface, and the automated observations are heuristics that can miss issues or flag things that are fine. Confirm findings with manual testing, assistive technology and people with disabilities. The UI and the report both say this explicitly.

It uses vanilla HTML, CSS and JS with **zero runtime dependencies** and no build step. It works from `file://` or any subpath, such as `/aegis-ui-engine/simulator/simulator.html` on GitHub Pages.

## Simulations

All simulations combine, and they apply to the workspace preview only. The simulator's own controls are never transformed.

| # | Simulation | How it works |
|---|---|---|
| 1 | Protanopia | SVG `feColorMatrix` (Machado et al. 2009, severity 1.0) in `linearRGB` |
| 2 | Deuteranopia | same, M-cone matrix |
| 3 | Tritanopia | same, S-cone matrix |
| 4 | Achromatopsia | Rec. 709 luminance matrix |
| 5 | Projector / low-contrast washout | `feComponentTransfer` (slope 1 − 0.55t, intercept 0.3t) plus `saturate` (1 − 0.45t) in sRGB, with an intensity slider |
| 6 | Text scaling 125 / 150 / **200 %** | multiplies every preset text-size token (`--aegis-text-*`, `*-text-style`) on the workspace. Layout boxes keep their size, like a browser's text-only zoom (WCAG 1.4.4), so clipping shows up |
| 7 | Right-to-left | `dir="rtl"` on the workspace. The workspace CSS uses logical properties only, so it mirrors |
| 8 | Keyboard focus order | numbered SVG overlay with a curved path between stops, plus Previous/Next stepping and a stop list. The order follows the browser's real sequential navigation: positive `tabindex` first, then DOM order, skipping disabled, hidden, `inert`, `tabindex="-1"` (roving widgets) and non-selected radios |

JavaScript applies the same color math (`simulateColor`) that the SVG filter applies, so contrast and distinguishability can be measured without reading pixels.

There is also a **Preview width** control (fit, 1280, 768, 390). The workspace reflows with container queries on the simulated width, not the window width.

## Automated observations

The panel lists heuristic notes for the current settings. The report runs every simulation in isolation and then restores the on-screen settings. Observations include:

- **Text contrast:** WCAG 1.4.3 ratios on sampled text, before and after each color simulation. Text that drops below 4.5:1 (or 3:1 for large text) is flagged.
- **Distinguishability:** chart-series and status-color pairs that are clearly distinct with typical vision (ΔE ≥ 20) but not under the simulation (ΔE < 12).
- **UI boundaries under washout:** input border, strong border, focus ring and primary button fill, each measured against 3:1 (WCAG 1.4.11).
- **Text at 200%:** text clipped by `overflow`/ellipsis, text overflowing fixed boxes, fixed-height controls, and horizontal scrolling.
- **RTL:** physical `text-align: left`, focus steps that run against the reading direction, and horizontal overflow.
- **Focus order:** number of stops, positive `tabindex`, stops without an accessible name, upward jumps, and targets under 24×24px (as WCAG 2.5.8 candidates).

## Review report

**Review report** builds a standalone HTML document and previews it in a dialog, with **Download HTML** and **Print / save as PDF**. It contains:

- the disclaimer, at the top and in the footer
- the session settings: preset, mode and its source, on-screen simulations, widths, user agent and timestamp
- a summary table plus detailed observations for all 8 simulation passes and a baseline pass
- the full focus-order table
- method and limitations
- a checklist of manual checks that are still required

## Preset inheritance (with a safe fallback)

The workspace preset is resolved in this order. The first valid preset id wins:

1. URL query or hash: `?theme=<id>&mode=light|dark` (`preset=` also works). This is the same `#theme=…&mode=…` format the gallery writes.
2. A preset chosen inside the simulator in this tab (`sessionStorage["aegis-simulator:preset"]`).
3. A shared bridge, if one is present: `window.AegisTokenBridge.getActivePreset()` → `{ id, mode }`.
4. The **canonical active tokens** written by the Studio, read through [`shared/aegis-contract.js`](../shared/aegis-contract.js) from `localStorage["aegis:active-tokens:v1"]` (see [`docs/INTEGRATION.md`](../docs/INTEGRATION.md)). The record's `presetId` and `doc.meta.defaultMode` are used. Empty, corrupt or blocked storage, and Studio systems not seeded from a preset, are skipped. Changes made in another tab are followed live unless a preset was picked in this tab.
5. Legacy `localStorage` keys, as a read-only fallback, in this order: `aegis:active-preset`, `aegisui:active-preset`, `aegis-active-preset`, `aegisui:preset`. The value can be a JSON `{ "id", "mode" }` or a bare id string. No AegisUI module writes these today.
6. The default, `enterprise-saas`.

If no mode is given, the simulator uses `localStorage["aegis-theme"]` (the showcase's light/dark preference) when present, and otherwise the preset's default mode. Unknown ids are ignored.

If `presets/aegis-presets.js` fails to load, a built-in list of the 12 ids keeps the picker working, and the CSS still themes the workspace.

The simulator **never writes** shared keys. It writes only `localStorage["aegis-simulator:v1"]` (simulation settings) and the sessionStorage key above.

## Integration hooks (for the shared nav / token bridge)

Link to it from anywhere in the repo with a relative path. Add `?theme=` and `&mode=` to open it on a specific preset:

```html
<a href="simulator/simulator.html?theme=fintech-terminal&mode=dark">Accessibility simulator</a>
```

**Deep-link parameters** (query or hash): `theme`, `mode`, `vision` (`none|protanopia|deuteranopia|tritanopia|achromatopsia`), `washout` (`0`, `1`, or an intensity of 10–100), `scale` (`100|125|150|200`), `rtl` (`0|1`), `focus` (`0|1`), `width` (`fit|1280|768|390`).

**Live preset sync:**

```js
// From the same page (e.g. a shared nav/theme switcher):
window.dispatchEvent(new CustomEvent('aegis:preset-change', { detail: { id: 'healthcare-clean', mode: 'dark' } }));
// From another tab: write one of the bridge localStorage keys above; the simulator follows the
// `storage` event unless the user has picked a preset inside the simulator in this tab.
```

**`window.AegisSimulator` API:**

| Method | Returns |
|---|---|
| `getState()` / `setState(patch)` / `reset()` | simulation settings `{ vision, washout, washoutLevel, textScale, rtl, focusOrder, width }` |
| `getPreset()` / `setPreset(id, mode)` | `{ id, mode, source }` / `boolean` |
| `focusOrder()` | `[{ n, role, name, tabindex, element, back, against }]` |
| `observations()` | observations for the current settings |
| `review()` | a full sweep result (settings, sections, focus stops) |
| `buildReport()` | the standalone report HTML string |
| `simulateColor(hex, spec)` / `contrast(a, b)` | color helpers |

## Tests

```bash
node simulator/tests/run.cjs
```

The tests serve the repository under **`/aegis-ui-engine/`** (mirroring GitHub Pages) and drive Chromium with Playwright. Playwright is test-only and is never loaded by the page. There are 70 checks:

- **Color simulations:** each matrix is applied in `linearRGB` and the rendering actually changes. The color math is spot-checked.
- **Washout:** it follows the intensity slider.
- **Text scaling:** 200% doubles text tokens while layout tokens stay fixed.
- **RTL:** the workspace mirrors and the chrome does not.
- **Focus order:** the computed order is compared with real `Tab` key presses, including positive `tabindex`. Also checked: roving tabs, radio groups, disabled controls, the overlay's badges and paths, and Previous/Next stepping.
- **Settings and presets:** settings persist and reset, presets are inherited from the URL, storage and events, the fallback works without the preset registry, and every preset applies.
- **Report:** it contains the disclaimer, settings and all 8 simulations, never claims conformance, restores state after the sweep, downloads, and prints to an A4 PDF.
- **Accessibility and layout:** every control has a name, and the page has no horizontal scroll at 390px.
- **Console:** no errors, warnings or failed requests.

Chromium splits `<input type="date">` into extra Tab stops (day, month, year). The test collapses these into one stop, which is how the overlay counts them.

## Files

```
simulator/
  simulator.html   chrome + sample workspace markup (static, readable without JS)
  simulator.css    .sim-* chrome tokens (follow OS light/dark) + .ws-* workspace using --aegis-* tokens
  simulator.js     engine: filters, text tokens, RTL, tab order, overlay, observations, report, hooks
  tests/run.cjs    end-to-end tests (subpath server + Playwright)
  README.md
```

The page loads `../presets/aegis-presets.css`, `../presets/aegis-components.css` and `../presets/aegis-presets.js` read-only. No shared or root files are modified. Remote Google Fonts are not loaded (`loadFonts: false`), so the page needs no network and each preset falls back to its system font stack.

## Known limitations

- Color simulations model dichromacy at full severity. Anomalous trichromacy (for example protanomaly) is milder.
- Contrast is measured on text nodes over solid or composited backgrounds. Text over images is skipped, and gradients use the element's background color only.
- Text scaling is not a substitute for testing browser zoom at 400% or reflow at 320 CSS px (WCAG 1.4.10).
- The tab order does not execute page scripts, focus traps or `delegatesFocus` shadow roots.
- The accessible name computation is simplified, not the full accname spec.
