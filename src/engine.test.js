import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, laneScore, laneWins, ctxOf, onEnterBlocked,
  destroyList, resolveSobek, resolveDestroyOwnLane, resolveArmadura, resolveSekhmet,
  resetUid, nextUid,
} from "./engine.js";

/* Fábricas de teste ---------------------------------------------------------- */
const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [],
});

beforeEach(resetUid);

/* ------------------------------ Motor de poder ------------------------------ */
describe("power()", () => {
  it("carta base vale o poder impresso", () => {
    const s = mkState([mk("colosso")]);
    expect(power(s.board[0], ctxOf(s))).toBe(14);
  });

  it("Amon dá +1 às outras cartas do MESMO lado, em todas as vias, e não a si", () => {
    const amon = mk("amon");
    const aliado = mk("servo", { lane: 2 });          // outra via, mesmo dono
    const inimigo = mk("servo", { owner: 1 });        // lado oposto
    const s = mkState([amon, aliado, inimigo]);
    expect(power(aliado, ctxOf(s))).toBe(2);          // 1 + Amon
    expect(power(inimigo, ctxOf(s))).toBe(1);         // não recebe
    expect(power(amon, ctxOf(s))).toBe(5);            // não buffa a si mesmo
  });

  it("Montu dá +2 apenas a Guerreiros do dono", () => {
    const s = mkState([mk("montu"), mk("carruagem"), mk("hathor")]);
    expect(power(s.board[1], ctxOf(s))).toBe(8);      // 6 + 2
    expect(power(s.board[2], ctxOf(s))).toBe(2);      // Divindade: sem buff
  });

  it("Maat prende TODA a via ao poder impresso (dos dois lados)", () => {
    const buffed = mk("servo", { mods: [{ src: "Hathor", val: 2 }] });
    const s = mkState([mk("maat", { owner: 1 }), buffed, mk("amon")]);
    expect(power(buffed, ctxOf(s))).toBe(1);          // impresso, ignora mods e Amon
  });

  it("Anúbis escala +2 por morte própria", () => {
    const s = mkState([mk("anubis")]);
    s.deaths[0] = 3;
    expect(power(s.board[0], ctxOf(s))).toBe(10);     // 4 + 6
  });

  it("Ammit cresce +1 por carta jogada depois dela", () => {
    const ammit = mk("ammit", { entryPlays: 2 });
    const s = mkState([ammit]);
    s.plays[0] = 5;
    expect(power(ammit, ctxOf(s))).toBe(4);           // 1 + (5-2)
  });

  it("cartas com dying não contam no placar da via", () => {
    const s = mkState([mk("colosso"), mk("servo", { dying: 1 })]);
    expect(laneScore(ctxOf(s), 0, 0)).toBe(14);
  });
});

/* --------------------------------- Múmia ------------------------------------ */
describe("Múmia (Ao Morrer)", () => {
  it("volta à mão com o DOBRO do poder atual (marcadores incluídos)", () => {
    const mumia = mk("mumia", { mods: [{ src: "Hathor", val: 2 }] }); // 2+2 = 4
    const s = mkState([mumia]);
    destroyList(s, [mumia]);
    expect(s.hand[0]).toHaveLength(1);
    expect(s.hand[0][0].printed + s.hand[0][0].baked).toBe(8);        // 4 × 2
    expect(s.deaths[0]).toBe(1);
  });

  it("dobra também buffs contínuos (Amon) vigentes na morte", () => {
    const mumia = mk("mumia");
    const s = mkState([mumia, mk("amon")]);                            // 2+1 = 3
    destroyList(s, [mumia]);
    expect(s.hand[0][0].printed + s.hand[0][0].baked).toBe(6);
  });
});

/* --------------------------------- Bennu ------------------------------------ */
describe("Bennu (Ao Morrer)", () => {
  it("agenda +1 energia e retorno ao tabuleiro com +1 de poder", () => {
    const bennu = mk("bennu", { lane: 1 });
    const s = mkState([bennu]);
    destroyList(s, [bennu]);
    expect(s.pendingEnergy[0]).toBe(1);
    expect(s.pendingReturn).toEqual([{ owner: 0, lane: 1, printed: 0, baked: 1 }]);
  });
});

