import test from 'node:test';
import assert from 'node:assert/strict';
import { attachStepper, setupSharedAdjuster } from '../dist/phone-ui.mjs';
import { createControlHistory } from '../dist/control-history.mjs';

// Tiny DOM fixture: real EventTarget dispatch exercises the shared control
// contract without an audio device or browser dependency. Browser layout and
// native range hit targets are verified separately in the app.
class Element extends EventTarget {
  constructor(tag) {
    super();this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.hidden=false;this.disabled=false;this._value='';this.style={setProperty:(name,value)=>this.style[name]=value};
    const classes=new Set();this.classList={add:(...names)=>names.forEach(name=>classes.add(name)),toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name)};
  }
  append(...children) {for(const child of children){if(child.parentNode)child.parentNode.children=child.parentNode.children.filter(node=>node!==child);this.children.push(child);child.parentNode=this;}}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  get options(){return this.children.filter(child=>child.tagName==='OPTION');}
  set value(value){this._value=String(value);}
  get value(){return this._value;}
  get valueAsNumber(){return this.value===''?NaN:Number(this.value);}
  querySelector(selector){return this.children.find(child=>selector==='label'&&child.tagName==='LABEL')||this.children.map(child=>child.querySelector(selector)).find(Boolean)||null;}
  closest(selector){return selector==='[inert]'&&(this.inert?this:this.parentNode?.closest(selector))||null;}
  getBoundingClientRect(){return {height:this.hidden?0:22};}
  focus(){document.activeElement=this;this.dispatchEvent(new Event('focus'));}
  select(){this.selectedText=true;}
  showModal(){this.open=true;}
  close(){this.open=false;this.dispatchEvent(new Event('close'));}
  reportValidity(){return Number.isFinite(this.valueAsNumber)&&this.valueAsNumber>=+this.min&&this.valueAsNumber<=+this.max;}
  setPointerCapture(){}
}
const body=new Element('body'),transport=new Element('div');body.append(transport);
globalThis.window=new EventTarget();
globalThis.document={body,activeElement:null,createElement:tag=>new Element(tag),querySelector:selector=>selector==='.transport'?transport:null,addEventListener(){}};
function fire(element,type,properties={}){const event=new Event(type,{cancelable:true});Object.assign(event,properties);element.dispatchEvent(event);return event;}
function fixture({id='density',value=10,min=0,max=100,step=1,choices,hidden=false,inert=false,format=v=>`${v}%`}={}){
  const row=new Element('div'),top=new Element('div'),label=new Element('label'),input=new Element('input');label.htmlFor=id;top.append(label);row.append(top,input);body.append(row);
  row.inert=inert;input.type='range';input.id=id;input.min=String(min);input.max=String(max);input.step=String(step);input.value=value;input.hidden=hidden;
  const edits=[];for(const type of ['hushfield:editstart','hushfield:editend'])row.addEventListener(type,event=>edits.push({type,...event.detail}));
  const controller=attachStepper(row,input,{label:id,step,format,choices});
  return {row,input,controller,edits,label};
}

test('hidden blend ranges are directly editable and externally dispatched updates refresh all readouts',()=>{
  const {input,controller,row,edits}=fixture({id:'blend-texture',hidden:true});
  assert.equal(input.hidden,false);assert.equal(controller.inputElement,input);assert.equal(controller.element.children[0].textContent,'10%');
  input.value=72;fire(input,'input');assert.equal(controller.element.children[0].textContent,'72%');assert.equal(row.style['--parameter-position'],'72%');
  input.value=30;fire(input,'change');assert.equal(controller.element.children[0].textContent,'30%');assert.deepEqual(edits,[],'A render dispatch is not an editing gesture');
});

