import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, laneScore, laneWins, ctxOf, onEnterBlocked,
  destroyList, resolveSobek, resolveDestroyOwnLane, resolveArmadura, resolveDestroyAllOfTypeInLane, resolveSekhmet,
  resolveEnxame, buildRevealQueue, applyPendingBuff, resolveHeka, resolveBennuRebirth,
  aplicarBencao, espalharBencao, descarregarPendentes,
  resetUid, nextUid,
} from "./engine.js";

/* Fábricas de teste ---------------------------------------------------------- */
const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], round: 1,
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [],
});

beforeEach(resetUid);

/* ------------------------------ Motor de poder ------------------------------ */
describe("power()", () => {
  it("carta base vale o poder impresso", () => {
    const s = mkState([mk("colosso")]);
    expect(power(s.board[0], ctxOf(s))).toBe(14);
  });

  it("Amon dá +1 às outras cartas do MESMO lado, em todas as vias, e não a si", () => {
    const amon = mk("amon");
    const aliado = mk("servo", { lane: 2 });          // outra via, mesmo dono
    const inimigo = mk("servo", { owner: 1 });        // lado oposto
    const s = mkState([amon, aliado, inimigo]);
    expect(power(aliado, ctxOf(s))).toBe(2);          // 1 + Amon
    expect(power(inimigo, ctxOf(s))).toBe(1);         // não recebe
    expect(power(amon, ctxOf(s))).toBe(5);            // não buffa a si mesmo
  });

  it("Montu dá +2 apenas a Guerreiros do dono", () => {
    const s = mkState([mk("montu"), mk("carruagem"), mk("hathor")]);
    expect(power(s.board[1], ctxOf(s))).toBe(8);      // 6 + 2
    expect(power(s.board[2], ctxOf(s))).toBe(2);      // Divindade: sem buff
  });

  it("Maat prende TODA a via ao poder impresso (dos dois lados)", () => {
    const buffed = mk("servo", { mods: [{ src: "Hathor", val: 2 }] });
    const s = mkState([mk("maat", { owner: 1 }), buffed, mk("amon")]);
    expect(power(buffed, ctxOf(s))).toBe(1);          // impresso, ignora mods e Amon
  });

  it("Anúbis escala +2 por morte própria", () => {
    const s = mkState([mk("anubis")]);
    s.deaths[0] = 3;
    expect(power(s.board[0], ctxOf(s))).toBe(10);     // 4 + 6
  });

  it("Ammit cresce +1 por carta jogada depois dela", () => {
    const ammit = mk("ammit", { entryPlays: 2 });
    const s = mkState([ammit]);
    s.plays[0] = 5;
    expect(power(ammit, ctxOf(s))).toBe(4);           // 1 + (5-2)
  });

  it("cartas com dying não contam no placar da via", () => {
    const s = mkState([mk("colosso"), mk("servo", { dying: 1 })]);
    expect(laneScore(ctxOf(s), 0, 0)).toBe(14);
  });
});

/* --------------------------------- Múmia ------------------------------------ */
describe("Múmia (Ao Morrer)", () => {
  it("volta à mão com o DOBRO do poder atual (marcadores incluídos)", () => {
    const mumia = mk("mumia", { mods: [{ src: "Hathor", val: 2 }] }); // 2+2 = 4
    const s = mkState([mumia]);
    destroyList(s, [mumia]);
    expect(s.hand[0]).toHaveLength(1);
    expect(s.hand[0][0].printed + s.hand[0][0].baked).toBe(8);        // 4 × 2
    expect(s.deaths[0]).toBe(1);
  });

  it("dobra também buffs contínuos (Amon) vigentes na morte", () => {
    const mumia = mk("mumia");
    const s = mkState([mumia, mk("amon")]);                            // 2+1 = 3
    destroyList(s, [mumia]);
    expect(s.hand[0][0].printed + s.hand[0][0].baked).toBe(6);
  });
});

