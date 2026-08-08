import { describe, it, expect } from "vitest";
import { CARDS, CONTENT_SIG } from "./engine.js";
import {
  emptyStore, parseStore, migrateStore, addDeck, updateDeck, renameDeck, duplicateDeck, deleteDeck,
  deckValido, deckIntegro, estadoDoDeck, deckJogavel, nomeValido, MAX_DECKS, NAME_MAX, DECK_SIZE,
} from "./deckLibrary.js";

// Um deck válido de 12 chaves escolhíveis distintas, tirado da própria coleção.
const doze = CARDS.slice(0, DECK_SIZE).map((c) => c.key);
const outroDoze = CARDS.slice(1, DECK_SIZE + 1).map((c) => c.key);

describe("deckValido", () => {
  it("aceita 12 cartas únicas e escolhíveis", () => {
    expect(deckValido(doze).ok).toBe(true);
  });
  it("rejeita quantidade diferente de 12", () => {
    expect(deckValido(doze.slice(0, 11)).ok).toBe(false);
    expect(deckValido([...doze, CARDS[DECK_SIZE].key]).ok).toBe(false);
  });
  it("rejeita repetição", () => {
    const rep = [...doze.slice(0, 11), doze[0]];
    expect(deckValido(rep).ok).toBe(false);
  });
  it("rejeita chave inexistente ou não escolhível", () => {
    const bad = [...doze.slice(0, 11), "nao-existe"];
    expect(deckValido(bad).ok).toBe(false);
    // Uma Praga não é escolhível: não pode ser salva num deck.
    const comPraga = [...doze.slice(0, 11), "sangue"];
    expect(deckValido(comPraga).ok).toBe(false);
  });
});

describe("nomeValido", () => {
  it("exige nome não vazio e apara espaços", () => {
    expect(nomeValido("   ").ok).toBe(false);
    expect(nomeValido("  Meu Deck  ")).toEqual({ ok: true, nome: "Meu Deck" });
  });
  it("rejeita nome longo demais", () => {
    expect(nomeValido("x".repeat(NAME_MAX + 1)).ok).toBe(false);
  });
});

describe("addDeck", () => {
  it("adiciona, carimba sig e timestamps", () => {
    const { store, deck, error } = addDeck(emptyStore(), { name: "Sacrifício", cards: doze, now: 1000 });
    expect(error).toBeUndefined();
    expect(store.decks).toHaveLength(1);
    expect(deck.name).toBe("Sacrifício");
    expect(deck.cards).toEqual(doze);
    expect(deck.sig).toBe(CONTENT_SIG);
    expect(deck.createdAt).toBe(1000);
    expect(deck.updatedAt).toBe(1000);
    expect(typeof deck.id).toBe("string");
  });

  it("não muta o store recebido", () => {
    const s0 = emptyStore();
    addDeck(s0, { name: "A", cards: doze });
    expect(s0.decks).toHaveLength(0);
  });

  it("rejeita nome inválido e deck inválido", () => {
    expect(addDeck(emptyStore(), { name: "", cards: doze }).error).toBeTruthy();
    expect(addDeck(emptyStore(), { name: "ok", cards: doze.slice(0, 5) }).error).toBeTruthy();
  });

  it("bloqueia no teto de 20 decks", () => {
    let store = emptyStore();
    for (let i = 0; i < MAX_DECKS; i++) {
      const r = addDeck(store, { name: `Deck ${i}`, cards: doze });
      expect(r.error).toBeUndefined();
      store = r.store;
    }
    expect(store.decks).toHaveLength(MAX_DECKS);
    const cheio = addDeck(store, { name: "Excedente", cards: doze });
    expect(cheio.error).toMatch(/Limite/);
    expect(cheio.store.decks).toHaveLength(MAX_DECKS);
  });

  it("gera ids distintos", () => {
    let store = emptyStore();
    store = addDeck(store, { name: "A", cards: doze }).store;
    store = addDeck(store, { name: "B", cards: doze }).store;
    expect(store.decks[0].id).not.toBe(store.decks[1].id);
  });
});

