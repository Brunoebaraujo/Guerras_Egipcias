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
 const botTab=room.controls.find(mesh=>mesh.userData.id==='side-1');room.activate('side-1',botTab);
 const preset=room.controls.find(mesh=>mesh.userData.id==='choice-0');room.activate('choice-0',preset);assert.deepEqual(room.getDecks()[1],PRESETS.Padrão);
 const start=room.controls.find(mesh=>mesh.userData.id==='start');room.activate('start',start);assert.deepEqual(started,[PRESETS.Padrão,PRESETS.Padrão]);assert.equal(room.visible,false);assert.ok(saved.has('ge_vr_deck_selection'));
});

test('antechamber follows the centered VR stage transform',()=>{
 const room=createDeckRoom(new THREE.Scene(),{storage:{getItem(){return null;},setItem(){}}}),source=new THREE.Group();source.position.set(2,0,-3);source.rotation.y=.7;room.alignFrom(source);
 assert.deepEqual(room.stage.position.toArray(),[2,0,-3]);assert.equal(room.stage.rotation.y,.7);
});
