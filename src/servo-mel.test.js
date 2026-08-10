import { describe, it, expect, beforeEach } from "vitest";
import { byKey, resolveServoDoMel, invocarFicha, resetUid, nextUid, LANE_CAP } from "./engine.js";
import { freshMatch, applyAction, autoReveal } from "./match.js";

/* ==========================================================================
   SERVO COBERTO DE MEL — Fim da Rodada: uma Mosca para cada lado da via dele
   que ficou parado nesta rodada.

   A regra inteira cabe numa frase, mas a armadilha está em quem a lê rápido:
   NÃO é "a via ficou parada", é "ESTE LADO da via ficou parado". São duas
   perguntas independentes sobre a mesma via, e a metade destes testes existe
   para provar que uma não contamina a outra.
   ========================================================================== */

const DEF = byKey["servo-mel"];

const mk = (key, { owner = 0, lane = 0, revealed = true, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked: 0, mods: [], entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
/* `jogadas` é o estado que o Servo lê: [ladoA, ladoB], cada um [via0, via1, via2]. */
const mkState = (board = [], jogadas = [[0, 0, 0], [0, 0, 0]]) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], deck: [[], []], round: 1, energy: [9, 9],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0],
  playsLane: jogadas, blessings: [],
});
const primeiro = () => 0;
const moscasDe = (s, side) => s.board.filter((c) => c.key === "token-mosca" && c.owner === side);

/* Enche todas as vias de um lado, deixando-o sem espaço para receber Mosca. */
function encher(board, side) {
  for (let lane = 0; lane < 3; lane++)
    for (let i = 0; i < LANE_CAP; i++) board.push(mk("servo", { owner: side, lane }));
}

beforeEach(resetUid);

/* ------------------------- os quatro cenários -------------------------- */
describe("os dois lados são avaliados de forma independente", () => {
  it("A jogou e B jogou → nenhuma Mosca", () => {
    const servo = mk("servo-mel", { lane: 1 });
    const s = mkState([servo], [[0, 1, 0], [0, 1, 0]]);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(0);
    expect(moscasDe(s, 1)).toHaveLength(0);
  });

  it("A jogou e B não → 1 Mosca só para B", () => {
    const servo = mk("servo-mel", { lane: 1 });
    const s = mkState([servo], [[0, 1, 0], [0, 0, 0]]);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(0);
    expect(moscasDe(s, 1)).toHaveLength(1);
  });

  it("B jogou e A não → 1 Mosca só para A", () => {
    const servo = mk("servo-mel", { lane: 1 });
    const s = mkState([servo], [[0, 0, 0], [0, 1, 0]]);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(1);
    expect(moscasDe(s, 1)).toHaveLength(0);
  });

  it("ninguém jogou → 1 Mosca para cada lado", () => {
    const servo = mk("servo-mel", { lane: 1 });
    const s = mkState([servo]);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(1);
    expect(moscasDe(s, 1)).toHaveLength(1);
  });
});

/* ------------------------------ a via observada ------------------------ */
describe("o Servo observa apenas a via em que está", () => {
  it("jogada em OUTRA via não salva o lado", () => {
    const servo = mk("servo-mel", { lane: 0 });
    // A jogou na Via 3, mas não na Via 1, onde o Servo está.
    const s = mkState([servo], [[0, 0, 1], [1, 0, 0]]);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(1);
    expect(moscasDe(s, 1)).toHaveLength(0);
  });
});

