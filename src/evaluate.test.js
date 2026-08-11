import { describe, expect, it } from "vitest";
import { freshMatch } from "./match.js";
import { avaliarOpcao } from "./domain/bots/evaluate.js";
import { legalPlacements } from "./domain/bots/decide.js";

const deckA = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "montu", "hathor", "escaravelho", "ammit", "mumia", "sobek"];
const deckB = ["cao", "cabra-nilo", "ganso", "gato", "macaco", "hiena", "garca", "rebanho", "domador", "apis", "amon", "escaravelho"];

/* Instância de tabuleiro já revelada — mesma forma que o motor usa. */
const revelada = (uid, owner, lane, key, printed) => ({
  uid, key, owner, lane, printed, baked: 0, mods: [], revealed: true, dying: false,
  pendentes: 0, custoMod: 0, venenos: [], entryPlays: 0, enteredRound: 1, moved: false,
});

describe("avaliarOpcao", () => {
  it("tabuleiro vazio: a nota cresce com o poder impresso da carta (eficiência)", () => {
    const state = freshMatch([deckA, deckB], { seed: "avaliar-1" });
    const opcoes = legalPlacements(state, 0);
    // Entre as opções da mesma carta em vias diferentes (tabuleiro vazio,
    // nenhuma diferença de via), a nota deve ser igual — nenhuma via importa
    // mais que outra ainda.
    const porHid = {};
    for (const o of opcoes) (porHid[o.hid] ||= []).push(avaliarOpcao(state, 0, o));
    for (const notas of Object.values(porHid)) {
      for (const n of notas) expect(n).toBeCloseTo(notas[0], 9);
    }
  });

  it("reforçar uma via já perdida vale mais do que reforçar uma via já dominada", () => {
    let state = freshMatch([deckA, deckB], { seed: "avaliar-2" });
    state = { ...state, board: [...state.board] };
    // Via 0: side 1 (o bot) já vencendo de goleada (9 x 0). Via 1: side 1 perdendo (0 x 6).
    state.board.push(revelada(-1, 1, 0, "servo", 9), revelada(-2, 0, 0, "servo", 0));
    state.board.push(revelada(-3, 1, 1, "servo", 0), revelada(-4, 0, 1, "servo", 6));
    const opcoes = legalPlacements(state, 1);
    const naVia0 = opcoes.find((o) => o.lane === 0);
    const naVia1 = opcoes.find((o) => o.lane === 1 && o.hid === naVia0?.hid);
    expect(naVia0).toBeDefined();
    expect(naVia1).toBeDefined();
    expect(avaliarOpcao(state, 1, naVia1)).toBeGreaterThan(avaliarOpcao(state, 1, naVia0));
  });

  it("poder muito além do necessário pra vencer uma via deixa de contar (teto de relevância)", () => {
    // Cenário A: via onde o adversário tem 3 e o bot tem 0 (perdendo, mas com
    // teto pra subir). Cenário B: via onde o bot já tem 20 (vencendo tão de
    // longe que o teto de relevância já foi alcançado antes da carta entrar).
    let state = freshMatch([deckA, deckB], { seed: "avaliar-3" });
    state = { ...state, board: [...state.board] };
    state.board.push(revelada(-1, 0, 0, "servo", 3));   // via 0: side 0 tem 3, side 1 tem 0
    state.board.push(revelada(-2, 1, 1, "servo", 20));  // via 1: side 1 já tem 20, side 0 tem 0
    const opcoesVia0 = legalPlacements(state, 1).filter((o) => o.lane === 0);
    const opcoesVia1 = legalPlacements(state, 1).filter((o) => o.lane === 1);
    expect(opcoesVia0.length).toBeGreaterThan(0);
    expect(opcoesVia1.length).toBeGreaterThan(0);
    const mesmoHid = opcoesVia0.find((o) => opcoesVia1.some((o2) => o2.hid === o.hid));
    expect(mesmoHid).toBeDefined();
    const opcaoVia0 = mesmoHid;
    const opcaoVia1 = opcoesVia1.find((o) => o.hid === mesmoHid.hid);
    const notaVia0 = avaliarOpcao(state, 1, opcaoVia0);
    const notaVia1 = avaliarOpcao(state, 1, opcaoVia1);
    expect(notaVia0).toBeGreaterThan(notaVia1);
  });
});
