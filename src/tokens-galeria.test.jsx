// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import App from "./ui/App.jsx";
import { TOKENS, PRAGAS } from "./engine.js";

/* ==========================================================================
   Aba "Tokens" da Galeria — mesmo padrão da aba "Pragas" (lista de leitura,
   sem seleção), mas para fichas (nunca aparecem em CARDS/deckbuilder). Este
   arquivo monta o App de verdade (jsdom + createRoot + act, mesmo padrão de
   arnes-online.test.jsx) e navega Menu → Decks → Galeria → Tokens clicando
   nos botões reais, porque um teste estático não pegaria um typo no id da
   aba ou um import esquecido — exatamente a categoria de bug que já derrubou
   a Galeria antes (ver render.test.js). */

const clicar = (container, texto) => {
  const botoes = [...container.querySelectorAll("button")];
  let btn = botoes.find((b) => b.textContent.trim() === texto);
  if (!btn) {
    // No MainMenu o rótulo é uma <div> IRMÃ do botão (ícone e texto
    // separados na grade), não texto dentro do próprio <button>.
    const rotulo = [...container.querySelectorAll("div")]
      .find((d) => d.children.length === 0 && d.textContent.trim() === texto);
    if (rotulo) btn = rotulo.parentElement?.querySelector("button");
  }
  if (!btn) throw new Error(`botão "${texto}" não encontrado`);
  act(() => { btn.click(); });
};

describe("Galeria — aba Tokens", () => {
  let container, root;

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const montar = () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => { root.render(<App />); });
  };

  const irParaGaleriaTokens = () => {
    montar();
    clicar(container, "Iniciar");
    clicar(container, "Construir Decks");
    clicar(container, "Galeria");
    clicar(container, "Tokens");
  };

  it("navega até a Galeria e lista os Tokens ao clicar na aba", () => {
    irParaGaleriaTokens();
    // Ammit, a Devoradora — a ficha do combo Ovo de Ammit — aparece na lista.
    expect(container.textContent).toContain("Ammit, a Devoradora");
    // Subtítulo usa a contagem real da coleção de fichas (TOKENS.length).
    expect(container.textContent).toContain(`${TOKENS.length} Tokens`);
  });

  it("mostra o banner explicando que Tokens não se escolhem", () => {
    irParaGaleriaTokens();
    expect(container.textContent).toContain("fichas criadas por efeitos de outras cartas");
    expect(container.textContent).toContain("Ovo de Ammit");
  });

  it("Coleção e Pragas continuam funcionando depois da mudança (regressão)", () => {
    montar();
    clicar(container, "Iniciar");
    clicar(container, "Construir Decks");
    clicar(container, "Galeria");
    // Coleção é a aba inicial.
    expect(container.textContent).toContain("Heh, o Infinito");
    clicar(container, "Pragas");
    expect(container.textContent).toContain(`${PRAGAS.length} Pragas`);
  });
});
