import * as THREE from '../vendor/three.module.min.js';
import {createCardView,createInspection,createMatchPanel,createOpponentProjection} from './cards.js?v=0.8.0';
const GOLD=0xc39b55, INK=0x17222a, CYAN=0x53dff2;
export function createWorld(scene){
  scene.background=new THREE.Color(0x32313a);scene.fog=new THREE.Fog(0x32313a,9,26);
  scene.add(new THREE.HemisphereLight(0xffe2ab,0x324654,2.1));
  const sun=new THREE.DirectionalLight(0xffd2a0,2.3);sun.position.set(-3,7,-4);scene.add(sun);
  const stage=new THREE.Group();scene.add(stage);
  const table=new THREE.Group();table.position.y=.8;table.position.z=-.3;stage.add(table);
  const hand=new THREE.Group();hand.position.set(0,.8,-.45);stage.add(hand);
  const batches=new Map();
  function box(parent,x,y,z,w,h,d,color){
    const key=parent.uuid+':'+color;
    if(!batches.has(key))batches.set(key,{parent,color,items:[]});
    batches.get(key).items.push([x,y,z,w,h,d]);
  }
  const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.83,metalness:.15});
  function mesh(parent,geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
  // All architecture boxes sharing a color are instanced, including table trim.
  box(stage,0,-.07,-3,24,.12,24,0x76624e);
  for(const x of [-3.1,3.1])for(const z of [1,-2.7,-6.4]){
    box(stage,x,1.75,z,.65,3.5,.65,0x8c7152);
    box(stage,x,.16,z,.94,.32,.94,0x4a4037);
    box(stage,x,3.35,z,.95,.25,.95,GOLD);
    for(let y=.7;y<3;y+=.45)box(stage,x,y,z+.33,.38,.06,.025,0x554535);
  }
  const pyramidMat=mat(0xb59168);
  for(const [x,z,s] of [[-5,-11,4],[3,-13,5],[7,-15,3]]){
    const p=mesh(stage,new THREE.ConeGeometry(s,s*1.3,4),pyramidMat,x,s*.65,z);p.rotation.y=Math.PI/4;
  }
  mesh(stage,new THREE.SphereGeometry(.7,16,8),new THREE.MeshBasicMaterial({color:0xffd697}),-3,4.5,-15);
  box(table,0,-.09,-1.05,2.18,.18,1.8,INK);
  box(table,0,-.185,-1.05,2.26,.045,1.88,GOLD);
  for(const x of [-1.08,1.08])box(table,x,.012,-1.05,.024,.025,1.8,GOLD);
  for(const z of [-.15,-1.95])box(table,0,.012,z,2.18,.025,.024,GOLD);
  for(const x of [-.99,.99])for(const z of [-.28,-1.82])box(table,x,-.46,z,.12,.72,.12,0x383636);
  for(const x of [-.335,.335])box(table,x,.012,-1.05,.018,.02,1.6,GOLD);
  const river=mesh(table,new THREE.BoxGeometry(2.12,.026,.17),new THREE.MeshBasicMaterial({color:0x107991}),0,.015,-1.05);
  for(const z of [-.955,-1.145])box(table,0,.026,z,2.12,.01,.009,CYAN);
  const ripples=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0x72dceb}),18);
  const tmp=new THREE.Object3D();for(let i=0;i<18;i++){tmp.position.set(-1+i*.12,.032,-1.05+Math.sin(i*2)*.06);tmp.scale.set(.05,.002,.004);tmp.updateMatrix();ripples.setMatrixAt(i,tmp.matrix);}table.add(ripples);
  const slots=[];
  for(let side=0;side<2;side++)for(let lane=0;lane<3;lane++)for(let cell=0;cell<4;cell++){
    const x=(lane-1)*.67+(cell%2===0?-.132:.132);
    const z=side===0?-.77+Math.floor(cell/2)*.27:-1.34-Math.floor(cell/2)*.27;
    box(table,x,.025,z,.246,.008,.252,GOLD);
    slots.push({id:`${side===0?'p':'o'}-${lane}-${cell}`,side,lane,cell,position:new THREE.Vector3(x,.034,z)});
  }
  const slotMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.23,.012,.236),mat(0xffffff),24);
  slots.forEach((s,i)=>{tmp.position.copy(s.position);tmp.scale.set(1,1,1);tmp.updateMatrix();slotMesh.setMatrixAt(i,tmp.matrix);slotMesh.setColorAt(i,new THREE.Color(s.side?0x302e2a:0x263941));});table.add(slotMesh);
  // One canvas atlas and one material for every text surface, including card faces.
  const atlas=document.createElement('canvas');atlas.width=2048;atlas.height=2048;
  const ctx=atlas.getContext('2d');const texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
  const labelMat=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide});let cellIndex=0;
  function label(width,height,x,y,z,lines,opts={}){
    const id=cellIndex++;const ax=id%4*512,ay=Math.floor(id/4)*256;
    if(id>=32)throw new Error('Text atlas full');
    const g=new THREE.PlaneGeometry(width,height),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(ax+uv.getX(i)*512)/2048,1-(ay+(1-uv.getY(i))*256)/2048);
    const m=mesh(opts.parent||table,g,labelMat,x,y,z);m.rotation.x=opts.flat===false?0:-Math.PI/2;
    const paint=(text)=>{
      ctx.clearRect(ax,ay,512,256);ctx.fillStyle=opts.bg||'#142029';ctx.strokeStyle=opts.border||'#b9995e';ctx.lineWidth=5;
      if(opts.shape==='oval'){ctx.beginPath();ctx.ellipse(ax+256,ay+128,245,116,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
      else {ctx.fillRect(ax,ay,512,256);ctx.strokeRect(ax+7,ay+7,498,242);}
      const rows=Array.isArray(text)?text:[text];
      rows.forEach((line,i)=>{ctx.fillStyle=i===0?(opts.color||'#e9cb8c'):'#d4e7e9';ctx.textAlign='center';ctx.textBaseline='middle';const size=rows.length===1?(opts.singleSize||36):i===0?(opts.titleSize||32):(opts.valueSize||44);ctx.font=`${size}px ${i===0?'Georgia':'sans-serif'}`;ctx.fillText(line,ax+256,ay+256*(i+1)/(rows.length+1),475);});texture.needsUpdate=true;
    };paint(lines);return {mesh:m,paint};
  }
  const controls=[];
  const laneLabels=[];for(let lane=0;lane<3;lane++){
    const own=label(.3,.15,(lane-1)*.67,.17,-.25,['VOCÊ','0'],{flat:false,shape:'oval',bg:'#102a34',border:'#d8b46d'});
    const enemy=label(.46,.23,(lane-1)*.67,.22,-1.84,['BOT','0'],{flat:false,shape:'oval',titleSize:42,valueSize:76,bg:'#102a34',border:'#63ddea'});
    enemy.mesh.userData={kind:'opponent-lane',lane};controls.push(enemy.mesh);laneLabels.push(own,enemy);
  }
  label(.32,.065,0,.034,-1.05,'RIO NILO',{bg:'#107991',border:'#107991',color:'#d1fcff'});
  const energy=label(.42,.11,0,-.24,.11,['RODADA 1 / 6','1 ENERGIA'],{parent:hand,flat:false,bg:'#102a34',border:'#63ddea'});energy.mesh.rotation.x=-.74;energy.mesh.renderOrder=60;energy.mesh.material=energy.mesh.material.clone();energy.mesh.material.depthTest=false;
  for(let i=0;i<6;i++)box(table,1.3,.035+i*.009,-.56,.23,.009,.32,i%2?INK:GOLD);
  const deckLabel=label(.23,.31,1.3,.094,-.56,['☥','DECK  15']);
  const stateLabel=label(.69,.13,0,.09,-1.97,['OPONENTE','Guardião do horizonte'],{flat:false});
  const message=label(.78,.1,0,.055,-.155,'SELECIONE UMA CARTA');
  function button(id,text,x,z,width=.43){const b=label(width,.115,x,.05,z,text,{bg:'#20363c',border:'#63bfce'});b.mesh.userData={kind:'button',id};controls.push(b.mesh);return b;}
  button('reset','REINICIAR JOGADA',-.78,-.03,.5);const endButton=button('end','FINALIZAR TURNO',.78,-.03,.5);
  const skipButton=button('skip','PULAR ALVO',0,.095,.42);skipButton.mesh.visible=false;
  button('lower','MESA −',-1.3,-.88,.25);button('raise','MESA +',-1.3,-1.03,.25);
  button('recenter','AJUSTAR POSIÇÃO',1.3,-.93,.32);
  const performance=label(.38,.13,1.31,.06,-1.19,['DESEMPENHO','Aguardando']);
  for(let lane=0;lane<3;lane++){
    const hit=mesh(table,new THREE.PlaneGeometry(.61,.59),new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}), (lane-1)*.67,.046,-1.56);
    hit.rotation.x=-Math.PI/2;hit.userData={kind:'opponent-lane',lane};controls.push(hit);
  }
  const cardView=createCardView(table,hand,slots),cards=cardView.cards;
  const projection=createOpponentProjection(table,cardView);
  const inspection=createInspection(table),matchPanel=createMatchPanel(table);
  const arrangeHand=cardView.arrangeHand;
  function jackal(parent,scale,material){
    const g=new THREE.Group();parent.add(g);g.scale.setScalar(scale);
    mesh(g,new THREE.CylinderGeometry(.19,.27,.62,6),material,0,.38,0);
    mesh(g,new THREE.IcosahedronGeometry(.18,0),material,0,.84,0);
    const snout=mesh(g,new THREE.ConeGeometry(.10,.3,4),material,0,.82,.2);snout.rotation.x=Math.PI/2;
    for(const x of [-.11,.11])mesh(g,new THREE.ConeGeometry(.075,.32,4),material,x,1.08,0);
    for(const x of [-.29,.29]){const arm=mesh(g,new THREE.CylinderGeometry(.045,.06,.48,5),material,x,.4,.02);arm.rotation.z=x>0?.2:-.2;}
    mesh(g,new THREE.TorusGeometry(.21,.026,4,12),material,0,.66,0).rotation.x=Math.PI/2;
    return g;
  }
  const opponent=new THREE.Group();stage.add(opponent);opponent.position.set(0,0,-2.65);
  const statue=jackal(opponent,1.1,mat(0x192329));statue.position.set(0,.45,0);
  box(opponent,0,.23,0,.9,.46,.7,0x383636);
  const hologram=jackal(table,.32,new THREE.MeshBasicMaterial({color:CYAN,wireframe:true,transparent:true,opacity:.8,depthWrite:false}));hologram.visible=false;
  for(const b of batches.values()){
    const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat(b.color),b.items.length);
    b.items.forEach(([x,y,z,w,h,d],i)=>{tmp.position.set(x,y,z);tmp.scale.set(w,h,d);tmp.updateMatrix();inst.setMatrixAt(i,tmp.matrix);});b.parent.add(inst);
  }
  const baseColors=[new THREE.Color(0x263941),new THREE.Color(0x302e2a)];const validColor=new THREE.Color(0x166f7d),hoverColor=new THREE.Color(0x65e2e9);
  function highlight(valid=[],hover=null){slots.forEach((s,i)=>slotMesh.setColorAt(i,hover!==null&&s.side===0&&s.lane===hover?hoverColor:valid.includes(s.id)?validColor:baseColors[s.side]));slotMesh.instanceColor.needsUpdate=true;}
  let anubisSlot=null,hologramElapsed=0;
  function update(delta){
    if(!hologram.visible)return;hologramElapsed+=Math.max(0,delta);
    const progress=Math.min(1,hologramElapsed/1.8);
    hologram.scale.setScalar(.32*Math.min(1,.2+progress*6));
    const opacity=.8*Math.min(1,progress*8)*Math.min(1,(1-progress)*4);
    hologram.traverse(object=>{if(object.isMesh)object.material.opacity=opacity;});
    if(progress>=1)hologram.visible=false;
  }
  let currentState=null;
  function sync(state,powers){
    currentState=state;
    cardView.sync(state);matchPanel.paint(state);
    if(state.ended)projection.hide();
    if(state.turn===1&&state.phase==='plan'&&!state.cards.some(card=>card.zone==='board'))projection.hide();
    if(projection.group.visible)projection.show(projection.lane,state,true);
    const revealed=state.cards.find(c=>c.id===state.lastReveal&&c.key==='anubis'&&c.revealed);
    const marker=revealed?state.seed+':'+revealed.id:null;
    if(marker&&marker!==anubisSlot){anubisSlot=marker;hologramElapsed=0;hologram.visible=true;hologram.scale.setScalar(.064);hologram.position.copy(slots.find(s=>s.id===revealed.slot).position).y+=.03;}
    if(state.turn===1&&state.phase==='plan'&&!state.cards.some(c=>c.zone==='board')){hologram.visible=false;anubisSlot=null;}
    energy.paint(['RODADA '+state.turn+' / 6',state.energy+' ENERGIA']);
    deckLabel.paint(['SEU DECK',state.deck+' CARTAS']);
    stateLabel.paint(['BOT · '+state.opponentHand+' NA MÃO',state.ended?'PARTIDA ENCERRADA':'PRIORIDADE: '+(state.priority===0?'VOCÊ':'BOT')]);
    endButton.paint(state.ended?'NOVA PARTIDA':state.phase==='plan'?'FINALIZAR TURNO':'REVELANDO…');
    skipButton.mesh.visible=state.aim?.side===0;
    for(let i=0;i<3;i++){laneLabels[i*2].paint(['VOCÊ',String(powers[i])]);laneLabels[i*2+1].paint(['BOT',String(state.opponentPower[i])]);}
    highlight();
  }
  function showOpponentLane(lane){if(!currentState)return;projection.show(lane,currentState);}
  function attachSelected(id,parent){cardView.attachSelected(id,parent);}
  function clearSelected(){cardView.clearSelected();}
  function setHandMounted(value){cardView.setMounted(value);energy.mesh.rotation.x=value?-.35:-.74;}
  const cardTargets=[...cards.flatMap(card=>[card.mesh,card.badge]),...projection.targets];
  return {stage,table,hand,opponent,slots,slotMesh,cards,cardTargets,controls,hologram,performance,laneLabels,energy,matchPanel,highlight,sync,update,message,arrangeHand,river,inspection,projection,showOpponentLane,attachSelected,clearSelected,setHandMounted};
}
