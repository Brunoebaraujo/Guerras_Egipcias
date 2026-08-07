import { describe, it, expect, beforeEach } from "vitest";
import { byKey, resetUid, nextUid, power, ctxOf, efeitoDe } from "./engine.js";
import { freshMatch, applyAction, autoReveal, isAimable, START_HAND } from "./match.js";

beforeEach(resetUid);

/* rng determinístico (mulberry32) para partidas reproduzíveis nos testes */
const seeded = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* Estado controlado (bypassa o embaralhamento) — mesma filosofia do engine.test */
const mkMatch = (over = {}) => ({
  round: 1, energy: [6, 6], board: [], deaths: [0, 0], plays: [0, 0],
  pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
  deck: [[], []], hand: [[], []], seen: [0, 0],
  priority: 0, priorityReason: "teste", phase: "plan", queue: [],
  lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null,
  log: [], trace: [], finished: false, ...over,
});
const inHand = (key) => ({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0 });
const onBoard = (key, o = {}) => ({
  uid: nextUid(), key, owner: 0, lane: 0, printed: byKey[key].poder, baked: 0,
  mods: [], revealed: true, dying: false, pendentes: 0, entryPlays: 0, enteredRound: 0, moved: false, ...o,
});

/* --------------------------- estado inicial ------------------------------ */
describe("freshMatch", () => {
  it("abre com 3 e compra a 4ª na rodada 1 (justDrew marcado)", () => {
    const lista = Array(12).fill("servo");
    const s = freshMatch([lista, lista], { rng: seeded(1) });
    expect(s.hand[0]).toHaveLength(4);      // 3 de abertura + 1 comprada
    expect(s.hand[1]).toHaveLength(4);
    expect(s.deck[0]).toHaveLength(12 - 4); // 8 no deck
    expect(s.justDrew[0]).toHaveLength(1);  // a 4ª carta, marcada para animar
    expect(s.justDrew[1]).toHaveLength(1);
    // o hid marcado corresponde à última carta da mão
    expect(s.justDrew[0][0]).toBe(s.hand[0][3].hid);
    expect(s.energy).toEqual([1, 1]);
    expect(s.phase).toBe("plan");
    expect(s.round).toBe(1);
    expect([0, 1]).toContain(s.priority);
  });

  it("é reproduzível com o mesmo rng semeado", () => {
    const lista = ["servo", "arqueiro", "lanceiro", "hathor", "montu", "carruagem", "guardareal", "sobek", "mumia", "set", "selo", "ammit"];
    resetUid();
    const a = freshMatch([lista, lista], { rng: seeded(42) });
    resetUid();
    const b = freshMatch([lista, lista], { rng: seeded(42) });
    expect(a.hand[0].map((h) => h.key)).toEqual(b.hand[0].map((h) => h.key));
    expect(a.priority).toBe(b.priority);
  });
});

/* ------------------------------ planejar --------------------------------- */
describe("place", () => {
  it("posiciona a carta, gasta energia e a tira da mão", () => {
    const h = inHand("arqueiro");
    const g = mkMatch({ energy: [3, 6], hand: [[h], []] });
    const { state, error } = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 1 });
    expect(error).toBeUndefined();
    expect(state.board).toHaveLength(1);
    expect(state.board[0]).toMatchObject({ key: "arqueiro", owner: 0, lane: 1, revealed: false });
    expect(state.energy[0]).toBe(3 - byKey.arqueiro.custo);
    expect(state.hand[0]).toHaveLength(0);
  });

  it("recusa sem energia e não altera o estado", () => {
    const h = inHand("colosso"); // custo 6
    const g = mkMatch({ energy: [1, 6], hand: [[h], []] });
    const r = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 0 });
    expect(r.error).toMatch(/energia/i);
    expect(r.state).toBe(g); // referencialmente intacto
  });

  it("recusa via cheia (4/4)", () => {
    const h = inHand("servo");
    const cheia = [0, 1, 2, 3].map(() => onBoard("servo", { lane: 2, revealed: false }));
    const g = mkMatch({ hand: [[h], []], board: cheia });
    const r = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 2 });
    expect(r.error).toMatch(/cheia/i);
  });
});

describe("pickup", () => {
  it("recolhe carta não revelada e devolve a energia", () => {
    const h = inHand("carruagem"); // custo 3
    let g = mkMatch({ energy: [6, 6], hand: [[h], []] });
    g = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 0 }).state;
    const uid = g.board[0].uid;
    const r = applyAction(g, { t: "pickup", side: 0, uid });
    expect(r.error).toBeUndefined();
    expect(r.state.board).toHaveLength(0);
    expect(r.state.hand[0]).toHaveLength(1);
    expect(r.state.energy[0]).toBe(6);
  });

  it("recusa recolher carta já revelada", () => {
    const c = onBoard("carruagem", { revealed: true });
    const g = mkMatch({ board: [c] });
    const r = applyAction(g, { t: "pickup", side: 0, uid: c.uid });
    expect(r.error).toMatch(/revelada/i);
  });
});

