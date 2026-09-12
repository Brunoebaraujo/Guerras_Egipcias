import * as THREE from '../vendor/three.module.min.js';
import {DEFAULT_PLACEMENT,normalizePlacement,tableTransform,handTransform,placementCode} from './placement.js?v=0.3.0';
export function createCalibration(scene,world,onChange){
  const key='guerrasVR.placement.v03',snapshotKey=key+'.snapshot',draftKey=key+'.draft';
  let settings={...DEFAULT_PLACEMENT},saved=false,savedSnapshot=null,notice='',confirmDefaults=false;
  try{savedSnapshot=JSON.parse(localStorage.getItem(snapshotKey));const data=JSON.parse(localStorage.getItem(draftKey))||JSON.parse(localStorage.getItem(key));if(data){settings=normalizePlacement(data);saved=JSON.stringify(settings)===JSON.stringify(savedSnapshot?.settings||JSON.parse(localStorage.getItem(key)));}}catch{}
  let armed=false;
  let eyeHeight=1.25,anchor={x:0,z:0,yaw:0};
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(1.12,1.12),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:1,fog:false,toneMapped:false,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  panel.renderOrder=10000;panel.frustumCulled=false;panel.layers.enableAll();panel.visible=false;scene.add(panel);
  const entries=[
    ['MAIS LONGE','distance',.1],['MAIS PERTO','distance',-.1],['MESA ↓','height',-.05],['MESA ↑','height',.05],
    ['MESA ←','lateral',-.05],['MESA →','lateral',.05],['GIRAR ←','angle',-5],['GIRAR →','angle',5],
    ['VOCÊ ←','playerX',-.05],['VOCÊ →','playerX',.05],['VOCÊ AVANÇA','playerZ',-.05],['VOCÊ RECUA','playerZ',.05],
    ['CARTAS LONGE','handDistance',.05],['CARTAS PERTO','handDistance',-.05],['CARTAS ↓','handDrop',.05],['CARTAS ↑','handDrop',-.05],
    ['ALINHAR OLHAR','align'],['PADRÃO','defaults'],['SALVAR','save'],['JOGAR','close']
  ];
  function draw(){
    ctx.fillStyle='#10222e';ctx.fillRect(0,0,1024,1024);ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#f0cf8c';ctx.font='bold 38px sans-serif';ctx.fillText('AJUSTAR POSIÇÃO • 0.7.0',512,48);
    ctx.fillStyle='#d4f4f7';ctx.font='25px sans-serif';ctx.fillText(`Mesa: ${Math.round(settings.height*100)} cm altura · ${Math.round(settings.distance*100)} cm distância`,512,103);
    ctx.fillText(`Lateral ${Math.round(settings.lateral*100)} cm · Giro ${settings.angle}° · Cartas ${Math.round(settings.handDistance*100)} cm`,512,141);
    if(armed)entries.forEach(([name],i)=>{const x=18+(i%4)*250,y=195+Math.floor(i/4)*124;ctx.fillStyle=i===19?'#29677a':'#243e4b';ctx.fillRect(x,y,238,108);ctx.strokeStyle='#91c4ce';ctx.lineWidth=2;ctx.strokeRect(x,y,238,108);ctx.fillStyle='#fff0d1';ctx.font='bold 24px sans-serif';ctx.fillText(name,x+119,y+54,224);});
    if(!armed){ctx.fillStyle='#29677a';ctx.fillRect(220,320,584,160);ctx.fillStyle='#ffffff';ctx.font='bold 38px sans-serif';ctx.fillText('VEJO O PAINEL',512,400);ctx.font='25px sans-serif';ctx.fillText('Confirme somente se este texto estiver visível.',512,550);}
    ctx.fillStyle='#e8d09d';ctx.font='26px monospace';ctx.fillText(placementCode(settings),512,865);
    ctx.font='23px sans-serif';ctx.fillText(notice||(saved?'Posição salva e verificada.':'Alterações em rascunho. SALVAR confirma.'),512,915,990);
    ctx.fillText('Pressione o analógico para reabrir este painel.',512,954);
    ctx.fillText('Ao sair do VR, copie as coordenadas na página.',512,990);texture.needsUpdate=true;
    const out=document.querySelector('#coordinates');if(out)out.value=JSON.stringify(report(),null,2);
    const status=document.querySelector('#placement-status');if(status)status.textContent=`Em uso: ${placementCode(settings)}. ${notice||''} ${savedSnapshot?'Salvo: '+savedSnapshot.code+' em '+savedSnapshot.savedAt:'Ainda sem salvamento confirmado nesta versão.'}`;
  }
  function apply(){
    try{localStorage.setItem(draftKey,JSON.stringify(settings));}catch{}
    const t=tableTransform(settings);world.table.position.set(t.x,t.y,t.z);world.table.rotation.y=t.yaw;
    world.opponent.position.set(t.x-Math.sin(t.yaw)*2.65,0,t.z-Math.cos(t.yaw)*2.65);world.opponent.rotation.y=t.yaw;
    const h=handTransform(settings,eyeHeight);world.hand.position.set(h.x,h.y,h.z);
    world.stage.updateMatrixWorld(true);onChange?.();draw();
    const slider=document.querySelector('#height');if(slider)slider.value=settings.height;
  }
  function current(){return {version:'0.7.0',code:placementCode(settings),settings:{...settings},eyeHeight,anchor:{...anchor},table:tableTransform(settings),hand:handTransform(settings,eyeHeight)};}
  function report(){return {...(savedSnapshot||current()),exportedFrom:savedSnapshot?'confirmed-save':'current-unsaved',savedSnapshot:savedSnapshot?structuredClone(savedSnapshot):null,current:current(),unsavedChanges:!saved};}
  function align(position,orientation,{center=false}={}){
    if(center){settings=normalizePlacement({...settings,lateral:0,playerX:0,angle:0});saved=false;notice="Mesa centralizada no olhar. Altura e distância mantidas.";}
    const dir=new THREE.Vector3(0,0,-1).applyQuaternion(orientation);const yaw=Math.atan2(-dir.x,-dir.z);
    anchor={x:position.x,z:position.z,yaw};eyeHeight=position.y;
    world.stage.position.set(position.x,0,position.z);world.stage.rotation.y=yaw;apply();
  }
  function open(position,orientation){
    const direction=new THREE.Vector3(0,0,-1).applyQuaternion(orientation);direction.y=0;if(direction.lengthSq()<.01)direction.set(0,0,-1);direction.normalize();
    panel.position.copy(position).addScaledVector(direction,1.1);panel.position.y-=.06;panel.rotation.set(0,Math.atan2(-direction.x,-direction.z),0);panel.visible=true;armed=false;draw();panel.updateMatrixWorld(true);
  }
  function action(id){
    if(id==='close'){panel.visible=false;return 'closed';}
    if(id==='align')return 'align';
    if(id==='low'){settings=normalizePlacement({height:.4,distance:.95,lateral:0,angle:0,playerX:0,playerZ:-.05,handDistance:.55,handDrop:.8});saved=false;notice='Posição baixa aplicada e centralizada. SALVAR confirma.';apply();return;}
    if(id==='defaults'){if(!confirmDefaults){confirmDefaults=true;notice='Toque PADRÃO outra vez para restaurar.';draw();return;}settings={...DEFAULT_PLACEMENT};saved=false;confirmDefaults=false;notice='Padrão em uso; último salvamento preservado.';apply();return;}
    confirmDefaults=false;
    if(id==='save'){try{const snapshot={...current(),savedAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify(settings));localStorage.setItem(snapshotKey,JSON.stringify(snapshot));const check=JSON.parse(localStorage.getItem(snapshotKey));if(check.code!==snapshot.code||check.savedAt!==snapshot.savedAt)throw new Error('verification');savedSnapshot=check;saved=true;notice='SALVO E VERIFICADO — '+snapshot.code;}catch{saved=false;notice='Não foi possível salvar. Copie os valores em uso.';}draw();return;}
  }
  function press(raycaster){
    if(!panel.visible)return false;const hit=raycaster.intersectObject(panel)[0];if(!hit)return false;
    const x=hit.uv.x*1024,y=(1-hit.uv.y)*1024;
    if(!armed){if(x>=220&&x<=804&&y>=320&&y<=480){armed=true;draw();}return true;}
    const i=entries.findIndex((_,i)=>{const bx=18+(i%4)*250,by=195+Math.floor(i/4)*124;return x>=bx&&x<=bx+238&&y>=by&&y<=by+108;});
    if(i<0)return true;
    const [,id,delta]=entries[i];if(delta!==undefined){confirmDefaults=false;notice='';settings=normalizePlacement({...settings,[id]:settings[id]+delta});saved=false;apply();return true;}
    return action(id)||true;
  }
  apply();
  return {panel,open,align,press,report,action,apply,adjust(field,delta){confirmDefaults=false;notice='';settings=normalizePlacement({...settings,[field]:settings[field]+delta});saved=false;apply();},setHeight(height){notice='';settings=normalizePlacement({...settings,height});saved=false;apply();}};
}
