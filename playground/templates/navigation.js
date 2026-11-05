/* AegisUI Playground — Navigation templates */
(function () {
  'use strict';
  var R = window.AegisPlaygroundTemplates, I = R.icon;

  /* ------------------------------------------------------------------ Command palette */
  R.register({
    id: 'command-palette',
    name: 'Command palette (⌘K)',
    category: 'Navigation',
    tags: ['command palette', 'cmdk', 'search', 'spotlight', 'quick actions', 'keyboard', 'launcher', 'combobox'],
    description: 'Modal command palette opened with ⌘K / Ctrl+K: fuzzy search, grouped results, keyboard navigation and recent commands.',
    a11y: [
      'Native <dialog> opened with showModal() (focus is trapped and restored)',
      'Input is role="combobox" with aria-expanded, aria-controls and aria-activedescendant',
      'Results are role="listbox" with role="option" items; groups use role="group" + aria-label',
      '↑/↓ move, Enter runs, Escape closes; the result count is announced'
    ],
    behavior: ['Fuzzy match: characters must appear in order; matches are highlighted', 'Running a command closes the palette and shows a confirmation', 'Recently run commands appear first when the query is empty'],
    html:
'<div class="cp">\n' +
'  <button class="ae-btn cp__trigger" type="button" data-cp-open>' + I('search') + '<span>Search or run a command…</span><kbd class="ae-kbd" data-cp-kbd>⌘K</kbd></button>\n' +
'  <p class="cp__last ae-text-body-sm" role="status" data-cp-last></p>\n' +
'  <dialog class="cp__dialog" aria-label="Command palette" data-cp-dialog>\n' +
'    <div class="cp__search">' + I('search') + '<input class="cp__input" type="text" role="combobox" aria-expanded="true" aria-controls="cp-list" aria-autocomplete="list" aria-label="Search commands" placeholder="Type a command or search…" autocomplete="off" spellcheck="false" data-cp-input><kbd class="ae-kbd">Esc</kbd></div>\n' +
'    <div class="cp__list" id="cp-list" role="listbox" aria-label="Commands" data-cp-list></div>\n' +
'    <footer class="cp__foot"><span><kbd class="ae-kbd">↑</kbd><kbd class="ae-kbd">↓</kbd> navigate</span><span><kbd class="ae-kbd">↵</kbd> run</span><span class="cp__count" aria-live="polite" data-cp-count></span></footer>\n' +
'  </dialog>\n' +
'</div>',
    css:
'.cp__trigger { width: min(420px, 100%); justify-content: flex-start; color: var(--aegis-fg-muted); }\n' +
'.cp__trigger span { flex: 1; text-align: left; }\n' +
'.cp__last { margin: var(--aegis-space-8) 0 0; color: var(--aegis-fg-muted); }\n' +
'.cp__dialog { width: min(600px, calc(100vw - var(--aegis-space-32))); max-height: min(520px, 80vh); padding: 0; border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); background: var(--aegis-bg-surface-raised); color: var(--aegis-fg-default); box-shadow: var(--aegis-shadow-xl); overflow: hidden; }\n' +
'.cp__dialog[open] { display: flex; flex-direction: column; }\n' +
'.cp__dialog::backdrop { background: var(--aegis-bg-overlay); }\n' +
'.cp__search { display: flex; align-items: center; gap: var(--aegis-space-12); padding: 0 var(--aegis-space-16); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.cp__search svg { width: var(--aegis-size-icon-md); height: var(--aegis-size-icon-md); color: var(--aegis-fg-muted); flex: none; }\n' +
'.cp__input { flex: 1; min-width: 0; height: var(--aegis-size-control-lg); border: 0; background: transparent; color: inherit; font: var(--aegis-text-body-lg); outline: none; }\n' +
'.cp__list { flex: 1; overflow-y: auto; padding: var(--aegis-space-8); }\n' +
'.cp__group-label { padding: var(--aegis-space-8) var(--aegis-space-8) var(--aegis-space-4); font: var(--aegis-text-overline); letter-spacing: var(--aegis-text-overline-tracking); text-transform: var(--aegis-text-overline-transform); color: var(--aegis-fg-subtle); }\n' +
'.cp__opt { display: flex; align-items: center; gap: var(--aegis-space-12); min-height: var(--aegis-size-control-md); padding: 0 var(--aegis-space-8); border-radius: var(--aegis-radius-md); cursor: pointer; font: var(--aegis-text-body-sm); }\n' +
'.cp__opt svg { width: var(--aegis-size-icon-sm); height: var(--aegis-size-icon-sm); color: var(--aegis-fg-muted); flex: none; }\n' +
'.cp__opt span { flex: 1; } .cp__opt small { color: var(--aegis-fg-subtle); font: var(--aegis-text-caption); }\n' +
'.cp__opt[aria-selected="true"] { background: var(--aegis-bg-selected); }\n' +
'.cp__opt[aria-selected="true"] svg { color: var(--aegis-brand-fg); }\n' +
'.cp__opt mark { background: transparent; color: var(--aegis-brand-fg); font-weight: var(--aegis-font-weight-semibold); }\n' +
'.cp__empty { padding: var(--aegis-space-24); text-align: center; color: var(--aegis-fg-muted); font: var(--aegis-text-body-sm); }\n' +
'.cp__foot { display: flex; gap: var(--aegis-space-16); align-items: center; padding: var(--aegis-space-8) var(--aegis-space-16); border-top: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.cp__foot .ae-kbd { margin-right: var(--aegis-space-2); } .cp__count { margin-left: auto; }',
    js: function (root) {
      var ICON = { nav: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>', act: '<path d="M12 5v14M5 12h14"/>', set: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>' };
      var cmds = [
        { g: 'Navigate', i: 'nav', t: 'Go to Dashboard', k: 'G D' }, { g: 'Navigate', i: 'nav', t: 'Go to Invoices', k: 'G I' }, { g: 'Navigate', i: 'nav', t: 'Go to Customers', k: 'G C' },
        { g: 'Actions', i: 'act', t: 'Create invoice', k: 'C' }, { g: 'Actions', i: 'act', t: 'Invite teammate' }, { g: 'Actions', i: 'act', t: 'Export report as CSV' },
        { g: 'Settings', i: 'set', t: 'Toggle dark mode' }, { g: 'Settings', i: 'set', t: 'Manage API keys' }, { g: 'Settings', i: 'set', t: 'Billing & plans' }
      ];
      var dlg = root.querySelector('[data-cp-dialog]'), input = root.querySelector('[data-cp-input]'), list = root.querySelector('[data-cp-list]');
      var recent = [], shown = [], active = 0, opener = null;
      var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
      root.querySelector('[data-cp-kbd]').textContent = mac ? '⌘K' : 'Ctrl K';
      function score(q, t) {
        if (!q) return { s: 1, hit: [] };
        var tl = t.toLowerCase(), ql = q.toLowerCase(), pos = -1, hit = [], s = 0;
        for (var i = 0; i < ql.length; i++) {
          var p = tl.indexOf(ql[i], pos + 1); if (p < 0) return null;
          s += p === pos + 1 ? 3 : 1; if (p === 0 || tl[p - 1] === ' ') s += 2; hit.push(p); pos = p;
        }
        return { s: s, hit: hit };
      }
      function mark(t, hit) { return t.split('').map(function (c, i) { c = c.replace(/</g, '&lt;'); return hit.indexOf(i) > -1 ? '<mark>' + c + '</mark>' : c; }).join(''); }
      function render() {
        var q = input.value.trim();
        shown = cmds.map(function (c) { var m = score(q, c.t); return m && { c: c, m: m }; }).filter(Boolean);
        if (q) shown.sort(function (a, b) { return b.m.s - a.m.s; });
        else shown.sort(function (a, b) { return (recent.indexOf(a.c.t) < 0 ? 99 : recent.indexOf(a.c.t)) - (recent.indexOf(b.c.t) < 0 ? 99 : recent.indexOf(b.c.t)); });
        var groups = [];
        shown.forEach(function (x) { var g = !q && recent.indexOf(x.c.t) > -1 ? 'Recent' : x.c.g; var grp = groups.filter(function (y) { return y.name === g; })[0]; if (!grp) groups.push(grp = { name: g, items: [] }); grp.items.push(x); });
        shown = []; groups.forEach(function (g) { shown = shown.concat(g.items); });
        active = Math.min(active, Math.max(0, shown.length - 1));
        var n = 0;
        list.innerHTML = groups.map(function (g, gi) {
          return '<div role="group" aria-labelledby="cp-g-' + gi + '"><div class="cp__group-label" id="cp-g-' + gi + '">' + g.name + '</div>' + g.items.map(function (x) {
            var i = n++;
            return '<div class="cp__opt" role="option" id="cp-o-' + i + '" data-i="' + i + '" aria-selected="' + (i === active) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' + ICON[x.c.i] + '</svg><span>' + mark(x.c.t, x.m.hit) + '</span>' + (x.c.k ? '<small>' + x.c.k + '</small>' : '') + '</div>';
          }).join('') + '</div>';
        }).join('') || '<p class="cp__empty">No commands match “' + q.replace(/</g, '&lt;') + '”.</p>';
        if (shown.length) input.setAttribute('aria-activedescendant', 'cp-o-' + active); else input.removeAttribute('aria-activedescendant');
        root.querySelector('[data-cp-count]').textContent = shown.length + ' result' + (shown.length === 1 ? '' : 's');
        var el = list.querySelector('[aria-selected="true"]'); if (el) el.scrollIntoView({ block: 'nearest' });
      }
      function open() { opener = document.activeElement; input.value = ''; active = 0; render(); dlg.showModal(); input.focus(); }
      function close() { dlg.close(); }
      function run(i) {
        var x = shown[i]; if (!x) return;
        recent = [x.c.t].concat(recent.filter(function (t) { return t !== x.c.t; })).slice(0, 3);
        close(); root.querySelector('[data-cp-last]').textContent = 'Ran “' + x.c.t + '”.';
      }
      dlg.addEventListener('close', function () { if (opener && opener.focus) opener.focus(); });
      root.querySelector('[data-cp-open]').addEventListener('click', open);
      document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? close() : open(); } });
      input.addEventListener('input', function () { active = 0; render(); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % Math.max(1, shown.length); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + shown.length) % Math.max(1, shown.length); render(); }
        else if (e.key === 'Enter') { e.preventDefault(); run(active); }
      });
      list.addEventListener('mousemove', function (e) { var o = e.target.closest('[data-i]'); if (o && +o.getAttribute('data-i') !== active) { active = +o.getAttribute('data-i'); render(); } });
      list.addEventListener('click', function (e) { var o = e.target.closest('[data-i]'); if (o) run(+o.getAttribute('data-i')); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    }
  });

  /* ------------------------------------------------------------------ Tabs */
  R.register({
    id: 'tabs',
    name: 'Accessible tabs',
    category: 'Navigation',
    tags: ['tabs', 'tablist', 'segmented', 'sections', 'panels'],
    description: 'WAI-ARIA tabs with automatic activation, arrow/Home/End keys, counts and lazily rendered panels.',
    a11y: ['role="tablist" / "tab" / "tabpanel" with aria-controls and aria-labelledby', 'Only the selected tab is in the tab order (roving tabindex)', '←/→ move and activate, Home/End jump to first/last', 'Panels are focusable (tabindex="0") when they contain no focusable content'],
    behavior: ['Selected tab is remembered while the page is open'],
    html:
'<div class="tb">\n' +
'  <div class="ae-tabs" role="tablist" aria-label="Project sections">\n' +
'    <button class="ae-tab" role="tab" id="tb-t1" aria-controls="tb-p1" aria-selected="true">Overview</button>\n' +
'    <button class="ae-tab" role="tab" id="tb-t2" aria-controls="tb-p2" aria-selected="false" tabindex="-1">Issues <span class="ae-badge">12</span></button>\n' +
'    <button class="ae-tab" role="tab" id="tb-t3" aria-controls="tb-p3" aria-selected="false" tabindex="-1">Deployments</button>\n' +
'    <button class="ae-tab" role="tab" id="tb-t4" aria-controls="tb-p4" aria-selected="false" tabindex="-1">Settings</button>\n' +
'  </div>\n' +
'  <div class="tb__panel" role="tabpanel" id="tb-p1" aria-labelledby="tb-t1" tabindex="0"><h3 class="ae-text-heading-sm">Overview</h3><p class="ae-text-body-sm ae-muted">3 services healthy · last deploy 18 minutes ago.</p></div>\n' +
'  <div class="tb__panel" role="tabpanel" id="tb-p2" aria-labelledby="tb-t2" tabindex="0" hidden><h3 class="ae-text-heading-sm">Issues</h3><p class="ae-text-body-sm ae-muted">12 open, 4 assigned to you.</p></div>\n' +
'  <div class="tb__panel" role="tabpanel" id="tb-p3" aria-labelledby="tb-t3" tabindex="0" hidden><h3 class="ae-text-heading-sm">Deployments</h3><p class="ae-text-body-sm ae-muted">Production · v2.18.4 · healthy.</p></div>\n' +
'  <div class="tb__panel" role="tabpanel" id="tb-p4" aria-labelledby="tb-t4" tabindex="0" hidden><h3 class="ae-text-heading-sm">Settings</h3><p class="ae-text-body-sm ae-muted">Branch protection is on for main.</p></div>\n' +
'</div>',
    css:
'.tb { background: var(--aegis-bg-surface); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); }\n' +
'.tb .ae-tabs { padding: 0 var(--aegis-space-16); }\n' +
'.tb .ae-tab { display: inline-flex; align-items: center; gap: var(--aegis-space-6); }\n' +
'.tb .ae-tab:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: calc(var(--aegis-focus-ring-width) * -1); }\n' +
'.tb__panel { padding: var(--aegis-space-16); }\n' +
'.tb__panel h3 { margin: 0 0 var(--aegis-space-4); } .tb__panel p { margin: 0; }\n' +
'.tb__panel:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: calc(var(--aegis-focus-ring-width) * -1); border-radius: var(--aegis-radius-lg); }',
    js: function (root) {
      var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
      function select(t, focus) {
        tabs.forEach(function (x) {
          var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
          root.querySelector('#' + x.getAttribute('aria-controls')).hidden = !on;
        });
        if (focus) t.focus();
      }
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { select(t); });
        t.addEventListener('keydown', function (e) {
          var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
          if (n === undefined) return;
          e.preventDefault(); select(tabs[(n + tabs.length) % tabs.length], true);
        });
      });
    }
  });

  /* ------------------------------------------------------------------ App shell sidebar */
  R.register({
    id: 'app-shell',
    name: 'App shell with collapsible sidebar',
    category: 'Navigation',
    tags: ['sidebar', 'navigation', 'app shell', 'layout', 'nav', 'collapse', 'menu', 'dashboard layout'],
    description: 'Application frame: collapsible sidebar with sections, active state and badges, plus a top bar and content region.',
    a11y: ['<nav aria-label> with aria-current="page" on the active link', 'Collapse button uses aria-expanded and aria-controls; labels stay available as tooltips/aria-label when collapsed', 'Includes a skip link to main content'],
    behavior: ['Collapsed state persists in localStorage', 'Clicking a link marks it current'],
    html:
'<div class="sb" data-sb>\n' +
'  <a class="sb__skip" href="#sb-main">Skip to content</a>\n' +
'  <nav class="ae-nav sb__nav" id="sb-nav" aria-label="Primary">\n' +
'    <div class="sb__brand"><strong>Northwind</strong></div>\n' +
'    <a class="ae-nav__item" href="#" aria-current="page">' + I('home') + '<span>Overview</span></a>\n' +
'    <a class="ae-nav__item" href="#">' + I('chart') + '<span>Analytics</span></a>\n' +
'    <a class="ae-nav__item" href="#">' + I('inbox') + '<span>Inbox</span><span class="ae-badge ae-badge--brand">8</span></a>\n' +
'    <div class="ae-nav__section">Workspace</div>\n' +
'    <a class="ae-nav__item" href="#">' + I('users') + '<span>Team</span></a>\n' +
'    <a class="ae-nav__item" href="#">' + I('settings') + '<span>Settings</span></a>\n' +
'  </nav>\n' +
'  <div class="sb__main">\n' +
'    <header class="sb__top"><button class="ae-btn ae-btn--ghost ae-btn--icon" type="button" aria-controls="sb-nav" aria-expanded="true" aria-label="Collapse navigation" data-sb-toggle>' + I('menu') + '</button><h1 class="ae-text-heading-sm" data-sb-title>Overview</h1></header>\n' +
'    <main class="sb__content" id="sb-main" tabindex="-1"><p class="ae-text-body-sm ae-muted">Page content goes here.</p></main>\n' +
'  </div>\n' +
'</div>',
    css:
'.sb { display: flex; min-height: 380px; background: var(--aegis-bg-canvas); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); overflow: hidden; position: relative; }\n' +
'.sb__skip { position: absolute; left: var(--aegis-space-8); top: calc(var(--aegis-space-48) * -1); z-index: 2; padding: var(--aegis-space-8) var(--aegis-space-12); background: var(--aegis-brand-default); color: var(--aegis-fg-on-brand); border-radius: var(--aegis-radius-sm); }\n' +
'.sb__skip:focus { top: var(--aegis-space-8); }\n' +
'.sb__nav { flex: none; transition: width var(--aegis-duration-base) var(--aegis-easing-standard); overflow: hidden; }\n' +
'.sb__brand { display: flex; align-items: center; min-height: var(--aegis-nav-item-height); padding: 0 var(--aegis-space-8); margin-bottom: var(--aegis-space-8); font: var(--aegis-text-label-lg); white-space: nowrap; }\n' +
'.sb .ae-nav__item span:not(.ae-badge) { white-space: nowrap; }\n' +
'.sb.is-collapsed .sb__nav { width: calc(var(--aegis-size-icon-sm) + var(--aegis-space-16) + var(--aegis-space-24)); }\n' +
'.sb.is-collapsed .ae-nav__item span, .sb.is-collapsed .ae-nav__section, .sb.is-collapsed .sb__brand { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }\n' +
'.sb__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }\n' +
'.sb__top { display: flex; align-items: center; gap: var(--aegis-space-8); padding: var(--aegis-space-8) var(--aegis-space-16); background: var(--aegis-bg-surface); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-default); }\n' +
'.sb__top h1 { margin: 0; }\n' +
'.sb__content { padding: var(--aegis-space-24); } .sb__content:focus { outline: none; }',
    js: function (root) {
      var btn = root.querySelector('[data-sb-toggle]'), KEY = 'aegis-sb-collapsed';
      function set(c) {
        root.classList.toggle('is-collapsed', c);
        btn.setAttribute('aria-expanded', String(!c));
        btn.setAttribute('aria-label', c ? 'Expand navigation' : 'Collapse navigation');
        root.querySelectorAll('.ae-nav__item').forEach(function (a) { if (c) a.setAttribute('title', a.textContent.trim()); else a.removeAttribute('title'); });
        try { localStorage.setItem(KEY, c ? '1' : '0'); } catch (e) {}
      }
      var saved = false; try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
      set(saved);
      btn.addEventListener('click', function () { set(!root.classList.contains('is-collapsed')); });
      root.querySelector('.sb__nav').addEventListener('click', function (e) {
        var a = e.target.closest('.ae-nav__item'); if (!a) return;
        e.preventDefault();
        root.querySelectorAll('.ae-nav__item').forEach(function (x) { x.removeAttribute('aria-current'); });
        a.setAttribute('aria-current', 'page');
        root.querySelector('[data-sb-title]').textContent = a.querySelector('span').textContent;
      });
    }
  });

  /* ------------------------------------------------------------------ Page header */
  R.register({
    id: 'page-header',
    name: 'Page header with breadcrumb & actions menu',
    category: 'Navigation',
    tags: ['page header', 'breadcrumb', 'title', 'actions', 'menu button', 'dropdown', 'overflow menu'],
    description: 'Breadcrumb trail, page title with status metadata, primary actions and an overflow menu button with full keyboard support.',
    a11y: ['Breadcrumb is <nav aria-label="Breadcrumb"> with an <ol> and aria-current="page" on the last item', 'Menu button: aria-haspopup="menu", aria-expanded; items are role="menuitem"', '↑/↓/Home/End move through items, Escape closes and returns focus'],
    behavior: ['Menu closes on outside click or Tab', 'The destructive item is visually separated'],
    html:
'<header class="ph">\n' +
'  <nav aria-label="Breadcrumb"><ol class="ph__crumbs"><li><a class="ae-link" href="#">Customers</a></li><li><a class="ae-link" href="#">Enterprise</a></li><li><span aria-current="page">Northwind Health</span></li></ol></nav>\n' +
'  <div class="ph__row">\n' +
'    <div><h1 class="ae-text-heading-lg">Northwind Health</h1><p class="ph__meta"><span class="ae-badge ae-badge--success ae-badge--dot">Active</span><span>Customer since 2021</span><span>Owner: Priya Shah</span></p></div>\n' +
'    <div class="ph__actions">\n' +
'      <button class="ae-btn" type="button">Share</button>\n' +
'      <button class="ae-btn ae-btn--primary" type="button">New opportunity</button>\n' +
'      <div class="ph__menu-wrap">\n' +
'        <button class="ae-btn ae-btn--icon" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="ph-menu" aria-label="More actions" data-ph-btn>' + I('dots') + '</button>\n' +
'        <ul class="ph__menu" id="ph-menu" role="menu" aria-label="More actions" hidden>\n' +
'          <li role="none"><button role="menuitem" type="button" tabindex="-1">Duplicate</button></li>\n' +
'          <li role="none"><button role="menuitem" type="button" tabindex="-1">Export as PDF</button></li>\n' +
'          <li role="none"><button role="menuitem" type="button" tabindex="-1">Archive</button></li>\n' +
'          <li role="separator"></li>\n' +
'          <li role="none"><button role="menuitem" type="button" tabindex="-1" class="ph__danger">Delete customer</button></li>\n' +
'        </ul>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'  <p class="ae-text-caption" role="status" data-ph-status></p>\n' +
'</header>',
    css:
'.ph { display: grid; gap: var(--aegis-space-8); }\n' +
'.ph__crumbs { display: flex; flex-wrap: wrap; gap: var(--aegis-space-8); list-style: none; margin: 0; padding: 0; font: var(--aegis-text-body-sm); color: var(--aegis-fg-muted); }\n' +
'.ph__crumbs li + li::before { content: "/"; margin-right: var(--aegis-space-8); color: var(--aegis-fg-subtle); }\n' +
'.ph__row { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: var(--aegis-space-16); }\n' +
'.ph h1 { margin: 0; }\n' +
'.ph__meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--aegis-space-12); margin: var(--aegis-space-8) 0 0; font: var(--aegis-text-body-sm); color: var(--aegis-fg-muted); }\n' +
'.ph__actions { display: flex; gap: var(--aegis-space-8); }\n' +
'.ph__menu-wrap { position: relative; }\n' +
'.ph__menu { position: absolute; right: 0; top: calc(100% + var(--aegis-space-4)); z-index: 10; min-width: 200px; margin: 0; padding: var(--aegis-space-4); list-style: none; background: var(--aegis-bg-surface-raised); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-md); box-shadow: var(--aegis-shadow-lg); }\n' +
'.ph__menu button { all: unset; box-sizing: border-box; display: block; width: 100%; padding: var(--aegis-space-8) var(--aegis-space-12); border-radius: var(--aegis-radius-sm); font: var(--aegis-text-body-sm); cursor: pointer; }\n' +
'.ph__menu button:hover, .ph__menu button:focus { background: var(--aegis-bg-hover); outline: none; }\n' +
'.ph__menu button:focus-visible { box-shadow: inset 0 0 0 var(--aegis-focus-ring-width) var(--aegis-focus-ring-color); }\n' +
'.ph__menu [role="separator"] { height: 0; margin: var(--aegis-space-4) 0; border-top: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ph__danger { color: var(--aegis-danger-fg); }',
    js: function (root) {
      var btn = root.querySelector('[data-ph-btn]'), menu = root.querySelector('#ph-menu');
      var items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));
      function open(focusLast) { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); items[focusLast ? items.length - 1 : 0].focus(); }
      function close(refocus) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus(); }
      btn.addEventListener('click', function () { menu.hidden ? open() : close(); });
      btn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); open(); } if (e.key === 'ArrowUp') { e.preventDefault(); open(true); } });
      menu.addEventListener('keydown', function (e) {
        var i = items.indexOf(document.activeElement);
        var n = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
        if (n !== undefined) { e.preventDefault(); items[(n + items.length) % items.length].focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); close(true); }
        else if (e.key === 'Tab') close(false);
      });
      menu.addEventListener('click', function (e) { var it = e.target.closest('[role="menuitem"]'); if (!it) return; root.querySelector('[data-ph-status]').textContent = it.textContent + ' selected.'; close(true); });
      document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.ph__menu-wrap')) close(false); });
    }
  });

  /* ------------------------------------------------------------------ Tree view */
  R.register({
    id: 'tree-view',
    name: 'Tree view / file explorer',
    category: 'Navigation',
    tags: ['tree', 'treeview', 'file explorer', 'hierarchy', 'folders', 'nested', 'outline'],
    description: 'Hierarchical tree with expand/collapse, selection and the full WAI-ARIA tree keyboard model.',
    a11y: ['role="tree" / "treeitem" / "group" with aria-expanded on parents and aria-selected on the selection', 'Roving tabindex: one item has tabindex="0"', '↑/↓ move, → expands or enters, ← collapses or goes to parent, Home/End, Enter selects, * expands siblings'],
    behavior: ['Clicking a folder toggles it; clicking a file selects it', 'The selected path is shown below the tree'],
    html:
'<div class="tv ae-card">\n' +
'  <ul class="tv__tree" role="tree" aria-label="Project files" data-tv-tree>\n' +
'    <li role="treeitem" aria-expanded="true" tabindex="0"><span class="tv__row">' + I('folder') + 'src</span>\n' +
'      <ul role="group">\n' +
'        <li role="treeitem" aria-expanded="false" tabindex="-1"><span class="tv__row">' + I('folder') + 'components</span>\n' +
'          <ul role="group"><li role="treeitem" tabindex="-1"><span class="tv__row">' + I('file') + 'Button.tsx</span></li><li role="treeitem" tabindex="-1"><span class="tv__row">' + I('file') + 'DataGrid.tsx</span></li></ul></li>\n' +
'        <li role="treeitem" aria-expanded="false" tabindex="-1"><span class="tv__row">' + I('folder') + 'tokens</span>\n' +
'          <ul role="group"><li role="treeitem" tabindex="-1"><span class="tv__row">' + I('file') + 'tokens.json</span></li><li role="treeitem" tabindex="-1"><span class="tv__row">' + I('file') + 'tokens.css</span></li></ul></li>\n' +
'        <li role="treeitem" tabindex="-1"><span class="tv__row">' + I('file') + 'main.ts</span></li>\n' +
'      </ul></li>\n' +
'    <li role="treeitem" tabindex="-1"><span class="tv__row">' + I('file') + 'CLAUDE.md</span></li>\n' +
'    <li role="treeitem" tabindex="-1"><span class="tv__row">' + I('file') + 'package.json</span></li>\n' +
'  </ul>\n' +
'  <p class="tv__path ae-text-caption" aria-live="polite" data-tv-path>Nothing selected</p>\n' +
'</div>',
    css:
'.tv { max-width: 360px; }\n' +
'.tv__tree, .tv__tree ul { list-style: none; margin: 0; padding: 0; }\n' +
'.tv__tree ul { padding-left: var(--aegis-space-16); }\n' +
'.tv__tree [aria-expanded="false"] > ul { display: none; }\n' +
'.tv__tree li { outline: none; }\n' +
'.tv__row { display: flex; align-items: center; gap: var(--aegis-space-8); min-height: var(--aegis-size-control-sm); padding: 0 var(--aegis-space-8); border-radius: var(--aegis-radius-sm); font: var(--aegis-text-body-sm); cursor: pointer; }\n' +
'.tv__row svg { width: var(--aegis-size-icon-sm); height: var(--aegis-size-icon-sm); color: var(--aegis-fg-muted); flex: none; }\n' +
'.tv__tree [aria-expanded] > .tv__row::before { content: "\\25B8"; width: var(--aegis-space-8); color: var(--aegis-fg-subtle); transition: transform var(--aegis-duration-fast) var(--aegis-easing-standard); }\n' +
'.tv__tree [aria-expanded="true"] > .tv__row::before { transform: rotate(90deg); }\n' +
'.tv__tree li:not([aria-expanded]) > .tv__row { padding-left: var(--aegis-space-24); }\n' +
'.tv__row:hover { background: var(--aegis-bg-hover); }\n' +
'.tv__tree li:focus-visible > .tv__row { box-shadow: inset 0 0 0 var(--aegis-focus-ring-width) var(--aegis-focus-ring-color); }\n' +
'.tv__tree [aria-selected="true"] > .tv__row { background: var(--aegis-bg-selected); color: var(--aegis-brand-fg); }\n' +
'.tv__path { margin: var(--aegis-space-12) 0 0; font-family: var(--aegis-font-mono); }',
    js: function (root) {
      var tree = root.querySelector('[data-tv-tree]');
      function visible() { return Array.prototype.slice.call(tree.querySelectorAll('[role="treeitem"]')).filter(function (li) { var p = li.parentElement.closest('[role="treeitem"]'); while (p) { if (p.getAttribute('aria-expanded') === 'false') return false; p = p.parentElement.closest('[role="treeitem"]'); } return true; }); }
      function focus(li) { tree.querySelectorAll('[role="treeitem"]').forEach(function (x) { x.tabIndex = -1; }); li.tabIndex = 0; li.focus(); }
      function label(li) { return li.querySelector('.tv__row').textContent.trim(); }
      function select(li) {
        tree.querySelectorAll('[aria-selected]').forEach(function (x) { x.removeAttribute('aria-selected'); });
        li.setAttribute('aria-selected', 'true');
        var path = [label(li)], p = li.parentElement.closest('[role="treeitem"]');
        while (p) { path.unshift(label(p)); p = p.parentElement.closest('[role="treeitem"]'); }
        root.querySelector('[data-tv-path]').textContent = path.join(' / ');
      }
      tree.addEventListener('click', function (e) {
        var li = e.target.closest('[role="treeitem"]'); if (!li || !e.target.closest('.tv__row')) return;
        if (li.hasAttribute('aria-expanded')) li.setAttribute('aria-expanded', String(li.getAttribute('aria-expanded') !== 'true'));
        select(li); focus(li);
      });
      tree.addEventListener('keydown', function (e) {
        var li = e.target.closest('[role="treeitem"]'); if (!li) return;
        var v = visible(), i = v.indexOf(li), exp = li.getAttribute('aria-expanded');
        var handled = true;
        switch (e.key) {
          case 'ArrowDown': if (v[i + 1]) focus(v[i + 1]); break;
          case 'ArrowUp': if (v[i - 1]) focus(v[i - 1]); break;
          case 'Home': focus(v[0]); break;
          case 'End': focus(v[v.length - 1]); break;
          case 'ArrowRight': if (exp === 'false') li.setAttribute('aria-expanded', 'true'); else if (exp === 'true') focus(li.querySelector('[role="treeitem"]')); break;
          case 'ArrowLeft': if (exp === 'true') li.setAttribute('aria-expanded', 'false'); else { var p = li.parentElement.closest('[role="treeitem"]'); if (p) focus(p); } break;
          case 'Enter': case ' ': if (exp) li.setAttribute('aria-expanded', String(exp !== 'true')); select(li); break;
          case '*': Array.prototype.forEach.call(li.parentElement.children, function (s) { if (s.hasAttribute('aria-expanded')) s.setAttribute('aria-expanded', 'true'); }); break;
          default: handled = false;
        }
        if (handled) { e.preventDefault(); e.stopPropagation(); }
      });
    }
  });
})();
