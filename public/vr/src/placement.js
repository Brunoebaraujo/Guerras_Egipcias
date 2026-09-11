export const DEFAULT_PLACEMENT=Object.freeze({height:.8,distance:.55,lateral:0,angle:0,playerX:0,playerZ:0,handDistance:.45,handDrop:.45});
export function normalizePlacement(input={}){
  const limits={height:[.4,1.3],distance:[.3,1.5],lateral:[-1,1],angle:[-45,45],playerX:[-1,1],playerZ:[-1,1],handDistance:[.3,.85],handDrop:[.2,.8]};
  return Object.fromEntries(Object.entries(DEFAULT_PLACEMENT).map(([key,value])=>[key,Number.isFinite(input[key])?Math.min(limits[key][1],Math.max(limits[key][0],input[key])):value]));
}
export function tableTransform(settings){const s=normalizePlacement(settings);return {x:s.lateral-s.playerX,y:s.height,z:.15-s.distance-s.playerZ,yaw:s.angle*Math.PI/180};}
export function handTransform(settings,eyeHeight){const s=normalizePlacement(settings);return {x:-s.playerX,y:Math.max(.3,eyeHeight-s.handDrop),z:-s.handDistance-s.playerZ};}
export function placementCode(settings){const s=normalizePlacement(settings);return 'GE03 '+Object.values(s).map(v=>Math.round(v*100)).join('/');}
