/* AegisUI Playground — Feedback, overlay & accessibility templates */
(function () {
  'use strict';
  var R = window.AegisPlaygroundTemplates, I = R.icon;

  /* ------------------------------------------------------------------ Notification center */
  R.register({
    id: 'notification-center',
    name: 'Notification center',
    category: 'Feedback',
    tags: ['notifications', 'inbox', 'bell', 'popover', 'unread', 'alerts', 'activity', 'mentions'],
    description: 'Bell button with unread count opening a panel with All/Unread/Mentions filters, mark-as-read, mark-all and dismiss.',
    a11y: ['Bell button: aria-expanded, aria-controls and an aria-label that includes the unread count', 'Panel is a labelled region; filter buttons use aria-pressed', 'Escape or outside click closes and returns focus to the bell', 'Unread state is conveyed with text ("Unread") for assistive tech, not just a dot'],
    behavior: ['Clicking an item marks it read', 'Dismiss removes an item; empty filters show an empty state'],
    html:
'<div class="nc">\n' +
'  <button class="ae-btn ae-btn--icon nc__bell" type="button" aria-expanded="false" aria-controls="nc-panel" data-nc-bell>' + I('bell') + '<span class="nc__count" data-nc-count aria-hidden="true"></span></button>\n' +
'  <section class="nc__panel" id="nc-panel" aria-labelledby="nc-title" hidden data-nc-panel>\n' +
'    <header class="nc__head"><h2 class="ae-text-label-lg" id="nc-title">Notifications</h2><button class="ae-btn ae-btn--ghost ae-btn--sm" type="button" data-nc-all>Mark all as read</button></header>\n' +
'    <div class="nc__filters" role="group" aria-label="Filter notifications"><button type="button" aria-pressed="true" data-f="all">All</button><button type="button" aria-pressed="false" data-f="unread">Unread</button><button type="button" aria-pressed="false" data-f="mention">Mentions</button></div>\n' +
'    <ul class="nc__list" data-nc-list></ul>\n' +
'  </section>\n' +
'</div>',
    css:
'.nc { position: relative; display: inline-block; }\n' +
'.nc__bell { position: relative; }\n' +
'.nc__count { position: absolute; top: calc(var(--aegis-space-4) * -1); right: calc(var(--aegis-space-4) * -1); min-width: var(--aegis-space-20); height: var(--aegis-space-20); padding: 0 var(--aegis-space-4); display: grid; place-items: center; border-radius: var(--aegis-radius-full); background: var(--aegis-danger-default); color: var(--aegis-danger-on); font: var(--aegis-text-label-sm); box-shadow: 0 0 0 var(--aegis-border-width-thick) var(--aegis-bg-canvas); }\n' +
'.nc__count:empty { display: none; }\n' +
'.nc__panel { position: absolute; z-index: 20; top: calc(100% + var(--aegis-space-8)); left: 0; width: min(380px, calc(100vw - var(--aegis-space-32))); background: var(--aegis-bg-surface-raised); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); box-shadow: var(--aegis-shadow-xl); overflow: hidden; }\n' +
'.nc__head { display: flex; align-items: center; justify-content: space-between; padding: var(--aegis-space-12) var(--aegis-space-16); }\n' +
'.nc__head h2 { margin: 0; }\n' +
'.nc__filters { display: flex; gap: var(--aegis-space-4); padding: 0 var(--aegis-space-16) var(--aegis-space-8); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.nc__filters button { border: 0; background: transparent; padding: var(--aegis-space-4) var(--aegis-space-8); border-radius: var(--aegis-radius-sm); font: var(--aegis-text-label-sm); color: var(--aegis-fg-muted); cursor: pointer; }\n' +
'.nc__filters [aria-pressed="true"] { background: var(--aegis-bg-selected); color: var(--aegis-fg-default); }\n' +
'.nc__list { list-style: none; margin: 0; padding: 0; max-height: 320px; overflow-y: auto; }\n' +
'.nc__item { display: grid; grid-template-columns: auto 1fr auto; gap: var(--aegis-space-12); padding: var(--aegis-space-12) var(--aegis-space-16); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.nc__item.is-unread { background: var(--aegis-brand-subtle); }\n' +
'.nc__open { all: unset; cursor: pointer; display: grid; gap: var(--aegis-space-2); font: var(--aegis-text-body-sm); border-radius: var(--aegis-radius-xs); }\n' +
'.nc__open:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'.nc__open small { font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.nc__dot { width: var(--aegis-space-8); height: var(--aegis-space-8); margin-top: var(--aegis-space-6); border-radius: var(--aegis-radius-full); background: var(--aegis-brand-default); }\n' +
'.nc__item:not(.is-unread) .nc__dot { background: transparent; }\n' +
'.nc__empty { padding: var(--aegis-space-32) var(--aegis-space-16); text-align: center; color: var(--aegis-fg-muted); font: var(--aegis-text-body-sm); }\n' +
'.nc__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      var items = [
        { id: 1, t: '<strong>Ava Chen</strong> mentioned you in “Q4 pricing review”', when: '5 min ago', unread: true, mention: true },
        { id: 2, t: 'Invoice <strong>INV-2041</strong> was paid by Northwind', when: '1 hour ago', unread: true },
        { id: 3, t: '<strong>Mateo Ruiz</strong> requested approval for a purchase order', when: 'Yesterday', unread: true },
        { id: 4, t: 'Your export “Customers.csv” is ready', when: '2 days ago', unread: false },
        { id: 5, t: '<strong>Jonas Berg</strong> replied: “Looks good to ship”', when: '3 days ago', unread: false, mention: true }
      ];
      var filter = 'all', bell = root.querySelector('[data-nc-bell]'), panel = root.querySelector('[data-nc-panel]'), list = root.querySelector('[data-nc-list]');
      function render() {
        var n = items.filter(function (i) { return i.unread; }).length;
        root.querySelector('[data-nc-count]').textContent = n ? (n > 9 ? '9+' : n) : '';
        bell.setAttribute('aria-label', 'Notifications, ' + (n ? n + ' unread' : 'none unread'));
        var shown = items.filter(function (i) { return filter === 'all' || (filter === 'unread' ? i.unread : i.mention); });
        list.innerHTML = shown.map(function (i) {
          return '<li class="nc__item' + (i.unread ? ' is-unread' : '') + '"><span class="nc__dot" aria-hidden="true"></span><button class="nc__open" type="button" data-open="' + i.id + '"><span>' + (i.unread ? '<span class="nc__sr">Unread: </span>' : '') + i.t + '</span><small>' + i.when + '</small></button>' +
            '<button class="ae-btn ae-btn--ghost ae-btn--sm ae-btn--icon" type="button" data-dismiss="' + i.id + '" aria-label="Dismiss notification"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>';
        }).join('') || '<li class="nc__empty">You’re all caught up.</li>';
      }
      function toggle(open) { panel.hidden = !open; bell.setAttribute('aria-expanded', String(open)); if (!open) bell.focus(); }
      bell.addEventListener('click', function () { toggle(panel.hidden); });
      root.querySelector('[data-nc-all]').addEventListener('click', function () { items.forEach(function (i) { i.unread = false; }); render(); });
      root.querySelector('.nc__filters').addEventListener('click', function (e) {
        var b = e.target.closest('[data-f]'); if (!b) return; filter = b.getAttribute('data-f');
        root.querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); render();
      });
      list.addEventListener('click', function (e) {
        var o = e.target.closest('[data-open]'), d = e.target.closest('[data-dismiss]');
        if (o) { var id = +o.getAttribute('data-open'); items.forEach(function (i) { if (i.id === id) i.unread = false; }); render(); var again = list.querySelector('[data-open="' + id + '"]'); if (again) again.focus(); }
        if (d) { var did = +d.getAttribute('data-dismiss'); items = items.filter(function (i) { return i.id !== did; }); render(); var next = list.querySelector('.nc__open'); (next || root.querySelector('[data-nc-all]')).focus(); }
      });
      panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
      document.addEventListener('click', function (e) { if (!panel.hidden && e.target.isConnected && !root.contains(e.target)) toggle(false); });
      render();
    }
  });

  /* ------------------------------------------------------------------ Toasts */
  R.register({
    id: 'toasts',
    name: 'Toast notifications',
    category: 'Feedback',
    tags: ['toast', 'snackbar', 'notification', 'flash message', 'feedback', 'live region'],
    description: 'Stacked toasts in four tones with auto-dismiss, a countdown bar, pause on hover/focus, actions and a max-stack limit.',
    a11y: ['Status toasts render in role="status" (polite); errors in role="alert" (assertive)', 'Errors do not auto-dismiss', 'Timers pause on hover and keyboard focus', 'Each toast has a labelled close button'],
    behavior: ['Max 4 visible; the oldest is removed first', 'Auto-dismiss after 5 seconds'],
    html:
'<div class="ts">\n' +
'  <div class="ts__triggers"><button class="ae-btn" type="button" data-toast="success">Success</button><button class="ae-btn" type="button" data-toast="info">Info</button><button class="ae-btn" type="button" data-toast="warning">Warning</button><button class="ae-btn ae-btn--danger" type="button" data-toast="danger">Error</button></div>\n' +
'  <div class="ts__region" role="status" aria-live="polite" data-ts-polite></div>\n' +
'  <div class="ts__region ts__region--alert" role="alert" data-ts-alert></div>\n' +
'</div>',
    css:
'.ts__triggers { display: flex; flex-wrap: wrap; gap: var(--aegis-space-8); }\n' +
'.ts__region { position: fixed; z-index: 50; right: var(--aegis-space-16); bottom: var(--aegis-space-16); display: flex; flex-direction: column; gap: var(--aegis-space-8); width: min(360px, calc(100vw - var(--aegis-space-32))); }\n' +
'.ts__region--alert { bottom: auto; top: var(--aegis-space-16); }\n' +
'.ts__toast { --_tone: var(--aegis-info-default); position: relative; display: grid; grid-template-columns: auto 1fr auto; gap: var(--aegis-space-12); padding: var(--aegis-space-12) var(--aegis-space-16); background: var(--aegis-bg-surface-raised); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-left: var(--aegis-border-width-thick) solid var(--_tone); border-radius: var(--aegis-radius-md); box-shadow: var(--aegis-shadow-lg); overflow: hidden; animation: ts-in var(--aegis-duration-base) var(--aegis-easing-decelerate); }\n' +
'.ts__toast svg { width: var(--aegis-size-icon-md); height: var(--aegis-size-icon-md); color: var(--_tone); }\n' +
'.ts__toast p { margin: 0; font: var(--aegis-text-body-sm); }\n' +
'.ts__toast strong { display: block; font: var(--aegis-text-label-md); }\n' +
'.ts__toast--success { --_tone: var(--aegis-success-default); } .ts__toast--warning { --_tone: var(--aegis-warning-default); } .ts__toast--danger { --_tone: var(--aegis-danger-default); }\n' +
'.ts__bar { position: absolute; left: 0; bottom: 0; height: var(--aegis-space-2); background: var(--_tone); transform-origin: left; animation: ts-bar 5s linear forwards; }\n' +
'.ts__toast:hover .ts__bar, .ts__toast:focus-within .ts__bar { animation-play-state: paused; }\n' +
'@keyframes ts-in { from { opacity: 0; transform: translateY(var(--aegis-space-8)); } }\n' +
'@keyframes ts-bar { from { width: 100%; } to { width: 0; } }',
    js: function (root) {
      var COPY = { success: ['Changes saved', 'Your workspace settings were updated.'], info: ['Export started', 'We’ll email you when the CSV is ready.'], warning: ['Approaching limit', 'You’ve used 90% of your API quota.'], danger: ['Payment failed', 'The card ending 4242 was declined.'] };
      var ICON = { success: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', warning: '<path d="M12 3 2 20h20L12 3ZM12 10v4M12 17v.5"/>', danger: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>' };
      var polite = root.querySelector('[data-ts-polite]'), alertR = root.querySelector('[data-ts-alert]');
      function dismiss(t) { if (t.parentNode) t.parentNode.removeChild(t); }
      function show(tone) {
        var region = tone === 'danger' ? alertR : polite;
        var all = root.querySelectorAll('.ts__toast'); if (all.length >= 4) dismiss(all[0]);
        var t = document.createElement('div');
        t.className = 'ts__toast ts__toast--' + tone;
        t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' + ICON[tone] + '</svg><p><strong>' + COPY[tone][0] + '</strong>' + COPY[tone][1] + '</p>' +
          '<button class="ae-btn ae-btn--ghost ae-btn--sm ae-btn--icon" type="button" aria-label="Dismiss: ' + COPY[tone][0] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' + (tone === 'danger' ? '' : '<span class="ts__bar" aria-hidden="true"></span>');
        t.querySelector('button').addEventListener('click', function () { dismiss(t); });
        var bar = t.querySelector('.ts__bar'); if (bar) bar.addEventListener('animationend', function () { dismiss(t); });
        region.appendChild(t);
      }
      root.querySelector('.ts__triggers').addEventListener('click', function (e) { var b = e.target.closest('[data-toast]'); if (b) show(b.getAttribute('data-toast')); });
    }
  });

  /* ------------------------------------------------------------------ Destructive confirm dialog */
  R.register({
    id: 'confirm-dialog',
    name: 'Destructive confirm dialog',
    category: 'Feedback',
    tags: ['modal', 'dialog', 'confirm', 'delete', 'destructive', 'type to confirm', 'danger zone'],
    description: 'Native <dialog> for destructive actions with consequences listed and a type-to-confirm guard that enables the delete button.',
    a11y: ['Native <dialog> + showModal(): focus trap, Escape to close, focus returns to the trigger', 'aria-labelledby/aria-describedby point at title and consequences', 'Initial focus goes to the confirm input; the delete button stays disabled until the text matches'],
    behavior: ['Cancel and backdrop click close without action', 'Delete shows a confirmation message outside the dialog'],
    html:
'<div class="md">\n' +
'  <div class="md__zone"><div><h3 class="ae-text-label-lg">Delete workspace</h3><p class="ae-text-body-sm ae-muted">Permanently remove “northwind-prod” and all of its data.</p></div><button class="ae-btn ae-btn--danger" type="button" data-md-open>Delete workspace</button></div>\n' +
'  <p class="ae-text-body-sm" role="status" data-md-status></p>\n' +
'  <dialog class="ae-modal md__dialog" aria-labelledby="md-title" aria-describedby="md-desc" data-md-dialog>\n' +
'    <form method="dialog">\n' +
'      <h2 class="ae-text-heading-sm" id="md-title">Delete “northwind-prod”?</h2>\n' +
'      <div id="md-desc"><p class="ae-text-body-sm">This can’t be undone. It will permanently delete:</p><ul class="ae-text-body-sm"><li>3 projects and 1,284 records</li><li>All API keys and webhooks</li><li>Access for 24 members</li></ul></div>\n' +
'      <div class="ae-field"><label class="ae-label" for="md-confirm">Type <strong>northwind-prod</strong> to confirm</label><input class="ae-input" id="md-confirm" autocomplete="off" spellcheck="false" data-md-input></div>\n' +
'      <div class="ae-modal__footer"><button class="ae-btn" value="cancel" formnovalidate>Cancel</button><button class="ae-btn ae-btn--danger" value="delete" disabled data-md-delete>Delete workspace</button></div>\n' +
'    </form>\n' +
'  </dialog>\n' +
'</div>',
    css:
'.md__zone { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--aegis-space-16); padding: var(--aegis-space-16); border: var(--aegis-border-width-thin) solid var(--aegis-danger-border); border-radius: var(--aegis-radius-lg); background: var(--aegis-bg-surface); }\n' +
'.md__zone h3, .md__zone p { margin: 0; }\n' +
'.md__dialog { color: var(--aegis-fg-default); }\n' +
'.md__dialog::backdrop { background: var(--aegis-modal-overlay); }\n' +
'.md__dialog h2 { margin: 0 0 var(--aegis-space-8); }\n' +
'.md__dialog ul { margin: var(--aegis-space-8) 0 var(--aegis-space-16); padding-left: var(--aegis-space-20); }\n' +
'.md__dialog p { margin: 0; }',
    js: function (root) {
      var dlg = root.querySelector('[data-md-dialog]'), input = root.querySelector('[data-md-input]'), del = root.querySelector('[data-md-delete]'), opener = root.querySelector('[data-md-open]');
      opener.addEventListener('click', function () { input.value = ''; del.disabled = true; dlg.returnValue = ''; dlg.showModal(); input.focus(); });
      input.addEventListener('input', function () { del.disabled = input.value !== 'northwind-prod'; });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close('cancel'); });
      dlg.addEventListener('close', function () {
        if (dlg.returnValue === 'delete') { root.querySelector('[data-md-status]').textContent = 'Workspace “northwind-prod” scheduled for deletion.'; opener.disabled = true; }
        opener.focus();
      });
    }
  });

  /* ------------------------------------------------------------------ Accordion */
  R.register({
    id: 'accordion',
    name: 'Accordion / FAQ',
    category: 'Layout',
    tags: ['accordion', 'faq', 'disclosure', 'collapse', 'expand', 'sections'],
    description: 'Disclosure accordion with heading-wrapped buttons, expand/collapse all and smooth height animation that respects reduced motion.',
    a11y: ['Each trigger is a <button aria-expanded aria-controls> inside a heading', 'Panels are role="region" with aria-labelledby', 'Expand all / Collapse all is a single toggle button'],
    behavior: ['Multiple panels may be open at once'],
    html:
'<section class="ac">\n' +
'  <div class="ac__top"><h2 class="ae-text-heading-sm">Frequently asked questions</h2><button class="ae-btn ae-btn--ghost ae-btn--sm" type="button" data-ac-all>Expand all</button></div>\n' +
'  <div class="ac__item"><h3><button type="button" aria-expanded="true" aria-controls="ac-p1" id="ac-b1">How is data encrypted?' + I('chevronDown') + '</button></h3><div class="ac__panel" id="ac-p1" role="region" aria-labelledby="ac-b1"><p>AES-256 at rest and TLS 1.3 in transit. Keys rotate every 90 days.</p></div></div>\n' +
'  <div class="ac__item"><h3><button type="button" aria-expanded="false" aria-controls="ac-p2" id="ac-b2">Can we choose a data region?' + I('chevronDown') + '</button></h3><div class="ac__panel" id="ac-p2" role="region" aria-labelledby="ac-b2" hidden><p>Yes. Enterprise plans can pin data to the EU, US or APAC.</p></div></div>\n' +
'  <div class="ac__item"><h3><button type="button" aria-expanded="false" aria-controls="ac-p3" id="ac-b3">Do you support SCIM provisioning?' + I('chevronDown') + '</button></h3><div class="ac__panel" id="ac-p3" role="region" aria-labelledby="ac-b3" hidden><p>SCIM 2.0 works with Okta, Entra ID and OneLogin.</p></div></div>\n' +
'</section>',
    css:
'.ac { max-width: 640px; border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); background: var(--aegis-bg-surface); }\n' +
'.ac__top { display: flex; align-items: center; justify-content: space-between; padding: var(--aegis-space-12) var(--aegis-space-16); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-default); }\n' +
'.ac__top h2 { margin: 0; }\n' +
'.ac__item + .ac__item { border-top: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ac__item h3 { margin: 0; }\n' +
'.ac__item button { all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--aegis-space-12); padding: var(--aegis-space-12) var(--aegis-space-16); font: var(--aegis-text-label-lg); cursor: pointer; }\n' +
'.ac__item button:hover { background: var(--aegis-bg-hover); }\n' +
'.ac__item button:focus-visible { box-shadow: inset 0 0 0 var(--aegis-focus-ring-width) var(--aegis-focus-ring-color); }\n' +
'.ac__item button svg { width: var(--aegis-size-icon-sm); height: var(--aegis-size-icon-sm); flex: none; transition: transform var(--aegis-duration-base) var(--aegis-easing-standard); }\n' +
'.ac__item button[aria-expanded="true"] svg { transform: rotate(180deg); }\n' +
'.ac__panel { padding: 0 var(--aegis-space-16) var(--aegis-space-16); font: var(--aegis-text-body-sm); color: var(--aegis-fg-muted); }\n' +
'.ac__panel p { margin: 0; }',
    js: function (root) {
      var btns = Array.prototype.slice.call(root.querySelectorAll('.ac__item button')), all = root.querySelector('[data-ac-all]');
      function set(b, open) { b.setAttribute('aria-expanded', String(open)); root.querySelector('#' + b.getAttribute('aria-controls')).hidden = !open; }
      function sync() { var every = btns.every(function (b) { return b.getAttribute('aria-expanded') === 'true'; }); all.textContent = every ? 'Collapse all' : 'Expand all'; }
      btns.forEach(function (b) { b.addEventListener('click', function () { set(b, b.getAttribute('aria-expanded') !== 'true'); sync(); }); });
      all.addEventListener('click', function () { var open = all.textContent === 'Expand all'; btns.forEach(function (b) { set(b, open); }); sync(); });
      sync();
    }
  });

  /* ------------------------------------------------------------------ Tooltip + popover */
  R.register({
    id: 'tooltip-popover',
    name: 'Tooltip & popover',
    category: 'Feedback',
    tags: ['tooltip', 'popover', 'hint', 'help', 'info', 'overlay', 'flyout'],
    description: 'Hover/focus tooltip wired with aria-describedby, and a click popover with rich content and dismiss behaviour.',
    a11y: ['Tooltip shows on hover and keyboard focus, hides on Escape (WCAG 1.4.13: dismissible, hoverable, persistent)', 'Tooltip is role="tooltip" referenced by aria-describedby', 'Popover trigger uses aria-expanded/aria-controls; Escape closes and restores focus'],
    behavior: ['Tooltip has a short show delay; popover closes on outside click'],
    html:
'<div class="pt">\n' +
'  <span class="pt__wrap"><button class="ae-btn ae-btn--icon ae-btn--ghost" type="button" aria-describedby="pt-tip" aria-label="Billing help" data-pt-tip-btn>' + I('info') + '</button><span class="ae-tooltip pt__tip" role="tooltip" id="pt-tip" hidden>Billed on the 1st of each month</span></span>\n' +
'  <span class="pt__wrap"><button class="ae-btn" type="button" aria-expanded="false" aria-controls="pt-pop" data-pt-pop-btn>Share settings ' + I('chevronDown') + '</button>\n' +
'    <div class="pt__pop" id="pt-pop" role="dialog" aria-label="Share settings" hidden>\n' +
'      <h3 class="ae-text-label-lg">Link sharing</h3><label class="ae-check"><input class="ae-switch" type="checkbox" role="switch" checked> Anyone with the link can view</label>\n' +
'      <div class="ae-field"><label class="ae-label" for="pt-exp">Expires</label><select class="ae-select" id="pt-exp"><option>Never</option><option>In 7 days</option><option>In 30 days</option></select></div>\n' +
'    </div></span>\n' +
'</div>',
    css:
'.pt { display: flex; flex-wrap: wrap; gap: var(--aegis-space-16); align-items: center; min-height: 220px; align-content: flex-start; }\n' +
'.pt__wrap { position: relative; display: inline-flex; }\n' +
'.pt__tip { position: absolute; left: 50%; bottom: calc(100% + var(--aegis-space-6)); transform: translateX(-50%); white-space: nowrap; z-index: 10; }\n' +
'.pt__pop { position: absolute; z-index: 10; top: calc(100% + var(--aegis-space-8)); left: 0; width: 280px; display: grid; gap: var(--aegis-space-12); padding: var(--aegis-space-16); background: var(--aegis-bg-surface-raised); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); box-shadow: var(--aegis-shadow-lg); }\n' +
'.pt__pop[hidden] { display: none; }\n' +
'.pt__pop h3 { margin: 0; }',
    js: function (root) {
      var tb = root.querySelector('[data-pt-tip-btn]'), tip = root.querySelector('#pt-tip'), timer;
      var wrap = tb.parentNode;
      function showTip() { clearTimeout(timer); timer = setTimeout(function () { tip.hidden = false; }, 150); }
      function hideTip() { clearTimeout(timer); tip.hidden = true; }
      wrap.addEventListener('mouseenter', showTip); wrap.addEventListener('mouseleave', hideTip);
      tb.addEventListener('focus', showTip); tb.addEventListener('blur', hideTip);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
      var pb = root.querySelector('[data-pt-pop-btn]'), pop = root.querySelector('#pt-pop');
      function setPop(open, refocus) { pop.hidden = !open; pb.setAttribute('aria-expanded', String(open)); if (open) pop.querySelector('input,select').focus(); else if (refocus) pb.focus(); }
      pb.addEventListener('click', function () { setPop(pop.hidden); });
      pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); setPop(false, true); } });
      document.addEventListener('click', function (e) { if (!pop.hidden && !pb.parentNode.contains(e.target)) setPop(false); });
    }
  });

  /* ------------------------------------------------------------------ Inline alerts */
  R.register({
    id: 'inline-alerts',
    name: 'Inline alert banners',
    category: 'Feedback',
    tags: ['alert', 'banner', 'callout', 'message', 'warning', 'error', 'success', 'notice'],
    description: 'Info, success, warning and danger banners built on the .ae-alert recipe, with icon + title + body, an action and dismiss.',
    a11y: ['Tone is never color-only: each alert has an icon and a title', 'Use role="alert" only for urgent errors; others are static content or role="status"', 'Dismiss buttons are labelled with the alert title'],
    behavior: ['Dismiss removes the alert and moves focus to the next one or the container'],
    html:
'<div class="al" tabindex="-1">\n' +
'  <div class="ae-alert">' + I('info') + '<div><p class="ae-alert__title">Scheduled maintenance</p><p class="ae-alert__body">The API will be read-only on Sunday 02:00–02:30 UTC.</p></div></div>\n' +
'  <div class="ae-alert ae-alert--success">' + I('checkCircle') + '<div><p class="ae-alert__title">Domain verified</p><p class="ae-alert__body">northwind.io can now be used for SSO.</p></div></div>\n' +
'  <div class="ae-alert ae-alert--warning">' + I('alert') + '<div><p class="ae-alert__title">Card expires soon</p><p class="ae-alert__body">Update your payment method before Dec 1. <a class="ae-link" href="#">Update card</a></p></div></div>\n' +
'  <div class="ae-alert ae-alert--danger" role="alert">' + I('xCircle') + '<div><p class="ae-alert__title">Sync failed</p><p class="ae-alert__body">Salesforce rejected the token. Reconnect to resume syncing.</p></div></div>\n' +
'</div>',
    css:
'.al { display: grid; gap: var(--aegis-space-12); max-width: 640px; outline: none; }\n' +
'.al .ae-alert { grid-template-columns: auto 1fr auto; align-items: start; }\n' +
'.al .ae-alert p { margin: 0; }\n' +
'.al__close { align-self: start; }',
    js: function (root) {
      root.querySelectorAll('.ae-alert').forEach(function (a) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'ae-btn ae-btn--ghost ae-btn--sm ae-btn--icon al__close';
        b.setAttribute('aria-label', 'Dismiss: ' + a.querySelector('.ae-alert__title').textContent);
        b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
        b.addEventListener('click', function () { var next = a.nextElementSibling; a.remove(); (next && next.querySelector('.al__close')) ? next.querySelector('.al__close').focus() : root.focus(); });
        a.appendChild(b);
      });
    }
  });

  /* ------------------------------------------------------------------ Empty state */
  R.register({
    id: 'empty-state',
    name: 'Empty state',
    category: 'Feedback',
    tags: ['empty state', 'zero state', 'no data', 'onboarding', 'blank slate', 'placeholder'],
    description: 'First-run empty state with a token-colored illustration, clear next step and secondary help link.',
    a11y: ['Illustration is decorative (aria-hidden)', 'One primary action with a specific verb label'],
    behavior: ['Static pattern; wire the primary action to your create flow'],
    html:
'<section class="es" aria-labelledby="es-title">\n' +
'  <svg class="es__art" viewBox="0 0 160 120" aria-hidden="true"><rect x="20" y="24" width="120" height="80" rx="10" class="es__a"/><rect x="34" y="40" width="56" height="8" rx="4" class="es__b"/><rect x="34" y="56" width="92" height="6" rx="3" class="es__c"/><rect x="34" y="68" width="76" height="6" rx="3" class="es__c"/><circle cx="124" cy="30" r="16" class="es__d"/><path d="M118 30h12M124 24v12" class="es__e"/></svg>\n' +
'  <h2 class="ae-text-heading-sm" id="es-title">No invoices yet</h2>\n' +
'  <p class="ae-text-body-sm">Create your first invoice or import existing ones from a CSV file.</p>\n' +
'  <div class="es__actions"><button class="ae-btn ae-btn--primary" type="button">Create invoice</button><button class="ae-btn" type="button">Import CSV</button></div>\n' +
'  <a class="ae-link ae-text-label-sm" href="#">How invoicing works</a>\n' +
'</section>',
    css:
'.es { display: grid; justify-items: center; gap: var(--aegis-space-12); max-width: 420px; margin: 0 auto; padding: var(--aegis-space-40) var(--aegis-space-24); text-align: center; }\n' +
'.es h2, .es p { margin: 0; } .es p { color: var(--aegis-fg-muted); }\n' +
'.es__art { width: 160px; height: 120px; }\n' +
'.es__a { fill: var(--aegis-bg-surface); stroke: var(--aegis-border-default); stroke-width: 1.5; }\n' +
'.es__b { fill: var(--aegis-border-strong); } .es__c { fill: var(--aegis-border-subtle); }\n' +
'.es__d { fill: var(--aegis-brand-default); } .es__e { stroke: var(--aegis-fg-on-brand); stroke-width: 3; stroke-linecap: round; }\n' +
'.es__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--aegis-space-8); margin-top: var(--aegis-space-8); }',
    js: null
  });

  /* ------------------------------------------------------------------ Skeleton loader */
  R.register({
    id: 'skeleton-loader',
    name: 'Skeleton loading state',
    category: 'Feedback',
    tags: ['skeleton', 'loading', 'placeholder', 'shimmer', 'spinner', 'lazy load', 'busy'],
    description: 'Content-shaped skeletons with a shimmer that respects reduced motion, swapping to real content when data arrives.',
    a11y: ['Container has aria-busy="true" while loading and an offscreen "Loading…" status', 'Skeleton shapes are aria-hidden', 'Shimmer animation is disabled under prefers-reduced-motion'],
    behavior: ['"Reload" re-enters the loading state for 1.2s'],
    html:
'<section class="sk ae-card" aria-labelledby="sk-title">\n' +
'  <div class="ae-card__header"><h2 class="ae-text-heading-sm" id="sk-title">Recent customers</h2><button class="ae-btn ae-btn--sm" type="button" data-sk-reload>' + I('refresh') + 'Reload</button></div>\n' +
'  <p class="sk__sr" role="status" data-sk-status></p>\n' +
'  <ul class="sk__list" data-sk-list></ul>\n' +
'</section>',
    css:
'.sk__list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--aegis-space-12); }\n' +
'.sk__row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--aegis-space-12); }\n' +
'.sk__row p { margin: 0; font: var(--aegis-text-label-md); } .sk__row small { display: block; font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.sk__bone { display: block; border-radius: var(--aegis-radius-sm); background: linear-gradient(90deg, var(--aegis-bg-surface-sunken) 25%, var(--aegis-bg-hover) 50%, var(--aegis-bg-surface-sunken) 75%); background-size: 200% 100%; animation: sk-shine 1.2s var(--aegis-easing-standard) infinite; }\n' +
'.sk__bone--avatar { width: var(--aegis-size-control-md); height: var(--aegis-size-control-md); border-radius: var(--aegis-radius-full); }\n' +
'.sk__bone--line { height: var(--aegis-space-12); width: 70%; } .sk__bone--line + .sk__bone--line { width: 40%; margin-top: var(--aegis-space-6); }\n' +
'.sk__bone--pill { width: var(--aegis-space-64); height: var(--aegis-space-20); border-radius: var(--aegis-radius-full); }\n' +
'@keyframes sk-shine { to { background-position: -200% 0; } }\n' +
'@media (prefers-reduced-motion: reduce) { .sk__bone { animation: none; } }\n' +
'.sk__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      var list = root.querySelector('[data-sk-list]'), status = root.querySelector('[data-sk-status]');
      var data = [['NH', 'Northwind Health', 'Enterprise · EMEA', 'success', 'Active'], ['GL', 'Globex Logistics', 'Business · NA', 'warning', 'Trial'], ['IF', 'Initech Finance', 'Enterprise · APAC', 'success', 'Active']];
      function load() {
        root.setAttribute('aria-busy', 'true'); status.textContent = 'Loading customers…';
        list.innerHTML = data.map(function () { return '<li class="sk__row" aria-hidden="true"><span class="sk__bone sk__bone--avatar"></span><div><span class="sk__bone sk__bone--line"></span><span class="sk__bone sk__bone--line"></span></div><span class="sk__bone sk__bone--pill"></span></li>'; }).join('');
        setTimeout(function () {
          list.innerHTML = data.map(function (d) { return '<li class="sk__row"><span class="ae-avatar" aria-hidden="true">' + d[0] + '</span><div><p>' + d[1] + '</p><small>' + d[2] + '</small></div><span class="ae-badge ae-badge--' + d[3] + '">' + d[4] + '</span></li>'; }).join('');
          root.setAttribute('aria-busy', 'false'); status.textContent = data.length + ' customers loaded';
        }, 1200);
      }
      root.querySelector('[data-sk-reload]').addEventListener('click', load);
      load();
    }
  });

  /* ------------------------------------------------------------------ Accessibility drawer */
  R.register({
    id: 'a11y-drawer',
    name: 'Accessibility preferences drawer',
    category: 'Accessibility',
    tags: ['accessibility', 'a11y', 'drawer', 'preferences', 'text size', 'contrast', 'reduced motion', 'dyslexia', 'settings panel', 'sheet'],
    description: 'Side drawer (modal <dialog>) with text size, line spacing, high contrast, reduced motion, link underlines, focus highlight and dyslexia-friendly spacing, applied live and persisted.',
    a11y: [
      'Drawer is a modal <dialog> with a heading label, focus trap and Escape to close; focus returns to the trigger',
      'Every control is a native input with a visible label; sliders show their current value via <output>',
      'Preferences apply through CSS custom properties/classes on the content container and persist in localStorage',
      'Reset restores defaults and announces the change'
    ],
    behavior: ['Changes apply instantly to the sample content', 'Preferences survive reloads (localStorage key "aegis-a11y-prefs")'],
    html:
'<div class="ad">\n' +
'  <div class="ad__bar"><button class="ae-btn" type="button" data-ad-open>' + I('accessibility') + 'Accessibility</button></div>\n' +
'  <article class="ad__content" data-ad-content>\n' +
'    <h2 class="ae-text-heading-md">Quarterly security review</h2>\n' +
'    <p>All production services passed the Q4 penetration test. Two medium findings in the reporting API were fixed within the 14-day SLA. Read the <a class="ae-link" href="#">full report</a> or <a class="ae-link" href="#">download the summary</a>.</p>\n' +
'    <p><button class="ae-btn ae-btn--sm" type="button">Acknowledge</button> <button class="ae-btn ae-btn--primary ae-btn--sm" type="button">Schedule follow-up</button></p>\n' +
'  </article>\n' +
'  <dialog class="ad__drawer" aria-labelledby="ad-title" data-ad-dialog>\n' +
'    <header class="ad__head"><h2 class="ae-text-heading-sm" id="ad-title">Accessibility</h2><button class="ae-btn ae-btn--ghost ae-btn--icon ae-btn--sm" type="button" aria-label="Close accessibility settings" data-ad-close>' + I('x') + '</button></header>\n' +
'    <form class="ad__form" data-ad-form>\n' +
'      <div class="ae-field"><label class="ae-label" for="ad-size">Text size <output for="ad-size" data-out="size">100%</output></label><input id="ad-size" name="size" type="range" min="90" max="160" step="10" value="100"></div>\n' +
'      <div class="ae-field"><label class="ae-label" for="ad-line">Line spacing <output for="ad-line" data-out="line">1.5</output></label><input id="ad-line" name="line" type="range" min="1.3" max="2.2" step="0.1" value="1.5"></div>\n' +
'      <label class="ae-check ad__opt"><input class="ae-switch" type="checkbox" role="switch" name="contrast"> High contrast</label>\n' +
'      <label class="ae-check ad__opt"><input class="ae-switch" type="checkbox" role="switch" name="motion"> Reduce motion</label>\n' +
'      <label class="ae-check ad__opt"><input class="ae-switch" type="checkbox" role="switch" name="links"> Underline all links</label>\n' +
'      <label class="ae-check ad__opt"><input class="ae-switch" type="checkbox" role="switch" name="focus"> Strong focus highlight</label>\n' +
'      <label class="ae-check ad__opt"><input class="ae-switch" type="checkbox" role="switch" name="dyslexia"> Dyslexia-friendly spacing</label>\n' +
'      <div class="ad__foot"><button class="ae-btn" type="button" data-ad-reset>Reset to defaults</button><span class="ae-text-caption" role="status" data-ad-status></span></div>\n' +
'    </form>\n' +
'  </dialog>\n' +
'</div>',
    css:
'.ad { display: grid; gap: var(--aegis-space-16); }\n' +
'.ad__bar { display: flex; justify-content: flex-end; }\n' +
'.ad__content { --ad-scale: 1; --ad-line: 1.5; max-width: 640px; padding: var(--aegis-space-24); background: var(--aegis-bg-surface); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); font-size: calc(var(--aegis-text-body-md-size) * var(--ad-scale)); line-height: var(--ad-line); }\n' +
'.ad__content h2 { margin: 0 0 var(--aegis-space-12); font-size: calc(var(--aegis-text-heading-md-size) * var(--ad-scale)); line-height: 1.25; }\n' +
'.ad__content p { margin: 0 0 var(--aegis-space-12); }\n' +
'.ad__content.is-contrast { background: var(--aegis-bg-canvas); color: var(--aegis-fg-default); border-color: var(--aegis-border-strong); border-width: var(--aegis-border-width-thick); }\n' +
'.ad__content.is-contrast .ae-link { color: var(--aegis-fg-default); text-decoration-line: underline; }\n' +
'.ad__content.is-links a { text-decoration-line: underline; text-decoration-thickness: 2px; }\n' +
'.ad__content.is-focus :focus-visible { outline: 3px solid var(--aegis-focus-ring-color); outline-offset: 3px; box-shadow: 0 0 0 6px var(--aegis-focus-halo); }\n' +
'.ad__content.is-dyslexia { letter-spacing: 0.06em; word-spacing: 0.16em; }\n' +
'.ad__content.is-motion *, .ad__content.is-motion *::before, .ad__content.is-motion *::after { transition: none !important; animation: none !important; }\n' +
'.ad__drawer { margin: 0 0 0 auto; height: 100%; max-height: 100%; width: min(360px, 100vw); padding: 0; border: 0; border-left: var(--aegis-border-width-thin) solid var(--aegis-border-default); background: var(--aegis-bg-surface-raised); color: var(--aegis-fg-default); box-shadow: var(--aegis-shadow-xl); }\n' +
'.ad__drawer[open] { animation: ad-in var(--aegis-duration-slow) var(--aegis-easing-decelerate); }\n' +
'.ad__drawer::backdrop { background: var(--aegis-bg-overlay); }\n' +
'@keyframes ad-in { from { transform: translateX(100%); } }\n' +
'@media (prefers-reduced-motion: reduce) { .ad__drawer[open] { animation: none; } }\n' +
'.ad__head { display: flex; align-items: center; justify-content: space-between; padding: var(--aegis-space-16); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ad__head h2 { margin: 0; }\n' +
'.ad__form { display: grid; gap: var(--aegis-space-16); padding: var(--aegis-space-16); }\n' +
'.ad__form .ae-label { display: flex; justify-content: space-between; }\n' +
'.ad__form output { font: var(--aegis-text-label-sm); color: var(--aegis-fg-muted); font-variant-numeric: tabular-nums; }\n' +
'.ad__form input[type="range"] { width: 100%; accent-color: var(--aegis-brand-default); }\n' +
'.ad__opt { justify-content: space-between; flex-direction: row-reverse; padding: var(--aegis-space-8) 0; border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ad__foot { display: flex; align-items: center; gap: var(--aegis-space-12); padding-top: var(--aegis-space-8); }',
    js: function (root) {
      var KEY = 'aegis-a11y-prefs', DEF = { size: '100', line: '1.5', contrast: false, motion: false, links: false, focus: false, dyslexia: false };
      var dlg = root.querySelector('[data-ad-dialog]'), form = root.querySelector('[data-ad-form]'), content = root.querySelector('[data-ad-content]'), opener = root.querySelector('[data-ad-open]');
      var prefs = DEF; try { prefs = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
      function apply(save) {
        content.style.setProperty('--ad-scale', +prefs.size / 100);
        content.style.setProperty('--ad-line', prefs.line);
        ['contrast', 'motion', 'links', 'focus', 'dyslexia'].forEach(function (k) { content.classList.toggle('is-' + k, !!prefs[k]); });
        form.querySelector('[data-out="size"]').textContent = prefs.size + '%';
        form.querySelector('[data-out="line"]').textContent = (+prefs.line).toFixed(1);
        if (save) try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
      }
      function fill() { Object.keys(prefs).forEach(function (k) { var el = form.elements[k]; if (!el) return; if (el.type === 'checkbox') el.checked = !!prefs[k]; else el.value = prefs[k]; }); }
      form.addEventListener('input', function (e) { var el = e.target; if (!el.name) return; prefs[el.name] = el.type === 'checkbox' ? el.checked : el.value; apply(true); root.querySelector('[data-ad-status]').textContent = ''; });
      root.querySelector('[data-ad-reset]').addEventListener('click', function () { prefs = Object.assign({}, DEF); fill(); apply(true); root.querySelector('[data-ad-status]').textContent = 'Defaults restored'; });
      opener.addEventListener('click', function () { dlg.showModal(); form.elements.size.focus(); });
      root.querySelector('[data-ad-close]').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', function () { opener.focus(); });
      fill(); apply(false);
    }
  });
})();
