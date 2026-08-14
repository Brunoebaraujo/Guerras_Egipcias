/* Sia — par mitológico de Hu. Na mitologia egípcia, Hu (a autoridade da
   palavra criadora) e Sia (a percepção/entendimento) são os dois atendentes
   que acompanham Rá na barca solar; um sem o outro não se sustenta.

   Mecanicamente, Sia é uma versão AUTOMÁTICA do combo de transferência de
   Hu: em vez de exigir a ação `toggleActivate` durante o planejamento, Sia
   se arma sozinha no momento em que é POSICIONADA — ela guarda seu próprio
   Poder (com auras incluídas, como Hu) e concede uma cópia dele, como
   bênção permanente, à PRÓXIMA carta que o mesmo jogador jogar (ordem de
   JOGADA, não de revelação — mesma regra do Hu).

   NÃO tem `trigger: "entrar"` de propósito: ela não se arma na revelação,
   e sim no `place()` (`src/match/index.js`), igual à ativação manual do
   Hu — só que automática. Isso é o que permite capturar "a próxima carta
   jogada DEPOIS dela" mesmo dentro da MESMA rodada (ex.: joga Sia na via 1,
   depois joga o Lanceiro na via 2 — Lanceiro recebe o bônus). Se Sia for a
   última carta posicionada na rodada, ninguém satisfaz `entryPlays >
   ativadoEmPlays` ainda, e o bônus cai automaticamente para a primeira
   carta posicionada na rodada seguinte — sem precisar de lógica extra,
   porque `plays[side]` é cumulativo entre rodadas.

   `efeitos: [{ id: "autoTransferPowerNext" }]` continua presente só para
   que `cartaTemEfeito()` identifique a carta em `place()` — o resolver
   registrado em `effects/index.js` é um no-op de propósito, porque a
   entrega de fato acontece na revelação da carta SEGUINTE, na mesma
   rotina genérica que atende Hu (busca por `aguardandoProxima` dentro de
   `resolveCurrentCard`). Se Sia for recolhida (`pickup`) antes de revelar,
   o carimbo de armamento some junto com ela — nada fica pendurado. */
export const SIA = {
  key: "sia",
  nome: "Sia",
  tipo: "Divindade",
  custo: 4,
  poder: 2,
  arch: "buff",
  arte: "sia",
  efeitos: [{ id: "autoTransferPowerNext" }],
  texto: "Ao ser jogada, guarda seu Poder atual (incluindo auras). A próxima carta que você jogar depois dela recebe uma cópia desse Poder — na mesma rodada, se houver, senão na rodada seguinte.",
  lore: "Sia via o que Hu ordenava. Um enxergava a forma antes de existir; o outro a chamava à existência. Nenhum templo os separa — sempre lado a lado na barca de Rá.",
};

export function registrarSia(cards, byKey) {
  if (byKey[SIA.key]) return SIA;
  cards.push(SIA);
  byKey[SIA.key] = SIA;
  return SIA;
}
