/*
 * AegisUI Token Sync — Figma plugin main thread.
 *
 * Takes an AegisUI token document (format "aegis-tokens" v1, produced by
 * presets/build or exported from the Studio) and generates, idempotently:
 *
 *   • Local Variables  — Primitives · Semantic (Light/Dark) · Dimensions ·
 *                        Typography · Motion · Components, fully aliased,
 *                        scoped and with WEB code syntax (var(--aegis-…)).
 *   • Text styles      — 16 styles, size/line-height bound to variables.
 *   • Effect styles    — elevation/light/* and elevation/dark/*.
 *   • Style guide page — auto-layout Foundations (Light + Dark side by side),
 *                        Button/Badge/Input/Card components bound to tokens,
 *                        and component-token documentation tables.
 *
 * Written in conservative ES2017 (no optional chaining / object spread) for the
 * Figma plugin sandbox.
 */

/* global figma, __html__ */

figma.showUI(__html__, { width: 460, height: 700, themeColors: true, title: 'AegisUI Token Sync' });

var FORMAT = 'aegis-tokens';
var SUPPORTED_MAJOR = 1;

/* ═══════════════════════════════════════════════════════════ utilities */

function post(type, data) {
  var msg = { type: type };
  if (data) for (var k in data) msg[k] = data[k];
  figma.ui.postMessage(msg);
}
function progress(step, detail) { post('progress', { step: step, detail: detail || '' }); }

function isLeaf(node) { return node && typeof node === 'object' && ('$value' in node || '$modes' in node); }

function walk(node, fn, trail) {
  trail = trail || [];
  if (isLeaf(node)) { fn(node, trail); return; }
  if (!node || typeof node !== 'object') return;
  Object.keys(node).forEach(function (k) {
    if (k.charAt(0) === '$') return;
    walk(node[k], fn, trail.concat(k));
  });
}

function getPath(obj, path) {
  var parts = path.split('.');
  var cur = obj;
  for (var i = 0; i < parts.length; i++) { if (!cur) return undefined; cur = cur[parts[i]]; }
  return cur;
}

function isAlias(v) { return typeof v === 'string' && v.charAt(0) === '{' && v.charAt(v.length - 1) === '}'; }
function aliasPath(v) { return v.slice(1, -1); }

function hexToRgba(hex) {
  var h = String(hex).replace('#', '').trim();
  if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) throw new Error('Invalid color "' + hex + '"');
  var n = function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; };
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}
function rgbOnly(c) { return { r: c.r, g: c.g, b: c.b }; }

/** Resolve an alias chain to a concrete value for a mode. */
function resolveValue(doc, value, mode) {
  var guard = 0;
  while (isAlias(value) && guard++ < 20) {
    var node = getPath(doc.tokens, aliasPath(value));
    if (!node) throw new Error('Unresolved alias ' + value);
    value = node.$modes ? node.$modes[mode || 'light'] : node.$value;
  }
  return value;
}

/* API compatibility: newer Figma builds take node objects / async setters; older take ids. */
function createVariableCompat(name, collection, type) {
  try { return figma.variables.createVariable(name, collection, type); }
  catch (e) { return figma.variables.createVariable(name, collection.id, type); }
}
function setExplicitMode(node, collection, modeId) {
  try { node.setExplicitVariableModeForCollection(collection, modeId); }
  catch (e) { node.setExplicitVariableModeForCollection(collection.id, modeId); }
}
async function setTextStyle(node, style) {
  if (typeof node.setTextStyleIdAsync === 'function') await node.setTextStyleIdAsync(style.id);
  else node.textStyleId = style.id;
}
async function setEffectStyle(node, style) {
  if (typeof node.setEffectStyleIdAsync === 'function') await node.setEffectStyleIdAsync(style.id);
  else node.effectStyleId = style.id;
}

function titleCase(s) { return String(s).replace(/(^|[-_ ])(\w)/g, function (_, p, c) { return (p ? ' ' : '') + c.toUpperCase(); }); }
function cssVarOf(token) { return token.$extensions && token.$extensions.aegis ? token.$extensions.aegis.cssVar : null; }
function round(n, d) { var f = Math.pow(10, d || 2); return Math.round(n * f) / f; }

/* ═══════════════════════════════════════════════════════════ validation */

function validate(doc) {
  var errors = [];
  if (!doc || typeof doc !== 'object') return ['Input is not a JSON object.'];
  if (!doc.aegis || doc.aegis.format !== FORMAT) errors.push('Missing "aegis.format": "' + FORMAT + '" — is this an AegisUI token export?');
  else if (parseInt(String(doc.aegis.version).split('.')[0], 10) !== SUPPORTED_MAJOR) errors.push('Unsupported format version ' + doc.aegis.version + ' (plugin supports ' + SUPPORTED_MAJOR + '.x).');
  if (!doc.meta || !doc.meta.id || !doc.meta.name) errors.push('Missing meta.id / meta.name.');
  if (!doc.tokens) errors.push('Missing "tokens" object.');
  else {
    ['primitive', 'semantic'].forEach(function (k) { if (!doc.tokens[k]) errors.push('Missing tokens.' + k + '.'); });
    if (!Array.isArray(doc.modes) || doc.modes.indexOf('light') < 0) errors.push('"modes" must include "light".');
    // Every alias must resolve.
    if (!errors.length) {
      walk(doc.tokens, function (tok, trail) {
        var vals = tok.$modes ? Object.keys(tok.$modes).map(function (m) { return tok.$modes[m]; }) : [tok.$value];
        vals.forEach(function (v) {
          if (isAlias(v) && !getPath(doc.tokens, aliasPath(v))) errors.push('Unresolved alias ' + v + ' at ' + trail.join('.'));
          if (typeof v === 'object' && v && !Array.isArray(v)) {
            Object.keys(v).forEach(function (k) { if (isAlias(v[k]) && !getPath(doc.tokens, aliasPath(v[k]))) errors.push('Unresolved alias ' + v[k] + ' at ' + trail.join('.') + '.' + k); });
          }
        });
      });
    }
  }
  return errors.slice(0, 20);
}

/* ═══════════════════════════════════════════════════════════ fonts */

var WEIGHT_WORDS = [
  [/thin|hairline/i, 100], [/extra ?light|ultra ?light/i, 200], [/light/i, 300],
  [/semi ?bold|demi ?bold/i, 600], [/extra ?bold|ultra ?bold/i, 800], [/black|heavy/i, 900],
  [/medium/i, 500], [/bold/i, 700], [/regular|normal|book|roman/i, 400],
];
function styleWeight(style) {
  for (var i = 0; i < WEIGHT_WORDS.length; i++) if (WEIGHT_WORDS[i][0].test(style)) return WEIGHT_WORDS[i][1];
  return 400;
}

function FontResolver(available) {
  this.byFamily = {};
  var self = this;
  available.forEach(function (f) {
    var fam = f.fontName.family;
    (self.byFamily[fam] = self.byFamily[fam] || []).push(f.fontName.style);
  });
  this.loaded = {};
  this.substitutions = [];
}
FontResolver.prototype.pick = function (family, weight) {
  var styles = this.byFamily[family];
  var fallback = false;
  if (!styles) {
    fallback = true;
    this.substitutions.push(family);
    family = this.byFamily.Inter ? 'Inter' : Object.keys(this.byFamily)[0];
    styles = this.byFamily[family];
  }
  var upright = styles.filter(function (s) { return !/italic|oblique/i.test(s); });
  if (!upright.length) upright = styles;
  var best = upright[0];
  var bestD = 1e9;
  upright.forEach(function (s) {
    var d = Math.abs(styleWeight(s) - weight);
    if (d < bestD || (d === bestD && /^regular$/i.test(s))) { best = s; bestD = d; }
  });
  return { family: family, style: best, fallback: fallback };
};
FontResolver.prototype.load = async function (fontName) {
  var key = fontName.family + '::' + fontName.style;
  if (!this.loaded[key]) this.loaded[key] = figma.loadFontAsync(fontName);
  await this.loaded[key];
  return fontName;
};

