import { describe, it, expect, beforeEach } from "vitest";
import { byKey, power, ctxOf, resetUid, nextUid } from "./engine.js";
import "./domain/effects/index.js"; // garante o registro de Sekhem (registrarSekhem) e do efeito
import { validarColecao } from "./domain/cards/schema.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], round: 1,
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], destroyedPower: [0, 0],
});

beforeEach(resetUid);

describe("Sekhem, Força Divina", () => {
  it("está registrada corretamente na coleção (4/1, Divindade, buff)", () => {
    const def = byKey["sekhem"];
    expect(def).toBeTruthy();
    expect(def.custo).toBe(4);
    expect(def.poder).toBe(1);
    expect(def.tipo).toBe("Divindade");
    expect(def.arch).toBe("buff");
  });

  it("a coleção continua válida com Sekhem registrada", () => {
    expect(validarColecao()).toEqual([]);
  });

  it("dá aos demais aliados da MESMA via um bônus igual ao próprio Poder, mas não a si mesma", () => {
    const sekhem = mk("sekhem");                 // 1
    const aliado = mk("servo", { lane: 0 });      // mesma via
    const outraVia = mk("servo", { lane: 1 });    // outra via, mesmo dono
    const inimigo = mk("servo", { owner: 1, lane: 0 });
    const s = mkState([sekhem, aliado, outraVia, inimigo]);
    expect(power(aliado, ctxOf(s))).toBe(2);        // 1 + Sekhem(1)
    expect(power(outraVia, ctxOf(s))).toBe(1);      // via diferente: não recebe
    expect(power(inimigo, ctxOf(s))).toBe(1);       // lado oposto: não recebe
    expect(power(sekhem, ctxOf(s))).toBe(1);        // não buffa a si mesma
  });

  it("escala com bênçãos recebidas (mods) e propaga o novo valor", () => {
    const sekhem = mk("sekhem", { mods: [{ src: "Hathor", val: 3 }] }); // 1+3 = 4
    const aliado = mk("servo", { lane: 0 });
    const s = mkState([sekhem, aliado]);
    expect(power(sekhem, ctxOf(s))).toBe(4);
    expect(power(aliado, ctxOf(s))).toBe(5);        // 1 + 4
  });

  it("não conta auras contínuas recebidas (ex.: outra Sekhem) — evita dependência circular", () => {
    // Duas Sekhem na mesma via: cada uma contribui com o próprio PODER ESTÁTICO
    // (impresso + mods) para a outra, nunca com o valor já inflado pela aura
    // da parceira — senão a leitura dependeria dela mesma.
    const sekhemA = mk("sekhem");
    const sekhemB = mk("sekhem");
    const aliado = mk("servo", { lane: 0 });
    const s = mkState([sekhemA, sekhemB, aliado]);
    expect(power(sekhemA, ctxOf(s))).toBe(2);       // 1 (própria) + 1 (estático de B)
    expect(power(sekhemB, ctxOf(s))).toBe(2);       // simétrico
    expect(power(aliado, ctxOf(s))).toBe(3);        // 1 + 1 (estático A) + 1 (estático B)
  });

  it("não revelada ou morrendo não concede o bônus", () => {
    const escondida = mk("sekhem", { revealed: false });
    const aliado1 = mk("servo", { lane: 0 });
    const s1 = mkState([escondida, aliado1]);
    expect(power(aliado1, ctxOf(s1))).toBe(1);

    const morrendo = mk("sekhem", { dying: 3 });
    const aliado2 = mk("servo", { lane: 0 });
    const s2 = mkState([morrendo, aliado2]);
    expect(power(aliado2, ctxOf(s2))).toBe(1);
  });

  it("Maat nesta via zera a aura de Sekhem (prende tudo ao impresso)", () => {
    const sekhem = mk("sekhem");
    const aliado = mk("servo", { lane: 0 });
    const maat = mk("maat", { owner: 1, lane: 0 });
    const s = mkState([sekhem, aliado, maat]);
    expect(power(aliado, ctxOf(s))).toBe(1);        // impresso, ignora Sekhem
  });

  it("Silêncio dos Deuses na via suprime a Aura de Sekhem", () => {
    const sekhem = mk("sekhem");
    const aliado = mk("servo", { lane: 0 });
    const silencio = mk("silencio-deuses", { lane: 0 });
    const s = mkState([sekhem, aliado, silencio]);
    expect(power(aliado, ctxOf(s))).toBe(1);        // aura suprimida
  });
});
