export const LANES = Object.freeze([0, 1, 2]);
export const LANE_CAP = 4;
export const MAX_CARDS_PER_LANE = LANE_CAP;
export const DECK_SIZE = 12;
export const MAX_ROUND = 6;
export const OPENING_DEAL = 3;

export const RULES = Object.freeze({
  lanes: LANES,
  laneCapacity: LANE_CAP,
  deckSize: DECK_SIZE,
  maxRound: MAX_ROUND,
  openingDeal: OPENING_DEAL,
});
