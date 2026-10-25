export const PROJECT_FORMAT='hushfield-project';
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

// Earlier browser-lab files used a different physics namespace. Infer it from
// the saved schema so previous sessions survive the application's new identity.
export function restoreProjectFile(saved){
 if(!record(saved)||![1,2,3].includes(saved.version)||typeof saved.sample!=='string'||!record(saved.params)||!record(saved.controls)||
  !(saved.format===PROJECT_FORMAT||(typeof saved.format==='string'&&saved.format.endsWith('-browser-lab'))))throw new Error('This is not a Hushfield project.');
 const project={...saved,format:PROJECT_FORMAT,params:{...saved.params},controls:{...saved.controls}};
 const key=Object.keys(saved.params).find(key=>key.endsWith('Balls')&&key.length===10),prefix=key?.slice(0,-5);
 if(prefix&&prefix!=='orbit'){
  for(const field of ['params','controls'])for(const [key,value] of Object.entries(saved[field]))if(key.startsWith(prefix)&&/^[A-Z]/.test(key.slice(prefix.length))){
   const renamed='orbit'+key.slice(prefix.length);
   if(!(renamed in project[field]))project[field][renamed]=value;
   delete project[field][key];
  }
  if(!project.orbitSound&&record(saved[prefix+'Sound']))project.orbitSound=saved[prefix+'Sound'];
  delete project[prefix+'Sound'];
  if(record(saved.ambient)){
   project.ambient={...saved.ambient};
   if(!('orbit'in project.ambient)&&Number.isFinite(saved.ambient[prefix]))project.ambient.orbit=saved.ambient[prefix];
   delete project.ambient[prefix];
  }
 }
 return project;
}
