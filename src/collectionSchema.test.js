import { describe, expect, it } from "vitest";
import { validarColecao } from "./collectionSchema.js";

describe("contrato da coleção", () => {
  it("aceita toda a coleção atual", () => {
    expect(validarColecao()).toEqual([]);
  });

  it("rejeita typo, chave duplicada e valores inválidos", () => {
    const cards = [
      { key: "x", nome: "X", tipo: "Guerreiro", custo: -1, poder: "2", arch: "base", randomBuffAlie: 2 },
      { key: "x", nome: "Y", tipo: "Guerreiro", custo: 1, poder: 2, arch: "inexistente" },
    ];
    const errors = validarColecao(cards);
    expect(errors).toEqual(expect.arrayContaining([
      "x: custo inválido",
      "x: poder inválido",
      'x: campo desconhecido "randomBuffAlie"',
      "chave duplicada: x",
      'x: arch desconhecido "inexistente"',
    ]));
  });
});
