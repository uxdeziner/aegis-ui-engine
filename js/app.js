/* AegisUI — Studio controller
 * Owns state, binds the instrument panel, pushes tokens into the live preview,
 * and keeps the compiler and exporter outputs in sync.
 */
(function (Aegis) {
  'use strict';
  const { color: C, tokens: T, compiler: CC, zip: Z, preview: P } = Aegis;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const STORE_KEY = 'aegisui:v1';
  const PREFS_KEY = 'aegisui:prefs:v1';

  /* ───────────── Persistence (best effort) ───────────── */
  const store = {
    get(key) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ } }
  };

  let state = T.sanitizeState(store.get(STORE_KEY) || T.DEFAULT_STATE);
  const prefs = Object.assign({ tab: 'preview', fmt: 'claude', target: 'vanilla', mode: 'strict', scales: false, legacy: false, exp: 'css', panelW: 380, previewMode: 'light', vp: 'desktop' }, store.get(PREFS_KEY) || {});
  let tk = null;
  let presetKey = store.get(STORE_KEY) ? 'custom' : 'aegis';

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const saveState = debounce(() => store.set(STORE_KEY, state), 250);
  const savePrefs = debounce(() => store.set(PREFS_KEY, prefs), 250);

  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const setPath = (obj, path, val) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], obj)[last] = val; };
  const escHTML = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const slug = (s) => (s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'design');
  const bytes = (s) => { const n = new Blob([s]).size; return n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`; };

  /* ───────────── Toasts ───────────── */
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ───────────── Clipboard & downloads ───────────── */
  async function copyText(text, label, fallbackEl) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${label}`);
    } catch (e) {
      if (fallbackEl) {
        const range = document.createRange();
        range.selectNodeContents(fallbackEl);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        toast(ok ? `Copied ${label}` : 'Text selected. Press Ctrl+C or ⌘C to copy.');
      } else {
        toast('Clipboard is blocked here. Select the text and copy it manually.');
      }
    }
  }
  function download(name, content, type = 'text/plain;charset=utf-8') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast(`Downloading ${name}`);
  }

  /* ───────────── Select population ───────────── */
  function fillSelect(el, items, value) {
    el.innerHTML = items.map(([v, l]) => `<option value="${escHTML(v)}">${escHTML(l)}</option>`).join('');
    if (value != null) el.value = String(value);
  }
  function populate() {
    const fonts = Object.entries(T.FONT_STACKS).map(([k, f]) => [k, f.label]);
    fillSelect($('#t-heading'), fonts);
    fillSelect($('#t-body'), fonts);
    fillSelect($('#t-mono'), fonts);
    fillSelect($('#t-ratio'), T.RATIOS.map((r) => [r.value, r.label]));
    fillSelect($('#m-easing'), Object.entries(T.EASINGS).map(([k, e]) => [k, e.label]));
    fillSelect($('#cc-target'), Object.entries(CC.TARGETS).map(([k, t]) => [k, t.label]), prefs.target);
    $('#cc-mode').value = prefs.mode;
    $('#cc-scales').checked = !!prefs.scales;
    $('#dtcg-legacy').checked = !!prefs.legacy;
    renderPresetSelect();
  }
  function renderPresetSelect() {
    const items = Object.entries(T.PRESETS).map(([k, p]) => [k, p.label]);
    if (presetKey === 'custom') items.push(['custom', 'Custom (edited)']);
    fillSelect($('#ds-preset'), items, presetKey);
  }

  /* ───────────── Write state → controls ───────────── */
  function syncControls() {
    $$('[data-bind]').forEach((el) => {
      const v = getPath(state, el.dataset.bind);
      if (el.type === 'radio') el.checked = String(v) === el.value;
      else el.value = String(v);
      if (el.type === 'range') paintRange(el);
    });
    $$('[data-hex-for]').forEach((el) => { el.value = $('#' + el.dataset.hexFor).value; el.removeAttribute('aria-invalid'); });
    const prefix = $('#ds-prefix'); prefix.value = state.prefix; prefix.removeAttribute('aria-invalid');
    const curve = currentCurve();
    curve.forEach((n, i) => { $('#bz-' + i).value = (+n).toFixed(2); });
    renderPresetSelect();
  }
  function paintRange(el) {
    const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--fill', pct + '%');
    const out = $(`output[for="${el.id}"]`);
    if (out) out.textContent = el.value + (el.dataset.unit || '');
  }
  const currentCurve = () => (state.motion.easing !== 'custom' && T.EASINGS[state.motion.easing].curve ? T.EASINGS[state.motion.easing].curve : state.motion.curve);

  function markCustom() {
    if (presetKey !== 'custom') { presetKey = 'custom'; renderPresetSelect(); }
  }

  /* ───────────── Bind controls ───────────── */
  function bindControls() {
    $$('[data-bind]').forEach((el) => {
      const evt = el.type === 'radio' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        if (el.type === 'radio' && !el.checked) return;
        const numeric = el.type === 'range' || el.dataset.type === 'number';
        let v = numeric ? parseFloat(el.value) : el.value;
        if (el.dataset.bind === 'name') v = el.value.trim() || 'Untitled';
        setPath(state, el.dataset.bind, v);
        if (el.type === 'range') paintRange(el);
        if (el.type === 'color') { const hex = $(`[data-hex-for="${el.id}"]`); if (hex) { hex.value = el.value; hex.removeAttribute('aria-invalid'); } }
        if (el.dataset.bind === 'motion.easing' && T.EASINGS[v].curve) {
          state.motion.curve = T.EASINGS[v].curve.slice();
          state.motion.curve.forEach((n, i) => { $('#bz-' + i).value = n.toFixed(2); });
          playMotion();
        }
        if (el.dataset.bind !== 'name') markCustom();
        update();
      });
    });

    $$('[data-hex-for]').forEach((el) => {
      el.addEventListener('input', () => {
        const raw = el.value.trim();
        const v = raw.startsWith('#') ? raw : '#' + raw;
        if (/^#[0-9a-f]{6}$/i.test(v)) {
          el.removeAttribute('aria-invalid');
          const picker = $('#' + el.dataset.hexFor);
          picker.value = v.toLowerCase();
          setPath(state, picker.dataset.bind, v.toLowerCase());
          markCustom(); update();
        } else {
          el.setAttribute('aria-invalid', 'true');
        }
      });
      el.addEventListener('blur', () => { el.value = $('#' + el.dataset.hexFor).value; el.removeAttribute('aria-invalid'); });
    });

    const prefix = $('#ds-prefix');
    prefix.addEventListener('input', () => {
      const v = prefix.value.trim().toLowerCase();
      if (/^[a-z][a-z0-9-]{0,11}$/.test(v)) { prefix.removeAttribute('aria-invalid'); state.prefix = v; markCustom(); update(); }
      else prefix.setAttribute('aria-invalid', 'true');
    });
    prefix.addEventListener('blur', () => { prefix.value = state.prefix; prefix.removeAttribute('aria-invalid'); });

    for (let i = 0; i < 4; i++) {
      $('#bz-' + i).addEventListener('input', () => {
        const vals = [0, 1, 2, 3].map((j) => parseFloat($('#bz-' + j).value));
        if (vals.some((n) => !Number.isFinite(n))) return;
        state.motion.curve = vals.map((n, j) => (j % 2 === 0 ? C.clamp(n, 0, 1) : C.clamp(n, -1, 2)));
        state.motion.easing = 'custom';
        $('#m-easing').value = 'custom';
        markCustom(); update(); playMotionSoon();
      });
    }

    $('#ds-preset').addEventListener('change', (e) => {
      const key = e.target.value;
      if (!T.PRESETS[key]) return;
      state = T.sanitizeState(T.clone(T.PRESETS[key].state));
      presetKey = key;
      syncControls(); update(); playMotion();
      toast(`Loaded preset: ${T.PRESETS[key].label}`);
    });

    $('#btn-reset').addEventListener('click', () => {
      state = T.sanitizeState(T.clone(T.DEFAULT_STATE));
      presetKey = 'aegis';
      syncControls(); update();
      toast('Reset to Aegis Default');
    });

    $('#import-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          state = T.sanitizeState(data.state || data);
          presetKey = 'custom';
          syncControls(); update();
          toast(`Imported ${file.name}`);
        } catch (err) {
          toast('That file is not a valid aegis.config.json.');
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    $('#btn-play').addEventListener('click', () => playMotion(true));
  }

  /* ───────────── Live tokens → preview ───────────── */
  function applyLive() {
    const css = T.toCSS(tk, { prefix: 'ae', root: '.ae-preview', dark: '.ae-preview[data-mode="dark"]', media: false, header: false });
    $('#ae-live-tokens').textContent = css;
  }

  /* ───────────── Instrument read-outs ───────────── */
  function swatchText(hex) { return C.contrast(hex, '#ffffff') >= C.contrast(hex, '#111111') ? '#ffffff' : '#111111'; }
  function renderRamp(el, family, interactive) {
    const scale = tk.scales[family];
    el.innerHTML = C.STOPS.map((st) => {
      const hex = scale[st];
      if (!interactive) return `<li><span style="background:${hex}" title="${family}-${st} ${hex}"></span></li>`;
      const anchor = family === 'primary' && tk.anchor === st;
      return `<li><button type="button" style="background:${hex};color:${swatchText(hex)}" data-copy="var(--${state.prefix}-${family}-${st})" ${anchor ? 'data-anchor' : ''}
        aria-label="${family} ${st}, ${hex}${anchor ? ', your input color' : ''}. Copy token." title="${hex}${anchor ? ' · input anchor' : ''}"><span>${st}</span></button></li>`;
    }).join('');
  }

  function renderInstruments() {
    renderRamp($('#ramp-primary'), 'primary', true);
    renderRamp($('#ramp-neutral'), 'neutral', true);
    $('#ramp-status').innerHTML = ['success', 'warning', 'danger', 'info'].map((k) => `<ol class="ramp ramp--mini" aria-label="${k} scale" id="ramp-${k}"></ol>`).join('');
    ['success', 'warning', 'danger', 'info'].forEach((k) => renderRamp($('#ramp-' + k), k, false));
    $('#primary-meta').textContent = `${tk.anchor ? 'anchor ' + tk.anchor + ' · ' : ''}${C.oklchString(state.color.primary)}`;
    $('#color-notes').textContent = tk.notes.join(' ');

    const ty = tk.typography;
    $('#meta-type').textContent = `${ty.base}px × ${ty.ratio}`;
    const headStack = T.fontStack(ty.families.heading.stack), bodyStack = T.fontStack(ty.families.body.stack);
    $('#type-specimen').innerHTML = ty.sizes.slice().reverse().map((s) => {
      const isHead = s.step >= 2;
      const px = Math.min(s.px, 44);
      return `<li><span class="k">${s.name}</span><span class="k">${s.px}px</span><span class="s" style="font-family:${escHTML(isHead ? headStack : bodyStack)};font-size:${px}px;line-height:${s.lineHeight};font-weight:${isHead ? ty.weights.heading : 400};letter-spacing:${s.tracking}em">${isHead ? 'Quarterly revenue' : 'Invoices settle in 2 days'}</span></li>`;
    }).join('');

    $('#meta-space').textContent = `${state.space.grid}px grid`;
    $('#space-specimen').innerHTML = tk.space.filter((s) => s.px > 0).map((s) =>
      `<li><span>space-${s.name}</span><span class="bar" style="width:${s.px}px"></span><span>${s.px}px</span></li>`).join('');

    $('#meta-radius').textContent = `md ${state.radius.base}px`;
    $('#radius-specimen').innerHTML = tk.radius.map((r) =>
      `<li><span class="tile" style="border-radius:${r.px === 9999 ? '50%' : r.px + 'px'}"></span><span>${r.name}</span></li>`).join('');

    $('#meta-shadow').textContent = `${state.shadow.depth} / 5`;
    $('#shadow-specimen').innerHTML = tk.shadows.light.map((s) =>
      `<li><span class="tile" style="box-shadow:${T.shadowCss(s)}"></span><span>${s.name}</span></li>`).join('');

    const curve = currentCurve();
    $('#meta-motion').textContent = `${state.motion.duration}ms`;
    const [x1, y1, x2, y2] = curve;
    const P1 = [x1 * 100, (1 - y1) * 100], P2 = [x2 * 100, (1 - y2) * 100];
    $('#curve-path').setAttribute('d', `M0,100 C${P1[0]},${P1[1]} ${P2[0]},${P2[1]} 100,0`);
    $('#curve-h1').setAttribute('x2', P1[0]); $('#curve-h1').setAttribute('y2', P1[1]);
    $('#curve-h2').setAttribute('x2', P2[0]); $('#curve-h2').setAttribute('y2', P2[1]);
    $('#curve-k1').setAttribute('cx', P1[0]); $('#curve-k1').setAttribute('cy', P1[1]);
    $('#curve-k2').setAttribute('cx', P2[0]); $('#curve-k2').setAttribute('cy', P2[1]);
    $('#curve-label').textContent = `Easing curve ${T.bez(curve)}`;
    const d = tk.motion.durations;
    $('#motion-hint').textContent = `fast ${d[1].ms}ms · base ${d[2].ms}ms · slow ${d[3].ms}ms · slower ${d[4].ms}ms. Enter and exit curves are derived from this curve.`;

    // Audit table
    const lightRows = tk.audit.filter((r) => r.mode === 'light');
    const pass = tk.audit.filter((r) => r.pass).length;
    $('#meta-audit').textContent = `${pass}/${tk.audit.length} pass`;
    const cell = (r) => r ? `<td class="${r.pass ? 'pass' : 'fail'}"><span class="chip" style="background:${r.bgHex};box-shadow:inset 0 0 0 3px ${r.bgHex}, inset 0 0 0 5px ${r.fgHex}"></span>${r.ratio.toFixed(2)} <span aria-hidden="true">${r.pass ? '✓' : '✗'}</span><span class="sr-only">${r.pass ? 'pass' : 'fail'}</span></td>` : '<td>—</td>';
    $('#audit tbody').innerHTML = lightRows.map((r) => {
      const dark = tk.audit.find((x) => x.mode === 'dark' && x.label === r.label);
      return `<tr><th scope="row">${escHTML(r.label)}</th><td>${r.min}</td>${cell(r)}${cell(dark)}</tr>`;
    }).join('');
  }

  /* ───────────── Motion demo ───────────── */
  let ballForward = false;
  function playMotion(manual) {
    const ball = $('#motion-ball');
    if (!ball || !ball.animate) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce && !manual) return;
    const track = ball.parentElement;
    const dist = Math.max(0, track.clientWidth - ball.offsetWidth - 8);
    ballForward = !ballForward;
    const from = ballForward ? 0 : dist, to = ballForward ? dist : 0;
    ball.getAnimations().forEach((a) => a.cancel());
    ball.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], {
      duration: Math.max(state.motion.duration * 1.5, 120), easing: T.bez(currentCurve()), fill: 'forwards'
    });
  }
  const playMotionSoon = debounce(() => playMotion(), 300);

  /* ───────────── Compiler ───────────── */
  function compilerOpts() { return { target: prefs.target, strict: prefs.mode === 'strict', fullScales: prefs.scales }; }

  function highlight(text, kind) {
    let h = escHTML(text);
    if (kind === 'css') {
      h = h.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="c">$1</span>')
        .replace(/^(\s*)(--[\w-]+)(?=:)/gm, '$1<span class="k">$2</span>');
    } else if (kind === 'json') {
      h = h.replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="k">$1</span>$2')
        .replace(/(:\s*)("(?:[^"\\]|\\.)*")/g, '$1<span class="s">$2</span>');
    } else {
      h = h.replace(/^(#{1,6} .*|&lt;\/?[a-z_]+(?: [^&]*)?&gt;)$/gm, '<span class="h">$1</span>')
        .replace(/^(&gt; .*)$/gm, '<span class="c">$1</span>');
    }
    return h;
  }
  function setCode(pre, text, kind) {
    pre.firstElementChild.innerHTML = highlight(text, kind);
  }

  let compiled = {};
  function renderCompilerTabs() {
    const wrap = $('#fmt-tabs');
    wrap.innerHTML = Object.entries(CC.FORMATS).map(([k, f]) =>
      `<button type="button" role="tab" class="fmt-tab" id="fmt-tab-${k}" data-fmt="${k}" aria-controls="fmt-panel" aria-selected="${k === prefs.fmt}" tabindex="${k === prefs.fmt ? 0 : -1}">
        <span class="fmt-tab__name">${escHTML(f.label)}</span><span class="fmt-tab__sub">${escHTML(f.tool)}</span></button>`).join('');
    const tabs = $$('.fmt-tab', wrap);
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => { prefs.fmt = t.dataset.fmt; savePrefs(); selectFmt(); });
      t.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const n = tabs[(i + dir + tabs.length) % tabs.length];
        prefs.fmt = n.dataset.fmt; savePrefs(); selectFmt(); n.focus();
      });
    });
  }
  function selectFmt() {
    $$('.fmt-tab').forEach((t) => { const on = t.dataset.fmt === prefs.fmt; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $('#fmt-panel').setAttribute('aria-labelledby', 'fmt-tab-' + prefs.fmt);
    renderCompiler();
  }
  function renderCompiler() {
    const opts = compilerOpts();
    compiled = {};
    Object.entries(CC.FORMATS).forEach(([k, f]) => { compiled[k] = f.build(tk, opts); });
    const f = CC.FORMATS[prefs.fmt];
    const text = compiled[prefs.fmt];
    $('#fmt-file').textContent = f.file;
    $('#fmt-hint').textContent = f.hint;
    $('#fmt-stats').innerHTML = `<span>${text.split('\n').length} lines</span><span>${bytes(text)}</span><span>≈${Math.round(text.length / 4).toLocaleString()} tokens</span>`;
    setCode($('#fmt-output'), text, 'md');
  }

  /* ───────────── Exporter ───────────── */
  const EXPORTS = {
    css: { file: 'variables.css', ext: 'css', desc: 'CSS custom properties · light, dark, reduced motion', kind: 'css', mime: 'text/css;charset=utf-8' },
    json: { file: 'tokens.json', ext: 'json', desc: 'W3C Design Tokens (DTCG 2025.10)', kind: 'json', mime: 'application/json' },
    config: { file: 'aegis.config.json', ext: 'cfg', desc: 'Studio settings · import to keep editing', kind: 'json', mime: 'application/json' }
  };
  let exported = {};
  function configJSON() {
    return JSON.stringify({ $schema: 'aegisui/config@1', generator: 'AegisUI', savedAt: new Date().toISOString(), state }, null, 2) + '\n';
  }
  function readme() {
    const p = state.prefix;
    return `# ${state.name} Design System

Generated by **AegisUI** on ${new Date().toISOString().slice(0, 10)}.

## What's inside

| Path | Purpose |
| --- | --- |
| \`styles/variables.css\` | CSS custom properties (\`--${p}-*\`): OKLCH-derived palettes, semantic light/dark roles, type scale, ${state.space.grid}px spacing grid, radius, elevation, motion. |
| \`tokens/tokens.json\` | The same tokens in W3C Design Tokens (DTCG 2025.10) format for Style Dictionary, Tokens Studio, Figma variables and other tools. |
| \`CLAUDE.md\` | Context for Claude Code. Keep it at the repository root. |
| \`.cursorrules\` | Always-on rules for Cursor. Keep it at the repository root. |
| \`AGENTS.md\` | Instructions for Codex, Jules, Copilot agent and other AGENTS.md-aware tools. |
| \`SYSTEM_PROMPT.md\` | A portable system prompt for API calls, Claude Projects or custom GPTs. |
| \`aegis.config.json\` | Studio settings. Import it in AegisUI to keep editing this system. |

## Quick start

\`\`\`html
<link rel="stylesheet" href="styles/variables.css">
\`\`\`

\`\`\`css
.card {
  background: var(--${p}-color-surface);
  color: var(--${p}-color-text);
  border: 1px solid var(--${p}-color-border);
  border-radius: var(--${p}-radius-lg);
  padding: var(--${p}-space-5);
  box-shadow: var(--${p}-shadow-sm);
}
\`\`\`

## Theming

- Light is the default. Dark follows \`prefers-color-scheme\` automatically.
- Force a theme with \`<html data-theme="dark">\` or \`<html data-theme="light">\`.
- Under \`prefers-reduced-motion: reduce\`, every duration token collapses to 0.01ms.

## Accessibility

Every semantic text/background pair was computed against WCAG 2.2 AA (4.5:1 text, 3:1 UI components and focus indicators). The AI rule files list the verified pairings so assistants only use combinations that pass.

## Updating

Don't edit these files by hand. Import \`aegis.config.json\` into AegisUI, change the system, and export again.
`;
  }
  function bundleFiles() {
    const root = slug(state.name) + '-design-system/';
    return [
      { name: root + 'README.md', content: readme() },
      { name: root + 'styles/variables.css', content: exported.css },
      { name: root + 'tokens/tokens.json', content: exported.json },
      { name: root + 'CLAUDE.md', content: compiled.claude },
      { name: root + '.cursorrules', content: compiled.cursor },
      { name: root + 'AGENTS.md', content: compiled.agents },
      { name: root + 'SYSTEM_PROMPT.md', content: compiled.system },
      { name: root + 'aegis.config.json', content: exported.config }
    ];
  }
  function renderExports() {
    exported.css = T.toCSS(tk);
    exported.json = T.toDTCG(tk, { legacy: prefs.legacy });
    exported.config = configJSON();
    $('#export-files').innerHTML = Object.entries(EXPORTS).map(([k, f]) =>
      `<li><button type="button" class="file-btn" data-exp="${k}" ${prefs.exp === k ? 'aria-current="true"' : ''}>
        <span class="file-btn__ext" aria-hidden="true">${f.ext}</span>
        <span><span class="file-btn__name">${f.file}</span><span class="file-btn__desc">${f.desc}</span></span>
        <span class="file-btn__size">${bytes(exported[k])}</span></button></li>`).join('');
    const files = bundleFiles();
    const root = slug(state.name) + '-design-system/';
    $('#bundle-meta').textContent = `${root.slice(0, -1)}.zip · ${files.length} files`;
    $('#bundle-list').innerHTML = files.map((f) => `<li><span>${escHTML(f.name.slice(root.length))}</span><span>${bytes(f.content)}</span></li>`).join('');
    const f = EXPORTS[prefs.exp];
    $('#exp-file').textContent = f.file;
    $('#exp-hint').textContent = f.desc;
    $('#exp-stats').innerHTML = `<span>${exported[prefs.exp].split('\n').length} lines</span><span>${bytes(exported[prefs.exp])}</span>`;
    $('#dtcg-legacy-wrap').hidden = prefs.exp !== 'json';
    setCode($('#exp-output'), exported[prefs.exp], f.kind);
  }
  function downloadZip() {
    renderAll(true);
    const blob = Z.createZip(bundleFiles());
    download(slug(state.name) + '-design-system.zip', blob);
  }

  /* ───────────── Orchestration ───────────── */
  let activeTab = prefs.tab;
  function renderAll(force) {
    if (force || activeTab === 'compiler') renderCompiler();
    if (force || activeTab === 'export') { if (!compiled.claude) renderCompiler(); renderExports(); }
  }
  const renderOutputsSoon = debounce(() => renderAll(false), 120);
  function update() {
    tk = T.build(state);
    applyLive();
    renderInstruments();
    renderOutputsSoon();
    saveState();
  }

  /* ───────────── Workspace tabs ───────────── */
  function bindWorkspaceTabs() {
    const tabs = $$('.wtab');
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
      activeTab = tab.id.replace('tab-', '');
      prefs.tab = activeTab; savePrefs();
      renderAll(false);
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (dir) { e.preventDefault(); select(tabs[(i + dir + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      });
    });
    select($('#tab-' + (['preview', 'compiler', 'export'].includes(prefs.tab) ? prefs.tab : 'preview')));
  }

  /* ───────────── Preview toolbar ───────────── */
  function bindPreview(api) {
    const sw = $('#screen-switch');
    const reflect = (name) => $$('button', sw).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.screen === name)));
    api.onScreen(reflect);
    sw.addEventListener('click', (e) => { const b = e.target.closest('[data-screen]'); if (b) api.setScreen(b.dataset.screen); });

    const vp = $('#viewport-switch');
    const setVp = (v) => { $('#frame-device').dataset.vp = v; $$('button', vp).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vp === v))); prefs.vp = v; savePrefs(); };
    vp.addEventListener('click', (e) => { const b = e.target.closest('[data-vp]'); if (b) setVp(b.dataset.vp); });
    setVp(prefs.vp);

    const mt = $('#mode-toggle');
    const setMode = (m) => { $('#preview-root').dataset.mode = m; mt.setAttribute('aria-checked', String(m === 'dark')); prefs.previewMode = m; savePrefs(); };
    mt.addEventListener('click', () => setMode(prefs.previewMode === 'dark' ? 'light' : 'dark'));
    setMode(prefs.previewMode);
  }

  /* ───────────── Splitter ───────────── */
  function bindSplitter() {
    const sp = $('#splitter');
    const setW = (w) => {
      w = Math.round(C.clamp(w, 280, Math.min(640, window.innerWidth - 360)));
      document.documentElement.style.setProperty('--st-panel-w', w + 'px');
      sp.setAttribute('aria-valuenow', String(w));
      prefs.panelW = w; savePrefs();
    };
    setW(prefs.panelW);
    sp.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sp.setPointerCapture(e.pointerId);
      sp.dataset.dragging = '';
      const move = (ev) => setW(ev.clientX);
      const up = () => { delete sp.dataset.dragging; sp.removeEventListener('pointermove', move); sp.removeEventListener('pointerup', up); };
      sp.addEventListener('pointermove', move);
      sp.addEventListener('pointerup', up);
    });
    sp.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 40 : 10;
      if (e.key === 'ArrowLeft') { e.preventDefault(); setW(prefs.panelW - step); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setW(prefs.panelW + step); }
      if (e.key === 'Home') { e.preventDefault(); setW(280); }
      if (e.key === 'End') { e.preventDefault(); setW(640); }
    });
  }

  /* ───────────── Output actions ───────────── */
  function bindOutputs() {
    $('#cc-target').addEventListener('change', (e) => { prefs.target = e.target.value; savePrefs(); renderAll(true); });
    $('#cc-mode').addEventListener('change', (e) => { prefs.mode = e.target.value; savePrefs(); renderAll(true); });
    $('#cc-scales').addEventListener('change', (e) => { prefs.scales = e.target.checked; savePrefs(); renderAll(true); });
    $('#fmt-copy').addEventListener('click', () => copyText(compiled[prefs.fmt], CC.FORMATS[prefs.fmt].file, $('#fmt-output')));
    $('#fmt-download').addEventListener('click', () => download(CC.FORMATS[prefs.fmt].file, compiled[prefs.fmt], 'text/markdown;charset=utf-8'));

    $('#export-files').addEventListener('click', (e) => { const b = e.target.closest('[data-exp]'); if (!b) return; prefs.exp = b.dataset.exp; savePrefs(); renderExports(); });
    $('#dtcg-legacy').addEventListener('change', (e) => { prefs.legacy = e.target.checked; savePrefs(); renderExports(); });
    $('#exp-copy').addEventListener('click', () => copyText(exported[prefs.exp], EXPORTS[prefs.exp].file, $('#exp-output')));
    $('#exp-download').addEventListener('click', () => download(EXPORTS[prefs.exp].file, exported[prefs.exp], EXPORTS[prefs.exp].mime));
    $('#btn-zip').addEventListener('click', downloadZip);
    $('#btn-quick-zip').addEventListener('click', downloadZip);

    $('#controls').addEventListener('click', (e) => {
      const b = e.target.closest('[data-copy]');
      if (b) copyText(b.dataset.copy, b.dataset.copy);
    });
  }

  /* ───────────── Boot ───────────── */
  function init() {
    populate();
    syncControls();
    const api = P.mount($('#preview-root'));
    bindControls();
    bindPreview(api);
    bindSplitter();
    bindOutputs();
    renderCompilerTabs();
    $('#fmt-panel').setAttribute('aria-labelledby', 'fmt-tab-' + prefs.fmt);
    update();
    bindWorkspaceTabs();
    setTimeout(() => playMotion(), 400);
    Aegis.app = { get state() { return state; }, get tokens() { return tk; }, renderAll };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.Aegis = window.Aegis || {});
