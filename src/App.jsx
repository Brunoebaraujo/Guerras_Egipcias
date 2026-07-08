import React, { useState, useRef, useEffect } from "react";
import Carta from "./Carta.jsx";
import {
  CARDS, byKey, GLYPH, ARCH_COLOR, SIDE_NAME,
  nextUid, resetUid, shuffled, coin, ctxOf, pushLog,
  power, laneScore, laneWins, laneHasMaat, onEnterBlocked, validTargets,
  resolveSobek, resolveDestroyOwnLane, resolveArmadura, resolveDestroyAllOfTypeInLane, resolveSekhmet,
} from "./engine.js";

/* ==========================================================================
   DUAT — playtest (revelação simultânea com prioridade) sobre o tabuleiro
   ilustrado. O motor do jogo vive em engine.js (com testes); aqui fica só
   a orquestração e a interface.
   ========================================================================== */

const DECK_LIST = [
  "montu", "carruagem", "guardareal",
  "armadura", "escaravelho", "ammit", "enxame",
  "mumia", "sobek", "hathor", "set", "selo",
];
const START_HAND = 4;

const PRESETS = {
  "Padrão":     ["montu", "carruagem", "guardareal", "armadura", "escaravelho", "ammit", "enxame", "mumia", "sobek", "hathor", "set", "selo"],
  "Exército":   ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "montu", "amon", "hathor", "assassino-medjay", "escaravelho"],
  "Sacrifício": ["mumia", "sobek", "anubis", "sekhmet", "ammit", "apofis", "diluvio", "bennu", "hathor", "set", "maat", "selo"],
  "Controle":   ["set", "maat", "selo", "sekhmet", "amon", "hathor", "montu", "anubis", "guardareal", "colosso", "general", "armadura"],
};
const COLLECTION = [...CARDS].sort((a, b) => a.custo - b.custo || a.nome.localeCompare(b.nome));

/* Geometria do tabuleiro (tabuleiro.webp, 1535×1024) — tudo em % da imagem.
   Medido por análise de pixels; ajuste fino aqui se algo não cair no lugar. */
const BOARD = {
  ratio: "1535 / 1024",
  laneCx: [30.7, 49.5, 68.0],                       // centro das 3 vias
  zone: { w: 11.8, top: { y: 9.4, h: 25.4 }, bot: { y: 66.4, h: 24.5 } },
  circle: { d: 5.4, topCy: 39.1, botCy: 62.0 },     // discos de placar
};

