import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, emJogo, validTargets, resetUid, nextUid,
  resolveSobek, resolveArmadura, resolveSekhmet, resolveAfogamento,
  resolveDestroyOwnLane, resolveDestroyAllOfTypeInLane, resolveSet,
  ocupacaoDaVia, viaCheia,
} from "./engine.js";

/* ==========================================================================
   REGRA DA REVELAÇÃO

   Uma carta só existe para os efeitos das outras depois de revelada. A regra é
   ÚNICA: vale para os dois lados, inclusive para as cartas do próprio dono do
   efeito. Este arquivo cobre cada ponto do motor que escolhe alvo, para que a
   regra não escape por um filtro esquecido.
   ========================================================================== */

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked: 0, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});
const mkState = (board = [], over = {}) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], deck: [[], []], round: 1,
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], trace: [], destroyedPower: [0, 0], ...over,
});

beforeEach(resetUid);

describe("emJogo — o predicado único", () => {
  it("exige revelada E não-morrendo", () => {
    expect(emJogo(mk("servo"))).toBe(true);
    expect(emJogo(mk("servo", { revealed: false }))).toBe(false);
    expect(emJogo(mk("servo", { dying: 3 }))).toBe(false);
  });
});

describe("mira escolhida — validTargets", () => {
  it("aliada ainda oculta não pode ser escolhida", () => {
    const hathor = mk("hathor");
    const oculta = mk("colosso", { revealed: false });
    const board = [hathor, oculta];
    expect(validTargets(hathor, "ally", board)).toEqual([]);
  });

  it("inimiga ainda oculta não pode ser escolhida", () => {
    const alvo = mk("sekhmet");
    const oculta = mk("colosso", { owner: 1, revealed: false });
    expect(validTargets(alvo, "enemy", [alvo, oculta])).toEqual([]);
  });

  it("revelada na mesma via continua alvo legítimo", () => {
    const hathor = mk("hathor");
    const pronta = mk("colosso");
    expect(validTargets(hathor, "ally", [hathor, pronta]).map((c) => c.uid)).toEqual([pronta.uid]);
  });
});

describe("destruição do próprio lado — a regra não abre exceção para aliados", () => {
  it("Sobek não devora a aliada que ainda não revelou", () => {
    const sobek = mk("sobek");
    const oculta = mk("servo", { revealed: false });
    const s = mkState([sobek, oculta]);
    const fx = resolveSobek(s, sobek);
    expect(oculta.dying).toBeFalsy();
    expect(fx.text).toBe("sozinho");
  });

  it("Sobek devora normalmente a aliada já revelada", () => {
    const sobek = mk("sobek");
    const pronta = mk("servo");
    const s = mkState([sobek, pronta]);
    resolveSobek(s, sobek);
    expect(pronta.dying).toBeTruthy();
  });

  it("Armadura de Ptah não se funde com aliada oculta — permanece em campo", () => {
    const arm = mk("armadura");
    const oculta = mk("colosso", { revealed: false });
    const s = mkState([arm, oculta]);
    const fx = resolveArmadura(s, arm);
    expect(fx.text).toBe("sem fusão");
    expect(arm.dying).toBeFalsy();
    expect(oculta.mods).toEqual([]);
  });

  it("destruição da própria via poupa a aliada oculta", () => {
    const fonte = mk("apofis");
    const oculta = mk("servo", { revealed: false });
    const pronta = mk("servo");
    const s = mkState([fonte, oculta, pronta]);
    resolveDestroyOwnLane(s, fonte, false);
    expect(oculta.dying).toBeFalsy();
    expect(pronta.dying).toBeTruthy();
  });
});

describe("varreduras — Sekhmet e Assassino Medjay", () => {
  it("Sekhmet não varre a carta de custo certo que ainda não revelou", () => {
    const sekhmet = mk("sekhmet");
    const oculta = mk("lanceiro", { owner: 1, revealed: false });  // custo 2
    const pronta = mk("lanceiro", { owner: 1, lane: 2 });
    const s = mkState([sekhmet, oculta, pronta]);
    resolveSekhmet(s, sekhmet, 2);
    expect(oculta.dying).toBeFalsy();
    expect(pronta.dying).toBeTruthy();
  });

  it("Sekhmet sem nenhuma revelada no custo devolve sem alvo", () => {
    const sekhmet = mk("sekhmet");
    const oculta = mk("lanceiro", { owner: 1, revealed: false });
    const s = mkState([sekhmet, oculta]);
    expect(resolveSekhmet(s, sekhmet, 2).kind).toBe("block");
  });

  it("Assassino Medjay não alcança o Guerreiro ainda oculto", () => {
    const medjay = mk("assassino-medjay");
    const oculto = mk("colosso", { owner: 1, revealed: false });
    const exposto = mk("colosso", { owner: 1 });
    const s = mkState([medjay, oculto, exposto]);
    resolveDestroyAllOfTypeInLane(s, medjay, "Guerreiro");
    expect(oculto.dying).toBeFalsy();
    expect(exposto.dying).toBeTruthy();
  });
});

