import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, destroyList, consumirCarta, resolvePraga, resolveSekhmet, resolveSet,
  resolveInvocar, resolveCabraDoNilo, resolveApis, resolveMacaco, invocarFicha,
  viaCheia, contarViasCheias, ocupacaoDaVia, viasComEspaco, animaisEmJogo, podeSerAlvo, laneProtegida,
  resolveDestroyAllOfTypeInLane, validTargets, resetUid, nextUid, CARDS, TOKENS, efeitoDe } from "./engine.js";
import { freshMatch, applyAction, autoReveal, isAimable } from "./match.js";

/* Mesmas fábricas do engine.test.js: estado mínimo, montado à mão, sem passar
   pela partida — o que estamos testando é a REGRA, não a orquestração. */
const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = [], over = {}) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], deck: [[], []], round: 1, energy: [9, 9],
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0], ...over,
});
const primeiro = () => 0;                        // rng determinístico: sempre o 1º do sorteio
const pw = (s, c) => power(c, ctxOf(s));
/* Preenche uma via de um lado com Cães (0/1) até o topo. */
const encher = (lane, owner, n = 4) => Array.from({ length: n }, () => mk("cao", { lane, owner }));

beforeEach(resetUid);

/* ==========================================================================
   Fundamentos: tipo, seletores e ocupação de via
   ========================================================================== */
describe("identidade do arquétipo", () => {
  it("as dez cartas existem na coleção com custo e Poder do documento", () => {
    const esperado = [
      ["cao", 0, 1, "Animal"], ["cabra-nilo", 1, 1, "Animal"], ["ganso", 1, 1, "Animal"],
      ["gato", 2, 2, "Animal"], ["macaco", 2, 4, "Animal"], ["hiena", 2, 2, "Animal"],
      ["garca", 2, 2, "Animal"], ["rebanho", 3, 2, "Animal"], ["domador", 3, 2, "Humano"],
      ["apis", 6, 7, "Animal"],
    ];
    for (const [key, custo, poder, tipo] of esperado) {
      const def = byKey[key];
      expect(def, key).toBeDefined();
      expect([def.custo, def.poder, def.tipo], key).toEqual([custo, poder, tipo]);
      expect(CARDS.some((c) => c.key === key), `${key} escolhível`).toBe(true);
    }
  });

  it("as duas fichas existem fora da coleção e contam como Animal", () => {
    for (const key of ["token-ganso", "token-cabra"]) {
      expect(byKey[key].token).toBe(true);
      expect(byKey[key].tipo).toBe("Animal");
      expect(CARDS.some((c) => c.key === key), `${key} não é escolhível`).toBe(false);
      expect(TOKENS.some((c) => c.key === key)).toBe(true);
    }
    expect(byKey["token-ganso"].poder).toBe(1);
    expect(byKey["token-cabra"].poder).toBe(1);
  });

  it("a ficha de Ganso NÃO invoca outro Ganso (sem geração infinita)", () => {
    expect(efeitoDe(byKey["ganso"], "summon")).toBeDefined();
    expect(efeitoDe(byKey["token-ganso"], "summon")).toBeNull();
    expect(byKey["token-ganso"].trigger).toBeUndefined();
  });

  it("o Domador é Humano e não conta como Animal", () => {
    const s = mkState([mk("domador"), mk("cao")]);
    expect(animaisEmJogo(s.board).map((c) => c.key)).toEqual(["cao"]);
  });

  it("animaisEmJogo só enxerga cartas REVELADAS", () => {
    const s = mkState([mk("cao"), mk("cao", { revealed: false }), mk("cao", { dying: 1 })]);
    expect(animaisEmJogo(s.board)).toHaveLength(1);
  });

  it("ocupação de via é por lado e ignora quem está saindo", () => {
    const s = mkState([...encher(0, 0, 3), mk("cao", { lane: 0, owner: 0, dying: 1 }), ...encher(0, 1, 4)]);
    expect(ocupacaoDaVia(s.board, 0, 0)).toBe(3);
    expect(viaCheia(s.board, 0, 0)).toBe(false);
    expect(viaCheia(s.board, 1, 0)).toBe(true);
    expect(viasComEspaco(s.board, 1)).toEqual([1, 2]);
    expect(viasComEspaco(s.board, 1, 1)).toEqual([2]);
  });
});

/* ==========================================================================
   Cabra do Nilo — +1 se já houver outro Animal seu na via
   ========================================================================== */