/* ═══════════════════════════════════════════════════════════ variables */

var COLLECTIONS = {
  primitive: 'Primitives',
  semantic: 'Semantic',
  dimension: 'Dimensions',
  typography: 'Typography',
  motion: 'Motion',
  component: 'Components',
};

function scopesFor(root, trail, type) {
  var g = trail[1];
  if (root === 'primitive') return [];
  if (root === 'semantic') {
    var group = trail[2];
    if (group === 'bg') return ['FRAME_FILL', 'SHAPE_FILL'];
    if (group === 'fg') return ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'];
    if (group === 'border') return ['STROKE_COLOR', 'EFFECT_COLOR'];
    return ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];
  }
  if (root === 'dimension') {
    if (g === 'spacing') return ['GAP', 'WIDTH_HEIGHT'];
    if (g === 'radius') return ['CORNER_RADIUS'];
    if (g === 'borderWidth') return ['STROKE_FLOAT'];
    if (g === 'size') return ['WIDTH_HEIGHT'];
  }
  if (root === 'typography') {
    if (g === 'font-family') return ['FONT_FAMILY'];
    if (g === 'font-weight') return ['FONT_WEIGHT'];
    if (g === 'font-size') return ['FONT_SIZE'];
    if (g === 'line-height') return ['LINE_HEIGHT'];
  }
  if (root === 'component') {
    if (type === 'COLOR') {
      var prop = trail[2];
      if (/border|indicator/.test(prop)) return ['STROKE_COLOR', 'ALL_FILLS'];
      if (/fg|placeholder/.test(prop)) return ['TEXT_FILL', 'SHAPE_FILL'];
      return ['ALL_FILLS', 'STROKE_COLOR'];
    }
    if (type === 'FLOAT') {
      var p = trail[2];
      if (/radius/.test(p)) return ['CORNER_RADIUS'];
      if (/border-width|ring-width/.test(p)) return ['STROKE_FLOAT'];
      if (/padding|gap|offset/.test(p)) return ['GAP'];
      if (/height|width/.test(p)) return ['WIDTH_HEIGHT'];
      if (/font-weight/.test(p)) return ['FONT_WEIGHT'];
    }
  }
  return ['ALL_SCOPES'];
}

function figmaTypeFor(tok) {
  switch (tok.$type) {
    case 'color': return 'COLOR';
    case 'dimension': case 'fontWeight': case 'duration': case 'number': return 'FLOAT';
    case 'fontFamily': case 'string': case 'cubicBezier': return 'STRING';
    default: return null; // shadow, typography → styles, not variables
  }
}

function VariableSync(doc, opts) {
  this.doc = doc;
  this.opts = opts;
  this.byPath = {};      // token path → Variable
  this.collections = {}; // key → { collection, modes: {light, dark} }
  this.stats = { created: 0, updated: 0, collections: 0 };
  this.warnings = [];
}

VariableSync.prototype.collectionName = function (key) {
  var base = COLLECTIONS[key];
  return this.opts.namespace ? this.doc.meta.name + ' / ' + base : base;
};

VariableSync.prototype.ensureCollection = async function (key, modeNames) {
  var name = this.collectionName(key);
  var all = await figma.variables.getLocalVariableCollectionsAsync();
  var col = null;
  for (var i = 0; i < all.length; i++) if (all[i].name === name) { col = all[i]; break; }
  if (!col) { col = figma.variables.createVariableCollection(name); this.stats.collections++; }
  var modes = {};
  // First mode: rename default mode to modeNames[0]
  var first = col.modes[0];
  if (first.name !== modeNames[0]) {
    var existing = col.modes.filter(function (m) { return m.name === modeNames[0]; })[0];
    if (existing) modes[modeNames[0]] = existing.modeId;
    else { col.renameMode(first.modeId, modeNames[0]); modes[modeNames[0]] = first.modeId; }
  } else modes[modeNames[0]] = first.modeId;
  for (var j = 1; j < modeNames.length; j++) {
    var mn = modeNames[j];
    var found = col.modes.filter(function (m) { return m.name === mn; })[0];
    if (found) { modes[mn] = found.modeId; continue; }
    try {
      modes[mn] = col.addMode(mn);
    } catch (e) {
      modes[mn] = null;
      this.warnings.push('Could not add mode "' + mn + '" to ' + name + ' (' + (e && e.message ? e.message : e) + '). Your Figma plan may limit modes per collection — a separate "' + name + ' (' + mn + ')" collection was created instead.');
    }
  }
  var entry = { collection: col, modes: modes, existing: {} };
  var vars = await figma.variables.getLocalVariablesAsync();
  vars.forEach(function (v) { if (v.variableCollectionId === col.id) entry.existing[v.name] = v; });
  this.collections[key] = entry;
  return entry;
};

VariableSync.prototype.upsert = function (entry, name, type) {
  var v = entry.existing[name];
  if (v && v.resolvedType !== type) { v.remove(); v = null; }
  if (v) { this.stats.updated++; return v; }
  v = createVariableCompat(name, entry.collection, type);
  entry.existing[name] = v;
  this.stats.created++;
  return v;
};

VariableSync.prototype.valueFor = function (raw, type) {
  if (isAlias(raw)) {
    var target = this.byPath[aliasPath(raw)];
    if (target) return figma.variables.createVariableAlias(target);
    // Alias to something that isn't a variable (e.g. shadow) — resolve concretely.
    raw = resolveValue(this.doc, raw, 'light');
  }
  if (type === 'COLOR') return hexToRgba(raw);
  if (type === 'FLOAT') return typeof raw === 'number' ? raw : parseFloat(raw) || 0;
  if (type === 'STRING') return Array.isArray(raw) ? 'cubic-bezier(' + raw.join(', ') + ')' : String(raw);
  return raw;
};

VariableSync.prototype.decorate = function (v, tok, root, trail, type) {
  var css = cssVarOf(tok);
  if (css) { try { v.setVariableCodeSyntax('WEB', 'var(' + css + ')'); } catch (e) { /* older API */ } }
  if (tok.$description) v.description = tok.$description;
  else if (css) v.description = css;
  try { v.scopes = scopesFor(root, trail, type); } catch (e) { /* scope not valid for type */ }
  if (root === 'primitive' && this.opts.hidePrimitives) { try { v.hiddenFromPublishing = true; } catch (e) { /* ignore */ } }
};

VariableSync.prototype.syncSingleMode = async function (key, leaves) {
  if (!leaves.length) return;
  var entry = await this.ensureCollection(key, ['Value']);
  var modeId = entry.modes.Value;
  for (var i = 0; i < leaves.length; i++) {
    var L = leaves[i];
    var v = this.upsert(entry, L.name, L.type);
    v.setValueForMode(modeId, this.valueFor(L.value, L.type));
    this.decorate(v, L.token, key, L.trail, L.type);
    this.byPath[L.path] = v;
  }
};

