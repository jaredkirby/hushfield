import http from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),output=path.join(root,'.scratch/listening/artifacts');
const port=Number(process.argv[2]||4886);
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.wav':'audio/wav','.css':'text/css','.fxp':'application/octet-stream'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&url.pathname.startsWith('/.listening-save/')){
  // This development endpoint accepts only bounded audio/receipt names on loopback, with a same-origin browser header.
  if(req.headers.origin&&req.headers.origin!==`http://127.0.0.1:${port}`&&req.headers.origin!==`http://localhost:${port}`){res.writeHead(403);res.end();return;}
  const name=url.pathname.slice('/.listening-save/'.length);if(!/^[a-z0-9][a-z0-9.-]{0,100}\.(wav|json)$/.test(name)){res.writeHead(400);res.end();return;}
  let count=0;const chunks=[];for await(const chunk of req){count+=chunk.length;if(count>80*1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  await writeFile(path.join(output,name),Buffer.concat(chunks));res.writeHead(201,{'Content-Type':'application/json'});res.end(JSON.stringify({saved:name}));return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 const prefix=url.pathname.startsWith('/.listening/')?'/.listening/':url.pathname.startsWith('/.listening-artifacts/')?'/.listening-artifacts/':'/';
 const folder=prefix==='/.listening/'?path.join(root,'.scratch/listening/build'):prefix==='/.listening-artifacts/'?output:path.join(root,'dist');
 const relative=decodeURIComponent(url.pathname.slice(prefix.length)||'index.html');const file=path.resolve(folder,relative);
 if(!file.startsWith(folder+path.sep)){res.writeHead(403);res.end();return;}
 const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500,{'Content-Type':'text/plain'});res.end(error.code==='ENOENT'?'File not found. Run node ops/listening-prepare.mjs before rendering.':error.message);}
}).listen(port,'127.0.0.1',()=>console.log(`Listening comparison: http://127.0.0.1:${port}/qa-musicality.html\nSaved WAVs/receipts: ${output}`));
