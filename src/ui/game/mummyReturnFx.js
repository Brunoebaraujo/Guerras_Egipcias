/*
 * Mummy return FX — the card itself is the animation asset.
 *
 * When a Múmia is destroyed, the rules already put the doubled card back in
 * the owner's hand in the same reveal step. This bridge only changes how that
 * state transition is PRESENTED:
 *
 *   board card dies -> visual clone grows -> hovers -> flies in a curve to the
 *   newly-added hand card -> destination pulses with ×2 -> reveal may continue.
 *
 * No game rule lives here. If the hand is full and the rules do not return a
 * card, no destination appears in the DOM and therefore no return FX is played.
 *
 * This module is imported AFTER hekaFxOverride.js. Its reveal-timer guard uses
 * the shared window.__duatPresentationBusyUntil timestamp, so Heka, Ka/Heka and
 * Mummy presentations serialize instead of competing with the next reveal.
 */

const MUMMY_TITLE_FRAGMENT = "volta à mão com o dobro";
const SIDE_LABEL = ["Lado A (ouro)", "Lado B (lápis)"];

const RISE_MS = 520;
const HOVER_MS = 220;
const FLIGHT_MS = 780;
const LAND_MS = 360;
const NORMAL_STAGE_MS = RISE_MS + HOVER_MS + FLIGHT_MS + LAND_MS + 120;
const REDUCED_STAGE_MS = 720;
const PAIR_WINDOW_MS = 700;

const previousSetTimeout = typeof window !== "undefined" ? window.setTimeout.bind(window) : null;
const previousClearTimeout = typeof window !== "undefined" ? window.clearTimeout.bind(window) : null;

const lower = (value) => String(value || "").toLocaleLowerCase("pt-BR");
const isMummyTitle = (node) => lower(node?.getAttribute?.("title")).includes(MUMMY_TITLE_FRAGMENT);

const rectOf = (node) => {
  if (!node?.getBoundingClientRect) return null;
  const r = node.getBoundingClientRect();
  if (r.width <= 2 || r.height <= 2) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const sleep = (ms) => new Promise((resolve) => previousSetTimeout(resolve, ms));

function isRevealStepCallback(fn) {
  if (typeof fn !== "function") return false;
  let src = "";
  try { src = Function.prototype.toString.call(fn); } catch { return false; }
  return /\bt\s*:\s*["']step["']/.test(src);
}

/*
 * Heka's original guard owns a private busy timestamp, while also publishing it
 * on window.__duatPresentationBusyUntil. This outer guard is deliberately the
 * last one installed: it waits on that SHARED timestamp, so it can hold reveal
 * for both Heka and Mummy without either FX needing to know about the other.
 */
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
      const busyUntil = Number(window.__duatPresentationBusyUntil || 0);
      const remaining = busyUntil - performance.now();
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

function ownerOfBoardCard(node) {
  if (!node?.querySelectorAll) return null;
  for (const child of [node, ...node.querySelectorAll("*")]) {
    const border = child.style?.border || "";
    /* owner 0 uses amber; owner 1 uses lapis/sky on the power badge even while
       the dying frame itself has already turned red. */
    if (/251\s*,\s*191\s*,\s*36/.test(border)) return 0;
    if (/125\s*,\s*211\s*,\s*252/.test(border)) return 1;
  }
  return null;
}

function ownerOfHandNode(node) {
  let cur = node;
  for (let depth = 0; cur && depth < 8; depth += 1, cur = cur.parentElement) {
    const txt = cur.textContent || "";
    if (txt.includes(SIDE_LABEL[0])) return 0;
    if (txt.includes(SIDE_LABEL[1])) return 1;
  }
  return null;
}

function targetPower(node) {
  const titled = node?.querySelector?.('[title^="Faixa "]');
  const fromTitle = titled?.getAttribute("title")?.match(/Faixa\s+(-?\d+)/i);
  if (fromTitle) return Number(fromTitle[1]);
  const fromText = (node?.textContent || "").match(/Faixa\s+(-?\d+)/i);
  return fromText ? Number(fromText[1]) : null;
}

function createOverlay() {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "10020",
    pointerEvents: "none",
    overflow: "hidden",
  });
  root.setAttribute("aria-hidden", "true");
  document.body.appendChild(root);
  return root;
}

