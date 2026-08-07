import { describe, expect, it } from "vitest";
import { freshMatch } from "../match/index.js";
import { filterStateForSeat } from "./filterState.js";

const deck = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "hathor", "heka", "amon", "set", "maat"];

describe("fronteira de estado da rede", () => {
  it("expõe somente a mão do próprio assento", () => {
    const state = freshMatch([deck, deck], { seed: 19 });
    const view = filterStateForSeat(state, 0);
    expect(view.hand[0]).toEqual(state.hand[0]);
    expect(view.hand[1]).toEqual([]);
    expect(view.oppHand).toBe(state.hand[1].length);
    expect(view).not.toHaveProperty("trace");
    expect(view).not.toHaveProperty("random");
  });

  it("remove cartas ocultas do adversário", () => {
    const state = freshMatch([deck, deck], { seed: 23 });
    state.board.push({ uid: 999, key: "servo", owner: 1, lane: 0, revealed: false });
    expect(filterStateForSeat(state, 0).board.some((card) => card.uid === 999)).toBe(false);
  });
});
