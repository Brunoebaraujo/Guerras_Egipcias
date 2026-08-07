import { describe, expect, it } from "vitest";
import { createRng, normalizeSeed, shuffleWithRng } from "./rng.js";

describe("rng serializável", () => {
  it("repete a mesma sequência para a mesma seed", () => {
    const a = createRng("maat");
    const b = createRng("maat");
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b));
  });

  it("continua exatamente de um snapshot", () => {
    const a = createRng(42);
    Array.from({ length: 7 }, a);
    const b = createRng(a.snapshot());
    expect(Array.from({ length: 10 }, a)).toEqual(Array.from({ length: 10 }, b));
  });

  it("embaralha sem mutar a entrada", () => {
    const source = [1, 2, 3, 4, 5];
    const shuffled = shuffleWithRng(source, createRng(normalizeSeed("nilo")));
    expect(source).toEqual([1, 2, 3, 4, 5]);
    expect(shuffled).not.toEqual(source);
  });
});

