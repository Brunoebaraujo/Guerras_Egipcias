/* Íbis Sagrado — 1/3. Devolve um aliado aleatório desta via para a mão.
   Fica em módulo próprio (padrão de lamina-oferenda.js) para não inchar
   ainda mais o catálogo monolítico de engine.js.

   O propósito de design (verificado no motor antes de implementar, a pedido
   de Bruno): o "Ao Entrar" de uma carta NÃO tem flag de "já usei" em lugar
   nenhum do motor — é resolvido do zero toda vez que a carta é revelada,
   venha ela de onde vier. `devolverCartaParaMao()` (engine.js) devolve a
   carta-alvo como uma entrada NOVA na mão (sem `mods`, preservando `baked`),
   então replantá-la e revelá-la de novo passa por `resolverEntrada` como
   qualquer jogada normal — o "Ao Entrar" dela dispara outra vez. Não foi
   preciso nenhum mecanismo especial de "recarga"; o Íbis só precisa fazer a
   carta ir e voltar. */
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
  texto: "Ao Entrar: devolve uma carta aliada aleatória desta via para sua mão.",
  lore: "Consagrado a Tote, o íbis caminhava pela lama do Nilo catando o que os outros deixavam passar — e o levava embora, para que se tornasse outra coisa depois.",
};

export function registrarIbis(cards, byKey) {
  if (byKey[IBIS.key]) return IBIS;
  cards.push(IBIS);
  byKey[IBIS.key] = IBIS;
  return IBIS;
}
