import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/vr/vendor/three.module.min.js';
import {SandboxCore} from '../../public/vr/src/core.js';
import {createWorld} from '../../public/vr/src/scene.js';
// Geometry checks use a canvas-text stub, not a browser or a GPU benchmark.
globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillRect(){},strokeRect(){},fillText(){}};}};}};
test('scene has 3 × 2 × 4 raycastable slots and every hand card can be picked from desktop',()=>{
  const scene=new THREE.Scene(),w=createWorld(scene),c=new SandboxCore();w.sync(c.state,c.powers());scene.updateMatrixWorld(true);
  assert.equal(w.slots.length,24);assert.equal(w.slots.filter(s=>s.side===0).length,12);
  const ray=new THREE.Raycaster(),origin=new THREE.Vector3(0,2.7,2.1);
  for(const card of w.cards){const target=card.mesh.getWorldPosition(new THREE.Vector3());ray.set(origin,target.sub(origin).normalize());const hit=ray.intersectObjects(w.cards.map(c=>c.mesh));assert.equal(hit[0].object.userData.id,card.definition.id);}
  for(let i=0;i<24;i++){const pos=w.table.localToWorld(w.slots[i].position.clone());ray.set(pos.clone().add(new THREE.Vector3(0,1,0)),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(w.slotMesh)[0].instanceId,i);}
});
test('Anubis snaps to the chosen slot and reset removes the hologram',()=>{
  const scene=new THREE.Scene(),w=createWorld(scene),c=new SandboxCore();c.command('play-card',{cardId:'anubis',slotId:'p-1-2'});w.sync(c.state,c.powers());
  const pos=w.slots.find(s=>s.id==='p-1-2').position,card=w.cards[0];assert.equal(card.mesh.position.x,pos.x);assert.equal(card.mesh.position.z,pos.z);assert.equal(w.hologram.visible,true);
  c.command('reset');w.sync(c.state,c.powers());assert.equal(w.hologram.visible,false);assert.equal(card.mesh.position.distanceTo(card.home),0);
});
