import { describe, it, expect, beforeEach } from "vitest";
import {
  CARDS, PRAGAS, PRAGA_KEYS, TOKENS, OUTORGAS, byKey,
  power, ctxOf, registrarPraga, aplicarBencao, resetUid, nextUid,
} from "./engine.js";
import { freshMatch, applyAction, expandirDeck, autoReveal } from "./match.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], round: 1, energy: [6, 6],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0],
});
const mkMatch = (over = {}) => ({
  round: 1, energy: [9, 9], board: [], deaths: [0, 0], plays: [0, 0],
  pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
  deck: [[], []], hand: [[], []], seen: [0, 0],
  priority: 0, priorityReason: "teste", phase: "plan", queue: [],
  lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null,
  log: [], trace: [], finished: false, ...over,
});
const naMao = (key) => ({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0 });
const doze = (extra = []) => [...extra, ...CARDS.filter((c) => c.key !== "moises").map((c) => c.key)].slice(0, 12);

beforeEach(resetUid);

/* ==========================================================================
   As Pragas são outorgadas, não escolhidas.
   ========================================================================== */
describe("Pragas fora da coleção escolhível", () => {
  it("nenhuma Praga aparece em CARDS — o deckbuilder não as oferece", () => {
    const keys = CARDS.map((c) => c.key);
    for (const k of PRAGA_KEYS) expect(keys).not.toContain(k);
  });

  it("Moisés está em CARDS — ele é a única carta escolhível do set", () => {
    expect(CARDS.map((c) => c.key)).toContain("moises");
  });

  it("todas as Pragas estão em byKey, com custo e texto", () => {
    for (const k of PRAGA_KEYS) {
      expect(byKey[k]).toBeDefined();
      expect(byKey[k].praga).toBe(true);
      expect(typeof byKey[k].custo).toBe("number");
      expect(byKey[k].texto.length).toBeGreaterThan(10);
    }
  });

  it("são dez, e nenhuma chave colide com a coleção ou com os tokens", () => {
    expect(PRAGAS).toHaveLength(10);
    const outras = [...CARDS, ...TOKENS].map((c) => c.key);
    for (const k of PRAGA_KEYS) expect(outras).not.toContain(k);
  });

  it("Moisés é tipo Profeta — o Assassino Medjay caça Divindades, não ele", () => {
    expect(byKey.moises.tipo).toBe("Profeta");
    expect(byKey["assassino-medjay"].destroyAllOfTypeInLane).toBe("Divindade");
  });

  it("a soma dos custos das Pragas (26) excede a energia da partida (21)", () => {
    const soma = PRAGAS.reduce((t, p) => t + p.custo, 0);
    expect(soma).toBe(26);
  });
});

describe("expandirDeck()", () => {
  it("deck sem Moisés fica intacto", () => {
    const d = ["servo", "arqueiro"];
    expect(expandirDeck(d)).toEqual(d);
  });

  it("deck com Moisés ganha as 10 Pragas — 12 escolhidas viram 22", () => {
    const d = doze(["moises"]);
    expect(d).toHaveLength(12);
    const exp = expandirDeck(d);
    expect(exp).toHaveLength(22);
    for (const k of PRAGA_KEYS) expect(exp).toContain(k);
  });

  it("não muta a lista original", () => {
    const d = doze(["moises"]);
    expandirDeck(d);
    expect(d).toHaveLength(12);
  });

  it("OUTORGAS.pragas é exatamente o conjunto das dez chaves", () => {
    expect(OUTORGAS.pragas).toEqual(PRAGA_KEYS);
  });

  it("ignora chave desconhecida sem explodir", () => {
    expect(() => expandirDeck(["nao-existe", "servo"])).not.toThrow();
  });
});

describe("mão de abertura", () => {
  const lista = doze(["moises"]);

  it("Moisés sempre cai na mão de abertura, com 3 aleatórias ao lado", () => {
    for (let i = 0; i < 30; i++) {
      const s = freshMatch([lista, lista]);
      expect(s.hand[0]).toHaveLength(4);
      expect(s.hand[0].map((h) => h.key)).toContain("moises");
    }
  });

  it("Moisés não vem duas vezes", () => {
    const s = freshMatch([lista, lista]);
    expect(s.hand[0].filter((h) => h.key === "moises")).toHaveLength(1);
  });

  it("o deck de quem escolheu Moisés começa com 22 - 4 = 18 cartas", () => {
    const s = freshMatch([lista, lista]);
    expect(s.deck[0]).toHaveLength(18);
  });

  it("deck sem Moisés continua com 12 - 4 = 8 e mão sem outorga", () => {
    const semMoises = doze();
    const s = freshMatch([semMoises, semMoises]);
    expect(s.deck[0]).toHaveLength(8);
    expect(s.hand[0].map((h) => h.key)).not.toContain("moises");
  });

  it("registra a outorga no log da partida", () => {
    const s = freshMatch([lista, doze()]);
    expect(s.trace.join("\n")).toMatch(/outorgada/);
  });
});