describe("Cabra do Nilo", () => {
  it("entra sozinha na via: permanece com 1", () => {
    const cabra = mk("cabra-nilo");
    const s = mkState([cabra]);
    const badge = resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(1);
    expect(badge.kind).toBe("block");
  });

  it("entra com outro Animal aliado na via: fica com 2", () => {
    const cabra = mk("cabra-nilo");
    const s = mkState([mk("cao"), cabra]);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(2);
  });

  it("Animal inimigo na via não conta", () => {
    const cabra = mk("cabra-nilo");
    const s = mkState([mk("cao", { owner: 1 }), cabra]);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(1);
  });

  it("Animal aliado em OUTRA via não conta", () => {
    const cabra = mk("cabra-nilo", { lane: 0 });
    const s = mkState([mk("cao", { lane: 2 }), cabra]);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(1);
  });

  it("Guerreiro aliado na via não conta", () => {
    const cabra = mk("cabra-nilo");
    const s = mkState([mk("carruagem"), cabra]);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(1);
  });

  it("o bônus é permanente: sobrevive à saída do companheiro", () => {
    const cao = mk("cao");
    const cabra = mk("cabra-nilo");
    const s = mkState([cao, cabra]);
    resolveCabraDoNilo(s, cabra);
    destroyList(s, [cao]);
    expect(pw(s, cabra)).toBe(2);
  });

  it("conta fichas como companhia", () => {
    const cabra = mk("cabra-nilo");
    const s = mkState([mk("token-cabra"), cabra]);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(2);
  });

  it("escala: +1 para CADA Animal seu na via", () => {
    const cabra = mk("cabra-nilo");
    const s = mkState([mk("cao"), mk("cao"), mk("token-ganso"), cabra]);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(4);          // 1 impresso + 3 companheiros
  });

  it("teto natural do lado da via: três companheiros, +3", () => {
    const cabra = mk("cabra-nilo");
    const s = mkState([...encher(0, 0, 3), cabra]);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(4);
  });

  it("a escala ignora Animais inimigos e de outras vias", () => {
    const cabra = mk("cabra-nilo", { lane: 0 });
    const s = mkState([
      mk("cao", { lane: 0 }),                    // conta
      mk("cao", { lane: 0, owner: 1 }),          // inimigo: não conta
      mk("cao", { lane: 1 }),                    // outra via: não conta
      mk("cao", { lane: 0, revealed: false }),   // oculto: não conta
      cabra,
    ]);
    resolveCabraDoNilo(s, cabra);
    expect(pw(s, cabra)).toBe(2);
  });

  it("o bônus congela: Animais que chegam depois não aumentam", () => {
    const cabra = mk("cabra-nilo");
    const s = mkState([mk("cao"), cabra]);
    resolveCabraDoNilo(s, cabra);
    s.board.push(mk("cao"));
    expect(pw(s, cabra)).toBe(2);
  });
});

/* ==========================================================================
   Ganso Doméstico e Rebanho de Cabras — invocação
   ========================================================================== */
describe("Ganso Doméstico", () => {
  it("com espaço: cria uma ficha 0/1 na própria via", () => {
    const ganso = mk("ganso");
    const s = mkState([ganso]);
    const badge = resolveInvocar(s, ganso);
    const fichas = s.board.filter((c) => c.key === "token-ganso");
    expect(fichas).toHaveLength(1);
    expect([fichas[0].lane, fichas[0].owner, fichas[0].token]).toEqual([0, 0, true]);
    expect(pw(s, fichas[0])).toBe(1);
    expect(badge.kind).toBe("buff");
  });

  it("sem espaço na via: nenhuma ficha é criada e nada é substituído", () => {
    const ganso = mk("ganso");
    const s = mkState([...encher(0, 0, 3), ganso]);   // 3 Cães + o Ganso = 4
    const badge = resolveInvocar(s, ganso);
    expect(s.board.filter((c) => c.key === "token-ganso")).toHaveLength(0);
    expect(s.board).toHaveLength(4);
    expect(badge.kind).toBe("block");
  });

  it("a ficha alimenta a Ammit como qualquer carta colocada em jogo", () => {
    const ganso = mk("ganso");
    const s = mkState([ganso]);
    resolveInvocar(s, ganso);
    expect(s.plays[0]).toBe(1);
  });
});

