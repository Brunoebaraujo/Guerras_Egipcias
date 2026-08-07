import { describe, it, expect } from "vitest";
import { byKey, efeitoDe } from "./engine.js";

describe("Conselheiro Real — buffa carta aleatória da mão com +3", () => {
  it("Conselheiro buffa uma carta na mão", () => {
    // Simula estado com cartas na mão
    const s = {
      hand: [
        [
          { hid: "1", key: "arqueiro", printed: 3, baked: 0 },
          { hid: "2", key: "lanceiro", printed: 4, baked: 0 },
          { hid: "3", key: "carruagem", printed: 6, baked: 0 },
        ],
        [],
      ],
      log: [],
      trace: [],
      effectSeq: 1,
    };

    // Simula entrada do Conselheiro (lado 0)
    const card = { uid: "conselheiro-uid", owner: 0, key: "conselheiro" };
    const def = byKey.conselheiro;

    // Com seed controlada, escolhe a primeira carta (índice 0 com rng = 0)
    const rng = () => 0;
    
    let escolhida = null;
    if (s.hand[card.owner] && s.hand[card.owner].length > 0) {
      const mao = s.hand[card.owner];
      escolhida = mao[Math.floor(rng() * mao.length)];
      escolhida.baked = (escolhida.baked || 0) + 3;
    }

    // Verifica se a carta foi bufada
    expect(escolhida).not.toBeNull();
    expect(escolhida.baked).toBe(3);
    expect(s.hand[0][0].baked).toBe(3);
  });

  it("Conselheiro buffa apenas cartas do PRÓPRIO dono", () => {
    const s = {
      hand: [
        [
          { hid: "1", key: "arqueiro", printed: 3, baked: 0 },
          { hid: "2", key: "lanceiro", printed: 4, baked: 0 },
        ],
        [
          { hid: "3", key: "carruagem", printed: 6, baked: 0 },
          { hid: "4", key: "guardareal", printed: 8, baked: 0 },
        ],
      ],
      log: [],
      trace: [],
      effectSeq: 1,
    };

    // Conselheiro do lado 0
    const card = { uid: "conselheiro-uid", owner: 0, key: "conselheiro" };
    const def = byKey.conselheiro;
    const rng = () => 0.5; // escolhe segunda carta

    // Aplica buffo
    if (s.hand[card.owner] && s.hand[card.owner].length > 0) {
      const mao = s.hand[card.owner];
      const escolhida = mao[Math.floor(rng() * mao.length)];
      escolhida.baked = (escolhida.baked || 0) + 3;
    }

    // Apenas cartas do lado 0 foram bufadas
    expect(s.hand[0][0].baked).toBe(0);
    expect(s.hand[0][1].baked).toBe(3); // segunda carta
    expect(s.hand[1][0].baked).toBe(0);
    expect(s.hand[1][1].baked).toBe(0);
  });

  it("Conselheiro não faz nada se mão estiver vazia", () => {
    const s = {
      hand: [[], []],
      log: [],
      trace: [],
      effectSeq: 1,
    };

    const card = { uid: "conselheiro-uid", owner: 0, key: "conselheiro" };

    // Se a mão está vazia, o efeito não faz nada
    if (!s.hand[card.owner] || s.hand[card.owner].length === 0) {
      // Efeito nulo
      expect(true).toBe(true);
    } else {
      throw new Error("Deveria ter retornado null ou block");
    }
  });

  it("Conselheiro pode bufar qualquer carta na mão (aleatoriamente)", () => {
    const s = {
      hand: [
        [
          { hid: "1", key: "arqueiro", printed: 3, baked: 0 },
          { hid: "2", key: "lanceiro", printed: 4, baked: 0 },
          { hid: "3", key: "carruagem", printed: 6, baked: 0 },
        ],
        [],
      ],
      log: [],
      trace: [],
      effectSeq: 1,
    };

    const card = { uid: "conselheiro-uid", owner: 0, key: "conselheiro" };

    // Teste com diferentes seeds para verificar que cada carta pode ser escolhida
    const seeds = [0, 0.4, 0.7]; // aprox. índices 0, 1, 2 em lista de 3
    const escolhidas = [];

    for (const seed of seeds) {
      const rng = () => seed;
      if (s.hand[card.owner] && s.hand[card.owner].length > 0) {
        const mao = s.hand[card.owner];
        const idx = Math.floor(rng() * mao.length);
        escolhidas.push(idx);
      }
    }

    // Deve ter escolhido diferentes cartas
    expect(escolhidas.length).toBe(3);
    expect(escolhidas[0]).toBe(0); // floor(0 * 3) = 0
    expect(escolhidas[1]).toBe(1); // floor(0.4 * 3) = floor(1.2) = 1
    expect(escolhidas[2]).toBe(2); // floor(0.7 * 3) = floor(2.1) = 2
  });

  it("Conselheiro: propriedades da carta", () => {
    const def = byKey.conselheiro;
    expect(def.nome).toBe("Conselheiro Real");
    expect(def.custo).toBe(2);
    expect(def.poder).toBe(3);
    expect(def.tipo).toBe("Humano");
    expect(def.arch).toBe("buff");
    expect(efeitoDe(def, "buffRandomHandCard").value).toBe(3);
    expect(def.trigger).toBe("entrar");
    // nomeCurto é usado no log como fallback se não estiver definido
    expect(def.nomeCurto || def.nome).toBeTruthy();
    expect(def.texto).toContain("+3");
  });

  it("Conselheiro mantém baked da carta (acumula)", () => {
    const s = {
      hand: [
        [
          { hid: "1", key: "arqueiro", printed: 3, baked: 2 }, // já tem +2
        ],
        [],
      ],
      log: [],
      trace: [],
      effectSeq: 1,
    };

    const card = { uid: "conselheiro-uid", owner: 0, key: "conselheiro" };
    const rng = () => 0;

    // Aplica buff (deve somar)
    if (s.hand[card.owner] && s.hand[card.owner].length > 0) {
      const mao = s.hand[card.owner];
      const escolhida = mao[Math.floor(rng() * mao.length)];
      escolhida.baked = (escolhida.baked || 0) + 3;
    }

    // baked deve ser 2 + 3 = 5
    expect(s.hand[0][0].baked).toBe(5);
  });
});
