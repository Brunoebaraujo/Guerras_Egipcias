/* Ladrão de Ka — enabler barato de energia (1 custo / 0 Poder). Fica em módulo
   próprio (padrão de lamina-oferenda.js / sekhem.js) para não inchar ainda
   mais o catálogo monolítico de engine.js.

   O efeito é intencionalmente simples e reusa o MESMO mecanismo do Bennu
   (`state.pendingEnergy[owner] += valor`, consumido em `nextRound` — ver
   match/index.js linha ~678): +1 de energia reservada para o PRÓXIMO turno,
   não para a rodada atual. Isso a torna um "enabler" clássico de curva —
   jogar Ladrão de Ka na Rodada 2 (custo 1, de um total de 2 de energia)
   deixa a Rodada 3 com 3+1 = 4 de energia, liberando uma carta de custo 4 um
   turno adiantado. */
export const LADRAO_DE_KA = {
  key: "ladrao-de-ka",
  nome: "Ladrão de Ka",
  // Registrada via módulo próprio, DEPOIS do laço que popula NOME_CURTO em
  // engine.js — nomeCurto precisa ser setado direto aqui (mesmo padrão de
  // lamina-oferenda.js / tech-cards.js / sekhem.js), não no dicionário.
  nomeCurto: "Ladrão",
  tipo: "Humano",
  custo: 1,
  poder: 0,
  arch: "buff",
  arte: "ladrao-de-ka",
  trigger: "entrar",
  efeitos: [{ id: "grantNextRoundEnergy", value: 1 }],
  texto: "Ao Entrar: +1 de energia no seu próximo turno.",
  lore: "Onde o Ka de um homem escapava um instante do corpo, o Ladrão já estava lá para colhê-lo — devolvendo-o depois, um pouco mais cedo do que deveria.",
};

export function registrarLadraoDeKa(cards, byKey) {
  if (byKey[LADRAO_DE_KA.key]) return LADRAO_DE_KA;
  cards.push(LADRAO_DE_KA);
  byKey[LADRAO_DE_KA.key] = LADRAO_DE_KA;
  return LADRAO_DE_KA;
}
