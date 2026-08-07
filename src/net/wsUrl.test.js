import { describe, expect, it } from "vitest";
import { normalizeWs } from "./wsUrl.js";

describe("normalizeWs", () => {
  it("converte URLs HTTP do painel em URLs WebSocket", () => {
    expect(normalizeWs("https://example.com/")).toBe("wss://example.com");
    expect(normalizeWs("http://localhost:8080/")).toBe("ws://localhost:8080");
  });

  it("preserva WebSocket explícito e assume WSS sem protocolo", () => {
    expect(normalizeWs("ws://localhost:8080")).toBe("ws://localhost:8080");
    expect(normalizeWs("example.com/game")).toBe("wss://example.com/game");
  });
});
