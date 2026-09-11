import {readdir,readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const source=resolve(process.argv[2]||'../main-game'),dist=existsSync(resolve('../public/vr/index.html'))?resolve('../public/vr'):resolve('dist'),target=resolve(dist,'game-core');
const sha=execFileSync('git',['-c',`safe.directory=${source.replaceAll('\\','/')}`,'-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),files={};
async function copy(dir){for(const ent of await readdir(resolve(source,dir),{withFileTypes:true})){const rel=dir+'/'+ent.name;if(ent.isDirectory())await copy(rel);else if(ent.name.endsWith('.js')&&!ent.name.endsWith('.test.js')){const data=await readFile(resolve(source,rel));await mkdir(dirname(resolve(target,rel)),{recursive:true});await writeFile(resolve(target,rel),data);files[rel]=createHash('sha256').update(data).digest('hex');}}}
await copy('src/domain');await copy('src/match');
await mkdir(resolve(dist,'card-art'),{recursive:true});
const keys=['servo','arqueiro','lanceiro','carruagem','guardareal','montu','hathor','escaravelho','heka','mumia','sobek','anubis','cao','cabra-nilo','ganso','gato','macaco','hiena','garca','rebanho','domador','apis','amon'];
for(const key of keys)await copyFile(resolve(source,'public/cartas/256',key+'.webp'),resolve(dist,'card-art',key+'.webp'));
await writeFile(resolve(target,'provenance.json'),JSON.stringify({repository:'Brunoebaraujo/Guerras_Egipcias',commit:sha,files},null,2)+'\n');
console.log(`Copied ${Object.keys(files).length} unmodified engine modules from ${sha}; ${keys.length} illustrations.`);
