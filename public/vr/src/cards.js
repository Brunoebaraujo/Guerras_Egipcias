import * as THREE from '../vendor/three.module.min.js';
// A fixed pool keeps GPU allocations bounded across complete matches.
export function createCardView(table,hand,slots){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048;
 const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
 const images=new Map(),cards=[];let state=null,mounted=false;
 const powerCanvas=document.createElement('canvas');powerCanvas.width=1024;powerCanvas.height=512;
 const powerCtx=powerCanvas.getContext('2d'),powerTexture=new THREE.CanvasTexture(powerCanvas);powerTexture.colorSpace=THREE.SRGBColorSpace;
 const powerMaterial=new THREE.MeshBasicMaterial({map:powerTexture,transparent:true,side:THREE.DoubleSide,depthTest:false});
 for(let i=0;i<32;i++){
  const geometry=new THREE.PlaneGeometry(.19,.25),uv=geometry.attributes.uv,ax=i%8*256,ay=Math.floor(i/8)*512;
  for(let j=0;j<uv.count;j++)uv.setXY(j,(ax+2+uv.getX(j)*252)/2048,1-(ay+2+(1-uv.getY(j))*508)/2048);
  const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;table.add(mesh);
  const bx=i%8*128,by=Math.floor(i/8)*128,badgeGeometry=new THREE.PlaneGeometry(.105,.105),badgeUv=badgeGeometry.attributes.uv;
  for(let j=0;j<badgeUv.count;j++)badgeUv.setXY(j,(bx+badgeUv.getX(j)*128)/1024,1-(by+(1-badgeUv.getY(j))*128)/512);
  const badge=new THREE.Mesh(badgeGeometry,powerMaterial);badge.visible=false;badge.renderOrder=30;table.add(badge);
  cards.push({mesh,badge,definition:{id:null},home:new THREE.Vector3(),rotation:new THREE.Euler(),ax,ay,bx,by,signature:''});
 }
 function paintPower(card){
  const {bx:x,by:y,definition:d}=card;powerCtx.clearRect(x,y,128,128);
  powerCtx.fillStyle=d.hidden?'#2b3640':'#102733';powerCtx.beginPath();powerCtx.arc(x+64,y+64,56,0,Math.PI*2);powerCtx.fill();
  powerCtx.strokeStyle=d.active?'#72fff0':'#e0bd72';powerCtx.lineWidth=9;powerCtx.stroke();
  powerCtx.fillStyle=d.hidden?'#b8c2c8':'#fff0bd';powerCtx.textAlign='center';powerCtx.textBaseline='middle';powerCtx.font='bold 72px sans-serif';powerCtx.fillText(d.hidden?'?':String(d.power),x+64,y+66);
  powerTexture.needsUpdate=true;
 }
 function paint(card){
  const {ax:x,ay:y,definition:d}=card;
  ctx.fillStyle='#102633';ctx.fillRect(x,y,256,512);
  const img=images.get(d.key);
  if(!d.hidden&&img?.complete&&img.naturalWidth)ctx.drawImage(img,x+5,y+6,246,500);
  if(d.hidden){ctx.strokeStyle='#aa8955';ctx.lineWidth=4;ctx.strokeRect(x+20,y+28,216,456);ctx.font='100px Georgia';ctx.fillStyle='#e0bc79';ctx.textAlign='center';ctx.fillText('☥',x+128,y+270);}
  else {
   ctx.fillStyle='#10202eef';ctx.fillRect(x+5,y+5,246,66);ctx.fillRect(x+5,y+430,246,76);
   ctx.fillStyle='#fff0c6';ctx.textAlign='center';ctx.font='bold 25px sans-serif';ctx.fillText(d.name,x+128,y+44,234);
   ctx.font='bold 29px sans-serif';ctx.fillText(`${d.cost} EN  ·  ${d.power} POD`,x+128,y+478,234);
  }
  ctx.lineWidth=d.aimable?10:5;ctx.strokeStyle=d.aimable||d.active?'#72fff0':d.zone==='board'&&!d.revealed?'#6fa3c6':'#dab66b';ctx.strokeRect(x+3,y+3,250,506);texture.needsUpdate=true;
 }
 function ensureImage(key){if(!key||images.has(key)||typeof Image==='undefined')return;const img=new Image();images.set(key,img);img.onload=()=>{for(const card of cards)if(card.mesh.visible&&card.definition.key===key)paint(card);};img.src=new URL('../card-art/'+(key==='token-cabra'?'cabra-nilo':key)+'.webp',import.meta.url).href;}
 function arrangeHand(ids){ids.forEach((id,index)=>{const card=cards.find(c=>c.mesh.visible&&c.definition.id===id);if(!card)return;const a=(index-(ids.length-1)/2)*.16;hand.add(card.mesh);card.home.set(Math.sin(a)*.63,-Math.abs(a)*.06,index*.001);card.rotation.set(mounted?-.35:-.74,0,-a*.65);card.mesh.position.copy(card.home);card.mesh.rotation.copy(card.rotation);});}
 function sync(s){state=s;for(let i=0;i<cards.length;i++){const card=cards[i],d=s.cards[i];card.mesh.visible=!!d;card.badge.visible=!!d&&d.zone==='board';if(!d){card.definition={id:null};card.signature='';continue;}card.definition=d;card.mesh.userData={kind:'card',id:d.id};card.badge.userData={kind:'card',id:d.id};const signature=JSON.stringify(d);if(signature!==card.signature){card.signature=signature;paint(card);paintPower(card);ensureImage(d.key);}if(d.zone==='board'){const slot=slots.find(slot=>slot.id===d.slot);table.add(card.mesh,card.badge);card.mesh.position.copy(slot.position).y+=.016;card.mesh.rotation.set(-Math.PI/2,0,0);card.badge.position.copy(slot.position);card.badge.position.setX(card.badge.position.x+.075);card.badge.position.y=.115;card.badge.position.z+=d.owner===0?.075:-.075;card.badge.rotation.set(0,0,0);}}arrangeHand(s.hand);}
 function setMounted(value){mounted=value;if(state)arrangeHand(state.hand);}
 return {cards,sync,arrangeHand,setMounted,material};
}

