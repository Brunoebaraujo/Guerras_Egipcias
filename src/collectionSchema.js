// @ts-check
import { CARDS, PRAGAS, TOKENS, GLYPH } from "./engine.js";

const REQUIRED_FIELDS = ["key", "nome", "tipo", "custo", "poder", "arch"];
const META_FIELDS = new Set([
  ...REQUIRED_FIELDS, "nomeCurto", "texto", "lore", "arte", "arteFoco", "set",
  "tipos", "abertura", "ordem",
]);

/* Flags de regra atualmente reconhecidas pelo motor. Enquanto o Registry de
   Efeitos não existe, esta lista torna typos em definições um erro de CI em vez
   de uma carta que silenciosamente não faz nada. */
const EFFECT_FIELDS = new Set([
  "trigger", "token", "veneno", "absorb", "anthemType", "anthemVal", "invocar",
  "randomBuffAlly", "buffNext", "scatterEnemies", "destroyAllOfTypeInLane", "block",
  "fuse", "move", "growPerPlay", "wipeCost", "afogaCusto", "spreadPerLane",
  "judgeLane", "buffsPerBlessing", "venenoAlvos", "replicaVeneno", "finalizador",
  "ecoUltimo", "animalNaVia", "protegeVia", "moverAnimal", "ganhoPorAnimalMorto",
  "bonusPorViaCheia", "bonusPorAnimal", "buffNextDraw", "buffRandomHandCard",
  "ativavelPorJogador", "spreadOnBlessing", "destroyOwnLane", "armadura",
  "destroyAll", "bennu", "heka", "anubis", "sobek", "sekhmet", "khnum",
  "praga", "outorga", "afoga", "sacrificio", "retorna", "silencia", "maat",
]);

export const KNOWN_CARD_FIELDS = new Set([...META_FIELDS, ...EFFECT_FIELDS]);

/** @param {Array<Record<string, any>>} [cards] */
export function validarColecao(cards = [...CARDS, ...PRAGAS, ...TOKENS]) {
  const errors = [];
  const seen = new Set();
  for (const card of cards) {
    const label = card?.key || "<sem-chave>";
    for (const field of REQUIRED_FIELDS) {
      if (card?.[field] === undefined) errors.push(`${label}: falta ${field}`);
    }
    if (seen.has(card?.key)) errors.push(`chave duplicada: ${label}`);
    seen.add(card?.key);
    if (!Number.isInteger(card?.custo) || card.custo < 0) errors.push(`${label}: custo inválido`);
    if (!Number.isFinite(card?.poder)) errors.push(`${label}: poder inválido`);
    if (card?.arch != null && !GLYPH[card.arch]) errors.push(`${label}: arch desconhecido "${card.arch}"`);
    for (const field of Object.keys(card || {})) {
      if (!KNOWN_CARD_FIELDS.has(field)) errors.push(`${label}: campo desconhecido "${field}"`);
    }
  }
  return errors;
}
