/* ==========================================================================
   BOTS — controlador (Onda 1: fundação).

   Fica em `match/`, não em `domain/`, porque é o único lugar que compõe uma
   função de decisão (domain/bots) com `applyAction` (o maestro puro da
   partida) — a mesma separação que já existe entre "regra" (domain) e
   "orquestração" (match). O bot em si nunca decide fora daqui: ele só devolve
   ações, uma de cada vez, e este loop é quem as aplica de verdade e decide
   quando parar.

   `runBotPlanning` é o único ponto de entrada. Roda inteiramente síncrono e
   determinístico (dado o mesmo `rng`), então serve tanto para a UI (chamado
   uma vez por rodada) quanto para os testes de integração (comparar traços).
   ========================================================================== */
import { applyAction } from "../index.js";

const MAX_STEPS = 40; // teto de segurança: nunca deve chegar perto disto (mão ≤7, 3 vias)

/**
 * Roda o planejamento de UM lado até a função de decisão dizer que não há
 * mais jogada (`null`) ou até uma ação vir rejeitada pelo redutor — o que for
 * primeiro. Uma ação ilegal nunca deveria acontecer (a decisão só enumera
 * jogadas legais), mas se acontecer o loop para em vez de travar: side afetado
 * simplesmente fica com o que já tinha jogado até ali.
 *
 * @param {object} args
 * @param {*} args.state - estado atual da partida (fase de planejamento)
 * @param {0|1} args.side - lado controlado pelo bot
 * @param {(ctx: { state: *, side: 0|1, rng: () => number }) => object | null} args.decide
 * @param {() => number} [args.rng] - gerador injetável (testes/replay); por padrão Math.random
 * @returns {{ state: *, steps: number, stopped: "done" | "illegal" | "max" }}
 */
export function runBotPlanning({ state, side, decide, rng = Math.random }) {
  let current = state;
  let steps = 0;
  while (steps < MAX_STEPS) {
    if (current.phase !== "plan" || current.finished || current.awaitingAim) break;
    const action = decide({ state: current, side, rng });
    if (!action) return { state: current, steps, stopped: "done" };
    const result = applyAction(current, action);
    if (result.error) return { state: current, steps, stopped: "illegal" };
    current = result.state;
    steps += 1;
  }
  return { state: current, steps, stopped: steps >= MAX_STEPS ? "max" : "done" };
}
