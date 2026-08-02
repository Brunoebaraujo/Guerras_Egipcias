import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, resetUid, nextUid, CARDS,
  acharEcoAlvo, temEntradaCopiavel, custoDe, temTipo,
} from "./engine.js";
import { freshMatch, applyAction, autoReveal } from "./match.js";

/* ==========================================================================
   KA ERRANTE — Eco Espiritual

   "Copia o último efeito ao entrar em jogo."

   A carta não tem efeito próprio: ela reexecuta o Ao Entrar da última carta
   revelada que AINDA ESTEJA EM CAMPO, como se o Ka fosse essa carta. Os testes
   abaixo estão agrupados pelas dez regras da especificação, e cada grupo diz
   qual regra cobre.

   Quase tudo aqui roda a REVELAÇÃO DE VERDADE (place → startReveal →
   autoReveal), e não os resolvedores soltos: o que a carta faz depende da
   ORDEM em que as coisas revelam, e ordem é justamente o que um estado montado
   à mão não tem.
   ========================================================================== */

const mkMatch = (over = {}) => ({
  round: 1, energy: [40, 40], board: [], deaths: [0, 0], plays: [0, 0],
  pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
  deck: [[], []], hand: [[], []], seen: [0, 0], justDrew: [[], []], destroyedPower: [0, 0],
  priority: 0, priorityReason: "teste", phase: "plan", queue: [],
  lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null, trevas: null,
  log: [], trace: [], finished: false, ...over,
});
const inHand = (key) => ({ hid: nextUid(), key, printed: byKey[key].poder, baked: 0 });
const onBoard = (key, o = {}) => ({
  uid: nextUid(), key, owner: 0, lane: 0, printed: byKey[key].poder, baked: 0,
  mods: [], revealed: true, dying: false, pendentes: 0, entryPlays: 0, enteredRound: 0, moved: false, ...o,
});

/* Monta a partida e posiciona as jogadas NA ORDEM DADA.
   `jogadas` é uma lista de [key, lane, side] — a ordem da lista é a ordem de
   colocação, que é a ordem de revelação dentro de cada lado. */
function montar(jogadas, over = {}) {
  const hand = [[], []];
  const pedidos = jogadas.map(([key, lane = 0, side = 0]) => {
    const h = inHand(key);
    hand[side].push(h);
    return { side, hid: h.hid, lane };
  });
  let g = mkMatch({ hand, ...over });
  for (const p of pedidos) {
    const r = applyAction(g, { t: "place", ...p });
    if (r.error) throw new Error(`place ${p.hid}: ${r.error}`);
    g = r.state;
  }
  const abriu = applyAction(g, { t: "startReveal" });
  if (abriu.error) throw new Error(abriu.error);
  return abriu.state;
}

const revelar = (jogadas, over = {}) => autoReveal(montar(jogadas, over), { rng: () => 0 });

/* Estado NO INSTANTE em que o Ka revelou. O badge (`s.effect`) é transitório:
   o passo seguinte da fila o substitui, e o passo que encerra a revelação o
   zera. Quem quiser conferir o badge tem que parar aqui. */
function momentoDoKa(jogadas, over = {}) {
  let g = montar(jogadas, over);
  for (let i = 0; i < 50 && g.phase === "revealing" && !g.awaitingAim; i++) {
    g = applyAction(g, { t: "step" }, { rng: () => 0 }).state;
    const rev = g.lastReveal && g.board.find((c) => c.uid === g.lastReveal.uid);
    if (rev && rev.key === "ka-errante") return g;
  }
  throw new Error("o Ka Errante não chegou a revelar");
}

const acha = (s, key) => s.board.find((c) => c.key === key && !c.dying);
const ka = (s) => acha(s, "ka-errante");
const pw = (s, c) => power(c, ctxOf(s));
const vivas = (s, key) => s.board.filter((c) => c.key === key && !c.dying).length;
const trilha = (s) => (s.trace || []).join("\n");

beforeEach(resetUid);

/* ==========================================================================
   IDENTIDADE — regra 10 e os atributos da carta
   ========================================================================== */
