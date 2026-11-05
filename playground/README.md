# AegisUI Playground: Prompt-to-Component Sandbox

`/playground` is a zero-dependency sandbox (vanilla HTML, CSS and ES2017+) with **39 copy-ready enterprise components**. All of them are styled only with AegisUI design tokens. Each one has:

- a **live preview** that re-skins instantly with any of the 12 presets, in light, dark or auto mode, at desktop, tablet or mobile width
- **Copy HTML / Copy CSS / Copy JS** actions. The JS is a self-invoking, dependency-free snippet bound to the component root.
- **Generate AI prompt**: a Markdown prompt that includes your requirements, the active preset, every `--aegis-*` token the component uses with its resolved value, the hard token rules, the accessibility contract, the behavior spec and the reference implementation
- a **token check**: every token resolves in the active preset, and there are no raw colors

The **Prompt to component** box matches a plain-language description to the closest template and opens the AI prompt with your request added. Examples: "editable table of invoices with inline status changes", "kanban board for support tickets".

**Open it:** `playground/playground.html`. It works from `file://`, from any static server, and from GitHub Pages at `/aegis-ui-engine/playground/playground.html`. Every path is relative. There is no build step.

## Template catalog

| Category | Templates |
| --- | --- |
| Data | Editable data grid (inline edit, keyboard grid, sort, filter, select, add/delete, totals) · Table pagination · Team members & roles · Activity timeline / audit log · Faceted filter bar · Operations metrics with meters |
| Workflow | Kanban board (native HTML5 drag & drop, plus a keyboard alternative and WIP limits) · Multi-step wizard · Shipment status tracker · Approval request card |
| Navigation | Command palette (⌘K / Ctrl+K, fuzzy search, listbox) · Accessible tabs · App shell with collapsible sidebar · Page header with breadcrumb & menu button · Tree view |
| Forms | Sign-in with SSO · Settings with unsaved-changes bar · Multi-select tag combobox · Date range picker · File upload dropzone · Plan selector |
| Feedback / Layout | Notification center · Toasts · Destructive confirm dialog · Accordion · Tooltip & popover · Inline alerts · Empty state · Skeleton loader |
| Accessibility | Accessibility preferences drawer (text size, line spacing, contrast, reduced motion, link underlines, focus highlight, dyslexia spacing; persisted) |
| Finance | KPI cards with SVG sparklines · Revenue vs target chart (SVG, focusable bars, data table) · Allocation donut (SVG) · Invoice / order summary · Transaction ledger |
| Developer | Split code editor with live preview & resizable splitter · AI assistant chat (streaming) · API key manager · Live log viewer |

## Files

```
playground/
  playground.html        app shell (loads ../presets/* via relative paths)
  playground.css         app chrome, token-only
  playground.js          preset bridge, library, preview, matcher, copy, prompt builder
  fallback-tokens.css    generated: Enterprise SaaS tokens scoped to :root:not([data-aegis-theme])
  templates/_core.js     registry: AegisPlaygroundTemplates.register/all/get, icon()
  templates/*.js         one module per category (data, workflow, navigation, forms, feedback, finance, developer)
  tools/build-fallback.mjs   regenerates fallback-tokens.css: node playground/tools/build-fallback.mjs [presetId]
  tests/run.cjs          Playwright browser tests (dev-only)
```

## How tokens and presets are used

- **Registry:** `../presets/aegis-presets.js` (`window.AegisPresets`) supplies the preset list, metadata (density, WCAG target, fonts) and `loadFonts()`. Styles come from `../presets/aegis-presets.css` and the `.ae-*` recipes in `../presets/aegis-components.css`. Nothing in `/presets` is modified.
- **Schema:** templates use only the semantic layer defined in `presets/schema/aegis-tokens.schema.json` (`--aegis-bg-*`, `--aegis-fg-*`, `--aegis-border-*`, `--aegis-brand-*`, status roles, `--aegis-data-1…4`, text styles, spacing, radius, shadow and motion). Primitive ramps are never used. Charts use at most four categorical colors, because `gov-accessible` defines only `--aegis-data-1…4`.
- **Theming:** the page and the preview iframe both get `data-aegis-theme` / `data-aegis-mode`. Switching presets only updates attributes, so the preview is never reloaded.

