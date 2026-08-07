import { describe, expect, it } from "vitest";
import { PIPELINE_STOP, runRevealPipeline } from "./revealPipeline.js";

describe("pipeline de revelação", () => {
  it("executa etapas na ordem declarada", () => {
    const context = { values: [] };
    const result = runRevealPipeline(context, [
      { name: "primeira", run: (ctx) => ctx.values.push(1) },
      { name: "segunda", run: (ctx) => ctx.values.push(2) },
    ]);
    expect(result.executed).toEqual(["primeira", "segunda"]);
    expect(context.values).toEqual([1, 2]);
  });

  it("interrompe sem executar etapas posteriores", () => {
    const result = runRevealPipeline({}, [
      { name: "parar", run: () => PIPELINE_STOP },
      { name: "inacessível", run: () => { throw new Error("não deveria executar"); } },
    ]);
    expect(result).toMatchObject({ executed: ["parar"], stopped: true });
  });
});