test('drag and keyboard changes create one bounded edit gesture before and after the values',()=>{
  const {input,edits}=fixture();
  fire(input,'pointerdown');input.value=20;fire(input,'input');input.value=25;fire(input,'input');fire(input,'pointerup');fire(input,'lostpointercapture');
  assert.equal(edits.length,2);assert.equal(edits[0].value,'10');assert.equal(edits[1].value,'25');assert.equal(edits[1].previousValue,'10');assert.equal(edits[1].cancelled,false);
  fire(input,'keydown',{key:'ArrowRight'});fire(input,'keydown',{key:'ArrowRight'});input.value=27;fire(input,'input');fire(input,'keyup',{key:'ArrowRight'});
  assert.equal(edits.length,4);assert.equal(edits[2].source,'keyboard');assert.equal(edits[3].value,'27');
  fire(input,'pointerdown');input.value=42;fire(input,'input');fire(input,'pointercancel');assert.equal(edits.at(-1).cancelled,true,'History can restore a cancelled gesture');
});

test('categorical choices update the original model input and render external/mixed changes',()=>{
  const {input,controller,label,row,edits}=fixture({id:'wave',value:1,max:2,choices:['Sine','Triangle','Saw'],format:v=>['Sine','Triangle','Saw'][v]});
  const select=controller.inputElement;assert.equal(input.hidden,true);assert.equal(select.tagName,'SELECT');assert.equal(select.value,'1');assert.equal(label.htmlFor,'waveChoice');
  let observed;input.addEventListener('input',()=>observed=input.value);
  fire(select,'pointerdown');select.value=2;fire(select,'change');assert.equal(observed,'2');assert.equal(edits.length,2);assert.equal(edits[0].value,'1');assert.equal(edits[1].value,'2');
  input.value=0;fire(input,'change');assert.equal(select.value,'0');
  row.dataset.mixed='true';controller.render();assert.equal(select.value,'');assert.match(select.getAttribute('aria-valuetext'),/Mixed/);
  input.disabled=true;controller.render();assert.equal(select.disabled,true);select.value=1;fire(select,'change');assert.equal(input.value,'0');
});

test('hidden native selects retain non-contiguous option values in the visible picker and rail',()=>{
  const row=new Element('div'),input=new Element('select');input.id='shape';
  for(const [value,label] of [[0,'Circle'],[3,'Triangle'],[4,'Square']]){const option=new Element('option');option.value=value;option.textContent=label;input.append(option);}
  input.value=0;row.append(input);body.append(row);const controller=attachStepper(row,input,{label:'Shape',format:v=>v?`${v} points`:'Circle'});
  let changes=0;input.addEventListener('change',()=>changes++);
  controller.inputElement.value=3;fire(controller.inputElement,'change');assert.equal(input.value,'3');assert.equal(changes,1);
  setupSharedAdjuster();controller.inputElement.focus();const bar=transport.children[0],up=bar.children[2],down=bar.children[0];
  fire(up,'click',{detail:0});assert.equal(input.value,'4');assert.equal(up.disabled,true);fire(down,'click',{detail:0});assert.equal(input.value,'3');
});

test('exact entry applies once, preserves formatting, rejects invalid values, and cancellation changes nothing',()=>{
  const {input,controller,edits}=fixture({id:'volume',value:.55,min:0,max:1,step:.01,format:v=>`${Math.round(v*100)}%`});
  fire(controller.element,'click');const dialog=body.children.find(child=>child.tagName==='DIALOG'),form=dialog.children[0],number=form.children[1],preview=form.children[3];
  assert.equal(dialog.open,true);assert.equal(number.value,'.55'.replace(/^\./,'0.'));assert.equal(number.selectedText,true);
  number.value=2;fire(form,'submit');assert.equal(input.value,'0.55');assert.equal(dialog.open,true);assert.equal(edits.length,0);
  number.value=.75;fire(number,'input');assert.equal(preview.textContent,'75%');fire(form,'submit');assert.equal(input.value,'0.75');assert.equal(edits.length,2);assert.equal(edits[0].source,'exact');assert.equal(dialog.open,false);
  fire(controller.element,'click');number.value=.3;fire(form.children[4].children[0],'click');assert.equal(input.value,'0.75');assert.equal(edits.length,2);
});

