/*
 * Heka FX v2 — observer robusto e timings explícitos.
 *
 * Este módulo assume o controle do FX de Heka antes de animations.js instalar
 * a ponte antiga. A razão é simples: a ponte anterior dependia de uma janela
 * curta entre a remoção de `.duat-charge` e a criação do badge +N; em alguns
 * renders isso falhava e sobrava apenas o badge genérico, que parecia mais
 * rápido e sem as mãos.
 */
if (typeof window !== "undefined") window.__duatHekaFx = true;

const HANDS_PAYLOAD = `${import.meta.env.BASE_URL}fx/heka-hands.webp.b64`;
let handsSrc = null;
const handsReady = typeof fetch === "function"
  ? fetch(HANDS_PAYLOAD)
      .then((r) => {
        if (!r.ok) throw new Error(`Heka hands payload ${r.status}`);
        return r.text();
      })
      .then((b64) => {
        handsSrc = `data:image/webp;base64,${b64.trim()}`;
        if (typeof Image !== "undefined") {
          const img = new Image();
          img.src = handsSrc;
        }
        return handsSrc;
      })
      .catch(() => null)
  : Promise.resolve(null);

const rectOf = (node) => {
  if (!node?.getBoundingClientRect) return null;
  const r = node.getBoundingClientRect();
  return r.width > 2 && r.height > 2
    ? { left: r.left, top: r.top, width: r.width, height: r.height }
    : null;
};

const make = (tag = "div", style = {}) => {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  return node;
};

async function playHekaFx(source, target, value, badge) {
  const resolvedHands = handsSrc || await handsReady;

  const root = make("div", {
    position: "fixed", inset: "0", zIndex: "9999", pointerEvents: "none", overflow: "hidden",
  });
  root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);

  const previousBadgeVisibility = badge?.style?.visibility || "";
  if (badge) badge.style.visibility = "hidden";

  const sx = source.left + source.width / 2;
  const sy = source.top + source.height * 0.34;
  const tx = target.left + target.width / 2;
  const ty = target.top + target.height * 0.34;

  const handsWidth = Math.max(140, Math.min(300, source.width * 3.05));
  const orbSize = Math.max(18, Math.min(32, source.width * 0.34));
  const gold = "#facc15";
  const hi = "#fff2a8";

  const hands = make("img", {
    position: "fixed", left: `${sx}px`, top: `${sy}px`, width: `${handsWidth}px`, opacity: "0", zIndex: "2",
    transform: "translate(-50%,-50%) scale(.76)",
    filter: "drop-shadow(0 0 7px rgba(125,211,252,.72)) drop-shadow(0 0 15px rgba(56,189,248,.38))",
  });
  if (resolvedHands) hands.src = resolvedHands;
  hands.alt = "";
  root.appendChild(hands);

  const orb = make("div", {
    position: "fixed", left: `${sx - orbSize / 2}px`, top: `${sy - orbSize / 2}px`,
    width: `${orbSize}px`, height: `${orbSize}px`, borderRadius: "50%", zIndex: "4",
    opacity: "0", transform: "scale(.25)",
    background: `radial-gradient(circle,#fff 0%,${hi} 25%,${gold} 58%,transparent 76%)`,
    boxShadow: "0 0 10px 4px rgba(255,242,168,.9),0 0 27px 10px rgba(250,204,21,.55)",
  });
  root.appendChild(orb);

  const pad = Math.max(5, target.width * 0.08);
  const ring = make("div", {
    position: "fixed", left: `${target.left - pad}px`, top: `${target.top - pad}px`,
    width: `${target.width + pad * 2}px`, height: `${target.height + pad * 2}px`,
    borderRadius: `${Math.max(7, target.width * 0.1)}px`, border: `2.5px solid ${hi}`,
    boxShadow: "0 0 13px 5px rgba(250,204,21,.82),inset 0 0 14px 3px rgba(250,204,21,.38)",
    zIndex: "2", opacity: "0", transform: "scale(.74)",
  });
  root.appendChild(ring);

  const rise = make("div", {
    position: "fixed", left: `${tx}px`, top: `${target.top}px`, zIndex: "5", opacity: "0", color: hi,
    fontFamily: "Georgia,serif", fontWeight: "900",
    fontSize: `${Math.max(22, Math.min(40, target.width * 0.48))}px`,
    textShadow: "0 0 6px #fff,0 0 14px rgba(250,204,21,.95),0 2px 4px #000",
    transform: "translate(-50%,10px) scale(.65)",
  });
  rise.textContent = `+${value}`;
  root.appendChild(rise);

  /* Timings pedidos:
     - mãos: 1500ms originais + 500ms = 2000ms totais;
     - orb na curva: 390ms originais + 500ms = 890ms;
     - impacto só começa quando a orb chega. */
  const HANDS_TOTAL = 2000;
  const TRAVEL_DELAY = 585;
  const TRAVEL_DURATION = 890;
  const IMPACT_AT = TRAVEL_DELAY + TRAVEL_DURATION;
  const END_AT = Math.max(HANDS_TOTAL, IMPACT_AT + 650);

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduced) {
    hands.animate([
      { opacity: 0, transform: "translate(-50%,-50%) scale(.92)" },
      { offset: .18, opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
      { offset: .78, opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
      { opacity: 0, transform: "translate(-50%,-52%) scale(.98)" },
    ], { duration: 900, fill: "both", easing: "ease-out" });
    ring.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 350, fill: "both" });
    rise.animate([
      { opacity: 0, transform: "translate(-50%,8px)" },
      { opacity: 1, transform: "translate(-50%,-4px)" },
      { opacity: 0, transform: "translate(-50%,-22px)" },
    ], { duration: 600, delay: 360, fill: "both" });
    setTimeout(() => {
      if (badge) badge.style.visibility = previousBadgeVisibility;
      root.remove();
    }, 1050);
    return;
  }

  hands.animate([
    { opacity: 0, transform: "translate(-50%,-50%) scale(.76)" },
    { offset: .12, opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
    { offset: .82, opacity: 1, transform: "translate(-50%,-50%) scale(1.02)" },
    { opacity: 0, transform: "translate(-50%,-55%) scale(.94)" },
  ], { duration: HANDS_TOTAL, easing: "cubic-bezier(.2,.75,.25,1)", fill: "both" });

  orb.animate([
    { opacity: 0, transform: "scale(.25)" },
    { offset: .18, opacity: 1, transform: "scale(.75)" },
    { offset: .29, opacity: 1, transform: "scale(1.25)" },
    { offset: .38, opacity: 1, transform: "scale(.82)" },
    { offset: .47, opacity: 1, transform: "scale(1.3)" },
    { offset: .58, opacity: 0, transform: "scale(.3)" },
    { opacity: 0 },
  ], { duration: 1500, easing: "ease-out", fill: "both" });

  const A = { x: sx, y: sy };
  const B = { x: tx, y: ty };
  const dist = Math.hypot(tx - sx, ty - sy);
  const C = {
    x: (sx + tx) / 2,
    y: Math.min(sy, ty) - Math.min(95, Math.max(36, dist * 0.25)),
  };
  const q = (t) => ({
    x: (1 - t) ** 2 * A.x + 2 * (1 - t) * t * C.x + t ** 2 * B.x,
    y: (1 - t) ** 2 * A.y + 2 * (1 - t) * t * C.y + t ** 2 * B.y,
  });

  [0, 1, 2].forEach((i) => {
    const dot = make("div", {
      position: "fixed", left: "0", top: "0", width: i ? "8px" : "12px", height: i ? "8px" : "12px",
      borderRadius: "50%", zIndex: "4",
      background: `radial-gradient(circle,#fff,${hi} 30%,${gold} 62%,transparent 76%)`,
      boxShadow: "0 0 14px 5px rgba(250,204,21,.7)",
    });
    root.appendChild(dot);
    dot.animate([0, .25, .5, .75, 1].map((t, n) => {
      const p = q(t);
      return {
        offset: t,
        opacity: n === 0 || n === 4 ? 0 : (i ? .6 : 1),
        transform: `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`,
      };
    }), {
      duration: TRAVEL_DURATION,
      delay: TRAVEL_DELAY + i * 42,
      easing: "cubic-bezier(.35,.05,.2,1)",
      fill: "both",
    });
  });

  ring.animate([
    { opacity: 0, transform: "scale(.74)" },
    { opacity: 1, transform: "scale(.96)" },
    { opacity: 0, transform: "scale(1.5)" },
  ], {
    duration: 430,
    delay: IMPACT_AT,
    easing: "cubic-bezier(.2,.75,.25,1)",
    fill: "both",
  });

  rise.animate([
    { opacity: 0, transform: "translate(-50%,10px) scale(.65)" },
    { offset: .2, opacity: 1, transform: "translate(-50%,-2px) scale(1.18)" },
    { offset: .66, opacity: 1, transform: "translate(-50%,-19px) scale(1.03)" },
    { opacity: 0, transform: "translate(-50%,-42px) scale(.98)" },
  ], {
    duration: 620,
    delay: IMPACT_AT + 25,
    easing: "ease-out",
    fill: "both",
  });

  setTimeout(() => {
    if (badge) badge.style.visibility = previousBadgeVisibility;
    root.remove();
  }, END_AT + 100);
}

