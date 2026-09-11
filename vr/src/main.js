import * as THREE from '../vendor/three.module.min.js';
import {MatchCore} from './core.js?v=0.5.0';
import {createWorld} from './scene.js?v=0.5.0';
import {createCalibration} from './calibration.js?v=0.5.0';
import {createGauntlet,canInteract} from './hands.js?v=0.5.0';
import {registerTools} from './webmcp.js?v=0.5.0';

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor(1);renderer.xr.setFoveation(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
document.querySelector('#game').appendChild(renderer.domElement);
const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.05,35);scene.add(camera);
const world=createWorld(scene);const core=new MatchCore();
const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();const rotation=new THREE.Matrix4();
const v=new THREE.Vector3(),worldPoint=new THREE.Vector3(),normal=new THREE.Vector3(0,1,0),plane=new THREE.Plane();
const controllers=[];let held=null,hover=null,lastHighlight='',pendingRecenter=false,pendingPanel=false,alignAfter=0,resetSpace=null,zoom=1,mouseActive=false;
const status=document.querySelector('#status'),vrButton=document.querySelector('#vr');
function say(text){status.textContent=text;world.message.paint(text);}
function desktopCamera(){camera.position.set(0,2.7*zoom,2.1*zoom);camera.lookAt(0,.72,-.85);camera.aspect=innerWidth/innerHeight;camera.fov=innerWidth<640?64:48;camera.updateProjectionMatrix();}
desktopCamera();
let current=core.snapshot();
function sync(){current=core.snapshot();world.sync(current,current.powers);say(current.message);document.querySelector('#end').textContent=current.ended?'Nova partida':'Finalizar turno';document.querySelector('#end').disabled=!current.ended&&current.phase!=='plan';document.querySelector('#reset').disabled=current.ended||current.phase!=='plan';}
core.addEventListener('runtime:error',e=>say(e.detail.reason));
core.addEventListener('state:changed',sync);sync();
const calibration=createCalibration(scene,world,()=>cancel());
function openCalibration(){
  cancel();
  const cam=renderer.xr.isPresenting?renderer.xr.getCamera():camera;
  calibration.open(cam.getWorldPosition(new THREE.Vector3()),cam.getWorldQuaternion(new THREE.Quaternion()));
}
function cancel(){held=null;world.inspection.show(null);hover=null;highlight();}
function act(id){
  if(id==='reset'){cancel();const r=core.command('reset');say(r.ok?'Jogadas desta rodada devolvidas à mão.':r.reason);}
  if(id==='end'){cancel();const r=core.command(current.ended?'new-match':'end-turn');if(!r.ok)say(r.reason);}
  if(id==='skip'){cancel();const r=core.command('skip-aim');if(!r.ok)say(r.reason);}
  if(id==='lower'||id==='raise'){calibration.adjust('height',id==='raise'?.05:-.05);say(`Altura da mesa: ${Math.round(world.table.position.y*100)} cm`);}
  if(id==='recenter')openCalibration();
}
document.querySelector('#reset').onclick=()=>act('reset');document.querySelector('#end').onclick=()=>act('end');
document.querySelector('#height').oninput=e=>calibration.setHeight(Number(e.target.value));
document.querySelector('#placement').onclick=openCalibration;
const flat=document.querySelector('#flat-placement');
for(const [label,field,delta] of [['Mais longe','distance',.1],['Mais perto','distance',-.1],['Mesa abaixo','height',-.05],['Mesa acima','height',.05],['Mesa esquerda','lateral',-.05],['Mesa direita','lateral',.05],['Girar esquerda','angle',-5],['Girar direita','angle',5],['Jogador esquerda','playerX',-.05],['Jogador direita','playerX',.05],['Jogador avança','playerZ',-.05],['Jogador recua','playerZ',.05],['Cartas longe','handDistance',.05],['Cartas perto','handDistance',-.05],['Cartas abaixo','handDrop',.05],['Cartas acima','handDrop',-.05]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>calibration.adjust(field,delta);flat.appendChild(b);}
for(const [label,action] of [['Usar posição baixa aprovada','low'],['Salvar posição','save'],['Restaurar padrão (confirmar duas vezes)','defaults']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>calibration.action(action);flat.appendChild(b);}
document.querySelector('#copy-coordinates').onclick=async()=>{const out=document.querySelector('#coordinates');out.value=JSON.stringify(calibration.report(),null,2);try{await navigator.clipboard.writeText(out.value);say('Coordenadas copiadas. Cole na conversa.');}catch{out.focus();out.select();say('Selecione e copie as coordenadas abaixo.');}};
document.querySelector('#download-coordinates').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(calibration.report(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='guerras-vr-posicao.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function rayFor(source){
  scene.updateMatrixWorld(true);
  if(source==='mouse')raycaster.setFromCamera(pointer,camera);
  else {source.updateWorldMatrix(true,false);rotation.extractRotation(source.matrixWorld);raycaster.ray.origin.setFromMatrixPosition(source.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation).normalize();}
}
function pick(source){
  rayFor(source);scene.updateMatrixWorld(true);
  const targets=[...world.cards.filter(c=>c.mesh.visible).map(c=>c.mesh),...world.controls.filter(c=>c.visible)];
  return raycaster.intersectObjects(targets,false)[0];
}
function begin(source){
  if(!canInteract(source))return;
  rayFor(source);
  const panelAction=calibration.press(raycaster);
  if(panelAction){if(panelAction==='align'){pendingRecenter=true;pendingPanel=true;if(!renderer.xr.isPresenting){world.stage.position.set(0,0,0);world.stage.rotation.y=0;calibration.apply();pendingRecenter=false;}}return;}
  if(held){if(held.source===source)release(source);return;}
  const hit=pick(source);if(!hit)return;
  if(hit.object.userData.kind==='button'){act(hit.object.userData.id);return;}
  const id=hit.object.userData.id;
  const card=world.cards.find(c=>c.definition.id===id);if(!card)return;
  world.inspection.show(card.definition);
  if(current.aim?.side===0){const r=core.command('aim',{cardId:id});if(!r.ok)say(r.reason);return;}
  if(card.definition.pickup){const r=core.command('pickup',{cardId:id});if(!r.ok)say(r.reason);return;}
  const valid=core.validSlots(id);
  if(!valid.length){say(card.definition.hidden?'Carta do bot ainda oculta.':card.definition.text+' · '+(current.phase==='plan'?'Sem jogada disponível.':'Aguarde a revelação.'));return;}
  held={source,card,valid};say(card.definition.name+': aponte e confirme uma via.');highlight();
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
    if(worldPoint.z>=-.91&&worldPoint.z<=-.24&&Math.abs(worldPoint.x-(lane-1)*.67)<.325&&held.valid.some(s=>s.startsWith('p-'+lane+'-')))hover=lane;
  }
  highlight();
}
function release(source){
  if(!held||held.source!==source)return;
  const target=pick(source);if(target?.object.userData.kind==='button'){act(target.object.userData.id);return;}
  moveHeld();const card={definition:{...held.card.definition}};const lane=hover;held=null;hover=null;world.inspection.show(null);
  if(lane!==null){const r=core.command('play-lane',{cardId:card.definition.id,lane});say(r.ok?`${card.definition.name} em campo. ${current.energy} de energia restante.`:r.reason);if(!r.ok)sync();}
  else {sync();say('Carta devolvida à mão. Escolha uma via disponível.');}
  highlight();
}
function highlight(){const valid=held?held.valid:[];const key=valid.join(',')+hover;if(key!==lastHighlight){world.highlight(valid,hover);lastHighlight=key;}}
function mousePosition(e){const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);}
let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{
  if(renderer.xr.isPresenting||e.button!==0)return;mouseActive=true;mousePosition(e);
  down={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);begin('mouse');
});
renderer.domElement.addEventListener('pointermove',e=>{mousePosition(e);mouseActive=true;if(!held&&!renderer.xr.isPresenting)renderer.domElement.style.cursor=pick('mouse')?'pointer':'default';});
renderer.domElement.addEventListener('pointerup',e=>{mousePosition(e);/* Click once on card, once on lane. */down=null;});
renderer.domElement.addEventListener('pointercancel',()=>{down=null;cancel();});
window.addEventListener('blur',()=>{down=null;cancel();});
renderer.domElement.addEventListener('wheel',e=>{if(renderer.xr.isPresenting)return;e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.0004,.75,1.4);desktopCamera();},{passive:false});
window.addEventListener('keydown',e=>{if(/INPUT|BUTTON|SUMMARY/.test(document.activeElement.tagName))return;if(e.key==='Escape')cancel();if(e.key.toLowerCase()==='r')act('reset');if(e.key==='Enter')act('end');});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);if(!renderer.xr.isPresenting)desktopCamera();});

const lineGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]);
const handMount=new THREE.Group();let leftGrip=null;
function mountCards(grip){leftGrip=grip;grip.add(handMount);handMount.position.set(0,.18,-.06);handMount.rotation.set(0,.65,0);handMount.add(world.hand);world.hand.position.set(0,0,0);world.hand.rotation.set(0,0,0);world.setHandMounted(true);}
function unmountCards(){leftGrip=null;world.stage.add(world.hand);world.hand.rotation.set(0,0,0);world.setHandMounted(false);calibration.apply();}
for(let i=0;i<2;i++){
  const c=renderer.xr.getController(i),grip=renderer.xr.getControllerGrip(i);scene.add(c,grip);controllers.push(c);c.userData.grip=grip;
  const line=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:0x72ddeb}));line.scale.z=2;c.add(line);c.userData.line=line;c.userData.buttons=new Set();
  c.addEventListener('connected',e=>{c.userData.inputSource=e.data;c.visible=true;line.visible=e.data.handedness==='right';grip.clear();if(['left','right'].includes(e.data.handedness))grip.add(createGauntlet(e.data.handedness));if(e.data.handedness==='left')mountCards(grip);});
  c.addEventListener('disconnected',()=>{if(held?.source===c)cancel();if(leftGrip===grip)unmountCards();c.userData.buttons.clear();c.userData.inputSource=null;c.visible=false;});
  for(const kind of ['select','squeeze']){
    c.addEventListener(kind+'start',()=>{c.userData.buttons.add(kind);if(c.userData.buttons.size===1)begin(c);});
    c.addEventListener(kind+'end',()=>c.userData.buttons.delete(kind));
  }
}
function recenter(frame){
  const pose=frame?.getViewerPose(renderer.xr.getReferenceSpace());if(!pose)return;
  const {position,orientation}=pose.transform;
  const q=new THREE.Quaternion(orientation.x,orientation.y,orientation.z,orientation.w);
  v.set(0,0,-1).applyQuaternion(q);const yaw=Math.atan2(-v.x,-v.z);
  calibration.align(new THREE.Vector3(position.x,position.y,position.z),q,{center:true});
  if(pendingPanel){calibration.open(new THREE.Vector3(position.x,position.y,position.z),q);pendingPanel=false;}
  pendingRecenter=false;say('Ajuste a posição e pressione JOGAR.');
}
function onReferenceReset(){cancel();pendingRecenter=true;pendingPanel=calibration.panel.visible;alignAfter=performance.now()+250;}
renderer.xr.addEventListener('sessionstart',()=>{cancel();document.body.classList.add('xr');camera.position.set(0,0,0);camera.quaternion.identity();pendingRecenter=true;pendingPanel=true;alignAfter=performance.now()+250;resetSpace=renderer.xr.getReferenceSpace();resetSpace?.addEventListener('reset',onReferenceReset);});
renderer.xr.addEventListener('sessionend',()=>{resetSpace?.removeEventListener('reset',onReferenceReset);resetSpace=null;cancel();unmountCards();controllers.forEach(c=>c.userData.buttons.clear());calibration.panel.visible=false;document.body.classList.remove('xr');world.stage.position.set(0,0,0);world.stage.rotation.set(0,0,0);desktopCamera();vrButton.textContent='Entrar em VR';});
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
  if(pendingRecenter&&frame&&time>=alignAfter)recenter(frame);
  for(const c of controllers){const pressed=!!c.userData.inputSource?.gamepad?.buttons[3]?.pressed;if(pressed&&!c.userData.stickPressed)openCalibration();c.userData.stickPressed=pressed;}
  if(held)moveHeld();
  const delta=previous?Math.min((time-previous)/1000,.1):0;
  if(!calibration.panel.visible)core.tick(delta);
  if(leftGrip){world.hand.position.set(0,0,0);world.hand.rotation.set(0,0,0);}
  world.update(delta);
  if(world.hologram.visible)world.hologram.rotation.y=Math.sin(time*.0007)*.12;
  renderer.render(scene,camera);
  if(previous){elapsed+=Math.min(time-previous,100);frames++;}
  previous=time;
  if(elapsed>1000){lastStats={fps:Math.round(frames*1000/elapsed),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};world.performance.paint([`${lastStats.fps} FPS`,`${lastStats.calls} draws · ${Math.round(lastStats.triangles/1000)}k tris`]);frames=0;elapsed=0;}
});
// Public integration seam: all mutations still pass through command validation.
window.guerrasVR=Object.freeze({
  version:'0.5.0',events:core,
  command(type,payload){cancel();const result=core.command(type,payload);say(result.ok?'Estado atualizado.':result.reason);return result;},
  getPlacement:()=>calibration.report(),getState:()=>core.snapshot(),getMetrics:()=>({...lastStats}),
});
registerTools(window.guerrasVR);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancel();say('A renderização foi interrompida. Recarregue a página.');});
