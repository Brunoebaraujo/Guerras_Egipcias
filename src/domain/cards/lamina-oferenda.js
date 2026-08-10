/* Lâmina de Oferenda — peça de motor do arquétipo de Sacrifício.
   A definição fica isolada para que o registry de efeitos possa registrá-la
   sem aumentar ainda mais o catálogo monolítico de engine.js. */
export const LAMINA_OFERENDA = {
  key: "lamina-oferenda",
  nome: "Lâmina de Oferenda",
  nomeCurto: "Lâmina",
  tipo: "Ferramenta",
  custo: 1,
  poder: 2,
  arch: "sacrificio",
  arte: "lamina-oferenda",
  trigger: "entrar",
  efeitos: [{ id: "armNextOwnSacrifice", value: 1, quantity: 1 }],
  texto: "Ao Entrar: a próxima carta que você jogar é destruída. Depois, dê +1 de Poder a outra carta aleatória do seu lado.",
  lore: "Usada nos ritos dos grandes templos, a lâmina não tomava uma vida sem propósito. Aquilo que era oferecido aos deuses retornava como força aos que permaneciam.",
};

export function registrarLaminaOferenda(cards, byKey) {
  if (byKey[LAMINA_OFERENDA.key]) return LAMINA_OFERENDA;
  cards.push(LAMINA_OFERENDA);
  byKey[LAMINA_OFERENDA.key] = LAMINA_OFERENDA;
  return LAMINA_OFERENDA;
}
