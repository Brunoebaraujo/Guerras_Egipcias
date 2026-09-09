/*
 * Mummy return FX — the board card itself is the animation asset.
 *
 * Presentation only. The engine already destroys the Múmia and, when the hand
 * has room, creates the doubled Múmia in the owner's hand in the same reveal
 * step. This bridge serializes that state change visually:
 *
 *   death -> grow/rotate -> hover -> curved flight -> hand -> x2 pulse
 *
 * It shares window.__duatPresentationBusyUntil with Heka so the next reveal
 * waits until this presentation is finished.
 */

const MUMMY_TITLE_FRAGMENT = "volta à mão com o dobro";
const SIDE_LABEL = ["Lado A (ouro)", "Lado B (lápis)"];

const RISE_MS = 560;
const HOVER_MS = 260;
const FLIGHT_MS = 820;
const LAND_MS = 380;
const PEAK_SCALE = 2.55;
const PEAK_ROTATION = 45;
const PEAK_LIFT = 52;
const NORMAL_STAGE_MS = RISE_MS + HOVER_MS + FLIGHT_MS + LAND_MS + 140;
const REDUCED_STAGE_MS = 720;
const PAIR_WINDOW_MS = 1200;

/* This module loads after Heka's bridge. Keep the currently-installed timer
   functions so both guards remain chained rather than replacing each other. */
const previousSetTimeout = typeof window !== "undefined" ? window.setTimeout.bind(window) : null;
const previousClearTimeout = typeof window !== "undefined" ? window.clearTimeout.bind(window) : null;

const lower = (value) => String(value || "").toLocaleLowerCase("pt-BR");
const isMummyTitle = (node) => lower(node?.getAttribute?.("title")).includes(MUMMY_TITLE_FRAGMENT);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const sleep = (ms) => new Promise((resolve) => previousSetTimeout(resolve, ms));

const rectOf = (node) => {
  if (!node?.getBoundingClientRect) return null;
  const r = node.getBoundingClientRect();
  if (r.width <= 2 || r.height <= 2) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

function isRevealStepCallback(fn) {
  if (typeof fn !== "function") return false;
  let src = "";
  try { src = Function.prototype.toString.call(fn); } catch { return false; }
  return /\bt\s*:\s*["']step["']/.test(src);
}

function installSharedPresentationTimerGuard() {
  if (!previousSetTimeout || !previousClearTimeout || window.__duatSharedPresentationGuard) return;
  window.__duatSharedPresentationGuard = true;

  const tickets = new Map();
  window.setTimeout = (fn, delay = 0, ...args) => {
    if (!isRevealStepCallback(fn)) return previousSetTimeout(fn, delay, ...args);

    let publicId = null;
    const ticket = { cancelled: false, currentId: null };
    const run = () => {
      if (ticket.cancelled) return;
      const remaining = Number(window.__duatPresentationBusyUntil || 0) - performance.now();
      if (remaining > 8) {
        ticket.currentId = previousSetTimeout(run, remaining + 12);
        return;
      }
      tickets.delete(publicId);
      fn(...args);
    };

    ticket.currentId = previousSetTimeout(run, delay);
    publicId = ticket.currentId;
    tickets.set(publicId, ticket);
    return publicId;
  };

  window.clearTimeout = (id) => {
    const ticket = tickets.get(id);
    if (!ticket) return previousClearTimeout(id);
    ticket.cancelled = true;
    if (ticket.currentId != null) previousClearTimeout(ticket.currentId);
    tickets.delete(id);
  };
}

/* The dying frame turns red, so ownership is read from the nested power badge,
   which keeps the normal amber/sky owner border. */
function ownerOfBoardCard(node) {
  if (!node?.querySelectorAll) return null;
  for (const child of [node, ...node.querySelectorAll("*")]) {
    const border = child.style?.border || "";
    if (/251\s*,\s*191\s*,\s*36/.test(border)) return 0;
    if (/125\s*,\s*211\s*,\s*252/.test(border)) return 1;
  }
  return null;
}

function ownerOfHandNode(node) {
  let cur = node;
  for (let depth = 0; cur && depth < 9; depth += 1, cur = cur.parentElement) {
    const text = cur.textContent || "";
    if (text.includes(SIDE_LABEL[0])) return 0;
    if (text.includes(SIDE_LABEL[1])) return 1;
  }
  return null;
}

function createOverlay() {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "fixed", inset: "0", zIndex: "10020", pointerEvents: "none", overflow: "hidden",
  });
  root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);
  return root;
}

