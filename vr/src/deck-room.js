import * as THREE from '../vendor/three.module.min.js';
import {CARD_CATALOG,DECK_SIZE,PRESETS,validateDecks} from './core.js?v=1.2.0';
import {effectivePresets,initialDecks,readSavedDecks} from './deck-builder.js?v=1.2.0';

const STORAGE_KEY='ge_vr_deck_selection',catalog=[...CARD_CATALOG],byKey=new Map(catalog.map(card=>[card.key,card]));
function box(parent,x,y,z,w,h,d,color){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.9,metalness:0}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function textPanel(parent,id,w,h,{pixelsX=512,pixelsY=256}={}){
 const canvas=document.createElement('canvas');canvas.width=pixelsX;canvas.height=pixelsY;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));mesh.userData={kind:'deck-room',id};parent.add(mesh);return {mesh,canvas,ctx,texture};
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function fit(ctx,text,maxWidth,start=34,min=15){let size=start;while(size>min){ctx.font=`bold ${size}px sans-serif`;if(ctx.measureText(text).width<=maxWidth)break;size--;}return size;}
function shuffle(items){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}

export function createDeckRoom(scene,{onStart,storage=globalThis.localStorage}={}){
 const stage=new THREE.Group();scene.add(stage);const controls=[];
 const shell=new THREE.Mesh(new THREE.ConeGeometry(7.2,5.5,4,1,true),new THREE.MeshStandardMaterial({color:0x40301f,side:THREE.BackSide,roughness:1}));shell.position.set(0,2.65,-2.2);shell.rotation.y=Math.PI/4;stage.add(shell);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.MeshStandardMaterial({color:0x5c4932,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-.015,-2);stage.add(floor);
 box(stage,0,1.7,-4.6,6.3,3.4,.24,0x493721);box(stage,-3.25,1.25,-2.8,.42,2.5,.42,0x765a34);box(stage,3.25,1.25,-2.8,.42,2.5,.42,0x765a34);
 for(const x of [-2.7,2.7]){box(stage,x,.9,-3.9,.34,1.8,.34,0x8a693d);const flame=new THREE.Mesh(new THREE.ConeGeometry(.075,.24,8),new THREE.MeshBasicMaterial({color:0xffb13b}));flame.position.set(x,1.95,-3.83);stage.add(flame);const light=new THREE.PointLight(0xffb45c,1.7,5);light.position.copy(flame.position);stage.add(light);}
 box(stage,0,.56,-1.42,3.65,.18,1.72,0x77634a);box(stage,-1.45,.27,-1.42,.38,.55,1.25,0x594631);box(stage,1.45,.27,-1.42,.38,.55,1.25,0x594631);
 const ui=new THREE.Group();ui.position.set(0,1.72,-2.05);stage.add(ui);box(ui,0,0,-.045,3.42,2.5,.09,0x5b4a36);
 const title=textPanel(ui,'none',3.18,.31,{pixelsX:1024,pixelsY:160});title.mesh.position.set(0,1.05,.015);title.mesh.raycast=()=>{};
 const sideButtons=[textPanel(ui,'side-0',1.45,.22),textPanel(ui,'side-1',1.45,.22)];sideButtons[0].mesh.position.set(-.78,.78,.02);sideButtons[1].mesh.position.set(.78,.78,.02);
 const choiceButtons=Array.from({length:8},(_,i)=>{const p=textPanel(ui,'choice-'+i,.72,.16);p.mesh.position.set(-1.17+(i%4)*.78,.56-Math.floor(i/4)*.18,.02);return p;});
 const choicePageButton=textPanel(ui,'choice-page',.34,.34);choicePageButton.mesh.position.set(1.49,.47,.02);
 const cards=Array.from({length:8},(_,i)=>{const p=textPanel(ui,'card-'+i,.62,.58,{pixelsX:384,pixelsY:512});p.mesh.position.set(-1.14+(i%4)*.76,.03-Math.floor(i/4)*.63,.025);return p;});
 const previous=textPanel(ui,'previous',.7,.18),pageLabel=textPanel(ui,'none',.7,.18),next=textPanel(ui,'next',.7,.18);previous.mesh.position.set(-.82,-1.04,.02);pageLabel.mesh.position.set(0,-1.04,.02);pageLabel.mesh.raycast=()=>{};next.mesh.position.set(.82,-1.04,.02);
 const random=textPanel(ui,'random',.76,.18),clear=textPanel(ui,'clear',.64,.18);random.mesh.position.set(-1.16,-.83,.02);clear.mesh.position.set(1.16,-.83,.02);
 const start=textPanel(stage,'start',1.62,.32,{pixelsX:1024,pixelsY:220});start.mesh.position.set(0,.68,-.64);start.mesh.rotation.x=-Math.PI/2;
 controls.push(...sideButtons.map(p=>p.mesh),...choiceButtons.map(p=>p.mesh),choicePageButton.mesh,...cards.map(p=>p.mesh),previous.mesh,next.mesh,random.mesh,clear.mesh,start.mesh);
 const presets=effectivePresets(storage?.getItem?.('ge_preset_overrides')),saved=readSavedDecks(storage?.getItem?.('ge_decks'));
 const choices=[...Object.entries(presets).map(([name,deck])=>({name,deck,kind:'PRESET'})),...saved.map(item=>({name:item.name,deck:item.cards,kind:'SALVO'}))];
 const artImages=new Map();
 let decks=initialDecks(storage?.getItem?.(STORAGE_KEY)),side=0,page=0,choicePage=0,message='Escolha os decks. Use as setas ou o analógico direito.';
 function persist(){try{storage?.setItem?.(STORAGE_KEY,JSON.stringify({v:1,decks}));}catch{}}
 function paintButton(panel,label,{active=false,enabled=true,accent='#d7b56d',small=false}={}){const {ctx,canvas,texture}=panel;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=enabled?(active?'#2d514d':'#1a2c32'):'#242321';roundRect(ctx,4,4,canvas.width-8,canvas.height-8,18);ctx.fill();ctx.strokeStyle=active?'#73ebe5':enabled?accent:'#554f46';ctx.lineWidth=7;ctx.stroke();ctx.fillStyle=enabled?'#fff0c5':'#777168';ctx.textAlign='center';ctx.textBaseline='middle';fit(ctx,label,canvas.width-28,small?25:31,14);ctx.fillText(label,canvas.width/2,canvas.height/2,canvas.width-24);texture.needsUpdate=true;panel.mesh.visible=!!label;}
 function ensureArt(card){if(typeof Image==='undefined'||artImages.has(card.key))return artImages.get(card.key);const image=new Image();artImages.set(card.key,image);image.onload=render;image.onerror=()=>{image.failed=true;render();};image.src=new URL(`../card-art/${card.art}.webp`,import.meta.url).href;return image;}
 function paintCard(panel,card,index){const {ctx,canvas,texture}=panel;ctx.clearRect(0,0,canvas.width,canvas.height);if(!card){panel.mesh.visible=false;return;}panel.mesh.visible=true;const selected=decks[side].includes(card.key),image=ensureArt(card);ctx.fillStyle=selected?'#273f3b':'#112631';roundRect(ctx,4,4,canvas.width-8,canvas.height-8,18);ctx.fill();ctx.save?.();roundRect(ctx,13,13,canvas.width-26,300,12);ctx.clip?.();if(image?.complete&&!image.failed&&image.naturalWidth){const scale=Math.max((canvas.width-26)/image.naturalWidth,300/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,13+(canvas.width-26-w)/2,13+(300-h)/2,w,h);}else{ctx.fillStyle='#243d45';ctx.fillRect(13,13,canvas.width-26,300);ctx.fillStyle='#d5ba7a';ctx.font='bold 104px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('☥',canvas.width/2,162);}ctx.restore?.();ctx.fillStyle='rgba(7,17,23,.94)';ctx.fillRect(13,310,canvas.width-26,189);ctx.strokeStyle=selected?'#71eee2':'#b99a5d';ctx.lineWidth=selected?10:6;roundRect(ctx,4,4,canvas.width-8,canvas.height-8,18);ctx.stroke();ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle='#fff0c5';fit(ctx,card.name,canvas.width-82,31,16);ctx.fillText(card.name,19,349,canvas.width-80);ctx.fillStyle='#7ee5ed';ctx.font='bold 23px sans-serif';ctx.fillText(`${card.cost} EN · ${card.power} POD`,19,391);ctx.fillStyle='#c9c5ba';ctx.font='19px sans-serif';ctx.fillText(card.type,19,430,canvas.width-38);ctx.fillStyle=selected?'#71eee2':'#d5ba7a';ctx.font='bold 39px sans-serif';ctx.textAlign='center';ctx.fillText(selected?String(decks[side].indexOf(card.key)+1):'＋',canvas.width-38,350);texture.needsUpdate=true;panel.mesh.userData.cardIndex=index;}
 function render(){
  const maxPage=Math.max(0,Math.ceil(catalog.length/cards.length)-1);page=Math.min(page,maxPage);const active=side===0?'SEU DECK':'DECK DO BOT';
  const {ctx,canvas,texture}=title;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#17242a';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#a98951';ctx.lineWidth=7;ctx.strokeRect(4,4,canvas.width-8,canvas.height-8);ctx.textAlign='center';ctx.fillStyle='#f6dda6';ctx.font='bold 39px Georgia';ctx.fillText('CÂMARA DOS DECKS',canvas.width/2,51);ctx.fillStyle='#78e1e8';ctx.font='bold 25px sans-serif';ctx.fillText(`${active} · ${decks[side].length}/${DECK_SIZE}`,canvas.width/2,91);ctx.fillStyle='#d4c7ad';ctx.font='20px sans-serif';ctx.fillText(message,canvas.width/2,128,canvas.width-34);texture.needsUpdate=true;
  paintButton(sideButtons[0],`SEU DECK · ${decks[0].length}/12`,{active:side===0});paintButton(sideButtons[1],`DECK DO BOT · ${decks[1].length}/12`,{active:side===1,accent:'#7dd3fc'});
  const choiceStart=choicePage*8;choiceButtons.forEach((button,i)=>{const choice=choices[choiceStart+i];paintButton(button,choice?choice.name:'',{small:true});button.mesh.userData.choiceIndex=choiceStart+i;});paintButton(choicePageButton,choices.length>8?`DECKS ${choicePage+1}/${Math.ceil(choices.length/8)}`:'PRESETS',{small:true});
  const offset=page*cards.length;cards.forEach((panel,i)=>paintCard(panel,catalog[offset+i],offset+i));paintButton(previous,'◀ ANTERIOR',{enabled:page>0,small:true});paintButton(next,'PRÓXIMA ▶',{enabled:page<maxPage,small:true});paintButton(pageLabel,`${page+1} / ${maxPage+1}`,{small:true});
  paintButton(random,'ALEATÓRIO',{small:true});paintButton(clear,'LIMPAR',{small:true});paintButton(start,'INICIAR PARTIDA',{active:validateDecks(decks).ok,enabled:validateDecks(decks).ok});
 }
 function activate(id,object){
  if(id==='side-0'||id==='side-1'){side=Number(id.at(-1));message=side?'Agora escolha o deck do guardião.':'Agora escolha o seu deck.';render();return;}
  if(id==='choice-page'){choicePage=(choicePage+1)%Math.max(1,Math.ceil(choices.length/8));render();return;}
  if(id.startsWith('choice-')){const choice=choices[object.userData.choiceIndex];if(choice){decks[side]=choice.deck.slice();message=`${choice.kind}: ${choice.name}.`;persist();render();}return;}
  if(id==='previous'){navigate(-1);return;}if(id==='next'){navigate(1);return;}
  if(id.startsWith('card-')){const card=catalog[object.userData.cardIndex];if(!card)return;const index=decks[side].indexOf(card.key);if(index>=0){decks[side].splice(index,1);message=`${card.name} removida.`;}else if(decks[side].length<DECK_SIZE){decks[side].push(card.key);message=`${card.name} adicionada.`;}else message='Deck completo. Retire uma carta primeiro.';persist();render();return;}
  if(id==='random'){decks[side]=shuffle(catalog).slice(0,DECK_SIZE).map(card=>card.key);message='Deck aleatório montado.';persist();render();return;}
  if(id==='clear'){decks[side]=[];message='Deck limpo.';persist();render();return;}
  if(id==='start'){const valid=validateDecks(decks);if(!valid.ok){message=valid.reason;render();return;}persist();const result=onStart?.(decks.map(deck=>deck.slice()));if(result?.ok===false){message=result.reason;render();return;}stage.visible=false;}
 }
 function navigate(delta){const maxPage=Math.max(0,Math.ceil(catalog.length/cards.length)-1),next=Math.max(0,Math.min(maxPage,page+Math.sign(delta)));if(next===page)return false;page=next;message=`Página ${page+1} de ${maxPage+1}.`;render();return true;}
 render();
 return {stage,controls,activate,navigate,show(){stage.visible=true;render();},hide(){stage.visible=false;},alignFrom(source){stage.position.copy(source.position);stage.rotation.copy(source.rotation);stage.updateMatrixWorld(true);},setDecks(next){if(validateDecks(next).ok){decks=next.map(deck=>deck.slice());persist();render();}},get visible(){return stage.visible;},get page(){return page;},getDecks:()=>decks.map(deck=>deck.slice())};
}
