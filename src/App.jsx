import React, { useState, useRef, useEffect } from "react";
import Carta from "./Carta.jsx";

/* ==========================================================================
   DUAT — MVP de playtest (revelação simultânea com prioridade).
   Rodada: PLANEJAR (posiciona, sem disparar) -> REVELAR (prioridade abre tudo,
   via 1->3, depois o outro lado). Mão inicial 4; compra 1/rodada; deck 12 único.
   ========================================================================== */

const GLYPH = {
  buff: "☀", debuff: "☾", sacrificio: "☥", reset: "⚖", silencio: "⊘",
  movimento: "⇄", crescimento: "⇑", fusao: "⛨", renascimento: "⟳", base: "𓂀",
};
const ARCH_COLOR = {
  base: "text-stone-400", buff: "text-amber-300", debuff: "text-indigo-300",
  sacrificio: "text-emerald-300", reset: "text-rose-300", silencio: "text-rose-300",
  movimento: "text-sky-300", crescimento: "text-amber-300", fusao: "text-teal-300", renascimento: "text-amber-300",
};

const CARDS = [
  // Base
  { key: "servo",     nome: "Servo do Templo",       tipo: "Guerreiro", custo: 0, poder: 1,  arch: "base" },
  { key: "arqueiro",  nome: "Arqueiro Núbio",        tipo: "Guerreiro", custo: 1, poder: 2,  arch: "base" },
  { key: "lanceiro",  nome: "Lanceiro do Nilo",      tipo: "Guerreiro", custo: 2, poder: 3,  arch: "base" },
  { key: "carruagem", nome: "Carruagem de Guerra",   tipo: "Guerreiro", custo: 3, poder: 5,  arch: "base" },
  { key: "guardareal",nome: "Guarda Real",           tipo: "Guerreiro", custo: 4, poder: 7,  arch: "base" },
  { key: "general",   nome: "General dos Exércitos", tipo: "Guerreiro", custo: 5, poder: 9,  arch: "base" },
  { key: "colosso",   nome: "Colosso de Mênfis",     tipo: "Guerreiro", custo: 6, poder: 12, arch: "base" },
  // Efeito (existentes)
  { key: "hathor", nome: "Hathor", tipo: "Deusa", custo: 2, poder: 2, arch: "buff",
    trigger: "entrar", needs: "ally", texto: "Ao Entrar: +2 de Poder a um aliado nesta via." },
  { key: "amon", nome: "Amon", tipo: "Deus", custo: 5, poder: 5, arch: "buff",
    trigger: "continuo", arte: "amon",
    lore: "Rei dos deuses e senhor dos ventos, Amon ergue os exércitos do Egito sob a luz eterna do Sol.",
    texto: "Contínuo: +1 a todas as suas outras cartas em jogo (todas as vias)." },
  { key: "set", nome: "Set", tipo: "Deus", custo: 5, poder: 6, arch: "debuff",
    trigger: "entrar", needs: "enemy", texto: "Ao Entrar: −4 de Poder a uma carta inimiga nesta via." },
  { key: "maat", nome: "Maat", tipo: "Deusa", custo: 4, poder: 3, arch: "reset",
    trigger: "continuo", texto: "Contínuo: nesta via, toda carta (dos dois lados) volta ao Poder impresso." },
  { key: "sobek", nome: "Sobek", tipo: "Fera", custo: 2, poder: 2, arch: "sacrificio",
    trigger: "entrar", texto: "Ao Entrar: destrua suas outras cartas nesta via; +1 por carta destruída." },
  { key: "anubis", nome: "Anúbis", tipo: "Deus", custo: 4, poder: 4, arch: "sacrificio",
    trigger: "continuo", texto: "Contínuo: +2 para cada carta sua já destruída na partida." },
  { key: "mumia", nome: "Múmia", tipo: "Criatura", custo: 1, poder: 2, arch: "sacrificio",
    trigger: "morrer", texto: "Ao Morrer: volta à mão com o dobro do Poder atual (Faixa)." },
  { key: "selo", nome: "Selo do Silêncio", tipo: "Magia", custo: 3, poder: 3, arch: "silencio",
    trigger: "continuo", block: true, texto: "Contínuo: cartas inimigas que revelarem nesta via não disparam Ao Entrar." },
  // NOVAS
  { key: "montu", nome: "Montu", tipo: "Deus", custo: 3, poder: 1, arch: "buff",
    trigger: "continuo", anthemType: "Guerreiro", anthemVal: 2,
    texto: "Contínuo: seus Guerreiros ganham +2 de Poder." },
  { key: "armadura", nome: "Armadura de Ptah", tipo: "Relíquia", custo: 2, poder: 3, arch: "fusao",
    trigger: "entrar", fuse: true,
    texto: "Ao Entrar: funde-se com um aliado aleatório nesta via, conferindo seu Poder a ele." },
  { key: "escaravelho", nome: "Escaravelho Alado", tipo: "Criatura", custo: 1, poder: 3, arch: "movimento",
    move: true, texto: "Pode mover-se para outra via uma vez, a partir da rodada seguinte à sua entrada." },
  { key: "ammit", nome: "Ammit, a Devoradora", tipo: "Fera", custo: 3, poder: 1, arch: "crescimento",
    trigger: "continuo", growPerPlay: true,
    texto: "Contínuo: +1 de Poder para cada carta que você colocar em jogo depois dela." },
  { key: "sekhmet", nome: "Sekhmet", tipo: "Deusa", custo: 3, poder: 4, arch: "debuff",
    trigger: "entrar", wipeCost: 1,
    texto: "Ao Entrar: destrói todas as cartas de custo 1 em jogo (dos dois lados)." },
  { key: "apofis", nome: "Apófis", tipo: "Serpente", custo: 4, poder: 3, arch: "sacrificio",
    trigger: "entrar", absorb: true,
    texto: "Ao Entrar: destrói suas outras cartas nesta via e ganha o Poder total delas." },
  { key: "diluvio", nome: "Dilúvio de Hápi", tipo: "Fenômeno", custo: 5, poder: 7, arch: "sacrificio",
    trigger: "entrar", sacrificeAll: true,
    texto: "Ao Entrar: destrói todas as suas outras cartas nesta via." },
  { key: "bennu", nome: "Bennu", tipo: "Ave", custo: 1, poder: 0, arch: "renascimento",
    trigger: "morrer",
    texto: "Ao Morrer: +1 de energia no próximo turno e renasce no tabuleiro com +1 de Poder." },
];
const byKey = Object.fromEntries(CARDS.map((c) => [c.key, c]));