function makeLandingPulse(root, target, hidden) {
  const tr = rectOf(target);
  if (!tr) return;
  const cx = tr.left + tr.width / 2;
  const cy = tr.top + tr.height / 2;
  const pad = hidden ? 3 : Math.max(4, Math.min(10, tr.width * .08));

  const ring = document.createElement("div");
  Object.assign(ring.style, {
    position: "fixed", left: `${tr.left - pad}px`, top: `${tr.top - pad}px`,
    width: `${tr.width + pad * 2}px`, height: `${tr.height + pad * 2}px`,
    borderRadius: "10px", border: "2px solid rgba(251,191,36,.95)",
    boxShadow: "0 0 16px 6px rgba(251,191,36,.55)", opacity: "0",
  });
  root.appendChild(ring);
  ring.animate([
    { opacity: 0, transform: "scale(.84)" },
    { offset: .28, opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(1.32)" },
  ], { duration: LAND_MS, fill: "both", easing: "ease-out" });

  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "fixed", left: `${cx}px`, top: `${cy - Math.max(12, tr.height * .28)}px`,
    color: "#fde68a", fontFamily: "Georgia,serif", fontWeight: "900",
    fontSize: `${clamp(tr.width * .3, 18, 34)}px`,
    textShadow: "0 0 6px #fff7c2,0 0 15px rgba(245,158,11,.95),0 2px 4px #000",
    transform: "translate(-50%,0) scale(.7)", opacity: "0", whiteSpace: "nowrap",
  });
  label.textContent = "×2";
  root.appendChild(label);
  label.animate([
    { opacity: 0, transform: "translate(-50%,8px) scale(.7)" },
    { offset: .24, opacity: 1, transform: "translate(-50%,-2px) scale(1.18)" },
    { offset: .72, opacity: 1, transform: "translate(-50%,-14px) scale(1)" },
    { opacity: 0, transform: "translate(-50%,-29px) scale(.96)" },
  ], { duration: LAND_MS + 150, fill: "both", easing: "ease-out" });
}