VariableSync.prototype.syncSemantic = async function (leaves) {
  var modes = this.doc.modes.map(titleCase);
  var entry = await this.ensureCollection('semantic', modes);
  var self = this;
  var split = {};
  for (var mi = 1; mi < this.doc.modes.length; mi++) {
    var mode = this.doc.modes[mi];
    if (!entry.modes[titleCase(mode)]) {
      // Plan fallback: separate collection per extra mode.
      var key = 'semantic-' + mode;
      COLLECTIONS[key] = COLLECTIONS.semantic + ' (' + titleCase(mode) + ')';
      split[mode] = await this.ensureCollection(key, [titleCase(mode)]);
    }
  }
  leaves.forEach(function (L) {
    var v = self.upsert(entry, L.name, 'COLOR');
    self.doc.modes.forEach(function (mode) {
      var mid = entry.modes[titleCase(mode)];
      if (mid) v.setValueForMode(mid, self.valueFor(L.token.$modes[mode], 'COLOR'));
    });
    self.decorate(v, L.token, 'semantic', L.trail, 'COLOR');
    self.byPath[L.path] = v;
    Object.keys(split).forEach(function (mode) {
      var e2 = split[mode];
      var v2 = self.upsert(e2, L.name, 'COLOR');
      v2.setValueForMode(e2.modes[titleCase(mode)], self.valueFor(L.token.$modes[mode], 'COLOR'));
      self.decorate(v2, L.token, 'semantic', L.trail, 'COLOR');
    });
  });
  this.semantic = entry;
};

VariableSync.prototype.run = async function () {
  var doc = this.doc;
  var buckets = { primitive: [], semantic: [], dimension: [], typography: [], motion: [], component: [] };

  walk(doc.tokens, function (tok, trail) {
    var root = trail[0];
    if (!buckets[root]) return;
    var path = trail.join('.');
    if (root === 'semantic') {
      if (tok.$type === 'color') buckets.semantic.push({ token: tok, trail: trail, path: path, name: trail.slice(1).join('/') });
      return;
    }
    if (root === 'typography') {
      if (tok.$type === 'typography') {
        var name = trail[2];
        buckets.typography.push({ token: tok, trail: ['typography', 'font-size', name], path: path + '.fontSize', name: 'font-size/' + name, type: 'FLOAT', value: tok.$value.fontSize });
        buckets.typography.push({ token: tok, trail: ['typography', 'line-height', name], path: path + '.lineHeight', name: 'line-height/' + name, type: 'FLOAT', value: tok.$value.lineHeight });
        return;
      }
      var group = trail[1] === 'fontFamily' ? 'font-family' : trail[1] === 'fontWeight' ? 'font-weight' : trail[1];
      buckets.typography.push({ token: tok, trail: ['typography', group, trail[2]], path: path, name: group + '/' + trail.slice(2).join('/'), type: figmaTypeFor(tok), value: tok.$value });
      return;
    }
    var type = figmaTypeFor(tok);
    if (!type || tok.$modes) return;
    var nameTrail = root === 'dimension' ? trail.slice(1) : root === 'primitive' ? trail.slice(1) : trail.slice(1);
    buckets[root].push({ token: tok, trail: trail, path: path, name: nameTrail.join('/'), type: type, value: tok.$value });
  });

  progress('Variables', 'Primitives (' + buckets.primitive.length + ')');
  await this.syncSingleMode('primitive', buckets.primitive);
  progress('Variables', 'Semantic · ' + doc.modes.join(' / ') + ' (' + buckets.semantic.length + ')');
  await this.syncSemantic(buckets.semantic);
  progress('Variables', 'Dimensions (' + buckets.dimension.length + ')');
  await this.syncSingleMode('dimension', buckets.dimension);
  progress('Variables', 'Typography (' + buckets.typography.length + ')');
  await this.syncSingleMode('typography', buckets.typography);
  progress('Variables', 'Motion (' + buckets.motion.length + ')');
  await this.syncSingleMode('motion', buckets.motion);
  progress('Variables', 'Components (' + buckets.component.length + ')');
  await this.syncSingleMode('component', buckets.component);
  return this;
};

/* ═══════════════════════════════════════════════════════════ styles */

var CASE = { uppercase: 'UPPER', lowercase: 'LOWER', capitalize: 'TITLE', none: 'ORIGINAL' };

function textStyleName(prefix, name) {
  var m = name.match(/^(display|heading|body|label)-(.+)$/);
  return prefix + (m ? m[1] + '/' + m[2] : name);
}

async function syncTextStyles(doc, fonts, vars, opts) {
  var styles = doc.tokens.typography && doc.tokens.typography.textStyle;
  if (!styles) return { map: {}, count: 0 };
  var prefix = opts.namespace ? doc.meta.name + '/' : '';
  var existing = {};
  (await figma.getLocalTextStylesAsync()).forEach(function (s) { existing[s.name] = s; });
  var map = {};
  var count = 0;
  var names = Object.keys(styles);
  for (var i = 0; i < names.length; i++) {
    var key = names[i];
    var t = styles[key].$value;
    var family = resolveValue(doc, t.fontFamily);
    var fontName = fonts.pick(family, t.fontWeight);
    await fonts.load({ family: fontName.family, style: fontName.style });
    var sname = textStyleName(prefix, key);
    var style = existing[sname] || figma.createTextStyle();
    style.name = sname;
    style.fontName = { family: fontName.family, style: fontName.style };
    style.fontSize = t.fontSize;
    style.lineHeight = { unit: 'PIXELS', value: t.lineHeight };
    style.letterSpacing = { unit: 'PERCENT', value: round((t.letterSpacing || 0) * 100, 2) };
    style.textCase = CASE[t.textTransform] || 'ORIGINAL';
    style.description = [
      family + ' ' + t.fontWeight + (fontName.fallback ? ' (substituted: ' + fontName.family + ' ' + fontName.style + ')' : ''),
      t.fontSize + '/' + t.lineHeight + 'px',
      (t.letterSpacing || 0) + 'em',
      'CSS: font: var(' + cssVarOf(styles[key]) + ')',
    ].join(' · ');
    if (vars && opts.bindTextStyles) {
      var vs = vars.byPath['typography.textStyle.' + key + '.fontSize'];
      var vl = vars.byPath['typography.textStyle.' + key + '.lineHeight'];
      try { if (vs) style.setBoundVariable('fontSize', vs); if (vl) style.setBoundVariable('lineHeight', vl); } catch (e) { /* binding unsupported */ }
    }
    map[key] = style;
    count++;
  }
  return { map: map, count: count };
}

function toEffect(s) {
  var c = hexToRgba(s.color);
  return {
    type: 'DROP_SHADOW',
    color: c,
    offset: { x: s.x, y: s.y },
    radius: s.blur,
    spread: s.spread,
    visible: true,
    blendMode: 'NORMAL',
    showShadowBehindNode: false,
  };
}