// Deck de teste (12, sem duplicatas) — cobre todas as cartas novas e as chaves.
const DECK_LIST = [
  "montu", "carruagem", "guardareal",   // Montu + Guerreiros p/ ele buffar
  "armadura", "escaravelho", "ammit", "sekhmet",
  "mumia", "sobek", "hathor", "set", "selo",
];
const START_HAND = 4;

// Decks-preset (12 cartas únicas cada) para a tela de seleção
const PRESETS = {
  "Padrão":     ["montu", "carruagem", "guardareal", "armadura", "escaravelho", "ammit", "sekhmet", "mumia", "sobek", "hathor", "set", "selo"],
  "Exército":   ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "montu", "amon", "hathor", "armadura", "escaravelho"],
  "Sacrifício": ["mumia", "sobek", "anubis", "sekhmet", "ammit", "apofis", "diluvio", "bennu", "hathor", "set", "maat", "selo"],
  "Controle":   ["set", "maat", "selo", "sekhmet", "amon", "hathor", "montu", "anubis", "guardareal", "colosso", "general", "armadura"],
};
const COLLECTION = [...CARDS].sort((a, b) => a.custo - b.custo || a.nome.localeCompare(b.nome));

const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const coin = () => (Math.random() < 0.5 ? 0 : 1);
const ctxOf = (s) => ({ board: s.board, deaths: s.deaths, plays: s.plays });

// --------------------------- Motor de poder --------------------------------
const laneHasMaat = (board, lane) => board.some((c) => c.lane === lane && c.key === "maat" && c.revealed && !c.dying);

function power(card, ctx) {
  const { board, deaths, plays } = ctx;
  if (laneHasMaat(board, card.lane)) return card.printed;
  let p = card.printed + (card.baked || 0);
  for (const m of card.mods) p += m.val;
  // Amon: +1 a todas as suas OUTRAS cartas
  p += board.filter((c) => c.owner === card.owner && c.key === "amon" && c.revealed && !c.dying && c.uid !== card.uid).length;
  // Montu: +2 aos seus Guerreiros
  const montus = board.filter((c) => c.owner === card.owner && c.key === "montu" && c.revealed && !c.dying).length;
  if (byKey[card.key].tipo === "Guerreiro") p += 2 * montus;
  // Anúbis: escala com mortes suas
  if (card.key === "anubis") p += 2 * deaths[card.owner];
  // Ammit: +1 por carta jogada por você após ela
  if (card.key === "ammit") p += Math.max(0, plays[card.owner] - (card.entryPlays || 0));
  return p;
}

