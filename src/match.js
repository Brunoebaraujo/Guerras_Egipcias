/* ==========================================================================
   Guerras Egípcias — match.js — O MAESTRO PURO da partida.

   Este módulo é a ORQUESTRAÇÃO das regras: loop de rodadas, revelação com
   prioridade, ramp de energia, pausa de mira e vitória. Ele NÃO reimplementa
   regra nenhuma — delega tudo ao engine.js (a fonte única de verdade das
   regras) e apenas as chama na ordem certa.

   Diferente do App.jsx (que amarrava essa orquestração ao React via setG/
   setAim/timers), aqui é um REDUTOR puro:

       freshMatch(lists, opts)          -> estado inicial
       applyAction(state, action, opts) -> { state, error? }

   Sem React, sem servidor, sem DOM. O mesmo módulo roda no cliente (single-
   player e previsão) e no servidor (árbitro autoritativo). O `rng` é injetável
   para o servidor semear partidas reproduzíveis; por padrão usa Math.random,
   reproduzindo exatamente o comportamento do single-player.

   Mudança de formato em relação ao App.jsx: a mira (antes no estado React
   `aim`) agora vive DENTRO do estado, em `state.awaitingAim`. É isso que torna
   a revelação dirigível pelo servidor — o cliente só desenha o realce a partir
   do estado, e responde com as ações "aim" / "skipAim".

   AÇÕES (o servidor valida cada uma; ações ilegais devolvem { error }):
     { t:"place",      side, hid, lane }   posiciona carta da mão (por revelar)
     { t:"pickup",     side, uid }          recolhe carta ainda não revelada
     { t:"move",       side, uid, lane }    move carta (Escaravelho) de via
     { t:"startReveal" }                    trava o planejamento e monta a fila
     { t:"step" }                           revela a PRÓXIMA carta da fila
     { t:"aim",        targetUid }          escolhe alvo da mira pendente
     { t:"skipAim" }                        abre mão do alvo
     { t:"nextRound" }                      avança de rodada (ou finaliza na 6)
     { t:"finish" }                         encerra e apura o vencedor
   ========================================================================== */

import {
  byKey, SIDE_NAME, nextUid, pushLog, custoDe, OUTORGAS, consumirCarta, registrarPraga,
  laneWins, matchResult, snapshotTabuleiro, buildRevealQueue,
  resolveBennuRebirth, applyPendingBuff, onEnterBlocked,
  resolveAnubis, resolveSet, descarregarPendentes, resolveHeka,
  resolveSobek, resolveDestroyOwnLane, resolveArmadura, resolveSekhmet,
  resolveDestroyAllOfTypeInLane, validTargets, aplicarBencao,
} from "./engine.js";

export const OPENING_DEAL = 3;   // cartas na mão de abertura
export const START_HAND = OPENING_DEAL; // compat
export const DECK_SIZE = 12;
export const MAX_ROUND = 6;

/* --- utilidades locais, cientes de rng (para o servidor semear) ------------
   Espelham shuffled()/coin() do engine, mas aceitam um rng injetável. Com o
   padrão Math.random, o resultado é estatisticamente idêntico ao single-player. */
const shuffledR = (arr, rng = Math.random) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const coinR = (rng = Math.random) => (rng() < 0.5 ? 0 : 1);

/* --- outorga: sub-decks que vêm de brinde com uma carta escolhida -----------
   Moisés declara `outorga: "pragas"`. Escolhê-lo custa 1 das 12 vagas e enfia as
   10 Pragas no deck, que passa de 12 para 22 cartas. A diluição É o custo do
   arquétipo: você ganha 26 de energia em efeitos, mas perde o controle da compra.
   Genérico de propósito — qualquer arquétipo futuro que entregue um sub-deck só
   precisa declarar sua outorga em OUTORGAS. */
export function expandirDeck(list) {
  const extras = [];
  for (const key of list) {
    const nome = byKey[key]?.outorga;
    if (nome && OUTORGAS[nome]) extras.push(...OUTORGAS[nome]);
  }
  return extras.length ? [...list, ...extras] : [...list];
}

/* Cartas com `abertura: true` sobem para o topo DEPOIS do embaralhamento, o que
   garante que caiam na mão inicial. Moisés é a primeira: um Moisés que não vem
   na abertura é um deck de 22 cartas sem plano. */
function puxarParaAbertura(deck) {
  const fixas = deck.filter((k) => byKey[k]?.abertura);
  if (fixas.length === 0) return deck;
  return [...fixas, ...deck.filter((k) => !byKey[k]?.abertura)];
}