### Choosing the active preset

The first valid source wins. Each candidate is checked against `AegisPresets.ids`.

1. URL query: `?preset=<id>&mode=light|dark|auto` (`theme` is accepted as an alias of `preset`)
2. Shared key `localStorage["aegisui:active-preset"]`: either a bare id (`"legal-slate"`) or JSON `{ "id": "legal-slate", "mode": "dark" }`. `preset` / `theme` are accepted for `id`.
3. The playground's own key `localStorage["aegisui:playground:v1"]` (last preset, mode, template and viewport)
4. Default: `enterprise-saas` in its default mode

If an id is unknown, the playground uses the default and shows a note under the preset picker.
If the registry script fails to load, the playground keeps working on **`fallback-tokens.css`**: the picker is disabled and light/dark still work. The fallback is a re-scoped copy of the Enterprise SaaS preset that applies only while no `data-aegis-theme` is set. All storage access is wrapped in `try/catch`.

## Integration hooks (for the shared navigation and canonical token bridge)

The playground **never writes** the shared key and edits no shared or root files. To integrate it:

| Hook | Direction | Contract |
| --- | --- | --- |
| `localStorage["aegisui:active-preset"]` | bridge → playground | Read at startup. Changes made in other tabs are applied live through the `storage` event. Value: `"<id>"` or `{"id","mode"}`. |
| `window.dispatchEvent(new CustomEvent('aegis:preset-change', { detail: { id, mode } }))` | host → playground | Applies the preset (and the mode if given) immediately. Use this when the playground is embedded in, or shares a window with, the canonical bridge. |
| `window` event `aegis:playground-change` | playground → host | Fired on preset, mode and template changes: `{ detail: { preset, mode, template } }`. The bridge can listen for it and persist the shared key if that's the desired behavior. |
| `window.AegisPlayground` | API | `templates()`, `select(id)`, `setPreset(id, mode)`, `getState()`, `match(text)`, `buildPrompt(id, request)`, `tokensOf(id)`, `source(id)` → `{ html, css, js }`, `version` |
| `#<template-id>` | URL | Deep-links to a template (for example `playground.html#kanban`). It combines with `?preset=`. |

**Suggested nav entry** for whoever owns shared navigation (relative to the repo root): `playground/playground.html`, label "Playground". The page links back to `../index.html` from its brand mark and adds no other shared chrome.

## Adding a template

Add an entry to the matching `templates/<category>.js`. It is picked up automatically.

```js
AegisPlaygroundTemplates.register({
  id: 'my-widget', name: 'My widget', category: 'Data',
  tags: ['keywords', 'the matcher uses'], description: 'One sentence.',
  a11y: ['Requirements written into the AI prompt'], behavior: ['Interaction rules'],
  html: '<section class="mw">…</section>',            // root element's first class = component prefix
  css: '.mw { padding: var(--aegis-space-16); }',      // tokens only, no raw colors
  js: function (root) { /* self-contained: no outer references (it is serialized with toString) */ }
});
```

The registry adds `.<root> [hidden] { display: none !important; }` to every template's CSS, so components that set `display` can still be toggled with the `hidden` attribute.

## Tests

```bash
node playground/tests/run.cjs    # needs Playwright + Chromium; set NODE_PATH=$(npm root -g) if it is installed globally
```

The runner serves the repo under `/aegis-ui-engine/`, the same path GitHub Pages uses, and runs:

- **smoke**: all 39 templates render with no errors, every token resolves and there are no raw colors
- **interact** and **interact2**: 87 interaction checks. Coverage includes grid editing and keyboard, Kanban drag/drop and keyboard moves, palette, wizard, notifications, editor and splitter, a11y drawer, copy actions and a standalone run of the copied snippet, prompt content, the matcher, and presets.
- **presets**: inheritance order, invalid ids, the URL override, cross-tab sync, never writing the shared key, fallback with the registry missing (and with the registry and preset CSS missing), and a sweep of 39 templates × 4 preset/mode combinations
