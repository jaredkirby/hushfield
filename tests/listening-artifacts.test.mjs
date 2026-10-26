import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const folder=new URL('../dist/audio/surge/',import.meta.url);
function energy(bytes,from,to){let sum=0,count=0;for(let i=Math.floor(from*48000);i<Math.floor(to*48000);i++)for(let ch=0;ch<2;ch++){const value=bytes.readInt16LE(44+(i*2+ch)*2)/32768;sum+=value*value;count++;}return Math.sqrt(sum/count);}
test('delivered native Texture material is usable known-pitch PCM with distinct sustained and decaying envelopes',async()=>{
  const manifest=JSON.parse(await readFile(new URL('manifest.json',folder),'utf8'));
  assert.deepEqual(manifest.assets.map(asset=>asset.id).sort(),['bell','pad','pluck']);
  for(const asset of manifest.assets){
    const bytes=await readFile(new URL(asset.file,folder));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
    assert.equal(bytes.readUInt16LE(20),1);assert.equal(bytes.readUInt16LE(22),2);assert.equal(bytes.readUInt32LE(24),48000);assert.equal(bytes.readUInt16LE(34),16);
    assert.equal(bytes.readUInt32LE(40),24*48000*2*2);assert.equal(bytes.length,44+bytes.readUInt32LE(40));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
    assert.equal(asset.rootMidi,60);assert.equal(asset.followsFoundationHarmony,false);
    let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)/32768));
    assert(peak>.001&&peak<.8,`${asset.id} is audible with ample unclipped headroom`);
    const onset=energy(bytes,.1,.7),late=energy(bytes,5,6);
    assert(onset>.001,`${asset.id} has audible native output`);
    if(asset.id==='pad')assert(late>onset,'Pad sustains and blooms beyond its onset');
    else assert(late<onset*.05,`${asset.id} decays between strikes`);
    const patch=await readFile(new URL(asset.patchFile,folder));assert(patch.length>100,'A usable native patch accompanies the recording');
  }
});
