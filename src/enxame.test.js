import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, resolveEnxame, resetUid, nextUid, temTipo, destroyList,
  resolveDestroyAllOfTypeInLane, resolveApis, resolveCabraDoNilo, resolveSekhmet, CARDS, TOKENS,
} from "./engine.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});

const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [],
});

beforeEach(resetUid);

describe("Enxame de Gafanhotos", () => {
  it("invoca duas fichas reveladas com o poder atual da original", () => {
    const enxame = mk("enxame", { mods: [{ src: "Hathor", val: 2 }] });
    const s = mkState([enxame]);

    resolveEnxame(s, enxame);

    const copies = s.board.filter((c) => c.uid !== enxame.uid && c.key === "token-gafanhoto");
    expect(copies).toHaveLength(2);
    expect(copies.every((c) => c.revealed && c.baseCopy)).toBe(true);
    expect(copies.map((c) => power(c, ctxOf(s)))).toEqual([4, 4]);
    expect(copies.every((c) => temTipo(c, "Guerreiro") && temTipo(c, "Animal"))).toBe(true);
  });

  it("nao dobra bonus continuo de Montu ao copiar o poder atual", () => {
    const montu = mk("montu");
    const enxame = mk("enxame");
    const s = mkState([montu, enxame]);

    expect(power(enxame, ctxOf(s))).toBe(4);
    resolveEnxame(s, enxame);

    const copies = s.board.filter((c) => c.uid !== enxame.uid && c.key === "token-gafanhoto");
    expect(copies.map((c) => power(c, ctxOf(s)))).toEqual([4, 4]);
  });

  it("respeita o limite de quatro cartas por lado na via", () => {
    const enxame = mk("enxame");
    const s = mkState([enxame, mk("servo"), mk("arqueiro"), mk("lanceiro")]);

    const fx = resolveEnxame(s, enxame);

    expect(fx.kind).toBe("block");
    expect(s.board).toHaveLength(4);
  });
});

/* ==========================================================================
   Tipo duplo: Guerreiro E Animal ao mesmo tempo
   ========================================================================== */
describe("Enxame e Gafanhotos são Guerreiro e Animal", () => {
  const st = (board) => ({ ...mkState(board), destroyedPower: [0, 0], round: 1, trace: [] });
  const pw = (s, c) => power(c, ctxOf(s));

  it("a carta e a ficha declaram os dois tipos", () => {
    for (const k of ["enxame", "token-gafanhoto"]) {
      expect(temTipo({ key: k }, "Guerreiro"), k).toBe(true);
      expect(temTipo({ key: k }, "Animal"), k).toBe(true);
      expect(temTipo({ key: k }, "Divindade"), k).toBe(false);
      expect(byKey[k].tipo).toBe("Guerreiro · Animal");   // rótulo legível da tarja
    }
  });

  it("recebe Montu E o Domador ao mesmo tempo", () => {
    const enxame = mk("enxame");
    const s = st([mk("montu"), mk("domador"), enxame]);
    expect(pw(s, enxame)).toBe(2 + 2 + 2);       // impresso + Montu + Domador
  });

  it("a ficha herda os dois hinos sem contar o Poder duas vezes", () => {
    const enxame = mk("enxame");
    // Montu e Domador em OUTRA via: os hinos são globais, e a via do Enxame
    // precisa de espaço livre para as duas fichas.
    const s = st([mk("montu", { lane: 1 }), mk("domador", { lane: 1 }), enxame]);
    resolveEnxame(s, enxame);
    const fichas = s.board.filter((c) => c.key === "token-gafanhoto");
    expect(fichas).toHaveLength(2);
    for (const f of fichas) expect(pw(s, f)).toBe(6);     // mesmo Poder da mãe, não 10
  });

  it("a Peste nos Animais varre o Enxame e as fichas", () => {
    const enxame = mk("enxame", { owner: 1 });
    const s = st([enxame, mk("peste", { owner: 0 })]);
    resolveEnxame(s, enxame);
    resolveDestroyAllOfTypeInLane(s, s.board.find((c) => c.key === "peste"), "Animal", { escopo: "inimigos" });
    expect(s.board.filter((c) => (c.key === "enxame" || c.key === "token-gafanhoto") && !c.dying)).toHaveLength(0);
  });

  it("o Assassino Medjay, que varre Divindades, não os toca", () => {
    const enxame = mk("enxame", { owner: 1 });
    const s = st([enxame, mk("assassino-medjay", { owner: 0 })]);
    resolveDestroyAllOfTypeInLane(s, s.board.find((c) => c.key === "assassino-medjay"), "Divindade", { escopo: "inimigos" });
    expect(enxame.dying).toBeFalsy();
  });

  it("contam como Animal para o Touro Ápis", () => {
    const enxame = mk("enxame");
    const s = st([enxame]);
    resolveEnxame(s, enxame);
    const apis = mk("apis", { lane: 1 });
    s.board.push(apis);
    resolveApis(s, apis);
    expect(pw(s, apis)).toBe(10);                // 7 + Enxame + 2 fichas
  });

  it("uma ficha destruída alimenta a Hiena", () => {
    const enxame = mk("enxame");
    const hiena = mk("hiena", { lane: 1 });
    const s = st([enxame, hiena]);
    resolveEnxame(s, enxame);
    destroyList(s, [s.board.find((c) => c.key === "token-gafanhoto")]);
    expect(pw(s, hiena)).toBe(4);
  });

  it("contam como Animal para a Cabra do Nilo na mesma via", () => {
    const enxame = mk("enxame");
    const s = st([enxame]);
    resolveEnxame(s, enxame);
    const cabra = mk("cabra-nilo");
    s.board.push(cabra);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(4);                // 1 + Enxame + 2 fichas
  });

  it("continuam sendo Guerreiro: o Montu sozinho ainda vale", () => {
    const enxame = mk("enxame");
    const s = st([mk("montu"), enxame]);
    expect(pw(s, enxame)).toBe(4);
  });
});

describe("Gafanhoto é ficha de verdade", () => {
  it("não é escolhível no deck e vive na lista de fichas", () => {
    expect(byKey["token-gafanhoto"].token).toBe(true);
    expect(CARDS.some((c) => c.key === "token-gafanhoto")).toBe(false);
    expect(TOKENS.some((c) => c.key === "token-gafanhoto")).toBe(true);
  });

  it("a instância nasce marcada como ficha", () => {
    const enxame = mk("enxame");
    const s = { ...mkState([enxame]), round: 2 };
    resolveEnxame(s, enxame);
    for (const f of s.board.filter((c) => c.key === "token-gafanhoto")) {
      expect(f.token).toBe(true);
      expect(f.baseCopy).toBe(true);
      expect(f.revealed).toBe(true);
    }
  });

  it("custo 1: a Sekhmet alcança as fichas e poupa a carta-mãe (custo 3)", () => {
    const enxame = mk("enxame", { owner: 1 });
    const s = { ...mkState([enxame]), destroyedPower: [0, 0], round: 1 };
    resolveEnxame(s, enxame);
    resolveSekhmet(s, mk("sekhmet", { owner: 0, lane: 2 }), 1);
    expect(s.board.filter((c) => c.key === "token-gafanhoto" && !c.dying)).toHaveLength(0);
    expect(enxame.dying).toBeFalsy();
  });
});
