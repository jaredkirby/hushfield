import test from 'node:test';
import assert from 'node:assert/strict';
import {squareViewportSize} from '../dist/square-viewport.mjs';

test('square prioritizes landscape height and portrait width',()=>{
  assert.equal(squareViewportSize(1262,702,false),702);
  assert.equal(squareViewportSize(826,372,false),372);
  assert.equal(squareViewportSize(374,828,true),374);
  assert.equal(squareViewportSize(304,552,true),304);
  assert.equal(squareViewportSize(750,1006,true),750);
});

test('nearly square windows keep the remaining controls reachable',()=>{
  for(const [width,height,portrait] of [[750,816,true],[1006,750,false],[634,684,true]]) {
    const side=squareViewportSize(width,height,portrait);
    assert(side>0&&Number.isInteger(side));
    assert(side<=width&&side<=height);
    assert((portrait?height-side-8:width-side-8)>=(portrait?160:240));
  }
  assert.equal(squareViewportSize(0,0,true),0);
  assert.equal(squareViewportSize(120,80,false),0);
});
