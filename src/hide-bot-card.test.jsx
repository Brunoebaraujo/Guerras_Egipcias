import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Tabuleiro } from "./ui/game/DesktopGameComponents.jsx";
import { freshMatch } from "./match.js";
import { ctxOf, byKey } from "./engine.js";

const DECK = ["servo", "cao", "arqueiro", "lanceiro", "carruagem", "guardareal",
  "general", "colosso", "amon", "set", "maat", "osiris"];

/** Uma carta ainda não revelada de cada lado, na via 0. */
function comCartasOcultas() {
  const s = freshMatch([DECK, DECK], { seed: "hide-side" });
  s.board = [
    { uid: 1, key: "arqueiro", owner: 0, lane: 0, printed: 3, baked: 0, mods: [], revealed: false, venenos: [], enteredRound: 1 },
    { uid: 2, key: "heka", owner: 1, lane: 0, printed: 1, baked: 0, mods: [], revealed: false, venenos: [], enteredRound: 1 },
  ];
  return s;
}

const props = (g, extra = {}) => ({
  g, ctx: ctxOf(g), aim: null, moving: null, sel: null, planning: true,
  placeCard() {}, moveTo() {}, applyAim() {}, isAimable: () => false,
  startMove() {}, isMovable: () => false, pickUp: null, zoomBoard() {},
  ...extra,
});

describe("Tabuleiro — hideSide (informação oculta do Bot)", () => {
  it("sem hideSide (hotseat normal): ambas as cartas ocultas mostram nome/arquétipo/poder, como sempre", () => {
    const html = renderToString(<Tabuleiro {...props(comCartasOcultas())} />);
    expect(html).toContain(byKey.arqueiro.nomeCurto || byKey.arqueiro.nome);
    expect(html).toContain(byKey.heka.nomeCurto || byKey.heka.nome);
  });

  it("com hideSide=1 (Bot no Lado B): a carta do Bot vira verso de carta — nem nome, nem via title", () => {
    const html = renderToString(<Tabuleiro {...props(comCartasOcultas(), { hideSide: 1 })} />);
    // A própria carta do jogador (lado 0) continua com informação plena.
    expect(html).toContain(byKey.arqueiro.nomeCurto || byKey.arqueiro.nome);
    // A carta do Bot (lado 1) não aparece em NENHUM lugar do HTML: nem no
    // texto visível, nem no atributo title (tooltip), que também vazava nome.
    expect(html).not.toContain("Heka");
    expect(html).not.toContain(`${byKey.heka.nome} — por revelar`);
    // O rótulo genérico de "oculta" (com poder provisório) não aparece mais
    // para a carta do Bot — isso é exatamente o que a carta do jogador ainda
    // mostra, então a ausência prova que o ramo "verso de carta" foi usado.
    expect(html).not.toContain("oculta · 1");
  });

  it("com hideSide=0: a mesma lógica protege o Lado A quando é ele o escondido (simetria)", () => {
    const html = renderToString(<Tabuleiro {...props(comCartasOcultas(), { hideSide: 0 })} />);
    expect(html).not.toContain("Arqueiro");
    expect(html).toContain(byKey.heka.nomeCurto || byKey.heka.nome);
  });

  it("carta escondida não recebe onClick (sem zoom/mira/recolher): sem botão ✕ e com cursor neutro", () => {
    const html = renderToString(<Tabuleiro {...props(comCartasOcultas(), { hideSide: 1, pickUp: () => {} })} />);
    // O botão de recolher (✕) só aparece para cartas não escondidas.
    // Como só há uma carta oculta por lado neste cenário, um único ✕ (a do
    // jogador) é esperado; a carta do Bot não deve contribuir com outro.
    const remocoes = html.match(/>✕</g) || [];
    expect(remocoes.length).toBeLessThanOrEqual(1);
    // O verso de carta usa cursor "default" (não clicável); o ramo normal
    // (inclusive a própria carta oculta do jogador) usa "pointer". O trecho
    // "overflow:visible;cursor:..." é específico do estilo `common` da
    // MiniCard — não se confunde com o cursor da ZONA da via, que também usa
    // "default" quando não é alvo de drop (ver o teste de sanidade abaixo).
    expect(html).toContain("overflow:visible;cursor:default");
  });
});

describe("Tabuleiro — hideSide sanity (cursor:default não é onipresente)", () => {
  it("sem hideSide, nenhuma MiniCard usa cursor:default (só o wrapper de zona, que é outro elemento)", () => {
    const html = renderToString(<Tabuleiro {...props(comCartasOcultas())} />);
    // A ZONA da via pode legitimamente ter cursor:default (não é alvo de
    // drop nesse cenário) — por isso o teste busca o padrão específico da
    // MiniCard (`overflow:visible;cursor:...`), não "cursor:default" isolado.
    expect(html).not.toContain("overflow:visible;cursor:default");
  });
});
