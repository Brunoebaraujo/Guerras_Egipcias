/* Íbis Sagrado — 1/3. Devolve um aliado aleatório desta via para a mão.
   Fica em módulo próprio (padrão de lamina-oferenda.js) para não inchar
   ainda mais o catálogo monolítico de engine.js.

   RETÉM bênçãos e maldições: a carta devolvida leva consigo o saldo de
   `mods` que acumulou em jogo (positivo ou negativo), dobrado dentro de
   `baked` por `devolverCartaParaMao()` (engine.js) — não volta "zerada".

   O propósito de design (verificado no motor antes de implementar, a pedido
   de Bruno): o "Ao Entrar" de uma carta NÃO tem flag de "já usei" em lugar
   nenhum do motor — é resolvido do zero toda vez que a carta é revelada,
   venha ela de onde vier. Então replantar a carta devolvida e revelá-la de
   novo passa por `resolverEntrada` como qualquer jogada normal — o "Ao
   Entrar" dela dispara outra vez. Não foi preciso nenhum mecanismo especial
   de "recarga"; o Íbis só precisa fazer a carta ir e voltar. */
export const IBIS = {
  key: "ibis",
  nome: "Íbis Sagrado",
  nomeCurto: "Íbis",
  tipo: "Animal",
  custo: 1,
  poder: 3,
  arch: "movimento",
  arte: "ibis",
  trigger: "entrar",
  efeitos: [{ id: "returnRandomAllyToHand" }],
  texto: "Ao Entrar: devolve uma carta aliada aleatória desta via para sua mão, mantendo bênçãos e maldições que ela tiver.",
  lore: "Consagrado a Tote, o íbis caminhava pela lama do Nilo catando o que os outros deixavam passar — e o levava embora, inteiro, para que se tornasse outra coisa depois.",
};

export function registrarIbis(cards, byKey) {
  if (byKey[IBIS.key]) return IBIS;
  cards.push(IBIS);
  byKey[IBIS.key] = IBIS;
  return IBIS;
}
