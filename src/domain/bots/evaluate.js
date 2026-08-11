// @ts-check
/* ==========================================================================
   BOTS — avaliação de tabuleiro (Onda 4: nível Médio).

   O Fácil (Onda 2) só olha custo. O Médio olha o TABULEIRO: para cada jogada
   de `place` legal, estima quanto PODER RELEVANTE ela agrega à via — não o
   poder bruto, mas o poder que realmente ajuda a controlar aquela via.

   A ideia central é um TETO DE RELEVÂNCIA por via: uma vez que o próprio
   poder já supera o do adversário por uma margem confortável, poder extra
   naquela via deixa de contar (rendimento decrescente) — então a mesma
   carta vale mais numa via perdida ou disputada do que numa via já
   dominada. Isso é o que separa Fácil de Médio: aqui a via importa, e
   "controle de 2 de 3 vias" pesa mais que "maximizar poder total" — exatamente
   o vício que o nível Fácil tem (ele empilha na primeira via que achar).

   Ainda é avaliação de UM passo: não simula rodadas futuras nem efeitos de
   "Ao Entrar" da própria carta (ela ainda não foi revelada — nem o motor
   sabe o que vai acontecer). Isso é trabalho do Difícil (onda seguinte).

   A avaliação reaproveita `power()`/`laneScore()` do próprio `engine.js` em
   vez de duplicar a lógica de mods/Maat/auras contínuas (Montu, Amon,
   hinos...): a carta candidata entra num CTX SINTÉTICO — o estado real
   nunca é tocado — marcada como já revelada só para o cálculo. Isso é
   seguro porque nenhuma outra carta ainda oculta (do bot ou do oponente)
   aparece nesse cálculo: elas continuam de fora de `laneScore` enquanto
   `revealed` for falso, exatamente como o motor trata informação oculta em
   qualquer outro lugar.
   ========================================================================== */
import { laneScore } from "../engine.js";

// Quanto de margem além do poder do adversário ainda conta como "relevante"
// numa via. Poder que levaria a via a mais do que isso não soma nada — só
// garante o controle, não é desperdiçado matando um adversário que já perdeu.
const CAP_MARGEM_RELEVANTE = 3;
// Peso pequeno de desempate entre jogadas de mesmo valor relevante — poder
// por energia, o "custo-benefício" citado no plano original.
const PESO_EFICIENCIA = 0.5;

/* Ctx sintético com a carta candidata injetada no tabuleiro como revelada —
   só para `power()`/`laneScore()` calcularem o que ela pesaria. `deaths`,
   `plays` e `destroyedPower` vêm do estado real: Osíris, Am-heh e Ammit
   dependem deles em seus efeitos contínuos. */
function ctxComCandidata(state, opcao, hand, side) {
  const h = hand.find((x) => x.hid === opcao.hid);
  const candidata = {
    uid: -1, key: h.key, owner: side, lane: opcao.lane,
    printed: h.printed, baked: h.baked || 0, mods: [],
    revealed: true, dying: false, pendentes: h.pendentes || 0,
    custoMod: h.custoMod || 0, venenos: h.venenos ? [...h.venenos] : [],
    entryPlays: 0, enteredRound: state.round, moved: false,
  };
  return {
    board: [...state.board, candidata],
    deaths: state.deaths, plays: state.plays, destroyedPower: state.destroyedPower || [0, 0],
  };
}

/**
 * Nota de uma jogada `{ hid, lane, custo }` (do formato de `legalPlacements`)
 * para `side`. Quanto maior, melhor a jogada aos olhos do Médio.
 *
 * O grosso da nota é `valorRelevante`: o quanto o próprio poder na via sobe,
 * mas contado só até `poder do adversário + CAP_MARGEM_RELEVANTE` — poder
 * que já não muda o controle da via não soma. Uma carta fraca numa via
 * perdida por muito (onde ainda há teto pra subir) vale mais que a mesma
 * carta numa via já vencida com folga (onde o teto já foi alcançado antes
 * mesmo da carta entrar).
 *
 * @param {*} state
 * @param {0|1} side
 * @param {{ hid: number, lane: number, custo: number }} opcao
 * @param {*[]} [hand] - mão de `side`; default lê de `state.hand[side]`
 * @returns {number}
 */
export function avaliarOpcao(state, side, opcao, hand = state.hand[side]) {
  const oppSide = side === 0 ? 1 : 0;
  const ctx = ctxComCandidata(state, opcao, hand, side);
  const oppEstablished = laneScore(ctx, opcao.lane, oppSide);
  const ownEstablishedAntes = laneScore({ ...ctx, board: state.board }, opcao.lane, side);
  const ownProjetado = laneScore(ctx, opcao.lane, side);

  const teto = oppEstablished + CAP_MARGEM_RELEVANTE;
  const valorRelevante = Math.min(ownProjetado, teto) - Math.min(ownEstablishedAntes, teto);

  const contribuicaoPropria = ownProjetado - ownEstablishedAntes; // quanto a própria carta agrega (bruto)
  const eficiencia = contribuicaoPropria / Math.max(1, opcao.custo);

  return valorRelevante + eficiencia * PESO_EFICIENCIA;
}