/* ------------------------------- revelar --------------------------------- */
describe("revelação", () => {
  it("startReveal monta a fila e autoReveal esvazia até 'revealed'", () => {
    const c = onBoard("arqueiro", { revealed: false });
    let g = mkMatch({ board: [c] });
    g = applyAction(g, { t: "startReveal" }).state;
    expect(g.phase).toBe("revealing");
    expect(g.queue).toContain(c.uid);
    const { state, awaiting } = autoReveal(g, { rng: seeded(7) });
    expect(awaiting).toBe(false);
    expect(state.phase).toBe("revealed");
    expect(state.board[0].revealed).toBe(true);
  });

  it("nada a revelar → pula direto para 'revealed'", () => {
    const g = applyAction(mkMatch(), { t: "startReveal" }).state;
    expect(g.phase).toBe("revealed");
  });

  it("Hathor buffeia aleatoriamente um aliado na via", () => {
    const aliado = onBoard("servo", { lane: 0, owner: 0, revealed: true });
    const hathor = onBoard("hathor", { lane: 0, owner: 0, revealed: false });
    let g = mkMatch({ board: [aliado, hathor] });
    g = applyAction(g, { t: "startReveal" }).state;
    const rev = autoReveal(g, { rng: seeded(3) });
    expect(rev.awaiting).toBe(false);  // sem mira pendente
    g = rev.state;
    expect(g.awaitingAim).toBeNull();
    const alvo = g.board.find((c) => c.uid === aliado.uid);
    expect(power(alvo, ctxOf(g))).toBe(byKey.servo.poder + efeitoDe(byKey.hathor, "buffRandomAlly").value);
  });

  it("Hathor sem aliados na via não aplica buff", () => {
    const hathor = onBoard("hathor", { lane: 0, owner: 0, revealed: false });
    let g = mkMatch({ board: [hathor] });
    g = applyAction(g, { t: "startReveal" }).state;
    const rev = autoReveal(g, { rng: seeded(5) });
    expect(rev.awaiting).toBe(false);
    g = rev.state;
    expect(g.awaitingAim).toBeNull();
    // Hathor não tem aliados, então o efeito é bloqueado (sem alvo)
    // Isso se reflete no log
    const logs = g.log.filter((l) => l.includes("Hathor"));
    expect(logs.some((l) => l.includes("sem alvo") || l.includes("efeito perdido"))).toBe(true);
  });
});

/* ------------------------------- rodadas --------------------------------- */
describe("rodadas e vitória", () => {
  it("nextRound faz o ramp de energia e compra 1", () => {
    const g = mkMatch({ phase: "revealed", round: 1, deck: [["colosso"], ["general"]] });
    const r = applyAction(g, { t: "nextRound" }, { rng: seeded(9) });
    expect(r.error).toBeUndefined();
    expect(r.state.round).toBe(2);
    expect(r.state.energy).toEqual([2, 2]);
    expect(r.state.hand[0].map((h) => h.key)).toContain("colosso");
    expect(r.state.justDrew[0]).toHaveLength(1); // compra da rodada, para animar
    expect(r.state.phase).toBe("plan");
  });

  it("nextRound é recusado fora da fase 'revealed'", () => {
    expect(applyAction(mkMatch({ phase: "plan" }), { t: "nextRound" }).error).toMatch(/revele/i);
  });

  it("na rodada 6, nextRound finaliza e apura o vencedor", () => {
    // Lado 0 domina vias 0 e 1; lado 1 não pontua em lugar nenhum.
    const board = [
      onBoard("colosso", { lane: 0, owner: 0 }),
      onBoard("colosso", { lane: 1, owner: 0 }),
    ];
    const g = mkMatch({ phase: "revealed", round: 6, board });
    const r = applyAction(g, { t: "nextRound" });
    expect(r.state.finished).toBe(true);
    expect(r.state.log[r.state.log.length - 1]).toMatch(/Lado A vence/);
  });
});

