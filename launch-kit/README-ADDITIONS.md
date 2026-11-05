# Proposed root README additions

The root `README.md` and shared navigation are owned by another workstream, so this PR does not edit them. Below is suggested text for whoever owns the root README to merge in when convenient.

---

### Suggested row for the module table

| Module | What it is |
| --- | --- |
| [`cli/`](cli/README.md) | **aegis-init**: `node cli/aegis-init.js --preset=fintech --out=./app` writes `variables.css`, `tokens.json`, `CLAUDE.md` and `.cursorrules` from a real preset. Zero dependencies, no network, no overwrites without `--force`. |
| [`launch-kit/`](launch-kit/LAUNCH-GUIDE.md) | Launch material: LinkedIn drafts, an architecture article and a 60-second demo script, with a claims checklist. |

### Suggested quick-start block

```bash
node cli/aegis-init.js --list                         # 12 presets + aliases
node cli/aegis-init.js --preset=gov --out=./my-app    # scaffold tokens + AI rule files
node --test cli/test/*.test.js                        # CLI tests
```

### Suggested `package.json` script (optional; not added in this PR)

```json
"test:cli": "node --test cli/test/*.test.js"
```

and append `&& npm run test:cli` to `"test"` so CI covers the CLI.

### Suggested pipeline diagram line

```
presets/tokens/<id>.json + presets/css/<id>.css ──► cli/aegis-init.js ──► variables.css · tokens.json · CLAUDE.md · .cursorrules
```
