/* AegisUI Playground — Data templates */
(function () {
  'use strict';
  var R = window.AegisPlaygroundTemplates, I = R.icon;

  /* ------------------------------------------------------------------ Data grid */
  R.register({
    id: 'data-grid',
    name: 'Editable data grid',
    category: 'Data',
    tags: ['table', 'grid', 'spreadsheet', 'inline edit', 'sort', 'filter', 'crud', 'accounts'],
    description: 'Spreadsheet-style grid with inline cell editing, keyboard navigation, sorting, filtering, row selection, add/delete and live totals.',
    a11y: [
      'Use role="grid" with roving tabindex: exactly one cell has tabindex="0"',
      'Arrow keys move between cells; Enter or F2 starts editing; Enter commits; Escape cancels; Tab commits and moves right',
      'Sortable headers are <button>s inside <th aria-sort>',
      'Announce edits, sorts and deletions through a polite live region'
    ],
    behavior: ['Double-click or Enter edits a cell', 'Stage column edits with a <select>; ARR edits as a number', 'Footer shows the total ARR of visible rows', 'Bulk-select rows and delete them'],
    html:
'<section class="dg ae-card ae-card--flush" aria-labelledby="dg-title">\n' +
'  <header class="dg__bar">\n' +
'    <div>\n' +
'      <h2 class="ae-text-heading-sm" id="dg-title">Accounts</h2>\n' +
'      <p class="ae-text-caption" data-dg-count>0 rows</p>\n' +
'    </div>\n' +
'    <div class="dg__tools">\n' +
'      <label class="ae-input-group dg__search">' + I('search') + '<span class="dg__sr">Filter accounts</span><input class="ae-input" type="search" placeholder="Filter accounts" data-dg-filter></label>\n' +
'      <button class="ae-btn ae-btn--danger ae-btn--sm" type="button" data-dg-delete disabled>' + I('trash') + 'Delete</button>\n' +
'      <button class="ae-btn ae-btn--primary ae-btn--sm" type="button" data-dg-add>' + I('plus') + 'Add row</button>\n' +
'    </div>\n' +
'  </header>\n' +
'  <div class="ae-table-wrap">\n' +
'    <table class="ae-table dg__table" role="grid" aria-labelledby="dg-title" aria-describedby="dg-help">\n' +
'      <thead><tr>\n' +
'        <th class="dg__check"><input type="checkbox" aria-label="Select all rows" data-dg-all></th>\n' +
'        <th aria-sort="none"><button type="button" class="dg__sort" data-sort="account">Account</button></th>\n' +
'        <th aria-sort="none"><button type="button" class="dg__sort" data-sort="owner">Owner</button></th>\n' +
'        <th aria-sort="none"><button type="button" class="dg__sort" data-sort="stage">Stage</button></th>\n' +
'        <th aria-sort="none" class="ae-num"><button type="button" class="dg__sort" data-sort="arr">ARR</button></th>\n' +
'        <th aria-sort="none"><button type="button" class="dg__sort" data-sort="renewal">Renewal</button></th>\n' +
'      </tr></thead>\n' +
'      <tbody data-dg-body></tbody>\n' +
'      <tfoot><tr><th colspan="4" scope="row">Total ARR (visible)</th><td class="ae-num" data-dg-total>$0</td><td></td></tr></tfoot>\n' +
'    </table>\n' +
'  </div>\n' +
'  <p class="dg__help ae-text-caption" id="dg-help">Arrow keys move · Enter or double-click edits · Escape cancels</p>\n' +
'  <p class="dg__sr" aria-live="polite" data-dg-live></p>\n' +
'</section>',
    css:
'.dg__bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--aegis-space-12); padding: var(--aegis-space-16); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.dg__tools { display: flex; flex-wrap: wrap; gap: var(--aegis-space-8); align-items: center; }\n' +
'.dg__search { min-width: 200px; }\n' +
'.dg__search .ae-input { height: var(--aegis-button-height-sm); }\n' +
'.dg__sort { all: unset; cursor: pointer; display: inline-flex; gap: var(--aegis-space-4); align-items: center; border-radius: var(--aegis-radius-xs); }\n' +
'.dg__sort:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'th[aria-sort="ascending"] .dg__sort::after { content: "\\2191"; }\n' +
'th[aria-sort="descending"] .dg__sort::after { content: "\\2193"; }\n' +
'.dg__check { width: var(--aegis-space-40); }\n' +
'.dg__table td[data-col] { cursor: cell; }\n' +
'.dg__table td:focus { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); outline-offset: calc(var(--aegis-focus-ring-width) * -1); }\n' +
'.dg__table td.is-editing { padding: 0 var(--aegis-space-4); }\n' +
'.dg__table td.is-editing .ae-input, .dg__table td.is-editing .ae-select { height: calc(var(--aegis-table-row-height) - var(--aegis-space-8)); }\n' +
'.dg__table tfoot th, .dg__table tfoot td { font: var(--aegis-text-label-md); background: var(--aegis-bg-surface-sunken); height: var(--aegis-table-row-height); padding: 0 var(--aegis-table-cell-padding-x); text-align: left; }\n' +
'.dg__table tfoot .ae-num { text-align: right; }\n' +
'.dg__help { padding: var(--aegis-space-8) var(--aegis-space-16); margin: 0; }\n' +
'.dg__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }',
    js: function (root) {
      var rows = [
        { id: 1, account: 'Northwind Health', owner: 'Priya Shah', stage: 'Renewal', arr: 184000, renewal: '2026-12-01' },
        { id: 2, account: 'Globex Logistics', owner: 'Mateo Ruiz', stage: 'Expansion', arr: 96500, renewal: '2027-02-14' },
        { id: 3, account: 'Initech Finance', owner: 'Ava Chen', stage: 'At risk', arr: 42000, renewal: '2026-11-20' },
        { id: 4, account: 'Umbrella Retail', owner: 'Jonas Berg', stage: 'Healthy', arr: 218750, renewal: '2027-06-30' },
        { id: 5, account: 'Stark Industrial', owner: 'Priya Shah', stage: 'Healthy', arr: 132400, renewal: '2027-03-05' }
      ];
      var STAGES = ['Healthy', 'Expansion', 'Renewal', 'At risk'];
      var COLS = ['account', 'owner', 'stage', 'arr', 'renewal'];
      var nextId = 6, sortKey = null, sortDir = 1, filter = '', selected = {}, active = { r: 0, c: 0 };
      var body = root.querySelector('[data-dg-body]');
      var live = root.querySelector('[data-dg-live]');
      var money = function (v) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v); };
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      var badge = { Healthy: 'success', Expansion: 'brand', Renewal: 'info', 'At risk': 'danger' };
      function announce(m) { live.textContent = ''; setTimeout(function () { live.textContent = m; }, 30); }
      function visible() {
        var f = filter.toLowerCase();
        var out = rows.filter(function (r) { return !f || COLS.some(function (k) { return String(r[k]).toLowerCase().indexOf(f) > -1; }); });
        if (sortKey) out.sort(function (a, b) { return (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir; });
        return out;
      }
      function cellHtml(r, k) {
        if (k === 'arr') return money(r.arr);
        if (k === 'stage') return '<span class="ae-badge ae-badge--' + badge[r.stage] + '">' + esc(r.stage) + '</span>';
        if (k === 'renewal') return new Date(r.renewal + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return esc(r[k]);
      }
      function render() {
        var v = visible();
        body.innerHTML = v.map(function (r, ri) {
          return '<tr data-id="' + r.id + '" aria-selected="' + (!!selected[r.id]) + '"><td class="dg__check"><input type="checkbox" aria-label="Select ' + esc(r.account) + '"' + (selected[r.id] ? ' checked' : '') + '></td>' +
            COLS.map(function (k, ci) { return '<td data-col="' + k + '" tabindex="-1"' + (k === 'arr' ? ' class="ae-num"' : '') + '>' + cellHtml(r, k) + '</td>'; }).join('') + '</tr>';
        }).join('') || '<tr><td colspan="6" class="ae-muted">No accounts match “' + esc(filter) + '”.</td></tr>';
        root.querySelector('[data-dg-count]').textContent = v.length + ' of ' + rows.length + ' rows';
        root.querySelector('[data-dg-total]').textContent = money(v.reduce(function (s, r) { return s + r.arr; }, 0));
        var nSel = Object.keys(selected).filter(function (k) { return selected[k]; }).length;
        root.querySelector('[data-dg-delete]').disabled = nSel === 0;
        var all = root.querySelector('[data-dg-all]');
        all.checked = v.length > 0 && v.every(function (r) { return selected[r.id]; });
        all.indeterminate = !all.checked && v.some(function (r) { return selected[r.id]; });
        active.r = Math.min(active.r, Math.max(0, v.length - 1));
        var cell = cellAt(active.r, active.c);
        if (cell) cell.tabIndex = 0;
      }
      function cellAt(r, c) { var tr = body.rows[r]; return tr ? tr.querySelector('[data-col="' + COLS[c] + '"]') : null; }
      function focusCell(r, c) {
        var cell = cellAt(r, c);
        if (!cell) return;
        body.querySelectorAll('td[tabindex="0"]').forEach(function (td) { td.tabIndex = -1; });
        active = { r: r, c: c };
        cell.tabIndex = 0;
        cell.focus();
      }
      function rowOf(td) { var id = +td.parentNode.getAttribute('data-id'); return rows.filter(function (r) { return r.id === id; })[0]; }
      function edit(td) {
        if (td.classList.contains('is-editing')) return;
        var k = td.getAttribute('data-col'), r = rowOf(td);
        var ctl;
        if (k === 'stage') {
          ctl = document.createElement('select'); ctl.className = 'ae-select';
          STAGES.forEach(function (s) { var o = document.createElement('option'); o.textContent = s; o.selected = s === r.stage; ctl.appendChild(o); });
        } else {
          ctl = document.createElement('input'); ctl.className = 'ae-input';
          ctl.type = k === 'arr' ? 'number' : k === 'renewal' ? 'date' : 'text';
          ctl.value = r[k];
        }
        ctl.setAttribute('aria-label', 'Edit ' + k);
        td.classList.add('is-editing');
        td.innerHTML = '';
        td.appendChild(ctl);
        ctl.focus();
        if (ctl.select) ctl.select();
        var done = false;
        function finish(commit, move) {
          if (done) return; done = true;
          if (commit) {
            var val = k === 'arr' ? Math.max(0, Math.round(+ctl.value || 0)) : String(ctl.value).trim();
            if (val !== '' && val !== r[k]) { r[k] = val; announce(k + ' updated to ' + (k === 'arr' ? money(val) : val)); }
          }
          var pos = { r: active.r, c: active.c };
          render();
          focusCell(pos.r, Math.min(COLS.length - 1, pos.c + (move || 0)));
        }
        ctl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); finish(true); }
          else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
          else if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); finish(true, 1); }
          e.stopPropagation();
        });
        ctl.addEventListener('blur', function () { finish(true); });
      }
      body.addEventListener('keydown', function (e) {
        var td = e.target.closest('td[data-col]');
        if (!td || td.classList.contains('is-editing')) return;
        var r = active.r, c = active.c, max = body.rows.length - 1;
        var map = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] };
        if (map[e.key]) { e.preventDefault(); focusCell(Math.max(0, Math.min(max, r + map[e.key][0])), Math.max(0, Math.min(COLS.length - 1, c + map[e.key][1]))); }
        else if (e.key === 'Home') { e.preventDefault(); focusCell(r, 0); }
        else if (e.key === 'End') { e.preventDefault(); focusCell(r, COLS.length - 1); }
        else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); edit(td); }
        else if (e.key === ' ') { e.preventDefault(); var row = rowOf(td); selected[row.id] = !selected[row.id]; render(); focusCell(r, c); }
      });
      body.addEventListener('click', function (e) {
        var td = e.target.closest('td[data-col]');
        if (td && !td.classList.contains('is-editing')) { focusCell(td.parentNode.sectionRowIndex, COLS.indexOf(td.getAttribute('data-col'))); }
      });
      body.addEventListener('dblclick', function (e) { var td = e.target.closest('td[data-col]'); if (td) edit(td); });
      body.addEventListener('change', function (e) {
        if (e.target.type !== 'checkbox') return;
        var id = +e.target.closest('tr').getAttribute('data-id');
        selected[id] = e.target.checked; render();
      });
      root.querySelector('[data-dg-all]').addEventListener('change', function (e) {
        visible().forEach(function (r) { selected[r.id] = e.target.checked; }); render();
      });
      root.querySelector('[data-dg-filter]').addEventListener('input', function (e) { filter = e.target.value; active = { r: 0, c: 0 }; render(); });
      root.querySelectorAll('[data-sort]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-sort');
          sortDir = sortKey === k ? -sortDir : 1; sortKey = k;
          root.querySelectorAll('th[aria-sort]').forEach(function (th) { th.setAttribute('aria-sort', 'none'); });
          b.parentNode.setAttribute('aria-sort', sortDir > 0 ? 'ascending' : 'descending');
          render(); announce('Sorted by ' + k + (sortDir > 0 ? ', ascending' : ', descending'));
        });
      });
      root.querySelector('[data-dg-add]').addEventListener('click', function () {
        var r = { id: nextId++, account: 'New account', owner: 'Unassigned', stage: 'Healthy', arr: 0, renewal: new Date().toISOString().slice(0, 10) };
        rows.unshift(r); filter = ''; root.querySelector('[data-dg-filter]').value = ''; sortKey = null;
        root.querySelectorAll('th[aria-sort]').forEach(function (th) { th.setAttribute('aria-sort', 'none'); });
        render(); announce('Row added'); active = { r: 0, c: 0 }; edit(cellAt(0, 0));
      });
      root.querySelector('[data-dg-delete]').addEventListener('click', function () {
        var n = 0;
        rows = rows.filter(function (r) { if (selected[r.id]) { n++; return false; } return true; });
        selected = {}; render(); announce(n + ' row' + (n === 1 ? '' : 's') + ' deleted');
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ Pagination */
  R.register({
    id: 'pagination',
    name: 'Table pagination',
    category: 'Data',
    tags: ['pagination', 'pager', 'paging', 'table footer', 'rows per page'],
    description: 'Pagination footer with rows-per-page, range summary, previous/next and truncated page buttons.',
    a11y: ['Wrap in <nav aria-label="Pagination">', 'Current page has aria-current="page"', 'Disabled prev/next use the disabled attribute', 'Announce the visible range in a polite live region'],
    behavior: ['Changing rows per page keeps the first visible row in view', 'Ellipses collapse long page ranges'],
    html:
'<nav class="pgn" aria-label="Pagination">\n' +
'  <label class="pgn__size"><span class="ae-text-label-sm">Rows per page</span>\n' +
'    <select class="ae-select" data-pgn-size><option>10</option><option selected>25</option><option>50</option><option>100</option></select>\n' +
'  </label>\n' +
'  <p class="pgn__range ae-text-body-sm" aria-live="polite" data-pgn-range></p>\n' +
'  <div class="pgn__pages">\n' +
'    <button class="ae-btn ae-btn--ghost ae-btn--sm" type="button" data-pgn-prev aria-label="Previous page">' + I('chevronLeft') + '</button>\n' +
'    <ol class="pgn__list" data-pgn-list></ol>\n' +
'    <button class="ae-btn ae-btn--ghost ae-btn--sm" type="button" data-pgn-next aria-label="Next page">' + I('chevronRight') + '</button>\n' +
'  </div>\n' +
'</nav>',
    css:
'.pgn { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--aegis-space-12); padding: var(--aegis-space-12) var(--aegis-space-16); background: var(--aegis-bg-surface); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-md); }\n' +
'.pgn__size { display: inline-flex; align-items: center; gap: var(--aegis-space-8); }\n' +
'.pgn__size .ae-select { width: auto; height: var(--aegis-button-height-sm); }\n' +
'.pgn__range { margin: 0; color: var(--aegis-fg-muted); font-variant-numeric: tabular-nums; }\n' +
'.pgn__pages { display: flex; align-items: center; gap: var(--aegis-space-4); }\n' +
'.pgn__list { display: flex; gap: var(--aegis-space-4); list-style: none; margin: 0; padding: 0; }\n' +
'.pgn__list .ae-btn { min-width: var(--aegis-button-height-sm); padding: 0 var(--aegis-space-8); font-variant-numeric: tabular-nums; }\n' +
'.pgn__list .ae-btn[aria-current="page"] { background: var(--aegis-brand-default); border-color: var(--aegis-brand-default); color: var(--aegis-fg-on-brand); }\n' +
'.pgn__gap { display: grid; place-items: center; min-width: var(--aegis-space-24); color: var(--aegis-fg-subtle); }',
    js: function (root) {
      var total = 248, page = 1, size = 25;
      var list = root.querySelector('[data-pgn-list]');
      function pages() {
        var n = Math.ceil(total / size), out = [];
        for (var i = 1; i <= n; i++) if (i === 1 || i === n || Math.abs(i - page) <= 1) out.push(i); else if (out[out.length - 1] !== '…') out.push('…');
        return out;
      }
      function render() {
        var n = Math.ceil(total / size);
        list.innerHTML = pages().map(function (p) {
          return p === '…' ? '<li class="pgn__gap" aria-hidden="true">…</li>' :
            '<li><button class="ae-btn ae-btn--sm" type="button" data-page="' + p + '"' + (p === page ? ' aria-current="page"' : '') + ' aria-label="Page ' + p + '">' + p + '</button></li>';
        }).join('');
        var a = (page - 1) * size + 1, b = Math.min(total, page * size);
        root.querySelector('[data-pgn-range]').textContent = a + '–' + b + ' of ' + total;
        root.querySelector('[data-pgn-prev]').disabled = page === 1;
        root.querySelector('[data-pgn-next]').disabled = page === n;
      }
      list.addEventListener('click', function (e) { var b = e.target.closest('[data-page]'); if (b) { page = +b.getAttribute('data-page'); render(); list.querySelector('[aria-current]').focus(); } });
      root.querySelector('[data-pgn-prev]').addEventListener('click', function () { page = Math.max(1, page - 1); render(); });
      root.querySelector('[data-pgn-next]').addEventListener('click', function () { page = Math.min(Math.ceil(total / size), page + 1); render(); });
      root.querySelector('[data-pgn-size]').addEventListener('change', function (e) { var first = (page - 1) * size; size = +e.target.value; page = Math.floor(first / size) + 1; render(); });
      render();
    }
  });

  /* ------------------------------------------------------------------ Team members */
  R.register({
    id: 'team-table',
    name: 'Team members & roles',
    category: 'Data',
    tags: ['users', 'members', 'roles', 'permissions', 'invite', 'rbac', 'table', 'avatar'],
    description: 'Members table with avatars, inline role changes, status badges, an invite form and remove-with-undo.',
    a11y: ['Each role <select> has an aria-label naming the member', 'Invite email has a visible label and inline validation (aria-invalid + aria-describedby)', 'Removal is announced and offers Undo'],
    behavior: ['Invite validates email format and duplicates', 'Removing a member shows an Undo action for 6 seconds'],
    html:
'<section class="tm ae-card ae-card--flush" aria-labelledby="tm-title">\n' +
'  <header class="tm__head"><h2 class="ae-text-heading-sm" id="tm-title">Team members</h2><span class="ae-badge" data-tm-count></span></header>\n' +
'  <form class="tm__invite" novalidate data-tm-form>\n' +
'    <div class="ae-field"><label class="ae-label" for="tm-email">Invite by email</label>\n' +
'      <input class="ae-input" id="tm-email" type="email" autocomplete="email" placeholder="name@company.com" aria-describedby="tm-email-err"><span class="ae-help ae-help--error" id="tm-email-err" data-tm-err></span></div>\n' +
'    <div class="ae-field"><label class="ae-label" for="tm-role">Role</label><select class="ae-select" id="tm-role"><option>Viewer</option><option selected>Editor</option><option>Admin</option></select></div>\n' +
'    <button class="ae-btn ae-btn--primary" type="submit">Send invite</button>\n' +
'  </form>\n' +
'  <div class="ae-table-wrap"><table class="ae-table"><thead><tr><th>Member</th><th>Role</th><th>Status</th><th><span class="tm__sr">Actions</span></th></tr></thead><tbody data-tm-body></tbody></table></div>\n' +
'  <div class="tm__toast" role="status" data-tm-status></div>\n' +
'</section>',
    css:
'.tm__head { display: flex; align-items: center; gap: var(--aegis-space-8); padding: var(--aegis-space-16) var(--aegis-space-16) 0; }\n' +
'.tm__invite { display: grid; grid-template-columns: minmax(180px, 2fr) minmax(120px, 1fr) auto; align-items: start; gap: var(--aegis-space-12); padding: var(--aegis-space-16); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.tm__invite .ae-btn { margin-top: calc(var(--aegis-text-label-md-line) + var(--aegis-space-6)); }\n' +
'@media (max-width: 560px) { .tm__invite { grid-template-columns: 1fr; } .tm__invite .ae-btn { margin-top: 0; } }\n' +
'.tm__who { display: flex; align-items: center; gap: var(--aegis-space-12); }\n' +
'.tm__who small { display: block; color: var(--aegis-fg-muted); font: var(--aegis-text-caption); }\n' +
'.tm .ae-table .ae-select { height: var(--aegis-button-height-sm); width: auto; }\n' +
'.tm__toast { display: flex; align-items: center; justify-content: space-between; gap: var(--aegis-space-12); margin: var(--aegis-space-12) var(--aegis-space-16); padding: var(--aegis-space-8) var(--aegis-space-12); border-radius: var(--aegis-radius-md); background: var(--aegis-bg-emphasis); color: var(--aegis-fg-inverse); font: var(--aegis-text-body-sm); }\n' +
'.tm__toast:empty { display: none; }\n' +
'.tm__toast .ae-btn { --_fg: var(--aegis-fg-inverse); }\n' +
'.tm__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      var people = [
        { name: 'Priya Shah', email: 'priya@northwind.io', role: 'Admin', status: 'Active' },
        { name: 'Mateo Ruiz', email: 'mateo@northwind.io', role: 'Editor', status: 'Active' },
        { name: 'Ava Chen', email: 'ava@northwind.io', role: 'Viewer', status: 'Invited' }
      ];
      var body = root.querySelector('[data-tm-body]'), status = root.querySelector('[data-tm-status]'), undoTimer;
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      function initials(n) { return n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(function (p) { return p[0].toUpperCase(); }).join(''); }
      function render() {
        body.innerHTML = people.map(function (p, i) {
          return '<tr><td><div class="tm__who"><span class="ae-avatar ae-avatar--sm" aria-hidden="true">' + initials(p.name) + '</span><span>' + esc(p.name) + '<small>' + esc(p.email) + '</small></span></div></td>' +
            '<td><select class="ae-select" data-i="' + i + '" aria-label="Role for ' + esc(p.name) + '">' + ['Viewer', 'Editor', 'Admin'].map(function (r) { return '<option' + (r === p.role ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select></td>' +
            '<td><span class="ae-badge ae-badge--dot ae-badge--' + (p.status === 'Active' ? 'success' : 'warning') + '">' + p.status + '</span></td>' +
            '<td><button class="ae-btn ae-btn--ghost ae-btn--sm" type="button" data-remove="' + i + '">Remove<span class="tm__sr"> ' + esc(p.name) + '</span></button></td></tr>';
        }).join('');
        root.querySelector('[data-tm-count]').textContent = people.length + ' members';
      }
      function say(msg, undo) {
        clearTimeout(undoTimer);
        status.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button class="ae-btn ae-btn--ghost ae-btn--sm" type="button" data-undo>Undo</button>' : '');
        if (undo) status.querySelector('[data-undo]').onclick = function () { undo(); say('Restored'); };
        undoTimer = setTimeout(function () { status.innerHTML = ''; }, 6000);
      }
      body.addEventListener('change', function (e) { var i = e.target.getAttribute('data-i'); if (i !== null) { people[i].role = e.target.value; say(people[i].name + ' is now ' + e.target.value); } });
      body.addEventListener('click', function (e) {
        var b = e.target.closest('[data-remove]'); if (!b) return;
        var i = +b.getAttribute('data-remove'), gone = people.splice(i, 1)[0];
        render(); say(gone.name + ' removed', function () { people.splice(i, 0, gone); render(); });
      });
      root.querySelector('[data-tm-form]').addEventListener('submit', function (e) {
        e.preventDefault();
        var input = root.querySelector('#tm-email'), err = root.querySelector('[data-tm-err]'), v = input.value.trim().toLowerCase();
        var msg = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email address.' : people.some(function (p) { return p.email === v; }) ? 'That person is already on the team.' : '';
        input.setAttribute('aria-invalid', msg ? 'true' : 'false'); err.textContent = msg;
        if (msg) { input.focus(); return; }
        people.push({ name: v.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }), email: v, role: root.querySelector('#tm-role').value, status: 'Invited' });
        input.value = ''; render(); say('Invite sent to ' + v);
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ Activity timeline */
  R.register({
    id: 'activity-timeline',
    name: 'Activity timeline / audit log',
    category: 'Data',
    tags: ['timeline', 'audit log', 'activity', 'history', 'events', 'feed'],
    description: 'Chronological audit log with type filters, actor avatars, relative timestamps and expandable change details.',
    a11y: ['Render as an ordered list (<ol>) of <article>s', 'Timestamps use <time datetime>', 'Filters are toggle buttons with aria-pressed', 'Details use a disclosure button with aria-expanded'],
    behavior: ['Filter chips toggle event types', 'Expand an event to see its field-level diff'],
    html:
'<section class="tl ae-card" aria-labelledby="tl-title">\n' +
'  <div class="ae-card__header"><h2 class="ae-text-heading-sm" id="tl-title">Audit log</h2>\n' +
'    <div class="tl__filters" role="group" aria-label="Filter events">\n' +
'      <button class="tl__chip" type="button" aria-pressed="true" data-type="security">Security</button>\n' +
'      <button class="tl__chip" type="button" aria-pressed="true" data-type="billing">Billing</button>\n' +
'      <button class="tl__chip" type="button" aria-pressed="true" data-type="content">Content</button>\n' +
'    </div>\n' +
'  </div>\n' +
'  <ol class="tl__list" data-tl-list></ol>\n' +
'</section>',
    css:
'.tl__filters { display: flex; flex-wrap: wrap; gap: var(--aegis-space-6); }\n' +
'.tl__chip { font: var(--aegis-text-label-sm); height: var(--aegis-size-control-sm); padding: 0 var(--aegis-space-12); border-radius: var(--aegis-radius-full); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); background: var(--aegis-bg-surface); color: var(--aegis-fg-muted); cursor: pointer; }\n' +
'.tl__chip[aria-pressed="true"] { background: var(--aegis-brand-subtle); border-color: var(--aegis-brand-border); color: var(--aegis-brand-fg); }\n' +
'.tl__list { list-style: none; margin: 0; padding: 0; position: relative; }\n' +
'.tl__list::before { content: ""; position: absolute; left: calc(var(--aegis-size-control-sm) / 2); top: var(--aegis-space-8); bottom: var(--aegis-space-8); border-left: var(--aegis-border-width-thin) solid var(--aegis-border-default); }\n' +
'.tl__item { position: relative; display: grid; grid-template-columns: var(--aegis-size-control-sm) 1fr; gap: var(--aegis-space-12); padding: var(--aegis-space-8) 0; }\n' +
'.tl__item .ae-avatar { position: relative; box-shadow: 0 0 0 var(--aegis-space-4) var(--aegis-bg-surface); }\n' +
'.tl__line { margin: 0; font: var(--aegis-text-body-sm); }\n' +
'.tl__meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--aegis-space-8); margin-top: var(--aegis-space-2); font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.tl__toggle { all: unset; cursor: pointer; color: var(--aegis-fg-link); font: var(--aegis-text-label-sm); border-radius: var(--aegis-radius-xs); }\n' +
'.tl__toggle:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'.tl__diff { margin: var(--aegis-space-8) 0 0; padding: var(--aegis-space-8) var(--aegis-space-12); border-radius: var(--aegis-radius-sm); background: var(--aegis-bg-surface-sunken); font: var(--aegis-text-code); }\n' +
'.tl__diff del { color: var(--aegis-danger-fg); } .tl__diff ins { color: var(--aegis-success-fg); text-decoration: none; }',
    js: function (root) {
      var now = Date.now(), m = 60000;
      var events = [
        { type: 'security', who: 'PS', text: '<strong>Priya Shah</strong> enabled SSO enforcement for Northwind', t: now - 4 * m, diff: ['sso.enforced', 'false', 'true'] },
        { type: 'billing', who: 'MR', text: '<strong>Mateo Ruiz</strong> upgraded the plan to Enterprise', t: now - 52 * m, diff: ['plan', 'Growth', 'Enterprise'] },
        { type: 'content', who: 'AC', text: '<strong>Ava Chen</strong> published “Q4 onboarding checklist”', t: now - 3 * 60 * m, diff: ['status', 'draft', 'published'] },
        { type: 'security', who: 'JB', text: '<strong>Jonas Berg</strong> rotated the production API key', t: now - 26 * 60 * m, diff: ['key', 'sk_live_…9f2', 'sk_live_…c41'] },
        { type: 'billing', who: 'PS', text: '<strong>Priya Shah</strong> updated the billing email', t: now - 3 * 24 * 60 * m, diff: ['billing.email', 'ap@northwind.io', 'finance@northwind.io'] }
      ];
      var tone = { security: 'danger', billing: 'info', content: 'success' };
      var on = { security: true, billing: true, content: true };
      var rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      function rel(t) { var d = (t - Date.now()) / m; return Math.abs(d) < 60 ? rtf.format(Math.round(d), 'minute') : Math.abs(d) < 1440 ? rtf.format(Math.round(d / 60), 'hour') : rtf.format(Math.round(d / 1440), 'day'); }
      var list = root.querySelector('[data-tl-list]');
      function render() {
        var shown = events.filter(function (e) { return on[e.type]; });
        list.innerHTML = shown.map(function (e, i) {
          var id = 'tl-d-' + i;
          return '<li class="tl__item"><span class="ae-avatar ae-avatar--sm" aria-hidden="true">' + e.who + '</span><article><p class="tl__line">' + e.text + '</p>' +
            '<div class="tl__meta"><span class="ae-badge ae-badge--' + tone[e.type] + '">' + e.type + '</span><time datetime="' + new Date(e.t).toISOString() + '">' + rel(e.t) + '</time>' +
            '<button class="tl__toggle" type="button" aria-expanded="false" aria-controls="' + id + '">Details</button></div>' +
            '<pre class="tl__diff" id="' + id + '" hidden>' + e.diff[0] + ': <del>' + e.diff[1] + '</del> → <ins>' + e.diff[2] + '</ins></pre></article></li>';
        }).join('') || '<li class="ae-muted">No events for the selected filters.</li>';
      }
      root.querySelector('.tl__filters').addEventListener('click', function (e) {
        var b = e.target.closest('[data-type]'); if (!b) return;
        var t = b.getAttribute('data-type'); on[t] = !on[t]; b.setAttribute('aria-pressed', String(on[t])); render();
      });
      list.addEventListener('click', function (e) {
        var b = e.target.closest('.tl__toggle'); if (!b) return;
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        root.querySelector('#' + b.getAttribute('aria-controls')).hidden = !open;
        b.textContent = open ? 'Hide details' : 'Details';
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ Faceted filter bar */
  R.register({
    id: 'filter-bar',
    name: 'Faceted filter bar',
    category: 'Data',
    tags: ['filters', 'facets', 'chips', 'search', 'dropdown', 'checkbox', 'refine'],
    description: 'Search plus facet dropdowns with checkbox options, removable active-filter chips, clear-all and a live result count.',
    a11y: ['Facet triggers are buttons with aria-expanded/aria-controls', 'Options are native checkboxes inside a fieldset with a legend', 'Escape closes the open facet and returns focus to its trigger', 'Result count is announced in a polite live region'],
    behavior: ['Only one facet panel is open at a time', 'Clicking outside closes the panel'],
    html:
'<section class="fb" aria-label="Filter orders">\n' +
'  <div class="fb__row">\n' +
'    <label class="ae-input-group fb__q">' + I('search') + '<input class="ae-input" type="search" placeholder="Search orders" aria-label="Search orders" data-fb-q></label>\n' +
'    <div class="fb__facet"><button class="ae-btn" type="button" aria-expanded="false" aria-controls="fb-status" data-fb-btn>Status ' + I('chevronDown') + '</button>\n' +
'      <fieldset class="fb__panel" id="fb-status" hidden data-facet="status"><legend class="ae-text-label-sm">Status</legend></fieldset></div>\n' +
'    <div class="fb__facet"><button class="ae-btn" type="button" aria-expanded="false" aria-controls="fb-region" data-fb-btn>Region ' + I('chevronDown') + '</button>\n' +
'      <fieldset class="fb__panel" id="fb-region" hidden data-facet="region"><legend class="ae-text-label-sm">Region</legend></fieldset></div>\n' +
'  </div>\n' +
'  <div class="fb__active" data-fb-active></div>\n' +
'  <p class="ae-text-body-sm fb__count" aria-live="polite" data-fb-count></p>\n' +
'  <ul class="fb__results" data-fb-results></ul>\n' +
'</section>',
    css:
'.fb { display: grid; gap: var(--aegis-space-12); }\n' +
'.fb__row { display: flex; flex-wrap: wrap; gap: var(--aegis-space-8); }\n' +
'.fb__q { flex: 1 1 220px; }\n' +
'.fb__facet { position: relative; }\n' +
'.fb__panel { position: absolute; z-index: 10; top: calc(100% + var(--aegis-space-4)); left: 0; min-width: 200px; margin: 0; display: grid; gap: var(--aegis-space-8); padding: var(--aegis-space-12); background: var(--aegis-bg-surface-raised); border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-md); box-shadow: var(--aegis-shadow-lg); }\n' +
'.fb__panel[hidden] { display: none; }\n' +
'.fb__panel legend { padding: 0; margin-bottom: var(--aegis-space-4); color: var(--aegis-fg-muted); }\n' +
'.fb__active { display: flex; flex-wrap: wrap; gap: var(--aegis-space-6); }\n' +
'.fb__active:empty { display: none; }\n' +
'.fb__chip { display: inline-flex; align-items: center; gap: var(--aegis-space-4); height: var(--aegis-size-control-sm); padding: 0 var(--aegis-space-4) 0 var(--aegis-space-12); border-radius: var(--aegis-radius-full); background: var(--aegis-brand-subtle); color: var(--aegis-brand-fg); border: var(--aegis-border-width-thin) solid var(--aegis-brand-border); font: var(--aegis-text-label-sm); }\n' +
'.fb__chip button { all: unset; cursor: pointer; display: grid; place-items: center; width: var(--aegis-space-20); height: var(--aegis-space-20); border-radius: var(--aegis-radius-full); }\n' +
'.fb__chip button:hover { background: var(--aegis-brand-muted); } .fb__chip button:focus-visible { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'.fb__chip svg { width: var(--aegis-size-icon-sm); height: var(--aegis-size-icon-sm); }\n' +
'.fb__clear { all: unset; cursor: pointer; font: var(--aegis-text-label-sm); color: var(--aegis-fg-link); padding: 0 var(--aegis-space-8); }\n' +
'.fb__count { margin: 0; color: var(--aegis-fg-muted); }\n' +
'.fb__results { list-style: none; margin: 0; padding: 0; border: var(--aegis-border-width-thin) solid var(--aegis-border-default); border-radius: var(--aegis-radius-md); background: var(--aegis-bg-surface); }\n' +
'.fb__results li { display: flex; justify-content: space-between; gap: var(--aegis-space-12); padding: var(--aegis-space-8) var(--aegis-space-12); border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); font: var(--aegis-text-body-sm); }\n' +
'.fb__results li:last-child { border-bottom: 0; }',
    js: function (root) {
      var data = [
        ['SO-1042', 'Shipped', 'EMEA'], ['SO-1043', 'Pending', 'NA'], ['SO-1044', 'Delayed', 'APAC'], ['SO-1045', 'Shipped', 'NA'],
        ['SO-1046', 'Pending', 'EMEA'], ['SO-1047', 'Shipped', 'APAC'], ['SO-1048', 'Cancelled', 'NA'], ['SO-1049', 'Delayed', 'EMEA']
      ].map(function (r) { return { id: r[0], status: r[1], region: r[2] }; });
      var facets = { status: ['Shipped', 'Pending', 'Delayed', 'Cancelled'], region: ['NA', 'EMEA', 'APAC'] };
      var sel = { status: {}, region: {} }, q = '';
      Object.keys(facets).forEach(function (f) {
        var fs = root.querySelector('[data-facet="' + f + '"]');
        facets[f].forEach(function (v) { var l = document.createElement('label'); l.className = 'ae-check'; l.innerHTML = '<input type="checkbox" value="' + v + '"> ' + v; fs.appendChild(l); });
        fs.addEventListener('change', function (e) { sel[f][e.target.value] = e.target.checked; render(); });
      });
      function closeAll(except) {
        root.querySelectorAll('[data-fb-btn]').forEach(function (b) { if (b !== except) { b.setAttribute('aria-expanded', 'false'); root.querySelector('#' + b.getAttribute('aria-controls')).hidden = true; } });
      }
      root.querySelectorAll('[data-fb-btn]').forEach(function (b) {
        var panel = root.querySelector('#' + b.getAttribute('aria-controls'));
        b.addEventListener('click', function () { var open = b.getAttribute('aria-expanded') !== 'true'; closeAll(b); b.setAttribute('aria-expanded', String(open)); panel.hidden = !open; if (open) panel.querySelector('input').focus(); });
        panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); b.focus(); } });
      });
      document.addEventListener('click', function (e) { if (!e.target.closest('.fb__facet')) closeAll(); });
      root.querySelector('[data-fb-q]').addEventListener('input', function (e) { q = e.target.value.toLowerCase(); render(); });
      function active(f) { return Object.keys(sel[f]).filter(function (k) { return sel[f][k]; }); }
      function render() {
        var rows = data.filter(function (r) {
          return (!q || r.id.toLowerCase().indexOf(q) > -1) && Object.keys(facets).every(function (f) { var a = active(f); return !a.length || a.indexOf(r[f]) > -1; });
        });
        var chips = [];
        Object.keys(facets).forEach(function (f) { active(f).forEach(function (v) { chips.push('<span class="fb__chip">' + f + ': ' + v + '<button type="button" aria-label="Remove ' + f + ' ' + v + '" data-rm="' + f + '|' + v + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></span>'); }); });
        root.querySelector('[data-fb-active]').innerHTML = chips.length ? chips.join('') + '<button class="fb__clear" type="button" data-clear>Clear all</button>' : '';
        root.querySelector('[data-fb-count]').textContent = rows.length + ' of ' + data.length + ' orders';
        root.querySelector('[data-fb-results]').innerHTML = rows.map(function (r) { return '<li><span>' + r.id + '</span><span class="ae-muted">' + r.region + ' · ' + r.status + '</span></li>'; }).join('') || '<li class="ae-muted">No orders match these filters.</li>';
      }
      root.querySelector('[data-fb-active]').addEventListener('click', function (e) {
        var rm = e.target.closest('[data-rm]');
        if (rm) { var p = rm.getAttribute('data-rm').split('|'); sel[p[0]][p[1]] = false; root.querySelector('[data-facet="' + p[0] + '"] input[value="' + p[1] + '"]').checked = false; render(); root.querySelector('[data-fb-q]').focus(); }
        if (e.target.closest('[data-clear]')) { sel = { status: {}, region: {} }; root.querySelectorAll('.fb__panel input').forEach(function (i) { i.checked = false; }); render(); root.querySelector('[data-fb-q]').focus(); }
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ Ops metric meters */
  R.register({
    id: 'ops-metrics',
    name: 'Operations metrics with meters',
    category: 'Data',
    tags: ['metrics', 'kpi', 'sla', 'meter', 'progress', 'capacity', 'dashboard', 'status'],
    description: 'Capacity and SLA tiles with native <meter> bars whose tone follows thresholds, plus a status legend that never relies on color alone.',
    a11y: ['Use native <meter> with min/max/low/high/optimum and a visible label', 'Status is conveyed with an icon and text, not color only'],
    behavior: ['Thresholds: under 70% ok, 70–90% warning, over 90% critical'],
    html:
'<section class="om" aria-label="Operations metrics">\n' +
'  <article class="om__tile ae-card"><h3 class="ae-text-label-md">Warehouse capacity</h3><p class="om__value ae-text-numeric">82%</p>\n' +
'    <meter min="0" max="100" low="70" high="90" optimum="40" value="82" aria-label="Warehouse capacity 82%"></meter><p class="om__status om__status--warn">' + I('alert') + 'Approaching limit</p></article>\n' +
'  <article class="om__tile ae-card"><h3 class="ae-text-label-md">On-time delivery (SLA 95%)</h3><p class="om__value ae-text-numeric">97.4%</p>\n' +
'    <meter min="0" max="100" low="90" high="95" optimum="100" value="97.4" aria-label="On-time delivery 97.4%"></meter><p class="om__status om__status--ok">' + I('checkCircle') + 'Within SLA</p></article>\n' +
'  <article class="om__tile ae-card"><h3 class="ae-text-label-md">Fleet utilisation</h3><p class="om__value ae-text-numeric">94%</p>\n' +
'    <meter min="0" max="100" low="70" high="90" optimum="40" value="94" aria-label="Fleet utilisation 94%"></meter><p class="om__status om__status--bad">' + I('xCircle') + 'Over capacity</p></article>\n' +
'</section>',
    css:
'.om { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--aegis-space-12); }\n' +
'.om__tile { display: grid; gap: var(--aegis-space-8); }\n' +
'.om__tile h3 { margin: 0; color: var(--aegis-fg-muted); }\n' +
'.om__value { margin: 0; font: var(--aegis-text-heading-lg); font-variant-numeric: tabular-nums; }\n' +
'.om meter { width: 100%; height: var(--aegis-space-8); appearance: none; border: 0; border-radius: var(--aegis-radius-full); background: var(--aegis-bg-surface-sunken); }\n' +
'.om meter::-webkit-meter-bar { background: var(--aegis-bg-surface-sunken); border: 0; border-radius: var(--aegis-radius-full); height: var(--aegis-space-8); }\n' +
'.om meter::-webkit-meter-optimum-value { background: var(--aegis-success-default); border-radius: var(--aegis-radius-full); }\n' +
'.om meter::-webkit-meter-suboptimum-value { background: var(--aegis-warning-default); border-radius: var(--aegis-radius-full); }\n' +
'.om meter::-webkit-meter-even-less-good-value { background: var(--aegis-danger-default); border-radius: var(--aegis-radius-full); }\n' +
'.om meter:-moz-meter-optimum::-moz-meter-bar { background: var(--aegis-success-default); }\n' +
'.om meter:-moz-meter-sub-optimum::-moz-meter-bar { background: var(--aegis-warning-default); }\n' +
'.om meter:-moz-meter-sub-sub-optimum::-moz-meter-bar { background: var(--aegis-danger-default); }\n' +
'.om__status { display: flex; align-items: center; gap: var(--aegis-space-6); margin: 0; font: var(--aegis-text-label-sm); }\n' +
'.om__status svg { width: var(--aegis-size-icon-sm); height: var(--aegis-size-icon-sm); }\n' +
'.om__status--ok { color: var(--aegis-success-fg); } .om__status--warn { color: var(--aegis-warning-fg); } .om__status--bad { color: var(--aegis-danger-fg); }',
    js: null
  });
})();
