import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/vr/vendor/three.module.min.js';
import {PRESETS} from '../../public/vr/src/core.js';
import {createDeckRoom} from '../../public/vr/src/deck-room.js';

globalThis.document={createElement(){return {width:0,height:0,getContext(){return {clearRect(){},fillRect(){},fillText(){},strokeRect(){},beginPath(){},arc(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},measureText(t){return {width:t.length*16};}};}};}};

test('pyramid antechamber exposes spatial deck controls and starts with two chosen decks',()=>{
 const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};let started=null;
 const room=createDeckRoom(new THREE.Scene(),{storage,onStart:decks=>{started=decks;return {ok:true};}});
 assert.equal(room.visible,true);assert.ok(room.controls.length>=20);assert.ok(room.controls.every(mesh=>mesh.userData.kind==='deck-room'));
 const cards=room.controls.filter(mesh=>/^card-\d+$/.test(mesh.userData.id));assert.equal(cards.length,16);assert.ok(cards.every(mesh=>mesh.geometry.parameters.width<.4));assert.equal(new Set(cards.slice(0,8).map(mesh=>mesh.position.x)).size,8);
 const deckCards=room.controls.filter(mesh=>mesh.userData.id.startsWith('deck-card-'));assert.equal(deckCards.length,24);assert.equal(deckCards.filter(mesh=>mesh.visible).length,24);assert.equal(new Set(deckCards.map(mesh=>mesh.userData.deckSide)).size,2);assert.equal(room.deckPanels[0].group.rotation.y,Math.PI/2);assert.equal(room.deckPanels[1].group.rotation.y,-Math.PI/2);assert.ok(room.deckPanels[0].group.position.x<0&&room.deckPanels[1].group.position.x>0);for(const deckSide of [0,1]){const costs=deckCards.filter(mesh=>mesh.userData.deckSide===deckSide).map(mesh=>mesh.userData.cost);assert.deepEqual(costs,costs.slice().sort((a,b)=>a-b));}
 const filters=room.controls.filter(mesh=>mesh.userData.id.startsWith('filter-')),presets=room.controls.filter(mesh=>mesh.userData.id.startsWith('preset-'));assert.equal(filters.length,8);assert.equal(presets.length,8);assert.ok([...filters,...presets].every(mesh=>mesh.parent===room.stage&&mesh.rotation.x===-Math.PI/2&&mesh.userData.fontSize>=56));
 assert.ok([...filters,...presets].every(mesh=>mesh.position.z> -1.5));assert.ok(room.detail.position.y>1.4&&room.detail.position.y<1.7);
 assert.equal(room.page,0);assert.equal(room.navigate(1),true);assert.equal(room.page,1);assert.equal(room.navigate(-1),true);assert.equal(room.page,0);
 room.stage.updateMatrixWorld(true);const point=cards[0].getWorldPosition(new THREE.Vector3());assert.equal(room.pointerStart('right',{object:cards[0],point}),true);const target=point.clone().add(new THREE.Vector3(0,.24,1));assert.equal(room.pointerMove('right',new THREE.Ray(target,new THREE.Vector3(0,0,-1))),true);assert.ok(room.page>0);assert.equal(room.pointerEnd('right'),true);
 room.activate('filter-1',filters[1]);assert.equal(room.filter,'CUSTO 0');room.activate('filter-0',filters[0]);const before=room.getDecks(),selectedCard=cards.find(card=>before[0].includes(card.userData.cardKey));assert.ok(selectedCard);room.activate(selectedCard.userData.id,selectedCard);assert.deepEqual(room.getDecks(),before);assert.equal(room.detailKey,selectedCard.userData.cardKey);const inspectedKey=room.detailKey;let action=room.controls.find(mesh=>mesh.userData.id==='detail-remove');room.activate('detail-remove',action);assert.equal(room.detailKey,null);assert.equal(room.getDecks()[0].includes(inspectedKey),false);room.activate(selectedCard.userData.id,selectedCard);action=room.controls.find(mesh=>mesh.userData.id==='detail-add');room.activate('detail-add',action);assert.equal(room.detailKey,null);assert.equal(room.getDecks()[0].includes(inspectedKey),true);
 const ownPanelCard=deckCards.find(mesh=>mesh.userData.deckSide===0&&mesh.userData.cardIndex===0),panelBefore=room.getDecks(),panelKey=ownPanelCard.userData.cardKey;room.activate(ownPanelCard.userData.id,ownPanelCard);assert.deepEqual(room.getDecks(),panelBefore);assert.equal(room.detailKey,panelKey);assert.ok(room.detail.children.some(child=>child.geometry?.parameters?.width===.72&&child.geometry?.parameters?.height===1.08));assert.equal(room.pointerStart('right',null),true);assert.equal(room.detailKey,null);
 const preset=room.controls.find(mesh=>mesh.userData.id==='preset-0');room.activate('preset-0',preset);assert.equal(preset.userData.active,true);assert.ok(room.controls.filter(mesh=>mesh.userData.id.startsWith('preset-')&&mesh!==preset).every(mesh=>mesh.userData.active===false));const botTab=room.controls.find(mesh=>mesh.userData.id==='side-1');room.activate('side-1',botTab);room.activate('preset-0',preset);assert.deepEqual(room.getDecks()[1],PRESETS.Padrão);assert.equal(preset.userData.active,true);
 const start=room.controls.find(mesh=>mesh.userData.id==='start');assert.equal(start.parent,room.stage);assert.equal(start.rotation.x,-Math.PI/2);assert.ok(start.position.y>.65);room.activate('start',start);assert.deepEqual(started,[PRESETS.Padrão,PRESETS.Padrão]);assert.equal(room.visible,false);assert.ok(saved.has('ge_vr_deck_selection'));
});

test('antechamber follows the centered VR stage transform',()=>{
 const room=createDeckRoom(new THREE.Scene(),{storage:{getItem(){return null;},setItem(){}}}),source=new THREE.Group();source.position.set(2,0,-3);source.rotation.y=.7;room.alignFrom(source);
 assert.deepEqual(room.stage.position.toArray(),[2,0,-3]);assert.equal(room.stage.rotation.y,.7);
});