describe("Ka Errante — identidade", () => {
  it("está na coleção escolhível", () => {
    expect(CARDS.some((c) => c.key === "ka-errante")).toBe(true);
    expect(byKey["ka-errante"]).toBeDefined();
  });

  it("é uma Unidade de corpo próprio: custo 3, Poder 3", () => {
    const def = byKey["ka-errante"];
    expect([def.custo, def.poder]).toEqual([3, 3]);
    expect(def.tipo).toBe("Criatura");
  });

  it("o texto é o da especificação", () => {
    expect(byKey["ka-errante"].texto).toBe("Copia o último efeito ao entrar em jogo.");
  });

  it("declara o gatilho de entrada e a marca do eco", () => {
    expect(byKey["ka-errante"].trigger).toBe("entrar");
    expect(byKey["ka-errante"].ecoUltimo).toBe(true);
  });

  it("cabe na miniatura", () => {
    expect(byKey["ka-errante"].nomeCurto).toBe("Ka");
  });
});

/* ==========================================================================
   REGRA 1 e 5 — copia o Ao Entrar da última revelada e o executa COMO SE
   fosse ele que acabou de entrar
   ========================================================================== */
describe("regra 1 e 5 — o eco executa da posição do Ka", () => {
  it("copia o Ao Entrar da carta revelada imediatamente antes", () => {
    // Sobek entra sozinho na Via 1 (não destrói nada). O Ka entra na Via 2, onde
    // tem dois Servos: o eco destrói OS DELE, na via DELE, e ele fica com +2.
    const { state: s } = revelar([
      ["servo", 1], ["servo", 1], ["sobek", 0], ["ka-errante", 1],
    ]);
    expect(vivas(s, "servo")).toBe(0);
    expect(s.deaths[0]).toBe(2);
    expect(pw(s, ka(s))).toBe(3 + 2);
    expect(trilha(s)).toContain("Ka Errante ecoa o Ao Entrar de Sobek");
  });

  it("o eco NÃO toca a via da carta copiada — só a do Ka", () => {
    // Assassino Medjay destrói Divindades na via dele (Via 1, vazia de deuses).
    // O eco do Ka acontece na Via 2, e é lá que Amon cai.
    const { state: s } = revelar([
      ["amon", 1], ["assassino-medjay", 0], ["ka-errante", 1],
    ]);
    expect(acha(s, "amon")).toBeUndefined();
    expect(ka(s).lane).toBe(1);
  });

  it("pode ecoar a carta do ADVERSÁRIO — a fila de revelação é uma só", () => {
    // Prioridade do Lado B: a Heka dele revela primeiro e reserva +3 para ele.
    // O Ka do Lado A ecoa, e a reserva nasce para o Lado A.
    const { state: s } = revelar([
      ["heka", 0, 1], ["ka-errante", 0, 0],
    ], { priority: 1 });
    expect(s.pendingBuff).toEqual([3, 3]);
    expect(trilha(s)).toContain("Ka Errante ecoa o Ao Entrar de Heka");
  });

  it("o eco vale entre RODADAS: a última revelada não precisa ser desta rodada", () => {
    const r1 = revelar([["servo", 1], ["servo", 1], ["sobek", 0]]);
    let g = applyAction(r1.state, { t: "nextRound" }, { rng: () => 0 }).state;
    g.energy = [40, 40];
    const h = inHand("ka-errante");
    g.hand[0].push(h);
    g = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 1 }).state;
    g = applyAction(g, { t: "startReveal" }).state;
    const s = autoReveal(g, { rng: () => 0 }).state;
    // Sobek revelou na rodada 1 e continua em campo: é ele o eco.
    expect(vivas(s, "servo")).toBe(0);
    expect(pw(s, ka(s))).toBe(3 + 2);
  });
});

/* ==========================================================================
   REGRAS 2 e 3 — quem saiu do campo não é eco; a busca CONTINUA para trás
   ========================================================================== */