/* --------------------------------- Bennu ------------------------------------ */
describe("Bennu (Ao Morrer)", () => {
  it("agenda +1 energia e retorno ao tabuleiro com +1 de poder", () => {
    const bennu = mk("bennu", { lane: 1 });
    const s = mkState([bennu]);
    destroyList(s, [bennu]);
    expect(s.pendingEnergy[0]).toBe(1);
    expect(s.pendingReturn).toEqual([{ owner: 0, lane: 1, printed: 0, baked: 1 }]);
  });

  it("renasce na MESMA rodada, com +1 de Poder, e limpa a fila", () => {
    const bennu = mk("bennu", { lane: 1 });
    const s = mkState([bennu]);
    destroyList(s, [bennu]);
    s.board = s.board.filter((c) => !c.dying);
    const nascidos = resolveBennuRebirth(s, () => 0);
    expect(nascidos).toHaveLength(1);
    expect(s.pendingReturn).toEqual([]);
    const novo = s.board.find((c) => c.key === "bennu");
    expect(novo.revealed).toBe(true);
    expect(novo.enteredRound).toBe(s.round);
    expect(power(novo, ctxOf(s))).toBe(1);
  });

  it("a via e sorteada, nao herdada da via de origem", () => {
    const alvo = [];
    for (const r of [0, 0.5, 0.99]) {
      const bennu = mk("bennu", { lane: 1 });
      const s = mkState([bennu]);
      destroyList(s, [bennu]);
      s.board = s.board.filter((c) => !c.dying);
      resolveBennuRebirth(s, () => r);
      alvo.push(s.board.find((c) => c.key === "bennu").lane);
    }
    expect(alvo).toEqual([0, 1, 2]);
  });

  it("sorteia apenas entre vias com espaco", () => {
    const bennu = mk("bennu", { lane: 0 });
    const cheia = (lane) => [0, 1, 2, 3].map(() => mk("servo", { lane }));
    const s = mkState([bennu, ...cheia(0), ...cheia(1)]);
    destroyList(s, [bennu]);
    s.board = s.board.filter((c) => !c.dying);
    resolveBennuRebirth(s, () => 0);
    expect(s.board.find((c) => c.key === "bennu").lane).toBe(2);
  });

  it("nao renasce se todas as vias estiverem cheias", () => {
    const bennu = mk("bennu", { lane: 0 });
    const cheia = (lane) => [0, 1, 2, 3].map(() => mk("servo", { lane }));
    const s = mkState([bennu, ...cheia(0), ...cheia(1), ...cheia(2)]);
    destroyList(s, [bennu]);
    s.board = s.board.filter((c) => !c.dying);
    const nascidos = resolveBennuRebirth(s, () => 0);
    expect(nascidos).toEqual([]);
    expect(s.board.some((c) => c.key === "bennu")).toBe(false);
    expect(s.pendingReturn).toEqual([]);
  });
});

/* --------------------------------- Sobek ------------------------------------ */
describe("Sobek", () => {
  it("destrói as outras cartas da via e ganha +1 por vítima", () => {
    const sobek = mk("sobek");
    const s = mkState([sobek, mk("servo"), mk("arqueiro"), mk("servo", { lane: 1 })]);
    resolveSobek(s, sobek);
    expect(s.board.filter((c) => c.dying)).toHaveLength(2);            // só a via 0
    expect(power(sobek, ctxOf(s))).toBe(4);                            // 2 + 2
  });

  it("sozinho na via não ganha nada", () => {
    const sobek = mk("sobek");
    const s = mkState([sobek]);
    const fx = resolveSobek(s, sobek);
    expect(fx.kind).toBe("block");
    expect(power(sobek, ctxOf(s))).toBe(2);
  });
});

/* -------------------------------- Apófis ------------------------------------ */
describe("Apófis / Dilúvio", () => {
  it("Apófis absorve o poder total das vítimas", () => {
    const apofis = mk("apofis");
    const s = mkState([apofis, mk("carruagem"), mk("servo")]);         // 6 + 1
    resolveDestroyOwnLane(s, apofis, true);
    expect(power(apofis, ctxOf(s))).toBe(10);                          // 3 + 7
  });

  it("Dilúvio destrói sem absorver", () => {
    const dil = mk("diluvio");
    const s = mkState([dil, mk("carruagem")]);
    resolveDestroyOwnLane(s, dil, false);
    expect(power(dil, ctxOf(s))).toBe(7);
    expect(s.board.filter((c) => c.dying)).toHaveLength(1);
  });
});

