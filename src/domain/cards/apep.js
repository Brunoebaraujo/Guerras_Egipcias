/* Apep, a Serpente do Caos — 1/6. Caos primevo: violento sozinho, mas cada
   reforço que chega na via é ORDEM entrando no lugar dele, e ordem o
   enfraquece. Fica em módulo próprio (padrão de lamina-oferenda.js) para não
   inchar ainda mais o catálogo monolítico de engine.js.

   Dois efeitos-flag, comportamento real fora do resolver (mesmo padrão de
   Sia/autoTransferPowerNext e Sekhem/mirrorOwnPowerToAllies):

   - "debuffSelfOnAllyEnter": entregue por `aplicarReacaoAliadoNaVia()` em
     engine.js, chamada a cada revelação (match/index.js, step()). É bênção
     PERMANENTE (val negativo, via aplicarBencao) — se o aliado que causou o
     desconto morrer depois, o desconto em Apep fica; ela já pagou o preço da
     companhia, não é um cálculo contínuo que se desfaz.
   - "restrictPlayUntilRound": checado em `place()` (match/index.js) antes de
     aceitar a jogada. Apep é a serpente que o sol precisa vencer todo
     amanhecer — depois da 3ª rodada, a "noite" dela já passou e ninguém mais
     consegue posicioná-la. */
export const APEP = {
  key: "apep",
  nome: "Apep, a Serpente do Caos",
  nomeCurto: "Apep",
  tipo: "Criatura",
  custo: 1,
  poder: 6,
  arch: "debuff",
  arte: "apep",
  efeitos: [
    { id: "debuffSelfOnAllyEnter", value: 1 },
    { id: "restrictPlayUntilRound", value: 3 },
  ],
  texto: "Sempre que um aliado é revelado nesta via, Apep perde 1 de Poder (permanente). Só pode ser jogada até a Rodada 3.",
  lore: "Toda noite Apep cerca a barca solar no rio subterrâneo, e toda madrugada é vencida — não morta, só adiada. O caos que ela é não convive com companhia: cada aliado que chega é mais um pedaço de ordem cravado nela.",
};

export function registrarApep(cards, byKey) {
  if (byKey[APEP.key]) return APEP;
  cards.push(APEP);
  byKey[APEP.key] = APEP;
  return APEP;
}
