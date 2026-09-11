import * as THREE from '../vendor/three.module.min.js';
import {SandboxCore} from './core.js?v=0.2.0';
import {createWorld} from './scene.js?v=0.2.0';
import {registerTools} from './webmcp.js?v=0.2.0';

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(1);renderer.xr.setFoveation(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.querySelector('#game').appendChild(renderer.domElement);
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.05,35);scene.add(camera);
const world=createWorld(scene);const core=new SandboxCore();
const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();const rotation=new THREE.Matrix4();
const v=new THREE.Vector3(),worldPoint=new THREE.Vector3(),normal=new THREE.Vector3(0,1,0),plane=new THREE.Plane();
const controllers=[];let held=null,hover=null,lastHighlight='',pendingRecenter=false,zoom=1,mouseActive=false;
const status=document.querySelector('#status'),vrButton=document.querySelector('#vr');
function say(text){status.textContent=text;world.message.paint(text);}
function desktopCamera(){camera.position.set(0,2.7*zoom,2.1*zoom);camera.lookAt(0,.72,-.85);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<640?64:48;camera.updateProjectionMatrix();}
desktopCamera();
function sync(){world.sync(core.snapshot(),core.powers());}
core.addEventListener('state:changed',sync);sync();say('Selecione uma carta e depois uma via azul.');
function cancel(){if(held){held=null;sync();}hover=null;highlight();}
function act(id){
  if(id==='reset'){cancel();core.command('reset');say('Jogada reiniciada. Energia restaurada.');}
  if(id==='end'){cancel();const r=core.command('end-turn');say(r.ok?'Turno encerrado. Reinicie para testar novamente.':r.reason);}
  if(id==='lower'||id==='raise'){cancel();world.table.position.y=THREE.MathUtils.clamp(world.table.position.y+(id==='raise'?.05:-.05),.55,1.15);document.querySelector('#height').value=world.table.position.y;say(`Altura da mesa: ${Math.round(world.table.position.y*100)} cm`);}
  if(id==='recenter'){cancel();if(renderer.xr.isPresenting)pendingRecenter=true;else {world.stage.position.set(0,0,0);world.stage.rotation.set(0,0,0);zoom=1;desktopCamera();}}
}
document.querySelector('#reset').onclick=()=>act('reset');document.querySelector('#end').onclick=()=>act('end');
document.querySelector('#height').oninput=e=>{cancel();world.table.position.y=Number(e.target.value);};
function rayFor(source){
  if(source==='mouse')raycaster.setFromCamera(pointer,camera);
  else {source.updateWorldMatrix(true,false);rotation.extractRotation(source.matrixWorld);raycaster.ray.origin.setFromMatrixPosition(source.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation).normalize();}
}
function pick(source){
  rayFor(source);scene.updateMatrixWorld(true);
  const targets=[...world.cards.filter(c=>core.state.hand.includes(c.definition.id)).map(c=>c.mesh),...world.controls];
  // Grip supports picking a nearby card directly as well as using the ray.
  if(source!=='mouse'){
    let closest=null,dist=.16;
    for(const card of world.cards.filter(c=>core.state.hand.includes(c.definition.id))){const d=card.mesh.getWorldPosition(v).distanceTo(raycaster.ray.origin);if(d<dist){closest=card.mesh;dist=d;}}
    if(closest)return {object:closest,distance:dist,near:true};
  }
  return raycaster.intersectObjects(targets,false)[0];
}
function begin(source){
  if(held){if(held.source===source)release(source);return;}
  const hit=pick(source);if(!hit)return;
  if(hit.object.userData.kind==='button'){act(hit.object.userData.id);return;}
  const id=hit.object.userData.id;
  if(!core.validSlots(id).length){say(core.state.ended?'Turno encerrado. Reinicie a jogada.':'Energia insuficiente para esta carta.');return;}
  const card=world.cards.find(c=>c.definition.id===id);
  held={source,card,near:!!hit.near,distance:hit.distance};say(`${card.definition.name}: aponte e confirme uma via.`);highlight();
  const gamepad=source?.userData?.inputSource?.gamepad;
  gamepad?.hapticActuators?.[0]?.pulse(.25,35)?.catch(()=>{});
}
function moveHeld(){
  if(!held)return;rayFor(held.source);
  world.table.getWorldPosition(v);plane.set(normal,-v.y-.04);
  hover=null;
  if(raycaster.ray.intersectPlane(plane,worldPoint)&&worldPoint.distanceTo(raycaster.ray.origin)<4){
    world.table.worldToLocal(worldPoint);
    const lane=Math.round(worldPoint.x/.67)+1;
    if(worldPoint.z>=-.91&&worldPoint.z<=-.24&&Math.abs(worldPoint.x-(lane-1)*.67)<.325&&core.nextSlot(held.card.definition.id,lane))hover=lane;
  }
  highlight();
}
function release(source){
  if(!held||held.source!==source)return;
  const target=pick(source);if(target?.object.userData.kind==='button'){act(target.object.userData.id);return;}
  moveHeld();const {card}=held;const lane=hover;held=null;hover=null;
  if(lane!==null){const r=core.command('play-lane',{cardId:card.definition.id,lane});say(r.ok?`${card.definition.name} em campo. ${core.state.energy} de energia restante.`:r.reason);if(!r.ok)sync();}
  else {sync();say('Carta devolvida à mão. Escolha uma via disponível.');}
  highlight();
}
function highlight(){const valid=held?core.validSlots(held.card.definition.id):[];const key=valid.join(',')+hover;if(key!==lastHighlight){world.highlight(valid,hover);lastHighlight=key;}}
function mousePosition(e){const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);}
let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{
  if(renderer.xr.isPresenting||e.button!==0)return;mouseActive=true;mousePosition(e);
  if(held?.source==='mouse'){release('mouse');down=null;return;}
  down={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);begin('mouse');
});
renderer.domElement.addEventListener('pointermove',e=>{mousePosition(e);mouseActive=true;if(!held&&!renderer.xr.isPresenting)renderer.domElement.style.cursor=pick('mouse')?'pointer':'default';});
renderer.domElement.addEventListener('pointerup',e=>{mousePosition(e);if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)release('mouse');down=null;});
renderer.domElement.addEventListener('pointercancel',()=>{down=null;cancel();});
window.addEventListener('blur',()=>{down=null;cancel();});
renderer.domElement.addEventListener('wheel',e=>{if(renderer.xr.isPresenting)return;e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.0004,.75,1.4);desktopCamera();},{passive:false});
window.addEventListener('keydown',e=>{if(/INPUT|BUTTON|SUMMARY/.test(document.activeElement.tagName))return;if(e.key==='Escape')cancel();if(e.key.toLowerCase()==='r')act('reset');if(e.key==='Enter')act('end');});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);if(!renderer.xr.isPresenting)desktopCamera();});

const lineGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]);
for(let i=0;i<2;i++){
  const c=renderer.xr.getController(i);scene.add(c);controllers.push(c);
  const line=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:0x72ddeb}));line.scale.z=2;c.add(line);c.userData.line=line;c.userData.buttons=new Set();
  c.addEventListener('connected',e=>{c.userData.inputSource=e.data;c.visible=true;});
  c.addEventListener('disconnected',()=>{if(held?.source===c)cancel();c.userData.buttons.clear();c.visible=false;});
  for(const kind of ['select','squeeze']){
    c.addEventListener(kind+'start',()=>{c.userData.buttons.add(kind);if(c.userData.buttons.size===1)begin(c);});
    c.addEventListener(kind+'end',()=>{c.userData.buttons.delete(kind);/* Selection remains until the next click on a lane. */});
  }
}
function recenter(frame){
  const pose=frame?.getViewerPose(renderer.xr.getReferenceSpace());if(!pose)return;
  const {position,orientation}=pose.transform;
  const q=new THREE.Quaternion(orientation.x,orientation.y,orientation.z,orientation.w);
  v.set(0,0,-1).applyQuaternion(q);const yaw=Math.atan2(-v.x,-v.z);
  world.stage.position.set(position.x,0,position.z);world.stage.rotation.y=yaw;
  world.table.position.y=THREE.MathUtils.clamp(position.y-.5,.55,1.15);
  document.querySelector('#height').value=world.table.position.y;pendingRecenter=false;say('Clique em uma carta; depois clique na via.');
}
renderer.xr.addEventListener('sessionstart',()=>{cancel();document.body.classList.add('xr');camera.position.set(0,0,0);camera.quaternion.identity();pendingRecenter=true;});
renderer.xr.addEventListener('sessionend',()=>{cancel();controllers.forEach(c=>c.userData.buttons.clear());document.body.classList.remove('xr');world.stage.position.set(0,0,0);world.stage.rotation.set(0,0,0);desktopCamera();vrButton.textContent='Entrar em VR';});
async function setupXR(){
  if(!isSecureContext){vrButton.textContent='VR precisa de HTTPS';return;}
  if(!navigator.xr){vrButton.textContent='Abra no Quest para VR';return;}
  try{if(!await navigator.xr.isSessionSupported('immersive-vr')){vrButton.textContent='VR indisponível neste aparelho';return;}}
  catch{vrButton.textContent='VR indisponível';return;}
  vrButton.disabled=false;vrButton.textContent='Entrar em VR';
  vrButton.onclick=async()=>{
    vrButton.disabled=true;let session;
    try{
      session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});
      await renderer.xr.setSession(session);
      if(session.supportedFrameRates?.includes(72)&&session.updateTargetFrameRate)await session.updateTargetFrameRate(72).catch(()=>{});
      session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible')cancel();});
    }catch(error){if(session)await session.end().catch(()=>{});say(`Não foi possível iniciar VR: ${error.message}`);}
    finally{vrButton.disabled=false;}
  };
}
setupXR();
let previous=0,elapsed=0,frames=0,lastStats={fps:0,calls:0,triangles:0};
renderer.setAnimationLoop((time,frame)=>{
  if(pendingRecenter&&frame)recenter(frame);
  if(held)moveHeld();
  if(world.hologram.visible)world.hologram.rotation.y=Math.sin(time*.0007)*.12;
  renderer.render(scene,camera);
  if(previous){elapsed+=Math.min(time-previous,100);frames++;}
  previous=time;
  if(elapsed>1000){lastStats={fps:Math.round(frames*1000/elapsed),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};world.performance.paint([`${lastStats.fps} FPS`,`${lastStats.calls} draws · ${Math.round(lastStats.triangles/1000)}k tris`]);frames=0;elapsed=0;}
});
// Public integration seam: all mutations still pass through command validation.
window.guerrasVR=Object.freeze({
  version:'0.2.0',events:core,
  command(type,payload){cancel();const result=core.command(type,payload);say(result.ok?'Estado atualizado.':result.reason);return result;},
  getState:()=>core.snapshot(),getMetrics:()=>({...lastStats}),
});
registerTools(window.guerrasVR);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancel();say('A renderização foi interrompida. Recarregue a página.');});