/* --------------------------- Assassino Medjay ------------------------------- */
describe("Assassino Medjay", () => {
  it("destrói Montu na mesma via", () => {
    const medjay = mk("assassino-medjay");
    const montu = mk("montu");
    const s = mkState([medjay, montu]);
    const fx = resolveDestroyAllOfTypeInLane(s, medjay, "Divindade");
    expect(fx.kind).toBe("debuff");
    expect(montu.dying).toBe(1);
    expect(s.deaths).toEqual([1, 0]);
  });

  it("destrói todas as Divindades na mesma via, dos dois lados", () => {
    const medjay = mk("assassino-medjay");
    const montu = mk("montu");
    const set = mk("set", { owner: 1 });
    const s = mkState([medjay, montu, set]);
    resolveDestroyAllOfTypeInLane(s, medjay, "Divindade");
    expect(montu.dying).toBe(1);
    expect(set.dying).toBe(1);
    expect(s.deaths).toEqual([1, 1]);
  });

  it("não destrói Guerreiro, Criatura, Magia, Relíquia ou Fenômeno", () => {
    const medjay = mk("assassino-medjay");
    const cards = [mk("servo"), mk("mumia"), mk("selo"), mk("armadura"), mk("diluvio")];
    const s = mkState([medjay, ...cards]);
    const fx = resolveDestroyAllOfTypeInLane(s, medjay, "Divindade");
    expect(fx.kind).toBe("block");
    expect(cards.every((c) => !c.dying)).toBe(true);
    expect(s.deaths).toEqual([0, 0]);
  });

  it("não destrói Divindades em outras vias", () => {
    const medjay = mk("assassino-medjay", { lane: 0 });
    const montu = mk("montu", { lane: 1 });
    const s = mkState([medjay, montu]);
    resolveDestroyAllOfTypeInLane(s, medjay, "Divindade");
    expect(montu.dying).toBe(false);
    expect(s.deaths).toEqual([0, 0]);
  });

  it("sem Divindade na via não destrói nada", () => {
    const medjay = mk("assassino-medjay");
    const servo = mk("servo");
    const s = mkState([medjay, servo]);
    const fx = resolveDestroyAllOfTypeInLane(s, medjay, "Divindade");
    expect(fx.text).toBe("sem alvo");
    expect(servo.dying).toBe(false);
    expect(s.deaths).toEqual([0, 0]);
  });

  it("usa destroyList, preservando contadores de morte", () => {
    const medjay = mk("assassino-medjay");
    const montu = mk("montu");
    const hathor = mk("hathor", { owner: 1 });
    const s = mkState([medjay, montu, hathor]);
    resolveDestroyAllOfTypeInLane(s, medjay, "Divindade");
    expect(s.deaths).toEqual([1, 1]);
    expect(s.board.filter((c) => c.dying)).toEqual([montu, hathor]);
  });
});

/* ------------------------------- Sekhmet ------------------------------------ */
describe("Sekhmet", () => {
  it("destrói custo 1 dos DOIS lados e dispara a Múmia", () => {
    const sek = mk("sekhmet");
    const s = mkState([sek, mk("mumia"), mk("arqueiro", { owner: 1, lane: 2 })]);
    resolveSekhmet(s, sek, 1);
    expect(s.board.filter((c) => c.dying)).toHaveLength(2);
    expect(s.hand[0]).toHaveLength(1);                                 // Múmia voltou (4)
    expect(s.hand[0][0].printed + s.hand[0][0].baked).toBe(4);
  });
});

/* ------------------------------- Armadura ----------------------------------- */
describe("Armadura de Ptah", () => {
  it("funde-se com o aliado da via e some", () => {
    const arm = mk("armadura");
    const alvo = mk("servo");
    const s = mkState([arm, alvo]);
    resolveArmadura(s, arm);
    expect(arm.dying).toBeTruthy();
    expect(power(alvo, ctxOf(s))).toBe(4);                             // 1 + 3
  });
});

