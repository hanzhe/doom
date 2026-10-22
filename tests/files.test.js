'use strict';
var test = require('node:test');
var assert = require('node:assert');
var files = require('../app/js/files.js');

// A minimal stand-in for the Emscripten FS calls files.js uses.
function memoryFS() {
  var nodes = { '/data': null };
  function children(dir) {
    return Object.keys(nodes).filter(function (p) {
      return p.indexOf(dir + '/') === 0 && p.slice(dir.length + 1).indexOf('/') < 0;
    }).map(function (p) { return p.slice(dir.length + 1); });
  }
  return {
    nodes: nodes,
    readdir: function (dir) { return ['.', '..'].concat(children(dir)); },
    stat: function (p) { return { mode: nodes[p] === null ? 1 : 0 }; },
    isDir: function (mode) { return mode === 1; },
    readFile: function (p) { return nodes[p]; },
    writeFile: function (p, bytes) { nodes[p] = bytes; },
    mkdir: function (p) { nodes[p] = null; },
    analyzePath: function (p) { return { exists: nodes.hasOwnProperty(p) }; }
  };
}

test('base64 round-trips every byte value', function () {
  var bytes = new Uint8Array(70000);
  for (var i = 0; i < bytes.length; i++) bytes[i] = (i * 7) & 0xff;
  assert.deepStrictEqual(files.fromBase64(files.toBase64(bytes)), bytes);
});

test('savegames in folders are collected and restored', function () {
  var a = memoryFS();
  a.writeFile('/data/.default.cfg', new Uint8Array([1, 2, 3]));
  a.mkdir('/data/.savegame');
  a.writeFile('/data/.savegame/doomsav0.dsg', new Uint8Array([9, 8]));
  var stored = JSON.parse(JSON.stringify(files.collect(a, '/data')));
  assert.deepStrictEqual(Object.keys(stored).sort(), ['.default.cfg', '.savegame/doomsav0.dsg']);

  var b = memoryFS();
  files.restore(b, '/data', stored);
  assert.deepStrictEqual(b.nodes['/data/.savegame/doomsav0.dsg'], new Uint8Array([9, 8]));
  assert.deepStrictEqual(b.nodes['/data/.default.cfg'], new Uint8Array([1, 2, 3]));
});

test('bad stored entries are skipped', function () {
  var fs = memoryFS();
  files.restore(fs, '/data', { a: 5, '../escape': 'AQI=', b: '***', c: 'AQI=' });
  assert.deepStrictEqual(Object.keys(fs.nodes).sort(), ['/data', '/data/c']);
  files.restore(fs, '/data', null);
});
