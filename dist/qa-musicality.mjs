import {encodeWav} from './wave-file.mjs';
const $=id=>document.getElementById(id),delay=()=>new Promise(resolve=>setTimeout(resolve,0));
const labels={baseline:'A · Original baseline',motion:'B · Motion instruments only',foundation:'C · Foundation expression only',full:'D · Full expressive Piece',arc:'E · Full development arc'};
const sha=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
function pcmStats(buffer){let energy=0,peak=0,step=0;for(let ch=0;ch<2;ch++){const values=buffer.getChannelData(ch);let previous=0;for(const value of values){if(!Number.isFinite(value))throw new Error('Non-finite browser PCM');energy+=value*value;peak=Math.max(peak,Math.abs(value));step=Math.max(step,Math.abs(value-previous));previous=value;}}return {rms:Math.sqrt(energy/(buffer.length*2)),peak,maxStep:step,frames:buffer.length,sampleRate:buffer.sampleRate,duration:buffer.duration};}
const defaults=tape=>({sampleLevel:100,orbitLevel:100,position:50,size:320,density:18,spray:24,pitch:0,scanOn:true,scanMode:'forward',range:100,wander:10,speed:.22,smooth:0,static:0,jump:0,hold:0,reverse:15,elastic:0,chaos:0,freeze:false,cutoff:14000,resonance:.6,...tape,reverb:30,width:75,orbitBalls:5,orbitTriggers:8,orbitGravity:35,orbitBounce:84,orbitSpin:12,orbitRotation:0});
function ready(node){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Worklet startup timed out')),5000);node.port.addEventListener('message',({data})=>{if(data.type==='ready'){clearTimeout(timeout);resolve();}});node.port.start();});}
let snapshotId=0;
function snapshot(node){return new Promise((resolve,reject)=>{const id=++snapshotId,timeout=setTimeout(()=>reject(new Error('Audio snapshot timed out')),5000);const receive=({data})=>{if(data.type==='listeningSnapshot'&&data.id===id){node.port.removeEventListener('message',receive);clearTimeout(timeout);resolve(data.state);}};node.port.addEventListener('message',receive);node.port.postMessage({type:'listeningSnapshot',id});});}
async function renderOne(variant,seconds,preset,modules,fixture){
 const baseline=modules.baseline,current=modules.current,modernFoundation=['foundation','full'].includes(variant),modernMotion=['motion','full'].includes(variant),modernSpace=variant==='full';
 const original=baseline.selectPiecePreset(preset,{defaults:defaults(baseline.TAPE_DEFAULTS),cancelPending(){}}),candidate=current.selectPiecePreset(preset,{defaults:defaults(current.TAPE_DEFAULTS),cancelPending(){}});
 const params=modernSpace?candidate.params:original.params,settings={...(modernFoundation?candidate.ambient:original.ambient),seed:26025,compositionVersion:modernFoundation?2:1};
 const patchState=modernMotion?candidate.soundState:original.soundState,piece={...original.piece,foundation:80,texture:30,motion:25,source:'foundation',followHarmony:true};
 const rate=48000,context=new OfflineAudioContext(2,Math.ceil((seconds+1)*rate),rate),worklet=(name,modern)=>`./.listening/${modern?'current':'baseline'}/${name}-worklet.js?fixture=${fixture.fixtureHash}`;
 for(const [name,modern] of [['ambient',modernFoundation],['grain',modernFoundation],['orbit',modernMotion],['tape',modernSpace]])await context.audioWorklet.addModule(worklet(name,modern));
 const limiter=context.createDynamicsCompressor();Object.assign(limiter.threshold,{value:-8});limiter.knee.value=10;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.15;
 const master=context.createGain();master.gain.value=.8;limiter.connect(master);master.connect(context.destination);
 const tape=new AudioWorkletNode(context,'tape-delay',{numberOfInputs:1,outputChannelCount:[2],processorOptions:{params}});tape.connect(limiter);
 const graph=modernSpace?current:baseline,space=graph.createPieceSpace(context,tape);space.setWidth(params.width);space.wet.gain.value=params.reverb/100;
 if(space.setTone)space.setTone('lowpass',params.cutoff,params.resonance);else{space.filter.type='lowpass';space.filter.frequency.value=params.cutoff;space.filter.Q.value=params.resonance;}
 if(space.setDepth)space.setDepth(modernSpace?{spaceVersion:2,foundationRoom:22,textureRoom:65,motionRoom:30,roomLow:180,roomHigh:7500,...params}:{spaceVersion:1});
 const gains={};for(const kind of ['foundation','texture','motion']){gains[kind]=context.createGain();gains[kind].gain.value=0;gains[kind].connect(space.parts?.[kind]||space.input);}
 const foundation=new AudioWorkletNode(context,'ambient-engine',{numberOfInputs:0,outputChannelCount:[2],processorOptions:{settings}});
 const texture=new AudioWorkletNode(context,'grain-engine',{numberOfInputs:1,outputChannelCount:[2],processorOptions:{source:'foundation',playing:false,params:{...params,width:100,position:params.position/100}}});
 foundation.connect(gains.foundation);foundation.connect(texture);texture.connect(gains.texture);
 let motionReady;const motionPromise=new Promise(resolve=>motionReady=resolve),audio=(modernMotion?current:baseline).createOrbitAudio(context,gains.motion,patchState,space.parts?.motion||space.input,{options:{points:0,rpm:params.orbitSpin,orientation:params.orbitRotation,gravity:params.orbitGravity,bounce:params.orbitBounce,balls:params.orbitBalls,triggers:params.orbitTriggers},onReady:motionReady});
 let status={};foundation.port.addEventListener('message',({data})=>{if(!data.type)status=data;});
 const readiness=Promise.all([ready(foundation),ready(texture),ready(tape),motionPromise]);
 const first=context.suspend(.128),render=context.startRendering();await first;await readiness;await Promise.all([snapshot(foundation),snapshot(texture),snapshot(audio.node)]);const start=context.currentTime;
 const phases=[];async function update(){status=await snapshot(foundation);const playback=(modernFoundation?current:baseline).piecePlayback(piece,true,null,status.phrase);for(const kind of Object.keys(gains))gains[kind].gain.setTargetAtTime(playback[kind],context.currentTime,.08);if(status.phrase)phases.push({at:context.currentTime-start,...status.phrase});}
 await update();
 for(let elapsed=.25;elapsed<seconds;elapsed+=.25){const pause=context.suspend(start+elapsed);await context.resume();await pause;await update();if(Math.floor(elapsed)%10===0&&Math.abs(elapsed-Math.round(elapsed))<.001)$('status').textContent=`Rendering ${labels[variant]} · ${Math.round(elapsed)} / ${seconds} seconds`;}
 await context.resume();const whole=await render,buffer=new AudioBuffer({length:seconds*rate,numberOfChannels:2,sampleRate:rate}),offset=Math.round(start*rate);
 for(let ch=0;ch<2;ch++)buffer.copyToChannel(whole.getChannelData(ch).subarray(offset,offset+buffer.length),ch);
 const stats=pcmStats(buffer);if(stats.peak>=.999||stats.rms<.00001)throw new Error('Rendered output is clipped or silent: '+variant);
 return {variant,buffer,stats,rawHash:await sha(encodeWav(buffer)),settings,params,piece,phases,patches:patchState,graph:{foundation:modernFoundation?'current':'baseline',motion:modernMotion?'current':'baseline',space:modernSpace?'current':'baseline'}};
}
async function save(name,bytes){const response=await fetch('/.listening-save/'+name,{method:'POST',headers:{'Content-Type':name.endsWith('.json')?'application/json':'audio/wav'},body:bytes});if(!response.ok)throw new Error('Saving local artifact failed: '+response.status);}
function appendPlayer(variant,filename){
 const article=document.createElement('article'),title=document.createElement('strong'),player=document.createElement('audio'),link=document.createElement('a');title.textContent=labels[variant];player.controls=true;player.preload='none';player.src='/.listening-artifacts/'+filename;link.href=player.src;link.download=filename;link.textContent='Download WAV';player.onplay=()=>document.querySelectorAll('audio').forEach(other=>{if(other!==player)other.pause();});article.append(title,player,link);$('players').append(article);
}
async function loadSaved(){try{const response=await fetch('/.listening-artifacts/'+$('preset').value+'-receipt.json');if(!response.ok)throw new Error('Render this Piece first.');const receipt=await response.json();$('players').replaceChildren();for(const result of receipt.variants)appendPlayer(result.variant,result.file);$('receipt').textContent=JSON.stringify(receipt,null,2);$('status').textContent=`Saved comparison ready · ${receipt.seconds}-second examples and ${receipt.arc}-second arc. Human listening preference remains open.`;}catch(error){$('status').textContent=error.message;}}
async function run({seconds=75,arc=180,repeat=true}={}){
 $('saved').disabled=$('render').disabled=$('quick').disabled=true;$('players').replaceChildren();document.body.dataset.result='running';
 try{
  const response=await fetch('./.listening/manifest.json');if(!response.ok)throw new Error('Prepare the listening fixture and use listening-server.mjs.');const fixture=await response.json();
  const [baseline,current]=await Promise.all(['baseline','current'].map(label=>import(`./.listening/${label}/config.js?fixture=${fixture.fixtureHash}`))),modules={baseline,current},preset=$('preset').value,results=[];
  for(const variant of ['baseline','motion','foundation','full']){$('status').textContent='Rendering '+labels[variant];results.push(await renderOne(variant,seconds,preset,modules,fixture));}
  const repeats={};if(repeat)for(const variant of ['baseline','full']){
   const repeated=await renderOne(variant,seconds,preset,modules,fixture),first=results.find(r=>r.variant===variant);
   let maxDifference=0,energy=0;for(let ch=0;ch<2;ch++){const a=first.buffer.getChannelData(ch),b=repeated.buffer.getChannelData(ch);for(let i=0;i<a.length;i++){const difference=a[i]-b[i];maxDifference=Math.max(maxDifference,Math.abs(difference));energy+=difference*difference;}}
   // Native WebAudio convolution can differ by a few Float32 rounding bits.
   // Preserve hashes honestly and reject timing/control changes or audible drift.
   const sameControls=JSON.stringify(first.phases)===JSON.stringify(repeated.phases),accepted=sameControls&&maxDifference<=1e-6;
   repeats[variant]={accepted,sameControls,sha256Matches:repeated.rawHash===first.rawHash,firstSha256:first.rawHash,repeatSha256:repeated.rawHash,maxFloatDifference:maxDifference,rmsDifference:Math.sqrt(energy/(first.buffer.length*2)),tolerance:1e-6};
   await save(`${preset}-${variant}-raw-first-${seconds}s.wav`,encodeWav(first.buffer));await save(`${preset}-${variant}-raw-repeat-${seconds}s.wav`,encodeWav(repeated.buffer));
   if(!accepted){await save('repeat-debug.json',JSON.stringify({variant,...repeats[variant],firstPhases:first.phases,secondPhases:repeated.phases},null,2));throw new Error('Repeated audio or controls differ beyond tolerance: '+variant);}
  }
  if(arc){const result=await renderOne('full',arc,preset,modules,fixture);result.variant='arc';results.push(result);}
  const target=Math.min(...results.map(r=>r.stats.rms));const receipt={schema:1,fixture,preset,seconds,arc,seed:26025,blend:{foundation:80,texture:30,motion:25},matching:'Stereo RMS attenuation to quietest raw example; no gain boost. Not perceptual LUFS.',humanListeningAcceptance:'pending',physicalDeviceAcceptance:'pending',repeatability:repeats,variants:[]};
  for(const result of results){const gain=target/result.stats.rms,matched=new AudioBuffer({length:result.buffer.length,numberOfChannels:2,sampleRate:48000});for(let ch=0;ch<2;ch++)matched.copyToChannel(result.buffer.getChannelData(ch).map(v=>v*gain),ch);const bytes=encodeWav(matched),filename=`${preset}-${result.variant}-${result.stats.duration}s.wav`;await save(filename,bytes);receipt.variants.push({variant:result.variant,file:filename,raw:result.stats,playbackGain:gain,matched:pcmStats(matched),sha256:await sha(bytes),rawPcmWavSha256:result.rawHash,settings:result.settings,params:result.params,piece:result.piece,patches:result.patches,graph:result.graph,phrases:result.phases});
   appendPlayer(result.variant,filename);}
  await save(`${preset}-receipt.json`,JSON.stringify(receipt,null,2)+'\n');$('receipt').textContent=JSON.stringify(receipt,null,2);$('status').textContent='PASS · finite unclipped WAVs saved; repeat controls match and PCM differs by less than 0.033 PCM16 steps; examples ready for listening.';document.body.dataset.result='passed';
 }catch(error){$('status').textContent='FAIL · '+error.message;document.body.dataset.result='failed';throw error;}finally{$('saved').disabled=$('render').disabled=$('quick').disabled=false;}
}
$('saved').onclick=loadSaved;
$('render').onclick=()=>run().catch(console.error);$('quick').onclick=()=>run({seconds:3,arc:6}).catch(console.error);
const query=new URLSearchParams(location.search);if(query.has('auto'))run({seconds:Number(query.get('seconds')||3),arc:Number(query.get('arc')||6)}).catch(console.error);
