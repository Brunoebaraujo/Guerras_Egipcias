import { describe, it, expect, beforeEach } from "vitest";
import { byKey, buildRevealQueue, power, ctxOf, laneScore, resetUid, nextUid } from "./engine.js";
import { applyAction, autoReveal, MAX_ROUND } from "./match.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, enteredRound = 1, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound, moved: false, ...rest,
});
const mkMatch = (over = {}) => ({
  round: 1, energy: [9, 9], board: [], deaths: [0, 0], plays: [0, 0],
  pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
  deck: [["servo"], ["servo"]], hand: [[], []], seen: [0, 0],
  priority: 0, priorityReason: "teste", phase: "plan", queue: [],
  lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null, trevas: null,
  log: [], trace: [], finished: false, ...over,
});
const naMao = (key) => ({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0 });
const revelar = (g) => autoReveal(applyAction(g, { t: "startReveal" }).state).state;
const jogar = (g, side, h, lane) => applyAction(g, { t: "place", side, hid: h.hid, lane }).state;

beforeEach(resetUid);

/* ==========================================================================
   buildRevealQueue — a onda por rodada de entrada não pode alterar o caso normal.
   ========================================================================== */
describe("buildRevealQueue()", () => {
  it("caso normal (todas da mesma rodada): prioridade, depois ordem de colocação", () => {
    const a1 = mk("servo", { owner: 0, revealed: false });
    const b1 = mk("servo", { owner: 1, revealed: false });
    const a2 = mk("servo", { owner: 0, lane: 2, revealed: false });
    const g = mkMatch({ board: [a1, b1, a2], priority: 0 });
    expect(buildRevealQueue(g)).toEqual([a1.uid, a2.uid, b1.uid]);
  });

  it("respeita a prioridade invertida", () => {
    const a = mk("servo", { owner: 0, revealed: false });
    const b = mk("servo", { owner: 1, revealed: false });
    const g = mkMatch({ board: [a, b], priority: 1 });
    expect(buildRevealQueue(g)).toEqual([b.uid, a.uid]);
  });

  it("cartas atrasadas revelam em onda própria, ANTES das da rodada atual", () => {
    const atrasadaA = mk("servo", { owner: 0, revealed: false, enteredRound: 3 });
    const atrasadaB = mk("servo", { owner: 1, revealed: false, enteredRound: 3 });
    const novaA = mk("servo", { owner: 0, lane: 1, revealed: false, enteredRound: 4 });
    const novaB = mk("servo", { owner: 1, lane: 1, revealed: false, enteredRound: 4 });
    // ordem no board é a de colocação: as novas entraram depois
    const g = mkMatch({ round: 4, board: [atrasadaA, atrasadaB, novaA, novaB], priority: 0 });
    expect(buildRevealQueue(g)).toEqual([atrasadaA.uid, atrasadaB.uid, novaA.uid, novaB.uid]);
  });

  it("dentro de cada onda, a prioridade vale de novo", () => {
    const atrasadaA = mk("servo", { owner: 0, revealed: false, enteredRound: 2 });
    const atrasadaB = mk("servo", { owner: 1, revealed: false, enteredRound: 2 });
    const novaA = mk("servo", { owner: 0, lane: 1, revealed: false, enteredRound: 3 });
    const g = mkMatch({ round: 3, board: [atrasadaA, atrasadaB, novaA], priority: 1 });
    expect(buildRevealQueue(g)).toEqual([atrasadaB.uid, atrasadaA.uid, novaA.uid]);
  });

  it("ignora cartas já reveladas", () => {
    const velha = mk("servo", { revealed: true });
    const nova = mk("servo", { lane: 1, revealed: false });
    const g = mkMatch({ board: [velha, nova] });
    expect(buildRevealQueue(g)).toEqual([nova.uid]);
  });
});

/* ==========================================================================
   Trevas no fluxo da partida.
   ========================================================================== */