describe("Dilúvio de Hápi — a água só sobe onde já revelou", () => {
  it("poupa a oculta e afoga a revelada da mesma faixa", () => {
    const dil = mk("diluvio");
    const oculta = mk("bennu", { owner: 1, revealed: false });   // custo 1
    const exposta = mk("bennu", { owner: 1 });
    const s = mkState([dil, oculta, exposta]);
    resolveAfogamento(s, dil);
    expect(oculta.dying).toBeFalsy();
    expect(exposta.dying).toBeTruthy();
  });
});

describe("Set — dispersão também respeita a revelação", () => {
  it("não empurra inimiga que ainda não revelou", () => {
    const set = mk("set");
    const oculta = mk("colosso", { owner: 1, revealed: false });
    const s = mkState([set, oculta]);
    resolveSet(s, set, () => 0);
    expect(oculta.lane).toBe(0);
  });
});

describe("exceção deliberada — o espaço da via", () => {
  it("carta oculta OCUPA a via, mesmo estando fora de alcance dos efeitos", () => {
    const board = [
      mk("servo", { revealed: false }), mk("servo", { revealed: false }),
      mk("servo", { revealed: false }), mk("servo", { revealed: false }),
    ];
    expect(ocupacaoDaVia(board, 0, 0)).toBe(4);
    expect(viaCheia(board, 0, 0)).toBe(true);
  });
});

/* ==========================================================================
   PONTA A PONTA — a regra atravessando o fluxo real de revelação

   Os testes acima chamam os resolvedores direto. Estes passam pelo `step()`,
   que é onde a PRIORIDADE e a ordem de colocação entram: é aqui que se vê a
   camada de estratégia que a regra cria.

   Atenção ao critério: a carta destruída é PURGADA do tabuleiro no passo
   seguinte, então quem sobreviveu se verifica por presença, não por `dying`.
   ========================================================================== */
import { applyAction, autoReveal } from "./match.js";

const posta = (key, o = {}) => ({
  uid: nextUid(), key, owner: 0, lane: 0, printed: byKey[key].poder, baked: 0,
  mods: [], revealed: false, dying: false, pendentes: 0, entryPlays: 0, enteredRound: 1, moved: false, ...o,
});
const mkMatch = (over = {}) => ({
  round: 1, energy: [6, 6], board: [], deaths: [0, 0], plays: [0, 0],
  pendingEnergy: [0, 0], pendingReturn: [], pendingBuff: [null, null], blessings: [],
  deck: [[], []], hand: [[], []], seen: [0, 0],
  priority: 0, priorityReason: "teste", phase: "plan", queue: [],
  lastReveal: null, effect: null, effectSeq: 0, awaitingAim: null,
  log: [], trace: [], finished: false, ...over,
});
const revelarTudo = (s) => autoReveal(applyAction(s, { t: "startReveal" }).state).state;
const vivo = (s, uid) => s.board.some((c) => c.uid === uid && !c.dying);

describe("prioridade deixa de ser vantagem pura", () => {
  // Sekhmet destrói custo 1 em jogo; o Arqueiro Núbio custa 1.
  it("quem revela primeiro NÃO acerta a carta que o oponente jogou na mesma rodada", () => {
    const sekhmet = posta("sekhmet", { owner: 0 });
    const alvo = posta("arqueiro", { owner: 1 });
    const s = revelarTudo(mkMatch({ board: [sekhmet, alvo], priority: 0 }));
    expect(vivo(s, alvo.uid)).toBe(true);
  });

  it("mas acerta a que já estava em campo desde a rodada anterior", () => {
    const sekhmet = posta("sekhmet", { owner: 0 });
    const velho = posta("arqueiro", { owner: 1, revealed: true, enteredRound: 0 });
    const s = revelarTudo(mkMatch({ round: 2, board: [sekhmet, velho], priority: 0 }));
    expect(vivo(s, velho.uid)).toBe(false);
  });

  it("sem prioridade o mesmo efeito alcança: o oponente já revelou tudo dele", () => {
    const sekhmet = posta("sekhmet", { owner: 0 });
    const alvo = posta("arqueiro", { owner: 1 });
    const s = revelarTudo(mkMatch({ board: [sekhmet, alvo], priority: 1 }));
    expect(vivo(s, alvo.uid)).toBe(false);
  });
});

describe("dentro do próprio lado, a ordem de colocação vira decisão", () => {
  it("Sobek colocado ANTES do aliado entra sozinho", () => {
    const sobek = posta("sobek", { owner: 0 });
    const depois = posta("servo", { owner: 0 });
    const s = revelarTudo(mkMatch({ board: [sobek, depois], priority: 0 }));
    expect(vivo(s, depois.uid)).toBe(true);
    expect(s.board.find((c) => c.uid === sobek.uid).mods).toEqual([]);
  });

  it("Sobek colocado DEPOIS do aliado devora e cresce", () => {
    const antes = posta("servo", { owner: 0 });
    const sobek = posta("sobek", { owner: 0 });
    const s = revelarTudo(mkMatch({ board: [antes, sobek], priority: 0 }));
    expect(vivo(s, antes.uid)).toBe(false);
    expect(s.board.find((c) => c.uid === sobek.uid).mods[0].val).toBe(1);
  });
});
