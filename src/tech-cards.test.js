import { describe, it, expect } from "vitest";
import { byKey, ctxOf, power, decomporPartes, auraSuprimida, debuffsSuspensosPara } from "./engine.js";
import { validarColecao } from "./domain/cards/schema.js";
import { getEffect } from "./domain/effects/index.js";

const mk = (key, { uid, owner = 0, lane = 0, mods = [], ...rest } = {}) => ({
  uid,
  key,
  owner,
  lane,
  printed: byKey[key].poder,
  baked: 0,
  mods,
  revealed: true,
  dying: false,
  ...rest,
});

const ctx = (board) => ctxOf({ board, deaths: [0, 0], plays: [0, 0], destroyedPower: [0, 0] });

describe("Olho de Hórus Restaurador — definição", () => {
  it("é uma Relíquia 2/3 do arquétipo Aura", () => {
    const def = byKey["olho-horus"];
    expect(def).toBeTruthy();
    expect(def.tipo).toBe("Relíquia");
    expect(def.custo).toBe(2);
    expect(def.poder).toBe(3);
    expect(def.arch).toBe("buff");
    expect(def.nomeCurto).toBe("Olho");
    expect(def.efeitos).toEqual([{ id: "suspendPowerDebuffs" }]);
    expect(def.trigger).toBe("continuo");
  });

  it("suspendPowerDebuffs está registrado como efeito contínuo", () => {
    expect(getEffect("suspendPowerDebuffs")).toBeTruthy();
    expect(getEffect("suspendPowerDebuffs").phase).toBe("continuous");
  });
});

describe("Silêncio dos Deuses — definição", () => {
  it("é uma Relíquia 2/3 do arquétipo Silêncio", () => {
    const def = byKey["silencio-deuses"];
    expect(def).toBeTruthy();
    expect(def.tipo).toBe("Relíquia");
    expect(def.custo).toBe(2);
    expect(def.poder).toBe(3);
    expect(def.arch).toBe("silencio");
    expect(def.nomeCurto).toBe("Deuses");
    expect(def.efeitos).toEqual([{ id: "suppressAuraInLane" }]);
    expect(def.trigger).toBe("continuo");
  });

  it("suppressAuraInLane está registrado como efeito contínuo", () => {
    expect(getEffect("suppressAuraInLane")).toBeTruthy();
    expect(getEffect("suppressAuraInLane").phase).toBe("continuous");
  });
});

describe("Tech cards — passam pela validação declarativa da coleção", () => {
  it("validarColecao() não acusa nada", () => {
    expect(validarColecao()).toEqual([]);
  });
});

describe("Teste 1 — Olho sem debuffs", () => {
  it("carta 5 de Poder continua 5 com o Olho em jogo", () => {
    const alvo = mk("general", { uid: 1 }); // general: 11 de poder impresso — usar carta neutra e mod manual
    alvo.printed = 5; alvo.mods = [];
    const olho = mk("olho-horus", { uid: 2 });
    const board = [alvo, olho];
    expect(power(alvo, ctx(board))).toBe(5);
  });
});

describe("Teste 2 — Olho com debuff existente", () => {
  it("suspende o debuff enquanto ativo, e ele volta quando o Olho sai", () => {
    const alvo = mk("general", { uid: 1, mods: [{ src: "Úlceras", val: -2 }] });
    alvo.printed = 5;
    const olho = mk("olho-horus", { uid: 2 });
    const board = [alvo, olho];
    expect(power(alvo, ctx(board))).toBe(5);

    // Olho sai de jogo (destruído / morrendo)
    olho.dying = 1;
    expect(power(alvo, ctx(board))).toBe(3);
    // o mod nunca foi removido do estado
    expect(alvo.mods).toEqual([{ src: "Úlceras", val: -2 }]);
  });
});

describe("Teste 3 — debuff aplicado com Olho ativo", () => {
  it("o novo debuff também é suspenso, e some quando o Olho sai", () => {
    const alvo = mk("general", { uid: 1, mods: [] });
    alvo.printed = 5;
    const olho = mk("olho-horus", { uid: 2 });
    const board = [alvo, olho];
    alvo.mods.push({ src: "Praga", val: -3 });
    expect(power(alvo, ctx(board))).toBe(5);

    olho.dying = 1;
    expect(power(alvo, ctx(board))).toBe(2);
  });
});

