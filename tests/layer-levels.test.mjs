import test from 'node:test';
import assert from 'node:assert/strict';
import {readLayerLevel,setLayerLevel} from '../dist/layer-levels.mjs';

test('layer edits control the current mix without enabling the generator or changing another layer',()=>{
  const ambient={enabled:true,grains:0,orbit:0},params={sampleLevel:100,orbitLevel:100};
  assert.equal(readLayerLevel('sample',ambient,params),0);
  setLayerLevel('sample',35,ambient,params);
  assert.equal(ambient.grains,35);assert.equal(ambient.orbit,0);
  ambient.enabled=false;
  assert.equal(readLayerLevel('sample',ambient,params),100);
  setLayerLevel('orbit',40,ambient,params);
  assert.equal(ambient.enabled,false);assert.equal(params.orbitLevel,40);assert.equal(params.sampleLevel,100);
  assert.equal(ambient.grains,35);
});