export function createOpponentProjection(table,cardView){
 const group=new THREE.Group();table.add(group);group.visible=false;
 const titleCanvas=document.createElement('canvas');titleCanvas.width=512;titleCanvas.height=128;const titleCtx=titleCanvas.getContext('2d');
 const titleTexture=new THREE.CanvasTexture(titleCanvas);titleTexture.colorSpace=THREE.SRGBColorSpace;
 const title=new THREE.Mesh(new THREE.PlaneGeometry(.62,.155),new THREE.MeshBasicMaterial({map:titleTexture,transparent:true,side:THREE.DoubleSide,depthTest:false}));group.add(title);
 const clones=Array.from({length:4},()=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.22,.29),cardView.material);mesh.renderOrder=20;group.add(mesh);return mesh;});
 let lane=null;
 function hide(){lane=null;group.visible=false;for(const clone of clones)clone.visible=false;}
 function show(nextLane,state,refresh=false){
  if(lane===nextLane&&group.visible&&!refresh){hide();return;}
  lane=nextLane;group.visible=true;group.position.set((lane-1)*.67,.31,-1.56);group.rotation.set(0,0,0);
  titleCtx.fillStyle='#102733ee';titleCtx.fillRect(0,0,512,128);titleCtx.strokeStyle='#72dfea';titleCtx.lineWidth=6;titleCtx.strokeRect(4,4,504,120);titleCtx.fillStyle='#fff0bd';titleCtx.font='bold 34px Georgia';titleCtx.textAlign='center';titleCtx.textBaseline='middle';titleCtx.fillText(`VIA ${lane+1} · BOT`,256,64);titleTexture.needsUpdate=true;title.position.set(0,.255,0);
  const defs=state.cards.filter(d=>d.zone==='board'&&d.owner===1&&Number(d.slot.split('-')[1])===lane);
  clones.forEach((clone,index)=>{const def=defs[index];clone.visible=!!def;if(!def)return;const source=cardView.cards.find(c=>c.definition.id===def.id);clone.geometry.dispose();clone.geometry=source.mesh.geometry.clone();clone.userData={kind:'card',id:def.id};clone.position.set((index-(defs.length-1)/2)*.16,0,index*.002);clone.scale.set(1.1,1.1,1.1);});
 }
 return {group,clones,title,get lane(){return lane;},show,hide,targets:clones};
}
export function createInspection(parent){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.7,.35),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));parent.add(mesh);mesh.position.set(-1.45,.55,-.35);mesh.rotation.x=-.5;mesh.visible=false;
 return {mesh,show(d){if(!d||d.hidden){mesh.visible=false;return;}mesh.visible=true;ctx.fillStyle='#112733';ctx.fillRect(0,0,1024,512);ctx.strokeStyle='#d8b26c';ctx.lineWidth=8;ctx.strokeRect(5,5,1014,502);ctx.textAlign='left';ctx.fillStyle='#ffe5ab';ctx.font='bold 48px Georgia';ctx.fillText(d.name,35,66,950);ctx.font='32px sans-serif';ctx.fillStyle='#81e6ed';ctx.fillText(`${d.cost} ENERGIA     ${d.power} PODER`,35,119);ctx.fillStyle='#edf4ee';ctx.font='32px sans-serif';let line='',y=180;for(const word of d.text.split(' ')){const next=line+word+' ';if(ctx.measureText(next).width>945){ctx.fillText(line,35,y);y+=40;line=word+' ';}else line=next;}ctx.fillText(line,35,y);texture.needsUpdate=true;}};
}
export function createMatchPanel(parent){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.85,.425),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));parent.add(mesh);mesh.position.set(1.55,.65,-1.3);mesh.rotation.set(-.15,-.25,0);
 return {mesh,paint(s){ctx.fillStyle='#112733';ctx.fillRect(0,0,1024,512);ctx.strokeStyle='#c7aa6b';ctx.lineWidth=7;ctx.strokeRect(5,5,1014,502);ctx.textAlign='left';ctx.fillStyle='#ffe5ab';ctx.font='bold 48px Georgia';ctx.fillText(s.ended?(s.result.side===0?'VITÓRIA':s.result.side===1?'DERROTA':'EMPATE'):'RODADA '+s.turn+' / 6',35,65);
 ctx.font='34px sans-serif';ctx.fillStyle='#80e4ef';ctx.fillText(s.ended?'Vias: você '+s.wins[0]+' × '+s.wins[1]+' bot':'Revela primeiro: '+(s.priority===0?'você':'bot'),35,120);
 ctx.fillStyle='#edf4ee';ctx.font='32px sans-serif';
 const rows=s.ended?['Poder nas vias (você / bot)',...s.powers.map((p,i)=>'Via '+(i+1)+': '+p+' / '+s.opponentPower[i]),s.result.tiebreak?'Desempate por saldo de poder':'Selecione NOVA PARTIDA na mesa']:s.phase==='plan'?['1. Escolha uma carta na mão esquerda.','2. Aponte a direita para uma via.','3. Confirme com o gatilho direito.','Finalize para revelar os dois lados.']:['FILA · '+s.queue.remaining+' por revelar',...s.queue.items.slice(0,3).map((c,i)=>(i+1)+'. '+(c.owner===0?'Você':'Bot')+' · '+c.name+' · via '+(c.lane+1)),s.effect||'Resolvendo efeitos…'];
 rows.forEach((line,i)=>ctx.fillText(line,35,195+i*58,954));texture.needsUpdate=true;
 }};
}
