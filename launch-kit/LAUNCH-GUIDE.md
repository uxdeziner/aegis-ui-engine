# AegisUI launch guide

This kit is for Kapil Rai's AegisUI launch: five LinkedIn post drafts, an architecture article and a 60-second demo script. Everything here is grounded in what is in the repository today. Before posting, read the **claims checklist** at the bottom.

---

## 0. What actually exists (source of truth for every claim)

| Module | Path | What it really does |
| --- | --- | --- |
| Studio | `index.html`, `js/` | Browser app. You build a token set, see it on a live sample product (dashboard, table, Kanban, auth, settings modal), and export CSS / W3C design-token JSON. The **AI Context Compiler** turns the tokens into `CLAUDE.md`, `.cursorrules`, `AGENTS.md` and a system prompt. |
| Presets | `presets/` | 12 enterprise themes generated from small source files. Each has OKLCH color ramps, light + dark semantic colors, 16 text styles, spacing/radius/shadow/motion scales and 13 component recipes. Each ships as token JSON + CSS variables. A gallery previews and exports them. |
| Contrast enforcement | `presets/build/` | At build time, about 39 foreground/background token pairs per mode are checked against WCAG AA (AAA for the Gov preset). Failing pairs are moved along their color ramp until they pass, and every adjustment is recorded. `npm run build:strict` fails on any regression. |
| Figma plugin | `figma-plugin/` | Imports the token JSON and creates Local Variables in 6 collections (Semantic has Light/Dark modes), text and effect styles, an auto-layout style guide, token-bound Button/Badge/Input/Card components and token documentation tables. |
| Auditor | `auditor/` | Paste AI-generated HTML/CSS and get a 0–100 score across token compliance, WCAG contrast & ARIA, semantic HTML and visual hierarchy. Includes an X-ray overlay and a one-click refactor to tokens. |
| Showcase | `showcase/` | A case-study page. It has a regeneration-cost calculator whose inputs are labelled as assumptions to replace with your own numbers. |
| CLI | `cli/aegis-init.js` | `node cli/aegis-init.js --preset=fintech --out=./app` writes `tokens.json`, `variables.css`, `CLAUDE.md` and `.cursorrules` from the real preset files. It has zero dependencies, no network access, refuses to overwrite without `--force`, and has path-traversal guards. |

**Constraints that are also selling points:** everything is vanilla HTML/CSS/JS and Node built-ins. There are no npm dependencies and no build step for the browser tools.

**Two distinctions to keep straight in every piece of content:**

1. **Automated contrast checks ≠ accessibility certification.** AegisUI checks color contrast on token pairs, and the Auditor runs static and DOM heuristics. Neither replaces a manual audit, assistive-technology testing or a VPAT/conformance report. Say "contrast-checked against WCAG AA/AAA". Never say "WCAG compliant", "accessible by default" or "certified".
2. **Figma mock tests ≠ real Figma validation.** The plugin's automated tests run against a strict in-memory mock of the Figma Plugin API. It enforces the rules that commonly break plugins (fonts loaded before text, alias types, scopes, auto-layout sizing). That is evidence the logic is sound, not proof it works in Figma. Until someone has run it in the Figma desktop app, say "tested against a mock of the Figma API". After a real run, you can say "runs in Figma" and show a screen recording.

---

## 1. LinkedIn post drafts

House style: first person, short paragraphs, one idea per post, no hype words, no invented numbers. Attach a screen recording or screenshot to each; real UI beats any graphic.

### Post 1 — The problem (launch post)

