import { describe, it, expect, beforeEach } from "vitest";
import {
  CARDS, TOKENS, byKey, custoDe, consumirCarta, destroyList,
  power, ctxOf, laneScore, resolveSekhmet, snapshotTabuleiro,
  resolveBennuRebirth, resetUid, nextUid, temTipo } from "./engine.js";
import { applyAction } from "./match.js";

/* Fábricas — mesma filosofia de engine.test.js */
const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], round: 1, energy: [6, 6],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0],
});
const mkMatch = (over = {}) => ({
  round: 1, energy: [6, 6], board: [], deaths: [0, 0], plays: [0, 0],
  pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
  deck: [[], []], hand: [[], []], seen: [0, 0],
  priority: 0, priorityReason: "teste", phase: "plan", queue: [],
  lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null,
  log: [], trace: [], finished: false, ...over,
});

beforeEach(resetUid);

/* ==========================================================================
   Consumo sem morte — o contrato central da Fase 1.
   Uma Praga sai do campo depois de resolver, mas NÃO foi destruída. Se algum
   dia consumirCarta() passar a chamar destroyList(), estes testes caem.
   ========================================================================== */
describe("consumirCarta() — saída de campo sem morte", () => {
  it("tira a carta de campo (marca dying, como qualquer saída)", () => {
    const s = mkState([mk("servo")]);
    consumirCarta(s, s.board[0]);
    expect(s.board[0].dying).toBeTruthy();
    expect(s.board[0].spent).toBe(true);
  });

  it("NÃO incrementa deaths[] — a diferença entre gasta e destruída", () => {
    const s = mkState([mk("servo"), mk("servo", { owner: 1 })]);
    consumirCarta(s, s.board[0]);
    consumirCarta(s, s.board[1]);
    expect(s.deaths).toEqual([0, 0]);
  });

  it("NÃO alimenta destroyedPower[] — Am-heh não engorda com Praga gasta", () => {
    const amheh = mk("amheh", { owner: 0 });
    const vitima = mk("colosso", { owner: 1, lane: 1 });   // 14 de Poder
    const s = mkState([amheh, vitima]);
    expect(power(amheh, ctxOf(s))).toBe(0);
    consumirCarta(s, vitima);
    expect(s.destroyedPower).toEqual([0, 0]);
    expect(power(amheh, ctxOf(s))).toBe(0);                // continua em 0
  });

  it("NÃO alimenta Osíris — carta gasta não é morte na partida", () => {
    const osiris = mk("osiris");
    const praga = mk("servo", { lane: 1 });
    const s = mkState([osiris, praga]);
    expect(power(osiris, ctxOf(s))).toBe(4);
    consumirCarta(s, praga);
    expect(power(osiris, ctxOf(s))).toBe(4);               // sem os +2 por morte
  });

  it("compara com destroyList(): a MESMA carta destruída alimenta os dois", () => {
    const osiris = mk("osiris"), amheh = mk("amheh", { lane: 2 });
    const vitima = mk("arqueiro", { lane: 1 });            // 3 de Poder
    const s = mkState([osiris, amheh, vitima]);
    destroyList(s, [vitima]);
    expect(s.deaths[0]).toBe(1);
    expect(s.destroyedPower[0]).toBe(3);
    expect(power(osiris, ctxOf(s))).toBe(6);               // 4 + 2×1 morte
  });

  it("NÃO dispara Ao Morrer da Múmia — nada volta para a mão", () => {
    const s = mkState([mk("mumia")]);
    consumirCarta(s, s.board[0]);
    expect(s.hand[0]).toHaveLength(0);
  });

  it("NÃO dispara Ao Morrer do Bennu — nada renasce nem gera energia", () => {
    const s = mkState([mk("bennu")]);
    consumirCarta(s, s.board[0]);
    expect(s.pendingReturn).toHaveLength(0);
    expect(s.pendingEnergy).toEqual([0, 0]);
    expect(resolveBennuRebirth(s, () => 0)).toHaveLength(0);
  });

  it("carta consumida não pontua mais na via", () => {
    const c = mk("colosso");
    const s = mkState([c]);
    expect(laneScore(ctxOf(s), 0, 0)).toBe(14);
    consumirCarta(s, c);
    expect(laneScore(ctxOf(s), 0, 0)).toBe(0);
  });

  it("o log de partida escreve (consumida), não (morrendo)", () => {
    const s = mkState([mk("servo")]);
    consumirCarta(s, s.board[0]);
    const txt = snapshotTabuleiro(s, "t");
    expect(txt).toContain("(consumida)");
    expect(txt).not.toContain("(morrendo)");
  });

  it("some do tabuleiro no step seguinte, liberando o slot da via", () => {
    const g = mkMatch({ phase: "revealing", queue: [], board: [] });
    g.board.push(mk("servo"));
    consumirCarta(g, g.board[0]);
    const { state } = applyAction(g, { t: "step" });
    expect(state.board).toHaveLength(0);
    expect(state.deaths).toEqual([0, 0]);
  });
});

/* ==========================================================================
   Custo por instância — Praga dos Piolhos e Chuva de Granizo agravam o custo
   de uma carta específica, não da definição.
   ========================================================================== */
