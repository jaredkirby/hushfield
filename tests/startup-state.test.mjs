import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/boot.js',import.meta.url),'utf8');
function startup(){
 const callbacks={},root={dataset:{}},status={textContent:''},badge={textContent:''},reload={hidden:true,addEventListener:(type,fn)=>callbacks.reload=fn};
 const regions=[0,1].map(()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}}));
 const buttons=[{disabled:false},{disabled:true}];let resolve,reject,timer,reloaded=false;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 const document={documentElement:root,getElementById:id=>({audioDetail:status,appLoadStatus:badge,reloadApp:reload})[id],querySelectorAll:selector=>selector==='.workspace,.transport'?regions:buttons};
 vm.runInNewContext(source.replace(/import\('\.\/build\/app\.js\?v=reliability-2'\)/,"loadInstrument()"),{document,loadInstrument:()=>promise,setTimeout:fn=>{timer=fn;return 1;},clearTimeout:()=>{},location:{reload:()=>reloaded=true},console:{error(){}}});
 return {root,status,badge,reload,regions,buttons,resolve,reject,slow:()=>timer(),retry:()=>callbacks.reload(),reloaded:()=>reloaded};
}
const x=startup();assert.equal(x.badge.textContent,'LOADING');assert.equal(x.root.dataset.appState,'loading');assert(x.buttons.every(b=>b.disabled));assert(x.regions.every(r=>r.attributes['aria-busy']==='true'&&'inert'in r.attributes));
x.slow();assert(!x.reload.hidden);assert.match(x.status.textContent,/Still loading/);
x.resolve();await new Promise(resolve=>setImmediate(resolve));assert.equal(x.badge.textContent,'READY');assert.equal(x.root.dataset.appState,'ready');assert(x.reload.hidden);assert(!x.buttons[0].disabled&&x.buttons[1].disabled,'Ready preserves controls that were already disabled');assert(x.regions.every(r=>!('inert'in r.attributes)&&r.attributes['aria-busy']==='false'));assert.match(x.status.textContent,/Ready/);
const failed=startup();failed.reject(new Error('Network failed'));await new Promise(resolve=>setImmediate(resolve));assert.equal(failed.badge.textContent,'LOAD ERROR');assert(!failed.reload.hidden);assert(failed.regions.every(r=>'inert'in r.attributes));failed.retry();assert(failed.reloaded());
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');for(const file of ['phone-shell.js','page-navigation.js','boot.js'])assert(html.includes(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8')),'Inline '+file+' is current');
console.log('PASS: visible loading, slow startup, ready, unavailable controls, error recovery and inline startup scripts.');

const manifest=JSON.parse(fs.readFileSync(new URL('../dist/build/manifest.json',import.meta.url),'utf8'));for(const [file,hash]of Object.entries(manifest.inputs))assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,'Run npm run build after changing '+file);
