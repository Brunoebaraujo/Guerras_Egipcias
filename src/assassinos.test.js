import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, marcarVeneno, aplicarVeneno, totalVeneno,
  resolveAssassino, resolveSemerj, resolveSeqerMau,
  resetUid, nextUid,
} from "./engine.js";

const mk = (key, { owner = 0, lane = 0, revealed = true, mods = [], baked = 0, ...rest } = {}) => ({
  uid: nextUid(), key, owner, lane, revealed, dying: false,
  printed: byKey[key].poder, baked, mods, entryPlays: 0, enteredRound: 1, moved: false, ...rest,
});

const mkState = (board = []) => ({
  board, deaths: [0, 0], plays: [0, 0], hand: [[], []], round: 1,
  pendingEnergy: [0, 0], pendingReturn: [], effectSeq: 1, log: [], destroyedPower: [0, 0],
});

beforeEach(resetUid);

/* --------------------------- Modelo de marcas ------------------------------- */
describe("Veneno — modelo de marcas acumuladas", () => {
  it("marcas se acumulam numa lista (não sobrescrevem)", () => {
    const alvo = mk("servo", { owner: 1 });
    const s = mkState([alvo]);

    marcarVeneno(s, alvo, 1, "Sicário");
    marcarVeneno(s, alvo, 1, "Senti");
    marcarVeneno(s, alvo, 2, "Hemsu");

    expect(alvo.venenos).toEqual([1, 1, 2]);
    expect(totalVeneno(alvo)).toBe(4);
  });

  it("aplicarVeneno desconta a SOMA de todas as marcas por rodada", () => {
    const alvo = mk("guardareal", { owner: 1, venenos: [1, 1, 2] }); // guarda 8/8, -4
    const s = mkState([alvo]);

    aplicarVeneno(s);

    expect(power(alvo, ctxOf(s))).toBe(byKey["guardareal"].poder - 4);
  });

  it("marca não sobrescreve mesmo com nível menor (acumula)", () => {
    const alvo = mk("servo", { owner: 1, venenos: [3] });
    const s = mkState([alvo]);

    marcarVeneno(s, alvo, 1, "Sicário");

    expect(alvo.venenos).toEqual([3, 1]);
    expect(totalVeneno(alvo)).toBe(4);
  });

  it("não marca cartas mortas/dying", () => {
    const alvo = mk("servo", { owner: 1, dying: 1 });
    const s = mkState([alvo]);

    marcarVeneno(s, alvo, 2, "Hemsu");

    expect(alvo.venenos).toBeUndefined();
  });
});

/* ------------------------------ Sicário/Hemsu/Akhu -------------------------- */
describe("Assassinos de alvo único", () => {
  it("Sicário marca 1 alvo com Veneno I", () => {
    const sicario = mk("sicario");
    const alvo = mk("servo", { owner: 1 });
    const s = mkState([sicario, alvo]);

    resolveAssassino(s, sicario);

    expect(alvo.venenos).toEqual([1]);
  });

  it("Hemsu marca 1 alvo com Veneno II", () => {
    const hemsu = mk("hemsu");
    const alvo = mk("lanceiro", { owner: 1 });
    const s = mkState([hemsu, alvo]);

    resolveAssassino(s, hemsu);

    expect(alvo.venenos).toEqual([2]);
  });

  it("Akhu marca 1 alvo com Veneno III", () => {
    const akhu = mk("akhu");
    const alvo = mk("general", { owner: 1 });
    const s = mkState([akhu, alvo]);

    resolveAssassino(s, akhu);

    expect(alvo.venenos).toEqual([3]);
  });

  it("só afeta inimigos na mesma via", () => {
    const sicario = mk("sicario", { lane: 0 });
    const aliado = mk("servo", { owner: 0, lane: 0 });
    const inimigo_outra_via = mk("arqueiro", { owner: 1, lane: 1 });
    const s = mkState([sicario, aliado, inimigo_outra_via]);

    const effect = resolveAssassino(s, sicario);

    expect(effect.kind).toBe("block");
    expect(aliado.venenos).toBeUndefined();
    expect(inimigo_outra_via.venenos).toBeUndefined();
  });
});

