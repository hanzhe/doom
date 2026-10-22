// Loads the WAD, starts the engine (js/doom.js, compiled from doomgeneric) and
// passes phone keys to it.
(function () {
  'use strict';
  var WIDTH = 320;
  var HEIGHT = 200;
  var WAD = 'doom1.wad';
  var SAVE_DIR = '/data';        // config and savegames, copied to localStorage
  var SAVE_KEY = 'doom.files';
  var SAVE_MS = 5000;
  var QUIT_SOUND_MS = 1200;
  var HELP_SEEN = 'doom.helpSeen';

  var canvas = document.getElementById('screen');
  var ctx = canvas.getContext('2d');
  var image = ctx.createImageData(WIDTH, HEIGHT);
  var statusEl = document.getElementById('status');
  var helpEl = document.getElementById('help');
  var held = {};                 // phone key -> the action it pressed
  var running = false;
  var wakeLock = null;
  var savedText = null;          // what localStorage holds, to skip unchanged writes
  var sound = DoomSound.createPlayer(window.AudioContext || window.mozAudioContext,
    function () { return window.Module.HEAPU8; });

  function setStatus(text) { statusEl.textContent = text; }

  // Gecko on the phone only logs warnings and errors, so progress goes there.
  function log(text) { console.warn('Doom: ' + text); }

  function fail(text) {
    running = false;
    setStatus(text);
  }

  // Loading files from the app package reports status 0 on success.
  function loadWad(done) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', WAD);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {
      if (xhr.response && (xhr.status === 200 || xhr.status === 0)) done(new Uint8Array(xhr.response));
      else fail('Could not load ' + WAD);
    };
    xhr.onerror = function () { fail('Could not load ' + WAD); };
    xhr.send();
  }

  function readSaves() {
    try {
      savedText = localStorage.getItem(SAVE_KEY);
      DoomFiles.restore(window.Module.FS, SAVE_DIR, savedText ? JSON.parse(savedText) : {});
    } catch (err) {
      console.warn('Doom: could not read saved games', err);
    }
  }

  function writeSaves() {
    try {
      var text = JSON.stringify(DoomFiles.collect(window.Module.FS, SAVE_DIR));
      if (text === savedText) return;
      localStorage.setItem(SAVE_KEY, text);
      savedText = text;
    } catch (err) {
      console.warn('Doom: could not store saved games', err);
    }
  }

  function prepareFiles() {
    var M = window.Module;
    M.addRunDependency('wad');
    log('loading ' + WAD);
    loadWad(function (bytes) {
      log('loaded ' + WAD + ', ' + bytes.length + ' bytes');
      M.FS.writeFile('/' + WAD, bytes);
      M.removeRunDependency('wad');
    });
    M.FS.mkdir(SAVE_DIR);
    readSaves();
    M.FS.chdir(SAVE_DIR);
  }

  function drawFrame(pointer) {
    image.data.set(window.Module.HEAPU8.subarray(pointer, pointer + WIDTH * HEIGHT * 4));
    ctx.putImageData(image, 0, 0);
  }

  function sendDoom(codes, pressed) {
    codes.forEach(function (code) { window.Module._kaios_key(pressed ? 1 : 0, code); });
  }

  function runCommand(name) {
    var M = window.Module;
    if (name === 'previousWeapon') M._kaios_weapon(-1);
    else if (name === 'nextWeapon') M._kaios_weapon(1);
    else if (name === 'toggleRun') M._kaios_toggle_run();
    else if (name === 'help') showHelp(true);
  }

  function showHelp(show) {
    helpEl.hidden = !show;
    if (show && running) window.Module._kaios_pause();
  }

  function onKeyDown(e) {
    if (e.key === 'EndCall') return;     // let the system close the app
    e.preventDefault();
    if (!helpEl.hidden) {
      showHelp(false);
      return;
    }
    if (!running || held[e.key]) return; // ignore auto-repeat
    var act = DoomKeys.action(e.key);
    if (!act) return;
    held[e.key] = act;
    if (act.doom) sendDoom(act.doom, true);
    else runCommand(act.command);
  }

  function onKeyUp(e) {
    var act = held[e.key];
    if (!act) return;
    e.preventDefault();
    delete held[e.key];
    if (act.doom) sendDoom(act.doom, false);
    else if (act.command === 'previousWeapon' || act.command === 'nextWeapon') window.Module._kaios_weapon_release();
  }

  function releaseAll() {
    Object.keys(held).forEach(function (key) { onKeyUp({ key: key, preventDefault: function () {} }); });
  }

  function keepAwake(on) {
    if (on && !wakeLock && navigator.requestWakeLock) wakeLock = navigator.requestWakeLock('screen');
    if (!on && wakeLock) {
      wakeLock.unlock();
      wakeLock = null;
    }
  }

  function onVisibility() {
    var M = window.Module;
    if (document.hidden) {
      releaseAll();
      keepAwake(false);
      if (running) {
        M._kaios_pause();
        M._kaios_sleep(1);
        sound.pause(true);
        writeSaves();
      }
    } else {
      keepAwake(true);
      if (running) {
        M._kaios_sleep(0);
        sound.pause(false);
      }
    }
  }

  function firstHelp() {
    var seen = false;
    try { seen = localStorage.getItem(HELP_SEEN) === '1'; } catch (err) { seen = false; }
    if (seen) return;
    showHelp(true);
    try { localStorage.setItem(HELP_SEEN, '1'); } catch (err) { /* only means help shows again */ }
  }

  window.Module = {
    arguments: ['-iwad', '/' + WAD],
    preRun: [prepareFiles],
    print: log,
    printErr: function (text) { console.warn('Doom: ' + text); },
    drawFrame: drawFrame,
    sound: sound,
    onRuntimeInitialized: function () {
      log('started');
      running = true;
      setStatus('');
      setInterval(function () { if (running && !document.hidden) writeSaves(); }, SAVE_MS);
      firstHelp();
    },
    onQuit: function () {
      running = false;
      writeSaves();
      setTimeout(function () { window.close(); }, QUIT_SOUND_MS);  // let the quit sound play
    },
    onAbort: function (what) { fail('Doom stopped: ' + what); }
  };

  window.addEventListener('error', function (e) { fail('Error: ' + e.message); });
  keepAwake(true);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVisibility);
})();
