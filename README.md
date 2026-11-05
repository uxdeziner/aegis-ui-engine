# Aegis UI Engine

## AI UI Slop Auditor & WCAG Refactor Engine — [`/auditor`](auditor/auditor.html)

A zero-dependency tool (plain HTML, CSS and JS) for auditing the HTML/CSS that ChatGPT, Claude, Cursor or v0 hand you.

**Run it:** open `auditor/auditor.html` in a browser. There's no build step. You can also serve the folder (`python3 -m http.server`) and go to `/auditor/auditor.html`.

### What it does

1. **Paste & preset.** You get a syntax-highlighted editor with line numbers and issue markers in the gutter. Four one-click "Bad AI UI" presets are included: Gradient SaaS Landing, Div-Soup Dashboard, Glassmorphism Login and Pricing Page Chaos.
2. **Score (0–100) across 4 pillars.** The score combines static CSS analysis with live DOM inspection inside a sandboxed iframe (scripts never run).
   | Pillar | Weight | Examples of checks |
   | --- | --- | --- |
   | Token Compliance | 25% | hardcoded hex/rgb/named colors, px spacing / font-size / radius, off-scale magic numbers, inline styles, `!important`, palette sprawl, near-duplicate colors (ΔE < 4.5), undefined `var()` |
   | WCAG 2.2 Contrast & ARIA | 30% | 1.4.3 text contrast (alpha, opacity and gradients composited), 1.4.11 field boundaries, 2.1.1 click-only elements, 4.1.2 names/roles, 1.1.1 alt, 1.3.1 labels, 2.4.7 focus removed, **2.5.8 target size** (with the spacing exception), 2.4.3 positive tabindex, 3.1.1 lang, 1.4.4 zoom lock, 1.3.5 autocomplete |
   | Semantic HTML | 25% | fake buttons, fake headings, heading outline, missing landmarks, nav without `<nav>`, div soup, lists, deprecated tags |
   | Visual Hierarchy | 20% | type-scale sprawl, sizes too close to read as different, inverted headings, font families/weights, competing CTA colors, tight line-height, tiny text, and "AI slop signatures" (`#667eea → #764ba2`, emoji icons, everything centered) |
3. **X-Ray overlay.** Red badges on the live preview count the issues on each element. Hover a badge for details; click it to jump to the report and the source line. Layers can be toggled per pillar, and the preview has desktop, tablet and mobile widths.
4. **1-Click Refactor to Clean Tokens.** Rewrites the code into:
   * a `:root` token layer: color primitives plus semantic aliases (`--color-text`, `--color-bg`, `--color-primary`…), a 4px spacing grid, a rem type scale, radius, elevation and font tokens
   * semantic markup: native `<button>`s, real headings with a fixed outline, landmarks, alt/labels/aria-labels, cleaned-up ARIA
   * contrast repairs: it adjusts the token that sets the color and picks the smallest lightness change. Selectors are rewritten with `:is()` so styling survives retagging.
   
   The output is re-audited in a hidden sandbox. You see the before → after score per pillar, a side-by-side diff, the generated tokens and a changelog that lists manual follow-ups. From there you can Apply, Copy or Download.
5. **Copy AI fix prompt.** Copies the findings and your source as a prompt you can paste back into your AI tool.

Typical result on the presets: **30–44 → 95–98**.