describe("Rebanho de Cabras", () => {
  it("cria uma Cabra em cada uma das OUTRAS duas vias, nunca na própria", () => {
    const reb = mk("rebanho", { lane: 1 });
    const s = mkState([reb]);
    resolveInvocar(s, reb);
    const cabras = s.board.filter((c) => c.key === "token-cabra");
    expect(cabras.map((c) => c.lane).sort()).toEqual([0, 2]);
    expect(cabras.every((c) => c.owner === 0)).toBe(true);
  });

  it("uma via cheia: cria só na outra", () => {
    const reb = mk("rebanho", { lane: 1 });
    const s = mkState([reb, ...encher(0, 0, 4)]);
    resolveInvocar(s, reb);
    expect(s.board.filter((c) => c.key === "token-cabra").map((c) => c.lane)).toEqual([2]);
  });

  it("as duas cheias: nenhuma ficha e badge de bloqueio", () => {
    const reb = mk("rebanho", { lane: 1 });
    const s = mkState([reb, ...encher(0, 0, 4), ...encher(2, 0, 4)]);
    const badge = resolveInvocar(s, reb);
    expect(s.board.filter((c) => c.key === "token-cabra")).toHaveLength(0);
    expect(badge.kind).toBe("block");
  });

  it("vias cheias do INIMIGO não atrapalham", () => {
    const reb = mk("rebanho", { lane: 1 });
    const s = mkState([reb, ...encher(0, 1, 4), ...encher(2, 1, 4)]);
    resolveInvocar(s, reb);
    expect(s.board.filter((c) => c.key === "token-cabra")).toHaveLength(2);
  });

  it("as Cabras recebem a Aura do Domador na hora em que nascem", () => {
    const reb = mk("rebanho", { lane: 1 });
    const s = mkState([reb, mk("domador", { lane: 1 })]);
    resolveInvocar(s, reb);
    for (const cabra of s.board.filter((c) => c.key === "token-cabra")) expect(pw(s, cabra)).toBe(3);
  });
});

/* ==========================================================================
   Gato Egípcio — proteção contra alvo escolhido
   ========================================================================== */
describe("Gato Egípcio", () => {
  it("protege as cartas aliadas da via, de qualquer tipo, e a si mesmo", () => {
    const gato = mk("gato", { lane: 1 });
    const aliado = mk("carruagem", { lane: 1 });
    const s = mkState([gato, aliado]);
    const inimigo = mk("sangue", { owner: 1, lane: 1 });
    expect(podeSerAlvo(s.board, aliado, inimigo)).toBe(false);
    expect(podeSerAlvo(s.board, gato, inimigo)).toBe(false);
  });

  it("não protege outra via", () => {
    const gato = mk("gato", { lane: 1 });
    const fora = mk("carruagem", { lane: 2 });
    const s = mkState([gato, fora]);
    expect(podeSerAlvo(s.board, fora, mk("sangue", { owner: 1 }))).toBe(true);
  });

  it("não protege contra os efeitos do PRÓPRIO dono", () => {
    const gato = mk("gato");
    const aliado = mk("cao");
    const s = mkState([gato, aliado]);
    expect(podeSerAlvo(s.board, aliado, mk("sobek", { owner: 0 }))).toBe(true);
  });

  it("Praga de alvo único não encontra vítima na via protegida", () => {
    const gato = mk("gato", { lane: 0, owner: 1 });
    const aliado = mk("colosso", { lane: 0, owner: 1 });
    const praga = mk("sangue", { owner: 0, lane: 0 });
    const s = mkState([gato, aliado, praga]);
    const badge = resolvePraga(s, praga, primeiro);
    expect(pw(s, aliado)).toBe(14);      // intacto
    expect(pw(s, gato)).toBe(2);
    expect(badge.kind).toBe("block");
  });

  it("Morte dos Primogênitos ignora a via protegida e mata fora dela", () => {
    const gato = mk("gato", { lane: 0, owner: 1 });
    const protegido = mk("colosso", { lane: 0, owner: 1 });   // custo 6, seria o alvo
    const exposto = mk("carruagem", { lane: 2, owner: 1 });   // custo 3
    const praga = mk("primogenitos", { owner: 0, lane: 0 });
    const s = mkState([gato, protegido, exposto, praga]);
    resolvePraga(s, praga, primeiro);
    expect(protegido.dying).toBeFalsy();
    expect(exposto.dying).toBeTruthy();
  });

  it("Set não dispersa cartas de uma via protegida", () => {
    const gato = mk("gato", { lane: 0, owner: 1 });
    const vitima = mk("carruagem", { lane: 0, owner: 1 });
    const set = mk("set", { owner: 0, lane: 0 });
    const s = mkState([gato, vitima, set]);
    const { movidas } = resolveSet(s, set, primeiro);
    expect(movidas).toHaveLength(0);
    expect(vitima.lane).toBe(0);
  });

  it("NÃO impede efeito global: a Sekhmet varre custo 1 mesmo sob o Gato", () => {
    const gato = mk("gato", { lane: 0, owner: 1 });
    const alvo = mk("cabra-nilo", { lane: 0, owner: 1 });     // custo 1
    const sek = mk("sekhmet", { owner: 0, lane: 2 });
    const s = mkState([gato, alvo, sek]);
    resolveSekhmet(s, sek, 1);
    expect(alvo.dying).toBeTruthy();
  });

  it("NÃO impede a Peste nos Animais: a via inteira cai, Gato inclusive", () => {
    const gato = mk("gato", { lane: 0, owner: 1 });
    const cao = mk("cao", { lane: 0, owner: 1 });
    const praga = mk("peste", { owner: 0, lane: 0 });
    const s = mkState([gato, cao, praga]);
    resolveDestroyAllOfTypeInLane(s, praga, "Animal", { escopo: "inimigos" });
    expect(gato.dying).toBeTruthy();
    expect(cao.dying).toBeTruthy();
  });

  it("a proteção some junto com o Gato", () => {
    const gato = mk("gato", { lane: 0, owner: 1 });
    const aliado = mk("colosso", { lane: 0, owner: 1 });
    const s = mkState([gato, aliado]);
    expect(laneProtegida(s.board, 1, 0)).toBe(true);
    destroyList(s, [gato]);
    expect(laneProtegida(s.board, 1, 0)).toBe(false);
    expect(podeSerAlvo(s.board, aliado, mk("sangue", { owner: 0 }))).toBe(true);
  });

  it("Gato ainda oculto não protege ninguém", () => {
    const gato = mk("gato", { lane: 0, owner: 1, revealed: false });
    const aliado = mk("colosso", { lane: 0, owner: 1 });
    const s = mkState([gato, aliado]);
    expect(podeSerAlvo(s.board, aliado, mk("sangue", { owner: 0 }))).toBe(true);
  });

  it("dois Gatos na mesma via não somam nada além da própria proteção", () => {
    const s = mkState([mk("gato", { owner: 1 }), mk("gato", { owner: 1 }), mk("colosso", { owner: 1 })]);
    expect(laneProtegida(s.board, 1, 0)).toBe(true);
    expect(pw(s, s.board[2])).toBe(14);
  });

  it("a mira inimiga é revalidada na resolução, e não só no realce", () => {
    const gato = mk("gato", { owner: 1, lane: 0 });
    const alvo = mk("colosso", { owner: 1, lane: 0 });
    const fonte = mk("hathor", { owner: 0, lane: 0 });
    const s = mkState([gato, alvo, fonte], {
      awaitingAim: { uid: fonte.uid, side: 0, lane: 0, needs: "enemy", srcNome: "teste", srcKey: "hathor" },
    });
    expect(isAimable(s, alvo)).toBe(false);
    expect(validTargets(fonte, "enemy", s.board)).toHaveLength(0);
  });
});

