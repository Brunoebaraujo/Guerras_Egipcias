import { describe, it, expect } from "vitest";
import { freshMatch, applyAction, autoReveal } from "./match.js";
import { byKey, nextUid } from "./engine.js";

describe("Sia — transferência automática de Poder", () => {
  const revelar = (s) => autoReveal(s, { rng: () => 0 }).state;

  /* Injeta a carta direto na mão, com a mesma forma que drawOne() produz —
     evita depender da ordem do embaralhamento (que shuffledR(rng=()=>0) NÃO
     preserva como identidade) só para garantir determinismo no teste. */
  function giveCard(s, side, key) {
    s.hand[side].push({ hid: nextUid(s), key, printed: byKey[key].poder, baked: 0 });
    return s;
  }

  function place(s, side, key, lane) {
    const h = s.hand[side].find((c) => c.key === key);
    expect(h, `carta ${key} deveria estar na mão do lado ${side}`).toBeTruthy();
    const r = applyAction(s, { t: "place", side, hid: h.hid, lane });
    expect(r.error).toBeUndefined();
    return r.state;
  }

  /* Baralhos com energia sobrando para não travar em custo (Sia custa 4). */
  const deckA = ["arqueiro", "arqueiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"];
  const deckB = ["servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"];

  it("Sia se arma sozinha ao ser POSICIONADA (sem precisar de toggleActivate); se for a última jogada da rodada, fica esperando a rodada seguinte", () => {
    let s = freshMatch([deckA, deckB], { rng: () => 0 });
    // Avança até a Rodada 4 (energia 4) pra poder pagar a Sia.
    while (s.round < 4) { s = revelar(applyAction(s, { t: "startReveal" }).state); s = applyAction(s, { t: "nextRound" }).state; }

    s = giveCard(s, 0, "sia");
    s = place(s, 0, "sia", 0); // custa 4, esgota a energia da rodada — nada mais é jogado
    // Já arma no place(), antes mesmo da revelação.
    expect(s.board.find((c) => c.key === "sia").aguardandoProxima).toBe(true);
    s = revelar(applyAction(s, { t: "startReveal" }).state);

    const sia = s.board.find((c) => c.key === "sia");
    expect(sia.aguardandoProxima).toBe(true); // ninguém foi jogado depois dela — segue esperando
    expect(sia.jaBufou).toBeFalsy();
    expect(sia.mods.length).toBe(0);
  });

  it("Uma carta jogada DEPOIS da Sia na MESMA rodada recebe a cópia do Poder (regressão do bug de agosto/2026)", () => {
    let s = freshMatch([deckA, deckB], { rng: () => 0 });
    while (s.round < 6) { s = revelar(applyAction(s, { t: "startReveal" }).state); s = applyAction(s, { t: "nextRound" }).state; }

    s = giveCard(s, 0, "sia");
    s = place(s, 0, "sia", 0); // via 1
    s = place(s, 0, "arqueiro", 1); // via 2, jogado DEPOIS da Sia, mesma rodada
    s = revelar(applyAction(s, { t: "startReveal" }).state);

    const arq = s.board.find((c) => c.key === "arqueiro" && c.revealed);
    expect(arq.mods.some((m) => m.src.includes("Sia") && m.val === 2)).toBe(true);

    const sia = s.board.find((c) => c.key === "sia" && c.revealed);
    expect(sia.jaBufou).toBe(true);
    expect(sia.aguardandoProxima).toBe(false);
  });

  it("Uma carta jogada ANTES da Sia na mesma rodada NÃO recebe o bônus (ordem de jogada importa)", () => {
    let s = freshMatch([deckA, deckB], { rng: () => 0 });
    while (s.round < 6) { s = revelar(applyAction(s, { t: "startReveal" }).state); s = applyAction(s, { t: "nextRound" }).state; }

    s = place(s, 0, "arqueiro", 1); // jogado ANTES da Sia
    s = giveCard(s, 0, "sia");
    s = place(s, 0, "sia", 0);
    s = revelar(applyAction(s, { t: "startReveal" }).state);

    const arq = s.board.find((c) => c.key === "arqueiro" && c.revealed);
    expect(arq.mods.some((m) => m.src.includes("Sia"))).toBe(false);

    const sia = s.board.find((c) => c.key === "sia" && c.revealed);
    expect(sia.aguardandoProxima).toBe(true); // ninguém elegível ainda — segue esperando a próxima rodada
  });

  it("A primeira carta jogada na rodada SEGUINTE recebe a cópia do Poder da Sia", () => {
    let s = freshMatch([deckA, deckB], { rng: () => 0 });
    while (s.round < 4) { s = revelar(applyAction(s, { t: "startReveal" }).state); s = applyAction(s, { t: "nextRound" }).state; }

    s = giveCard(s, 0, "sia");
    s = place(s, 0, "sia", 0);
    s = revelar(applyAction(s, { t: "startReveal" }).state);
    s = applyAction(s, { t: "nextRound" }).state;

    s = place(s, 0, "arqueiro", 1);
    s = revelar(applyAction(s, { t: "startReveal" }).state);

    const arq = s.board.find((c) => c.key === "arqueiro" && c.revealed);
    expect(arq.mods.some((m) => m.src.includes("Sia") && m.val === 2)).toBe(true);

    const sia = s.board.find((c) => c.key === "sia");
    expect(sia.mods.length).toBe(0); // mantém o próprio poder — é cópia, não perda
    expect(sia.jaBufou).toBe(true);
    expect(sia.aguardandoProxima).toBe(false);
  });

  it("Sia não buffa outra Sia (guarda de espécie), preservando a regra original do Hu", () => {
    const deckDuasSias = ["sia", "sia", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"];
    let s = freshMatch([deckDuasSias, deckB], { rng: () => 0 });
    while (s.round < 4) { s = revelar(applyAction(s, { t: "startReveal" }).state); s = applyAction(s, { t: "nextRound" }).state; }

    s = giveCard(s, 0, "sia");
    s = place(s, 0, "sia", 0);
    s = revelar(applyAction(s, { t: "startReveal" }).state);
    s = applyAction(s, { t: "nextRound" }).state;

    s = giveCard(s, 0, "sia");
    s = place(s, 0, "sia", 1);
    s = revelar(applyAction(s, { t: "startReveal" }).state);

    const sias = s.board.filter((c) => c.key === "sia");
    const sia2 = sias.find((c) => c.enteredRound === s.round);
    expect(sia2.mods.length).toBe(0);
    const sia1 = sias.find((c) => c.uid !== sia2.uid);
    expect(sia1.aguardandoProxima).toBe(true); // segue armada, esperando uma carta que não seja "sia"
  });

  it("Combo cruzado: Sia entrega para Hu (que ainda não foi ativado) e Hu, ativado depois, entrega adiante", () => {
    let s = freshMatch([deckA, deckB], { rng: () => 0 });
    while (s.round < 4) { s = revelar(applyAction(s, { t: "startReveal" }).state); s = applyAction(s, { t: "nextRound" }).state; }

    s = giveCard(s, 0, "sia");
    s = place(s, 0, "sia", 0);
    s = revelar(applyAction(s, { t: "startReveal" }).state);
    s = applyAction(s, { t: "nextRound" }).state;

    s = giveCard(s, 0, "hu");
    s = place(s, 0, "hu", 1);
    s = revelar(applyAction(s, { t: "startReveal" }).state);

    let hu = s.board.find((c) => c.key === "hu" && c.revealed);
    // Hu (poder 3) recebeu +2 de Sia — não bate na guarda de espécie porque as keys diferem.
    expect(hu.mods.some((m) => m.src.includes("Sia") && m.val === 2)).toBe(true);
    // Hu não se arma sozinho — continua exigindo ativação manual.
    expect(hu.aguardandoProxima).toBeFalsy();

    // toggleActivate não é permitido enquanto a carta segue revelada NA MESMA
    // rodada em que foi jogada (regra pré-existente do Hu) — avança a rodada antes.
    s = applyAction(s, { t: "nextRound" }).state;
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: hu.uid });
    expect(r.error).toBeUndefined();
    s = r.state;
    s = applyAction(s, { t: "nextRound" }).state;

    s = place(s, 0, "arqueiro", 2);
    s = revelar(applyAction(s, { t: "startReveal" }).state);

    const arq = s.board.find((c) => c.key === "arqueiro" && c.revealed);
    // Hu tinha 3 impresso + 2 de Sia = 5.
    expect(arq.mods.some((m) => m.src.includes("Hu") && m.val === 5)).toBe(true);
  });
});
