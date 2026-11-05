/* AegisUI preset gallery — vanilla JS, no build step. Requires ../aegis-presets.js. */
(function () {
  'use strict';
  var P = window.AegisPresets;
  if (!P) { document.body.innerHTML = '<p style="padding:24px">aegis-presets.js not found — run <code>npm run build</code>.</p>'; return; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  var state = readHash();
  if (P.ids.indexOf(state.theme) < 0) state.theme = P.ids[0];
  if (!state.view) state.view = 'dashboard';
  if (!state.mode) state.mode = P.get(state.theme).meta.defaultMode;

  /* ── icons (24px, stroke) ── */
  var I = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    plus: 'M12 5v14M5 12h14',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
    check: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
    alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + I[n] + '"/></svg>'; }

  /* ── copy per preset category (keeps previews believable) ── */
  var COPY = {
    Finance: { app: 'Meridian', title: 'Portfolio overview', k: [['Net asset value', '$48.21M', '+2.41%'], ['Day P&L', '+$1.16M', '+0.82%'], ['Open orders', '1,284', '-3.1%'], ['VaR (95%)', '$612K', '+0.4%']], rows: [['AAPL', 'Equity', 'Filled', '182.44', '+1.92%'], ['EUR/USD', 'FX', 'Working', '1.0871', '-0.12%'], ['UST 10Y', 'Rates', 'Filled', '4.212', '+0.03%'], ['BTC-PERP', 'Crypto', 'Rejected', '67,410', '-2.40%']] },
    Healthcare: { app: 'Carepath', title: 'Clinic overview', k: [['Patients today', '142', '+8%'], ['Avg. wait', '11 min', '-14%'], ['Bed occupancy', '87%', '+3%'], ['Open referrals', '36', '-5%']], rows: [['M. Okafor', 'Cardiology', 'Checked in', '09:30', 'Room 4'], ['J. Lindqvist', 'Radiology', 'Waiting', '09:45', 'Lab 2'], ['A. Moreau', 'Oncology', 'Discharged', '10:00', '—'], ['S. Patel', 'Pediatrics', 'Overdue', '10:15', 'Room 1']] },
    'Public sector': { app: 'Citizen services', title: 'Applications', k: [['Applications', '3,920', '+12%'], ['Processed', '3,104', '+9%'], ['Median time', '4.2 days', '-0.6'], ['Appeals', '58', '-11%']], rows: [['Passport renewal', 'Online', 'Approved', '12 Mar', 'AB-2041'], ['Business licence', 'Post', 'In review', '14 Mar', 'BL-0932'], ['Housing benefit', 'Online', 'Approved', '15 Mar', 'HB-7712'], ['Driving permit', 'In person', 'Action needed', '18 Mar', 'DP-1180']] },
    Commerce: { app: 'Atelier', title: 'Store performance', k: [['Revenue', '$284,190', '+18.2%'], ['Orders', '3,412', '+9.4%'], ['Conversion', '3.9%', '+0.6%'], ['Returns', '2.1%', '-0.3%']], rows: [['#10482', 'Linen overshirt', 'Paid', '$148.00', '2 items'], ['#10481', 'Wool runner', 'Shipped', '$212.00', '1 item'], ['#10480', 'Canvas tote', 'Paid', '$64.00', '3 items'], ['#10479', 'Silk scarf', 'Refunded', '$96.00', '1 item']] },
    'Legal / Risk': { app: 'Covenant', title: 'Contract portfolio', k: [['Active contracts', '2,318', '+4%'], ['Renewals (90d)', '146', '+12'], ['Open obligations', '412', '-6%'], ['High-risk clauses', '27', '-3']], rows: [['MSA — Northwind', 'Vendor', 'Executed', '31 Dec', 'Low'], ['DPA — Contoso', 'Privacy', 'Negotiation', '15 Jan', 'Medium'], ['NDA — Fabrikam', 'Mutual', 'Executed', '02 Feb', 'Low'], ['SOW — Initech', 'Services', 'Breach risk', '20 Feb', 'High']] },
    Operations: { app: 'Hauler', title: 'Network control tower', k: [['Shipments in transit', '8,214', '+3.2%'], ['On-time rate', '94.6%', '+1.1%'], ['Exceptions', '73', '-12%'], ['Dock utilisation', '81%', '+4%']], rows: [['SHP-88213', 'Rotterdam → Lyon', 'In transit', '14:20', 'Truck 42'], ['SHP-88214', 'Hamburg → Prague', 'Delayed', '16:05', 'Rail 7'], ['SHP-88215', 'Antwerp → Milan', 'Delivered', '11:42', 'Truck 18'], ['SHP-88216', 'Gdańsk → Vienna', 'Exception', '—', 'Truck 3']] },
    'Brand / Marketing': { app: 'Loud&Co', title: 'Campaign studio', k: [['Reach', '12.4M', '+31%'], ['Engagement', '6.8%', '+1.2%'], ['Assets live', '214', '+18'], ['Spend', '$84K', '-4%']], rows: [['Summer Drop', 'Social', 'Live', 'Jun 12', '4.1M'], ['Night Shift', 'OOH', 'Review', 'Jun 20', '—'], ['Re:Form', 'Video', 'Live', 'Jun 02', '2.7M'], ['Blackout', 'Display', 'Paused', 'May 28', '0.9M']] },
    'People / HR': { app: 'Kindred', title: 'Team wellbeing', k: [['Headcount', '1,286', '+24'], ['eNPS', '+42', '+6'], ['Time-off used', '61%', '+4%'], ['Open roles', '18', '-3']], rows: [['Amara Diallo', 'Design', 'Onboarding', 'Mar 04', 'Remote'], ['Theo Brandt', 'Engineering', 'Active', 'Jan 15', 'Berlin'], ['Lucía Romero', 'People', 'On leave', 'Feb 20', 'Madrid'], ['Kenji Sato', 'Sales', 'Active', 'Mar 11', 'Tokyo']] },
    Editorial: { app: 'Kontur', title: 'Newsroom', k: [['Published today', '48', '+6'], ['Readers', '312K', '+14%'], ['Avg. read time', '4:12', '+0:20'], ['Subscriptions', '1,904', '+8%']], rows: [['The quiet grid', 'Design', 'Published', '08:10', 'L. Weber'], ['Cities after cars', 'Urbanism', 'Editing', '09:40', 'M. Rossi'], ['Type as policy', 'Culture', 'Published', '10:05', 'A. Kim'], ['Ink & industry', 'Business', 'Draft', '—', 'J. Ruiz']] },
    'AI / Developer': { app: 'Forge', title: 'Deployments', k: [['Requests / min', '48.2K', '+12%'], ['p95 latency', '182 ms', '-9%'], ['Error rate', '0.08%', '-0.02'], ['Tokens today', '3.1B', '+21%']], rows: [['api-gateway', 'us-east-1', 'Healthy', '99.99%', 'v2.14.0'], ['inference-pool', 'eu-west-2', 'Scaling', '99.95%', 'v0.9.3'], ['vector-store', 'us-west-2', 'Healthy', '99.98%', 'v1.4.1'], ['batch-worker', 'ap-south-1', 'Degraded', '98.70%', 'v3.0.0']] },
    Product: { app: 'Northstar', title: 'Workspace overview', k: [['Active seats', '12,480', '+6.4%'], ['MRR', '$412K', '+3.8%'], ['Churn', '1.2%', '-0.3%'], ['Tickets open', '86', '-14%']], rows: [['Acme Corp', 'Enterprise', 'Active', '$48,000', '412 seats'], ['Globex', 'Business', 'Trial', '$0', '38 seats'], ['Umbrella', 'Enterprise', 'Active', '$96,000', '1,024 seats'], ['Soylent', 'Team', 'Past due', '$4,200', '24 seats']] },
  };
  function statusTone(s) {
    s = s.toLowerCase();
    if (/(filled|approved|executed|delivered|healthy|active|live|paid|published|checked in|shipped)/.test(s)) return 'success';
    if (/(rejected|overdue|breach|exception|degraded|past due|refunded|action needed|high)/.test(s)) return 'danger';
    if (/(working|waiting|review|negotiation|delayed|scaling|trial|paused|editing|onboarding|on leave|in transit)/.test(s)) return 'warning';
    return 'info';
  }

  /* ── compositions ── */
  function dashboard(meta) {
    var c = COPY[meta.category] || COPY.Product;
    var navItems = [['home', 'Overview', 1], ['chart', 'Analytics'], ['users', 'Customers', 0, '12'], ['file', 'Reports'], ['gear', 'Settings']];
    var nav = '<nav class="ae-nav" aria-label="Preview navigation"><div class="pv-logo"><i></i>' + esc(c.app) + '</div>' +
      navItems.map(function (n) { return '<a class="ae-nav__item" href="#" onclick="return false"' + (n[2] ? ' aria-current="page"' : '') + '>' + icon(n[0]) + n[1] + (n[3] ? '<span class="ae-badge ae-badge--brand">' + n[3] + '</span>' : '') + '</a>'; }).join('') +
      '<div class="ae-nav__section">Workspace</div><a class="ae-nav__item" href="#" onclick="return false">' + icon('bell') + 'Alerts</a></nav>';
    var kpis = c.k.map(function (k, i) {
      var up = k[2].charAt(0) !== '-';
      return '<div class="ae-card ae-stat"><span class="ae-text-overline">' + esc(k[0]) + '</span><span class="ae-stat__value">' + esc(k[1]) + '</span><span class="ae-stat__delta ae-stat__delta--' + (up ? 'up' : 'down') + '">' + (up ? '▲' : '▼') + ' ' + esc(k[2].replace(/^[+-]/, '')) + ' <span class="ae-muted">vs last period</span></span>' +
        '<div class="ae-progress" aria-hidden="true"><span style="width:' + [72, 48, 86, 34][i] + '%"></span></div></div>';
    }).join('');
    var rows = c.rows.map(function (r, i) {
      return '<tr' + (i === 1 ? ' aria-selected="true"' : '') + '><td><strong>' + esc(r[0]) + '</strong></td><td class="ae-muted">' + esc(r[1]) + '</td><td><span class="ae-badge ae-badge--dot ae-badge--' + statusTone(r[2]) + '">' + esc(r[2]) + '</span></td><td class="ae-num">' + esc(r[3]) + '</td><td class="ae-muted">' + esc(r[4]) + '</td></tr>';
    }).join('');
    return '<div class="pv-app">' + nav + '<div class="pv-content">' +
      '<div class="pv-header"><div><p class="ae-text-overline">' + esc(c.app) + ' · ' + esc(meta.category) + '</p><h2 class="ae-text-heading-xl">' + esc(c.title) + '</h2></div>' +
      '<div class="pv-header__tools"><div class="ae-input-group" style="width:220px">' + icon('search') + '<input class="ae-input" placeholder="Search…" aria-label="Search"></div>' +
      '<button class="ae-btn">' + icon('download') + 'Export</button><button class="ae-btn ae-btn--primary">' + icon('plus') + 'New</button></div></div>' +
      '<div class="ae-tabs" role="tablist"><button class="ae-tab" role="tab" aria-selected="true">Summary</button><button class="ae-tab" role="tab">Activity</button><button class="ae-tab" role="tab">Forecast</button><button class="ae-tab" role="tab">Audit log</button></div>' +
      '<div class="pv-kpis">' + kpis + '</div>' +
      '<div class="pv-grid"><div class="ae-card pv-chart"><div class="ae-card__header"><h3 class="ae-text-heading-sm">Trend</h3><div class="ae-legend"><span><i style="background:var(--aegis-data-1)"></i>This period</span><span><i style="background:var(--aegis-data-2)"></i>Previous</span><span><i style="background:var(--aegis-data-3)"></i>Target</span></div></div>' + chart() + '</div>' +
      '<div class="ae-card"><div class="ae-card__header"><h3 class="ae-text-heading-sm">Activity</h3><a class="ae-link ae-text-label-sm" href="#" onclick="return false">View all</a></div><ul class="pv-list">' +
      [['MO', 'Approval requested', '2 min ago'], ['JL', 'Report exported', '18 min ago'], ['AK', 'Policy updated', '1 h ago']].map(function (a) { return '<li><span class="ae-avatar ae-avatar--sm">' + a[0] + '</span><div><p class="ae-text-label-md">' + a[1] + '</p><p class="ae-text-caption">' + a[2] + '</p></div></li>'; }).join('') +
      '</ul><hr class="ae-divider"><div class="ae-alert ae-alert--warning">' + icon('alert') + '<div><p class="ae-alert__title">Review needed</p><p class="ae-alert__body">3 items breach the configured threshold.</p></div></div></div></div>' +
      '<div class="ae-card ae-card--flush"><div class="ae-card__header"><h3 class="ae-text-heading-sm">Recent records</h3><span class="ae-badge">4 of 1,284</span></div><div class="ae-table-wrap"><table class="ae-table"><thead><tr><th>Name</th><th>Type</th><th>Status</th><th class="ae-num">Value</th><th>Detail</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
      '</div></div>';
  }

  function chart() {
    var a = [38, 52, 47, 63, 58, 72, 69, 84, 78, 91, 88, 97];
    var b = [30, 41, 44, 49, 55, 53, 61, 66, 64, 70, 75, 79];
    var W = 600, H = 190, pad = 8, n = a.length, bw = (W - pad * 2) / n;
    var bars = a.map(function (v, i) { var h = v / 100 * (H - 24); return '<rect x="' + (pad + i * bw + bw * 0.22) + '" y="' + (H - h) + '" width="' + bw * 0.56 + '" height="' + h + '" rx="2" style="fill:var(--aegis-data-1)"/>'; }).join('');
    var line = b.map(function (v, i) { return (i ? 'L' : 'M') + (pad + i * bw + bw / 2) + ' ' + (H - v / 100 * (H - 24)); }).join(' ');
    var grid = [0.25, 0.5, 0.75].map(function (g) { return '<line x1="0" x2="' + W + '" y1="' + H * g + '" y2="' + H * g + '" style="stroke:var(--aegis-border-subtle)" stroke-dasharray="3 4"/>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Bar chart with trend line">' + grid +
      '<line x1="0" x2="' + W + '" y1="' + (H * 0.18) + '" y2="' + (H * 0.18) + '" style="stroke:var(--aegis-data-3)" stroke-width="2" stroke-dasharray="6 5"/>' + bars +
      '<path d="' + line + '" fill="none" style="stroke:var(--aegis-data-2)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }

  function components() {
    return '<div class="pv-sheet">' +
      card('Buttons', '<div class="pv-stack"><div class="pv-row"><button class="ae-btn ae-btn--primary">Primary</button><button class="ae-btn">Secondary</button><button class="ae-btn ae-btn--ghost">Ghost</button><button class="ae-btn ae-btn--danger">Delete</button></div>' +
        '<div class="pv-row"><button class="ae-btn ae-btn--primary ae-btn--sm">Small</button><button class="ae-btn ae-btn--primary">Medium</button><button class="ae-btn ae-btn--primary ae-btn--lg">Large</button><button class="ae-btn ae-btn--icon" aria-label="Add">' + icon('plus') + '</button></div>' +
        '<div class="pv-row"><button class="ae-btn ae-btn--primary" disabled>Disabled</button><button class="ae-btn" disabled>Disabled</button></div></div>') +
      card('Form fields', '<div class="pv-stack"><label class="ae-field"><span class="ae-label">Work email</span><input class="ae-input" placeholder="name@company.com"><span class="ae-help">We’ll never share it.</span></label>' +
        '<label class="ae-field"><span class="ae-label">Region</span><select class="ae-select"><option>Europe (Frankfurt)</option><option>US East</option></select></label>' +
        '<label class="ae-field"><span class="ae-label">Cost centre</span><input class="ae-input" aria-invalid="true" value="CC-00"><span class="ae-help ae-help--error">Enter a 6-digit cost centre.</span></label></div>') +
      card('Selection', '<div class="pv-stack"><label class="ae-check"><input type="checkbox" checked> Email notifications</label><label class="ae-check"><input type="checkbox"> Weekly digest</label>' +
        '<label class="ae-check"><input type="radio" name="pv-r" checked> Monthly billing</label><label class="ae-check"><input type="radio" name="pv-r"> Annual billing</label>' +
        '<label class="ae-check"><input type="checkbox" role="switch" class="ae-switch" checked> Two-factor authentication</label><label class="ae-check"><input type="checkbox" role="switch" class="ae-switch"> Beta features</label></div>') +
      card('Badges & status', '<div class="pv-stack"><div class="pv-row"><span class="ae-badge">Neutral</span><span class="ae-badge ae-badge--brand">Brand</span><span class="ae-badge ae-badge--success ae-badge--dot">Success</span><span class="ae-badge ae-badge--warning ae-badge--dot">Warning</span><span class="ae-badge ae-badge--danger ae-badge--dot">Danger</span><span class="ae-badge ae-badge--info">Info</span><span class="ae-badge ae-badge--solid">Solid</span></div>' +
        '<div class="pv-row"><span class="ae-avatar-stack"><span class="ae-avatar">AD</span><span class="ae-avatar">TB</span><span class="ae-avatar">LR</span></span><span class="ae-tooltip">Tooltip · ⌘K</span><span class="ae-kbd">⌘</span><span class="ae-kbd">K</span></div>' +
        '<div class="ae-progress"><span style="width:64%"></span></div></div>') +
      card('Alerts', '<div class="pv-stack"><div class="ae-alert">' + icon('info') + '<div><p class="ae-alert__title">Scheduled maintenance</p><p class="ae-alert__body">Saturday 02:00–04:00 UTC.</p></div></div>' +
        '<div class="ae-alert ae-alert--success">' + icon('check') + '<div><p class="ae-alert__title">Changes saved</p><p class="ae-alert__body">Your policy is now live.</p></div></div>' +
        '<div class="ae-alert ae-alert--danger">' + icon('alert') + '<div><p class="ae-alert__title">Payment failed</p><p class="ae-alert__body">Update the card on file to continue.</p></div></div></div>') +
      card('Tabs, links & code', '<div class="pv-stack"><div class="ae-tabs" role="tablist"><button class="ae-tab" role="tab" aria-selected="true">General</button><button class="ae-tab" role="tab">Members</button><button class="ae-tab" role="tab">Billing</button></div>' +
        '<p class="ae-text-body-md">Read the <a class="ae-link" href="#" onclick="return false">token reference</a> for every CSS variable.</p>' +
        '<code class="ae-code">&lt;html data-aegis-theme="…"\n      data-aegis-mode="dark"&gt;</code></div>') +
      card('Dialog', '<div class="pv-modal-demo"><div class="ae-modal" role="dialog" aria-label="Example dialog"><h3 class="ae-text-heading-md pv-h">Archive workspace?</h3><p class="ae-text-body-md ae-muted" style="margin:0">Members lose access immediately. You can restore it within 30 days.</p><div class="ae-modal__footer"><button class="ae-btn">Cancel</button><button class="ae-btn ae-btn--danger">Archive</button></div></div></div>') +
      '</div>';
  }
  function card(title, body) { return '<section class="ae-card"><h3 class="ae-text-heading-sm pv-h">' + title + '</h3>' + body + '</section>'; }

  function tokens(doc, mode) {
    var prim = doc.tokens.primitive.color;
    var ramps = Object.keys(prim).filter(function (k) { return !prim[k].$value; }).map(function (name) {
      var steps = Object.keys(prim[name]);
      return '<div class="pv-ramp"><span>' + name + '</span>' + steps.map(function (s) {
        var hex = prim[name][s].$value;
        return '<div class="pv-sw" style="background:' + hex + ';color:' + (lum(hex) > 0.4 ? '#000' : '#fff') + '" title="' + name + '.' + s + ' ' + hex + '"><small>' + s + '</small></div>';
      }).join('') + '</div>';
    }).join('');
    var sem = doc.tokens.semantic.color, items = '';
    Object.keys(sem).forEach(function (g) {
      Object.keys(sem[g]).forEach(function (n) {
        var t = sem[g][n];
        items += '<div class="pv-sem__item"><div class="pv-sem__chip" style="background:var(' + t.$extensions.aegis.cssVar + ')"></div><div><strong class="ae-text-label-sm">' + g + '.' + n + '</strong><code>' + esc(t.$extensions.aegis.cssVar) + '</code><code>' + esc(P.resolve(doc.meta.id, t.$modes[mode], mode)) + ' · ' + esc(String(t.$modes[mode]).replace('{primitive.color.', '').replace('}', '')) + '</code></div></div>';
      });
    });
    var sp = doc.tokens.dimension.spacing, rad = doc.tokens.dimension.radius, sh = doc.tokens.shadow;
    return '<div class="pv-stack">' +
      card('Primitive palette', '<div class="pv-ramps">' + ramps + '</div>') +
      card('Semantic colors · ' + mode, '<div class="pv-sem">' + items + '</div>') +
      '<div class="pv-sheet">' +
      card('Spacing', '<div class="pv-scale">' + Object.keys(sp).map(function (k) { return '<div><span>space-' + k + '</span><i style="width:' + sp[k].$value + 'px"></i></div>'; }).join('') + '</div>') +
      card('Radius', '<div class="pv-tiles">' + Object.keys(rad).map(function (k) { return '<div class="pv-tile" style="border-radius:var(--aegis-radius-' + k + ')">' + k + ' · ' + (rad[k].$value > 999 ? '∞' : rad[k].$value) + '</div>'; }).join('') + '</div>') +
      card('Elevation', '<div class="pv-tiles">' + Object.keys(sh).map(function (k) { return '<div class="pv-tile" style="box-shadow:var(--aegis-shadow-' + k + ');border-radius:var(--aegis-radius-md)">shadow-' + k + '</div>'; }).join('') + '</div>') +
      card('Motion', '<div class="pv-scale">' + Object.keys(doc.tokens.motion.duration).map(function (k) { return '<div><span>' + k + '</span><code>' + doc.tokens.motion.duration[k].$value + 'ms</code></div>'; }).join('') +
        Object.keys(doc.tokens.motion.easing).map(function (k) { return '<div><span>' + k + '</span><code>cubic-bezier(' + doc.tokens.motion.easing[k].$value.join(', ') + ')</code></div>'; }).join('') + '</div>') +
      '</div></div>';
  }

  function typography(doc) {
    var ts = doc.tokens.typography.textStyle;
    var samples = { display: 'Design at enterprise scale', heading: 'Clarity is a feature', body: 'Tokens keep every surface consistent — from the first sketch in Figma to the last line of production CSS.', label: 'Save changes', code: 'const theme = AegisPresets.get("…");', numeric: '1,284,903.50  −2.41%  08:45:12' };
    var fam = doc.tokens.typography.fontFamily;
    var families = Object.keys(fam).map(function (k) { return '<span class="ae-badge">' + k + ': ' + esc(fam[k].$value) + '</span>'; }).join(' ');
    return card('Font pairing', '<div class="pv-row">' + families + '</div>') + '<div style="height:16px"></div>' +
      card('Type scale', '<div class="pv-type">' + Object.keys(ts).map(function (k) {
        var v = ts[k].$value;
        var kind = /^display/.test(k) ? 'display' : /^heading/.test(k) ? 'heading' : /^body|caption/.test(k) ? 'body' : k === 'code' ? 'code' : k === 'numeric' ? 'numeric' : 'label';
        if (k === 'overline') kind = 'label';
        return '<div class="pv-type__row"><div class="pv-type__meta"><strong>' + k + '</strong>' + v.fontSize + '/' + v.lineHeight + ' · ' + v.fontWeight + '<br>' + v.fontFamily.replace('{typography.fontFamily.', '').replace('}', '') + (v.letterSpacing ? ' · ' + v.letterSpacing + 'em' : '') + (v.textTransform !== 'none' ? ' · ' + v.textTransform : '') + '</div><p class="pv-type__sample ae-text-' + k + '">' + esc(samples[kind]) + '</p></div>';
      }).join('') + '</div>');
  }

  function a11y(doc, mode) {
    var checks = doc.a11y.checks.filter(function (c) { return c.mode === mode; });
    var sem = function (key) { var p = key.split('.'); return doc.tokens.semantic.color[p[0]][p[1]].$extensions.aegis.cssVar; };
    var rows = checks.map(function (c) {
      return '<tr><td><code class="ae-text-code">' + c.fg + '</code></td><td><code class="ae-text-code">' + c.bg + '</code></td><td><span class="pv-pair" style="color:var(' + sem(c.fg) + ');background:var(' + sem(c.bg) + ')">Aa</span></td><td class="ae-num">' + c.ratio.toFixed(2) + ':1</td><td class="ae-num">' + c.min + '</td><td><span class="ae-badge ae-badge--' + (c.pass ? 'success' : 'danger') + '">' + (c.pass ? 'Pass' : 'Fail') + '</span></td></tr>';
    }).join('');
    var adj = doc.a11y.adjustments.filter(function (a) { return a.mode === mode; });
    var pass = checks.filter(function (c) { return c.pass; }).length;
    return '<div class="pv-stack"><div class="ae-alert ae-alert--' + (pass === checks.length ? 'success' : 'danger') + '">' + icon(pass === checks.length ? 'check' : 'alert') + '<div><p class="ae-alert__title">' + pass + ' / ' + checks.length + ' contrast pairs pass WCAG ' + doc.a11y.target + ' (' + mode + ')</p><p class="ae-alert__body">Text pairs need ' + (doc.a11y.target === 'AAA' ? '7:1' : '4.5:1') + ', UI boundaries and focus rings ' + (doc.a11y.target === 'AAA' ? '4.5:1' : '3:1') + '. The build walks the palette ramp automatically to fix failing pairs' + (adj.length ? ' — ' + adj.length + ' adjusted in this mode.' : '.') + '</p></div></div>' +
      (adj.length ? card('Automatic adjustments', '<ul class="pv-list">' + adj.map(function (a) { return '<li><span class="ae-badge ae-badge--info">' + a.token + '</span><span class="ae-text-body-sm">' + a.from + ' → <strong>' + a.to + '</strong> <span class="ae-muted">(' + esc(a.reason) + ')</span></span></li>'; }).join('') + '</ul>') : '') +
      (doc.a11y.exemptions.length ? card('Documented exemptions', doc.a11y.exemptions.map(function (e) { return '<p class="ae-text-body-sm"><strong>' + e.pair + '</strong> — ' + esc(e.reason) + '</p>'; }).join('')) : '') +
      '<div class="ae-card ae-card--flush"><div class="ae-table-wrap"><table class="ae-table pv-a11y"><thead><tr><th>Foreground</th><th>Background</th><th>Sample</th><th class="ae-num">Ratio</th><th class="ae-num">Min</th><th>Result</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div>';
  }

  function lum(hex) {
    var n = parseInt(hex.slice(1, 7), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  }

  /* ── render ── */
  function renderList() {
    var q = ($('#g-filter').value || '').toLowerCase();
    $('#g-preset-list').innerHTML = P.list().filter(function (m) {
      return !q || (m.name + ' ' + m.category + ' ' + m.tags.join(' ')).toLowerCase().indexOf(q) >= 0;
    }).map(function (m) {
      var s = m.swatches[m.defaultMode];
      return '<li><button class="g-preset" role="option" data-id="' + m.id + '" aria-selected="' + (m.id === state.theme) + '">' +
        '<span class="g-preset__chip" aria-hidden="true">' + s.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' +
        '<span><span class="g-preset__name">' + esc(m.name) + '</span><span class="g-preset__meta">' + esc(m.category) + ' <span class="g-pill">' + m.a11yTarget + '</span>' + (m.defaultMode === 'dark' ? '<span class="g-pill">DARK</span>' : '') + '</span></span></button></li>';
    }).join('');
  }

  function frame(mode, inner, label) {
    return '<div class="g-frame"><div class="g-frame__label"><span>' + label + '</span><span>' + mode + '</span></div>' +
      '<div class="ae-root g-preview" data-aegis-theme="' + state.theme + '" data-aegis-mode="' + mode + '">' + inner + '</div></div>';
  }

  function render() {
    var doc = P.get(state.theme), meta = doc.meta;
    P.loadFonts(meta.id);
    var fams = meta.fonts.families.map(function (f) { return f.family; }).join(' + ');
    var checks = doc.a11y.checks, pass = checks.filter(function (c) { return c.pass; }).length;
    $('#g-hero').innerHTML = '<div><h1>' + esc(meta.name) + '</h1><p>' + esc(meta.description) + '</p></div><div class="g-hero__facts">' +
      '<span class="g-fact"><strong>' + esc(fams) + '</strong></span><span class="g-fact">Density <strong>' + meta.density + '</strong></span>' +
      '<span class="g-fact">WCAG <strong>' + meta.a11yTarget + '</strong> · ' + pass + '/' + checks.length + '</span><span class="g-fact">Default <strong>' + meta.defaultMode + '</strong></span></div>';

    var views = { dashboard: function () { return dashboard(meta); }, components: components, tokens: function (m) { return tokens(doc, m); }, type: function () { return typography(doc); }, a11y: function (m) { return a11y(doc, m); } };
    var label = { dashboard: 'Dashboard', components: 'Components', tokens: 'Tokens', type: 'Typography', a11y: 'Contrast audit' }[state.view];
    var stage = $('#g-stage');
    var modes = state.mode === 'split' ? ['light', 'dark'] : [state.mode];
    stage.className = 'g-stage' + (state.mode === 'split' ? ' g-stage--split' : '');
    stage.innerHTML = modes.map(function (m) { return frame(m, views[state.view](m), label + ' · ' + meta.name); }).join('');

    document.querySelectorAll('#g-views button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.view === state.view)); });
    document.querySelectorAll('#g-modes button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.mode === state.mode)); });
    document.querySelectorAll('.g-preset').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.id === state.theme)); });
    document.title = meta.name + ' · AegisUI Presets';
    var openStudio = $('#g-open-studio');
    if (openStudio) { openStudio.href = '../index.html?preset=' + encodeURIComponent(meta.id); openStudio.setAttribute('aria-label', 'Open ' + meta.name + ' in Studio'); }
    writeHash();
  }

  function readHash() {
    var o = {};
    location.hash.replace(/^#/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) o[p[0]] = decodeURIComponent(p[1] || ''); });
    return o;
  }
  function writeHash() {
    var h = '#theme=' + state.theme + '&mode=' + state.mode + '&view=' + state.view;
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function toast(msg) {
    var t = $('#g-toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }
  function cssFor(id) {
    // Pull the theme's rules out of the bundle so the download matches css/<id>.css (minus @import).
    var out = [];
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
      var rules; try { rules = sh.cssRules; } catch (e) { return; }
      Array.prototype.forEach.call(rules, function (r) { if (r.cssText.indexOf('"' + id + '"') >= 0) out.push(r.cssText); });
    });
    return '@import url("' + P.get(id).meta.fonts.googleFontsUrl + '");\n\n' + out.join('\n\n') + '\n';
  }

  /* ── events ── */
  $('#g-preset-list').addEventListener('click', function (e) {
    var b = e.target.closest('.g-preset'); if (!b) return;
    var changed = state.theme !== b.dataset.id;
    state.theme = b.dataset.id;
    if (changed && state.mode !== 'split') state.mode = P.get(state.theme).meta.defaultMode;
    $('#g-sidebar').classList.remove('is-open'); $('#g-menu').setAttribute('aria-expanded', 'false');
    render();
  });
  $('#g-preset-list').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var items = Array.prototype.slice.call(document.querySelectorAll('.g-preset'));
    var i = items.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1);
    if (items[i]) { items[i].focus(); items[i].click(); items[i].focus(); e.preventDefault(); }
  });
  $('#g-views').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { state.view = b.dataset.view; render(); } });
  $('#g-modes').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { state.mode = b.dataset.mode; render(); } });
  $('#g-filter').addEventListener('input', renderList);
  $('#g-menu').addEventListener('click', function () {
    var s = $('#g-sidebar');
    s.classList.toggle('is-open');
    // Open the drawer directly under the sticky top bar, wherever it sits (the shared module nav can push it down).
    if (s.classList.contains('is-open')) s.style.top = Math.max(0, Math.round($('.g-topbar').getBoundingClientRect().bottom)) + 'px';
    this.setAttribute('aria-expanded', String(s.classList.contains('is-open')));
  });
  $('#g-dl-json').addEventListener('click', function () { download('aegis-' + state.theme + '.json', P.toJSON(state.theme), 'application/json'); toast('Downloaded aegis-' + state.theme + '.json'); });
  $('#g-dl-css').addEventListener('click', function () { download('aegis-' + state.theme + '.css', cssFor(state.theme), 'text/css'); toast('Downloaded aegis-' + state.theme + '.css'); });
  $('#g-copy-json').addEventListener('click', function () {
    var text = P.toJSON(state.theme);
    var done = function () { toast('Token JSON copied — paste it into the AegisUI Figma plugin'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { download('aegis-' + state.theme + '.json', text, 'application/json'); });
    else download('aegis-' + state.theme + '.json', text, 'application/json');
  });

  window.addEventListener('hashchange', function () {
    var h = readHash();
    if (h.theme && P.ids.indexOf(h.theme) >= 0) state.theme = h.theme;
    if (h.mode) state.mode = h.mode;
    if (h.view) state.view = h.view;
    render();
  });

  renderList();
  render();
})();