> Every AI coding tool I use can build a decent-looking settings page in 30 seconds.
>
> None of them know that our "primary" is a specific blue, that inputs need a 3:1 border, or that tables are 32px rows in the trading app and 52px in the HR app.
>
> So you get something that looks plausible, then you spend the afternoon replacing hex codes.
>
> I've been building AegisUI to close that gap. It's a design-token toolkit where the same token file feeds three places:
> → the CSS your app loads
> → the rule files your AI assistant reads (CLAUDE.md, .cursorrules)
> → Figma variables your designers use
>
> It's plain HTML, CSS and JavaScript. No framework, no npm dependencies.
>
> Over the next few posts I'll walk through how each piece works, including the parts I'm still not sure about.
>
> #DesignSystems #DesignTokens #AIEngineering #Accessibility

### Post 2 — Contrast as a build step, not a review comment

> Contrast bugs in design systems rarely come from the main colors. They come from the edges: the muted text on a sunken panel, the warning badge text on its tint, the focus ring in dark mode.
>
> In AegisUI I stopped treating that as a review task. The preset build checks about 39 foreground/background pairs per mode, in both light and dark: body text on every surface, text on brand fills, status text on tints, input borders, focus rings and chart colors.
>
> When a pair fails, the build doesn't just complain. It walks that color along its ramp to the nearest step that passes, and records the change so you can see what moved and why. A strict mode fails the build on any regression.
>
> One preset targets AAA instead of AA, at 7:1 for text.
>
> An honest caveat: this is automated contrast checking on tokens. It is not an accessibility audit. It can't tell you whether your modal traps focus or your form errors are announced. That still needs a person and a screen reader.
>
> #Accessibility #WCAG #DesignSystems

### Post 3 — 12 presets, and why "industry" changes more than color

> I built 12 starting points for AegisUI, from a fintech terminal to a calm HR product.
>
> The interesting part wasn't picking palettes. It was what else changes per industry:
>
> • Fintech terminal: dark-first, compact density, monospaced tabular figures, 2px radii
> • High-contrast gov: 19px body text, 48px touch targets, always-underlined links, AAA contrast
> • Swiss editorial: zero radius, no shadows, a 104px display size
> • Logistics ops: condensed headings and uppercase table headers, built for scanning
>
> Each preset is a short source file (roughly 30 to 85 lines). A build turns that into a few hundred tokens, CSS for light and dark, and component recipes for buttons, inputs, tables, tabs and so on.
>
> If you've ever been handed "make it look like Bloomberg" or "make it feel like a clinic", this is the part of the brief I wanted to encode.
>
> #DesignSystems #UXEngineering #ProductDesign

### Post 4 — One command, four files

> Small thing I shipped this week: a CLI for AegisUI.
>
> node cli/aegis-init.js --preset=fintech --out=./app
>
> It writes four files:
> • variables.css — the preset as CSS custom properties, light and dark
> • tokens.json — the same tokens as structured data
> • CLAUDE.md and .cursorrules — instructions for Claude Code and Cursor: use these variables, pair these foregrounds with these backgrounds, never invent a hex code
>
> A few decisions I care about more than the feature itself:
> – it won't overwrite your files unless you pass --force
> – it refuses to write outside the folder you're in, or through symlinks
> – zero dependencies and no network calls, so it's easy to audit
>
> The rule files are generated from the real token data, so the color table your AI reads matches the CSS your app loads.
>
> #DeveloperTools #AIEngineering #DesignTokens

### Post 5 — Figma, and being precise about what's tested

