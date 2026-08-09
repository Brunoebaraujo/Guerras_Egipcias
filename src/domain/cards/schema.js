// @ts-check
import { CARDS, PRAGAS, TOKENS, GLYPH } from "../engine.js";
/* O registry precisa estar POVOADO quando a validação roda: importar
   `effects/index.js` (e não só `registry.js`) é o que garante isso. */
import { getEffect } from "../effects/index.js";

const REQUIRED_FIELDS = ["key", "nome", "tipo", "custo", "poder", "arch"];
const META_FIELDS = new Set([
  ...REQUIRED_FIELDS, "nomeCurto", "texto", "lore", "arte", "arteFoco", "set",
  "tipos", "abertura", "ordem", "efeitos",
]);

/* Campos ESTRUTURAIS que não são efeitos: classificam a carta ou o modo de
   entrega, e por isso continuam na definição. Todo PARÂMETRO de efeito vive em
   `efeitos[]` — não há mais flag paralela. Um campo fora desta lista e fora de
   META_FIELDS é erro de validação, o que impede que uma flag legada volte a
   nascer sem que ninguém a leia. */
const EFFECT_FIELDS = new Set([
  "trigger", "token", "praga", "outorga", "efemera", "showcaseOnEntry",
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
    if (card?.efeitos !== undefined && !Array.isArray(card.efeitos)) {
      errors.push(`${label}: efeitos deve ser uma lista`);
    } else if (Array.isArray(card?.efeitos)) {
      const effectIds = new Set();
      for (const effect of card.efeitos) {
        if (!effect || typeof effect.id !== "string" || !effect.id) {
          errors.push(`${label}: efeito sem id válido`);
          continue;
        }
        if (effectIds.has(effect.id)) errors.push(`${label}: efeito duplicado "${effect.id}"`);
        effectIds.add(effect.id);
        /* GUARDA: um id que não existe no registry é um efeito que nunca vai
           rodar. Sem esta checagem a carta ganha texto, arte e teste de tipo, e
           silenciosamente não faz nada — que é exatamente a armadilha que o
           `trigger: "morrer"` decorativo era antes de virar evento. */
        if (!getEffect(effect.id)) errors.push(`${label}: efeito "${effect.id}" não está registrado`);
      }
    }
    if (card?.trigger && !card?.efeitos?.length) errors.push(`${label}: trigger sem efeito registrado`);
  }
  return errors;
}