// =================================== APP ===================================
export default function App() {
  function freshState(lists = [DECK_LIST, DECK_LIST]) {
    const decks = [shuffled(lists[0]), shuffled(lists[1])];
    const hand = [[], []];
    for (let s = 0; s < 2; s++)
      for (let i = 0; i < START_HAND; i++) {
        const key = decks[s].shift();
        hand[s].push({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0 });
      }
    const pr = coin();
    return {
      round: 1, energy: [1, 1], board: [], deaths: [0, 0], plays: [0, 0],
      pendingEnergy: [0, 0], pendingReturn: [],
      deck: decks, hand, seen: [START_HAND, START_HAND],
      priority: pr, priorityReason: "sorteio inicial", phase: "plan", queue: [],
      lastReveal: null, effect: null, effectSeq: 0,
      log: [`Rodada 1 — mão de ${START_HAND}. Prioridade: ${SIDE_NAME[pr]} (sorteio).`],
      finished: false,
    };
  }

  const [g, setG] = useState(() => freshState());
  const [screen, setScreen] = useState("deck");                 // "deck" | "game" | "galeria"
  const [build, setBuild] = useState([[...DECK_LIST], [...DECK_LIST]]);
  const [chosen, setChosen] = useState([DECK_LIST, DECK_LIST]);
  const [sel, setSel] = useState(null);       // {side, hid}
  const [aim, setAim] = useState(null);       // alvo durante revelação
  const [moving, setMoving] = useState(null); // {uid, side, lane} — Escaravelho
  const [zoom, setZoom] = useState(null);     // {def, printed, baked, current, sub}
  const [msg, setMsg] = useState("");
  const [fast, setFast] = useState(false);
  const flashRef = useRef(null);

  useEffect(() => {
    if (g.phase !== "revealing" || aim) return;
    const t = setTimeout(() => stepReveal(), fast ? 110 : 800);
    return () => clearTimeout(t);
  });

  const clone = (s) => JSON.parse(JSON.stringify(s));
  const commit = (s) => setG(s);
  function flash(t) { setMsg(t); clearTimeout(flashRef.current); flashRef.current = setTimeout(() => setMsg(""), 2600); }

  const planning = g.phase === "plan" && !g.finished;
  const isMovable = (c) =>
    planning && !aim && !c.dying && c.revealed && byKey[c.key].move && !c.moved && c.enteredRound < g.round;

  // ------------------------------- ZOOM -------------------------------------
  function zoomBoard(c) {
    const def = byKey[c.key];
    const cur = c.revealed ? power(c, ctxOf(g)) : null;
    setZoom({
      def, printed: c.printed, baked: c.baked || 0, current: cur,
      sub: `Via ${c.lane + 1} · ${SIDE_NAME[c.owner]}` + (c.revealed ? "" : " · por revelar"),
    });
  }
  function zoomHand(h) {
    const def = byKey[h.key];
    setZoom({ def, printed: h.printed, baked: h.baked || 0, current: null, sub: h.baked > 0 ? `Faixa da Múmia — volta valendo ${h.printed + h.baked}` : "na mão" });
  }

  // ----------------------------- PLANEJAR ----------------------------------
  function placeCard(side, lane) {
    if (!planning || aim || moving || !sel || sel.side !== side) return;
    const idx = g.hand[side].findIndex((h) => h.hid === sel.hid);
    if (idx < 0) { setSel(null); return; }
    const h = g.hand[side][idx];
    const def = byKey[h.key];
    if (g.energy[side] < def.custo) { flash(`Sem energia: ${def.nome} custa ${def.custo}.`); return; }
    if (g.board.filter((c) => c.lane === lane && c.owner === side).length >= 4) { flash(`Via ${lane + 1} cheia (4/4).`); return; }
    const s = clone(g);
    s.plays[side] += 1;
    s.board.push({
      uid: nextUid(), key: h.key, owner: side, lane,
      printed: h.printed, baked: h.baked, mods: [], revealed: false,
      entryPlays: s.plays[side], enteredRound: s.round, moved: false,
    });
    s.energy[side] -= def.custo;
    s.hand[side].splice(idx, 1);
    pushLog(s, `${SIDE_NAME[side]} posicionou ${def.nome} na Via ${lane + 1} (por revelar).`);
    setSel(null); commit(s);
  }

  function pickUp(cardUid) {
    if (!planning || aim || moving) return;
    const s = clone(g);
    const idx = s.board.findIndex((c) => c.uid === cardUid);
    const c = s.board[idx];
    if (!c || c.revealed) return;
    const def = byKey[c.key];
    s.energy[c.owner] += def.custo;
    s.plays[c.owner] = Math.max(0, s.plays[c.owner] - 1);
    s.hand[c.owner].push({ hid: nextUid(), key: c.key, printed: c.printed, baked: c.baked });
    s.board.splice(idx, 1);
    pushLog(s, `${SIDE_NAME[c.owner]} recolheu ${def.nome} para a mão.`);
    setSel(null); commit(s);
  }

  // ------------------------------ MOVIMENTO --------------------------------
  function startMove(c) {
    if (!isMovable(c)) return;
    setSel(null);
    setMoving(moving && moving.uid === c.uid ? null : { uid: c.uid, side: c.owner, lane: c.lane });
  }
  function moveTo(side, lane) {
    if (!moving || moving.side !== side) return;
    if (lane === moving.lane) { setMoving(null); return; }
    if (g.board.filter((c) => c.lane === lane && c.owner === side).length >= 4) { flash(`Via ${lane + 1} cheia (4/4).`); return; }
    const s = clone(g);
    const c = s.board.find((x) => x.uid === moving.uid);
    c.lane = lane; c.moved = true;
    pushLog(s, `${SIDE_NAME[side]} moveu ${byKey[c.key].nome} para a Via ${lane + 1}.`);
    setMoving(null); commit(s);
  }

  // ------------------------------ REVELAR ----------------------------------
  function startReveal() {
    if (!planning) return;
    setMoving(null); setSel(null);
    const s = clone(g);
    const order = [s.priority, 1 - s.priority];
    const queue = [];
    for (const side of order)
      for (let lane = 0; lane < 3; lane++)
        for (const c of s.board.filter((x) => x.owner === side && x.lane === lane && !x.revealed)) queue.push(c.uid);
    s.queue = queue; s.lastReveal = null; s.effect = null;
    if (queue.length === 0) { s.phase = "revealed"; pushLog(s, `Nada a revelar nesta rodada.`); }
    else { s.phase = "revealing"; pushLog(s, `Revelação — ${SIDE_NAME[s.priority]} primeiro (${s.priorityReason}).`); }
    commit(s);
  }

  function stepReveal() {
    const s = clone(g);
    if (s.phase !== "revealing") return;
    if (s.board.some((c) => c.dying)) s.board = s.board.filter((c) => !c.dying);
    let card = null;
    while (s.queue.length && !card) { const cu = s.queue.shift(); card = s.board.find((c) => c.uid === cu) || null; }
    if (!card) { s.phase = "revealed"; s.lastReveal = null; s.effect = null; pushLog(s, `Revelação concluída.`); commit(s); return; }
    card.revealed = true;
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.lastReveal = { uid: card.uid, seq: s.effectSeq };
    s.effect = null;
    const def = byKey[card.key];
    if (def.trigger === "entrar") {
      if (onEnterBlocked(card, s.board)) {
        s.effect = { uid: card.uid, text: "⊘ bloqueado", kind: "block", seq: s.effectSeq };
        pushLog(s, `⊘ ${def.nome}: Ao Entrar bloqueado na Via ${card.lane + 1}.`); commit(s); return;
      }
      if (def.key === "sobek") { s.effect = resolveSobek(s, card); commit(s); return; }
      if (def.absorb) { s.effect = resolveDestroyOwnLane(s, card, true); commit(s); return; }
      if (def.sacrificeAll) { s.effect = resolveDestroyOwnLane(s, card, false); commit(s); return; }
      if (def.fuse) { s.effect = resolveArmadura(s, card); commit(s); return; }
      if (def.wipeCost) { s.effect = resolveSekhmet(s, card, def.wipeCost); commit(s); return; }
      if (def.destroyAllOfTypeInLane) { s.effect = resolveDestroyAllOfTypeInLane(s, card, def.destroyAllOfTypeInLane); commit(s); return; }
      if (def.needs) {
        const tg = validTargets(card, def.needs, s.board);
        if (tg.length === 0) {
          s.effect = { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
          pushLog(s, `${def.nome}: sem alvo — efeito perdido.`); commit(s); return;
        }
        setAim({ uid: card.uid, side: card.owner, lane: card.lane, needs: def.needs, srcNome: def.nome, srcKey: def.key });
        commit(s); return;
      }
    }
    commit(s);
  }

  function applyAim(target) {
    const s = clone(g);
    const tgt = s.board.find((c) => c.uid === target.uid);
    const mod = aim.srcKey === "hathor" ? { src: "Hathor", val: 2 } : { src: "Set", val: -4 };
    tgt.mods.push(mod);
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.effect = { uid: tgt.uid, text: `${mod.val > 0 ? "+" : ""}${mod.val}`, kind: mod.val > 0 ? "buff" : "debuff", seq: s.effectSeq };
    pushLog(s, `${aim.srcNome} deu ${mod.val > 0 ? "+" : ""}${mod.val} a ${byKey[tgt.key].nome} (${SIDE_NAME[tgt.owner]}).`);
    setAim(null); commit(s);
  }
  function skipAim() {
    const s = clone(g);
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.effect = { uid: aim.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
    pushLog(s, `${aim.srcNome} — alvo pulado.`); setAim(null); commit(s);
  }
  const isAimable = (c) => {
    if (!aim || c.dying || c.lane !== aim.lane) return false;
    if (aim.needs === "ally") return c.owner === aim.side && c.uid !== aim.uid;
    if (aim.needs === "enemy") return c.owner !== aim.side;
    return false;
  };

  // ------------------------------ RODADAS ----------------------------------
  function nextRound() {
    if (g.phase !== "revealed") { flash("Revele as cartas antes de avançar."); return; }
    if (g.round >= 6) { finish(); return; }
    const s = clone(g);
    s.round += 1;
    s.energy = [s.round + s.pendingEnergy[0], s.round + s.pendingEnergy[1]];
    const eBonus = [s.pendingEnergy[0], s.pendingEnergy[1]];
    s.pendingEnergy = [0, 0];
    for (const r of s.pendingReturn) {
      if (s.board.filter((c) => c.owner === r.owner && c.lane === r.lane).length < 4) {
        s.board.push({ uid: nextUid(), key: "bennu", owner: r.owner, lane: r.lane, printed: r.printed, baked: r.baked, mods: [], revealed: true, entryPlays: s.plays[r.owner], enteredRound: s.round, moved: false });
        pushLog(s, `⟳ Bennu renasceu na Via ${r.lane + 1} do ${SIDE_NAME[r.owner]} (Poder ${r.printed + r.baked}).`);
      } else pushLog(s, `⟳ Bennu não renasceu na Via ${r.lane + 1} do ${SIDE_NAME[r.owner]} — via cheia.`);
    }
    s.pendingReturn = [];
    for (let side = 0; side < 2; side++)
      if (s.deck[side].length > 0) {
        const key = s.deck[side].shift();
        s.hand[side].push({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0 }); s.seen[side] += 1;
      }
    const w = laneWins(s);
    if (w[0] > w[1]) { s.priority = 0; s.priorityReason = `Lado A lidera ${w[0]} via(s)`; }
    else if (w[1] > w[0]) { s.priority = 1; s.priorityReason = `Lado B lidera ${w[1]} via(s)`; }
    else { s.priority = coin(); s.priorityReason = "empate → sorteio"; }
    s.phase = "plan"; s.queue = [];
    const eMsg = (eBonus[0] || eBonus[1]) ? ` Energia: A ${s.energy[0]}, B ${s.energy[1]} (bônus Bennu).` : ` ${s.round} de energia.`;
    pushLog(s, `— Rodada ${s.round} —${eMsg} Compra 1. Prioridade: ${SIDE_NAME[s.priority]} (${s.priorityReason}).`);
    setSel(null); setAim(null); setMoving(null); commit(s);
  }
  function finish() {
    const s = clone(g); s.finished = true; const w = laneWins(s);
    pushLog(s, `Fim (${w[0]}×${w[1]} vias). ` + (w[0] > w[1] ? "Lado A vence!" : w[1] > w[0] ? "Lado B vence!" : "Empate."));
    commit(s);
  }
  function reset() { resetUid(); setSel(null); setAim(null); setMoving(null); setZoom(null); setMsg(""); setFast(false); setG(freshState(chosen)); }

  // ---------------------------- SELEÇÃO DE DECK ----------------------------
  const setDeck = (side, arr) => setBuild((b) => { const n = [b[0].slice(), b[1].slice()]; n[side] = arr; return n; });
  function toggleCard(side, k) {
    const cur = build[side];
    if (cur.includes(k)) setDeck(side, cur.filter((x) => x !== k));
    else if (cur.length < 12) setDeck(side, [...cur, k]);
    else flash("Deck cheio — 12 cartas (remova uma antes de trocar).");
  }
  const randomDeck = (side) => setDeck(side, shuffled(CARDS.map((c) => c.key)).slice(0, 12));
  function startMatch() {
    if (build[0].length !== 12 || build[1].length !== 12) { flash("Cada deck precisa ter exatamente 12 cartas."); return; }
    setChosen([build[0].slice(), build[1].slice()]);
    setG(freshState(build)); setSel(null); setAim(null); setMoving(null); setFast(false);
    setScreen("game");
  }

  const ctx = ctxOf(g);
  const wins = laneWins(g);

  // ============================ TELA: GALERIA ==============================
  if (screen === "galeria") {
    return (
      <div className="min-h-screen w-full bg-stone-900 text-stone-100 p-3 sm:p-5 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-wrap items-center gap-3 justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-widest text-amber-200">𓂀 DUAT <span className="text-stone-500 text-base font-normal tracking-normal">· Galeria de cartas</span></h1>
              <p className="text-xs text-stone-400">Amon com arte final; as demais com placeholder (vamos completando).</p>
            </div>
            <button onClick={() => setScreen("deck")} className="px-3 py-2 rounded-md bg-stone-700 hover:bg-stone-600 text-sm">Voltar</button>
          </header>
          <div className="flex flex-wrap gap-4 justify-center">
            {CARDS.map((def) => (
              <Carta key={def.key} nome={def.nome} custo={def.custo} poder={def.poder}
                tipo={def.tipo} efeito={def.texto} lore={def.lore} arch={def.arch} arte={def.arte} width={240} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================ TELA: DECKS ================================
  if (screen === "deck") {
    const ready = build[0].length === 12 && build[1].length === 12;
    const DeckPanel = (side) => {
      const cur = build[side];
      const full = cur.length === 12;
      return (
        <div key={side} className={`rounded-lg border ${side === 0 ? "border-amber-600" : "border-sky-600"} p-3`} style={{ backgroundColor: "#1c1a17" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold tracking-wide ${side === 0 ? "text-amber-200" : "text-sky-200"}`}>{SIDE_NAME[side]}</h3>
            <span className={`text-sm font-bold ${full ? "text-emerald-400" : cur.length > 12 ? "text-rose-400" : "text-stone-300"}`}>{cur.length}/12</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.keys(PRESETS).map((name) => (
              <button key={name} onClick={() => setDeck(side, PRESETS[name].slice())}
                className="px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs">{name}</button>
            ))}
            <button onClick={() => randomDeck(side)} className="px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs">Aleatório</button>
            <button onClick={() => setDeck(side, [])} className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-xs text-stone-400">Limpar</button>
            {side === 1 && <button onClick={() => setDeck(1, build[0].slice())} className="px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs">Copiar A→B</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {COLLECTION.map((def) => {
              const on = cur.includes(def.key);
              const ring = on ? (side === 0 ? "border-amber-400 ring-2 ring-amber-400" : "border-sky-400 ring-2 ring-sky-400") : "border-stone-700 hover:border-stone-500";
              return (
                <button key={def.key} onClick={() => toggleCard(side, def.key)} title={def.texto || "Carta base (sem efeito)"}
                  className={`text-left rounded border p-1 bg-stone-800 ${ring} ${on ? "" : "opacity-80"}`}>
                  <div className={`text-xs ${ARCH_COLOR[def.arch]} overflow-hidden`}>{on ? "✓ " : ""}{GLYPH[def.arch]} {def.nome}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{def.custo}⚡ · P{def.poder} · {def.tipo}</div>
                </button>
              );
            })}
          </div>
        </div>
      );
    };
    return (
      <div className="min-h-screen w-full bg-stone-900 text-stone-100 p-3 sm:p-5 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-wrap items-center gap-3 justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-widest text-amber-200">𓂀 DUAT <span className="text-stone-500 text-base font-normal tracking-normal">· Montagem de decks</span></h1>
              <p className="text-xs text-stone-400">Cada lado escolhe 12 cartas (sem repetição). Ao iniciar, os decks são embaralhados.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen("galeria")}
                className="px-3 py-2 rounded-md bg-stone-700 hover:bg-stone-600 text-sm">Galeria</button>
              <button onClick={startMatch} disabled={!ready}
                className={`px-4 py-2 rounded-md font-semibold text-sm ${ready ? "bg-emerald-600 hover:bg-emerald-500 text-stone-900" : "bg-stone-700 text-stone-500 cursor-not-allowed"}`}>
                Embaralhar e iniciar
              </button>
            </div>
          </header>
          {msg && <div className="mb-3 px-3 py-2 rounded bg-rose-950 border border-rose-800 text-rose-200 text-sm">{msg}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[0, 1].map((s) => DeckPanel(s))}</div>
          <p className="text-xs text-stone-500 mt-3">Dica: comece de um preset e ajuste, ou monte do zero clicando nas cartas. {CARDS.length} cartas na coleção, 12 por deck.</p>
        </div>
      </div>
    );
  }

  // =============================== RENDER ==================================
  return (
    <div className="min-h-screen w-full bg-stone-900 text-stone-100 p-3 sm:p-5 font-sans">
      <style>{`
        @keyframes duatPop { 0%{transform:scale(.7);opacity:.35} 60%{transform:scale(1.09)} 100%{transform:scale(1);opacity:1} }
        @keyframes duatFloat { 0%{opacity:0;transform:translate(-50%,3px)} 25%{opacity:1} 100%{opacity:0;transform:translate(-50%,-22px)} }
        @keyframes duatVanish { 0%{opacity:1;transform:scale(1)} 30%{opacity:.9;transform:scale(1.04)} 100%{opacity:0;transform:scale(.5) rotate(-8deg)} }
        @keyframes duatZoomIn { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
        .duat-pop { animation: duatPop .42s ease-out; }
        .duat-badge { animation: duatFloat .9s ease-out forwards; }
        .duat-vanish { animation: duatVanish .7s ease-in forwards; }
        .duat-zoom { animation: duatZoomIn .18s ease-out; }
        @media (prefers-reduced-motion: reduce) { .duat-pop,.duat-badge,.duat-vanish,.duat-zoom { animation: none; } }
      `}</style>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center gap-3 justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-amber-200">
              𓂀 DUAT <span className="text-stone-500 text-base font-normal tracking-normal">· playtest</span>
            </h1>
            <p className="text-xs text-stone-400">Revelação por prioridade · mão 4 · compra 1/rodada · clique numa carta para ampliá-la</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Chip label="Rodada" value={`${g.round}/6`} />
            <Chip label="Energia A" value={g.energy[0]} tone="amber" />
            <Chip label="Energia B" value={g.energy[1]} tone="sky" />
            {planning && <button onClick={startReveal} className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-stone-900 font-semibold text-sm">Revelar</button>}
            {g.phase === "revealing" && <button onClick={() => setFast((f) => !f)} className={`px-3 py-2 rounded-md text-sm font-semibold ${fast ? "bg-sky-500 text-stone-900" : "bg-stone-700 hover:bg-stone-600"}`}>{fast ? "⏩ rápido" : "⏩ acelerar"}</button>}
            {g.phase === "revealed" && !g.finished && <button onClick={nextRound} className="px-3 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-stone-900 font-semibold text-sm">{g.round >= 6 ? "Finalizar partida" : "Próxima rodada"}</button>}
            <button onClick={reset} className="px-3 py-2 rounded-md bg-stone-700 hover:bg-stone-600 text-sm">Reiniciar</button>
            <button onClick={() => setScreen("deck")} className="px-3 py-2 rounded-md bg-stone-800 hover:bg-stone-700 text-sm text-stone-300">Decks</button>
          </div>
        </header>

        <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
          <span className={`px-2 py-1 rounded font-semibold ${planning ? "bg-stone-800 text-stone-200" : g.phase === "revealing" ? "bg-indigo-900 text-indigo-100" : "bg-emerald-900 text-emerald-100"}`}>
            {planning ? "Planejar" : g.phase === "revealing" ? "Revelando…" : "Revelado"}
          </span>
          <span className="text-stone-400">Prioridade:</span>
          <span className={`font-bold ${g.priority === 0 ? "text-amber-300" : "text-sky-300"}`}>{SIDE_NAME[g.priority]}</span>
          <span className="text-stone-500">({g.priorityReason})</span>
          <span className="ml-auto text-stone-400">Vias:</span>
          <span className="text-amber-300 font-bold">A {wins[0]}</span><span className="text-stone-600">×</span><span className="text-sky-300 font-bold">{wins[1]} B</span>
          {g.finished && <span className="px-3 py-1 rounded bg-stone-800 border border-amber-600 text-amber-200 font-semibold">{wins[0] > wins[1] ? "Lado A venceu" : wins[1] > wins[0] ? "Lado B venceu" : "Empate"}</span>}
        </div>

        {msg && <div className="mb-3 px-3 py-2 rounded bg-rose-950 border border-rose-800 text-rose-200 text-sm">{msg}</div>}
        {moving && <div className="mb-3 px-3 py-2 rounded bg-sky-950 border border-sky-700 text-sky-100 text-sm">⇄ Movendo o Escaravelho — clique numa via do {SIDE_NAME[moving.side]} para onde levá-lo (ou clique nele de novo para cancelar).</div>}
        {aim && (
          <div className="mb-3 px-3 py-2 rounded bg-indigo-950 border border-indigo-700 text-indigo-100 text-sm flex items-center gap-3">
            <span>🎯 <b>{aim.srcNome}</b> ({SIDE_NAME[aim.side]}): escolha {aim.needs === "ally" ? "um aliado" : "uma carta inimiga"} na Via {aim.lane + 1}.</span>
            <button onClick={skipAim} className="ml-auto px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs">Pular alvo</button>
          </div>
        )}

        <Hand side={0} tone="amber" g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} onZoom={zoomHand} />

        <div className="mt-3 overflow-x-auto rounded-xl">
          <Tabuleiro g={g} ctx={ctx} aim={aim} moving={moving} sel={sel} planning={planning}
            placeCard={placeCard} moveTo={moveTo} applyAim={applyAim} isAimable={isAimable}
            startMove={startMove} isMovable={isMovable} pickUp={pickUp} zoomBoard={zoomBoard} />
        </div>

        <div className="mt-3"><Hand side={1} tone="sky" g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} onZoom={zoomHand} /></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
          <div className="lg:col-span-2 rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17" }}>
            <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-2">Registro da partida</h3>
            <div className="space-y-1 overflow-auto text-sm text-stone-300 pr-1" style={{ maxHeight: 220 }}>
              {g.log.map((l, i) => (<div key={i} className={i === 0 ? "text-stone-100" : "text-stone-400"}>{l}</div>))}
            </div>
          </div>
          <div className="rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17" }}>
            <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-2">Como jogar no tabuleiro</h3>
            <ul className="text-xs text-stone-400 space-y-1 list-disc pl-4">
              <li>Selecione uma carta na mão e clique na <b>área da via</b> (retângulo de pedra) para posicioná-la.</li>
              <li>O <b>disco claro</b> de cada via mostra a soma de poder daquele lado — o líder ganha um anel na cor do lado.</li>
              <li>Clique em qualquer carta (mão ou mesa) para <b>ampliá-la</b> com efeito e lore.</li>
              <li>Escaravelho ⇄: na rodada seguinte, clique nele e depois em outra via para movê-lo.</li>
              <li>⚖ na faixa do rio indica que a Maat prende a via ao poder impresso.</li>
            </ul>
          </div>
        </div>
      </div>

      {zoom && <ZoomModal zoom={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ============================ TABULEIRO ILUSTRADO ========================= */
function Tabuleiro({ g, ctx, aim, moving, sel, planning, placeCard, moveTo, applyAim, isAimable, startMove, isMovable, pickUp, zoomBoard }) {
  const base = import.meta.env.BASE_URL;
  const ref = useRef(null);
  const [bw, setBw] = useState(900);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver((e) => setBw(e[0].contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const px = (pct) => (bw * pct) / 100;

  const zoneStyle = (lane, side) => {
    const z = BOARD.zone; const v = side === 0 ? z.top : z.bot;
    return { position: "absolute", left: `${BOARD.laneCx[lane] - z.w / 2}%`, top: `${v.y}%`, width: `${z.w}%`, height: `${v.h}%` };
  };

  return (
    <div ref={ref} className="relative w-full select-none" style={{
      aspectRatio: BOARD.ratio, minWidth: 720,
      backgroundImage: `url(${base}tabuleiro.webp)`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
      borderRadius: 12, boxShadow: "0 0 0 1px #44403c, 0 8px 30px rgba(0,0,0,.5)",
    }}>
      {[0, 1, 2].map((lane) => {
        const sA = laneScore(ctx, lane, 0), sB = laneScore(ctx, lane, 1);
        const winner = sA > sB ? 0 : sB > sA ? 1 : -1;
        const maat = laneHasMaat(g.board, lane);
        return (
          <React.Fragment key={lane}>
            {[0, 1].map((side) => (
              <LaneZone key={side} side={side} lane={lane} g={g} ctx={ctx} bw={bw} px={px}
                style={zoneStyle(lane, side)} aim={aim} moving={moving}
                canDrop={planning && sel && sel.side === side && !moving}
                onDrop={() => placeCard(side, lane)} onMoveHere={() => moveTo(side, lane)}
                onTarget={(c) => aim && isAimable(c) && applyAim(c)}
                onStartMove={startMove} isMovable={isMovable}
                onRemove={planning ? pickUp : null} aimable={isAimable} onZoom={zoomBoard}
                tone={side === 0 ? "amber" : "sky"} />
            ))}
            {/* Discos de placar (soma de poder da via, por lado) */}
            <ScoreDisc cx={BOARD.laneCx[lane]} cy={BOARD.circle.topCy} d={BOARD.circle.d} px={px} v={sA} tone="amber" lead={winner === 0} />
            <ScoreDisc cx={BOARD.laneCx[lane]} cy={BOARD.circle.botCy} d={BOARD.circle.d} px={px} v={sB} tone="sky" lead={winner === 1} />
            {/* Faixa do rio: identificação da via + estado */}
            <div style={{ position: "absolute", left: `${BOARD.laneCx[lane]}%`, top: "50.5%", transform: "translate(-50%,-50%)", zIndex: 4, pointerEvents: "none", textAlign: "center" }}>
              <div style={{
                background: "rgba(15,12,8,.62)", border: "1px solid rgba(247,233,192,.35)", borderRadius: 999,
                padding: `${px(0.25)}px ${px(0.9)}px`, color: "#f7e9c0", fontFamily: "Georgia, serif",
                fontSize: Math.max(10, px(1.05)), letterSpacing: 1, whiteSpace: "nowrap",
              }}>
                VIA {lane + 1}{maat ? " · ⚖" : winner >= 0 ? ` · ♛ ${winner === 0 ? "A" : "B"}` : ""}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ScoreDisc({ cx, cy, d, px, v, tone, lead }) {
  const ring = tone === "amber" ? "rgba(251,191,36,.95)" : "rgba(56,189,248,.95)";
  return (
    <div style={{
      position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%,-50%)",
      width: `${d}%`, aspectRatio: "1", borderRadius: "50%", zIndex: 4,
      display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
      boxShadow: lead ? `0 0 0 ${Math.max(2, px(0.22))}px ${ring}, 0 0 ${px(1.2)}px ${ring}` : "none",
      transition: "box-shadow .3s ease",
    }}>
      <span style={{
        fontFamily: "Georgia, serif", fontWeight: 800, color: "#3a2b12", lineHeight: 1,
        fontSize: Math.max(13, px(v >= 100 ? 1.5 : 2.0)),
        textShadow: "0 1px 0 rgba(255,255,255,.45)",
      }}>{v}</span>
    </div>
  );
}

function LaneZone({ side, lane, g, ctx, bw, px, style, aim, moving, canDrop, onDrop, onMoveHere, onTarget, onStartMove, isMovable, onRemove, aimable, onZoom, tone }) {
  const cards = g.board.filter((c) => c.lane === lane && c.owner === side);
  const canMoveHere = moving && moving.side === side && moving.lane !== lane;
  const active = canDrop || canMoveHere;
  const ringColor = tone === "amber" ? "rgba(251,191,36,.8)" : "rgba(56,189,248,.8)";
  const zoneClick = canMoveHere ? onMoveHere : canDrop ? onDrop : undefined;
  return (
    <div onClick={zoneClick} style={{ ...style, cursor: active ? "pointer" : "default", zIndex: 3 }}>
      <div style={{
        position: "absolute", inset: `-${px(0.35)}px`, borderRadius: px(0.8), pointerEvents: "none",
        boxShadow: active ? `inset 0 0 0 ${Math.max(2, px(0.2))}px ${ringColor}, 0 0 ${px(1)}px ${ringColor}` : "none",
        transition: "box-shadow .2s ease",
      }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: px(0.5), width: "100%", height: "100%", padding: px(0.35) }}>
        {[0, 1, 2, 3].map((slot) => {
          const c = cards[slot];
          if (!c) return <div key={slot} style={{ borderRadius: px(0.5), border: active ? `1px dashed ${ringColor}` : "1px dashed rgba(247,233,192,.14)" }} />;
          const canTarget = aim && aimable(c);
          const movable = isMovable(c);
          const isMoving = moving && moving.uid === c.uid;
          const reveal = g.lastReveal && g.lastReveal.uid === c.uid ? g.lastReveal.seq : null;
          const badge = g.effect && g.effect.uid === c.uid ? g.effect : null;
          let onClick;
          if (c.dying) onClick = undefined;
          else if (canTarget) onClick = (e) => { e.stopPropagation(); onTarget(c); };
          else if (movable || isMoving) onClick = (e) => { e.stopPropagation(); onStartMove(c); };
          else onClick = (e) => { e.stopPropagation(); onZoom(c); };
          return (
            <MiniCard key={c.uid} c={c} ctx={ctx} bw={bw} canTarget={canTarget} movable={movable} isMoving={isMoving}
              reveal={reveal} badge={badge} dying={!!c.dying} onClick={onClick}
              onRemove={onRemove && !c.revealed && !c.dying ? (e) => { e.stopPropagation(); onRemove(c.uid); } : null} />
          );
        })}
      </div>
    </div>
  );
}

const BADGE_COLOR = { buff: "text-emerald-300", debuff: "text-rose-300", sac: "text-emerald-300", fuse: "text-teal-300", block: "text-stone-300" };
function EffectBadge({ badge, size }) {
  if (!badge) return null;
  return (
    <div key={badge.seq} className="duat-badge" style={{ position: "absolute", left: "50%", top: -4, fontSize: size, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,.85)", zIndex: 6 }}>
      <span className={BADGE_COLOR[badge.kind] || "text-stone-200"}>{badge.text}</span>
    </div>
  );
}

/* Carta em miniatura sobre o tabuleiro: arte de fundo quando existir. */
function MiniCard({ c, ctx, bw, canTarget, movable, isMoving, reveal, badge, dying, onClick, onRemove }) {
  const base = import.meta.env.BASE_URL;
  const def = byKey[c.key];
  const f = (n) => Math.max(8, (bw * n) / 100);       // fontes proporcionais ao tabuleiro
  const artSrc = def.arte ? `${base}cartas/${def.arte}.webp` : null;

  const common = {
    position: "relative", width: "100%", height: "100%", borderRadius: (bw * 0.5) / 100,
    overflow: "visible", cursor: "pointer",
  };
  const frame = {
    position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
  };

  if (!c.revealed) {
    const prov = c.printed + (c.baked || 0);
    return (
      <div onClick={onClick} className={dying ? "duat-vanish" : ""} style={common} title={`${def.nome} — por revelar`}>
        <EffectBadge badge={badge} size={f(1.05)} />
        <div style={{ ...frame, background: "rgba(20,15,8,.82)", border: "1px dashed rgba(247,233,192,.45)", padding: f(0.3) }}>
          {onRemove && <button onClick={onRemove} style={{ position: "absolute", top: 0, right: f(0.3), color: "#a8a29e", fontSize: f(1.1), zIndex: 7 }}>✕</button>}
          <div className={ARCH_COLOR[def.arch]} style={{ fontSize: f(1.2), lineHeight: 1, opacity: 0.7 }}>{GLYPH[def.arch]}</div>
          <div style={{ color: "#a8a29e", fontSize: f(0.85), lineHeight: 1.1, textAlign: "center", overflow: "hidden" }}>{def.nome}</div>
          <div style={{ color: "#78716c", fontSize: f(0.8), textAlign: "center" }}>oculta · {prov}</div>
        </div>
      </div>
    );
  }

  const p = power(c, ctx);
  const refP = c.printed + (c.baked || 0);
  const maat = laneHasMaat(ctx.board, c.lane);
  const pColor = maat ? "#fcd34d" : p > refP ? "#4ade80" : p < refP ? "#f87171" : "#f5f5f4";
  const border =
    dying ? "1.5px solid #be123c"
    : canTarget ? "2px solid #818cf8"
    : isMoving ? "2px solid #38bdf8"
    : movable ? "1.5px solid #0ea5e9"
    : "1px solid rgba(247,233,192,.5)";

  return (
    <div onClick={onClick} className={dying ? "duat-vanish" : reveal ? "duat-pop" : ""} style={common} title={def.texto || def.nome}>
      <EffectBadge badge={badge} size={f(1.05)} />
      <div style={{ ...frame, border, background: artSrc ? "#000" : "rgba(28,24,17,.9)", boxShadow: canTarget ? "0 0 10px rgba(129,140,248,.8)" : "0 2px 6px rgba(0,0,0,.55)" }}>
        {artSrc && <img src={artSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />}
        {artSrc && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,.65) 100%)" }} />}
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: `${f(0.25)}px ${f(0.35)}px 0` }}>
          <span className={ARCH_COLOR[def.arch]} style={{ fontSize: f(1.0), lineHeight: 1 }}>{GLYPH[def.arch]}</span>
          <span style={{ color: "#d6d3d1", fontSize: f(0.8), lineHeight: 1 }}>{movable ? "⇄" : `${def.custo}⚡`}</span>
        </div>
        <div style={{ position: "relative", color: "#e7e5e4", fontSize: f(0.82), lineHeight: 1.08, textAlign: "center", padding: `0 ${f(0.25)}px`, overflow: "hidden", textShadow: "0 1px 2px rgba(0,0,0,.9)" }}>{def.nome}</div>
        <div style={{ position: "relative", textAlign: "center", paddingBottom: f(0.2) }}>
          <span style={{ fontWeight: 800, fontSize: f(1.7), lineHeight: 1, color: pColor, textShadow: "0 1px 3px rgba(0,0,0,.95)" }}>{p}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================ ZOOM DE CARTA =============================== */
function ZoomModal({ zoom, onClose }) {
  const { def, printed, baked, current, sub } = zoom;
  const shown = current != null ? current : printed + (baked || 0);
  const w = Math.min(320, typeof window !== "undefined" ? window.innerWidth * 0.78 : 320);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" }}>
      <div className="duat-zoom" onClick={(e) => e.stopPropagation()} style={{ cursor: "default" }}>
        <Carta nome={def.nome} custo={def.custo} poder={shown} tipo={def.tipo}
          efeito={def.texto} lore={def.lore} arch={def.arch} arte={def.arte} width={w} />
        <div className="text-center mt-2 text-sm text-stone-300" style={{ maxWidth: w }}>
          <div>{sub}</div>
          <div className="text-xs text-stone-400 mt-0.5">
            Impresso {def.poder}{baked > 0 ? ` · Faixa +${baked}` : ""}{current != null && current !== printed + baked ? ` · Atual ${current}` : ""}
          </div>
          <button onClick={onClose} className="mt-2 px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-xs">Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ Subcomponentes ============================== */
function Chip({ label, value, tone = "stone" }) {
  const t = tone === "amber" ? "text-amber-300" : tone === "sky" ? "text-sky-300" : "text-stone-200";
  return <div className="px-2 py-1 rounded-md bg-stone-800 border border-stone-700 text-xs"><span className="text-stone-500">{label} </span><span className={`font-bold ${t}`}>{value}</span></div>;
}

function Hand({ side, tone, g, sel, setSel, disabled, onZoom }) {
  const accent = tone === "amber" ? "border-amber-600 text-amber-200" : "border-sky-600 text-sky-200";
  const selRing = (isSel) => (isSel ? (tone === "amber" ? "ring-2 ring-amber-400" : "ring-2 ring-sky-400") : "");
  const hand = g.hand[side];
  const returned = hand.filter((h) => h.baked > 0);
  const normal = hand.filter((h) => h.baked === 0);
  const isPrio = g.priority === side;
  const CardBtn = ({ h }) => {
    const def = byKey[h.key];
    const isSel = sel && sel.side === side && sel.hid === h.hid;
    const afford = g.energy[side] >= def.custo;
    const faixa = h.baked > 0 ? ` · Faixa ${h.printed + h.baked}` : ` · P${h.printed}`;
    return (
      <div className={`relative rounded border bg-stone-800 border-stone-700 ${selRing(isSel)} ${disabled ? "opacity-40" : afford ? "hover:border-stone-500" : "opacity-50"}`} style={{ width: 122 }}>
        <button disabled={disabled} onClick={() => setSel(isSel ? null : { side, hid: h.hid })} title={def.texto || "Carta base (sem efeito)"}
          className="text-left w-full p-1 pr-5">
          <div className={`text-xs ${ARCH_COLOR[def.arch]} overflow-hidden`}>{GLYPH[def.arch]} {def.nome}</div>
          <div className="text-xs text-stone-400 mt-0.5">{def.custo}⚡{faixa}</div>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onZoom(h); }} title="Ampliar carta"
          className="absolute top-0.5 right-0.5 text-stone-500 hover:text-amber-300 text-xs leading-none p-0.5">🔍</button>
      </div>
    );
  };
  return (
    <div className={`rounded-lg border ${accent} p-3`} style={{ backgroundColor: "#1c1a17" }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-wide">{SIDE_NAME[side]} {isPrio && <span className="text-xs text-stone-400">· revela primeiro</span>}</h3>
        <span className="text-xs text-stone-400">energia {g.energy[side]} · deck {g.deck[side].length} · vistas {g.seen[side]} · mortes {g.deaths[side]}</span>
      </div>
      {returned.length > 0 && (
        <div className="mb-2">
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">Voltaram à mão</div>
          <div className="flex flex-wrap gap-1">{returned.map((h) => <CardBtn key={h.hid} h={h} />)}</div>
        </div>
      )}
      <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">Mão ({normal.length})</div>
      <div className="flex flex-wrap gap-1">
        {normal.length === 0 && <span className="text-xs text-stone-600">Mão vazia.</span>}
        {normal.map((h) => <CardBtn key={h.hid} h={h} />)}
      </div>
    </div>
  );
}