const laneScore = (ctx, lane, side) =>
  ctx.board.filter((c) => c.lane === lane && c.owner === side && c.revealed && !c.dying)
    .reduce((s, c) => s + power(c, ctx), 0);

const onEnterBlocked = (card, board) =>
  board.some((b) => b.revealed && !b.dying && byKey[b.key].block && b.lane === card.lane && b.owner !== card.owner);

const validTargets = (card, needs, board) => {
  if (needs === "ally") return board.filter((c) => c.owner === card.owner && c.lane === card.lane && c.uid !== card.uid && !c.dying);
  if (needs === "enemy") return board.filter((c) => c.owner !== card.owner && c.lane === card.lane && !c.dying);
  return [];
};

const SIDE_NAME = ["Lado A (ouro)", "Lado B (lápis)"];

// =================================== APP ===================================
export default function App() {
  const uid = useRef(1);

  function freshState(lists = [DECK_LIST, DECK_LIST]) {
    const decks = [shuffled(lists[0]), shuffled(lists[1])];
    const hand = [[], []];
    for (let s = 0; s < 2; s++)
      for (let i = 0; i < START_HAND; i++) {
        const key = decks[s].shift();
        hand[s].push({ hid: uid.current++, key, printed: byKey[key].poder, baked: 0 });
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
  const [screen, setScreen] = useState("deck");                 // "deck" | "game"
  const [build, setBuild] = useState([[...DECK_LIST], [...DECK_LIST]]);
  const [chosen, setChosen] = useState([DECK_LIST, DECK_LIST]);
  const [sel, setSel] = useState(null);     // {side, hid}
  const [aim, setAim] = useState(null);     // alvo durante revelação
  const [moving, setMoving] = useState(null); // {uid, side, lane} — Escaravelho
  const [msg, setMsg] = useState("");
  const [fast, setFast] = useState(false);
  const flashRef = useRef(null);

  // Conduz a revelação: uma carta por vez, na ordem da fila.
  useEffect(() => {
    if (g.phase !== "revealing" || aim) return;
    const t = setTimeout(() => stepReveal(), fast ? 110 : 800);
    return () => clearTimeout(t);
  });

  const clone = (s) => JSON.parse(JSON.stringify(s));
  const push = (s, m) => { s.log = [m, ...s.log].slice(0, 80); };
  const commit = (s) => setG(s);
  function flash(t) { setMsg(t); clearTimeout(flashRef.current); flashRef.current = setTimeout(() => setMsg(""), 2600); }

  const planning = g.phase === "plan" && !g.finished;
  const isMovable = (c) =>
    planning && !aim && !c.dying && c.revealed && byKey[c.key].move && !c.moved && c.enteredRound < g.round;

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
      uid: uid.current++, key: h.key, owner: side, lane,
      printed: h.printed, baked: h.baked, mods: [], revealed: false,
      entryPlays: s.plays[side], enteredRound: s.round, moved: false,
    });
    s.energy[side] -= def.custo;
    s.hand[side].splice(idx, 1);
    push(s, `${SIDE_NAME[side]} posicionou ${def.nome} na Via ${lane + 1} (por revelar).`);
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
    s.hand[c.owner].push({ hid: uid.current++, key: c.key, printed: c.printed, baked: c.baked });
    s.board.splice(idx, 1);
    push(s, `${SIDE_NAME[c.owner]} recolheu ${def.nome} para a mão.`);
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
    push(s, `${SIDE_NAME[side]} moveu ${byKey[c.key].nome} para a Via ${lane + 1}.`);
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
    if (queue.length === 0) { s.phase = "revealed"; push(s, `Nada a revelar nesta rodada.`); }
    else { s.phase = "revealing"; push(s, `Revelação — ${SIDE_NAME[s.priority]} primeiro (${s.priorityReason}).`); }
    commit(s);
  }

  // Processa UMA carta por vez (animação). O agendamento fica no useEffect abaixo.
  function stepReveal() {
    const s = clone(g);
    if (s.phase !== "revealing") return;
    if (s.board.some((c) => c.dying)) s.board = s.board.filter((c) => !c.dying); // limpa fantasmas do passo anterior
    let card = null;
    while (s.queue.length && !card) { const cu = s.queue.shift(); card = s.board.find((c) => c.uid === cu) || null; }
    if (!card) { s.phase = "revealed"; s.lastReveal = null; s.effect = null; push(s, `Revelação concluída.`); commit(s); return; }
    card.revealed = true;
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.lastReveal = { uid: card.uid, seq: s.effectSeq };
    s.effect = null;
    const def = byKey[card.key];
    if (def.trigger === "entrar") {
      if (onEnterBlocked(card, s.board)) {
        s.effect = { uid: card.uid, text: "⊘ bloqueado", kind: "block", seq: s.effectSeq };
        push(s, `⊘ ${def.nome}: Ao Entrar bloqueado na Via ${card.lane + 1}.`); commit(s); return;
      }
      if (def.key === "sobek") { s.effect = resolveSobek(s, card); commit(s); return; }
      if (def.absorb) { s.effect = resolveDestroyOwnLane(s, card, true); commit(s); return; }
      if (def.sacrificeAll) { s.effect = resolveDestroyOwnLane(s, card, false); commit(s); return; }
      if (def.fuse) { s.effect = resolveArmadura(s, card); commit(s); return; }
      if (def.wipeCost) { s.effect = resolveSekhmet(s, card, def.wipeCost); commit(s); return; }
      if (def.needs) {
        const tg = validTargets(card, def.needs, s.board);
        if (tg.length === 0) {
          s.effect = { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
          push(s, `${def.nome}: sem alvo — efeito perdido.`); commit(s); return;
        }
        setAim({ uid: card.uid, side: card.owner, lane: card.lane, needs: def.needs, srcNome: def.nome, srcKey: def.key });
        commit(s); return; // pausa p/ o usuário escolher o alvo (o selo do efeito sai ao aplicar)
      }
    }
    commit(s); // base/contínuo: apenas o "pop" de revelação
  }

  function destroyList(s, victims) {
    const mumias = [];
    for (const v of victims) {
      if (v.key === "mumia") mumias.push({ owner: v.owner, val: power(v, ctxOf(s)) * 2 });
      if (v.key === "bennu") {
        s.pendingEnergy[v.owner] += 1;
        s.pendingReturn.push({ owner: v.owner, lane: v.lane, printed: v.printed, baked: (v.baked || 0) + 1 });
      }
    }
    for (const v of victims) { v.dying = s.effectSeq; s.deaths[v.owner] += 1; } // marca para animar a saída
    for (const r of mumias) s.hand[r.owner].push({ hid: uid.current++, key: "mumia", printed: 2, baked: r.val - 2 });
    return mumias;
  }

  // Destrói as OUTRAS cartas do próprio dono na via (Apófis absorve; Dilúvio só destrói).
  function resolveDestroyOwnLane(s, card, absorb) {
    const def = byKey[card.key];
    const victims = s.board.filter((c) => c.owner === card.owner && c.lane === card.lane && c.uid !== card.uid && !c.dying);
    if (victims.length === 0) { push(s, `${def.nome}: nada para destruir na via.`); return { uid: card.uid, text: "sozinho", kind: "block", seq: s.effectSeq }; }
    let absorbed = 0;
    if (absorb) for (const v of victims) absorbed += power(v, ctxOf(s));
    const returns = destroyList(s, victims);
    if (absorb && absorbed > 0) { const self = s.board.find((c) => c.uid === card.uid); if (self) self.mods.push({ src: "Absorção", val: absorbed }); }
    push(s, `${def.nome} destruiu ${victims.length} carta(s)` + (absorb ? ` e absorveu ${absorbed} de Poder.` : ".") + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
    return { uid: card.uid, text: absorb ? `＋${absorbed}` : `☥ ${victims.length}✕`, kind: "sac", seq: s.effectSeq };
  }

  function resolveSobek(s, sobek) {
    const victims = s.board.filter((c) => c.owner === sobek.owner && c.lane === sobek.lane && c.uid !== sobek.uid);
    if (victims.length === 0) { push(s, `Sobek entrou sozinho — nada a destruir.`); return { uid: sobek.uid, text: "sozinho", kind: "block", seq: s.effectSeq }; }
    const returns = destroyList(s, victims);
    const sk = s.board.find((c) => c.uid === sobek.uid);
    if (sk) sk.mods.push({ src: "Sobek", val: victims.length });
    push(s, `Sobek destruiu ${victims.length} sua(s) → +${victims.length}.` + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
    return { uid: sobek.uid, text: `☥ +${victims.length}`, kind: "sac", seq: s.effectSeq };
  }

  function resolveArmadura(s, arm) {
    const allies = s.board.filter((c) => c.owner === arm.owner && c.lane === arm.lane && c.uid !== arm.uid);
    if (allies.length === 0) { push(s, `Armadura de Ptah: sem aliado na via — permanece em campo (3).`); return { uid: arm.uid, text: "sem fusão", kind: "block", seq: s.effectSeq }; }
    const target = allies[Math.floor(Math.random() * allies.length)];
    const val = power(arm, ctxOf(s));
    target.mods.push({ src: "Armadura", val });
    arm.dying = s.effectSeq; // consumida — anima a saída
    push(s, `Armadura de Ptah fundiu-se com ${byKey[target.key].nome} (+${val}).`);
    return { uid: target.uid, text: `⛨ +${val}`, kind: "fuse", seq: s.effectSeq };
  }

  function resolveSekhmet(s, card, cost) {
    const victims = s.board.filter((c) => byKey[c.key].custo === cost && c.uid !== card.uid);
    if (victims.length === 0) { push(s, `Sekhmet: nenhuma carta de custo ${cost} em jogo.`); return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq }; }
    const returns = destroyList(s, victims);
    push(s, `Sekhmet destruiu ${victims.length} carta(s) de custo ${cost}.` + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
    return { uid: card.uid, text: `☾ ${victims.length}✕`, kind: "debuff", seq: s.effectSeq };
  }

  function applyAim(target) {
    const s = clone(g);
    const tgt = s.board.find((c) => c.uid === target.uid);
    const mod = aim.srcKey === "hathor" ? { src: "Hathor", val: 2 } : { src: "Set", val: -4 };
    tgt.mods.push(mod);
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.effect = { uid: tgt.uid, text: `${mod.val > 0 ? "+" : ""}${mod.val}`, kind: mod.val > 0 ? "buff" : "debuff", seq: s.effectSeq };
    push(s, `${aim.srcNome} deu ${mod.val > 0 ? "+" : ""}${mod.val} a ${byKey[tgt.key].nome} (${SIDE_NAME[tgt.owner]}).`);
    setAim(null); commit(s);
  }
  function skipAim() {
    const s = clone(g);
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.effect = { uid: aim.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
    push(s, `${aim.srcNome} — alvo pulado.`); setAim(null); commit(s);
  }
  const isAimable = (c) => {
    if (!aim || c.dying || c.lane !== aim.lane) return false;
    if (aim.needs === "ally") return c.owner === aim.side && c.uid !== aim.uid;
    if (aim.needs === "enemy") return c.owner !== aim.side;
    return false;
  };

  // ------------------------------ RODADAS ----------------------------------
  function laneWins(s) {
    const ctx = ctxOf(s); const w = [0, 0];
    for (let l = 0; l < 3; l++) { const a = laneScore(ctx, l, 0), b = laneScore(ctx, l, 1); if (a > b) w[0]++; else if (b > a) w[1]++; }
    return w;
  }
  function nextRound() {
    if (g.phase !== "revealed") { flash("Revele as cartas antes de avançar."); return; }
    if (g.round >= 6) { finish(); return; }
    const s = clone(g);
    s.round += 1;
    s.energy = [s.round + s.pendingEnergy[0], s.round + s.pendingEnergy[1]];
    const eBonus = [s.pendingEnergy[0], s.pendingEnergy[1]];
    s.pendingEnergy = [0, 0];
    // Renascimento do Bennu no tabuleiro (revelado, com +1 de Poder acumulado)
    for (const r of s.pendingReturn) {
      if (s.board.filter((c) => c.owner === r.owner && c.lane === r.lane).length < 4) {
        s.board.push({ uid: uid.current++, key: "bennu", owner: r.owner, lane: r.lane, printed: r.printed, baked: r.baked, mods: [], revealed: true, entryPlays: s.plays[r.owner], enteredRound: s.round, moved: false });
        push(s, `⟳ Bennu renasceu na Via ${r.lane + 1} do ${SIDE_NAME[r.owner]} (Poder ${r.printed + r.baked}).`);
      } else push(s, `⟳ Bennu não renasceu na Via ${r.lane + 1} do ${SIDE_NAME[r.owner]} — via cheia.`);
    }
    s.pendingReturn = [];
    for (let side = 0; side < 2; side++)
      if (s.deck[side].length > 0) {
        const key = s.deck[side].shift();
        s.hand[side].push({ hid: uid.current++, key, printed: byKey[key].poder, baked: 0 }); s.seen[side] += 1;
      }
    const w = laneWins(s);
    if (w[0] > w[1]) { s.priority = 0; s.priorityReason = `Lado A lidera ${w[0]} via(s)`; }
    else if (w[1] > w[0]) { s.priority = 1; s.priorityReason = `Lado B lidera ${w[1]} via(s)`; }
    else { s.priority = coin(); s.priorityReason = "empate → sorteio"; }
    s.phase = "plan"; s.queue = [];
    const eMsg = (eBonus[0] || eBonus[1]) ? ` Energia: A ${s.energy[0]}, B ${s.energy[1]} (bônus Bennu).` : ` ${s.round} de energia.`;
    push(s, `— Rodada ${s.round} —${eMsg} Compra 1. Prioridade: ${SIDE_NAME[s.priority]} (${s.priorityReason}).`);
    setSel(null); setAim(null); setMoving(null); commit(s);
  }
  function finish() {
    const s = clone(g); s.finished = true; const w = laneWins(s);
    push(s, `Fim (${w[0]}×${w[1]} vias). ` + (w[0] > w[1] ? "Lado A vence!" : w[1] > w[0] ? "Lado B vence!" : "Empate."));
    commit(s);
  }
  function reset() { uid.current = 1; setSel(null); setAim(null); setMoving(null); setMsg(""); setFast(false); setG(freshState(chosen)); }

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
      const tone = side === 0 ? "amber" : "sky";
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
          <p className="text-xs text-stone-500 mt-3">Dica: comece de um preset e ajuste, ou monte do zero clicando nas cartas. 20 cartas na coleção, 12 por deck.</p>
        </div>
      </div>
    );
  }

  // =============================== RENDER ==================================
  return (
    <div className="min-h-screen w-full bg-stone-900 text-stone-100 p-3 sm:p-5 font-sans">
      <style>{`
        @keyframes duatPop { 0%{transform:scale(.7);opacity:.35} 60%{transform:scale(1.09)} 100%{transform:scale(1);opacity:1} }
        @keyframes duatFloat { 0%{opacity:0;transform:translate(-50%,3px)} 25%{opacity:1} 100%{opacity:0;transform:translate(-50%,-18px)} }
        @keyframes duatVanish { 0%{opacity:1;transform:scale(1)} 30%{opacity:.9;transform:scale(1.04)} 100%{opacity:0;transform:scale(.5) rotate(-8deg)} }
        .duat-pop { animation: duatPop .42s ease-out; }
        .duat-badge { animation: duatFloat .8s ease-out forwards; }
        .duat-vanish { animation: duatVanish .7s ease-in forwards; }
      `}</style>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center gap-3 justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-amber-200">
              𓂀 DUAT <span className="text-stone-500 text-base font-normal tracking-normal">· MVP de playtest</span>
            </h1>
            <p className="text-xs text-stone-400">Revelação por prioridade · mão 4 · compra 1/rodada</p>
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

        <Hand side={0} tone="amber" g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} />

        <div className="grid grid-cols-3 gap-3 mt-3">
          {[0, 1, 2].map((lane) => {
            const sA = laneScore(ctx, lane, 0), sB = laneScore(ctx, lane, 1);
            const winner = sA > sB ? 0 : sB > sA ? 1 : -1;
            const maat = laneHasMaat(g.board, lane);
            return (
              <div key={lane} className="rounded-lg border border-stone-700 overflow-hidden" style={{ backgroundColor: "#1c1a17" }}>
                <SideZone side={0} lane={lane} g={g} ctx={ctx} aim={aim} moving={moving}
                  canDrop={planning && sel && sel.side === 0 && !moving}
                  onDrop={() => placeCard(0, lane)} onMoveHere={() => moveTo(0, lane)}
                  onTarget={(c) => aim && isAimable(c) && applyAim(c)}
                  onStartMove={startMove} isMovable={isMovable} onRemove={planning ? pickUp : null}
                  aimable={isAimable} tone="amber" />
                <div className="flex items-center justify-between px-2 py-1 bg-stone-900 border-y border-stone-700">
                  <div className="flex items-center gap-1"><span className="text-xs text-stone-500">A</span><ScoreTag v={sA} tone="amber" lead={winner === 0} /></div>
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest text-stone-500">Via {lane + 1}</div>
                    {maat && <div className="text-xs text-rose-300">⚖ Maat</div>}
                    {winner >= 0 && !maat && <div className={`text-xs ${winner === 0 ? "text-amber-300" : "text-sky-300"}`}>♛ {winner === 0 ? "A" : "B"} lidera</div>}
                  </div>
                  <div className="flex items-center gap-1"><ScoreTag v={sB} tone="sky" lead={winner === 1} /><span className="text-xs text-stone-500">B</span></div>
                </div>
                <SideZone side={1} lane={lane} g={g} ctx={ctx} aim={aim} moving={moving}
                  canDrop={planning && sel && sel.side === 1 && !moving}
                  onDrop={() => placeCard(1, lane)} onMoveHere={() => moveTo(1, lane)}
                  onTarget={(c) => aim && isAimable(c) && applyAim(c)}
                  onStartMove={startMove} isMovable={isMovable} onRemove={planning ? pickUp : null}
                  aimable={isAimable} tone="sky" />
              </div>
            );
          })}
        </div>

        <div className="mt-3"><Hand side={1} tone="sky" g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} /></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
          <div className="lg:col-span-2 rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17" }}>
            <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-2">Registro da partida</h3>
            <div className="space-y-1 overflow-auto text-sm text-stone-300 pr-1" style={{ maxHeight: 220 }}>
              {g.log.map((l, i) => (<div key={i} className={i === 0 ? "text-stone-100" : "text-stone-400"}>{l}</div>))}
            </div>
          </div>
          <div className="rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17" }}>
            <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-2">Cartas novas — como testar</h3>
            <ul className="text-xs text-stone-400 space-y-1 list-disc pl-4">
              <li><b>Montu ☀</b> dá +2 aos seus Guerreiros (Carruagem/Guarda Real na mesma partida).</li>
              <li>Na revelação, os efeitos saem <b>um a um</b> na ordem de prioridade — use <b>⏩ acelerar</b> se quiser.</li>
              <li><b>Armadura ⛨</b> some ao revelar e passa +3 a um aliado aleatório da via.</li>
              <li><b>Escaravelho ⇄</b> na rodada seguinte, clique nele e depois numa via para movê-lo (uma vez).</li>
              <li><b>Ammit ⇑</b> cresce +1 a cada carta sua jogada depois dela.</li>
              <li><b>Sekhmet ☾</b> ao entrar destrói todo custo 1 (Múmia volta dobrada!).</li>
            </ul>
          </div>
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
function ScoreTag({ v, tone, lead }) {
  const base = tone === "amber" ? "text-amber-300" : "text-sky-300";
  return <div className={`text-center font-bold text-lg ${base} ${lead ? "" : "opacity-60"}`} style={{ minWidth: 30 }}>{v}</div>;
}

