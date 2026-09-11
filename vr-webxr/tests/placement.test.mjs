import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/vr/vendor/three.module.min.js';
import {DEFAULT_PLACEMENT,tableTransform,handTransform,normalizePlacement,placementCode} from '../../public/vr/src/placement.js';
import {createWorld} from '../../public/vr/src/scene.js';
import {createCalibration} from '../../public/vr/src/calibration.js';
import {SandboxCore} from '../../public/vr/src/core.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
globalThis.document={querySelector:()=>null,createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
test('more distance moves the near table edge away for any viewing direction without changing height',()=>{
  for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI]){
    const before=tableTransform(DEFAULT_PLACEMENT),after=tableTransform({...DEFAULT_PLACEMENT,distance:DEFAULT_PLACEMENT.distance+.3});
    const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
    const forward=new THREE.Vector3(0,0,-1).applyQuaternion(rotation);
    const delta=new THREE.Vector3(after.x-before.x,0,after.z-before.z).applyQuaternion(rotation);
    assert.ok(Math.abs(delta.dot(forward)-.3)<1e-6);assert.equal(after.y,before.y);
  }
});
test('hand is in front of player and independent from table adjustments; malformed settings are bounded',()=>{
  const a=handTransform(DEFAULT_PLACEMENT,1.6),b=handTransform({...DEFAULT_PLACEMENT,height:1.2,distance:1.5},1.6);
  assert.deepEqual(a,b);assert.ok(a.z<0);assert.equal(normalizePlacement({height:NaN,distance:-10}).height,.8);assert.equal(normalizePlacement({distance:-10}).distance,.3);
});
test('panel remains reachable, real ray activates distance button, saved settings reload, aligning never changes height',()=>{
  const scene=new THREE.Scene(),world=createWorld(scene),core=new SandboxCore();world.sync(core.state,core.powers());
  const cal=createCalibration(scene,world,()=>{}),head=new THREE.Vector3(2,1.65,3),q=new THREE.Quaternion();
  cal.align(head,q);cal.open(head,q);const panelPos=cal.panel.position.clone(),height=world.table.position.y;
  const local=new THREE.Vector3(((18+119)/1024-.5)*1.12,(.5-(195+54)/1024)*1.12,0);
  const target=cal.panel.localToWorld(local);const ray=new THREE.Raycaster(head,target.clone().sub(head).normalize());
  assert.equal(cal.press(ray),true);assert.ok(Math.abs(cal.report().settings.distance-.65)<1e-6);assert.equal(world.table.position.y,height);assert.deepEqual(cal.panel.position,panelPos);
  cal.adjust('height',-.1);cal.action('save');const code=placementCode(cal.report().settings);
  const cal2=createCalibration(scene,world,()=>{});assert.equal(placementCode(cal2.report().settings),code);
  cal2.align(new THREE.Vector3(-2,1.15,5),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));assert.ok(Math.abs(world.table.position.y-.7)<1e-6);
});
test('all five cards are pickable from Quest-like controller positions, including after playing and resetting',()=>{
  const scene=new THREE.Scene(),world=createWorld(scene),core=new SandboxCore(),cal=createCalibration(scene,world,()=>{});
  cal.action('defaults');cal.align(new THREE.Vector3(0,1.4,0),new THREE.Quaternion());world.sync(core.state,core.powers());scene.updateMatrixWorld(true);
  for(const x of [-.2,.2])for(const card of world.cards){
    const origin=new THREE.Vector3(x,1.15,-.12),target=card.mesh.getWorldPosition(new THREE.Vector3());target.x+=.001;
    const ray=new THREE.Raycaster(origin,target.sub(origin).normalize());const hits=ray.intersectObjects(world.cards.map(c=>c.mesh));assert.equal(hits[0]?.object.userData.id,card.definition.id);
  }
  core.command('play-lane',{cardId:'anubis',lane:0});world.sync(core.state,core.powers());assert.equal(world.cards[0].mesh.parent,world.table);
  core.reset();world.sync(core.state,core.powers());assert.equal(world.cards[0].mesh.parent,world.hand);
});
