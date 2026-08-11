import { describe, expect, it } from "vitest";
import { applyAction, autoReveal, freshMatch } from "./match.js";
import { decideRandomPlacement, legalPlacements } from "./domain/bots/decide.js";
import { runBotPlanning } from "./match/bots/controller.js";
import { createRng } from "./domain/rng.js";
import { BOT_LEVELS, BOT_LEVEL_ORDER } from "./domain/bots/index.js";

const deckA = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "montu", "hathor", "escaravelho", "ammit", "mumia", "sobek"];
const deckB = ["cao", "cabra-nilo", "ganso", "gato", "macaco", "hiena", "garca", "rebanho", "domador", "apis", "amon", "escaravelho"];

describe("domain/bots/decide — legalidade", () => {
  it("legalPlacements só devolve jogadas que a energia paga e a via aceita", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-legal-1" });
    const opcoes = legalPlacements(state, 0);
    for (const { hid, lane, custo } of opcoes) {
      expect(state.energy[0]).toBeGreaterThanOrEqual(custo);
      expect(state.hand[0].some((h) => h.hid === hid)).toBe(true);
      expect(lane).toBeGreaterThanOrEqual(0);
      expect(lane).toBeLessThanOrEqual(2);
    }
  });

  it("decideRandomPlacement só devolve ações que applyAction aceita", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-legal-2" });
    const rng = createRng("bots-legal-2");
    const action = decideRandomPlacement({ state, side: 1, rng });
    expect(action).not.toBeNull();
    const r = applyAction(state, action);
    expect(r.error).toBeUndefined();
  });

  it("devolve null quando a mão não tem nada pagável (energia zerada)", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-legal-3" });
    state.energy = [0, 0]; // simula rodada sem energia — cartas custam >0
    const action = decideRandomPlacement({ state, side: 0, rng: createRng("x") });
    expect(action).toBeNull();
  });
});

describe("match/bots/controller — runBotPlanning", () => {
  it("joga só cartas legais e para quando não há mais jogada boa", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-ctrl-1" });
    const rng = createRng("bots-ctrl-1");
    const { state: after, stopped } = runBotPlanning({ state, side: 1, decide: decideRandomPlacement, rng });
    expect(["done", "max"]).toContain(stopped);
    // Toda carta que saiu da mão está no tabuleiro, não revelada, do lado 1.
    const noTabuleiro = after.board.filter((c) => c.owner === 1 && !c.revealed);
    expect(noTabuleiro.length).toBeGreaterThan(0);
    expect(after.energy[1]).toBeGreaterThanOrEqual(0);
  });

  it("é determinístico: mesma seed produz a mesma sequência de jogadas", () => {
    const rodar = () => {
      const state = freshMatch([deckA, deckB], { seed: "bots-ctrl-det" });
      const rng = createRng("bots-ctrl-det");
      return runBotPlanning({ state, side: 1, decide: decideRandomPlacement, rng }).state;
    };
    expect(JSON.stringify(rodar())).toBe(JSON.stringify(rodar()));
  });

  it("não faz nada fora da fase de planejamento (segurança contra chamada indevida)", () => {
    let state = freshMatch([deckA, deckB], { seed: "bots-ctrl-2" });
    state = applyAction(state, { t: "startReveal" }).state;
    const { state: after, steps } = runBotPlanning({ state, side: 1, decide: decideRandomPlacement, rng: createRng("z") });
    expect(steps).toBe(0);
    expect(after).toBe(state);
  });
});

describe("integração: partida inteira com o bot controlando o Lado B", () => {
  it("uma partida de 6 rodadas conduzida pelo bot chega ao fim sem erros", () => {
    let state = freshMatch([deckA, deckB], { seed: "bots-full-match" });
    const rng = createRng("bots-full-match");
    for (let round = 1; round <= 6; round++) {
      // Lado A (humano simulado): joga a primeira carta pagável em cada via livre.
      for (const h of [...state.hand[0]]) {
        const legalA = legalPlacements(state, 0).find((op) => op.hid === h.hid);
        if (!legalA) continue;
        const r = applyAction(state, { t: "place", side: 0, hid: h.hid, lane: legalA.lane });
        if (!r.error) state = r.state;
      }
      // Lado B (bot): decide sozinho via o mesmo controller que a UI vai usar.
      state = runBotPlanning({ state, side: 1, decide: decideRandomPlacement, rng }).state;

      const reveal = applyAction(state, { t: "startReveal" });
      expect(reveal.error).toBeUndefined();
      state = reveal.state;
      const { state: revealed, error } = autoReveal(state, { rng });
      expect(error).toBeUndefined();
      state = revealed;

      if (round < 6) {
        const next = applyAction(state, { t: "nextRound" });
        expect(next.error).toBeUndefined();
        state = next.state;
      }
    }
    const finish = applyAction(state, { t: "finish" });
    expect(finish.error).toBeUndefined();
    expect(finish.state.finished).toBe(true);
  });
});

describe("domain/bots/index — registro de níveis", () => {
  it("expõe os três níveis na ordem fácil → médio → difícil", () => {
    expect(BOT_LEVEL_ORDER).toEqual(["facil", "medio", "dificil"]);
  });

  it("só 'facil' está disponível nesta onda; médio/difícil aguardam decisão real", () => {
    expect(BOT_LEVELS.facil.disponivel).toBe(true);
    expect(typeof BOT_LEVELS.facil.decide).toBe("function");
    expect(BOT_LEVELS.medio.disponivel).toBe(false);
    expect(BOT_LEVELS.dificil.disponivel).toBe(false);
  });
});
