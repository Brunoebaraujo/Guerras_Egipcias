import * as THREE from '../vendor/three.module.min.js';
// Procedural Egyptian gauntlets: mirrored articulated silhouette, no remote model.
export function createGauntlet(side){
 const root=new THREE.Group(),sign=side==='left'?-1:1;
 const batches=new Map(),temp=new THREE.Object3D();
 function part(color,x,y,z,w,h,d,rz=0){if(!batches.has(color))batches.set(color,[]);batches.get(color).push([x*sign,y,z,w,h,d,rz*sign]);}
 part(0x152833,0,-.015,.025,.072,.096,.055);
 part(0xb89654,0,-.07,.035,.084,.038,.071);
 part(0x183743,0,-.073,.073,.057,.025,.009);
 part(0x63e7ef,0,-.073,.08,.013,.018,.008);
 for(const x of [-.027,-.009,.009,.027]){part(0x243e49,x,.032,-.008,.015,.045,.025);part(0xb89654,x,.052,-.008,.016,.013,.028);part(0x172a34,x,.036,-.03,.014,.025,.023);}
 part(0x243e49,-.045,-.006,.007,.026,.057,.029,-.45);
 part(0xb89654,-.052,.01,-.004,.023,.015,.03,-.45);
 // Ankh inlaid on the back of each hand.
 part(0xd9bc76,0,.004,.056,.008,.04,.003);part(0xd9bc76,0,.01,.056,.026,.007,.003);
 for(const [color,parts] of batches){const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.5}),parts.length);parts.forEach(([x,y,z,w,h,d,rz],i)=>{temp.position.set(x,y,z);temp.rotation.set(0,0,rz);temp.scale.set(w,h,d);temp.updateMatrix();inst.setMatrixAt(i,temp.matrix);});root.add(inst);}
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.009,.003,4,10),new THREE.MeshStandardMaterial({color:0xd9bc76,metalness:.65,roughness:.4}));ring.position.set(0,.026,.056);root.add(ring);
 return root;
}
export function canInteract(source){return source==='mouse'||source?.userData?.inputSource?.handedness==='right';}
