import { describe, it, expect, beforeEach } from "vitest";
import { byKey, resetUid, nextUid, power, ctxOf } from "./engine.js";
import { resolveEffectPhase } from "./domain/effects/index.js"; // garante o registro de Íbis
import { validarColecao } from "./domain/cards/schema.js";
import { applyAction } from "./match.js";

const seeded = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const mkMatch = (over = {}) => ({
  round: 1, energy: [6, 6], board: [], deaths: [0, 0], plays: [0, 0],
  pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
  deck: [[], []], hand: [[], []], seen: [0, 0],
  priority: 0, priorityReason: "teste", phase: "plan", queue: [],
  lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null,
  log: [], trace: [], finished: false, ...over,
});
const onBoard = (key, o = {}) => ({
  uid: nextUid(), key, owner: 0, lane: 0, printed: byKey[key].poder, baked: 0,
  mods: [], revealed: true, dying: false, pendentes: 0, entryPlays: 0, enteredRound: 0, moved: false, ...o,
});

beforeEach(resetUid);

describe("Íbis Sagrado", () => {
  it("está registrado corretamente na coleção (1/3, Animal, movimento)", () => {
    const def = byKey["ibis"];
    expect(def).toBeTruthy();
    expect(def.custo).toBe(1);
    expect(def.poder).toBe(3);
    expect(def.tipo).toBe("Animal");
    expect(def.arch).toBe("movimento");
  });

  it("a coleção continua válida com Íbis registrado", () => {
    expect(validarColecao()).toEqual([]);
  });

  it("Ao Entrar devolve o único aliado da via para a mão do dono", () => {
    const servo = onBoard("servo", { owner: 0, lane: 0 });
    const ibis = onBoard("ibis", { owner: 0, lane: 0 });
    const s = mkMatch({ board: [servo, ibis], hand: [[], []] });
    resolveEffectPhase({ state: s, source: ibis, definition: byKey["ibis"], phase: "enter", rng: seeded(1) });
    expect(s.board.some((c) => c.key === "servo")).toBe(false);
    expect(s.hand[0]).toHaveLength(1);
    expect(s.hand[0][0].key).toBe("servo");
  });

  it("sem efeito se não há aliado na via (só ela mesma)", () => {
    const ibis = onBoard("ibis", { owner: 0, lane: 0 });
    const s = mkMatch({ board: [ibis], hand: [[], []] });
    const badge = resolveEffectPhase({ state: s, source: ibis, definition: byKey["ibis"], phase: "enter", rng: seeded(1) });
    expect(badge.text).toBe("sem alvo");
    expect(s.board).toHaveLength(1);
  });

  it("NÃO devolve carta inimiga nem carta de outra via", () => {
    const inimigo = onBoard("servo", { owner: 1, lane: 0 });
    const outraVia = onBoard("servo", { owner: 0, lane: 1 });
    const ibis = onBoard("ibis", { owner: 0, lane: 0 });
    const s = mkMatch({ board: [inimigo, outraVia, ibis], hand: [[], []] });
    const badge = resolveEffectPhase({ state: s, source: ibis, definition: byKey["ibis"], phase: "enter", rng: seeded(1) });
    expect(badge.text).toBe("sem alvo");
    expect(s.board).toHaveLength(3); // ninguém saiu
  });

  it("com mão cheia, cancela o efeito e a carta-alvo continua na via", () => {
    const servo = onBoard("servo", { owner: 0, lane: 0 });
    const ibis = onBoard("ibis", { owner: 0, lane: 0 });
    const maoCheia = Array(7).fill(0).map((_, i) => ({ hid: i, key: "servo", printed: 1, baked: 0, custoMod: 0, venenos: [] }));
    const s = mkMatch({ board: [servo, ibis], hand: [maoCheia, []] });
    const badge = resolveEffectPhase({ state: s, source: ibis, definition: byKey["ibis"], phase: "enter", rng: seeded(1) });
    expect(badge.text).toBe("✋ mão cheia");
    expect(s.board.some((c) => c.uid === servo.uid)).toBe(true); // não saiu do tabuleiro
    expect(s.hand[0]).toHaveLength(7); // mão não cresceu
  });

  it("devolve a carta SEM as bênçãos permanentes que ela tinha acumulado", () => {
    const abencoada = onBoard("servo", { owner: 0, lane: 0, mods: [{ src: "Hathor", val: 3 }] });
    const ibis = onBoard("ibis", { owner: 0, lane: 0 });
    const s = mkMatch({ board: [abencoada, ibis], hand: [[], []] });
    resolveEffectPhase({ state: s, source: ibis, definition: byKey["ibis"], phase: "enter", rng: seeded(1) });
    expect(s.hand[0][0]).not.toHaveProperty("mods");
  });

  it("NÃO reembolsa energia — a carta devolvida precisa ser paga de novo", () => {
    const servo = onBoard("servo", { owner: 0, lane: 0 });
    const ibis = onBoard("ibis", { owner: 0, lane: 0 });
    const s = mkMatch({ board: [servo, ibis], hand: [[], []], energy: [4, 4] });
    resolveEffectPhase({ state: s, source: ibis, definition: byKey["ibis"], phase: "enter", rng: seeded(1) });
    expect(s.energy[0]).toBe(4); // intocado
  });

  /* ================ O CENÁRIO CENTRAL DO PEDIDO DE BRUNO =================
     Uma carta com "Ao Entrar" (Hathor) já resolveu seu efeito uma vez.
     Íbis a devolve para a mão. Replantada e revelada de novo, o "Ao Entrar"
     dela tem que disparar OUTRA VEZ — não existe, em lugar nenhum do motor,
     uma flag de "já usei" que bloqueie isso (ver nota em cards/ibis.js). */
  it("recicla o 'Ao Entrar' de uma carta já usada: Hathor buffa o Servo DUAS vezes", () => {
    const servo = onBoard("servo", { owner: 0, lane: 0 });
    const hathor = onBoard("hathor", { owner: 0, lane: 0 });
    const s = mkMatch({ board: [servo, hathor], hand: [[], []] });

    // 1ª vez: Hathor revela e buffa o único aliado da via (Servo).
    resolveEffectPhase({ state: s, source: hathor, definition: byKey["hathor"], phase: "enter", rng: seeded(1) });
    expect(power(servo, ctxOf(s))).toBe(byKey["servo"].poder + 3);

    // Íbis entra na mesma via e devolve a Hathor (já usada) para a mão —
    // pool de alvos = [servo, hathor] (ordem do board, Íbis exclui a si
    // mesma); rng=0.6 força floor(0.6*2)=1, o segundo candidato (Hathor).
    const ibis = onBoard("ibis", { owner: 0, lane: 0 });
    s.board.push(ibis);
    resolveEffectPhase({ state: s, source: ibis, definition: byKey["ibis"], phase: "enter", rng: () => 0.6 });
    expect(s.board.some((c) => c.key === "hathor")).toBe(false);
    expect(s.hand[0][0].key).toBe("hathor");

    // Replanta a Hathor devolvida (nova instância, sem mods) na mesma via.
    const hathor2 = onBoard("hathor", { owner: 0, lane: 0 });
    s.board.push(hathor2);
    resolveEffectPhase({ state: s, source: hathor2, definition: byKey["hathor"], phase: "enter", rng: () => 0.1 }); // pool = [servo, ibis]; 0.1 força índice 0 (servo)

    // O "Ao Entrar" da Hathor rodou de novo: o Servo foi buffado DUAS vezes.
    expect(power(servo, ctxOf(s))).toBe(byKey["servo"].poder + 3 + 3);
  });

  /* Mesmo cenário, mas de ponta a ponta pelo pipeline real do match
     (place → startReveal → step), para cobrir o timing de verdade da
     revelação — e não só a chamada isolada do resolver. */
  it("de ponta a ponta: place → reveal → Íbis devolve a Hathor já usada → replantar dispara Ao Entrar de novo", () => {
    let g = mkMatch({
      round: 1, energy: [6, 6],
      hand: [[
        { hid: 1, key: "servo", printed: byKey["servo"].poder, baked: 0, custoMod: 0, venenos: [] },
        { hid: 2, key: "hathor", printed: byKey["hathor"].poder, baked: 0, custoMod: 0, venenos: [] },
      ], []],
    });
    g = applyAction(g, { t: "place", side: 0, hid: 1, lane: 0 }).state; // Servo
    g = applyAction(g, { t: "place", side: 0, hid: 2, lane: 0 }).state; // Hathor
    g = applyAction(g, { t: "startReveal" }).state;
    g = applyAction(g, { t: "step" }, { rng: seeded(1) }).state; // revela Servo
    g = applyAction(g, { t: "step" }, { rng: seeded(2) }).state; // revela Hathor: buffa o Servo +3

    const servoNoTabuleiro = g.board.find((c) => c.key === "servo");
    expect(power(servoNoTabuleiro, ctxOf(g))).toBe(byKey["servo"].poder + 3);

    // Nova rodada: joga o Íbis na mesma via.
    g = { ...g, phase: "plan", round: 2, hand: [[
      { hid: 3, key: "ibis", printed: byKey["ibis"].poder, baked: 0, custoMod: 0, venenos: [] },
    ], []] };
    g = applyAction(g, { t: "place", side: 0, hid: 3, lane: 0 }).state;
    g = applyAction(g, { t: "startReveal" }).state;
    g = applyAction(g, { t: "step" }, { rng: () => 0.6 }).state; // Íbis: sorteio pega Hathor (índice 1)

    expect(g.board.some((c) => c.key === "hathor")).toBe(false);
    const maoComHathor = g.hand[0].find((h) => h.key === "hathor");
    expect(maoComHathor).toBeTruthy();

    // Terceira rodada: replanta a Hathor devolvida.
    g = { ...g, phase: "plan", round: 3, hand: [[{ ...maoComHathor }], []] };
    g = applyAction(g, { t: "place", side: 0, hid: maoComHathor.hid, lane: 0 }).state;
    g = applyAction(g, { t: "startReveal" }).state;
    g = applyAction(g, { t: "step" }, { rng: () => 0.1 }).state; // Hathor revela de novo; pool=[servo, ibis], 0.1 força servo

    const servoFinal = g.board.find((c) => c.key === "servo");
    expect(power(servoFinal, ctxOf(g))).toBe(byKey["servo"].poder + 3 + 3); // buffada DUAS vezes
  });
});