function SideZone({ side, lane, g, ctx, aim, moving, canDrop, onDrop, onMoveHere, onTarget, onStartMove, isMovable, onRemove, aimable, tone }) {
  const cards = g.board.filter((c) => c.lane === lane && c.owner === side);
  const canMoveHere = moving && moving.side === side && moving.lane !== lane;
  const active = canDrop || canMoveHere;
  const ring = active ? (tone === "amber" ? "ring-2 ring-amber-500" : "ring-2 ring-sky-500") : "";
  const zoneClick = canMoveHere ? onMoveHere : canDrop ? onDrop : undefined;
  return (
    <div onClick={zoneClick} className={`p-2 ${active ? "cursor-pointer" : ""} ${ring}`}>
      <div className="grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((slot) => {
          const c = cards[slot];
          if (!c) return <div key={slot} className="h-24 rounded border border-dashed border-stone-700 bg-stone-900" />;
          const canTarget = aim && aimable(c);
          const movable = isMovable(c);
          const isMoving = moving && moving.uid === c.uid;
          const reveal = g.lastReveal && g.lastReveal.uid === c.uid ? g.lastReveal.seq : null;
          const badge = g.effect && g.effect.uid === c.uid ? g.effect : null;
          let onClick;
          if (c.dying) onClick = undefined;
          else if (canTarget) onClick = (e) => { e.stopPropagation(); onTarget(c); };
          else if (movable || isMoving) onClick = (e) => { e.stopPropagation(); onStartMove(c); };
          return (
            <BoardCard key={c.uid} c={c} ctx={ctx} canTarget={canTarget} movable={movable} isMoving={isMoving}
              reveal={reveal} badge={badge} dying={!!c.dying} onClick={onClick}
              onRemove={onRemove && !c.revealed && !c.dying ? (e) => { e.stopPropagation(); onRemove(c.uid); } : null} />
          );
        })}
      </div>
    </div>
  );
}

