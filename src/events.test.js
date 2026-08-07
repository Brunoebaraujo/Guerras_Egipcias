import { describe, expect, it } from "vitest";
import { emitEvent, listEventHandlers, MAX_EVENT_DEPTH, registerEventHandler } from "./events.js";

describe("barramento de eventos", () => {
  it("resolve por prioridade e desempata por id", () => {
    const type = "teste-ordem";
    const seen = [];
    registerEventHandler(type, { id: "b", priority: 20, handle: () => seen.push("b") });
    registerEventHandler(type, { id: "c", priority: 10, handle: () => seen.push("c") });
    registerEventHandler(type, { id: "a", priority: 20, handle: () => seen.push("a") });
    emitEvent({}, type);
    expect(seen).toEqual(["c", "a", "b"]);
  });

  it("recusa handlers duplicados", () => {
    const type = "teste-duplicado";
    registerEventHandler(type, { id: "x", handle: () => null });
    expect(() => registerEventHandler(type, { id: "x", handle: () => null })).toThrow(/duplicado/);
  });

  it("interrompe ciclos acima da profundidade máxima", () => {
    const type = "teste-ciclo";
    registerEventHandler(type, { id: "loop", handle: (_event, state) => emitEvent(state, type) });
    expect(() => emitEvent({}, type)).toThrow(`${MAX_EVENT_DEPTH}`);
  });

  it("expõe os gatilhos de domínio registrados", async () => {
    await import("./engine.js");
    expect(listEventHandlers("beforeDeath").map((h) => h.id)).toEqual(expect.arrayContaining(["bennu-rebirth", "mumia-return"]));
    expect(listEventHandlers("continuousPower").length).toBeGreaterThanOrEqual(5);
  });
});

