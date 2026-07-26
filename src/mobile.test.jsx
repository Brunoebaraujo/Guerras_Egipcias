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
    expect(html).toContain("DUAT");
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
