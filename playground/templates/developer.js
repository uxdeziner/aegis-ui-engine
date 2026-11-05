/* AegisUI Playground — Developer & AI templates */
(function () {
  'use strict';
  var R = window.AegisPlaygroundTemplates, I = R.icon;

  /* ------------------------------------------------------------------ Split code editor */
  R.register({
    id: 'split-editor',
    name: 'Split code editor with live preview',
    category: 'Developer',
    tags: ['code editor', 'split view', 'live preview', 'html', 'css', 'playground', 'sandbox', 'ide', 'resizable'],
    description: 'Tabbed HTML/CSS editor with line numbers, Tab indentation, a draggable/keyboard-resizable splitter and a sandboxed live preview.',
    a11y: [
      'Editor tabs follow the tabs pattern; each textarea has an aria-label',
      'Splitter is role="separator" with aria-orientation, aria-valuenow/min/max; ←/→ resize by 5%, Home/End to limits',
      'Tab inserts two spaces; Escape then Tab moves focus out of the editor (documented in the hint text)',
      'Preview iframe has a title and sandbox without scripts'
    ],
    behavior: ['Preview updates 300ms after typing stops (auto-run toggle)', 'Line numbers stay in sync with scrolling'],
    html:
'<section class="ce" aria-label="Code editor">\n' +
'  <div class="ce__bar"><div class="ae-tabs" role="tablist" aria-label="Files"><button class="ae-tab" role="tab" aria-selected="true" aria-controls="ce-html" id="ce-t-html">index.html</button><button class="ae-tab" role="tab" aria-selected="false" aria-controls="ce-css" id="ce-t-css" tabindex="-1">styles.css</button></div>\n' +
'    <label class="ae-check ae-text-label-sm"><input class="ae-switch" type="checkbox" role="switch" checked data-ce-auto> Auto-run</label><button class="ae-btn ae-btn--sm" type="button" data-ce-run>' + I('play') + 'Run</button></div>\n' +
'  <div class="ce__split" data-ce-split>\n' +
'    <div class="ce__pane">\n' +
'      <div class="ce__editor" id="ce-html" role="tabpanel" aria-labelledby="ce-t-html"><pre class="ce__gutter" aria-hidden="true"></pre><textarea class="ce__code" spellcheck="false" aria-label="HTML source" data-lang="html"></textarea></div>\n' +
'      <div class="ce__editor" id="ce-css" role="tabpanel" aria-labelledby="ce-t-css" hidden><pre class="ce__gutter" aria-hidden="true"></pre><textarea class="ce__code" spellcheck="false" aria-label="CSS source" data-lang="css"></textarea></div>\n' +
'    </div>\n' +
'    <div class="ce__sep" role="separator" aria-orientation="vertical" aria-label="Resize editor and preview" aria-valuemin="20" aria-valuemax="80" aria-valuenow="50" tabindex="0" data-ce-sep></div>\n' +
'    <div class="ce__preview"><iframe title="Live preview" sandbox data-ce-frame></iframe></div>\n' +
'  </div>\n' +
'  <p class="ae-text-caption ce__hint">Tab indents · Esc then Tab leaves the editor · ←/→ on the divider resizes</p>\n' +
'</section>',
    css:
'.ce { display: grid; gap: var(--aegis-space-8); }\n' +
'.ce__bar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--aegis-space-12); }\n' +
'.ce__bar .ae-tabs { flex: 1; }\n' +
'.ce__split { --ce-left: 50%; display: grid; grid-template-columns: var(--ce-left) var(--aegis-space-8) 1fr; height: 340px; border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); overflow: hidden; background: var(--aegis-bg-surface); }\n' +
'@media (max-width: 640px) { .ce__split { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; height: 520px; } .ce__sep { display: none; } }\n' +
'.ce__pane, .ce__editor { min-width: 0; min-height: 0; height: 100%; }\n' +
'.ce__editor { display: grid; grid-template-columns: auto 1fr; background: var(--aegis-bg-surface-sunken); }\n' +
'.ce__editor[hidden] { display: none; }\n' +
'.ce__gutter, .ce__code { margin: 0; padding: var(--aegis-space-12) var(--aegis-space-8); font: var(--aegis-text-code); line-height: 1.6; }\n' +
'.ce__gutter { min-width: 3ch; text-align: right; color: var(--aegis-fg-subtle); overflow: hidden; user-select: none; border-right: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ce__code { width: 100%; height: 100%; resize: none; border: 0; outline: none; background: transparent; color: var(--aegis-fg-default); white-space: pre; overflow: auto; tab-size: 2; }\n' +
'.ce__code:focus-visible { box-shadow: inset 0 0 0 var(--aegis-focus-ring-width) var(--aegis-focus-ring-color); }\n' +
'.ce__sep { cursor: col-resize; background: var(--aegis-bg-surface); border-inline: var(--aegis-border-width-thin) solid var(--aegis-border-default); position: relative; }\n' +
'.ce__sep::after { content: ""; position: absolute; inset: 40% 2px; border-radius: var(--aegis-radius-full); background: var(--aegis-border-strong); }\n' +
'.ce__sep:hover::after, .ce__sep:focus-visible::after, .ce__sep.is-dragging::after { background: var(--aegis-brand-default); }\n' +
'.ce__sep:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: -2px; }\n' +
'.ce__preview iframe { width: 100%; height: 100%; border: 0; background: var(--aegis-color-white); }\n' +
'.ce__hint { margin: 0; }',
    js: function (root) {
      var SRC = {
        html: '<main class="card">\n  <h1>Hello, AegisUI</h1>\n  <p>Edit the HTML and CSS — the preview updates live.</p>\n  <button>Primary action</button>\n</main>',
        css: 'body { font: 16px/1.5 system-ui, sans-serif; margin: 0; padding: 24px; background: #f6f7f9; }\n.card { max-width: 320px; padding: 20px; border-radius: 12px; background: #fff; box-shadow: 0 4px 16px rgb(0 0 0 / .08); }\nh1 { margin: 0 0 8px; font-size: 20px; }\nbutton { padding: 8px 14px; border: 0; border-radius: 8px; background: #2c56e0; color: #fff; font-weight: 600; }'
      };
      var frame = root.querySelector('[data-ce-frame]'), split = root.querySelector('[data-ce-split]'), sep = root.querySelector('[data-ce-sep]'), auto = root.querySelector('[data-ce-auto]');
      var areas = root.querySelectorAll('.ce__code'), timer, escaped = false;
      function gutter(ta) { var n = ta.value.split('\n').length, g = ta.previousElementSibling, s = ''; for (var i = 1; i <= n; i++) s += i + '\n'; g.textContent = s; g.scrollTop = ta.scrollTop; }
      function run() {
        var html = root.querySelector('[data-lang="html"]').value, css = root.querySelector('[data-lang="css"]').value;
        frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>' + css.replace(/<\/style/gi, '<\\/style') + '</style></head><body>' + html + '</body></html>';
      }
      areas.forEach(function (ta) {
        ta.value = SRC[ta.getAttribute('data-lang')]; gutter(ta);
        ta.addEventListener('input', function () { gutter(ta); if (auto.checked) { clearTimeout(timer); timer = setTimeout(run, 300); } });
        ta.addEventListener('scroll', function () { ta.previousElementSibling.scrollTop = ta.scrollTop; });
        ta.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') { escaped = true; return; }
          if (e.key === 'Tab' && !escaped) {
            e.preventDefault();
            var s = ta.selectionStart, en = ta.selectionEnd;
            ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en); ta.selectionStart = ta.selectionEnd = s + 2;
            ta.dispatchEvent(new Event('input'));
          }
          if (e.key !== 'Tab') escaped = false;
        });
      });
      var tabs = root.querySelectorAll('[role="tab"]');
      tabs.forEach(function (t, i) {
        function sel() { tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; root.querySelector('#' + x.getAttribute('aria-controls')).hidden = !on; }); }
        t.addEventListener('click', sel);
        t.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; n.click(); n.focus(); } });
      });
      function setPos(p) { p = Math.max(20, Math.min(80, Math.round(p))); split.style.setProperty('--ce-left', p + '%'); sep.setAttribute('aria-valuenow', p); }
      sep.addEventListener('pointerdown', function (e) {
        sep.setPointerCapture(e.pointerId); sep.classList.add('is-dragging'); frame.style.pointerEvents = 'none';
        function mv(ev) { var r = split.getBoundingClientRect(); setPos((ev.clientX - r.left) / r.width * 100); }
        function up() { sep.classList.remove('is-dragging'); frame.style.pointerEvents = ''; sep.removeEventListener('pointermove', mv); sep.removeEventListener('pointerup', up); }
        sep.addEventListener('pointermove', mv); sep.addEventListener('pointerup', up);
      });
      sep.addEventListener('keydown', function (e) {
        var v = +sep.getAttribute('aria-valuenow'), m = { ArrowLeft: v - 5, ArrowRight: v + 5, Home: 20, End: 80 }[e.key];
        if (m !== undefined) { e.preventDefault(); setPos(m); }
      });
      root.querySelector('[data-ce-run]').addEventListener('click', run);
      run();
    }
  });

  /* ------------------------------------------------------------------ AI assistant chat */
  R.register({
    id: 'ai-chat',
    name: 'AI assistant chat panel',
    category: 'Developer',
    tags: ['chat', 'ai', 'assistant', 'copilot', 'llm', 'messages', 'composer', 'streaming', 'conversation'],
    description: 'Chat panel with message log, suggested prompts, auto-growing composer (Enter to send, Shift+Enter for newline), streaming reply and stop button.',
    a11y: ['Message log is role="log" with aria-live="polite"; the streaming reply is announced once complete', 'Composer textarea has a label; Send/Stop is one button whose label reflects state', 'Suggested prompts are buttons'],
    behavior: ['Responses stream word by word (simulated); Stop ends generation early', 'Composer grows up to 6 lines'],
    html:
'<section class="ch ae-card ae-card--flush" aria-labelledby="ch-title">\n' +
'  <header class="ch__head">' + I('sparkle') + '<h2 class="ae-text-label-lg" id="ch-title">Aegis assistant</h2><span class="ae-badge ae-badge--success ae-badge--dot">Online</span></header>\n' +
'  <div class="ch__log" role="log" aria-live="polite" aria-label="Conversation" data-ch-log>\n' +
'    <div class="ch__msg ch__msg--ai"><p>Hi! Ask me about your design tokens, components or accessibility checks.</p></div>\n' +
'  </div>\n' +
'  <div class="ch__suggest" data-ch-suggest><button class="ae-btn ae-btn--sm" type="button">Which tokens fail AA in dark mode?</button><button class="ae-btn ae-btn--sm" type="button">Generate a data table prompt</button></div>\n' +
'  <form class="ch__composer" data-ch-form><label class="ch__sr" for="ch-input">Message</label><textarea class="ae-textarea ch__input" id="ch-input" rows="1" placeholder="Ask anything…" data-ch-input></textarea><button class="ae-btn ae-btn--primary ae-btn--icon" type="submit" aria-label="Send message" data-ch-send>' + I('send') + '</button></form>\n' +
'</section>',
    css:
'.ch { display: flex; flex-direction: column; height: 460px; max-width: 520px; }\n' +
'.ch__head { display: flex; align-items: center; gap: var(--aegis-space-8); padding: var(--aegis-space-12) var(--aegis-space-16); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ch__head svg { width: var(--aegis-size-icon-md); height: var(--aegis-size-icon-md); color: var(--aegis-brand-default); }\n' +
'.ch__head h2 { margin: 0; flex: 1; }\n' +
'.ch__log { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--aegis-space-12); padding: var(--aegis-space-16); }\n' +
'.ch__msg { max-width: 85%; padding: var(--aegis-space-8) var(--aegis-space-12); border-radius: var(--aegis-radius-lg); font: var(--aegis-text-body-sm); }\n' +
'.ch__msg p { margin: 0; white-space: pre-wrap; }\n' +
'.ch__msg--ai { align-self: flex-start; background: var(--aegis-bg-surface-sunken); border-bottom-left-radius: var(--aegis-radius-xs); }\n' +
'.ch__msg--me { align-self: flex-end; background: var(--aegis-brand-default); color: var(--aegis-fg-on-brand); border-bottom-right-radius: var(--aegis-radius-xs); }\n' +
'.ch__msg.is-typing p::after { content: "\\258D"; animation: ch-blink 1s steps(1) infinite; }\n' +
'@keyframes ch-blink { 50% { opacity: 0; } }\n' +
'.ch__suggest { display: flex; flex-wrap: wrap; gap: var(--aegis-space-6); padding: 0 var(--aegis-space-16) var(--aegis-space-8); }\n' +
'.ch__suggest:empty { display: none; }\n' +
'.ch__composer { display: flex; align-items: flex-end; gap: var(--aegis-space-8); padding: var(--aegis-space-12) var(--aegis-space-16); border-top: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ch__input { min-height: var(--aegis-input-height); max-height: calc(var(--aegis-text-body-md-line) * 6 + var(--aegis-space-16)); resize: none; }\n' +
'.ch__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      var log = root.querySelector('[data-ch-log]'), input = root.querySelector('[data-ch-input]'), send = root.querySelector('[data-ch-send]'), form = root.querySelector('[data-ch-form]');
      var streaming = null;
      var SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"/></svg>';
      var STOP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>';
      var ANSWERS = [
        'In dark mode, check --aegis-fg-subtle on --aegis-bg-surface-raised and status text on its subtle tint. The preset build already walks failing pairs to the nearest passing ramp step, so start from the a11y report in the gallery.',
        'Use the Editable data grid template, then press “Generate AI prompt”. It lists every token the grid uses, the keyboard model (roving tabindex, Enter to edit, Escape to cancel) and the active preset.'
      ];
      var turn = 0;
      function add(cls, text) { var d = document.createElement('div'); d.className = 'ch__msg ch__msg--' + cls; var p = document.createElement('p'); p.textContent = text; d.appendChild(p); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
      function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 6 * 24 + 16) + 'px'; }
      function setBusy(b) { send.innerHTML = b ? STOP : SEND; send.setAttribute('aria-label', b ? 'Stop generating' : 'Send message'); }
      function stop() { if (!streaming) return; clearInterval(streaming.t); streaming.el.classList.remove('is-typing'); log.setAttribute('aria-busy', 'false'); streaming = null; setBusy(false); }
      function ask(text) {
        text = text.trim(); if (!text || streaming) return;
        root.querySelector('[data-ch-suggest]').innerHTML = '';
        add('me', text); input.value = ''; grow();
        var words = ANSWERS[turn++ % ANSWERS.length].split(' '), el = add('ai', ''), i = 0;
        el.classList.add('is-typing'); log.setAttribute('aria-busy', 'true'); setBusy(true);
        streaming = { el: el, t: setInterval(function () { el.firstChild.textContent += (i ? ' ' : '') + words[i++]; log.scrollTop = log.scrollHeight; if (i >= words.length) stop(); }, 45) };
      }
      form.addEventListener('submit', function (e) { e.preventDefault(); streaming ? stop() : ask(input.value); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!streaming) ask(input.value); } });
      input.addEventListener('input', grow);
      root.querySelector('[data-ch-suggest]').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) ask(b.textContent); });
    }
  });

  /* ------------------------------------------------------------------ API keys */
  R.register({
    id: 'api-keys',
    name: 'API key manager',
    category: 'Developer',
    tags: ['api keys', 'tokens', 'secrets', 'credentials', 'developer settings', 'reveal', 'copy', 'revoke'],
    description: 'Table of masked API keys with reveal-on-demand, copy, last-used metadata, create (shown once) and revoke with confirmation.',
    a11y: ['Secrets are masked by default; reveal buttons use aria-pressed and per-key labels', 'Copy feedback is announced via role="status"', 'Revoke requires a second, explicit confirm and moves focus sensibly'],
    behavior: ['A new key is shown in full exactly once with a warning', 'Revoked keys stay listed with a Revoked badge'],
    html:
'<section class="ak ae-card ae-card--flush" aria-labelledby="ak-title">\n' +
'  <div class="ak__head"><div><h2 class="ae-text-heading-sm" id="ak-title">API keys</h2><p class="ae-text-caption">Keys grant full access to your workspace. Keep them secret.</p></div><button class="ae-btn ae-btn--primary ae-btn--sm" type="button" data-ak-new>' + I('plus') + 'Create key</button></div>\n' +
'  <div class="ae-alert ae-alert--warning ak__fresh" hidden data-ak-fresh>' + I('key') + '<div><p class="ae-alert__title">Copy your new key now</p><p class="ae-alert__body">You won’t be able to see it again. <code class="ak__secret" data-ak-fresh-key></code></p></div></div>\n' +
'  <div class="ae-table-wrap"><table class="ae-table"><thead><tr><th>Name</th><th>Key</th><th>Last used</th><th><span class="ak__sr">Actions</span></th></tr></thead><tbody data-ak-rows></tbody></table></div>\n' +
'  <p class="ak__status ae-text-caption" role="status" data-ak-status></p>\n' +
'</section>',
    css:
'.ak__head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--aegis-space-12); padding: var(--aegis-space-16); }\n' +
'.ak__head h2, .ak__head p { margin: 0; }\n' +
'.ak__fresh { margin: 0 var(--aegis-space-16) var(--aegis-space-16); }\n' +
'.ak__fresh p { margin: 0; }\n' +
'.ak__secret { font: var(--aegis-text-code); padding: var(--aegis-space-2) var(--aegis-space-6); border-radius: var(--aegis-radius-xs); background: var(--aegis-bg-surface-sunken); word-break: break-all; }\n' +
'.ak__key { display: inline-flex; align-items: center; gap: var(--aegis-space-4); }\n' +
'.ak__actions { display: flex; justify-content: flex-end; gap: var(--aegis-space-4); }\n' +
'.ak tr.is-revoked td:not(:last-child) { color: var(--aegis-fg-subtle); }\n' +
'.ak__status { margin: 0; padding: var(--aegis-space-8) var(--aegis-space-16); } .ak__status:empty { display: none; }\n' +
'.ak__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      function rnd(n) { var c = 'abcdefghijklmnopqrstuvwxyz0123456789', s = ''; for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
      var keys = [{ n: 'Production', k: 'sk_live_' + rnd(24), used: '2 min ago' }, { n: 'CI pipeline', k: 'sk_live_' + rnd(24), used: 'Yesterday' }, { n: 'Local dev', k: 'sk_test_' + rnd(24), used: 'Never' }];
      var shown = {}, confirming = null, rows = root.querySelector('[data-ak-rows]'), status = root.querySelector('[data-ak-status]');
      var mask = function (k) { return k.slice(0, 8) + '••••••••' + k.slice(-4); };
      var ICO = { eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>' };
      var svg = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' + p + '</svg>'; };
      function render(focusSel) {
        rows.innerHTML = keys.map(function (k, i) {
          var rev = k.revoked;
          return '<tr class="' + (rev ? 'is-revoked' : '') + '"><td>' + k.n + (rev ? ' <span class="ae-badge ae-badge--danger">Revoked</span>' : '') + '</td>' +
            '<td><span class="ak__key"><code class="ak__secret">' + (shown[i] ? k.k : mask(k.k)) + '</code>' + (rev ? '' : '<button class="ae-btn ae-btn--ghost ae-btn--sm ae-btn--icon" type="button" data-reveal="' + i + '" aria-pressed="' + !!shown[i] + '" aria-label="' + (shown[i] ? 'Hide' : 'Reveal') + ' ' + k.n + ' key">' + svg(ICO.eye) + '</button><button class="ae-btn ae-btn--ghost ae-btn--sm ae-btn--icon" type="button" data-copy="' + i + '" aria-label="Copy ' + k.n + ' key">' + svg(ICO.copy) + '</button>') + '</span></td>' +
            '<td>' + k.used + '</td><td><div class="ak__actions">' + (rev ? '' : confirming === i ? '<button class="ae-btn ae-btn--sm" type="button" data-cancel="' + i + '">Cancel</button><button class="ae-btn ae-btn--danger ae-btn--sm" type="button" data-confirm="' + i + '">Confirm revoke</button>' : '<button class="ae-btn ae-btn--sm" type="button" data-revoke="' + i + '">Revoke<span class="ak__sr"> ' + k.n + '</span></button>') + '</div></td></tr>';
        }).join('');
        if (focusSel) { var f = rows.querySelector(focusSel); if (f) f.focus(); }
      }
      function copy(text) {
        var done = function () { status.textContent = 'Key copied to clipboard.'; };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { status.textContent = 'Copy failed. Select the key and copy it manually.'; });
        else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) {} t.remove(); }
      }
      rows.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-reveal')) { var r = +b.getAttribute('data-reveal'); shown[r] = !shown[r]; render('[data-reveal="' + r + '"]'); }
        else if (b.hasAttribute('data-copy')) copy(keys[+b.getAttribute('data-copy')].k);
        else if (b.hasAttribute('data-revoke')) { confirming = +b.getAttribute('data-revoke'); render('[data-confirm="' + confirming + '"]'); }
        else if (b.hasAttribute('data-cancel')) { var c = confirming; confirming = null; render('[data-revoke="' + c + '"]'); }
        else if (b.hasAttribute('data-confirm')) { var x = +b.getAttribute('data-confirm'); keys[x].revoked = true; confirming = null; shown[x] = false; render(); status.textContent = keys[x].n + ' key revoked.'; root.querySelector('[data-ak-new]').focus(); }
      });
      root.querySelector('[data-ak-new]').addEventListener('click', function () {
        var k = { n: 'New key ' + (keys.length + 1), k: 'sk_live_' + rnd(32), used: 'Never' };
        keys.unshift(k); shown = {}; confirming = null; render();
        root.querySelector('[data-ak-fresh-key]').textContent = k.k; root.querySelector('[data-ak-fresh]').hidden = false;
        status.textContent = 'Key created. Copy it now; it will be masked after you leave this page.';
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ Log viewer */
  R.register({
    id: 'log-viewer',
    name: 'Live log viewer',
    category: 'Developer',
    tags: ['logs', 'terminal', 'console', 'streaming', 'tail', 'observability', 'monitoring', 'debug'],
    description: 'Streaming log tail with level filters, search highlighting, follow/pause and a capped buffer; monospace and tabular timestamps.',
    a11y: ['Log is role="log" but not announced line-by-line (aria-live="off") to avoid noise; counts are summarised in a status line', 'Level filters are aria-pressed buttons showing counts', 'Pause/Resume is a single toggle button with aria-pressed'],
    behavior: ['New lines arrive every 900ms; Follow keeps the view pinned to the bottom', 'Buffer keeps the last 200 lines'],
    html:
'<section class="lg" aria-labelledby="lg-title">\n' +
'  <div class="lg__bar"><h2 class="ae-text-label-lg" id="lg-title">' + I('terminal') + 'api-gateway · production</h2>\n' +
'    <div class="lg__levels" role="group" aria-label="Log levels"><button type="button" aria-pressed="true" data-lv="info">INFO <span>0</span></button><button type="button" aria-pressed="true" data-lv="warn">WARN <span>0</span></button><button type="button" aria-pressed="true" data-lv="error">ERROR <span>0</span></button></div>\n' +
'    <input class="ae-input lg__q" type="search" placeholder="Filter" aria-label="Filter log lines" data-lg-q>\n' +
'    <button class="ae-btn ae-btn--sm" type="button" aria-pressed="false" data-lg-pause>' + I('pause') + 'Pause</button></div>\n' +
'  <div class="lg__out" role="log" aria-live="off" tabindex="0" aria-label="Log output" data-lg-out></div>\n' +
'  <p class="lg__status ae-text-caption" role="status" data-lg-status></p>\n' +
'</section>',
    css:
'.lg { display: grid; gap: var(--aegis-space-8); }\n' +
'.lg__bar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--aegis-space-8); }\n' +
'.lg__bar h2 { display: inline-flex; align-items: center; gap: var(--aegis-space-8); margin: 0 auto 0 0; }\n' +
'.lg__bar h2 svg { width: var(--aegis-size-icon-sm); height: var(--aegis-size-icon-sm); }\n' +
'.lg__levels { display: flex; gap: var(--aegis-space-4); }\n' +
'.lg__levels button { height: var(--aegis-size-control-sm); padding: 0 var(--aegis-space-8); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-sm); background: var(--aegis-bg-surface); color: var(--aegis-fg-subtle); font: var(--aegis-text-code); font-size: var(--aegis-text-caption-size); cursor: pointer; }\n' +
'.lg__levels button[aria-pressed="true"] { color: var(--aegis-fg-default); border-color: var(--aegis-border-strong); background: var(--aegis-bg-selected); }\n' +
'.lg__levels span { font-variant-numeric: tabular-nums; color: var(--aegis-fg-muted); }\n' +
'.lg__q { width: 160px; height: var(--aegis-size-control-sm); }\n' +
'.lg__out { height: 300px; overflow-y: auto; padding: var(--aegis-space-8) 0; border-radius: var(--aegis-radius-md); background: var(--aegis-bg-surface-sunken); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); font: var(--aegis-text-code); }\n' +
'.lg__out:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'.lg__line { display: grid; grid-template-columns: 9ch 6ch 1fr; gap: var(--aegis-space-12); padding: 1px var(--aegis-space-12); white-space: pre-wrap; word-break: break-word; }\n' +
'.lg__line time { color: var(--aegis-fg-subtle); font-variant-numeric: tabular-nums; }\n' +
'.lg__line.warn { background: var(--aegis-warning-subtle); } .lg__line.warn b { color: var(--aegis-warning-fg); }\n' +
'.lg__line.error { background: var(--aegis-danger-subtle); } .lg__line.error b { color: var(--aegis-danger-fg); }\n' +
'.lg__line b { font-weight: var(--aegis-font-weight-semibold); color: var(--aegis-info-fg); }\n' +
'.lg__line mark { background: var(--aegis-accent-subtle); color: inherit; border-radius: var(--aegis-radius-xs); }\n' +
'.lg__status { margin: 0; }',
    js: function (root) {
      var MSG = { info: ['GET /v1/invoices 200 42ms', 'POST /v1/payments 201 118ms', 'cache hit ratio 0.94', 'GET /v1/customers?page=2 200 61ms', 'webhook delivered evt_9f2 → 200'], warn: ['slow query invoices_by_customer 812ms', 'rate limit 80% for key sk_live_…c41', 'retrying webhook evt_7a1 (attempt 2)'], error: ['POST /v1/payments 502 upstream timeout', 'token verification failed: expired JWT'] };
      var out = root.querySelector('[data-lg-out]'), status = root.querySelector('[data-lg-status]'), pause = root.querySelector('[data-lg-pause]');
      var lines = [], on = { info: true, warn: true, error: true }, q = '', paused = false, seq = 0;
      var esc = function (s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); };
      function gen() { var r = Math.random(), lv = r < 0.72 ? 'info' : r < 0.92 ? 'warn' : 'error', a = MSG[lv]; seq++; return { lv: lv, t: new Date(), m: a[seq % a.length] }; }
      function row(l) {
        var m = esc(l.m);
        if (q) m = m.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        return '<div class="lg__line ' + l.lv + '"><time>' + l.t.toTimeString().slice(0, 8) + '</time><b>' + l.lv.toUpperCase() + '</b><span>' + m + '</span></div>';
      }
      function visible(l) { return on[l.lv] && (!q || l.m.toLowerCase().indexOf(q.toLowerCase()) > -1); }
      function counts() {
        ['info', 'warn', 'error'].forEach(function (lv) { root.querySelector('[data-lv="' + lv + '"] span').textContent = lines.filter(function (l) { return l.lv === lv; }).length; });
        status.textContent = (paused ? 'Paused · ' : 'Following · ') + lines.filter(visible).length + ' of ' + lines.length + ' lines shown';
      }
      function redraw() { out.innerHTML = lines.filter(visible).map(row).join(''); out.scrollTop = out.scrollHeight; counts(); }
      function push(l) {
        lines.push(l); if (lines.length > 200) { lines.shift(); if (out.firstChild && !paused) out.removeChild(out.firstChild); }
        if (paused) return counts();
        var stick = out.scrollHeight - out.scrollTop - out.clientHeight < 24;
        if (visible(l)) out.insertAdjacentHTML('beforeend', row(l));
        if (stick) out.scrollTop = out.scrollHeight;
        counts();
      }
      for (var i = 0; i < 18; i++) lines.push(gen());
      redraw();
      var timer = setInterval(function () { if (!root.isConnected) return clearInterval(timer); push(gen()); }, 900);
      root.querySelector('.lg__levels').addEventListener('click', function (e) { var b = e.target.closest('[data-lv]'); if (!b) return; var lv = b.getAttribute('data-lv'); on[lv] = !on[lv]; b.setAttribute('aria-pressed', String(on[lv])); redraw(); });
      root.querySelector('[data-lg-q]').addEventListener('input', function (e) { q = e.target.value.trim(); redraw(); });
      pause.addEventListener('click', function () {
        paused = !paused; pause.setAttribute('aria-pressed', String(paused));
        pause.innerHTML = (paused ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 5v14l12-7z"/></svg>Resume' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>Pause');
        if (!paused) redraw(); else counts();
      });
    }
  });
})();