/* ------------------------------ Senti (2 alvos) ----------------------------- */
describe("Senti — marca 2 alvos", () => {
  it("marca 2 cartas distintas com Veneno I", () => {
    const senti = mk("senti");
    const a1 = mk("servo", { owner: 1 });
    const a2 = mk("arqueiro", { owner: 1 });
    const s = mkState([senti, a1, a2]);

    resolveAssassino(s, senti);

    expect(a1.venenos).toEqual([1]);
    expect(a2.venenos).toEqual([1]);
  });

  it("marca só 1 se houver apenas 1 inimigo na via", () => {
    const senti = mk("senti");
    const a1 = mk("servo", { owner: 1 });
    const s = mkState([senti, a1]);

    resolveAssassino(s, senti);

    expect(a1.venenos).toEqual([1]);
  });

  it("nunca marca a mesma carta duas vezes (alvos distintos)", () => {
    const senti = mk("senti");
    const a1 = mk("servo", { owner: 1 });
    const a2 = mk("arqueiro", { owner: 1 });
    const a3 = mk("lanceiro", { owner: 1 });
    const s = mkState([senti, a1, a2, a3]);

    resolveAssassino(s, senti);

    const marcados = [a1, a2, a3].filter((c) => c.venenos && c.venenos.length > 0);
    expect(marcados).toHaveLength(2);
    for (const c of marcados) expect(c.venenos).toEqual([1]);
  });
});

/* ------------------------------ Semerj (replica) ---------------------------- */
describe("Semerj — replica venenos para outras vias", () => {
  it("distribui os venenos da via para cartas de outras vias, 1 por carta", () => {
    const semerj = mk("semerj", { lane: 0 });
    // Via de origem (0): 3 marcas — 2×Veneno I e 1×Veneno II
    const o1 = mk("servo", { owner: 1, lane: 0, venenos: [1] });
    const o2 = mk("arqueiro", { owner: 1, lane: 0, venenos: [1] });
    const o3 = mk("lanceiro", { owner: 1, lane: 0, venenos: [2] });
    // Outras vias: 3 cartas
    const t1 = mk("servo", { owner: 1, lane: 1 });
    const t2 = mk("arqueiro", { owner: 1, lane: 1 });
    const t3 = mk("lanceiro", { owner: 1, lane: 2 });
    const s = mkState([semerj, o1, o2, o3, t1, t2, t3]);

    resolveSemerj(s, semerj);

    // marcas [1,1,2] distribuídas em ordem: t1←1, t2←1, t3←2
    expect(t1.venenos).toEqual([1]);
    expect(t2.venenos).toEqual([1]);
    expect(t3.venenos).toEqual([2]);
  });

  it("com menos alvos que marcas, aplica só as primeiras marcas", () => {
    const semerj = mk("semerj", { lane: 0 });
    const o1 = mk("servo", { owner: 1, lane: 0, venenos: [1] });
    const o2 = mk("arqueiro", { owner: 1, lane: 0, venenos: [2] });
    const o3 = mk("lanceiro", { owner: 1, lane: 0, venenos: [3] });
    const t1 = mk("servo", { owner: 1, lane: 1 }); // só 1 alvo
    const s = mkState([semerj, o1, o2, o3, t1]);

    resolveSemerj(s, semerj);

    // Só a primeira marca (1) é aplicada
    expect(t1.venenos).toEqual([1]);
  });

  it("não distribui na própria via de origem", () => {
    const semerj = mk("semerj", { lane: 0 });
    const origem = mk("servo", { owner: 1, lane: 0, venenos: [2] });
    const mesma_via = mk("arqueiro", { owner: 1, lane: 0 }); // não deve receber
    const outra_via = mk("lanceiro", { owner: 1, lane: 1 });
    const s = mkState([semerj, origem, mesma_via, outra_via]);

    resolveSemerj(s, semerj);

    expect(mesma_via.venenos).toBeUndefined();
    expect(outra_via.venenos).toEqual([2]);
  });

  it("efeito nulo se não há venenos na via de origem", () => {
    const semerj = mk("semerj", { lane: 0 });
    const origem_limpa = mk("servo", { owner: 1, lane: 0 });
    const outra_via = mk("arqueiro", { owner: 1, lane: 1 });
    const s = mkState([semerj, origem_limpa, outra_via]);

    const effect = resolveSemerj(s, semerj);

    expect(effect.kind).toBe("block");
    expect(outra_via.venenos).toBeUndefined();
  });

  it("efeito nulo se não há cartas em outras vias", () => {
    const semerj = mk("semerj", { lane: 0 });
    const origem = mk("servo", { owner: 1, lane: 0, venenos: [2] });
    const s = mkState([semerj, origem]);

    const effect = resolveSemerj(s, semerj);

    expect(effect.kind).toBe("block");
  });

  it("coleta TODAS as marcas de uma carta com múltiplos venenos", () => {
    const semerj = mk("semerj", { lane: 0 });
    const origem = mk("servo", { owner: 1, lane: 0, venenos: [1, 2] }); // 2 marcas
    const t1 = mk("arqueiro", { owner: 1, lane: 1 });
    const t2 = mk("lanceiro", { owner: 1, lane: 2 });
    const s = mkState([semerj, origem, t1, t2]);

    resolveSemerj(s, semerj);

    expect(t1.venenos).toEqual([1]);
    expect(t2.venenos).toEqual([2]);
  });

  it("só replica venenos de cartas inimigas (ignora aliadas envenenadas)", () => {
    const semerj = mk("semerj", { lane: 0, owner: 0 });
    const aliada_env = mk("servo", { owner: 0, lane: 0, venenos: [2] }); // aliada, ignora
    const outra_via = mk("arqueiro", { owner: 1, lane: 1 });
    const s = mkState([semerj, aliada_env, outra_via]);

    const effect = resolveSemerj(s, semerj);

    expect(effect.kind).toBe("block"); // não há venenos inimigos na via
    expect(outra_via.venenos).toBeUndefined();
  });
});

