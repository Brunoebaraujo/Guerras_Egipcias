/** Cria a visão permitida para um assento sem expor mão, deck ou cartas ocultas do oponente. */
export function filterStateForSeat(state, seat) {
  const opponent = 1 - seat;
  const ownHand = structuredClone(state.hand[seat]);
  const hand = seat === 0 ? [ownHand, []] : [[], ownHand];
  const ownDraw = structuredClone(state.justDrew?.[seat] || []);
  const justDrew = seat === 0 ? [ownDraw, []] : [[], ownDraw];
  return {
    round: state.round,
    energy: structuredClone(state.energy),
    board: structuredClone(state.board.filter((card) => card.owner === seat || card.revealed)),
    deaths: structuredClone(state.deaths),
    plays: structuredClone(state.plays),
    pendingEnergy: structuredClone(state.pendingEnergy),
    pendingReturn: structuredClone(state.pendingReturn),
    blessings: structuredClone(state.blessings),
    deck: [Array(state.deck[0].length).fill(null), Array(state.deck[1].length).fill(null)],
    hand,
    oppHand: state.hand[opponent].length,
    seen: structuredClone(state.seen),
    justDrew,
    destroyedPower: structuredClone(state.destroyedPower),
    priority: state.priority,
    priorityReason: state.priorityReason,
    phase: state.phase,
    lastReveal: structuredClone(state.lastReveal),
    effect: structuredClone(state.effect),
    effectSeq: state.effectSeq,
    awaitingAim: structuredClone(state.awaitingAim),
    trevas: structuredClone(state.trevas),
    lastPlagueRevealed: state.lastPlagueRevealed,
    awaitingPlagueShowcase: state.awaitingPlagueShowcase,
    log: structuredClone((state.log || []).filter((line) => !/posicionou|recolheu/.test(line))),
    finished: state.finished,
  };
}
