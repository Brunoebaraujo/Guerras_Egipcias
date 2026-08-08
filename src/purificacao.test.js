import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, resolvePurificacao, resolveServoDoMel,
  resetUid, nextUid, LANE_CAP, emJogo, ocupacaoDaVia,
} from "./engine.js";
import { freshMatch, applyAction, autoReveal, jogouNaVia } from "./match.js";

/* ==========================================================================
   PURIFICAÇÃO DO NILO — Ao Entrar: suas cartas com Poder atual <= 0 passam ao
   controle do adversário; o que não couber lá é destruído.

   É a resposta ao apodrecimento da Mosca, e a razão de o -1 dela não ter piso:
   Poder negativo deixou de ser lixo parado no tabuleiro e virou munição.
   ========================================================================== */

const DEF = byKey.purificacao;

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = [], over = {}) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], deck: [[], []], round: 1, energy: [9, 9],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0],
  playsLane: [[0, 0, 0], [0, 0, 0]], blessings: [], ...over,
});
const primeiro = () => 0;
const maldicao = (n) => Array.from({ length: n }, () => ({ src: "Mosca", val: -1, inert: false }));
const encher = (board, side) => {
  for (let lane = 0; lane < 3; lane++)
    for (let i = 0; i < LANE_CAP; i++) board.push(mk("servo", { owner: side, lane }));
};

beforeEach(resetUid);

describe("quem é elegível", () => {
  it("move carta em Poder exatamente 0", () => {
    const p = mk("purificacao", { lane: 0 });
    const zerada = mk("servo", { owner: 0, lane: 0, mods: maldicao(1) });   // 1 − 1 = 0
    const s = mkState([p, zerada]);
    resolvePurificacao(s, p, DEF, primeiro);
    expect(zerada.owner).toBe(1);
  });

  it("move carta em Poder negativo", () => {
    const p = mk("purificacao", { lane: 0 });
    const podre = mk("arqueiro", { owner: 0, lane: 0, mods: maldicao(5) });   // 3 − 5 = −2
    const s = mkState([p, podre]);
    resolvePurificacao(s, p, DEF, primeiro);
    expect(podre.owner).toBe(1);
  });

  it("não move carta positiva", () => {
    const p = mk("purificacao", { lane: 0 });
    const sadia = mk("colosso", { owner: 0, lane: 0 });
    const s = mkState([p, sadia]);
    const badge = resolvePurificacao(s, p, DEF, primeiro);
    expect(sadia.owner).toBe(0);
    expect(badge.kind).toBe("block");
  });

  /* O critério é Poder ATUAL, não impresso: uma Mosca 0/0 que recebeu bênção
     está a salvo, e um Colosso corroído não está. */
  it("usa o Poder atual, não o impresso", () => {
    const p = mk("purificacao", { lane: 0 });
    const moscaBuffada = mk("token-mosca", { owner: 0, lane: 0, mods: [{ src: "Hathor", val: 2 }] });
    const colossoPodre = mk("colosso", { owner: 0, lane: 1, mods: maldicao(14) });
    const s = mkState([p, moscaBuffada, colossoPodre]);
    resolvePurificacao(s, p, DEF, primeiro);
    expect(moscaBuffada.owner).toBe(0);
    expect(colossoPodre.owner).toBe(1);
  });

  it("não toca nas cartas do adversário, nem na própria Purificação", () => {
    const p = mk("purificacao", { lane: 0 });
    const inimigaPodre = mk("servo", { owner: 1, lane: 0, mods: maldicao(3) });
    const s = mkState([p, inimigaPodre]);
    resolvePurificacao(s, p, DEF, primeiro);
    expect(inimigaPodre.owner).toBe(1);
    expect(p.owner).toBe(0);
  });

  it("carta ainda não revelada não é elegível", () => {
    const p = mk("purificacao", { lane: 0 });
    const oculta = mk("servo", { owner: 0, lane: 0, revealed: false, mods: maldicao(3) });
    const s = mkState([p, oculta]);
    resolvePurificacao(s, p, DEF, primeiro);
    expect(oculta.owner).toBe(0);
  });
});

describe("a carta chega inteira", () => {
  it("preserva mods, faixa e venenos — não volta ao Poder impresso", () => {
    const p = mk("purificacao", { lane: 0 });
    const carga = mk("arqueiro", {
      owner: 0, lane: 0, baked: 2, venenos: [1, 2],
      mods: [{ src: "Hathor", val: 3 }, ...maldicao(8)],
    });
    const s = mkState([p, carga]);
    resolvePurificacao(s, p, DEF, primeiro);
    expect(carga.owner).toBe(1);
    expect(carga.baked).toBe(2);
    expect(carga.venenos).toEqual([1, 2]);
    expect(power(carga, ctxOf(s))).toBe(0);   // 3 + 2 + 3 − 8
  });

  it("reancora entryPlays no contador do novo dono (a conta da Ammit)", () => {
    const p = mk("purificacao", { lane: 0 });
    const podre = mk("servo", { owner: 0, lane: 0, mods: maldicao(1), entryPlays: 7 });
    const s = mkState([p, podre], { plays: [7, 2] });
    resolvePurificacao(s, p, DEF, primeiro);
    expect(podre.entryPlays).toBe(2);
  });
});

