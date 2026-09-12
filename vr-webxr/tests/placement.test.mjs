import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../public/vr/vendor/three.module.min.js';
import {DEFAULT_PLACEMENT,tableTransform,handTransform,normalizePlacement,placementCode} from '../../public/vr/src/placement.js';
import {createWorld} from '../../public/vr/src/scene.js';
import {createCalibration} from '../../public/vr/src/calibration.js';
import {MatchCore} from '../../public/vr/src/core.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
globalThis.document={querySelector:()=>null,createElement:()=>({getContext:()=>({fillRect(){},clearRect(){},strokeRect(){},fillText(){},drawImage(){},beginPath(){},arc(){},fill(){},stroke(){},measureText(t){return {width:t.length*16};}})})};
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
  const scene=new THREE.Scene(),world=createWorld(scene),core=new MatchCore();world.sync(core.snapshot(),core.powers());
  const cal=createCalibration(scene,world,()=>{}),head=new THREE.Vector3(2,1.65,3),q=new THREE.Quaternion();
  cal.align(head,q);cal.open(head,q);const panelPos=cal.panel.position.clone(),height=world.table.position.y;
  const confirmTarget=cal.panel.localToWorld(new THREE.Vector3(0,(.5-400/1024)*1.12,0));cal.press(new THREE.Raycaster(head,confirmTarget.sub(head).normalize()));
  const local=new THREE.Vector3(((18+119)/1024-.5)*1.12,(.5-(195+54)/1024)*1.12,0);
  const target=cal.panel.localToWorld(local);const ray=new THREE.Raycaster(head,target.clone().sub(head).normalize());
  assert.equal(cal.press(ray),true);assert.ok(Math.abs(cal.report().settings.distance-.65)<1e-6);assert.equal(world.table.position.y,height);assert.deepEqual(cal.panel.position,panelPos);
  cal.adjust('height',-.1);cal.action('save');const code=placementCode(cal.report().settings);
  const cal2=createCalibration(scene,world,()=>{});assert.equal(placementCode(cal2.report().settings),code);
  cal2.align(new THREE.Vector3(-2,1.15,5),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2));assert.ok(Math.abs(world.table.position.y-.7)<1e-6);
});
test('cards attached to left grip remain pickable from right controller',()=>{
 const scene=new THREE.Scene(),world=createWorld(scene),core=new MatchCore({seed:123});world.sync(core.snapshot(),core.powers());
 const grip=new THREE.Group();scene.add(grip);grip.position.set(-.24,1.05,-.35);grip.add(world.hand);world.hand.position.set(0,.18,-.06);world.hand.rotation.y=.65;world.setHandMounted(true);scene.updateMatrixWorld(true);
 const visible=world.cards.filter(c=>c.mesh.visible);
 for(const card of visible){const origin=new THREE.Vector3(.25,1.05,-.2),target=card.mesh.getWorldPosition(new THREE.Vector3());const ray=new THREE.Raycaster(origin,target.sub(origin).normalize());const hits=ray.intersectObjects(visible.map(c=>c.mesh));assert.equal(hits[0]?.object.userData.id,card.definition.id);}
 const before=visible[0].mesh.getWorldPosition(new THREE.Vector3());grip.position.x+=.2;scene.updateMatrixWorld(true);const after=visible[0].mesh.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(after.x-before.x-.2)<1e-6);
});

test('export preserves confirmed save after edits, defaults require confirmation, reload preserves draft',()=>{
  memory.clear();const scene=new THREE.Scene(),w=createWorld(scene),cal=createCalibration(scene,w,()=>{});
  cal.adjust('distance',.3);cal.action('save');const saved=cal.report();assert.equal(saved.exportedFrom,'confirmed-save');assert.ok(Math.abs(saved.savedSnapshot.settings.distance-.85)<1e-6);assert.ok(saved.savedAt);
  cal.adjust('height',-.1);assert.equal(cal.report().settings.height,.8);assert.ok(Math.abs(cal.report().current.settings.height-.7)<1e-6);assert.equal(cal.report().unsavedChanges,true);
  cal.action('defaults');assert.ok(Math.abs(cal.report().current.settings.height-.7)<1e-6);
  const other=createCalibration(scene,w,()=>{});assert.ok(Math.abs(other.report().current.settings.height-.7)<1e-6);assert.equal(other.report().savedSnapshot.code,saved.code);
  cal.action('defaults');assert.equal(cal.report().current.settings.height,.8);assert.equal(cal.report().savedSnapshot.code,saved.code);
});


test('opponent and pedestal stay beyond table and on floor for every placement',()=>{
  memory.clear();const scene=new THREE.Scene(),w=createWorld(scene),cal=createCalibration(scene,w,()=>{});
  for(const [field,delta] of [['distance',.3],['angle',30],['lateral',.4],['playerZ',-.2],['height',.3]]){
    cal.adjust(field,delta);scene.updateMatrixWorld(true);
    const local=w.table.worldToLocal(w.opponent.getWorldPosition(new THREE.Vector3()));
    assert.ok(Math.abs(local.x)<1e-6);assert.ok(Math.abs(local.z+2.65)<1e-6);
    assert.equal(w.opponent.position.y,0);assert.equal(w.opponent.rotation.y,w.table.rotation.y);
    assert.ok((-1.95)-(local.z+.35)>.3);
  }
});

test('centering removes saved lateral and rotation offsets at any new headset heading, preserving comfort',()=>{
  memory.clear();const scene=new THREE.Scene(),w=createWorld(scene),cal=createCalibration(scene,w,()=>{});
  cal.adjust('distance',.5);cal.adjust('lateral',.1);cal.adjust('playerX',-.1);cal.adjust('angle',45);cal.adjust('handDistance',.1);
  const comfort=cal.report().current.settings;
  for(const yaw of [Math.PI/4,-Math.PI/2,Math.PI]){
    const head=new THREE.Vector3(2,1.55,-3),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
    cal.align(head,q,{center:true});scene.updateMatrixWorld(true);
    const center=w.table.localToWorld(new THREE.Vector3(0,0,-1.05)).sub(head).applyQuaternion(q.clone().invert());
    assert.ok(Math.abs(center.x)<1e-6);assert.ok(center.z<0);
    const settings=cal.report().current.settings;assert.equal(settings.height,comfort.height);assert.equal(settings.distance,comfort.distance);assert.equal(settings.handDistance,comfort.handDistance);assert.equal(settings.angle,0);
  }
});
