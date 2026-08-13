import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, destroyList, resetUid, nextUid, MAO_MAX,
} from "./engine.js";
import { resolveEffectPhase } from "./domain/effects/index.js"; // garante o registro de Ovo/Ammit
import { validarColecao } from "./domain/cards/schema.js";
import { applyAction, autoReveal } from "./match.js";

const seeded = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], round: 1,
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], destroyedPower: [0, 0],
});

beforeEach(resetUid);

describe("Coleção — Ovo de Ammit / Ammit, a Devoradora", () => {
  it("Ovo de Ammit: 1/1, Criatura, renascimento, fora da Galeria de token", () => {
    const def = byKey["ovo-ammit"];
    expect(def).toBeTruthy();
    expect(def.custo).toBe(1);
    expect(def.poder).toBe(1);
    expect(def.tipo).toBe("Criatura");
    expect(def.arch).toBe("renascimento");
    expect(def.token).toBeUndefined(); // é carta normal, aparece em deck/Galeria
  });

  it("Ammit, a Devoradora: 4/0, ficha (token), sacrifício", () => {
    const def = byKey["ammit"];
    expect(def).toBeTruthy();
    expect(def.custo).toBe(4);
    expect(def.poder).toBe(0);
    expect(def.arch).toBe("sacrificio");
    expect(def.token).toBe(true);
  });

  it("a coleção continua válida com as duas cartas registradas", () => {
    expect(validarColecao()).toEqual([]);
  });
});

describe("Ovo de Ammit (Ao Morrer)", () => {
  it("volta à mão como Ammit, a Devoradora — Poder fixo em 0, não escalado", () => {
    const ovo = mk("ovo-ammit", { mods: [{ src: "Hathor", val: 5 }] }); // poder atual 6, irrelevante aqui
    const s = mkState([ovo]);
    destroyList(s, [ovo]);
    expect(s.hand[0]).toHaveLength(1);
    expect(s.hand[0][0].key).toBe("ammit");
    expect(s.hand[0][0].printed).toBe(0);
    expect(s.hand[0][0].baked).toBe(0);
    expect(s.deaths[0]).toBe(1); // a morte do Ovo é contabilizada normalmente
  });

  it("carrega veneno acumulado para a Ammit que nasce", () => {
    const ovo = mk("ovo-ammit", { venenos: [1, 2] });
    const s = mkState([ovo]);
    destroyList(s, [ovo]);
    expect(s.hand[0][0].venenos).toEqual([1, 2]);
  });

  it("mão cheia: a Ammit fica na pilha de destruídas, não é criada", () => {
    const ovo = mk("ovo-ammit");
    const s = mkState([ovo]);
    s.hand[0] = Array.from({ length: MAO_MAX }, () => ({ hid: nextUid(), key: "servo" }));
    const voltaram = destroyList(s, [ovo]);
    expect(voltaram).toEqual([]);
    expect(s.hand[0]).toHaveLength(MAO_MAX);
  });

  it("não interfere no retorno normal da Múmia (regressão da generalização em destroyList)", () => {
    const mumia = mk("mumia", { mods: [{ src: "Hathor", val: 2 }] }); // 1+2 = 3
    const s = mkState([mumia]);
    destroyList(s, [mumia]);
    expect(s.hand[0][0].key).toBe("mumia");
    expect(s.hand[0][0].printed + s.hand[0][0].baked).toBe(6); // 3 × 2, como sempre
  });
});

