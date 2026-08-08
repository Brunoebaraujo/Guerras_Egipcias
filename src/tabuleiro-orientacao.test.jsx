import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { BOARD, Tabuleiro } from "./ui/game/DesktopGameComponents.jsx";
import { freshMatch } from "./match.js";
import { ctxOf } from "./engine.js";

/* Havia dois tabuleiros, `Tabuleiro` e `TabuleiroMultiplayer`, com ~85% de
   código igual. A duplicação escondia um bug: a versão online rotacionava as
   ZONAS das cartas por `viewSeat`, mas posicionava os DISCOS de placar por uma
   regra separada, que dava o resultado oposto nas DUAS orientações. Online, o
   disco ao lado das suas cartas mostrava o total do adversário.

   Estes testes travam a única coisa que os dois modos podem discordar — qual
   lado fica embaixo — e exigem que zona e disco concordem sempre. */

const DECK = ["servo", "cao", "arqueiro", "lanceiro", "carruagem", "guardareal",
  "general", "colosso", "amon", "set", "maat", "osiris"];

/** Placar assimétrico na via 0: 14 para o Lado A, 1 para o Lado B. */
function comPlacarAssimetrico() {
  const s = freshMatch([DECK, DECK], { seed: "orientacao" });
  s.board = [
    { uid: 1, key: "colosso", owner: 0, lane: 0, printed: 14, baked: 0, mods: [], revealed: true, venenos: [], enteredRound: 1 },
    { uid: 2, key: "servo", owner: 1, lane: 0, printed: 1, baked: 0, mods: [], revealed: true, venenos: [], enteredRound: 1 },
  ];
  return s;
}

const props = (g) => ({
  g, ctx: ctxOf(g), aim: null, moving: null, sel: null, planning: false,
  placeCard() {}, moveTo() {}, applyAim() {}, isAimable: () => false,
  startMove() {}, isMovable: () => false, pickUp: null, zoomBoard() {},
});

/** Metades verticais em que as zonas de carta foram desenhadas, na ordem [lado 0, lado 1]. */
const zonasDaPrimeiraVia = (html) =>
  [...html.matchAll(/top:\s*([\d.]+)%;\s*width:\s*11\.8%/g)].slice(0, 2).map((m) => parseFloat(m[1]));

/** Discos como { valor, y }, na ordem em que aparecem. */
const discos = (html) =>
  [...html.matchAll(/top:\s*([\d.]+)%[^>]*?>(?:<[^>]*>)*?(\d+)</g)]
    .map((m) => ({ y: parseFloat(m[1]), v: parseInt(m[2], 10) }));

/** O disco de valor `v` está na mesma metade que a zona em `yZona`? */
function discoAcompanhaZona(html, valor, yZona) {
  const disco = discos(html).find((d) => d.v === valor);
  expect(disco, `disco de valor ${valor} não foi renderizado`).toBeTruthy();
  const zonaEmbaixo = yZona === BOARD.zone.bot.y;
  const discoEmbaixo = disco.y === BOARD.circle.botCy;
  return zonaEmbaixo === discoEmbaixo;
}

describe("Tabuleiro — orientação", () => {
  it("mesa compartilhada (viewSeat ausente): Lado A em cima, Lado B embaixo", () => {
    const html = renderToString(<Tabuleiro {...props(comPlacarAssimetrico())} />);
    expect(zonasDaPrimeiraVia(html)).toEqual([BOARD.zone.top.y, BOARD.zone.bot.y]);
  });

  it("online: o assento de quem olha fica sempre embaixo", () => {
    const g = comPlacarAssimetrico();
    const como0 = renderToString(<Tabuleiro {...props(g)} viewSeat={0} />);
    expect(zonasDaPrimeiraVia(como0)).toEqual([BOARD.zone.bot.y, BOARD.zone.top.y]);

    const como1 = renderToString(<Tabuleiro {...props(g)} viewSeat={1} />);
    expect(zonasDaPrimeiraVia(como1)).toEqual([BOARD.zone.top.y, BOARD.zone.bot.y]);
  });

  it("a mesa compartilhada não mudou de aparência com a unificação", () => {
    // convenção histórica do solo: equivale a ter o Lado B embaixo
    const g = comPlacarAssimetrico();
    expect(renderToString(<Tabuleiro {...props(g)} />))
      .toBe(renderToString(<Tabuleiro {...props(g)} viewSeat={1} />));
  });
});

describe("Tabuleiro — disco de placar acompanha as próprias cartas", () => {
  /* REGRESSÃO: era aqui que os dois componentes divergiam. */
  it.each([
    ["mesa compartilhada", undefined],
    ["online, assento 0", 0],
    ["online, assento 1", 1],
  ])("%s: cada disco fica na metade do seu próprio lado", (_rotulo, viewSeat) => {
    const g = comPlacarAssimetrico();
    const html = renderToString(<Tabuleiro {...props(g)} viewSeat={viewSeat} />);
    const [yLadoA, yLadoB] = zonasDaPrimeiraVia(html);
    expect(discoAcompanhaZona(html, 14, yLadoA), "disco do Lado A (14) na metade errada").toBe(true);
    expect(discoAcompanhaZona(html, 1, yLadoB), "disco do Lado B (1) na metade errada").toBe(true);
  });

  it("o valor de cada disco é o placar do seu lado, e não do adversário", () => {
    const g = comPlacarAssimetrico();
    for (const viewSeat of [undefined, 0, 1]) {
      const html = renderToString(<Tabuleiro {...props(g)} viewSeat={viewSeat} />);
      const valores = discos(html).map((d) => d.v);
      expect(valores).toContain(14);   // Lado A
      expect(valores).toContain(1);    // Lado B
    }
  });
});
