import { describe, expect, it } from "vitest";
import { getEffect, listEffects } from "./index.js";
import { applyAction, autoReveal, freshMatch } from "../match.js";
import { byKey, CARDS, PRAGAS } from "../engine.js";

const base = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "montu", "hathor", "escriba", "conselheiro", "ganso", "macaco"];

describe("registry de efeitos", () => {
  it("registra ids únicos com metadados explícitos", () => {
    const effects = listEffects();
    expect(new Set(effects.map((e) => e.id)).size).toBe(effects.length);
    expect(effects.every((e) => e.phase && Number.isFinite(e.priority))).toBe(true);
  });

  it("mantém todos os efeitos declarados no catálogo registrados", () => {
    const declarados = Object.values(byKey).flatMap((card) => card.efeitos || []);
    expect(declarados.length).toBeGreaterThan(0);
    expect(declarados.every((effect) => getEffect(effect.id))).toBe(true);
  });

  it("não deixa cartas Ao Entrar no dispatcher legado", () => {
    const legacy = [...CARDS, ...PRAGAS].filter((card) => card.trigger === "entrar" && !card.efeitos?.length);
    expect(legacy.map((card) => card.key)).toEqual([]);
  });

  it("resolve uma carta migrada pelo caminho novo", () => {
    let state = freshMatch([base, base], { seed: 7 });
    state.hand[0] = [
      { hid: 100, key: "servo", printed: byKey.servo.poder, baked: 0 },
      { hid: 101, key: "hathor", printed: byKey.hathor.poder, baked: 0 },
    ];
    const [servo, hathor] = state.hand[0];
    state.energy = [20, 20];
    state = applyAction(state, { t: "place", side: 0, hid: servo.hid, lane: 0 }).state;
    state = applyAction(state, { t: "place", side: 0, hid: hathor.hid, lane: 0 }).state;
    state = applyAction(state, { t: "startReveal" }).state;
    state = autoReveal(state).state;
    expect(state.board.find((c) => c.key === "servo").mods.some((m) => m.val === 3)).toBe(true);
  });
});