> The last piece of AegisUI is a Figma plugin. It takes the same token JSON and builds:
> • Local Variables in six collections, with Light and Dark modes on the semantic layer
> • text and effect styles
> • a style guide page in light and dark
> • Button, Badge, Input and Card components bound to the tokens, plus documentation tables
>
> Here's where I want to be precise. The automated tests run the plugin against a strict mock of the Figma API that I wrote. It enforces the usual traps: fonts loaded before text, variable alias types, scopes, auto-layout sizing.
>
> That's useful, but it isn't the same as running in Figma. [Before posting: replace this sentence with what happened in the real desktop app, or say it's next.]
>
> If you maintain a design system and want to try it on a real file, I'd value the feedback, especially the failures.
>
> #Figma #DesignSystems #DesignTokens

---

## 2. Article — "One token file, three consumers: the architecture of AegisUI"

*Suggested length is about 1,200 words. A draft follows. Section headings double as an outline for a talk.*

### The problem

AI coding assistants are good at producing UI and bad at producing *your* UI. They don't know your semantic color roles, your density, or which border color meets 3:1 against your input background. Design systems usually encode those decisions in places assistants never read: a Figma library, a Storybook, a wiki page. AegisUI puts one machine-readable token document at the center and generates every downstream artifact from it.

### The token document

Every preset compiles to a single JSON file (`presets/tokens/<id>.json`) in what I call the AegisUI token format. It is inspired by the W3C Design Tokens Community Group format:

- Leaves have a `$type` and either a `$value` or a `$modes` object (`light`, `dark`).
- References are aliases like `{primitive.color.brand.600}`.
- Every token carries the CSS custom property it maps to, in `$extensions.aegis.cssVar`.

The layers are deliberate:

```
primitive  → raw OKLCH ramps, never used directly in components
semantic   → roles with light/dark values: bg.surface, fg.muted, border.strong, brand.default, danger.fg …
component  → recipes that alias the layers above: button.radius, input.border, table.row-height …
```

Alongside sit `dimension` (spacing, radius, border width, control sizes), `typography` (families, weights, 16 text styles), `shadow` and `motion`. A JSON Schema in `presets/schema/` documents the format, and both the build and the CLI validate against it.

### Generating presets instead of hand-writing them

A preset source file is small. It holds a hue and peak chroma per palette, a density, font choices and a handful of overrides. The build:

1. **Generates ramps in OKLCH** and clips them to sRGB, so lightness steps look even across hues.
2. **Maps semantic roles per mode.** Each mode has defaults; a preset overrides only what makes it distinct.
3. **Enforces contrast.** About 39 pairs per mode are checked against AA (4.5:1 text, 3:1 UI boundaries) or AAA (7:1 / 4.5:1). Failing tokens move along their ramp to the nearest passing step. "On" colors marked `auto` pick white or ink, whichever contrasts more. Every adjustment, and any exemption with its reason, is written into the JSON.
4. **Emits CSS** scoped by attribute (`[data-aegis-theme][data-aegis-mode]`), so several themes and modes can coexist on one page.

The result is reproducible. The source files are the only thing you edit.

### Consumer 1: the app

`variables.css` is plain custom properties. `aegis-components.css` shows how components consume them; every value goes through a component recipe variable, so one stylesheet re-skins across all 12 presets.

### Consumer 2: the AI assistant

This is the part that motivated the project. The Studio's AI Context Compiler and the `aegis-init` CLI both turn tokens into instruction files (`CLAUDE.md`, `.cursorrules`). Those files contain the rules that matter:

- use semantic roles, not primitives
- text on a brand fill uses `fg.on-brand`
- form controls use `border.strong`
- never invent a hex value

They also include the actual tables of variables and their light/dark values. Because the files are generated from the same JSON as the CSS, they can't drift from it. The CLI's tests check that every variable mentioned in the generated instructions exists in the generated CSS.

### Consumer 3: Figma

The plugin reads the same JSON and creates six variable collections:

- Primitives (hidden from pickers)
- Semantic, with Light and Dark modes
- Dimensions
- Typography
- Motion
- Components, whose variables alias the other collections

Every variable gets WEB code syntax (`var(--aegis-…)`), so developers in Dev Mode see the exact CSS variable. Re-running updates variables by name, so existing bindings survive a re-sync.

*Testing status:* the plugin's test suite runs it end to end against a strict mock of the Figma Plugin API for all 12 presets, including re-runs and invalid input. The mock is not Figma. Real desktop validation is a separate step; report it separately once done.

### Closing the loop: the Auditor

Generated UI still drifts. The Auditor scores pasted HTML/CSS on:

- token compliance
- contrast & ARIA
- semantic HTML
- visual hierarchy

It can also rewrite the code into a token layer with semantic markup. It is a heuristic tool. Use it to catch obvious problems early, not to certify anything.

### Trade-offs and limits

- **Vanilla only.** That makes it easy to audit and embed. It also means no framework bindings yet.
- **Contrast is the only accessibility property enforced at build time.** Everything else needs human testing.
- **The token format is AegisUI-specific.** It is DTCG-inspired, not a DTCG implementation. The Studio separately exports W3C design-token JSON.

### Try it

```bash
node cli/aegis-init.js --list
node cli/aegis-init.js --preset=gov --out=./my-app
```

---

## 3. 60-second demo video script

Record at 1440×900 with a clean browser profile, system font size at 100% and no notifications. Read the voice-over at a calm pace; about 150 words fits in 60 seconds.

| Time | Screen | Voice-over |
| --- | --- | --- |
| 0:00–0:06 | Terminal, empty project folder | "AI assistants write UI fast. They just don't know your design system. AegisUI fixes that with one token file." |
| 0:06–0:16 | Type `node cli/aegis-init.js --preset=fintech --out=.`. Show the four files listed. | "One command scaffolds a preset: CSS variables, the token JSON, and instruction files for Claude Code and Cursor." |
| 0:16–0:24 | Open `CLAUDE.md` and scroll the semantic color table and rules. | "The rules your assistant reads are generated from the same tokens as your CSS: semantic roles, light and dark values, never invent a hex code." |
| 0:24–0:36 | `presets/index.html`. Click Fintech, then Gov, then Wellness, then Side by side. | "Twelve industry presets. Density, type and component recipes change, not just color. Light and dark ship together." |
| 0:36–0:44 | Accessibility tab: the pass list and an automatic adjustment entry. | "Contrast is checked at build time, about forty token pairs per mode. Failures get auto-adjusted and logged. That's automated contrast checking, not a certification." |
| 0:44–0:54 | Figma: run the plugin, pick a preset, show the Variables panel and the style guide page. **Only if recorded in real Figma.** Otherwise show `figma-plugin/README.md` and the test output, and change the line. | "In Figma, the same JSON becomes variables with light and dark modes, styles and token-bound components." *(Fallback: "A Figma plugin turns the same JSON into variables and styles. It's tested against an API mock, and desktop testing is next.")* |
| 0:54–1:00 | Auditor scoring a pasted snippet, then the repo URL. | "And when generated UI drifts, the Auditor shows where. Vanilla JS, zero dependencies. Link below." |

**Shot list notes**

- Pre-run `npm run build` so the gallery and CLI read fresh output.
- Use an empty folder for the CLI shot. If you re-record in the same folder, the CLI will (correctly) refuse to overwrite. Show that once on purpose, or use `--force`.
- Don't show the showcase's cost calculator with default inputs as if they were results. They are labelled assumptions.

---

## 4. Claims checklist (run before anything goes public)

- [ ] No benchmark, speed-up, cost-saving or ROI numbers unless they come from a real measured pilot, with the method stated.
- [ ] Accessibility language is limited to "contrast-checked against WCAG AA / AAA on token pairs" and "heuristic audit". No "compliant", "certified", "accessible out of the box" or "guaranteed".
- [ ] The Figma plugin is described as "tested against a mock of the Figma API" until a real desktop run is recorded. After that, keep the recording.
- [ ] Counts match the repo: 12 presets · 16 text styles · 13 component recipes · 6 Figma variable collections · 4 CLI output files · about 39 contrast pairs per mode.
- [ ] Fonts are Google Fonts loaded via `@import`. Mention `--no-fonts` if someone asks about CSP or self-hosting.
- [ ] Screenshots come from the current build, not from earlier mockups.
- [ ] Fictional product names in previews (Meridian, Northstar, Hauler…) are presented as sample data.
