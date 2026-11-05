/* AegisUI — Live Enterprise Preview
 * Renders a sample B2B SaaS ("Meridian", fictional data) whose every style is
 * driven by CSS custom properties: dashboard, data table, Kanban, auth and a
 * settings modal. Interactions follow WAI-ARIA APG patterns.
 */
(function (Aegis) {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (name, label) => label
    ? `<svg class="ae-icon" role="img" aria-label="${esc(label)}" focusable="false"><use href="#ae-i-${name}"></use></svg>`
    : `<svg class="ae-icon" aria-hidden="true" focusable="false"><use href="#ae-i-${name}"></use></svg>`;

  const ICONS = {
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-6M2 20h20"/>',
    table: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M9 10v9"/>',
    kanban: '<rect x="4" y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="10" rx="1"/><rect x="16" y="4" width="4" height="13" rx="1"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 3 8 3 8H3s3-2 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    arrow: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 10v4M12 17.5v.01"/>',
    up: '<path d="M7 17 17 7M9 7h8v8"/>',
    down: '<path d="m7 7 10 10M17 9v8H9"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="m3 3 18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5v.01"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>'
  };

  /* ───────────── Sample data (fictional) ───────────── */
  const MRR = [118.4, 123.9, 128.6, 133.1, 140.8, 146.2, 151.9, 158.4, 164.7, 171.3, 177.9, 184.3];
  const MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

  const CUSTOMERS = [
    ['Northwind Traders', 'ops@northwind.example', 'Enterprise', 14800, 'Active', 220, '2027-03-14'],
    ['Halcyon Labs', 'finance@halcyon.example', 'Growth', 3900, 'Active', 48, '2026-12-02'],
    ['Bluefin Logistics', 'ap@bluefin.example', 'Enterprise', 11250, 'Past due', 160, '2026-11-20'],
    ['Copperline Studio', 'hello@copperline.example', 'Starter', 490, 'Trialing', 6, '2026-11-19'],
    ['Atlas Freight', 'billing@atlasfreight.example', 'Growth', 5200, 'Active', 72, '2027-01-08'],
    ['Juniper Health', 'it@juniper.example', 'Enterprise', 18900, 'Active', 310, '2027-06-30'],
    ['Kestrel Robotics', 'cfo@kestrel.example', 'Growth', 4300, 'Canceled', 40, '2026-10-31'],
    ['Lumen Analytics', 'team@lumen.example', 'Starter', 790, 'Active', 9, '2027-02-11'],
    ['Marlow & Finch', 'accounts@marlowfinch.example', 'Growth', 2950, 'Active', 31, '2027-04-03'],
    ['Nimbus Cloudworks', 'billing@nimbus.example', 'Enterprise', 9600, 'Trialing', 120, '2026-11-28'],
    ['Orchard Supply', 'admin@orchard.example', 'Starter', 390, 'Past due', 4, '2026-11-12'],
    ['Pioneer Dental', 'office@pioneer.example', 'Starter', 590, 'Active', 7, '2027-05-21'],
    ['Quarry Ventures', 'ops@quarry.example', 'Growth', 3400, 'Active', 36, '2027-01-27'],
    ['Riverstone Bank', 'procurement@riverstone.example', 'Enterprise', 22400, 'Active', 400, '2027-09-01'],
    ['Sable Security', 'sec@sable.example', 'Growth', 6100, 'Active', 80, '2027-02-18'],
    ['Tidewater Media', 'finance@tidewater.example', 'Growth', 2700, 'Trialing', 28, '2026-12-09'],
    ['Umber Coffee Co.', 'hq@umber.example', 'Starter', 290, 'Active', 3, '2027-03-02'],
    ['Vantage Legal', 'billing@vantage.example', 'Enterprise', 12700, 'Active', 175, '2027-07-15'],
    ['Willow Education', 'admin@willow.example', 'Growth', 4800, 'Past due', 64, '2026-11-25'],
    ['Xeno Biotech', 'it@xeno.example', 'Enterprise', 16300, 'Active', 240, '2027-08-08'],
    ['Yardline Sports', 'ops@yardline.example', 'Starter', 690, 'Canceled', 8, '2026-10-15'],
    ['Zephyr Airlines', 'ap@zephyr.example', 'Enterprise', 27900, 'Active', 520, '2027-10-01'],
    ['Brightpath Tutoring', 'team@brightpath.example', 'Starter', 450, 'Active', 5, '2027-01-19'],
    ['Cobalt Insurance', 'vendor@cobalt.example', 'Growth', 5750, 'Active', 70, '2027-05-05']
  ].map((r, i) => ({ id: 'c' + i, name: r[0], email: r[1], plan: r[2], mrr: r[3], status: r[4], seats: r[5], renewal: r[6] }));

  const COLUMNS = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'progress', title: 'In progress' },
    { id: 'review', title: 'In review' },
    { id: 'shipped', title: 'Shipped' }
  ];
  let TASKS = [
    { id: 't1', col: 'backlog', title: 'Usage-based billing API', tag: 'Platform', prio: 'high', who: 'AK', due: 'Dec 12' },
    { id: 't2', col: 'backlog', title: 'Dunning email copy refresh', tag: 'Growth', prio: 'low', who: 'RL', due: 'Dec 19' },
    { id: 't3', col: 'backlog', title: 'SAML just-in-time provisioning', tag: 'Security', prio: 'med', who: 'JM', due: 'Jan 6' },
    { id: 't4', col: 'progress', title: 'Invoice PDF redesign', tag: 'Design', prio: 'med', who: 'SN', due: 'Nov 22' },
    { id: 't5', col: 'progress', title: 'Revenue recognition export', tag: 'Finance', prio: 'high', who: 'DP', due: 'Nov 18' },
    { id: 't6', col: 'review', title: 'Keyboard support for data grid', tag: 'A11y', prio: 'high', who: 'MO', due: 'Nov 14' },
    { id: 't7', col: 'review', title: 'Webhook retry dashboard', tag: 'Platform', prio: 'low', who: 'AK', due: 'Nov 15' },
    { id: 't8', col: 'shipped', title: 'Dark mode for customer portal', tag: 'Design', prio: 'med', who: 'SN', due: 'Nov 3' },
    { id: 't9', col: 'shipped', title: 'Proration preview on plan change', tag: 'Growth', prio: 'med', who: 'RL', due: 'Oct 29' }
  ];

  const money = (n) => '$' + n.toLocaleString('en-US');
  const initials = (name) => name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const STATUS_TONE = { Active: 'success', Trialing: 'info', 'Past due': 'warning', Canceled: 'danger' };
  const PRIO = { high: 'High', med: 'Medium', low: 'Low' };

  /* ───────────── Markup ───────────── */
  function sprite() {
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${Object.keys(ICONS).map((k) =>
      `<symbol id="ae-i-${k}" viewBox="0 0 24 24">${ICONS[k]}</symbol>`).join('')}</defs></svg>`;
  }

  function sparkline(values) {
    const w = 100, h = 32, min = Math.min(...values), max = Math.max(...values);
    const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / (max - min || 1)) * (h - 6)]);
    const line = pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
    return `<svg class="ae-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polygon class="ae-spark__area" points="0,${h} ${line} ${w},${h}"></polygon><polyline points="${line}"></polyline></svg>`;
  }

  function chart() {
    const W = 640, H = 260, pl = 44, pr = 16, pt = 16, pb = 30;
    const yMin = 100, yMax = 200;
    const x = (i) => pl + (i / (MRR.length - 1)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - yMin) / (yMax - yMin)) * (H - pt - pb);
    const pts = MRR.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    const grid = [100, 125, 150, 175, 200].map((v) =>
      `<line class="ae-grid-line" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"></line><text class="ae-axis-label" x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">$${v}k</text>`).join('');
    const xl = MONTHS.map((m, i) => (i % 2 === 1 || i === MONTHS.length - 1)
      ? `<text class="ae-axis-label" x="${x(i)}" y="${H - 8}" text-anchor="middle">${m}</text>` : '').join('');
    const last = MRR.length - 1;
    return `<svg class="ae-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="ae-chart-title ae-chart-desc" focusable="false">
      <title id="ae-chart-title">Monthly recurring revenue, December 2025 to November 2026</title>
      <desc id="ae-chart-desc">MRR grew from $118.4k to $184.3k over 12 months, ahead of the dashed target line from $120k to $180k.</desc>
      <defs><linearGradient id="ae-area-grad" x1="0" y1="0" x2="0" y2="1"><stop class="ae-stop-a" offset="0"></stop><stop class="ae-stop-b" offset="1"></stop></linearGradient></defs>
      ${grid}${xl}
      <polygon class="ae-area" points="${pl},${y(yMin)} ${pts.join(' ')} ${x(last)},${y(yMin)}"></polygon>
      <line class="ae-target" x1="${x(0)}" y1="${y(120)}" x2="${x(last)}" y2="${y(180)}"></line>
      <polyline class="ae-line" points="${pts.join(' ')}"></polyline>
      <circle class="ae-dot" cx="${x(last)}" cy="${y(MRR[last])}" r="5"></circle>
    </svg>`;
  }

  function kpi(label, value, delta, up, good, series, note) {
    return `<li class="ae-card ae-kpi">
      <p class="ae-eyebrow">${label}</p>
      <p class="ae-kpi__value">${value}</p>
      <div class="ae-kpi__row">
        <span class="ae-delta ${good ? 'ae-delta--up' : 'ae-delta--down'}">${icon(up ? 'up' : 'down')}${delta}<span class="ae-sr-only"> ${note}</span></span>
        ${sparkline(series)}
      </div>
    </li>`;
  }

  function dashboard() {
    return `<section class="ae-screen" data-screen="dashboard" aria-labelledby="ae-dash-title">
      <div class="ae-page-head">
        <div class="ae-page-head__title">
          <p class="ae-eyebrow">Workspace · Meridian (sample data)</p>
          <h2 class="ae-h1" id="ae-dash-title">Revenue overview</h2>
        </div>
        <div class="ae-page-head__actions">
          <label class="ae-sr-only" for="ae-range">Date range</label>
          <select class="ae-select" id="ae-range"><option>Last 12 months</option><option>Last 90 days</option><option>Year to date</option></select>
          <button type="button" class="ae-btn ae-btn--secondary" data-toast="Export queued. You'll get an email when the CSV is ready.">${icon('download')}Export</button>
          <button type="button" class="ae-btn ae-btn--primary" data-toast="Draft invoice created.">${icon('plus')}New invoice</button>
        </div>
      </div>
      <div class="ae-alert" role="note">
        ${icon('alert')}
        <p><strong>3 invoices failed to collect.</strong> Retry runs tonight at 02:00 UTC. <a href="#" data-goto="table">Review past-due accounts</a></p>
      </div>
      <ul class="ae-kpis" aria-label="Key metrics">
        ${kpi('Monthly recurring revenue', '$184.3k', '+6.2%', true, true, MRR, 'up versus last month')}
        ${kpi('Active accounts', '1,284', '+38', true, true, [1102, 1120, 1141, 1150, 1172, 1190, 1205, 1221, 1238, 1250, 1246, 1284], 'net new this month')}
        ${kpi('Net revenue retention', '112%', '+1.4 pts', true, true, [104, 105, 107, 106, 108, 109, 109, 110, 111, 110, 111, 112], 'up versus last quarter')}
        ${kpi('Logo churn', '1.8%', '−0.3 pts', false, true, [2.6, 2.5, 2.4, 2.5, 2.3, 2.2, 2.2, 2.1, 2, 2.1, 2.1, 1.8], 'lower is better')}
      </ul>
      <div class="ae-dash-grid">
        <section class="ae-card" aria-labelledby="ae-mrr-title">
          <div class="ae-card__head">
            <div><h3 class="ae-h2" id="ae-mrr-title">MRR trend</h3><p class="ae-small ae-muted">Ahead of plan by $4.3k</p></div>
            <ul class="ae-legend ae-xs ae-muted"><li><span class="ae-legend__swatch"></span>Actual</li><li><span class="ae-legend__swatch ae-legend__swatch--target"></span>Target</li></ul>
          </div>
          <div class="ae-card__body">${chart()}</div>
        </section>
        <section class="ae-card" aria-labelledby="ae-mix-title">
          <div class="ae-card__head"><h3 class="ae-h2" id="ae-mix-title">Revenue by plan</h3></div>
          <div class="ae-card__body">
            <ul class="ae-bars">
              <li><div class="ae-bars__row ae-small"><span>Enterprise</span><span class="ae-num">$84.8k · 46%</span></div><div class="ae-meter" role="presentation"><span style="--w:46%"></span></div></li>
              <li><div class="ae-bars__row ae-small"><span>Growth</span><span class="ae-num">$57.1k · 31%</span></div><div class="ae-meter" role="presentation"><span style="--w:31%"></span></div></li>
              <li><div class="ae-bars__row ae-small"><span>Starter</span><span class="ae-num">$42.4k · 23%</span></div><div class="ae-meter" role="presentation"><span style="--w:23%"></span></div></li>
            </ul>
          </div>
        </section>
      </div>
      <section class="ae-card" aria-labelledby="ae-act-title">
        <div class="ae-card__head"><h3 class="ae-h2" id="ae-act-title">Recent activity</h3><a class="ae-small" href="#" data-goto="table">View all customers</a></div>
        <div class="ae-card__body">
          <ul class="ae-activity">
            <li><span class="ae-avatar" aria-hidden="true">RB</span><p><strong>Riverstone Bank</strong> upgraded to Enterprise · 400 seats<br><span class="ae-xs ae-muted"><time datetime="2026-11-05T09:12">Today, 09:12</time></span></p><span class="ae-badge ae-badge--success">Expansion</span></li>
            <li><span class="ae-avatar" aria-hidden="true">BL</span><p><strong>Bluefin Logistics</strong> payment failed · card expired<br><span class="ae-xs ae-muted"><time datetime="2026-11-05T07:40">Today, 07:40</time></span></p><span class="ae-badge ae-badge--warning">Past due</span></li>
            <li><span class="ae-avatar" aria-hidden="true">NC</span><p><strong>Nimbus Cloudworks</strong> started a 14-day Enterprise trial<br><span class="ae-xs ae-muted"><time datetime="2026-11-04T16:05">Yesterday, 16:05</time></span></p><span class="ae-badge ae-badge--info">Trial</span></li>
            <li><span class="ae-avatar" aria-hidden="true">KR</span><p><strong>Kestrel Robotics</strong> canceled · reason: budget<br><span class="ae-xs ae-muted"><time datetime="2026-11-03T11:30">Nov 3, 11:30</time></span></p><span class="ae-badge ae-badge--danger">Churned</span></li>
          </ul>
        </div>
      </section>
    </section>`;
  }

  function tableScreen() {
    return `<section class="ae-screen" data-screen="table" aria-labelledby="ae-table-title" hidden>
      <div class="ae-page-head">
        <div class="ae-page-head__title"><p class="ae-eyebrow">Billing</p><h2 class="ae-h1" id="ae-table-title">Customers</h2></div>
        <div class="ae-page-head__actions"><button type="button" class="ae-btn ae-btn--primary" data-toast="Invite sent to new customer.">${icon('plus')}Add customer</button></div>
      </div>
      <div class="ae-card">
        <div class="ae-table-tools">
          <div class="ae-input-group">${icon('search')}<label class="ae-sr-only" for="ae-q">Search customers</label><input class="ae-input" id="ae-q" type="search" placeholder="Search by name or email" autocomplete="off"></div>
          <label class="ae-sr-only" for="ae-status-filter">Filter by status</label>
          <select class="ae-select" id="ae-status-filter"><option value="">All statuses</option><option>Active</option><option>Trialing</option><option>Past due</option><option>Canceled</option></select>
          <div class="ae-table-tools__bulk"><span class="ae-small ae-muted" id="ae-selected-count">0 selected</span><button type="button" class="ae-btn ae-btn--secondary ae-btn--sm" id="ae-bulk" disabled>Send reminder</button></div>
        </div>
        <div class="ae-table-wrap">
          <table class="ae-table">
            <caption class="ae-sr-only">Customers, sortable by column. Use the checkboxes to select rows.</caption>
            <thead><tr>
              <th scope="col" class="ae-cell-check"><input type="checkbox" id="ae-check-all" aria-label="Select all customers on this page"></th>
              <th scope="col" data-key="name"><button type="button" class="ae-sort">Customer${icon('arrow')}</button></th>
              <th scope="col" data-key="plan"><button type="button" class="ae-sort">Plan${icon('arrow')}</button></th>
              <th scope="col" data-key="mrr" class="ae-cell-num"><button type="button" class="ae-sort">MRR${icon('arrow')}</button></th>
              <th scope="col" data-key="status"><button type="button" class="ae-sort">Status${icon('arrow')}</button></th>
              <th scope="col" data-key="seats" class="ae-cell-num"><button type="button" class="ae-sort">Seats${icon('arrow')}</button></th>
              <th scope="col" data-key="renewal"><button type="button" class="ae-sort">Renewal${icon('arrow')}</button></th>
              <th scope="col"><span class="ae-sr-only">Actions</span></th>
            </tr></thead>
            <tbody id="ae-tbody"></tbody>
          </table>
        </div>
        <div class="ae-table-foot">
          <p class="ae-small ae-muted" id="ae-range-label" aria-live="polite"></p>
          <nav class="ae-pager" aria-label="Pagination" id="ae-pager"></nav>
        </div>
      </div>
    </section>`;
  }

  function kanbanScreen() {
    return `<section class="ae-screen" data-screen="kanban" aria-labelledby="ae-kanban-title" hidden>
      <div class="ae-page-head">
        <div class="ae-page-head__title"><p class="ae-eyebrow">Product · Q4 roadmap</p><h2 class="ae-h1" id="ae-kanban-title">Roadmap board</h2></div>
        <div class="ae-page-head__actions"><p class="ae-small ae-muted">Drag cards, or use “Move to” on each card.</p></div>
      </div>
      <div class="ae-board" id="ae-board"></div>
    </section>`;
  }

  function appShell() {
    const nav = [
      ['dashboard', 'chart', 'Overview', ''],
      ['table', 'table', 'Customers', '24'],
      ['kanban', 'kanban', 'Roadmap', '9']
    ];
    return `<div class="ae-app" id="ae-app">
      <aside class="ae-sidebar">
        <div class="ae-brand"><span class="ae-brand__mark">${icon('shield')}</span><span class="ae-brand__name">Meridian</span></div>
        <nav class="ae-nav" aria-label="Sample app">
          <p class="ae-eyebrow ae-nav__label">Workspace</p>
          ${nav.map(([id, ic, label, count]) => `<button type="button" class="ae-nav__item" data-goto="${id}">${icon(ic)}<span>${label}</span>${count ? `<span class="ae-badge ae-badge--plain ae-count" aria-label="${count} items">${count}</span>` : ''}</button>`).join('')}
          <button type="button" class="ae-nav__item" data-goto="auth">${icon('lock')}<span>Sign-in page</span></button>
        </nav>
        <div class="ae-sidebar__foot">
          <div class="ae-plan">
            <p class="ae-small"><strong>Growth plan</strong></p>
            <div class="ae-meter" role="progressbar" aria-label="Seats used" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100"><span style="--w:72%"></span></div>
            <p class="ae-xs ae-muted">72 of 100 seats used</p>
          </div>
          <button type="button" class="ae-nav__item" data-open-settings>${icon('settings')}<span>Settings</span></button>
          <a class="ae-nav__item" href="#" data-toast="Help center would open here.">${icon('help')}<span>Help</span></a>
        </div>
      </aside>
      <div class="ae-content">
        <div class="ae-topbar">
          <div class="ae-input-group">${icon('search')}<label class="ae-sr-only" for="ae-global-search">Search Meridian</label><input class="ae-input" id="ae-global-search" type="search" placeholder="Search invoices, customers…"></div>
          <div class="ae-topbar__actions">
            <button type="button" class="ae-btn ae-btn--ghost ae-btn--icon" aria-label="Notifications, 3 unread" data-toast="You have 3 unread notifications.">${icon('bell')}</button>
            <button type="button" class="ae-btn ae-btn--ghost ae-btn--icon" aria-label="Open settings" data-open-settings>${icon('settings')}</button>
            <span class="ae-avatar" role="img" aria-label="Signed in as Dana Patel">DP</span>
          </div>
        </div>
        <div class="ae-main" id="ae-main">
          ${dashboard()}
          ${tableScreen()}
          ${kanbanScreen()}
        </div>
      </div>
    </div>`;
  }

  function authScreen() {
    return `<div class="ae-auth" id="ae-auth" hidden>
      <div class="ae-auth__brand">
        <div class="ae-brand"><span class="ae-brand__mark">${icon('shield')}</span><span>Meridian</span></div>
        <figure class="ae-auth__quote">
          <blockquote><p>“We closed our books four days faster the first month. Finance finally trusts the numbers.”</p></blockquote>
          <figcaption>Priya Raman · VP Finance, Riverstone Bank (sample)</figcaption>
        </figure>
        <p class="ae-xs">SOC 2 Type II · GDPR · 99.99% uptime</p>
      </div>
      <div class="ae-auth__form-wrap">
        <form class="ae-auth__form" id="ae-login" novalidate aria-labelledby="ae-login-title">
          <div class="ae-page-head__title">
            <h2 class="ae-h1" id="ae-login-title">Sign in to Meridian</h2>
            <p class="ae-small ae-muted">New here? <a href="#" data-toast="Sign-up flow would open here.">Start a free trial</a></p>
          </div>
          <div class="ae-error-summary" id="ae-login-summary" role="alert" tabindex="-1" hidden></div>
          <div class="ae-auth__sso">
            <button type="button" class="ae-btn ae-btn--secondary ae-btn--block" data-toast="Redirecting to your identity provider…">${icon('key')}Continue with SSO</button>
          </div>
          <p class="ae-divider">or with email</p>
          <div class="ae-field">
            <label class="ae-label" for="ae-email">Work email</label>
            <input class="ae-input" id="ae-email" name="email" type="email" autocomplete="username" inputmode="email" aria-describedby="ae-email-err" required>
            <p class="ae-error" id="ae-email-err" hidden></p>
          </div>
          <div class="ae-field">
            <div class="ae-row-between"><label class="ae-label" for="ae-password">Password</label><a class="ae-xs" href="#" data-toast="Password reset email sent (demo).">Forgot password?</a></div>
            <div class="ae-input-group">
              ${icon('lock')}
              <input class="ae-input" id="ae-password" name="password" type="password" autocomplete="current-password" aria-describedby="ae-pw-hint ae-pw-err" required>
              <button type="button" class="ae-btn ae-btn--ghost ae-btn--icon ae-btn--sm ae-input-action" id="ae-pw-toggle" aria-pressed="false" aria-label="Show password">${icon('eye')}</button>
            </div>
            <p class="ae-hint" id="ae-pw-hint">Paste and password managers are supported.</p>
            <p class="ae-error" id="ae-pw-err" hidden></p>
          </div>
          <label class="ae-check"><input type="checkbox" id="ae-remember" checked>Keep me signed in for 30 days</label>
          <button type="submit" class="ae-btn ae-btn--primary ae-btn--block">Sign in</button>
          <p class="ae-xs ae-muted"><a href="#" data-goto="dashboard">← Back to the dashboard</a></p>
        </form>
      </div>
    </div>`;
  }

  function modal() {
    return `<div class="ae-modal-layer" id="ae-modal-layer" hidden>
      <div class="ae-modal" role="dialog" aria-modal="true" aria-labelledby="ae-modal-title" aria-describedby="ae-modal-desc" id="ae-modal">
        <div class="ae-modal__head">
          <div><h2 class="ae-h2" id="ae-modal-title">Workspace settings</h2><p class="ae-small ae-muted" id="ae-modal-desc">Changes apply to everyone in Meridian.</p></div>
          <button type="button" class="ae-btn ae-btn--ghost ae-btn--icon ae-btn--sm" data-close-modal aria-label="Close settings">${icon('x')}</button>
        </div>
        <div class="ae-tabs" role="tablist" aria-label="Settings sections">
          <button type="button" class="ae-tab" role="tab" id="ae-tab-general" aria-controls="ae-tp-general" aria-selected="true">General</button>
          <button type="button" class="ae-tab" role="tab" id="ae-tab-notify" aria-controls="ae-tp-notify" aria-selected="false" tabindex="-1">Notifications</button>
          <button type="button" class="ae-tab" role="tab" id="ae-tab-security" aria-controls="ae-tp-security" aria-selected="false" tabindex="-1">Security</button>
        </div>
        <div class="ae-modal__body" role="tabpanel" id="ae-tp-general" aria-labelledby="ae-tab-general">
          <div class="ae-form-grid">
            <div class="ae-field ae-span-2"><label class="ae-label" for="ae-ws-name">Workspace name</label><input class="ae-input" id="ae-ws-name" value="Meridian Finance" autocomplete="organization"></div>
            <div class="ae-field"><label class="ae-label" for="ae-tz">Time zone</label><select class="ae-select" id="ae-tz"><option>UTC−08:00 Pacific</option><option selected>UTC+00:00 London</option><option>UTC+05:30 Mumbai</option></select></div>
            <div class="ae-field"><label class="ae-label" for="ae-currency">Reporting currency</label><select class="ae-select" id="ae-currency"><option selected>USD — US dollar</option><option>EUR — Euro</option><option>GBP — Pound sterling</option></select></div>
            <div class="ae-field ae-span-2"><label class="ae-label" for="ae-billing-email">Billing contact</label><p class="ae-hint" id="ae-billing-hint">Receipts and failed-payment alerts go here.</p><input class="ae-input" id="ae-billing-email" type="email" value="finance@meridian.example" autocomplete="email" aria-describedby="ae-billing-hint"></div>
          </div>
          <div class="ae-danger-zone"><div><p class="ae-small"><strong>Delete workspace</strong></p><p class="ae-xs ae-muted">Removes all invoices and customers. This can't be undone.</p></div><button type="button" class="ae-btn ae-btn--danger ae-btn--sm" data-toast="Deletion needs owner approval (demo).">Delete workspace</button></div>
        </div>
        <div class="ae-modal__body" role="tabpanel" id="ae-tp-notify" aria-labelledby="ae-tab-notify" hidden>
          <div>
            ${[['Failed payments', 'Email me when a charge is declined.', true], ['Weekly revenue digest', 'Monday summary of MRR, churn and expansion.', true], ['New trial sign-ups', 'Notify the sales channel in real time.', false], ['Product updates', 'Occasional release notes from Meridian.', false]].map(([t, d, on], i) =>
              `<div class="ae-setting"><div><p class="ae-small" id="ae-sw-l${i}"><strong>${t}</strong></p><p class="ae-xs ae-muted" id="ae-sw-d${i}">${d}</p></div><button type="button" class="ae-switch" role="switch" aria-checked="${on}" aria-labelledby="ae-sw-l${i}" aria-describedby="ae-sw-d${i}"></button></div>`).join('')}
          </div>
        </div>
        <div class="ae-modal__body" role="tabpanel" id="ae-tp-security" aria-labelledby="ae-tab-security" hidden>
          <div class="ae-setting"><div><p class="ae-small" id="ae-sw-2fa"><strong>Require two-factor authentication</strong></p><p class="ae-xs ae-muted" id="ae-sw-2fa-d">Members without 2FA are asked to set it up at next sign-in.</p></div><button type="button" class="ae-switch" role="switch" aria-checked="true" aria-labelledby="ae-sw-2fa" aria-describedby="ae-sw-2fa-d"></button></div>
          <fieldset class="ae-fieldset">
            <legend class="ae-label">Idle session timeout</legend>
            <div class="ae-radios">
              ${['15 minutes', '1 hour', '8 hours', '24 hours'].map((t, i) => `<label class="ae-radio-card"><input type="radio" name="ae-timeout" ${i === 1 ? 'checked' : ''}>${t}</label>`).join('')}
            </div>
          </fieldset>
        </div>
        <div class="ae-modal__foot">
          <button type="button" class="ae-btn ae-btn--secondary" data-close-modal>Cancel</button>
          <button type="button" class="ae-btn ae-btn--primary" data-save-modal>Save changes</button>
        </div>
      </div>
    </div>`;
  }

  /* ───────────── Behaviour ───────────── */
  function mount(root) {
    root.innerHTML = sprite() + appShell() + authScreen() + modal() + '<div class="ae-toasts" role="status" aria-live="polite" id="ae-toasts"></div>';
    const $ = (sel) => root.querySelector(sel);
    const $$ = (sel) => Array.from(root.querySelectorAll(sel));
    const listeners = new Set();

    /* Toasts */
    function toast(msg) {
      const region = $('#ae-toasts');
      const el = document.createElement('div');
      el.className = 'ae-toast';
      el.innerHTML = `${icon('check')}<span>${esc(msg)}</span>`;
      region.appendChild(el);
      setTimeout(() => { el.dataset.leaving = 'true'; setTimeout(() => el.remove(), 400); }, 3200);
    }

    /* Screens */
    let screen = 'dashboard';
    function setScreen(name) {
      if (name === 'settings') { setScreen(screen === 'auth' ? 'dashboard' : screen); openModal(); return; }
      screen = name;
      if (!layer.hidden) { layer.hidden = true; }
      const isAuth = name === 'auth';
      $('#ae-app').hidden = isAuth;
      $('#ae-auth').hidden = !isAuth;
      $$('.ae-screen').forEach((s) => { s.hidden = s.dataset.screen !== name; });
      $$('.ae-nav__item[data-goto]').forEach((b) => {
        if (b.dataset.goto === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      });
      const main = $('#ae-main'); if (main) main.scrollTop = 0;
      listeners.forEach((fn) => fn(name));
    }

    root.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) { e.preventDefault(); setScreen(go.dataset.goto); return; }
      const t = e.target.closest('[data-toast]');
      if (t) { e.preventDefault(); toast(t.dataset.toast); }
      if (e.target.closest('[data-open-settings]')) openModal(e.target.closest('[data-open-settings]'));
    });

    /* Data table */
    const tState = { sort: 'mrr', dir: 'descending', q: '', status: '', page: 1, size: 8, selected: new Set() };
    function rows() {
      let list = CUSTOMERS.filter((c) => (!tState.q || (c.name + ' ' + c.email).toLowerCase().includes(tState.q)) && (!tState.status || c.status === tState.status));
      const k = tState.sort, m = tState.dir === 'ascending' ? 1 : -1;
      list = list.slice().sort((a, b) => (typeof a[k] === 'number' ? (a[k] - b[k]) : String(a[k]).localeCompare(String(b[k]))) * m);
      return list;
    }
    function renderTable() {
      const list = rows();
      const pages = Math.max(1, Math.ceil(list.length / tState.size));
      tState.page = Math.min(tState.page, pages);
      const start = (tState.page - 1) * tState.size;
      const pageRows = list.slice(start, start + tState.size);
      $('#ae-tbody').innerHTML = pageRows.length ? pageRows.map((c) => {
        const sel = tState.selected.has(c.id);
        const d = new Date(c.renewal + 'T00:00:00');
        return `<tr aria-selected="${sel}">
          <td class="ae-cell-check"><input type="checkbox" data-row="${c.id}" ${sel ? 'checked' : ''} aria-label="Select ${esc(c.name)}"></td>
          <th scope="row"><div class="ae-cust"><span class="ae-avatar ae-avatar--sm" aria-hidden="true">${initials(c.name)}</span><div><strong>${esc(c.name)}</strong><span class="ae-xs ae-muted">${esc(c.email)}</span></div></div></th>
          <td>${c.plan}</td>
          <td class="ae-cell-num">${money(c.mrr)}</td>
          <td><span class="ae-badge ae-badge--${STATUS_TONE[c.status]}">${c.status}</span></td>
          <td class="ae-cell-num">${c.seats}</td>
          <td><time datetime="${c.renewal}">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</time></td>
          <td><button type="button" class="ae-btn ae-btn--ghost ae-btn--icon ae-btn--sm" aria-label="More actions for ${esc(c.name)}" data-toast="Actions menu for ${esc(c.name)}">${icon('more')}</button></td>
        </tr>`;
      }).join('') : `<tr><td colspan="8" class="ae-empty">No customers match “${esc(tState.q)}”. Clear the search or change the status filter.</td></tr>`;
      $$('.ae-table thead th[data-key]').forEach((th) => {
        if (th.dataset.key === tState.sort) th.setAttribute('aria-sort', tState.dir); else th.removeAttribute('aria-sort');
      });
      $('#ae-range-label').textContent = list.length ? `Showing ${start + 1}–${start + pageRows.length} of ${list.length} customers` : 'No results';
      const pager = $('#ae-pager');
      let ph = `<button type="button" class="ae-btn ae-btn--ghost ae-btn--icon ae-btn--sm" data-page="${tState.page - 1}" aria-label="Previous page" ${tState.page === 1 ? 'disabled' : ''}>${icon('left')}</button>`;
      for (let i = 1; i <= pages; i++) ph += `<button type="button" class="ae-btn ae-btn--ghost ae-btn--sm" data-page="${i}" ${i === tState.page ? 'aria-current="page"' : ''} aria-label="Page ${i}">${i}</button>`;
      ph += `<button type="button" class="ae-btn ae-btn--ghost ae-btn--icon ae-btn--sm" data-page="${tState.page + 1}" aria-label="Next page" ${tState.page === pages ? 'disabled' : ''}>${icon('chevron')}</button>`;
      pager.innerHTML = ph;
      const allOnPage = pageRows.length && pageRows.every((c) => tState.selected.has(c.id));
      const someOnPage = pageRows.some((c) => tState.selected.has(c.id));
      const ca = $('#ae-check-all');
      ca.checked = !!allOnPage; ca.indeterminate = !allOnPage && someOnPage;
      $('#ae-selected-count').textContent = `${tState.selected.size} selected`;
      $('#ae-bulk').disabled = tState.selected.size === 0;
      tState.pageIds = pageRows.map((c) => c.id);
    }
    $('.ae-table thead').addEventListener('click', (e) => {
      const b = e.target.closest('.ae-sort'); if (!b) return;
      const key = b.closest('th').dataset.key;
      tState.dir = tState.sort === key && tState.dir === 'ascending' ? 'descending' : 'ascending';
      tState.sort = key; renderTable();
    });
    $('#ae-q').addEventListener('input', (e) => { tState.q = e.target.value.trim().toLowerCase(); tState.page = 1; renderTable(); });
    $('#ae-status-filter').addEventListener('change', (e) => { tState.status = e.target.value; tState.page = 1; renderTable(); });
    $('#ae-pager').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (!b || b.disabled) return; tState.page = +b.dataset.page; renderTable(); });
    $('#ae-tbody').addEventListener('change', (e) => {
      const id = e.target.dataset.row; if (!id) return;
      if (e.target.checked) tState.selected.add(id); else tState.selected.delete(id);
      renderTable();
    });
    $('#ae-check-all').addEventListener('change', (e) => {
      (tState.pageIds || []).forEach((id) => (e.target.checked ? tState.selected.add(id) : tState.selected.delete(id)));
      renderTable();
    });
    $('#ae-bulk').addEventListener('click', () => { toast(`Payment reminder sent to ${tState.selected.size} customer${tState.selected.size === 1 ? '' : 's'}.`); tState.selected.clear(); renderTable(); });
    renderTable();

    /* Kanban — drag & drop plus single-pointer alternative (WCAG 2.2 SC 2.5.7) */
    function renderBoard(focusId) {
      $('#ae-board').innerHTML = COLUMNS.map((col) => {
        const tasks = TASKS.filter((t) => t.col === col.id);
        return `<section class="ae-col" data-col="${col.id}" aria-labelledby="ae-col-${col.id}">
          <div class="ae-col__head"><h3 class="ae-h3" id="ae-col-${col.id}">${col.title}</h3><span class="ae-badge ae-badge--plain" aria-label="${tasks.length} cards">${tasks.length}</span></div>
          <ul class="ae-col__list">${tasks.map((t) => `<li class="ae-task" draggable="true" data-task="${t.id}">
            <div class="ae-task__meta"><span class="ae-badge ae-badge--primary ae-badge--plain">${t.tag}</span><span class="ae-xs ae-prio ae-prio--${t.prio}">${icon('flag')}${PRIO[t.prio]}<span class="ae-sr-only"> priority</span></span></div>
            <h4>${esc(t.title)}</h4>
            <div class="ae-task__foot">
              <span class="ae-xs ae-muted ae-prio">${icon('calendar')}<span class="ae-sr-only">Due </span>${t.due}</span>
              <label class="ae-sr-only" for="ae-move-${t.id}">Move “${esc(t.title)}” to</label>
              <select class="ae-select ae-task__move" id="ae-move-${t.id}" data-move="${t.id}">${COLUMNS.map((c) => `<option value="${c.id}" ${c.id === t.col ? 'selected' : ''}>${c.id === t.col ? 'Move to…' : c.title}</option>`).join('')}</select>
              <span class="ae-avatar ae-avatar--sm" role="img" aria-label="Assigned to ${t.who}">${t.who}</span>
            </div>
          </li>`).join('')}</ul>
        </section>`;
      }).join('');
      if (focusId) { const s = $(`#ae-move-${focusId}`); if (s) { s.focus({ preventScroll: true }); s.closest('.ae-task').scrollIntoView({ block: 'nearest', inline: 'nearest' }); } }
    }
    function moveTask(id, col) {
      const t = TASKS.find((x) => x.id === id); if (!t || t.col === col) return;
      TASKS = TASKS.filter((x) => x.id !== id).concat([{ ...t, col }]);
      renderBoard(id);
      toast(`Moved “${t.title}” to ${COLUMNS.find((c) => c.id === col).title}.`);
    }
    const board = $('#ae-board');
    board.addEventListener('change', (e) => { const id = e.target.dataset.move; if (id) moveTask(id, e.target.value); });
    board.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.ae-task'); if (!card) return;
      card.dataset.dragging = 'true';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.task);
    });
    board.addEventListener('dragend', (e) => { const c = e.target.closest('.ae-task'); if (c) c.dataset.dragging = 'false'; $$('.ae-col').forEach((c2) => { c2.dataset.over = 'false'; }); });
    board.addEventListener('dragover', (e) => { const col = e.target.closest('.ae-col'); if (!col) return; e.preventDefault(); $$('.ae-col').forEach((c) => { c.dataset.over = String(c === col); }); });
    board.addEventListener('drop', (e) => { const col = e.target.closest('.ae-col'); if (!col) return; e.preventDefault(); moveTask(e.dataTransfer.getData('text/plain'), col.dataset.col); });
    renderBoard();

    /* Auth form — error summary + inline errors (SC 3.3.1, 3.3.3), show password (SC 3.3.8) */
    const pwToggle = $('#ae-pw-toggle');
    pwToggle.addEventListener('click', () => {
      const pw = $('#ae-password');
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      pwToggle.setAttribute('aria-pressed', String(show));
      pwToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      pwToggle.innerHTML = icon(show ? 'eye-off' : 'eye');
    });
    $('#ae-login').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#ae-email'), pw = $('#ae-password');
      const errs = [];
      const setErr = (input, errEl, msg) => {
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
        errEl.hidden = !msg; errEl.innerHTML = msg ? `${icon('alert')}${esc(msg)}` : '';
        if (msg) errs.push([input.id, msg]);
      };
      const ev = email.value.trim();
      setErr(email, $('#ae-email-err'), !ev ? 'Enter your work email.' : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ev) ? 'Enter an email address like name@company.com.' : '');
      setErr(pw, $('#ae-pw-err'), !pw.value ? 'Enter your password.' : pw.value.length < 8 ? 'Passwords are at least 8 characters.' : '');
      const sum = $('#ae-login-summary');
      if (errs.length) {
        sum.innerHTML = `<strong>Fix ${errs.length} ${errs.length === 1 ? 'problem' : 'problems'} to sign in:</strong><ul>${errs.map(([id, m]) => `<li><a href="#${id}" data-focus="${id}">${esc(m)}</a></li>`).join('')}</ul>`;
        sum.hidden = false; sum.focus();
      } else {
        sum.hidden = true;
        toast('Signed in (demo). Welcome back, Dana.');
        setTimeout(() => setScreen('dashboard'), 600);
      }
    });
    $('#ae-login-summary').addEventListener('click', (e) => { const a = e.target.closest('[data-focus]'); if (a) { e.preventDefault(); $('#' + a.dataset.focus).focus(); } });

    /* Modal dialog — focus containment, Escape, focus return (APG dialog pattern) */
    let lastFocus = null;
    const layer = $('#ae-modal-layer');
    const focusables = () => $$('#ae-modal button, #ae-modal input, #ae-modal select, #ae-modal [tabindex]:not([tabindex="-1"])').filter((el) => !el.disabled && !el.closest('[hidden]') && el.getAttribute('tabindex') !== '-1');
    function openModal(trigger) {
      lastFocus = trigger || document.activeElement;
      layer.hidden = false;
      listeners.forEach((fn) => fn('settings'));
      setTimeout(() => { const f = $('#ae-ws-name'); (f && !f.closest('[hidden]') ? f : focusables()[0]).focus(); }, 30);
    }
    function closeModal() {
      if (layer.hidden) return;
      layer.hidden = true;
      listeners.forEach((fn) => fn(screen));
      if (lastFocus && root.contains(lastFocus) && lastFocus.offsetParent !== null) lastFocus.focus();
    }
    layer.addEventListener('click', (e) => {
      if (e.target === layer || e.target.closest('[data-close-modal]')) closeModal();
      if (e.target.closest('[data-save-modal]')) { closeModal(); toast('Workspace settings saved.'); }
      const sw = e.target.closest('.ae-switch');
      if (sw) sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
    });
    layer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeModal(); return; }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // Tabs (APG tabs, automatic activation)
    const tabs = $$('.ae-tab');
    function selectTab(tab, focus) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => selectTab(t));
      t.addEventListener('keydown', (e) => {
        const map = { ArrowRight: 1, ArrowLeft: -1 };
        if (map[e.key]) { e.preventDefault(); selectTab(tabs[(i + map[e.key] + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
      });
    });

    setScreen('dashboard');
    return {
      setScreen,
      openModal,
      closeModal,
      onScreen: (fn) => listeners.add(fn),
      get screen() { return screen; }
    };
  }

  Aegis.preview = { mount };
})(window.Aegis = window.Aegis || {});
