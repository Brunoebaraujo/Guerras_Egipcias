import { describe, expect, it } from "vitest";
import { PHASE, canTransition, phaseInvariantErrors, transitionPhase } from "./phases.js";

describe("máquina de fases", () => {
  it("expõe somente as transições válidas do ciclo", () => {
    expect(canTransition(PHASE.PLAN, PHASE.REVEALING)).toBe(true);
    expect(canTransition(PHASE.REVEALING, PHASE.REVEALED)).toBe(true);
    expect(canTransition(PHASE.REVEALED, PHASE.PLAN)).toBe(true);
    expect(canTransition(PHASE.PLAN, PHASE.REVEALED)).toBe(true);
    expect(canTransition(PHASE.REVEALING, PHASE.PLAN)).toBe(false);
  });

  it("rejeita transição impossível", () => {
    expect(() => transitionPhase({ phase: PHASE.REVEALING }, PHASE.PLAN)).toThrow(/inválida/);
  });

  it("detecta invariantes estruturais", () => {
    expect(phaseInvariantErrors({ phase: PHASE.PLAN, queue: [1], awaitingAim: null })).toContain("planejamento não pode ter fila de revelação");
    expect(phaseInvariantErrors({ phase: "outra", queue: [], awaitingAim: null })[0]).toMatch(/desconhecida/);
  });
});
