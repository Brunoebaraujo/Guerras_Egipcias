import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { GameMobile } from "./App.jsx";
import { CARDS, byKey, nextUid, shuffled, coin, ctxOf, laneWins, SIDE_NAME } from "./engine.js";

function freshMobileProps() {
  const deckList = CARDS.map((c) => c.key).slice(0, 12);
  const decks = [shuffled(deckList), shuffled(deckList)];
  const hand = [[], []];
  for (let s = 0; s < 2; s++)
    for (let i = 0; i < 4; i++) { const key = decks[s].shift(); hand[s].push({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0 }); }
  const g = {
    round: 1, energy: [1, 1], board: [], deaths: [0, 0], plays: [0, 0],
    pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
    deck: decks, hand, seen: [4, 4], priority: coin(), priorityReason: "sorteio",
    phase: "plan", queue: [], lastReveal: null, effect: null, effectSeq: 0,
    log: ["x"], trace: ["x"], finished: false,
  };
  const noop = () => {};
  return {
    g, ctx: ctxOf(g), wins: laneWins(g), planning: true,
    sel: null, setSel: noop, aim: null, moving: null, msg: "", fast: false,
    startReveal: noop, setFast: noop, nextRound: noop, reset: noop, setScreen: noop, setForceView: noop,
    placeCard: noop, pickUp: noop, startMove: noop, moveTo: noop, applyAim: noop, skipAim: noop,
    isAimable: () => false, isMovable: () => false, zoomBoard: noop, zoomHand: noop,
  };
}

describe("GameMobile smoke", () => {
  it("renderiza a tela mobile de planejamento sem estourar", () => {
    const html = renderToString(<GameMobile {...freshMobileProps()} />);
    expect(html).toContain("Guerras Egípcias");
    expect(html).toContain("Planejar");
    expect(html).toContain("Revelar");
    expect(html).toContain("Lado A (ouro)");
    expect(html).toContain("Lado B (lápis)");
  });
  it("renderiza com uma carta posicionada e revelada (fase revelado)", () => {
    const p = freshMobileProps();
    const key = p.g.hand[0][0].key;
    p.g.board.push({ uid: nextUid(), key, owner: 0, lane: 1, printed: byKey[key].poder, baked: 0, mods: [], revealed: true, enteredRound: 1, entryPlays: 1, moved: false });
    p.g.phase = "revealed"; p.planning = false; p.ctx = ctxOf(p.g); p.wins = laneWins(p.g);
    const html = renderToString(<GameMobile {...p} />);
    expect(html).toContain("Próxima rodada");
  });
});

import { DeckMobile } from "./App.jsx";
import Carta from "./Carta.jsx";

describe("DeckMobile smoke", () => {
  const baseProps = {
    build: [[], []], setDeck: () => {}, flash: () => {}, startMatch: () => {},
    setScreen: () => {}, setForceView: () => {}, msg: "",
  };
  it("renderiza a grade de montagem de deck sem estourar", () => {
    const html = renderToString(<DeckMobile {...baseProps} />);
    expect(html).toContain("Guerras Egípcias");
    expect(html).toContain("Embaralhar e iniciar");
    expect(html).toContain("Lado A (ouro)");
    // ao menos uma carta da coleção na grade
    expect(html).toContain(CARDS[0].nome);
  });
  it("a carta ampliada (Carta) renderiza com efeito e lore", () => {
    const def = CARDS.find((c) => c.texto && c.lore) || CARDS[0];
    const html = renderToString(
      <Carta nome={def.nome} custo={def.custo} poder={def.poder} tipo={def.tipo}
        efeito={def.texto} lore={def.lore} arch={def.arch} arte={def.arte} arteFoco={def.arteFoco} width={300} />
    );
    expect(html).toContain(def.nome);
    expect(html).toContain(def.texto);
  });
});
