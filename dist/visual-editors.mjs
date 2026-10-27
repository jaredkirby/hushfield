import {clamp, cutoffToUnit, trimAt, grainBounds, grainSizeFromDrag, spaceAt, echoAt, responsePath, echoRepeatPath} from './visual-editor-math.mjs';

/** Direct controls over existing parameters. refresh() is driven by the app's edits,
 * page changes and source changes; this module never starts an animation/audio loop. */
export function setupVisualEditors({getParams, setParams, getPage, getDuration, getSource, getFilterType = () => 'lowpass', onGestureStart, onGestureEnd}) {
  const stage = document.getElementById('displayStage');
  if (!stage) throw new Error('Visual editors require setupDisplay first.');
  const listeners = [], nodes = [];
  let gesture = null, page = getPage(), refreshing = false;
  const listen = (el, type, fn, options) => { el.addEventListener(type, fn, options); listeners.push(() => el.removeEventListener(type, fn, options)); };
  const mount = (parent, tag, className, html) => {
    const el = document.createElement(tag); el.className = className; el.innerHTML = html; parent.append(el); nodes.push(el); return el;
  };
  const notify = (kind, detail) => {
    const callback = kind === 'start' ? onGestureStart : onGestureEnd;
    if (callback) callback(detail);
    else document.dispatchEvent(new CustomEvent(`hushfield:edit${kind}`, {detail}));
  };
  const apply = patch => { setParams(patch); refresh(); };
  function finish(cancelled = false) {
    if (!gesture) return;
    const old = gesture; gesture = null;
    if (old.element.hasPointerCapture?.(old.pointerId)) old.element.releasePointerCapture(old.pointerId);
    if (cancelled) apply(old.start);
    notify('end', {...old.detail, cancelled, value: {...getParams()}});
  }
  function begin(element, fields, label, pointerId) {
    if (gesture) finish(true);
    const start = Object.fromEntries(fields.map(key => [key, getParams()[key]]));
    const detail = {id:fields.join(','),label,source:'visual-editor',value:{...start}};
    gesture = {element, pointerId, start, detail}; notify('start', detail);
    return gesture;
  }
  function bindGesture(element, surface, fields, label, map, keyMap) {
    const move = event => {
      if (!gesture || gesture.element !== element || gesture.pointerId !== event.pointerId) return;
      if (getPage() !== page) { finish(true); return; }
      const rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      apply(map({x:(event.clientX-rect.left)/rect.width, y:(event.clientY-rect.top)/rect.height,
        dx:(event.clientX-gesture.clientX)/rect.width, dy:(event.clientY-gesture.clientY)/rect.height, start:gesture.start, target:gesture.target}));
    };
    listen(element, 'pointerdown', event => {
      if (event.button !== 0 || gesture) return;
      event.preventDefault(); event.stopPropagation();
      element.focus({preventScroll:true});
      const started = begin(element,fields,label,event.pointerId);
      Object.assign(started,{clientX:event.clientX,clientY:event.clientY,target:event.target});
      element.setPointerCapture(event.pointerId);
      move(event);
    });
    listen(element,'pointermove',move);
    listen(element,'pointerup',event=>{if(gesture?.element===element && gesture.pointerId===event.pointerId)finish();});
    listen(element,'pointercancel',event=>{if(gesture?.element===element && gesture.pointerId===event.pointerId)finish(true);});
    listen(element,'lostpointercapture',event=>{if(gesture?.element===element && gesture.pointerId===event.pointerId)finish(true);});
    listen(element,'keydown',event=>{
      if (event.key==='Escape') { finish(true); return; }
      const patch = keyMap?.(event, getParams());
      if (!patch) return;
      event.preventDefault(); event.stopPropagation();
      begin(element,fields,label,null); apply(patch); finish();
    });
  }
  const deltaKey = event => ['ArrowRight','ArrowUp'].includes(event.key) ? 1 : ['ArrowLeft','ArrowDown'].includes(event.key) ? -1 : 0;
  const scalarKeys = (key,min,max,step) => (event, p) => {
    const direction = deltaKey(event);
    if (event.key==='Home') return {[key]:min};
    if (event.key==='End') return {[key]:max};
    return direction ? {[key]:clamp(p[key]+direction*step*(event.shiftKey?10:1),min,max)} : null;
  };
  const scalarAria = (el,label,value,min,max,text) => {
    el.setAttribute('aria-label',label); el.setAttribute('aria-valuemin',min); el.setAttribute('aria-valuemax',max);
    el.setAttribute('aria-valuenow',value); el.setAttribute('aria-valuetext',text);
  };
  const wave = mount(document.getElementById('waveWrap'),'div','visual-wave-editor',`
    <div class="visual-wave-readout"><span class="wave-context"></span><span class="wave-detail"></span></div>
    <div class="visual-wave-plot" tabindex="0" role="group" aria-label="Source position editing surface">
      <div class="grain-scatter-region"></div><div class="grain-window-region"></div>
      <button type="button" class="visual-handle grain-position" role="slider" title="Drag to move read anchor. Arrow keys change position.">POSITION</button>
      <button type="button" class="visual-handle grain-length" role="slider" title="Drag horizontally to resize grain. Arrow keys change length.">LENGTH</button>
      <div class="trim-selection-region"></div>
      <button type="button" class="visual-handle trim-in" role="slider" title="Drag In. Arrow keys adjust the start boundary.">IN</button>
      <button type="button" class="visual-handle trim-out" role="slider" title="Drag Out. Arrow keys adjust the end boundary.">OUT</button>
    </div>`);
  const wavePlot=wave.querySelector('.visual-wave-plot'), position=wave.querySelector('.grain-position'), length=wave.querySelector('.grain-length'), trimIn=wave.querySelector('.trim-in'), trimOut=wave.querySelector('.trim-out');
  const phraseDuration = () => Math.max(.001, getSource()==='foundation' && getPage()!=='sample' ? 4 : Number(getDuration())||4);
  bindGesture(position,wavePlot,['position'],'Move Texture read anchor',({dx,start})=>({position:Math.round(clamp(start.position+dx*100,0,100)*10)/10}),scalarKeys('position',0,100,.5));
  bindGesture(length,wavePlot,['size'],'Resize Texture grain',({dx,start})=>({size:grainSizeFromDrag(start.size,dx,phraseDuration())}),scalarKeys('size',15,1500,10));
  for(const [el,key] of [[trimIn,'trimStart'],[trimOut,'trimEnd']]) {
    bindGesture(el,wavePlot,[key],key==='trimStart'?'Move trim In':'Move trim Out',({dx,start})=>trimAt(getParams(),key,start[key]+dx*100),(event,p)=>{
      const direction=deltaKey(event);
      return direction ? trimAt(p,key,p[key]+direction*(event.shiftKey?1:.1)) : event.key==='Home' ? trimAt(p,key,0) : event.key==='End'?trimAt(p,key,100):null;
    });
  }
  bindGesture(wavePlot,wavePlot,['position','trimStart','trimEnd'],'Choose source position',({x,start,target})=>{
    if(getPage()==='sample') {
      if(!gesture.trimEdge)gesture.trimEdge=Math.abs(x*100-start.trimStart)<=Math.abs(x*100-start.trimEnd)?'trimStart':'trimEnd';
      return trimAt(getParams(),gesture.trimEdge,x*100);
    }
    return {position:Math.round(clamp(x*100,0,100)*10)/10};
  },(event,p)=> getPage()==='sample'?null:scalarKeys('position',0,100,.5)(event,p));
  wavePlot.setAttribute('aria-description','On Texture, drag to choose the read anchor. On trim, drag the nearest boundary; use the In and Out controls for keyboard editing.');

  const space=mount(stage,'section','visual-space-editor',`
    <div class="visual-editor-caption"><span>FILTER SHAPE · CONTROL PREVIEW</span><output class="space-values"></output></div>
    <div class="visual-filter-plot" tabindex="0" role="group" aria-label="Filter response editing surface">
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path class="filter-grid" d="M0,0V100 M261,0V100 M565,0V100 M869,0V100 M1000,0V100 M0,60H1000"/><path class="filter-response"/></svg>
      <button type="button" class="visual-filter-handle" aria-label="Filter cutoff and resonance">+</button>
      <div class="filter-axis"><span>100 Hz</span><span>1k</span><span>20k</span></div>
    </div>
    <div class="visual-space-controls">
      <label><span>STEREO WIDTH <output class="width-value"></output></span><svg class="width-picture" viewBox="0 0 100 14" aria-hidden="true"><path/></svg><input type="range" class="visual-width" min="0" max="100" step="1" aria-label="Stereo width"/></label>
      <label><span>ROOM <output class="room-value"></output></span><svg class="room-picture" viewBox="0 0 100 14" aria-hidden="true"><path/></svg><input type="range" class="visual-room" min="0" max="85" step="1" aria-label="Room amount"/></label>
    </div>`);
  const filterPlot=space.querySelector('.visual-filter-plot'), filterHandle=space.querySelector('.visual-filter-handle');
  const filterKeys=(event,p)=>{
    if(['ArrowLeft','ArrowRight'].includes(event.key))return {cutoff:spaceAt(cutoffToUnit(p.cutoff)+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?.05:.01),0).cutoff};
    if(['ArrowUp','ArrowDown'].includes(event.key))return {resonance:Math.round(clamp(p.resonance+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?1:.1),.1,12)*10)/10};
    return null;
  };
  bindGesture(filterPlot,filterPlot,['cutoff','resonance'],'Shape shared filter',({x,y})=>spaceAt(x,y),filterKeys);
  bindGesture(filterHandle,filterPlot,['cutoff','resonance'],'Shape shared filter',({dx,dy,start})=>spaceAt(cutoffToUnit(start.cutoff)+dx,1-(start.resonance-.1)/11.9+dy),filterKeys);
  filterHandle.setAttribute('aria-description','Left and right change cutoff logarithmically. Up and down change resonance. Hold Shift for larger changes.');
  function bindRange(input,key,label) {
    listen(input,'pointerdown',event=>{if(!gesture)begin(input,[key],label,event.pointerId);});
    listen(input,'input',()=>{if(!gesture)begin(input,[key],label,null);apply({[key]:Number(input.value)});});
    listen(input,'change',()=>{if(gesture?.element===input)finish();});
    listen(input,'pointerup',()=>{if(gesture?.element===input)finish();});
    listen(input,'pointercancel',()=>{if(gesture?.element===input)finish(true);});
    listen(input,'blur',()=>{if(gesture?.element===input)finish();});
    listen(input,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();finish(true);}});
  }
  bindRange(space.querySelector('.visual-width'),'width','Set stereo width');
  bindRange(space.querySelector('.visual-room'),'reverb','Set room amount');

  const tape=mount(document.getElementById('tapeDeck'),'div','visual-tape-editor',`
    <div class="visual-editor-caption"><span class="echo-status">ECHO GRID · SETTINGS PREVIEW</span><output class="echo-values"></output></div>
    <div class="visual-echo-plot" tabindex="0" role="group" aria-label="Echo spacing and feedback editing surface">
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path class="echo-baseline" d="M0,98H1000"/><path class="echo-repeats"/></svg>
      <button type="button" class="visual-echo-handle" aria-label="Echo spacing and feedback">↔</button>
    </div><div class="echo-axis"><span>0</span><span>TIME ↔ · FEEDBACK ↕ · dB HEIGHT</span><span>1.5 s</span></div>`);
  const echoPlot=tape.querySelector('.visual-echo-plot'), echoHandle=tape.querySelector('.visual-echo-handle');
  echoPlot.setAttribute('aria-description','Repeat heights show relative levels from minus 48 to zero decibels, not measured audio. Drag horizontally for time and vertically for feedback.');
  echoPlot.title='Repeat heights use a −48 to 0 dB relative scale, making quiet repeats visible.';
  const echoKeys=(event,p)=>['ArrowLeft','ArrowRight'].includes(event.key)?{delayTime:Math.round(clamp(p.delayTime+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?.1:.01),.05,1.5)*100)/100}:['ArrowUp','ArrowDown'].includes(event.key)?{feedback:clamp(p.feedback+(event.key==='ArrowUp'?1:-1)*(event.shiftKey?10:1),0,80)}:null;
  bindGesture(echoPlot,echoPlot,['delayTime','feedback'],'Shape tape repeats',({x,y})=>echoAt(x,y),echoKeys);
  bindGesture(echoHandle,echoPlot,['delayTime','feedback'],'Shape tape repeats',({dx,dy,start})=>echoAt(start.delayTime/1.5+dx,1-start.feedback/80+dy),echoKeys);
  echoHandle.setAttribute('aria-description','Left and right change echo time. Up and down change feedback. Hold Shift for larger changes.');

  function refresh() {
    if(refreshing)return;
    refreshing=true;
    try {
      const nextPage=getPage();
      if(nextPage!==page) { finish(true); page=nextPage; }
      const p=getParams(), duration=phraseDuration(), trim=page==='sample';
      wave.dataset.mode=trim?'trim':'grain';
      const bounds=grainBounds(p.position,p.size,duration), band=wave.querySelector('.grain-window-region');
      band.style.left=`${bounds.left*100}%`;band.style.width=`${(bounds.right-bounds.left)*100}%`;
      const scatter=wave.querySelector('.grain-scatter-region'), spread=p.spray/100;
      scatter.style.left=`${clamp(bounds.center-spread/2,0,1)*100}%`;scatter.style.right=`${(1-clamp(bounds.center+spread/2,0,1))*100}%`;
      position.style.left=`clamp(24px, ${p.position}%, calc(100% - 24px))`;
      length.style.left=`clamp(24px, ${bounds.right*100}%, calc(100% - 24px))`;
      length.textContent=`${Math.round(p.size)} ms`;
      scalarAria(position,'Texture read anchor',p.position,0,100,`${p.position.toFixed(1)} percent`);
      scalarAria(length,'Grain length',p.size,15,1500,`${Math.round(p.size)} milliseconds`);
      trimIn.style.left=`clamp(20px, ${p.trimStart}%, calc(100% - 20px))`;
      trimOut.style.left=`clamp(20px, ${p.trimEnd}%, calc(100% - 20px))`;
      scalarAria(trimIn,'Trim In',p.trimStart,0,p.trimEnd-.1,`${(duration*p.trimStart/100).toFixed(2)} seconds`);
      scalarAria(trimOut,'Trim Out',p.trimEnd,p.trimStart+.1,100,`${(duration*p.trimEnd/100).toFixed(2)} seconds`);
      const selection=wave.querySelector('.trim-selection-region'); selection.style.left=`${p.trimStart}%`;selection.style.width=`${p.trimEnd-p.trimStart}%`;
      wave.querySelector('.wave-context').textContent=trim?`IN ${(duration*p.trimStart/100).toFixed(2)} s → OUT ${(duration*p.trimEnd/100).toFixed(2)} s`:`SOURCE SCOPE · SCAN ${p.scanOn?'ON':'OFF'}`;
      wave.querySelector('.wave-detail').textContent=trim?`${(duration*(p.trimEnd-p.trimStart)/100).toFixed(2)} s selected`:`${p.density}/s · ${(p.density*p.size/1000).toFixed(1)} overlap`;
      wavePlot.setAttribute('aria-label',trim?'Trim source: drag nearest In or Out boundary':'Texture source: drag to set read anchor');
      space.querySelector('.filter-response').setAttribute('d',responsePath(getFilterType(),p.cutoff,p.resonance));
      filterHandle.style.left=`${cutoffToUnit(p.cutoff)*100}%`;filterHandle.style.top=`${(1-(p.resonance-.1)/11.9)*100}%`;
      filterHandle.setAttribute('aria-label',`Filter cutoff ${Math.round(p.cutoff)} hertz, resonance ${p.resonance.toFixed(1)}. Arrow keys adjust.`);
      space.querySelector('.space-values').value=`${p.cutoff>=1000?(p.cutoff/1000).toFixed(1)+'k':Math.round(p.cutoff)} Hz · Q ${p.resonance.toFixed(1)}`;
      space.querySelector('.visual-width').value=p.width;space.querySelector('.visual-room').value=p.reverb;
      space.querySelector('.visual-width').style.setProperty('--visual-range-fill',`${p.width}%`);
      space.querySelector('.visual-room').style.setProperty('--visual-range-fill',`${p.reverb/85*100}%`);
      space.querySelector('.width-value').value=`${p.width}%`;space.querySelector('.room-value').value=`${p.reverb}%`;
      space.querySelector('.width-picture path').setAttribute('d',`M50,14L${50-p.width*.45},1 M50,14L${50+p.width*.45},1 M${50-p.width*.45},1H${50+p.width*.45}`);
      space.querySelector('.room-picture path').setAttribute('d',Array.from({length:5},(_,i)=>{const x=5+i*20,y=13-p.reverb/85*(13-i*2);return `M${x},14V${y}H${x+10}V14`;}).join(' '));
      echoHandle.style.left=`${p.delayTime/1.5*100}%`;echoHandle.style.top=`${(1-p.feedback/80)*100}%`;
      echoHandle.setAttribute('aria-label',`Echo time ${p.delayTime.toFixed(2)} seconds, feedback ${p.feedback} percent. Arrow keys adjust.`);
      tape.querySelector('.echo-values').value=`${p.delayTime.toFixed(2)} s · ${p.feedback}%`;
      tape.querySelector('.echo-status').textContent=p.tapeOn?'ECHO GRID · SETTINGS PREVIEW':'ECHO GRID · TAPE BYPASSED';
      tape.dataset.bypassed=String(!p.tapeOn);
      tape.querySelector('.echo-repeats').setAttribute('d',echoRepeatPath(p.delayTime,p.feedback,p.delayMix));
    } finally {refreshing=false;}
  }
  listen(document,'keydown',event=>{if(event.key==='Escape'&&gesture){event.preventDefault();finish(true);}});
  listen(window,'blur',()=>finish(true));
  const observer=new MutationObserver(()=>{if(getPage()!==page)refresh();});
  observer.observe(document.body,{attributes:true,attributeFilter:['data-page']});
  refresh();
  return {refresh,cancel(){finish(true);},destroy(){finish(true);observer.disconnect();listeners.forEach(remove=>remove());nodes.forEach(node=>node.remove());}};
}