const clone = (s) => JSON.parse(JSON.stringify(s));
const err = (state, msg) => ({ state, error: msg });
const ok = (state) => ({ state });

/* Compra: shift do topo do deck para a mão. Devolve o hid comprado (ou null). */
function drawOne(s, side) {
  if (!s.deck[side] || s.deck[side].length === 0) return null;
  const key = s.deck[side].shift();
  const hid = nextUid();
  s.hand[side].push({ hid, key, printed: byKey[key].poder, baked: 0 });
  s.seen[side] += 1;
  return hid;
}
/* Compra de início de rodada (ambos os lados), marcando os hids comprados em
   `justDrew` para o cliente animar o fade dourado. Toda rodada tem compra —
   inclusive a rodada 1, cuja compra é a 4ª carta. */
function drawForRound(s) {
  s.justDrew = [[], []];
  for (const side of [0, 1]) {
    const hid = drawOne(s, side);
    if (hid != null) s.justDrew[side].push(hid);
  }
}

/* ============================ ESTADO INICIAL ============================== */
export function freshMatch(lists, { rng = Math.random, openingDeal = OPENING_DEAL } = {}) {
  const listas = [expandirDeck(lists[0]), expandirDeck(lists[1])];
  const decks = listas.map((l) => puxarParaAbertura(shuffledR(l, rng)));
  const pr = coinR(rng);
  const linha = `Rodada 1 — mão de abertura ${openingDeal}, compra a ${openingDeal + 1}ª. Prioridade: ${SIDE_NAME[pr]} (sorteio).`;
  const s = {
    round: 1, energy: [1, 1], board: [], deaths: [0, 0], plays: [0, 0],
    pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
    deck: decks, hand: [[], []], seen: [0, 0], justDrew: [[], []], destroyedPower: [0, 0],
    priority: pr, priorityReason: "sorteio inicial", phase: "plan", queue: [],
    lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null,
    log: [linha], trace: [linha], finished: false,
  };
  for (const side of [0, 1]) {
    const extras = listas[side].length - lists[side].length;
    if (extras > 0) pushLog(s, `${SIDE_NAME[side]} recebeu ${extras} carta(s) outorgada(s) — deck de ${listas[side].length}.`);
  }
  for (const side of [0, 1]) for (let i = 0; i < openingDeal; i++) drawOne(s, side);
  drawForRound(s); // rodada 1: compra a 4ª (animada)
  return s;
}

/* ============================== AÇÕES ==================================== */
export function applyAction(state, action, { rng = Math.random } = {}) {
  if (!action || typeof action.t !== "string") return err(state, "Ação inválida.");
  const handler = ACTIONS[action.t];
  if (!handler) return err(state, `Ação desconhecida: ${action.t}`);
  return handler(state, action, rng);
}

const planning = (s) => s.phase === "plan" && !s.finished;

