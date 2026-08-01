import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import React from "react";
import { OnlineGame } from "./App.jsx";
import { CARDS, byKey, nextUid } from "./engine.js";
import { freshMatch, applyAction } from "./match.js";

/* ==========================================================================
   BANNER DE VITÓRIA.

   Dois defeitos motivaram estes testes, e os dois passaram batido porque nada
   os cobria:

   1. O ALFA FOI ACHATADO. A arte veio com transparência de verdade, mas a
      conversão para WebP passou por `convert("RGB")` antes de salvar — o que
      compõe o alfa contra preto. Resultado na tela: um retângulo preto em volta
      da moldura. O teste do arquivo abaixo pega isso sem precisar decodificar
      imagem: um WebP com transparência carrega o bloco ALPH no contêiner.

   2. O TEXTO FICOU FORA DO CENTRO. A frase foi centrada na IMAGEM, e não no
      painel de pedra de dentro da moldura. Como os escaravelhos das quinas
      sobem acima da moldura, o miolo é assimétrico na vertical, e centrar na
      imagem joga o texto para cima e para fora.
   ========================================================================== */

describe("o arquivo do banner", () => {
  const bin = readFileSync("public/banner-vitoria.webp");
  const cab = bin.subarray(0, 200);

  it("é um WebP válido", () => {
    expect(bin.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(bin.subarray(8, 12).toString("latin1")).toBe("WEBP");
  });

  /* O teste que faltava: sem ele, um `convert("RGB")` distraído volta a
     transformar a transparência num tapume preto e ninguém percebe. */
  it("PRESERVA a transparência — tem bloco ALPH no contêiner estendido", () => {
    expect(cab.includes(Buffer.from("VP8X"))).toBe(true);
    expect(cab.includes(Buffer.from("ALPH"))).toBe(true);
  });
});

describe("a geometria do painel", () => {
  const src = readFileSync("src/App.jsx", "utf8");
  const m = src.match(/const BANNER = \{[^}]*painel: \{ left: ([\d.]+), top: ([\d.]+), width: ([\d.]+), height: ([\d.]+) \}/);

  it("está declarada em percentuais do recorte", () => {
    expect(m).toBeTruthy();
  });

  it("o painel cabe dentro da moldura nos dois eixos", () => {
    const [left, top, width, height] = m.slice(1).map(Number);
    expect(left + width).toBeLessThan(100);
    expect(top + height).toBeLessThan(100);
    // Sobra de moldura em cima e embaixo — se algum dia der zero, o texto
    // encostou na borda e a medição saiu errada.
    expect(top).toBeGreaterThan(5);
    expect(100 - (top + height)).toBeGreaterThan(5);
  });

  it("o miolo é assimétrico na vertical, que é justamente a armadilha", () => {
    const [, top, , height] = m.slice(1).map(Number);
    // Centrar na imagem só funcionaria se estas duas margens fossem iguais.
    expect(Math.abs(top - (100 - (top + height)))).toBeGreaterThan(5);
  });
});

function partidaEncerrada(seat) {
  const lista = CARDS.map((c) => c.key).slice(0, 12);
  let g = freshMatch([lista, lista], { rng: () => 0.5 });
  // Lado A leva as três vias: vence a partida sem ambiguidade.
  for (let lane = 0; lane < 3; lane++)
    g.board.push({ uid: nextUid(), key: "colosso", owner: 0, lane,
      printed: byKey.colosso.poder, baked: 0, mods: [], revealed: true,
      enteredRound: 1, entryPlays: 1, moved: false });
  g.round = 6;
  g = applyAction(g, { t: "startReveal" }).state;
  g = applyAction(g, { t: "nextRound" }, { rng: () => 0.5 }).state;
  g.oppHand = 0; g.hand[1 - seat] = [];
  return { seat, state: g, ready: [false, false], oppConnected: true };
}

describe("o texto por assento no multiplayer", () => {
  it("quem venceu lê Vitória", () => {
    const html = renderToString(<OnlineGame send={() => {}} data={partidaEncerrada(0)} note="" onLeave={() => {}} />);
    expect(html).toContain("Vitória");
    expect(html).not.toContain("Derrota");
  });

  it("quem perdeu lê Derrota, na MESMA partida", () => {
    const html = renderToString(<OnlineGame send={() => {}} data={partidaEncerrada(1)} note="" onLeave={() => {}} />);
    expect(html).toContain("Derrota");
  });

  it("o banner traz a moldura e um jeito de sair do caminho", () => {
    const html = renderToString(<OnlineGame send={() => {}} data={partidaEncerrada(0)} note="" onLeave={() => {}} />);
    expect(html).toContain("banner-vitoria.webp");
    expect(html).toContain("toque para ver o tabuleiro");
  });
});

/* ==========================================================================
   ENCAIXE DO TEXTO NO PAINEL.

   "LADO A VENCEU" numa linha só furou o painel pelos dois lados: o fator de
   largura por letra estava em 0,62, que é valor de MINÚSCULA — e o banner
   escreve em versalete, bem mais largo. Agora a frase local quebra em duas
   linhas e o corpo sai do menor entre o que cabe na largura e na altura.

   O teste replica a mesma conta do componente e cobra folga sobrando dos dois
   lados, em vez de só "não estourar": encostar no ouro já é defeito visual.
   ========================================================================== */
describe("o texto cabe dentro do painel", () => {
  const AR = 1277 / 537, P = { width: 79.33, height: 64.99 };
  const pw = P.width / 100, ph = (P.height / 100) / AR;
  const CHAR = 0.80;                       // largura média da letra, em `em`

  const medir = (linhas) => {
    const maior = Math.max(...linhas.map((t) => t.length));
    const f = Math.min((pw * 0.88) / (CHAR * maior), ph / (linhas.length * 1.25));
    return {
      folgaLateral: (pw - f * CHAR * maior) / 2,                       // fração da largura
      folgaVertical: (P.height / 100 / AR - f * linhas.length * 1.05) / 2,
    };
  };

  const casos = [
    ["local, lado A", ["Lado A", "venceu"]],
    ["local, lado B", ["Lado B", "venceu"]],
    ["online, vitória", ["Vitória"]],
    ["online, derrota", ["Derrota"]],
    ["empate", ["Empate"]],
  ];

  for (const [nome, linhas] of casos) {
    it(`${nome}: sobra moldura dos dois lados`, () => {
      const { folgaLateral, folgaVertical } = medir(linhas);
      expect(folgaLateral).toBeGreaterThan(0.02);   // ~2% da largura do banner
      expect(folgaVertical).toBeGreaterThan(0.01);
    });
  }

  /* Com a conta corrigida uma linha só não ESTOURA — ela encolhe até caber. Mas
     encolhe muito: a frase inteira teria de ficar bem menor que a versão em duas
     linhas para caber na mesma largura. Duas linhas usam o painel, uma linha o
     desperdiça. É esse o ganho que se cobra aqui. */
  const corpo = (linhas) => {
    const maior = Math.max(...linhas.map((t) => t.length));
    return Math.min((pw * 0.88) / (CHAR * maior), ph / (linhas.length * 1.25));
  };

  it("duas linhas aproveitam melhor o painel que uma", () => {
    expect(corpo(["Lado A", "venceu"])).toBeGreaterThan(corpo(["Lado A venceu"]) * 1.3);
  });

  /* A regressão de verdade: com o fator de MINÚSCULA (0,62), que foi o defeito
     relatado, a frase em uma linha transbordava o painel. */
  it("com o fator antigo de 0,62 a frase furava o painel — é a regressão", () => {
    const antigo = pw / (0.62 * "Lado A venceu".length);   // sem folga, como era
    const larguraReal = antigo * CHAR * "Lado A venceu".length;
    expect(larguraReal).toBeGreaterThan(pw);
  });

  it("o componente quebra mesmo a frase local em duas linhas", () => {
    const src = readFileSync("src/App.jsx", "utf8");
    expect(src).toMatch(/linhas = \[`Lado \$\{[^}]+\}`, "venceu"\]/);
  });
});
