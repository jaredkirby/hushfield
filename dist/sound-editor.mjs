import { SOUND_FIELDS, SOUND_GROUPS, patchFor, formatSoundValue } from './sound-patches.mjs?v=hushfield-1';
import { attachStepper, panelNav, ensureVisibleSelection } from './phone-ui.mjs?v=hushfield-1';

export function setupSoundEditors({getState,getCount,onChange,onReset,onPreview}){
  const editors={};
  for(const bank of ['triggers','balls']){
    const singular=bank==='triggers'?'Trigger':'Ball',name=bank==='triggers'?'Triggers':'Balls';
    const owner=document.createElement('section');owner.className='sound-editor';owner.dataset.panel=bank;owner.id=bank+'Editor';
    const targetRow=document.createElement('div');targetRow.className='sound-target-row';
    const target=document.createElement('select');target.id=bank+'Target';target.setAttribute('aria-label',singular+' sound target');
    const preview=document.createElement('button'),mute=document.createElement('button'),reset=document.createElement('button');
    for(const b of [preview,mute,reset])b.type='button';preview.textContent='▶ Listen';preview.setAttribute('aria-label','Preview '+bank+' sound');mute.id=bank+'Mute';reset.textContent='Reset';reset.setAttribute('aria-label','Reset selected '+bank+' sound');
    targetRow.append(target,preview,mute,reset);owner.append(targetRow);
    const controls=document.createElement('div');controls.className='sound-fields';const fields=[];
    const current=()=>target.value==='all'?'all':Number(target.value);
    const context=()=>target.value==='all'?'All '+bank:singular+' '+(Number(target.value)+1);
    for(const f of SOUND_FIELDS){
      const row=document.createElement('div');row.className='control';row.dataset.soundGroup=f.group;
      const top=document.createElement('div');top.className='control-top';const label=document.createElement('label');label.textContent=f.label;const input=document.createElement('input');input.type='range';input.id=bank+'-'+f.id;label.htmlFor=input.id;input.min=f.choices?0:f.min;input.max=f.choices?f.choices.length-1:f.max;input.step='any';top.append(label);row.append(top,input);controls.append(row);
      const value=()=>f.choices?f.choices[+input.value]:+input.value;
      const controller=attachStepper(row,input,{label:()=>`${f.bankOnly?'All '+bank:context()} · ${f.label}`,step:f.choices?1:f.step,format:v=>formatSoundValue(f,f.choices?f.choices[v]:v)});
      input.addEventListener('input',()=>{onChange(bank,current(),f.id,value());refresh();});fields.push({f,input,controller});
    }
    owner.append(controls);
    const note=document.createElement('p');note.className='sound-editor-note';note.textContent='Delay, feedback and room apply to this bank.';owner.append(note);
    panelNav(owner,SOUND_GROUPS,key=>{owner.dataset.soundGroup=key;for(const row of controls.children)row.hidden=row.dataset.soundGroup!==key;note.hidden=key!=='space';},{className:'sound-group-tabs',ariaLabel:name+' sound sections'});
    // Keep target selection above the section tabs in the DOM and on screen.
    owner.prepend(targetRow);
    function refresh(){
      const count=getCount(bank),previous=target.value;
      if(target.options.length!==count+1){target.replaceChildren();const all=document.createElement('option');all.value='all';all.textContent='All '+bank;target.append(all);for(let i=0;i<count;i++){const option=document.createElement('option');option.value=i;option.textContent=singular+' '+(i+1);target.append(option);}target.value=previous==='all'||previous!==''&&+previous<count?previous:'all';}
      const p=patchFor(getState(),bank,current());
      for(const {f,input,controller} of fields){input.value=f.choices?f.choices.indexOf(p[f.id]):p[f.id];controller.render();}
      mute.textContent=p.enabled?'Mute':'Unmute';mute.setAttribute('aria-label',(p.enabled?'Mute ':'Unmute ')+context().toLowerCase());mute.setAttribute('aria-pressed',String(!p.enabled));
    }
    target.addEventListener('change',()=>{refresh();ensureVisibleSelection();});preview.addEventListener('click',()=>onPreview(bank,current()));mute.addEventListener('click',()=>{const p=patchFor(getState(),bank,current());onChange(bank,current(),'enabled',!p.enabled);refresh();});reset.addEventListener('click',()=>{onReset(bank,current());refresh();});
    document.querySelector('.orbit-settings').append(owner);editors[bank]={refresh,target};refresh();
  }
  return {refresh:()=>Object.values(editors).forEach(e=>e.refresh()),select:(bank,index)=>{editors[bank].target.value=String(index);editors[bank].refresh();ensureVisibleSelection();}};
}