test('inert and disabled cards cannot initiate exact entry or rail changes',()=>{
  const {row,input,controller,edits}=fixture({id:'disabled',value:15});
  input.disabled=true;controller.render();assert.equal(controller.element.disabled,true);fire(controller.element,'click');fire(input,'pointerdown');assert.equal(edits.length,0);
  input.disabled=false;row.inert=true;controller.render();assert.equal(controller.element.disabled,false,'Inert is inherited instead of copied into the disabled flag');fire(controller.element,'click');assert.equal(edits.length,0);
});


test('a cancelled pointer restores audio-facing state through parent history and never adds an undo step',()=>{
  const {row,input,controller}=fixture({id:'cancel-cutoff',value:14000,min:100,max:20000});
  let state=14000,audio=14000;
  input.addEventListener('input',()=>{state=audio=+input.value;});
  const history=createControlHistory({capture:()=>({cutoff:state}),restore:snapshot=>{state=audio=snapshot.cutoff;input.value=state;controller.render();}});
  row.addEventListener('hushfield:editstart',()=>history.begin('cutoff'));
  row.addEventListener('hushfield:editend',event=>history.end({cancelled:event.detail.cancelled}));
  fire(input,'pointerdown');input.value=2000;fire(input,'input');assert.equal(audio,2000);assert.equal(history.pending,true);
  fire(input,'pointercancel');assert.equal(audio,14000);assert.equal(input.value,'14000');assert.equal(history.pending,false);assert.equal(history.undo(),false);
  fire(input,'pointerdown');input.value=5000;fire(input,'input');fire(input,'pointerup');assert.equal(history.undo(),true);assert.equal(audio,14000);
});

test('Escape dismissing a native choice closes its pending gesture without a selection',()=>{
  const {controller,edits,input}=fixture({id:'cancel-choice',value:0,max:1,choices:['First','Second']});
  fire(controller.inputElement,'pointerdown');fire(controller.inputElement,'keydown',{key:'Escape'});
  assert.equal(input.value,'0');assert.equal(edits.length,2);assert.equal(edits.at(-1).cancelled,true);
});


test('window pointer completion closes only its own slider gesture',()=>{
  const first=fixture({id:'first-pointer'}),second=fixture({id:'second-pointer'});
  fire(first.input,'pointerdown',{pointerId:20});fire(second.input,'pointerdown',{pointerId:21});
  fire(window,'pointerup',{pointerId:20});assert.equal(first.edits.length,2);assert.equal(second.edits.length,1);
  fire(window,'pointercancel',{pointerId:21});assert.equal(second.edits.length,2);assert.equal(second.edits.at(-1).cancelled,true);
});


test('startup inert removal unlocks exact buttons and categorical choices without a manual render',()=>{
  const numeric=fixture({id:'startup-volume',inert:true});
  fire(numeric.controller.element,'click');assert.equal(numeric.edits.length,0);
  assert.equal(numeric.controller.element.disabled,false);numeric.row.inert=false;
  fire(numeric.controller.element,'click');const dialog=body.children.find(child=>child.tagName==='DIALOG');assert.equal(dialog.open,true);dialog.close();
  const category=fixture({id:'startup-key',inert:true,choices:['C','D'],value:0,max:1});
  assert.equal(category.controller.inputElement.disabled,false);
  category.controller.inputElement.value=1;fire(category.controller.inputElement,'change');assert.equal(category.input.value,'0');
  category.row.inert=false;category.controller.inputElement.value=1;fire(category.controller.inputElement,'change');assert.equal(category.input.value,'1');
  category.input.disabled=true;category.controller.render();assert.equal(category.controller.inputElement.disabled,true);
  category.input.disabled=false;category.controller.render();assert.equal(category.controller.inputElement.disabled,false);
});
