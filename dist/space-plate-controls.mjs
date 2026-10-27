import { plateLayout } from './space-reverb-visual.mjs';
const clamp = value => Math.max(0, Math.min(1, value));
export function plateSettings(unit) {
  const u=clamp(unit);
  return { reverbDecay: Math.round((.5+u*7.5)*10)/10, reverbPredelay: Math.round(u*150) };
}
export function setupSpacePlateControls({ stage, getParams, setParams, begin, end }) {
  let gesture=null;
  const handles=['Upper','Lower'].map((name,side)=>{
    const button=document.createElement('button');button.type='button';button.className='space-plate-handle';
    button.setAttribute('role','slider');button.setAttribute('aria-label',name+' plate separation');
    button.setAttribute('aria-valuemin','0');button.setAttribute('aria-valuemax','100');button.setAttribute('aria-orientation','vertical');
    button.title='Drag plates apart for a longer, later tail. Arrow keys adjust; Escape cancels.';
    stage.append(button);
    function finish(cancelled=false) {
      if(gesture?.button!==button)return;
      const old=gesture;gesture=null;button.classList.remove('dragging');
      if(button.hasPointerCapture(old.id))button.releasePointerCapture(old.id);
      end({cancelled});
    }
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0||gesture)return;
      event.preventDefault();event.stopPropagation();button.focus({preventScroll:true});
      const rect=stage.getBoundingClientRect(),layout=plateLayout(rect.width,rect.height,getParams().reverbDecay);
      begin('Plate separation');gesture={button,id:event.pointerId,y:event.clientY,unit:layout.unit,scale:layout.scale,start:{reverbDecay:getParams().reverbDecay,reverbPredelay:getParams().reverbPredelay},moved:false};
      button.setPointerCapture(event.pointerId);button.classList.add('dragging');
    });
    button.addEventListener('pointermove',event=>{
      if(gesture?.button!==button||event.pointerId!==gesture.id)return;
      const dy=event.clientY-gesture.y;
      if(Math.abs(dy)<2){if(gesture.moved)setParams(gesture.start);return;}
      gesture.moved=true;
      const unit=gesture.unit+(side?1:-1)*dy*2/(305*gesture.scale);
      setParams(plateSettings(unit));
    });
    button.addEventListener('pointerup',event=>{if(event.pointerId===gesture?.id)finish();});
    for(const type of ['pointercancel','lostpointercapture'])button.addEventListener(type,()=>finish(true));
    button.addEventListener('blur',()=>finish(true));
    button.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();finish(true);return;}
      if(gesture)return;
      const step=event.shiftKey?.1:.02;
      const direction=['ArrowUp','ArrowRight'].includes(event.key)?1:['ArrowDown','ArrowLeft'].includes(event.key)?-1:0;
      if(!direction&&!['Home','End'].includes(event.key))return;
      event.preventDefault();const unit=event.key==='Home'?0:event.key==='End'?1:(getParams().reverbDecay-.5)/7.5+direction*step;
      begin('Plate separation');try{setParams(plateSettings(unit));}finally{end({cancelled:false});}
    });
    document.addEventListener('pointerdown',event=>{if(gesture?.button===button&&!button.contains(event.target))finish(true);},true);
    window.addEventListener('blur',()=>finish(true));
    window.addEventListener('resize',()=>finish(true));
    return button;
  });
  const hint=document.createElement('span');hint.className='space-plate-hint';hint.textContent='DRAG THE PLATES APART · LONGER, LATER TAIL';stage.append(hint);
  function refresh() {
    const p=getParams(),visible=p.reverbModel==='plate'&&document.body.dataset.page==='fx'&&document.body.dataset.spacePanel!=='filter';
    if(!visible&&gesture){const old=gesture;gesture=null;old.button.classList.remove('dragging');if(old.button.hasPointerCapture(old.id))old.button.releasePointerCapture(old.id);end({cancelled:true});return refresh();}
    hint.hidden=!visible;
    const rect=stage.getBoundingClientRect(),layout=plateLayout(rect.width,rect.height,p.reverbDecay);
    handles.forEach((button,side)=>{
      button.hidden=!visible;
      const center=465+(side?1:-1)*layout.gap/2;
      button.style.left=(layout.x+75*layout.scale)+'px';button.style.top=(layout.y+(center-110)*layout.scale)+'px';
      button.style.width=850*layout.scale+'px';button.style.height=220*layout.scale+'px';
      button.setAttribute('aria-valuenow',String(Math.round(layout.unit*100)));
      button.setAttribute('aria-valuetext',`Decay ${p.reverbDecay.toFixed(1)} seconds, pre-delay ${p.reverbPredelay} milliseconds`);
    });
  }
  new ResizeObserver(refresh).observe(stage);
  new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['data-page','data-space-panel']});
  refresh();return {refresh};
}