function makePulse(root, target, hidden) {
  const tr = rectOf(target);
  if (!tr) return;

  const cx = tr.left + tr.width / 2;
  const cy = tr.top + tr.height / 2;
  const pad = hidden ? 2 : Math.max(4, Math.min(10, tr.width * 0.08));

  const ring = document.createElement("div");
  Object.assign(ring.style, {
    position: "fixed",
    left: `${tr.left - pad}px`,
    top: `${tr.top - pad}px`,
    width: `${tr.width + pad * 2}px`,
    height: `${tr.height + pad * 2}px`,
    borderRadius: hidden ? "8px" : "10px",
    border: "2px solid rgba(251,191,36,.95)",
    boxShadow: "0 0 14px 5px rgba(251,191,36,.52)",
    opacity: "0",
  });
  root.appendChild(ring);
  ring.animate([
    { opacity: 0, transform: "scale(.86)" },
    { offset: .28, opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(1.28)" },
  ], { duration: LAND_MS, fill: "both", easing: "ease-out" });

  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "fixed",
    left: `${cx}px`,
    top: `${cy - Math.max(12, tr.height * 0.28)}px`,
    color: "#fde68a",
    fontFamily: "Georgia,serif",
    fontWeight: "900",
    fontSize: `${clamp(tr.width * 0.28, 18, 32)}px`,
    textShadow: "0 0 6px #fff7c2,0 0 14px rgba(245,158,11,.9),0 2px 4px #000",
    transform: "translate(-50%,0) scale(.7)",
    opacity: "0",
    whiteSpace: "nowrap",
  });
  label.textContent = "×2";
  root.appendChild(label);
  label.animate([
    { opacity: 0, transform: "translate(-50%,8px) scale(.7)" },
    { offset: .25, opacity: 1, transform: "translate(-50%,-2px) scale(1.15)" },
    { offset: .72, opacity: 1, transform: "translate(-50%,-13px) scale(1)" },
    { opacity: 0, transform: "translate(-50%,-27px) scale(.96)" },
  ], { duration: LAND_MS + 140, fill: "both", easing: "ease-out" });
}

