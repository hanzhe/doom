// Keeps Doom's config and savegames in localStorage: IndexedDB never answers in
// sideloaded apps on the phone. Works on an Emscripten FS; tested in node.
(function (root) {
  'use strict';
  var CHUNK = 0x8000;

  function toBase64(bytes) {
    var parts = [];
    for (var i = 0; i < bytes.length; i += CHUNK) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
    }
    return btoa(parts.join(''));
  }

  function fromBase64(text) {
    var raw = atob(text);
    var bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  // {relative path: base64} for every file under dir.
  function collect(FS, dir) {
    var out = {};
    (function walk(rel) {
      FS.readdir(rel ? dir + '/' + rel : dir).forEach(function (name) {
        if (name === '.' || name === '..') return;
        var path = rel ? rel + '/' + name : name;
        var full = dir + '/' + path;
        if (FS.isDir(FS.stat(full).mode)) walk(path);
        else out[path] = toBase64(FS.readFile(full));
      });
    })('');
    return out;
  }

  // Writes the files from collect() back under dir, making folders as needed.
  // Entries that are not strings, or not valid base64, are skipped.
  function restore(FS, dir, files) {
    Object.keys(files || {}).forEach(function (path) {
      if (typeof files[path] !== 'string' || /(^|\/)\.\.(\/|$)/.test(path)) return;
      var bytes;
      try { bytes = fromBase64(files[path]); } catch (err) { return; }
      var parts = path.split('/');
      var at = dir;
      parts.slice(0, -1).forEach(function (part) {
        at += '/' + part;
        if (!FS.analyzePath(at).exists) FS.mkdir(at);
      });
      FS.writeFile(dir + '/' + path, bytes);
    });
  }

  var api = { toBase64: toBase64, fromBase64: fromBase64, collect: collect, restore: restore };
  root.DoomFiles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this);