/* ---------------------------- Selo do Silêncio ------------------------------ */
describe("Selo do Silêncio", () => {
  it("bloqueia Ao Entrar inimigo na mesma via", () => {
    const selo = mk("selo", { owner: 1 });
    const chegando = mk("hathor", { revealed: false });
    expect(onEnterBlocked(chegando, [selo, chegando])).toBe(true);
  });
  it("não bloqueia aliados nem outras vias", () => {
    const selo = mk("selo", { owner: 1, lane: 2 });
    const chegando = mk("hathor", { revealed: false });
    expect(onEnterBlocked(chegando, [selo, chegando])).toBe(false);
    const seloAliado = mk("selo");
    expect(onEnterBlocked(chegando, [seloAliado, chegando])).toBe(false);
  });
});

/* ------------------------------- Vitória ------------------------------------ */
describe("laneWins()", () => {
  it("conta vias por maior soma; empate não pontua", () => {
    const s = mkState([
      mk("colosso"),                                  // via 0: A 14 × 0
      mk("colosso", { owner: 1, lane: 1 }),           // via 1: 0 × B 14
      mk("servo", { lane: 2 }), mk("servo", { owner: 1, lane: 2 }), // via 2: 1 × 1
    ]);
    expect(laneWins(s)).toEqual([1, 1]);
  });
});

/* --------------------------- Ordem de revelação ----------------------------- */
describe("buildRevealQueue()", () => {
  it("revela TODAS as cartas da prioridade antes das do oponente", () => {
    // board em ordem de colocação intercalando os dois lados
    const a1 = mk("servo", { owner: 0, lane: 2, revealed: false });
    const b1 = mk("servo", { owner: 1, lane: 0, revealed: false });
    const a2 = mk("servo", { owner: 0, lane: 0, revealed: false });
    const b2 = mk("servo", { owner: 1, lane: 2, revealed: false });
    const s = { ...mkState([a1, b1, a2, b2]), priority: 0 };
    expect(buildRevealQueue(s)).toEqual([a1.uid, a2.uid, b1.uid, b2.uid]);
  });

  it("a prioridade do lado 1 inverte quem revela primeiro", () => {
    const a1 = mk("servo", { owner: 0, lane: 0, revealed: false });
    const b1 = mk("servo", { owner: 1, lane: 0, revealed: false });
    const s = { ...mkState([a1, b1]), priority: 1 };
    expect(buildRevealQueue(s)).toEqual([b1.uid, a1.uid]);
  });

  it("dentro de um lado, segue a ORDEM DE COLOCAÇÃO atravessando as vias (sem agrupar por via)", () => {
    // Sequência de jogo: Via 3 → Via 1 → Via 3 (lanes 2, 0, 2)
    const c1 = mk("servo", { lane: 2, revealed: false });
    const c2 = mk("servo", { lane: 0, revealed: false });
    const c3 = mk("servo", { lane: 2, revealed: false });
    const s = { ...mkState([c1, c2, c3]), priority: 0 };
    // Ordem de colocação pura: c1, c2, c3.
    // (O comportamento antigo, agrupando por via, teria dado c2, c1, c3.)
    expect(buildRevealQueue(s)).toEqual([c1.uid, c2.uid, c3.uid]);
  });

  it("ignora cartas já reveladas (de rodadas anteriores) e enfileira só as novas", () => {
    const velha = mk("servo", { lane: 0, revealed: true });
    const nova1 = mk("servo", { lane: 2, revealed: false });
    const nova2 = mk("servo", { lane: 1, revealed: false });
    const s = { ...mkState([velha, nova1, nova2]), priority: 0 };
    expect(buildRevealQueue(s)).toEqual([nova1.uid, nova2.uid]);
  });
});

/* Enxame + aura contínua: comportamento conhecido -----------------------------
   Amon/Montu são auras CONTÍNUAS (recalculadas em power()), então as cópias do
   Enxame convergem ao mesmo Poder revele-se a aura antes ou depois do Enxame.
   A mudança de ordem de revelação só altera resultados em efeitos que GRAVAM um
   valor no momento da revelação (snapshot), não em auras contínuas. */