/* --------------- o que NÃO conta como "jogar na via" ------------------- */
describe("estar na via não é o mesmo que ter jogado na via", () => {
  it("uma ficha invocada na via não salva o lado", () => {
    const servo = mk("servo-mel", { lane: 0 });
    const s = mkState([servo]);
    // Ficha aparece na via dos dois lados, mas ninguém a jogou.
    invocarFicha(s, { key: "token-ganso", owner: 0, lane: 0 });
    invocarFicha(s, { key: "token-ganso", owner: 1, lane: 0 });
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(1);
    expect(moscasDe(s, 1)).toHaveLength(1);
  });

  it("uma carta que apenas ESTÁ na via não salva o lado", () => {
    const servo = mk("servo-mel", { lane: 0 });
    // Cartas de rodadas anteriores, ou movidas para cá: presentes, não jogadas.
    const s = mkState([servo, mk("colosso", { owner: 0, lane: 0 }), mk("colosso", { owner: 1, lane: 0 })]);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(1);
    expect(moscasDe(s, 1)).toHaveLength(1);
  });
});

/* ------------------------------ falta de espaço ------------------------ */
describe("falta de espaço é avaliada por lado", () => {
  it("campo de A cheio e B disponível → só B recebe", () => {
    const servo = mk("servo-mel", { lane: 0 });
    const board = [servo];
    encher(board, 0);
    const s = mkState(board);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(0);
    expect(moscasDe(s, 1)).toHaveLength(1);
  });

  it("campo de B cheio e A disponível → só A recebe", () => {
    const servo = mk("servo-mel", { lane: 0 });
    const board = [servo];
    encher(board, 1);
    const s = mkState(board);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(1);
    expect(moscasDe(s, 1)).toHaveLength(0);
  });

  it("ambos cheios → nenhuma Mosca", () => {
    const servo = mk("servo-mel", { lane: 0 });
    const board = [servo];
    encher(board, 0); encher(board, 1);
    const s = mkState(board);
    const badge = resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(0);
    expect(moscasDe(s, 1)).toHaveLength(0);
    expect(badge.kind).toBe("block");
  });
});

/* ------------------------- onde a Mosca aparece ------------------------ */
describe("a Mosca nasce em via aleatória do lado punido", () => {
  it("não precisa ser a via do Servo", () => {
    const servo = mk("servo-mel", { lane: 0 });
    const s = mkState([servo]);
    // rng no fim da faixa: escolhe a última via com espaço (Via 3).
    resolveServoDoMel(s, servo, DEF, () => 0.99);
    expect(moscasDe(s, 0)[0].lane).toBe(2);
  });

  it("cada Mosca sorteia a própria via, dentro do campo do seu dono", () => {
    const servo = mk("servo-mel", { lane: 1 });
    const board = [servo];
    // O lado A só tem espaço na Via 3; B só na Via 1.
    for (const lane of [0, 1]) for (let i = 0; i < LANE_CAP; i++) board.push(mk("servo", { owner: 0, lane }));
    for (const lane of [1, 2]) for (let i = 0; i < LANE_CAP; i++) board.push(mk("servo", { owner: 1, lane }));
    const s = mkState(board);
    resolveServoDoMel(s, servo, DEF, primeiro);
    expect(moscasDe(s, 0)[0].lane).toBe(2);
    expect(moscasDe(s, 1)[0].lane).toBe(0);
  });
});

/* ---------------------------- múltiplos Servos ------------------------- */
describe("cada Servo resolve independentemente", () => {
  it("dois Servos em vias diferentes fazem duas verificações separadas", () => {
    const s1 = mk("servo-mel", { lane: 0 });
    const s2 = mk("servo-mel", { lane: 2 });
    // A jogou na Via 1 (salva do s1) mas não na Via 3. B não jogou em nenhuma.
    const s = mkState([s1, s2], [[1, 0, 0], [0, 0, 0]]);
    resolveServoDoMel(s, s1, DEF, primeiro);
    resolveServoDoMel(s, s2, DEF, primeiro);
    expect(moscasDe(s, 0)).toHaveLength(1);   // só o s2 puniu A
    expect(moscasDe(s, 1)).toHaveLength(2);   // os dois puniram B
  });
});

/* A fase fotografa suas fontes ANTES de resolver qualquer uma. Sem isso, a
   Mosca que o Servo acabou de criar já sairia comendo Poder na mesma virada —
   dois efeitos pelo preço de um, e uma ordem de resolução que dependeria da
   posição no array. */