/* ==========================================================================
   Macaco Sagrado — movimento
   ========================================================================== */
describe("Macaco Sagrado", () => {
  it("move um Animal aliado para outra via com espaço", () => {
    const macaco = mk("macaco", { lane: 0 });
    const cao = mk("cao", { lane: 0 });
    const s = mkState([macaco, cao]);
    const badge = resolveMacaco(s, macaco, primeiro);
    expect(cao.lane).not.toBe(0);
    expect(badge.kind).toBe("movimento");
  });

  it("não move a si próprio", () => {
    const macaco = mk("macaco", { lane: 0 });
    const s = mkState([macaco]);
    const badge = resolveMacaco(s, macaco, primeiro);
    expect(macaco.lane).toBe(0);
    expect(badge.kind).toBe("block");
  });

  it("não move Guerreiros nem Divindades", () => {
    const macaco = mk("macaco", { lane: 0 });
    const guerreiro = mk("carruagem", { lane: 0 });
    const deus = mk("amon", { lane: 0 });
    const s = mkState([macaco, guerreiro, deus]);
    resolveMacaco(s, macaco, primeiro);
    expect([guerreiro.lane, deus.lane]).toEqual([0, 0]);
  });

  it("não move Animais inimigos", () => {
    const macaco = mk("macaco", { lane: 0 });
    const inimigo = mk("cao", { lane: 0, owner: 1 });
    const s = mkState([macaco, inimigo]);
    resolveMacaco(s, macaco, primeiro);
    expect(inimigo.lane).toBe(0);
  });

  it("não move para via cheia: sem destino, o efeito termina sem resultado", () => {
    const macaco = mk("macaco", { lane: 0 });
    const cao = mk("cao", { lane: 0 });
    // Vias 1 e 2 lotadas de Guerreiros: não são destino e não são candidatos.
    const lotar = (lane) => Array.from({ length: 4 }, () => mk("carruagem", { lane }));
    const s = mkState([macaco, cao, ...lotar(1), ...lotar(2)]);
    const badge = resolveMacaco(s, macaco, primeiro);
    expect(cao.lane).toBe(0);
    expect(badge.kind).toBe("block");
  });

  it("escolhe só entre Animais que TÊM para onde ir", () => {
    const macaco = mk("macaco", { lane: 0 });
    const preso = mk("cao", { lane: 1 });                 // vias 0 e 2 cheias
    const livre = mk("cao", { lane: 0 });
    const s = mkState([macaco, preso, livre, ...encher(0, 0, 2), ...encher(2, 0, 4)]);
    resolveMacaco(s, macaco, primeiro);
    expect(preso.lane).toBe(1);
    expect(livre.lane).toBe(1);
  });

  it("o movimento não altera o Poder nem gasta o movimento próprio da carta", () => {
    const macaco = mk("macaco", { lane: 0 });
    const escaravelho = mk("escaravelho", { lane: 0 });
    const s = mkState([macaco, escaravelho]);
    resolveMacaco(s, macaco, primeiro);
    expect(pw(s, escaravelho)).toBe(3);
    expect(escaravelho.moved).toBe(false);
  });
});

