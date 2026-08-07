// @ts-check
/* ==========================================================================
   BIBLIOTECA DE DECKS — persistência local (Fase C, MVP)

   Guarda decks montados pelo jogador no `localStorage` do navegador, sob a
   chave `ge_decks`. Sobrevive ao fechamento do app: o mesmo navegador/aparelho
   reencontra os decks depois. NÃO sincroniza entre aparelhos — isso exigirá o
   backend (login + banco) previsto para uma fase posterior.

   TODA a lógica aqui é PURA: opera sobre um objeto `store` em memória e devolve
   um novo `store` (ou `{ store, error }`). Ler/gravar no `localStorage` são as
   duas ÚNICAS funções com efeito colateral (loadStore/saveStore), isoladas no
   fim. Assim os testes exercitam as regras sem tocar em `localStorage`.

   Sem repetição de regra do jogo: a validação de deck (12 cartas, sem repetir,
   só chaves escolhíveis) usa a coleção do próprio `engine.js`. O `CONTENT_SIG`
   é gravado em cada deck no momento em que salva, para no futuro sinalizarmos
   um deck "desatualizado" quando a coleção mudar.
   ========================================================================== */
import { CARDS, CONTENT_SIG } from "./engine.js";
import { DECK_SIZE } from "./rules.js";

/** @typedef {{id:string,name:string,cards:string[],sig:string|null,createdAt:number,updatedAt:number}} SavedDeck */
/** @typedef {{v:number,decks:SavedDeck[]}} DeckStore */
/** @typedef {{name?:string,cards?:string[],now?:number}} DeckPatch */

export const STORE_KEY = "ge_decks";
export const SCHEMA_V = 2;
export const MAX_DECKS = 20;
export const NAME_MAX = 40;
export { DECK_SIZE };

// Conjunto de chaves ESCOLHÍVEIS (a coleção; exclui Pragas outorgadas e fichas).
const SELECIONAVEIS = new Set(CARDS.map((c) => c.key));

export function emptyStore() {
  return { v: SCHEMA_V, decks: [] };
}

/* Normaliza qualquer coisa que tenha vindo do `localStorage` num store válido.
   Corrupção, versão antiga ou formato inesperado degradam para vazio em vez de
   quebrar o app. Cada deck é saneado individualmente: um deck podre é
   descartado, os demais sobrevivem. */
export function parseStore(raw) {
  if (raw == null) return emptyStore();
  let obj = raw;
  if (typeof raw === "string") {
    try { obj = JSON.parse(raw); } catch { return emptyStore(); }
  }
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.decks)) return emptyStore();
  const migrated = migrateStore(obj);
  const decks = [];
  for (const d of migrated.decks) {
    if (!d || typeof d !== "object") continue;
    if (typeof d.id !== "string" || typeof d.name !== "string") continue;
    if (!Array.isArray(d.cards)) continue;
    decks.push({
      id: d.id,
      name: d.name.slice(0, NAME_MAX),
      cards: d.cards.filter((k) => typeof k === "string"),
      sig: typeof d.sig === "string" ? d.sig : null,
      createdAt: Number.isFinite(d.createdAt) ? d.createdAt : Date.now(),
      updatedAt: Number.isFinite(d.updatedAt) ? d.updatedAt : Date.now(),
    });
    if (decks.length >= MAX_DECKS) break; // teto duro mesmo se o arquivo veio inflado
  }
  return { v: SCHEMA_V, decks };
}

/** Migra formatos conhecidos sem descartar decks válidos do jogador. */
export function migrateStore(store) {
  const version = Number.isInteger(store?.v) ? store.v : 1;
  if (version > SCHEMA_V) return emptyStore();
  let current = { ...store, v: version };
  if (current.v === 1) {
    current = {
      v: 2,
      decks: current.decks.map((deck) => ({ ...deck, sig: typeof deck.sig === "string" ? deck.sig : null })),
    };
  }
  return current;
}

let idSeq = 0;
export function newDeckId() {
  idSeq += 1;
  const rnd = Math.random().toString(36).slice(2, 8);
  return `d_${Date.now().toString(36)}_${idSeq.toString(36)}${rnd}`;
}

/* Valida um nome: obrigatório, sem espaços nas pontas, limitado. Devolve o nome
   saneado ou um erro. */
export function nomeValido(name) {
  const nome = (name ?? "").trim();
  if (!nome) return { ok: false, error: "Dê um nome ao deck." };
  if (nome.length > NAME_MAX) return { ok: false, error: `Nome muito longo (máx. ${NAME_MAX}).` };
  return { ok: true, nome };
}

