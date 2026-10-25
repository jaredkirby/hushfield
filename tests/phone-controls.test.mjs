import assert from 'node:assert/strict';
import { incrementValue, phoneStepFor } from '../dist/phone-ui.mjs';

// Button steps remain useful musical units even where the desktop slider is finer.
assert.equal(phoneStepFor('orbitSpin', .01), 1);
assert.equal(phoneStepFor('orbitBalls', .1), 1);
assert.equal(phoneStepFor('orbitGravity', 1), 5);
assert.equal(phoneStepFor('speed', .01), .05);
assert.equal(phoneStepFor('unknown', .25), .25);

assert.equal(incrementValue('12', 1, 1, -60, 60), 13);
assert.equal(incrementValue('0', -1, 1, -60, 60), -1);
assert.equal(incrementValue('98', 1, 5, 0, 100), 100);
assert.equal(incrementValue('2', -1, 5, 0, 100), 0);
assert.equal(incrementValue('1', -1, 1, 1, 12), 1);
assert.equal(incrementValue('12', 1, 1, 1, 12), 12);
assert.equal(incrementValue('.55', 1, .05, 0, 1), .6);
assert.equal(incrementValue('.01', 1, .01, .002, 2), .02);

let volume = 0;
for (let i = 0; i < 20; i++) volume = incrementValue(volume, 1, .05, 0, 1);
assert.equal(volume, 1, 'Repeated volume steps reach the exact upper bound');
for (let i = 0; i < 20; i++) volume = incrementValue(volume, -1, .05, 0, 1);
assert.equal(volume, 0, 'Repeated fractional steps return to zero');
console.log('Phone control steps, bounds and fractional precision passed.');
