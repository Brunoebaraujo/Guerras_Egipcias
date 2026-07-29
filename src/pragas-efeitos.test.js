import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, custoDe, power, ctxOf, resolvePraga, resolveDestroyAllOfTypeInLane,
  resetUid, nextUid,
} from "./engine.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = [], over = {}) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], deck: [[], []], round: 1, energy: [9, 9],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0], ...over,
});
const naMao = (key, custoMod = 0) => ({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0, custoMod });
const primeiro = () => 0;   // rng determinístico: sempre o primeiro do sorteio

beforeEach(resetUid);

/* ==========================================================================
   Águas em Sangue (-1) e Nuvem de Gafanhotos (-2) — uma vítima por via.
   ========================================================================== */
describe("Águas em Sangue", () => {
  it("dá -1 a uma carta inimiga em cada via ocupada", () => {
    const praga = mk("sangue", { owner: 0, lane: 0 });
    const a = mk("colosso", { owner: 1, lane: 0 });
    const b = mk("colosso", { owner: 1, lane: 1 });
    const c = mk("colosso", { owner: 1, lane: 2 });
    const s = mkState([praga, a, b, c]);
    resolvePraga(s, praga, primeiro);
    for (const v of [a, b, c]) expect(power(v, ctxOf(s))).toBe(13);
  });

  it("via inimiga vazia não desperdiça o efeito das outras", () => {
    const praga = mk("sangue", { lane: 2 });
    const a = mk("colosso", { owner: 1, lane: 0 });
    const s = mkState([praga, a]);
    const badge = resolvePraga(s, praga, primeiro);
    expect(power(a, ctxOf(s))).toBe(13);
    expect(badge.text).toContain("×1");
  });

  it("atinge só um alvo por via, mesmo com a via cheia", () => {
    const praga = mk("sangue", { lane: 1 });
    const cheia = [0, 1, 2, 3].map(() => mk("colosso", { owner: 1, lane: 0 }));
    const s = mkState([praga, ...cheia]);
    resolvePraga(s, praga, primeiro);
    const feridas = cheia.filter((c) => power(c, ctxOf(s)) === 13);
    expect(feridas).toHaveLength(1);
  });

  it("não toca nas próprias cartas", () => {
    const praga = mk("sangue");
    const aliado = mk("colosso", { owner: 0, lane: 1 });
    const s = mkState([praga, aliado]);
    resolvePraga(s, praga, primeiro);
    expect(power(aliado, ctxOf(s))).toBe(14);
  });

  it("sem carta inimiga alguma, devolve badge de bloqueio", () => {
    const praga = mk("sangue");
    const s = mkState([praga]);
    expect(resolvePraga(s, praga, primeiro).kind).toBe("block");
  });

  it("o debuff é permanente: fica gravado em mods", () => {
    const praga = mk("sangue");
    const alvo = mk("colosso", { owner: 1 });
    const s = mkState([praga, alvo]);
    resolvePraga(s, praga, primeiro);
    expect(alvo.mods).toHaveLength(1);
    expect(alvo.mods[0].val).toBe(-1);
  });

  it("alcança carta ainda por revelar — quem tem prioridade acerta primeiro", () => {
    const praga = mk("sangue");
    const oculta = mk("colosso", { owner: 1, revealed: false });
    const s = mkState([praga, oculta]);
    resolvePraga(s, praga, primeiro);
    expect(oculta.mods[0].val).toBe(-1);
  });
});

describe("Nuvem de Gafanhotos", () => {
  it("dá -2 por via — o dobro do Sangue, a três vezes o custo", () => {
    const praga = mk("gafanhotos");
    const a = mk("colosso", { owner: 1, lane: 0 });
    const b = mk("colosso", { owner: 1, lane: 2 });
    const s = mkState([praga, a, b]);
    resolvePraga(s, praga, primeiro);
    expect(power(a, ctxOf(s))).toBe(12);
    expect(power(b, ctxOf(s))).toBe(12);
  });

  it("pode levar uma carta a Poder negativo", () => {
    const praga = mk("gafanhotos");
    const fraco = mk("servo", { owner: 1 });   // Poder 1
    const s = mkState([praga, fraco]);
    resolvePraga(s, praga, primeiro);
    expect(power(fraco, ctxOf(s))).toBe(-1);
  });
});

