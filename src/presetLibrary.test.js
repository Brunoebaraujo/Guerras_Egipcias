import { describe, it, expect } from "vitest";
import { CARDS, CONTENT_SIG } from "./engine.js";
import {
  emptyOverrides, parseOverrides, presetValido, estadoDoOverride,
  setOverride, clearOverride, effectivePresets,
} from "./storage/presetLibrary.js";

const doze = CARDS.slice(0, 12).map((c) => c.key);
const outroDoze = CARDS.slice(1, 13).map((c) => c.key);

describe("presetValido", () => {
  it("aceita 12 cartas únicas e escolhíveis", () => {
    expect(presetValido(doze).ok).toBe(true);
  });
  it("rejeita quantidade diferente de 12", () => {
    expect(presetValido(doze.slice(0, 11)).ok).toBe(false);
  });
  it("rejeita repetição", () => {
    expect(presetValido([...doze.slice(0, 11), doze[0]]).ok).toBe(false);
  });
  it("rejeita chave inexistente ou Praga (não escolhível)", () => {
    expect(presetValido([...doze.slice(0, 11), "nao-existe"]).ok).toBe(false);
    expect(presetValido([...doze.slice(0, 11), "sangue"]).ok).toBe(false);
  });
});

describe("parseOverrides", () => {
  it("valores ausentes ou corrompidos degradam para vazio", () => {
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides("não é json{{")).toEqual({});
    expect(parseOverrides(42)).toEqual({});
  });
  it("descarta entradas individuais podres, preserva as boas", () => {
    const raw = JSON.stringify({
      v: 1,
      overrides: {
        "Padrão": { cards: doze, sig: CONTENT_SIG, updatedAt: 100 },
        "Quebrado": { cards: "não é array" },
        "SemCards": {},
      },
    });
    const parsed = parseOverrides(raw);
    expect(Object.keys(parsed)).toEqual(["Padrão"]);
    expect(parsed["Padrão"].cards).toEqual(doze);
  });
});

describe("setOverride / clearOverride", () => {
  it("setOverride grava a assinatura atual e rejeita deck inválido", () => {
    const { overrides, error } = setOverride(emptyOverrides(), "Padrão", doze);
    expect(error).toBeUndefined();
    expect(overrides["Padrão"].cards).toEqual(doze);
    expect(overrides["Padrão"].sig).toBe(CONTENT_SIG);

    const bad = setOverride(emptyOverrides(), "Padrão", doze.slice(0, 5));
    expect(bad.error).toBeDefined();
  });

  it("clearOverride remove só a entrada pedida", () => {
    const { overrides: withTwo } = setOverride(
      setOverride(emptyOverrides(), "Padrão", doze).overrides,
      "Exército", outroDoze,
    );
    const { overrides: withOne } = clearOverride(withTwo, "Padrão");
    expect(Object.keys(withOne)).toEqual(["Exército"]);
  });

  it("clearOverride em preset sem sobrescrita é um no-op seguro", () => {
    const { overrides } = clearOverride(emptyOverrides(), "Padrão");
    expect(overrides).toEqual({});
  });
});

describe("estadoDoOverride", () => {
  it("inexistente, ok, desatualizado e inválido são estados distintos", () => {
    expect(estadoDoOverride(undefined).estado).toBe("inexistente");
    expect(estadoDoOverride({ cards: doze, sig: CONTENT_SIG }).estado).toBe("ok");
    expect(estadoDoOverride({ cards: doze, sig: "sig-antiga" }).estado).toBe("desatualizado");
    expect(estadoDoOverride({ cards: doze.slice(0, 5), sig: CONTENT_SIG }).estado).toBe("invalido");
  });
});

describe("effectivePresets", () => {
  const defaults = { "Padrão": doze, "Exército": outroDoze };

  it("sem overrides, devolve exatamente os padrões", () => {
    expect(effectivePresets(defaults, emptyOverrides())).toEqual(defaults);
  });

  it("um preset com override usa o conteúdo editado; os demais ficam no padrão", () => {
    const editado = [...doze.slice(0, 11), outroDoze[11]];
    const { overrides } = setOverride(emptyOverrides(), "Padrão", editado);
    const efetivo = effectivePresets(defaults, overrides);
    expect(efetivo["Padrão"]).toEqual(editado);
    expect(efetivo["Exército"]).toEqual(outroDoze);
  });

  it("uma sobrescrita órfã (preset removido do código) não aparece", () => {
    const { overrides } = setOverride(emptyOverrides(), "PresetAntigo", doze);
    expect(effectivePresets(defaults, overrides)).toEqual(defaults);
  });
});
