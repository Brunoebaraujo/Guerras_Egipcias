import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, resolveKhnum, aplicarBencao,
  resetUid, nextUid,
} from "./engine.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});

const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], round: 1,
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], destroyedPower: [0, 0],
});

beforeEach(resetUid);

/* ------------------------------ Khnum ------------------------------------ */
describe("Khnum, o Oleiro Divino", () => {
  it("ganha +1 de Poder para cada carta aliada com bênção permanente (mods)", () => {
    const khnum = mk("khnum");
    const abencoad1 = mk("servo", { mods: [{ src: "Hathor", val: 1 }] });
    const abencoad2 = mk("arqueiro", { lane: 1, mods: [{ src: "Heka", val: 2 }] });
    const s = mkState([khnum, abencoad1, abencoad2]);
    
    resolveKhnum(s, khnum);
    
    // Khnum deveria ter +2 (duas cartas abençoadas)
    expect(khnum.mods).toHaveLength(1);
    expect(khnum.mods[0].src).toBe("Khnum, o Oleiro Divino");
    expect(khnum.mods[0].val).toBe(2);
  });

  it("ganha +1 por cada carta aliada com aura (power > poder impresso)", () => {
    const khnum = mk("khnum");
    const amon = mk("amon", { owner: 0 });
    const aliado = mk("servo", { owner: 0, lane: 1 }); // Amon dá +1 aura
    const s = mkState([khnum, amon, aliado]);
    
    resolveKhnum(s, khnum);
    
    // Apenas 'aliado' tem power > impresso (por causa de Amon)
    // Khnum deveria ter +1
    expect(khnum.mods).toHaveLength(1);
    expect(khnum.mods[0].val).toBe(1);
  });

  it("não ganha nada se não há cartas aliadas abençoadas", () => {
    const khnum = mk("khnum");
    const desabencoad = mk("servo");
    const s = mkState([khnum, desabencoad]);
    
    const effect = resolveKhnum(s, khnum);
    
    expect(khnum.mods).toHaveLength(0);
    expect(effect.kind).toBe("block");
    expect(effect.text).toBe("sem alvo");
  });

  it("ignora cartas inimigas mesmo que abençoadas", () => {
    const khnum = mk("khnum", { owner: 0 });
    const abencoad_inimigo = mk("servo", { owner: 1, mods: [{ src: "Hathor", val: 1 }] });
    const abencoad_aliado = mk("arqueiro", { owner: 0, mods: [{ src: "Heka", val: 2 }] });
    const s = mkState([khnum, abencoad_inimigo, abencoad_aliado]);
    
    resolveKhnum(s, khnum);
    
    // Khnum deveria ter +1 (só conta a aliada)
    expect(khnum.mods).toHaveLength(1);
    expect(khnum.mods[0].val).toBe(1);
  });

  it("ignora cartas aliadas sem bênção", () => {
    const khnum = mk("khnum");
    const abencoad = mk("servo", { mods: [{ src: "Hathor", val: 1 }] });
    const desabencoad = mk("arqueiro");
    const s = mkState([khnum, abencoad, desabencoad]);
    
    resolveKhnum(s, khnum);
    
    // Khnum deveria ter +1 (só a carta abençoada)
    expect(khnum.mods).toHaveLength(1);
    expect(khnum.mods[0].val).toBe(1);
  });

  it("não se conta a si mesmo mesmo que tivesse bênção", () => {
    const khnum = mk("khnum", { mods: [{ src: "Hathor", val: 1 }] });
    const abencoad = mk("servo", { mods: [{ src: "Heka", val: 2 }] });
    const s = mkState([khnum, abencoad]);
    
    resolveKhnum(s, khnum);
    
    // Khnum deveria ter +1 (só a outra carta, não a si mesmo)
    const newMods = khnum.mods.filter((m) => m.src === "Khnum, o Oleiro Divino");
    expect(newMods).toHaveLength(1);
    expect(newMods[0].val).toBe(1);
  });

  it("ignora cartas mortas/dying", () => {
    const khnum = mk("khnum");
    const abencoad_viva = mk("servo", { mods: [{ src: "Hathor", val: 1 }] });
    const abencoad_morrendo = mk("arqueiro", { mods: [{ src: "Heka", val: 2 }], dying: 1 });
    const s = mkState([khnum, abencoad_viva, abencoad_morrendo]);
    
    resolveKhnum(s, khnum);
    
    // Khnum deveria ter +1 (só a viva)
    expect(khnum.mods).toHaveLength(1);
    expect(khnum.mods[0].val).toBe(1);
  });

  it("múltiplas bênçãos na mesma carta contam como 1 (uma carta = um buff)", () => {
    const khnum = mk("khnum");
    const multi_buff = mk("servo", {
      mods: [{ src: "Hathor", val: 1 }, { src: "Heka", val: 2 }, { src: "Renenutet", val: 1 }],
    });
    const s = mkState([khnum, multi_buff]);
    
    resolveKhnum(s, khnum);
    
    // Khnum deveria ter +1 (uma carta abençoada, não 3)
    expect(khnum.mods).toHaveLength(1);
    expect(khnum.mods[0].val).toBe(1);
  });

  it("o power de Khnum reflete o buff aplicado", () => {
    const khnum = mk("khnum");
    const buff1 = mk("servo", { mods: [{ src: "Hathor", val: 1 }] });
    const buff2 = mk("arqueiro", { lane: 1, mods: [{ src: "Heka", val: 2 }] });
    const s = mkState([khnum, buff1, buff2]);
    
    resolveKhnum(s, khnum);
    
    // Khnum: 5 (base) + 2 (bênção) = 7
    expect(power(khnum, ctxOf(s))).toBe(7);
  });

  it("conta cartas com buff permanente + cartas com aura juntas", () => {
    const khnum = mk("khnum");
    const mod_buff = mk("servo", { mods: [{ src: "Hathor", val: 1 }] }); // bênção permanente
    const amon = mk("amon", { owner: 0 });
    const aura_buff = mk("arqueiro", { owner: 0, lane: 1 }); // recebe aura de Amon
    const s = mkState([khnum, mod_buff, amon, aura_buff]);
    
    resolveKhnum(s, khnum);
    
    // Khnum deveria ter +2 (uma com mod + uma com aura)
    expect(khnum.mods).toHaveLength(1);
    expect(khnum.mods[0].val).toBe(2);
  });
});
