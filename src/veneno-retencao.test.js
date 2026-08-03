import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, destroyList, resolveBennuRebirth,
  aplicarVeneno, MAO_MAX,
  resetUid, nextUid,
} from "./engine.js";

/* Fábricas mínimas, iguais aos outros testes de regra. */
const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = [], over = {}) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], round: 1, energy: [9, 9],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], destroyedPower: [0, 0], ...over,
});

beforeEach(resetUid);

/* ==========================================================================
   BENNU — o veneno sobrevive ao renascimento
   ========================================================================== */
describe("Bennu retém veneno ao renascer", () => {
  it("carrega as marcas de veneno para a fila de retorno", () => {
    const bennu = mk("bennu", { lane: 1, venenos: [1, 2] });
    const s = mkState([bennu]);
    destroyList(s, [bennu]);
    expect(s.pendingReturn).toHaveLength(1);
    expect(s.pendingReturn[0].venenos).toEqual([1, 2]);
  });

  it("a ave renasce ainda envenenada e continua sofrendo o dano por rodada", () => {
    const bennu = mk("bennu", { lane: 1, venenos: [1, 2] }); // -3 por rodada
    const s = mkState([bennu]);
    destroyList(s, [bennu]);
    s.board = s.board.filter((c) => !c.dying);
    const [novo] = resolveBennuRebirth(s, () => 0);
    expect(novo.venenos).toEqual([1, 2]);
    const antes = power(novo, ctxOf(s));
    aplicarVeneno(s);
    expect(power(novo, ctxOf(s))).toBe(antes - 3);
  });

  it("sem veneno, a fila de retorno traz venenos vazio", () => {
    const bennu = mk("bennu", { lane: 0 });
    const s = mkState([bennu]);
    destroyList(s, [bennu]);
    expect(s.pendingReturn[0].venenos).toEqual([]);
  });
});

/* ==========================================================================
   MÚMIA — retém veneno na mão e sofre o dano mesmo parada
   ========================================================================== */
describe("Múmia retém veneno ao voltar à mão", () => {
  it("volta à mão carregando as marcas de veneno", () => {
    const mumia = mk("mumia", { lane: 0, venenos: [2] });
    const s = mkState([mumia]);
    destroyList(s, [mumia]);
    expect(s.hand[0]).toHaveLength(1);
    expect(s.hand[0][0].key).toBe("mumia");
    expect(s.hand[0][0].venenos).toEqual([2]);
  });

  it("o dano de veneno incide na Faixa mesmo com a carta parada na mão", () => {
    const mumia = mk("mumia", { lane: 0, venenos: [1] });
    const s = mkState([mumia]);
    destroyList(s, [mumia]);
    const naMao = s.hand[0][0];
    const poderNaMao = naMao.printed + naMao.baked;
    aplicarVeneno(s);
    expect(naMao.printed + naMao.baked).toBe(poderNaMao - 1);
    expect(naMao.venenos).toEqual([1]);
    aplicarVeneno(s);
    expect(naMao.printed + naMao.baked).toBe(poderNaMao - 2);
  });

  it("a Faixa pode ficar negativa se o veneno superar o Poder acumulado", () => {
    const mumia = mk("mumia", { lane: 0, venenos: [3] });
    const s = mkState([mumia]);
    destroyList(s, [mumia]);
    const naMao = s.hand[0][0];
    aplicarVeneno(s);
    aplicarVeneno(s);
    expect(naMao.printed + naMao.baked).toBe(-4); // 2 - 3 - 3
  });

  it("mão cheia: a Múmia não volta e o veneno some com ela", () => {
    const mumia = mk("mumia", { lane: 0, venenos: [2] });
    const mao = Array.from({ length: MAO_MAX }, () => ({ hid: nextUid(), key: "servo", printed: 1, baked: 0 }));
    const s = mkState([mumia], { hand: [mao, []] });
    destroyList(s, [mumia]);
    expect(s.hand[0]).toHaveLength(MAO_MAX);
    expect(s.hand[0].some((h) => h.key === "mumia")).toBe(false);
  });
});
