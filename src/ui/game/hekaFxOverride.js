/*
 * Heka FX — presentation queue bridge.
 *
 * Heka resolves in the game engine at the same instant as the target card's own
 * effects. Visually, though, those effects must not compete. This bridge gives
 * the reveal presentation a queue: Heka plays first; any blessing animation
 * created by the target card is delayed until Heka finishes; and the automatic
 * reveal step is held while the presentation queue is still busy.
 *
 * Ka Errante needs one extra presentation rule. When Ka consumes Heka and then
 * echoes Heka, the rule engine resolves both facts in the same reveal step:
 * Heka -> Ka happens now, while Ka also becomes the source of the NEXT Heka
 * transfer. The current UI marks only the physical Heka as `.duat-charge`, so
 * this bridge remembers Ka as a virtual Heka source after the first transfer.
 * The next +N therefore originates visually from Ka, producing two serialized
 * animations instead of collapsing both effects into the original Heka.
 *
 * The rule state remains untouched. This module only sequences presentation.
 */
if (typeof window !== "undefined") window.__duatHekaFx = true; // blocks legacy bridge in animations.js

const HANDS_PAYLOAD = `${import.meta.env.BASE_URL}fx/heka-hands.webp.b64`;

const HANDS_TOTAL = 2000;
const TRAVEL_DELAY = 585;
const TRAVEL_DURATION = 890;
const IMPACT_AT = TRAVEL_DELAY + TRAVEL_DURATION;
const HEKA_STAGE_MS = Math.max(HANDS_TOTAL, IMPACT_AT + 650) + 75;
const BLESSING_MAX_ANIM_MS = 1500;
const KA_TITLE_FRAGMENT = "copia o último efeito";

const nativeSetTimeout = typeof window !== "undefined" ? window.setTimeout.bind(window) : null;
const nativeClearTimeout = typeof window !== "undefined" ? window.clearTimeout.bind(window) : null;

let presentationBusyUntil = 0;
let handsSrc = null;
const handsReady = typeof fetch === "function"
  ? fetch(HANDS_PAYLOAD, { cache: "force-cache" })
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
      .catch((err) => {
        console.warn("Heka FX: não foi possível carregar as mãos.", err);
        return null;
      })
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

const isKaCard = (node) =>
  (node?.getAttribute?.("title") || "").toLocaleLowerCase("pt-BR").includes(KA_TITLE_FRAGMENT);

function markPresentationBusy(msFromNow) {
  presentationBusyUntil = Math.max(presentationBusyUntil, performance.now() + msFromNow);
  window.__duatPresentationBusyUntil = presentationBusyUntil;
}

function isRevealStepCallback(fn) {
  if (typeof fn !== "function") return false;
  let src = "";
  try { src = Function.prototype.toString.call(fn); } catch { return false; }
  return /\bt\s*:\s*["']step["']/.test(src);
}

/* Hold only the automatic reveal step while an FX presentation is running. */
function installRevealTimerGuard() {
  if (!nativeSetTimeout || !nativeClearTimeout || window.__duatRevealTimerGuard) return;
  window.__duatRevealTimerGuard = true;

  const tickets = new Map();

  window.setTimeout = (fn, delay = 0, ...args) => {
    if (!isRevealStepCallback(fn)) return nativeSetTimeout(fn, delay, ...args);

    let publicId = null;
    const ticket = { cancelled: false, currentId: null };

    const run = () => {
      if (ticket.cancelled) return;
      const remaining = presentationBusyUntil - performance.now();
      if (remaining > 8) {
        ticket.currentId = nativeSetTimeout(run, remaining + 12);
        return;
      }
      tickets.delete(publicId);
      fn(...args);
    };

    ticket.currentId = nativeSetTimeout(run, delay);
    publicId = ticket.currentId;
    tickets.set(publicId, ticket);
    return publicId;
  };

  window.clearTimeout = (id) => {
    const ticket = tickets.get(id);
    if (!ticket) return nativeClearTimeout(id);
    ticket.cancelled = true;
    if (ticket.currentId != null) nativeClearTimeout(ticket.currentId);
    tickets.delete(id);
  };
}

function classDurationMs(node) {
  if (node.classList.contains("duat-bless-rise")) return 1500;
  if (node.classList.contains("duat-bless-ring")) return 1150;
  if (node.classList.contains("duat-bless-glow")) return 1150;
  if (node.classList.contains("duat-bless-fonte")) return 950;
  return BLESSING_MAX_ANIM_MS;
}

function inlineDelayMs(node) {
  const raw = (node.style.animationDelay || "0").trim();
  if (!raw) return 0;
  if (raw.endsWith("ms")) return Number.parseFloat(raw) || 0;
  if (raw.endsWith("s")) return (Number.parseFloat(raw) || 0) * 1000;
  return Number.parseFloat(raw) || 0;
}

/* Put Renenutet / blessing primitives after Heka rather than on top of it. */
function queueChainedCardAnimations() {
  const selector = ".duat-bless-fonte,.duat-bless-ring,.duat-bless-glow,.duat-bless-rise";
  const nodes = [...document.querySelectorAll(selector)].filter((n) => !n.dataset.hekaQueued);

  let queueEnd = HEKA_STAGE_MS;
  for (const node of nodes) {
    const originalDelay = inlineDelayMs(node);
    const queuedDelay = originalDelay + HEKA_STAGE_MS;
    node.dataset.hekaQueued = "1";
    node.style.animationDelay = `${queuedDelay}ms`;
    queueEnd = Math.max(queueEnd, queuedDelay + classDurationMs(node));
  }

  return queueEnd + 120;
}

async function playHekaFx(source, target, value, badge, previousBadgeVisibility) {
  const root = make("div", {
    position: "fixed", inset: "0", zIndex: "9999", pointerEvents: "none", overflow: "hidden",
  });
  root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);

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
  hands.alt = "";
  root.appendChild(hands);

  const resolvedHands = handsSrc || await handsReady;
  if (resolvedHands) hands.src = resolvedHands;

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

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduced) {
    hands.animate([
      { opacity: 0 }, { offset: .18, opacity: 1 }, { offset: .78, opacity: 1 }, { opacity: 0 },
    ], { duration: 900, fill: "both", easing: "ease-out" });
    ring.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 350, fill: "both" });
    rise.animate([
      { opacity: 0, transform: "translate(-50%,8px)" },
      { opacity: 1, transform: "translate(-50%,-4px)" },
      { opacity: 0, transform: "translate(-50%,-22px)" },
    ], { duration: 600, delay: 360, fill: "both" });
    nativeSetTimeout(() => {
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
  ], { duration: 430, delay: IMPACT_AT, easing: "cubic-bezier(.2,.75,.25,1)", fill: "both" });

  rise.animate([
    { opacity: 0, transform: "translate(-50%,10px) scale(.65)" },
    { offset: .2, opacity: 1, transform: "translate(-50%,-2px) scale(1.18)" },
    { offset: .66, opacity: 1, transform: "translate(-50%,-19px) scale(1.03)" },
    { opacity: 0, transform: "translate(-50%,-42px) scale(.98)" },
  ], { duration: 620, delay: IMPACT_AT + 25, easing: "ease-out", fill: "both" });

  nativeSetTimeout(() => {
    if (badge) badge.style.visibility = previousBadgeVisibility;
    root.remove();
  }, HEKA_STAGE_MS);
}

