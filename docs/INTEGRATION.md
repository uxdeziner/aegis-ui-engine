# AegisUI integration guide

How a module (an existing one or a Phase 2 module such as `/playground`, `/simulator`, `/cli` or `/launch-kit`) connects to the rest of AegisUI. Everything here is a **stable contract**:

- **Bridge API:** `window.AegisContract` / `require('shared/aegis-contract.js')`, `API_VERSION` **1.0.0**
- **Canonical token format:** `aegis-tokens` **1.x**, specified by [`presets/schema/aegis-tokens.schema.json`](../presets/schema/aegis-tokens.schema.json)
- **Active-token storage key:** `aegis:active-tokens:v1`, record schema `aegis-active-tokens@1`
- **Module navigation markup:** see [Navigation](#navigation)

## Stability and versioning

| Change | Rule |
| --- | --- |
| New optional export, new optional record field, new token group | Minor bump of `API_VERSION` (1.**x**.0). Existing modules keep working. |
| Bug fix with no shape change | Patch bump. |
| Renaming or removing an export, the storage key, a record field, or changing a return shape | **Breaking.** Bump the major version *and* the key suffix (`aegis:active-tokens:v2`). Keep writing v1 for one release so other modules can migrate. |

`tests/contract.test.cjs` pins the exported API surface and the storage constants, so an accidental breaking change fails `npm test`.

Phase 2 modules should **only consume** `shared/aegis-contract.js` and `shared/aegis-nav.css`. Propose changes to them, the root README or the navigation in a separate PR against this contract.

## Loading the bridge

```html
<!-- from a page one folder below the root, e.g. playground/index.html -->
<script src="../shared/aegis-contract.js"></script>
<script>
  const K = window.AegisContract;          // undefined only if the file failed to load
</script>
```

```js
// Node ≥ 18 (e.g. a CLI): CommonJS, no dependencies
const K = require('../shared/aegis-contract.js');
```

Use relative URLs only. The site is served from sub-paths such as `/aegis-ui-engine/`, so a link like `/shared/…` breaks.

## Active tokens (the baseline)

The **Studio** writes the token system the user is working on to `localStorage["aegis:active-tokens:v1"]` after every change. The **Auditor** and **Figma Bridge** read it. Any module on the same origin can read it and is notified when another tab changes it. `localStorage` is per origin, so serve over HTTP (`npm run serve`); `file://` pages aren't reliable.

### Record shape (`aegis-active-tokens@1`)

| Field | Type | Meaning |
| --- | --- | --- |
| `schema` | `"aegis-active-tokens@1"` | Record format identifier |
| `savedAt` | ISO 8601 string | When the record was written |
| `origin` | string | Module that wrote it (`"studio"` today; use your module id if you ever write) |
| `presetId` | string \| null | Preset the system was seeded from, e.g. `"fintech-terminal"` |
| `name` | string | Display name (same as `doc.meta.name`) |
| `prefix` | string \| null | The Studio's CSS prefix (its variables are `--<prefix>-*`) |
| `extraVars` | `{ [cssVar]: value }` | Extra light-mode CSS variables, e.g. the Studio's `--ae-color-bg` |
| `doc` | canonical document | A full `aegis-tokens` document that passes `validateForPlugin` |

### Reading it

```js
const r = K.readBaseline();
switch (r.status) {
  case 'ok':          use(r.record.doc, r.record); break;           // validated record
  case 'empty':       showEmptyState('Open the Studio to create tokens'); break;
  case 'corrupt':     showNotice(r.reason); break;                  // never trust it; it was not validated
  case 'unavailable': showNotice('Browser storage is blocked here'); break;
}
const stop = K.onBaselineChange((next) => { /* same shape as readBaseline() */ });
```

### Rendering with it

```js
const { vars, palette } = K.flatten(r.record.doc, 'light', r.record.extraVars); // or 'dark'
const css = ':root{' + Object.entries(vars).map(([k, v]) => `${k}:${v};`).join('') + '}';
```

`flatten` drops `extraVars` entries whose names or values could escape a declaration (`; { } < >`). Treat everything read from storage as **untrusted input**: build CSS with `flatten`, set text with `textContent`, and never pass stored values to `innerHTML` or `eval`.

### Writing it (optional)

Only the Studio writes today. A module that lets users switch themes may write too:

```js
const res = K.writeBaseline(doc, { origin: 'playground', presetId: 'gov-accessible', prefix: null, extraVars: {} });
if (!res.ok) showNotice(res.reason);   // invalid doc, storage full or blocked
```

`writeBaseline` refuses documents that fail `validateForPlugin`. Write only when a user acts, never on page load, so you don't overwrite the user's Studio work.

## Bridge API reference (`API_VERSION` 1.0.0)

| Export | Signature | Returns |
| --- | --- | --- |
| `API_VERSION` | `string` | `"1.0.0"` |
| `FORMAT`, `VERSION` | `string` | `"aegis-tokens"`, `"1.0.0"` (version written by `fromStudio`) |
| `BASELINE_KEY`, `BASELINE_SCHEMA` | `string` | `"aegis:active-tokens:v1"`, `"aegis-active-tokens@1"` |
| `readBaseline()` | `()` | `{status:'ok', record}` \| `{status:'empty'}` \| `{status:'corrupt', reason}` \| `{status:'unavailable'}`. Never throws. |
| `parseBaseline(raw)` | `(string)` | Same as `readBaseline`, for a raw stored string |
| `writeBaseline(doc, info)` | `(doc, {origin, presetId, prefix, extraVars})` | `{ok:true, record}` \| `{ok:false, reason}` |
| `clearBaseline()` | `()` | `boolean` |
| `onBaselineChange(fn)` | `(fn(readResult))` | Unsubscribe function. Fires for changes made in *other* tabs. |
| `validateForPlugin(doc)` | `(doc)` | `string[]` of errors, at most 20, identical to the Figma plugin's |
| `validateSchema(doc, schema, limit?)` | `(doc, schemaJson, number)` | `string[]` of `"$.path: message"` |
| `flatten(doc, mode?, extraVars?)` | `(doc, 'light'\|'dark', object)` | `{vars, names, palette:[{hex, token}]}` |
| `resolve(doc, value, mode)` / `resolvePath(doc, path, mode)` | | Concrete value after following `{alias}` chains, or `undefined` |
| `fromStudio(tokenModel, opts?)` | Studio `Aegis.tokens.build(state)` result | Canonical document |
| `toStudioState(doc)` | canonical document | Studio settings (approximation; see the root README) |
| `walk`, `getPath`, `isAlias`, `toHex8` | helpers | |

Preset documents are available from `presets/aegis-presets.js` (`AegisPresets.list()`, `.get(id)` (throws on an unknown id), `.toJSON(id)`) and as files in `presets/tokens/<id>.json`. `presets/tokens/index.json` lists them.

### CSS variable names

- Canonical: `--aegis-*`, read from each token's `$extensions.aegis.cssVar` (e.g. `--aegis-bg-canvas`, `--aegis-brand-default`, `--aegis-space-8`, `--aegis-text-body-md`).
- Preset stylesheets (`presets/css/<id>.css`) use the same names under `[data-aegis-theme][data-aegis-mode]`.
- Studio's own names are `--<prefix>-*` (default `--ae-`). They appear in `record.extraVars` and in the Studio's `variables.css` export.

### Node / CLI example

```js
const fs = require('fs');
const K = require('./shared/aegis-contract.js');
const schema = require('./presets/schema/aegis-tokens.schema.json');
const doc = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const errors = K.validateForPlugin(doc).concat(K.validateSchema(doc, schema));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const { vars } = K.flatten(doc, 'light');
process.stdout.write(':root {\n' + Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n') + '\n}\n');
```

## Navigation

Every page has this bar right after its skip link. Paths are relative to the page, and the current module gets `aria-current="page"`:

```html
<link rel="stylesheet" href="../shared/aegis-nav.css">
…
<nav class="aegis-nav" aria-label="AegisUI modules">
  <span class="aegis-nav__brand"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2 3.5 5.2v6.3c0 5.3 3.6 9.3 8.5 10.5 4.9-1.2 8.5-5.2 8.5-10.5V5.2z"/></svg><span>AegisUI</span></span>
  <ul class="aegis-nav__list">
    <li><a href="../index.html">Studio</a></li>
    <li><a href="../auditor/auditor.html">Auditor</a></li>
    <li><a href="../presets/index.html">Preset Vault</a></li>
    <li><a href="../figma-plugin/index.html">Figma Bridge</a></li>
    <li><a href="../showcase/showcase.html">Showcase</a></li>
    <!-- aegis-nav:future-modules — … -->
  </ul>
</nav>
```

**Hook for Phase 2 modules.** Links are added only when the target page exists on the same branch; the browser tests fail on any broken nav link. Each page has an `<!-- aegis-nav:future-modules … -->` comment at the insertion point. The planned order and paths, to be confirmed when those modules merge:

| Order | Label | Expected page |
| --- | --- | --- |
| 6 | Playground | `playground/index.html` |
| 7 | Simulator | `simulator/index.html` |
| 8 | CLI | `cli/index.html` (docs page; the CLI itself is Node) |
| 9 | Launch Kit | `launch-kit/index.html` |

To add a module once its page has merged:
1. Add its `<li>` at the hook in **every** page, including the new module's own page with `aria-current="page"` on its own link.
2. Add the page to `PAGES` and its label to the expected list in `tests/e2e.cjs`.
3. Run `npm test` and `npm run test:e2e`.

The bar stays usable at 390px (it wraps) and keeps 24px targets. Check that it still does with nine links.

## Accessibility claims

Modules that test accessibility (Simulator, Auditor) must describe their results as automated or simulated review aids. They must **not** claim WCAG certification or conformance: that needs manual testing with assistive technology and real content.