describe("regras 2 e 3 — só vale quem ainda está em jogo", () => {
  it("pula a carta que saiu do campo e ecoa a anterior a ela", () => {
    // A Armadura de Ptah revela DEPOIS do Sobek e se consome na fusão. Quando o
    // Ka entra, a última revelada já não está em jogo — o eco é do Sobek.
    const { state: s } = revelar([
      ["servo", 1], ["servo", 1], ["sobek", 0], ["armadura", 0], ["ka-errante", 1],
    ]);
    expect(trilha(s)).toContain("ecoa o Ao Entrar de Sobek");
    expect(vivas(s, "servo")).toBe(0);
    expect(pw(s, ka(s))).toBe(3 + 2);
  });

  it("pula a carta destruída antes da entrada do Ka", () => {
    // Sekhmet varre os custo 1 e mata o Arqueiro, que era a última revelada.
    const { state: s } = revelar([
      ["heka", 2], ["arqueiro", 2], ["sekhmet", 0], ["ka-errante", 1],
    ]);
    expect(acha(s, "arqueiro")).toBeUndefined();
    // A última revelada VIVA é a Sekhmet: o eco é dela (e não acha custo 1).
    expect(trilha(s)).toContain("ecoa o Ao Entrar de Sekhmet");
  });

  it("acharEcoAlvo devolve a de maior revealSeq entre as vivas", () => {
    const s = { board: [
      onBoard("sobek", { revealSeq: 1 }),
      onBoard("sekhmet", { revealSeq: 2, dying: 3 }),   // destruída: fora
      onBoard("gato", { revealSeq: 3, revealed: false }), // não revelada: fora
    ] };
    const eu = onBoard("ka-errante", { revealSeq: 9 });
    expect(acharEcoAlvo(s, eu).key).toBe("sobek");
  });

  it("uma carta sem revealSeq nunca é eco (ficha, Bennu renascido, recolhida)", () => {
    const s = { board: [onBoard("token-ganso"), onBoard("bennu")] };
    expect(acharEcoAlvo(s, onBoard("ka-errante", { revealSeq: 9 }))).toBeNull();
  });

  it("a ficha invocada não rouba o eco de quem a invocou", () => {
    // O Ganso invoca uma ficha DEPOIS de revelar. Se a ficha contasse como
    // "última revelada", o Ka não copiaria nada (ficha não tem Ao Entrar).
    const { state: s } = revelar([
      ["ganso", 2], ["ka-errante", 1],
    ]);
    expect(trilha(s)).toContain("ecoa o Ao Entrar de Ganso Doméstico");
    expect(s.board.filter((c) => c.key === "token-ganso" && c.lane === 1)).toHaveLength(1);
  });
});

/* ==========================================================================
   REGRA 6 — copia o EFEITO, nunca os atributos
   ========================================================================== */
describe("regra 6 — nada além do efeito de Entrada é copiado", () => {
  it("mantém custo, Poder impresso e tipo próprios depois de ecoar", () => {
    const { state: s } = revelar([["colosso", 0], ["sekhmet", 0], ["ka-errante", 1]]);
    const k = ka(s);
    expect(k.printed).toBe(3);
    expect(custoDe(k)).toBe(3);
    expect(temTipo(k, "Criatura")).toBe(true);
    expect(temTipo(k, "Divindade")).toBe(false);   // não virou Sekhmet
  });

  it("não copia efeito CONTÍNUO (aura)", () => {
    // Amon é a última revelada. Aura não é Ao Entrar: o Ka entra sem habilidade
    // e apenas RECEBE o +1 do Amon, como qualquer outra carta do dono.
    const { state: s } = revelar([["amon", 0], ["ka-errante", 1]]);
    expect(pw(s, ka(s))).toBe(3 + 1);
    expect(trilha(s)).toContain("não tem efeito de Entrada para ecoar");
  });

  it("não copia efeito AO MORRER", () => {
    const { state: s } = revelar([["mumia", 0], ["ka-errante", 1]]);
    expect(trilha(s)).toContain("Múmia não tem efeito de Entrada para ecoar");
    expect(pw(s, ka(s))).toBe(3);
  });

  it("não se afoga no próprio eco: o Dilúvio copiado lê o custo 3 do Ka", () => {
    // O Dilúvio afoga custo 1–2 na via. Se o Ka herdasse o custo 5 do Dilúvio,
    // seguiria vivo do mesmo jeito — o que prova de verdade é o alvo: ele afoga
    // o Servo (custo 0? não) — usamos Bennu (1) e Hiena (2) na via do Ka.
    const { state: s } = revelar([
      ["bennu", 1], ["hiena", 1], ["diluvio", 0], ["ka-errante", 1],
    ]);
    expect(ka(s)).toBeDefined();               // custo 3: fora da faixa afogada
    expect(vivas(s, "hiena")).toBe(0);
    expect(temEntradaCopiavel(byKey["diluvio"])).toBe(true);
  });

  it("o Poder das fichas do Enxame sai do Ka, não da carta copiada", () => {
    // Enxame (2 de Poder) revela na Via 1. O Ka (3) ecoa na Via 2: as fichas
    // nascem com o Poder DELE.
    const { state: s } = revelar([["enxame", 0], ["ka-errante", 1]]);
    const fichas = s.board.filter((c) => c.key === "token-gafanhoto" && c.lane === 1);
    expect(fichas).toHaveLength(2);
    expect(fichas.every((f) => f.printed === 3)).toBe(true);
  });
});