describe("Trevas sobre o Egito", () => {
  it("agenda o atraso para a próxima rodada", () => {
    const h = naMao("trevas");
    let g = mkMatch({ round: 3, hand: [[h], []] });
    g = jogar(g, 0, h, 0);
    g = revelar(g);
    expect(g.trevas).toBe(4);
  });

  it("na rodada agendada, nada se revela — dos DOIS lados", () => {
    const ha = naMao("colosso"), hb = naMao("colosso");
    let g = mkMatch({ round: 4, trevas: 4, hand: [[ha], [hb]] });
    g = jogar(g, 0, ha, 0);
    g = jogar(g, 1, hb, 0);
    g = revelar(g);
    expect(g.board.every((c) => !c.revealed)).toBe(true);
    expect(g.phase).toBe("revealed");
  });

  it("carta oculta não pontua na via", () => {
    const h = naMao("colosso");
    let g = mkMatch({ round: 4, trevas: 4, hand: [[h], []] });
    g = jogar(g, 0, h, 0);
    g = revelar(g);
    expect(laneScore(ctxOf(g), 0, 0)).toBe(0);
  });

  it("carta oculta não dispara Ao Entrar — o efeito espera a revelação", () => {
    const h = naMao("sekhmet");
    let g = mkMatch({ round: 4, trevas: 4, hand: [[h], []], board: [mk("arqueiro", { owner: 1, lane: 1 })] });
    g = jogar(g, 0, h, 0);
    g = revelar(g);
    expect(g.board.find((c) => c.key === "arqueiro").dying).toBeFalsy();
    g = applyAction(g, { t: "nextRound" }).state;
    g = revelar(g);
    expect(g.board.find((c) => c.key === "arqueiro")).toBeUndefined();   // varrido pela Sekhmet
  });

  it("o atraso é consumido: a rodada seguinte revela normalmente", () => {
    const h = naMao("colosso");
    let g = mkMatch({ round: 4, trevas: 4, hand: [[h], []] });
    g = jogar(g, 0, h, 0);
    g = revelar(g);
    expect(g.trevas).toBeNull();
    g = applyAction(g, { t: "nextRound" }).state;
    g = revelar(g);
    expect(g.board.find((c) => c.key === "colosso").revealed).toBe(true);
  });

  it("as atrasadas revelam antes das novas na rodada seguinte", () => {
    const atrasada = naMao("colosso"), nova = naMao("servo");
    let g = mkMatch({ round: 4, trevas: 4, hand: [[atrasada, nova], []] });
    g = jogar(g, 0, atrasada, 0);
    g = revelar(g);
    g = applyAction(g, { t: "nextRound" }).state;
    g = jogar(g, 0, g.hand[0][0], 1);
    const fila = applyAction(g, { t: "startReveal" }).state.queue;
    const uidAtrasada = g.board.find((c) => c.key === "colosso").uid;
    expect(fila[0]).toBe(uidAtrasada);
  });

  it("carta atrasada não pode ser recolhida na rodada seguinte", () => {
    const h = naMao("colosso");
    let g = mkMatch({ round: 4, trevas: 4, energy: [6, 6], hand: [[h], []] });
    g = jogar(g, 0, h, 0);
    expect(g.energy[0]).toBe(0);
    g = revelar(g);
    g = applyAction(g, { t: "nextRound" }).state;
    const uid = g.board[0].uid;
    const { error } = applyAction(g, { t: "pickup", side: 0, uid });
    expect(error).toMatch(/atrasada/i);
  });

  it("na rodada da mesma leva, recolher continua permitido", () => {
    const h = naMao("colosso");
    let g = mkMatch({ round: 4, trevas: 4, energy: [6, 6], hand: [[h], []] });
    g = jogar(g, 0, h, 0);
    const { error } = applyAction(g, { t: "pickup", side: 0, uid: g.board[0].uid });
    expect(error).toBeUndefined();
  });

  it("na última rodada o atraso é IGNORADO — nada fica oculto na apuração", () => {
    const h = naMao("colosso");
    let g = mkMatch({ round: MAX_ROUND, trevas: MAX_ROUND, hand: [[h], []] });
    g = jogar(g, 0, h, 0);
    g = revelar(g);
    expect(g.board.find((c) => c.key === "colosso").revealed).toBe(true);
    expect(g.trevas).toBeNull();
  });

  it("Trevas jogada na última rodada não tem efeito nenhum", () => {
    const h = naMao("trevas");
    let g = mkMatch({ round: MAX_ROUND, hand: [[h], []] });
    g = jogar(g, 0, h, 0);
    g = revelar(g);
    expect(g.trevas).toBe(MAX_ROUND + 1);   // agendada para uma rodada que não existe
    g = applyAction(g, { t: "finish" }).state;
    expect(g.finished).toBe(true);
  });

  it("Moisés registra a Trevas como Sinal quando ela resolve", () => {
    const hm = naMao("moises"), ht = naMao("trevas");
    let g = mkMatch({ round: 3, hand: [[hm, ht], []] });
    g = jogar(g, 0, hm, 0);
    g = jogar(g, 0, ht, 1);
    g = revelar(g);
    const m = g.board.find((c) => c.key === "moises");
    expect(m.pragasVistas).toEqual(["trevas"]);
    expect(power(m, ctxOf(g))).toBe(1);
  });

  it("uma Praga atrasada pelas Trevas resolve normalmente ao ser revelada", () => {
    const hm = naMao("moises"), hp = naMao("sangue");
    let g = mkMatch({ round: 4, trevas: 4, hand: [[hm, hp], []], board: [mk("colosso", { owner: 1, lane: 2 })] });
    g = jogar(g, 0, hm, 0);
    g = jogar(g, 0, hp, 1);
    g = revelar(g);
    expect(g.board.find((c) => c.key === "sangue")).toBeDefined();   // ainda oculta
    g = applyAction(g, { t: "nextRound" }).state;
    g = revelar(g);
    const m = g.board.find((c) => c.key === "moises");
    expect(m.pragasVistas).toEqual(["sangue"]);
    expect(power(g.board.find((c) => c.key === "colosso"), ctxOf(g))).toBe(13);
  });
});

