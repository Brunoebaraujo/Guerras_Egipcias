import http from 'node:http';
import {existsSync} from 'node:fs';
import https from 'node:https';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=existsSync(resolve('dist/index.html'))?resolve('dist'):resolve('../public/vr');
const secure=process.argv.includes('--https');
const port=Number(process.env.PORT || (secure?8443:8080));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.txt':'text/plain; charset=utf-8','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const handler=async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Permissions-Policy':'xr-spatial-tracking=(self)'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
};
try{
  const server=secure?https.createServer({key:await readFile('.cert/key.pem'),cert:await readFile('.cert/cert.pem')},handler):http.createServer(handler);
  server.listen(port,'0.0.0.0',()=>console.log(`Local: ${secure?'https':'http'}://localhost:${port}`));
}catch(error){console.error('HTTPS requer .cert/key.pem e .cert/cert.pem. Consulte o README.',error.message);process.exit(1);}