describe("Teste 4 — múltiplos debuffs", () => {
  it("suspende todos ao mesmo tempo, mantém cada um registrado", () => {
    const alvo = mk("general", { uid: 1, mods: [{ src: "A", val: -1 }, { src: "B", val: -1 }, { src: "C", val: -2 }] });
    alvo.printed = 5;
    const olho = mk("olho-horus", { uid: 2 });
    const board = [alvo, olho];
    expect(power(alvo, ctx(board))).toBe(5);

    olho.dying = 1;
    expect(power(alvo, ctx(board))).toBe(1);
    expect(alvo.mods).toHaveLength(3);
  });

  it("não afeta buffs positivos nem cartas de outro dono", () => {
    const alvo = mk("general", { uid: 1, owner: 0, mods: [{ src: "Hathor", val: 3 }, { src: "Úlceras", val: -2 }] });
    alvo.printed = 5;
    const inimigo = mk("general", { uid: 3, owner: 1, mods: [{ src: "Úlceras", val: -4 }] });
    inimigo.printed = 5;
    const olho = mk("olho-horus", { uid: 2, owner: 0 });
    const board = [alvo, inimigo, olho];
    // aliado: +3 conta, -2 suspenso -> 5+3 = 8
    expect(power(alvo, ctx(board))).toBe(8);
    // inimigo não tem Olho do próprio lado: debuff continua valendo -> 5-4=1
    expect(power(inimigo, ctx(board))).toBe(1);
  });
});

describe("Teste 5 — Amon + Silêncio", () => {
  it("o bônus de Amon desaparece imediatamente quando Silêncio entra na via dele, mesmo para alvos em outras vias", () => {
    const amon = mk("amon", { uid: 1, owner: 0, lane: 0 });
    const aliadoMesmaVia = mk("general", { uid: 2, owner: 0, lane: 0 });
    aliadoMesmaVia.printed = 5;
    const aliadoOutraVia = mk("general", { uid: 3, owner: 0, lane: 1 });
    aliadoOutraVia.printed = 5;
    const board = [amon, aliadoMesmaVia, aliadoOutraVia];
    expect(power(aliadoMesmaVia, ctx(board))).toBe(6);
    expect(power(aliadoOutraVia, ctx(board))).toBe(6);

    const silencio = mk("silencio-deuses", { uid: 4, owner: 1, lane: 0 });
    board.push(silencio);
    expect(power(aliadoMesmaVia, ctx(board))).toBe(5);
    expect(power(aliadoOutraVia, ctx(board))).toBe(5);
    // Amon mantém o próprio poder impresso — a Aura dele é o que desliga, não ele.
    expect(power(amon, ctx(board))).toBe(byKey.amon.poder);
  });
});

describe("Teste 6 — Silêncio destruído", () => {
  it("a Aura de Amon volta imediatamente quando o Silêncio sai de jogo", () => {
    const amon = mk("amon", { uid: 1, owner: 0, lane: 0 });
    const aliado = mk("general", { uid: 2, owner: 0, lane: 0 });
    aliado.printed = 5;
    const silencio = mk("silencio-deuses", { uid: 4, owner: 1, lane: 0 });
    const board = [amon, aliado, silencio];
    expect(power(aliado, ctx(board))).toBe(5);

    silencio.dying = 1;
    expect(power(aliado, ctx(board))).toBe(6);
  });
});

describe("Teste 7 — Amon movido para fora da via do Silêncio", () => {
  it("a Aura liga de volta imediatamente ao mudar de via", () => {
    const amon = mk("amon", { uid: 1, owner: 0, lane: 0 });
    const aliado = mk("general", { uid: 2, owner: 0, lane: 0 });
    aliado.printed = 5;
    const silencio = mk("silencio-deuses", { uid: 4, owner: 1, lane: 0 });
    const board = [amon, aliado, silencio];
    expect(power(aliado, ctx(board))).toBe(5);

    amon.lane = 1;
    expect(power(aliado, ctx(board))).toBe(6);
  });
});

describe("Teste 8 — Aura entra depois do Silêncio", () => {
  it("já nasce suprimida", () => {
    const silencio = mk("silencio-deuses", { uid: 4, owner: 1, lane: 0 });
    const board = [silencio];
    const amon = mk("amon", { uid: 1, owner: 0, lane: 0 });
    const aliado = mk("general", { uid: 2, owner: 0, lane: 0 });
    aliado.printed = 5;
    board.push(amon, aliado);
    expect(power(aliado, ctx(board))).toBe(5);
  });
});

