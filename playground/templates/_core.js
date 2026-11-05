/* AegisUI Playground — template registry core.
 *
 * Every template is a plain object:
 *   {
 *     id, name, category, tags: [], description,
 *     a11y: [ ...requirements the generated prompt must enforce ],
 *     behavior: [ ...interaction requirements ],
 *     html: '...',          // copy-ready markup (root element = first element)
 *     css:  '...',          // copy-ready CSS, AegisUI tokens only (no raw colors)
 *     js:   function (root) { ... } | null   // self-contained, no outer references
 *   }
 *
 * `js` is serialised with Function#toString() for "Copy JS" and for the preview
 * iframe, so it must not close over anything outside its own body.
 */
(function (root) {
  'use strict';

  var PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    alert: '<path d="M12 3 2 20h20L12 3ZM12 10v4M12 17v.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>',
    home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    file: '<path d="M7 3h7l5 5v13H7zM14 3v5h5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7M6.5 19a2 2 0 1 0 0-.01M17.5 19a2 2 0 1 0 0-.01"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z"/>',
    sparkle: '<path d="M12 3l2 5.5L19.5 10.5 14 12.5 12 18l-2-5.5L4.5 10.5 10 8.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    dots: '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
    accessibility: '<circle cx="12" cy="4.5" r="1.5"/><path d="M5 8l7 1.5L19 8M12 9.5V14M12 14l-3.5 7M12 14l3.5 7"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    play: '<path d="M7 5v14l12-7z"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    inbox: '<path d="M3 13h5l1.5 3h5l1.5-3h5M5 5h14l2 8v6H3v-6z"/>'
  };

  function icon(name, extra) {
    var p = PATHS[name];
    if (!p) throw new Error('Unknown icon: ' + name);
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' + (extra ? ' ' + extra : '') + '>' + p + '</svg>';
  }

  var list = [];
  function register(t) {
    if (!t || !t.id || !t.html || typeof t.css !== 'string') throw new Error('Invalid template ' + (t && t.id));
    if (list.some(function (x) { return x.id === t.id; })) throw new Error('Duplicate template id ' + t.id);
    t.tags = t.tags || [];
    t.a11y = t.a11y || [];
    t.behavior = t.behavior || [];
    t.js = typeof t.js === 'function' ? t.js : null;
    /* Component classes often set display (flex/grid), which beats the UA [hidden] rule.
       Every template ships this guard so toggling the hidden attribute always works. */
    var m = /^\s*<[a-z0-9-]+[^>]*?\sclass="([^"\s]+)/i.exec(t.html);
    if (m) t.css = t.css.replace(/\s+$/, '') + '\n.' + m[1] + ' [hidden] { display: none !important; }';
    list.push(t);
  }

  root.AegisPlaygroundTemplates = {
    icon: icon,
    register: register,
    all: function () { return list.slice(); },
    get: function (id) { return list.filter(function (t) { return t.id === id; })[0] || null; }
  };
})(typeof self !== 'undefined' ? self : this);
