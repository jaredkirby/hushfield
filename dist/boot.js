// Startup has its own visible state; it must not be confused with audio being off.
(()=>{
 const root=document.documentElement,status=document.getElementById('audioDetail'),badge=document.getElementById('appLoadStatus'),reload=document.getElementById('reloadApp');
 const regions=Array.from(document.querySelectorAll('.workspace,.transport'));
 const buttons=Array.from(document.querySelectorAll('#testSound,#restartAudio,#saveProject,#loadProject,.phone-about'));
 const disabled=buttons.map(button=>button.disabled);
 let loaded=false;
 const loadingText='Loading instrument. Tabs are available.';
 function state(value,text){root.dataset.appState=value;badge.textContent=text;}
 state('loading','LOADING');status.textContent=loadingText;
 buttons.forEach(button=>button.disabled=true);
 regions.forEach(region=>{region.setAttribute('inert','');region.setAttribute('aria-busy','true');});
 const slow=setTimeout(()=>{if(!loaded){status.textContent='Still loading. Tabs work; reload if needed.';reload.hidden=false;}},8000);
 reload.addEventListener('click',()=>location.reload());
 import('./build/app.js?v=adaptive-1').then(()=>{
  loaded=true;clearTimeout(slow);reload.hidden=true;state('ready','READY');root.dataset.appReady='true';
  regions.forEach(region=>{region.removeAttribute('inert');region.setAttribute('aria-busy','false');});
  buttons.forEach((button,index)=>button.disabled=disabled[index]);
  if(status.textContent===loadingText||status.textContent.startsWith('Still loading')||status.textContent==='Loading instrument…')status.textContent='Ready. Tap Start to enable audio.';
 }).catch(error=>{
  clearTimeout(slow);state('error','LOAD ERROR');status.textContent='Instrument failed to load. Tap Reload app.';reload.hidden=false;root.dataset.appReady='error';console.error('Instrument startup failed:',error);
 });
})();