export function installHekaFxOverride() {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  if (window.__duatHekaFxV2) return;
  window.__duatHekaFxV2 = true;

  let charges = new Map();
  const pendingSources = [];
  const seenBadges = new WeakSet();

  const scanCharges = () => {
    const next = new Map();
    document.querySelectorAll(".duat-charge").forEach((charge) => {
      const card = charge.parentElement;
      const rect = rectOf(card);
      if (card && rect) next.set(card, rect);
    });

    const now = performance.now();
    for (const [card, rect] of charges) {
      if (!next.has(card)) pendingSources.push({ rect, at: now });
    }
    while (pendingSources.length > 8) pendingSources.shift();
    charges = next;
  };

  const processBadges = () => {
    const now = performance.now();
    document.querySelectorAll(".duat-badge").forEach((badge) => {
      if (seenBadges.has(badge)) return;
      const match = (badge.textContent || "").trim().match(/^\+(\d+)/);
      if (!match) return;
      seenBadges.add(badge);

      while (pendingSources.length && now - pendingSources[0].at > 1800) pendingSources.shift();
      const source = pendingSources.pop();
      const target = rectOf(badge.parentElement);
      const value = Number(match[1]);
      if (source && target && value > 0) void playHekaFx(source.rect, target, value, badge);
    });
  };

  scanCharges();
  processBadges();

  new MutationObserver(() => {
    scanCharges();
    processBadges();
  }).observe(document.documentElement, { subtree: true, childList: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined" && import.meta.env.MODE !== "test") {
  installHekaFxOverride();
}
