// Establish the adaptive viewport before the instrument module or controls load.
(()=>{
 const root=document.documentElement,coarse=matchMedia('(any-pointer: coarse)'),narrow=matchMedia('(max-width: 600px)');let pending=false,previous='';
 // Browser chrome can leave visualViewport.height temporarily stale on iPad.
 // Measure CSS's dynamic viewport too, without adding anything to the layout.
 const measure=document.createElement('div');measure.setAttribute('aria-hidden','true');measure.style.cssText='position:fixed;top:0;left:0;width:0;height:100dvh;visibility:hidden;pointer-events:none;contain:strict';document.body.append(measure);
 function profile(width,height){
  const ua=navigator.userAgent||'',platform=navigator.platform||'',touch=navigator.maxTouchPoints||0;
  const ipad=/iPad/.test(ua)||(platform==='MacIntel'&&touch>1),phone=/iPhone|iPod|Android.*Mobile/i.test(ua)||navigator.userAgentData?.mobile===true;
  const tablet=ipad||/Tablet|Android(?!.*Mobile)/i.test(ua)||(coarse.matches&&Math.min(screen.width||width,screen.height||height)>=600);
  const device=phone?'phone':tablet?'tablet':'desktop';
  // A tablet in Split View can use the compact surface. The old phone=1 link
  // remains portable: it no longer forces a phone surface on a wide iPad/Mac.
  const layout=width<=600?'phone':device==='phone'?'phone-landscape':device==='tablet'?'tablet':'desktop';
  return {device,layout,orientation:width>height?'landscape':'portrait',ipad};
 }
 function update(){pending=false;const view=window.visualViewport;if(view&&Math.abs(view.scale-1)>.01)return;
  const active=document.activeElement,editing=active&&(active.isContentEditable||active.tagName==='TEXTAREA'||active.tagName==='SELECT'||active.tagName==='INPUT'&&!/^(range|checkbox|radio|button|submit|reset|file|color|hidden)$/i.test(active.type));
  const visualHeight=view?.height||innerHeight,dynamicHeight=measure.getBoundingClientRect().height;
  const keyboard=editing&&(!dynamicHeight||dynamicHeight-visualHeight>160);
  // Keep the smaller visible height for a keyboard or picker, otherwise use
  // the full dynamic browser area. Unsupported dvh measures zero and falls back.
  const width=Math.round(view?.width||innerWidth),height=Math.round(keyboard?Math.min(visualHeight,dynamicHeight||visualHeight):Math.max(visualHeight,dynamicHeight)),top=Math.max(0,Math.round(view?.offsetTop||0)),state=profile(width,height),phone=state.layout==='phone';
  root.classList.toggle('phone-layout',phone);root.classList.toggle('adaptive-layout',true);
  for(const [name,on]of [['phone-ui',phone],['wide-ui',!phone],['tablet-ui',state.layout==='tablet'],['desktop-ui',state.layout==='desktop'],['landscape-phone-ui',state.layout==='phone-landscape']])document.body.classList.toggle(name,on);
  for(const [key,value]of Object.entries(state)){root.dataset[key]=String(value);document.body.dataset[key]=String(value);}
  root.style.setProperty('--app-height',height+'px');root.style.setProperty('--app-top',top+'px');
  const style=getComputedStyle(document.body),usable=height-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0);document.body.dataset.heightTier=usable<(phone?550:600)?'tight':usable<(phone?651:740)?'compact':'regular';
  const label=document.getElementById('layoutStatus');if(label)label.textContent=(state.ipad?'IPAD':state.device.toUpperCase())+' / '+state.orientation.toUpperCase();
  const signature=state.device+':'+state.layout+':'+state.orientation+':'+document.body.dataset.heightTier;
  if(signature!==previous){previous=signature;window.dispatchEvent(new CustomEvent('hushfield:layoutchange',{detail:state}));}
 }
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(update);}};
 coarse.addEventListener('change',schedule);narrow.addEventListener('change',schedule);window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);window.addEventListener('pageshow',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
 document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(schedule).observe(measure);
 window.HushfieldViewport={refresh:update,profile};update();
})();