/* ==========================================================================
   Praga dos Piolhos — agrava o custo de uma carta na mão inimiga.
   ========================================================================== */
describe("Praga dos Piolhos", () => {
  it("aumenta em 1 o custo de uma carta na mão do adversário", () => {
    const praga = mk("piolhos");
    const h = naMao("colosso");
    const s = mkState([praga], { hand: [[], [h]] });
    resolvePraga(s, praga, primeiro);
    expect(h.custoMod).toBe(1);
    expect(custoDe(h)).toBe(7);
  });

  it("acumula quando a mesma carta é agravada duas vezes", () => {
    const praga = mk("piolhos");
    const h = naMao("arqueiro");
    const s = mkState([praga], { hand: [[], [h]] });
    resolvePraga(s, praga, primeiro);
    resolvePraga(s, praga, primeiro);
    expect(custoDe(h)).toBe(3);
  });

  it("não mexe na própria mão", () => {
    const praga = mk("piolhos", { owner: 0 });
    const minha = naMao("colosso");
    const dele = naMao("colosso");
    const s = mkState([praga], { hand: [[minha], [dele]] });
    resolvePraga(s, praga, primeiro);
    expect(minha.custoMod).toBe(0);
    expect(dele.custoMod).toBe(1);
  });

  it("mão vazia devolve badge de bloqueio", () => {
    const praga = mk("piolhos");
    const s = mkState([praga]);
    expect(resolvePraga(s, praga, primeiro).kind).toBe("block");
  });

  it("agravar salva a carta da Sekhmet quando ela sai da faixa de custo 1", () => {
    const praga = mk("piolhos");
    const h = naMao("arqueiro");             // custo 1
    const s = mkState([praga], { hand: [[], [h]] });
    resolvePraga(s, praga, primeiro);
    expect(custoDe(h)).toBe(2);              // fora do alcance da Sekhmet
  });
});

/* ==========================================================================
   Praga das Moscas — polui o deck inimigo.
   ========================================================================== */
describe("Praga das Moscas", () => {
  it("embaralha duas Moscas no deck do adversário", () => {
    const praga = mk("moscas", { owner: 0 });
    const s = mkState([praga], { deck: [["servo"], ["colosso", "general", "amon"]] });
    resolvePraga(s, praga, primeiro);
    expect(s.deck[1]).toHaveLength(5);
    expect(s.deck[1].filter((k) => k === "token-mosca")).toHaveLength(2);
  });

  it("não toca no próprio deck", () => {
    const praga = mk("moscas", { owner: 0 });
    const s = mkState([praga], { deck: [["servo", "servo"], ["colosso"]] });
    resolvePraga(s, praga, primeiro);
    expect(s.deck[0]).toEqual(["servo", "servo"]);
  });

  it("funciona com deck vazio — as Moscas viram as próximas compras", () => {
    const praga = mk("moscas");
    const s = mkState([praga], { deck: [[], []] });
    resolvePraga(s, praga, primeiro);
    expect(s.deck[1]).toEqual(["token-mosca", "token-mosca"]);
  });

  it("a Mosca comprada é 1/0 — custa energia e não pontua", () => {
    expect(byKey["token-mosca"].custo).toBe(1);
    expect(byKey["token-mosca"].poder).toBe(0);
  });
});

/* ==========================================================================
   Peste nos Animais — destruição por tipo, com escopo de lado.
   ========================================================================== */
