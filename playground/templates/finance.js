/* AegisUI Playground — Finance templates (SVG, no chart library) */
(function () {
  'use strict';
  var R = window.AegisPlaygroundTemplates, I = R.icon;

  /* ------------------------------------------------------------------ KPI cards with sparklines */
  R.register({
    id: 'fin-kpi-cards',
    name: 'Financial KPI cards with SVG sparklines',
    category: 'Finance',
    tags: ['kpi', 'metrics', 'sparkline', 'svg', 'finance', 'revenue', 'stat cards', 'dashboard', 'chart'],
    description: 'MRR, net revenue retention and burn cards with SVG area sparklines, trend deltas and a 7D/30D/90D range switch.',
    a11y: ['Each sparkline is role="img" with an aria-label summarising start, end and change', 'Deltas pair an arrow and sign with color; "good" direction is defined per metric (burn down is good)', 'Range switch is a group of aria-pressed buttons'],
    behavior: ['Switching range regenerates the series and deltas', 'Values use tabular numerals and Intl.NumberFormat'],
    html:
'<section class="fc" aria-labelledby="fc-title">\n' +
'  <header class="fc__head"><h2 class="ae-text-heading-sm" id="fc-title">Financial overview</h2>\n' +
'    <div class="fc__range" role="group" aria-label="Date range"><button type="button" data-range="7" aria-pressed="false">7D</button><button type="button" data-range="30" aria-pressed="true">30D</button><button type="button" data-range="90" aria-pressed="false">90D</button></div></header>\n' +
'  <div class="fc__grid" data-fc-grid></div>\n' +
'</section>',
    css:
'.fc { display: grid; gap: var(--aegis-space-16); }\n' +
'.fc__head { display: flex; align-items: center; justify-content: space-between; gap: var(--aegis-space-12); }\n' +
'.fc__head h2 { margin: 0; }\n' +
'.fc__range { display: inline-flex; padding: var(--aegis-space-2); border-radius: var(--aegis-radius-md); background: var(--aegis-bg-surface-sunken); border: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.fc__range button { border: 0; background: transparent; height: var(--aegis-size-control-sm); padding: 0 var(--aegis-space-12); border-radius: var(--aegis-radius-sm); font: var(--aegis-text-label-sm); color: var(--aegis-fg-muted); cursor: pointer; }\n' +
'.fc__range [aria-pressed="true"] { background: var(--aegis-bg-surface); color: var(--aegis-fg-default); box-shadow: var(--aegis-shadow-xs); }\n' +
'.fc__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--aegis-space-12); }\n' +
'.fc__card { display: grid; gap: var(--aegis-space-4); padding: var(--aegis-space-16); background: var(--aegis-card-bg); border: var(--aegis-card-border-width) solid var(--aegis-card-border); border-radius: var(--aegis-card-radius); box-shadow: var(--aegis-card-shadow); }\n' +
'.fc__label { margin: 0; font: var(--aegis-text-label-sm); color: var(--aegis-fg-muted); }\n' +
'.fc__value { margin: 0; font: var(--aegis-text-heading-lg); font-variant-numeric: tabular-nums; letter-spacing: var(--aegis-text-heading-lg-tracking); }\n' +
'.fc__delta { display: inline-flex; align-items: center; gap: var(--aegis-space-4); font: var(--aegis-text-label-sm); font-variant-numeric: tabular-nums; }\n' +
'.fc__delta small { color: var(--aegis-fg-muted); font: var(--aegis-text-caption); }\n' +
'.fc__delta--good { color: var(--aegis-success-fg); } .fc__delta--bad { color: var(--aegis-danger-fg); }\n' +
'.fc__spark { width: 100%; height: 56px; margin-top: var(--aegis-space-8); overflow: visible; }\n' +
'.fc__spark .line { fill: none; stroke: var(--aegis-data-1); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }\n' +
'.fc__spark .area { fill: var(--aegis-data-1); opacity: 0.14; }\n' +
'.fc__spark .dot { fill: var(--aegis-data-1); stroke: var(--aegis-bg-surface); stroke-width: 2; }',
    js: function (root) {
      var METRICS = [
        { k: 'Monthly recurring revenue', base: 482100, vol: 0.012, drift: 0.0016, fmt: 'usd', up: true },
        { k: 'Net revenue retention', base: 1.14, vol: 0.004, drift: 0.0004, fmt: 'pct', up: true },
        { k: 'Monthly burn', base: 312000, vol: 0.02, drift: -0.002, fmt: 'usd', up: false }
      ];
      var grid = root.querySelector('[data-fc-grid]'), range = 30;
      var f = {
        usd: function (v) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v); },
        pct: function (v) { return (v * 100).toFixed(1) + '%'; }
      };
      function series(m, n, seed) {
        var out = [], v = m.base * (1 - m.drift * n), s = seed;
        for (var i = 0; i < n; i++) { s = (s * 9301 + 49297) % 233280; v = v * (1 + m.drift + (s / 233280 - 0.5) * m.vol); out.push(v); }
        return out;
      }
      function spark(data) {
        var W = 200, H = 56, min = Math.min.apply(null, data), max = Math.max.apply(null, data), span = max - min || 1;
        var pts = data.map(function (v, i) { return [i / (data.length - 1) * W, H - 4 - (v - min) / span * (H - 8)]; });
        var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('');
        var last = pts[pts.length - 1];
        return { line: line, area: line + 'L' + W + ',' + H + 'L0,' + H + 'Z', last: last, W: W, H: H };
      }
      function render() {
        grid.innerHTML = METRICS.map(function (m, idx) {
          var d = series(m, range, 17 + idx * 31 + range), first = d[0], last = d[d.length - 1], ch = (last - first) / first;
          var good = (ch >= 0) === m.up, s = spark(d);
          var label = m.k + ' over ' + range + ' days: from ' + f[m.fmt](first) + ' to ' + f[m.fmt](last) + ', ' + (ch >= 0 ? 'up ' : 'down ') + Math.abs(ch * 100).toFixed(1) + '%';
          return '<article class="fc__card"><p class="fc__label">' + m.k + '</p><p class="fc__value">' + f[m.fmt](last) + '</p>' +
            '<span class="fc__delta fc__delta--' + (good ? 'good' : 'bad') + '">' + (ch >= 0 ? '▲ +' : '▼ −') + Math.abs(ch * 100).toFixed(1) + '% <small>vs ' + range + ' days ago</small></span>' +
            '<svg class="fc__spark" viewBox="0 0 ' + s.W + ' ' + s.H + '" preserveAspectRatio="none" role="img" aria-label="' + label + '"><path class="area" d="' + s.area + '"/><path class="line" d="' + s.line + '"/><circle class="dot" r="3.5" cx="' + s.last[0] + '" cy="' + s.last[1] + '"/></svg></article>';
        }).join('');
      }
      root.querySelector('.fc__range').addEventListener('click', function (e) {
        var b = e.target.closest('[data-range]'); if (!b) return; range = +b.getAttribute('data-range');
        root.querySelectorAll('[data-range]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); render();
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ Revenue chart */
  R.register({
    id: 'revenue-chart',
    name: 'Revenue vs target chart (SVG)',
    category: 'Finance',
    tags: ['chart', 'bar chart', 'svg', 'revenue', 'target', 'tooltip', 'data viz', 'finance', 'report'],
    description: 'Monthly revenue bars with a target line, gridlines, hover/focus tooltips, legend and a toggleable data table.',
    a11y: ['Each bar is a focusable element (tabindex="0") with an aria-label of month, revenue and target', 'Tooltip appears on hover and focus', 'A "Show table" toggle reveals the same data as a real <table>', 'Legend pairs color with text and line style'],
    behavior: ['Bars above target use the success color; below use the brand color', 'Arrow keys move between bars'],
    html:
'<figure class="rc ae-card">\n' +
'  <div class="rc__head"><figcaption><h2 class="ae-text-heading-sm">Revenue vs target</h2><p class="ae-text-caption">FY2026, USD thousands</p></figcaption>\n' +
'    <div class="ae-legend"><span><i class="rc__sw rc__sw--bar"></i>Revenue</span><span><i class="rc__sw rc__sw--hit"></i>Above target</span><span><i class="rc__sw rc__sw--line"></i>Target</span></div></div>\n' +
'  <div class="rc__plot"><svg class="rc__svg" viewBox="0 0 640 260" data-rc-svg role="group" aria-label="Monthly revenue bars"></svg><div class="rc__tip" role="tooltip" hidden data-rc-tip></div></div>\n' +
'  <button class="ae-btn ae-btn--sm" type="button" aria-expanded="false" aria-controls="rc-table" data-rc-toggle>Show table</button>\n' +
'  <div class="ae-table-wrap" id="rc-table" hidden><table class="ae-table"><thead><tr><th>Month</th><th class="ae-num">Revenue</th><th class="ae-num">Target</th></tr></thead><tbody data-rc-rows></tbody></table></div>\n' +
'</figure>',
    css:
'.rc { display: grid; gap: var(--aegis-space-12); margin: 0; }\n' +
'.rc__head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--aegis-space-12); }\n' +
'.rc__head h2, .rc__head p { margin: 0; }\n' +
'.rc__sw { width: var(--aegis-space-12); height: var(--aegis-space-12); border-radius: var(--aegis-radius-xs); }\n' +
'.rc__sw--bar { background: var(--aegis-data-1); } .rc__sw--hit { background: var(--aegis-success-default); }\n' +
'.rc__sw--line { height: 0; border-top: 2px dashed var(--aegis-data-3); border-radius: 0; }\n' +
'.rc__plot { position: relative; }\n' +
'.rc__svg { width: 100%; height: auto; display: block; }\n' +
'.rc__svg .grid { stroke: var(--aegis-border-subtle); stroke-dasharray: 3 4; }\n' +
'.rc__svg .axis { fill: var(--aegis-fg-subtle); font: var(--aegis-text-caption); font-size: 11px; }\n' +
'.rc__svg .bar { fill: var(--aegis-data-1); transition: opacity var(--aegis-duration-fast) var(--aegis-easing-standard); cursor: pointer; outline: none; }\n' +
'.rc__svg .bar.hit { fill: var(--aegis-success-default); }\n' +
'.rc__svg .bar:focus-visible { stroke: var(--aegis-focus-ring-color); stroke-width: 3; }\n' +
'.rc__svg:hover .bar:not(:hover) { opacity: 0.55; }\n' +
'.rc__svg .target { fill: none; stroke: var(--aegis-data-3); stroke-width: 2; stroke-dasharray: 6 5; }\n' +
'.rc__tip { position: absolute; pointer-events: none; transform: translate(-50%, calc(-100% - var(--aegis-space-8))); padding: var(--aegis-space-6) var(--aegis-space-8); border-radius: var(--aegis-radius-sm); background: var(--aegis-bg-emphasis); color: var(--aegis-fg-inverse); font: var(--aegis-text-caption); white-space: nowrap; box-shadow: var(--aegis-shadow-md); }\n' +
'.rc__tip strong { display: block; font: var(--aegis-text-label-sm); }\n' +
'.rc .ae-btn { justify-self: start; }',
    js: function (root) {
      var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var rev = [312, 334, 351, 340, 372, 398, 405, 421, 410, 446, 468, 492], tgt = [320, 330, 345, 360, 375, 390, 405, 420, 435, 450, 465, 480];
      var svg = root.querySelector('[data-rc-svg]'), tip = root.querySelector('[data-rc-tip]'), NS = 'http://www.w3.org/2000/svg';
      var W = 640, H = 260, L = 40, B = 24, T = 12, max = 520, bw = (W - L) / M.length;
      var y = function (v) { return T + (H - B - T) * (1 - v / max); };
      function el(tag, a) { var n = document.createElementNS(NS, tag); for (var k in a) n.setAttribute(k, a[k]); return n; }
      [0, 130, 260, 390, 520].forEach(function (g) {
        svg.appendChild(el('line', { class: 'grid', x1: L, x2: W, y1: y(g), y2: y(g) }));
        var t = el('text', { class: 'axis', x: L - 8, y: y(g) + 4, 'text-anchor': 'end' }); t.textContent = '$' + g + 'k'; svg.appendChild(t);
      });
      var bars = rev.map(function (v, i) {
        var x = L + i * bw + bw * 0.2, b = el('rect', { class: 'bar' + (v >= tgt[i] ? ' hit' : ''), x: x, y: y(v), width: bw * 0.6, height: H - B - y(v), rx: 3, tabindex: 0, role: 'img', 'aria-label': M[i] + ': revenue $' + v + 'k, target $' + tgt[i] + 'k' + (v >= tgt[i] ? ', above target' : ', below target') });
        svg.appendChild(b);
        var t = el('text', { class: 'axis', x: x + bw * 0.3, y: H - 6, 'text-anchor': 'middle' }); t.textContent = M[i]; svg.appendChild(t);
        return b;
      });
      svg.appendChild(el('path', { class: 'target', d: tgt.map(function (v, i) { return (i ? 'L' : 'M') + (L + i * bw + bw / 2) + ',' + y(v); }).join(''), 'aria-hidden': 'true' }));
      function show(i) {
        var b = bars[i], box = svg.getBoundingClientRect(), s = box.width / W;
        tip.innerHTML = '<strong>' + M[i] + ' · $' + rev[i] + 'k</strong>Target $' + tgt[i] + 'k (' + (rev[i] >= tgt[i] ? '+' : '') + (rev[i] - tgt[i]) + 'k)';
        tip.style.left = ((+b.getAttribute('x') + bw * 0.3) * s) + 'px'; tip.style.top = (+b.getAttribute('y') * s) + 'px'; tip.hidden = false;
      }
      bars.forEach(function (b, i) {
        b.addEventListener('mouseenter', function () { show(i); }); b.addEventListener('focus', function () { show(i); });
        b.addEventListener('mouseleave', function () { tip.hidden = true; }); b.addEventListener('blur', function () { tip.hidden = true; });
        b.addEventListener('keydown', function (e) { var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null; if (n !== null && bars[n]) { e.preventDefault(); bars[n].focus(); } });
      });
      root.querySelector('[data-rc-rows]').innerHTML = M.map(function (m, i) { return '<tr><td>' + m + '</td><td class="ae-num">$' + rev[i] + 'k</td><td class="ae-num">$' + tgt[i] + 'k</td></tr>'; }).join('');
      var tg = root.querySelector('[data-rc-toggle]');
      tg.addEventListener('click', function () { var open = tg.getAttribute('aria-expanded') !== 'true'; tg.setAttribute('aria-expanded', String(open)); root.querySelector('#rc-table').hidden = !open; tg.textContent = open ? 'Hide table' : 'Show table'; });
    }
  });

  /* ------------------------------------------------------------------ Allocation donut */
  R.register({
    id: 'allocation-donut',
    name: 'Portfolio allocation donut (SVG)',
    category: 'Finance',
    tags: ['donut', 'pie chart', 'allocation', 'portfolio', 'breakdown', 'svg', 'budget', 'composition'],
    description: 'SVG donut built from stroke-dasharray arcs with an interactive legend: hover or focus a row to highlight its segment and show it in the center.',
    a11y: ['Keep to 4 categories or fewer (every preset guarantees --aegis-data-1…4); fold the rest into “Other”', 'The chart is role="img" with a summary label; the legend list is the accessible data source', 'Legend rows are buttons; focus/hover highlights the matching segment', 'Categorical colors come from --aegis-data-1…n; values are always printed as text'],
    behavior: ['Center label shows the total by default and the active segment on hover/focus'],
    html:
'<section class="dn ae-card" aria-labelledby="dn-title">\n' +
'  <h2 class="ae-text-heading-sm" id="dn-title">Treasury allocation</h2>\n' +
'  <div class="dn__body">\n' +
'    <div class="dn__chart"><svg viewBox="0 0 120 120" role="img" data-dn-svg></svg><div class="dn__center" aria-hidden="true"><strong data-dn-val></strong><span data-dn-lbl></span></div></div>\n' +
'    <ul class="dn__legend" data-dn-legend></ul>\n' +
'  </div>\n' +
'</section>',
    css:
'.dn h2 { margin: 0 0 var(--aegis-space-16); }\n' +
'.dn__body { display: flex; flex-wrap: wrap; align-items: center; gap: var(--aegis-space-24); }\n' +
'.dn__chart { position: relative; width: 180px; height: 180px; flex: none; }\n' +
'.dn__chart svg { width: 100%; height: 100%; transform: rotate(-90deg); }\n' +
'.dn__seg { fill: none; stroke-width: 16; transition: opacity var(--aegis-duration-fast) var(--aegis-easing-standard), stroke-width var(--aegis-duration-fast) var(--aegis-easing-standard); }\n' +
'.dn.is-active .dn__seg { opacity: 0.3; } .dn.is-active .dn__seg.is-on { opacity: 1; stroke-width: 19; }\n' +
'.dn__center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }\n' +
'.dn__center strong { font: var(--aegis-text-heading-md); font-variant-numeric: tabular-nums; }\n' +
'.dn__center span { font: var(--aegis-text-caption); color: var(--aegis-fg-muted); }\n' +
'.dn__legend { flex: 1; min-width: 220px; list-style: none; margin: 0; padding: 0; display: grid; gap: var(--aegis-space-2); }\n' +
'.dn__legend button { all: unset; box-sizing: border-box; width: 100%; display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: var(--aegis-space-8); padding: var(--aegis-space-6) var(--aegis-space-8); border-radius: var(--aegis-radius-sm); font: var(--aegis-text-body-sm); cursor: default; }\n' +
'.dn__legend button:hover, .dn__legend button:focus-visible { background: var(--aegis-bg-hover); }\n' +
'.dn__legend button:focus-visible { box-shadow: inset 0 0 0 var(--aegis-focus-ring-width) var(--aegis-focus-ring-color); }\n' +
'.dn__legend i { width: var(--aegis-space-12); height: var(--aegis-space-12); border-radius: var(--aegis-radius-xs); }\n' +
'.dn__legend .v { font-variant-numeric: tabular-nums; } .dn__legend .p { color: var(--aegis-fg-muted); font-variant-numeric: tabular-nums; min-width: 3.5em; text-align: right; }',
    js: function (root) {
      var data = [['Cash & equivalents', 4.2], ['Treasury bills', 3.1], ['Corporate bonds', 1.9], ['Money market & FX', 2.1]];
      var total = data.reduce(function (s, d) { return s + d[1]; }, 0), C = 2 * Math.PI * 46, off = 0, NS = 'http://www.w3.org/2000/svg';
      var svg = root.querySelector('[data-dn-svg]'), legend = root.querySelector('[data-dn-legend]');
      var usd = function (v) { return '$' + v.toFixed(1) + 'M'; };
      /* Every preset defines at least --aegis-data-1…4 (gov-accessible has exactly 4). */
      var COLORS = ['var(--aegis-data-1)', 'var(--aegis-data-2)', 'var(--aegis-data-3)', 'var(--aegis-data-4)'];
      svg.setAttribute('aria-label', 'Treasury allocation of ' + usd(total) + ': ' + data.map(function (d) { return d[0] + ' ' + Math.round(d[1] / total * 100) + '%'; }).join(', '));
      data.forEach(function (d, i) {
        var len = d[1] / total * C, gap = 1.5;
        var c = document.createElementNS(NS, 'circle');
        c.setAttribute('class', 'dn__seg'); c.setAttribute('cx', 60); c.setAttribute('cy', 60); c.setAttribute('r', 46);
        c.setAttribute('stroke-dasharray', Math.max(0, len - gap) + ' ' + (C - len + gap)); c.setAttribute('stroke-dashoffset', -off);
        c.style.stroke = COLORS[i];
        svg.appendChild(c); off += len;
        var li = document.createElement('li');
        li.innerHTML = '<button type="button" data-i="' + i + '"><i style="background:' + COLORS[i] + '"></i><span>' + d[0] + '</span><span class="v">' + usd(d[1]) + '</span><span class="p">' + (d[1] / total * 100).toFixed(1) + '%</span></button>';
        legend.appendChild(li);
      });
      var segs = svg.querySelectorAll('.dn__seg'), val = root.querySelector('[data-dn-val]'), lbl = root.querySelector('[data-dn-lbl]');
      function set(i) {
        root.classList.toggle('is-active', i !== null);
        segs.forEach(function (s, j) { s.classList.toggle('is-on', j === i); });
        val.textContent = i === null ? usd(total) : (data[i][1] / total * 100).toFixed(1) + '%';
        lbl.textContent = i === null ? 'Total' : data[i][0];
      }
      ['mouseover', 'focusin'].forEach(function (t) { legend.addEventListener(t, function (e) { var b = e.target.closest('[data-i]'); if (b) set(+b.getAttribute('data-i')); }); });
      ['mouseleave', 'focusout'].forEach(function (t) { legend.addEventListener(t, function () { set(null); }); });
      set(null);
    }
  });

  /* ------------------------------------------------------------------ Invoice builder */
  R.register({
    id: 'invoice-summary',
    name: 'Invoice / order summary',
    category: 'Finance',
    tags: ['invoice', 'order summary', 'cart', 'checkout', 'line items', 'totals', 'tax', 'discount', 'quote'],
    description: 'Line items with quantity steppers, discount code, tax and a live total; numbers are right-aligned with tabular figures.',
    a11y: ['Quantity steppers are buttons labelled per item plus a native number input', 'Discount code field reports success/error via aria-describedby', 'The grand total is announced politely when it changes'],
    behavior: ['Code AEGIS10 gives 10% off the subtotal', 'Tax is 21% of the discounted subtotal'],
    html:
'<section class="iv ae-card" aria-labelledby="iv-title">\n' +
'  <div class="ae-card__header"><h2 class="ae-text-heading-sm" id="iv-title">Invoice INV-2042</h2><span class="ae-badge ae-badge--warning">Draft</span></div>\n' +
'  <table class="ae-table iv__table"><thead><tr><th>Item</th><th class="ae-num">Qty</th><th class="ae-num">Price</th><th class="ae-num">Amount</th></tr></thead><tbody data-iv-rows></tbody></table>\n' +
'  <form class="iv__code" data-iv-code><div class="ae-field"><label class="ae-label" for="iv-code">Discount code</label><div class="iv__code-row"><input class="ae-input" id="iv-code" autocomplete="off" aria-describedby="iv-code-msg"><button class="ae-btn" type="submit">Apply</button></div><span class="ae-help" id="iv-code-msg"></span></div></form>\n' +
'  <dl class="iv__totals" data-iv-totals></dl>\n' +
'  <p class="iv__sr" aria-live="polite" data-iv-live></p>\n' +
'</section>',
    css:
'.iv { display: grid; gap: var(--aegis-space-16); max-width: 640px; }\n' +
'.iv__table td { white-space: normal; }\n' +
'.iv__table small { display: block; color: var(--aegis-fg-muted); font: var(--aegis-text-caption); }\n' +
'.iv__qty { display: inline-flex; align-items: center; gap: var(--aegis-space-2); }\n' +
'.iv__qty input { width: 3.2em; height: var(--aegis-button-height-sm); padding: 0 var(--aegis-space-4); text-align: center; -moz-appearance: textfield; }\n' +
'.iv__qty input::-webkit-inner-spin-button { -webkit-appearance: none; }\n' +
'.iv__code-row { display: flex; gap: var(--aegis-space-8); max-width: 340px; }\n' +
'.iv__code .ae-help.is-ok { color: var(--aegis-success-fg); } .iv__code .ae-help.is-err { color: var(--aegis-danger-fg); }\n' +
'.iv__totals { display: grid; grid-template-columns: 1fr auto; gap: var(--aegis-space-6) var(--aegis-space-24); margin: 0; margin-left: auto; min-width: 260px; font: var(--aegis-text-body-sm); }\n' +
'.iv__totals dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }\n' +
'.iv__totals .grand { font: var(--aegis-text-heading-sm); padding-top: var(--aegis-space-8); border-top: var(--aegis-border-width-thin) solid var(--aegis-border-default); }\n' +
'.iv__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      var items = [{ n: 'Platform license', d: 'Business plan, 25 seats', q: 25, p: 39 }, { n: 'SSO add-on', d: 'SAML + SCIM', q: 1, p: 450 }, { n: 'Onboarding', d: 'Two remote workshops', q: 2, p: 1200 }];
      var discount = 0, TAX = 0.21;
      var usd = function (v) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v); };
      var rows = root.querySelector('[data-iv-rows]');
      function render(focusSel) {
        rows.innerHTML = items.map(function (it, i) {
          return '<tr><td>' + it.n + '<small>' + it.d + '</small></td><td class="ae-num"><span class="iv__qty"><button class="ae-btn ae-btn--ghost ae-btn--sm ae-btn--icon" type="button" data-step="-1" data-i="' + i + '" aria-label="Decrease ' + it.n + ' quantity">−</button>' +
            '<input class="ae-input" type="number" min="0" value="' + it.q + '" data-qty="' + i + '" aria-label="' + it.n + ' quantity"><button class="ae-btn ae-btn--ghost ae-btn--sm ae-btn--icon" type="button" data-step="1" data-i="' + i + '" aria-label="Increase ' + it.n + ' quantity">+</button></span></td>' +
            '<td class="ae-num">' + usd(it.p) + '</td><td class="ae-num">' + usd(it.q * it.p) + '</td></tr>';
        }).join('');
        var sub = items.reduce(function (s, it) { return s + it.q * it.p; }, 0), off = sub * discount, tax = (sub - off) * TAX, total = sub - off + tax;
        root.querySelector('[data-iv-totals]').innerHTML = '<dt>Subtotal</dt><dd>' + usd(sub) + '</dd>' + (discount ? '<dt>Discount (AEGIS10)</dt><dd>−' + usd(off) + '</dd>' : '') + '<dt>VAT 21%</dt><dd>' + usd(tax) + '</dd><dt class="grand">Total due</dt><dd class="grand">' + usd(total) + '</dd>';
        root.querySelector('[data-iv-live]').textContent = 'Total due ' + usd(total);
        if (focusSel) { var f = rows.querySelector(focusSel); if (f) f.focus(); }
      }
      rows.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (!b) return; var i = +b.getAttribute('data-i'); items[i].q = Math.max(0, items[i].q + +b.getAttribute('data-step')); render('[data-step="' + b.getAttribute('data-step') + '"][data-i="' + i + '"]'); });
      rows.addEventListener('change', function (e) { var i = e.target.getAttribute('data-qty'); if (i === null) return; items[i].q = Math.max(0, Math.round(+e.target.value || 0)); render(); });
      root.querySelector('[data-iv-code]').addEventListener('submit', function (e) {
        e.preventDefault();
        var v = root.querySelector('#iv-code').value.trim().toUpperCase(), msg = root.querySelector('#iv-code-msg');
        discount = v === 'AEGIS10' ? 0.1 : 0;
        msg.className = 'ae-help ' + (discount ? 'is-ok' : 'is-err'); msg.textContent = discount ? '10% discount applied.' : v ? 'That code isn’t valid.' : 'Enter a code.';
        root.querySelector('#iv-code').setAttribute('aria-invalid', discount ? 'false' : 'true');
        render();
      });
      render();
    }
  });

  /* ------------------------------------------------------------------ Transactions list */
  R.register({
    id: 'transactions',
    name: 'Transaction ledger with search',
    category: 'Finance',
    tags: ['transactions', 'ledger', 'payments', 'bank', 'statement', 'search', 'filter', 'list', 'expenses'],
    description: 'Date-grouped transaction list with search, in/out filter, signed amounts with tabular figures and a running summary.',
    a11y: ['Groups use headings + lists; amounts include a visually hidden "credit"/"debit" word, not only color and sign', 'Filter is a radio group; the results summary is a polite live region'],
    behavior: ['Search matches merchant and category', 'Summary shows money in, money out and net for the visible rows'],
    html:
'<section class="tx ae-card" aria-labelledby="tx-title">\n' +
'  <div class="ae-card__header"><h2 class="ae-text-heading-sm" id="tx-title">Transactions</h2></div>\n' +
'  <div class="tx__tools">\n' +
'    <label class="ae-input-group tx__q">' + I('search') + '<input class="ae-input" type="search" placeholder="Search merchant or category" aria-label="Search transactions" data-tx-q></label>\n' +
'    <div class="tx__seg" role="radiogroup" aria-label="Direction"><label><input type="radio" name="tx-dir" value="all" checked>All</label><label><input type="radio" name="tx-dir" value="in">Money in</label><label><input type="radio" name="tx-dir" value="out">Money out</label></div>\n' +
'  </div>\n' +
'  <p class="tx__sum ae-text-body-sm" aria-live="polite" data-tx-sum></p>\n' +
'  <div data-tx-list></div>\n' +
'</section>',
    css:
'.tx__tools { display: flex; flex-wrap: wrap; gap: var(--aegis-space-8); margin-bottom: var(--aegis-space-12); }\n' +
'.tx__q { flex: 1 1 220px; }\n' +
'.tx__seg { display: inline-flex; padding: var(--aegis-space-2); border-radius: var(--aegis-radius-md); background: var(--aegis-bg-surface-sunken); border: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.tx__seg label { display: inline-flex; align-items: center; height: calc(var(--aegis-input-height) - var(--aegis-space-6)); padding: 0 var(--aegis-space-12); border-radius: var(--aegis-radius-sm); font: var(--aegis-text-label-sm); color: var(--aegis-fg-muted); cursor: pointer; }\n' +
'.tx__seg input { position: absolute; opacity: 0; width: 1px; height: 1px; }\n' +
'.tx__seg label:has(input:checked) { background: var(--aegis-bg-surface); color: var(--aegis-fg-default); box-shadow: var(--aegis-shadow-xs); }\n' +
'.tx__seg label:has(input:focus-visible) { outline: var(--aegis-focus-ring-width) solid var(--aegis-focus-ring-color); }\n' +
'.tx__sum { margin: 0 0 var(--aegis-space-12); color: var(--aegis-fg-muted); font-variant-numeric: tabular-nums; }\n' +
'.tx__day { margin: var(--aegis-space-16) 0 var(--aegis-space-4); font: var(--aegis-text-overline); letter-spacing: var(--aegis-text-overline-tracking); text-transform: var(--aegis-text-overline-transform); color: var(--aegis-fg-subtle); }\n' +
'.tx__list { list-style: none; margin: 0; padding: 0; }\n' +
'.tx__row { display: grid; grid-template-columns: auto 1fr auto; gap: var(--aegis-space-12); align-items: center; padding: var(--aegis-space-8) 0; border-bottom: var(--aegis-border-width-thin) solid var(--aegis-border-subtle); }\n' +
'.tx__row p { margin: 0; font: var(--aegis-text-label-md); } .tx__row small { color: var(--aegis-fg-muted); font: var(--aegis-text-caption); }\n' +
'.tx__amt { font: var(--aegis-text-label-md); font-variant-numeric: tabular-nums; }\n' +
'.tx__amt.in { color: var(--aegis-success-fg); }\n' +
'.tx__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }',
    js: function (root) {
      var T = [
        ['2026-11-05', 'Northwind Health', 'Customer payment', 12400], ['2026-11-05', 'AWS', 'Cloud infrastructure', -8312.4], ['2026-11-04', 'Figma', 'Software', -1860],
        ['2026-11-04', 'Globex Logistics', 'Customer payment', 8950.5], ['2026-11-03', 'WeWork', 'Office', -4200], ['2026-11-03', 'Gusto', 'Payroll', -96420], ['2026-11-02', 'Stripe payout', 'Card settlements', 23874.12]
      ].map(function (r) { return { d: r[0], m: r[1], c: r[2], a: r[3] }; });
      var usd = function (v) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v); };
      var q = '', dir = 'all';
      function render() {
        var rows = T.filter(function (t) { return (dir === 'all' || (dir === 'in' ? t.a > 0 : t.a < 0)) && (!q || (t.m + ' ' + t.c).toLowerCase().indexOf(q) > -1); });
        var days = {}; rows.forEach(function (t) { (days[t.d] = days[t.d] || []).push(t); });
        root.querySelector('[data-tx-list]').innerHTML = Object.keys(days).map(function (d) {
          return '<h3 class="tx__day">' + new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + '</h3><ul class="tx__list">' + days[d].map(function (t) {
            return '<li class="tx__row"><span class="ae-avatar ae-avatar--sm" aria-hidden="true">' + t.m.slice(0, 2).toUpperCase() + '</span><div><p>' + t.m + '</p><small>' + t.c + '</small></div><span class="tx__amt' + (t.a > 0 ? ' in' : '') + '"><span class="tx__sr">' + (t.a > 0 ? 'Credit ' : 'Debit ') + '</span>' + (t.a > 0 ? '+' : '−') + usd(Math.abs(t.a)) + '</span></li>';
          }).join('') + '</ul>';
        }).join('') || '<p class="ae-muted ae-text-body-sm">No transactions match.</p>';
        var inn = rows.filter(function (t) { return t.a > 0; }).reduce(function (s, t) { return s + t.a; }, 0), out = rows.filter(function (t) { return t.a < 0; }).reduce(function (s, t) { return s - t.a; }, 0);
        root.querySelector('[data-tx-sum]').textContent = rows.length + ' transactions · in ' + usd(inn) + ' · out ' + usd(out) + ' · net ' + usd(inn - out);
      }
      root.querySelector('[data-tx-q]').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); render(); });
      root.querySelector('.tx__seg').addEventListener('change', function (e) { dir = e.target.value; render(); });
      render();
    }
  });
})();