describe("integração: o Servo não age na rodada em que entra, e a Mosca criada não age na mesma rodada em que nasce", () => {
  it("rodada de entrada do Servo: nenhuma Mosca nasce", () => {
    const lista = ["servo-mel", "arqueiro", "lanceiro", "carruagem", "guardareal", "general",
                   "colosso", "hathor", "heka", "amon", "sobek", "osiris"];
    const meio = { rng: () => 0.5 };
    let g = freshMatch([lista, lista], meio);
    g.board.push({
      uid: nextUid(g), key: "servo-mel", owner: 0, lane: 0, revealed: true, dying: false,
      printed: 1, baked: 0, mods: [], entryPlays: 0, enteredRound: 1, moved: false,
    });
    g = applyAction(g, { t: "startReveal" }, meio).state;
    g = autoReveal(g, meio).state;
    g = applyAction(g, { t: "nextRound" }, meio).state;

    // Rodada 1 é a rodada de entrada do Servo: ele ainda não é fonte válida
    // para Fim de Rodada, então nenhuma Mosca nasce, mesmo com a Via 1 parada.
    expect(g.board.filter((c) => c.key === "token-mosca")).toHaveLength(0);
  });

  it("a partir da rodada seguinte, ninguém jogou → uma Mosca por lado, limpa; só age na rodada depois", () => {
    const lista = ["servo-mel", "arqueiro", "lanceiro", "carruagem", "guardareal", "general",
                   "colosso", "hathor", "heka", "amon", "sobek", "osiris"];
    const meio = { rng: () => 0.5 };
    let g = freshMatch([lista, lista], meio);
    g.board.push({
      uid: nextUid(g), key: "servo-mel", owner: 0, lane: 0, revealed: true, dying: false,
      printed: 1, baked: 0, mods: [], entryPlays: 0, enteredRound: 1, moved: false,
    });
    // Rodada 1 (entrada): não conta, como provado no teste acima.
    g = applyAction(g, { t: "startReveal" }, meio).state;
    g = autoReveal(g, meio).state;
    g = applyAction(g, { t: "nextRound" }, meio).state;

    // Rodada 2: primeira rodada em que o Servo é fonte válida. Ninguém joga
    // na Via 1 → uma Mosca para cada lado.
    g = applyAction(g, { t: "startReveal" }, meio).state;
    g = autoReveal(g, meio).state;
    g = applyAction(g, { t: "nextRound" }, meio).state;

    const moscas = g.board.filter((c) => c.key === "token-mosca");
    expect(moscas).toHaveLength(2);
    // E nenhuma delas aplicou o próprio -1 ainda — nasceram nesta mesma virada.
    expect(moscas.every((m) => m.mods.length === 0)).toBe(true);
    expect(g.board.find((c) => c.key === "servo-mel").mods).toHaveLength(0);

    // Na virada seguinte (rodada 3) elas agem.
    g = applyAction(g, { t: "startReveal" }, meio).state;
    g = autoReveal(g, meio).state;
    g = applyAction(g, { t: "nextRound" }, meio).state;
    const modsAplicados = g.board.reduce((t, c) => t + c.mods.filter((m) => m.val < 0).length, 0);
    expect(modsAplicados).toBe(2);
  });
});

describe("a definição da carta", () => {
  it("é 1/1 e declara o efeito de Fim de Rodada", () => {
    expect(DEF.custo).toBe(1);
    expect(DEF.poder).toBe(1);
    expect(DEF.trigger).toBe("fim");
    expect(DEF.efeitos).toEqual([{ id: "endRoundSummonPerIdleSide", token: "token-mosca" }]);
  });

  it("não colide com o Servo do Templo na miniatura", () => {
    expect(DEF.nomeCurto).not.toBe(byKey.servo.nomeCurto);
  });
});