describe("Peste nos Animais", () => {
  it("destrói todos os Animais inimigos da via da Praga", () => {
    const praga = mk("peste", { owner: 0, lane: 1 });
    const ra1 = mk("token-ra", { owner: 1, lane: 1 });
    const ra2 = mk("token-ra", { owner: 1, lane: 1 });
    const s = mkState([praga, ra1, ra2]);
    resolvePraga(s, praga, primeiro);
    expect(ra1.dying).toBeTruthy();
    expect(ra2.dying).toBeTruthy();
    expect(s.deaths[1]).toBe(2);
  });

  it("não alcança outra via", () => {
    const praga = mk("peste", { lane: 0 });
    const longe = mk("token-ra", { owner: 1, lane: 2 });
    const s = mkState([praga, longe]);
    resolvePraga(s, praga, primeiro);
    expect(longe.dying).toBeFalsy();
  });

  it("não destrói os PRÓPRIOS Animais — escopo é inimigos", () => {
    const praga = mk("peste", { owner: 0, lane: 0 });
    const meu = mk("token-ra", { owner: 0, lane: 0 });
    const dele = mk("token-ra", { owner: 1, lane: 0 });
    const s = mkState([praga, meu, dele]);
    resolvePraga(s, praga, primeiro);
    expect(meu.dying).toBeFalsy();
    expect(dele.dying).toBeTruthy();
  });

  it("ignora quem não é Animal", () => {
    const praga = mk("peste", { lane: 0 });
    const guerreiro = mk("colosso", { owner: 1, lane: 0 });
    const s = mkState([praga, guerreiro]);
    resolvePraga(s, praga, primeiro);
    expect(guerreiro.dying).toBeFalsy();
  });

  it("o Assassino Medjay conserva o escopo antigo: limpa a via dos dois lados", () => {
    const medjay = mk("assassino-medjay", { owner: 0, lane: 0 });
    const meuDeus = mk("amon", { owner: 0, lane: 0 });
    const deusDele = mk("amon", { owner: 1, lane: 0 });
    const s = mkState([medjay, meuDeus, deusDele]);
    resolveDestroyAllOfTypeInLane(s, medjay, "Divindade");
    expect(meuDeus.dying).toBeTruthy();
    expect(deusDele.dying).toBeTruthy();
  });

  it("o Medjay agora alcança o Moisés, que voltou a ser Divindade", () => {
    const medjay = mk("assassino-medjay", { owner: 0, lane: 0 });
    const moises = mk("moises", { owner: 1, lane: 0 });
    const s = mkState([medjay, moises]);
    resolveDestroyAllOfTypeInLane(s, medjay, "Divindade");
    expect(moises.dying).toBeTruthy();
  });
});

/* ==========================================================================
   Chuva de Granizo e Fogo — destrói custo 1 e depois agrava a mão.
   ========================================================================== */
describe("Chuva de Granizo e Fogo", () => {
  it("destrói uma carta inimiga de custo 1 e agrava uma carta na mão", () => {
    const praga = mk("granizo", { owner: 0, lane: 2 });
    const alvo = mk("arqueiro", { owner: 1, lane: 0 });     // custo 1
    const h = naMao("colosso");
    const s = mkState([praga, alvo], { hand: [[], [h]] });
    resolvePraga(s, praga, primeiro);
    expect(alvo.dying).toBeTruthy();
    expect(custoDe(h)).toBe(7);
  });

  it("alcança o Moisés adversário, que é custo 1", () => {
    const praga = mk("granizo", { owner: 0 });
    const moises = mk("moises", { owner: 1, lane: 1 });
    const s = mkState([praga, moises]);
    resolvePraga(s, praga, primeiro);
    expect(moises.dying).toBeTruthy();
  });

  it("não alcança carta cujo custo foi agravado para 2", () => {
    const praga = mk("granizo", { owner: 0 });
    const salvo = mk("arqueiro", { owner: 1, lane: 1, custoMod: 1 });
    const s = mkState([praga, salvo]);
    resolvePraga(s, praga, primeiro);
    expect(salvo.dying).toBeFalsy();
  });

  it("agrava a mão mesmo quando não há custo 1 em jogo", () => {
    const praga = mk("granizo");
    const h = naMao("general");
    const s = mkState([praga], { hand: [[], [h]] });
    const badge = resolvePraga(s, praga, primeiro);
    expect(custoDe(h)).toBe(6);
    expect(badge.kind).toBe("debuff");
  });

  it("alimenta Osíris — a Praga GASTA não conta morte, mas o que ela DESTRÓI conta", () => {
    const praga = mk("granizo", { owner: 0, lane: 2 });
    const osiris = mk("osiris", { owner: 0, lane: 1 });
    const alvo = mk("arqueiro", { owner: 1, lane: 0 });
    const s = mkState([praga, osiris, alvo]);
    expect(power(osiris, ctxOf(s))).toBe(4);
    resolvePraga(s, praga, primeiro);
    expect(power(osiris, ctxOf(s))).toBe(6);
  });

  it("sem alvo em jogo e sem mão, devolve bloqueio", () => {
    const praga = mk("granizo");
    const s = mkState([praga]);
    expect(resolvePraga(s, praga, primeiro).kind).toBe("block");
  });
});