const ACTIONS = {
  // ------------------------------ PLANEJAR -------------------------------
  place(g, { side, hid, lane }, _rng) {
    if (!planning(g)) return err(g, "Não é fase de planejamento.");
    if (g.awaitingAim) return err(g, "Há uma mira pendente.");
    const idx = g.hand[side]?.findIndex((h) => h.hid === hid) ?? -1;
    if (idx < 0) return err(g, "Carta não está na mão.");
    const h = g.hand[side][idx];
    const def = byKey[h.key];
    const custo = custoDe(h);   // impresso + agravos (Piolhos, Granizo)
    if (g.energy[side] < custo) return err(g, `Sem energia: ${def.nome} custa ${custo}.`);
    if (g.board.filter((c) => c.lane === lane && c.owner === side).length >= 4)
      return err(g, `Via ${lane + 1} cheia (4/4).`);
    const s = clone(g);
    s.plays[side] += 1;
    s.board.push({
      uid: nextUid(), key: h.key, owner: side, lane,
      printed: h.printed, baked: h.baked, mods: [], revealed: false, pendentes: h.pendentes || 0,
      custoMod: h.custoMod || 0,
      entryPlays: s.plays[side], enteredRound: s.round, moved: false,
    });
    s.energy[side] -= custo;
    s.hand[side].splice(idx, 1);
    pushLog(s, `${SIDE_NAME[side]} posicionou ${def.nome} na Via ${lane + 1} (por revelar).`);
    return ok(s);
  },

  pickup(g, { side, uid }, _rng) {
    if (!planning(g)) return err(g, "Não é fase de planejamento.");
    if (g.awaitingAim) return err(g, "Há uma mira pendente.");
    const s = clone(g);
    const idx = s.board.findIndex((c) => c.uid === uid);
    const c = s.board[idx];
    if (!c) return err(g, "Carta não está no tabuleiro.");
    if (c.owner !== side) return err(g, "Carta não é sua.");
    if (c.revealed) return err(g, "Carta já revelada não pode ser recolhida.");
    const def = byKey[c.key];
    s.energy[c.owner] += custoDe(c);   // devolve o que foi realmente pago
    s.plays[c.owner] = Math.max(0, s.plays[c.owner] - 1);
    s.hand[c.owner].push({ hid: nextUid(), key: c.key, printed: c.printed, baked: c.baked, custoMod: c.custoMod || 0 });
    s.board.splice(idx, 1);
    pushLog(s, `${SIDE_NAME[c.owner]} recolheu ${def.nome} para a mão.`);
    return ok(s);
  },

  move(g, { side, uid, lane }, _rng) {
    if (!planning(g)) return err(g, "Não é fase de planejamento.");
    const c0 = g.board.find((x) => x.uid === uid);
    if (!c0) return err(g, "Carta não está no tabuleiro.");
    if (c0.owner !== side) return err(g, "Carta não é sua.");
    const def0 = byKey[c0.key];
    if (!def0.move) return err(g, "Esta carta não se move.");
    if (c0.dying || !c0.revealed || c0.moved || c0.enteredRound >= g.round)
      return err(g, "Carta não pode se mover agora.");
    if (lane === c0.lane) return ok(g); // sem efeito
    if (g.board.filter((c) => c.lane === lane && c.owner === side).length >= 4)
      return err(g, `Via ${lane + 1} cheia (4/4).`);
    const s = clone(g);
    const c = s.board.find((x) => x.uid === uid);
    c.lane = lane; c.moved = true;
    pushLog(s, `${SIDE_NAME[side]} moveu ${byKey[c.key].nome} para a Via ${lane + 1}.`);
    return ok(s);
  },

  // ------------------------------ REVELAR --------------------------------
  startReveal(g, _a, _rng) {
    if (!planning(g)) return err(g, "Não é fase de planejamento.");
    const s = clone(g);
    const queue = buildRevealQueue(s);
    s.queue = queue; s.lastReveal = null; s.effect = null;
    // NÃO zeramos s.pendingBuff: a reserva da Heka persiste entre rodadas.
    if (queue.length === 0) { s.phase = "revealed"; pushLog(s, `Nada a revelar nesta rodada.`); }
    else { s.phase = "revealing"; pushLog(s, `Revelação — ${SIDE_NAME[s.priority]} primeiro (${s.priorityReason}).`); }
    return ok(s);
  },

  step(g, _a, rng) {
    if (g.phase !== "revealing") return err(g, "Não há revelação em curso.");
    if (g.awaitingAim) return err(g, "Há uma mira pendente — resolva antes de avançar.");
    const s = clone(g);
    s.blessings = [];
    if (s.board.some((c) => c.dying)) s.board = s.board.filter((c) => !c.dying);
    resolveBennuRebirth(s, rng); // Bennu volta na MESMA rodada, em via sorteada

    let card = null;
    while (s.queue.length && !card) {
      const cu = s.queue.shift();
      card = s.board.find((c) => c.uid === cu) || null;
    }
    if (!card) {
      s.phase = "revealed"; s.lastReveal = null; s.effect = null;
      pushLog(s, `Revelação concluída.`);
      return ok(s);
    }

    card.revealed = true;
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.lastReveal = { uid: card.uid, seq: s.effectSeq };
    s.effect = null;

    const def0 = byKey[card.key];
    // Consome buff pendente (Heka) ANTES do bloqueio: receber um buff não é o
    // "Ao Entrar" da carta, então o Selo do Silêncio não o impede.
    // Pragas NÃO consomem a reserva: elas não têm Poder e deixam o campo, então
    // o +3 seria perda pura, sem interação. Assim a reserva espera o Moisés — e
    // aí sim as Pragas seguintes dobram o bônus da Heka, que é o combo do set.
    const ganho = def0.praga ? 0 : applyPendingBuff(s, card);
    if (ganho) {
      s.effect = { uid: card.uid, text: `+${ganho}`, kind: "buff", seq: s.effectSeq };
      pushLog(s, `☀ ${byKey[card.key].nome} entrou com +${ganho} de Heka.`);
    }

    const def = byKey[card.key];

    /* ---------------------------- PRAGAS ----------------------------------
       Ordem do documento de design: (1) o efeito resolve; (2) a Praga deixa o
       campo sem ocupar espaço; (3) só então Moisés ativa. O efeito de uma Praga
       é um "Ao Entrar" para todos os fins, então o Selo do Silêncio o bloqueia —
       e Praga bloqueada é Praga que não aconteceu: gasta-se sem gerar Sinal. */
    if (def.praga) {
      if (onEnterBlocked(card, s.board)) {
        consumirCarta(s, card);
        s.effect = { uid: card.uid, text: "⊘ bloqueado", kind: "block", seq: s.effectSeq };
        pushLog(s, `⊘ ${def.nome}: bloqueado na Via ${card.lane + 1} — gasta sem efeito e sem Sinal.`);
        return ok(s);
      }
      // (Fases 3 e 4) — o efeito de cada Praga entra aqui, antes do consumo.
      consumirCarta(s, card);
      pushLog(s, `${def.nome} resolveu e deixou o campo.`);
      const sinais = registrarPraga(s, card.key);
      s.effect = sinais.length
        ? { uid: sinais[0].uid, text: `✧ ${sinais[0].depois}`, kind: "buff", seq: s.effectSeq }
        : { uid: card.uid, text: "✧ —", kind: "block", seq: s.effectSeq };
      return ok(s);
    }

    if (def.trigger === "entrar") {
      if (onEnterBlocked(card, s.board)) {
        card.pendentes = 0; // Selo: gatilhos acumulados são perdidos, não adiados.
        s.effect = { uid: card.uid, text: "⊘ bloqueado", kind: "block", seq: s.effectSeq };
        pushLog(s, `⊘ ${def.nome}: Ao Entrar bloqueado na Via ${card.lane + 1}.`);
        return ok(s);
      }
      if (def.judgeLane) {
        const { nivel, julgadas } = resolveAnubis(s, card);
        s.effect = { uid: card.uid, text: nivel === null ? "⚖ —" : `⚖ =${nivel}`, kind: julgadas.length ? "debuff" : "block", seq: s.effectSeq };
        return ok(s);
      }
      if (def.scatterEnemies) {
        const { movidas } = resolveSet(s, card, rng);
        s.effect = { uid: card.uid, text: movidas.length ? `⇄ ${movidas.length}` : "⇄ —", kind: movidas.length ? "debuff" : "block", seq: s.effectSeq };
        return ok(s);
      }
      if (def.spreadOnBlessing) {
        const { ondas } = descarregarPendentes(s, card, rng);
        s.effect = ondas ? { uid: card.uid, text: `✦ ${ondas}×`, kind: "buff", seq: s.effectSeq } : null;
        return ok(s);
      }
      if (def.buffNext) { s.effect = resolveHeka(s, card); return ok(s); }
      if (def.key === "sobek") { s.effect = resolveSobek(s, card); return ok(s); }
      if (def.absorb) { s.effect = resolveDestroyOwnLane(s, card, true); return ok(s); }
      if (def.sacrificeAll) { s.effect = resolveDestroyOwnLane(s, card, false); return ok(s); }
      if (def.fuse) { s.effect = resolveArmadura(s, card); return ok(s); }
      if (def.wipeCost) { s.effect = resolveSekhmet(s, card, def.wipeCost); return ok(s); }
      if (def.destroyAllOfTypeInLane) { s.effect = resolveDestroyAllOfTypeInLane(s, card, def.destroyAllOfTypeInLane); return ok(s); }
      if (def.needs) {
        const tg = validTargets(card, def.needs, s.board);
        if (tg.length === 0) {
          s.effect = { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
          pushLog(s, `${def.nome}: sem alvo — efeito perdido.`);
          return ok(s);
        }
        // Pausa de mira: agora VIVE NO ESTADO, não no React.
        s.awaitingAim = { uid: card.uid, side: card.owner, lane: card.lane, needs: def.needs, srcNome: def.nome, srcKey: def.key };
        return ok(s);
      }
    }
    return ok(s);
  },

  aim(g, { targetUid }, _rng) {
    if (!g.awaitingAim) return err(g, "Não há mira pendente.");
    const a = g.awaitingAim;
    const tgt = g.board.find((c) => c.uid === targetUid);
    if (!tgt) return err(g, "Alvo não existe.");
    if (!isAimable(g, tgt)) return err(g, "Alvo inválido para esta mira.");
    const s = clone(g);
    const t = s.board.find((c) => c.uid === targetUid);
    const def = byKey[a.srcKey];
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.blessings = [];
    aplicarBencao(s, t, def.buffTarget, def.nome);
    s.effect = { uid: t.uid, text: `${def.buffTarget > 0 ? "+" : ""}${def.buffTarget}`, kind: def.buffTarget > 0 ? "buff" : "debuff", seq: s.effectSeq };
    pushLog(s, `${a.srcNome} deu ${def.buffTarget > 0 ? "+" : ""}${def.buffTarget} a ${byKey[t.key].nome} (${SIDE_NAME[t.owner]}).`);
    s.awaitingAim = null;
    return ok(s);
  },

  skipAim(g, _a, _rng) {
    if (!g.awaitingAim) return err(g, "Não há mira pendente.");
    const s = clone(g);
    const a = s.awaitingAim;
    s.effectSeq = (s.effectSeq || 0) + 1;
    s.effect = { uid: a.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
    pushLog(s, `${a.srcNome} — alvo pulado.`);
    s.awaitingAim = null;
    return ok(s);
  },

  // ------------------------------ RODADAS --------------------------------
  nextRound(g, _a, rng) {
    if (g.phase !== "revealed") return err(g, "Revele as cartas antes de avançar.");
    if (g.round >= MAX_ROUND) return ACTIONS.finish(g, _a, rng);
    const s = clone(g);
    s.trace = [...(s.trace || []), snapshotTabuleiro(s, `--- fim da rodada ${s.round} ---`)];
    s.round += 1;
    s.energy = [s.round + s.pendingEnergy[0], s.round + s.pendingEnergy[1]];
    const eBonus = [s.pendingEnergy[0], s.pendingEnergy[1]];
    s.pendingEnergy = [0, 0];
    drawForRound(s); // compra 1 por lado, marcada para a animação de fade
    const w = laneWins(s);
    if (w[0] > w[1]) { s.priority = 0; s.priorityReason = `Lado A lidera ${w[0]} via(s)`; }
    else if (w[1] > w[0]) { s.priority = 1; s.priorityReason = `Lado B lidera ${w[1]} via(s)`; }
    else { s.priority = coinR(rng); s.priorityReason = "empate → sorteio"; }
    s.phase = "plan"; s.queue = []; s.awaitingAim = null;
    const eMsg = (eBonus[0] || eBonus[1]) ? ` Energia: A ${s.energy[0]}, B ${s.energy[1]} (bônus Bennu).` : ` ${s.round} de energia.`;
    pushLog(s, `— Rodada ${s.round} —${eMsg} Compra 1. Prioridade: ${SIDE_NAME[s.priority]} (${s.priorityReason}).`);
    return ok(s);
  },

  finish(g, _a, _rng) {
    const s = clone(g);
    s.finished = true;
    const w = laneWins(s);
    const r = matchResult(s);
    const fimTxt = r.side === -1 ? "Empate." : `Lado ${r.side === 0 ? "A" : "B"} vence!` + (r.tiebreak ? ` (desempate por saldo de pontos: +${r.margin})` : "");
    pushLog(s, `Fim (${w[0]}×${w[1]} vias). ` + fimTxt);
    return ok(s);
  },
};

/* Realce de alvo — puro, lido a partir do estado (o cliente usa para pintar,
   o servidor usa para validar a ação "aim"). */
export function isAimable(s, c) {
  const a = s.awaitingAim;
  if (!a || !c || c.dying || c.lane !== a.lane) return false;
  if (a.needs === "ally") return c.owner === a.side && c.uid !== a.uid;
  if (a.needs === "enemy") return c.owner !== a.side;
  return false;
}

/* Conveniência para o SERVIDOR (e para testes): revela automaticamente até a
   fila esvaziar OU até uma mira pendente parar o fluxo. O cliente NÃO usa isto
   — ele dá um "step" por vez para animar. Devolve { state, awaiting } onde
   `awaiting` indica que o fluxo parou esperando um alvo. */
export function autoReveal(state, { rng = Math.random, maxSteps = 500 } = {}) {
  let s = state;
  for (let i = 0; i < maxSteps; i++) {
    if (s.phase !== "revealing") return { state: s, awaiting: false };
    if (s.awaitingAim) return { state: s, awaiting: true };
    const r = applyAction(s, { t: "step" }, { rng });
    if (r.error) return { state: s, awaiting: !!s.awaitingAim, error: r.error };
    s = r.state;
  }
  return { state: s, awaiting: !!s.awaitingAim, error: "autoReveal: passos demais" };
}
