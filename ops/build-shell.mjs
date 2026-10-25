import {readFile,writeFile} from 'node:fs/promises';
const dist=new URL('../dist/',import.meta.url),htmlFile=new URL('index.html',dist);
let html=await readFile(htmlFile,'utf8');
for(const file of ['phone-shell.js','page-navigation.js','boot.js']){
 const source=await readFile(new URL(file,dist),'utf8');
 const pattern=new RegExp('<script data-shell="'+file.replaceAll('.','\\.')+'">[\\s\\S]*?</script>');
 if(!pattern.test(html))throw new Error('Missing shell script marker: '+file);
 html=html.replace(pattern,()=>'<script data-shell="'+file+'">\n'+source+'</script>');
}
await writeFile(htmlFile,html);
console.log('Embedded startup and navigation scripts; no extra shell requests.');