describe("Enxame sob aura contínua (Amon) independe da ordem de revelação", () => {
  it("as cópias chegam ao mesmo Poder com Amon revelado antes OU depois", () => {
    for (const amonAntes of [true, false]) {
      resetUid();
      const amon = mk("amon", { lane: 2, revealed: amonAntes });   // cross-lane
      const enxame = mk("enxame", { lane: 0, revealed: true });
      const s = mkState([amon, enxame]);
      resolveEnxame(s, s.board.find((c) => c.key === "enxame" && !c.baseCopy));
      s.board.find((c) => c.key === "amon").revealed = true;        // aura em vigor
      const copias = s.board.filter((c) => c.key === "enxame" && c.baseCopy);
      expect(copias).toHaveLength(2);
      for (const c of copias) expect(power(c, ctxOf(s))).toBe(3);   // 2 impresso + 1 Amon
    }
  });
});

/* --------------------------------- Heka ------------------------------------- */
// Heka (2/1): reserva +3 para a PRÓXIMA carta sua a revelar. Buff snapshot que
// atravessa vias — depende da ordem de colocação/revelação.
describe("Heka — buff da próxima carta revelada", () => {
  it("reserva +3 e a próxima carta do mesmo dono o consome (mod permanente)", () => {
    const heka = mk("heka", { revealed: false });
    const servo = mk("servo", { revealed: false });                 // poder 1
    const s = { ...mkState([heka, servo]), queue: [servo.uid], pendingBuff: [null, null] };
    const eff = resolveHeka(s, heka);
    expect(eff.kind).toBe("buff");
    expect(s.pendingBuff[0]).toBe(3);
    s.queue = [];
    expect(applyPendingBuff(s, servo)).toBe(3);
    expect(power(servo, ctxOf(s))).toBe(4);                          // 1 + 3
    expect(s.pendingBuff[0]).toBe(null);                             // consumido
  });

  it("não vaza para o oponente: só a próxima carta SUA consome a reserva", () => {
    const heka = mk("heka", { owner: 0, revealed: false });
    const inimigo = mk("servo", { owner: 1, revealed: false });
    const s = { ...mkState([heka, inimigo]), queue: [inimigo.uid], pendingBuff: [null, null] };
    resolveHeka(s, heka);
    expect(s.pendingBuff[0]).toBe(3);                                // reservado para o lado 0
    expect(applyPendingBuff(s, inimigo)).toBe(0);                    // inimigo (lado 1) não recebe
    expect(s.pendingBuff[0]).toBe(3);                               // reserva intacta
  });

  it("a reserva PERSISTE entre rodadas: Heka por último guarda o +3 para a próxima carta", () => {
    // Rodada 2: Heka é a última carta a revelar (fila vazia depois dela)
    const heka = mk("heka", { revealed: false });
    const s = { ...mkState([heka]), queue: [], pendingBuff: [null, null] };
    const eff = resolveHeka(s, heka);
    expect(eff.kind).toBe("buff");                                   // reserva mesmo sem alvo agora
    expect(s.pendingBuff[0]).toBe(3);                               // NÃO se perde entre rodadas
    // Rodada 3: uma nova carta é jogada e revelada — consome a reserva guardada
    const nova = mk("servo", { revealed: false });
    s.board.push(nova);
    expect(applyPendingBuff(s, nova)).toBe(3);
    expect(power(nova, ctxOf(s))).toBe(4);                          // 1 + 3
    expect(s.pendingBuff[0]).toBe(null);
  });

  it("dois Hekas em sequência encadeiam: o 1º buffa o 2º, o 2º buffa o seguinte", () => {
    const h1 = mk("heka", { revealed: false });
    const h2 = mk("heka", { revealed: false });                     // poder 1
    const w = mk("carruagem", { revealed: false });                 // poder 6
    const s = { ...mkState([h1, h2, w]), queue: [h2.uid, w.uid], pendingBuff: [null, null] };
    applyPendingBuff(s, h1); resolveHeka(s, h1);                     // h1 reserva +3
    s.queue = [w.uid];
    expect(applyPendingBuff(s, h2)).toBe(3);                         // h2 recebe +3
    expect(power(h2, ctxOf(s))).toBe(4);                            // 1 + 3
    resolveHeka(s, h2);                                              // h2 reserva +3
    s.queue = [];
    expect(applyPendingBuff(s, w)).toBe(3);
    expect(power(w, ctxOf(s))).toBe(9);                            // 6 + 3
  });

  it("Heka -> Enxame cross-via: o +3 propaga para as cópias", () => {
    const heka = mk("heka", { lane: 0, revealed: false });
    const enxame = mk("enxame", { lane: 1, revealed: false });      // poder 2
    const s = { ...mkState([heka, enxame]), queue: [enxame.uid], pendingBuff: [null, null] };
    resolveHeka(s, heka);                                            // reserva +3
    s.queue = [];
    applyPendingBuff(s, enxame);                                    // Enxame entra com +3
    enxame.revealed = true;
    resolveEnxame(s, enxame);
    const copias = s.board.filter((c) => c.key === "enxame" && c.baseCopy);
    expect(copias).toHaveLength(2);
    expect(power(enxame, ctxOf(s))).toBe(5);                        // 2 + 3
    for (const c of copias) expect(power(c, ctxOf(s))).toBe(5);     // cópias herdam o +3
  });
});

