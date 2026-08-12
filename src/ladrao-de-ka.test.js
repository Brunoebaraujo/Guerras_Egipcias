import { describe, it, expect, beforeEach } from "vitest";
import { byKey, resetUid, nextUid } from "./engine.js";
import { resolveEffectPhase } from "./domain/effects/index.js"; // garante o registro de Ladrão de Ka
import { validarColecao } from "./domain/cards/schema.js";
import { freshMatch, applyAction, autoReveal } from "./match.js";

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

describe("Ladrão de Ka", () => {
  it("está registrado corretamente na coleção (1/0, Humano, buff)", () => {
    const def = byKey["ladrao-de-ka"];
    expect(def).toBeTruthy();
    expect(def.custo).toBe(1);
    expect(def.poder).toBe(0);
    expect(def.tipo).toBe("Humano");
    expect(def.arch).toBe("buff");
  });

  it("a coleção continua válida com Ladrão de Ka registrada", () => {
    expect(validarColecao()).toEqual([]);
  });

  it("Ao Entrar reserva +1 em pendingEnergy do próprio dono", () => {
    const ladrao = onBoard("ladrao-de-ka", { owner: 0 });
    const s = mkMatch({ board: [ladrao], pendingEnergy: [0, 0] });
    resolveEffectPhase({ state: s, source: ladrao, definition: byKey["ladrao-de-ka"], phase: "enter", rng: seeded(1) });
    expect(s.pendingEnergy[0]).toBe(1);
    expect(s.pendingEnergy[1]).toBe(0); // não vaza para o lado oposto
  });

  it("acumula com outra fonte (ex.: Bennu) no mesmo turno", () => {
    const ladrao = onBoard("ladrao-de-ka", { owner: 0 });
    const s = mkMatch({ board: [ladrao], pendingEnergy: [2, 0] }); // já tinha +2 de outra fonte
    resolveEffectPhase({ state: s, source: ladrao, definition: byKey["ladrao-de-ka"], phase: "enter", rng: seeded(1) });
    expect(s.pendingEnergy[0]).toBe(3);
  });

  it("de ponta a ponta: jogar e revelar dá +1 de energia SÓ no turno seguinte", () => {
    const lista = Array(12).fill("servo");
    let g = freshMatch([["ladrao-de-ka", ...lista.slice(0, 11)], lista], { rng: seeded(2) });
    const hid = g.hand[0].find((h) => h.key === "ladrao-de-ka").hid;

    g = applyAction(g, { t: "place", side: 0, hid, lane: 0 }).state;
    expect(g.energy[0]).toBe(g.round - byKey["ladrao-de-ka"].custo); // energia da rodada 1 já debitada

    g = applyAction(g, { t: "startReveal" }).state;
    g = autoReveal(g, { rng: seeded(5) }).state;
    expect(g.phase).toBe("revealed");
    // energia da RODADA ATUAL não muda por causa do efeito — só a próxima
    expect(g.pendingEnergy[0]).toBe(1);

    const r = applyAction(g, { t: "nextRound" }, { rng: seeded(9) });
    expect(r.error).toBeUndefined();
    expect(r.state.round).toBe(2);
    expect(r.state.energy[0]).toBe(3);   // 2 (rodada) + 1 (Ladrão de Ka)
    expect(r.state.energy[1]).toBe(2);   // lado B sem bônus
    expect(r.state.pendingEnergy).toEqual([0, 0]); // consumido, não acumula à toa
  });
});