/* ==========================================================================
   Os Sinais: 1ª Praga dá +1, cada diferente seguinte DOBRA.
   ========================================================================== */
describe("registrarPraga() — a progressão do Moisés", () => {
  it("segue 1, 2, 4, 8, 16, 32 com seis Pragas diferentes", () => {
    const m = mk("moises");
    const s = mkState([m]);
    const esperado = [1, 2, 4, 8, 16, 32];
    PRAGA_KEYS.slice(0, 6).forEach((k, i) => {
      registrarPraga(s, k);
      expect(power(m, ctxOf(s))).toBe(esperado[i]);
    });
  });

  it("Praga repetida resolve mas não gera novo Sinal", () => {
    const m = mk("moises");
    const s = mkState([m]);
    registrarPraga(s, "sangue");
    registrarPraga(s, "sangue");
    registrarPraga(s, "sangue");
    expect(power(m, ctxOf(s))).toBe(1);
    expect(m.pragasVistas).toEqual(["sangue"]);
  });

  it("guarda o registro na carta, para uma ressurreição futura preservá-lo", () => {
    const m = mk("moises");
    const s = mkState([m]);
    registrarPraga(s, "sangue");
    registrarPraga(s, "ras");
    expect(m.pragasVistas).toEqual(["sangue", "ras"]);
  });

  it("Moisés na mão ou no cemitério não recebe Sinal", () => {
    const oculto = mk("moises", { revealed: false });
    const morto = mk("moises", { lane: 1, dying: 3 });
    const s = mkState([oculto, morto]);
    registrarPraga(s, "sangue");
    expect(oculto.pragasVistas).toBeUndefined();
    expect(morto.pragasVistas).toBeUndefined();
  });

  it("buffs externos entram na conta e são dobrados pelas Pragas seguintes", () => {
    const m = mk("moises");
    const s = mkState([m]);
    aplicarBencao(s, m, 3, "Heka");            // Moisés a 3
    registrarPraga(s, "sangue");               // 1º Sinal: +1 → 4
    expect(power(m, ctxOf(s))).toBe(4);
    registrarPraga(s, "ras");                  // dobra → 8
    expect(power(m, ctxOf(s))).toBe(8);
    registrarPraga(s, "piolhos");              // dobra → 16
    expect(power(m, ctxOf(s))).toBe(16);
  });

  it("a aura do Amon entra CONGELADA na parcela — o preço do snapshot", () => {
    const m = mk("moises");
    const amon = mk("amon", { lane: 2 });
    const s = mkState([m, amon]);
    expect(power(m, ctxOf(s))).toBe(1);        // 0 + aura do Amon
    registrarPraga(s, "sangue");               // 1º Sinal: +1 → 2
    registrarPraga(s, "ras");                  // dobra o total (2) → 4
    expect(power(m, ctxOf(s))).toBe(4);
    amon.dying = 9;                            // Amon sai: a aura viva some...
    expect(power(m, ctxOf(s))).toBe(3);        // ...mas a metade congelada fica
  });

  it("Maat na via zera o acúmulo — o Poder volta ao impresso", () => {
    const m = mk("moises");
    const s = mkState([m]);
    PRAGA_KEYS.slice(0, 5).forEach((k) => registrarPraga(s, k));
    expect(power(m, ctxOf(s))).toBe(16);
    s.board.push(mk("maat", { lane: 0 }));
    expect(power(m, ctxOf(s))).toBe(0);
  });

  it("dois Moisés em campo progridem de forma independente", () => {
    const a = mk("moises");
    const b = mk("moises", { lane: 1, mods: [{ src: "Heka", val: 7 }] });
    const s = mkState([a, b]);
    registrarPraga(s, "sangue");
    expect(power(a, ctxOf(s))).toBe(1);
    expect(power(b, ctxOf(s))).toBe(8);
  });

  it("sem Moisés em campo, não devolve Sinal nenhum", () => {
    const s = mkState([mk("servo")]);
    expect(registrarPraga(s, "sangue")).toHaveLength(0);
  });

  it("dobrar Poder negativo piora a carta — debuffar Moisés é resposta legítima", () => {
    const m = mk("moises", { mods: [{ src: "Gafanhotos", val: -4 }] });
    const s = mkState([m]);
    registrarPraga(s, "sangue");               // 1º Sinal: +1 → -3
    expect(power(m, ctxOf(s))).toBe(-3);
    registrarPraga(s, "ras");                  // dobra → -6
    expect(power(m, ctxOf(s))).toBe(-6);
  });
});

/* ==========================================================================
   A Praga no fluxo de revelação: resolve, sai do campo, e só então Moisés ativa.
   ========================================================================== */