/* ------------------------------- Renenutet ---------------------------------- */
describe("Renenutet (bênçãos)", () => {
  const soma = (c) => c.mods.reduce((t, m) => t + m.val, 0);

  it("uma bênção permanente espalha +1 para duas outras cartas suas", () => {
    const ren = mk("renenutet");
    const a = mk("servo"), b = mk("arqueiro"), c = mk("lanceiro");
    const s = mkState([ren, a, b, c]);
    aplicarBencao(s, ren, 3, "Hathor", { rng: () => 0 });
    const tocadas = [a, b, c].filter((x) => soma(x) === 1);
    expect(tocadas).toHaveLength(2);
    expect(soma(ren)).toBe(3);
  });

  it("o +1 espalhado e inerte: duas copias nao entram em laco", () => {
    const r1 = mk("renenutet"), r2 = mk("renenutet");
    const s = mkState([r1, r2]);
    aplicarBencao(s, r1, 3, "Hathor", { rng: () => 0 });
    expect(soma(r2)).toBe(1);              // recebeu
    expect(r2.mods[0].inert).toBe(true);   // mas nao dispara
    expect(soma(r1)).toBe(3);              // r1 nao recebeu de volta
  });

  it("debuff nao dispara bencao", () => {
    const ren = mk("renenutet");
    const a = mk("servo");
    const s = mkState([ren, a]);
    aplicarBencao(s, ren, -4, "Set", { rng: () => 0 });
    expect(soma(a)).toBe(0);
  });

  it("nao dispara enquanto nao esta revelada em campo", () => {
    const ren = mk("renenutet", { revealed: false });
    const a = mk("servo");
    const s = mkState([ren, a]);
    aplicarBencao(s, ren, 3, "Hathor", { rng: () => 0 });
    expect(soma(a)).toBe(0);
  });

  it("abencoa apenas um alvo quando so ha um disponivel", () => {
    const ren = mk("renenutet");
    const a = mk("servo");
    const s = mkState([ren, a]);
    espalharBencao(s, ren, () => 0);
    expect(soma(a)).toBe(1);
  });

  it("descarrega 3 pendentes em 3 ondas independentes", () => {
    const ren = mk("renenutet", { pendentes: 3 });
    const alvos = [mk("servo"), mk("arqueiro"), mk("lanceiro"), mk("colosso")];
    const s = mkState([ren, ...alvos]);
    const { ondas, tocadas } = descarregarPendentes(s, ren, () => 0);
    expect(ondas).toBe(3);
    expect(tocadas).toBe(6);
    expect(ren.pendentes).toBe(0);
    expect(alvos.reduce((t, a) => t + soma(a), 0)).toBe(6);
    expect(s.blessings.map((b) => b.wave)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it("sem pendentes, a entrada nao produz nada", () => {
    const ren = mk("renenutet");
    const a = mk("servo");
    const s = mkState([ren, a]);
    const { ondas } = descarregarPendentes(s, ren, () => 0);
    expect(ondas).toBe(0);
    expect(soma(a)).toBe(0);
  });
});
