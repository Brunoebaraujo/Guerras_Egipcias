import { describe, expect, it } from "vitest";
import { CLIENT_MESSAGE_TYPES, PLANNING_ACTION_TYPES, SERVER_MESSAGE_TYPES, isPlanningActionType } from "./protocol.js";

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
});
