import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
function shell({width=390,height=664,visualHeight=height,scale=1,safeTop=0,safeBottom=0,ua='',platform='',touch=0,coarse=false,screenWidth=width,screenHeight=height,search=''}={}){
 const callbacks={},variables={},classes=new Set(),bodyClasses=new Set(),changes=[],label={textContent:''};
 const body={classList:{toggle:(name,on)=>on?bodyClasses.add(name):bodyClasses.delete(name)},dataset:{}},root={dataset:{},classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)},style:{setProperty:(key,value)=>variables[key]=value}};
 const media={matches:coarse,addEventListener:(event,fn)=>callbacks.media=fn},narrow={matches:width<=600,addEventListener:(event,fn)=>callbacks.narrow=fn};
 const view={width,height:visualHeight,offsetTop:0,scale,addEventListener:(event,fn)=>callbacks['visual'+event]=fn};
 const window={visualViewport:view,addEventListener:(event,fn)=>callbacks[event]=fn,dispatchEvent:event=>{changes.push(event.detail);callbacks[event.type]?.(event);}};
 vm.runInNewContext(fs.readFileSync(new URL('../dist/phone-shell.js',import.meta.url),'utf8'),{document:{documentElement:root,body,getElementById:()=>label},window,navigator:{userAgent:ua,platform,maxTouchPoints:touch},screen:{width:screenWidth,height:screenHeight},innerWidth:width,innerHeight:height,matchMedia:q=>q.includes('coarse')?media:narrow,URLSearchParams,location:{search},getComputedStyle:()=>({paddingTop:safeTop+'px',paddingBottom:safeBottom+'px'}),requestAnimationFrame:fn=>fn(),Math,parseFloat,CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}}});
 return {body,root,classes,bodyClasses,variables,callbacks,media,view,label,changes,profile:window.HushfieldViewport.profile};
}
const x=shell({height:844,visualHeight:664,ua:'iPhone',touch:5,coarse:true});assert(x.classes.has('phone-layout')&&x.bodyClasses.has('phone-ui'));assert.equal(x.body.dataset.device,'phone');assert.equal(x.variables['--app-height'],'664px');
x.view.height=540;x.callbacks.visualresize();assert.equal(x.variables['--app-height'],'540px');assert.equal(x.body.dataset.heightTier,'tight');
const safe=shell({height:664,safeTop:44,safeBottom:34});assert.equal(safe.body.dataset.heightTier,'compact');
x.view.scale=2;x.view.height=270;x.callbacks.visualresize();assert.equal(x.variables['--app-height'],'540px','Pinch zoom must not collapse the instrument');
x.view.scale=1;x.view.width=844;x.view.height=390;x.callbacks.orientationchange();assert(x.bodyClasses.has('wide-ui')&&!x.bodyClasses.has('phone-ui'));assert.equal(x.body.dataset.layout,'phone-landscape');assert.equal(x.body.dataset.device,'phone');
const ipad=shell({width:1194,height:834,ua:'Mozilla Macintosh Safari',platform:'MacIntel',touch:5,coarse:true,search:'?phone=1'});assert.equal(ipad.body.dataset.device,'tablet');assert.equal(ipad.body.dataset.layout,'tablet');assert(ipad.bodyClasses.has('tablet-ui'));assert.match(ipad.label.textContent,/IPAD \/ LANDSCAPE/);assert(!ipad.bodyClasses.has('phone-ui'),'An earlier phone link must not force iPad into phone mode');
ipad.view.width=834;ipad.view.height=1194;ipad.callbacks.resize();assert.equal(ipad.body.dataset.layout,'tablet');assert.equal(ipad.body.dataset.orientation,'portrait');
ipad.view.width=500;ipad.callbacks.resize();assert.equal(ipad.body.dataset.layout,'phone');assert.equal(ipad.body.dataset.device,'tablet','Split View adapts without losing device identity');assert(ipad.bodyClasses.has('phone-ui')&&!ipad.bodyClasses.has('tablet-ui'));
ipad.view.width=1194;ipad.view.height=834;ipad.callbacks.visualresize();assert.equal(ipad.body.dataset.layout,'tablet');assert(!ipad.bodyClasses.has('phone-ui'));
const desktop=shell({width:1440,height:900,platform:'MacIntel',touch:0,search:'?phone=1'});assert.equal(desktop.body.dataset.device,'desktop');assert(desktop.bodyClasses.has('desktop-ui')&&desktop.bodyClasses.has('wide-ui'));assert.equal(desktop.variables['--app-height'],'900px');
desktop.view.width=500;desktop.callbacks.resize();assert.equal(desktop.body.dataset.layout,'phone');assert.equal(desktop.body.dataset.device,'desktop');desktop.view.width=1440;desktop.callbacks.resize();assert.equal(desktop.body.dataset.layout,'desktop');
assert.equal(shell({width:1024,height:768,ua:'iPad',platform:'iPad',touch:5}).body.dataset.device,'tablet');
assert.equal(shell({width:1280,height:800,ua:'Android',coarse:true,touch:5}).body.dataset.device,'tablet');
assert.equal(shell({width:900,height:412,ua:'Android Mobile',coarse:true,touch:5}).body.dataset.layout,'phone-landscape');
assert.equal(shell({width:1024,height:600}).body.dataset.heightTier,'compact','Wide editors account for the height of their extra rows');
assert.equal(shell({width:1024,height:580}).body.dataset.heightTier,'tight');
console.log('PASS: phone/iPad/desktop identity, modern iPad desktop UA, tablet portrait/landscape, Split View, legacy links, rotation, visible height, safe areas and pinch zoom.');
