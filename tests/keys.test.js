'use strict';
var test = require('node:test');
var assert = require('node:assert');
var keys = require('../app/js/keys.js');

var D = keys.DOOM;

test('the d-pad moves and OK fires and picks menu items', function () {
  assert.deepStrictEqual(keys.action('ArrowUp'), { doom: [D.UP] });
  assert.deepStrictEqual(keys.action('ArrowLeft'), { doom: [D.LEFT] });
  assert.deepStrictEqual(keys.action('Enter'), { doom: [D.FIRE, D.ENTER] });
});

test('keypad keys use, strafe, open the map and the menu', function () {
  assert.deepStrictEqual(keys.action('5'), { doom: [D.USE] });
  assert.deepStrictEqual(keys.action('Call'), { doom: [D.USE] });
  assert.deepStrictEqual(keys.action('4'), { doom: [D.STRAFE_L] });
  assert.deepStrictEqual(keys.action('6'), { doom: [D.STRAFE_R] });
  assert.deepStrictEqual(keys.action('0'), { doom: [D.TAB] });
  assert.deepStrictEqual(keys.action('SoftLeft'), { doom: [D.ESCAPE] });
  assert.deepStrictEqual(keys.action('Backspace'), { doom: [D.ESCAPE] });
});

test('some keys are commands for the page', function () {
  assert.deepStrictEqual(keys.action('1'), { command: 'previousWeapon' });
  assert.deepStrictEqual(keys.action('3'), { command: 'nextWeapon' });
  assert.deepStrictEqual(keys.action('#'), { command: 'toggleRun' });
  assert.deepStrictEqual(keys.action('*'), { command: 'help' });
  assert.strictEqual(keys.action('9'), null);
  assert.strictEqual(keys.action('EndCall'), null);
});

test('the returned key lists are copies', function () {
  keys.action('Enter').doom.push(1);
  assert.strictEqual(keys.action('Enter').doom.length, 2);
});