/* ==========================================================================
   REGRA 7 — carta sem efeito de Entrada não produz efeito
   ========================================================================== */
describe("regra 7 — achou, mas não há o que copiar", () => {
  it("carta baunilha: o Ka entra sem habilidade e NÃO procura mais atrás", () => {
    // Sobek está em campo e tem Ao Entrar, mas quem revelou por último foi o
    // Arqueiro. A busca para nele: os Servos sobrevivem.
    const { state: s } = revelar([
      ["servo", 1], ["servo", 1], ["sobek", 0], ["arqueiro", 2], ["ka-errante", 1],
    ]);
    expect(vivas(s, "servo")).toBe(2);
    expect(pw(s, ka(s))).toBe(3);
    expect(trilha(s)).toContain("Arqueiro Núbio não tem efeito de Entrada para ecoar");
  });

  it("temEntradaCopiavel separa entrada de aura, morte e vazio", () => {
    expect(temEntradaCopiavel(byKey["sekhmet"])).toBe(true);     // Ao Entrar
    expect(temEntradaCopiavel(byKey["amon"])).toBe(false);       // Contínuo
    expect(temEntradaCopiavel(byKey["mumia"])).toBe(false);      // Ao Morrer
    expect(temEntradaCopiavel(byKey["arqueiro"])).toBe(false);   // sem gatilho
    expect(temEntradaCopiavel(byKey["escaravelho"])).toBe(false);// movimento
  });
});

/* ==========================================================================
   REGRA 8 — Praga nunca é eco válido
   ========================================================================== */
describe("regra 8 — Pragas fora, e a busca continua", () => {
  it("a Praga revelada logo antes é ignorada e o eco vai para a anterior", () => {
    const { state: s } = revelar([
      ["servo", 1], ["servo", 1], ["sobek", 0], ["sangue", 2], ["ka-errante", 1],
    ]);
    expect(trilha(s)).toContain("ecoa o Ao Entrar de Sobek");
    expect(vivas(s, "servo")).toBe(0);
  });

  it("nenhuma Praga passa por temEntradaCopiavel", () => {
    for (const p of ["sangue", "ras", "peste", "granizo", "trevas", "primogenitos"])
      expect(temEntradaCopiavel(byKey[p]), p).toBe(false);
  });

  it("acharEcoAlvo pula a Praga mesmo se ela ainda estivesse em campo", () => {
    const s = { board: [
      onBoard("sobek", { revealSeq: 1 }),
      onBoard("sangue", { revealSeq: 2 }),   // em campo por hipótese: ainda assim, fora
    ] };
    expect(acharEcoAlvo(s, onBoard("ka-errante", { revealSeq: 9 })).key).toBe("sobek");
  });
});

/* ==========================================================================
   REGRA 9 — sem carta válida, entra normalmente
   ========================================================================== */
