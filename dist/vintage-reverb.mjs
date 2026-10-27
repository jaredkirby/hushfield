// Independently designed impulse models: a diffused plate tank, dispersive spring
// paths, and a chamber's wall reflections. These approximate families, not devices.
const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : fallback));
function allpass(length, coefficient) {
  const memory = new Float32Array(Math.max(1, length)); let head = 0;
  return input => {
    const delayed = memory[head], output = delayed - coefficient * input;
    memory[head] = input + coefficient * output;
    head = (head + 1) % memory.length;
    return output;
  };
}
function plate(rate, decay, channels) {
  const diffuse = [.0047,.0067,.0093,.0123].map(time => allpass(Math.round(time*rate), .67));
  const delays = [.0311,.0373,.0419,.0437].map(time=>new Float32Array(Math.round(time*rate)));
  const heads = [0,0,0,0], low = [0,0,0,0];
  const feedback = delays.map(buffer=>Math.exp(-6.907755 * buffer.length / rate / decay));
  for(let i=0;i<channels[0].length;i++) {
    let excitation=i===0?1:0;
    for(const scatter of diffuse) excitation=scatter(excitation);
    const tap=delays.map((buffer,j)=>buffer[heads[j]]);
    // Orthogonal scattering exchanges energy among four unequal sheet paths.
    const mixed=[tap[0]+tap[1]+tap[2]+tap[3],tap[0]-tap[1]+tap[2]-tap[3],tap[0]+tap[1]-tap[2]-tap[3],tap[0]-tap[1]-tap[2]+tap[3]];
    for(let j=0;j<4;j++) {
      low[j] += .68 * (mixed[j]*.5-low[j]);
      delays[j][heads[j]] = excitation*.5+low[j]*feedback[j];
      heads[j]=(heads[j]+1)%delays[j].length;
    }
    channels[0][i]=(tap[0]+tap[1]-tap[2]+tap[3])*.25;
    channels[1][i]=(tap[0]-tap[1]+tap[2]+tap[3])*.25;
  }
}
function spring(rate, decay, channels) {
  const paths=[.0353,.0479,.0617].map((time,j)=>({
    delay:new Float32Array(Math.round(time*rate)),head:0,low:0,
    scatter:[.0013,.0027,.0041].map((time,k)=>allpass(Math.round((time+j*.00031)*rate),[.74,-.63,.58][k])),
    feedback:Math.exp(-6.907755*(time+.014)/decay)
  }));
  for(let i=0;i<channels[0].length;i++) {
    for(let j=0;j<paths.length;j++) {
      const path=paths[j];let reflected=path.delay[path.head];
      // Allpass stages conserve magnitude while delaying frequencies unequally.
      // Repeated traversals accumulate dispersion rather than replaying a chirp.
      for(const scatter of path.scatter)reflected=scatter(reflected);
      path.low += .76*(reflected-path.low);
      path.delay[path.head]=(i===0?1:0)+path.low*path.feedback;
      path.head=(path.head+1)%path.delay.length;
      channels[0][i]+=reflected*[.43,.34,-.23][j];
      channels[1][i]+=reflected*[-.21,.46,.33][j];
    }
  }
}
function chamber(rate, decay, channels) {
  let seed=193731;
  for(let ch=0;ch<2;ch++) {
    let low=0;
    for(let i=0;i<channels[ch].length;i++) {
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      low += .24*(seed/2147483648-1-low);
      const time=i/rate;
      channels[ch][i]=low*Math.exp(-6.907755*time/decay)*Math.min(1,Math.max(0,time-.035)/.07)*.15;
    }
    for(const [time,level] of [[.013,.8],[.021,-.56],[.034,.43],[.047,.32],[.069,-.23]]) {
      const index=Math.round((time+ch*.0017)*rate);
      if(index<channels[ch].length)channels[ch][index]+=level;
    }
  }
}
export function generateReverbImpulse(sampleRate, settings={}) {
  const rate=clamp(sampleRate,3000,192000,48000),decay=clamp(settings.reverbDecay,.5,8,3);
  const channels=[new Float32Array(Math.ceil(rate*decay)),new Float32Array(Math.ceil(rate*decay))];
  const model={plate,spring,chamber}[settings.reverbModel]||plate;
  model(rate,decay,channels);
  // Shared stereo scaling preserves the model's channel balance and bounds gain.
  let energy=0;for(const channel of channels)for(const value of channel)energy+=value*value;
  const scale=.8/Math.sqrt(Math.max(energy/2,1e-12));
  for(const channel of channels)for(let i=0;i<channel.length;i++)channel[i]*=scale;
  return channels;
}
