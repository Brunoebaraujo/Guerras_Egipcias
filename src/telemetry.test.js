import { describe, expect, it, vi } from "vitest";
import { installGlobalErrorCapture, reportClientError } from "./telemetry.js";

describe("diagnóstico do cliente", () => {
  it("produz evento estruturado mesmo sem navegador", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const entry = reportClientError("render", new Error("falha"), { component: "App" });
    expect(entry).toMatchObject({ kind: "render", message: "falha", component: "App" });
    spy.mockRestore();
  });

  it("instala e remove os dois listeners globais", () => {
    const target = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const remove = installGlobalErrorCapture(target);
    expect(target.addEventListener).toHaveBeenCalledTimes(2);
    remove();
    expect(target.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