async function playMummyReturnFx(entry) {
  const { snapshot, sourceRect, target, hiddenTarget, previousVisibility } = entry;
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
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    margin: "0",
    zIndex: "2",
    pointerEvents: "none",
    transformOrigin: "50% 50%",
    transform: "translate(-50%,-50%)",
    opacity: "1",
    animation: "none",
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
    makePulse(root, target, hiddenTarget);
    await sleep(240);
    root.remove();
    return;
  }

  /* 1) The dead mini-card becomes the asset: it rises and grows before moving. */
  await clone.animate([
    {
      opacity: 1,
      transform: "translate(-50%,-50%) translateY(0) scale(1)",
      filter: "drop-shadow(0 4px 7px rgba(0,0,0,.65))",
    },
    {
      offset: .45,
      opacity: 1,
      transform: "translate(-50%,-50%) translateY(-13px) scale(1.28)",
      filter: "drop-shadow(0 0 12px rgba(245,158,11,.38)) drop-shadow(0 7px 10px rgba(0,0,0,.7))",
    },
    {
      opacity: 1,
      transform: "translate(-50%,-50%) translateY(-36px) scale(1.68)",
      filter: "drop-shadow(0 0 18px rgba(251,191,36,.52)) drop-shadow(0 10px 12px rgba(0,0,0,.72))",
    },
  ], { duration: RISE_MS, fill: "both", easing: "cubic-bezier(.2,.72,.25,1)" }).finished.catch(() => {});

  /* 2) A short hover makes the resurrection readable instead of looking like a
        normal drag-and-drop movement. */
  await sleep(HOVER_MS);

  /* 3) Quadratic Bézier flight to the actual hand card (or hidden hand row). */
  const sx = sourceRect.left + sourceRect.width / 2;
  const sy = sourceRect.top + sourceRect.height / 2;
  const A = { x: sx, y: sy - 36 };
  const B = {
    x: destination.left + destination.width / 2,
    y: destination.top + destination.height / 2,
  };
  const dist = Math.hypot(B.x - A.x, B.y - A.y);
  const C = {
    x: (A.x + B.x) / 2,
    y: Math.min(A.y, B.y) - clamp(dist * 0.22, 42, 130),
  };
  const point = (t) => ({
    x: (1 - t) ** 2 * A.x + 2 * (1 - t) * t * C.x + t ** 2 * B.x,
    y: (1 - t) ** 2 * A.y + 2 * (1 - t) * t * C.y + t ** 2 * B.y,
  });

  const targetRatio = hiddenTarget
    ? .34
    : Math.min(destination.width / sourceRect.width, destination.height / sourceRect.height) * .96;
  const endScale = clamp(targetRatio, .28, .92);
  const steps = [0, .16, .33, .5, .67, .84, 1];
  const flightFrames = steps.map((t, i) => {
    const p = point(t);
    const dx = p.x - sx;
    const dy = p.y - sy;
    const scale = 1.68 + (endScale - 1.68) * t;
    const rot = Math.sin(t * Math.PI) * (B.x >= A.x ? 3.5 : -3.5);
    return {
      offset: t,
      opacity: i === steps.length - 1 ? .16 : 1,
      transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${scale}) rotate(${rot}deg)`,
      filter: `drop-shadow(0 0 ${18 - 9 * t}px rgba(251,191,36,${.52 - .22 * t})) drop-shadow(0 8px 10px rgba(0,0,0,.68))`,
    };
  });

  await clone.animate(flightFrames, {
    duration: FLIGHT_MS,
    fill: "both",
    easing: "cubic-bezier(.32,.05,.18,1)",
  }).finished.catch(() => {});

  /* 4) Only now does the returned card become visible in the hand. */
  if (!hiddenTarget && target?.style) target.style.visibility = previousVisibility;
  if (!hiddenTarget && target?.animate) {
    target.animate([
      { transform: "scale(.9)", filter: "brightness(1)" },
      { offset: .42, transform: "scale(1.08)", filter: "brightness(1.25)" },
      { transform: "scale(1)", filter: "brightness(1)" },
    ], { duration: LAND_MS, fill: "none", easing: "ease-out" });
  }
  makePulse(root, target, hiddenTarget);

  await sleep(LAND_MS + 90);
  root.remove();
}

const seenSources = new WeakSet();
const seenTargets = new WeakSet();
const pendingSources = [];
const pendingTargets = [];
let fxChain = Promise.resolve();
let mummyQueueBusyUntil = 0;
const hiddenCounts = [null, null];

function stageDuration() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ? REDUCED_STAGE_MS
    : NORMAL_STAGE_MS;
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
  const sourceRect = rectOf(sourceEntry.node);
  const targetRect = rectOf(targetEntry.node);
  if (!sourceRect || !targetRect) return;

  const previousVisibility = targetEntry.node.style?.visibility || "";
  if (!targetEntry.hidden && targetEntry.node.style) targetEntry.node.style.visibility = "hidden";

  const snapshot = sourceEntry.node.cloneNode(true);
  const slot = reservePresentationSlot();

  fxChain = fxChain
    .catch(() => {})
    .then(async () => {
      const wait = slot.startAt - performance.now();
      if (wait > 8) await sleep(wait);
      await playMummyReturnFx({
        snapshot,
        sourceRect,
        target: targetEntry.node,
        targetRect,
        hiddenTarget: targetEntry.hidden,
        previousVisibility,
        power: targetPower(targetEntry.node),
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

  for (let s = 0; s < pendingSources.length;) {
    const src = pendingSources[s];
    let idx = pendingTargets.findIndex((t) =>
      Math.abs(t.at - src.at) <= PAIR_WINDOW_MS &&
      (src.owner == null || t.owner == null || src.owner === t.owner)
    );
    if (idx < 0) { s += 1; continue; }

    const [target] = pendingTargets.splice(idx, 1);
    pendingSources.splice(s, 1);
    enqueuePair(src, target);
  }
}

function registerSource(node) {
  if (!node || seenSources.has(node) || !node.classList?.contains("duat-vanish") || !isMummyTitle(node)) return;
  const r = rectOf(node);
  if (!r) return;
  seenSources.add(node);
  node.dataset.mummyReturnFx = "1";
  pendingSources.push({ node, owner: ownerOfBoardCard(node), at: performance.now() });
}

function registerTarget(node, hidden = false, explicitOwner = null) {
  if (!node || seenTargets.has(node)) return;
  const r = rectOf(node);
  if (!r) return;
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

function scanVisibleHandTargets() {
  /* Desktop HandThumb: the clickable card button carries the rule text. Board
     MiniCard has no button, so this selector does not confuse hand and board. */
  document.querySelectorAll("button[title]").forEach((button) => {
    if (!isMummyTitle(button)) return;
    const root = button.parentElement;
    if (!root || root.closest?.(".duat-vanish")) return;
    registerTarget(root, false);
  });

  /* Mobile hand cards do not carry a title; their root has max-width:68px and
     the visible mini label contains Múmia. */
  document.querySelectorAll('div[style*="max-width: 68px"]').forEach((node) => {
    const txt = node.textContent || "";
    if (!txt.includes("Múmia")) return;
    registerTarget(node, false);
  });
}

function scanHiddenDesktopTargets() {
  /* vs Bot desktop renders anonymous hand thumbnails. They contain only the eye
     glyph, so a newly inserted one can safely serve as the hidden destination. */
  document.querySelectorAll('div[style*="aspect-ratio: 92 / 128"]').forEach((node) => {
    if ((node.textContent || "").trim() !== "𓂀") return;
    registerTarget(node, true);
  });
}

function scanHiddenMobileCounts() {
  /* Mobile hides the opponent's individual cards completely and only updates
     🂠N. A count increase is therefore the destination event. Initial render is
     merely the baseline and never produces an FX target. */
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
      if (hiddenCounts[owner] == null) {
        hiddenCounts[owner] = count;
      } else if (count > hiddenCounts[owner]) {
        registerTarget(row, true, owner);
        hiddenCounts[owner] = count;
      } else {
        hiddenCounts[owner] = count;
      }
      break;
    }
  }
}

function scanAll() {
  scanSources();
  scanVisibleHandTargets();
  scanHiddenDesktopTargets();
  scanHiddenMobileCounts();
  flushPairs();
}

export function installMummyReturnFx() {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  if (window.__duatMummyReturnFx) return;
  window.__duatMummyReturnFx = true;

  installSharedPresentationTimerGuard();

  const observer = new MutationObserver(() => {
    scanAll();
    /* React can insert the hand thumbnail and update the dying class in adjacent
       microtasks. One follow-up scan closes that tiny race without polling. */
    previousSetTimeout(scanAll, 24);
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
    characterData: true,
  });

  previousSetTimeout(scanAll, 0);
}

if (typeof window !== "undefined" && typeof document !== "undefined") installMummyReturnFx();
