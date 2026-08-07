import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CARDS, PRAGAS, TOKENS, byKey } from "./engine.js";

/* ==========================================================================
   NOME DE MINIATURA — a regra é "uma palavra, sempre".

   A miniatura tem ~49px de largura. O nome completo não cabe: quebrava em duas
   linhas, truncava no meio ("Am-heh, o Devorad...") e a faixa comia a arte. Daí
   `nomeCurto`, que vale SÓ na mão e no tabuleiro.

   Estes testes existem porque a regra é fácil de furar sem perceber: basta
   alguém acrescentar uma carta nova e esquecer a linha em NOME_CURTO — aí ela
   cai no fallback do nome completo e volta a truncar, calada. O fallback é
   proposital (carta de uma palavra não precisa de linha), então é o teste que
   tem de cobrar o caso composto.
   ========================================================================== */
const TODAS = [...CARDS, ...PRAGAS, ...TOKENS];

describe("nomeCurto", () => {
  it("toda carta tem um nomeCurto não vazio", () => {
    const sem = TODAS.filter((c) => !c.nomeCurto || !c.nomeCurto.trim());
    expect(sem.map((c) => c.key)).toEqual([]);
  });

  it("nenhum nomeCurto tem espaço, vírgula ou reticências", () => {
    const compostos = TODAS.filter((c) => /[\s,·]|\.\.\./.test(c.nomeCurto));
    expect(compostos.map((c) => `${c.key}: "${c.nomeCurto}"`)).toEqual([]);
  });

  it("cabe na faixa da miniatura (teto de 12 caracteres)", () => {
    // Acima disso a faixa recorre a reticências e o nome deixa de identificar.
    const longos = TODAS.filter((c) => c.nomeCurto.length > 12);
    expect(longos.map((c) => `${c.key}: "${c.nomeCurto}" (${c.nomeCurto.length})`)).toEqual([]);
  });

  it("o nome completo continua intacto — nomeCurto não sobrescreve nada", () => {
    expect(byKey.amheh.nome).toBe("Am-heh, o Devorador de Milhões");
    expect(byKey.amheh.nomeCurto).toBe("Am-heh");
    expect(byKey.diluvio.nome).toBe("Dilúvio de Hápi");
    expect(byKey.diluvio.nomeCurto).toBe("Dilúvio");
  });

  it("carta que já é de uma palavra cai no fallback e não precisa de linha", () => {
    for (const k of ["hathor", "sobek", "bennu", "anubis", "sekhmet"])
      expect(byKey[k].nomeCurto).toBe(byKey[k].nome);
  });

  /* A colisão que motivou a exceção: o Rebanho cria fichas de Cabra, então a
     CARTA "Cabra do Nilo" e a FICHA "Cabra" apareceriam idênticas lado a lado
     na mesma via. A ficha cede o nome na miniatura, e só nela. */
  it("Cabra do Nilo e a ficha de Cabra não colidem na miniatura", () => {
    expect(byKey["cabra-nilo"].nomeCurto).toBe("Cabra");
    expect(byKey["token-cabra"].nomeCurto).toBe("Cabrita");
    expect(byKey["token-cabra"].nome).toBe("Cabra");   // nome real preservado
  });

  it("nenhum nomeCurto se repete entre cartas diferentes", () => {
    const vistos = new Map();
    const colisoes = [];
    for (const c of TODAS) {
      const anterior = vistos.get(c.nomeCurto);
      // Ganso Doméstico e sua ficha SÃO a mesma coisa: colidir ali é correto.
      if (anterior && !(anterior === "ganso" && c.key === "token-ganso"))
        colisoes.push(`${anterior} x ${c.key} -> "${c.nomeCurto}"`);
      vistos.set(c.nomeCurto, c.key);
    }
    expect(colisoes).toEqual([]);
  });
});

describe("onde o nome curto é usado", () => {
  const src = ["src/ui/App.jsx", "src/ui/game/DesktopGameComponents.jsx"]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");

  it("a mão e o tabuleiro usam nomeCurto", () => {
    // 2x na MiniCard (oculta e revelada) + 2x nas mãos (desktop e mobile)
    expect(src.match(/def\.nomeCurto/g) || []).toHaveLength(4);
  });

  it("o zoom e a carta grande continuam com o nome completo", () => {
    expect(src).toContain("<Carta nome={def.nome}");
    expect(src).toContain("nome={cartaAmpliada.nome}");
  });
});