async function syncEffectStyles(doc, opts) {
  var shadows = doc.tokens.shadow;
  var result = { light: {}, dark: {}, count: 0 };
  if (!shadows) return result;
  var prefix = (opts.namespace ? doc.meta.name + '/' : '') + 'elevation/';
  var existing = {};
  (await figma.getLocalEffectStylesAsync()).forEach(function (s) { existing[s.name] = s; });
  Object.keys(shadows).forEach(function (k) {
    var tok = shadows[k];
    doc.modes.forEach(function (mode) {
      var layers = tok.$modes ? tok.$modes[mode] : tok.$value;
      if (!layers || !layers.length) return;
      var name = prefix + mode + '/' + k;
      var style = existing[name] || figma.createEffectStyle();
      style.name = name;
      style.effects = layers.map(toEffect);
      style.description = 'box-shadow: var(' + cssVarOf(tok) + ') · ' + mode + ' mode';
      result[mode] = result[mode] || {};
      result[mode][k] = style;
      result.count++;
    });
  });
  return result;
}

/* ═══════════════════════════════════════════════════════════ style guide */

function Guide(doc, vars, textStyles, effects, fonts) {
  this.doc = doc;
  this.v = vars ? vars.byPath : {};
  this.ts = textStyles.map;
  this.fx = effects;
  this.fonts = fonts;
}

Guide.prototype.var = function (path) { return this.v[path] || null; };

Guide.prototype.paint = function (path, mode) {
  var v = this.var(path);
  var hex = resolveValue(this.doc, '{' + path + '}', mode || 'light');
  var c = hexToRgba(hex);
  var paint = { type: 'SOLID', color: rgbOnly(c), opacity: c.a };
  if (v) paint = figma.variables.setBoundVariableForPaint(paint, 'color', v);
  return paint;
};
Guide.prototype.fill = function (node, path) { node.fills = [this.paint(path)]; return node; };
Guide.prototype.stroke = function (node, path, widthPath, fallbackWidth) {
  node.strokes = [this.paint(path)];
  node.strokeAlign = 'INSIDE';
  var w = widthPath ? resolveValue(this.doc, '{' + widthPath + '}') : fallbackWidth || 1;
  node.strokeWeight = typeof w === 'number' ? w : 1;
  var v = widthPath ? this.var(widthPath) : null;
  if (v) { try { node.setBoundVariable('strokeWeight', v); } catch (e) { /* ignore */ } }
  return node;
};
Guide.prototype.bindNum = function (node, field, path) {
  var raw = resolveValue(this.doc, '{' + path + '}');
  var v = this.var(path);
  if (v) { try { node.setBoundVariable(field, v); return node; } catch (e) { /* fall through */ } }
  if (typeof raw === 'number') node[field] = raw;
  return node;
};
Guide.prototype.radius = function (node, path) {
  var self = this;
  ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].forEach(function (f) { self.bindNum(node, f, path); });
  return node;
};
Guide.prototype.padding = function (node, xPath, yPath) {
  if (xPath) { this.bindNum(node, 'paddingLeft', xPath); this.bindNum(node, 'paddingRight', xPath); }
  if (yPath) { this.bindNum(node, 'paddingTop', yPath); this.bindNum(node, 'paddingBottom', yPath); }
  return node;
};

Guide.prototype.frame = function (name, dir, gap, pad, node) {
  var f = node || figma.createFrame();
  f.name = name;
  f.layoutMode = dir || 'VERTICAL';
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  f.itemSpacing = gap || 0;
  if (pad !== undefined) { f.paddingLeft = f.paddingRight = f.paddingTop = f.paddingBottom = pad; }
  f.fills = [];
  f.clipsContent = false;
  return f;
};

Guide.prototype.text = async function (chars, styleKey, colorPath, opts) {
  opts = opts || {};
  var t = figma.createText();
  var style = this.ts[styleKey];
  if (style) {
    await this.fonts.load(style.fontName);
    t.fontName = style.fontName;
    t.characters = String(chars);
    await setTextStyle(t, style);
  } else {
    var fn = this.fonts.pick('Inter', 400);
    await this.fonts.load({ family: fn.family, style: fn.style });
    t.fontName = { family: fn.family, style: fn.style };
    t.characters = String(chars);
  }
  t.fills = [this.paint(colorPath || 'semantic.color.fg.default')];
  if (opts.width) { t.resize(opts.width, t.height); t.textAutoResize = 'HEIGHT'; }
  t.name = opts.name || String(chars).slice(0, 40);
  return t;
};

Guide.prototype.append = function (parent, child, fill) {
  parent.appendChild(child);
  if (fill) child.layoutSizingHorizontal = 'FILL';
  return child;
};

Guide.prototype.section = async function (parent, title, subtitle) {
  var sec = this.frame(title, 'VERTICAL', 28);
  this.append(parent, sec, true);
  var head = this.frame('Header', 'VERTICAL', 6);
  this.append(sec, head, true);
  head.appendChild(await this.text(title, 'heading-xl'));
  if (subtitle) head.appendChild(await this.text(subtitle, 'body-md', 'semantic.color.fg.muted', { width: 880 }));
  var rule = figma.createRectangle();
  rule.name = 'Rule';
  rule.resize(100, 1);
  this.fill(rule, 'semantic.color.border.default');
  this.append(sec, rule, true);
  var body = this.frame('Content', 'VERTICAL', 24);
  this.append(sec, body, true);
  return body;
};

Guide.prototype.card = function (name, dir, gap) {
  var c = this.frame(name, dir || 'VERTICAL', gap || 12);
  this.fill(c, 'semantic.color.bg.surface');
  this.stroke(c, 'semantic.color.border.default');
  this.radius(c, 'dimension.radius.lg');
  c.paddingLeft = c.paddingRight = c.paddingTop = c.paddingBottom = 20;
  return c;
};

/* ── Foundations ── */

Guide.prototype.buildHeader = async function (root) {
  var m = this.doc.meta;
  var head = this.frame('Cover', 'VERTICAL', 16);
  this.append(root, head, true);
  head.appendChild(await this.text('AegisUI design system · ' + (m.category || 'Preset'), 'overline', 'semantic.color.brand.fg'));
  head.appendChild(await this.text(m.name, 'display-md'));
  head.appendChild(await this.text(m.description || '', 'body-lg', 'semantic.color.fg.muted', { width: 960 }));
  var chips = this.frame('Facts', 'HORIZONTAL', 8);
  chips.layoutWrap = 'WRAP';
  this.append(head, chips, true);
  var fams = (m.fonts && m.fonts.families ? m.fonts.families.map(function (f) { return f.family; }) : []).join(' + ');
  var facts = [fams, 'Density · ' + (m.density || 'default'), 'WCAG ' + (m.a11yTarget || 'AA'), 'Modes · ' + this.doc.modes.join(' / '), 'v' + this.doc.aegis.version];
  if (this.fonts.substitutions.length) facts.push('Substituted fonts: ' + uniq(this.fonts.substitutions).join(', '));
  for (var i = 0; i < facts.length; i++) chips.appendChild(await this.badge(facts[i], 'neutral'));
};