/* ==========================================================================
   Hiena do Deserto — +2 por Animal aliado destruído
   ========================================================================== */
describe("Hiena do Deserto", () => {
  it("Animal aliado destruído: +2", () => {
    const hiena = mk("hiena", { lane: 1 });
    const cao = mk("cao", { lane: 0 });
    const s = mkState([hiena, cao]);
    destroyList(s, [cao]);
    expect(pw(s, hiena)).toBe(4);
  });

  it("dois Animais destruídos ao mesmo tempo: +4", () => {
    const hiena = mk("hiena", { lane: 1 });
    const a = mk("cao"), b = mk("token-cabra");
    const s = mkState([hiena, a, b]);
    destroyList(s, [a, b]);
    expect(pw(s, hiena)).toBe(6);
  });

  it("ficha aliada destruída também alimenta", () => {
    const hiena = mk("hiena");
    const ficha = mk("token-ganso");
    const s = mkState([hiena, ficha]);
    destroyList(s, [ficha]);
    expect(pw(s, hiena)).toBe(4);
  });

  it("Animal INIMIGO destruído não alimenta", () => {
    const hiena = mk("hiena");
    const inimigo = mk("cao", { owner: 1 });
    const s = mkState([hiena, inimigo]);
    destroyList(s, [inimigo]);
    expect(pw(s, hiena)).toBe(2);
  });

  it("carta aliada que não é Animal não alimenta", () => {
    const hiena = mk("hiena");
    const guerreiro = mk("carruagem");
    const s = mkState([hiena, guerreiro]);
    destroyList(s, [guerreiro]);
    expect(pw(s, hiena)).toBe(2);
  });

  it("Animal que só MUDA de via não alimenta", () => {
    const hiena = mk("hiena", { lane: 0 });
    const macaco = mk("macaco", { lane: 0 });
    const cao = mk("cao", { lane: 0 });
    const s = mkState([hiena, macaco, cao]);
    resolveMacaco(s, macaco, primeiro);
    expect(pw(s, hiena)).toBe(2);
  });

  it("carta CONSUMIDA (Praga) não conta como destruída", () => {
    const hiena = mk("hiena");
    const praga = mk("peste", { lane: 0 });
    const s = mkState([hiena, praga]);
    consumirCarta(s, praga);
    expect(pw(s, hiena)).toBe(2);
  });

  it("destruída junto com os outros, não ganha bônus depois de sair", () => {
    const hiena = mk("hiena");
    const cao = mk("cao");
    const s = mkState([hiena, cao]);
    destroyList(s, [hiena, cao]);
    expect(hiena.mods).toHaveLength(0);
  });

  it("Hiena ainda oculta não se alimenta", () => {
    const hiena = mk("hiena", { revealed: false });
    const cao = mk("cao");
    const s = mkState([hiena, cao]);
    destroyList(s, [cao]);
    expect(hiena.mods).toHaveLength(0);
  });

  it("duas Hienas comem a mesma morte, e uma conta a outra", () => {
    const h1 = mk("hiena"), h2 = mk("hiena"), cao = mk("cao");
    const s = mkState([h1, h2, cao]);
    destroyList(s, [cao]);
    expect([pw(s, h1), pw(s, h2)]).toEqual([4, 4]);
    destroyList(s, [h1]);                 // Hiena também é Animal
    expect(pw(s, h2)).toBe(6);
  });

  it("o Sobek alimenta a própria Hiena do dono ao sacrificar Animais", () => {
    const hiena = mk("hiena", { lane: 2 });
    const cao = mk("cao", { lane: 0 });
    const s = mkState([hiena, cao]);
    destroyList(s, [cao]);
    expect(pw(s, hiena)).toBe(4);
  });
});