/* ==========================================================================
   Morte dos Primogênitos — a mais caro em jogo.
   ========================================================================== */
describe("Morte dos Primogênitos", () => {
  it("destrói a carta inimiga de maior custo", () => {
    const praga = mk("primogenitos", { owner: 0, lane: 2 });
    const barata = mk("servo", { owner: 1, lane: 0 });
    const caro = mk("colosso", { owner: 1, lane: 1 });       // custo 6
    const s = mkState([praga, barata, caro]);
    resolvePraga(s, praga, primeiro);
    expect(caro.dying).toBeTruthy();
    expect(barata.dying).toBeFalsy();
  });

  it("respeita o custo agravado — Piolhos pode redirecionar a praga", () => {
    const praga = mk("primogenitos", { owner: 0, lane: 2 });
    const general = mk("general", { owner: 1, lane: 0 });                  // 5
    const agravado = mk("guardareal", { owner: 1, lane: 1, custoMod: 3 }); // 4 + 3 = 7
    const s = mkState([praga, general, agravado]);
    resolvePraga(s, praga, primeiro);
    expect(agravado.dying).toBeTruthy();
    expect(general.dying).toBeFalsy();
  });

  it("empate resolve por sorteio, e destrói exatamente uma", () => {
    const praga = mk("primogenitos", { owner: 0, lane: 2 });
    const a = mk("colosso", { owner: 1, lane: 0 });
    const b = mk("colosso", { owner: 1, lane: 1 });
    const s = mkState([praga, a, b]);
    resolvePraga(s, praga, primeiro);
    expect([a, b].filter((c) => c.dying)).toHaveLength(1);
  });

  it("não olha para as próprias cartas caras", () => {
    const praga = mk("primogenitos", { owner: 0 });
    const meuColosso = mk("colosso", { owner: 0, lane: 1 });
    const seuServo = mk("servo", { owner: 1, lane: 2 });
    const s = mkState([praga, meuColosso, seuServo]);
    resolvePraga(s, praga, primeiro);
    expect(meuColosso.dying).toBeFalsy();
    expect(seuServo.dying).toBeTruthy();
  });

  it("dispara o Ao Morrer da Múmia", () => {
    const praga = mk("primogenitos", { owner: 0, lane: 2 });
    const mumia = mk("mumia", { owner: 1, lane: 0 });
    const s = mkState([praga, mumia]);
    resolvePraga(s, praga, primeiro);
    expect(s.hand[1]).toHaveLength(1);
    expect(s.hand[1][0].key).toBe("mumia");
  });

  it("campo inimigo vazio devolve bloqueio", () => {
    const praga = mk("primogenitos");
    const s = mkState([praga, mk("colosso", { owner: 0, lane: 1 })]);
    expect(resolvePraga(s, praga, primeiro).kind).toBe("block");
  });
});

/* ==========================================================================
   As três da Fase 4 continuam sem efeito, de propósito.
   ========================================================================== */
describe("Pragas ainda sem efeito (Fase 4)", () => {
  it("Rãs, Úlceras e Trevas devolvem null sem quebrar o fluxo", () => {
    for (const k of ["ras", "ulceras", "trevas"]) {
      const praga = mk(k);
      const s = mkState([praga, mk("colosso", { owner: 1 })]);
      expect(resolvePraga(s, praga, primeiro)).toBeNull();
    }
  });
});
