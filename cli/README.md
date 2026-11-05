# aegis-init — AegisUI preset CLI

Scaffolds one of the 12 AegisUI presets into a project, giving both your code and your AI coding assistant the same design tokens.

```bash
node cli/aegis-init.js --preset=fintech --out=./apps/trading
```

```
Wrote AegisUI preset Fintech Terminal (fintech-terminal) to apps/trading/
  tokens.json     101405 bytes
  variables.css    27747 bytes
  CLAUDE.md        13095 bytes
  .cursorrules      2260 bytes
```

It needs Node ≥ 18 and has zero dependencies and no build step. It makes **no network calls**: it only reads files from this repository's `presets/` directory and writes into `--out`.

## What it writes

| File | Source | Contents |
| --- | --- | --- |
| `tokens.json` | `presets/tokens/<id>.json` (byte-identical copy) | The AegisUI token document: primitives, semantic colors with `light`/`dark` modes, dimensions, typography, shadows, motion, component recipes and the build's contrast report. The AegisUI Figma plugin can import it as-is. |
| `variables.css` | `presets/css/<id>.css` plus a one-line banner | Every token as a `--aegis-*` custom property, scoped to `[data-aegis-theme="<id>"]`, with `[data-aegis-mode="dark"]` and `auto` (`prefers-color-scheme`) blocks. |
| `CLAUDE.md` | Generated from `tokens.json` | Rules for Claude Code: setup, "never hardcode" rules, the semantic color table (light/dark hex values), text styles, spacing/radius/motion scales, the component recipe variables, and an accessibility note. |
| `.cursorrules` | Generated from `tokens.json` | The same rules in condensed form for Cursor, plus the key semantic colors. |

Then in your app:

```html
<html data-aegis-theme="fintech-terminal" data-aegis-mode="dark">
  <head><link rel="stylesheet" href="variables.css"></head>
```

For the `.ae-*` component classes, also copy `presets/aegis-components.css`. The CLI writes only token files.

## Options

| Option | Meaning |
| --- | --- |
| `--preset=<id\|alias>` | **Required.** One of the ids or aliases below. You can also write it as `--preset fintech`. |
| `--out=<dir>` | **Required.** Output directory. It must be inside the current working directory (see *Safety*). It is created if missing. |
| `--mode=light\|dark\|auto` | Mode used in the generated `CLAUDE.md` / `.cursorrules` snippets. Defaults to the preset's own default. `variables.css` always contains every mode. |
| `--force`, `-f` | Replace existing output files. |
| `--dry-run` | Validate everything and print what would be written. Writes nothing. |
| `--no-fonts` | Remove the Google Fonts `@import` from `variables.css`, for self-hosted fonts or strict CSPs. |
| `--json` | Machine-readable output for `--list` or a generation result. |
| `--list`, `-l` | List presets with their aliases. |
| `--help`, `-h` / `--version`, `-v` | Show help or the version. |

Exit codes: `0` success · `1` usage error (unknown option or preset, bad path) · `2` output files already exist (re-run with `--force`) · `3` preset data invalid/out of sync, or an IO error.

## Presets and aliases

| id | Aliases | Default mode | Contrast target |
| --- | --- | --- | --- |
| `enterprise-saas` | `saas`, `enterprise` | light | AA |
| `fintech-terminal` | `fintech`, `finance`, `terminal` | dark | AA |
| `healthcare-clean` | `healthcare`, `health` | light | AA |
| `ai-studio-dark` | `ai`, `ai-studio` | dark | AA |
| `swiss-editorial` | `swiss`, `editorial` | light | AA |
| `gov-accessible` | `gov`, `government`, `a11y`, `high-contrast` | light | AAA |
| `retail-commerce` | `retail`, `commerce`, `ecommerce` | light | AA |
| `legal-slate` | `legal`, `compliance` | light | AA |
| `developer-console` | `dev`, `developer`, `console` | dark | AA |
| `logistics-ops` | `logistics`, `ops` | light | AA |
| `creative-agency` | `creative`, `agency` | light | AA |
| `wellness-hr` | `wellness`, `hr`, `people` | light | AA |

The preset list is read from `presets/tokens/index.json` at runtime. A typo gets a suggestion: `--preset=fintek` → *Did you mean: fintech?*

## Safety

- **No overwrites by default.** The CLI checks all four target files before writing. If any of them exists, it writes **nothing** and exits with code `2`. `--force` replaces them.
- **Atomic writes.** Each file goes to a temp file in the same directory and is then renamed into place. Afterwards, `tokens.json` and `variables.css` are read back and validated again.
- **Path traversal protection.** `--out` is rejected if:
  - it contains `..` segments or a NUL byte
  - it resolves outside the current working directory, absolute paths included
  - any existing directory along the path is a symlink
  - it points at a file
  
  An existing output file that is a symlink is refused, **even with `--force`**. To write somewhere else, `cd` there first.
- **Validation before writing.** The preset's JSON is checked against the rules in `presets/schema/aegis-tokens.schema.json`:
  - required keys, and the format and version
  - known `$type`s, and exactly one of `$value` or `$modes`
  - a value for every mode
  - `cssVar` naming and uniqueness
  - every alias resolves
  
  The CLI also confirms that every token's `cssVar` is declared in the preset CSS. If the build output is stale, it tells you to run `npm run build`.

## What the accessibility note means

The generated `CLAUDE.md` reports the preset's build-time contrast checks. That is about 39 foreground/background token pairs per mode against WCAG AA, or AAA for `gov-accessible`. These are **automated contrast checks on token pairs, not an accessibility audit or certification.** They say nothing about:

- keyboard support or focus order
- semantics or screen-reader behaviour
- motion or content
- colors you add yourself

## Tests

```bash
node --test cli/test/*.test.js
```

The suite covers:

- **Generation:** every preset produces all four files. `tokens.json` is byte-identical to the build output and passes validation, and `variables.css` declares every token's variable. Every `--aegis-*` variable mentioned in `CLAUDE.md` or `.cursorrules` exists.
- **Options:** aliases, `--mode`, `--no-fonts`, `--dry-run`, and `--list`/`--json`/`--help`/`--version`.
- **Errors:** unknown or malformed options and unknown presets.
- **Overwrites:** the no-overwrite rule, including no partial output, and `--force` behaviour.
- **Path safety:** traversal, absolute paths, symlinked directories and symlinked files.
- **Validator:** it rejects corrupted documents.
- **Network:** a static check that the CLI only requires `node:fs` and `node:path`.
