const uiSteps={position:1,size:25,density:1,spray:5,pitch:1,range:5,wander:5,speed:.05,smooth:5,static:5,jump:5,hold:5,reverse:5,elastic:5,chaos:5,trimStart:1,trimEnd:1,denoise:5,cutoff:100,resonance:.2,delayTime:.05,feedback:5,delayMix:5,reverb:5,width:5,drive:5,wow:5,flutter:5,hiss:5,tapeTone:5,orbitTriggers:1,orbitBalls:1,orbitGravity:5,orbitBounce:5,orbitSpin:1,orbitRotation:5,orbitOctave:1,orbitAttack:.01,orbitRelease:.1,orbitReverb:5,orbitVolume:5};
export const phoneStepFor=(id,fallback)=>uiSteps[id]??fallback;
export function incrementValue(value,direction,step,min,max){const result=Number(value)+Math.sign(direction)*Number(step);return Math.round(Math.max(Number(min),Math.min(Number(max),result))*1e6)/1e6;}

const records=[];let selected,rail;
const labelOf=r=>typeof r.label==='function'?r.label():r.label;
function bounds(r){return r.input.tagName==='SELECT'?[0,r.input.options.length-1,r.input.selectedIndex]:[+r.input.min,+r.input.max,+r.input.value];}
function refreshRail(){if(!rail)return;const [min,max,value]=selected?bounds(selected):[0,0,0];rail.label.textContent=selected?labelOf(selected):'Select a value';rail.value.textContent=selected?selected.format(+selected.input.value):'—';rail.down.disabled=!selected||value<=min;rail.up.disabled=!selected||value>=max;}
function selectRecord(record){selected=record;for(const r of records){r.parent.classList.toggle('adjust-selected',r===record);r.button.setAttribute('aria-pressed',String(r===record));}refreshRail();}
export function ensureVisibleSelection(){const visible=r=>r.button.getBoundingClientRect().height>0;if(!selected||!visible(selected)){const next=records.find(r=>r.input.id!=='volume'&&visible(r))||records.find(visible);if(next)selectRecord(next);else{selected=undefined;refreshRail();}}else refreshRail();}
export function attachStepper(parent,input,{label,step=1,format=v=>String(v)}){
  const button=document.createElement('button'),value=document.createElement('span'),track=document.createElement('i'),fill=document.createElement('i');button.type='button';button.className='parameter-value';value.className='parameter-readout';value.id=input.id+'Readout';button.setAttribute('aria-describedby',value.id);track.className='value-track';track.setAttribute('aria-hidden','true');track.append(fill);button.append(value,track);parent.append(button);parent.classList.add('selectable-control');
  const record={parent,input,label,step,format,button};records.push(record);
  const render=()=>{value.textContent=format(+input.value);button.setAttribute('aria-label','Select '+labelOf(record));const [min,max,n]=bounds(record);fill.style.transform=`scaleX(${max===min?0:(n-min)/(max-min)})`;if(selected===record)refreshRail();};
  parent.addEventListener('click',()=>selectRecord(record));button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();selectRecord(record);changeSelected(event.key==='ArrowRight'?1:-1);}});input.addEventListener('input',render);input.addEventListener('change',render);render();return {render,element:button};
}
function changeSelected(direction){if(!selected)return;const r=selected;if(r.input.tagName==='SELECT'){r.input.selectedIndex=Math.max(0,Math.min(r.input.options.length-1,r.input.selectedIndex+direction));r.input.dispatchEvent(new Event('change',{bubbles:true}));}else{r.input.value=incrementValue(r.input.value,direction,r.step,r.input.min,r.input.max);r.input.dispatchEvent(new Event('input',{bubbles:true}));}refreshRail();}
export function setupSharedAdjuster(){
  document.body.classList.add('common-controls');const bar=document.createElement('div');bar.id='adjustBar';bar.className='shared-adjuster';bar.setAttribute('role','group');bar.setAttribute('aria-label','Selected value adjustment');
  const down=document.createElement('button'),up=document.createElement('button'),middle=document.createElement('div'),label=document.createElement('span'),value=document.createElement('output');down.type=up.type='button';down.textContent='−';up.textContent='+';down.setAttribute('aria-label','Decrease selected value');up.setAttribute('aria-label','Increase selected value');label.id='adjustLabel';value.id='adjustValue';middle.append(label,value);bar.append(down,middle,up);document.querySelector('.transport').append(bar);rail={bar,down,up,label,value};
  for(const [button,direction] of [[down,-1],[up,1]]){let delay,repeat,repeated=false;const stop=()=>{clearTimeout(delay);clearInterval(repeat);};button.addEventListener('pointerdown',event=>{if(event.button!==0||button.disabled)return;repeated=false;button.setPointerCapture(event.pointerId);delay=setTimeout(()=>{repeated=true;changeSelected(direction);repeat=setInterval(()=>{if(button.disabled){stop();return;}changeSelected(direction);},90);},350);});button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',()=>{stop();repeated=false;});button.addEventListener('lostpointercapture',stop);button.addEventListener('blur',stop);button.addEventListener('click',()=>{if(repeated){repeated=false;return;}changeSelected(direction);});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});}
  ensureVisibleSelection();
}
export function panelNav(owner,labels,onChange,{className='phone-panel-tabs',ariaLabel='Control pages'}={}){
  const nav=document.createElement('nav');nav.className=className;nav.setAttribute('aria-label',ariaLabel);
  const activate=key=>{owner.dataset.controlPanel=key;nav.querySelectorAll('button').forEach(button=>{const active=button.dataset.panelKey===key;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});onChange?.(key);ensureVisibleSelection();};
  for(const [key,label]of labels){const button=document.createElement('button');button.type='button';button.dataset.panelKey=key;button.textContent=label;button.addEventListener('click',()=>activate(key));nav.append(button);}
  owner.prepend(nav);activate(labels[0][0]);return {nav,activate};
}
export function setupPhoneUI({showPage,currentPage}){
  const settings=document.querySelector('.orbit-settings');settings.id='orbitSettings';
  for(const name of ['orbit-shape-tools','orbit-spin-tools'])document.querySelector('.'+name).dataset.panel='motion';
  for(const control of document.querySelectorAll('#orbitControls .control'))control.dataset.panel='motion';
  const panels=panelNav(settings,[['motion','Motion'],['triggers','Triggers'],['balls','Balls']],key=>{document.querySelector('.orbit-layout').dataset.controlPanel=key;},{className:'orbit-panel-tabs',ariaLabel:'ORBIT control pages'});
  const scatter=document.createElement('button');scatter.type='button';scatter.className='phone-scatter';scatter.textContent='↻ Scatter';scatter.addEventListener('click',()=>document.getElementById('resetBalls').click());document.querySelector('.orbit-spin-tools').append(scatter);
  for(const pageId of ['grainPage','fxPage']){const page=document.getElementById(pageId),groups=[...page.querySelectorAll('.control-group')];panelNav(page,groups.map((group,i)=>[String(i),group.querySelector('h3').textContent]),key=>groups.forEach((group,i)=>group.classList.toggle('phone-selected',String(i)===key)));}
  const about=document.createElement('button');about.type='button';about.className='phone-about';about.textContent='ⓘ';about.setAttribute('aria-label','About Hushfield');about.addEventListener('click',()=>document.getElementById('aboutBtn').click());document.querySelector('.head-actions').append(about);
  // Keep one source editor in every layout; moving it between parents on resize
  // can disrupt an active select, recording or keyboard focus on iPad.
  document.getElementById('samplePage').prepend(document.querySelector('.source-panel'));
  const update=()=>{const phone=document.body.classList.contains('phone-ui');document.getElementById('saveProject').textContent=phone?'Save':'Save project';document.getElementById('loadProject').textContent=phone?'Load':'Load project';document.body.dataset.page=currentPage();ensureVisibleSelection();};
  window.addEventListener('hushfield:layoutchange',update);window.HushfieldViewport?.refresh();update();if(document.body.classList.contains('phone-ui')&&!location.hash)showPage('ambient');return panels.activate;
}