Guide.prototype.badge = async function (label, tone, asComponent) {
  var b = this.frame(asComponent ? 'Tone=' + titleCase(tone) : 'Badge / ' + label, 'HORIZONTAL', 6, undefined, asComponent ? figma.createComponent() : null);
  b.counterAxisAlignItems = 'CENTER';
  var tones = {
    neutral: ['semantic.color.bg.surface-sunken', 'semantic.color.fg.muted', 'semantic.color.border.default'],
    brand: ['semantic.color.brand.subtle', 'semantic.color.brand.fg', 'semantic.color.brand.border'],
    success: ['semantic.color.success.subtle', 'semantic.color.success.fg', 'semantic.color.success.border'],
    warning: ['semantic.color.warning.subtle', 'semantic.color.warning.fg', 'semantic.color.warning.border'],
    danger: ['semantic.color.danger.subtle', 'semantic.color.danger.fg', 'semantic.color.danger.border'],
    info: ['semantic.color.info.subtle', 'semantic.color.info.fg', 'semantic.color.info.border'],
  }[tone || 'neutral'];
  this.fill(b, tones[0]);
  this.stroke(b, tones[2], null, 1);
  this.radius(b, 'component.badge.radius');
  this.padding(b, 'component.badge.padding-x', null);
  b.primaryAxisSizingMode = 'AUTO';
  b.counterAxisSizingMode = 'FIXED';
  b.primaryAxisAlignItems = 'CENTER';
  b.resize(b.width, resolveValue(this.doc, '{component.badge.height}'));
  this.bindNum(b, 'height', 'component.badge.height');
  var tt = this.doc.tokens.component.badge['text-transform'].$value;
  var t = await this.text(tt === 'uppercase' ? label.toUpperCase() : label, 'label-sm', tones[1]);
  b.appendChild(t);
  return b;
};

Guide.prototype.buildPrimitives = async function (root) {
  var body = await this.section(root, 'Color · Primitives', 'Raw palette generated in OKLCH. Hidden from pickers — designers use Semantic tokens, which alias these.');
  var prim = this.doc.tokens.primitive.color;
  var ramps = Object.keys(prim).filter(function (k) { return !isLeaf(prim[k]); });
  for (var i = 0; i < ramps.length; i++) {
    var name = ramps[i];
    var row = this.frame('Ramp / ' + name, 'HORIZONTAL', 8);
    this.append(body, row, true);
    var label = await this.text(name, 'label-md', 'semantic.color.fg.muted');
    label.resize(120, label.height);
    label.textAutoResize = 'HEIGHT';
    row.appendChild(label);
    var steps = Object.keys(prim[name]);
    for (var s = 0; s < steps.length; s++) {
      var path = 'primitive.color.' + name + '.' + steps[s];
      var sw = this.frame(name + '-' + steps[s], 'VERTICAL', 6);
      this.append(row, sw);
      sw.layoutGrow = 1;
      var r = figma.createRectangle();
      r.name = 'Swatch';
      r.resize(96, 56);
      this.fill(r, path);
      this.radius(r, 'dimension.radius.sm');
      r.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.15 }];
      r.strokeAlign = 'INSIDE';
      this.append(sw, r, true);
      sw.appendChild(await this.text(steps[s], 'label-sm'));
      sw.appendChild(await this.text(prim[name][steps[s]].$value.toUpperCase(), 'code', 'semantic.color.fg.muted'));
    }
  }
};

Guide.prototype.buildSemantic = async function (root) {
  var body = await this.section(root, 'Color · Semantic', 'Role-based tokens with Light and Dark modes. Bind these in designs; switch modes on any frame via the Semantic collection.');
  var sem = this.doc.tokens.semantic.color;
  var groups = Object.keys(sem);
  for (var g = 0; g < groups.length; g++) {
    var group = groups[g];
    body.appendChild(await this.text(group, 'heading-sm'));
    var grid = this.frame('Group / ' + group, 'HORIZONTAL', 12);
    grid.layoutWrap = 'WRAP';
    grid.counterAxisSpacing = 12;
    this.append(body, grid, true);
    var names = Object.keys(sem[group]);
    for (var n = 0; n < names.length; n++) {
      var tok = sem[group][names[n]];
      var path = 'semantic.color.' + group + '.' + names[n];
      var card = this.frame(group + '.' + names[n], 'HORIZONTAL', 12);
      card.counterAxisAlignItems = 'CENTER';
      card.primaryAxisSizingMode = 'FIXED';
      card.resize(272, 64);
      card.paddingLeft = card.paddingRight = card.paddingTop = card.paddingBottom = 10;
      this.fill(card, 'semantic.color.bg.surface');
      this.stroke(card, 'semantic.color.border.subtle', null, 1);
      this.radius(card, 'dimension.radius.md');
      grid.appendChild(card);
      var chip = figma.createRectangle();
      chip.name = 'Chip';
      chip.resize(44, 44);
      this.fill(chip, path);
      this.radius(chip, 'dimension.radius.sm');
      chip.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 }, opacity: 0.2 }];
      chip.strokeAlign = 'INSIDE';
      card.appendChild(chip);
      var col = this.frame('Text', 'VERTICAL', 2);
      this.append(card, col);
      col.layoutGrow = 1;
      col.appendChild(await this.text(group + '.' + names[n], 'label-sm'));
      col.appendChild(await this.text(cssVarOf(tok) || '', 'code', 'semantic.color.fg.muted'));
    }
  }
};

Guide.prototype.buildTypography = async function (root) {
  var body = await this.section(root, 'Typography', 'Text styles with font size and line height bound to Typography variables.');
  var styles = this.doc.tokens.typography.textStyle;
  var keys = Object.keys(styles);
  var samples = { display: 'Design at enterprise scale', heading: 'Clarity is a feature', body: 'Tokens keep every surface consistent — from the first sketch in Figma to the last line of production CSS.', label: 'Save changes', code: 'const theme = aegis.get("' + this.doc.meta.id + '")', numeric: '1,284,903.50   −2.41%   08:45:12', caption: 'Updated 2 minutes ago', overline: 'Section label' };
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var t = styles[k].$value;
    var kind = k.split('-')[0];
    var row = this.frame('Type / ' + k, 'HORIZONTAL', 32);
    row.counterAxisAlignItems = 'MIN';
    row.paddingTop = row.paddingBottom = 16;
    this.append(body, row, true);
    var meta = this.frame('Meta', 'VERTICAL', 4);
    row.appendChild(meta);
    meta.primaryAxisSizingMode = 'AUTO';
    meta.counterAxisSizingMode = 'FIXED';
    meta.resize(240, meta.height);
    meta.appendChild(await this.text(k, 'label-md'));
    var fam = resolveValue(this.doc, t.fontFamily);
    meta.appendChild(await this.text(fam + ' · ' + t.fontWeight + '\n' + t.fontSize + ' / ' + t.lineHeight + ' · ' + t.letterSpacing + 'em' + (t.textTransform !== 'none' ? ' · ' + t.textTransform : ''), 'code', 'semantic.color.fg.muted', { width: 240 }));
    var sample = await this.text(samples[kind] || samples.body, k, 'semantic.color.fg.default');
    this.append(row, sample);
    sample.layoutGrow = 1;
    sample.textAutoResize = 'HEIGHT';
  }
};

