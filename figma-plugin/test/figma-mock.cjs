/*
 * Strict in-memory mock of the Figma Plugin API surface used by code.js.
 * It enforces the rules that most often break real plugins:
 *   • text characters / fontName require the font to be loaded first
 *   • layoutSizingHorizontal = 'FILL' requires an auto-layout parent
 *   • variable values / aliases must match the variable's resolvedType
 *   • variable scopes must be valid for the type
 *   • setBoundVariable only accepts bindable fields
 *   • explicit modes must reference an existing mode of the collection
 */
'use strict';

let uid = 0;
const nid = (p) => `${p}:${++uid}`;

const BINDABLE = new Set(['width', 'height', 'itemSpacing', 'counterAxisSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
  'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'strokeWeight', 'opacity', 'visible', 'characters', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight']);
const SCOPES = {
  COLOR: new Set(['ALL_SCOPES', 'ALL_FILLS', 'FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR', 'EFFECT_COLOR']),
  FLOAT: new Set(['ALL_SCOPES', 'CORNER_RADIUS', 'TEXT_CONTENT', 'WIDTH_HEIGHT', 'GAP', 'STROKE_FLOAT', 'OPACITY', 'EFFECT_FLOAT', 'FONT_WEIGHT', 'FONT_SIZE', 'LINE_HEIGHT', 'LETTER_SPACING', 'PARAGRAPH_SPACING', 'PARAGRAPH_INDENT']),
  STRING: new Set(['ALL_SCOPES', 'TEXT_CONTENT', 'FONT_FAMILY', 'FONT_STYLE']),
  BOOLEAN: new Set(['ALL_SCOPES']),
};

