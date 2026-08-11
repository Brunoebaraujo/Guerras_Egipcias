// @ts-check
/* ==========================================================================
   BOTS — camada de DECISÃO (Onda 1: fundação).

   Puro por convenção, igual a `domain/` e `match/`: nenhuma função aqui toca
   o navegador (APIs de storage ou globais de DOM), nem importa React. Uma
   função de decisão recebe uma fatia do estado da partida e devolve UMA ação
   (`{ t: "place", ... }` etc.)
   ou `null` quando não há mais nada de bom a fazer nesta rodada — nunca aplica
   a ação, isso é responsabilidade de quem orquestra (`match/bots/controller.js`).

   Esta primeira leva só tem `decideRandomPlacement`: um bot que joga cartas
   legais ao acaso, sem olhar sinergia nem via. Serve para validar o encaixe
   com o loop de `match/index.js` (Onda 1). Fácil de verdade (heurística de
   curva/custo), Médio (avaliação de tabuleiro) e Difícil (busca + adaptação)
   entram nas ondas seguintes, cada um como uma nova função aqui — o
   `controller.js` e o registro em `index.js` não precisam mudar.
   ========================================================================== */
import { byKey, custoDe, viaCheia } from "../engine.js";
import { LANES } from "../rules.js";

/**
 * Todas as jogadas de `place` legais para `side` no estado atual: carta na
 * mão que cabe na energia disponível, numa via que ainda tem espaço (4/4).
 * Não considera `move`/`pickup`/`toggleActivate` — a primeira leva do bot só
 * posiciona cartas, que é o essencial de um turno.
 *
 * @param {*} state
 * @param {0|1} side
 * @returns {{ hid: number, lane: number, custo: number }[]}
 */
export function legalPlacements(state, side) {
  const hand = state.hand?.[side] || [];
  const energy = state.energy?.[side] ?? 0;
  const board = state.board || [];
  const out = [];
  for (const h of hand) {
    const custo = custoDe(h);
    if (custo > energy) continue;
    for (const lane of LANES) {
      if (viaCheia(board, side, lane)) continue;
      out.push({ hid: h.hid, lane, custo });
    }
  }
  return out;
}

/**
 * Decisão "aleatória legal": sorteia uma jogada dentre as legais, sem
 * preferência nenhuma. Devolve `null` quando não há jogada possível (mão sem
 * cartas pagáveis, ou todas as vias cheias) — o controller lê isso como
 * "terminei meu planejamento".
 *
 * @param {{ state: *, side: 0|1, rng: () => number }} args
 * @returns {{ t: "place", side: 0|1, hid: number, lane: number } | null}
 */
export function decideRandomPlacement({ state, side, rng }) {
  const opcoes = legalPlacements(state, side);
  if (opcoes.length === 0) return null;
  const escolha = opcoes[Math.floor(rng() * opcoes.length)];
  return { t: "place", side, hid: escolha.hid, lane: escolha.lane };
}

// Reexportado por conveniência de quem só quer o texto da carta escolhida em
// log/telemetria (ex.: debug do controller).
export const nomeDaMao = (state, side, hid) => {
  const h = (state.hand?.[side] || []).find((x) => x.hid === hid);
  return h ? byKey[h.key]?.nome : undefined;
};