describe("updateDeck / renameDeck", () => {
  const base = () => addDeck(emptyStore(), { name: "Original", cards: doze, now: 1 }).store;

  it("troca as cartas, reassina e avança updatedAt", () => {
    const store = base();
    const id = store.decks[0].id;
    const { store: s2, error } = updateDeck(store, id, { cards: outroDoze, now: 999 });
    expect(error).toBeUndefined();
    expect(s2.decks[0].cards).toEqual(outroDoze);
    expect(s2.decks[0].sig).toBe(CONTENT_SIG);
    expect(s2.decks[0].updatedAt).toBe(999);
    expect(s2.decks[0].createdAt).toBe(1); // preserva a criação
  });

  it("renomeia sem tocar nas cartas", () => {
    const store = base();
    const id = store.decks[0].id;
    const { store: s2 } = renameDeck(store, id, "Novo Nome");
    expect(s2.decks[0].name).toBe("Novo Nome");
    expect(s2.decks[0].cards).toEqual(doze);
  });

  it("rejeita cartas inválidas na atualização", () => {
    const store = base();
    const id = store.decks[0].id;
    const r = updateDeck(store, id, { cards: doze.slice(0, 3) });
    expect(r.error).toBeTruthy();
    expect(r.store.decks[0].cards).toEqual(doze); // inalterado
  });

  it("erro quando o id não existe", () => {
    expect(updateDeck(base(), "inexistente", { name: "x" }).error).toBeTruthy();
  });
});

describe("duplicateDeck", () => {
  it("clona com novo id e sufixo (cópia)", () => {
    const store = addDeck(emptyStore(), { name: "Meu", cards: doze }).store;
    const { store: s2, deck } = duplicateDeck(store, store.decks[0].id);
    expect(s2.decks).toHaveLength(2);
    expect(deck.name).toBe("Meu (cópia)");
    expect(deck.cards).toEqual(doze);
    expect(deck.id).not.toBe(store.decks[0].id);
  });
  it("respeita o teto", () => {
    let store = emptyStore();
    for (let i = 0; i < MAX_DECKS; i++) store = addDeck(store, { name: `D${i}`, cards: doze }).store;
    const r = duplicateDeck(store, store.decks[0].id);
    expect(r.error).toMatch(/Limite/);
  });
});

describe("deleteDeck", () => {
  it("remove pelo id", () => {
    let store = addDeck(emptyStore(), { name: "A", cards: doze }).store;
    store = addDeck(store, { name: "B", cards: doze }).store;
    const id = store.decks[0].id;
    const { store: s2, error } = deleteDeck(store, id);
    expect(error).toBeUndefined();
    expect(s2.decks).toHaveLength(1);
    expect(s2.decks.find((d) => d.id === id)).toBeUndefined();
  });
  it("erro se o id não existe", () => {
    expect(deleteDeck(emptyStore(), "x").error).toBeTruthy();
  });
});

