import { describe, expect, it } from "vitest";
import { applyAction, autoReveal, freshMatch } from "./match.js";
import { byKey, custoDe } from "./engine.js";
import { decideFacil, decideMedio, decideRandomPlacement, legalPlacements } from "./domain/bots/decide.js";
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

  it("devolve null quando a mão está vazia (nada pra jogar)", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-legal-3" });
    state.hand[0] = []; // sem cartas, nenhuma jogada é legal independente da energia
    const action = decideRandomPlacement({ state, side: 0, rng: createRng("x") });
    expect(action).toBeNull();
  });
});

describe("domain/bots/decide — decideFacil (nível Fácil de verdade)", () => {
  it("prioriza sempre a jogada de maior custo entre as legais", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-facil-1" });
    const action = decideFacil({ state, side: 0, rng: createRng("bots-facil-1") });
    expect(action).not.toBeNull();
    const opcoes = legalPlacements(state, 0);
    const maxCusto = Math.max(...opcoes.map((o) => o.custo));
    const h = state.hand[0].find((x) => x.hid === action.hid);
    expect(custoDe(h)).toBe(maxCusto);
  });

  it("devolve uma ação que applyAction sempre aceita", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-facil-2" });
    const action = decideFacil({ state, side: 1, rng: createRng("bots-facil-2") });
    const r = applyAction(state, action);
    expect(r.error).toBeUndefined();
  });

  it("devolve null quando não há jogada legal (mesmo critério de legalPlacements)", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-facil-3" });
    state.hand[0] = [];
    expect(decideFacil({ state, side: 0, rng: createRng("x") })).toBeNull();
  });

  it("é determinístico: mesma seed produz a mesma sequência de escolhas", () => {
    const rodar = () => {
      const state = freshMatch([deckA, deckB], { seed: "bots-facil-det" });
      const rng = createRng("bots-facil-det");
      return runBotPlanning({ state, side: 1, decide: decideFacil, rng }).state;
    };
    expect(JSON.stringify(rodar())).toBe(JSON.stringify(rodar()));
  });

  it("gasta a energia de forma gulosa: ao final do planejamento, nenhuma carta restante na mão cabe na energia sobrando", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-facil-greedy" });
    const rng = createRng("bots-facil-greedy");
    const { state: after } = runBotPlanning({ state, side: 1, decide: decideFacil, rng });
    const energiaSobrando = after.energy[1];
    const cabeAlgo = after.hand[1].some((h) => custoDe(h) <= energiaSobrando);
    // Só pode sobrar carta jogável se todas as vias já estiverem cheias (4/4 nas 3).
    const viasCheias = [0, 1, 2].every((lane) =>
      after.board.filter((c) => c.owner === 1 && c.lane === lane).length >= 4);
    expect(cabeAlgo && !viasCheias).toBe(false);
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

  it("uma partida de 6 rodadas conduzida pelo nível Fácil (decideFacil) chega ao fim sem erros", () => {
    let state = freshMatch([deckA, deckB], { seed: "bots-full-match-facil" });
    const rng = createRng("bots-full-match-facil");
    for (let round = 1; round <= 6; round++) {
      for (const h of [...state.hand[0]]) {
        const legalA = legalPlacements(state, 0).find((op) => op.hid === h.hid);
        if (!legalA) continue;
        const r = applyAction(state, { t: "place", side: 0, hid: h.hid, lane: legalA.lane });
        if (!r.error) state = r.state;
      }
      state = runBotPlanning({ state, side: 1, decide: BOT_LEVELS.facil.decide, rng }).state;

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

  it("uma partida de 6 rodadas conduzida pelo nível Médio (decideMedio) chega ao fim sem erros", () => {
    let state = freshMatch([deckA, deckB], { seed: "bots-full-match-medio" });
    const rng = createRng("bots-full-match-medio");
    for (let round = 1; round <= 6; round++) {
      for (const h of [...state.hand[0]]) {
        const legalA = legalPlacements(state, 0).find((op) => op.hid === h.hid);
        if (!legalA) continue;
        const r = applyAction(state, { t: "place", side: 0, hid: h.hid, lane: legalA.lane });
        if (!r.error) state = r.state;
      }
      state = runBotPlanning({ state, side: 1, decide: BOT_LEVELS.medio.decide, rng }).state;

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

describe("domain/bots/decide — decideMedio (avaliação de tabuleiro)", () => {
  it("devolve uma ação que applyAction sempre aceita", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-medio-1" });
    const action = decideMedio({ state, side: 1, rng: createRng("bots-medio-1") });
    const r = applyAction(state, action);
    expect(r.error).toBeUndefined();
  });

  it("devolve null quando não há jogada legal", () => {
    const state = freshMatch([deckA, deckB], { seed: "bots-medio-2" });
    state.hand[0] = [];
    expect(decideMedio({ state, side: 0, rng: createRng("x") })).toBeNull();
  });

  it("é determinístico: mesma seed produz a mesma sequência de escolhas", () => {
    const rodar = () => {
      const state = freshMatch([deckA, deckB], { seed: "bots-medio-det" });
      const rng = createRng("bots-medio-det");
      return runBotPlanning({ state, side: 1, decide: decideMedio, rng }).state;
    };
    expect(JSON.stringify(rodar())).toBe(JSON.stringify(rodar()));
  });

  it("prefere reforçar uma via onde já está perdendo em vez de uma via já vencida com folga", () => {
    // Monta um tabuleiro onde o Lado 1 já domina a Via 0 (poder 9 vs 0) e
    // perde a Via 1 (poder 0 vs 6). A mesma carta na mão deveria preferir a
    // Via 1 — é lá que ela muda o resultado da partida.
    let state = freshMatch([deckA, deckB], { seed: "bots-medio-via" });
    state = { ...state, board: [...state.board] };
    const revelada = (owner, lane, key, printed) => ({
      uid: -100 - state.board.length - lane - (owner * 10), key, owner, lane,
      printed, baked: 0, mods: [], revealed: true, dying: false,
      pendentes: 0, custoMod: 0, venenos: [], entryPlays: 0, enteredRound: 1, moved: false,
    });
    state.board.push(revelada(1, 0, "servo", 9), revelada(0, 0, "servo", 0));
    state.board.push(revelada(0, 1, "servo", 6), revelada(1, 1, "servo", 0));
    // Garante que side 1 tenha uma carta jogável nas duas vias (0 e 1 livres).
    const opcoes = legalPlacements(state, 1).filter((o) => o.lane === 0 || o.lane === 1);
    expect(opcoes.length).toBeGreaterThan(0);
    const action = decideMedio({ state, side: 1, rng: createRng("bots-medio-via") });
    expect(action.lane).toBe(1);
  });
});

describe("domain/bots/index — registro de níveis", () => {
  it("expõe os três níveis na ordem fácil → médio → difícil", () => {
    expect(BOT_LEVEL_ORDER).toEqual(["facil", "medio", "dificil"]);
  });

  it("'facil' e 'medio' já jogam de verdade; 'dificil' aguarda decisão real", () => {
    expect(BOT_LEVELS.facil.disponivel).toBe(true);
    expect(BOT_LEVELS.facil.decide).toBe(decideFacil);
    expect(BOT_LEVELS.medio.disponivel).toBe(true);
    expect(BOT_LEVELS.medio.decide).toBe(decideMedio);
    expect(BOT_LEVELS.dificil.disponivel).toBe(false);
    expect(BOT_LEVELS.dificil.decide).toBeNull();
  });
});