/* ==========================================================================
   Úlceras no loop de rodadas.
   ========================================================================== */
describe("Úlceras no nextRound", () => {
  it("a carta ulcerada perde 1 de Poder a cada virada de rodada", () => {
    let g = mkMatch({ round: 2, phase: "revealed", board: [mk("colosso", { owner: 1, ulceras: true })] });
    g = applyAction(g, { t: "nextRound" }).state;
    expect(power(g.board[0], ctxOf(g))).toBe(13);
    g.phase = "revealed";
    g = applyAction(g, { t: "nextRound" }).state;
    expect(power(g.board[0], ctxOf(g))).toBe(12);
  });

  it("a Praga jogada na rodada N só cobra o primeiro tique na rodada N+1", () => {
    const h = naMao("ulceras");
    let g = mkMatch({ round: 2, hand: [[h], []], board: [mk("colosso", { owner: 1, lane: 0 })] });
    g = jogar(g, 0, h, 0);
    g = revelar(g);
    const alvo = g.board.find((c) => c.key === "colosso");
    expect(power(alvo, ctxOf(g))).toBe(14);
    g = applyAction(g, { t: "nextRound" }).state;
    expect(power(g.board.find((c) => c.key === "colosso"), ctxOf(g))).toBe(13);
  });

  it("escreve o tique no log da partida", () => {
    let g = mkMatch({ round: 2, phase: "revealed", board: [mk("colosso", { owner: 1, ulceras: true })] });
    g = applyAction(g, { t: "nextRound" }).state;
    expect(g.trace.join("\n")).toMatch(/Úlceras: -1/);
  });
});
