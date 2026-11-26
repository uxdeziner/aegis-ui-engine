# AegisUI

AegisUI is a design-system toolkit built from static HTML, CSS and ES2017+ JavaScript, with **no runtime dependencies and no build step needed to use it**. You generate a token system in the Studio, start from one of 12 enterprise presets, audit AI-generated UI against your tokens, and push the same tokens into Figma.

| Module | Open | What it does |
| --- | --- | --- |
| **Studio** | [`index.html`](index.html) | Generate a design system (OKLCH palettes, type scale, 4/8px grid, radius, elevation, motion), preview it on a sample SaaS app, compile AI rule files (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`, system prompt) and export tokens. |
| **Auditor** | [`auditor/auditor.html`](auditor/auditor.html) | Score pasted HTML/CSS for token compliance, WCAG 2.2 contrast and ARIA, semantic HTML and visual hierarchy, then refactor it to clean tokens. It validates against the **active token baseline** from the Studio. |
| **Preset Vault** | [`presets/index.html`](presets/index.html) | 12 production themes with light and dark modes, contrast checked at build time. Preview, export, or **Open in Studio**. Details: [`presets/README.md`](presets/README.md). |
| **Figma Bridge** | [`figma-plugin/index.html`](figma-plugin/index.html) | Help page and validator for **AegisUI Token Sync**, the Figma plugin that turns token JSON into Variables, styles and a style guide. Details: [`figma-plugin/README.md`](figma-plugin/README.md). |
| **Showcase** | [`showcase/showcase.html`](showcase/showcase.html) | UX engineering case study with an interactive before/after, ROI model and architecture overview. |
| **Simulator** | [`simulator/simulator.html`](simulator/simulator.html) | Shows a preset workspace through eight accessibility simulations (color-vision types, projector washout, 200% text, RTL, focus order) and exports a review report. It opens on the preset behind the active Studio tokens. A review aid, not a conformance test. Details: [`simulator/README.md`](simulator/README.md). |
| **Playground** | [`playground/playground.html`](playground/playground.html) | Prompt-to-Component Sandbox: 39 copy-ready enterprise components styled only with tokens, with live preview in any preset, Copy HTML/CSS/JS and an AI prompt builder. It opens on the preset behind the active Studio tokens. Details: [`playground/README.md`](playground/README.md). |
| **CLI** | [`cli/index.html`](cli/index.html) | Command builder for **aegis-init**, which scaffolds a preset into a project (`variables.css`, `tokens.json`, `CLAUDE.md`, `.cursorrules`). The page shows the exact files and byte counts the CLI writes. Details: [`cli/README.md`](cli/README.md). |

Launch material (LinkedIn drafts, an architecture article and a demo script, with a claims checklist) lives in [`launch-kit/LAUNCH-GUIDE.md`](launch-kit/LAUNCH-GUIDE.md). It's Markdown only and isn't part of the app.

Every page carries the same module navigation bar at the top. It's plain HTML with relative links, the current module is marked with `aria-current="page"`, and it works without JavaScript.

## Quick start

```bash
npm run serve                # http://127.0.0.1:4173/aegis-ui-engine/  (no dependencies)
# or: python3 -m http.server, then open /index.html
```

Scaffold a preset into a project with the CLI (Node ≥ 18, no dependencies, no network):

```bash
node cli/aegis-init.js --list                         # 12 presets + aliases
node cli/aegis-init.js --preset=gov --out=./my-app    # tokens + AI rule files
```

You can also open the HTML files straight from disk. For **cross-module sync** (Studio → Auditor and Figma Bridge), serve the folder over HTTP. Browsers give `file://` pages inconsistent storage origins, and Firefox isolates them by default. All URLs are relative, so the site also works from a sub-path such as GitHub Pages' `/<repo>/` (the browser tests run under `/aegis-ui-engine/`).

The presets reference Google Fonts. Without network access, pages fall back to the listed system font stacks. Nothing else is fetched from the network.

## How the modules connect

```
presets/themes/*.mjs ──npm run build──► presets/tokens/<id>.json ─┐   (canonical aegis-tokens documents)
                                        presets/aegis-presets.js ──┼──► Preset Vault ──"Open in Studio"──┐
                                                                   │                                    ▼
                              shared/aegis-contract.js  ◄──────────┴──────────────────────────────►  Studio
                              (canonical contract, adapter,                                           │ writes the active
                               validation, active baseline)                                           ▼ baseline (localStorage)
                                        ▲                     ┌──────────────── active tokens ◄───────┘
                                        │                     ▼                        ▼
                                  Figma plugin ◄── aegis-tokens.json ── Figma Bridge   Auditor (validation + preview)
                                                                                       Simulator, Playground, CLI page (preset)

presets/tokens/<id>.json + presets/css/<id>.css ──► cli/aegis-init.js ──► variables.css · tokens.json · CLAUDE.md · .cursorrules
```

### Token contract

The **canonical format** is the AegisUI token document, `"aegis": { "format": "aegis-tokens", "version": "1.x" }`, specified by [`presets/schema/aegis-tokens.schema.json`](presets/schema/aegis-tokens.schema.json). Presets are authored in it, the Figma plugin imports it, and the Auditor validates against it. [`shared/aegis-contract.js`](shared/aegis-contract.js) is the single implementation every module loads:

| Function | Purpose |
| --- | --- |
| `fromStudio(tokenModel)` | Studio → canonical document. It has the same structure as a preset: primitives, semantic `bg/fg/border/brand/accent/status/data` roles with Light/Dark modes, dimensions, 16 text styles, shadows, motion, component recipes and an `a11y` report. CSS variable names are `--aegis-*`. |
| `toStudioState(document)` | Canonical document (a preset) → Studio generator settings. |
| `validateForPlugin(doc)` | Line-for-line port of the Figma plugin's `validate()`. The tests check both produce identical messages. |
| `validateSchema(doc, schema)` | Small JSON Schema (2020-12 subset) checker for the schema file. |
| `readBaseline` / `writeBaseline` / `onBaselineChange` | Active token baseline in `localStorage`, safe against missing, blocked, full or corrupt storage, with cross-tab change events. |
| `flatten(doc)` | CSS-variable map and both-mode palette used by the Auditor. |

**Studio → canonical mapping.** `primary` → `brand` ramp. Studio roles map onto canonical ones: `bg`→`bg.canvas`, `surface`→`bg.surface`, `text*`→`fg.*`, `on-primary`→`fg.on-brand`, `border-strong`→`border.strong`, `focus-ring`→`border.focus`, `primary*`→`brand.*`, and statuses map one to one. Studio has no separate accent hue, so canonical `accent.*` aliases the **info** ramp. Spacing tokens are keyed by px (`dimension.spacing.8`). Font families name the first concrete family in the stack and keep the full stack in `$extensions.aegis.stack`.

**Preset → Studio is an approximation.** Studio regenerates every ramp with its own OKLCH algorithm. The adapter carries over:
- the light-mode brand fill (it lands exactly on a Studio shade)
- the 600 status hues and the neutral hue and tint
- font stacks
- base size, scale ratio (snapped), line height and heading weight
- the grid (from density), radius, elevation strength, base duration and easing

Exact preset values remain in `presets/tokens/<id>.json`.

**Old exports are preserved.** Studio still exports `variables.css` (`--<prefix>-*`, light/dark, reduced motion) and the W3C DTCG `tokens.json` unchanged. The canonical document is an *additional* export, `aegis-tokens.json`, also bundled in the zip as `tokens/aegis-tokens.json`.

**Building a new module?** [`docs/INTEGRATION.md`](docs/INTEGRATION.md) is the stable contract for connecting to AegisUI: bridge API (`API_VERSION` 1.0.0), storage key and record shape, versioning rules, and the navigation hook for new modules. The Simulator, Playground and CLI page are linked; Launch Kit is Markdown only and has no page.

### Active token baseline

Whenever Studio settings change, the Studio writes the canonical document and its own `--<prefix>-*` variables to `localStorage` (`aegis:active-tokens:v1`). The Auditor and Figma Bridge read it and refresh when another tab changes it. Corrupt or invalid records are ignored with a visible notice, never trusted.

| Key | Owner | Contents |
| --- | --- | --- |
| `aegis:active-tokens:v1` | Studio (written); Auditor, Figma Bridge, Simulator, Playground and CLI page (read) | `{ schema: "aegis-active-tokens@1", savedAt, origin, presetId, prefix, extraVars, doc }` |
| `aegisui:v1`, `aegisui:prefs:v1` | Studio | Generator settings (plus the selected preset) and UI preferences. Unreadable state is discarded and defaults load. |
| `aegis.auditor.code`, `.theme`, `.baseline` | Auditor | Editor content, theme, baseline mode (`active` or `none`) |
| `aegis-theme` | Showcase | Theme |
| `aegisui:playground:v1` | Playground | Last preset, mode, template and viewport, plus when you last picked a preset there (`pickedAt`) |

## Studio

- **Controls:** primary and neutral palettes with 11 OKLCH steps each (50–950, gamut-mapped to sRGB), status colors, modular type scale, 4px/8px grid, radius, shadow depth, and motion duration plus `cubic-bezier` with a curve editor.
- **Presets:** five Studio starters and all **12 AegisUI presets**. Choosing a preset also switches the preview to that preset's default mode. `index.html?preset=<id>` (used by the Preset Vault) applies one once, then removes the parameter.
- **Live Preview:** dashboard, sortable data table, Kanban (drag plus a "Move to" control, per WCAG 2.5.7), sign-in screen (paste-friendly, show password, per 3.3.8) and settings modal (focus trap, Escape). It has light/dark and desktop/tablet/mobile views and uses only CSS custom properties.
- **AI Context Compiler:** `CLAUDE.md`, `.cursorrules`, `AGENTS.md` and a system prompt that pin coding assistants to the exact tokens, semantic HTML5 and WCAG 2.2 AA. Target stack (vanilla, React, Vue, Svelte, Tailwind v4) and strict or pragmatic enforcement are selectable.
- **Export:** `variables.css`, DTCG `tokens.json`, canonical `aegis-tokens.json`, `aegis.config.json` (re-importable), and a single `.zip` bundle built by a hand-written ZIP encoder.
- **Persistence:** settings survive reloads. Edits in one tab show up in other open Studio tabs.

## Auditor (AI UI Slop Auditor & WCAG Refactor Engine)

A tool for auditing the HTML/CSS that ChatGPT, Claude, Cursor or v0 hand you. Scripts in pasted code never run: rendering happens in a sandboxed iframe.

1. **Paste & preset.** A syntax-highlighted editor with line numbers and issue markers in the gutter, plus four "Bad AI UI" presets: Gradient SaaS Landing, Div-Soup Dashboard, Glassmorphism Login and Pricing Page Chaos.
2. **Score (0–100) across 4 pillars**, combining static CSS analysis with live DOM inspection:

   | Pillar | Weight | Examples of checks |
   | --- | --- | --- |
   | Token Compliance | 25% | hardcoded hex/rgb/named colors, px spacing / font-size / radius, off-scale magic numbers, inline styles, `!important`, palette sprawl, near-duplicate colors (ΔE < 4.5), undefined `var()`, **colors outside the active baseline**, **unknown baseline tokens** |
   | WCAG 2.2 Contrast & ARIA | 30% | 1.4.3 text contrast (alpha, opacity and gradients composited), 1.4.11 field boundaries, 2.1.1 click-only elements, 4.1.2 names/roles, 1.1.1 alt, 1.3.1 labels, 2.4.7 focus removed, 2.5.8 target size (with the spacing exception), 2.4.3 positive tabindex, 3.1.1 lang, 1.4.4 zoom lock, 1.3.5 autocomplete |
   | Semantic HTML | 25% | fake buttons, fake headings, heading outline, missing landmarks, nav without `<nav>`, div soup, lists, deprecated tags |
   | Visual Hierarchy | 20% | type-scale sprawl, sizes too close to read as different, inverted headings, font families/weights, competing CTA colors, tight line-height, tiny text, and "AI slop signatures" (`#667eea → #764ba2`, emoji icons, everything centered) |
3. **Token baseline.** The Token baseline panel at the top of the report shows the active tokens from the Studio: name, source preset, token count and when they were saved.
   - With **Active tokens** selected, the preview renders with those tokens defined. So `var(--aegis-fg-default)` or `var(--ae-color-surface)` resolve, and contrast checks use the real values.
   - Colors further than ΔE 2.3 from every baseline color are reported, along with the closest token.
   - A variable that looks like a baseline token but doesn't exist is flagged as an unknown token.
   - **None** switches back to generic checks.
4. **X-Ray overlay.** Red badges on the live preview count the issues on each element. Hover a badge for details; click it to jump to the report and the source line. Layers can be toggled per pillar, and the preview has desktop, tablet and mobile widths.
5. **1-Click Refactor to Clean Tokens.** Rewrites the code into:
   - a `:root` token layer: color primitives plus semantic aliases, a 4px spacing grid, a rem type scale, radius, elevation and font tokens
   - semantic markup: native `<button>`s, real headings with a fixed outline, landmarks, alt text, labels and aria-labels
   - contrast repairs that change the token behind a color by the smallest lightness change that passes

   The result is re-audited, with before → after scores, a diff, the generated tokens and a changelog of manual follow-ups. You can then Apply, Copy or Download it.
6. **Copy AI fix prompt.** Copies the findings and your source as a prompt to paste back into your AI tool.

Measured on the four presets: **30–44 → 95–98** with the baseline set to *None*. Against the default Studio baseline, the refactored code scores **90–93**, because the refactor generates its own palette rather than snapping colors to your tokens.

## Presets and the Figma plugin

```bash
npm run build          # themes/*.mjs → tokens/*.json, css/*.css, aegis-presets.{css,js}, plugin presets
npm run build:strict   # same, but exits 1 if any contrast check fails
```

Use a preset in an app with `<link rel="stylesheet" href="presets/css/<id>.css">` and `<html data-aegis-theme="<id>" data-aegis-mode="light|dark|auto">`. See [`presets/README.md`](presets/README.md) for the token architecture, the 12 presets and authoring.

To use **AegisUI Token Sync** in Figma, import `figma-plugin/manifest.json` in the Figma desktop app (Plugins → Development → Import plugin from manifest…). It accepts any canonical document: a Studio `aegis-tokens.json`, a Preset Vault export, or `presets/tokens/<id>.json`. The [Figma Bridge](figma-plugin/index.html) page checks a file with the plugin's own validation and the JSON schema before you import it. See [`figma-plugin/README.md`](figma-plugin/README.md).

## Testing

```bash
npm test                 # strict preset build + Figma plugin end-to-end (mock API) + token contract tests + CLI tests
npm run test:cli         # CLI only: generation, options, path safety, and the CLI page's manifest
npm run test:e2e         # browser integration tests (needs Playwright + Chromium installed locally)
npm run test:simulator   # Accessibility Simulator browser tests (Playwright)
npm run test:playground  # Playground: 39 templates, interactions, preset inheritance (Playwright)
npm run test:browser     # all three browser suites
```

GitHub Actions (`.github/workflows/ci.yml`) runs `npm test` on Node 18, 20 and 22, and the three browser suites on Node 22 with Chromium, on every pull request and every push to `main`. `.github/workflows/pages.yml` deploys the site (see *Deploying*).

- `npm test` needs only Node ≥ 18.
  - **Contract tests** (`tests/contract.test.cjs`) cover:
    - schema conformance of all 12 presets and of Studio exports
    - the adapter for every Studio starter and all 12 presets
    - parity with the plugin's own validation messages
    - a full plugin import of a Studio export
    - unchanged shape of the old exports
    - baseline storage edge cases: empty, corrupt, invalid, quota, unavailable
  - **CLI tests** (`cli/test/*.test.js`) cover generation for every preset, options, overwrite and path safety, and check that `cli/manifest.js` (the CLI page's data) matches a fresh dry run. Rebuild it with `npm run build:cli-manifest` after changing the CLI or the presets.
- `npm run test:e2e` (`tests/e2e.cjs`) serves the repo under `/aegis-ui-engine/` and covers:
  - every page at desktop and mobile: console errors, missing or out-of-mount assets, sideways scroll, and the navigation (labels, one `aria-current`, relative links, 24px targets, keyboard order)
  - all 12 presets in the Studio, persistence across reloads, empty and corrupt storage, and cross-tab sync
  - Auditor baseline validation and preview injection
  - Simulator, Playground and CLI page inheriting the active Studio tokens, and the CLI page's output matching a real dry run
  - canonical export and Figma Bridge validation, the zip contents, and Preset Vault → Studio
  - Playwright is development tooling only; the app never loads it. Set `SHOTS=dir` to save screenshots.

## Deploying

AegisUI is a static site. It has no server, database, sign-in or secrets, and every page uses relative URLs, so any static host works.

It deploys to **GitHub Pages** at `https://uxdeziner.github.io/aegis-ui-engine/` through `.github/workflows/pages.yml`. After every push to `main`, it runs `npm test`, packages the site and publishes it.

- **One-time setup:** Settings → Pages → Build and deployment → Source: **GitHub Actions**. Until then the deploy job fails and nothing is published.
- **What ships:** `node tools/package-site.cjs _site` copies the public pages and assets. It leaves out tests, build scripts, `docs/` and `launch-kit/`, adds `.nojekyll`, and fails on any broken local link or social-preview image.
- **Checked before release:** CI runs the browser suite against the packaged `_site` (`AEGIS_SITE_ROOT=_site npm run test:e2e`), so the tests cover exactly what gets deployed.
- **Social previews:** every page has Open Graph tags with absolute URLs under the Pages address (`shared/og-image.png`, and `showcase/og-cover.png` for the case study). If you move to a custom domain, update those URLs and `SITE_URL` in `tools/package-site.cjs`.
- **Other hosts** (Netlify, Cloudflare Pages, Vercel): use `node tools/package-site.cjs _site` as the build command and `_site` as the output folder.

The **Figma plugin** and the **CLI** are released separately. Publish the plugin from the Figma desktop app after a real test run (see *Known limitations*). The CLI runs from this repository with Node 18+ and isn't on npm.

## Accessibility statement

AegisUI targets WCAG 2.2 Level AA. Its automated checks cover:
- contrast ratios for the generated token pairs
- the preset build's ~39 pairs per mode
- the Auditor's static and DOM checks
- the browser tests' navigation and target-size assertions

**Automated checks are not a WCAG certification or a conformance claim.** They can't judge meaning, reading order, the quality of alternative text, or the real experience of screen-reader, keyboard, voice-control and magnification users. A claim of conformance needs manual testing with assistive technology and real content.

## Known limitations

- **Figma desktop validation is still pending.** The plugin is tested end to end against a strict mock of the Figma API (`npm run test:plugin` and the contract tests), but hasn't been run in the Figma desktop app. Treat the first real import as a trial.
- Loading a preset into the Studio approximates it (see *Token contract*). For exact preset values, use the preset's own token JSON.
- Studio exports name system fonts (for example `Segoe UI`) that Figma may not have; the plugin substitutes Inter and reports it.
- The Auditor's refactor doesn't map colors onto the active baseline's tokens yet; it reports the drift instead.
- Cross-module sync relies on `localStorage` on one origin. It doesn't sync between devices or browsers, and isn't reliable from `file://`.

## Repository layout

```
index.html, css/, js/        Studio
auditor/                     Auditor
presets/                     Preset Vault, themes, build, schema, tokens, CSS
figma-plugin/                Token Sync plugin (manifest, code.js, ui.html) + Figma Bridge help page
showcase/                    Case study
simulator/                   Accessibility Simulator
playground/                  Prompt-to-Component Sandbox (39 templates)
cli/                         aegis-init CLI, its command-builder page and manifest
launch-kit/                  Launch material (Markdown only)
shared/                      aegis-contract.js (token contract), aegis-nav.css (module navigation), og-image.png (social preview)
docs/                        INTEGRATION.md: stable bridge API, storage key and navigation hook for new modules
tests/                       contract tests, browser tests, sub-path static server
tools/                       package-site.cjs: packages and link-checks the site for hosting
```