describe("regra 9 — o eco vazio não é um erro", () => {
  it("primeira carta da partida: entra com o Poder impresso e sem habilidade", () => {
    const { state: s } = revelar([["ka-errante", 0]]);
    expect(pw(s, ka(s))).toBe(3);
    expect(trilha(s)).toContain("nenhuma carta revelada antes dele continua em jogo");
    expect(trilha(s)).toContain("entra sem habilidade");
  });

  it("dois Ka Errantes não se ecoam em círculo", () => {
    const { state: s } = revelar([["ka-errante", 0], ["ka-errante", 1]]);
    expect(s.board.filter((c) => c.key === "ka-errante")).toHaveLength(2);
    expect(trilha(s)).toContain("Ka Errante não tem efeito de Entrada para ecoar");
  });

  it("o eco vazio não impede o corpo de pontuar a via", () => {
    const { state: s } = revelar([["ka-errante", 0]]);
    expect(s.board.filter((c) => c.lane === 0 && c.owner === 0)).toHaveLength(1);
  });
});

/* ==========================================================================
   INTERAÇÕES — o eco é um Ao Entrar para todos os fins
   ========================================================================== */
describe("o eco se comporta como um Ao Entrar comum", () => {
  it("o Selo do Silêncio inimigo bloqueia o eco antes da busca", () => {
    const { state: s } = revelar([
      ["selo", 1, 1], ["servo", 1], ["servo", 1], ["sobek", 0], ["ka-errante", 1],
    ], { priority: 1 });
    expect(vivas(s, "servo")).toBe(2);          // o eco do Sobek não aconteceu
    expect(trilha(s)).toContain("Ao Entrar bloqueado");
  });

  it("ecoar a Hathor abre a mira NA VIA DO KA, com o valor dela", () => {
    const r = revelar([["lanceiro", 1], ["hathor", 0], ["ka-errante", 1]]);
    expect(r.awaiting).toBe(true);
    const a = r.state.awaitingAim;
    expect(a.srcKey).toBe("hathor");
    expect(a.uid).toBe(ka(r.state).uid);
    expect(a.lane).toBe(1);                     // via do Ka, não a da Hathor
    const alvo = r.state.board.find((c) => c.key === "lanceiro");
    const s = applyAction(r.state, { t: "aim", targetUid: alvo.uid }).state;
    expect(pw(s, s.board.find((c) => c.uid === alvo.uid))).toBe(4 + 3);
  });

  it("o eco alimenta a Renenutet como qualquer bênção permanente", () => {
    /* A Armadura entra sozinha na Via 1 e não se funde — fica em campo, e é ela
       o eco. O Ka, na Via 2, ecoa a fusão: funde-se na Renenutet (única aliada
       da via dele) e lhe entrega os 3 de Poder DELE. Bênção permanente é bênção
       permanente venha de onde vier, então a Renenutet dispara e espalha +1. */
    const { state: s } = revelar([
      ["servo", 2], ["renenutet", 1], ["armadura", 0], ["ka-errante", 1],
    ]);
    expect(trilha(s)).toContain("ecoa o Ao Entrar de Armadura de Ptah");
    const ren = acha(s, "renenutet");
    expect(ren.mods.some((m) => m.src === "Armadura de Ptah" && m.val === 3)).toBe(true);
    expect(pw(s, ren)).toBe(3 + 3);
    expect(pw(s, acha(s, "servo"))).toBe(1 + 1);      // respingo da Renenutet
    expect(ka(s)).toBeUndefined();                     // consumido pela fusão
  });

  it("o badge do eco aparece no passo em que o Ka revela", () => {
    const s = momentoDoKa([["arqueiro", 0], ["ka-errante", 1]]);
    expect(s.effect).toMatchObject({ text: "⟳ sem eco", kind: "block" });
  });

  it("o badge nomeia a carta ecoada quando o efeito não traz badge próprio", () => {
    const s = momentoDoKa([["heka", 0], ["ka-errante", 1]]);
    expect(s.effect.text).toContain("+3");             // badge da própria Heka
  });

  it("o eco de um efeito que destrói alimenta Osíris e Am-heh", () => {
    const { state: s } = revelar([
      ["servo", 1], ["servo", 1], ["sobek", 0], ["ka-errante", 1],
    ]);
    expect(s.deaths[0]).toBe(2);
    expect(s.destroyedPower[0]).toBe(2);        // dois Servos de 1
  });
});