/* ==========================================================================
   Garça do Nilo — CONTÍNUA: +3 por via sua cheia, recontada a cada leitura
   ========================================================================== */
describe("Garça do Nilo", () => {
  // Monta a Garça na via 2 com `n` vias suas cheias. A via 2 usa a própria
  // Garça como quarta carta, então n=3 exige 12 cartas do lado dela.
  const comViasCheias = (n) => {
    const garca = mk("garca", { lane: 2 });
    const extras = [];
    for (let l = 0; l < n; l++) extras.push(...(l === 2 ? encher(2, 0, 3) : encher(l, 0, 4)));
    const s = mkState([...extras, garca]);
    return { s, garca };
  };

  it("zero vias cheias: fica com 2", () => {
    const { s, garca } = comViasCheias(0);
    expect(pw(s, garca)).toBe(2);
  });

  it("uma via cheia: fica com 5", () => {
    const { s, garca } = comViasCheias(1);
    expect(pw(s, garca)).toBe(5);
  });

  it("duas vias cheias: fica com 8", () => {
    const { s, garca } = comViasCheias(2);
    expect(pw(s, garca)).toBe(8);
  });

  it("três vias cheias: fica com 11 — a própria Garça fecha a terceira", () => {
    const { s, garca } = comViasCheias(3);
    expect(contarViasCheias(s.board, 0)).toBe(3);
    expect(pw(s, garca)).toBe(11);
  });

  it("conta qualquer tipo de carta, não só Animais", () => {
    const garca = mk("garca", { lane: 2 });
    const s = mkState([...Array(4).fill(0).map(() => mk("carruagem", { lane: 0 })), garca]);
    expect(pw(s, garca)).toBe(5);
  });

  it("VIA CHEIA EM RODADA POSTERIOR: a Garça cresce sozinha", () => {
    const { s, garca } = comViasCheias(1);
    expect(pw(s, garca)).toBe(5);
    s.board.push(...encher(1, 0, 4));          // outra via fecha depois
    expect(pw(s, garca)).toBe(8);
    s.board.push(...encher(2, 0, 3));          // a via dela fecha por último (ela é a 4ª)
    expect(pw(s, garca)).toBe(11);
  });

  it("via esvaziada depois: o bônus recua junto", () => {
    const { s, garca } = comViasCheias(1);
    expect(pw(s, garca)).toBe(5);
    destroyList(s, [s.board.find((c) => c.lane === 0)]);
    expect(pw(s, garca)).toBe(2);
  });

  it("carta ainda oculta já ocupa o espaço e conta para a via cheia", () => {
    const garca = mk("garca", { lane: 2 });
    const s = mkState([...encher(0, 0, 3), mk("cao", { lane: 0, revealed: false }), garca]);
    expect(pw(s, garca)).toBe(5);
  });

  it("via cheia do INIMIGO não conta", () => {
    const garca = mk("garca", { lane: 2 });
    const s = mkState([...encher(0, 1, 4), ...encher(1, 1, 4), garca]);
    expect(pw(s, garca)).toBe(2);
  });

  it("não grava nada em mods: é aura viva, não bênção", () => {
    const { s, garca } = comViasCheias(2);
    expect(garca.mods).toHaveLength(0);
  });

  it("a Maat desliga a aura na via dela", () => {
    const garca = mk("garca", { lane: 2 });
    const s = mkState([...encher(0, 0, 4), garca, mk("maat", { owner: 1, lane: 2 })]);
    expect(pw(s, garca)).toBe(2);
  });

  it("o Anúbis não apaga o bônus, porque não há bônus gravado para apagar", () => {
    const { s, garca } = comViasCheias(1);
    garca.judged = 2;
    expect(pw(s, garca)).toBe(5);
  });

  it("duas Garças na mesma via leem o mesmo tabuleiro", () => {
    const g1 = mk("garca", { lane: 2 }), g2 = mk("garca", { lane: 2 });
    const s = mkState([...encher(0, 0, 4), g1, g2]);
    expect([pw(s, g1), pw(s, g2)]).toEqual([5, 5]);
  });
});

/* ==========================================================================
   Domador de Animais — Aura contínua
   ========================================================================== */