Guide.prototype.buildDimensions = async function (root) {
  var body = await this.section(root, 'Spacing, radius & elevation', 'Dimension variables drive auto-layout gaps, paddings and corner radii. Elevation ships as effect styles per mode.');
  var cols = this.frame('Columns', 'HORIZONTAL', 32);
  this.append(body, cols, true);

  var sp = this.card('Spacing', 'VERTICAL', 10);
  this.append(cols, sp);
  sp.layoutGrow = 1;
  sp.appendChild(await this.text('Spacing', 'heading-sm'));
  var spacing = this.doc.tokens.dimension.spacing;
  var keys = Object.keys(spacing);
  for (var i = 0; i < keys.length; i++) {
    var row = this.frame('space-' + keys[i], 'HORIZONTAL', 12);
    row.counterAxisAlignItems = 'CENTER';
    this.append(sp, row, true);
    var lbl = await this.text('space-' + keys[i], 'code', 'semantic.color.fg.muted');
    lbl.resize(96, lbl.height);
    lbl.textAutoResize = 'HEIGHT';
    row.appendChild(lbl);
    var bar = figma.createRectangle();
    bar.name = 'Bar';
    bar.resize(Math.max(1, spacing[keys[i]].$value), 12);
    this.bindNum(bar, 'width', 'dimension.spacing.' + keys[i]);
    this.fill(bar, 'semantic.color.brand.default');
    row.appendChild(bar);
  }

  var right = this.frame('Radius & elevation', 'VERTICAL', 32);
  this.append(cols, right);
  right.layoutGrow = 1;

  var rd = this.card('Radius', 'VERTICAL', 16);
  this.append(right, rd, true);
  rd.appendChild(await this.text('Radius', 'heading-sm'));
  var tiles = this.frame('Tiles', 'HORIZONTAL', 16);
  tiles.layoutWrap = 'WRAP';
  tiles.counterAxisSpacing = 16;
  this.append(rd, tiles, true);
  var radius = this.doc.tokens.dimension.radius;
  var rk = Object.keys(radius);
  for (var r = 0; r < rk.length; r++) {
    var tile = this.frame('radius-' + rk[r], 'VERTICAL', 0, 10);
    tile.primaryAxisSizingMode = 'FIXED';
    tile.counterAxisSizingMode = 'FIXED';
    tile.resize(96, 72);
    tile.primaryAxisAlignItems = 'MAX';
    this.fill(tile, 'semantic.color.bg.surface-sunken');
    this.stroke(tile, 'semantic.color.border.strong', null, 1);
    this.radius(tile, 'dimension.radius.' + rk[r]);
    tile.appendChild(await this.text(rk[r] + ' · ' + (radius[rk[r]].$value > 999 ? '∞' : radius[rk[r]].$value), 'code', 'semantic.color.fg.muted'));
    tiles.appendChild(tile);
  }

  var el = this.card('Elevation', 'VERTICAL', 16);
  this.append(right, el, true);
  el.appendChild(await this.text('Elevation', 'heading-sm'));
  var etiles = this.frame('Tiles', 'HORIZONTAL', 24);
  etiles.layoutWrap = 'WRAP';
  etiles.counterAxisSpacing = 24;
  etiles.paddingTop = etiles.paddingBottom = 8;
  this.append(el, etiles, true);
  var shadows = Object.keys(this.doc.tokens.shadow || {});
  for (var s = 0; s < shadows.length; s++) {
    var et = this.frame('shadow-' + shadows[s], 'VERTICAL', 0, 10);
    et.primaryAxisSizingMode = 'FIXED';
    et.counterAxisSizingMode = 'FIXED';
    et.resize(112, 80);
    et.primaryAxisAlignItems = 'MAX';
    et.clipsContent = false;
    this.fill(et, 'semantic.color.bg.surface-raised');
    this.radius(et, 'dimension.radius.md');
    var style = this.fx.light[shadows[s]];
    if (style) await setEffectStyle(et, style);
    else this.stroke(et, 'semantic.color.border.default', null, 1);
    et.setPluginData('aegisShadow', shadows[s]);
    et.appendChild(await this.text('shadow-' + shadows[s], 'code', 'semantic.color.fg.muted'));
    etiles.appendChild(et);
  }
};

/* ── Components (real Figma components bound to component tokens) ── */

Guide.prototype.button = async function (variant, size) {
  var C = 'component.button.';
  var c = figma.createComponent();
  c.name = 'Variant=' + titleCase(variant) + ', Size=' + size.toUpperCase();
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisSizingMode = 'AUTO';
  c.counterAxisSizingMode = 'FIXED';
  c.primaryAxisAlignItems = 'CENTER';
  c.counterAxisAlignItems = 'CENTER';
  c.resize(120, resolveValue(this.doc, '{' + C + 'height-' + size + '}'));
  this.bindNum(c, 'height', C + 'height-' + size);
  this.padding(c, C + 'padding-x-' + size, null);
  this.bindNum(c, 'itemSpacing', C + 'gap');
  this.radius(c, C + 'radius');
  var fills = { primary: C + 'primary-bg', secondary: C + 'secondary-bg', ghost: null, danger: C + 'danger-bg' };
  var fgs = { primary: C + 'primary-fg', secondary: C + 'secondary-fg', ghost: C + 'ghost-fg', danger: C + 'danger-fg' };
  var borders = { primary: C + 'primary-border', secondary: C + 'secondary-border', ghost: null, danger: C + 'danger-bg' };
  if (fills[variant]) this.fill(c, fills[variant]); else c.fills = [];
  if (borders[variant] && this.doc.tokens.component.button[borders[variant].split('.').pop()]) this.stroke(c, borders[variant], C + 'border-width');
  var shadowKey = this.doc.tokens.component.button.shadow ? this.doc.tokens.component.button.shadow.$value : 'none';
  if (variant !== 'ghost' && isAlias(shadowKey)) {
    var st = this.fx.light[aliasPath(shadowKey).split('.').pop()];
    if (st) { await setEffectStyle(c, st); c.setPluginData('aegisShadow', aliasPath(shadowKey).split('.').pop()); }
  }
  var tt = this.doc.tokens.component.button['text-transform'].$value;
  var styleKey = { sm: 'label-sm', md: this.doc.tokens.component.button['text-style'].$value, lg: 'label-lg' }[size];
  var label = await this.text(tt === 'uppercase' ? 'BUTTON' : 'Button', styleKey, fgs[variant]);
  label.name = 'Label';
  var ls = this.doc.tokens.component.button['letter-spacing'].$value;
  if (ls) label.letterSpacing = { unit: 'PERCENT', value: round(ls * 100, 2) };
  c.appendChild(label);
  try {
    var labelProp = c.addComponentProperty('Label', 'TEXT', label.characters);
    label.componentPropertyReferences = { characters: labelProp };
  } catch (e) { /* older API */ }
  return c;
};

Guide.prototype.input = async function () {
  var C = 'component.input.';
  var c = figma.createComponent();
  c.name = 'Input';
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisSizingMode = 'FIXED';
  c.counterAxisSizingMode = 'FIXED';
  c.counterAxisAlignItems = 'CENTER';
  c.resize(320, resolveValue(this.doc, '{' + C + 'height}'));
  this.bindNum(c, 'height', C + 'height');
  this.padding(c, C + 'padding-x', null);
  this.radius(c, C + 'radius');
  this.fill(c, C + 'bg');
  this.stroke(c, C + 'border', C + 'border-width');
  var ph = await this.text('name@company.com', this.doc.tokens.component.input['text-style'].$value, C + 'placeholder');
  ph.name = 'Placeholder';
  c.appendChild(ph);
  try { ph.componentPropertyReferences = { characters: c.addComponentProperty('Placeholder', 'TEXT', ph.characters) }; } catch (e) { /* ignore */ }
  return c;
};