const BADGE_COLOR = { buff: "text-emerald-300", debuff: "text-rose-300", sac: "text-emerald-300", fuse: "text-teal-300", block: "text-stone-300" };
function EffectBadge({ badge }) {
  if (!badge) return null;
  return (
    <div key={badge.seq} className="duat-badge" style={{ position: "absolute", left: "50%", top: -4, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,.75)", zIndex: 5 }}>
      <span className={BADGE_COLOR[badge.kind] || "text-stone-200"}>{badge.text}</span>
    </div>
  );
}

function BoardCard({ c, ctx, canTarget, movable, isMoving, reveal, badge, dying, onClick, onRemove }) {
  const def = byKey[c.key];
  if (!c.revealed) {
    const prov = c.printed + (c.baked || 0);
    return (
      <div className={`h-24 rounded bg-stone-900 border border-dashed border-stone-600 p-1 flex flex-col justify-between relative ${dying ? "duat-vanish" : ""}`}>
        <EffectBadge badge={badge} />
        {onRemove && <button onClick={onRemove} className="absolute top-0 right-0 px-1 text-xs text-stone-400 hover:text-rose-300">✕</button>}
        <div className={`text-sm leading-none opacity-60 ${ARCH_COLOR[def.arch]}`}>{GLYPH[def.arch]}</div>
        <div className="text-xs leading-tight text-stone-500 text-center px-0.5 overflow-hidden">{def.nome}</div>
        <div className="text-center text-xs text-stone-500">por revelar · {prov}</div>
      </div>
    );
  }
  const p = power(c, ctx);
  const ref = c.printed + (c.baked || 0);
  const maat = laneHasMaat(ctx.board, c.lane);
  const color = maat ? "text-amber-300" : p > ref ? "text-emerald-400" : p < ref ? "text-rose-400" : "text-stone-100";
  const border = dying ? "border-rose-700" : canTarget ? "border-indigo-400 ring-2 ring-indigo-400" : isMoving ? "border-sky-400 ring-2 ring-sky-400" : movable ? "border-sky-500" : "border-stone-700";
  return (
    <div onClick={onClick} className={`h-24 rounded bg-stone-800 border p-1 flex flex-col justify-between relative ${dying ? "duat-vanish" : reveal ? "duat-pop" : ""} ${(!dying && (canTarget || movable || isMoving)) ? "cursor-pointer" : ""} ${border}`}>
      <EffectBadge badge={badge} />
      <div className="flex items-start justify-between">
        <span className={`text-sm leading-none ${ARCH_COLOR[def.arch]}`}>{GLYPH[def.arch]}</span>
        <span className="text-xs text-stone-500">{movable ? "⇄" : `${def.custo}⚡`}</span>
      </div>
      <div className="text-xs leading-tight text-stone-300 text-center px-0.5 overflow-hidden">{def.nome}</div>
      <div className={`text-center font-bold text-xl leading-none ${color}`}>{p}</div>
    </div>
  );
}

function Hand({ side, tone, g, sel, setSel, disabled }) {
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
      <button disabled={disabled} onClick={() => setSel(isSel ? null : { side, hid: h.hid })} title={def.texto || "Carta base (sem efeito)"}
        className={`text-left rounded border p-1 bg-stone-800 border-stone-700 ${selRing(isSel)} ${disabled ? "opacity-40" : afford ? "hover:border-stone-500" : "opacity-50"}`} style={{ width: 116 }}>
        <div className={`text-xs ${ARCH_COLOR[def.arch]} overflow-hidden`}>{GLYPH[def.arch]} {def.nome}</div>
        <div className="text-xs text-stone-400 mt-0.5">{def.custo}⚡{faixa}</div>
      </button>
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
