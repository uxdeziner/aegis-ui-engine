/* ==========================================================================
   AegisUI Showcase — behaviour (vanilla JS, no dependencies)
   Modules: utils · theme · compare + live audit · ROI model · blueprint ·
            guide · social cards · nav
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     Utils
     ------------------------------------------------------------------------ */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function svgEl(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var store = {
    get: function (k, fallback) { try { var v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  var money = function (v, compact) {
    var abs = Math.abs(v);
    var opts = { style: "currency", currency: "USD", maximumFractionDigits: 0 };
    if (compact !== false && abs >= 10000) { opts.notation = "compact"; opts.maximumFractionDigits = abs >= 1e6 ? 2 : 1; }
    return new Intl.NumberFormat("en-US", opts).format(v);
  };
  var num = function (v, digits) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits || 0 }).format(v); };
  var compactNum = function (v) { return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v); };

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { toast("Copied to clipboard"); }, fallback);
    }
    fallback();
    return Promise.resolve();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Copied to clipboard"); } catch (e) { toast("Copy failed: select the text manually"); }
      document.body.removeChild(ta);
    }
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ------------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------------ */
  var themeListeners = [];
  function currentTheme() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function syncThemeButton() {
    var btn = $("#themeToggle");
    var dark = currentTheme() === "dark";
    btn.querySelector("use").setAttribute("href", dark ? "#i-sun" : "#i-moon");
    btn.querySelector("span").textContent = dark ? "Light" : "Dark";
    btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  function onThemeChange() { syncThemeButton(); themeListeners.forEach(function (fn) { fn(); }); }
  $("#themeToggle").addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("aegis-theme", next); } catch (e) {}
    onThemeChange();
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var mqHandler = function () { if (!document.documentElement.getAttribute("data-theme")) onThemeChange(); };
    if (mq.addEventListener) mq.addEventListener("change", mqHandler); else if (mq.addListener) mq.addListener(mqHandler);
  }
  syncThemeButton();

  /* ------------------------------------------------------------------------
     1. Before / After comparison
     ------------------------------------------------------------------------ */
  var compare = (function () {
    var box = $("#compareBox");
    var handle = $("#compareHandle");
    var pos = 50;
    var sweepRaf = null;

    function set(p) {
      pos = clamp(p, 0, 100);
      box.style.setProperty("--pos", pos + "%");
      var r = Math.round(pos);
      handle.setAttribute("aria-valuenow", String(r));
      handle.setAttribute("aria-valuetext", r + "% Before, " + (100 - r) + "% After");
      box.setAttribute("data-near", pos < 12 ? "start" : pos > 88 ? "end" : "");
    }
    function fromClientX(x) {
      var rect = box.getBoundingClientRect();
      set(((x - rect.left) / rect.width) * 100);
    }
    function stopSweep() { if (sweepRaf) { cancelAnimationFrame(sweepRaf); sweepRaf = null; box.classList.remove("is-animating"); } }

    handle.addEventListener("pointerdown", function (e) {
      stopSweep();
      handle.setPointerCapture(e.pointerId);
      box.classList.add("is-dragging");
      fromClientX(e.clientX);
      e.preventDefault();
    });
    handle.addEventListener("pointermove", function (e) { if (handle.hasPointerCapture(e.pointerId)) fromClientX(e.clientX); });
    var end = function (e) { if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId); box.classList.remove("is-dragging"); };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);

    handle.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 10 : 2;
      var map = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageDown: -20, PageUp: 20 };
      if (e.key in map) { stopSweep(); set(pos + map[e.key]); e.preventDefault(); }
      else if (e.key === "Home") { stopSweep(); set(0); e.preventDefault(); }
      else if (e.key === "End") { stopSweep(); set(100); e.preventDefault(); }
    });

    function animateTo(target, dur) {
      stopSweep();
      if (reduceMotion) { set(target); return; }
      var from = pos, t0 = performance.now();
      box.classList.add("is-animating");
      (function frame(now) {
        var t = clamp((now - t0) / dur, 0, 1);
        var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        set(from + (target - from) * e);
        if (t < 1) sweepRaf = requestAnimationFrame(frame); else stopSweep();
      })(t0);
    }

    $("#sweepBtn").addEventListener("click", function () {
      if (reduceMotion) { set(pos > 50 ? 0 : 100); return; }
      var keys = [[pos, 0], [96, 900], [4, 2300], [50, 3300]];
      var t0 = performance.now();
      stopSweep();
      box.classList.add("is-animating");
      (function frame(now) {
        var el = now - t0;
        var i = 1;
        while (i < keys.length - 1 && el > keys[i][1]) i++;
        var a = keys[i - 1], b = keys[i];
        var t = clamp((el - a[1]) / (b[1] - a[1]), 0, 1);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        set(a[0] + (b[0] - a[0]) * e);
        if (el < keys[keys.length - 1][1]) sweepRaf = requestAnimationFrame(frame); else stopSweep();
      })(t0);
    });

    $$("[data-pos]").forEach(function (b) {
      b.addEventListener("click", function () { animateTo(Number(b.getAttribute("data-pos")), 600); });
    });

    var auditBtn = $("#auditBtn");
    auditBtn.addEventListener("click", function () {
      var on = !box.classList.contains("is-annotated");
      box.classList.toggle("is-annotated", on);
      auditBtn.setAttribute("aria-pressed", String(on));
    });

    set(50);
    return { set: set };
  })();

  /* ---- Live DOM audit: real measurement via getComputedStyle ---- */
  var audit = (function () {
    function parseColor(str) {
      var m = /rgba?\(([^)]+)\)/.exec(str || "");
      if (!m) return null;
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    function allColors(str) {
      var out = [], re = /rgba?\([^)]+\)/g, m;
      while ((m = re.exec(str || ""))) { var c = parseColor(m[0]); if (c) out.push(c); }
      return out;
    }
    function key(c) { return Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b) + "," + (Math.round(c.a * 100) / 100); }
    function over(top, bottom) {
      var a = top.a + bottom.a * (1 - top.a);
      if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
        g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
        b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
        a: a
      };
    }
    function lum(c) {
      var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    }
    function contrast(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }

    /* Composite every background layer from the element up to the root.
       Gradients are approximated by the average of their colour stops. */
    function effectiveBg(el) {
      var layers = [];
      var node = el;
      while (node && node.nodeType === 1) {
        var cs = getComputedStyle(node);
        var bg = parseColor(cs.backgroundColor);
        var img = cs.backgroundImage;
        if (img && img !== "none" && /gradient/.test(img) && !/text/.test(cs.webkitBackgroundClip || cs.backgroundClip || "")) {
          var stops = allColors(img);
          if (stops.length) {
            var avg = stops.reduce(function (s, c) { return { r: s.r + c.r, g: s.g + c.g, b: s.b + c.b, a: s.a + c.a }; }, { r: 0, g: 0, b: 0, a: 0 });
            var n = stops.length;
            layers.push({ r: avg.r / n, g: avg.g / n, b: avg.b / n, a: avg.a / n });
          }
        }
        if (bg && bg.a > 0) layers.push(bg);
        if (layers.length && layers[layers.length - 1].a >= 1) break;
        node = node.parentElement;
      }
      var out = { r: 255, g: 255, b: 255, a: 1 };
      for (var i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
      return out;
    }
    function hasOwnText(el) {
      for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
      return el.tagName === "INPUT" || el.tagName === "SELECT";
    }

    function measure(pane) {
      var colors = {}, sizes = {}, families = {}, radii = {}, shadows = {};
      var minContrast = Infinity, fails = 0, textNodes = 0;
      $$("*", pane).forEach(function (el) {
        if (!(el instanceof HTMLElement)) return;
        var cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return;

        var bg = parseColor(cs.backgroundColor);
        if (bg && bg.a > 0) colors[key(bg)] = 1;
        allColors(cs.backgroundImage).forEach(function (c) { colors[key(c)] = 1; });
        ["Top", "Right", "Bottom", "Left"].forEach(function (s) {
          if (parseFloat(cs["border" + s + "Width"]) > 0 && cs["border" + s + "Style"] !== "none") {
            var bc = parseColor(cs["border" + s + "Color"]);
            if (bc && bc.a > 0) colors[key(bc)] = 1;
          }
        });
        ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"].forEach(function (p) {
          if (parseFloat(cs[p]) > 0) radii[cs[p]] = 1;
        });
        if (cs.boxShadow && cs.boxShadow !== "none") shadows[cs.boxShadow] = 1;

        if (hasOwnText(el)) {
          var fg = parseColor(cs.color);
          sizes[cs.fontSize] = 1;
          families[cs.fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase()] = 1;
          if (fg && fg.a > 0) {
            colors[key(fg)] = 1;
            var back = effectiveBg(el);
            var ratio = contrast(over(fg, back), back);
            var px = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
            var large = px >= 24 || (px >= 18.66 && weight >= 700);
            textNodes++;
            if (ratio < minContrast) minContrast = ratio;
            if (ratio < (large ? 3 : 4.5)) fails++;
          }
        }
      });
      var count = function (o) { return Object.keys(o).length; };
      return {
        colors: count(colors), sizes: count(sizes), families: count(families),
        radii: count(radii), shadows: count(shadows),
        minContrast: minContrast === Infinity ? 0 : minContrast, fails: fails, textNodes: textNodes
      };
    }

    var rows = [
      { k: "colors", label: "Unique colors in use", lower: true },
      { k: "sizes", label: "Distinct font sizes", lower: true },
      { k: "families", label: "Font families", lower: true },
      { k: "radii", label: "Distinct corner radii", lower: true },
      { k: "shadows", label: "Distinct shadows", lower: true },
      { k: "minContrast", label: "Lowest text contrast", lower: false, fmt: function (v) { return v.toFixed(1) + ":1"; } },
      { k: "fails", label: "Text elements failing WCAG AA", lower: true }
    ];
    var last = null;

    function run() {
      var b = measure($("#paneBefore")), a = measure($("#paneAfter"));
      last = { before: b, after: a };
      var tbody = $("#auditTable tbody");
      tbody.innerHTML = "";
      rows.forEach(function (r) {
        var f = r.fmt || function (v) { return num(v); };
        var bv = b[r.k], av = a[r.k];
        var better = r.lower ? av < bv : av > bv, worse = r.lower ? av > bv : av < bv;
        var tr = document.createElement("tr");
        tr.innerHTML = "<th scope=\"row\">" + r.label + "</th><td class=\"num\">" + f(bv) + "</td><td class=\"num " +
          (better ? "audit__better" : worse ? "audit__worse" : "") + "\">" + f(av) + "</td>";
        tbody.appendChild(tr);
      });
      $("#heroColors").textContent = b.colors + " → " + a.colors;
      $("#heroContrast").textContent = b.minContrast.toFixed(1) + " → " + a.minContrast.toFixed(1) + ":1";
    }
    themeListeners.push(function () { requestAnimationFrame(run); });
    return { run: run, last: function () { return last; } };
  })();

  /* ------------------------------------------------------------------------
     2. ROI & Token model
     ------------------------------------------------------------------------ */
  var roi = (function () {
    var fields = [
      { id: "engineers", group: "Team", label: "Engineers using AI for UI", min: 1, max: 500, step: 1, value: 40 },
      { id: "tasks", group: "Team", label: "UI tasks per engineer / week", hint: "Screens, components, UI fixes", min: 1, max: 40, step: 1, value: 10 },
      { id: "weeks", group: "Team", label: "Working weeks / year", min: 30, max: 52, step: 1, value: 46 },
      { id: "rate", group: "Team", label: "Loaded hourly cost", unit: "$", min: 30, max: 300, step: 5, value: 110 },
      { id: "rework", group: "Team", label: "Review + rework hours / task", hint: "Today, before AegisUI", min: 0, max: 6, step: 0.25, value: 0.5 },
      { id: "tpg", group: "Tokens", label: "Tokens per generation (k)", hint: "Input + output for one UI attempt", min: 2, max: 200, step: 1, value: 24 },
      { id: "regens", group: "Tokens", label: "Generations per accepted task", hint: "Today, including regenerations", min: 1, max: 8, step: 0.1, value: 3.0 },
      { id: "price", group: "Tokens", label: "Blended $ per 1M tokens", hint: "Check your provider's current pricing", unit: "$", min: 0.5, max: 75, step: 0.5, value: 6, assumption: true },
      { id: "ctx", group: "Tokens", label: "Added context per call (k)", hint: "CLAUDE.md + token catalog, after prompt caching", min: 0, max: 30, step: 0.5, value: 2, assumption: true },
      { id: "regenCut", group: "Impact", label: "Fewer regenerations", unit: "%", min: 0, max: 80, step: 1, value: 40, assumption: true },
      { id: "reworkCut", group: "Impact", label: "Less review + rework time", unit: "%", min: 0, max: 80, step: 1, value: 35, assumption: true },
      { id: "setup", group: "Impact", label: "One-time setup effort (hrs)", hint: "Tokens, CLAUDE.md, contracts, CI", min: 0, max: 2000, step: 10, value: 160, assumption: true },
      { id: "maint", group: "Impact", label: "Ongoing upkeep (hrs / month)", min: 0, max: 200, step: 1, value: 8, assumption: true }
    ];
    var presets = {
      startup: { engineers: 8, tasks: 8, rate: 95, rework: 0.5, setup: 60, maint: 4 },
      scaleup: { engineers: 40, tasks: 10, rate: 110, rework: 0.5, setup: 160, maint: 8 },
      enterprise: { engineers: 250, tasks: 12, rate: 125, rework: 0.75, setup: 400, maint: 24 }
    };
    var groupEl = { Team: $("#roiGroupTeam"), Tokens: $("#roiGroupTokens"), Impact: $("#roiGroupImpact") };
    var inputs = {};
    var listeners = [];
    var result = null;

    fields.forEach(function (f) {
      var wrap = document.createElement("div");
      wrap.className = "range";
      var rid = "roi-" + f.id;
      wrap.innerHTML =
        '<div class="range__top"><label class="range__label" for="' + rid + '">' + f.label +
        (f.assumption ? ' <span class="assumption-flag">Assumption</span>' : "") +
        (f.hint ? "<small>" + f.hint + "</small>" : "") + "</label>" +
        '<input class="range__value" type="number" inputmode="decimal" aria-label="' + f.label + ' value" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '"></div>' +
        '<input type="range" id="' + rid + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '">';
      groupEl[f.group].appendChild(wrap);
      var range = wrap.querySelector('input[type="range"]');
      var box = wrap.querySelector('input[type="number"]');
      inputs[f.id] = { range: range, box: box, f: f };
      range.addEventListener("input", function () { setValue(f.id, range.value, true); clearPreset(); });
      box.addEventListener("change", function () { setValue(f.id, box.value, true); clearPreset(); });
    });

    function setValue(id, v, recalc) {
      var io = inputs[id], f = io.f;
      v = parseFloat(v);
      if (!isFinite(v)) v = f.value;
      v = clamp(v, f.min, f.max);
      io.range.value = v; io.box.value = v;
      io.range.setAttribute("aria-valuetext", (f.unit === "$" ? "$" : "") + v + (f.unit === "%" ? "%" : ""));
      io.range.style.setProperty("--fill", ((v - f.min) / (f.max - f.min)) * 100 + "%");
      if (recalc) calc();
    }
    function get(id) { return parseFloat(inputs[id].range.value); }
    function clearPreset() { $$("[data-preset]").forEach(function (c) { c.setAttribute("aria-pressed", "false"); }); }

    $$("[data-preset]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var p = presets[chip.getAttribute("data-preset")];
        Object.keys(p).forEach(function (k) { setValue(k, p[k], false); });
        $$("[data-preset]").forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        calc();
      });
    });

    function calc() {
      var v = {}; fields.forEach(function (f) { v[f.id] = get(f.id); });
      var tasks = v.engineers * v.tasks * v.weeks;
      var gensBefore = tasks * v.regens;
      var gensAfter = tasks * Math.max(1, v.regens * (1 - v.regenCut / 100));
      var tokBefore = gensBefore * v.tpg * 1000;
      var tokAfter = gensAfter * (v.tpg + v.ctx) * 1000;
      var spendBefore = tokBefore / 1e6 * v.price;
      var spendAfter = tokAfter / 1e6 * v.price;
      var hrsBefore = tasks * v.rework;
      var hrsAfter = hrsBefore * (1 - v.reworkCut / 100);
      var laborBefore = hrsBefore * v.rate;
      var laborAfter = hrsAfter * v.rate;
      var maintHrs = v.maint * 12;
      var maintCost = maintHrs * v.rate;
      var setupCost = v.setup * v.rate;
      var gross = (spendBefore - spendAfter) + (laborBefore - laborAfter) - maintCost;
      var net = gross - setupCost;
      var paybackWeeks = gross > 0 ? setupCost / (gross / 52) : Infinity;

      result = {
        v: v, tasks: tasks, gensBefore: gensBefore, gensAfter: gensAfter, tokBefore: tokBefore, tokAfter: tokAfter,
        spendBefore: spendBefore, spendAfter: spendAfter, hrsBefore: hrsBefore, hrsAfter: hrsAfter,
        laborBefore: laborBefore, laborAfter: laborAfter, maintHrs: maintHrs, maintCost: maintCost,
        setupCost: setupCost, gross: gross, net: net, paybackWeeks: paybackWeeks,
        hoursReclaimed: hrsBefore - hrsAfter - maintHrs, tokensAvoided: tokBefore - tokAfter
      };
      render(result);
      listeners.forEach(function (fn) { fn(result); });
      return result;
    }

    function render(r) {
      $("#roiNet").textContent = (r.net < 0 ? "−" : "") + money(Math.abs(r.net));
      $("#roiNetSub").textContent = "Year 1, after " + num(r.v.setup) + " setup hours (" + money(r.setupCost) + "). Year 2 onward: " + money(r.gross) + " per year.";
      $("#heroSavings").textContent = money(r.gross);
      $("#roiHours").textContent = num(Math.max(0, r.hoursReclaimed));
      $("#roiHoursNote").textContent = "per year, ≈ " + num(Math.max(0, r.hoursReclaimed) / Math.max(1, r.v.engineers), 1) + " hrs per engineer, net of upkeep";
      var tAvoid = r.tokensAvoided;
      $("#roiTokens").textContent = (tAvoid < 0 ? "+" : "") + compactNum(Math.abs(tAvoid));
      $("#roiTokensNote").textContent = tAvoid < 0 ? "more tokens per year: added context outweighs fewer retries" : "per year, net of added context";
      $("#roiPayback").textContent = !isFinite(r.paybackWeeks) ? "No payback" : r.paybackWeeks < 1 ? "< 1 week" : r.paybackWeeks > 104 ? "> 2 years" : num(r.paybackWeeks, r.paybackWeeks < 10 ? 1 : 0) + (Math.round(r.paybackWeeks * 10) === 10 ? " week" : " weeks");

      drawBars($("#chartTokens"), r.spendBefore, r.spendAfter, "model spend");
      drawBars($("#chartLabor"), r.laborBefore, r.laborAfter + r.maintCost, "rework + upkeep");

      var lines = [
        ["UI tasks", num(r.tasks), num(r.tasks), "–"],
        ["Model generations", num(r.gensBefore), num(r.gensAfter), num(r.gensAfter - r.gensBefore)],
        ["Tokens", compactNum(r.tokBefore), compactNum(r.tokAfter), (r.tokAfter - r.tokBefore >= 0 ? "+" : "−") + compactNum(Math.abs(r.tokAfter - r.tokBefore))],
        ["Model spend", money(r.spendBefore, false), money(r.spendAfter, false), money(r.spendAfter - r.spendBefore, false)],
        ["Review + rework hours", num(r.hrsBefore), num(r.hrsAfter), num(r.hrsAfter - r.hrsBefore)],
        ["Review + rework cost", money(r.laborBefore, false), money(r.laborAfter, false), money(r.laborAfter - r.laborBefore, false)],
        ["AegisUI upkeep", money(0, false), money(r.maintCost, false), money(r.maintCost, false)],
        ["Total recurring cost", money(r.spendBefore + r.laborBefore, false), money(r.spendAfter + r.laborAfter + r.maintCost, false), money(-r.gross, false)]
      ];
      $("#roiTable tbody").innerHTML = lines.map(function (l, i) {
        var tag = i === lines.length - 1 ? "strong" : "span";
        return "<tr><th scope=\"row\">" + l[0] + "</th><td class=\"num\"><" + tag + ">" + l[1] + "</" + tag + "></td><td class=\"num\"><" + tag + ">" + l[2] + "</" + tag + "></td><td class=\"num\"><" + tag + ">" + l[3] + "</" + tag + "></td></tr>";
      }).join("");

      $("#roiFormula").textContent =
        "tasks          = engineers × tasks/week × weeks             = " + num(r.tasks) + "\n" +
        "gens_before    = tasks × generations_per_task               = " + num(r.gensBefore) + "\n" +
        "gens_after     = tasks × max(1, generations × (1 − " + r.v.regenCut + "%))  = " + num(r.gensAfter) + "\n" +
        "tokens_after   = gens_after × (tokens_per_gen + added_context)\n" +
        "spend          = tokens ÷ 1,000,000 × $" + r.v.price + "\n" +
        "rework_after   = tasks × rework_hrs × (1 − " + r.v.reworkCut + "%)\n" +
        "annual_value   = Δspend + Δrework_cost − upkeep              = " + money(r.gross, false) + "\n" +
        "year_1_value   = annual_value − setup_hours × hourly_cost    = " + money(r.net, false);
    }

    /* Two-bar comparison, direct-labelled, with a hover tooltip per bar. */
    function drawBars(fig, before, after, what) {
      var svg = fig.querySelector("svg"), tip = fig.querySelector(".tooltip");
      $$("g", svg).forEach(function (g) { g.remove(); });
      var g = svgEl("g", {}, svg);
      var W = Math.round(Math.max(220, svg.getBoundingClientRect().width || 320));
      svg.setAttribute("viewBox", "0 0 " + W + " 112");
      fig._last = [before, after, what];
      var max = Math.max(before, after, 1);
      var rows = [
        { label: "Without AegisUI", value: before, cls: "var(--color-chart-base)" },
        { label: "With AegisUI", value: after, cls: "var(--color-chart-accent)" }
      ];
      var valueW = 78;
      rows.forEach(function (row, i) {
        var y = 8 + i * 56;
        svgEl("text", { x: 0, y: y + 10, "font-size": 12, "font-weight": 500, fill: "var(--color-text-2)" }, g).textContent = row.label;
        svgEl("rect", { x: 0, y: y + 20, width: W - valueW, height: 20, rx: 4, fill: "var(--color-surface-2)" }, g);
        var w = Math.max(4, ((W - valueW) * row.value) / max);
        svgEl("rect", { class: "bar", x: 0, y: y + 20, width: w, height: 20, rx: 4, fill: row.cls }, g);
        var t = svgEl("text", { x: W - valueW + 10, y: y + 35, "font-size": 13, "font-weight": 600, fill: "var(--color-text)" }, g);
        t.textContent = money(row.value);
        var hit = svgEl("rect", { class: "bar-hit", x: 0, y: y, width: W, height: 48 }, g);
        hit.addEventListener("pointerenter", show); hit.addEventListener("pointermove", show);
        hit.addEventListener("pointerleave", function () { tip.classList.remove("is-visible"); });
        function show(e) {
          var fr = fig.getBoundingClientRect();
          var pct = before > 0 ? ((row.value - before) / before) * 100 : 0;
          tip.innerHTML = "<strong>" + money(row.value, false) + "</strong>" + row.label + " · " + what +
            (i === 1 && before > 0 ? "<br>" + (pct <= 0 ? "−" : "+") + Math.abs(pct).toFixed(0) + "% vs. without" : "");
          tip.style.left = (e.clientX - fr.left) + "px";
          tip.style.top = (e.clientY - fr.top) + "px";
          tip.classList.add("is-visible");
        }
      });
    }

    var resizeT;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { [$("#chartTokens"), $("#chartLabor")].forEach(function (fig) { if (fig._last) drawBars(fig, fig._last[0], fig._last[1], fig._last[2]); }); }, 120);
    });

    fields.forEach(function (f) { setValue(f.id, f.value, false); });
    return {
      calc: calc,
      onChange: function (fn) { listeners.push(fn); },
      result: function () { return result; }
    };
  })();

  /* ------------------------------------------------------------------------
     3. Architectural blueprint (interactive SVG)
     ------------------------------------------------------------------------ */
  var blueprint = (function () {
    var svg = $("#bpSvg"), panel = $("#bpPanel"), caption = $("#bpCaption"), wrap = $("#bp");
    var W = 180, H = 72;
    var G = {
      palette: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.3-1-2.5 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4-4-7.5-9-7.5ZM7.5 11h.01M10.5 7.5h.01M15 8h.01",
      braces: "M8 4c-2 0-2 1.5-2 3v2c0 1.5-1 2-2 3 1 1 2 1.5 2 3v2c0 1.5 0 3 2 3M16 4c2 0 2 1.5 2 3v2c0 1.5 1 2 2 3-1 1-2 1.5-2 3v2c0 1.5 0 3-2 3",
      build: "M4 7h16M4 12h10M4 17h6M16 14l3 3-3 3",
      doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
      contract: "M4 5h16v14H4zM8 10h8M8 14h5",
      code: "M8 7l-5 5 5 5M16 7l5 5-5 5",
      spark: "M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z",
      layout: "M3 5h18v14H3zM3 9h18M8 9v10",
      shield: "M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5",
      ship: "M5 12.5l4.5 4.5L19 7.5"
    };
    var nodes = [
      { id: "figma", x: 20, y: 70, layer: "source", tag: "SOURCE", title: "Figma Variables", sub: "Brand & theme intent", glyph: "palette",
        desc: "Designers keep making decisions where they already work. Variables are organised by collection (primitives → semantic → component) and modes (light, dark, density).",
        artifacts: ["Primitives collection", "Semantic collection", "Light / Dark modes"], why: "Design intent stays upstream. Nobody hand-copies hex codes into code." },
      { id: "tokens", x: 20, y: 210, layer: "source", tag: "SOURCE", title: "tokens.json", sub: "DTCG source of truth", glyph: "braces",
        desc: "A W3C Design Tokens Community Group (DTCG) file, versioned in git. Changes come in as pull requests with a diff a reviewer can read.",
        artifacts: ["tokens/tokens.json", "tokens/themes/*.json", "CHANGELOG.md"], why: "One reviewable file that designers, engineers and agents all read." },
      { id: "compiler", x: 270, y: 70, layer: "build", tag: "BUILD", title: "Token compiler", sub: "Validate & transform", glyph: "build",
        desc: "Resolves aliases, validates types and contrast pairs, and emits one output per platform. A token that breaks AA contrast fails the build.",
        artifacts: ["scripts/build-tokens.mjs", "npm run tokens:build"], why: "Catches a broken token before any agent or human uses it." },
      { id: "claude", x: 270, y: 210, layer: "rules", tag: "RULES", title: "CLAUDE.md", sub: "The agent's rulebook", glyph: "doc",
        desc: "Plain-language, testable rules loaded into the agent's context at the start of every session: allowed tokens, a11y bar, component policy and the definition of done.",
        artifacts: ["CLAUDE.md", "apps/*/CLAUDE.md (scoped)"], why: "Without it the agent starts from zero brand context on every prompt." },
      { id: "contracts", x: 270, y: 330, layer: "rules", tag: "RULES", title: "Contracts", sub: "Props · states · a11y", glyph: "contract",
        desc: "One short spec per component: variants, required props, states, keyboard behaviour and the tokens it may use. Agents compose from contracts and do not invent new patterns.",
        artifacts: ["contracts/Button.md", "contracts/DataTable.md", "contracts/*.md"], why: "Stops variant sprawl and keeps behaviour consistent across teams." },
      { id: "cssvars", x: 520, y: 70, layer: "build", tag: "BUILD", title: "CSS vars + types", sub: "tokens.css · .d.ts", glyph: "code",
        desc: "Framework-agnostic custom properties for runtime theming, plus typed exports so editors and agents autocomplete only names that exist.",
        artifacts: ["styles/tokens.css", "src/tokens.ts", "tokens.d.ts"], why: "Typed names mean a mistyped token is a type error, not a visual bug." },
      { id: "agent", x: 520, y: 210, layer: "agent", tag: "AGENT", title: "Claude Code agent", sub: "Reads repo context", glyph: "spark",
        desc: "The agent loads CLAUDE.md, the token catalog and the relevant contracts, plans the change, writes code and runs the token lint before it finishes.",
        artifacts: ["Session context", "Token catalog", "Plan → code → verify"], why: "Context is the cheapest lever for output quality, and caching keeps it cheap." },
      { id: "genui", x: 770, y: 210, layer: "agent", tag: "OUTPUT", title: "Generated UI", sub: "Production code", glyph: "layout",
        desc: "Production code that refers only to var(--…) tokens and contract-compliant components. It works in every theme with no extra effort.",
        artifacts: ["src/components/*", "src/screens/*"], why: "Reviewers judge the product decision, not the pixels." },
      { id: "ci", x: 1020, y: 210, layer: "governance", tag: "GOVERNANCE", title: "CI guardrails", sub: "Lint · axe · visual", glyph: "shield",
        desc: "Every PR runs a token lint (no raw hex or px), automated accessibility checks and visual regression. Failures go back to the agent as precise, fixable errors.",
        artifacts: ["scripts/lint-tokens.mjs", ".github/workflows/ui-guardrails.yml"], why: "The rules are enforced, not just suggested, for humans and agents alike." },
      { id: "release", x: 1020, y: 330, layer: "governance", tag: "GOVERNANCE", title: "Released UI", sub: "Merged & deployed", glyph: "ship",
        desc: "Merged UI ships with a usage report: which tokens and contracts are used, and where drift or one-off overrides appeared.",
        artifacts: ["Token usage report", "Drift dashboard"], why: "Usage data shows the design system team what to change next." }
    ];
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    function anchor(n, side) {
      switch (side) {
        case "r": return [n.x + W, n.y + H / 2];
        case "l": return [n.x, n.y + H / 2];
        case "t": return [n.x + W / 2, n.y];
        case "b": return [n.x + W / 2, n.y + H];
      }
    }
    function curve(a, b, horizontal) {
      if (horizontal) { var mx = (a[0] + b[0]) / 2; return "M" + a + " C" + mx + "," + a[1] + " " + mx + "," + b[1] + " " + b; }
      var my = (a[1] + b[1]) / 2; return "M" + a + " C" + a[0] + "," + my + " " + b[0] + "," + my + " " + b;
    }
    var edges = [
      { from: "figma", to: "tokens", label: "sync", d: function () { return curve(anchor(byId.figma, "b"), anchor(byId.tokens, "t"), false); }, lx: 134, ly: 180 },
      { from: "tokens", to: "compiler", label: "build", d: function () { return "M200,226 C235,226 235,106 270,106"; }, lx: 235, ly: 170 },
      { from: "compiler", to: "cssvars", label: "emit", d: function () { return curve(anchor(byId.compiler, "r"), anchor(byId.cssvars, "l"), true); }, lx: 485, ly: 98 },
      { from: "tokens", to: "claude", label: "referenced", d: function () { return "M200,262 C235,262 235,246 270,246"; }, lx: 235, ly: 284 },
      { from: "claude", to: "agent", label: "each session", d: function () { return curve(anchor(byId.claude, "r"), anchor(byId.agent, "l"), true); }, lx: 485, ly: 238 },
      { from: "contracts", to: "agent", label: "per-component rules", d: function () { var a = anchor(byId.contracts, "r"); return "M" + a + " C560," + a[1] + " 560,330 560," + (byId.agent.y + H); }, lx: 650, ly: 376 },
      { from: "cssvars", to: "agent", label: "token catalog", d: function () { return curve(anchor(byId.cssvars, "b"), anchor(byId.agent, "t"), false); }, lx: 650, ly: 180 },
      { from: "cssvars", to: "genui", label: "var(--…)", d: function () { var a = anchor(byId.cssvars, "r"), b = anchor(byId.genui, "t"); return "M" + a + " C" + b[0] + "," + a[1] + " " + b[0] + "," + a[1] + " " + b; }, lx: 790, ly: 98 },
      { from: "agent", to: "genui", label: "writes code", d: function () { return curve(anchor(byId.agent, "r"), anchor(byId.genui, "l"), true); }, lx: 735, ly: 238 },
      { from: "genui", to: "ci", label: "opens PR", d: function () { return curve(anchor(byId.genui, "r"), anchor(byId.ci, "l"), true); }, lx: 985, ly: 238 },
      { from: "ci", to: "agent", label: "fail → agent self-corrects", loop: true, d: function () { return "M1060," + (byId.ci.y + H) + " C1060,335 680,335 680," + (byId.agent.y + H); }, lx: 870, ly: 342 },
      { from: "ci", to: "release", label: "pass → merge", d: function () { return curve([byId.ci.x + 130, byId.ci.y + H], [byId.release.x + 130, byId.release.y], false); }, lx: 1108, ly: 312 },
      { from: "release", to: "tokens", label: "drift & usage report → next token PR", loop: true, d: function () { var a = anchor(byId.release, "l"); return "M" + a + " C960," + a[1] + " 960,455 900,455 L145,455 Q110,455 110,430 L110," + (byId.tokens.y + H); }, lx: 600, ly: 450 }
    ];

    var defs = svgEl("defs", {}, svg);
    [["bpArrow", "bp__arrow"], ["bpArrowHot", "bp__arrow bp__arrow--hot"]].forEach(function (m) {
      var mk = svgEl("marker", { id: m[0], viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
      svgEl("path", { d: "M0,0 L10,5 L0,10 z", class: m[1] }, mk);
    });

    var lanes = [["Source", 20], ["Build & rules", 270], ["Agent", 520], ["Output", 770], ["Governance", 1020]];
    lanes.forEach(function (l, i) {
      svgEl("text", { x: l[1], y: 28, class: "bp__lane-label" }, svg).textContent = l[0];
      if (i) svgEl("line", { x1: l[1] - 35, y1: 14, x2: l[1] - 35, y2: 420, class: "bp__grid-line", "stroke-dasharray": "2 6" }, svg);
    });

    var edgeLayer = svgEl("g", {}, svg);
    var labelLayer = svgEl("g", {}, svg);
    var nodeLayer = svgEl("g", {}, svg);
    edges.forEach(function (e, i) {
      e.el = svgEl("path", { d: e.d(), class: "bp__edge" + (e.loop ? " bp__edge--loop" : ""), "marker-end": "url(#bpArrow)", "data-i": i }, edgeLayer);
      e.lab = svgEl("text", { x: e.lx, y: e.ly, class: "bp__edge-label", "text-anchor": "middle" }, labelLayer);
      e.lab.textContent = e.label;
    });
    var packet = svgEl("circle", { r: 7, class: "bp__packet", opacity: 0 }, svg);

    nodes.forEach(function (n) {
      var g = svgEl("g", { class: "bp__node", transform: "translate(" + n.x + "," + n.y + ")", tabindex: 0, role: "button", "aria-label": n.title + ": " + n.sub, "data-id": n.id, "data-node-layer": n.layer }, nodeLayer);
      svgEl("rect", { class: "bp__node-box", width: W, height: H, rx: 10 }, g);
      svgEl("rect", { class: "bp__node-icon", x: 12, y: 16, width: 32, height: 32, rx: 8 }, g);
      svgEl("path", { class: "bp__node-glyph", d: G[n.glyph], transform: "translate(17,21) scale(0.92)" }, g);
      svgEl("text", { class: "bp__node-tag", x: 56, y: 25 }, g).textContent = n.tag;
      svgEl("text", { class: "bp__node-title", x: 56, y: 44 }, g).textContent = n.title;
      svgEl("text", { class: "bp__node-sub", x: 56, y: 60 }, g).textContent = n.sub;
      n.el = g;
      g.addEventListener("click", function () { stopTrace(); select(selected === n.id ? null : n.id); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stopTrace(); select(selected === n.id ? null : n.id); } });
    });

    var selected = null;
    function clearState() {
      wrap.classList.remove("has-focus");
      nodes.forEach(function (n) { n.el.classList.remove("is-related", "is-active"); });
      edges.forEach(function (e) { e.el.classList.remove("is-related", "is-hot"); e.lab.classList.remove("is-related"); e.el.setAttribute("marker-end", "url(#bpArrow)"); });
    }
    function relateEdge(e) { e.el.classList.add("is-related"); e.lab.classList.add("is-related"); e.el.setAttribute("marker-end", "url(#bpArrowHot)"); }
    function select(id) {
      selected = id;
      clearState();
      if (!id) { renderPanel(null); return; }
      wrap.classList.add("has-focus");
      var n = byId[id];
      n.el.classList.add("is-related", "is-active");
      edges.forEach(function (e) {
        if (e.from === id || e.to === id) { relateEdge(e); byId[e.from].el.classList.add("is-related"); byId[e.to].el.classList.add("is-related"); }
      });
      renderPanel(n);
    }
    function filterLayer(layer) {
      selected = null;
      clearState();
      if (layer === "all") { renderPanel(null); return; }
      wrap.classList.add("has-focus");
      nodes.forEach(function (n) { if (n.layer === layer) n.el.classList.add("is-related"); });
      edges.forEach(function (e) { if (byId[e.from].layer === layer && byId[e.to].layer === layer) relateEdge(e); });
      var names = nodes.filter(function (n) { return n.layer === layer; }).map(function (n) { return n.title; });
      panel.innerHTML = "<div><span class=\"eyebrow\">" + layer + " layer</span><h3>" + names.join(" · ") + "</h3><p>Select a node to see its responsibilities and artifacts.</p></div>";
    }
    function renderPanel(n) {
      if (!n) {
        panel.innerHTML = "<div><span class=\"eyebrow\">How to read this</span><h3>Ten parts, one loop</h3>" +
          "<p>Decisions flow left to right, from design intent to shipped UI. Two dashed loops make the system self-correcting: CI failures go back to the agent, and production usage feeds the next token change.</p></div>" +
          "<dl><div><dt>Interact</dt><dd>Click or tab to a node, then press Enter. Filter by layer above.</dd></div><div><dt>Key idea</dt><dd>Agents don't need more creativity. They need <strong>constraints they can read</strong>.</dd></div></dl>";
        return;
      }
      panel.innerHTML = "<div><span class=\"eyebrow\">" + n.tag + "</span><h3>" + n.title + "</h3><p>" + n.desc + "</p></div>" +
        "<dl><div><dt>Artifacts</dt><dd>" + n.artifacts.map(function (a) { return "<code>" + escapeHtml(a) + "</code>"; }).join(" ") + "</dd></div>" +
        "<div><dt>Why it matters</dt><dd>" + n.why + "</dd></div>" +
        "<div><dt>Connects to</dt><dd>" + edges.filter(function (e) { return e.from === n.id || e.to === n.id; }).map(function (e) {
          return (e.from === n.id ? "→ " + byId[e.to].title : "← " + byId[e.from].title) + " <span style=\"color:var(--color-text-3)\">(" + e.label + ")</span>";
        }).join("<br>") + "</dd></div></dl>";
    }

    $$("[data-layer]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        stopTrace();
        $$("[data-layer]").forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        filterLayer(chip.getAttribute("data-layer"));
      });
    });

    /* Trace: one token change travelling through the whole system. */
    var trace = [
      [0, "A designer changes <strong>color.action</strong> in Figma Variables, and sync writes it to tokens.json."],
      [1, "The compiler validates types and AA contrast pairs for every theme."],
      [2, "It emits <strong>tokens.css</strong> and typed exports."],
      [6, "The agent's context now lists the updated token catalog."],
      [4, "CLAUDE.md applies: <strong>only var(--color-*)</strong>, never raw hex."],
      [8, "The agent regenerates the affected components."],
      [9, "A PR opens. CI runs token lint, axe and visual diff."],
      [10, "Lint finds one hard-coded <strong>#2c56e0</strong>. The error goes back to the agent."],
      [8, "The agent replaces it with <strong>var(--color-action)</strong>."],
      [9, "Re-check: 0 violations, 0 axe issues."],
      [11, "Merged and released."],
      [12, "The usage report feeds the next token decision. The loop closes."]
    ];
    var traceTimer = null, traceRaf = null, tracing = false;
    function stopTrace() {
      tracing = false;
      clearTimeout(traceTimer); cancelAnimationFrame(traceRaf);
      packet.setAttribute("opacity", 0);
      $("#bpTrace").innerHTML = '<svg aria-hidden="true"><use href="#i-play"/></svg>Trace a change';
    }
    function runTrace() {
      $$("[data-layer]").forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-layer") === "all")); });
      tracing = true;
      $("#bpTrace").innerHTML = '<svg aria-hidden="true"><use href="#i-x"/></svg>Stop trace';
      var i = 0;
      (function step() {
        if (!tracing) return;
        if (i >= trace.length) { stopTrace(); select(null); caption.innerHTML = "Trace complete. Select any node to explore."; return; }
        var e = edges[trace[i][0]];
        selected = null; clearState();
        wrap.classList.add("has-focus");
        relateEdge(e); e.el.classList.add("is-hot");
        byId[e.from].el.classList.add("is-related");
        byId[e.to].el.classList.add("is-related", "is-active");
        renderPanel(byId[e.to]);
        caption.innerHTML = "<strong>Step " + (i + 1) + "/" + trace.length + "</strong> · " + trace[i][1];
        var dur = 1500;
        if (!reduceMotion) {
          var len = e.el.getTotalLength(), t0 = performance.now();
          packet.setAttribute("opacity", 1);
          (function move(now) {
            if (!tracing) return;
            var t = clamp((now - t0) / (dur * 0.6), 0, 1);
            var p = e.el.getPointAtLength(len * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
            packet.setAttribute("cx", p.x); packet.setAttribute("cy", p.y);
            if (t < 1) traceRaf = requestAnimationFrame(move);
          })(t0);
        }
        i++;
        traceTimer = setTimeout(step, dur + 600);
      })();
    }
    $("#bpTrace").addEventListener("click", function () { if (tracing) { stopTrace(); select(null); caption.textContent = ""; } else runTrace(); });

    renderPanel(null);
    return {};
  })();

  /* ------------------------------------------------------------------------
     4. Step-by-step guide
     ------------------------------------------------------------------------ */
  var guide = (function () {
    function hl(src, lang) {
      var s = escapeHtml(src);
      if (lang === "md") {
        return s.split("\n").map(function (line) {
          if (/^#{1,3} /.test(line)) return '<span class="tk-h">' + line + "</span>";
          return line.replace(/(`[^`]+`)/g, '<span class="tk-s">$1</span>');
        }).join("\n");
      }
      return s
        .replace(/(&quot;|")((?:[^"\\\n]|\\.)*)"/g, '<span class="tk-s">"$2"</span>')
        .replace(/('(?:[^'\\\n]|\\.)*')/g, '<span class="tk-s">$1</span>')
        .replace(/(^|\s)(\/\/[^\n]*|#(?!\w{3,6}\b)[^\n]*)/g, '$1<span class="tk-c">$2</span>')
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tk-c">$1</span>')
        .replace(/\b(const|let|import|from|export|for|of|if|return|function|await|new|on|jobs|steps|uses|run|name|runs-on)\b(?=[\s:(])/g, '<span class="tk-k">$1</span>')
        .replace(/(--[a-z0-9-]+)/g, '<span class="tk-k">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)(px|ms|%)?\b/g, '<span class="tk-n">$1$2</span>');
    }
    function codeBlock(file, src, lang) {
      return '<div class="code"><div class="code__bar"><span>' + escapeHtml(file) + '</span><button class="btn btn--sm" type="button" data-copy><svg aria-hidden="true"><use href="#i-copy"/></svg>Copy</button></div><pre><code data-lang="' + (lang || "") + '">' + hl(src, lang) + "</code></pre></div>";
    }
    function termBlock(id, title) {
      return '<div class="term" id="' + id + '"><div class="term__bar"><span>' + title + '</span><button class="btn btn--sm" type="button" data-run="' + id + '"><svg aria-hidden="true"><use href="#i-play"/></svg>Run</button></div><div class="term__body" aria-live="polite"><span class="dim">Press Run to simulate.</span></div></div>';
    }

    var TOKENS_JSON = '{\n  "color": {\n    "action":  { "$type": "color", "$value": "#2c56e0" },\n    "text":    { "$type": "color", "$value": "#0d1626" },\n    "text-3":  { "$type": "color", "$value": "#5a6678" },\n    "surface": { "$type": "color", "$value": "#ffffff" },\n    "danger":  { "$type": "color", "$value": "#b42323" }\n  },\n  "space":  {\n    "2": { "$type": "dimension", "$value": "8px" },\n    "4": { "$type": "dimension", "$value": "16px" },\n    "6": { "$type": "dimension", "$value": "24px" }\n  },\n  "radius": {\n    "sm": { "$type": "dimension", "$value": "6px" },\n    "md": { "$type": "dimension", "$value": "10px" }\n  }\n}';
    var BUILD_JS = '// scripts/build-tokens.mjs: flattens DTCG JSON into CSS custom properties\nimport { readFileSync, writeFileSync } from "node:fs";\n\nconst tokens = JSON.parse(readFileSync("tokens/tokens.json", "utf8"));\nconst lines = [];\n\nfunction walk(node, path) {\n  if (node && typeof node === "object" && "$value" in node) {\n    lines.push(`  --${path.join("-")}: ${node.$value};`);\n    return;\n  }\n  for (const [key, child] of Object.entries(node)) walk(child, [...path, key]);\n}\n\nwalk(tokens, []);\nwriteFileSync("styles/tokens.css", `:root {\\n${lines.join("\\n")}\\n}\\n`);\nconsole.log(`Wrote ${lines.length} tokens to styles/tokens.css`);';
    var CSS_OUT = '/* styles/tokens.css (generated, do not edit) */\n:root {\n  --color-action: #2c56e0;\n  --color-text: #0d1626;\n  --color-text-3: #5a6678;\n  --color-surface: #ffffff;\n  --color-danger: #b42323;\n  --space-2: 8px;\n  --space-4: 16px;\n  --space-6: 24px;\n  --radius-sm: 6px;\n  --radius-md: 10px;\n}';
    var CONTRACT = '# Button (contract)\n\n## Variants\n- `primary`: one per view, for the main action\n- `secondary`: for supporting actions\n- `ghost`: for toolbar and low-emphasis actions\n\n## Props\n- `variant` (required), `size`: `sm` | `md` (default `md`)\n- `disabled`, `loading` (shows a spinner and keeps the width)\n\n## Tokens\n- Fill: `--color-action` · Text: `--color-action-text`\n- Radius: `--radius-sm` · Height: 40px (`md`), 32px (`sm`)\n\n## Accessibility\n- A native `<button>`, never a clickable `<div>` or `<span>`\n- Visible `:focus-visible` ring using `--color-focus`\n- The label is a verb: "Create invoice", not "Click here"';
    var PROMPT = 'Build the Q4 billing overview screen:\n- KPI row: MRR, active seats, logo churn (with trend)\n- Failed-payment alert\n- Filterable invoice table (customer, invoice, issued, amount, status)\n\nFollow CLAUDE.md and the contracts in /contracts.\nUse only AegisUI tokens. Run the token lint before you finish.';
    var LINT_JS = '// scripts/lint-tokens.mjs: fails CI on raw values outside tokens/\nimport { readFileSync, globSync } from "node:fs"; // globSync needs Node 22+\n\nconst RAW = /#[0-9a-f]{3,8}\\b|rgba?\\(|\\b\\d+px\\b/gi;\nlet violations = 0;\n\nfor (const file of globSync("src/**/*.{css,tsx,jsx,vue,svelte}")) {\n  readFileSync(file, "utf8").split("\\n").forEach((line, i) => {\n    if (line.includes("lint-tokens-ignore")) return;\n    for (const m of line.matchAll(RAW)) {\n      violations++;\n      console.error(`${file}:${i + 1}  raw value "${m[0]}" → use a token`);\n    }\n  });\n}\nif (violations) { console.error(`\\n${violations} violation(s)`); process.exit(1); }\nconsole.log("Token lint: 0 violations");';
    var WORKFLOW = '# .github/workflows/ui-guardrails.yml\nname: ui-guardrails\non: [pull_request]\njobs:\n  guardrails:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 22 }\n      - run: npm ci\n      - run: npm run tokens:build\n      - run: node scripts/lint-tokens.mjs\n      - run: npm run test:a11y      # e.g. axe via Playwright\n      - run: npm run test:visual    # visual regression';

    var builderOpts = [
      { id: "strict", label: "Strict tokens", desc: "No raw hex, rgb() or px outside tokens/", on: true },
      { id: "a11y", label: "WCAG 2.2 AA", desc: "Contrast, focus, labels, no color-only meaning", on: true },
      { id: "contracts", label: "Component contracts", desc: "Compose from /contracts; never invent variants", on: true },
      { id: "themes", label: "Light + dark parity", desc: "Semantic tokens only", on: true },
      { id: "deps", label: "No new UI dependencies", desc: "No component kits, icon packs or CSS frameworks", on: false },
      { id: "verify", label: "Definition of done", desc: "Run lint and report the tokens used", on: true }
    ];
    function buildClaudeMd(name, o) {
      var L = [];
      L.push("# CLAUDE.md · " + (name || "Product") + " UI rules", "");
      L.push("You are working in a codebase that uses the AegisUI design system.", "");
      L.push("## Sources of truth");
      L.push("- Tokens: `tokens/tokens.json` (DTCG). Compiled to `styles/tokens.css`. Never edit the CSS by hand.");
      if (o.contracts) L.push("- Components: specs live in `contracts/*.md`. Read the relevant contract before you write a component.");
      L.push("");
      L.push("## Hard rules");
      if (o.strict) {
        L.push("- Use only `var(--…)` tokens for color, spacing, radius, shadow and typography.");
        L.push("- No raw hex, `rgb()` or `px` values outside `tokens/`. If no suitable token exists, stop and propose one.");
        L.push("- Spacing uses the `--space-*` 4px scale. Radius uses `--radius-sm|md|lg` only.");
      }
      if (o.themes) L.push("- Use semantic tokens (`--color-text`, `--color-surface`), never palette primitives, so every screen works in light and dark.");
      if (o.a11y) {
        L.push("- Meet WCAG 2.2 AA: text contrast ≥ 4.5:1 (3:1 for large text), and a visible `:focus-visible` style on every interactive element.");
        L.push("- Every input has a visible `<label>`. Placeholders are hints, not labels.");
        L.push("- Never show status by color alone. Pair it with an icon and text.");
        L.push("- Use semantic HTML: `<button>` for actions, `<a>` for navigation, `<table>` with `<th>` for data.");
      }
      if (o.contracts) {
        L.push("", "## Components");
        L.push("- Compose from existing contracts. Do not create new variants. Propose them in the PR description instead.");
        L.push("- Button labels are verbs (\"Create invoice\"), never \"Click here\".");
      }
      if (o.deps) L.push("", "## Dependencies", "- Do not add UI dependencies (component kits, icon packs, CSS frameworks).");
      L.push("", "## Content");
      L.push("- Numbers: tabular figures, right-aligned in tables, one format per column (e.g. `$12,400.00`).");
      L.push("- No emoji in product UI. Sentence case for headings.");
      if (o.verify) {
        L.push("", "## Definition of done");
        L.push("- Run `npm run tokens:build` and `node scripts/lint-tokens.mjs`, then fix every violation.");
        L.push("- In your summary, list the tokens and contracts you used and any token you think is missing.");
      }
      return L.join("\n");
    }

    var steps = [
      { title: "Define tokens", short: "Define tokens",
        body: "<p>Start with a small, semantic token set in the W3C DTCG format. Name tokens by <em>role</em> (<code>color.action</code>, <code>color.text-3</code>), not by appearance (<code>blue-500</code>). Agents choose a token far more reliably when its name says what it is for.</p>",
        why: "Ten well-named semantic tokens beat 200 primitives. Begin with color, space and radius, and add the rest later.",
        cols: function () { return codeBlock("tokens/tokens.json", TOKENS_JSON, "json"); } },
      { title: "Compile to CSS variables", short: "Compile",
        body: "<p>Flatten the token tree into CSS custom properties. The script below is complete and dependency-free. Swap in Style Dictionary later if you need many platforms.</p>",
        why: "CSS variables work in every framework and switch themes at runtime. One compiled file is also a compact catalog the agent can read.",
        cols: function () { return '<div class="guide__cols">' + codeBlock("scripts/build-tokens.mjs", BUILD_JS, "js") + codeBlock("styles/tokens.css", CSS_OUT, "css") + "</div>"; } },
      { title: "Write CLAUDE.md", short: "CLAUDE.md",
        body: "<p>Claude Code loads <code>CLAUDE.md</code> from the repo root into context at the start of every session. Make each rule <strong>specific and testable</strong>. Choose your rules below and the file updates live.</p>",
        why: "\"Make it look nice\" can't be verified. \"No raw hex outside tokens/\" can be checked by a linter, and an agent can follow it.",
        cols: function () {
          return '<div class="guide__cols"><fieldset class="builder" id="mdBuilder"><legend>Rules to include</legend>' +
            '<label class="field" style="margin-bottom:var(--space-2)"><span class="field__label">Product name</span><input class="input" id="mdName" type="text" value="Acme Console"></label>' +
            builderOpts.map(function (o) { return '<label class="check"><input type="checkbox" data-opt="' + o.id + '"' + (o.on ? " checked" : "") + '><span><strong>' + o.label + "</strong><br>" + o.desc + "</span></label>"; }).join("") +
            '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-2)"><button class="btn btn--primary btn--sm" type="button" id="mdDownload"><svg aria-hidden="true"><use href="#i-download"/></svg>Download CLAUDE.md</button></div>' +
            '</fieldset><div id="mdPreview"></div></div>';
        } },
      { title: "Add component contracts", short: "Contracts",
        body: "<p>Give each core component a short Markdown contract covering variants, props, tokens and accessibility. Reference the folder from <code>CLAUDE.md</code>. The agent reads only the contracts it needs, which keeps context small.</p>",
        why: "Contracts stop variant sprawl. If an agent wants a fourth button style, it has to say so in the PR.",
        cols: function () { return codeBlock("contracts/Button.md", CONTRACT, "md"); } },
      { title: "Prompt the agent", short: "Prompt",
        body: "<p>With the rules in the repo, prompts describe <em>what</em> to build, not how it should look. Point to the rules and ask the agent to verify its work before finishing.</p>",
        why: "The rulebook carries the brand, so prompts stay short and anyone on the team can write one.",
        cols: function () { return '<div class="guide__cols">' + codeBlock("prompt.txt", PROMPT, "md") + termBlock("termAgent", "Agent session (simulated)") + "</div>"; } },
      { title: "Enforce in CI", short: "Enforce",
        body: "<p>Rules that aren't enforced drift. Add a token lint, automated accessibility checks and visual regression to every PR. Failures are precise enough for the agent to fix on its own.</p>",
        why: "CI turns the design system from guidance into a guarantee, for humans and agents equally.",
        cols: function () { return '<div class="guide__cols">' + codeBlock("scripts/lint-tokens.mjs", LINT_JS, "js") + '<div style="display:grid;gap:var(--space-4);min-width:0">' + codeBlock(".github/workflows/ui-guardrails.yml", WORKFLOW, "yml") + termBlock("termCi", "CI run (simulated)") + "</div></div>"; } }
    ];

    var terms = {
      termAgent: [
        ["dim", "$ claude"], ["", "> Build the Q4 billing overview screen…"], ["acc", "● Reading CLAUDE.md (24 rules)"],
        ["acc", "● Reading styles/tokens.css (38 tokens)"], ["acc", "● Reading contracts/Button.md, contracts/DataTable.md, contracts/Badge.md"],
        ["", "  Plan: KpiCard ×3 → Alert(danger) → FilterBar → DataTable"], ["", "  Writing src/screens/BillingOverview.tsx"],
        ["", "  Writing src/components/KpiCard.tsx"], ["dim", "$ node scripts/lint-tokens.mjs"],
        ["warn", "  src/components/KpiCard.tsx:14  raw value \"12px\" → use a token"], ["", "  Fixing: 12px → var(--space-3)"],
        ["dim", "$ node scripts/lint-tokens.mjs"], ["ok", "  Token lint: 0 violations"],
        ["ok", "✓ Done. Used 17 tokens and 3 contracts. Suggested new token: --color-chart-accent."]
      ],
      termCi: [
        ["dim", "▶ ui-guardrails · pull_request #128"], ["", "  npm ci ……………………………… ok"], ["", "  tokens:build ………………… 38 tokens"],
        ["", "  lint-tokens ……………………"], ["ok", "    0 violations"], ["", "  test:a11y (axe) …………"], ["ok", "    0 serious / 0 critical"],
        ["", "  test:visual ……………………"], ["ok", "    12 snapshots match"], ["ok", "✓ All guardrails passed: ready for design review"]
      ]
    };
    function runTerm(id) {
      var el = document.getElementById(id), body = el.querySelector(".term__body"), lines = terms[id];
      if (el._running) return;
      el._running = true;
      body.innerHTML = "";
      var i = 0;
      (function next() {
        if (i >= lines.length) { el._running = false; return; }
        var cur = body.querySelector(".term__cursor"); if (cur) cur.remove();
        var span = document.createElement("span");
        if (lines[i][0]) span.className = lines[i][0];
        span.textContent = lines[i][1] + "\n";
        body.appendChild(span);
        var c = document.createElement("span"); c.className = "term__cursor"; body.appendChild(c);
        i++;
        setTimeout(next, reduceMotion ? 0 : 260 + Math.random() * 260);
      })();
    }

    var tabs = $("#guideTabs"), panels = $("#guidePanels");
    var done = store.get("aegis-guide-done", []);
    if (!Array.isArray(done)) done = [];
    var active = 0;

    steps.forEach(function (s, i) {
      var li = document.createElement("li");
      li.innerHTML = '<button class="guide__tab" role="tab" id="gtab-' + i + '" aria-controls="gpanel-' + i + '" aria-selected="false" tabindex="-1"><span class="guide__num">' + (i + 1) + "</span><span>" + s.short + "</span></button>";
      tabs.appendChild(li);
      var p = document.createElement("div");
      p.className = "guide__panel"; p.id = "gpanel-" + i; p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "gtab-" + i); p.hidden = true;
      p.innerHTML = '<span class="eyebrow">Step ' + (i + 1) + " of " + steps.length + "</span><h3>" + s.title + "</h3>" + s.body +
        '<p class="guide__why"><strong>Why it works:</strong> ' + s.why + "</p>" + s.cols() +
        '<div class="guide__footer"><button class="btn btn--ghost" type="button" data-prev' + (i === 0 ? " disabled" : "") + ">← Previous</button><span class=\"toolbar__spacer\"></span>" +
        '<button class="btn btn--secondary" type="button" data-toggle-done></button>' +
        (i < steps.length - 1 ? '<button class="btn btn--primary" type="button" data-next>Next step →</button>' : '<a class="btn btn--primary" href="#share">Share the case study →</a>') + "</div>";
      panels.appendChild(p);
    });

    var tabBtns = $$(".guide__tab", tabs);
    function show(i, focus) {
      active = clamp(i, 0, steps.length - 1);
      tabBtns.forEach(function (b, j) { b.setAttribute("aria-selected", String(j === active)); b.tabIndex = j === active ? 0 : -1; });
      $$(".guide__panel", panels).forEach(function (p, j) { p.hidden = j !== active; });
      if (focus) tabBtns[active].focus();
      store.set("aegis-guide-active", active);
    }
    function syncDone() {
      tabBtns.forEach(function (b, j) { b.classList.toggle("is-done", done.indexOf(j) > -1); });
      $$(".guide__panel", panels).forEach(function (p, j) {
        var btn = p.querySelector("[data-toggle-done]");
        var isDone = done.indexOf(j) > -1;
        btn.innerHTML = isDone ? '<svg aria-hidden="true"><use href="#i-check"/></svg>Completed' : "Mark complete";
        btn.setAttribute("aria-pressed", String(isDone));
      });
      $("#guideProgressText").textContent = done.length + " of " + steps.length + " complete";
      $("#guideProgressBar").style.width = (done.length / steps.length) * 100 + "%";
      store.set("aegis-guide-done", done);
    }
    tabBtns.forEach(function (b, i) {
      b.addEventListener("click", function () { show(i); });
      b.addEventListener("keydown", function (e) {
        var k = e.key;
        if (k === "ArrowDown" || k === "ArrowRight") { show((active + 1) % steps.length, true); e.preventDefault(); }
        else if (k === "ArrowUp" || k === "ArrowLeft") { show((active - 1 + steps.length) % steps.length, true); e.preventDefault(); }
        else if (k === "Home") { show(0, true); e.preventDefault(); }
        else if (k === "End") { show(steps.length - 1, true); e.preventDefault(); }
      });
    });
    panels.addEventListener("click", function (e) {
      var t = e.target.closest("button, a");
      if (!t) return;
      if (t.hasAttribute("data-prev")) show(active - 1);
      else if (t.hasAttribute("data-next")) { if (done.indexOf(active) < 0) done.push(active); syncDone(); show(active + 1); tabs.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" }); }
      else if (t.hasAttribute("data-toggle-done")) { var ix = done.indexOf(active); if (ix > -1) done.splice(ix, 1); else done.push(active); syncDone(); }
      else if (t.hasAttribute("data-run")) runTerm(t.getAttribute("data-run"));
      else if (t.hasAttribute("data-copy")) copyText(t.closest(".code").querySelector("code").textContent);
      else if (t.id === "mdDownload") downloadBlob(new Blob([currentMd()], { type: "text/markdown" }), "CLAUDE.md");
    });

    function currentMd() {
      var o = {}; $$("[data-opt]").forEach(function (c) { o[c.getAttribute("data-opt")] = c.checked; });
      return buildClaudeMd($("#mdName").value.trim(), o);
    }
    function renderMd() { $("#mdPreview").innerHTML = codeBlock("CLAUDE.md", currentMd(), "md"); }
    $("#mdBuilder").addEventListener("input", renderMd);
    renderMd();

    show(store.get("aegis-guide-active", 0) || 0);
    syncDone();
    return {};
  })();

  /* ------------------------------------------------------------------------
     5. Social preview cards (canvas, native platform sizes)
     ------------------------------------------------------------------------ */
  var social = (function () {
    var C = { bg: "#0b1220", bg2: "#121c30", line: "#24324d", ink: "#f3f5f9", ink2: "#b6bfcd", ink3: "#8392aa", accent: "#7a9bff", accentDeep: "#2c56e0", ok: "#5fcf8a" };
    var FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

    function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function wrapText(ctx, text, x, y, maxW, lh) {
      var lines = [];
      text.split("\n").forEach(function (para) {
        var words = para.split(" "), line = "";
        words.forEach(function (w) { var test = line ? line + " " + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; });
        lines.push(line);
      });
      lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
      return y + lines.length * lh;
    }
    function frame(ctx, w, h) {
      var g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, C.bg); g.addColorStop(1, C.bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(122,155,255,0.07)"; ctx.lineWidth = 1;
      for (var x = 0; x < w; x += 48) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
      for (var y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
    }
    function brand(ctx, x, y, s) {
      s = s || 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = C.accent;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(36, 6); ctx.lineTo(36, 17); ctx.bezierCurveTo(36, 28, 28, 37, 18, 40); ctx.bezierCurveTo(8, 37, 0, 28, 0, 17); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = C.bg; ctx.lineWidth = 3.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(11, 20); ctx.lineTo(16, 25); ctx.lineTo(25, 14); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.font = "700 26px " + FONT; ctx.textBaseline = "middle"; ctx.fillText("AegisUI", 50, 21);
      ctx.restore(); ctx.textBaseline = "alphabetic";
    }
    function miniDash(ctx, x, y, w, h, slop) {
      ctx.save(); rr(ctx, x, y, w, h, slop ? 26 : 14); ctx.clip();
      if (slop) {
        var g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, "#fdfbff"); g.addColorStop(1, "#ffe9f6"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        var t = ctx.createLinearGradient(x, 0, x + w, 0); t.addColorStop(0, "#7c3aed"); t.addColorStop(0.6, "#ec4899"); t.addColorStop(1, "#f59e0b");
        ctx.fillStyle = t; rr(ctx, x + w * 0.15, y + 26, w * 0.7, 22, 11); ctx.fill();
        rr(ctx, x + w * 0.3, y + 62, w * 0.4, 30, 15); ctx.fill();
        var cols = ["#7c3aed", "#db2777", "#059669"], radii = [22, 3, 14];
        for (var i = 0; i < 3; i++) { var cw = (w - 60) / 3; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(124,58,237,0.35)"; ctx.shadowBlur = 18; rr(ctx, x + 18 + i * (cw + 12), y + 112, cw, 76, radii[i]); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = cols[i]; rr(ctx, x + 30 + i * (cw + 12), y + 150, cw - 24, 14, 7); ctx.fill(); }
        ctx.fillStyle = "#fff7d6"; rr(ctx, x + 18, y + 204, w - 36, 26, 12); ctx.fill();
        for (var r = 0; r < 4; r++) { ctx.fillStyle = r % 2 ? "#fdf4ff" : "#ffffff"; ctx.fillRect(x + 18, y + 244 + r * 26, w - 36, 26); ctx.fillStyle = ["#34d399", "#fbbf24", "#f87171", "#34d399"][r]; ctx.fillRect(x + w - 80, y + 254 + r * 26, 40, 6); }
      } else {
        ctx.fillStyle = "#f6f7f9"; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#0d1626"; ctx.fillRect(x + 20, y + 28, w * 0.42, 14);
        ctx.fillStyle = "#c6cdd8"; ctx.fillRect(x + 20, y + 52, w * 0.25, 8);
        ctx.fillStyle = "#2c56e0"; rr(ctx, x + w - 104, y + 24, 84, 30, 6); ctx.fill();
        for (var k = 0; k < 3; k++) { var kw = (w - 64) / 3; ctx.fillStyle = "#fff"; ctx.strokeStyle = "#e1e5eb"; rr(ctx, x + 20 + k * (kw + 12), y + 76, kw, 70, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#5a6678"; ctx.fillRect(x + 34 + k * (kw + 12), y + 92, kw * 0.5, 6); ctx.fillStyle = "#0d1626"; ctx.fillRect(x + 34 + k * (kw + 12), y + 108, kw * 0.55, 14); ctx.fillStyle = "#16733a"; rr(ctx, x + 34 + k * (kw + 12), y + 130, 34, 8, 4); ctx.fill(); }
        ctx.fillStyle = "#fbe9e9"; rr(ctx, x + 20, y + 160, w - 40, 30, 8); ctx.fill(); ctx.fillStyle = "#b42323"; ctx.fillRect(x + 20, y + 160, 4, 30);
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#e1e5eb"; rr(ctx, x + 20, y + 204, w - 40, h - 222, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f0f2f5"; ctx.fillRect(x + 21, y + 205, w - 42, 24);
        for (var j = 0; j < 4; j++) { var ry = y + 240 + j * 28; ctx.fillStyle = "#3a4557"; ctx.fillRect(x + 34, ry, 70, 7); ctx.fillRect(x + w - 190, ry, 56, 7); ctx.fillStyle = ["#e6f4ec", "#fdf1df", "#fbe9e9", "#e6f4ec"][j]; rr(ctx, x + w - 112, ry - 4, 60, 16, 8); ctx.fill(); }
      }
      ctx.restore();
    }

    var cards = [
      { id: "og", name: "Link preview (Open Graph)", platform: "Slack · LinkedIn · iMessage", w: 1200, h: 630, file: "aegisui-og-1200x630.png",
        caption: function () { return "AI coding agents write UI fast, and generic by default.\n\nAegisUI gives them a design system they can read: DTCG tokens → CLAUDE.md rules → component contracts → CI guardrails. The result is first-pass UI that's on-brand, accessible and consistent.\n\nInteractive case study 👇"; },
        draw: function (ctx, w, h) {
          frame(ctx, w, h); brand(ctx, 64, 60);
          ctx.fillStyle = C.ink; ctx.font = "700 54px " + FONT;
          var y = wrapText(ctx, "AI writes UI fast.\nAegisUI makes it yours.", 64, 220, 570, 64);
          ctx.fillStyle = C.ink2; ctx.font = "400 25px " + FONT;
          wrapText(ctx, "Design tokens + CLAUDE.md + CI guardrails: production UI from the first prompt.", 64, y + 26, 520, 36);
          ctx.fillStyle = C.ink3; ctx.font = "600 17px " + FONT; ctx.fillText("UX ENGINEERING CASE STUDY", 64, h - 60);
          var dx = 650, dy = 70, dw = 490, dh = 490;
          miniDash(ctx, dx, dy, dw, dh, true);
          ctx.save(); ctx.beginPath(); ctx.rect(dx + dw / 2, dy - 10, dw, dh + 20); ctx.clip(); miniDash(ctx, dx, dy, dw, dh, false); ctx.restore();
          ctx.fillStyle = "#ffffff"; ctx.fillRect(dx + dw / 2 - 1.5, dy - 16, 3, dh + 32);
          ctx.fillStyle = C.accentDeep; ctx.beginPath(); ctx.arc(dx + dw / 2, dy + dh / 2, 24, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
          ctx.beginPath(); ctx.moveTo(dx + dw / 2 - 5, dy + dh / 2 - 8); ctx.lineTo(dx + dw / 2 - 13, dy + dh / 2); ctx.lineTo(dx + dw / 2 - 5, dy + dh / 2 + 8);
          ctx.moveTo(dx + dw / 2 + 5, dy + dh / 2 - 8); ctx.lineTo(dx + dw / 2 + 13, dy + dh / 2); ctx.lineTo(dx + dw / 2 + 5, dy + dh / 2 + 8); ctx.stroke();
          ctx.font = "700 14px " + FONT;
          [["BEFORE", dx + 16], ["AFTER", dx + dw - 82]].forEach(function (t) { ctx.fillStyle = "rgba(11,18,32,0.85)"; rr(ctx, t[1], dy + dh - 44, 70, 28, 14); ctx.fill(); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(t[0], t[1] + 35, dy + dh - 25); ctx.textAlign = "left"; });
        } },
      { id: "roi", name: "ROI highlight (square)", platform: "LinkedIn · Instagram feed", w: 1200, h: 1200, file: "aegisui-roi-1200x1200.png", live: true,
        caption: function (r) {
          return "What does the AI UI regeneration loop cost? I modeled it.\n\nFor a team of " + num(r.v.engineers) + " engineers, a token-and-rules layer (design tokens + CLAUDE.md + CI guardrails) comes out at about " + money(r.gross) + " per year in recurring value:\n• " + num(Math.max(0, r.hoursReclaimed)) + " review/rework hours reclaimed\n• Payback in " + (isFinite(r.paybackWeeks) ? num(r.paybackWeeks, 1) + " weeks" : "n/a") + "\n\nThese are planning assumptions, not measured results. Plug in your own numbers in the calculator.";
        },
        draw: function (ctx, w, h, r) {
          frame(ctx, w, h); brand(ctx, 80, 80, 1.3);
          ctx.fillStyle = C.accent; ctx.font = "700 24px " + FONT; ctx.fillText("MODELED ANNUAL VALUE", 80, 300);
          ctx.fillStyle = C.ink; ctx.font = "800 190px " + FONT; ctx.fillText(money(r.gross), 72, 480);
          ctx.fillStyle = C.ink2; ctx.font = "400 38px " + FONT;
          wrapText(ctx, "for a team of " + num(r.v.engineers) + " engineers using AI for UI work, after upkeep costs.", 80, 560, 1000, 52);
          var stats = [
            [num(Math.max(0, r.hoursReclaimed)), "rework hours reclaimed / yr"],
            [isFinite(r.paybackWeeks) ? num(r.paybackWeeks, 1) + " wks" : "n/a", "payback on setup effort"],
            [(r.tokensAvoided < 0 ? "+" : "−") + compactNum(Math.abs(r.tokensAvoided)), "tokens / yr, net of context"]
          ];
          stats.forEach(function (s, i) {
            var x = 80 + i * 354, y = 720;
            ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.strokeStyle = C.line; ctx.lineWidth = 2; rr(ctx, x, y, 330, 200, 20); ctx.fill(); ctx.stroke();
            ctx.fillStyle = C.ink; ctx.font = "700 58px " + FONT; ctx.fillText(s[0], x + 30, y + 95);
            ctx.fillStyle = C.ink3; ctx.font = "400 25px " + FONT; wrapText(ctx, s[1], x + 30, y + 140, 280, 32);
          });
          ctx.fillStyle = C.ink3; ctx.font = "400 24px " + FONT;
          ctx.fillText("Planning model with editable assumptions. Not a measured result.", 80, h - 90);
        } },
      { id: "x", name: "Architecture explainer (wide)", platform: "X · Threads · Bluesky", w: 1600, h: 900, file: "aegisui-architecture-1600x900.png",
        caption: function () { return "Agents don't need more creativity. They need constraints they can read.\n\nThe AegisUI stack:\n1. tokens.json (DTCG): one source of truth\n2. CLAUDE.md: testable rules, loaded every session\n3. Component contracts: no variant sprawl\n4. CI guardrails: token lint + axe + visual diff\n\nFailures go back to the agent, and it fixes them itself."; },
        draw: function (ctx, w, h) {
          frame(ctx, w, h); brand(ctx, 90, 80, 1.2);
          ctx.fillStyle = C.ink; ctx.font = "700 76px " + FONT; ctx.fillText("Your design system,", 90, 260); ctx.fillText("machine-readable.", 90, 345);
          var steps = [["tokens.json", "DTCG source"], ["CLAUDE.md", "Agent rulebook"], ["Claude Code", "Plans & writes"], ["CI guardrails", "Lint · axe · visual"]];
          var bw = 300, gap = 70, x0 = 90, y0 = 470;
          steps.forEach(function (s, i) {
            var x = x0 + i * (bw + gap);
            ctx.fillStyle = i === 2 ? C.accentDeep : "rgba(255,255,255,0.05)"; ctx.strokeStyle = i === 2 ? C.accent : C.line; ctx.lineWidth = 2;
            rr(ctx, x, y0, bw, 150, 20); ctx.fill(); ctx.stroke();
            ctx.fillStyle = i === 2 ? "#cfdbff" : C.ink3; ctx.font = "700 20px " + FONT; ctx.fillText("0" + (i + 1), x + 30, y0 + 46);
            ctx.fillStyle = C.ink; ctx.font = "700 34px " + FONT; ctx.fillText(s[0], x + 30, y0 + 94);
            ctx.fillStyle = i === 2 ? "#dfe7ff" : C.ink2; ctx.font = "400 22px " + FONT; ctx.fillText(s[1], x + 30, y0 + 128);
            if (i < steps.length - 1) {
              var ax = x + bw + 12, ay = y0 + 75;
              ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + gap - 24, ay); ctx.stroke();
              ctx.fillStyle = C.accent; ctx.beginPath(); ctx.moveTo(ax + gap - 24, ay - 9); ctx.lineTo(ax + gap - 10, ay); ctx.lineTo(ax + gap - 24, ay + 9); ctx.fill();
            }
          });
          var lx1 = x0 + 3 * (bw + gap) + bw / 2, lx2 = x0 + 2 * (bw + gap) + bw / 2, ly = y0 + 150;
          ctx.strokeStyle = C.ok; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
          ctx.beginPath(); ctx.moveTo(lx1, ly + 6); ctx.bezierCurveTo(lx1, ly + 90, lx2, ly + 90, lx2, ly + 14); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = C.ok; ctx.beginPath(); ctx.moveTo(lx2 - 9, ly + 22); ctx.lineTo(lx2, ly + 6); ctx.lineTo(lx2 + 9, ly + 22); ctx.fill();
          ctx.font = "600 22px " + FONT; ctx.textAlign = "center"; ctx.fillText("fail → agent self-corrects", (lx1 + lx2) / 2, ly + 112); ctx.textAlign = "left";
          ctx.fillStyle = C.ink3; ctx.font = "400 24px " + FONT; ctx.fillText("Tokens · rules · contracts · guardrails: a UX engineering case study", 90, h - 70);
        } }
    ];

    var grid = $("#socialGrid");
    cards.forEach(function (c) {
      var el = document.createElement("article");
      el.className = "card social__card";
      el.innerHTML = '<div class="social__preview"><canvas width="' + c.w + '" height="' + c.h + '" role="img" aria-label="' + c.name + ' preview"></canvas></div>' +
        '<div class="social__body"><div class="social__meta"><span>' + c.platform + "</span><span>" + c.w + " × " + c.h + "</span></div><h3>" + c.name + "</h3>" +
        '<label class="visually-hidden" for="cap-' + c.id + '">Caption for ' + c.name + '</label><textarea class="social__caption" id="cap-' + c.id + '"></textarea></div>' +
        '<div class="social__actions"><button class="btn btn--primary btn--sm" type="button" data-dl><svg aria-hidden="true"><use href="#i-download"/></svg>Download PNG</button>' +
        '<button class="btn btn--secondary btn--sm" type="button" data-cap><svg aria-hidden="true"><use href="#i-copy"/></svg>Copy caption</button>' +
        (navigator.share ? '<button class="btn btn--ghost btn--sm" type="button" data-share><svg aria-hidden="true"><use href="#i-share"/></svg>Share</button>' : "") + "</div>";
      grid.appendChild(el);
      c.canvas = el.querySelector("canvas");
      c.text = el.querySelector("textarea");
      c.dirty = false;
      c.text.addEventListener("input", function () { c.dirty = true; });
      el.querySelector("[data-dl]").addEventListener("click", function () { c.canvas.toBlob(function (b) { if (b) { downloadBlob(b, c.file); toast("Downloaded " + c.file); } }, "image/png"); });
      el.querySelector("[data-cap]").addEventListener("click", function () { copyText(c.text.value); });
      var sh = el.querySelector("[data-share]");
      if (sh) sh.addEventListener("click", function () {
        c.canvas.toBlob(function (b) {
          var file = new File([b], c.file, { type: "image/png" });
          var data = { text: c.text.value, title: "AegisUI" };
          if (navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
          navigator.share(data).catch(function () {});
        });
      });
    });

    function render(r) {
      cards.forEach(function (c) {
        if (c.rendered && !c.live) return;
        var ctx = c.canvas.getContext("2d");
        ctx.clearRect(0, 0, c.w, c.h);
        c.draw(ctx, c.w, c.h, r);
        c.rendered = true;
        if (!c.dirty) c.text.value = c.caption(r);
      });
    }
    var pending = null;
    roi.onChange(function (r) { cancelAnimationFrame(pending); pending = requestAnimationFrame(function () { render(r); }); });
    return {
      render: render,
      dataURL: function (id) { var c = cards.filter(function (x) { return x.id === id; })[0]; return c && c.canvas.toDataURL("image/png"); }
    };
  })();

  /* ------------------------------------------------------------------------
     Nav highlighting
     ------------------------------------------------------------------------ */
  if ("IntersectionObserver" in window) {
    var links = $$(".site-nav a");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) links.forEach(function (a) { a.setAttribute("aria-current", String(a.getAttribute("href") === "#" + en.target.id)); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["compare", "roi", "blueprint", "guide", "share"].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  var initial = roi.calc();
  social.render(initial);
  audit.run();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { audit.run(); social.render(roi.result()); });

  window.AegisShowcase = { compare: compare, audit: audit, roi: roi, social: social, blueprint: blueprint, guide: guide };
})();
