import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { GameMobile } from "./ui/game/MobileGame.jsx";
import { freshMatch } from "./match.js";
import { ctxOf, laneWins } from "./engine.js";

/* ==========================================================================
   FAIXAS DE AVISO DO TABULEIRO MOBILE.

   `MBanner` era usado em quatro pontos de `MobileGame.jsx` e nunca havia sido
   declarado nem importado. Resultado: `MBanner is not defined` derrubava a tela
   inteira pela barreira de erro — a mensagem "A partida encontrou um erro".

   O defeito sobreviveu a 739 testes por uma razão específica: as três condições
   que o disparam são todas exclusivas do MOBILE e nenhuma vale na primeira
   pintura. Quem monta o tabuleiro num estado recém-criado nunca chega lá.
   Pior, era invisível para quem joga no desktop, que não passa por esse ramo.

   O caso real foi uma partida ONLINE no celular: `msg` recebe "o adversário
   está escolhendo um alvo" assim que o outro lado abre uma mira, e a tela
   morria no meio da partida.

   Estes testes montam o tabuleiro mobile EM CADA uma das três condições. É a
   cobertura que faltava, e vale para qualquer faixa que venha a ser
   acrescentada — se ela referenciar algo inexistente, um destes quebra.
   ========================================================================== */

const DECK = ["servo", "cao", "arqueiro", "lanceiro", "carruagem", "guardareal",
              "general", "colosso", "amon", "set", "maat", "osiris"];

function props(g, over = {}) {
  return {
    g, ctx: ctxOf(g), wins: laneWins(g), planning: true,
    sel: null, setSel() {}, aim: null, moving: null, msg: "", fast: false,
    startReveal() {}, setFast() {}, reset() {}, setScreen() {}, setForceView() {},
    placeCard() {}, pickUp() {}, resetPlan() {}, startMove() {}, moveTo() {},
    applyAim() {}, skipAim() {}, isAimable: () => false, isMovable: () => false,
    zoomBoard() {}, zoomHand() {},
    ...over,
  };
}
const montar = (over) => renderToString(
  React.createElement(GameMobile, props(freshMatch([DECK, DECK], { rng: () => 0.5 }), over)),
);

describe("o tabuleiro mobile monta com cada faixa de aviso", () => {
  it("sem faixa nenhuma (o caso que os testes antigos cobriam)", () => {
    expect(() => montar({})).not.toThrow();
  });

  /* Foi este que matou a partida online: no multiplayer, `msg` é preenchido
     assim que o adversário abre uma mira ou a conexão cai. */
  it("com mensagem — adversário mirando ou desconectado", () => {
    const saida = montar({ msg: "🎯 O adversário está escolhendo um alvo…" });
    expect(saida).toContain("escolhendo um alvo");
  });

  it("com Trevas na rodada corrente", () => {
    const g = freshMatch([DECK, DECK], { rng: () => 0.5 });
    g.trevas = g.round;
    expect(() => renderToString(React.createElement(GameMobile, props(g)))).not.toThrow();
  });

  it("com mira pendente, incluindo o botão Pular", () => {
    const saida = montar({
      aim: { side: 0, srcNome: "Sobek", needs: "enemy", lane: 1, uid: 1 },
    });
    expect(saida).toContain("Sobek");
    expect(saida).toContain("Pular");
  });

  it("com mensagem e mira ao mesmo tempo — duas faixas empilhadas", () => {
    expect(() => montar({
      msg: "⚠ Adversário desconectado.",
      aim: { side: 0, srcNome: "Sobek", needs: "ally", lane: 0, uid: 1 },
    })).not.toThrow();
  });
});
