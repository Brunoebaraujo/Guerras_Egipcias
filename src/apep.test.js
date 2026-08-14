import { describe, it, expect, beforeEach } from "vitest";
import { byKey, resetUid, nextUid, power, ctxOf, aplicarReacaoAliadoNaVia, destroyList } from "./engine.js";
import "./domain/effects/index.js"; // garante o registro de Apep e dos efeitos-flag
import { validarColecao } from "./domain/cards/schema.js";
import { applyAction, autoReveal } from "./match.js";

const seeded = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const mkMatch = (over = {}) => ({
  round: 1, energy: [6, 6], board: [], deaths: [0, 0], plays: [0, 0],
  pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
  deck: [[], []], hand: [[], []], seen: [0, 0],
  priority: 0, priorityReason: "teste", phase: "plan", queue: [],
  lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null,
  log: [], trace: [], finished: false, ...over,
});
const onBoard = (key, o = {}) => ({
  uid: nextUid(), key, owner: 0, lane: 0, printed: byKey[key].poder, baked: 0,
  mods: [], revealed: true, dying: false, pendentes: 0, entryPlays: 0, enteredRound: 0, moved: false, ...o,
});

beforeEach(resetUid);

describe("Apep, a Serpente do Caos", () => {
  it("está registrada corretamente na coleção (1/6, Criatura, debuff)", () => {
    const def = byKey["apep"];
    expect(def).toBeTruthy();
    expect(def.custo).toBe(1);
    expect(def.poder).toBe(6);
    expect(def.tipo).toBe("Criatura");
    expect(def.arch).toBe("debuff");
  });

  it("a coleção continua válida com Apep registrada", () => {
    expect(validarColecao()).toEqual([]);
  });

  it("perde 1 de Poder quando um aliado é revelado na MESMA via", () => {
    const apep = onBoard("apep", { owner: 0, lane: 0 });
    const aliado = onBoard("servo", { owner: 0, lane: 0, revealed: true });
    const s = mkMatch({ board: [apep, aliado] });
    aplicarReacaoAliadoNaVia(s, aliado);
    expect(power(apep, ctxOf(s))).toBe(5); // 6 impresso - 1
  });

  it("NÃO reage a aliado em via diferente", () => {
    const apep = onBoard("apep", { owner: 0, lane: 0 });
    const aliado = onBoard("servo", { owner: 0, lane: 1, revealed: true });
    const s = mkMatch({ board: [apep, aliado] });
    aplicarReacaoAliadoNaVia(s, aliado);
    expect(power(apep, ctxOf(s))).toBe(6);
  });

  it("NÃO reage a carta do adversário na mesma via", () => {
    const apep = onBoard("apep", { owner: 0, lane: 0 });
    const inimigo = onBoard("servo", { owner: 1, lane: 0, revealed: true });
    const s = mkMatch({ board: [apep, inimigo] });
    aplicarReacaoAliadoNaVia(s, inimigo);
    expect(power(apep, ctxOf(s))).toBe(6);
  });

  it("não se autopenaliza ao ser revelada", () => {
    const apep = onBoard("apep", { owner: 0, lane: 0 });
    const s = mkMatch({ board: [apep] });
    aplicarReacaoAliadoNaVia(s, apep); // ela mesma acabou de revelar
    expect(power(apep, ctxOf(s))).toBe(6);
  });

  it("acumula um desconto por aliado (várias entradas na mesma via)", () => {
    const apep = onBoard("apep", { owner: 0, lane: 0 });
    const a1 = onBoard("servo", { owner: 0, lane: 0, revealed: true });
    const a2 = onBoard("arqueiro", { owner: 0, lane: 0, revealed: true });
    const s = mkMatch({ board: [apep, a1, a2] });
    aplicarReacaoAliadoNaVia(s, a1);
    aplicarReacaoAliadoNaVia(s, a2);
    expect(power(apep, ctxOf(s))).toBe(4); // 6 - 1 - 1
  });

  it("o desconto é PERMANENTE: continua mesmo se o aliado que o causou morrer depois", () => {
    const apep = onBoard("apep", { owner: 0, lane: 0 });
    const aliado = onBoard("servo", { owner: 0, lane: 0, revealed: true });
    const s = mkMatch({ board: [apep, aliado] });
    aplicarReacaoAliadoNaVia(s, aliado);
    expect(power(apep, ctxOf(s))).toBe(5);
    destroyList(s, [aliado]);
    s.board = s.board.filter((c) => !c.dying);
    expect(power(apep, ctxOf(s))).toBe(5); // desconto gravado em mods, não recalculado
  });

  it("place(): pode ser jogada até a Rodada 3", () => {
    const g = mkMatch({
      round: 3, energy: [6, 6],
      hand: [[{ hid: 1, key: "apep", printed: byKey["apep"].poder, baked: 0, custoMod: 0, venenos: [] }], []],
    });
    const r = applyAction(g, { t: "place", side: 0, hid: 1, lane: 0 });
    expect(r.error).toBeUndefined();
    expect(r.state.board.some((c) => c.key === "apep")).toBe(true);
  });

  it("place(): rejeitada a partir da Rodada 4", () => {
    const g = mkMatch({
      round: 4, energy: [6, 6],
      hand: [[{ hid: 1, key: "apep", printed: byKey["apep"].poder, baked: 0, custoMod: 0, venenos: [] }], []],
    });
    const r = applyAction(g, { t: "place", side: 0, hid: 1, lane: 0 });
    expect(r.error).toMatch(/Rodada 3/);
    expect(r.state).toBe(g); // estado não mutado numa ação rejeitada
  });

  it("de ponta a ponta: reforçar a via de Apep na revelação reduz o Poder dela", () => {
    let g = mkMatch({
      round: 1, energy: [6, 6],
      hand: [[
        { hid: 1, key: "apep", printed: byKey["apep"].poder, baked: 0, custoMod: 0, venenos: [] },
        { hid: 2, key: "servo", printed: byKey["servo"].poder, baked: 0, custoMod: 0, venenos: [] },
      ], []],
    });

    g = applyAction(g, { t: "place", side: 0, hid: 1, lane: 0 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: 2, lane: 0 }).state;

    g = applyAction(g, { t: "startReveal" }).state;
    g = autoReveal(g, { rng: seeded(7) }).state;
    expect(g.phase).toBe("revealed");

    const apepNoTabuleiro = g.board.find((c) => c.key === "apep");
    expect(power(apepNoTabuleiro, ctxOf(g))).toBe(5); // 6 - 1 pelo Servo revelado na mesma via
  });
});