describe("Praga na revelação", () => {
  const revelar = (g) => autoReveal(applyAction(g, { t: "startReveal" }).state).state;

  it("a Praga deixa o campo e não conta como morte", () => {
    const h = naMao("sangue");
    let g = mkMatch({ hand: [[h], []] });
    g = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 0 }).state;
    expect(g.board).toHaveLength(1);
    g = revelar(g);
    expect(g.board.filter((c) => !c.dying)).toHaveLength(0);
    expect(g.deaths).toEqual([0, 0]);
  });

  it("Moisés já em campo recebe o Sinal da Praga revelada depois dele", () => {
    const hm = naMao("moises"), hp = naMao("sangue");
    let g = mkMatch({ hand: [[hm, hp], []] });
    g = applyAction(g, { t: "place", side: 0, hid: hm.hid, lane: 0 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: hp.hid, lane: 1 }).state;
    g = revelar(g);
    const m = g.board.find((c) => c.key === "moises");
    expect(m.pragasVistas).toEqual(["sangue"]);
    expect(power(m, ctxOf(g))).toBe(1);
  });

  it("Praga revelada ANTES do Moisés não gera Sinal — a ordem é decisão do jogador", () => {
    const hp = naMao("sangue"), hm = naMao("moises");
    let g = mkMatch({ hand: [[hp, hm], []] });
    g = applyAction(g, { t: "place", side: 0, hid: hp.hid, lane: 1 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: hm.hid, lane: 0 }).state;
    g = revelar(g);
    const m = g.board.find((c) => c.key === "moises");
    expect(m.pragasVistas).toBeUndefined();
    expect(power(m, ctxOf(g))).toBe(0);
  });

  it("o Selo do Silêncio inimigo bloqueia a Praga: gasta sem efeito e sem Sinal", () => {
    const hm = naMao("moises"), hp = naMao("sangue");
    let g = mkMatch({
      hand: [[hm, hp], []],
      board: [mk("selo", { owner: 1, lane: 1, revealed: true })],
    });
    g = applyAction(g, { t: "place", side: 0, hid: hm.hid, lane: 0 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: hp.hid, lane: 1 }).state;
    g = revelar(g);
    const m = g.board.find((c) => c.key === "moises");
    expect(m.pragasVistas).toBeUndefined();
    expect(g.board.filter((c) => c.key === "sangue" && !c.dying)).toHaveLength(0);
  });

  it("a Praga NÃO come a reserva da Heka — o +3 espera o Moisés e depois dobra", () => {
    const hh = naMao("heka"), hp = naMao("sangue"), hm = naMao("moises");
    let g = mkMatch({ hand: [[hh, hp, hm], []] });
    g = applyAction(g, { t: "place", side: 0, hid: hh.hid, lane: 0 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: hp.hid, lane: 1 }).state;
    g = applyAction(g, { t: "place", side: 0, hid: hm.hid, lane: 2 }).state;
    g = revelar(g);
    const m = g.board.find((c) => c.key === "moises");
    expect(power(m, ctxOf(g))).toBe(3);        // recebeu a reserva que a Praga não comeu
    expect(m.pragasVistas).toBeUndefined();    // a Praga resolveu antes dele
  });

  it("a Praga não alimenta Osíris nem Am-heh", () => {
    const hp = naMao("sangue");
    let g = mkMatch({
      hand: [[hp], []],
      board: [mk("osiris", { lane: 2 }), mk("amheh", { lane: 2 })],
    });
    g = applyAction(g, { t: "place", side: 0, hid: hp.hid, lane: 0 }).state;
    g = revelar(g);
    const os = g.board.find((c) => c.key === "osiris");
    const am = g.board.find((c) => c.key === "amheh");
    expect(power(os, ctxOf(g))).toBe(4);
    expect(power(am, ctxOf(g))).toBe(0);
  });

  it("uma via cheia não aceita Praga", () => {
    const hp = naMao("sangue");
    const cheia = [0, 1, 2, 3].map(() => mk("servo", { lane: 0 }));
    const g = mkMatch({ hand: [[hp], []], board: cheia });
    const { error } = applyAction(g, { t: "place", side: 0, hid: hp.hid, lane: 0 });
    expect(error).toMatch(/cheia/);
  });

  it("a Praga consumida libera o slot para a rodada seguinte", () => {
    const hp = naMao("sangue");
    let g = mkMatch({ hand: [[hp], []], board: [0, 1, 2].map(() => mk("servo", { lane: 0 })) });
    g = applyAction(g, { t: "place", side: 0, hid: hp.hid, lane: 0 }).state;
    expect(g.board.filter((c) => c.lane === 0 && c.owner === 0)).toHaveLength(4);
    g = revelar(g);
    g = applyAction(g, { t: "nextRound" }).state;
    expect(g.board.filter((c) => c.lane === 0 && c.owner === 0 && !c.dying)).toHaveLength(3);
  });
});
