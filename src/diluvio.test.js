import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, resolveAfogamento, resolveSekhmet, resolveDestroyAllOfTypeInLane,
  resetUid, nextUid, CARDS, validTargets,
} from "./engine.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked: 0, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = [], over = {}) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], deck: [[], []], round: 1,
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0], ...over,
});
const mortas = (s) => s.board.filter((c) => c.dying).map((c) => c.key).sort();

beforeEach(resetUid);

/* ==========================================================================
   DILÚVIO DE HÁPI — 5/5, afoga custo 1 e 2 na via, dos dois lados
   ========================================================================== */
describe("Dilúvio de Hápi — estatística", () => {
  it("é 5 de custo e 5 de Poder", () => {
    expect(byKey["diluvio"].custo).toBe(5);
    expect(byKey["diluvio"].poder).toBe(5);
  });

  it("declara a faixa de custo que afoga", () => {
    expect(byKey["diluvio"].afogaCusto).toEqual([1, 2]);
    expect(byKey["diluvio"].sacrificeAll).toBeUndefined();   // não é mais sacrifício da própria via
  });
});

describe("Dilúvio de Hápi — a quem alcança", () => {
  it("afoga custo 1 e custo 2, e poupa custo 0 e custo 3", () => {
    const dil = mk("diluvio");
    const s = mkState([
      dil,
      mk("cao"),          // custo 0 — sobrevive
      mk("bennu"),        // custo 1 — afoga
      mk("hiena"),        // custo 2 — afoga
      mk("carruagem"),    // custo 3 — sobrevive
    ]);
    resolveAfogamento(s, dil);
    expect(mortas(s)).toEqual(["bennu", "hiena"]);
  });

  it("pega os DOIS lados da via", () => {
    const dil = mk("diluvio");
    // Nada de Gato aqui: ele protegeria o próprio lado e mascararia o teste.
    const meu = mk("bennu"), dele = mk("hiena", { owner: 1 });
    const s = mkState([dil, meu, dele]);
    resolveAfogamento(s, dil);
    expect(meu.dying).toBeTruthy();
    expect(dele.dying).toBeTruthy();
    expect(s.deaths).toEqual([1, 1]);
  });

  it("não toca em outras vias", () => {
    const dil = mk("diluvio", { lane: 1 });
    const fora = mk("hiena", { lane: 0 }), dentro = mk("hiena", { lane: 1 });
    const s = mkState([dil, fora, dentro]);
    resolveAfogamento(s, dil);
    expect(fora.dying).toBeFalsy();
    expect(dentro.dying).toBeTruthy();
  });

  it("afoga cartas ainda ocultas: a água não espera revelação", () => {
    const dil = mk("diluvio");
    const oculta = mk("gato", { owner: 1, revealed: false });
    const s = mkState([dil, oculta]);
    resolveAfogamento(s, dil);
    expect(oculta.dying).toBeTruthy();
  });

  it("sem alvo na faixa: badge de bloqueio e ninguém morre", () => {
    const dil = mk("diluvio");
    const s = mkState([dil, mk("carruagem"), mk("cao")]);
    const fx = resolveAfogamento(s, dil);
    expect(fx.kind).toBe("block");
    expect(mortas(s)).toEqual([]);
  });

  it("fichas de custo 1 afundam; as de custo 0, não", () => {
    const dil = mk("diluvio");
    const gafanhoto = mk("token-gafanhoto");    // custo 1
    const cabra = mk("token-cabra");            // custo 0
    const s = mkState([dil, gafanhoto, cabra]);
    resolveAfogamento(s, dil);
    expect(gafanhoto.dying).toBeTruthy();
    expect(cabra.dying).toBeFalsy();
  });
});

describe("Dilúvio de Hápi — custo modificado", () => {
  it("segue o custo ATUAL, não o impresso: carta agravada entra na faixa", () => {
    const dil = mk("diluvio");
    const agravada = mk("cao", { owner: 1, custoMod: 2 });   // 0 + 2 = 2
    const s = mkState([dil, agravada]);
    resolveAfogamento(s, dil);
    expect(agravada.dying).toBeTruthy();
  });

  it("carta encarecida para fora da faixa escapa", () => {
    const dil = mk("diluvio");
    const escapou = mk("gato", { owner: 1, custoMod: 2 });   // 2 + 2 = 4
    const s = mkState([dil, escapou]);
    resolveAfogamento(s, dil);
    expect(escapou.dying).toBeFalsy();
  });

  it("AFUNDA A SI MESMO se o próprio custo cair para a faixa", () => {
    const dil = mk("diluvio", { custoMod: -3 });             // 5 - 3 = 2
    const s = mkState([dil, mk("gato", { owner: 1 })]);
    const fx = resolveAfogamento(s, dil);
    expect(dil.dying).toBeTruthy();
    expect(fx.kind).toBe("sac");
  });

  it("com custo intacto, não se afoga", () => {
    const dil = mk("diluvio");
    const s = mkState([dil, mk("gato", { owner: 1 })]);
    resolveAfogamento(s, dil);
    expect(dil.dying).toBeFalsy();
  });
});

