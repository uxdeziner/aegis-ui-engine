/* AegisUI — AI Context Compiler
 * Compiles the live token model into rule files for AI coding assistants:
 * CLAUDE.md, .cursorrules, AGENTS.md and a portable system prompt.
 */
(function (Aegis) {
  'use strict';
  const T = Aegis.tokens;

  const TARGETS = {
    vanilla: { label: 'Vanilla HTML · CSS · JS', short: 'vanilla HTML5, CSS3 and ES modules' },
    react: { label: 'React + CSS Modules', short: 'React with CSS Modules' },
    vue: { label: 'Vue 3 SFC', short: 'Vue 3 single-file components' },
    svelte: { label: 'Svelte / SvelteKit', short: 'Svelte components' },
    tailwind: { label: 'Tailwind CSS v4', short: 'Tailwind CSS v4 utilities mapped to tokens' }
  };

  const ROLE_USE = {
    'bg': 'Page / app canvas background',
    'surface': 'Cards, panels, table rows, inputs',
    'surface-raised': 'Popovers, menus, modals (sits above surface)',
    'surface-sunken': 'Wells, table headers, code blocks, hover rows',
    'surface-inverse': 'Tooltips, inverse toasts',
    'border': 'Decorative dividers and card outlines (not for inputs)',
    'border-strong': 'Form-control borders, required for 3:1 non-text contrast',
    'text': 'Primary body and heading text',
    'text-muted': 'Secondary text, descriptions, table meta',
    'text-subtle': 'Placeholders, captions, timestamps (still ≥4.5:1)',
    'text-inverse': 'Text on surface-inverse',
    'primary': 'Primary button fill, selected states, key data series',
    'primary-hover': 'Hover state of primary fills',
    'primary-active': 'Pressed state of primary fills',
    'on-primary': 'Text / icons placed on primary',
    'primary-subtle': 'Selected rows, info chips, soft highlights',
    'primary-subtle-text': 'Text on primary-subtle',
    'link': 'Inline links and text buttons',
    'focus-ring': 'Focus indicator outline colour',
    'overlay': 'Modal scrim behind dialogs'
  };
  ['success', 'warning', 'danger', 'info'].forEach((k) => {
    ROLE_USE[k] = `${k[0].toUpperCase() + k.slice(1)} icons and text on surface`;
    ROLE_USE[`${k}-subtle`] = `${k[0].toUpperCase() + k.slice(1)} banner / badge background`;
    ROLE_USE[`${k}-subtle-text`] = `Text on ${k}-subtle`;
    ROLE_USE[`on-${k}`] = `Text on a solid ${k} fill`;
  });

  function ctx(tk, opts) {
    const p = tk.state.prefix;
    const v = (name) => `var(--${p}-${name})`;
    const target = TARGETS[opts.target] ? opts.target : 'vanilla';
    const strict = opts.strict !== false;
    const date = new Date().toISOString().slice(0, 10);
    return { tk, p, v, target, strict, date, name: tk.state.name, fullScales: !!opts.fullScales };
  }

  /* ------------------------------------------------------------ shared blocks */
  const mdTable = (head, rows) => [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');

  function colorTable(c) {
    const S = c.tk.semantic;
    return mdTable(['Token', 'Light', 'Dark', 'Use for'], Object.keys(S.light).map((k) => [
      `\`--${c.p}-color-${k}\``,
      `\`${S.light[k].hex}\``,
      `\`${S.dark[k].hex}\``,
      ROLE_USE[k] || ''
    ]));
  }

  function pairsTable(c) {
    const rows = c.tk.audit.filter((r) => r.mode === 'light').map((r) => {
      const d = c.tk.audit.find((x) => x.mode === 'dark' && x.label === r.label);
      return [r.label, `\`${r.fg}\` on \`${r.bg}\``, `${r.ratio.toFixed(2)}:1`, d ? `${d.ratio.toFixed(2)}:1` : '—', `${r.min}:1 (SC ${r.kind})`];
    });
    return mdTable(['Pairing', 'Tokens', 'Light', 'Dark', 'Minimum'], rows);
  }

  function typeTable(c) {
    return mdTable(['Step', 'Size token', 'px', 'Line height', 'Tracking'], c.tk.typography.sizes.map((s) => [
      s.name, `\`--${c.p}-font-size-${s.name}\``, String(s.px), `\`--${c.p}-line-height-${s.name}\` (${s.lineHeight})`, `${s.tracking}em`
    ]));
  }

  function spaceTable(c) {
    return mdTable(['Token', 'Value'], c.tk.space.map((s) => [`\`--${c.p}-space-${s.name}\``, `${s.px}px`]));
  }

  function scaleLines(c) {
    return Object.keys(c.tk.scales).map((fam) =>
      `- ${fam}: ${Aegis.color.STOPS.map((st) => `${st} ${c.tk.scales[fam][st]}`).join(' · ')}`).join('\n');
  }

  function compactTokens(c) {
    const t = c.tk;
    const S = t.semantic;
    const L = [];
    L.push('COLOR (semantic — light / dark)');
    Object.keys(S.light).forEach((k) => L.push(`  --${c.p}-color-${k}: ${S.light[k].hex} / ${S.dark[k].hex}${ROLE_USE[k] ? '  — ' + ROLE_USE[k] : ''}`));
    L.push('FONT FAMILY');
    L.push(`  --${c.p}-font-heading (${t.typography.families.heading.label}) · --${c.p}-font-body (${t.typography.families.body.label}) · --${c.p}-font-mono`);
    L.push(`FONT SIZE (base ${t.typography.base}px × ${t.typography.ratio})`);
    L.push('  ' + t.typography.sizes.map((s) => `${s.name}=${s.px}px`).join(' · ') + `  → --${c.p}-font-size-{step}, --${c.p}-line-height-{step}, --${c.p}-tracking-{step}`);
    L.push('FONT WEIGHT');
    L.push('  ' + Object.keys(t.typography.weights).map((w) => `${w}=${t.typography.weights[w]}`).join(' · ') + `  → --${c.p}-font-weight-{name}`);
    L.push(`SPACE (${t.state.space.grid}px grid)`);
    L.push('  ' + t.space.map((s) => `${s.name}=${s.px}px`).join(' · ') + `  → --${c.p}-space-{n}`);
    L.push('CONTROL HEIGHT');
    L.push('  ' + t.controls.map((s) => `${s.name}=${s.px}px`).join(' · ') + `  → --${c.p}-size-control-{size}; min target --${c.p}-size-target-min (24px)`);
    L.push('RADIUS');
    L.push('  ' + t.radius.map((r) => `${r.name}=${r.px === 9999 ? 'pill' : r.px + 'px'}`).join(' · ') + `  → --${c.p}-radius-{name}`);
    L.push('SHADOW');
    L.push(`  xs · sm · md · lg · xl  → --${c.p}-shadow-{name}` + (t.state.shadow.depth === 0 ? ' (flat system: all resolve to none)' : ''));
    L.push('MOTION');
    L.push('  ' + t.motion.durations.map((d) => `${d.name}=${d.ms}ms`).join(' · ') + `  → --${c.p}-duration-{name}`);
    L.push('  ' + t.motion.easings.map((e) => `${e.name}=${T.bez(e.curve)}`).join(' · ') + `  → --${c.p}-ease-{name}`);
    return L.join('\n');
  }

  function coreRules(c) {
    const p = c.p;
    const rules = [
      `Every colour, font family, font size, line height, font weight, letter spacing, spacing value (margin, padding, gap, inset), border radius, box shadow, transition duration and easing MUST be a \`var(--${p}-*)\` token from \`variables.css\`.`,
      `Components consume semantic tokens only (\`--${p}-color-*\`, \`--${p}-space-*\`, \`--${p}-font-size-*\`, …). Primitive palette steps such as \`--${p}-primary-600\` or \`--${p}-neutral-200\` exist only so \`variables.css\` can define the semantic roles; never reference them in component code.`,
      `No literal colours anywhere outside \`variables.css\`: no hex, \`rgb()\`, \`hsl()\`, \`oklch()\`, or named colours. Allowed keywords: \`transparent\`, \`currentColor\`, \`inherit\`.`,
      `Never invent new \`--${p}-*\` properties and never edit \`variables.css\` by hand. If a value you need does not exist, use the closest existing token and leave a \`/* TOKEN-REQUEST: … */\` comment explaining what is missing.`,
      `Spacing stays on the ${c.tk.state.space.grid}px grid via \`--${p}-space-0\` … \`--${p}-space-${c.tk.space.length - 1}\`. Off-grid values (e.g. 5px, 13px, 18px) are bugs.`,
      `Font sizes only from the modular scale (\`--${p}-font-size-xs\` … \`--${p}-font-size-5xl\`), always paired with the matching \`--${p}-line-height-*\`. Use rem-based tokens; never set \`font-size\` in px.`,
      `Dark mode is solved by the tokens. Do not write per-component \`prefers-color-scheme\` or \`[data-theme]\` colour overrides; theme switching happens by setting \`data-theme="light|dark"\` on \`<html>\`.`,
      `Text colours must come from the approved pairings table. Body text uses \`--${p}-color-text\`; never place \`--${p}-color-text-subtle\` on \`--${p}-color-surface-sunken\` or brand fills.`
    ];
    if (c.strict) {
      rules.push(`Strict mode: the only permitted raw lengths are \`0\`, \`1px\` hairline borders, \`100%\`, viewport/container units, \`fr\`, and \`ch\`-based measure limits. Everything else is a token.`);
      rules.push('Strict mode: no inline `style` attributes for visual properties. Use classes.');
    } else {
      rules.push(`Pragmatic mode: layout-only values (max-widths, grid templates, aspect ratios, percentages) may be literal. Component-local custom properties are allowed if prefixed \`--_\` and assigned from \`--${p}-*\` tokens.`);
    }
    return rules;
  }

  const HTML_RULES = [
    'Use landmark elements: one `<header>`, `<nav>` (with `aria-label` when there is more than one), exactly one `<main>`, `<aside>`, `<footer>`.',
    'One `<h1>` per view; heading levels never skip (h2 → h4 is a bug). Headings describe the section that follows.',
    'Actions are `<button type="button">` (or `type="submit"` in forms); navigation is `<a href>`. Never attach click handlers to `<div>` or `<span>`.',
    'Every form control has a visible `<label for>`. Group related controls with `<fieldset>` + `<legend>`. Use the correct `type`, `inputmode` and `autocomplete` values.',
    'Tabular data uses `<table>` with `<caption>`, `<thead>`, `<th scope="col|row">`; sortable headers contain a `<button>` and the `<th>` carries `aria-sort`.',
    'Lists of things are `<ul>`/`<ol>`; key–value pairs are `<dl>`; dates are `<time datetime>`.',
    'Dialogs use `<dialog>` with `showModal()` or `role="dialog"` + `aria-modal="true"` + `aria-labelledby`. Focus moves into the dialog, is contained while open, Escape closes it, and focus returns to the trigger.',
    'Informative images have meaningful `alt`; decorative images use `alt=""`; decorative inline SVG gets `aria-hidden="true" focusable="false"`.',
    'Prefer native semantics over ARIA. Do not add a `role` the element already has. Every `aria-labelledby`/`aria-describedby`/`aria-controls` must point to an id that exists.',
    'Status updates (saved, copied, errors after submit) are announced through an existing `role="status"` or `aria-live="polite"` region.'
  ];

  function wcagRules(c) {
    const p = c.p;
    return [
      ['1.1.1', 'Non-text Content', 'Text alternatives for every meaningful image, icon button and chart. Charts also expose their data as a table or summary.'],
      ['1.3.1', 'Info and Relationships', 'Structure is expressed in markup (headings, lists, tables, labels), not only visually.'],
      ['1.4.1', 'Use of Color', 'Status is never colour-only: badges and alerts pair the colour with text and/or an icon.'],
      ['1.4.3', 'Contrast (Minimum)', `Text ≥ 4.5:1 (≥ 3:1 for ≥ 24px or ≥ 18.66px bold). Only use the verified token pairings listed in this file.`],
      ['1.4.4', 'Resize Text', 'Use rem-based tokens. Layouts must work at 200% zoom without clipping.'],
      ['1.4.10', 'Reflow', 'No two-dimensional scrolling at 320 CSS px width, except data tables and code blocks inside their own `overflow-x: auto` container.'],
      ['1.4.11', 'Non-text Contrast', `Form-control borders use \`--${p}-color-border-strong\` (≥ 3:1). Focus indicators use \`--${p}-color-focus-ring\` (≥ 3:1).`],
      ['1.4.12', 'Text Spacing', 'Never fix the height of text containers; allow line-height 1.5 and letter-spacing 0.12em overrides without clipping.'],
      ['1.4.13', 'Content on Hover or Focus', 'Tooltips/popovers are dismissible with Escape, hoverable, and persist until dismissed.'],
      ['2.1.1', 'Keyboard', 'Every interaction works with the keyboard alone. Custom widgets implement the APG keyboard pattern.'],
      ['2.1.2', 'No Keyboard Trap', 'Focus can always leave a component. Modals contain focus intentionally and release it on close.'],
      ['2.4.3', 'Focus Order', 'DOM order matches visual order. Never use positive `tabindex`.'],
      ['2.4.7', 'Focus Visible', `Never remove outlines without a replacement. Use the shared focus-ring recipe (\`:focus-visible\` + \`--${p}-color-focus-ring\`).`],
      ['2.4.11', 'Focus Not Obscured (Minimum) — new in 2.2', 'Sticky headers/footers must not hide the focused element. Set `scroll-padding-block` to the sticky region height.'],
      ['2.5.3', 'Label in Name', 'The accessible name of a control contains its visible label text.'],
      ['2.5.7', 'Dragging Movements — new in 2.2', 'Every drag-and-drop (Kanban, sliders, reordering) has a single-pointer alternative such as “Move to…” buttons or a menu.'],
      ['2.5.8', 'Target Size (Minimum) — new in 2.2', `Pointer targets are at least 24 × 24 CSS px (\`--${p}-size-target-min\`). Default controls use \`--${p}-size-control-md\`.`],
      ['3.2.6', 'Consistent Help — new in 2.2', 'Help links / contact entry points appear in the same relative place on every page.'],
      ['3.3.1', 'Error Identification', 'Errors are described in text, linked with `aria-describedby`, and the field gets `aria-invalid="true"`.'],
      ['3.3.2', 'Labels or Instructions', 'Required fields and formats are stated in the visible label or hint, not only via placeholder.'],
      ['3.3.7', 'Redundant Entry — new in 2.2', 'Do not ask users to re-enter information already provided in the same process; prefill or offer to reuse it.'],
      ['3.3.8', 'Accessible Authentication (Minimum) — new in 2.2', 'Login allows paste and password managers (`autocomplete="username"` / `"current-password"`), offers show-password, and never relies on a cognitive test.'],
      ['4.1.2', 'Name, Role, Value', 'Custom controls expose role, name and state (`aria-expanded`, `aria-pressed`, `aria-checked`, `aria-selected`).'],
      ['4.1.3', 'Status Messages', 'Non-focus status changes are announced through a live region.']
    ];
  }

  function motionRules(c) {
    const p = c.p;
    return [
      `Transitions use \`var(--${p}-duration-*)\` with \`var(--${p}-ease-*)\`: \`ease-standard\` for state changes, \`ease-enter\` for elements appearing, \`ease-exit\` for elements leaving (pair exit with \`duration-fast\`).`,
      'Animate only `transform` and `opacity` (and `background-color`/`border-color`/`color` for state changes). Never animate layout properties such as width, height, top or margin.',
      `Reduced motion is handled in \`variables.css\`: durations collapse to 0.01ms under \`prefers-reduced-motion: reduce\`. Never hard-code a duration, so that this keeps working. Also skip parallax, auto-playing carousels and large movement when the user prefers reduced motion.`,
      'Anything that moves, blinks or auto-updates for more than 5 seconds needs a pause control (SC 2.2.2).'
    ];
  }

  function recipes(c) {
    const v = c.v;
    const css = `/* Focus ring — shared by every interactive element */
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: var(--${c.p}-focus-ring-width) solid ${v('color-focus-ring')};
  outline-offset: var(--${c.p}-focus-ring-offset);
}

/* Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${v('space-2')};
  min-block-size: ${v('size-control-md')};
  padding-inline: ${v('space-4')};
  border: 1px solid transparent;
  border-radius: ${v('radius-md')};
  font: ${v('font-weight-semibold')} ${v('font-size-sm')}/${v('line-height-sm')} ${v('font-body')};
  transition: background-color ${v('duration-fast')} ${v('ease-standard')},
              box-shadow ${v('duration-fast')} ${v('ease-standard')};
}
.btn--primary { background: ${v('color-primary')}; color: ${v('color-on-primary')}; }
.btn--primary:hover { background: ${v('color-primary-hover')}; }
.btn--primary:active { background: ${v('color-primary-active')}; }
.btn--secondary { background: ${v('color-surface')}; color: ${v('color-text')}; border-color: ${v('color-border-strong')}; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Text field */
.field { display: grid; gap: ${v('space-1')}; }
.field__label { font-size: ${v('font-size-sm')}; line-height: ${v('line-height-sm')}; font-weight: ${v('font-weight-medium')}; color: ${v('color-text')}; }
.field__hint { font-size: ${v('font-size-xs')}; line-height: ${v('line-height-xs')}; color: ${v('color-text-muted')}; }
.field__input {
  min-block-size: ${v('size-control-md')};
  padding-inline: ${v('space-3')};
  border: 1px solid ${v('color-border-strong')};
  border-radius: ${v('radius-md')};
  background: ${v('color-surface')};
  color: ${v('color-text')};
  font: inherit;
}
.field__input[aria-invalid="true"] { border-color: ${v('color-danger')}; }
.field__error { color: ${v('color-danger')}; font-size: ${v('font-size-xs')}; line-height: ${v('line-height-xs')}; }

/* Card */
.card {
  background: ${v('color-surface')};
  border: 1px solid ${v('color-border')};
  border-radius: ${v('radius-lg')};
  box-shadow: ${v('shadow-sm')};
  padding: ${v('space-5')};
}`;
    const html = `<div class="field">
  <label class="field__label" for="email">Work email</label>
  <p class="field__hint" id="email-hint">We'll send the invite here.</p>
  <input class="field__input" id="email" name="email" type="email"
         autocomplete="email" required
         aria-describedby="email-hint email-error" aria-invalid="true">
  <p class="field__error" id="email-error">Enter an email address like name@company.com.</p>
</div>

<button type="button" class="btn btn--primary">Save changes</button>`;
    return { css, html };
  }

  function frameworkNotes(c) {
    const p = c.p;
    switch (c.target) {
      case 'react':
        return [
          'Import `variables.css` exactly once in the app entry (e.g. `src/main.tsx`) before any component styles.',
          'Style components with CSS Modules (`Component.module.css`) that reference `var(--' + p + '-*)` tokens. No inline `style={{ color: … }}` or CSS-in-JS colour literals.',
          'Associate labels with `useId()`; never hard-code duplicate ids.',
          'Event handlers go on `<button>`/`<a>`, not on `<div onClick>`. If a component renders a list, render `<ul>`/`<li>`.',
          'Theme switching sets `document.documentElement.dataset.theme`; components must not branch on theme.'
        ];
      case 'vue':
        return [
          'Import `variables.css` once in `src/main.ts`.',
          'Use `<style scoped>` blocks that reference `var(--' + p + '-*)`. Do not use `v-bind()` in CSS for colours or spacing.',
          'Use native elements in templates; `@click` only on `<button>`/`<a>`.',
          'Generate label ids with `useId()` (Vue 3.5+).'
        ];
      case 'svelte':
        return [
          'Import `variables.css` once in the root `+layout.svelte` (or `main.js`).',
          'Component `<style>` blocks reference `var(--' + p + '-*)` only. No `style:` directives with literal colours.',
          '`on:click`/`onclick` only on `<button>`/`<a>`; Svelte a11y warnings must be fixed, never silenced.'
        ];
      case 'tailwind':
        return [
          'Tokens are mapped into Tailwind through `@theme inline` (snippet below). Use only those utilities: `bg-surface`, `text-text-muted`, `border-border-strong`, `rounded-md`, `shadow-sm`, `text-sm`, `font-heading`, …',
          'The default Tailwind palette is disabled. Classes like `bg-blue-500`, `text-gray-600`, `text-[#333]`, `p-[13px]` or any arbitrary colour/size value are forbidden.',
          `Spacing utilities must resolve to the ${c.tk.state.space.grid}px grid: allowed multipliers are ${c.tk.space.map((s) => s.px / 4).filter((n, i, a) => a.indexOf(n) === i).join(', ')} (× 4px).`,
          'Use `motion-safe:` / `motion-reduce:` variants for any animation utility.'
        ];
      default:
        return [
          'Load `variables.css` first in `<head>` via `<link rel="stylesheet">`, before any other stylesheet.',
          'Plain CSS with low-specificity class selectors (BEM-style `block__element--modifier`); avoid ids and `!important` in styles.',
          'JavaScript is ES modules with `defer`; progressive enhancement: content and forms work before JS runs where possible.',
          'No inline `style` attributes for visual properties; toggle classes or `data-*` attributes instead.'
        ];
    }
  }

  function tailwindTheme(c) {
    const p = c.p;
    const S = c.tk.semantic.light;
    const L = ['@import "tailwindcss";', '@import "./variables.css";', '', '@theme inline {', '  --color-*: initial;'];
    Object.keys(S).forEach((k) => L.push(`  --color-${k}: var(--${p}-color-${k});`));
    L.push(`  --font-heading: var(--${p}-font-heading);`, `  --font-body: var(--${p}-font-body);`, `  --font-mono: var(--${p}-font-mono);`);
    c.tk.typography.sizes.forEach((s) => {
      L.push(`  --text-${s.name}: var(--${p}-font-size-${s.name});`);
      L.push(`  --text-${s.name}--line-height: var(--${p}-line-height-${s.name});`);
    });
    L.push('  --spacing: 0.25rem;');
    c.tk.radius.forEach((r) => { if (r.name !== 'none') L.push(`  --radius-${r.name}: var(--${p}-radius-${r.name});`); });
    ['xs', 'sm', 'md', 'lg', 'xl'].forEach((n) => L.push(`  --shadow-${n}: var(--${p}-shadow-${n});`));
    c.tk.motion.easings.forEach((e) => L.push(`  --ease-${e.name}: var(--${p}-ease-${e.name});`));
    L.push('}');
    return L.join('\n');
  }

  function forbidden(c) {
    const p = c.p;
    return [
      ['`color: #333;` / `background: rgb(…)`', `\`color: var(--${p}-color-text);\``],
      [`\`background: var(--${p}-primary-600);\``, `\`background: var(--${p}-color-primary);\``],
      ['`padding: 13px 18px;`', `\`padding: var(--${p}-space-3) var(--${p}-space-4);\``],
      ['`font-size: 15px;`', `\`font-size: var(--${p}-font-size-sm);\``],
      ['`transition: all .3s ease;`', `\`transition: opacity var(--${p}-duration-base) var(--${p}-ease-standard);\``],
      ['`outline: none;` (with no replacement)', 'The shared `:focus-visible` focus-ring recipe'],
      ['`<div onclick="…">Save</div>`', '`<button type="button">Save</button>`'],
      ['`<input placeholder="Email">` with no label', '`<label for="email">Email</label><input id="email" …>`'],
      ['Status shown only by a coloured dot', 'Colour + text label (e.g. badge “Past due”)'],
      ['Drag-only reordering', 'Drag plus a “Move to…” control (SC 2.5.7)'],
      ['`onpaste="return false"` on password fields', 'Allow paste and password managers (SC 3.3.8)']
    ];
  }

  function checklist(c) {
    const p = c.p;
    return [
      `\`rg -n --glob '!**/variables.css' '#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|oklch\\(' src\` returns no matches.`,
      `\`rg -n --glob '!**/variables.css' 'font-size:\\s*[0-9.]+px' src\` returns no matches.`,
      `\`rg -n 'var\\(--${p}-(primary|neutral|success|warning|danger|info)-[0-9]+\\)' src\` returns no matches (no primitives in components).`,
      'Keyboard-only pass: every control reachable with Tab, operable with Enter/Space/arrow keys, visible focus at all times, no traps.',
      'Automated audit (axe DevTools or Lighthouse accessibility) reports zero violations.',
      'View at 200% zoom and at 320px width: nothing clipped, no horizontal page scroll.',
      'Toggle `data-theme="dark"` on `<html>`: every surface, border and text colour switches; nothing stays light.',
      'Enable “Reduce motion” in the OS: transitions become instant, nothing essential is lost.',
      'Screen reader spot check (VoiceOver / NVDA): headings outline makes sense, controls announce name, role and state.'
    ];
  }

  /* ------------------------------------------------------------ CLAUDE.md */
  function claudeMd(tk, opts = {}) {
    const c = ctx(tk, opts);
    const r = recipes(c);
    const ty = tk.typography;
    const out = [];
    out.push(`# CLAUDE.md — ${c.name} Design System Contract`);
    out.push('');
    out.push(`> Generated by AegisUI on ${c.date}. Stack: ${TARGETS[c.target].label}. Token prefix: \`--${c.p}-\`. Enforcement: ${c.strict ? 'strict' : 'pragmatic'}.`);
    out.push(`> Source of truth: \`styles/variables.css\` (generated — never edit by hand). Machine-readable tokens: \`tokens.json\` (W3C DTCG).`);
    out.push('');
    out.push('## TL;DR — rules you must never break');
    out.push('');
    out.push(`1. Style values come from \`var(--${c.p}-*)\` tokens. No literal colours, font sizes or off-grid spacing.`);
    out.push(`2. Use semantic tokens (\`--${c.p}-color-surface\`), never palette primitives (\`--${c.p}-neutral-100\`).`);
    out.push('3. Write semantic HTML5: real buttons, links, labels, landmarks, headings in order.');
    out.push('4. Meet WCAG 2.2 Level AA. Use only the verified colour pairings below.');
    out.push('5. Every interactive element shows the shared focus ring and is ≥ 24 × 24 px.');
    out.push('6. Missing token? Do not invent one. Use the closest token and add a `TOKEN-REQUEST` comment.');
    out.push('');
    out.push('## 1. Design tokens');
    out.push('');
    coreRules(c).forEach((rule) => out.push(`- ${rule}`));
    out.push('');
    out.push('### Semantic colour roles');
    out.push('');
    out.push(colorTable(c));
    out.push('');
    out.push('### Verified contrast pairings (WCAG 2.2 AA)');
    out.push('');
    out.push('Only combine foreground and background tokens as listed. Ratios were computed from the generated values.');
    out.push('');
    out.push(pairsTable(c));
    out.push('');
    if (c.fullScales) {
      out.push('### Palette primitives (reference only — do not use in components)');
      out.push('');
      out.push(scaleLines(c));
      out.push('');
    }
    out.push('### Typography');
    out.push('');
    out.push(`- Headings: \`var(--${c.p}-font-heading)\` (${ty.families.heading.label}), weight \`var(--${c.p}-font-weight-heading)\` (${ty.weights.heading}).`);
    out.push(`- Body: \`var(--${c.p}-font-body)\` (${ty.families.body.label}), weight \`var(--${c.p}-font-weight-regular)\`.`);
    out.push(`- Code and tabular figures: \`var(--${c.p}-font-mono)\`; numeric columns also use \`font-variant-numeric: tabular-nums\`.`);
    out.push(`- Modular scale: base ${ty.base}px × ${ty.ratio}. Body copy is \`base\`; limit running text to ~65ch.`);
    out.push('');
    out.push(typeTable(c));
    out.push('');
    out.push(`### Spacing (${tk.state.space.grid}px grid)`);
    out.push('');
    out.push(spaceTable(c));
    out.push('');
    out.push(`Control heights: ${tk.controls.map((s) => `\`--${c.p}-size-control-${s.name}\` ${s.px}px`).join(', ')}. Minimum target: \`--${c.p}-size-target-min\` (24px).`);
    out.push('Use `gap` on flex/grid parents for sibling spacing instead of margins on children.');
    out.push('');
    out.push('### Radius, elevation, motion');
    out.push('');
    out.push(`- Radius: ${tk.radius.map((x) => `\`--${c.p}-radius-${x.name}\` (${x.px === 9999 ? 'pill' : x.px + 'px'})`).join(', ')}. Inputs and buttons use \`md\`, cards \`lg\`, modals \`xl\`, avatars and pills \`full\`.`);
    out.push(`- Elevation: \`--${c.p}-shadow-xs\` … \`--${c.p}-shadow-xl\`. Cards \`sm\`, dropdowns \`md\`, popovers \`lg\`, modals \`xl\`. Shadows adapt to dark mode automatically.`);
    out.push(`- Durations: ${tk.motion.durations.map((d) => `\`--${c.p}-duration-${d.name}\` ${d.ms}ms`).join(', ')}.`);
    out.push(`- Easing: ${tk.motion.easings.map((e) => `\`--${c.p}-ease-${e.name}\` \`${T.bez(e.curve)}\``).join(', ')}.`);
    out.push('');
    motionRules(c).forEach((m) => out.push(`- ${m}`));
    out.push('');
    out.push('## 2. Semantic HTML5');
    out.push('');
    HTML_RULES.forEach((h) => out.push(`- ${h}`));
    out.push('');
    out.push('## 3. WCAG 2.2 Level AA');
    out.push('');
    out.push(mdTable(['SC', 'Criterion', 'What it means here'], wcagRules(c).map((w) => [w[0], w[1], w[2]])));
    out.push('');
    out.push(`## 4. Stack conventions — ${TARGETS[c.target].label}`);
    out.push('');
    frameworkNotes(c).forEach((n) => out.push(`- ${n}`));
    out.push('');
    if (c.target === 'tailwind') {
      out.push('```css');
      out.push(tailwindTheme(c));
      out.push('```');
      out.push('');
    }
    out.push('## 5. Component recipes');
    out.push('');
    out.push('Copy these patterns rather than re-deriving them.');
    out.push('');
    out.push('```css');
    out.push(r.css);
    out.push('```');
    out.push('');
    out.push('```html');
    out.push(r.html);
    out.push('```');
    out.push('');
    out.push('## 6. Forbidden → required');
    out.push('');
    out.push(mdTable(['Never write', 'Write instead'], forbidden(c)));
    out.push('');
    out.push('## 7. Before you say you are done');
    out.push('');
    out.push('Run through this list and fix anything that fails. Report which checks you ran.');
    out.push('');
    checklist(c).forEach((x) => out.push(`- [ ] ${x}`));
    out.push('');
    out.push('## 8. When the system does not cover something');
    out.push('');
    out.push(`- Prefer composing existing tokens and recipes over new ones.`);
    out.push(`- If a genuinely new value is needed, use the nearest token, add \`/* TOKEN-REQUEST: <what and why> */\`, and mention it in your summary. A human will add it in AegisUI and re-export \`variables.css\`.`);
    out.push('- Never lower contrast, remove focus styles or drop semantics to match a mockup. Flag the conflict instead.');
    out.push('');
    return out.join('\n');
  }

  /* ------------------------------------------------------------ .cursorrules */
  function cursorRules(tk, opts = {}) {
    const c = ctx(tk, opts);
    const r = recipes(c);
    const out = [];
    out.push(`# ${c.name} Design System — Cursor Rules`);
    out.push(`# Generated by AegisUI ${c.date} · stack: ${TARGETS[c.target].label} · prefix: --${c.p}- · ${c.strict ? 'STRICT' : 'PRAGMATIC'}`);
    out.push('');
    out.push(`You are an expert front-end engineer working in a codebase governed by the ${c.name} design system.`);
    out.push(`All UI you write uses ${TARGETS[c.target].short}, consumes the CSS custom properties defined in styles/variables.css,`);
    out.push('is written in semantic HTML5, and conforms to WCAG 2.2 Level AA. These rules override your defaults and any example code you have seen.');
    out.push('');
    out.push('## Non-negotiable');
    coreRules(c).forEach((rule, i) => out.push(`${i + 1}. ${rule.replace(/`/g, '')}`));
    out.push('');
    out.push('## Token reference (copy names exactly)');
    out.push(compactTokens(c));
    out.push('');
    out.push('## Verified contrast pairings (fg on bg · light / dark)');
    tk.audit.filter((x) => x.mode === 'light').forEach((x) => {
      const d = tk.audit.find((y) => y.mode === 'dark' && y.label === x.label);
      out.push(`- --${c.p}-color-${x.fg} on --${c.p}-color-${x.bg}: ${x.ratio.toFixed(2)} / ${d ? d.ratio.toFixed(2) : '—'} (min ${x.min})`);
    });
    out.push('');
    out.push('## Semantic HTML');
    HTML_RULES.forEach((h) => out.push(`- ${h.replace(/`/g, '')}`));
    out.push('');
    out.push('## WCAG 2.2 AA');
    wcagRules(c).forEach((w) => out.push(`- ${w[0]} ${w[1]}: ${w[2].replace(/`/g, '')}`));
    out.push('');
    out.push('## Motion');
    motionRules(c).forEach((m) => out.push(`- ${m.replace(/`/g, '')}`));
    out.push('');
    out.push(`## Stack: ${TARGETS[c.target].label}`);
    frameworkNotes(c).forEach((n) => out.push(`- ${n.replace(/`/g, '')}`));
    if (c.target === 'tailwind') { out.push(''); out.push(tailwindTheme(c)); }
    out.push('');
    out.push('## Reference recipes');
    out.push(r.css);
    out.push('');
    out.push('## Never → instead');
    forbidden(c).forEach((f) => out.push(`- ${f[0].replace(/`/g, '')}  →  ${f[1].replace(/`/g, '')}`));
    out.push('');
    out.push('## Before finishing any UI change');
    checklist(c).forEach((x) => out.push(`- ${x.replace(/`/g, '')}`));
    out.push('');
    out.push('If a needed token does not exist: use the nearest one, add /* TOKEN-REQUEST: … */, and say so. Never invent --' + c.p + '-* properties.');
    out.push('');
    return out.join('\n');
  }

  /* ------------------------------------------------------------ AGENTS.md */
  function agentsMd(tk, opts = {}) {
    const c = ctx(tk, opts);
    const out = [];
    out.push(`# AGENTS.md`);
    out.push('');
    out.push(`Instructions for AI coding agents (Codex, Jules, Copilot agent, Claude Code, Cursor, Aider, …) working on UI in this repository. Generated by AegisUI on ${c.date} from the **${c.name}** design system.`);
    out.push('');
    out.push('## Project overview');
    out.push('');
    out.push(`- UI stack: ${TARGETS[c.target].label}.`);
    out.push(`- Design tokens: \`styles/variables.css\` (CSS custom properties, prefix \`--${c.p}-\`) and \`tokens.json\` (W3C DTCG 2025.10). Both are generated by AegisUI — never edit them by hand.`);
    out.push('- Accessibility target: WCAG 2.2 Level AA for every screen and component.');
    out.push('');
    out.push('## Setup');
    out.push('');
    out.push(`- Ensure \`variables.css\` is loaded before any other stylesheet${c.target === 'vanilla' ? ' (first `<link>` in `<head>`)' : c.target === 'tailwind' ? ' (imported right after `tailwindcss` in the main CSS entry)' : ' (imported once in the app entry file)'}.`);
    out.push('- Theme: set `data-theme="light"` or `data-theme="dark"` on `<html>`; with no attribute the OS preference is used.');
    out.push('');
    out.push('## Design system rules');
    out.push('');
    coreRules(c).forEach((rule) => out.push(`- ${rule}`));
    out.push('');
    out.push('### Tokens');
    out.push('');
    out.push('```text');
    out.push(compactTokens(c));
    out.push('```');
    out.push('');
    out.push('### Verified colour pairings');
    out.push('');
    out.push(pairsTable(c));
    out.push('');
    out.push('## Code style');
    out.push('');
    frameworkNotes(c).forEach((n) => out.push(`- ${n}`));
    HTML_RULES.slice(0, 6).forEach((h) => out.push(`- ${h}`));
    if (c.target === 'tailwind') {
      out.push('');
      out.push('```css');
      out.push(tailwindTheme(c));
      out.push('```');
    }
    out.push('');
    out.push('## Accessibility (WCAG 2.2 AA)');
    out.push('');
    wcagRules(c).forEach((w) => out.push(`- **${w[0]} ${w[1]}** — ${w[2]}`));
    HTML_RULES.slice(6).forEach((h) => out.push(`- ${h}`));
    out.push('');
    out.push('## Motion');
    out.push('');
    motionRules(c).forEach((m) => out.push(`- ${m}`));
    out.push('');
    out.push('## Testing and verification');
    out.push('');
    out.push('Run these before proposing a change. A UI change is not done until all pass.');
    out.push('');
    checklist(c).forEach((x) => out.push(`- ${x}`));
    out.push('');
    out.push('## Pull request checklist');
    out.push('');
    out.push('- [ ] No literal colours, px font sizes, or off-grid spacing outside `variables.css`.');
    out.push('- [ ] No palette primitives referenced in components.');
    out.push('- [ ] Semantic elements and labels used; heading order valid.');
    out.push('- [ ] Keyboard, focus-visible, 24px targets, reduced motion and dark mode verified.');
    out.push('- [ ] Any `TOKEN-REQUEST` comments listed in the PR description.');
    out.push('');
    return out.join('\n');
  }

  /* ------------------------------------------------------------ System prompt */
  function systemPrompt(tk, opts = {}) {
    const c = ctx(tk, opts);
    const r = recipes(c);
    const out = [];
    out.push(`You are a senior front-end engineer and accessibility specialist building UI for the ${c.name} product. Every piece of UI code you produce must follow the ${c.name} design system exactly, use semantic HTML5, and conform to WCAG 2.2 Level AA. The target stack is ${TARGETS[c.target].short}.`);
    out.push('');
    out.push('The design system is delivered as CSS custom properties in `variables.css`. Treat the token list below as the complete vocabulary of visual values. Using tokens instead of literals is what keeps every screen consistent and lets the team retheme the product, so a hard-coded value is a defect even when it looks identical.');
    out.push('');
    out.push('<design_tokens>');
    out.push(compactTokens(c));
    out.push('</design_tokens>');
    out.push('');
    out.push('<approved_color_pairings>');
    tk.audit.filter((x) => x.mode === 'light').forEach((x) => {
      const d = tk.audit.find((y) => y.mode === 'dark' && y.label === x.label);
      out.push(`--${c.p}-color-${x.fg} on --${c.p}-color-${x.bg}: ${x.ratio.toFixed(2)}:1 light, ${d ? d.ratio.toFixed(2) : '—'}:1 dark (needs ${x.min}:1)`);
    });
    out.push('</approved_color_pairings>');
    out.push('');
    out.push('<token_rules>');
    coreRules(c).forEach((rule) => out.push(`- ${rule}`));
    out.push('</token_rules>');
    out.push('');
    out.push('<semantic_html_rules>');
    HTML_RULES.forEach((h) => out.push(`- ${h}`));
    out.push('</semantic_html_rules>');
    out.push('');
    out.push('<accessibility_rules standard="WCAG 2.2 AA">');
    wcagRules(c).forEach((w) => out.push(`- ${w[0]} ${w[1]}: ${w[2]}`));
    out.push('</accessibility_rules>');
    out.push('');
    out.push('<motion_rules>');
    motionRules(c).forEach((m) => out.push(`- ${m}`));
    out.push('</motion_rules>');
    out.push('');
    out.push(`<stack_conventions stack="${TARGETS[c.target].label}">`);
    frameworkNotes(c).forEach((n) => out.push(`- ${n}`));
    if (c.target === 'tailwind') out.push(tailwindTheme(c));
    out.push('</stack_conventions>');
    out.push('');
    out.push('<reference_patterns>');
    out.push(r.css);
    out.push('');
    out.push(r.html);
    out.push('</reference_patterns>');
    out.push('');
    out.push('<when_tokens_are_missing>');
    out.push(`If the design calls for a value the tokens do not provide, use the closest existing token, add a /* TOKEN-REQUEST: … */ comment, and list it at the end of your answer. Never invent --${c.p}-* properties, never lower contrast, and never remove focus indicators to match a mockup.`);
    out.push('</when_tokens_are_missing>');
    out.push('');
    out.push('<output_requirements>');
    out.push('- Return complete, runnable code, not fragments with "…" placeholders.');
    out.push('- Put styles in classes; reference tokens with var().');
    out.push('- After the code, add a short "Accessibility notes" list naming the WCAG 2.2 criteria the component handles (focus, labels, keyboard, target size, status messages).');
    out.push('- Before answering, silently check your code against every rule above: no literal colours, no px font sizes, no off-grid spacing, no primitives, real buttons and labels, visible focus, 24px targets, drag alternatives, reduced motion. Fix violations before you reply.');
    out.push('</output_requirements>');
    out.push('');
    return out.join('\n');
  }

  const FORMATS = {
    claude: { file: 'CLAUDE.md', label: 'CLAUDE.md', tool: 'Claude Code', build: claudeMd, hint: 'Claude Code reads this from the repo root on every session.' },
    cursor: { file: '.cursorrules', label: '.cursorrules', tool: 'Cursor', build: cursorRules, hint: 'Cursor loads this from the project root as always-on rules.' },
    agents: { file: 'AGENTS.md', label: 'AGENTS.md', tool: 'Codex · Jules · Copilot', build: agentsMd, hint: 'The open AGENTS.md convention read by Codex, Jules, Copilot and others.' },
    system: { file: 'SYSTEM_PROMPT.md', label: 'System Prompt', tool: 'Any LLM API', build: systemPrompt, hint: 'Paste into an API system prompt, a custom GPT, or a Claude Project.' }
  };

  Aegis.compiler = { TARGETS, FORMATS, claudeMd, cursorRules, agentsMd, systemPrompt, tailwindTheme: (tk, o) => tailwindTheme(ctx(tk, o || {})) };
})(window.Aegis = window.Aegis || {});
