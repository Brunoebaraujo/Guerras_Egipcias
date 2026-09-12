import * as THREE from '../vendor/three.module.min.js';
// A fixed pool keeps GPU allocations bounded across complete matches.
export function createCardView(table,hand,slots){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048;
 const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
 const images=new Map(),cards=[];let state=null,mounted=false,focusedId=null;
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
  else if(focusedId===d.id){
   ctx.fillStyle='#10202ef2';ctx.fillRect(x+5,y+5,246,66);ctx.fillRect(x+5,y+282,246,224);
   ctx.fillStyle='#fff0c6';ctx.textAlign='center';ctx.font='bold 25px sans-serif';ctx.fillText(d.name,x+128,y+44,234);
   ctx.fillStyle='#72e5ed';ctx.font='bold 25px sans-serif';ctx.fillText(`${d.cost} ENERGIA  ·  ${d.power} PODER`,x+128,y+318,234);
   ctx.fillStyle='#f2f5ed';ctx.font='18px sans-serif';ctx.textAlign='left';let line='',ty=y+354;
   for(const word of d.text.split(' ')){const next=line+word+' ';if(ctx.measureText(next).width>220){ctx.fillText(line,x+18,ty);ty+=23;line=word+' ';}else line=next;if(ty>y+486)break;}if(ty<=y+486)ctx.fillText(line,x+18,ty);
  }else {
   ctx.fillStyle='#10202eef';ctx.fillRect(x+5,y+5,246,66);ctx.fillRect(x+5,y+430,246,76);
   ctx.fillStyle='#fff0c6';ctx.textAlign='center';ctx.font='bold 25px sans-serif';ctx.fillText(d.name,x+128,y+44,234);
   ctx.font='bold 29px sans-serif';ctx.fillText(`${d.cost} EN  ·  ${d.power} POD`,x+128,y+478,234);
  }
  ctx.lineWidth=d.aimable?10:5;ctx.strokeStyle=d.aimable||d.active?'#72fff0':d.zone==='board'&&!d.revealed?'#6fa3c6':'#dab66b';ctx.strokeRect(x+3,y+3,250,506);texture.needsUpdate=true;
 }
 function ensureImage(key){if(!key||images.has(key)||typeof Image==='undefined')return;const img=new Image();images.set(key,img);img.onload=()=>{for(const card of cards)if(card.mesh.visible&&card.definition.key===key)paint(card);};img.src=new URL('../card-art/'+(key==='token-cabra'?'cabra-nilo':key)+'.webp',import.meta.url).href;}
 function arrangeHand(ids){ids.forEach((id,index)=>{const card=cards.find(c=>c.mesh.visible&&c.definition.id===id);if(!card||id===focusedId)return;const a=(index-(ids.length-1)/2)*.16;hand.add(card.mesh);card.home.set(Math.sin(a)*.63,-Math.abs(a)*.06,index*.001);card.rotation.set(mounted?-.35:-.74,0,-a*.65);card.mesh.scale.setScalar(1);card.mesh.position.copy(card.home);card.mesh.rotation.copy(card.rotation);});}
 function sync(s){state=s;if(focusedId&&!s.hand.includes(focusedId))focusedId=null;for(let i=0;i<cards.length;i++){const card=cards[i],d=s.cards[i];card.mesh.visible=!!d;card.badge.visible=!!d&&d.zone==='board';if(!d){card.definition={id:null};card.signature='';continue;}card.definition=d;card.mesh.userData={kind:'card',id:d.id};card.badge.userData={kind:'card',id:d.id};const signature=JSON.stringify(d);if(signature!==card.signature){card.signature=signature;paint(card);paintPower(card);ensureImage(d.key);}if(d.zone==='board'){const slot=slots.find(slot=>slot.id===d.slot);table.add(card.mesh,card.badge);card.mesh.scale.setScalar(1);card.mesh.position.copy(slot.position).y+=.016;card.mesh.rotation.set(-Math.PI/2,0,0);card.badge.position.copy(slot.position);card.badge.position.setX(card.badge.position.x+.075);card.badge.position.y=.115;card.badge.position.z+=d.owner===0?.075:-.075;card.badge.rotation.set(0,0,0);}}arrangeHand(s.hand);}
 function attachSelected(id,parent){const card=cards.find(c=>c.mesh.visible&&c.definition.id===id);if(!card||!parent)return;focusedId=id;paint(card);parent.add(card.mesh);card.mesh.position.set(.075,.145,-.09);card.mesh.rotation.set(-.18,0,.08);card.mesh.scale.setScalar(1.5);card.mesh.renderOrder=50;}
 function clearSelected(){if(!focusedId)return;const old=cards.find(c=>c.definition.id===focusedId);focusedId=null;if(old){old.mesh.renderOrder=0;paint(old);}if(state)sync(state);}
 function setMounted(value){mounted=value;if(state)arrangeHand(state.hand);}
 return {cards,sync,arrangeHand,setMounted,attachSelected,clearSelected,material,powerMaterial};
}

