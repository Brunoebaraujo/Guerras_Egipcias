import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/vr/vendor/three.module.min.js';
import {MatchCore} from '../../public/vr/src/core.js';
import {createWorld} from '../../public/vr/src/scene.js';
import {createGauntlet,canInteract} from '../../public/vr/src/hands.js';
globalThis.document={createElement(){return {width:0,height:0,getContext(){return {fillRect(){},clearRect(){},strokeRect(){},fillText(){},drawImage(){},beginPath(){},arc(){},ellipse(){},fill(){},stroke(){},measureText(t){return {width:t.length*16};}};}};}};
test('24 slots, bounded card pool and desktop picking for every hand card',()=>{
 const scene=new THREE.Scene(),w=createWorld(scene),c=new MatchCore({seed:123});w.sync(c.snapshot(),c.powers());scene.updateMatrixWorld(true);
 assert.equal(w.slots.length,24);assert.equal(w.cards.length,32);
 const ray=new THREE.Raycaster(),origin=new THREE.Vector3(0,2.7,2.1);
 for(const card of w.cards.filter(c=>c.mesh.visible)){const target=card.mesh.getWorldPosition(new THREE.Vector3());ray.set(origin,target.sub(origin).normalize());const hit=ray.intersectObjects(w.cards.filter(c=>c.mesh.visible).map(c=>c.mesh));assert.equal(hit[0].object.userData.id,card.definition.id);}
 for(let i=0;i<24;i++){const pos=w.table.localToWorld(w.slots[i].position.clone());ray.set(pos.clone().add(new THREE.Vector3(0,1,0)),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(w.slotMesh)[0].instanceId,i);}
});
test('card pool follows state changes and hides all unused meshes',()=>{
 const w=createWorld(new THREE.Scene()),c=new MatchCore({seed:123});const sync=()=>w.sync(c.snapshot(),c.powers());sync();const id=c.snapshot().hand[0];c.command('play-lane',{cardId:id,lane:1});sync();
 const played=w.cards.find(c=>c.mesh.visible&&c.definition.zone==='board');assert.equal(played.mesh.parent,w.table);assert.equal(played.mesh.position.x,w.slots.find(s=>s.id==='p-1-0').position.x);
 assert.equal(played.badge.visible,true);assert.equal(played.badge.parent,w.table);assert.ok(played.badge.position.y>played.mesh.position.y);
 c.command('reset');sync();assert.equal(w.cards.filter(c=>c.mesh.visible).length,4);assert.ok(w.cards.filter(c=>c.mesh.visible).every(c=>c.mesh.parent===w.hand));
 w.setHandMounted(true);assert.equal(w.cards[0].mesh.rotation.x,-.35);
});
test('floating lane totals, elevated round banner and hand energy stay readable',()=>{
 const w=createWorld(new THREE.Scene()),c=new MatchCore({seed:41});w.sync(c.snapshot(),c.powers());
 assert.equal(w.laneLabels.length,6);assert.ok(w.laneLabels.every(label=>label.mesh.rotation.x===0));assert.ok(w.laneLabels.filter((_,i)=>i%2===0).every(label=>label.mesh.position.y===.17));assert.ok(w.laneLabels.filter((_,i)=>i%2===1).every(label=>label.mesh.position.y===.22&&label.mesh.geometry.parameters.width===.46));assert.equal(w.roundBanner.mesh.rotation.x,0);assert.ok(w.roundBanner.mesh.position.y>1.3);assert.ok(w.roundBanner.mesh.geometry.parameters.width>.9);
 assert.equal(w.energy.mesh.parent,w.hand);assert.ok(w.energy.mesh.position.y<0);assert.ok(w.energy.mesh.position.z>0);assert.equal(w.energy.mesh.material.depthTest,false);
 w.setHandMounted(true);assert.equal(w.energy.mesh.rotation.x,-.35);w.setHandMounted(false);assert.equal(w.energy.mesh.rotation.x,-.74);
});
test('opponent lane projection works for all lanes in a frontmost 2x2 layout',()=>{
 const w=createWorld(new THREE.Scene());let c,state;
 for(let seed=0;seed<100;seed++){c=new MatchCore({seed});c.command('end-turn');state=c.snapshot();if(state.cards.some(card=>card.owner===1&&card.zone==='board'))break;}
 const template=state.cards.find(card=>card.owner===1&&card.zone==='board');state.cards=state.cards.filter(card=>card.zone==='hand');state.board={};
 for(const lane of [0,1,2])for(let cell=0;cell<4;cell++){const card={...template,id:`projection-${lane}-${cell}`,slot:`o-${lane}-${cell}`,owner:1,zone:'board',hidden:true,key:null,name:'Carta oculta',power:null};state.cards.push(card);state.board[card.slot]=card.id;}
 w.sync(state,state.powers);
 for(const lane of [0,1,2]){const expected=state.cards.filter(card=>card.owner===1&&card.zone==='board'&&Number(card.slot.split('-')[1])===lane).length;w.showOpponentLane(lane);assert.equal(w.projection.group.visible,true);assert.equal(w.projection.lane,lane);assert.equal(w.projection.title.userData.total,state.opponentPower[lane]);assert.equal(w.projection.clones.filter(mesh=>mesh.visible).length,expected);assert.equal(w.projection.badges.filter(mesh=>mesh.visible).length,expected);}
 assert.equal(w.projection.group.position.x,0);assert.ok(w.projection.group.position.z>-.2);assert.equal(w.projection.backdrop.material.depthTest,false);assert.ok(w.projection.backdrop.renderOrder>w.cards[0].badge.renderOrder);
 const visible=w.projection.clones.filter(mesh=>mesh.visible);assert.ok(visible.every(mesh=>mesh.userData.kind==='card'&&mesh.renderOrder>=100));
 const positions=visible.map(mesh=>[mesh.position.x,mesh.position.y]);assert.deepEqual(positions,[[-.145,.155],[.145,.155],[-.145,-.205],[.145,-.205]]);
});
test('final result panel becomes a large centered projection over the Nile',()=>{
 const w=createWorld(new THREE.Scene()),c=new MatchCore({seed:8}),state=c.snapshot();state.ended=true;state.result={side:0,tiebreak:false,margin:0};state.wins=[2,1];w.sync(state,state.powers);
 assert.equal(w.matchPanel.mesh.position.x,0);assert.equal(w.matchPanel.mesh.position.z,-1.05);assert.ok(w.matchPanel.mesh.position.y>.7);assert.ok(w.matchPanel.mesh.scale.x>=1.65);assert.equal(w.matchPanel.mesh.material.transparent,true);assert.equal(w.matchPanel.mesh.userData.resultLayout,'three-columns');assert.equal(w.roundBanner.mesh.visible,false);assert.ok(w.matchPanel.mesh.renderOrder>w.projection.title.renderOrder);
});
test('an unaffordable hand card can still move to the right grip for reading',()=>{
 const w=createWorld(new THREE.Scene()),c=new MatchCore({seed:0});w.sync(c.snapshot(),c.powers());const id=c.snapshot().hand.find(id=>c.validSlots(id).length===0),card=w.cards.find(card=>card.definition.id===id),grip=new THREE.Group();
 assert.ok(id);assert.equal(c.validSlots(id).length,0);
 w.attachSelected(id,grip);assert.equal(card.mesh.parent,grip);assert.equal(card.mesh.scale.x,1.5);assert.ok(card.mesh.position.y>0);
 w.clearSelected();assert.equal(card.mesh.parent,w.hand);assert.equal(card.mesh.scale.x,1);
});
test('right hand exclusively activates controls, with mirrored low-poly hand artwork',()=>{
 assert.equal(canInteract('mouse'),true);assert.equal(canInteract({userData:{inputSource:{handedness:'right'}}}),true);assert.equal(canInteract({userData:{inputSource:{handedness:'left'}}}),false);assert.equal(canInteract({}),false);
 for(const side of ['left','right']){const hand=createGauntlet(side);assert.ok(hand.children.length>=4);assert.ok(hand.children.length<10);const bounds=new THREE.Box3().setFromObject(hand);assert.ok(bounds.getSize(new THREE.Vector3()).length()<.3);}
});