describe("Domador de Animais", () => {
  it("um Domador dá +2 aos seus Animais, em todas as vias", () => {
    const s = mkState([mk("domador", { lane: 0 }), mk("cao", { lane: 2 }), mk("token-cabra", { lane: 1 })]);
    expect(pw(s, s.board[1])).toBe(3);
    expect(pw(s, s.board[2])).toBe(3);
  });

  it("dois Domadores acumulam: +4", () => {
    const s = mkState([mk("domador"), mk("domador"), mk("cao")]);
    expect(pw(s, s.board[2])).toBe(5);
  });

  it("destruir um dos dois devolve apenas 2 de Poder", () => {
    const d1 = mk("domador"), cao = mk("cao");
    const s = mkState([d1, mk("domador"), cao]);
    expect(pw(s, cao)).toBe(5);
    destroyList(s, [d1]);
    expect(pw(s, cao)).toBe(3);
  });

  it("a Aura some por inteiro quando o Domador sai", () => {
    const d = mk("domador"), cao = mk("cao");
    const s = mkState([d, cao]);
    destroyList(s, [d]);
    expect(pw(s, cao)).toBe(1);
  });

  it("não fortalece Guerreiros, Divindades nem a si mesmo", () => {
    const s = mkState([mk("domador"), mk("carruagem"), mk("amon")]);
    expect(pw(s, s.board[0])).toBe(2 + 1);   // 2 impresso + 1 do Amon aliado
    expect(pw(s, s.board[1])).toBe(6 + 1);
  });

  it("não fortalece Animais inimigos", () => {
    const s = mkState([mk("domador"), mk("cao", { owner: 1 })]);
    expect(pw(s, s.board[1])).toBe(1);
  });

  it("alcança Animais que entram depois", () => {
    const s = mkState([mk("domador")]);
    const novo = mk("cao");
    s.board.push(novo);
    expect(pw(s, novo)).toBe(3);
  });

  it("Domador oculto ainda não vale", () => {
    const s = mkState([mk("domador", { revealed: false }), mk("cao")]);
    expect(pw(s, s.board[1])).toBe(1);
  });

  it("Maat anula a Aura na via dela, como faz com o Montu", () => {
    const s = mkState([mk("domador"), mk("cao"), mk("maat", { owner: 1 })]);
    expect(pw(s, s.board[1])).toBe(1);
  });

  it("Montu continua valendo só para Guerreiros e não toca em Animais", () => {
    const s = mkState([mk("montu"), mk("cao"), mk("carruagem")]);
    expect(pw(s, s.board[1])).toBe(1);
    expect(pw(s, s.board[2])).toBe(8);
  });

  it("Domador e Montu convivem, cada um com a própria parcela nomeada", () => {
    const s = mkState([mk("domador"), mk("montu"), mk("cao"), mk("carruagem")]);
    expect(pw(s, s.board[2])).toBe(3);      // Animal: só o Domador
    expect(pw(s, s.board[3])).toBe(8);      // Guerreiro: só o Montu
  });
});

/* ==========================================================================
   Touro Ápis — +1 por outro Animal em jogo
   ========================================================================== */
describe("Touro Ápis", () => {
  it("sem outros Animais: entra com 7", () => {
    const apis = mk("apis");
    const s = mkState([apis]);
    const badge = resolveApis(s, apis);
    expect(pw(s, apis)).toBe(7);
    expect(badge.kind).toBe("block");
  });

  it("com três outros Animais: entra com 10", () => {
    const apis = mk("apis");
    const s = mkState([mk("cao"), mk("cao", { lane: 1 }), mk("cao", { lane: 2 }), apis]);
    resolveApis(s, apis);
    expect(pw(s, apis)).toBe(10);
  });

  it("conta Animais inimigos e fichas", () => {
    const apis = mk("apis");
    const s = mkState([mk("cao", { owner: 1 }), mk("token-ganso", { owner: 1 }), apis]);
    resolveApis(s, apis);
    expect(pw(s, apis)).toBe(9);
  });

  it("não conta a si próprio nem outros tipos", () => {
    const apis = mk("apis");
    const s = mkState([mk("carruagem"), mk("domador"), apis]);
    resolveApis(s, apis);
    // Nenhum outro Animal em jogo: o +1 que aparece é a Aura do Domador,
    // que é contínua e independe do Ao Entrar.
    expect(apis.mods).toHaveLength(0);
    expect(pw(s, apis)).toBe(9);
  });

  it("não conta Animais ocultos nem os que estão saindo", () => {
    const apis = mk("apis");
    const s = mkState([mk("cao", { revealed: false }), mk("cao", { dying: 1 }), mk("cao"), apis]);
    resolveApis(s, apis);
    expect(pw(s, apis)).toBe(8);
  });

  it("o bônus é permanente: Animais que entram depois não aumentam", () => {
    const apis = mk("apis");
    const s = mkState([mk("cao"), apis]);
    resolveApis(s, apis);
    s.board.push(mk("cao"), mk("cao"));
    expect(pw(s, apis)).toBe(8);
  });

  it("Animais destruídos depois não reduzem", () => {
    const cao = mk("cao");
    const apis = mk("apis");
    const s = mkState([cao, apis]);
    resolveApis(s, apis);
    destroyList(s, [cao]);
    expect(pw(s, apis)).toBe(8);
  });

  it("soma-se à Aura do Domador em vez de a substituir", () => {
    const apis = mk("apis");
    const s = mkState([mk("domador"), mk("cao"), apis]);
    resolveApis(s, apis);                  // +1 (só o Cão é Animal)
    expect(pw(s, apis)).toBe(10);          // 7 + 1 (Ápis) + 2 (Domador)
  });
});

