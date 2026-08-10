/* Tech Cards — peças de motor que operam sobre OUTROS efeitos contínuos, não
   sobre o tabuleiro diretamente. Ficam isoladas do catálogo monolítico de
   engine.js pelo mesmo motivo de `lamina-oferenda.js`: são definição, não
   comportamento novo — o comportamento vive nos helpers genéricos do motor
   (`auraSuprimida`, `debuffsSuspensosPara`) para que nenhuma das duas precise
   de um `if (card.key === ...)` em lugar nenhum. */

// ---------------------------- OLHO DE HÓRUS RESTAURADOR ---------------------
// AURA — enquanto em jogo, os debuffs de redução de Poder do PRÓPRIO dono
// (em qualquer via) ficam suspensos: continuam gravados em `mods`, continuam
// acumulando e recebendo novas aplicações, só não entram na soma do Poder
// exibido. Nada é removido nem recriado — `decomporPartes()` decide, a cada
// leitura, se cada mod negativo participa da soma. Se o Olho sair de jogo, for
// destruído, ou tiver a própria Aura suprimida por um Silêncio dos Deuses na
// via dele, os debuffs voltam a valer imediatamente — e voltam a ficar
// suspensos se a Aura reativar depois.
export const OLHO_HORUS = {
  key: "olho-horus",
  nome: "Olho de Hórus Restaurador",
  nomeCurto: "Olho",
  tipo: "Relíquia",
  custo: 2,
  poder: 3,
  arch: "buff",
  arte: "olho-horus",
  trigger: "continuo",
  efeitos: [{ id: "suspendPowerDebuffs" }],
  texto: "Aura: enquanto estiver em jogo, os debuffs de redução de Poder das suas cartas ficam suspensos. Eles continuam registrados e nada é removido — só deixam de contar enquanto a Aura estiver ativa.",
  lore: "Restaurado por Tot depois que Set o despedaçou, o olho de Hórus não apaga a ferida — ele a cobre, e o que estava perdido volta a ter forma enquanto a luz durar.",
};

// ------------------------------- SILÊNCIO DOS DEUSES -------------------------
// STATIC_EFFECT — enquanto em uma via, suprime a Aura de TODAS AS OUTRAS
// cartas dessa via, na fonte (não nos alvos): uma carta com Aura global, como
// Amon, tem a Aura inteira desligada, mesmo para os alvos dela em outras
// vias. Não é "Ao Entrar" (não dispara nada ao revelar) nem uma Aura em si
// (não modifica poder nem estado): é uma regra estática, ativa por presença.
// Dois Silêncios na mesma via não acumulam efeito nem se anulam entre si —
// só quando NENHUM restar na via as Auras alheias voltam a valer. Poder 3 é
// proposital: mantém a carta vulnerável a remoções nessa faixa (Dilúvio e
// afins), então suprimir uma Aura custa exposição, não imunidade.
export const SILENCIO_DEUSES = {
  key: "silencio-deuses",
  nome: "Silêncio dos Deuses",
  nomeCurto: "Deuses",
  tipo: "Relíquia",
  custo: 2,
  poder: 3,
  arch: "silencio",
  arte: "silencio-deuses",
  arteFoco: "center 0%",
  trigger: "continuo",
  efeitos: [{ id: "suppressAuraInLane" }],
  texto: "Enquanto estiver nesta Via, todas as OUTRAS cartas aqui têm seus efeitos de Aura suprimidos — inclusive Auras que alcançam outras vias a partir daqui.",
  lore: "Onde os deuses se calam, o mundo para de ouvir seus decretos — mas eles continuam lá, esperando a primeira brecha no silêncio.",
};

export function registrarTechCards(cards, byKey) {
  for (const def of [OLHO_HORUS, SILENCIO_DEUSES]) {
    if (byKey[def.key]) continue;
    cards.push(def);
    byKey[def.key] = def;
  }
  return [OLHO_HORUS, SILENCIO_DEUSES];
}