/* --------------------- robustez do contrato do servidor ------------------ */
describe("contrato de ações", () => {
  it("ação desconhecida devolve erro sem estourar", () => {
    const g = mkMatch();
    const r = applyAction(g, { t: "voar" });
    expect(r.error).toMatch(/desconhecida/i);
    expect(r.state).toBe(g);
  });

  it("uma partida semeada roda 6 rodadas sem travar", () => {
    const lista = Array(12).fill("arqueiro");
    let g = freshMatch([lista, lista], { rng: seeded(123) });
    for (let round = 1; round <= 6; round++) {
      // cada lado posiciona uma carta na via 0, se puder pagar
      for (const side of [0, 1]) {
        const h = g.hand[side][0];
        if (h && byKey[h.key].custo <= g.energy[side]) {
          const r = applyAction(g, { t: "place", side, hid: h.hid, lane: 0 });
          if (!r.error) g = r.state;
        }
      }
      g = applyAction(g, { t: "startReveal" }).state;
      g = autoReveal(g, { rng: seeded(round) }).state;
      expect(g.phase).toBe("revealed");
      g = applyAction(g, { t: "nextRound" }).state;
    }
    expect(g.finished).toBe(true);
  });
});

/* ==========================================================================
   resetPlan — refazer a ordem de jogadas da rodada.
   A ordem importa: o reveal acontece em ordem de colocação.
   ========================================================================== */
describe("resetPlan", () => {
  const naMao = (key) => ({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0 });

  it("devolve à mão tudo que foi posicionado nesta rodada, com a energia", () => {
    const a = naMao("servo"), b = naMao("arqueiro");
    let g = mkMatch({ hand: [[a, b], []], energy: [9, 9] });
    g = applyAction(g, { t: "place", side: 0, hid: a.hid, lane: 0 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: b.hid, lane: 1 }).state;
    const gasto = 9 - g.energy[0];
    expect(gasto).toBeGreaterThan(0);
    g = applyAction(g, { t: "resetPlan", side: 0 }).state;
    expect(g.board).toHaveLength(0);
    expect(g.hand[0]).toHaveLength(2);
    expect(g.energy[0]).toBe(9);
    expect(g.plays[0]).toBe(0);
    expect(g.log.some((l) => l.includes("reiniciou a rodada"))).toBe(true);
  });

  it("não mexe nas cartas do adversário", () => {
    const a = naMao("servo"), b = naMao("servo");
    let g = mkMatch({ hand: [[a], [b]], energy: [9, 9] });
    g = applyAction(g, { t: "place", side: 0, hid: a.hid, lane: 0 }).state;
    g = applyAction(g, { t: "place", side: 1, hid: b.hid, lane: 0 }).state;
    g = applyAction(g, { t: "resetPlan", side: 0 }).state;
    expect(g.board).toHaveLength(1);
    expect(g.board[0].owner).toBe(1);
    expect(g.hand[1]).toHaveLength(0);
  });

  it("não devolve carta já revelada de rodadas anteriores", () => {
    const a = naMao("servo");
    let g = mkMatch({
      board: [{ uid: 999, key: "servo", owner: 0, lane: 2, revealed: true, dying: false,
                printed: 1, baked: 0, mods: [], entryPlays: 0, enteredRound: 1, moved: false }],
      hand: [[a], []], round: 2, energy: [9, 9],
    });
    g = applyAction(g, { t: "place", side: 0, hid: a.hid, lane: 0 }).state;
    g = applyAction(g, { t: "resetPlan", side: 0 }).state;
    expect(g.board).toHaveLength(1);
    expect(g.board[0].revealed).toBe(true);
    expect(g.hand[0]).toHaveLength(1);
  });

  it("carta atrasada pelas Trevas fica onde está — não é deste planejamento", () => {
    let g = mkMatch({
      board: [{ uid: 998, key: "servo", owner: 0, lane: 0, revealed: false, dying: false,
                printed: 1, baked: 0, mods: [], entryPlays: 0, enteredRound: 1, moved: false }],
      hand: [[], []], round: 2, energy: [9, 9],
    });
    const { error } = applyAction(g, { t: "resetPlan", side: 0 });
    expect(error).toBeTruthy();
    expect(g.board).toHaveLength(1);
  });

  it("recusa quando não há nada posicionado nesta rodada", () => {
    const g = mkMatch({ hand: [[naMao("servo")], []] });
    const { error } = applyAction(g, { t: "resetPlan", side: 0 });
    expect(error).toBeTruthy();
  });

  it("depois do reset dá para reposicionar em outra ordem", () => {
    const a = naMao("servo"), b = naMao("arqueiro");
    let g = mkMatch({ hand: [[a, b], []], energy: [9, 9] });
    g = applyAction(g, { t: "place", side: 0, hid: a.hid, lane: 0 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: b.hid, lane: 0 }).state;
    expect(g.board.map((c) => c.key)).toEqual(["servo", "arqueiro"]);
    g = applyAction(g, { t: "resetPlan", side: 0 }).state;
    const [n1, n2] = g.hand[0];
    g = applyAction(g, { t: "place", side: 0, hid: n2.hid, lane: 0 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: n1.hid, lane: 0 }).state;
    expect(g.board.map((c) => c.key)).toEqual(["arqueiro", "servo"]);
  });
});
