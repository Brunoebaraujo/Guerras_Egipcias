import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Tabuleiro, Hand } from "./ui/game/DesktopGameComponents.jsx";
import { GameMobile } from "./ui/App.jsx";
import { freshMatch } from "./match.js";
import { ctxOf, byKey, nextUid, shuffled, coin, laneWins, CARDS } from "./engine.js";

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

describe("Tabuleiro — hideSide esconde a EXISTÊNCIA da carta, não só o nome", () => {
  it("sem hideSide (hotseat normal): ambas as cartas ocultas mostram nome/arquétipo/poder, como sempre", () => {
    const html = renderToString(<Tabuleiro {...props(comCartasOcultas())} />);
    expect(html).toContain(byKey.arqueiro.nomeCurto || byKey.arqueiro.nome);
    expect(html).toContain(byKey.heka.nomeCurto || byKey.heka.nome);
  });

  it("com hideSide=1 (Bot no Lado B): a carta do Bot não aparece em NENHUM lugar do HTML — nem nome, nem verso, nem indício de que algo foi jogado ali", () => {
    const html = renderToString(<Tabuleiro {...props(comCartasOcultas(), { hideSide: 1 })} />);
    // A própria carta do jogador (lado 0) continua com informação plena.
    expect(html).toContain(byKey.arqueiro.nomeCurto || byKey.arqueiro.nome);
    // A carta do Bot (lado 1) não deixa rastro: nem nome, nem o rótulo
    // genérico "oculta · P" que a carta do PRÓPRIO jogador ainda mostra.
    expect(html).not.toContain("Heka");
    expect(html).not.toContain(`${byKey.heka.nome} — por revelar`);
    expect(html).not.toContain("oculta · 1");
    // A ausência do X de recolher confirma que a carta do Bot nunca chegou
    // a virar MiniCard — só a do jogador (lado 0) contribui um ✕.
    const remocoes = html.match(/>✕</g) || [];
    expect(remocoes.length).toBeLessThanOrEqual(1);
  });

  it("com hideSide=0: a mesma lógica protege o Lado A quando é ele o escondido (simetria)", () => {
    const html = renderToString(<Tabuleiro {...props(comCartasOcultas(), { hideSide: 0 })} />);
    expect(html).not.toContain("Arqueiro");
    expect(html).toContain(byKey.heka.nomeCurto || byKey.heka.nome);
  });
});

describe("Hand (desktop) — mão escondida do Bot", () => {
  function maoComCartas() {
    const g = freshMatch([DECK, DECK], { seed: "hide-hand" });
    g.hand[1] = [
      { hid: 101, key: "montu", printed: byKey.montu.poder, baked: 0 },
      { hid: 102, key: "amon", printed: byKey.amon.poder, baked: 0 },
    ];
    return g;
  }
  const noop = () => {};

  it("hidden=false (padrão): mostra nome das cartas normalmente", () => {
    const g = maoComCartas();
    const html = renderToString(<Hand side={1} tone="sky" g={g} sel={null} setSel={noop} disabled={false} onZoom={noop} />);
    expect(html).toContain("Montu");
    expect(html).toContain("Amon");
  });

  it("hidden=true (vs. Bot): não mostra nome nem arte das cartas, mas preserva a contagem (uma miniatura anônima por carta)", () => {
    const g = maoComCartas();
    const html = renderToString(<Hand side={1} tone="sky" g={g} sel={null} setSel={noop} disabled={false} onZoom={noop} hidden />);
    expect(html).not.toContain("Montu");
    expect(html).not.toContain("Amon");
    // 𓂀 aparece uma vez por carta da mão (2 cartas neste cenário).
    expect(html.match(/𓂀/g) || []).toHaveLength(2);
  });
});

describe("GameMobile — mão escondida do Bot (MHandRow)", () => {
  function propsComMaoDoBot(hideSide) {
    const deckList = CARDS.map((c) => c.key).slice(0, 12);
    const decks = [shuffled(deckList), shuffled(deckList)];
    const hand = [
      [{ hid: nextUid(), key: "arqueiro", printed: byKey.arqueiro.poder, baked: 0 }],
      [
        { hid: nextUid(), key: "montu", printed: byKey.montu.poder, baked: 0 },
        { hid: nextUid(), key: "amon", printed: byKey.amon.poder, baked: 0 },
      ],
    ];
    const g = {
      round: 1, energy: [1, 1], board: [], deaths: [0, 0], plays: [0, 0],
      pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
      deck: decks, hand, seen: [4, 4], priority: coin(), priorityReason: "sorteio",
      phase: "plan", queue: [], lastReveal: null, effect: null, effectSeq: 0,
      log: ["x"], trace: ["x"], finished: false,
    };
    const noop = () => {};
    return {
      g, ctx: ctxOf(g), wins: laneWins(g), planning: true,
      sel: null, setSel: noop, aim: null, moving: null, msg: "", fast: false,
      startReveal: noop, setFast: noop, nextRound: noop, reset: noop, setScreen: noop, setForceView: noop,
      placeCard: noop, pickUp: noop, startMove: noop, moveTo: noop, applyAim: noop, skipAim: noop,
      isAimable: () => false, isMovable: () => false, zoomBoard: noop, zoomHand: noop,
      hideSide,
    };
  }

  it("sem hideSide: a mão do Lado B (bot) aparece por nome, como sempre em hotseat", () => {
    const html = renderToString(<GameMobile {...propsComMaoDoBot(null)} />);
    expect(html).toContain("Montu");
    expect(html).toContain("Amon");
  });

  it("com hideSide=1: a mão do Bot vira contagem (🂠2), sem nome de carta nenhuma", () => {
    const html = renderToString(<GameMobile {...propsComMaoDoBot(1)} />);
    expect(html).not.toContain("Montu");
    expect(html).not.toContain("Amon");
    expect(html).toMatch(/🂠(<!-- -->)?2/);
    // A mão do jogador (lado 0) continua visível normalmente.
    expect(html).toContain("Arqueiro");
  });
});
