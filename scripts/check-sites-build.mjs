import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
let adapterFound=false;
function inspect(directory){
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  const filename=join(directory,entry.name);
  if(entry.isDirectory())inspect(filename);
  else if(/\.(m?js)$/.test(filename)){
   const content=readFileSync(filename,'utf8');
   if(content.includes('node:sqlite'))throw new Error('Standalone SQLite leaked into the Sites build: '+filename);
   if(content.includes('Authentication is managed by the hosting platform.'))adapterFound=true;
  }
 }
}
inspect('dist/server');
if(!adapterFound)throw new Error('Sites authentication adapter not found in the server output.');
console.log('Sites runtime isolation verified: platform adapter present; no standalone SQLite imports.');
