/* Figma Bridge page: validate a token file the way the AegisUI Token Sync plugin will. */
(function () {
  'use strict';
  var K = window.AegisContract;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var input = $('#json-input'), results = $('#results'), info = $('#active-info');
  var schemaPromise = null;

  function loadSchema() {
    if (!schemaPromise) {
      schemaPromise = (location.protocol === 'file:' || typeof fetch !== 'function')
        ? Promise.resolve(null)
        : fetch('../presets/schema/aegis-tokens.schema.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }
    return schemaPromise;
  }

  function active() { return K ? K.readBaseline() : { status: 'unavailable' }; }
  function renderActive() {
    var r = active();
    $('#download-active').disabled = r.status !== 'ok';
    $('#use-active').disabled = r.status !== 'ok';
    if (!K) info.textContent = 'shared/aegis-contract.js did not load, so validation is unavailable.';
    else if (r.status === 'ok') info.textContent = 'Active tokens: ' + r.record.name + ' (saved by the ' + r.record.origin + ').';
    else if (r.status === 'empty') info.textContent = 'No active tokens yet. Open the Studio once and they appear here.';
    else if (r.status === 'corrupt') info.textContent = 'The saved tokens are unreadable (' + r.reason + '). Open the Studio to rewrite them.';
    else info.textContent = 'Browser storage is unavailable, so active tokens cannot be read here.';
  }

  function summarize(doc) {
    var counts = {}, leaves = 0;
    K.walk(doc.tokens || {}, function (tok, trail) { leaves++; counts[trail[0]] = (counts[trail[0]] || 0) + 1; });
    return { leaves: leaves, counts: counts };
  }

  function validate() {
    var text = input.value.trim();
    if (!text) { show('fail', '<h3>Nothing to check</h3><p>Paste token JSON, upload a file or use the active Studio tokens.</p>'); return; }
    var doc;
    try { doc = JSON.parse(text); } catch (e) { show('fail', '<h3 class="fail">Not valid JSON</h3><p>' + esc(e.message) + '</p>'); return; }
    var errs = K.validateForPlugin(doc);
    loadSchema().then(function (schema) {
      var schemaErrs = schema ? K.validateSchema(doc, schema, 20) : null;
      var ok = !errs.length && (!schemaErrs || !schemaErrs.length);
      var html = '<h3 class="' + (ok ? 'pass' : 'fail') + '">' + (ok ? 'Ready for the plugin' : 'The plugin would reject this file') + '</h3>';
      html += errs.length ? '<p>Plugin checks: ' + errs.length + ' problem' + (errs.length === 1 ? '' : 's') + '</p><ul>' + errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '<p class="pass">Plugin checks passed: format, version, meta, modes and every alias resolve.</p>';
      if (schemaErrs === null) html += '<p>Schema check skipped: open this page over HTTP (for example <code>python3 -m http.server</code>) to also check the JSON schema.</p>';
      else if (schemaErrs.length) html += '<p>Schema: ' + schemaErrs.length + ' problem' + (schemaErrs.length === 1 ? '' : 's') + '</p><ul>' + schemaErrs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>';
      else html += '<p class="pass">Schema check passed (aegis-tokens.schema.json).</p>';
      if (!errs.length) {
        var s = summarize(doc);
        html += '<dl><dt>Name</dt><dd>' + esc(doc.meta.name) + ' <code>' + esc(doc.meta.id) + '</code></dd><dt>Modes</dt><dd>' + esc(doc.modes.join(', ')) + '</dd><dt>Tokens</dt><dd>' + s.leaves + ' (' +
          Object.keys(s.counts).map(function (k) { return esc(k) + ' ' + s.counts[k]; }).join(' · ') + ')</dd></dl>';
      }
      show(ok ? 'pass' : 'fail', html);
    });
  }
  function show(state, html) { results.dataset.state = state; results.innerHTML = html; }

  $('#validate').addEventListener('click', validate);
  $('#use-active').addEventListener('click', function () {
    var r = active();
    if (r.status !== 'ok') { renderActive(); return; }
    input.value = JSON.stringify(r.record.doc, null, 2);
    validate();
  });
  $('#download-active').addEventListener('click', function () {
    var r = active(); if (r.status !== 'ok') return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(r.record.doc, null, 2) + '\n'], { type: 'application/json' }));
    a.download = 'aegis-tokens.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  });
  $('#file-input').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function () { input.value = String(reader.result); validate(); e.target.value = ''; };
    reader.readAsText(f);
  });
  if (K) K.onBaselineChange(renderActive);
  renderActive();
})();
