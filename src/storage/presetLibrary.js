// @ts-check
/* ==========================================================================
   BIBLIOTECA DE PRESETS — sobrescritas locais dos decks pré-configurados.

   Os presets (`"Padrão"`, `"Exército"`, `"Sacrifício"`...) nascem como listas
   fixas de chaves em `src/ui/decks/DeckUi.jsx` (`DEFAULT_PRESETS`). Esta
   biblioteca guarda, no `localStorage` do navegador (chave `ge_preset_overrides`),
   as EDIÇÕES que o jogador faz em cima deles — sem tocar no código-fonte.
   Mesmo formato de responsabilidade do `deckLibrary.js`: tudo aqui é puro
   (recebe um objeto de overrides, devolve um novo), e só `loadOverrides` /
   `saveOverrides` tocam o navegador de verdade.

   Um preset SEM entrada em `overrides` usa o padrão do código. Editar salva
   uma entrada; "restaurar padrão" apaga a entrada — nunca dá pra corromper o
   preset original, porque ele nunca é escrito, só sombreado.

   Presets dos BOTS usam a mesma fonte (`effectivePresets`): a escolha de "deck
   específico" do bot e o preset que o jogador vê e edita em Decks são uma
   coisa só, de propósito — um preset editado vale tanto para montar deck
   quanto para escalar um bot.
   ========================================================================== */
import { CARDS, CONTENT_SIG } from "../domain/engine.js";
import { DECK_SIZE } from "../domain/rules.js";

// Mesmo conjunto de chaves ESCOLHÍVEIS que `deckLibrary.js` usa: exclui Pragas
// outorgadas e fichas, que não são cartas de preset legítimas.
const SELECIONAVEIS = new Set(CARDS.map((c) => c.key));

export const OVERRIDES_KEY = "ge_preset_overrides";
export const OVERRIDES_SCHEMA_V = 1;

/** @typedef {{cards:string[],sig:string,updatedAt:number}} PresetOverride */
/** @typedef {Record<string,PresetOverride>} OverrideMap */

export function emptyOverrides() {
  return {};
}

/* Sanea o que veio do localStorage: uma entrada podre é descartada, as demais
   sobrevivem — mesma filosofia defensiva do deckLibrary. */
export function parseOverrides(raw) {
  if (raw == null) return emptyOverrides();
  let obj = raw;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); } catch { return emptyOverrides(); }
  }
  if (!obj || typeof obj !== "object") return emptyOverrides();
  const source = obj.overrides && typeof obj.overrides === "object" ? obj.overrides : obj;
  const out = {};
  for (const [name, entry] of Object.entries(source)) {
    if (!name || typeof name !== "string") continue;
    if (!entry || typeof entry !== "object" || !Array.isArray(entry.cards)) continue;
    const cards = entry.cards.filter((k) => typeof k === "string");
    out[name] = {
      cards,
      sig: typeof entry.sig === "string" ? entry.sig : null,
      updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now(),
    };
  }
  return out;
}

/** Mesma regra de deck válido usada em `deckLibrary.js`: 12 cartas únicas e escolhíveis. */
export function presetValido(cards) {
  if (!Array.isArray(cards)) return { ok: false, error: "Preset inválido." };
  if (cards.length !== DECK_SIZE) return { ok: false, error: `O preset precisa ter exatamente ${DECK_SIZE} cartas.` };
  if (new Set(cards).size !== cards.length) return { ok: false, error: "Há cartas repetidas no preset." };
  const desconhecida = cards.find((k) => !SELECIONAVEIS.has(k));
  if (desconhecida) return { ok: false, error: `Carta desconhecida: ${desconhecida}.` };
  return { ok: true };
}

/**
 * Estado de uma sobrescrita em relação à coleção atual — mesma distinção de
 * `estadoDoDeck`: um preset editado antes de um rebalanceamento continua
 * jogável, só pode não valer mais o que valia.
 */
export function estadoDoOverride(entry) {
  if (!entry) return { estado: "inexistente" };
  const v = presetValido(entry.cards);
  if (!v.ok) return { estado: "invalido", motivo: v.error };
  if (entry.sig !== CONTENT_SIG) return { estado: "desatualizado" };
  return { estado: "ok" };
}

/** @param {OverrideMap} overrides @param {string} name @param {string[]} cards */
export function setOverride(overrides, name, cards) {
  const v = presetValido(cards);
  if (!v.ok) return { overrides, error: v.error };
  const next = { ...overrides, [name]: { cards: [...cards], sig: CONTENT_SIG, updatedAt: Date.now() } };
  return { overrides: next };
}

/** @param {OverrideMap} overrides @param {string} name */
export function clearOverride(overrides, name) {
  if (!(name in overrides)) return { overrides };
  const next = { ...overrides };
  delete next[name];
  return { overrides: next };
}

/**
 * Mescla os presets padrão do código com as sobrescritas do jogador — o que a
 * UI e os bots realmente devem ler. Um preset ausente do código (renomeado ou
 * removido numa versão futura) simplesmente não aparece mais, mesmo que ainda
 * tenha uma sobrescrita órfã salva.
 *
 * @param {Record<string,string[]>} defaults
 * @param {OverrideMap} overrides
 */
export function effectivePresets(defaults, overrides) {
  const out = {};
  for (const name of Object.keys(defaults)) {
    out[name] = overrides[name]?.cards?.length ? overrides[name].cards : defaults[name];
  }
  return out;
}

/* ----------------------- efeitos colaterais (I/O) ------------------------ */
export function loadOverrides() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return emptyOverrides();
    return parseOverrides(window.localStorage.getItem(OVERRIDES_KEY));
  } catch {
    return emptyOverrides();
  }
}

export function saveOverrides(overrides) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify({ v: OVERRIDES_SCHEMA_V, overrides }));
    return true;
  } catch {
    return false;
  }
}
