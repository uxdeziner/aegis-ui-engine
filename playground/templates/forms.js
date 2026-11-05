/* AegisUI Playground — Form templates */
(function () {
  'use strict';
  var R = window.AegisPlaygroundTemplates, I = R.icon;

  /* ------------------------------------------------------------------ Sign in */
  R.register({
    id: 'sign-in',
    name: 'Sign-in form with SSO',
    category: 'Forms',
    tags: ['login', 'sign in', 'auth', 'password', 'sso', 'authentication', 'form'],
    description: 'Sign-in card with SSO, email/password, show/hide password, inline validation, an error summary and a loading state.',
    a11y: ['Inputs use autocomplete="email" / "current-password" and visible labels', 'The password toggle is a button with aria-pressed and an aria-label', 'On submit errors, focus the error summary (role="alert") linking to fields', 'The submit button shows a busy state with aria-busy'],
    behavior: ['Demo credentials: any valid email + password "aegis123"', 'Wrong password shows a form-level error without clearing the email'],
    html:
'<form class="si ae-card" novalidate data-si>\n' +
'  <h2 class="ae-text-heading-md">Sign in to Northwind</h2>\n' +
'  <button class="ae-btn ae-btn--block" type="button">' + I('lock') + 'Continue with SSO</button>\n' +
'  <div class="si__or"><span>or</span></div>\n' +
'  <div class="ae-alert ae-alert--danger si__summary" role="alert" tabindex="-1" hidden data-si-summary>' + I('alert') + '<div><p class="ae-alert__title">We couldn’t sign you in</p><p class="ae-alert__body" data-si-msg></p></div></div>\n' +
'  <div class="ae-field"><label class="ae-label" for="si-email">Work email</label><input class="ae-input" id="si-email" type="email" autocomplete="email" required aria-describedby="si-email-e"><span class="ae-help ae-help--error" id="si-email-e"></span></div>\n' +
'  <div class="ae-field"><div class="si__label-row"><label class="ae-label" for="si-pw">Password</label><a class="ae-link ae-text-label-sm" href="#">Forgot password?</a></div>\n' +
'    <div class="si__pw"><input class="ae-input" id="si-pw" type="password" autocomplete="current-password" required aria-describedby="si-pw-e"><button class="ae-btn ae-btn--ghost ae-btn--sm si__eye" type="button" aria-pressed="false" aria-label="Show password" data-si-eye>' + I('eye') + '</button></div>\n' +
'    <span class="ae-help ae-help--error" id="si-pw-e"></span></div>\n' +
'  <label class="ae-check"><input type="checkbox" checked> Keep me signed in</label>\n' +
'  <button class="ae-btn ae-btn--primary ae-btn--block" type="submit" data-si-submit>Sign in</button>\n' +
'  <p class="ae-text-caption si__ok" role="status" data-si-ok></p>\n' +
'</form>',
    css:
'.si { display: grid; gap: var(--aegis-space-16); max-width: 400px; }\n' +
'.si h2 { margin: 0; }\n' +
'.si__or { display: flex; align-items: center; gap: var(--aegis-space-12); font: var(--aegis-text-caption); color: var(--aegis-fg-subtle); }\n' +
'.si__or::before, .si__or::after { content: ""; flex: 1; border-top: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.si__label-row { display: flex; justify-content: space-between; align-items: baseline; }\n' +
'.si__pw { position: relative; }\n' +
'.si__pw .ae-input { padding-right: var(--aegis-space-48); }\n' +
'.si__eye { position: absolute; right: var(--aegis-space-4); top: 50%; transform: translateY(-50%); }\n' +
'.si__summary:focus { outline: none; }\n' +
'.si__ok { margin: 0; color: var(--aegis-success-fg); } .si__ok:empty { display: none; }\n' +
'.si [aria-busy="true"] { opacity: 0.7; cursor: progress; }',
    js: function (root) {
      var email = root.querySelector('#si-email'), pw = root.querySelector('#si-pw'), eye = root.querySelector('[data-si-eye]');
      var summary = root.querySelector('[data-si-summary]'), submit = root.querySelector('[data-si-submit]');
      eye.addEventListener('click', function () {
        var show = pw.type === 'password'; pw.type = show ? 'text' : 'password';
        eye.setAttribute('aria-pressed', String(show)); eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        eye.innerHTML = show ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
      });
      function field(el, msg) { el.setAttribute('aria-invalid', msg ? 'true' : 'false'); root.querySelector('#' + el.id + '-e').textContent = msg; return !msg; }
      root.addEventListener('submit', function (e) {
        e.preventDefault(); summary.hidden = true; root.querySelector('[data-si-ok]').textContent = '';
        var ok = field(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? '' : 'Enter a valid email address.');
        ok = field(pw, pw.value ? '' : 'Enter your password.') && ok;
        if (!ok) { root.querySelector('[aria-invalid="true"]').focus(); return; }
        submit.setAttribute('aria-busy', 'true'); submit.disabled = true; submit.textContent = 'Signing in…';
        setTimeout(function () {
          submit.removeAttribute('aria-busy'); submit.disabled = false; submit.textContent = 'Sign in';
          if (pw.value !== 'aegis123') { root.querySelector('[data-si-msg]').textContent = 'The email or password is incorrect. Try again or use SSO.'; summary.hidden = false; summary.focus(); pw.value = ''; return; }
          root.querySelector('[data-si-ok]').textContent = 'Signed in as ' + email.value.trim() + '.';
        }, 700);
      });
    }
  });

  /* ------------------------------------------------------------------ Settings with save bar */
  R.register({
    id: 'settings-form',
    name: 'Settings with unsaved-changes bar',
    category: 'Forms',
    tags: ['settings', 'preferences', 'form', 'switch', 'toggle', 'save bar', 'dirty state', 'notifications'],
    description: 'Settings sections with switches, selects and a sticky save bar that appears only when there are unsaved changes.',
    a11y: ['Switches are <input type="checkbox" role="switch"> with visible labels and descriptions (aria-describedby)', 'Sections are fieldsets with legends', 'The save bar is announced via role="status" when it appears', 'Saving moves focus back to the form and announces success'],
    behavior: ['Discard restores the last saved values', 'Save is disabled while saving'],
    html:
'<form class="sf ae-card" data-sf>\n' +
'  <fieldset class="sf__group"><legend class="ae-text-heading-sm">Notifications</legend>\n' +
'    <div class="sf__row"><div><label class="ae-label" for="sf-1">Product updates</label><p class="ae-help" id="sf-1-d">Monthly release notes and roadmap previews.</p></div><input class="ae-switch" id="sf-1" name="updates" type="checkbox" role="switch" aria-describedby="sf-1-d" checked></div>\n' +
'    <div class="sf__row"><div><label class="ae-label" for="sf-2">Security alerts</label><p class="ae-help" id="sf-2-d">New sign-ins and permission changes. Recommended.</p></div><input class="ae-switch" id="sf-2" name="security" type="checkbox" role="switch" aria-describedby="sf-2-d" checked></div>\n' +
'    <div class="sf__row"><div><label class="ae-label" for="sf-3">Weekly digest</label><p class="ae-help" id="sf-3-d">A summary of activity in your workspace.</p></div><input class="ae-switch" id="sf-3" name="digest" type="checkbox" role="switch" aria-describedby="sf-3-d"></div>\n' +
'  </fieldset>\n' +
'  <fieldset class="sf__group"><legend class="ae-text-heading-sm">Regional</legend>\n' +
'    <div class="sf__grid"><div class="ae-field"><label class="ae-label" for="sf-tz">Time zone</label><select class="ae-select" id="sf-tz" name="tz"><option>UTC</option><option selected>Europe/Amsterdam</option><option>America/New_York</option><option>Asia/Singapore</option></select></div>\n' +
'    <div class="ae-field"><label class="ae-label" for="sf-cur">Currency</label><select class="ae-select" id="sf-cur" name="cur"><option>USD</option><option selected>EUR</option><option>GBP</option></select></div></div>\n' +
'  </fieldset>\n' +
'  <div class="sf__bar" role="status" hidden data-sf-bar><span>You have unsaved changes</span><div><button class="ae-btn ae-btn--sm" type="button" data-sf-discard>Discard</button><button class="ae-btn ae-btn--primary ae-btn--sm" type="submit">Save changes</button></div></div>\n' +
'  <p class="sf__saved ae-text-caption" role="status" data-sf-saved></p>\n' +
'</form>',
    css:
'.sf { display: grid; gap: var(--aegis-space-24); max-width: 640px; position: relative; }\n' +
'.sf__group { display: grid; gap: var(--aegis-space-4); margin: 0; padding: 0; border: 0; min-width: 0; }\n' +
'.sf__group legend { padding: 0; margin-bottom: var(--aegis-space-8); }\n' +
'.sf__row { display: flex; align-items: center; justify-content: space-between; gap: var(--aegis-space-16); padding: var(--aegis-space-12) 0; border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.sf__row p { margin: var(--aegis-space-2) 0 0; }\n' +
'.sf__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--aegis-space-16); }\n' +
'.sf__bar { position: sticky; bottom: var(--aegis-space-12); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--aegis-space-12); padding: var(--aegis-space-12) var(--aegis-space-16); border-radius: var(--aegis-radius-md); background: var(--aegis-bg-emphasis); color: var(--aegis-fg-inverse); box-shadow: var(--aegis-shadow-lg); font: var(--aegis-text-label-md); }\n' +
'.sf__bar[hidden] { display: none; }\n' +
'.sf__bar div { display: flex; gap: var(--aegis-space-8); }\n' +
'.sf__saved { margin: 0; color: var(--aegis-success-fg); } .sf__saved:empty { display: none; }',
    js: function (root) {
      var bar = root.querySelector('[data-sf-bar]'), saved = root.querySelector('[data-sf-saved]');
      function snap() { var o = {}; root.querySelectorAll('[name]').forEach(function (el) { o[el.name] = el.type === 'checkbox' ? el.checked : el.value; }); return o; }
      var base = snap();
      function dirty() { var now = snap(); return Object.keys(now).some(function (k) { return now[k] !== base[k]; }); }
      root.addEventListener('change', function () { bar.hidden = !dirty(); saved.textContent = ''; });
      root.querySelector('[data-sf-discard]').addEventListener('click', function () {
        root.querySelectorAll('[name]').forEach(function (el) { if (el.type === 'checkbox') el.checked = base[el.name]; else el.value = base[el.name]; });
        bar.hidden = true; root.querySelector('[name]').focus();
      });
      root.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = bar.querySelector('[type="submit"]'); btn.disabled = true; btn.textContent = 'Saving…';
        setTimeout(function () { base = snap(); bar.hidden = true; btn.disabled = false; btn.textContent = 'Save changes'; saved.textContent = 'Settings saved.'; root.querySelector('[name]').focus(); }, 500);
      });
    }
  });

  /* ------------------------------------------------------------------ Tag combobox */
  R.register({
    id: 'tag-combobox',
    name: 'Multi-select tag combobox',
    category: 'Forms',
    tags: ['combobox', 'autocomplete', 'multi select', 'tags', 'chips', 'typeahead', 'select'],
    description: 'Typeahead multi-select: filtered suggestions, keyboard selection, removable chips, Backspace to remove and create-new option.',
    a11y: ['Input role="combobox" with aria-expanded, aria-controls, aria-activedescendant and aria-autocomplete="list"', 'Listbox options use aria-selected; selected tags are buttons labelled "Remove …"', 'Changes are announced in a polite live region'],
    behavior: ['Enter adds the active suggestion or creates a new tag from the text', 'Backspace in an empty input removes the last tag', 'Escape closes the listbox'],
    html:
'<div class="cb">\n' +
'  <label class="ae-label" for="cb-input" id="cb-label">Assign skills</label>\n' +
'  <div class="cb__box" data-cb-box>\n' +
'    <ul class="cb__chips" aria-label="Selected skills" data-cb-chips></ul>\n' +
'    <input class="cb__input" id="cb-input" type="text" role="combobox" aria-expanded="false" aria-controls="cb-list" aria-autocomplete="list" autocomplete="off" placeholder="Type to search…" data-cb-input>\n' +
'  </div>\n' +
'  <ul class="cb__list" id="cb-list" role="listbox" aria-labelledby="cb-label" hidden data-cb-list></ul>\n' +
'  <p class="cb__sr" aria-live="polite" data-cb-live></p>\n' +
'</div>',
    css:
'.cb { position: relative; display: grid; gap: var(--aegis-space-6); max-width: 480px; }\n' +
'.cb__box { display: flex; flex-wrap: wrap; align-items: center; gap: var(--aegis-space-6); min-height: var(--aegis-input-height); padding: var(--aegis-space-4) var(--aegis-space-8); background: var(--aegis-input-bg); border: var(--aegis-input-border-width) solid var(--aegis-input-border); border-radius: var(--aegis-input-radius); cursor: text; }\n' +
'.cb__box:focus-within { border-color: var(--aegis-focus-ring-color); box-shadow: 0 0 0 var(--aegis-focus-ring-offset) var(--aegis-focus-halo); }\n' +
'.cb__chips { display: contents; list-style: none; }\n' +
'.cb__chip { display: inline-flex; align-items: center; gap: var(--aegis-space-4); height: var(--aegis-size-control-sm); padding: 0 var(--aegis-space-4) 0 var(--aegis-space-8); border-radius: var(--aegis-radius-sm); background: var(--aegis-brand-subtle); color: var(--aegis-brand-fg); font: var(--aegis-text-label-sm); }\n' +
'.cb__chip button { all: unset; cursor: pointer; display: grid; place-items: center; width: var(--aegis-space-20); height: var(--aegis-space-20); border-radius: var(--aegis-radius-xs); }\n' +
'.cb__chip button:hover { background: var(--aegis-brand-muted); } .cb__chip button:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'.cb__input { flex: 1; min-width: 120px; height: var(--aegis-size-control-sm); border: 0; outline: none; background: transparent; color: var(--aegis-fg-default); font: var(--aegis-input-text-style); }\n' +
'.cb__input::placeholder { color: var(--aegis-input-placeholder); }\n' +
'.cb__list { position: absolute; z-index: 10; top: 100%; left: 0; right: 0; max-height: 220px; overflow-y: auto; margin: var(--aegis-space-4) 0 0; padding: var(--aegis-space-4); list-style: none; background: var(--aegis-bg-surface-raised); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-md); box-shadow: var(--aegis-shadow-lg); }\n' +
'.cb__list li { padding: var(--aegis-space-8) var(--aegis-space-12); border-radius: var(--aegis-radius-sm); font: var(--aegis-text-body-sm); cursor: pointer; }\n' +
'.cb__list li.is-active { background: var(--aegis-bg-selected); }\n' +
'.cb__list li[aria-selected="true"]::after { content: " \\2713"; color: var(--aegis-brand-fg); }\n' +
'.cb__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      var all = ['Accessibility', 'Design systems', 'Figma', 'React', 'TypeScript', 'Vue', 'Svelte', 'CSS architecture', 'Motion design', 'Data visualisation', 'User research', 'Prototyping'];
      var chosen = ['Design systems', 'Figma'], opts = [], active = 0;
      var input = root.querySelector('[data-cb-input]'), list = root.querySelector('[data-cb-list]'), chips = root.querySelector('[data-cb-chips]'), live = root.querySelector('[data-cb-live]');
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      function renderChips() {
        chips.innerHTML = chosen.map(function (t, i) { return '<li class="cb__chip">' + esc(t) + '<button type="button" data-rm="' + i + '" aria-label="Remove ' + esc(t) + '"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>'; }).join('');
      }
      function openList(show) { list.hidden = !show; input.setAttribute('aria-expanded', String(show)); if (!show) input.removeAttribute('aria-activedescendant'); }
      function renderList() {
        var q = input.value.trim().toLowerCase();
        opts = all.filter(function (t) { return t.toLowerCase().indexOf(q) > -1; });
        if (q && !all.some(function (t) { return t.toLowerCase() === q; })) opts.push({ create: input.value.trim() });
        active = Math.min(active, opts.length - 1);
        list.innerHTML = opts.map(function (o, i) {
          var t = o.create ? 'Create “' + esc(o.create) + '”' : esc(o);
          return '<li role="option" id="cb-o-' + i + '" data-i="' + i + '" class="' + (i === active ? 'is-active' : '') + '" aria-selected="' + (!o.create && chosen.indexOf(o) > -1) + '">' + t + '</li>';
        }).join('');
        openList(opts.length > 0);
        if (opts.length) input.setAttribute('aria-activedescendant', 'cb-o-' + active);
      }
      function toggle(o) {
        var t = o.create || o, i = chosen.indexOf(t);
        if (o.create && all.indexOf(t) < 0) all.push(t);
        if (i > -1) { chosen.splice(i, 1); live.textContent = t + ' removed'; } else { chosen.push(t); live.textContent = t + ' added'; }
        input.value = ''; active = 0; renderChips(); renderList(); input.focus();
      }
      input.addEventListener('input', function () { active = 0; renderList(); });
      input.addEventListener('focus', renderList);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) renderList(); else { active = (active + 1) % opts.length; renderList(); } }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + opts.length) % opts.length; renderList(); }
        else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden && opts[active]) toggle(opts[active]); }
        else if (e.key === 'Escape') { openList(false); }
        else if (e.key === 'Backspace' && !input.value && chosen.length) { live.textContent = chosen.pop() + ' removed'; renderChips(); }
      });
      list.addEventListener('mousedown', function (e) { e.preventDefault(); });
      list.addEventListener('click', function (e) { var li = e.target.closest('[data-i]'); if (li) toggle(opts[+li.getAttribute('data-i')]); });
      chips.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; live.textContent = chosen.splice(+b.getAttribute('data-rm'), 1)[0] + ' removed'; renderChips(); input.focus(); });
      root.querySelector('[data-cb-box]').addEventListener('click', function (e) { if (e.target === e.currentTarget) input.focus(); });
      input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) openList(false); }, 0); });
      renderChips();
    }
  });

  /* ------------------------------------------------------------------ Date range picker */
  R.register({
    id: 'date-range',
    name: 'Date range picker',
    category: 'Forms',
    tags: ['date picker', 'calendar', 'date range', 'range', 'reporting period', 'datepicker'],
    description: 'Inline calendar for picking a start and end date with hover preview, quick presets and a full keyboard grid.',
    a11y: ['Calendar is a table role="grid" with the month as caption; days are buttons with full-date aria-labels', 'Arrow keys move by day/week, PageUp/PageDown by month, Home/End to week bounds', 'Selected range endpoints use aria-pressed; today has aria-current="date"'],
    behavior: ['First click sets the start, second sets the end (swapped if earlier)', 'Presets: Last 7 days, Last 30 days, This month'],
    html:
'<div class="dp ae-card" data-dp>\n' +
'  <div class="dp__presets" role="group" aria-label="Quick ranges"><button class="ae-btn ae-btn--sm" type="button" data-preset="7">Last 7 days</button><button class="ae-btn ae-btn--sm" type="button" data-preset="30">Last 30 days</button><button class="ae-btn ae-btn--sm" type="button" data-preset="month">This month</button></div>\n' +
'  <div class="dp__head"><button class="ae-btn ae-btn--ghost ae-btn--icon ae-btn--sm" type="button" aria-label="Previous month" data-dp-prev>' + I('chevronLeft') + '</button><h3 class="ae-text-label-lg" aria-live="polite" data-dp-title></h3><button class="ae-btn ae-btn--ghost ae-btn--icon ae-btn--sm" type="button" aria-label="Next month" data-dp-next>' + I('chevronRight') + '</button></div>\n' +
'  <table class="dp__grid" role="grid" data-dp-grid><thead><tr><th abbr="Monday">Mo</th><th abbr="Tuesday">Tu</th><th abbr="Wednesday">We</th><th abbr="Thursday">Th</th><th abbr="Friday">Fr</th><th abbr="Saturday">Sa</th><th abbr="Sunday">Su</th></tr></thead><tbody></tbody></table>\n' +
'  <p class="dp__out ae-text-body-sm" aria-live="polite" data-dp-out>Select a start date</p>\n' +
'</div>',
    css:
'.dp { display: grid; gap: var(--aegis-space-12); width: min(340px, 100%); }\n' +
'.dp__presets { display: flex; flex-wrap: wrap; gap: var(--aegis-space-6); }\n' +
'.dp__head { display: flex; align-items: center; justify-content: space-between; }\n' +
'.dp__head h3 { margin: 0; }\n' +
'.dp__grid { width: 100%; border-collapse: collapse; table-layout: fixed; }\n' +
'.dp__grid th { padding-bottom: var(--aegis-space-4); font: var(--aegis-text-caption); color: var(--aegis-fg-subtle); }\n' +
'.dp__grid td { padding: var(--aegis-space-2) 0; text-align: center; }\n' +
'.dp__day { width: 100%; aspect-ratio: 1; max-width: var(--aegis-size-control-md); border: 0; border-radius: var(--aegis-radius-sm); background: transparent; color: var(--aegis-fg-default); font: var(--aegis-text-body-sm); font-variant-numeric: tabular-nums; cursor: pointer; }\n' +
'.dp__day:hover { background: var(--aegis-bg-hover); }\n' +
'.dp__day.is-out { color: var(--aegis-fg-subtle); }\n' +
'.dp__day[aria-current="date"] { box-shadow: inset 0 0 0 var(--aegis-border-width-thin) var(--aegis-border-strong); }\n' +
'.dp__day.is-in { background: var(--aegis-brand-subtle); color: var(--aegis-brand-fg); border-radius: 0; }\n' +
'.dp__day[aria-pressed="true"] { background: var(--aegis-brand-default); color: var(--aegis-fg-on-brand); border-radius: var(--aegis-radius-sm); }\n' +
'.dp__day:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: 1px; position: relative; }\n' +
'.dp__out { margin: 0; color: var(--aegis-fg-muted); }',
    js: function (root) {
      var DAY = 864e5;
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var view = new Date(today.getFullYear(), today.getMonth(), 1), start = null, end = null, hover = null, focusDate = new Date(today);
      var body = root.querySelector('[data-dp-grid] tbody');
      var fmt = function (d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
      var same = function (a, b) { return a && b && a.getTime() === b.getTime(); };
      function render(focus) {
        root.querySelector('[data-dp-title]').textContent = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        var first = new Date(view), offset = (first.getDay() + 6) % 7, d = new Date(first.getTime() - offset * DAY), rows = '';
        var lo = start, hi = end || (start && hover);
        if (lo && hi && hi < lo) { var t = lo; lo = hi; hi = t; }
        for (var w = 0; w < 6; w++) {
          rows += '<tr>';
          for (var i = 0; i < 7; i++) {
            var cls = ['dp__day'], ts = d.getTime();
            if (d.getMonth() !== view.getMonth()) cls.push('is-out');
            if (lo && hi && ts > lo.getTime() && ts < hi.getTime()) cls.push('is-in');
            var ends = same(d, start) || same(d, end);
            rows += '<td><button type="button" class="' + cls.join(' ') + '" data-t="' + ts + '" tabindex="' + (same(d, focusDate) ? 0 : -1) + '" aria-label="' + d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '"' + (ends ? ' aria-pressed="true"' : '') + (same(d, today) ? ' aria-current="date"' : '') + '>' + d.getDate() + '</button></td>';
            d = new Date(ts + DAY); d.setHours(0, 0, 0, 0);
          }
          rows += '</tr>';
        }
        body.innerHTML = rows;
        var out = root.querySelector('[data-dp-out]');
        out.textContent = start && end ? fmt(start) + ' – ' + fmt(end) + ' · ' + (Math.round((end - start) / DAY) + 1) + ' days' : start ? 'Start ' + fmt(start) + ' · select an end date' : 'Select a start date';
        if (focus) { var b = body.querySelector('[tabindex="0"]'); if (b) b.focus(); }
      }
      function pick(d) {
        if (!start || end) { start = d; end = null; }
        else { if (d < start) { end = start; start = d; } else end = d; }
        focusDate = d; render(true);
      }
      function moveFocus(d) { focusDate = d; if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1); render(true); }
      body.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) pick(new Date(+b.getAttribute('data-t'))); });
      body.addEventListener('mouseover', function (e) { var b = e.target.closest('[data-t]'); if (b && start && !end) { hover = new Date(+b.getAttribute('data-t')); var f = document.activeElement; render(false); if (f && f.getAttribute && f.getAttribute('data-t')) { var nb = body.querySelector('[data-t="' + f.getAttribute('data-t') + '"]'); if (nb) nb.focus(); } } });
      body.addEventListener('keydown', function (e) {
        var b = e.target.closest('[data-t]'); if (!b) return;
        var d = new Date(+b.getAttribute('data-t')), n = null, dow = (d.getDay() + 6) % 7;
        if (e.key === 'ArrowRight') n = new Date(d.getTime() + DAY);
        else if (e.key === 'ArrowLeft') n = new Date(d.getTime() - DAY);
        else if (e.key === 'ArrowDown') n = new Date(d.getTime() + 7 * DAY);
        else if (e.key === 'ArrowUp') n = new Date(d.getTime() - 7 * DAY);
        else if (e.key === 'Home') n = new Date(d.getTime() - dow * DAY);
        else if (e.key === 'End') n = new Date(d.getTime() + (6 - dow) * DAY);
        else if (e.key === 'PageDown') n = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28));
        else if (e.key === 'PageUp') n = new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28));
        if (n) { e.preventDefault(); n.setHours(0, 0, 0, 0); moveFocus(n); }
      });
      root.querySelector('[data-dp-prev]').addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
      root.querySelector('[data-dp-next]').addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
      root.querySelector('.dp__presets').addEventListener('click', function (e) {
        var b = e.target.closest('[data-preset]'); if (!b) return;
        var p = b.getAttribute('data-preset');
        end = new Date(today);
        start = p === 'month' ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(today.getTime() - (+p - 1) * DAY);
        start.setHours(0, 0, 0, 0);
        view = new Date(end.getFullYear(), end.getMonth(), 1); focusDate = new Date(end); render();
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ File dropzone */
  R.register({
    id: 'file-dropzone',
    name: 'File upload dropzone',
    category: 'Forms',
    tags: ['upload', 'file', 'dropzone', 'drag and drop', 'attachments', 'progress', 'import'],
    description: 'Drag-and-drop or browse upload with type/size validation, per-file progress, cancel/remove and an accessible file list.',
    a11y: ['The browse control is a real <input type="file"> wrapped by a labelled, focusable button', 'Drop zone is announced with instructions; dragover is shown with border and text', 'Progress uses <progress> with an aria-label per file; errors are text, not color only'],
    behavior: ['Accepts PDF, PNG, JPG, CSV up to 10 MB', 'Upload progress is simulated; remove cancels'],
    html:
'<div class="fu">\n' +
'  <div class="fu__zone" data-fu-zone>\n' +
'    ' + I('upload') + '\n' +
'    <p class="ae-text-label-md">Drag files here or <label class="fu__browse"><input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.csv" data-fu-input>browse</label></p>\n' +
'    <p class="ae-text-caption">PDF, PNG, JPG or CSV · up to 10 MB each</p>\n' +
'  </div>\n' +
'  <ul class="fu__list" aria-label="Uploads" data-fu-list></ul>\n' +
'  <p class="fu__sr" aria-live="polite" data-fu-live></p>\n' +
'</div>',
    css:
'.fu { display: grid; gap: var(--aegis-space-12); max-width: 560px; }\n' +
'.fu__zone { display: grid; justify-items: center; gap: var(--aegis-space-4); padding: var(--aegis-space-32) var(--aegis-space-16); text-align: center; border: var(--aegis-border-width-thick) dashed var(--aegis-border-strong); border-radius: var(--aegis-radius-lg); background: var(--aegis-bg-surface-sunken); transition: background-color var(--aegis-duration-fast) var(--aegis-easing-standard), border-color var(--aegis-duration-fast) var(--aegis-easing-standard); }\n' +
'.fu__zone.is-over { border-color: var(--aegis-brand-default); background: var(--aegis-brand-subtle); }\n' +
'.fu__zone svg { width: var(--aegis-size-icon-lg); height: var(--aegis-size-icon-lg); color: var(--aegis-fg-muted); }\n' +
'.fu__zone p { margin: 0; }\n' +
'.fu__browse { color: var(--aegis-fg-link); text-decoration: underline; text-underline-offset: var(--aegis-link-underline-offset); cursor: pointer; border-radius: var(--aegis-radius-xs); }\n' +
'.fu__browse input { position: absolute; width: 1px; height: 1px; opacity: 0; }\n' +
'.fu__browse:focus-within { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: 2px; }\n' +
'.fu__list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--aegis-space-8); }\n' +
'.fu__item { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--aegis-space-12); padding: var(--aegis-space-8) var(--aegis-space-12); background: var(--aegis-bg-surface); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-md); }\n' +
'.fu__item svg { width: var(--aegis-size-icon-md); height: var(--aegis-size-icon-md); color: var(--aegis-fg-muted); }\n' +
'.fu__name { font: var(--aegis-text-label-md); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n' +
'.fu__meta { font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.fu__item.is-error { border-color: var(--aegis-danger-border); background: var(--aegis-danger-subtle); }\n' +
'.fu__item.is-error .fu__meta { color: var(--aegis-danger-fg); }\n' +
'.fu__item progress { width: 100%; height: var(--aegis-space-4); accent-color: var(--aegis-brand-default); }\n' +
'.fu__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      var zone = root.querySelector('[data-fu-zone]'), input = root.querySelector('[data-fu-input]'), list = root.querySelector('[data-fu-list]'), live = root.querySelector('[data-fu-live]');
      var files = [], uid = 0, OK = /\.(pdf|png|jpe?g|csv)$/i, MAX = 10 * 1024 * 1024;
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      function size(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
      function render() {
        list.innerHTML = files.map(function (f) {
          var meta = f.error ? f.error : f.p >= 100 ? size(f.size) + ' · Uploaded' : size(f.size) + ' · ' + f.p + '%';
          return '<li class="fu__item' + (f.error ? ' is-error' : '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M7 3h7l5 5v13H7zM14 3v5h5"/></svg><div><div class="fu__name">' + esc(f.name) + '</div><div class="fu__meta">' + meta + '</div>' +
            (!f.error && f.p < 100 ? '<progress max="100" value="' + f.p + '" aria-label="Uploading ' + esc(f.name) + '"></progress>' : '') + '</div>' +
            '<button class="ae-btn ae-btn--ghost ae-btn--sm" type="button" data-rm="' + f.id + '">' + (f.p < 100 && !f.error ? 'Cancel' : 'Remove') + '<span class="fu__sr"> ' + esc(f.name) + '</span></button></li>';
        }).join('');
      }
      function add(fileList) {
        Array.prototype.forEach.call(fileList, function (file) {
          var f = { id: ++uid, name: file.name, size: file.size, p: 0, error: '' };
          if (!OK.test(file.name)) f.error = 'Unsupported file type';
          else if (file.size > MAX) f.error = 'File is larger than 10 MB';
          files.push(f);
          if (!f.error) {
            var timer = setInterval(function () {
              if (files.indexOf(f) < 0) return clearInterval(timer);
              f.p = Math.min(100, f.p + 10 + Math.round(Math.random() * 25)); render();
              if (f.p >= 100) { clearInterval(timer); live.textContent = f.name + ' uploaded'; }
            }, 250);
          } else live.textContent = f.name + ': ' + f.error;
        });
        render();
      }
      input.addEventListener('change', function () { add(input.files); input.value = ''; });
      ['dragenter', 'dragover'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('is-over'); }); });
      ['dragleave', 'drop'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); if (t === 'drop' || !zone.contains(e.relatedTarget)) zone.classList.remove('is-over'); }); });
      zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) add(e.dataTransfer.files); });
      list.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; var id = +b.getAttribute('data-rm'); var f = files.filter(function (x) { return x.id === id; })[0]; files = files.filter(function (x) { return x.id !== id; }); render(); live.textContent = f.name + ' removed'; input.focus(); });
    }
  });

  /* ------------------------------------------------------------------ Plan selector */
  R.register({
    id: 'plan-selector',
    name: 'Plan selector with billing toggle',
    category: 'Forms',
    tags: ['pricing', 'plans', 'radio cards', 'billing', 'subscription', 'upgrade', 'checkout'],
    description: 'Radio-card plan picker with monthly/annual switch, savings badge and a summary that updates live.',
    a11y: ['Plans are native radio inputs inside a fieldset/legend; the whole card is the label', 'Billing period is a radiogroup of two options', 'Price changes are announced via the summary (aria-live="polite")'],
    behavior: ['Annual pricing shows the per-month equivalent and the yearly total', 'Current plan is marked and cannot be re-selected as an upgrade'],
    html:
'<form class="ps" data-ps>\n' +
'  <div class="ps__period" role="radiogroup" aria-label="Billing period">\n' +
'    <label><input type="radio" name="period" value="month"> Monthly</label>\n' +
'    <label><input type="radio" name="period" value="year" checked> Annual <span class="ae-badge ae-badge--success">Save 20%</span></label>\n' +
'  </div>\n' +
'  <fieldset class="ps__plans"><legend class="ae-text-heading-sm">Choose a plan</legend>\n' +
'    <label class="ps__card"><input type="radio" name="plan" value="Starter" data-price="12" disabled><span class="ps__name">Starter <span class="ae-badge">Current plan</span></span><span class="ps__price" data-price-for="12"></span><span class="ps__desc">Up to 5 seats, core reports.</span></label>\n' +
'    <label class="ps__card"><input type="radio" name="plan" value="Business" data-price="39" checked><span class="ps__name">Business</span><span class="ps__price" data-price-for="39"></span><span class="ps__desc">Unlimited seats, SSO, audit log.</span></label>\n' +
'    <label class="ps__card"><input type="radio" name="plan" value="Enterprise" data-price="89"><span class="ps__name">Enterprise</span><span class="ps__price" data-price-for="89"></span><span class="ps__desc">SCIM, data residency, 99.95% SLA.</span></label>\n' +
'  </fieldset>\n' +
'  <div class="ps__summary"><p aria-live="polite" data-ps-sum></p><button class="ae-btn ae-btn--primary" type="submit">Upgrade</button></div>\n' +
'</form>',
    css:
'.ps { display: grid; gap: var(--aegis-space-16); }\n' +
'.ps__period { display: inline-flex; justify-self: start; padding: var(--aegis-space-4); gap: var(--aegis-space-4); border-radius: var(--aegis-radius-full); background: var(--aegis-bg-surface-sunken); border: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ps__period label { display: inline-flex; align-items: center; gap: var(--aegis-space-6); height: var(--aegis-size-control-sm); padding: 0 var(--aegis-space-12); border-radius: var(--aegis-radius-full); font: var(--aegis-text-label-sm); cursor: pointer; }\n' +
'.ps__period input { position: absolute; opacity: 0; width: 1px; height: 1px; }\n' +
'.ps__period label:has(input:checked) { background: var(--aegis-bg-surface); box-shadow: var(--aegis-shadow-sm); }\n' +
'.ps__period label:has(input:focus-visible) { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'.ps__plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--aegis-space-12); margin: 0; padding: 0; border: 0; min-width: 0; }\n' +
'.ps__plans legend { padding: 0; margin-bottom: var(--aegis-space-12); }\n' +
'.ps__card { position: relative; display: grid; gap: var(--aegis-space-6); padding: var(--aegis-space-16); background: var(--aegis-bg-surface); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-lg); cursor: pointer; }\n' +
'.ps__card input { position: absolute; top: var(--aegis-space-16); right: var(--aegis-space-16); accent-color: var(--aegis-brand-default); }\n' +
'.ps__card:has(input:checked) { border-color: var(--aegis-brand-default); box-shadow: 0 0 0 var(--aegis-border-width-thin) var(--aegis-brand-default); }\n' +
'.ps__card:has(input:disabled) { cursor: default; background: var(--aegis-bg-surface-sunken); }\n' +
'.ps__card:has(input:focus-visible) { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: var(--aegis-focus-ring-offset); }\n' +
'.ps__name { display: flex; align-items: center; gap: var(--aegis-space-8); font: var(--aegis-text-label-lg); }\n' +
'.ps__price { font: var(--aegis-text-heading-md); font-variant-numeric: tabular-nums; }\n' +
'.ps__price small { font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.ps__desc { font: var(--aegis-text-body-sm); color: var(--aegis-fg-muted); }\n' +
'.ps__summary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--aegis-space-12); padding-top: var(--aegis-space-12); border-top: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.ps__summary p { margin: 0; font: var(--aegis-text-body-sm); }',
    js: function (root) {
      var usd = function (v) { return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 }); };
      function render() {
        var yearly = root.querySelector('[name="period"]:checked').value === 'year';
        root.querySelectorAll('[data-price-for]').forEach(function (el) {
          var p = +el.getAttribute('data-price-for'), m = yearly ? p * 0.8 : p;
          el.innerHTML = usd(m) + ' <small>per seat / month' + (yearly ? ', billed yearly' : '') + '</small>';
        });
        var sel = root.querySelector('[name="plan"]:checked'), p = +sel.getAttribute('data-price'), seats = 25;
        var total = yearly ? p * 0.8 * 12 * seats : p * seats;
        root.querySelector('[data-ps-sum]').innerHTML = '<strong>' + sel.value + '</strong> for ' + seats + ' seats: ' + usd(total) + (yearly ? ' per year' : ' per month');
      }
      root.addEventListener('change', render);
      root.addEventListener('submit', function (e) { e.preventDefault(); root.querySelector('[data-ps-sum]').innerHTML += ' <span class="ae-badge ae-badge--success">Upgrade requested</span>'; });
      render();
    }
  });
})();
