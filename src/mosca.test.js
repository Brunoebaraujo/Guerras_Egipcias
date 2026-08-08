import { describe, it, expect, beforeEach } from "vitest";
import { byKey, power, ctxOf, resolveMosca, resetUid, nextUid } from "./engine.js";
import { freshMatch, applyAction, autoReveal } from "./match.js";

/* ==========================================================================
   MOSCA — Fim da Rodada: -1 permanente numa carta sorteada da própria via.

   A carta era compra morta no deck inimigo e virou corpo que apodrece a via.
   O que estes testes fixam é o que a torna diferente de um debuff comum: ela
   não escolhe lado, entra no próprio sorteio, e não tem piso de Poder.
   ========================================================================== */

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = [], over = {}) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], deck: [[], []], round: 1, energy: [9, 9],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0],
  playsLane: [[0, 0, 0], [0, 0, 0]], blessings: [], ...over,
});
/* rng que devolve o k-ésimo item de qualquer sorteio: é como se escolhe uma
   vítima específica sem depender da ordem interna dos filtros. */
const escolhe = (k, n) => () => k / n;

beforeEach(resetUid);

describe("a Mosca aplica exatamente um -1 por Fim da Rodada", () => {
  it("um alvo, uma vez", () => {
    const mosca = mk("token-mosca", { lane: 0 });
    const alvo = mk("colosso", { owner: 1, lane: 0 });
    const s = mkState([mosca, alvo]);
    // pool = [mosca, alvo]; escolhe o índice 1
    resolveMosca(s, mosca, byKey["token-mosca"], escolhe(1, 2));
    expect(power(alvo, ctxOf(s))).toBe(13);
    expect(alvo.mods).toHaveLength(1);
  });

  it("duas Moscas são dois sorteios independentes — podem bater na mesma carta", () => {
    const m1 = mk("token-mosca", { lane: 0 });
    const m2 = mk("token-mosca", { lane: 0 });
    const alvo = mk("colosso", { owner: 1, lane: 0 });
    const s = mkState([m1, m2, alvo]);
    const noAlvo = escolhe(2, 3);   // pool = [m1, m2, alvo]
    resolveMosca(s, m1, byKey["token-mosca"], noAlvo);
    resolveMosca(s, m2, byKey["token-mosca"], noAlvo);
    expect(power(alvo, ctxOf(s))).toBe(12);   // 14 − 1 − 1
  });
});

describe("a Mosca não distingue dono", () => {
  it("pode sortear a si mesma", () => {
    const mosca = mk("token-mosca", { lane: 0 });
    const s = mkState([mosca]);
    resolveMosca(s, mosca, byKey["token-mosca"], escolhe(0, 1));
    expect(power(mosca, ctxOf(s))).toBe(-1);
  });

  it("pode sortear outra Mosca", () => {
    const m1 = mk("token-mosca", { lane: 1 });
    const m2 = mk("token-mosca", { owner: 1, lane: 1 });
    const s = mkState([m1, m2]);
    resolveMosca(s, m1, byKey["token-mosca"], escolhe(1, 2));
    expect(power(m2, ctxOf(s))).toBe(-1);
  });

  it("pode atingir uma carta do próprio dono", () => {
    const mosca = mk("token-mosca", { owner: 0, lane: 2 });
    const aliado = mk("arqueiro", { owner: 0, lane: 2 });
    const s = mkState([mosca, aliado]);
    resolveMosca(s, mosca, byKey["token-mosca"], escolhe(1, 2));
    expect(power(aliado, ctxOf(s))).toBe(2);   // 3 − 1
  });

  it("não alcança outra via", () => {
    const mosca = mk("token-mosca", { lane: 0 });
    const longe = mk("colosso", { owner: 1, lane: 2 });
    const s = mkState([mosca, longe]);
    resolveMosca(s, mosca, byKey["token-mosca"], escolhe(0, 1));
    expect(power(longe, ctxOf(s))).toBe(14);
    expect(power(mosca, ctxOf(s))).toBe(-1);   // sobrou ela mesma
  });
});

