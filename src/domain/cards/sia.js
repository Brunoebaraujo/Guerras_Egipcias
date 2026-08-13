/* Sia — par mitológico de Hu. Na mitologia egípcia, Hu (a autoridade da
   palavra criadora) e Sia (a percepção/entendimento) são os dois atendentes
   que acompanham Rá na barca solar; um sem o outro não se sustenta.

   Mecanicamente, Sia é uma versão AUTOMÁTICA do combo de transferência de
   Hu: em vez de exigir a ação `toggleActivate` durante o planejamento, Sia
   se arma sozinha "Ao Entrar" — ela guarda seu próprio Poder (com auras
   incluídas, como Hu) e concede uma cópia dele, como bênção permanente, à
   PRÓXIMA carta que o mesmo jogador jogar (ordem de JOGADA, não de
   revelação — mesma regra do Hu).

   Consequência de tempo que vale documentar: como Sia se arma no momento em
   que É REVELADA (não no planejamento), e todas as cartas da própria rodada
   já foram posicionadas (logo já têm `entryPlays` fixado) antes da fase de
   revelação começar, nenhuma carta da MESMA rodada consegue satisfazer
   `entryPlays > ativadoEmPlays`. Na prática, Sia sempre entrega seu bônus
   para a primeira carta que o jogador posicionar na rodada SEGUINTE — ao
   contrário de Hu, que pode ser ativado a meio do planejamento e pegar uma
   carta ainda na mesma rodada (ex.: Hathor → ativar Hu → Renenutet).

   Reusa os MESMOS campos de estado que Hu (`aguardandoProxima`,
   `ativadoEmPlays`, `jaBufou`) e a MESMA rotina de resolução em
   `match/index.js` (generalizada para não depender mais de `card.key ===
   "hu"` — ver comentário lá). O efeito abaixo só arma o estado; a entrega
   de fato acontece na revelação da carta seguinte, igual ao Hu. */
export const SIA = {
  key: "sia",
  nome: "Sia",
  tipo: "Divindade",
  custo: 4,
  poder: 2,
  arch: "buff",
  arte: "sia",
  trigger: "entrar",
  efeitos: [{ id: "autoTransferPowerNext" }],
  texto: "Ao Entrar: guarda seu Poder atual. A próxima carta que você jogar recebe uma cópia desse Poder.",
  lore: "Sia via o que Hu ordenava. Um enxergava a forma antes de existir; o outro a chamava à existência. Nenhum templo os separa — sempre lado a lado na barca de Rá.",
};

export function registrarSia(cards, byKey) {
  if (byKey[SIA.key]) return SIA;
  cards.push(SIA);
  byKey[SIA.key] = SIA;
  return SIA;
}