/* Valida a lista de cartas de um deck contra a regra do jogo: exatamente 12,
   sem repetição, todas escolhíveis. Reaproveita a coleção do engine — não há
   segunda fonte de verdade. */
export function deckValido(cards) {
  if (!Array.isArray(cards)) return { ok: false, error: "Deck inválido." };
  if (cards.length !== DECK_SIZE) return { ok: false, error: `O deck precisa ter exatamente ${DECK_SIZE} cartas.` };
  if (new Set(cards).size !== cards.length) return { ok: false, error: "Há cartas repetidas no deck." };
  const desconhecida = cards.find((k) => !SELECIONAVEIS.has(k));
  if (desconhecida) return { ok: false, error: `Carta desconhecida: ${desconhecida}.` };
  return { ok: true };
}

// Um deck está "íntegro" para jogar se passa na validação atual da coleção.
export function deckIntegro(deck) {
  return deckValido(deck?.cards).ok && deck?.sig === CONTENT_SIG;
}

/* ---------------------------- operações puras ---------------------------- */
// Cada uma recebe `store`, devolve `{ store }` novo em sucesso ou `{ store, error }`
// preservando o store original em falha. Nunca muta o store recebido.

/** @param {DeckStore} store @param {DeckPatch} [options] */
export function addDeck(store, { name, cards, now = Date.now() } = {}) {
  if (store.decks.length >= MAX_DECKS)
    return { store, error: `Limite de ${MAX_DECKS} decks atingido. Apague um para salvar outro.` };
  const vn = nomeValido(name);
  if (!vn.ok) return { store, error: vn.error };
  const vc = deckValido(cards);
  if (!vc.ok) return { store, error: vc.error };
  const deck = {
    id: newDeckId(), name: vn.nome, cards: [...cards],
    sig: CONTENT_SIG, createdAt: now, updatedAt: now,
  };
  return { store: { ...store, decks: [...store.decks, deck] }, deck };
}

/** @param {DeckStore} store @param {string} id @param {DeckPatch} [options] */
export function updateDeck(store, id, { name, cards, now = Date.now() } = {}) {
  const i = store.decks.findIndex((d) => d.id === id);
  if (i < 0) return { store, error: "Deck não encontrado." };
  const patch = { ...store.decks[i], updatedAt: now };
  if (name != null) {
    const vn = nomeValido(name);
    if (!vn.ok) return { store, error: vn.error };
    patch.name = vn.nome;
  }
  if (cards != null) {
    const vc = deckValido(cards);
    if (!vc.ok) return { store, error: vc.error };
    patch.cards = [...cards];
    patch.sig = CONTENT_SIG; // regravou o conteúdo → reassina
  }
  const decks = store.decks.slice();
  decks[i] = patch;
  return { store: { ...store, decks }, deck: patch };
}

export function renameDeck(store, id, name) {
  return updateDeck(store, id, { name });
}

/** @param {DeckStore} store @param {string} id @param {{now?:number}} [options] */
export function duplicateDeck(store, id, { now = Date.now() } = {}) {
  if (store.decks.length >= MAX_DECKS)
    return { store, error: `Limite de ${MAX_DECKS} decks atingido. Apague um para duplicar.` };
  const src = store.decks.find((d) => d.id === id);
  if (!src) return { store, error: "Deck não encontrado." };
  const base = `${src.name} (cópia)`.slice(0, NAME_MAX);
  const deck = {
    id: newDeckId(), name: base, cards: [...src.cards],
    sig: src.sig, createdAt: now, updatedAt: now,
  };
  return { store: { ...store, decks: [...store.decks, deck] }, deck };
}

export function deleteDeck(store, id) {
  const decks = store.decks.filter((d) => d.id !== id);
  if (decks.length === store.decks.length) return { store, error: "Deck não encontrado." };
  return { store: { ...store, decks } };
}

/* ----------------------- efeitos colaterais (I/O) ------------------------ */
// As DUAS únicas funções que tocam o `localStorage`. Tudo protegido: navegador
// sem storage, modo privado ou cota estourada não podem derrubar o app.

export function loadStore() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return emptyStore();
    return parseStore(window.localStorage.getItem(STORE_KEY));
  } catch {
    return emptyStore();
  }
}

export function saveStore(store) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ v: SCHEMA_V, decks: store.decks }));
    return true;
  } catch {
    return false;
  }
}
