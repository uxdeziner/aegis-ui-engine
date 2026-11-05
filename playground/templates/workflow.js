/* AegisUI Playground — Workflow templates */
(function () {
  'use strict';
  var R = window.AegisPlaygroundTemplates, I = R.icon;

  /* ------------------------------------------------------------------ Kanban */
  R.register({
    id: 'kanban',
    name: 'Kanban board (native drag & drop)',
    category: 'Workflow',
    tags: ['kanban', 'board', 'drag and drop', 'dnd', 'tasks', 'columns', 'wip', 'agile', 'trello'],
    description: 'Board with native HTML5 drag & drop, drop-position indicator, WIP limits, inline card creation and a full keyboard alternative.',
    a11y: [
      'Cards are focusable (tabindex="0") with an accessible name that includes column and position',
      'Keyboard alternative to dragging: Space picks up, arrows move (←/→ column, ↑/↓ position), Space drops, Escape cancels',
      'Every move is announced in an assertive live region',
      'WIP-limit breaches are shown with text, not only color'
    ],
    behavior: ['Drag a card between or within columns; an indicator shows the drop position', 'Columns show count / WIP limit', 'Add a card with the inline form at the bottom of each column'],
    html:
'<section class="kb" aria-labelledby="kb-title">\n' +
'  <header class="kb__head"><h2 class="ae-text-heading-sm" id="kb-title">Sprint 42</h2><p class="ae-text-caption">Drag cards, or focus a card and press Space to move it with the arrow keys.</p></header>\n' +
'  <div class="kb__board" data-kb-board></div>\n' +
'  <p class="kb__sr" aria-live="assertive" data-kb-live></p>\n' +
'</section>',
    css:
'.kb { display: grid; gap: var(--aegis-space-12); }\n' +
'.kb__head p { margin: var(--aegis-space-4) 0 0; }\n' +
'.kb__board { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(220px, 1fr); gap: var(--aegis-space-12); overflow-x: auto; padding-bottom: var(--aegis-space-4); }\n' +
'.kb__col { display: flex; flex-direction: column; gap: var(--aegis-space-8); min-height: 280px; padding: var(--aegis-space-12); background: var(--aegis-bg-surface-sunken); border: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); border-radius: var(--aegis-radius-lg); transition: background-color var(--aegis-duration-fast) var(--aegis-easing-standard); }\n' +
'.kb__col.is-over { background: var(--aegis-bg-selected); border-color: var(--aegis-brand-border); }\n' +
'.kb__col-head { display: flex; align-items: center; justify-content: space-between; gap: var(--aegis-space-8); }\n' +
'.kb__col-head h3 { margin: 0; font: var(--aegis-text-label-md); }\n' +
'.kb__count { font: var(--aegis-text-caption); color: var(--aegis-fg-muted); font-variant-numeric: tabular-nums; }\n' +
'.kb__count.is-over-limit { color: var(--aegis-danger-fg); font-weight: var(--aegis-font-weight-semibold); }\n' +
'.kb__list { display: flex; flex-direction: column; gap: var(--aegis-space-8); flex: 1; list-style: none; margin: 0; padding: 0; }\n' +
'.kb__card { display: grid; gap: var(--aegis-space-6); padding: var(--aegis-space-12); background: var(--aegis-bg-surface); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-md); box-shadow: var(--aegis-shadow-xs); cursor: grab; }\n' +
'.kb__card:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: var(--aegis-focus-ring-offset); }\n' +
'.kb__card.is-dragging { opacity: 0.45; }\n' +
'.kb__card.is-grabbed { border-color: var(--aegis-brand-default); box-shadow: var(--aegis-shadow-lg); transform: rotate(-1deg); }\n' +
'.kb__card p { margin: 0; font: var(--aegis-text-body-sm); }\n' +
'.kb__meta { display: flex; align-items: center; justify-content: space-between; gap: var(--aegis-space-8); font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.kb__drop { height: var(--aegis-space-4); border-radius: var(--aegis-radius-full); background: var(--aegis-brand-default); }\n' +
'.kb__add { display: flex; gap: var(--aegis-space-6); }\n' +
'.kb__add .ae-input { height: var(--aegis-button-height-sm); }\n' +
'.kb__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }',
    js: function (root) {
      var cols = [
        { id: 'backlog', name: 'Backlog', limit: 0, cards: [{ id: 'c1', t: 'Audit color tokens in billing', tag: 'Design', p: 'Low' }, { id: 'c2', t: 'SAML metadata upload', tag: 'Auth', p: 'High' }] },
        { id: 'doing', name: 'In progress', limit: 3, cards: [{ id: 'c3', t: 'Invoice PDF export', tag: 'Billing', p: 'High' }, { id: 'c4', t: 'Dark-mode chart palette', tag: 'Design', p: 'Med' }] },
        { id: 'review', name: 'Review', limit: 2, cards: [{ id: 'c5', t: 'Rate-limit dashboard', tag: 'Platform', p: 'Med' }] },
        { id: 'done', name: 'Done', limit: 0, cards: [{ id: 'c6', t: 'Token lint in CI', tag: 'Platform', p: 'Low' }] }
      ];
      var board = root.querySelector('[data-kb-board]'), live = root.querySelector('[data-kb-live]');
      var nextId = 7, dragId = null, grabbed = null;
      var tone = { High: 'danger', Med: 'warning', Low: 'info' };
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      function say(m) { live.textContent = m; }
      function find(id) { for (var c = 0; c < cols.length; c++) for (var i = 0; i < cols[c].cards.length; i++) if (cols[c].cards[i].id === id) return { c: c, i: i }; return null; }
      function move(id, toCol, toIdx) {
        var f = find(id); var card = cols[f.c].cards.splice(f.i, 1)[0];
        if (f.c === toCol && f.i < toIdx) toIdx--;
        toIdx = Math.max(0, Math.min(cols[toCol].cards.length, toIdx));
        cols[toCol].cards.splice(toIdx, 0, card);
        return { col: cols[toCol], idx: toIdx, card: card };
      }
      function render(focusId) {
        board.innerHTML = cols.map(function (col, ci) {
          var n = col.cards.length, over = col.limit && n > col.limit;
          return '<section class="kb__col" data-col="' + ci + '" aria-labelledby="kb-h-' + col.id + '"><div class="kb__col-head"><h3 id="kb-h-' + col.id + '">' + col.name + '</h3>' +
            '<span class="kb__count' + (over ? ' is-over-limit' : '') + '">' + n + (col.limit ? ' / ' + col.limit : '') + (over ? ' · over WIP limit' : '') + '</span></div>' +
            '<ul class="kb__list">' + col.cards.map(function (k, i) {
              return '<li class="kb__card' + (grabbed === k.id ? ' is-grabbed' : '') + '" draggable="true" tabindex="0" data-id="' + k.id + '" aria-roledescription="draggable card" aria-label="' + esc(k.t) + ', ' + col.name + ', position ' + (i + 1) + ' of ' + n + '"' + (grabbed === k.id ? ' aria-grabbed="true"' : '') + '>' +
                '<p>' + esc(k.t) + '</p><div class="kb__meta"><span class="ae-badge">' + esc(k.tag) + '</span><span class="ae-badge ae-badge--' + tone[k.p] + '">' + k.p + '</span></div></li>';
            }).join('') + '</ul>' +
            '<form class="kb__add" data-add="' + ci + '"><label class="kb__sr" for="kb-new-' + col.id + '">New card in ' + col.name + '</label><input class="ae-input" id="kb-new-' + col.id + '" placeholder="Add a card" autocomplete="off"><button class="ae-btn ae-btn--sm ae-btn--icon" type="submit" aria-label="Add card to ' + col.name + '">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></form></section>';
        }).join('');
        if (focusId) { var el = board.querySelector('[data-id="' + focusId + '"]'); if (el) el.focus(); }
      }
      function indexFromPointer(list, y) {
        var cards = Array.prototype.slice.call(list.querySelectorAll('.kb__card:not(.is-dragging)'));
        for (var i = 0; i < cards.length; i++) { var r = cards[i].getBoundingClientRect(); if (y < r.top + r.height / 2) return i; }
        return cards.length;
      }
      function clearIndicators() { board.querySelectorAll('.kb__drop').forEach(function (d) { d.remove(); }); board.querySelectorAll('.is-over').forEach(function (c) { c.classList.remove('is-over'); }); }
      board.addEventListener('dragstart', function (e) {
        var card = e.target.closest('.kb__card'); if (!card) return;
        dragId = card.getAttribute('data-id');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', dragId);
        setTimeout(function () { card.classList.add('is-dragging'); }, 0);
      });
      board.addEventListener('dragend', function () { dragId = null; clearIndicators(); board.querySelectorAll('.is-dragging').forEach(function (c) { c.classList.remove('is-dragging'); }); });
      board.addEventListener('dragover', function (e) {
        var col = e.target.closest('.kb__col'); if (!col || !dragId) return;
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        var list = col.querySelector('.kb__list'), idx = indexFromPointer(list, e.clientY);
        clearIndicators(); col.classList.add('is-over');
        var bar = document.createElement('li'); bar.className = 'kb__drop'; bar.setAttribute('aria-hidden', 'true');
        var cards = list.querySelectorAll('.kb__card:not(.is-dragging)');
        list.insertBefore(bar, cards[idx] || null);
      });
      board.addEventListener('dragleave', function (e) { var col = e.target.closest('.kb__col'); if (col && !col.contains(e.relatedTarget)) clearIndicators(); });
      board.addEventListener('drop', function (e) {
        var col = e.target.closest('.kb__col'); if (!col || !dragId) return;
        e.preventDefault();
        var list = col.querySelector('.kb__list');
        var bar = list.querySelector('.kb__drop');
        var idx = Array.prototype.indexOf.call(list.querySelectorAll('.kb__card, .kb__drop'), bar);
        var res = move(dragId, +col.getAttribute('data-col'), idx < 0 ? list.children.length : idx);
        render(res.card.id);
        say('Moved “' + res.card.t + '” to ' + res.col.name + ', position ' + (res.idx + 1) + '.');
      });
      var origin = null;
      board.addEventListener('keydown', function (e) {
        var card = e.target.closest('.kb__card'); if (!card) return;
        var id = card.getAttribute('data-id'), f = find(id);
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (grabbed === id) { grabbed = null; origin = null; render(id); say('Dropped in ' + cols[find(id).c].name + ', position ' + (find(id).i + 1) + '.'); }
          else { grabbed = id; origin = { c: f.c, i: f.i }; render(id); say('Picked up “' + cols[f.c].cards[f.i].t + '”. Use arrow keys to move, Space to drop, Escape to cancel.'); }
          return;
        }
        if (grabbed !== id) return;
        var to = null;
        if (e.key === 'ArrowLeft' && f.c > 0) to = [f.c - 1, Math.min(f.i, cols[f.c - 1].cards.length)];
        if (e.key === 'ArrowRight' && f.c < cols.length - 1) to = [f.c + 1, Math.min(f.i, cols[f.c + 1].cards.length)];
        if (e.key === 'ArrowUp' && f.i > 0) to = [f.c, f.i - 1];
        if (e.key === 'ArrowDown' && f.i < cols[f.c].cards.length - 1) to = [f.c, f.i + 2];
        if (e.key === 'Escape') { e.preventDefault(); move(id, origin.c, origin.i + (origin.c === f.c && origin.i > f.i ? 1 : 0)); grabbed = null; render(id); say('Move cancelled.'); return; }
        if (to) { e.preventDefault(); var r = move(id, to[0], to[1]); render(id); say(r.col.name + ', position ' + (r.idx + 1) + ' of ' + r.col.cards.length + '.'); }
      });
      board.addEventListener('submit', function (e) {
        e.preventDefault();
        var ci = +e.target.getAttribute('data-add'), input = e.target.querySelector('input'), t = input.value.trim();
        if (!t) { input.focus(); return; }
        var id = 'c' + nextId++;
        cols[ci].cards.push({ id: id, t: t, tag: 'New', p: 'Low' });
        render(); board.querySelector('#kb-new-' + cols[ci].id).focus(); say('Added “' + t + '” to ' + cols[ci].name + '.');
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ Wizard */
  R.register({
    id: 'wizard',
    name: 'Multi-step onboarding wizard',
    category: 'Workflow',
    tags: ['wizard', 'stepper', 'onboarding', 'multi-step form', 'checkout', 'setup', 'flow'],
    description: 'Four-step setup wizard with a progress stepper, per-step validation, back/next, a review step and a success state.',
    a11y: ['Stepper is an <ol> with aria-current="step" on the active step', 'Move focus to the step heading after navigation', 'Invalid fields get aria-invalid and an error linked with aria-describedby; focus the first invalid field', 'Completed steps are announced as completed in their accessible name'],
    behavior: ['Next validates the current step only', 'Back preserves entered values', 'Review lists all answers with Edit links back to each step'],
    html:
'<section class="wz ae-card" aria-labelledby="wz-title">\n' +
'  <h2 class="ae-text-heading-sm" id="wz-title">Set up your workspace</h2>\n' +
'  <ol class="wz__steps" data-wz-steps><li>Company</li><li>Plan</li><li>Security</li><li>Review</li></ol>\n' +
'  <form novalidate data-wz-form>\n' +
'    <fieldset class="wz__panel" data-step="0"><legend class="ae-text-heading-sm" tabindex="-1">Company details</legend>\n' +
'      <div class="ae-field"><label class="ae-label" for="wz-co">Company name</label><input class="ae-input" id="wz-co" name="company" required autocomplete="organization" aria-describedby="wz-co-e"><span class="ae-help ae-help--error" id="wz-co-e"></span></div>\n' +
'      <div class="ae-field"><label class="ae-label" for="wz-size">Team size</label><select class="ae-select" id="wz-size" name="size" required aria-describedby="wz-size-e"><option value="">Select…</option><option>1–10</option><option>11–50</option><option>51–250</option><option>250+</option></select><span class="ae-help ae-help--error" id="wz-size-e"></span></div>\n' +
'    </fieldset>\n' +
'    <fieldset class="wz__panel" data-step="1" hidden><legend class="ae-text-heading-sm" tabindex="-1">Choose a plan</legend>\n' +
'      <label class="wz__opt"><input type="radio" name="plan" value="Growth" checked> <span><strong>Growth</strong> · $29 per seat / month</span></label>\n' +
'      <label class="wz__opt"><input type="radio" name="plan" value="Business"> <span><strong>Business</strong> · $59 per seat / month</span></label>\n' +
'      <label class="wz__opt"><input type="radio" name="plan" value="Enterprise"> <span><strong>Enterprise</strong> · Custom pricing</span></label>\n' +
'    </fieldset>\n' +
'    <fieldset class="wz__panel" data-step="2" hidden><legend class="ae-text-heading-sm" tabindex="-1">Security</legend>\n' +
'      <div class="ae-field"><label class="ae-label" for="wz-domain">Allowed email domain</label><input class="ae-input" id="wz-domain" name="domain" required placeholder="company.com" aria-describedby="wz-domain-h wz-domain-e"><span class="ae-help" id="wz-domain-h">Only people with this domain can join.</span><span class="ae-help ae-help--error" id="wz-domain-e"></span></div>\n' +
'      <label class="ae-check"><input class="ae-switch" type="checkbox" name="mfa" role="switch" checked> Require two-factor authentication</label>\n' +
'    </fieldset>\n' +
'    <fieldset class="wz__panel" data-step="3" hidden><legend class="ae-text-heading-sm" tabindex="-1">Review</legend><dl class="wz__review" data-wz-review></dl></fieldset>\n' +
'    <div class="wz__done" data-wz-done hidden tabindex="-1">' + I('checkCircle') + '<h3 class="ae-text-heading-sm">Workspace created</h3><p class="ae-text-body-sm ae-muted">Invites are on their way.</p></div>\n' +
'    <div class="wz__nav"><button class="ae-btn" type="button" data-wz-back>Back</button><span class="ae-text-caption" data-wz-pos></span><button class="ae-btn ae-btn--primary" type="submit" data-wz-next>Continue</button></div>\n' +
'  </form>\n' +
'</section>',
    css:
'.wz { display: grid; gap: var(--aegis-space-16); max-width: 640px; }\n' +
'.wz h2 { margin: 0; }\n' +
'.wz__steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--aegis-space-8); list-style: none; margin: 0; padding: 0; counter-reset: wz; }\n' +
'.wz__steps li { counter-increment: wz; display: grid; gap: var(--aegis-space-6); font: var(--aegis-text-label-sm); color: var(--aegis-fg-muted); }\n' +
'.wz__steps li::before { content: counter(wz); display: grid; place-items: center; height: var(--aegis-space-6); border-radius: var(--aegis-radius-full); background: var(--aegis-border-default); color: transparent; overflow: hidden; }\n' +
'.wz__steps li.is-done::before, .wz__steps li[aria-current="step"]::before { background: var(--aegis-brand-default); }\n' +
'.wz__steps li[aria-current="step"] { color: var(--aegis-fg-default); }\n' +
'.wz__panel { display: grid; gap: var(--aegis-space-16); margin: 0; padding: 0; border: 0; min-width: 0; }\n' +
'.wz__panel legend { padding: 0; margin-bottom: var(--aegis-space-16); }\n' +
'.wz__panel legend:focus { outline: none; }\n' +
'.wz__opt { display: flex; gap: var(--aegis-space-12); align-items: center; padding: var(--aegis-space-12) var(--aegis-space-16); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-md); cursor: pointer; font: var(--aegis-text-body-sm); }\n' +
'.wz__opt:has(input:checked) { border-color: var(--aegis-brand-default); background: var(--aegis-brand-subtle); }\n' +
'.wz__opt input { accent-color: var(--aegis-brand-default); }\n' +
'.wz__review { display: grid; grid-template-columns: max-content 1fr auto; gap: var(--aegis-space-8) var(--aegis-space-16); margin: 0; font: var(--aegis-text-body-sm); }\n' +
'.wz__review dt { color: var(--aegis-fg-muted); } .wz__review dd { margin: 0; }\n' +
'.wz__review button { all: unset; cursor: pointer; color: var(--aegis-fg-link); font: var(--aegis-text-label-sm); border-radius: var(--aegis-radius-xs); }\n' +
'.wz__review button:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'.wz__nav { display: flex; align-items: center; justify-content: space-between; gap: var(--aegis-space-12); margin-top: var(--aegis-space-24); padding-top: var(--aegis-space-16); border-top: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.wz__done { display: grid; justify-items: center; gap: var(--aegis-space-8); padding: var(--aegis-space-24); text-align: center; }\n' +
'.wz__done svg { width: var(--aegis-size-icon-lg); height: var(--aegis-size-icon-lg); color: var(--aegis-success-default); }\n' +
'.wz__done h3, .wz__done p { margin: 0; } .wz__done:focus { outline: none; }\n' +
'.wz__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }',
    js: function (root) {
      var form = root.querySelector('[data-wz-form]'), panels = root.querySelectorAll('.wz__panel'), steps = root.querySelectorAll('[data-wz-steps] li');
      var back = root.querySelector('[data-wz-back]'), next = root.querySelector('[data-wz-next]'), step = 0, last = panels.length - 1;
      var names = ['Company', 'Plan', 'Security', 'Review'];
      function validate(i) {
        var bad = null;
        panels[i].querySelectorAll('[required]').forEach(function (el) {
          var msg = '';
          if (!el.value.trim()) msg = 'This field is required.';
          else if (el.name === 'domain' && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(el.value.trim())) msg = 'Enter a domain like company.com.';
          el.setAttribute('aria-invalid', msg ? 'true' : 'false');
          var err = root.querySelector('#' + el.id + '-e'); if (err) err.textContent = msg;
          if (msg && !bad) bad = el;
        });
        if (bad) bad.focus();
        return !bad;
      }
      function review() {
        var d = new FormData(form);
        var rows = [['Company', d.get('company') + ' · ' + d.get('size'), 0], ['Plan', d.get('plan'), 1], ['Domain', d.get('domain'), 2], ['Two-factor', d.get('mfa') ? 'Required' : 'Optional', 2]];
        root.querySelector('[data-wz-review]').innerHTML = rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + String(r[1]).replace(/</g, '&lt;') + '</dd><dd><button type="button" data-goto="' + r[2] + '">Edit<span class="wz__sr"> ' + r[0] + '</span></button></dd>'; }).join('');
      }
      function go(i, focus) {
        step = i;
        panels.forEach(function (p, j) { p.hidden = j !== i; });
        steps.forEach(function (s, j) {
          s.classList.toggle('is-done', j < i);
          if (j === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
          s.setAttribute('aria-label', names[j] + (j < i ? ', completed' : j === i ? ', current step' : ''));
        });
        back.disabled = i === 0;
        next.textContent = i === last ? 'Create workspace' : 'Continue';
        root.querySelector('[data-wz-pos]').textContent = 'Step ' + (i + 1) + ' of ' + panels.length;
        if (i === last) review();
        if (focus !== false) panels[i].querySelector('legend').focus();
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (step < last) { if (validate(step)) go(step + 1); return; }
        panels.forEach(function (p) { p.hidden = true; });
        root.querySelector('.wz__nav').hidden = true;
        steps.forEach(function (s) { s.classList.add('is-done'); s.removeAttribute('aria-current'); });
        var done = root.querySelector('[data-wz-done]'); done.hidden = false; done.focus();
      });
      back.addEventListener('click', function () { if (step > 0) go(step - 1); });
      root.addEventListener('click', function (e) { var b = e.target.closest('[data-goto]'); if (b) go(+b.getAttribute('data-goto')); });
      go(0, false);
    }
  });

  /* ------------------------------------------------------------------ Shipment tracker */
  R.register({
    id: 'status-tracker',
    name: 'Shipment status tracker',
    category: 'Workflow',
    tags: ['tracker', 'stepper', 'status', 'shipment', 'order', 'progress', 'logistics', 'timeline'],
    description: 'Horizontal progress tracker for an order or shipment, plus a dated event list and ETA summary.',
    a11y: ['Steps are an <ol> with aria-current="step"; completed/upcoming state is in visible text', 'Progress bar uses role="progressbar" with aria-valuenow and aria-valuetext'],
    behavior: ['Responsive: stacks vertically under 560px'],
    html:
'<section class="st ae-card" aria-labelledby="st-title">\n' +
'  <div class="ae-card__header"><div><h2 class="ae-text-heading-sm" id="st-title">Order SO-1044</h2><p class="ae-text-caption">Estimated delivery <strong>Thu, Nov 12</strong></p></div><span class="ae-badge ae-badge--warning ae-badge--dot">Delayed 1 day</span></div>\n' +
'  <div class="st__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="60" aria-valuetext="In transit, step 3 of 5"><span style="width:60%"></span></div>\n' +
'  <ol class="st__steps">\n' +
'    <li class="is-done"><strong>Ordered</strong><span>Nov 3</span></li>\n' +
'    <li class="is-done"><strong>Packed</strong><span>Nov 4</span></li>\n' +
'    <li aria-current="step"><strong>In transit</strong><span>Now</span></li>\n' +
'    <li><strong>Out for delivery</strong><span>Upcoming</span></li>\n' +
'    <li><strong>Delivered</strong><span>Upcoming</span></li>\n' +
'  </ol>\n' +
'  <h3 class="ae-text-label-md st__h">Events</h3>\n' +
'  <ul class="st__events">\n' +
'    <li><time datetime="2026-11-05T08:12">Nov 5, 08:12</time><span>Departed Rotterdam hub</span></li>\n' +
'    <li><time datetime="2026-11-04T21:40">Nov 4, 21:40</time><span>Weather hold at Rotterdam hub (+1 day)</span></li>\n' +
'    <li><time datetime="2026-11-04T10:02">Nov 4, 10:02</time><span>Packed and labelled</span></li>\n' +
'  </ul>\n' +
'</section>',
    css:
'.st__bar { height: var(--aegis-space-6); border-radius: var(--aegis-radius-full); background: var(--aegis-bg-surface-sunken); overflow: hidden; }\n' +
'.st__bar span { display: block; height: 100%; background: var(--aegis-brand-default); border-radius: inherit; }\n' +
'.st__steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--aegis-space-8); list-style: none; margin: var(--aegis-space-12) 0 0; padding: 0; }\n' +
'.st__steps li { display: grid; gap: var(--aegis-space-2); font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.st__steps strong { font: var(--aegis-text-label-sm); color: var(--aegis-fg-subtle); }\n' +
'.st__steps li.is-done strong { color: var(--aegis-fg-default); }\n' +
'.st__steps li.is-done strong::before { content: "\\2713  "; color: var(--aegis-success-fg); }\n' +
'.st__steps li[aria-current="step"] strong { color: var(--aegis-brand-fg); }\n' +
'@media (max-width: 560px) { .st__steps { grid-template-columns: 1fr; } }\n' +
'.st__h { margin: var(--aegis-space-24) 0 var(--aegis-space-8); }\n' +
'.st__events { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--aegis-space-8); font: var(--aegis-text-body-sm); }\n' +
'.st__events li { display: grid; grid-template-columns: 110px 1fr; gap: var(--aegis-space-12); }\n' +
'.st__events time { color: var(--aegis-fg-muted); font-variant-numeric: tabular-nums; }',
    js: null
  });

  /* ------------------------------------------------------------------ Approval card */
  R.register({
    id: 'approval-card',
    name: 'Approval request card',
    category: 'Workflow',
    tags: ['approval', 'review', 'request', 'approve', 'reject', 'expense', 'purchase order', 'decision'],
    description: 'Approval request with key facts, attachments and approve/reject actions; rejecting requires a reason. Shows the decided state afterwards.',
    a11y: ['Facts are a <dl>', 'Reject reason textarea is required, labelled and validated inline', 'The decision result is announced via role="status" and focus moves to it'],
    behavior: ['Approve finalises immediately', 'Reject reveals a reason field; confirming without text shows an error', 'Undo returns to pending'],
    html:
'<article class="ap ae-card" aria-labelledby="ap-title">\n' +
'  <header class="ap__head"><span class="ae-avatar" aria-hidden="true">MR</span><div><h2 class="ae-text-heading-sm" id="ap-title">Purchase order · Figma Enterprise seats</h2><p class="ae-text-caption">Requested by Mateo Ruiz · 2 hours ago</p></div><span class="ae-badge ae-badge--warning" data-ap-badge>Pending</span></header>\n' +
'  <dl class="ap__facts"><div><dt>Amount</dt><dd class="ae-text-numeric">$18,600.00</dd></div><div><dt>Cost center</dt><dd>Design · CC-204</dd></div><div><dt>Budget left</dt><dd>$42,100.00</dd></div></dl>\n' +
'  <div class="ap__reason" data-ap-reason hidden><div class="ae-field"><label class="ae-label" for="ap-why">Reason for rejection</label><textarea class="ae-textarea" id="ap-why" aria-describedby="ap-why-e"></textarea><span class="ae-help ae-help--error" id="ap-why-e"></span></div></div>\n' +
'  <footer class="ap__actions" data-ap-actions><button class="ae-btn" type="button" data-ap-reject>Reject</button><button class="ae-btn ae-btn--primary" type="button" data-ap-approve>' + I('check') + 'Approve</button></footer>\n' +
'  <p class="ap__result" role="status" tabindex="-1" data-ap-result></p>\n' +
'</article>',
    css:
'.ap { display: grid; gap: var(--aegis-space-16); max-width: 560px; }\n' +
'.ap__head { display: flex; gap: var(--aegis-space-12); align-items: flex-start; }\n' +
'.ap__head h2, .ap__head p { margin: 0; } .ap__head > div { flex: 1; }\n' +
'.ap__facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--aegis-space-12); margin: 0; padding: var(--aegis-space-12); border-radius: var(--aegis-radius-md); background: var(--aegis-bg-surface-sunken); }\n' +
'.ap__facts dt { font: var(--aegis-text-caption); color: var(--aegis-fg-muted); } .ap__facts dd { margin: 0; font: var(--aegis-text-label-md); }\n' +
'.ap__actions { display: flex; justify-content: flex-end; gap: var(--aegis-space-8); }\n' +
'.ap__result { margin: 0; font: var(--aegis-text-body-sm); } .ap__result:empty { display: none; } .ap__result:focus { outline: none; }\n' +
'.ap__result button { all: unset; cursor: pointer; color: var(--aegis-fg-link); font: var(--aegis-text-label-sm); margin-left: var(--aegis-space-8); }',
    js: function (root) {
      var badge = root.querySelector('[data-ap-badge]'), actions = root.querySelector('[data-ap-actions]'), reasonBox = root.querySelector('[data-ap-reason]');
      var why = root.querySelector('#ap-why'), err = root.querySelector('#ap-why-e'), result = root.querySelector('[data-ap-result]'), rejectBtn = root.querySelector('[data-ap-reject]');
      function decide(ok, note) {
        actions.hidden = true; reasonBox.hidden = true;
        badge.className = 'ae-badge ae-badge--' + (ok ? 'success' : 'danger'); badge.textContent = ok ? 'Approved' : 'Rejected';
        result.innerHTML = (ok ? 'Approved by you just now.' : 'Rejected: “' + note.replace(/</g, '&lt;') + '”') + '<button type="button" data-ap-undo>Undo</button>';
        result.focus();
      }
      root.querySelector('[data-ap-approve]').addEventListener('click', function () { decide(true); });
      rejectBtn.addEventListener('click', function () {
        if (reasonBox.hidden) { reasonBox.hidden = false; rejectBtn.textContent = 'Confirm rejection'; rejectBtn.classList.add('ae-btn--danger'); why.focus(); return; }
        var v = why.value.trim();
        why.setAttribute('aria-invalid', v ? 'false' : 'true'); err.textContent = v ? '' : 'Add a reason so the requester knows what to change.';
        if (!v) { why.focus(); return; }
        decide(false, v);
      });
      result.addEventListener('click', function (e) {
        if (!e.target.closest('[data-ap-undo]')) return;
        result.innerHTML = ''; actions.hidden = false; badge.className = 'ae-badge ae-badge--warning'; badge.textContent = 'Pending';
        rejectBtn.textContent = 'Reject'; rejectBtn.classList.remove('ae-btn--danger'); why.value = '';
        root.querySelector('[data-ap-approve]').focus();
      });
    }
  });
})();
