const uiSteps={position:1,size:25,density:1,spray:5,pitch:1,range:5,wander:5,speed:.05,smooth:5,static:5,jump:5,hold:5,reverse:5,elastic:5,chaos:5,trimStart:1,trimEnd:1,denoise:5,cutoff:100,resonance:.2,delayTime:.05,feedback:5,delayMix:5,reverb:5,width:5,drive:5,wow:5,flutter:5,hiss:5,tapeTone:5,orbitTriggers:1,orbitBalls:1,orbitGravity:5,orbitBounce:5,orbitSpin:1,orbitRotation:5,orbitOctave:1,orbitAttack:.01,orbitRelease:.1,orbitReverb:5,orbitVolume:5};
export const phoneStepFor=(id,fallback)=>uiSteps[id]??fallback;
export function incrementValue(value,direction,step,min,max){const result=Number(value)+Math.sign(direction)*Number(step);return Math.round(Math.max(Number(min),Math.min(Number(max),result))*1e6)/1e6;}

const records=[];
let selected,rail,exactDialog;
const labelOf=r=>typeof r.label==='function'?r.label():r.label;
const blocked=r=>r.input.disabled||Boolean(r.parent.closest('[inert]'));
const mixed=r=>r.parent.dataset.mixed==='true';
const editingKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown']);
function bounds(r){
  if(r.choices)return [0,r.choices.length-1,r.choices.findIndex(c=>String(c.value)===r.input.value)];
  return [+r.input.min,+r.input.max,+r.input.value];
}
function refreshRail(){
  if(!rail)return;
  const [min,max,value]=selected?bounds(selected):[0,0,0],disabled=!selected||blocked(selected);
  rail.label.textContent=selected?labelOf(selected):'Select a value';
  rail.value.textContent=selected?(mixed(selected)?'Mixed':selected.format(+selected.input.value)):'—';
  rail.down.disabled=disabled||value<=min;
  rail.up.disabled=disabled||value>=max;
}
function selectRecord(record){
  if(blocked(record))return;
  selected=record;
  for(const r of records)r.parent.classList.toggle('adjust-selected',r===record);
  refreshRail();
}
// Edit events enclose one user gesture, before any value mutation and after its
// final input. They bubble from the control card so history can snapshot the
// instrument, while external input/change events only refresh the displayed UI.
function beginEdit(r,source){
  if(r.editing||blocked(r))return;
  r.editing={source,value:r.input.value};
  r.parent.dispatchEvent(new CustomEvent('hushfield:editstart',{bubbles:true,detail:{id:r.input.id,label:labelOf(r),...r.editing}}));
}
function endEdit(r,cancelled=false){
  if(!r.editing)return;
  const detail={id:r.input.id,label:labelOf(r),source:r.editing.source,value:r.input.value,previousValue:r.editing.value,cancelled};
  r.editing=null;
  r.parent.dispatchEvent(new CustomEvent('hushfield:editend',{bubbles:true,detail}));
}
function dispatchValue(r){
  r.input.dispatchEvent(new Event('input',{bubbles:true}));
  r.input.dispatchEvent(new Event('change',{bubbles:true}));
}
export function ensureVisibleSelection(){
  const visible=r=>!blocked(r)&&r.element.getBoundingClientRect().height>0;
  if(!selected||!visible(selected)){
    const next=records.find(r=>r.input.id!=='volume'&&visible(r))||records.find(visible);
    if(next)selectRecord(next);else{selected=undefined;refreshRail();}
  }else refreshRail();
}
function showExactEntry(r){
  if(blocked(r))return;
  selectRecord(r);
  if(!exactDialog){
    const dialog=document.createElement('dialog');
    dialog.className='direct-value-dialog';
    const form=document.createElement('form'),label=document.createElement('label'),number=document.createElement('input'),hint=document.createElement('p'),preview=document.createElement('output'),actions=document.createElement('div'),cancel=document.createElement('button'),apply=document.createElement('button');
    number.type='number';number.inputMode='decimal';number.id='directExactValue';number.required=true;
    label.htmlFor=number.id;label.id='directExactLabel';dialog.setAttribute('aria-labelledby',label.id);
    hint.id='directExactHint';number.setAttribute('aria-describedby',hint.id);
    cancel.type='button';cancel.textContent='Cancel';apply.type='submit';apply.textContent='Apply';actions.append(cancel,apply);
    form.append(label,number,hint,preview,actions);dialog.append(form);document.body.append(dialog);
    exactDialog={dialog,form,label,number,hint,preview,record:null};
    number.addEventListener('input',()=>{preview.textContent=number.value!==''&&Number.isFinite(number.valueAsNumber)?exactDialog.record.format(number.valueAsNumber):'Enter a value';});
    cancel.addEventListener('click',()=>dialog.close());
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const current=exactDialog.record;
      if(blocked(current)||!number.reportValidity())return;
      beginEdit(current,'exact');current.input.value=number.value;dispatchValue(current);endEdit(current);dialog.close();
    });
    dialog.addEventListener('close',()=>exactDialog.record?.element.focus({preventScroll:true}));
  }
  const {dialog,label,number,hint,preview}=exactDialog;
  exactDialog.record=r;label.textContent=labelOf(r);
  number.min=r.input.min;number.max=r.input.max;number.step=r.input.step||'any';number.value=r.input.value;
  hint.textContent=`Range ${r.input.min} to ${r.input.max}. ${mixed(r)?'Applies to every selected sound.':'The preview shows the musical value.'}`;
  preview.textContent=r.format(+r.input.value);dialog.showModal();number.focus();number.select();
}
/** choices accepts index-backed labels or explicit {value, label} entries. */
export function attachStepper(parent,input,{label,step=1,format=v=>String(v),choices}){
  const nativeSelect=input.tagName==='SELECT';
  const options=nativeSelect?[...input.options].map(option=>({value:option.value,label:option.textContent})):choices?.map((choice,index)=>typeof choice==='object'?choice:{value:index,label:choice});
  const editor=document.createElement('div');editor.className='parameter-editor';
  const button=document.createElement('button'),value=document.createElement('span');
  button.type='button';button.className='parameter-value';value.className='parameter-readout';value.id=input.id+'Readout';button.append(value);
  parent.classList.add('selectable-control','direct-control');parent.append(editor);
  let direct=input;
  if(options){
    input.hidden=true;
    direct=document.createElement('select');direct.className='parameter-choice';direct.id=input.id+'Choice';
    const mixedOption=document.createElement('option');mixedOption.value='';mixedOption.textContent='Mixed values';mixedOption.disabled=true;mixedOption.hidden=true;direct.append(mixedOption);
    for(const choice of options){const option=document.createElement('option');option.value=choice.value;option.textContent=choice.label;direct.append(option);}
    editor.append(direct);
    const existingLabel=parent.querySelector('label');if(existingLabel?.htmlFor===input.id)existingLabel.htmlFor=direct.id;
  }else{
    input.hidden=false;input.classList.add('parameter-range');editor.append(input,button);
  }
  const record={parent,input,label,step,format,button,element:options?direct:button,direct,choices:options};records.push(record);
  const render=()=>{
    const text=mixed(record)?'Mixed':format(+input.value),name=labelOf(record);
    value.textContent=text;button.setAttribute('aria-label',`Enter exact ${name}: ${text}`);button.title='Enter an exact value';
    direct.setAttribute('aria-label',name);direct.setAttribute('aria-valuetext',mixed(record)?'Mixed values; adjust to set all':text);
    // Ancestor inert is inherited natively. Copy only the source's disabled
    // state, otherwise startup's temporary inert would latch these proxies off.
    button.disabled=Boolean(input.disabled);if(options){direct.disabled=Boolean(input.disabled);direct.value=mixed(record)?'':input.value;}
    const [min,max,n]=bounds(record);parent.style.setProperty('--parameter-position',`${Math.max(0,Math.min(100,max===min?0:(n-min)/(max-min)*100))}%`);
    if(selected===record)refreshRail();
  };
  parent.addEventListener('click',()=>selectRecord(record));
  direct.addEventListener('focus',()=>selectRecord(record));
  button.addEventListener('click',()=>showExactEntry(record));
  direct.addEventListener('pointerdown',event=>{if(event.button>0||record.editing?.source==='pointer')return;selectRecord(record);beginEdit(record,'pointer');record.pointerId=event.pointerId;});
  direct.addEventListener('pointerup',event=>{if(!options&&record.pointerId===event.pointerId)endEdit(record);});
  direct.addEventListener('pointercancel',event=>{if(record.pointerId===event.pointerId)endEdit(record,true);});
  direct.addEventListener('lostpointercapture',event=>{if(!options&&record.pointerId===event.pointerId)endEdit(record,true);});
  direct.addEventListener('keydown',event=>{if(options&&event.key==='Escape')endEdit(record,true);else if(editingKeys.has(event.key))beginEdit(record,'keyboard');});
  direct.addEventListener('keyup',event=>{if(editingKeys.has(event.key))endEdit(record);});
  direct.addEventListener('blur',()=>endEdit(record));
  if(!options&&typeof window!=='undefined'){
    window.addEventListener('pointerup',event=>{if(record.editing?.source==='pointer'&&record.pointerId===event.pointerId)endEdit(record);});
    window.addEventListener('pointercancel',event=>{if(record.editing?.source==='pointer'&&record.pointerId===event.pointerId)endEdit(record,true);});
  }
  if(options)direct.addEventListener('change',()=>{
    if(blocked(record))return;
    beginEdit(record,'choice');input.value=direct.value;dispatchValue(record);endEdit(record);
  });
  input.addEventListener('input',render);input.addEventListener('change',render);
  if(typeof MutationObserver!=='undefined')new MutationObserver(render).observe(input,{attributes:true,attributeFilter:['disabled']});
  render();return {render,element:record.element,inputElement:direct};
}
function changeSelected(direction){
  if(!selected||blocked(selected))return;
  const r=selected;
  if(r.choices){const index=r.choices.findIndex(choice=>String(choice.value)===r.input.value);r.input.value=r.choices[Math.max(0,Math.min(r.choices.length-1,index+direction))].value;}
  else r.input.value=incrementValue(r.input.value,direction,r.step,r.input.min,r.input.max);
  dispatchValue(r);refreshRail();
}
export function setupSharedAdjuster(){
  document.body.classList.add('common-controls');const bar=document.createElement('div');bar.id='adjustBar';bar.className='shared-adjuster';bar.setAttribute('role','group');bar.setAttribute('aria-label','Selected value adjustment');
  const down=document.createElement('button'),up=document.createElement('button'),middle=document.createElement('div'),label=document.createElement('span'),value=document.createElement('output');down.type=up.type='button';down.innerHTML='<span aria-hidden="true">−</span>';up.innerHTML='<span aria-hidden="true">+</span>';down.setAttribute('aria-label','Decrease selected value');up.setAttribute('aria-label','Increase selected value');label.id='adjustLabel';value.id='adjustValue';middle.append(label,value);bar.append(down,middle,up);document.querySelector('.transport').append(bar);rail={bar,down,up,label,value};
  for(const [button,direction] of [[down,-1],[up,1]]){
    let delay,repeat,gesture;
    const stop=(event)=>{clearTimeout(delay);clearInterval(repeat);if(gesture)endEdit(gesture,event?.type==='pointercancel'||event?.type==='lostpointercapture');gesture=null;};
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0||button.disabled||!selected)return;
      gesture=selected;button.setPointerCapture(event.pointerId);beginEdit(gesture,'rail');changeSelected(direction);
      delay=setTimeout(()=>{repeat=setInterval(()=>{if(button.disabled||selected!==gesture){stop();return;}changeSelected(direction);},90);},260);
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])button.addEventListener(event,stop);
    button.addEventListener('click',event=>{if(event.detail>0||!selected)return;beginEdit(selected,'rail');changeSelected(direction);endEdit(selected);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  }
  if(typeof MutationObserver!=='undefined')new MutationObserver(ensureVisibleSelection).observe(document.body,{attributes:true,subtree:true,attributeFilter:['inert']});
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
  const panels=panelNav(settings,[['motion','Orbit'],['triggers','Triggers'],['balls','Balls']],key=>{document.querySelector('.orbit-layout').dataset.controlPanel=key;},{className:'orbit-panel-tabs',ariaLabel:'ORBIT control pages'});
  const scatter=document.createElement('button');scatter.type='button';scatter.className='phone-scatter';scatter.textContent='↻ Scatter';scatter.addEventListener('click',()=>document.getElementById('resetBalls').click());document.querySelector('.orbit-spin-tools').append(scatter);
  for(const pageId of ['grainPage','fxPage']){const page=document.getElementById(pageId),groups=[...page.querySelectorAll('.control-group')];panelNav(page,groups.map((group,i)=>[String(i),group.querySelector('h3').textContent]),key=>groups.forEach((group,i)=>group.classList.toggle('phone-selected',String(i)===key)));}
  const about=document.createElement('button');about.type='button';about.className='phone-about';about.textContent='ⓘ';about.setAttribute('aria-label','About Hushfield');about.addEventListener('click',()=>document.getElementById('aboutBtn').click());document.querySelector('.head-actions').append(about);
  // Keep one source editor in every layout; moving it between parents on resize
  // can disrupt an active select, recording or keyboard focus on iPad.
  document.getElementById('samplePage').prepend(document.querySelector('.source-panel'));
  const update=()=>{const phone=document.body.classList.contains('phone-ui');document.getElementById('saveProject').textContent=phone?'Save':'Save project';document.getElementById('loadProject').textContent=phone?'Load':'Load project';document.body.dataset.page=currentPage();ensureVisibleSelection();};
  window.addEventListener('hushfield:layoutchange',update);window.HushfieldViewport?.refresh();update();if(document.body.classList.contains('phone-ui')&&!location.hash)showPage('ambient');return panels.activate;
}
