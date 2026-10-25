// Navigation is available before the instrument module loads. Keep this classic
// script independent of audio and canvas initialization, including on iOS.
(()=>{
 const nav=document.querySelector('.tabs');
 const links=Array.from(nav.querySelectorAll('[data-tab]'));
 const names=links.map(link=>link.dataset.tab);
 const labels={ambient:'AMBIENT / GENERATIVE LANDSCAPES',sample:'SAMPLE WORKSHOP',grain:'GRAIN ENGINE',fx:'EFFECTS BUS',tape:'TAPE EMULATION',orbit:'ORBIT / PHYSICS INTO MUSIC',visual:'AUDIO VISUALIZATION'};
 let current;
 function select(name,{notify=true}={}){
  if(!names.includes(name))return;
  const changed=current!==name;current=name;
  document.body.dataset.page=name;
  links.forEach(link=>{const active=link.dataset.tab===name;link.classList.toggle('active',active);link.setAttribute('aria-selected',String(active));link.tabIndex=active?0:-1;});
  document.querySelectorAll('.page').forEach(page=>page.classList.toggle('active',page.id===name+'Page'));
  document.querySelector('.main-panel').classList.toggle('orbit-active',name==='orbit');
  document.getElementById('viewLabel').textContent=labels[name];
  if(location.hash!=='#'+name)history.replaceState(null,'','#'+name);
  if(changed&&notify)window.dispatchEvent(new CustomEvent('hushfield:pagechange',{detail:name}));
 }
 links.forEach((link,index)=>{
  let touch;
  // Use Touch Events directly for WebKit. Do not cancel pointer events or rely
  // on a synthetic mouse click being generated after a finger is lifted.
  link.addEventListener('touchstart',event=>{touch=event.touches.length===1?{id:event.touches[0].identifier,x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});
  link.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
  link.addEventListener('touchend',event=>{
   const start=touch;touch=null;if(!start||event.touches.length)return;
   const end=Array.from(event.changedTouches).find(point=>point.identifier===start.id);
   if(!end||Math.hypot(end.clientX-start.x,end.clientY-start.y)>12)return;
   select(link.dataset.tab);if(event.cancelable)event.preventDefault();
  },{passive:false});
  link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();select(link.dataset.tab);});
  link.addEventListener('keydown',event=>{
   if(event.key===' '){event.preventDefault();select(link.dataset.tab);return;}
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const at=event.key==='Home'?0:event.key==='End'?links.length-1:(index+(event.key==='ArrowRight'?1:-1)+links.length)%links.length;
   select(links[at].dataset.tab);links[at].focus({preventScroll:true});
  });
 });
 window.HushfieldNavigation={select,current:()=>current};
 window.addEventListener('hashchange',()=>select(location.hash.slice(1)));
 select(names.includes(location.hash.slice(1))?location.hash.slice(1):'ambient',{notify:false});
 nav.dataset.ready='touch-nav-3';
})();
