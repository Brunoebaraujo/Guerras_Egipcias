export const DUAT_KEYFRAMES = `
  @keyframes duatPop { 0%{transform:scale(.7);opacity:.35} 60%{transform:scale(1.09)} 100%{transform:scale(1);opacity:1} }
  @keyframes duatFloat { 0%{opacity:0;transform:translate(-50%,3px)} 25%{opacity:1} 100%{opacity:0;transform:translate(-50%,-22px)} }
  @keyframes duatVanish { 0%{opacity:1;transform:scale(1)} 30%{opacity:.9;transform:scale(1.04)} 100%{opacity:0;transform:scale(.5) rotate(-8deg)} }
  @keyframes duatZoomIn { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
  @keyframes duatBanner { 0%{opacity:0;transform:scale(.86)} 100%{opacity:1;transform:scale(1)} }
  .duat-banner { animation: duatBanner .55s cubic-bezier(.23,1,.32,1); }
  @keyframes duatCharge { 0%,100%{ box-shadow:0 0 3px 1px rgba(251,191,36,.5), 0 0 8px 2px rgba(251,191,36,.22) } 50%{ box-shadow:0 0 7px 2px rgba(251,191,36,.95), 0 0 17px 5px rgba(251,191,36,.5) } }
  .duat-pop { animation: duatPop .42s ease-out; }
  .duat-badge { animation: duatFloat .9s ease-out forwards; }
  .duat-vanish { animation: duatVanish .7s ease-in forwards; }
  .duat-zoom { animation: duatZoomIn .18s ease-out; }
  @keyframes duatBlessRing { 0%{ opacity:0; transform:scale(.82) } 18%{ opacity:.95 } 100%{ opacity:0; transform:scale(1.6) } }
  @keyframes duatBlessGlow { 0%,100%{ box-shadow:0 0 0 0 rgba(74,222,128,0) } 32%{ box-shadow:0 0 16px 6px rgba(74,222,128,.8) } }
  @keyframes duatBlessRise { 0%{ opacity:0; transform:translate(-50%,12px) scale(.65) } 18%{ opacity:1; transform:translate(-50%,0) scale(1.2) } 70%{ opacity:1; transform:translate(-50%,-14px) scale(1.05) } 100%{ opacity:0; transform:translate(-50%,-34px) scale(1) } }
  @keyframes duatBlessFonte { 0%{ opacity:0; transform:scale(.9) } 20%{ opacity:1 } 100%{ opacity:0; transform:scale(1.45) } }
  .duat-charge { animation: duatCharge 1.5s ease-in-out infinite; }
  .duat-bless-ring  { animation: duatBlessRing 1.15s cubic-bezier(.2,.7,.3,1) both; }
  .duat-bless-glow  { animation: duatBlessGlow 1.15s ease-out both; }
  .duat-bless-rise  { animation: duatBlessRise 1.5s ease-out both; }
  .duat-bless-fonte { animation: duatBlessFonte .95s ease-out both; }
  @keyframes duatDraw {
    0%   { opacity:0; transform:translateY(10px) scale(.9); box-shadow:0 0 0 0 rgba(251,191,36,0); }
    30%  { opacity:1; box-shadow:0 0 16px 6px rgba(251,191,36,.95), 0 0 34px 14px rgba(251,191,36,.5); }
    65%  { box-shadow:0 0 12px 4px rgba(251,191,36,.7), 0 0 24px 9px rgba(251,191,36,.32); }
    100% { opacity:1; transform:translateY(0) scale(1); box-shadow:0 0 0 0 rgba(251,191,36,0); }
  }
  .duat-draw { animation: duatDraw 1.15s ease-out; }
  @media (prefers-reduced-motion: reduce) { .duat-pop,.duat-badge,.duat-vanish,.duat-zoom,.duat-charge,.duat-draw,.duat-bless-ring,.duat-bless-glow,.duat-bless-rise,.duat-bless-fonte { animation: none; } }
`;

/* Largura de referência que alimenta as fontes proporcionais do MiniCard na
   grade mobile (MiniCard usa f(n)=max(8, bw*n/100)). */
export const MOBILE_BW = 780;

