import { matchResult } from "../engine.js";

export function resultLabel(game) {
  const result = matchResult(game);
  if (result.side === -1) return "Empate";
  return `Lado ${result.side === 0 ? "A" : "B"} venceu` + (result.tiebreak ? ` · saldo +${result.margin}` : "");
}
