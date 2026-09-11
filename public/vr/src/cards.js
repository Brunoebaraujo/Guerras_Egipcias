import * as THREE from '../vendor/three.module.min.js';
// A fixed pool keeps GPU allocations bounded across complete matches.
export function createCardView(table,hand,slots){
 const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=2048;
 const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
 const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
 const images=new Map(),cards=[];let state=null,mounted=false;
 for(let i=0;i<32;i++){
  const geometry=new THREE.PlaneGeometry(.19,.25),uv=geometry.attributes.uv,ax=i%8*256,ay=Math.floor(i/8)*512;
  for(let j=0;j<uv.count;j++)uv.setXY(j,(ax+2+uv.getX(j)*252)/2048,1-(ay+2+(1-uv.getY(j))*508)/2048);
  const mesh=new THREE.Mesh(geometry,material);mesh.visible=false;table.add(mesh);
  cards.push({mesh,definition:{id:null},home:new THREE.Vector3(),rotation:new THREE.Euler(),ax,ay,signature:''});
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
 function sync(s){state=s;for(let i=0;i<cards.length;i++){const card=cards[i],d=s.cards[i];card.mesh.visible=!!d;if(!d){card.definition={id:null};card.signature='';continue;}card.definition=d;card.mesh.userData={kind:'card',id:d.id};const signature=JSON.stringify(d);if(signature!==card.signature){card.signature=signature;paint(card);ensureImage(d.key);}if(d.zone==='board'){const slot=slots.find(slot=>slot.id===d.slot);table.add(card.mesh);card.mesh.position.copy(slot.position).y+=.016;card.mesh.rotation.set(-Math.PI/2,0,0);}}arrangeHand(s.hand);}
 function setMounted(value){mounted=value;if(state)arrangeHand(state.hand);}
 return {cards,sync,arrangeHand,setMounted};
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