/* Heka — ativação visual do buff. Mantém regra e UI desacopladas: a ponte
   observa o fim de `.duat-charge` e o nascimento do badge +N no alvo. */
const HEKA_HANDS="data:image/webp;base64,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";
const r=(e)=>{if(!e?.getBoundingClientRect)return null;const x=e.getBoundingClientRect();return x.width>2&&x.height>2?{left:x.left,top:x.top,width:x.width,height:x.height}:null};
const el=(tag="div",s={})=>{const e=document.createElement(tag);Object.assign(e.style,s);return e};

function playHekaFx(a,b,v,badge){
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const root=el("div",{position:"fixed",inset:"0",zIndex:"9999",pointerEvents:"none",overflow:"hidden"});
  root.setAttribute("aria-hidden","true");document.body.appendChild(root);
  const old=badge.style.visibility;badge.style.visibility="hidden";
  const sx=a.left+a.width/2,sy=a.top+a.height*.34,tx=b.left+b.width/2,ty=b.top+b.height*.34;
  const w=Math.max(140,Math.min(300,a.width*3.05)),d=Math.max(18,Math.min(32,a.width*.34)),gold="#facc15",hi="#fff2a8";
  const hands=el("img",{position:"fixed",left:`${sx}px`,top:`${sy}px`,width:`${w}px`,opacity:"0",zIndex:"2",
    transform:"translate(-50%,-50%) scale(.76)",filter:"drop-shadow(0 0 7px rgba(125,211,252,.72)) drop-shadow(0 0 15px rgba(56,189,248,.38))"});
  hands.src=HEKA_HANDS;hands.alt="";root.appendChild(hands);
  const orb=el("div",{position:"fixed",left:`${sx-d/2}px`,top:`${sy-d/2}px`,width:`${d}px`,height:`${d}px`,borderRadius:"50%",zIndex:"4",
    opacity:"0",transform:"scale(.25)",background:`radial-gradient(circle,#fff 0%,${hi} 25%,${gold} 58%,transparent 76%)`,
    boxShadow:"0 0 10px 4px rgba(255,242,168,.9),0 0 27px 10px rgba(250,204,21,.55)"});root.appendChild(orb);
  const p=Math.max(5,b.width*.08),ring=el("div",{position:"fixed",left:`${b.left-p}px`,top:`${b.top-p}px`,width:`${b.width+p*2}px`,height:`${b.height+p*2}px`,
    borderRadius:`${Math.max(7,b.width*.1)}px`,border:`2.5px solid ${hi}`,boxShadow:"0 0 13px 5px rgba(250,204,21,.82),inset 0 0 14px 3px rgba(250,204,21,.38)",
    zIndex:"2",opacity:"0",transform:"scale(.74)"});root.appendChild(ring);
  const rise=el("div",{position:"fixed",left:`${tx}px`,top:`${b.top}px`,zIndex:"5",opacity:"0",color:hi,fontFamily:"Georgia,serif",fontWeight:"900",
    fontSize:`${Math.max(22,Math.min(40,b.width*.48))}px`,textShadow:"0 0 6px #fff,0 0 14px rgba(250,204,21,.95),0 2px 4px #000",
    transform:"translate(-50%,10px) scale(.65)"});rise.textContent=`+${v}`;root.appendChild(rise);
  const total=reduced?420:1500;
  if(!reduced){
    hands.animate([{opacity:0,transform:"translate(-50%,-50%) scale(.76)"},{offset:.16,opacity:1,transform:"translate(-50%,-50%) scale(1)"},
      {offset:.72,opacity:1,transform:"translate(-50%,-50%) scale(1.02)"},{opacity:0,transform:"translate(-50%,-55%) scale(.94)"}],
      {duration:total,easing:"cubic-bezier(.2,.75,.25,1)",fill:"both"});
    orb.animate([{opacity:0,transform:"scale(.25)"},{offset:.18,opacity:1,transform:"scale(.75)"},{offset:.29,opacity:1,transform:"scale(1.25)"},
      {offset:.38,opacity:1,transform:"scale(.82)"},{offset:.47,opacity:1,transform:"scale(1.3)"},{offset:.58,opacity:0,transform:"scale(.3)"},{opacity:0}],
      {duration:total,easing:"ease-out",fill:"both"});
    const A={x:sx,y:sy},B={x:tx,y:ty},dist=Math.hypot(tx-sx,ty-sy),C={x:(sx+tx)/2,y:Math.min(sy,ty)-Math.min(95,Math.max(36,dist*.25))};
    const q=t=>({x:(1-t)**2*A.x+2*(1-t)*t*C.x+t*t*B.x,y:(1-t)**2*A.y+2*(1-t)*t*C.y+t*t*B.y});
    [0,1,2].forEach(i=>{const dot=el("div",{position:"fixed",left:"0",top:"0",width:i?"8px":"12px",height:i?"8px":"12px",borderRadius:"50%",zIndex:"4",
      background:`radial-gradient(circle,#fff,${hi} 30%,${gold} 62%,transparent 76%)`,boxShadow:"0 0 14px 5px rgba(250,204,21,.7)"});
      root.appendChild(dot);dot.animate([0,.25,.5,.75,1].map((t,n)=>{const z=q(t);return{offset:t,opacity:n===0||n===4?0:(i?.6:1),transform:`translate(${z.x}px,${z.y}px) translate(-50%,-50%)`}}),
      {duration:390,delay:585+i*42,easing:"cubic-bezier(.35,.05,.2,1)",fill:"both"})});
    ring.animate([{opacity:0,transform:"scale(.74)"},{opacity:1,transform:"scale(.96)"},{opacity:0,transform:"scale(1.5)"}],
      {duration:430,delay:850,easing:"cubic-bezier(.2,.75,.25,1)",fill:"both"});
    rise.animate([{opacity:0,transform:"translate(-50%,10px) scale(.65)"},{offset:.2,opacity:1,transform:"translate(-50%,-2px) scale(1.18)"},
      {offset:.66,opacity:1,transform:"translate(-50%,-19px) scale(1.03)"},{opacity:0,transform:"translate(-50%,-42px) scale(.98)"}],
      {duration:620,delay:875,easing:"ease-out",fill:"both"});
  }else{
    ring.animate([{opacity:0},{opacity:1},{opacity:0}],{duration:total,fill:"both"});
    rise.animate([{opacity:0},{opacity:1,transform:"translate(-50%,-5px)"},{opacity:0,transform:"translate(-50%,-18px)"}],{duration:total,fill:"both"});
  }
  setTimeout(()=>{badge.style.visibility=old;root.remove()},total+90);
}