function createFigma({ fonts }) {
  const state = {
    collections: [], variables: [], textStyles: [], effectStyles: [], loadedFonts: new Set(), messages: [], notifications: [],
  };
  const byId = new Map();
  const fontKey = (f) => `${f.family}::${f.style}`;
  const requireFont = (f) => { if (!state.loadedFonts.has(fontKey(f))) throw new Error(`Font not loaded: ${fontKey(f)}`); };

  /* ── variables ── */
  class Collection {
    constructor(name) { this.id = nid('VariableCollectionId'); this.name = name; this.modes = [{ modeId: nid('mode'), name: 'Mode 1' }]; byId.set(this.id, this); }
    get variableIds() { return state.variables.filter((v) => v.variableCollectionId === this.id).map((v) => v.id); }
    renameMode(id, name) { const m = this.modes.find((x) => x.modeId === id); if (!m) throw new Error('renameMode: bad mode'); m.name = name; }
    addMode(name) { if (this.modes.length >= (state.maxModes || 4)) throw new Error('Limited to ' + (state.maxModes || 4) + ' modes on this plan'); const m = { modeId: nid('mode'), name }; this.modes.push(m); return m.modeId; }
  }
  class Variable {
    constructor(name, col, type) {
      if (!(col instanceof Collection)) throw new Error('createVariable: expected collection node');
      if (/[.{}]/.test(name)) throw new Error('Invalid variable name ' + name);
      if (state.variables.some((v) => v.variableCollectionId === col.id && v.name === name)) throw new Error('Duplicate variable name ' + name);
      this.id = nid('VariableID'); this.name = name; this.variableCollectionId = col.id; this.resolvedType = type; this.valuesByMode = {}; this._scopes = ['ALL_SCOPES']; this.codeSyntax = {}; this.description = ''; this.hiddenFromPublishing = false;
      byId.set(this.id, this);
    }
    get scopes() { return this._scopes; }
    set scopes(s) { s.forEach((x) => { if (!SCOPES[this.resolvedType].has(x)) throw new Error(`Invalid scope ${x} for ${this.resolvedType} (${this.name})`); }); this._scopes = s; }
    setValueForMode(modeId, value) {
      const col = byId.get(this.variableCollectionId);
      if (!col.modes.some((m) => m.modeId === modeId)) throw new Error('setValueForMode: bad mode for ' + this.name);
      if (value && value.type === 'VARIABLE_ALIAS') {
        const target = byId.get(value.id);
        if (!target) throw new Error('Alias to unknown variable');
        if (target.resolvedType !== this.resolvedType) throw new Error(`Alias type mismatch ${this.name}(${this.resolvedType}) → ${target.name}(${target.resolvedType})`);
      } else if (this.resolvedType === 'COLOR') {
        ['r', 'g', 'b'].forEach((k) => { if (typeof value[k] !== 'number' || value[k] < 0 || value[k] > 1 || Number.isNaN(value[k])) throw new Error('Bad color for ' + this.name); });
      } else if (this.resolvedType === 'FLOAT') {
        if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`Bad FLOAT for ${this.name}: ${value}`);
      } else if (this.resolvedType === 'STRING') {
        if (typeof value !== 'string') throw new Error('Bad STRING for ' + this.name);
      }
      this.valuesByMode[modeId] = value;
    }
    setVariableCodeSyntax(platform, v) { this.codeSyntax[platform] = v; }
    remove() { state.variables.splice(state.variables.indexOf(this), 1); }
  }

  /* ── nodes ── */
  class Node {
    constructor(type) {
      this.id = nid(type); this.type = type; this.name = type; this.children = []; this.parent = null; this.x = 0; this.y = 0; this.width = 100; this.height = 100;
      this.fills = []; this.strokes = []; this.effects = []; this.boundVariables = {}; this.plugin = {}; this.explicitModes = {}; this.layoutMode = 'NONE';
      byId.set(this.id, this);
    }
    appendChild(c) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); this.children.push(c); c.parent = this; }
    insertChild(i, c) { this.appendChild(c); }
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; this.removed = true; }
    resize(w, h) { if (!(w > 0) || !(h > 0)) throw new Error(`resize(${w}, ${h}) on ${this.name}`); this.width = w; this.height = h; }
    setPluginData(k, v) { this.plugin[k] = v; }
    getPluginData(k) { return this.plugin[k] || ''; }
    setBoundVariable(field, v) {
      if (!BINDABLE.has(field)) throw new Error('Not bindable: ' + field);
      if (v.resolvedType !== 'FLOAT' && field !== 'characters' && field !== 'visible') throw new Error(`Bind ${field} to ${v.resolvedType}`);
      this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
    }
    setExplicitVariableModeForCollection(col, modeId) {
      if (!(col instanceof Collection)) throw new Error('expected collection');
      if (!col.modes.some((m) => m.modeId === modeId)) throw new Error('bad explicit mode');
      this.explicitModes[col.id] = modeId;
    }
    async setEffectStyleIdAsync(id) { if (!state.effectStyles.some((s) => s.id === id)) throw new Error('unknown effect style'); this.effectStyleId = id; }
    findAll(fn) { const out = []; const w = (n) => n.children.forEach((c) => { if (fn(c)) out.push(c); w(c); }); w(this); return out; }
    clone() {
      const c = Object.create(Object.getPrototypeOf(this));
      Object.assign(c, this, { id: nid(this.type), parent: null, children: [], boundVariables: { ...this.boundVariables }, plugin: { ...this.plugin }, explicitModes: { ...this.explicitModes } });
      byId.set(c.id, c);
      this.children.forEach((ch) => c.appendChild(ch.clone()));
      if (this.parent) this.parent.appendChild(c);
      return c;
    }
    set layoutSizingHorizontal(v) {
      if (v === 'FILL' && (!this.parent || this.parent.layoutMode === 'NONE')) throw new Error(`layoutSizingHorizontal=FILL on "${this.name}" without auto-layout parent`);
      this._lsh = v;
    }
    get layoutSizingHorizontal() { return this._lsh || 'FIXED'; }
    set layoutWrap(v) { if (v === 'WRAP' && this.layoutMode !== 'HORIZONTAL') throw new Error('layoutWrap requires HORIZONTAL'); this._wrap = v; }
    get layoutWrap() { return this._wrap || 'NO_WRAP'; }
    set counterAxisSpacing(v) { if (this.layoutWrap !== 'WRAP') throw new Error('counterAxisSpacing requires WRAP on ' + this.name); this._cas = v; }
    get counterAxisSpacing() { return this._cas || 0; }
  }
  class Text extends Node {
    constructor() { super('TEXT'); this._font = null; this._chars = ''; }
    set fontName(f) { requireFont(f); this._font = f; }
    get fontName() { return this._font; }
    set characters(s) { if (!this._font) throw new Error('Set fontName before characters'); requireFont(this._font); this._chars = s; }
    get characters() { return this._chars; }
    set letterSpacing(v) { if (!this._font) throw new Error('font'); this._ls = v; }
    async setTextStyleIdAsync(id) { const st = state.textStyles.find((s) => s.id === id); if (!st) throw new Error('unknown text style'); requireFont(st.fontName); this.textStyleId = id; }
  }
  class Component extends Node {
    constructor() { super('COMPONENT'); this.componentPropertyDefinitions = {}; }
    addComponentProperty(name, type, def) { const k = `${name}#${uid++}`; this.componentPropertyDefinitions[k] = { type, defaultValue: def }; return k; }
    createInstance() { const i = this.clone(); i.type = 'INSTANCE'; i.mainComponent = this; if (i.parent) i.parent.children.splice(i.parent.children.indexOf(i), 1); i.parent = null; return i; }
  }
  class Page extends Node {
    constructor() { super('PAGE'); }
    async loadAsync() { this.loaded = true; }
  }
  const root = new Node('DOCUMENT');

  /* ── styles ── */
  class TextStyle {
    constructor() { this.id = nid('S:text'); this.name = ''; this.boundVariables = {}; state.textStyles.push(this); }
    set fontName(f) { requireFont(f); this._font = f; }
    get fontName() { return this._font; }
    setBoundVariable(field, v) { if (!['fontSize', 'lineHeight', 'letterSpacing', 'fontFamily', 'fontWeight'].includes(field)) throw new Error('bad text style field'); this.boundVariables[field] = v.id; }
  }
  class EffectStyle {
    constructor() { this.id = nid('S:effect'); this.name = ''; state.effectStyles.push(this); }
    set effects(list) {
      list.forEach((e) => {
        if (e.type !== 'DROP_SHADOW') throw new Error('effect type');
        ['r', 'g', 'b', 'a'].forEach((k) => { if (typeof e.color[k] !== 'number') throw new Error('effect color'); });
        if (typeof e.radius !== 'number' || !e.offset || typeof e.visible !== 'boolean' || !e.blendMode) throw new Error('effect shape');
      });
      this._effects = list;
    }
    get effects() { return this._effects; }
  }

  const figma = {
    root,
    currentPage: null,
    showUI() {},
    closePlugin() { state.closed = true; },
    notify(m) { state.notifications.push(m); },
    commitUndo() {},
    viewport: { scrollAndZoomIntoView() {} },
    ui: { postMessage(m) { state.messages.push(m); }, onmessage: null, resize() {} },
    async listAvailableFontsAsync() { return fonts.map(([family, style]) => ({ fontName: { family, style } })); },
    async loadFontAsync(f) {
      if (!fonts.some(([fa, st]) => fa === f.family && st === f.style)) throw new Error('Font unavailable ' + fontKey(f));
      state.loadedFonts.add(fontKey(f));
    },
    async setCurrentPageAsync(p) { figma.currentPage = p; },
    createPage() { const p = new Page(); root.appendChild(p); return p; },
    createFrame() { return new Node('FRAME'); },
    createRectangle() { return new Node('RECTANGLE'); },
    createText() { return new Text(); },
    createComponent() { return new Component(); },
    combineAsVariants(nodes, parent) {
      nodes.forEach((n) => { if (n.type !== 'COMPONENT') throw new Error('combineAsVariants needs components'); if (!/=/.test(n.name)) throw new Error('variant name must be Prop=Value: ' + n.name); });
      const set = new Node('COMPONENT_SET');
      parent.appendChild(set);
      nodes.forEach((n) => set.appendChild(n));
      return set;
    },
    createTextStyle() { return new TextStyle(); },
    createEffectStyle() { return new EffectStyle(); },
    async getLocalTextStylesAsync() { return state.textStyles.slice(); },
    async getLocalEffectStylesAsync() { return state.effectStyles.slice(); },
    variables: {
      createVariableCollection(name) { const c = new Collection(name); state.collections.push(c); return c; },
      createVariable(name, col, type) { const v = new Variable(name, col, type); state.variables.push(v); return v; },
      createVariableAlias(v) { return { type: 'VARIABLE_ALIAS', id: v.id }; },
      setBoundVariableForPaint(paint, field, v) {
        if (field !== 'color' || v.resolvedType !== 'COLOR') throw new Error('Paint bind needs COLOR variable, got ' + v.resolvedType + ' ' + v.name);
        return { ...paint, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: v.id } } };
      },
      async getLocalVariableCollectionsAsync() { return state.collections.slice(); },
      async getLocalVariablesAsync() { return state.variables.slice(); },
      async getVariableByIdAsync(id) { return byId.get(id) || null; },
    },
  };
  return { figma, state, byId };
}

module.exports = { createFigma };
