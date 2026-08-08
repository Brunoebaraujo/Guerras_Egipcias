import { describe, it, expect } from "vitest";
import { freshMatch, applyAction, autoReveal, jogouNaVia } from "./match.js";
import { temEfeitoDeFase } from "./domain/effects/index.js";
import { byKey } from "./engine.js";

/* ==========================================================================
   FIM DE RODADA — infraestrutura.

   Duas peças novas, e este arquivo cobre só elas (as cartas que as usam têm
   arquivo próprio):

     1. `s.playsLane[lado][via]` — quantas cartas AQUELE lado colocou NAQUELA
        via NESTA rodada. É a definição de "jogar uma carta na via" para o
        motor inteiro, e o que ela deliberadamente NÃO conta é metade do valor
        dela: ficha invocada, carta empurrada pelo Set, Escaravelho que se
        move. Nada disso é uma jogada.

     2. A fase `endRound`, resolvida no `nextRound` antes de a rodada virar.
   ========================================================================== */

const LISTA = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general",
               "colosso", "hathor", "heka", "amon", "sobek", "osiris"];
const partida = () => freshMatch([LISTA, LISTA], { rng: () => 0.5 });
const meio = { rng: () => 0.5 };

/* Coloca a primeira carta da mão que o lado consegue pagar. Devolve o estado. */
function colocar(g, side, lane) {
  const h = g.hand[side].find((c) => byKey[c.key].custo <= g.energy[side]);
  const r = applyAction(g, { t: "place", side, hid: h.hid, lane }, meio);
  expect(r.error).toBeFalsy();
  return r.state;
}

function passarRodada(g) {
  g = applyAction(g, { t: "startReveal" }, meio).state;
  g = autoReveal(g, meio).state;
  return applyAction(g, { t: "nextRound" }, meio).state;
}

describe("contagem de jogadas por via e por lado", () => {
  it("nasce zerada nos dois lados e nas três vias", () => {
    expect(partida().playsLane).toEqual([[0, 0, 0], [0, 0, 0]]);
  });

  it("colocar marca a via daquele lado, e só ela", () => {
    const g = colocar(partida(), 0, 1);
    expect(jogouNaVia(g, 0, 1)).toBe(true);
    expect(jogouNaVia(g, 0, 0)).toBe(false);
    expect(jogouNaVia(g, 0, 2)).toBe(false);
    // O outro lado é uma contagem inteiramente separada.
    expect(jogouNaVia(g, 1, 1)).toBe(false);
  });

  it("os dois lados podem marcar a mesma via de forma independente", () => {
    let g = colocar(partida(), 0, 2);
    g = colocar(g, 1, 2);
    expect(jogouNaVia(g, 0, 2)).toBe(true);
    expect(jogouNaVia(g, 1, 2)).toBe(true);
  });

  it("recolher desfaz a marca", () => {
    let g = colocar(partida(), 0, 0);
    const posta = g.board.find((c) => c.owner === 0);
    g = applyAction(g, { t: "pickup", side: 0, uid: posta.uid }, meio).state;
    expect(jogouNaVia(g, 0, 0)).toBe(false);
  });

  it("duas cartas na mesma via: recolher uma NÃO apaga a marca da outra", () => {
    let g = colocar(partida(), 0, 0);
    g = colocar(g, 0, 0);
    const primeira = g.board.find((c) => c.owner === 0);
    g = applyAction(g, { t: "pickup", side: 0, uid: primeira.uid }, meio).state;
    expect(jogouNaVia(g, 0, 0)).toBe(true);
  });

  it("reiniciar o planejamento devolve a contagem a zero", () => {
    let g = colocar(partida(), 0, 0);
    g = colocar(g, 0, 1);
    g = applyAction(g, { t: "resetPlan", side: 0 }, meio).state;
    expect(g.playsLane[0]).toEqual([0, 0, 0]);
  });

  it("a contagem zera na virada da rodada", () => {
    let g = colocar(partida(), 0, 1);
    g = passarRodada(g);
    expect(g.round).toBe(2);
    expect(g.playsLane).toEqual([[0, 0, 0], [0, 0, 0]]);
  });

  /* A carta continua NA VIA na rodada seguinte, mas ninguém jogou ali nesta
     rodada. É a distinção inteira entre este contador e uma varredura do
     tabuleiro. */
  it("carta que sobrou de uma rodada anterior não marca a rodada nova", () => {
    let g = colocar(partida(), 0, 1);
    g = passarRodada(g);
    expect(g.board.some((c) => c.owner === 0 && c.lane === 1)).toBe(true);
    expect(jogouNaVia(g, 0, 1)).toBe(false);
  });
});

describe("a fase de Fim de Rodada", () => {
  it("nenhuma carta da coleção declara efeito de Fim de Rodada por acidente", () => {
    // Guarda de fase: quem entrar aqui no futuro entra de propósito.
    const comFase = Object.values(byKey).filter((d) => temEfeitoDeFase(d, "endRound"));
    expect(comFase.every((d) => d.trigger === "fim")).toBe(true);
  });

  it("uma rodada sem fontes de Fim de Rodada avança normalmente", () => {
    let g = colocar(partida(), 0, 0);
    g = passarRodada(g);
    expect(g.round).toBe(2);
    expect(g.phase).toBe("plan");
  });

  /* A rodada 6 não avança: ela apura. O gancho tem de disparar mesmo assim,
     senão todo efeito de Fim de Rodada perde a última rodada — justamente a
     que decide a partida. */
  it("a rodada 6 encerra a partida passando pelo Fim de Rodada", () => {
    let g = partida();
    for (let i = 0; i < 6; i++) g = passarRodada(g);
    expect(g.finished).toBe(true);
  });
});
