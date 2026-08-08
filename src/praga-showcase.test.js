import { describe, expect, it } from "vitest";
import { autoReveal, applyAction, freshMatch, PLAGUE_SHOWCASE_MS } from "./match.js";
import { byKey, resetUid } from "./engine.js";
import { phaseInvariantErrors } from "./match/phases.js";
import { filterStateForSeat } from "./net/filterState.js";

/* A pausa de exibição da Praga era estado de componente React dentro do App.
   Consequência: o modo online, que não usa o App, simplesmente não tinha a
   pausa — a Praga passava a 850ms sem destaque, e os dois jogadores podiam ver
   coisas diferentes porque o servidor bombeava a revelação em timer fixo.

   Estes testes fixam a pausa como parte da MÁQUINA DE ESTADOS, que é o que a
   torna igual nos dois modos. */

const DECK_BASE = ["servo", "cao", "arqueiro", "lanceiro", "carruagem", "guardareal",
  "general", "colosso", "amon", "set", "maat", "osiris"];

/** Coloca uma Praga em campo por revelar, no lado indicado, e entra em revelação. */
function comPragaPorRevelar(pragaKey = "sangue", side = 0) {
  resetUid();
  let s = freshMatch([DECK_BASE, DECK_BASE], { seed: "showcase" });
  const def = byKey[pragaKey];
  s.hand[side] = [{ hid: 900, key: pragaKey, printed: def.poder, baked: 0 }];
  s.energy = [6, 6];
  const posta = applyAction(s, { t: "place", side, hid: 900, lane: 0 });
  expect(posta.error).toBeUndefined();
  const revelando = applyAction(posta.state, { t: "startReveal" });
  expect(revelando.error).toBeUndefined();
  return revelando.state;
}

describe("pausa de exibição da Praga — no estado, não na UI", () => {
  it("uma partida nova não tem Praga em exibição", () => {
    expect(freshMatch([DECK_BASE, DECK_BASE], { seed: "x" }).awaitingPlagueShowcase).toBeNull();
  });

  it("revelar uma Praga abre a pausa, com chave, seq e duração", () => {
    let s = comPragaPorRevelar("sangue");
    let guarda = 0;
    while (!s.awaitingPlagueShowcase && guarda++ < 10) {
      const r = applyAction(s, { t: "step" });
      if (r.error) break;
      s = r.state;
    }
    expect(s.awaitingPlagueShowcase).toBeTruthy();
    expect(s.awaitingPlagueShowcase.key).toBe("sangue");
    expect(s.awaitingPlagueShowcase.ms).toBe(PLAGUE_SHOWCASE_MS);
    expect(typeof s.awaitingPlagueShowcase.seq).toBe("number");
  });

  it("a revelação NÃO avança enquanto a Praga está em exibição", () => {
    let s = comPragaPorRevelar("sangue");
    let guarda = 0;
    while (!s.awaitingPlagueShowcase && guarda++ < 10) s = applyAction(s, { t: "step" }).state;
    expect(s.awaitingPlagueShowcase).toBeTruthy();

    const bloqueado = applyAction(s, { t: "step" });
    expect(bloqueado.error).toBeTruthy();
    expect(bloqueado.state).toBe(s);            // estado intacto: erro não muta
  });

  it("o ack libera a revelação e some com a pausa", () => {
    let s = comPragaPorRevelar("sangue");
    let guarda = 0;
    while (!s.awaitingPlagueShowcase && guarda++ < 10) s = applyAction(s, { t: "step" }).state;

    const ack = applyAction(s, { t: "ackPlagueShowcase" });
    expect(ack.error).toBeUndefined();
    expect(ack.state.awaitingPlagueShowcase).toBeNull();
    expect(applyAction(ack.state, { t: "step" }).error).toBeUndefined();
  });

  it("ack sem Praga em exibição é recusado, e não é silencioso", () => {
    const s = comPragaPorRevelar("sangue");
    const r = applyAction(s, { t: "ackPlagueShowcase" });
    expect(r.error).toBeTruthy();
    expect(r.state).toBe(s);
  });

  it("autoReveal dispensa a pausa sozinho — sem tela não há o que apresentar", () => {
    const s = comPragaPorRevelar("sangue");
    const r = autoReveal(s);
    expect(r.error).toBeUndefined();
    expect(r.state.awaitingPlagueShowcase).toBeNull();
    expect(r.state.phase).not.toBe("revealing");   // chegou ao fim, não travou
  });

  it("a pausa não sobrevive à virada de fase — sobreviver travaria a rodada seguinte", () => {
    let s = comPragaPorRevelar("sangue");
    s = autoReveal(s).state;
    expect(s.awaitingPlagueShowcase).toBeNull();
    expect(phaseInvariantErrors(s)).toEqual([]);

    // e o invariante acusa se alguém deixar a pausa aberta fora da revelação
    const corrompido = { ...s, phase: "plan", awaitingPlagueShowcase: { key: "sangue", seq: 1, ms: 6000 } };
    expect(phaseInvariantErrors(corrompido)).toContain("Praga em exibição fora da revelação");
  });
});

describe("paridade entre solo e multiplayer", () => {
  it("a pausa atravessa o filtro de rede — sem isto o online não teria showcase", () => {
    let s = comPragaPorRevelar("sangue");
    let guarda = 0;
    while (!s.awaitingPlagueShowcase && guarda++ < 10) s = applyAction(s, { t: "step" }).state;

    // Praga é pública: os DOIS assentos precisam vê-la pelo mesmo intervalo,
    // senão a revelação simultânea fica dessincronizada na tela.
    for (const seat of [0, 1]) {
      const visto = filterStateForSeat(s, seat);
      expect(visto.awaitingPlagueShowcase).toBeTruthy();
      expect(visto.awaitingPlagueShowcase.key).toBe("sangue");
      expect(visto.awaitingPlagueShowcase.ms).toBe(PLAGUE_SHOWCASE_MS);
    }
  });

  it("o campo `lastPlagueRevealed` não existe mais — era redundante com a pausa", () => {
    const s = freshMatch([DECK_BASE, DECK_BASE], { seed: "y" });
    expect("lastPlagueRevealed" in s).toBe(false);
    expect("lastPlagueRevealed" in filterStateForSeat(s, 0)).toBe(false);
  });

  it("a duração é a mesma em qualquer modo — é constante do motor, não da tela", () => {
    expect(PLAGUE_SHOWCASE_MS).toBeGreaterThan(0);
    let s = comPragaPorRevelar("sangue");
    let guarda = 0;
    while (!s.awaitingPlagueShowcase && guarda++ < 10) s = applyAction(s, { t: "step" }).state;
    expect(s.awaitingPlagueShowcase.ms).toBe(PLAGUE_SHOWCASE_MS);
  });
});