describe("Dilúvio de Hápi — o Gato Egípcio protege", () => {
  it("o Gato inimigo blinda a via dele inteira", () => {
    const dil = mk("diluvio");
    const gato = mk("gato", { owner: 1 });
    const bennu = mk("bennu", { owner: 1 });
    const s = mkState([dil, gato, bennu]);
    const fx = resolveAfogamento(s, dil);
    expect(gato.dying).toBeFalsy();
    expect(bennu.dying).toBeFalsy();
    expect(fx.kind).toBe("block");
  });

  it("o Gato INIMIGO não abriga o meu lado: só cobre a via dele mesmo", () => {
    const dil = mk("diluvio");
    const minhaBarata = mk("bennu");
    const s = mkState([dil, minhaBarata, mk("gato", { owner: 1 })]);
    resolveAfogamento(s, dil);
    expect(minhaBarata.dying).toBeTruthy();
  });

  /* O Dilúvio é INDISCRIMINADO: o Gato abriga contra a água, não contra o
     adversário. Por isso vale também contra o Dilúvio do próprio dono — é a
     única carta do jogo com esse tratamento (`ignoraDono`). */
  it("o MEU Gato me protege até do MEU próprio Dilúvio", () => {
    const dil = mk("diluvio");
    const meuGato = mk("gato");
    const minhaBarata = mk("bennu");
    const s = mkState([dil, meuGato, minhaBarata]);
    resolveAfogamento(s, dil);
    expect(meuGato.dying).toBeFalsy();
    expect(minhaBarata.dying).toBeFalsy();
  });

  it("cada lado é abrigado pelo Gato do SEU lado, não pelo do vizinho", () => {
    const dil = mk("diluvio");
    const meuGato = mk("gato");
    const minhaBarata = mk("bennu");
    const dele = mk("hiena", { owner: 1 });        // lado 1 sem Gato
    const s = mkState([dil, meuGato, minhaBarata, dele]);
    resolveAfogamento(s, dil);
    expect(minhaBarata.dying).toBeFalsy();
    expect(dele.dying).toBeTruthy();
  });

  it("com Gato dos dois lados, o Dilúvio não afoga ninguém", () => {
    const dil = mk("diluvio");
    const s = mkState([dil, mk("gato"), mk("bennu"), mk("gato", { owner: 1 }), mk("hiena", { owner: 1 })]);
    const fx = resolveAfogamento(s, dil);
    expect(mortas(s)).toEqual([]);
    expect(fx.kind).toBe("block");
  });

  it("a Hathor continua abençoando aliados numa via com Gato", () => {
    // Prova de que `ignoraDono` é local ao Dilúvio e não vazou para a regra geral.
    const gato = mk("gato");
    const aliado = mk("cao");
    const hathor = mk("hathor");
    const s = mkState([gato, aliado, hathor]);
    expect(validTargets(hathor, "ally", s.board).map((c) => c.key).sort()).toEqual(["cao", "gato"]);
  });

  it("Gato ainda OCULTO não abriga: aura só vale depois de revelada", () => {
    const dil = mk("diluvio");
    const gato = mk("gato", { owner: 1, revealed: false });
    const junto = mk("bennu", { owner: 1, revealed: false });
    const s = mkState([dil, gato, junto]);
    resolveAfogamento(s, dil);
    expect(gato.dying).toBeTruthy();
    expect(junto.dying).toBeTruthy();
  });

  it("Gato numa via, Dilúvio na outra: a proteção não atravessa", () => {
    const dil = mk("diluvio", { lane: 0 });
    const gato = mk("gato", { owner: 1, lane: 1 });
    const exposta = mk("bennu", { owner: 1, lane: 0 });
    const s = mkState([dil, gato, exposta]);
    resolveAfogamento(s, dil);
    expect(exposta.dying).toBeTruthy();
  });
});

describe("Dilúvio de Hápi — interações", () => {
  it("a Múmia devolvida à mão aparece no log de retorno", () => {
    const dil = mk("diluvio");
    const mumia = mk("mumia", { owner: 1 });
    const s = mkState([dil, mumia]);
    expect(byKey["mumia"].custo).toBeLessThanOrEqual(2);
    resolveAfogamento(s, dil);
    expect(mumia.dying).toBeTruthy();
    expect(s.pendingReturn.length + s.hand[1].length).toBeGreaterThan(0);
  });

  it("o Bennu afogado renasce: a cheia não impede o ciclo", () => {
    const dil = mk("diluvio");
    const bennu = mk("bennu", { owner: 1 });
    const s = mkState([dil, bennu]);
    resolveAfogamento(s, dil);
    expect(s.pendingReturn.some((r) => r.owner === 1)).toBe(true);
    expect(s.pendingEnergy[1]).toBe(1);
  });

  it("alimenta a Hiena do dono ao afogar os Animais dele", () => {
    const dil = mk("diluvio");
    const hiena = mk("hiena", { lane: 1 });      // custo 2, mas fora da via
    const s = mkState([dil, mk("macaco"), hiena]);   // Macaco: custo 2, Animal
    resolveAfogamento(s, dil);
    expect(power(hiena, ctxOf(s))).toBe(4);
    expect(hiena.dying).toBeFalsy();
  });

  it("continua distinto da Sekhmet: ela varre UM custo no tabuleiro inteiro", () => {
    const sek = mk("sekhmet", { lane: 2 });
    const longe = mk("gato", { owner: 1, lane: 0 });
    const s = mkState([sek, longe]);
    resolveSekhmet(s, sek, 2);
    expect(longe.dying).toBeTruthy();           // atravessa vias; o Dilúvio não
  });

  it("continua distinto da Peste: ela varre um TIPO na via, sem olhar custo", () => {
    const praga = mk("peste");
    const caro = mk("apis", { owner: 1 });      // custo 6, Animal
    const s = mkState([praga, caro]);
    resolveDestroyAllOfTypeInLane(s, praga, "Animal", { escopo: "inimigos" });
    expect(caro.dying).toBeTruthy();            // custo alto não salva; do Dilúvio, salvaria
  });
});
