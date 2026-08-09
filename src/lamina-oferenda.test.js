import { describe, it, expect } from "vitest";
import { byKey, ctxOf, power } from "./engine.js";
import { resolveEffectPhase } from "./domain/effects/index.js";
import { validarColecao } from "./domain/cards/schema.js";
import { runRevealPipeline } from "./match/revealPipeline.js";

const primeiro = () => 0;

const mk = (key, { uid, owner = 0, lane = 0, entryPlays = 0, ...rest } = {}) => ({
  uid,
  key,
  owner,
  lane,
  printed: byKey[key].poder,
  baked: 0,
  mods: [],
  revealed: true,
  dying: false,
  entryPlays,
  enteredRound: 1,
  moved: false,
  ...rest,
});

function stateCom(board) {
  return {
    board,
    deaths: [0, 0],
    destroyedPower: [0, 0],
    plays: [6, 0],
    hand: [[], []],
    deck: [[], []],
    pendingEnergy: [0, 0],
    pendingReturn: [],
    blessings: [],
    effectSeq: 7,
    log: [],
    trace: [],
  };
}

function armar(state, lamina) {
  return resolveEffectPhase({
    state,
    source: lamina,
    definition: byKey[lamina.key],
    phase: "enter",
    rng: primeiro,
  });
}

describe("Lâmina de Oferenda — definição", () => {
  it("é uma Ferramenta 1/2 do arquétipo Sacrifício", () => {
    const def = byKey["lamina-oferenda"];
    expect(def).toBeTruthy();
    expect(def.tipo).toBe("Ferramenta");
    expect(def.custo).toBe(1);
    expect(def.poder).toBe(2);
    expect(def.arch).toBe("sacrificio");
    expect(def.nomeCurto).toBe("Lâmina");
    expect(def.efeitos).toEqual([{ id: "armNextOwnSacrifice", value: 1, quantity: 2 }]);
  });

  it("passa pela validação declarativa da coleção", () => {
    expect(validarColecao()).toEqual([]);
  });
});

describe("Lâmina de Oferenda — resolução", () => {
  it("deixa o Ao Entrar da vítima resolver, depois a destrói e dá +1 a dois aliados distintos", () => {
    const lamina = mk("lamina-oferenda", { uid: 1, entryPlays: 1 });
    const vitima = mk("arqueiro", { uid: 2, entryPlays: 2 });
    const aliado1 = mk("servo", { uid: 3, lane: 0, entryPlays: 3 });
    const aliado2 = mk("lanceiro", { uid: 4, lane: 1, entryPlays: 4 });
    const aliado3 = mk("guardareal", { uid: 5, lane: 2, entryPlays: 5 });
    const state = stateCom([lamina, vitima, aliado1, aliado2, aliado3]);
    armar(state, lamina);

    runRevealPipeline({ state, card: vitima, rng: primeiro }, [{
      name: "resolver-efeito-da-carta",
      run: ({ card }) => card.mods.push({ src: "Ao Entrar de teste", val: 5 }),
    }]);

    // O +5 foi aplicado ANTES da morte: destroyedPower fotografa Poder 8, não 3.
    expect(state.destroyedPower[0]).toBe(8);
    expect(vitima.dying).toBeTruthy();
    expect(state.deaths[0]).toBe(1);

    // rng=0 pega os dois primeiros candidatos, sem repetição.
    expect(power(aliado1, ctxOf(state))).toBe(2);
    expect(power(aliado2, ctxOf(state))).toBe(5);
    expect(power(aliado3, ctxOf(state))).toBe(8);
    expect(lamina.mods).toHaveLength(0);
    expect(lamina.aguardaSacrificio).toBe(false);
  });

  it("não reage à carta do adversário", () => {
    const lamina = mk("lamina-oferenda", { uid: 1, owner: 0, entryPlays: 1 });
    const inimiga = mk("arqueiro", { uid: 2, owner: 1, entryPlays: 1 });
    const state = stateCom([lamina, inimiga]);
    armar(state, lamina);

    runRevealPipeline({ state, card: inimiga, rng: primeiro }, [{
      name: "resolver-efeito-da-carta", run: () => undefined,
    }]);

    expect(inimiga.dying).toBe(false);
    expect(state.deaths).toEqual([0, 0]);
    expect(lamina.aguardaSacrificio).toBe(true);
  });

  it("perde a reserva se a própria Lâmina sair de jogo antes da próxima carta", () => {
    const lamina = mk("lamina-oferenda", { uid: 1, entryPlays: 1 });
    const vitima = mk("arqueiro", { uid: 2, entryPlays: 2 });
    const aliado = mk("servo", { uid: 3, entryPlays: 3 });
    const state = stateCom([lamina, vitima, aliado]);
    armar(state, lamina);
    lamina.dying = 6;

    runRevealPipeline({ state, card: vitima, rng: primeiro }, [{
      name: "resolver-efeito-da-carta", run: () => undefined,
    }]);

    expect(vitima.dying).toBe(false);
    expect(state.deaths[0]).toBe(0);
    expect(aliado.mods).toHaveLength(0);
  });

  it("com apenas um aliado válido, concede apenas um +1", () => {
    const lamina = mk("lamina-oferenda", { uid: 1, entryPlays: 1 });
    const vitima = mk("arqueiro", { uid: 2, entryPlays: 2 });
    const aliado = mk("servo", { uid: 3, entryPlays: 3 });
    const state = stateCom([lamina, vitima, aliado]);
    armar(state, lamina);

    runRevealPipeline({ state, card: vitima, rng: primeiro }, [{
      name: "resolver-efeito-da-carta", run: () => undefined,
    }]);

    expect(vitima.dying).toBeTruthy();
    expect(aliado.mods.filter((m) => m.src === "Lâmina de Oferenda" && m.val === 1)).toHaveLength(1);
    expect(lamina.mods).toHaveLength(0);
  });
});
