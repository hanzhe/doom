'use strict';
var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var sound = require('../app/js/sound.js');

function dmx(rate, samples) {
  var count = samples.length + 32;
  var bytes = new Uint8Array(8 + count);
  bytes.set([3, 0, rate & 0xff, rate >> 8, count & 0xff, (count >> 8) & 0xff, 0, 0]);
  bytes.set(samples, 8 + 16);
  return bytes;
}

test('DMX lumps decode to samples around zero, without the padding', function () {
  var s = sound.decodeDmx(dmx(11025, [128, 255, 0, 192]));
  assert.strictEqual(s.rate, 11025);
  assert.deepStrictEqual(Array.from(s.samples), [0, 127 / 128, -1, 0.5]);
});

test('other data is not taken for a sound', function () {
  assert.strictEqual(sound.decodeDmx(new Uint8Array(10)), null);
  var bad = dmx(11025, [1, 2, 3]);
  bad[0] = 1;
  assert.strictEqual(sound.decodeDmx(bad), null);
  assert.strictEqual(sound.decodeDmx(dmx(100, [1, 2, 3])), null);
  assert.strictEqual(sound.decodeDmx(null), null);
});

test('every sound in the shareware WAD decodes', function () {
  var wad = fs.readFileSync(path.join(__dirname, '..', 'app', 'doom1.wad'));
  var lumps = wad.readInt32LE(4);
  var dir = wad.readInt32LE(8);
  var found = 0;
  for (var i = 0; i < lumps; i++) {
    var at = dir + i * 16;
    var name = wad.toString('latin1', at + 8, at + 16).replace(/\0.*$/, '');
    if (!/^DS/.test(name)) continue;
    var pos = wad.readInt32LE(at);
    var s = sound.decodeDmx(new Uint8Array(wad.buffer, wad.byteOffset + pos, wad.readInt32LE(at + 4)));
    assert.ok(s && s.samples.length > 0, name);
    found++;
  }
  assert.ok(found > 50, 'found ' + found);
});

test('Doom volume and separation map to gain and pan', function () {
  assert.strictEqual(sound.gainFor(127), 1);
  assert.strictEqual(sound.gainFor(0), 0);
  assert.strictEqual(sound.gainFor(300), 1);
  assert.strictEqual(sound.panFor(128), 0);
  assert.strictEqual(sound.panFor(1), -1);
  assert.strictEqual(sound.panFor(255), 1);
});
