// Phone keys to Doom keys. No DOM; tested in node.
(function (root) {
  'use strict';

  // Key codes from doomgeneric/doomkeys.h.
  var DOOM = {
    ENTER: 13, ESCAPE: 27, TAB: 9, BACKSPACE: 0x7f,
    UP: 0xad, DOWN: 0xaf, LEFT: 0xac, RIGHT: 0xae,
    STRAFE_L: 0xa0, STRAFE_R: 0xa1, USE: 0xa2, FIRE: 0xa3
  };

  // Each phone key presses these Doom keys together. OK also sends Enter for
  // menus and "are you sure?" prompts; Enter does nothing in play.
  var PRESS = {
    ArrowUp: [DOOM.UP],
    ArrowDown: [DOOM.DOWN],
    ArrowLeft: [DOOM.LEFT],
    ArrowRight: [DOOM.RIGHT],
    Enter: [DOOM.FIRE, DOOM.ENTER],
    5: [DOOM.USE],
    Call: [DOOM.USE],
    4: [DOOM.STRAFE_L],
    6: [DOOM.STRAFE_R],
    2: [DOOM.UP],
    8: [DOOM.DOWN],
    0: [DOOM.TAB],
    SoftRight: [DOOM.TAB],
    SoftLeft: [DOOM.ESCAPE],
    Backspace: [DOOM.ESCAPE]
  };

  // Keys handled by the page rather than passed to Doom.
  var COMMANDS = {
    1: 'previousWeapon',
    3: 'nextWeapon',
    '#': 'toggleRun',
    '*': 'help'
  };

  // {doom: [codes]} | {command: name} | null for keys the game ignores.
  function action(key) {
    if (PRESS.hasOwnProperty(key)) return { doom: PRESS[key].slice() };
    if (COMMANDS.hasOwnProperty(key)) return { command: COMMANDS[key] };
    return null;
  }

  var api = { DOOM: DOOM, action: action };
  root.DoomKeys = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(this);
