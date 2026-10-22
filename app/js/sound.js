// Plays Doom's sound effects with Web Audio. The engine (port/i_kaios_sound.c)
// passes each sound's WAD lump; decoded sounds are kept by lump number.
(function (root) {
  'use strict';
  var HEADER = 8;     // format, sample rate, sample count
  var PAD = 16;       // the DMX format pads both ends of the samples
  var DMX_FORMAT = 3;
  var MIN_RATE = 8000;
  var MAX_VOLUME = 127;
  var CENTRE = 128;   // sep runs 0 (left) to 254 (right)

  // {rate, samples: Float32Array} from a DMX sound lump, or null if it is not one.
  function decodeDmx(bytes) {
    if (!bytes || bytes.length < HEADER + 2 * PAD) return null;
    if ((bytes[0] | (bytes[1] << 8)) !== DMX_FORMAT) return null;
    var rate = bytes[2] | (bytes[3] << 8);
    var count = (bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)) >>> 0;
    count = Math.min(count, bytes.length - HEADER) - 2 * PAD;
    if (rate < MIN_RATE || count <= 0) return null;
    var samples = new Float32Array(count);
    for (var i = 0; i < count; i++) samples[i] = (bytes[HEADER + PAD + i] - 128) / 128;
    return { rate: rate, samples: samples };
  }

  function gainFor(vol) { return Math.max(0, Math.min(MAX_VOLUME, vol)) / MAX_VOLUME; }

  function panFor(sep) { return Math.max(-1, Math.min(1, (sep - CENTRE) / (CENTRE - 1))); }

  // heap() returns the engine's memory (Module.HEAPU8), which can be replaced.
  function createPlayer(AudioContextClass, heap) {
    var ctx = null;
    var buffers = {};   // lump -> AudioBuffer, or null when it would not decode
    var channels = {};  // channel -> {source, gain, pan, playing}

    function context() {
      if (!ctx) ctx = new AudioContextClass();
      return ctx;
    }

    function bufferFor(lump, pointer, length) {
      if (!buffers.hasOwnProperty(lump)) {
        var sound = decodeDmx(heap().subarray(pointer, pointer + length));
        var buffer = null;
        if (sound) {
          buffer = context().createBuffer(1, sound.samples.length, sound.rate);
          buffer.getChannelData(0).set(sound.samples);
        }
        buffers[lump] = buffer;
      }
      return buffers[lump];
    }

    function stop(channel) {
      var ch = channels[channel];
      if (!ch) return;
      delete channels[channel];
      ch.playing = false;
      try { ch.source.stop(); } catch (err) { /* already ended */ }
      ch.source.disconnect();
    }

    function update(channel, vol, sep) {
      var ch = channels[channel];
      if (!ch) return;
      ch.gain.gain.value = gainFor(vol);
      if (ch.pan) ch.pan.pan.value = panFor(sep);
    }

    function play(channel, lump, pointer, length, vol, sep) {
      stop(channel);
      var buffer = bufferFor(lump, pointer, length);
      if (!buffer) return false;
      var c = context();
      var ch = { source: c.createBufferSource(), gain: c.createGain(), pan: null, playing: true };
      ch.source.buffer = buffer;
      ch.source.connect(ch.gain);
      if (c.createStereoPanner) {
        ch.pan = c.createStereoPanner();
        ch.gain.connect(ch.pan);
        ch.pan.connect(c.destination);
      } else {
        ch.gain.connect(c.destination);
      }
      ch.source.onended = function () { ch.playing = false; };
      channels[channel] = ch;
      update(channel, vol, sep);
      ch.source.start();
      return true;
    }

    function playing(channel) { return !!(channels[channel] && channels[channel].playing); }

    function stopAll() { Object.keys(channels).forEach(stop); }

    // Silences everything while the app is hidden.
    function pause(paused) {
      if (!ctx) return;
      if (paused && ctx.suspend) ctx.suspend();
      else if (!paused && ctx.resume) ctx.resume();
    }

    return {
      available: function () { return !!AudioContextClass; },
      play: play,
      update: update,
      stop: stop,
      playing: playing,
      stopAll: stopAll,
      pause: pause
    };
  }

  var api = { decodeDmx: decodeDmx, gainFor: gainFor, panFor: panFor, createPlayer: createPlayer };
  root.DoomSound = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this);