describe("o Poder não tem piso", () => {
  it("uma carta pode ficar negativa por acúmulo", () => {
    const mosca = mk("token-mosca", { lane: 0 });
    const fraco = mk("servo", { owner: 1, lane: 0 });   // impresso 1
    const s = mkState([mosca, fraco]);
    const noFraco = escolhe(1, 2);
    for (let i = 0; i < 4; i++) resolveMosca(s, mosca, byKey["token-mosca"], noFraco);
    expect(power(fraco, ctxOf(s))).toBe(-3);
  });
});

describe("regras gerais do motor continuam valendo", () => {
  it("carta ainda não revelada não entra no sorteio", () => {
    const mosca = mk("token-mosca", { lane: 0 });
    const oculta = mk("colosso", { owner: 1, lane: 0, revealed: false });
    const s = mkState([mosca, oculta]);
    resolveMosca(s, mosca, byKey["token-mosca"], escolhe(0, 1));
    expect(power(oculta, ctxOf(s))).toBe(14);
    expect(power(mosca, ctxOf(s))).toBe(-1);
  });

  /* Sortear é escolher, e o Gato bloqueia escolha inimiga. A Mosca nunca fica
     sem alvo por causa disso: ela própria continua no bolo. */
  it("o Gato Egípcio protege o lado dele da Mosca adversária", () => {
    const mosca = mk("token-mosca", { owner: 0, lane: 0 });
    const gato = mk("gato", { owner: 1, lane: 0 });
    const abrigada = mk("colosso", { owner: 1, lane: 0 });
    const s = mkState([mosca, gato, abrigada]);
    resolveMosca(s, mosca, byKey["token-mosca"], escolhe(0, 1));
    expect(power(abrigada, ctxOf(s))).toBe(14);
    expect(power(mosca, ctxOf(s))).toBe(-1);
  });
});

/* Os testes acima chamam o resolver direto. Este prova a LIGAÇÃO: uma Mosca
   parada no tabuleiro dispara sozinha na virada da rodada, sem ninguém a
   chamar — que é o comportamento que o jogador vê. */
describe("integração com a virada de rodada", () => {
  it("a Mosca age sozinha no nextRound, e de novo na rodada seguinte", () => {
    const lista = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general",
                   "colosso", "hathor", "heka", "amon", "sobek", "osiris"];
    const meio = { rng: () => 0.5 };
    let g = freshMatch([lista, lista], meio);
    // Planta uma Mosca sozinha na Via 0 do lado A, já revelada.
    g.board.push({
      uid: nextUid(g), key: "token-mosca", owner: 0, lane: 0, revealed: true, dying: false,
      printed: 0, baked: 0, mods: [], entryPlays: 0, enteredRound: 1, moved: false, token: true,
    });
    g = applyAction(g, { t: "startReveal" }, meio).state;
    g = autoReveal(g, meio).state;
    g = applyAction(g, { t: "nextRound" }, meio).state;
    const mosca = g.board.find((c) => c.key === "token-mosca");
    expect(power(mosca, ctxOf(g))).toBe(-1);   // sozinha na via: comeu a si mesma

    g = applyAction(g, { t: "startReveal" }, meio).state;
    g = autoReveal(g, meio).state;
    g = applyAction(g, { t: "nextRound" }, meio).state;
    expect(power(g.board.find((c) => c.key === "token-mosca"), ctxOf(g))).toBe(-2);
  });
});

describe("a definição da carta", () => {
  it("continua 1/0 — a Sekhmet tem de alcançá-la", () => {
    expect(byKey["token-mosca"].custo).toBe(1);
    expect(byKey["token-mosca"].poder).toBe(0);
  });

  it("declara o efeito de Fim de Rodada", () => {
    expect(byKey["token-mosca"].trigger).toBe("fim");
    expect(byKey["token-mosca"].efeitos).toEqual([{ id: "endRoundCurseLane", value: -1 }]);
  });
});
