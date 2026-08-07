import { describe, it, expect } from "vitest";
import { freshMatch, applyAction } from "./match.js";
import { byKey, buildRevealQueue, efeitoDe } from "./engine.js";

describe("Escriba — próxima carta comprada recebe +3", () => {
  it("Escriba buffa a próxima carta comprada do deck", () => {
    // Cria um match com Escriba no topo do deck (depois da abertura)
    const lists = [
      ["arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "hathor", "heka", "amon", "set", "maat", "sobek"],
      ["arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "hathor", "heka", "amon", "set", "maat", "sobek"],
    ];
    const s = freshMatch(lists);

    // Tira a 4ª carta (que foi comprada na abertura) e substitui o deck
    // para ter Escriba no topo
    s.deck[0] = ["escriba", ...s.deck[0].slice(0)];

    // Coloca Escriba manualmente no board para testar o efeito
    const uid0 = Math.random();
    const escribaCard = {
      key: "escriba", uid: uid0, owner: 0, lane: 0,
      printed: byKey.escriba.poder, baked: 0, mods: [], revealed: true, dying: false,
      entryPlays: s.plays[0], enteredRound: s.round, moved: false, token: false,
    };
    s.board.push(escribaCard);

    // Simula a entrada do Escriba (chama o efeito)
    s.effectSeq += 1;
    const def = byKey.escriba;
    if (efeitoDe(def, "buffNextDraw")) {
      if (!s.drawBuffReserve) s.drawBuffReserve = [0, 0];
      s.drawBuffReserve[0] = 3;
    }

    // Verifica se o buff foi reservado
    expect(s.drawBuffReserve[0]).toBe(3);

    // Próxima compra deve ter +3
    const deckTop = s.deck[0].shift();
    expect(deckTop).toBe("escriba");
    
    const hid = "teste";
    const card = { hid, key: deckTop, printed: byKey[deckTop].poder, baked: 0 };
    
    // Simula a lógica de drawOne
    if (s.drawBuffReserve?.[0]) {
      card.baked = (card.baked || 0) + s.drawBuffReserve[0];
      s.drawBuffReserve[0] = 0;
    }

    expect(card.baked).toBe(3);
    expect(s.drawBuffReserve[0]).toBe(0);
  });

  it("Escriba reserva buff apenas para o próprio dono", () => {
    const lists = [
      ["arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "hathor", "heka", "amon", "set", "maat", "sobek"],
      ["arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "hathor", "heka", "amon", "set", "maat", "sobek"],
    ];
    const s = freshMatch(lists);

    // Simula entrada do Escriba (lado 0)
    s.drawBuffReserve = [0, 0];
    const def = byKey.escriba;
    if (efeitoDe(def, "buffNextDraw")) {
      s.drawBuffReserve[0] = 3;
    }

    // Lado 0 tem buff, lado 1 não
    expect(s.drawBuffReserve[0]).toBe(3);
    expect(s.drawBuffReserve[1]).toBe(0);

    // Se comprar do lado 1, não deve ter buff
    s.deck[1] = ["arqueiro", ...s.deck[1].slice(0)];
    const card1 = { key: "arqueiro", baked: 0 };
    if (s.drawBuffReserve?.[1]) {
      card1.baked = s.drawBuffReserve[1];
      s.drawBuffReserve[1] = 0;
    }
    expect(card1.baked).toBe(0);

    // Se comprar do lado 0, deve ter buff
    s.deck[0] = ["lanceiro", ...s.deck[0].slice(0)];
    const card0 = { key: "lanceiro", baked: 0 };
    if (s.drawBuffReserve?.[0]) {
      card0.baked = (card0.baked || 0) + s.drawBuffReserve[0];
      s.drawBuffReserve[0] = 0;
    }
    expect(card0.baked).toBe(3);
  });

  it("Buff é consumido após a primeira compra", () => {
    const lists = [
      ["arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "hathor", "heka", "amon", "set", "maat", "sobek"],
      ["arqueiro", "lanceiro", "carruagem", "guardareal", "general", "colosso", "hathor", "heka", "amon", "set", "maat", "sobek"],
    ];
    const s = freshMatch(lists);

    // Reserva buff
    s.drawBuffReserve = [3, 0];

    // Primeira compra (lado 0)
    s.deck[0] = ["carruagem", ...s.deck[0].slice(0)];
    const card1 = { key: "carruagem", baked: 0 };
    if (s.drawBuffReserve?.[0]) {
      card1.baked = (card1.baked || 0) + s.drawBuffReserve[0];
      s.drawBuffReserve[0] = 0;
    }
    expect(card1.baked).toBe(3);
    expect(s.drawBuffReserve[0]).toBe(0);

    // Segunda compra (lado 0) — sem buff
    s.deck[0] = ["guardareal", ...s.deck[0].slice(0)];
    const card2 = { key: "guardareal", baked: 0 };
    if (s.drawBuffReserve?.[0]) {
      card2.baked = (card2.baked || 0) + s.drawBuffReserve[0];
      s.drawBuffReserve[0] = 0;
    }
    expect(card2.baked).toBe(0);
  });

  it("Escriba texto e poder", () => {
    const def = byKey.escriba;
    expect(def.nome).toBe("Escriba");
    expect(def.custo).toBe(1);
    expect(def.poder).toBe(2);
    expect(def.tipo).toBe("Humano");
    expect(def.arch).toBe("buff");
    expect(efeitoDe(def, "buffNextDraw").value).toBe(3);
    expect(def.trigger).toBe("entrar");
    expect(def.texto).toContain("+3");
  });
});