export function installHekaBuffFxBridge(){
  if(typeof window==="undefined"||typeof document==="undefined"||typeof MutationObserver==="undefined"||window.__duatHekaFx)return;
  window.__duatHekaFx=true;const charges=new Map();let pending=null;
  const scan=()=>document.querySelectorAll(".duat-charge").forEach(c=>{const h=c.parentElement,x=r(h);if(h&&x)charges.set(h,x)});
  scan();
  new MutationObserver(ms=>{const now=performance.now(),badges=[];
    for(const m of ms){if(m.type!=="childList")continue;
      for(const n of m.removedNodes)if(n instanceof Element&&(n.matches(".duat-charge")||n.querySelector?.(".duat-charge"))){
        const h=m.target instanceof Element?m.target:null,x=charges.get(h)||r(h);if(x)pending={rect:x,at:now};if(h)charges.delete(h)}
      for(const n of m.addedNodes)if(n instanceof Element){const xs=n.matches(".duat-badge")?[n]:[...n.querySelectorAll?.(".duat-badge")||[]];
        for(const b of xs){const m=(b.textContent||"").trim().match(/^\+(\d+)/);if(m)badges.push({b,v:+m[1]})}}
    }
    if(pending&&now-pending.at<=650&&badges.length){const {b,v}=badges.at(-1),target=r(b.parentElement);if(target&&v>0)playHekaFx(pending.rect,target,v,b);pending=null}
    else if(pending&&now-pending.at>650)pending=null;scan()
  }).observe(document.documentElement,{subtree:true,childList:true});
}
if(typeof window!=="undefined"&&typeof document!=="undefined"&&import.meta.env.MODE!=="test")installHekaBuffFxBridge();
