import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),scratch=path.join(root,'.scratch/listening');
const baseline='6e5c607a76f53021ed4bb016fdd5a42a43edd817';
await mkdir(scratch,{recursive:true});
const archive=execFileSync('git',['archive',baseline,'dist'],{cwd:root,maxBuffer:64*1024*1024});
const baselineRoot=path.join(scratch,'baseline-source');await mkdir(baselineRoot,{recursive:true});
execFileSync('tar',['-xf','-','-C',baselineRoot],{input:archive});
const sha=value=>createHash('sha256').update(value).digest('hex');
// Only the fixture replaces transport delivery: every processor starts at frame6144.
// Snapshot acknowledgements read the actual engine at an OfflineAudioContext barrier.
const observe = `const receive=this.port.onmessage;this.port.onmessage=event=>{if(event.data.type==="listeningSnapshot")this.port.postMessage({type:"listeningSnapshot",id:event.data.id,state:this.synth?.status()});else receive(event);};`;
const hooks={
 'ambient-worklet.js':`class ListeningAmbient extends AmbientProcessor { constructor(options){super(options);${observe}} process(inputs,outputs){if(!this.listeningStarted&&currentFrame>=6144){this.listeningStarted=true;this.synth.play(true);}const result=super.process(inputs,outputs);globalThis.__listeningControl=this.synth.status();return result;} }\nregisterProcessor("ambient-engine",ListeningAmbient);`,
 'orbit-worklet.js':`class ListeningOrbit extends OrbitProcessor { constructor(options){super(options);this.listeningPort={onmessage:null};this.port.onmessage({data:{type:"harmonyPort",port:this.listeningPort}});${observe}} process(inputs,outputs){if(!this.listeningStarted&&currentFrame>=6144){this.listeningStarted=true;this.engine.followHarmony=true;this.engine.play({simulate:true,audible:true});}const control=globalThis.__listeningControl;if(control)this.listeningPort.onmessage?.({data:{notes:control.chordNotes,phrase:control.phrase}});return super.process(inputs,outputs);} }\nregisterProcessor("orbit-engine",ListeningOrbit);`,
 'grain-worklet.js':`class ListeningGrain extends GrainEngine { constructor(options){super(options);this.listeningPort={onmessage:null};this.port.onmessage({data:{type:"phrasePort",port:this.listeningPort}});${observe}} process(inputs,outputs){if(!this.listeningStarted&&currentFrame>=6144){this.listeningStarted=true;this.playing=true;}const control=globalThis.__listeningControl;if(control)this.listeningPort.onmessage?.({data:{phrase:control.phrase}});return super.process(inputs,outputs);} }\nregisterProcessor("grain-engine",ListeningGrain);`
};
const manifest={schema:1,baseline,grainSeed:26025,controlDelivery:'Fixture-only transport starts at frame6144, per-block delivery of production harmony/phrase payloads and acknowledged snapshots at suspended graph barriers; production asynchronous MessagePorts require separate integration checks.',sourceFiles:{},outputs:{}};
for(const [label,sourceRoot] of [['baseline',baselineRoot],['current',root]]){
 const outdir=path.join(scratch,'build',label);await mkdir(outdir,{recursive:true});
 const fixture=path.join(scratch,label+'-config.mjs');
 await writeFile(fixture,`export {selectPiecePreset} from ${JSON.stringify(path.join(sourceRoot,'dist/piece-presets.mjs'))};\nexport {createOrbitAudio} from ${JSON.stringify(path.join(sourceRoot,'dist/orbit-audio.mjs'))};\nexport {createPieceSpace} from ${JSON.stringify(path.join(sourceRoot,'dist/piece-space.mjs'))};\nexport {piecePlayback} from ${JSON.stringify(path.join(sourceRoot,'dist/piece-session.mjs'))};\nexport {TAPE_DEFAULTS} from ${JSON.stringify(path.join(sourceRoot,'dist/tape-settings.mjs'))};\n`);
 const entries={config:fixture};for(const name of ['ambient','orbit','grain','tape'])entries[name+'-worklet']=path.join(sourceRoot,`dist/${name}-worklet.js`);
 const result=await build({entryPoints:entries,outdir,bundle:true,format:'esm',platform:'browser',target:['safari15.4','chrome100'],metafile:true,write:true,plugins:[{name:'controlled-listening-fixture',setup(b){
  b.onResolve({filter:/^\.\/.*\?v=/},args=>({path:path.resolve(args.resolveDir,args.path.split('?')[0])}));
  b.onLoad({filter:/(ambient|orbit|grain)-worklet\.js$/},async args=>{
   let source=await readFile(args.path,'utf8');const name=path.basename(args.path);
   if(name==='grain-worklet.js')source=`let listeningSeed=26025;function listeningRandom(){listeningSeed=(Math.imul(listeningSeed,1664525)+1013904223)>>>0;return listeningSeed/4294967296;}\n`+source.replaceAll('Math.random()','listeningRandom()');
   const processor={'ambient-worklet.js':'ambient-engine','orbit-worklet.js':'orbit-engine','grain-worklet.js':'grain-engine'}[name];
   const pattern=new RegExp(`registerProcessor\\(["']${processor}["'],\\s*\\w+\\);`);
   if(!pattern.test(source))throw new Error('Cannot instrument fixture registration: '+name);
   return {contents:source.replace(pattern,hooks[name]),loader:'js',resolveDir:path.dirname(args.path)};
  });
 }}],logLevel:'warning'});
 for(const file of Object.keys(result.metafile.inputs))manifest.sourceFiles[label+'/'+path.relative(sourceRoot,file)]=sha(await readFile(file));
 for(const file of Object.keys(result.metafile.outputs))manifest.outputs[label+'/'+path.basename(file)]=sha(await readFile(file));
}
manifest.fixtureHash=sha(JSON.stringify({sourceFiles:manifest.sourceFiles,outputs:manifest.outputs,grainSeed:manifest.grainSeed,controlDelivery:manifest.controlDelivery}));
await writeFile(path.join(scratch,'build/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Listening fixture prepared: '+manifest.fixtureHash+'\nStart node ops/listening-server.mjs, then open /qa-musicality.html.');
