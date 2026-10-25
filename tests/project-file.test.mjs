import assert from 'node:assert/strict';
import {PROJECT_FORMAT,restoreProjectFile} from '../dist/project-file.mjs';
const current={format:PROJECT_FORMAT,version:3,name:'Garden',sample:'UklGRg==',params:{orbitBalls:5,orbitSpin:12},controls:{orbitKey:'C',orbitShape:'5'},orbitSound:{balls:{level:20}},ambient:{orbit:40},visual:{mode:'vector'}};
assert.deepEqual(restoreProjectFile(current),current);
for(const version of [1,2,3]){
 const older={...current,format:'earlier-browser-lab',version,params:{olderBalls:7,olderSpin:-9,density:18},controls:{olderKey:'D',olderShape:'6'},olderSound:current.orbitSound,ambient:{older:35,pads:70}};
 delete older.orbitSound;
 const restored=restoreProjectFile(older);
 assert.equal(restored.format,PROJECT_FORMAT);assert.deepEqual(restored.params,{orbitBalls:7,orbitSpin:-9,density:18});
 assert.deepEqual(restored.controls,{orbitKey:'D',orbitShape:'6'});assert.equal(restored.orbitSound,older.olderSound);
 assert.deepEqual(restored.ambient,{orbit:35,pads:70});assert.equal(restored.visual.mode,'vector');
 assert.equal(older.params.olderBalls,7,'Loading does not mutate the input');assert(!('olderSound'in restored));
}
for(const saved of [null,[],{}, {...current,version:4},{...current,format:'unrelated'},{...current,sample:5},{...current,params:null},{...current,controls:[]}])assert.throws(()=>restoreProjectFile(saved),/Hushfield project/);
const mixed={...current,format:'earlier-browser-lab',params:{olderBalls:7,orbitBalls:3}};
assert.equal(restoreProjectFile(mixed).params.orbitBalls,3,'Current fields take precedence');
console.log('PASS: Hushfield saves, version 1–3 schema migration, sound banks, ambient layers, validation and input preservation.');