/* --------------------------------- Sobek ------------------------------------ */
describe("Sobek", () => {
  it("destrói as outras cartas da via e ganha +1 por vítima", () => {
    const sobek = mk("sobek");
    const s = mkState([sobek, mk("servo"), mk("arqueiro"), mk("servo", { lane: 1 })]);
    resolveSobek(s, sobek);
    expect(s.board.filter((c) => c.dying)).toHaveLength(2);            // só a via 0
    expect(power(sobek, ctxOf(s))).toBe(4);                            // 2 + 2
  });

  it("sozinho na via não ganha nada", () => {
    const sobek = mk("sobek");
    const s = mkState([sobek]);
    const fx = resolveSobek(s, sobek);
    expect(fx.kind).toBe("block");
    expect(power(sobek, ctxOf(s))).toBe(2);
  });
});

/* -------------------------------- Apófis ------------------------------------ */
describe("Apófis / Dilúvio", () => {
  it("Apófis absorve o poder total das vítimas", () => {
    const apofis = mk("apofis");
    const s = mkState([apofis, mk("carruagem"), mk("servo")]);         // 6 + 1
    resolveDestroyOwnLane(s, apofis, true);
    expect(power(apofis, ctxOf(s))).toBe(10);                          // 3 + 7
  });

  it("Dilúvio destrói sem absorver", () => {
    const dil = mk("diluvio");
    const s = mkState([dil, mk("carruagem")]);
    resolveDestroyOwnLane(s, dil, false);
    expect(power(dil, ctxOf(s))).toBe(7);
    expect(s.board.filter((c) => c.dying)).toHaveLength(1);
  });
});

/* ------------------------------- Sekhmet ------------------------------------ */
describe("Sekhmet", () => {
  it("destrói custo 1 dos DOIS lados e dispara a Múmia", () => {
    const sek = mk("sekhmet");
    const s = mkState([sek, mk("mumia"), mk("arqueiro", { owner: 1, lane: 2 })]);
    resolveSekhmet(s, sek, 1);
    expect(s.board.filter((c) => c.dying)).toHaveLength(2);
    expect(s.hand[0]).toHaveLength(1);                                 // Múmia voltou (4)
    expect(s.hand[0][0].printed + s.hand[0][0].baked).toBe(4);
  });
});

/* ------------------------------- Armadura ----------------------------------- */
describe("Armadura de Ptah", () => {
  it("funde-se com o aliado da via e some", () => {
    const arm = mk("armadura");
    const alvo = mk("servo");
    const s = mkState([arm, alvo]);
    resolveArmadura(s, arm);
    expect(arm.dying).toBeTruthy();
    expect(power(alvo, ctxOf(s))).toBe(4);                             // 1 + 3
  });
});

/* ---------------------------- Selo do Silêncio ------------------------------ */
describe("Selo do Silêncio", () => {
  it("bloqueia Ao Entrar inimigo na mesma via", () => {
    const selo = mk("selo", { owner: 1 });
    const chegando = mk("hathor", { revealed: false });
    expect(onEnterBlocked(chegando, [selo, chegando])).toBe(true);
  });
  it("não bloqueia aliados nem outras vias", () => {
    const selo = mk("selo", { owner: 1, lane: 2 });
    const chegando = mk("hathor", { revealed: false });
    expect(onEnterBlocked(chegando, [selo, chegando])).toBe(false);
    const seloAliado = mk("selo");
    expect(onEnterBlocked(chegando, [seloAliado, chegando])).toBe(false);
  });
});

/* ------------------------------- Vitória ------------------------------------ */
describe("laneWins()", () => {
  it("conta vias por maior soma; empate não pontua", () => {
    const s = mkState([
      mk("colosso"),                                  // via 0: A 14 × 0
      mk("colosso", { owner: 1, lane: 1 }),           // via 1: 0 × B 14
      mk("servo", { lane: 2 }), mk("servo", { owner: 1, lane: 2 }), // via 2: 1 × 1
    ]);
    expect(laneWins(s)).toEqual([1, 1]);
  });
});