describe("Ammit, a Devoradora (Ao Entrar)", () => {
  it("destrói todos os OUTROS aliados na mesma via e absorve o Poder deles", () => {
    const ammit = mk("ammit", { lane: 0 });
    const aliado1 = mk("servo", { lane: 0 }); // poder 1
    const aliado2 = mk("servo", { lane: 0, mods: [{ src: "Hathor", val: 2 }] }); // poder 1+2=3
    const outraVia = mk("servo", { lane: 1 }); // mesma dona, outra via — poupada
    const inimigo = mk("servo", { owner: 1, lane: 0 }); // via certa, dono errado — poupado
    const s = mkState([ammit, aliado1, aliado2, outraVia, inimigo]);
    resolveEffectPhase({ state: s, source: ammit, definition: byKey["ammit"], phase: "enter", rng: seeded(1) });

    expect(aliado1.dying).toBeTruthy();
    expect(aliado2.dying).toBeTruthy();
    expect(outraVia.dying).toBeFalsy();
    expect(inimigo.dying).toBeFalsy();
    // Absorve o Poder ATUAL das vítimas (impresso + bênçãos), não só o impresso:
    // 1 (aliado1) + 3 (aliado2, já com +2 de Hathor) = 4.
    expect(power(ammit, ctxOf(s))).toBe(4);
  });

  it("sozinha na via: efeito bloqueia sem quebrar nada", () => {
    const ammit = mk("ammit", { lane: 0 });
    const s = mkState([ammit]);
    const result = resolveEffectPhase({ state: s, source: ammit, definition: byKey["ammit"], phase: "enter", rng: seeded(1) });
    expect(result.kind).toBe("block");
  });

  it("ativa o efeito de morte dos aliados devorados (encadeia sacrifício)", () => {
    const ammit = mk("ammit", { lane: 0 });
    const mumia = mk("mumia", { lane: 0 }); // aliada com efeito de morte próprio
    const s = mkState([ammit, mumia]);
    resolveEffectPhase({ state: s, source: ammit, definition: byKey["ammit"], phase: "enter", rng: seeded(1) });
    // A Múmia devorada dispara o próprio "Ao Morrer" e volta para a mão
    expect(s.hand[0]).toHaveLength(1);
    expect(s.hand[0][0].key).toBe("mumia");
  });
});


describe("Combo de ponta a ponta: Ovo de Ammit → Ammit, a Devoradora", () => {
  const mkMatch = (over = {}) => ({
    round: 1, energy: [6, 6], board: [], deaths: [0, 0], plays: [0, 0],
    pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
    deck: [[], []], hand: [[], []], seen: [0, 0],
    priority: 0, priorityReason: "teste", phase: "plan", queue: [],
    lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null,
    log: [], trace: [], finished: false, destroyedPower: [0, 0], ...over,
  });

  it("Ovo morre em jogo, nasce Ammit na mão, jogá-la limpa a via", () => {
    // Parte 1 (unidade, já coberta acima): o Ovo revelado morre e vira Ammit
    // na mão — aqui construímos o estado JÁ nesse ponto (Ammit na mão, board
    // limpo) para testar só a segunda metade do combo: jogar a Ammit de fato
    // via applyAction/autoReveal e ver o aliado morrer.
    const ammitHid = nextUid();
    const aliadoUid = nextUid();
    let g = mkMatch({
      hand: [[{ hid: ammitHid, key: "ammit", printed: 0, baked: 0, venenos: [] }], []],
      board: [{
        uid: aliadoUid, key: "servo", owner: 0, lane: 1, printed: byKey["servo"].poder,
        baked: 0, mods: [], revealed: true, dying: false, venenos: [],
        entryPlays: 0, enteredRound: 1, moved: false,
      }],
    });

    g = applyAction(g, { t: "place", side: 0, hid: ammitHid, lane: 1 }).state;
    g = applyAction(g, { t: "startReveal" }).state;
    g = autoReveal(g, { rng: seeded(7) }).state;

    // A revelação completa já limpa cartas "dying" do tabuleiro — o aliado
    // devorado desaparece por completo, não fica marcado. Confirmamos pela
    // ausência dele, pela contagem de mortes e pelo log da própria Ammit.
    expect(g.board.some((c) => c.uid === aliadoUid)).toBe(false);
    expect(g.deaths[0]).toBe(1);
    expect(g.log.some((l) => l.includes("Ammit, a Devoradora destruiu"))).toBe(true);
    expect(g.board.find((c) => c.key === "ammit")).toBeTruthy(); // a Ammit sobrevive
  });
});
