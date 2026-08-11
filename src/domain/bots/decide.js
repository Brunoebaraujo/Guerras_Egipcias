// @ts-check
/* ==========================================================================
   BOTS — camada de DECISÃO.

   Puro por convenção, igual a `domain/` e `match/`: nenhuma função aqui toca
   o navegador (APIs de storage ou globais de DOM), nem importa React. Uma
   função de decisão recebe uma fatia do estado da partida e devolve UMA ação
   (`{ t: "place", ... }` etc.) ou `null` quando não há mais nada de bom a
   fazer nesta rodada — nunca aplica a ação, isso é responsabilidade de quem
   orquestra (`match/bots/controller.js`).

   `decideRandomPlacement` (Onda 1) validou o encaixe com o loop de
   `match/index.js` e continua aqui como referência/bloco de construção.
   `decideFacil` (Onda 2) é o nível Fácil: sem lookahead, sem sinergia, sem
   preferência de via — só gasta a energia jogando sempre a carta mais cara
   que cabe. `decideMedio` (Onda 4) já olha o tabuleiro — ver a nota de
   avaliação em `evaluate.js`. Difícil (busca + adaptação) entra numa onda
   seguinte, como mais uma função aqui — `controller.js` e o registro em
   `index.js` não precisam mudar.
   ========================================================================== */
import { byKey, custoDe, viaCheia } from "../engine.js";
import { LANES } from "../rules.js";
import { avaliarOpcao } from "./evaluate.js";

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

/**
 * Decisão do nível FÁCIL: entre as jogadas legais, prioriza sempre a carta de
 * MAIOR custo que a energia disponível ainda paga — o viés mais simples de
 * descrever sem simular jogada nenhuma ("gasta o máximo que puder, sem
 * pensar em mais nada"). Empates (mesmo custo, cartas diferentes ou vias
 * diferentes da mesma carta) são resolvidos ao acaso — o nível Fácil não
 * escolhe via de propósito nenhum, e não compara cartas de mesmo custo entre
 * si (isso é o que separa Fácil de Médio: aqui não há avaliação de
 * tabuleiro).
 *
 * Chamado repetidamente pelo controller: a cada jogada a energia cai, então
 * o loop natural já produz "joga a mais cara, depois a próxima mais cara que
 * ainda cabe" até a mão ou a energia acabarem.
 *
 * @param {{ state: *, side: 0|1, rng: () => number }} args
 * @returns {{ t: "place", side: 0|1, hid: number, lane: number } | null}
 */
export function decideFacil({ state, side, rng }) {
  const opcoes = legalPlacements(state, side);
  if (opcoes.length === 0) return null;
  const maxCusto = Math.max(...opcoes.map((o) => o.custo));
  const melhores = opcoes.filter((o) => o.custo === maxCusto);
  const escolha = melhores[Math.floor(rng() * melhores.length)];
  return { t: "place", side, hid: escolha.hid, lane: escolha.lane };
}

/**
 * Decisão do nível MÉDIO: entre as jogadas legais, escolhe a de MAIOR nota
 * segundo `avaliarOpcao` (ver `evaluate.js`) — poder próprio projetado contra
 * o poder já estabelecido do adversário na mesma via, com bônus por virar
 * uma via perdida/empatada. Diferente do Fácil, aqui a via importa: a mesma
 * carta pode valer muito numa via perdida e pouco numa via já dominada.
 * Empates de nota são resolvidos ao acaso — o Médio ainda não tem lookahead
 * pra desempatar de outro jeito (isso é trabalho do Difícil).
 *
 * @param {{ state: *, side: 0|1, rng: () => number }} args
 * @returns {{ t: "place", side: 0|1, hid: number, lane: number } | null}
 */
export function decideMedio({ state, side, rng }) {
  const opcoes = legalPlacements(state, side);
  if (opcoes.length === 0) return null;
  const hand = state.hand[side];
  const notas = opcoes.map((opcao) => avaliarOpcao(state, side, opcao, hand));
  const melhorNota = Math.max(...notas);
  const EPS = 1e-9;
  const melhores = opcoes.filter((_, i) => Math.abs(notas[i] - melhorNota) <= EPS);
  const escolha = melhores[Math.floor(rng() * melhores.length)];
  return { t: "place", side, hid: escolha.hid, lane: escolha.lane };
}

// Reexportado por conveniência de quem só quer o texto da carta escolhida em
// log/telemetria (ex.: debug do controller).
export const nomeDaMao = (state, side, hid) => {
  const h = (state.hand?.[side] || []).find((x) => x.hid === hid);
  return h ? byKey[h.key]?.nome : undefined;
};

