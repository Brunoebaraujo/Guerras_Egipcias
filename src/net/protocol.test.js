import { describe, expect, it } from "vitest";
import {
  CLIENT_MESSAGE_TYPES, PLANNING_ACTION_TYPES, PROTOCOL_VERSION, SERVER_MESSAGE_TYPES,
  createSequenceGuard, isCompatibleProtocol, isPlanningActionType, rememberMessageId,
} from "./protocol.js";

describe("contrato de rede", () => {
  it("não possui tipos duplicados", () => {
    expect(new Set(CLIENT_MESSAGE_TYPES).size).toBe(CLIENT_MESSAGE_TYPES.length);
    expect(new Set(SERVER_MESSAGE_TYPES).size).toBe(SERVER_MESSAGE_TYPES.length);
    expect(new Set(PLANNING_ACTION_TYPES).size).toBe(PLANNING_ACTION_TYPES.length);
  });

  it("reconhece apenas ações de planejamento autorizadas", () => {
    expect(isPlanningActionType("place")).toBe(true);
    expect(isPlanningActionType("toggleActivate")).toBe(true);
    expect(isPlanningActionType("finish")).toBe(false);
  });

  /* O relógio do showcase de Praga é do SERVIDOR. Se o cliente pudesse mandar
     `ackPlagueShowcase`, um jogador cortaria a exibição do outro no meio — e a
     revelação simultânea voltaria a divergir entre as duas telas. */
  it("não deixa o cliente encerrar a exibição da Praga", () => {
    expect(isPlanningActionType("ackPlagueShowcase")).toBe(false);
    expect(PLANNING_ACTION_TYPES).not.toContain("ackPlagueShowcase");
  });

  it("também não deixa o cliente conduzir a revelação por conta própria", () => {
    for (const t of ["step", "startReveal", "nextRound", "aim", "skipAim", "finish"]) {
      expect(isPlanningActionType(t)).toBe(false);
    }
  });

  it("recusa versões incompatíveis e mensagens fora de ordem", () => {
    expect(isCompatibleProtocol(PROTOCOL_VERSION)).toBe(true);
    expect(isCompatibleProtocol(PROTOCOL_VERSION - 1)).toBe(false);
    const accept = createSequenceGuard();
    expect(accept(1)).toBe(true);
    expect(accept(1)).toBe(false);
    expect(accept(3)).toBe(true);
    expect(accept(2)).toBe(false);
  });

  it("deduplica ids com cache limitado", () => {
    const cache = new Set();
    expect(rememberMessageId(cache, "a", 2)).toBe(true);
    expect(rememberMessageId(cache, "a", 2)).toBe(false);
    expect(rememberMessageId(cache, "b", 2)).toBe(true);
    expect(rememberMessageId(cache, "c", 2)).toBe(true);
    expect(cache.has("a")).toBe(false);
  });
});