Guide.prototype.cardComponent = async function () {
  var C = 'component.card.';
  var c = figma.createComponent();
  c.name = 'Card';
  c.layoutMode = 'VERTICAL';
  c.primaryAxisSizingMode = 'AUTO';
  c.counterAxisSizingMode = 'FIXED';
  c.resize(320, 100);
  this.bindNum(c, 'itemSpacing', 'dimension.spacing.8');
  this.padding(c, C + 'padding', C + 'padding');
  this.radius(c, C + 'radius');
  this.fill(c, C + 'bg');
  var bw = resolveValue(this.doc, '{' + C + 'border-width}');
  if (bw) this.stroke(c, C + 'border', C + 'border-width');
  var sh = this.doc.tokens.component.card.shadow.$value;
  if (isAlias(sh)) {
    var k = aliasPath(sh).split('.').pop();
    if (this.fx.light[k]) { await setEffectStyle(c, this.fx.light[k]); c.setPluginData('aegisShadow', k); }
  }
  c.appendChild(await this.text('Monthly revenue', 'overline', 'semantic.color.fg.muted'));
  c.appendChild(await this.text('$412,800', 'heading-lg'));
  c.appendChild(await this.text('▲ 3.8% vs last period', 'label-sm', 'semantic.color.success.fg'));
  return c;
};

Guide.prototype.badgeComponent = function (tone) {
  return this.badge(titleCase(tone), tone, true);
};

Guide.prototype.buildComponents = async function (parent, semanticCollection, lightModeId) {
  var root = this.frame('Components · ' + this.doc.meta.name, 'VERTICAL', 64, 80);
  root.counterAxisSizingMode = 'FIXED';
  root.resize(1600, 100);
  this.fill(root, 'semantic.color.bg.canvas');
  if (semanticCollection && lightModeId) setExplicitMode(root, semanticCollection, lightModeId);
  parent.appendChild(root);

  var body = await this.section(root, 'Components', 'Figma components whose sizes, paddings, radii, fills and strokes are bound to Component variables — swap the Semantic mode to re-skin them.');
  var row = this.frame('Component sets', 'HORIZONTAL', 48);
  row.layoutWrap = 'WRAP';
  row.counterAxisSpacing = 48;
  this.append(body, row, true);

  // Button set
  var buttons = [];
  var variants = ['primary', 'secondary', 'ghost', 'danger'];
  var sizes = ['sm', 'md', 'lg'];
  for (var v = 0; v < variants.length; v++) for (var s = 0; s < sizes.length; s++) {
    var b = await this.button(variants[v], sizes[s]);
    row.appendChild(b);
    buttons.push(b);
  }
  var bset = figma.combineAsVariants(buttons, row);
  bset.name = 'Button';
  bset.layoutMode = 'HORIZONTAL';
  bset.layoutWrap = 'WRAP';
  bset.primaryAxisSizingMode = 'FIXED';
  bset.counterAxisSizingMode = 'AUTO';
  bset.resize(520, 100);
  bset.itemSpacing = 16;
  bset.counterAxisSpacing = 16;
  bset.counterAxisAlignItems = 'CENTER';
  bset.paddingLeft = bset.paddingRight = bset.paddingTop = bset.paddingBottom = 24;
  bset.fills = [];

  // Badge set
  var badges = [];
  var tones = ['neutral', 'brand', 'success', 'warning', 'danger', 'info'];
  for (var t = 0; t < tones.length; t++) { var bc = await this.badgeComponent(tones[t]); row.appendChild(bc); badges.push(bc); }
  var badgeSet = figma.combineAsVariants(badges, row);
  badgeSet.name = 'Badge';
  badgeSet.layoutMode = 'HORIZONTAL';
  badgeSet.itemSpacing = 12;
  badgeSet.primaryAxisSizingMode = 'AUTO';
  badgeSet.counterAxisSizingMode = 'AUTO';
  badgeSet.paddingLeft = badgeSet.paddingRight = badgeSet.paddingTop = badgeSet.paddingBottom = 24;
  badgeSet.fills = [];

  var input = await this.input();
  row.appendChild(input);
  var card = await this.cardComponent();
  row.appendChild(card);

  // Token documentation tables
  var docs = await this.section(root, 'Component tokens', 'Every recipe value, the token it aliases and its CSS custom property.');
  var grid = this.frame('Tables', 'HORIZONTAL', 32);
  grid.layoutWrap = 'WRAP';
  grid.counterAxisSpacing = 32;
  this.append(docs, grid, true);
  var comps = this.doc.tokens.component;
  var names = Object.keys(comps);
  for (var i = 0; i < names.length; i++) grid.appendChild(await this.table(names[i], comps[names[i]]));

  return { root: root, components: { button: bset, badge: badgeSet, input: input, card: card } };
};

Guide.prototype.table = async function (name, group) {
  var t = this.card('Tokens / ' + name, 'VERTICAL', 0);
  t.paddingLeft = t.paddingRight = t.paddingTop = t.paddingBottom = 0;
  t.counterAxisSizingMode = 'FIXED';
  t.resize(704, 100);
  t.clipsContent = true;
  var head = this.frame('Title', 'HORIZONTAL', 8, 16);
  this.fill(head, 'semantic.color.bg.surface-sunken');
  this.append(t, head, true);
  head.appendChild(await this.text(titleCase(name), 'heading-sm'));
  var widths = [176, 280, 216];
  var cols = ['Token', 'Value', 'CSS variable'];
  var self = this;
  async function row(cells, header) {
    var r = self.frame(header ? 'Header' : 'Row / ' + cells[0], 'HORIZONTAL', 0);
    r.paddingLeft = r.paddingRight = 16;
    r.paddingTop = r.paddingBottom = header ? 8 : 10;
    r.counterAxisAlignItems = 'CENTER';
    self.append(t, r, true);
    for (var c = 0; c < cells.length; c++) {
      var tx = await self.text(cells[c], header ? 'overline' : c === 0 ? 'label-sm' : 'code', header ? 'semantic.color.fg.muted' : c === 0 ? 'semantic.color.fg.default' : 'semantic.color.fg.muted', { width: widths[c] - 12 });
      var cell = self.frame('Cell', 'HORIZONTAL', 0);
      cell.primaryAxisSizingMode = 'FIXED';
      cell.resize(widths[c], cell.height);
      cell.appendChild(tx);
      r.appendChild(cell);
    }
    if (!header) { r.strokes = [self.paint('semantic.color.border.subtle')]; r.strokeTopWeight = 1; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeAlign = 'INSIDE'; }
  }
  await row(cols, true);
  var props = Object.keys(group);
  for (var i = 0; i < props.length; i++) {
    var tok = group[props[i]];
    var val = tok.$value;
    var shown;
    if (isAlias(val)) {
      var concrete = resolveValue(this.doc, val, 'light');
      shown = aliasPath(val).replace(/^(semantic\.color|dimension|typography|primitive\.color)\./, '') + '  →  ' + fmt(concrete, tok.$type);
    } else shown = fmt(val, tok.$type);
    await row([props[i], shown, cssVarOf(tok) || ''], false);
  }
  return t;
};

function fmt(v, type) {
  if (Array.isArray(v)) return v.length && typeof v[0] === 'object' ? v.length + ' layer shadow' : v.join(', ');
  if (type === 'dimension') return v > 999 ? '9999 (full)' : v + 'px';
  if (type === 'number') return v + 'em';
  if (typeof v === 'string' && v.charAt(0) === '#') return v.toUpperCase();
  return String(v);
}
function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

/* ── Assemble ── */

async function findOrCreatePage(name, replace) {
  var page = null;
  for (var i = 0; i < figma.root.children.length; i++) if (figma.root.children[i].name === name) { page = figma.root.children[i]; break; }
  if (!page) { page = figma.createPage(); page.name = name; }
  await page.loadAsync();
  if (replace) page.children.slice().forEach(function (n) { n.remove(); });
  return page;
}