describe("custoDe()", () => {
  it("sem agravo, vale o custo impresso", () => {
    expect(custoDe({ key: "colosso" })).toBe(6);
    expect(custoDe({ key: "servo" })).toBe(0);
  });

  it("soma o custoMod da instância", () => {
    expect(custoDe({ key: "arqueiro", custoMod: 1 })).toBe(2);
    expect(custoDe({ key: "arqueiro", custoMod: 3 })).toBe(4);
  });

  it("nunca desce abaixo de zero", () => {
    expect(custoDe({ key: "servo", custoMod: -5 })).toBe(0);
  });

  it("Sekhmet decide pelo custo EFETIVO: agravar salva a carta", () => {
    const sekhmet = mk("sekhmet", { lane: 1 });
    const nu = mk("arqueiro", { owner: 1 });                        // custo 1 → morre
    const protegido = mk("arqueiro", { owner: 1, custoMod: 1 });    // custo 2 → escapa
    const s = mkState([sekhmet, nu, protegido]);
    resolveSekhmet(s, sekhmet, 1);
    expect(nu.dying).toBeTruthy();
    expect(protegido.dying).toBeFalsy();
  });

  it("Sekhmet alcança carta barata que foi agravada até o custo dela", () => {
    const sekhmet = mk("sekhmet", { lane: 1 });
    const servo = mk("servo", { owner: 1, custoMod: 1 });           // 0 + 1 = 1
    const s = mkState([sekhmet, servo]);
    resolveSekhmet(s, sekhmet, 1);
    expect(servo.dying).toBeTruthy();
  });
});

describe("custoMod no ciclo mão → tabuleiro → mão", () => {
  const naMao = (key, custoMod = 0) => ({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0, custoMod });

  it("cobra a energia pelo custo agravado", () => {
    const h = naMao("arqueiro", 2);                                 // 1 + 2 = 3
    const g = mkMatch({ energy: [3, 6], hand: [[h], []] });
    const { state, error } = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 0 });
    expect(error).toBeUndefined();
    expect(state.energy[0]).toBe(0);
  });

  it("recusa a jogada quando a energia só cobre o custo impresso", () => {
    const h = naMao("arqueiro", 2);
    const g = mkMatch({ energy: [2, 6], hand: [[h], []] });
    const { error } = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 0 });
    expect(error).toMatch(/custa 3/);
  });

  it("o agravo viaja com a carta para o tabuleiro", () => {
    const h = naMao("arqueiro", 1);
    const g = mkMatch({ hand: [[h], []] });
    const { state } = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 0 });
    expect(state.board[0].custoMod).toBe(1);
    expect(custoDe(state.board[0])).toBe(2);
  });

  it("recolher devolve o que foi pago e o agravo volta para a mão", () => {
    const h = naMao("carruagem", 1);                                // 3 + 1 = 4
    let g = mkMatch({ energy: [4, 6], hand: [[h], []] });
    g = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 0 }).state;
    expect(g.energy[0]).toBe(0);
    const uid = g.board[0].uid;
    g = applyAction(g, { t: "pickup", side: 0, uid }).state;
    expect(g.energy[0]).toBe(4);                                    // devolveu 4, não 3
    expect(g.hand[0][0].custoMod).toBe(1);
  });
});

/* ==========================================================================
   Tokens — existem para o motor, não para a coleção.
   ========================================================================== */
describe("TOKENS", () => {
  it("não aparecem em CARDS (Galeria e deckbuilder não os enxergam)", () => {
    const keys = CARDS.map((c) => c.key);
    expect(keys).not.toContain("token-ra");
    expect(keys).not.toContain("token-mosca");
  });

  it("estão em byKey, que é a tabela de consulta do motor", () => {
    expect(byKey["token-ra"].nome).toBe("Rã");
    expect(byKey["token-mosca"].nome).toBe("Mosca");
  });

  it("Rã é 1/1 — custo 1 de propósito, para a Sekhmet alcançá-la", () => {
    expect(byKey["token-ra"].custo).toBe(1);
    expect(byKey["token-ra"].poder).toBe(1);
  });

  it("Mosca é 1/0 — entulha o deck inimigo com uma compra morta", () => {
    expect(byKey["token-mosca"].custo).toBe(1);
    expect(byKey["token-mosca"].poder).toBe(0);
  });

  it("ambos são do tipo Animal, alvo da Peste nos Animais", () => {
    for (const t of TOKENS) expect(temTipo(t, "Animal"), t.key).toBe(true);
  });

  it("nenhuma chave de token colide com a coleção", () => {
    const keys = CARDS.map((c) => c.key);
    for (const t of TOKENS) expect(keys).not.toContain(t.key);
  });

  it("a Sekhmet mata uma Rã em jogo", () => {
    const sekhmet = mk("sekhmet", { lane: 1 });
    const ra = mk("token-ra", { owner: 1 });
    const s = mkState([sekhmet, ra]);
    resolveSekhmet(s, sekhmet, 1);
    expect(ra.dying).toBeTruthy();
  });

  it("a Rã pontua 1 para o lado que a recebeu", () => {
    const s = mkState([mk("token-ra", { owner: 1 })]);
    expect(laneScore(ctxOf(s), 0, 1)).toBe(1);
  });
});

/* Os tokens são cartas de verdade: se a arte sumir do build, a Rã e a Mosca
   voltam ao placeholder de glifo sem reclamar de nada — modo de falha
   silencioso. Este teste é o alarme. */
describe("arte dos tokens", () => {
  it("Rã e Mosca apontam para um arquivo de arte", () => {
    expect(byKey["token-ra"].arte).toBe("token-ra");
    expect(byKey["token-mosca"].arte).toBe("token-mosca");
  });
});