/* ------------------------------ Seqer-Mau (finisher) ------------------------ */
describe("Seqer-Mau — repete o dano de veneno do campo", () => {
  it("aplica imediatamente o dano das marcas de todas as envenenadas", () => {
    const seqer = mk("seqer-mau", { lane: 2 });
    const env1 = mk("guardareal", { owner: 1, lane: 0, venenos: [1] });     // -1
    const env2 = mk("general", { owner: 1, lane: 1, venenos: [2, 1] });     // -3
    const s = mkState([seqer, env1, env2]);

    resolveSeqerMau(s, seqer);

    expect(power(env1, ctxOf(s))).toBe(byKey["guardareal"].poder - 1);
    expect(power(env2, ctxOf(s))).toBe(byKey["general"].poder - 3);
  });

  it("atinge o campo inteiro, não só a via do Seqer", () => {
    const seqer = mk("seqer-mau", { lane: 2 });
    const env_via0 = mk("colosso", { owner: 1, lane: 0, venenos: [3] });
    const s = mkState([seqer, env_via0]);

    resolveSeqerMau(s, seqer);

    expect(power(env_via0, ctxOf(s))).toBe(byKey["colosso"].poder - 3);
  });

  it("as marcas PERMANECEM após o dano (não são consumidas)", () => {
    const seqer = mk("seqer-mau");
    const env = mk("general", { owner: 1, venenos: [2] });
    const s = mkState([seqer, env]);

    resolveSeqerMau(s, seqer);

    expect(env.venenos).toEqual([2]); // marca continua para tiquear na próxima rodada
  });

  it("tiquea marcas recém-aplicadas nesta rodada (Sicário + Seqer)", () => {
    // Simula: Sicário marca via 0, Seqer entra via 2 na mesma rodada.
    const sicario = mk("sicario", { lane: 0 });
    const alvo = mk("guardareal", { owner: 1, lane: 0 });
    const seqer = mk("seqer-mau", { lane: 2 });
    const s = mkState([sicario, alvo, seqer]);

    resolveAssassino(s, sicario);      // marca alvo com [1], sem dano ainda
    expect(power(alvo, ctxOf(s))).toBe(byKey["guardareal"].poder);

    resolveSeqerMau(s, seqer);         // Seqer vê a marca e aplica -1 imediato
    expect(power(alvo, ctxOf(s))).toBe(byKey["guardareal"].poder - 1);
  });

  it("ignora aliadas envenenadas (só inimigas do Seqer)", () => {
    const seqer = mk("seqer-mau", { owner: 0 });
    const aliada_env = mk("servo", { owner: 0, venenos: [2] });
    const inimiga_env = mk("general", { owner: 1, venenos: [2] });
    const s = mkState([seqer, aliada_env, inimiga_env]);

    resolveSeqerMau(s, seqer);

    expect(power(aliada_env, ctxOf(s))).toBe(byKey["servo"].poder);         // intocada
    expect(power(inimiga_env, ctxOf(s))).toBe(byKey["general"].poder - 2);  // atingida
  });

  it("bloqueia se não há envenenadas inimigas", () => {
    const seqer = mk("seqer-mau");
    const limpa = mk("servo", { owner: 1 });
    const s = mkState([seqer, limpa]);

    const effect = resolveSeqerMau(s, seqer);

    expect(effect.kind).toBe("block");
  });
});
