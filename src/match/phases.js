export const PHASE = Object.freeze({
  PLAN: "plan",
  REVEALING: "revealing",
  REVEALED: "revealed",
});

const TRANSITIONS = Object.freeze({
  [PHASE.PLAN]: new Set([PHASE.REVEALING, PHASE.REVEALED]),
  [PHASE.REVEALING]: new Set([PHASE.REVEALED]),
  [PHASE.REVEALED]: new Set([PHASE.PLAN]),
});

export function canTransition(from, to) {
  return from === to || !!TRANSITIONS[from]?.has(to);
}

export function transitionPhase(state, to) {
  if (!canTransition(state.phase, to)) {
    throw new Error(`transição de fase inválida: ${state.phase} -> ${to}`);
  }
  state.phase = to;
  return state;
}

export function phaseInvariantErrors(state) {
  const errors = [];
  if (!Object.values(PHASE).includes(state.phase)) errors.push(`fase desconhecida: ${state.phase}`);
  if (state.phase === PHASE.PLAN && state.queue?.length) errors.push("planejamento não pode ter fila de revelação");
  if (state.phase !== PHASE.REVEALING && state.awaitingAim) errors.push("mira pendente fora da revelação");
  /* A pausa de apresentação da Praga só existe DENTRO da revelação. Se ela
     sobreviver à virada de fase, o `step` da rodada seguinte fica bloqueado por
     um showcase que ninguém vai fechar — trava silenciosa de partida. */
  if (state.phase !== PHASE.REVEALING && state.awaitingPlagueShowcase) errors.push("Praga em exibição fora da revelação");
  return errors;
}
