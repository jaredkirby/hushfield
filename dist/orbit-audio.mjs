// Independent bank effects feed the shared master tape. Auditions bypass the optional layer fader.
export function createOrbitAudio(ctx,destination,state,auditionDestination){
  const voices=new Set(),buses={},auditionBuses={};
  const noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),noiseData=noise.getChannelData(0);
  let seed=893;for(let i=0;i<noiseData.length;i++){seed=(seed*1664525+1013904223)>>>0;noiseData[i]=seed/2147483648-1;}
  function makeBus(destination){
    const output=ctx.createGain(),dry=ctx.createGain(),delay=ctx.createDelay(2),feedback=ctx.createGain(),delayReturn=ctx.createGain(),reverb=ctx.createConvolver(),reverbReturn=ctx.createGain();
    dry.gain.value=.75;delayReturn.gain.value=.5;reverbReturn.gain.value=.55;
    dry.connect(output);delay.connect(feedback);feedback.connect(delay);delay.connect(delayReturn);delayReturn.connect(output);reverb.connect(reverbReturn);reverbReturn.connect(output);output.connect(destination);
    return {output,dry,delay,feedback,reverb,room:0};
  }
  for(const bank of ['triggers','balls'])buses[bank]=makeBus(destination);
  function sync(next){
    state=next;
    for(const bank of ['triggers','balls']){
      const bus=buses[bank],settings=state[bank],fx=settings.effects;
      bus.delay.delayTime.setTargetAtTime(fx.delayTime,ctx.currentTime,.03);
      bus.feedback.gain.setTargetAtTime(fx.feedback/100,ctx.currentTime,.03);
      const enabled=settings.base.enabled||Object.values(settings.items).some(item=>item.enabled===true);
      bus.output.gain.setTargetAtTime(enabled?1:0,ctx.currentTime,.015);
      if(bus.room!==fx.reverbTime){
        bus.room=fx.reverbTime;const n=Math.round(ctx.sampleRate*fx.reverbTime),ir=ctx.createBuffer(2,n,ctx.sampleRate);
        let random=341;for(let ch=0;ch<2;ch++){const data=ir.getChannelData(ch);for(let i=0;i<n;i++){random=(random*1664525+1013904223)>>>0;data[i]=(random/2147483648-1)*(1-i/n)**3*Math.min(1,i/200);}}
        bus.reverb.buffer=ir;
      }
      const audition=auditionBuses[bank];if(audition){audition.delay.delayTime.setTargetAtTime(fx.delayTime,ctx.currentTime,.03);audition.feedback.gain.setTargetAtTime(fx.feedback/100,ctx.currentTime,.03);if(audition.reverb.buffer!==bus.reverb.buffer)audition.reverb.buffer=bus.reverb.buffer;audition.output.gain.setTargetAtTime(enabled?1:0,ctx.currentTime,.015);}
    }
  }
  function releaseVoice(voice){
    const now=ctx.currentTime,held=voice.start>now?0:Math.min(voice.peak,Math.max(0,voice.gain.gain.value));
    voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setValueAtTime(held,now);voice.gain.gain.linearRampToValueAtTime(0,now+.02);voice.source.stop(now+.03);voices.delete(voice);
  }
  function stop(bank,index){
    for(const voice of voices){if(bank&&voice.bank!==bank||index!==undefined&&voice.index!==index)continue;releaseVoice(voice);}
  }
  function play(bank,index,midi,p,audition=false){
    if((ctx.state!=='running'&&typeof ctx.startRendering!=='function')||!p.enabled||p.level<=0)return false;
    const inBank=[...voices].filter(v=>v.bank===bank);
    if(inBank.length>=24){releaseVoice(inBank[0]);}
    const now=ctx.currentTime+.008,frequency=440*2**((midi-69)/12),source=p.wave==='noise'?ctx.createBufferSource():ctx.createOscillator();
    if(p.wave==='noise'){source.buffer=noise;source.loop=true;}else{source.type=p.wave;source.frequency.value=frequency;}
    const filter=ctx.createBiquadFilter(),shaper=ctx.createWaveShaper(),gain=ctx.createGain(),pan=ctx.createStereoPanner(),delaySend=ctx.createGain(),reverbSend=ctx.createGain();
    filter.type='lowpass';filter.frequency.value=Math.min(p.cutoff,ctx.sampleRate*.46);filter.Q.value=p.resonance;pan.pan.value=p.pan/100;delaySend.gain.value=p.delaySend/100;reverbSend.gain.value=p.reverbSend/100;
    if(p.drive){const amount=1+p.drive/100*6,curve=new Float32Array(512);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=Math.tanh(x*amount)/Math.tanh(amount);}shaper.curve=curve;}
    const peak=p.level/100*.18,sustain=Math.max(.00001,peak*p.sustain/100),held=now+p.attack+p.decay+p.gate,end=held+p.release;
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(peak,now+p.attack);gain.gain.linearRampToValueAtTime(sustain,now+p.attack+p.decay);gain.gain.setValueAtTime(sustain,held);gain.gain.exponentialRampToValueAtTime(.00001,end);
    const nodes=[source,filter,shaper,gain,pan,delaySend,reverbSend];let mod;
    if(p.wave!=='noise'&&p.fmAmount){mod=ctx.createOscillator();const depth=ctx.createGain();mod.frequency.value=frequency*p.fmRatio;depth.gain.setValueAtTime(frequency*p.fmAmount/100,now);depth.gain.exponentialRampToValueAtTime(.01,end);mod.connect(depth);depth.connect(source.frequency);mod.start(now);mod.stop(end+.05);nodes.push(mod,depth);}
    source.connect(filter);filter.connect(shaper);shaper.connect(gain);gain.connect(pan);let bus=buses[bank];if(audition&&auditionDestination){if(!auditionBuses[bank]){auditionBuses[bank]=makeBus(auditionDestination);auditionBuses[bank].reverb.buffer=bus.reverb.buffer;auditionBuses[bank].delay.delayTime.value=state[bank].effects.delayTime;auditionBuses[bank].feedback.gain.value=state[bank].effects.feedback/100;}bus=auditionBuses[bank];}pan.connect(bus.dry);pan.connect(delaySend);delaySend.connect(bus.delay);pan.connect(reverbSend);reverbSend.connect(bus.reverb);source.start(now);source.stop(end+.05);
    const voice={bank,index,source,gain,start:now,peak};voices.add(voice);source.onended=()=>{voices.delete(voice);if(mod){try{mod.stop();}catch{}}for(const node of nodes)node.disconnect();};return true;
  }
  sync(state);return {voices,play,sync,stop,stopAll:()=>stop()};
}
