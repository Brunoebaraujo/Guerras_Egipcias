import { describe, expect, it } from "vitest";
import { applyAction, autoReveal, freshMatch } from "./match.js";
import { byKey } from "./engine.js";

const deck = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "montu", "hathor", "escaravelho", "ammit", "mumia", "sobek"];

function executar(seed) {
  let state = freshMatch([deck, deck], { seed });
  for (let round = 1; round <= 3; round++) {
    for (const side of [0, 1]) {
      const card = state.hand[side].find((h) => byKey[h.key].custo <= state.energy[side]);
      if (card) state = applyAction(state, { t: "place", side, hid: card.hid, lane: (round + side) % 3 }).state;
    }
    state = applyAction(state, { t: "startReveal" }).state;
    state = autoReveal(state).state;
    if (round < 3) state = applyAction(state, { t: "nextRound" }).state;
  }
  return state;
}

describe("determinismo da partida", () => {
  it("mesma seed e mesmas ações geram estado idêntico byte a byte", () => {
    expect(JSON.stringify(executar("replay-42"))).toBe(JSON.stringify(executar("replay-42")));
  });

  it("seeds diferentes produzem embaralhamentos diferentes", () => {
    expect(freshMatch([deck, deck], { seed: 1 }).deck).not.toEqual(freshMatch([deck, deck], { seed: 2 }).deck);
  });
});