describe("Teste 9 — dois Silêncios espelhados na mesma via", () => {
  it("não acumulam, não se anulam, e só liberam a Aura quando os dois saem", () => {
    const amon = mk("amon", { uid: 1, owner: 0, lane: 0 });
    const aliado = mk("general", { uid: 2, owner: 0, lane: 0 });
    aliado.printed = 5;
    const silencioA = mk("silencio-deuses", { uid: 4, owner: 0, lane: 0 });
    const silencioB = mk("silencio-deuses", { uid: 5, owner: 1, lane: 0 });
    const board = [amon, aliado, silencioA, silencioB];
    expect(power(aliado, ctx(board))).toBe(5);

    silencioA.dying = 1;
    expect(power(aliado, ctx(board))).toBe(5); // continua suprimido

    silencioB.dying = 1;
    expect(power(aliado, ctx(board))).toBe(6); // volta
  });

  it("regra de 'outras cartas': um Silêncio não se suprime, e não suprime o outro", () => {
    const silencioA = mk("silencio-deuses", { uid: 4, owner: 0, lane: 0 });
    const silencioB = mk("silencio-deuses", { uid: 5, owner: 1, lane: 0 });
    const board = [silencioA, silencioB];
    expect(power(silencioA, ctx(board))).toBe(byKey["silencio-deuses"].poder);
    expect(power(silencioB, ctx(board))).toBe(byKey["silencio-deuses"].poder);
  });
});

describe("Teste 10 — Olho contra Silêncio", () => {
  it("o debuff suspenso volta a valer quando um Silêncio entra na via do Olho, e volta a suspender quando ele sai", () => {
    const alvo = mk("general", { uid: 1, owner: 0, mods: [{ src: "Praga", val: -3 }] });
    alvo.printed = 5;
    const olho = mk("olho-horus", { uid: 2, owner: 0, lane: 0 });
    const board = [alvo, olho];
    expect(power(alvo, ctx(board))).toBe(5);

    const silencio = mk("silencio-deuses", { uid: 3, owner: 1, lane: 0 });
    board.push(silencio);
    expect(power(alvo, ctx(board))).toBe(2);

    silencio.dying = 1;
    expect(power(alvo, ctx(board))).toBe(5);
    // nada foi removido ou recriado durante o processo
    expect(alvo.mods).toEqual([{ src: "Praga", val: -3 }]);
  });
});

describe("Interação com hinos de tipo (arquétipo geral, não só Amon)", () => {
  it("Silêncio na via do Montu também desliga o hino, em qualquer via do dono", () => {
    const montu = mk("montu", { uid: 1, owner: 0, lane: 0 });
    const guerreiroOutraVia = mk("arqueiro", { uid: 2, owner: 0, lane: 1 });
    const board = [montu, guerreiroOutraVia];
    expect(power(guerreiroOutraVia, ctx(board))).toBe(byKey.arqueiro.poder + 2);

    const silencio = mk("silencio-deuses", { uid: 3, owner: 1, lane: 0 });
    board.push(silencio);
    expect(power(guerreiroOutraVia, ctx(board))).toBe(byKey.arqueiro.poder);
  });
});

describe("Helpers genéricos", () => {
  it("auraSuprimida ignora a própria fonte e só olha a mesma via", () => {
    const silencio = mk("silencio-deuses", { uid: 1, owner: 0, lane: 0 });
    const board = [silencio];
    expect(auraSuprimida(board, silencio)).toBe(false);
  });

  it("debuffsSuspensosPara é falso sem Olho em jogo", () => {
    const board = [mk("general", { uid: 1, owner: 0 })];
    expect(debuffsSuspensosPara(board, 0)).toBe(false);
  });

  it("decomporPartes preserva o mod original (origVal) quando suspenso", () => {
    const alvo = mk("general", { uid: 1, owner: 0, mods: [{ src: "Praga", val: -3 }] });
    alvo.printed = 5;
    const olho = mk("olho-horus", { uid: 2, owner: 0 });
    const board = [alvo, olho];
    const partes = decomporPartes(alvo, ctx(board));
    const suspensa = partes.find((p) => p.tipo === "suspenso");
    expect(suspensa).toBeTruthy();
    expect(suspensa.val).toBe(0);
    expect(suspensa.origVal).toBe(-3);
  });
});