describe("parseStore — robustez de persistência", () => {
  it("nulo/indefinido vira store vazio", () => {
    expect(parseStore(null)).toEqual(emptyStore());
    expect(parseStore(undefined)).toEqual(emptyStore());
  });
  it("JSON corrompido não quebra", () => {
    expect(parseStore("{isso não é json")).toEqual(emptyStore());
  });
  it("formato inesperado degrada para vazio", () => {
    expect(parseStore('{"decks": "não é array"}')).toEqual(emptyStore());
    expect(parseStore("[]")).toEqual(emptyStore());
  });
  it("saneia decks individuais e descarta os podres", () => {
    const raw = JSON.stringify({
      v: 1,
      decks: [
        { id: "d1", name: "Bom", cards: doze, createdAt: 5, updatedAt: 6 },
        { id: 42, name: "sem id string", cards: doze },   // descartado
        { name: "sem id", cards: doze },                   // descartado
        { id: "d2", name: "sem cards" },                   // descartado
      ],
    });
    const store = parseStore(raw);
    expect(store.decks).toHaveLength(1);
    expect(store.decks[0].id).toBe("d1");
    expect(store.decks[0].sig).toBeNull(); // faltava sig → null
  });
  it("aplica o teto mesmo se o arquivo veio inflado", () => {
    const decks = Array.from({ length: 30 }, (_, i) => ({ id: `d${i}`, name: `D${i}`, cards: doze }));
    const store = parseStore(JSON.stringify({ v: 1, decks }));
    expect(store.decks.length).toBeLessThanOrEqual(MAX_DECKS);
  });
  it("round-trip: salvar e reler preserva os decks", () => {
    const salvo = addDeck(emptyStore(), { name: "Persistente", cards: doze, now: 7 }).store;
    const relido = parseStore(JSON.stringify({ v: 1, decks: salvo.decks }));
    expect(relido.decks[0].name).toBe("Persistente");
    expect(relido.decks[0].cards).toEqual(doze);
  });

  it("migra v1 para o schema atual preservando decks e marcando sig ausente", () => {
    const migrated = migrateStore({ v: 1, decks: [{ id: "d1", name: "Legado", cards: doze }] });
    expect(migrated.v).toBe(2);
    expect(migrated.decks[0]).toMatchObject({ id: "d1", sig: null });
  });

  it("não tenta interpretar schema futuro", () => {
    expect(migrateStore({ v: 999, decks: [{ id: "x" }] })).toEqual(emptyStore());
  });
});

describe("deckIntegro", () => {
  it("exige cartas válidas e assinatura de conteúdo atual", () => {
    expect(deckIntegro({ cards: doze, sig: CONTENT_SIG })).toBe(true);
    expect(deckIntegro({ cards: doze.slice(0, 8) })).toBe(false);
    expect(deckIntegro({ cards: doze, sig: "desatualizada" })).toBe(false);
  });
});

/* "Desatualizado" e "inválido" eram o mesmo booleano, então o jogador recebia
   "edite antes de jogar" para um deck que continuava perfeitamente jogável —
   só assinado antes de a coleção mudar. São coisas diferentes: uma é aviso, a
   outra é impedimento. */
describe("estadoDoDeck", () => {
  it("deck assinado com a coleção atual está ok", () => {
    expect(estadoDoDeck({ cards: doze, sig: CONTENT_SIG })).toEqual({ estado: "ok" });
  });

  it("cartas legais com assinatura antiga é DESATUALIZADO, não inválido", () => {
    const r = estadoDoDeck({ cards: doze, sig: "assinatura-de-outra-epoca" });
    expect(r.estado).toBe("desatualizado");
    expect(r.motivo).toBeUndefined();       // não há defeito a corrigir
  });

  it("assinatura ausente também é desatualizado — decks salvos antes do campo", () => {
    expect(estadoDoDeck({ cards: doze }).estado).toBe("desatualizado");
    expect(estadoDoDeck({ cards: doze, sig: null }).estado).toBe("desatualizado");
  });

  it("cartas erradas é INVÁLIDO, e diz por quê", () => {
    expect(estadoDoDeck({ cards: doze.slice(0, 8), sig: CONTENT_SIG }).estado).toBe("invalido");
    expect(estadoDoDeck({ cards: doze.slice(0, 8), sig: CONTENT_SIG }).motivo).toMatch(/12 cartas/);
    const repetido = [...doze.slice(0, 11), doze[0]];
    expect(estadoDoDeck({ cards: repetido, sig: CONTENT_SIG }).motivo).toMatch(/repetidas/);
  });

  it("inválido vence desatualizado — o impedimento é a informação útil", () => {
    const r = estadoDoDeck({ cards: doze.slice(0, 8), sig: "antiga" });
    expect(r.estado).toBe("invalido");
  });

  it("deck desatualizado continua jogável; inválido não", () => {
    expect(deckJogavel({ cards: doze, sig: "antiga" })).toBe(true);
    expect(deckJogavel({ cards: doze, sig: CONTENT_SIG })).toBe(true);
    expect(deckJogavel({ cards: doze.slice(0, 8), sig: CONTENT_SIG })).toBe(false);
    expect(deckJogavel(null)).toBe(false);
  });
});