/* ==========================================================================
   Integração pela partida: place → startReveal → autoReveal
   ========================================================================== */
describe("arquétipo Animal na partida", () => {
  const jogar = (keys, over = {}) => {
    const lista = Array(12).fill("cao");
    const s = freshMatch([lista, lista], { rng: () => 0 });
    Object.assign(s, { energy: [12, 12], hand: [keys.map((k) => ({ hid: nextUid(), key: k, printed: byKey[k].poder, baked: 0 })), []] }, over);
    return s;
  };
  const revelar = (s) => autoReveal(s, { rng: () => 0 }).state;

  it("o Ganso revela, invoca a ficha e a ficha NÃO invoca outra", () => {
    let s = jogar(["ganso"]);
    s = applyAction(s, { t: "place", side: 0, hid: s.hand[0][0].hid, lane: 0 }).state;
    s = applyAction(s, { t: "startReveal" }).state;
    s = revelar(s);
    expect(s.board.filter((c) => c.key === "ganso")).toHaveLength(1);
    expect(s.board.filter((c) => c.key === "token-ganso")).toHaveLength(1);
  });

  it("Rebanho + Domador: as Cabras valem 3 e o tabuleiro fica com 4 cartas", () => {
    let s = jogar(["domador", "rebanho"]);
    s = applyAction(s, { t: "place", side: 0, hid: s.hand[0][0].hid, lane: 0 }).state;
    s = applyAction(s, { t: "place", side: 0, hid: s.hand[0][0].hid, lane: 1 }).state;
    s = applyAction(s, { t: "startReveal" }).state;
    s = revelar(s);
    const cabras = s.board.filter((c) => c.key === "token-cabra");
    expect(cabras).toHaveLength(2);
    for (const c of cabras) expect(power(c, ctxOf(s))).toBe(3);
    expect(s.board).toHaveLength(4);
  });

  it("Cão + Cabra do Nilo na mesma via: a Cabra revela com 2", () => {
    let s = jogar(["cao", "cabra-nilo"]);
    s = applyAction(s, { t: "place", side: 0, hid: s.hand[0][0].hid, lane: 0 }).state;
    s = applyAction(s, { t: "place", side: 0, hid: s.hand[0][0].hid, lane: 0 }).state;
    s = applyAction(s, { t: "startReveal" }).state;
    s = revelar(s);
    const cabra = s.board.find((c) => c.key === "cabra-nilo");
    expect(power(cabra, ctxOf(s))).toBe(2);
  });

  it("o Selo do Silêncio bloqueia o Ao Entrar do Ápis", () => {
    let s = jogar(["apis"]);
    s.board.push({
      uid: nextUid(), key: "selo", owner: 1, lane: 0, printed: 3, baked: 0, mods: [],
      revealed: true, dying: false, entryPlays: 0, enteredRound: 0, moved: false,
    });
    s.board.push({
      uid: nextUid(), key: "cao", owner: 0, lane: 1, printed: 1, baked: 0, mods: [],
      revealed: true, dying: false, entryPlays: 0, enteredRound: 0, moved: false,
    });
    s = applyAction(s, { t: "place", side: 0, hid: s.hand[0][0].hid, lane: 0 }).state;
    s = applyAction(s, { t: "startReveal" }).state;
    s = revelar(s);
    const apis = s.board.find((c) => c.key === "apis");
    expect(power(apis, ctxOf(s))).toBe(7);   // sem o +1 do Cão
  });

  it("o estado da partida sobrevive a um round-trip de JSON com fichas e bônus", () => {
    let s = jogar(["domador", "rebanho"]);
    s = applyAction(s, { t: "place", side: 0, hid: s.hand[0][0].hid, lane: 0 }).state;
    s = applyAction(s, { t: "place", side: 0, hid: s.hand[0][0].hid, lane: 1 }).state;
    s = applyAction(s, { t: "startReveal" }).state;
    s = revelar(s);
    const antes = s.board.map((c) => power(c, ctxOf(s)));
    const depois = JSON.parse(JSON.stringify(s));
    expect(depois.board.map((c) => power(c, ctxOf(depois)))).toEqual(antes);
  });
});