describe("falta de espaço no campo adversário", () => {
  it("destrói o excedente pelo pipeline normal", () => {
    const p = mk("purificacao", { lane: 0 });
    const board = [p];
    encher(board, 1);                       // adversário sem nenhum espaço
    const podre = mk("servo", { owner: 0, lane: 0, mods: maldicao(1) });
    board.push(podre);
    const s = mkState(board);
    resolvePurificacao(s, p, DEF, primeiro);
    expect(podre.owner).toBe(0);
    expect(podre.dying).toBeTruthy();
    expect(s.deaths[0]).toBe(1);            // conta como destruição do dono antigo
  });

  it("transfere o que cabe e afoga o resto", () => {
    const p = mk("purificacao", { lane: 0 });
    const board = [p];
    // Deixa exatamente 1 vaga no campo do adversário.
    for (let lane = 0; lane < 3; lane++)
      for (let i = 0; i < LANE_CAP - (lane === 2 ? 1 : 0); i++) board.push(mk("servo", { owner: 1, lane }));
    const podres = [0, 1, 2].map((lane) => mk("servo", { owner: 0, lane, mods: maldicao(1) }));
    board.push(...podres);
    const s = mkState(board);
    const badge = resolvePurificacao(s, p, DEF, primeiro);
    expect(podres.filter((c) => c.owner === 1)).toHaveLength(1);
    expect(podres.filter((c) => c.dying)).toHaveLength(2);
    expect(badge.text).toContain("☥2");
  });

  it("o Osíris do adversário cresce com os afogamentos", () => {
    const p = mk("purificacao", { lane: 0 });
    const board = [p];
    encher(board, 1);
    const osiris = board[0];   // sem espaço; usa uma das cartas do lado 1
    board.push(mk("servo", { owner: 0, lane: 0, mods: maldicao(1) }));
    const s = mkState(board);
    const antes = s.deaths[0] + s.deaths[1];
    resolvePurificacao(s, p, DEF, primeiro);
    expect(s.deaths[0] + s.deaths[1]).toBe(antes + 1);
    expect(emJogo(osiris)).toBe(true);
  });
});

describe("transferência não é jogada", () => {
  /* O caso citado no brief: uma carta que CHEGA na via do Servo não salva o
     lado da Mosca, porque ninguém a jogou ali. */
  it("não marca a via como jogada — o Servo Coberto de Mel continua punindo", () => {
    const p = mk("purificacao", { lane: 0 });
    const servo = mk("servo-mel", { owner: 1, lane: 2 });
    const podre = mk("token-mosca", { owner: 0, lane: 0 });   // 0/0: elegível
    const s = mkState([p, servo, podre]);
    // rng no fim da faixa: a carta transferida cai na última via com espaço.
    resolvePurificacao(s, p, DEF, () => 0.99);
    expect(podre.owner).toBe(1);
    expect(podre.lane).toBe(2);                 // chegou na via do Servo
    expect(jogouNaVia(s, 1, 2)).toBe(false);    // e mesmo assim ninguém jogou ali
    resolveServoDoMel(s, servo, byKey["servo-mel"], primeiro);
    expect(s.board.filter((c) => c.key === "token-mosca" && c.owner === 1)).toHaveLength(2);
  });

  it("não incrementa o contador de jogadas de ninguém", () => {
    const p = mk("purificacao", { lane: 0 });
    const podre = mk("servo", { owner: 0, lane: 0, mods: maldicao(1) });
    const s = mkState([p, podre], { plays: [3, 4] });
    resolvePurificacao(s, p, DEF, primeiro);
    expect(s.plays).toEqual([3, 4]);
  });
});

describe("a carta é efêmera", () => {
  it("resolve e deixa o campo sem morrer nem ocupar espaço", () => {
    const lista = ["purificacao", "arqueiro", "lanceiro", "carruagem", "guardareal", "general",
                   "colosso", "hathor", "heka", "amon", "sobek", "osiris"];
    const meio = { rng: () => 0.5 };
    let g = freshMatch([lista, lista], meio);
    g.energy = [9, 9];
    const naMao = g.hand[0].find((h) => h.key === "purificacao");
    g = applyAction(g, { t: "place", side: 0, hid: naMao.hid, lane: 0 }, meio).state;
    g = applyAction(g, { t: "startReveal" }, meio).state;
    // Logo após resolver ela está marcada como gasta, e a varredura do passo
    // seguinte a tira do tabuleiro — o mesmo caminho das Pragas.
    const meia = applyAction(g, { t: "step" }, meio).state;
    const gasta = meia.board.find((c) => c.key === "purificacao");
    expect(gasta.dying).toBeTruthy();
    expect(gasta.spent).toBe(true);

    g = autoReveal(g, meio).state;
    expect(g.board.some((c) => c.key === "purificacao")).toBe(false);
    expect(g.deaths).toEqual([0, 0]);          // sair do campo não é morrer
    expect(ocupacaoDaVia(g.board, 0, 0)).toBe(0);   // e não deixou espaço ocupado
  });
});

describe("a definição da carta", () => {
  it("é um Encantamento efêmero de custo 4", () => {
    expect(DEF.tipo).toBe("Encantamento");
    expect(DEF.custo).toBe(4);
    expect(DEF.efemera).toBe(true);
    expect(DEF.efeitos).toEqual([{ id: "banishNonPositiveToEnemy" }]);
  });
});