async function buildGuide(doc, vars, textStyles, effects, fonts, opts) {
  var g = new Guide(doc, vars, textStyles, effects, fonts);
  var page = await findOrCreatePage('AegisUI · ' + doc.meta.name, true);
  await figma.setCurrentPageAsync(page);

  var semantic = vars && vars.semantic ? vars.semantic : null;
  var lightId = semantic ? semantic.modes.Light : null;
  var darkId = semantic ? semantic.modes.Dark : null;

  progress('Style guide', 'Foundations');
  var root = g.frame('Foundations · Light', 'VERTICAL', 72, 80);
  root.counterAxisSizingMode = 'FIXED';
  root.resize(1600, 100);
  g.fill(root, 'semantic.color.bg.canvas');
  g.radius(root, 'dimension.radius.xl');
  if (semantic && lightId) setExplicitMode(root, semantic.collection, lightId);
  page.appendChild(root);

  await g.buildHeader(root);
  progress('Style guide', 'Primitive palette');
  await g.buildPrimitives(root);
  progress('Style guide', 'Semantic colors');
  await g.buildSemantic(root);
  progress('Style guide', 'Typography');
  await g.buildTypography(root);
  progress('Style guide', 'Spacing, radius & elevation');
  await g.buildDimensions(root);

  var frames = [root];
  // Dark twin: same nodes, Semantic collection pinned to Dark, dark elevation styles.
  if (semantic && darkId) {
    progress('Style guide', 'Dark mode twin');
    var dark = root.clone();
    dark.name = 'Foundations · Dark';
    page.appendChild(dark);
    setExplicitMode(dark, semantic.collection, darkId);
    await swapShadows(dark, effects.dark);
    frames.push(dark);
  }

  var compRoot = null;
  if (opts.components) {
    progress('Style guide', 'Components & token docs');
    var built = await g.buildComponents(page, semantic ? semantic.collection : null, lightId);
    compRoot = built.root;
    frames.push(compRoot);
    if (semantic && darkId) {
      // Dark instances preview
      var preview = g.frame('Components · Dark preview', 'VERTICAL', 32, 80);
      preview.counterAxisSizingMode = 'FIXED';
      preview.resize(1600, 100);
      g.fill(preview, 'semantic.color.bg.canvas');
      setExplicitMode(preview, semantic.collection, darkId);
      page.appendChild(preview);
      preview.appendChild(await g.text('Components · Dark mode (instances)', 'heading-xl'));
      var r = g.frame('Instances', 'HORIZONTAL', 24);
      r.layoutWrap = 'WRAP';
      r.counterAxisSpacing = 24;
      r.counterAxisAlignItems = 'CENTER';
      g.append(preview, r, true);
      built.components.button.children.forEach(function (c) { if (/Size=MD/.test(c.name)) r.appendChild(c.createInstance()); });
      built.components.badge.children.forEach(function (c) { r.appendChild(c.createInstance()); });
      r.appendChild(built.components.input.createInstance());
      r.appendChild(built.components.card.createInstance());
      await swapShadows(preview, effects.dark);
      frames.push(preview);
    }
  }

  // Layout: Foundations Light | Dark on the first row, Components | Dark preview below.
  var GAP = 160;
  var foundations = frames.filter(function (f) { return f.name.indexOf('Foundations') === 0; });
  var rest = frames.filter(function (f) { return foundations.indexOf(f) < 0; });
  var tallest = 0;
  var x = 0;
  foundations.forEach(function (f) { f.x = x; f.y = 0; x += f.width + GAP; tallest = Math.max(tallest, f.height); });
  x = 0;
  rest.forEach(function (f) { f.x = x; f.y = tallest + GAP * 1.5; x += f.width + GAP; });
  figma.viewport.scrollAndZoomIntoView(frames);
  return { page: page, frames: frames.length };
}

async function swapShadows(root, darkStyles) {
  var nodes = root.findAll(function (n) { return !!n.getPluginData && n.getPluginData('aegisShadow'); });
  if (root.getPluginData('aegisShadow')) nodes.push(root);
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    if (n.type === 'INSTANCE') continue;
    var st = darkStyles && darkStyles[n.getPluginData('aegisShadow')];
    if (st) await setEffectStyle(n, st);
  }
}

/* ═══════════════════════════════════════════════════════════ main */

async function runImport(doc, opts) {
  var started = Date.now();
  var errors = validate(doc);
  if (errors.length) { post('error', { message: 'The JSON is not a valid AegisUI token document.', details: errors }); return; }

  progress('Fonts', 'Scanning available fonts');
  var fonts = new FontResolver(await figma.listAvailableFontsAsync());

  var vars = null;
  if (opts.variables) vars = await new VariableSync(doc, opts).run();

  var textStyles = { map: {}, count: 0 };
  if (opts.textStyles) {
    progress('Styles', 'Text styles');
    textStyles = await syncTextStyles(doc, fonts, vars, opts);
  }
  var effects = { light: {}, dark: {}, count: 0 };
  if (opts.effectStyles) {
    progress('Styles', 'Effect styles');
    effects = await syncEffectStyles(doc, opts);
  }

  var guide = null;
  if (opts.styleGuide) {
    if (!opts.textStyles) {
      progress('Styles', 'Text styles (needed by the style guide)');
      textStyles = await syncTextStyles(doc, fonts, vars, opts);
    }
    guide = await buildGuide(doc, vars, textStyles, effects, fonts, opts);
  }

  figma.commitUndo();
  var summary = {
    preset: doc.meta.name,
    variables: vars ? vars.stats.created + vars.stats.updated : 0,
    created: vars ? vars.stats.created : 0,
    updated: vars ? vars.stats.updated : 0,
    collections: vars ? Object.keys(vars.collections).length : 0,
    textStyles: textStyles.count,
    effectStyles: effects.count,
    page: guide ? guide.page.name : null,
    seconds: round((Date.now() - started) / 1000, 1),
    warnings: (vars ? vars.warnings : []).concat(fonts.substitutions.length ? ['Fonts not installed, substituted with Inter: ' + uniq(fonts.substitutions).join(', ')] : []),
  };
  post('done', { summary: summary });
  figma.notify('AegisUI · ' + doc.meta.name + ' synced — ' + summary.variables + ' variables, ' + summary.textStyles + ' text styles');
}

async function scanFile() {
  var cols = await figma.variables.getLocalVariableCollectionsAsync();
  post('scan', {
    collections: cols.map(function (c) { return { name: c.name, modes: c.modes.map(function (m) { return m.name; }), count: c.variableIds.length }; }),
  });
}

figma.ui.onmessage = function (msg) {
  if (!msg || !msg.type) return;
  if (msg.type === 'import') {
    runImport(msg.doc, msg.options || {}).catch(function (e) {
      console.error(e);
      post('error', { message: (e && e.message) || String(e), details: [] });
    });
  } else if (msg.type === 'scan') {
    scanFile().catch(function () { /* ignore */ });
  } else if (msg.type === 'resize') {
    figma.ui.resize(Math.max(360, msg.width | 0), Math.max(420, msg.height | 0));
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// Exposed for the Node test harness (figma-plugin/test). No effect inside Figma.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validate: validate, resolveValue: resolveValue, hexToRgba: hexToRgba, styleWeight: styleWeight, runImport: runImport };
}
