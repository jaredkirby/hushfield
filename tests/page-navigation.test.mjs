import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const names=['ambient','sample','grain','fx','tape','orbit','visual'],events={},windowListeners={},changes=[];
const classes=()=>({values:new Set(),toggle(name,on){on?this.values.add(name):this.values.delete(name);}});
const links=names.map(tab=>({dataset:{tab},attributes:{},listeners:{},classList:classes(),setAttribute(name,value){this.attributes[name]=value;},addEventListener(type,fn){this.listeners[type]=fn;},focus(){this.focused=true;}}));
const pages=names.map(name=>({id:name+'Page',classList:classes()})),nav={dataset:{},querySelectorAll:()=>links},body={dataset:{}},panel={classList:classes()},label={textContent:''},location={hash:'#ambient'};
const window={addEventListener:(type,fn)=>windowListeners[type]=fn,dispatchEvent:event=>{events[event.type]=event;changes.push(event.detail);windowListeners[event.type]?.(event);}};
vm.runInNewContext(fs.readFileSync(new URL('../dist/page-navigation.js',import.meta.url),'utf8'),{document:{body,querySelector:selector=>selector==='.tabs'?nav:panel,querySelectorAll:()=>pages,getElementById:()=>label},window,location,history:{replaceState:(_,__,hash)=>location.hash=hash},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},Array,Math});
function send(index,type,props={}){const e={cancelable:true,touches:[],changedTouches:[],preventDefault(){this.prevented=true;},...props};links[index].listeners[type](e);return e;}
assert.equal(body.dataset.page,'ambient');assert.equal(nav.dataset.ready,'touch-nav-3');
// No audio module, PointerEvent, or instrument callback exists yet.
send(1,'touchstart',{touches:[{identifier:1,clientX:20,clientY:30}]});send(1,'touchend',{changedTouches:[{identifier:1,clientX:22,clientY:31}]});assert.equal(body.dataset.page,'sample');assert(pages[1].classList.values.has('active'));assert.equal(links[1].attributes['aria-selected'],'true');assert.equal(location.hash,'#sample');assert.match(label.textContent,/SAMPLE/);
send(1,'click');assert.equal(changes.length,1,'Synthetic clicks do not duplicate a successful touch navigation');
send(2,'touchstart',{touches:[{identifier:1,clientX:0,clientY:0}]});send(2,'touchend',{changedTouches:[{identifier:1,clientX:40,clientY:0}]});assert.equal(body.dataset.page,'sample','Drags do not navigate');
send(2,'touchstart',{touches:[{identifier:1,clientX:0,clientY:0}]});send(2,'touchcancel');send(2,'touchend',{changedTouches:[{identifier:1,clientX:0,clientY:0}]});assert.equal(body.dataset.page,'sample');
send(2,'touchstart',{touches:[{identifier:1},{identifier:2}]});send(2,'touchend',{changedTouches:[{identifier:1}]});assert.equal(body.dataset.page,'sample');
send(3,'click');assert.equal(body.dataset.page,'fx');send(3,'keydown',{key:'ArrowRight'});assert.equal(body.dataset.page,'tape');assert(links[4].focused);send(4,'keydown',{key:'End'});assert.equal(body.dataset.page,'visual');send(6,'keydown',{key:'Home'});assert.equal(body.dataset.page,'ambient');send(1,'keydown',{key:' '});assert.equal(body.dataset.page,'sample');
const count=changes.length;window.HushfieldNavigation.select('orbit',{notify:false});assert.equal(body.dataset.page,'orbit');assert.equal(changes.length,count,'Programmatic selection can synchronize without recursing into the instrument');
location.hash='#grain';windowListeners.hashchange();assert.equal(body.dataset.page,'grain');send(0,'click',{ctrlKey:true});assert.equal(body.dataset.page,'grain');window.HushfieldNavigation.select('unknown');assert.equal(body.dataset.page,'grain');
console.log('PASS: tabs work before the instrument, direct iOS touch, click, drag/cancel, duplicate suppression, hash, keyboard and programmatic sync.');
