import { describe, it, expect, beforeEach } from "vitest";
import { byKey, power, ctxOf, resolveEnxame, resetUid, nextUid } from "./engine.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});

const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [],
});

beforeEach(resetUid);

describe("Enxame de Gafanhotos", () => {
  it("cria duas copias reveladas com o poder atual da original", () => {
    const enxame = mk("enxame", { mods: [{ src: "Hathor", val: 2 }] });
    const s = mkState([enxame]);

    resolveEnxame(s, enxame);

    const copies = s.board.filter((c) => c.uid !== enxame.uid && c.key === "enxame");
    expect(copies).toHaveLength(2);
    expect(copies.every((c) => c.revealed && c.baseCopy)).toBe(true);
    expect(copies.map((c) => power(c, ctxOf(s)))).toEqual([4, 4]);
    expect(copies.every((c) => byKey[c.key].tipo === "Guerreiro")).toBe(true);
  });

  it("nao dobra bonus continuo de Montu ao copiar o poder atual", () => {
    const montu = mk("montu");
    const enxame = mk("enxame");
    const s = mkState([montu, enxame]);

    expect(power(enxame, ctxOf(s))).toBe(4);
    resolveEnxame(s, enxame);

    const copies = s.board.filter((c) => c.uid !== enxame.uid && c.key === "enxame");
    expect(copies.map((c) => power(c, ctxOf(s)))).toEqual([4, 4]);
  });

  it("respeita o limite de quatro cartas por lado na via", () => {
    const enxame = mk("enxame");
    const s = mkState([enxame, mk("servo"), mk("arqueiro"), mk("lanceiro")]);

    const fx = resolveEnxame(s, enxame);

    expect(fx.kind).toBe("block");
    expect(s.board).toHaveLength(4);
  });
});
