import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import { DeckMobile, MpDeck } from "./ui/decks/DeckUi.jsx";

/* As duas telas mobile de deck tinham a grade de cartas duplicada linha por
   linha, diferindo só nas colunas. Extraí para um componente; estes testes
   fixam o que precisa continuar valendo: as duas listam a coleção inteira e
   marcam exatamente as cartas do deck. */
const props = (deck) => ({
  build: [deck, []], setDeck() {}, flash() {}, startMatch() {}, setScreen() {},
  setForceView() {}, msg: "",
});
const DOZE = ["servo", "cao", "arqueiro", "lanceiro", "carruagem", "guardareal",
  "general", "colosso", "amon", "set", "maat", "osiris"];

describe("grade de seleção das telas mobile", () => {
  it.each([["solo", DeckMobile], ["online", MpDeck]])("%s lista a coleção inteira", (_r, Tela) => {
    const html = renderToString(<Tela {...props([])} />);
    // uma carta conhecida de cada arquétipo aparece
    for (const nome of ["Servo", "Colosso", "Amon", "Maat"]) expect(html).toContain(nome);
  });

  it.each([["solo", DeckMobile], ["online", MpDeck]])("%s marca com ✓ apenas as cartas do deck", (_r, Tela) => {
    const vazio = renderToString(<Tela {...props([])} />);
    const cheio = renderToString(<Tela {...props(DOZE)} />);
    const marcas = (h) => (h.match(/✓/g) || []).length;
    expect(marcas(vazio)).toBe(0);
    expect(marcas(cheio)).toBe(DOZE.length);
  });

  it("as duas usam colunas diferentes — é a única divergência que sobrou", () => {
    expect(renderToString(<DeckMobile {...props([])} />)).toContain("1fr 1fr");
    expect(renderToString(<MpDeck {...props([])} />)).toContain("minmax(150px, 1fr)");
  });
});