export function createOpponentProjection(table,cardView){
 const group=new THREE.Group();table.add(group);group.visible=false;
 const titleCanvas=document.createElement('canvas');titleCanvas.width=512;titleCanvas.height=128;const titleCtx=titleCanvas.getContext('2d');
 const titleTexture=new THREE.CanvasTexture(titleCanvas);titleTexture.colorSpace=THREE.SRGBColorSpace;
 const title=new THREE.Mesh(new THREE.PlaneGeometry(.62,.155),new THREE.MeshBasicMaterial({map:titleTexture,transparent:true,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));title.renderOrder=120;group.add(title);
 const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(.68,.82),new THREE.MeshBasicMaterial({color:0x081820,transparent:true,opacity:.96,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));backdrop.position.z=-.012;backdrop.renderOrder=90;group.add(backdrop);
 const projectionMaterial=cardView.material.clone();projectionMaterial.transparent=true;projectionMaterial.depthTest=false;projectionMaterial.depthWrite=false;
 const clones=Array.from({length:4},()=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.22,.29),projectionMaterial);mesh.renderOrder=100;group.add(mesh);return mesh;});
 const badges=Array.from({length:4},()=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.105,.105),cardView.powerMaterial);mesh.renderOrder=31;group.add(mesh);return mesh;});
 let lane=null;
 function hide(){lane=null;group.visible=false;for(const mesh of [...clones,...badges])mesh.visible=false;}
 function show(nextLane,state,refresh=false){
  if(lane===nextLane&&group.visible&&!refresh){hide();return;}
  lane=nextLane;group.visible=true;group.position.set(0,.52,-.08);group.rotation.set(0,0,0);
  const total=state.opponentPower?.[lane]??0;title.userData.total=total;titleCtx.fillStyle='#102733ee';titleCtx.fillRect(0,0,512,128);titleCtx.strokeStyle='#72dfea';titleCtx.lineWidth=6;titleCtx.strokeRect(4,4,504,120);titleCtx.fillStyle='#fff0bd';titleCtx.font='bold 32px Georgia';titleCtx.textAlign='center';titleCtx.textBaseline='middle';titleCtx.fillText(`VIA ${lane+1} · BOT · TOTAL ${total}`,256,64,480);titleTexture.needsUpdate=true;title.position.set(0,.485,.01);
  const defs=state.cards.filter(d=>d.zone==='board'&&d.owner===1&&Number(d.slot.split('-')[1])===lane).sort((a,b)=>Number(a.slot.split('-')[2])-Number(b.slot.split('-')[2]));
  clones.forEach((clone,index)=>{const def=defs[index],badge=badges[index];clone.visible=badge.visible=!!def;if(!def)return;const source=cardView.cards.find(c=>c.definition.id===def.id),col=index%2,row=Math.floor(index/2),x=col? .145:-.145,y=row?-.205:.155;clone.geometry.dispose();clone.geometry=source.mesh.geometry.clone();clone.userData={kind:'card',id:def.id};clone.position.set(x,y,.002+index*.002);clone.scale.set(1.18,1.18,1.18);badge.geometry.dispose();badge.geometry=source.badge.geometry.clone();badge.userData={kind:'card',id:def.id};badge.position.set(x+.085,y+.105,.01+index*.002);badge.renderOrder=110;});
 }
 return {group,clones,badges,title,backdrop,get lane(){return lane;},show,hide,targets:[...clones,...badges]};
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
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.85,.425),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:1,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));parent.add(mesh);mesh.position.set(1.55,.65,-1.3);mesh.rotation.set(-.15,-.25,0);mesh.renderOrder=80;mesh.userData.resultLayout='three-columns';
 function paintResult(s){
  ctx.textAlign='center';ctx.fillStyle='#ffe5ab';ctx.font='bold 76px Georgia';ctx.fillText(s.result.side===0?'VITÓRIA':s.result.side===1?'DERROTA':'EMPATE',512,82);
  ctx.fillStyle='#80e4ef';ctx.font='bold 31px sans-serif';ctx.fillText(`VIAS · VOCÊ ${s.wins[0]} × ${s.wins[1]} BOT`,512,128);
  for(let i=0;i<3;i++){
   const x=24+i*334,w=308,player=s.powers[i],bot=s.opponentPower[i],playerWins=player>bot,botWins=bot>player;
   ctx.fillStyle='#0b1c25';ctx.fillRect(x,157,w,272);ctx.strokeStyle=playerWins?'#dcb968':botWins?'#72dfea':'#9ca8a8';ctx.lineWidth=6;ctx.strokeRect(x+3,160,w-6,266);
   ctx.fillStyle='#fff0bd';ctx.font='bold 35px Georgia';ctx.fillText(`VIA ${i+1}`,x+w/2,203);
   ctx.font='bold 23px sans-serif';ctx.fillStyle='#dcb968';ctx.fillText('VOCÊ',x+82,247);ctx.fillStyle='#72dfea';ctx.fillText('BOT',x+w-82,247);
   ctx.fillStyle=playerWins?'#fff1a8':'#c9c5ba';ctx.font=`bold ${playerWins?72:52}px sans-serif`;ctx.fillText(String(player),x+82,325);
   ctx.fillStyle=botWins?'#b5f7ff':'#c9c5ba';ctx.font=`bold ${botWins?72:52}px sans-serif`;ctx.fillText(String(bot),x+w-82,325);
   ctx.fillStyle=playerWins?'#fff1a8':botWins?'#b5f7ff':'#d8d8d0';ctx.font='bold 22px sans-serif';ctx.fillText(playerWins?'VOCÊ VENCEU':botWins?'BOT VENCEU':'EMPATE',x+w/2,394);
  }
  ctx.fillStyle='#edf4ee';ctx.font='25px sans-serif';ctx.fillText(s.result.tiebreak?'Resultado decidido pelo saldo total de poder':'Selecione NOVA PARTIDA na mesa',512,475);
 }
 function paintMatch(s){
  ctx.textAlign='left';ctx.fillStyle='#ffe5ab';ctx.font='bold 48px Georgia';ctx.fillText('RODADA '+s.turn+' / 6',35,65);
  ctx.font='34px sans-serif';ctx.fillStyle='#80e4ef';ctx.fillText('Revela primeiro: '+(s.priority===0?'você':'bot'),35,120);
  ctx.fillStyle='#edf4ee';ctx.font='32px sans-serif';const rows=s.phase==='plan'?['1. Escolha uma carta na mão esquerda.','2. Aponte a direita para uma via.','3. Confirme com o gatilho direito.','Finalize para revelar os dois lados.']:['FILA · '+s.queue.remaining+' por revelar',...s.queue.items.slice(0,3).map((c,i)=>(i+1)+'. '+(c.owner===0?'Você':'Bot')+' · '+c.name+' · via '+(c.lane+1)),s.effect||'Resolvendo efeitos…'];rows.forEach((line,i)=>ctx.fillText(line,35,195+i*58,954));
 }
 return {mesh,paint(s){if(s.ended){mesh.position.set(0,.78,-1.05);mesh.rotation.set(0,0,0);mesh.scale.set(1.8,1.8,1.8);mesh.renderOrder=500;}else{mesh.position.set(1.55,.65,-1.3);mesh.rotation.set(-.15,-.25,0);mesh.scale.set(1,1,1);mesh.renderOrder=80;}ctx.fillStyle='#112733';ctx.fillRect(0,0,1024,512);ctx.strokeStyle='#c7aa6b';ctx.lineWidth=7;ctx.strokeRect(5,5,1014,502);if(s.ended)paintResult(s);else paintMatch(s);texture.needsUpdate=true;}};
}
