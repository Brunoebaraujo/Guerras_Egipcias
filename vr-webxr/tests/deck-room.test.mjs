import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/vr/vendor/three.module.min.js';
import {PRESETS} from '../../public/vr/src/core.js';
import {createDeckRoom} from '../../public/vr/src/deck-room.js';

globalThis.document={createElement(){return {width:0,height:0,getContext(){return {clearRect(){},fillRect(){},fillText(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},fill(){},stroke(){},measureText(t){return {width:t.length*16};}};}};}};

test('pyramid antechamber exposes spatial deck controls and starts with two chosen decks',()=>{
 const saved=new Map(),storage={getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)};let started=null;
 const room=createDeckRoom(new THREE.Scene(),{storage,onStart:decks=>{started=decks;return {ok:true};}});
 assert.equal(room.visible,true);assert.ok(room.controls.length>=20);assert.ok(room.controls.every(mesh=>mesh.userData.kind==='deck-room'));
 const cards=room.controls.filter(mesh=>mesh.userData.id.startsWith('card-'));assert.equal(cards.length,10);assert.ok(cards.every(mesh=>mesh.geometry.parameters.width<.55));assert.equal(new Set(cards.slice(0,5).map(mesh=>mesh.position.x)).size,5);
 assert.equal(room.page,0);assert.equal(room.navigate(1),true);assert.equal(room.page,1);assert.equal(room.navigate(-1),true);assert.equal(room.page,0);
 room.stage.updateMatrixWorld(true);const point=cards[0].getWorldPosition(new THREE.Vector3());assert.equal(room.pointerStart('right',{object:cards[0],point}),true);const target=point.clone().add(new THREE.Vector3(0,.24,1));assert.equal(room.pointerMove('right',new THREE.Ray(target,new THREE.Vector3(0,0,-1))),true);assert.ok(room.page>0);assert.equal(room.pointerEnd('right'),true);
 const botTab=room.controls.find(mesh=>mesh.userData.id==='side-1');room.activate('side-1',botTab);
 const preset=room.controls.find(mesh=>mesh.userData.id==='choice-0');room.activate('choice-0',preset);assert.deepEqual(room.getDecks()[1],PRESETS.Padrão);
 const start=room.controls.find(mesh=>mesh.userData.id==='start');assert.equal(start.parent,room.stage);assert.equal(start.rotation.x,-Math.PI/2);assert.ok(start.position.y>.65);room.activate('start',start);assert.deepEqual(started,[PRESETS.Padrão,PRESETS.Padrão]);assert.equal(room.visible,false);assert.ok(saved.has('ge_vr_deck_selection'));
});

test('antechamber follows the centered VR stage transform',()=>{
 const room=createDeckRoom(new THREE.Scene(),{storage:{getItem(){return null;},setItem(){}}}),source=new THREE.Group();source.position.set(2,0,-3);source.rotation.y=.7;room.alignFrom(source);
 assert.deepEqual(room.stage.position.toArray(),[2,0,-3]);assert.equal(room.stage.rotation.y,.7);
});
