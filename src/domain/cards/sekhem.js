/* Sekhem, Força Divina — aura que espelha o próprio Poder atual para as
   demais cartas da mesma via. Fica em módulo próprio (padrão de
   lamina-oferenda.js) para não inchar ainda mais o catálogo monolítico de
   engine.js.

   O valor que ela concede é o Poder ESTÁTICO dela mesma — impresso/julgado +
   Faixa acumulada + bênçãos e maldições em `mods` — e não o Poder exibido
   completo. Isso é proposital: se a contribuição incluísse também as auras
   contínuas que ela recebe (a própria "auraEspelhaPoder", um Amon, um hino),
   duas Sekhem na mesma via (ou uma Sekhem + Amon) criariam uma dependência
   circular na leitura de Poder (A precisa do Poder de B, que precisa do
   Poder de A). O comportamento continua correto no caso comum descrito por
   Bruno — ela nasce 4/1 e escala com bênçãos (Hathor, Heka etc.) — e evita
   qualquer risco de recursão infinita em decomporPartes(). */
export const SEKHEM = {
  key: "sekhem",
  nome: "Sekhem, Força Divina",
  // Registrada via módulo próprio, DEPOIS do laço que popula NOME_CURTO em
  // engine.js — por isso o nomeCurto precisa ser setado direto aqui (mesmo
  // padrão de lamina-oferenda.js e tech-cards.js), não no dicionário.
  nomeCurto: "Sekhem",
  tipo: "Divindade",
  custo: 4,
  poder: 1,
  arch: "buff",
  arte: "sekhem",
  trigger: "continuo",
  efeitos: [{ id: "mirrorOwnPowerToAllies" }],
  texto: "Contínuo: os demais aliados nesta via recebem Poder igual ao Poder (base + bênçãos) de Sekhem.",
  lore: "Sekhem é o poder divino em sua forma mais pura — a força que os deuses emprestam a quem luta ao seu lado.",
};

export function registrarSekhem(cards, byKey) {
  if (byKey[SEKHEM.key]) return SEKHEM;
  cards.push(SEKHEM);
  byKey[SEKHEM.key] = SEKHEM;
  return SEKHEM;
}