async function playMummyReturnFx({ snapshot, sourceRect, target, hiddenTarget, previousVisibility }) {
  const destination = rectOf(target);
  if (!sourceRect || !destination) {
    if (!hiddenTarget && target?.style) target.style.visibility = previousVisibility;
    return;
  }

  const root = createOverlay();
  const clone = snapshot;
  clone.classList?.remove("duat-vanish", "duat-pop", "duat-draw");
  Object.assign(clone.style, {
    position: "fixed",
    left: `${sourceRect.left + sourceRect.width / 2}px`,
    top: `${sourceRect.top + sourceRect.height / 2}px`,
    width: `${sourceRect.width}px`, height: `${sourceRect.height}px`, margin: "0",
    zIndex: "2", pointerEvents: "none", transformOrigin: "50% 50%",
    transform: "translate(-50%,-50%)", opacity: "1", animation: "none",
    filter: "drop-shadow(0 4px 7px rgba(0,0,0,.65))",
  });
  root.appendChild(clone);

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduced) {
    const tx = destination.left + destination.width / 2 - (sourceRect.left + sourceRect.width / 2);
    const ty = destination.top + destination.height / 2 - (sourceRect.top + sourceRect.height / 2);
    await clone.animate([
      { opacity: 1, transform: "translate(-50%,-50%) scale(1)" },
      { opacity: .1, transform: `translate(calc(-50% + ${tx}px),calc(-50% + ${ty}px)) scale(.55)` },
    ], { duration: 430, fill: "both", easing: "ease-in-out" }).finished.catch(() => {});
    if (!hiddenTarget && target?.style) target.style.visibility = previousVisibility;
    makeLandingPulse(root, target, hiddenTarget);
    await sleep(250);
    root.remove();
    return;
  }

  /* Rise: deliberately oversized. The card turns 45 degrees around its own
     center while becoming the visual focus of the board. */
  await clone.animate([
    {
      opacity: 1,
      transform: "translate(-50%,-50%) translateY(0) scale(1) rotate(0deg)",
      filter: "drop-shadow(0 4px 7px rgba(0,0,0,.65))",
    },
    {
      offset: .44,
      opacity: 1,
      transform: "translate(-50%,-50%) translateY(-18px) scale(1.58) rotate(18deg)",
      filter: "drop-shadow(0 0 14px rgba(245,158,11,.42)) drop-shadow(0 8px 11px rgba(0,0,0,.72))",
    },
    {
      opacity: 1,
      transform: `translate(-50%,-50%) translateY(-${PEAK_LIFT}px) scale(${PEAK_SCALE}) rotate(${PEAK_ROTATION}deg)`,
      filter: "drop-shadow(0 0 22px rgba(251,191,36,.58)) drop-shadow(0 12px 15px rgba(0,0,0,.75))",
    },
  ], { duration: RISE_MS, fill: "both", easing: "cubic-bezier(.2,.72,.25,1)" }).finished.catch(() => {});

  /* Hover with a tiny counter-motion, so the large card does not look frozen. */
  await clone.animate([
    { transform: `translate(-50%,-50%) translateY(-${PEAK_LIFT}px) scale(${PEAK_SCALE}) rotate(${PEAK_ROTATION}deg)` },
    { offset: .5, transform: `translate(-50%,-50%) translateY(-${PEAK_LIFT + 5}px) scale(${PEAK_SCALE + .07}) rotate(${PEAK_ROTATION - 6}deg)` },
    { transform: `translate(-50%,-50%) translateY(-${PEAK_LIFT}px) scale(${PEAK_SCALE}) rotate(${PEAK_ROTATION}deg)` },
  ], { duration: HOVER_MS, fill: "both", easing: "ease-in-out" }).finished.catch(() => {});

  const sx = sourceRect.left + sourceRect.width / 2;
  const sy = sourceRect.top + sourceRect.height / 2;
  const A = { x: sx, y: sy - PEAK_LIFT };
  const B = { x: destination.left + destination.width / 2, y: destination.top + destination.height / 2 };
  const dist = Math.hypot(B.x - A.x, B.y - A.y);
  const C = {
    x: (A.x + B.x) / 2,
    y: Math.min(A.y, B.y) - clamp(dist * .22, 46, 140),
  };
  const point = (t) => ({
    x: (1 - t) ** 2 * A.x + 2 * (1 - t) * t * C.x + t ** 2 * B.x,
    y: (1 - t) ** 2 * A.y + 2 * (1 - t) * t * C.y + t ** 2 * B.y,
  });

  const targetRatio = hiddenTarget
    ? .34
    : Math.min(destination.width / sourceRect.width, destination.height / sourceRect.height) * .96;
  const endScale = clamp(targetRatio, .28, .92);
  const dir = B.x >= A.x ? 1 : -1;
  const steps = [0, .14, .3, .48, .66, .83, 1];
  const frames = steps.map((t, index) => {
    const p = point(t);
    const dx = p.x - sx;
    const dy = p.y - sy;
    const scale = PEAK_SCALE + (endScale - PEAK_SCALE) * t;
    /* Unwind the 45-degree rise rotation during the flight, plus a slight bank
       following the curve. It lands upright in the hand. */
    const rotation = PEAK_ROTATION * (1 - t) + Math.sin(t * Math.PI) * dir * 5;
    return {
      offset: t,
      opacity: index === steps.length - 1 ? .14 : 1,
      transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${scale}) rotate(${rotation}deg)`,
      filter: `drop-shadow(0 0 ${22 - 11 * t}px rgba(251,191,36,${.58 - .26 * t})) drop-shadow(0 9px 11px rgba(0,0,0,.7))`,
    };
  });

  await clone.animate(frames, {
    duration: FLIGHT_MS, fill: "both", easing: "cubic-bezier(.32,.05,.18,1)",
  }).finished.catch(() => {});

  if (!hiddenTarget && target?.style) target.style.visibility = previousVisibility;
  if (!hiddenTarget && target?.animate) {
    target.animate([
      { transform: "scale(.88)", filter: "brightness(1)" },
      { offset: .42, transform: "scale(1.1)", filter: "brightness(1.28)" },
      { transform: "scale(1)", filter: "brightness(1)" },
    ], { duration: LAND_MS, fill: "none", easing: "ease-out" });
  }
  makeLandingPulse(root, target, hiddenTarget);
  await sleep(LAND_MS + 100);
  root.remove();
}

const seenSources = new WeakSet();
const seenTargets = new WeakSet();
const pendingSources = [];
const pendingTargets = [];
const desktopHiddenCount = [null, null];
const mobileHiddenCount = [null, null];
let fxChain = Promise.resolve();
let mummyQueueBusyUntil = 0;

function stageDuration() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? REDUCED_STAGE_MS : NORMAL_STAGE_MS;
}

function reservePresentationSlot() {
  const now = performance.now();
  const alreadyBusy = Number(window.__duatPresentationBusyUntil || 0);
  const startAt = Math.max(now, alreadyBusy, mummyQueueBusyUntil);
  const duration = stageDuration();
  mummyQueueBusyUntil = startAt + duration;
  window.__duatPresentationBusyUntil = Math.max(alreadyBusy, mummyQueueBusyUntil);
  return { startAt, duration };
}

function enqueuePair(sourceEntry, targetEntry) {
  const targetRect = rectOf(targetEntry.node);
  if (!sourceEntry.sourceRect || !targetRect) return;

  const previousVisibility = targetEntry.node.style?.visibility || "";
  if (!targetEntry.hidden && targetEntry.node.style) targetEntry.node.style.visibility = "hidden";
  const slot = reservePresentationSlot();

  fxChain = fxChain
    .catch(() => {})
    .then(async () => {
      const wait = slot.startAt - performance.now();
      if (wait > 8) await sleep(wait);
      await playMummyReturnFx({
        snapshot: sourceEntry.snapshot,
        sourceRect: sourceEntry.sourceRect,
        target: targetEntry.node,
        hiddenTarget: targetEntry.hidden,
        previousVisibility,
      });
    })
    .catch((err) => {
      if (!targetEntry.hidden && targetEntry.node?.style) targetEntry.node.style.visibility = previousVisibility;
      console.warn("Mummy FX: falha ao apresentar retorno para a mão.", err);
    });
}

function flushPairs() {
  const now = performance.now();
  for (let i = pendingSources.length - 1; i >= 0; i -= 1)
    if (now - pendingSources[i].at > PAIR_WINDOW_MS) pendingSources.splice(i, 1);
  for (let i = pendingTargets.length - 1; i >= 0; i -= 1)
    if (now - pendingTargets[i].at > PAIR_WINDOW_MS) pendingTargets.splice(i, 1);

  for (let i = 0; i < pendingSources.length;) {
    const src = pendingSources[i];
    const targetIndex = pendingTargets.findIndex((t) =>
      Math.abs(t.at - src.at) <= PAIR_WINDOW_MS &&
      (src.owner == null || t.owner == null || src.owner === t.owner)
    );
    if (targetIndex < 0) { i += 1; continue; }
    const [target] = pendingTargets.splice(targetIndex, 1);
    pendingSources.splice(i, 1);
    enqueuePair(src, target);
  }
}

function registerSource(node) {
  if (!node || seenSources.has(node) || !node.classList?.contains("duat-vanish") || !isMummyTitle(node)) return;
  const sourceRect = rectOf(node);
  if (!sourceRect) return;
  seenSources.add(node);
  pendingSources.push({
    node,
    owner: ownerOfBoardCard(node),
    sourceRect,
    snapshot: node.cloneNode(true),
    at: performance.now(),
  });
}

function registerTarget(node, hidden = false, explicitOwner = null, force = false) {
  if (!node || (!force && seenTargets.has(node))) return;
  if (!rectOf(node)) return;
  seenTargets.add(node);
  pendingTargets.push({
    node,
    hidden,
    owner: explicitOwner ?? ownerOfHandNode(node),
    at: performance.now(),
  });
}

function scanSources() {
  document.querySelectorAll(".duat-vanish[title]").forEach(registerSource);
}

function visibleMummyHandRoots() {
  const roots = [];
  document.querySelectorAll("button[title]").forEach((button) => {
    if (!isMummyTitle(button)) return;
    const root = button.parentElement;
    if (root && !root.closest?.(".duat-vanish")) roots.push(root);
  });
  document.querySelectorAll('div[style*="max-width: 68px"]').forEach((node) => {
    if ((node.textContent || "").includes("Múmia")) roots.push(node);
  });
  return [...new Set(roots)];
}

function scanVisibleHandTargets() {
  visibleMummyHandRoots().forEach((root) => registerTarget(root, false));
}

/* Desktop vs Bot: React may reuse/reconcile anonymous hidden thumbnails in a
   way that makes "new DOM node" detection unreliable. Count the cards in the
   hidden hand instead. A count increase is the authoritative presentation
   signal that a returned card really reached that hand. */
function scanHiddenDesktopCounts() {
  const headings = [...document.querySelectorAll("h3")];
  for (const owner of [0, 1]) {
    const heading = headings.find((h) => (h.textContent || "").includes(SIDE_LABEL[owner]));
    const panel = heading?.parentElement?.parentElement;
    if (!panel) continue;
    const eyes = [...panel.querySelectorAll("span")].filter((s) => (s.textContent || "").trim() === "𓂀");
    /* If this hand is visible, the eye count is zero and this scanner simply
       stays dormant. */
    const count = eyes.length;
    if (desktopHiddenCount[owner] == null) {
      desktopHiddenCount[owner] = count;
      continue;
    }
    if (count > desktopHiddenCount[owner]) {
      const newestThumb = eyes[count - 1]?.parentElement || panel;
      registerTarget(newestThumb, true, owner, true);
    }
    desktopHiddenCount[owner] = count;
  }
}

/* Mobile hides individual opponent cards and exposes only the hand count. */
function scanHiddenMobileCounts() {
  for (const owner of [0, 1]) {
    const labels = [...document.querySelectorAll("span")].filter((node) =>
      (node.textContent || "").trim() === SIDE_LABEL[owner]
    );
    for (const label of labels) {
      const row = label.parentElement?.parentElement;
      if (!row) continue;
      const match = (row.textContent || "").match(/🂠\s*(\d+)/);
      if (!match) continue;
      const count = Number(match[1]);
      if (mobileHiddenCount[owner] == null) mobileHiddenCount[owner] = count;
      else if (count > mobileHiddenCount[owner]) {
        registerTarget(row, true, owner, true);
        mobileHiddenCount[owner] = count;
      } else mobileHiddenCount[owner] = count;
      break;
    }
  }
}

function scanAll() {
  scanSources();
  scanVisibleHandTargets();
  scanHiddenDesktopCounts();
  scanHiddenMobileCounts();
  flushPairs();
}

function primeExistingVisibleTargets() {
  /* Mummies already present in the opening hand are not return events. Mark
     their nodes as old so only a newly-created returned Mummy is queued. */
  visibleMummyHandRoots().forEach((root) => seenTargets.add(root));
  scanHiddenDesktopCounts();
  scanHiddenMobileCounts();
}

export function installMummyReturnFx() {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  if (window.__duatMummyReturnFx) return;
  window.__duatMummyReturnFx = true;

  installSharedPresentationTimerGuard();
  previousSetTimeout(primeExistingVisibleTargets, 0);

  const observer = new MutationObserver(() => {
    scanAll();
    /* React can insert the hand result and apply .duat-vanish in adjacent
       microtasks. One follow-up scan closes that race without continuous polling. */
    previousSetTimeout(scanAll, 28);
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
    characterData: true,
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") installMummyReturnFx();