export function installHekaFxOverride() {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  if (window.__duatHekaFxV4) return;
  window.__duatHekaFxV4 = true;

  installRevealTimerGuard();

  let charges = new Map();
  const pendingSources = [];
  const kaEchoSources = [];
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
      if (!next.has(card)) pendingSources.push({ card, rect, at: now });
    }
    while (pendingSources.length > 8) pendingSources.shift();
    charges = next;
  };

  const latestLiveKaEchoSource = () => {
    while (kaEchoSources.length) {
      const candidate = kaEchoSources[kaEchoSources.length - 1];
      const rect = candidate.card?.isConnected ? rectOf(candidate.card) : candidate.rect;
      if (rect) return { ...candidate, rect };
      kaEchoSources.pop();
    }
    return null;
  };

  const activeHekaSourceForKa = (targetCard) => {
    // Special Heka -> Ka commit: the physical Heka may stay charged because Ka
    // re-reserved the same effect before React painted. In that case there is no
    // charge-removal event to infer the first source from, so use the still-live
    // Heka charge. Restrict this fallback to Ka to avoid stealing unrelated +N.
    if (!isKaCard(targetCard)) return null;
    const active = [...charges.entries()].filter(([card]) => card !== targetCard && card.isConnected);
    if (!active.length) return null;
    const [card, rect] = active[active.length - 1];
    return { card, rect, at: performance.now(), activeFallback: true };
  };

  const processBadges = () => {
    const now = performance.now();
    document.querySelectorAll(".duat-badge").forEach((badge) => {
      if (seenBadges.has(badge)) return;
      const match = (badge.textContent || "").trim().match(/^\+(\d+)/);
      if (!match) return;

      while (pendingSources.length && now - pendingSources[0].at > 2500) pendingSources.shift();

      const targetCard = badge.parentElement;
      const target = rectOf(targetCard);
      const value = Number(match[1]);
      if (!target || value <= 0) return;

      // Priority 1: a Ka that echoed Heka owns the next Heka-style transfer.
      // This deliberately beats a stale physical-Heka removal created in the
      // same React commit when the copied reservation is finally consumed.
      const kaEcho = latestLiveKaEchoSource();
      let source = kaEcho;
      let sourceKind = kaEcho ? "ka-echo" : null;

      // Priority 2: normal source — a `.duat-charge` that just disappeared.
      if (!source) {
        source = pendingSources[pendingSources.length - 1] || null;
        if (source) sourceKind = "pending";
      }

      // Priority 3: Heka -> Ka can consume and re-arm Heka in one engine step,
      // so the Heka charge never disappears. Use the active charge only for Ka.
      if (!source) {
        source = activeHekaSourceForKa(targetCard);
        if (source) sourceKind = "active-heka-to-ka";
      }

      if (!source?.rect) return;

      if (sourceKind === "ka-echo") {
        kaEchoSources.pop();
        // The hard-coded physical Heka glow may disappear in this same commit.
        // Its pending source is now stale; discard it so it cannot animate a
        // later, unrelated +N after Ka has already supplied the true source.
        if (pendingSources.length) pendingSources.pop();
      } else if (sourceKind === "pending") {
        pendingSources.pop();
      }

      seenBadges.add(badge);

      const previousBadgeVisibility = badge.style.visibility;
      badge.style.visibility = "hidden";

      const queueEndMs = queueChainedCardAnimations();
      markPresentationBusy(queueEndMs);
      void playHekaFx(source.rect, target, value, badge, previousBadgeVisibility);

      // If Heka just buffed Ka and Ka's resulting badge is still +N, the Ka
      // successfully echoed Heka in this reveal. Remember its DOM node, not only
      // its current rectangle, so the copied reservation may survive rounds and
      // still originate from Ka when it is eventually consumed.
      if (isKaCard(targetCard)) {
        kaEchoSources.push({ card: targetCard, rect: target, at: now, value });
        while (kaEchoSources.length > 4) kaEchoSources.shift();
      }
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
