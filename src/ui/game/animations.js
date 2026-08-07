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

