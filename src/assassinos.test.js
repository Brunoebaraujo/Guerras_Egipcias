import { describe, it, expect, beforeEach } from "vitest";
import {
  byKey, power, ctxOf, marcarVeneno, aplicarVeneno, resolveAssassino, resolveSeqerMau,
  resetUid, nextUid, destroyList,
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

/* ------------------------------ ASSASSINOS ------------------------------------ */
describe("Assassinos — Veneno", () => {
  it("Sicário marca alvo com Veneno I (-1/rodada)", () => {
    const sicario = mk("sicario");
    const alvo = mk("servo", { owner: 1 });
    const s = mkState([sicario, alvo]);
    
    resolveAssassino(s, sicario);
    
    expect(alvo.veneno).toBe(1);
  });

  it("Senti marca alvo com Veneno I (-1/rodada)", () => {
    const senti = mk("senti");
    const alvo = mk("arqueiro", { owner: 1 });
    const s = mkState([senti, alvo]);
    
    resolveAssassino(s, senti);
    
    expect(alvo.veneno).toBe(1);
  });

  it("Hemsu marca alvo com Veneno II (-2/rodada)", () => {
    const hemsu = mk("hemsu");
    const alvo = mk("lanceiro", { owner: 1 });
    const s = mkState([hemsu, alvo]);
    
    resolveAssassino(s, hemsu);
    
    expect(alvo.veneno).toBe(2);
  });

  it("Semerj marca alvo com Veneno II (-2/rodada)", () => {
    const semerj = mk("semerj");
    const alvo = mk("carruagem", { owner: 1 });
    const s = mkState([semerj, alvo]);
    
    resolveAssassino(s, semerj);
    
    expect(alvo.veneno).toBe(2);
  });

  it("Akhu marca alvo com Veneno III (-3/rodada)", () => {
    const akhu = mk("akhu");
    const alvo = mk("general", { owner: 1 });
    const s = mkState([akhu, alvo]);
    
    resolveAssassino(s, akhu);
    
    expect(alvo.veneno).toBe(3);
  });

  it("veneno só afeta inimigos", () => {
    const sicario = mk("sicario");
    const aliado = mk("servo");
    const s = mkState([sicario, aliado]);
    
    const effect = resolveAssassino(s, sicario);
    
    expect(effect.kind).toBe("block");
    expect(effect.text).toBe("sem alvo");
  });

  it("veneno só afeta cartas na mesma via", () => {
    const sicario = mk("sicario", { lane: 0 });
    const inimigo_outra = mk("servo", { owner: 1, lane: 1 });
    const s = mkState([sicario, inimigo_outra]);
    
    const effect = resolveAssassino(s, sicario);
    
    expect(effect.kind).toBe("block");
    expect(effect.text).toBe("sem alvo");
  });

  it("veneno desafeta mortas/dying", () => {
    const sicario = mk("sicario");
    const inimigo_morto = mk("servo", { owner: 1, dying: 1 });
    const inimigo_vivo = mk("arqueiro", { owner: 1 });
    const s = mkState([sicario, inimigo_morto, inimigo_vivo]);
    
    resolveAssassino(s, sicario);
    
    expect(inimigo_morto.veneno).toBeUndefined();
    expect(inimigo_vivo.veneno).toBe(1);
  });

  it("aplicarVeneno aplica dano por rodada baseado no nível", () => {
    const envenenada1 = mk("servo", { veneno: 1 });
    const envenenada2 = mk("arqueiro", { veneno: 2 });
    const envenenada3 = mk("lanceiro", { veneno: 3 });
    const s = mkState([envenenada1, envenenada2, envenenada3]);
    
    aplicarVeneno(s);
    
    // Cada uma recebeu um mod com dano negativo
    expect(envenenada1.mods.some((m) => m.val === -1)).toBe(true);
    expect(envenenada2.mods.some((m) => m.val === -2)).toBe(true);
    expect(envenenada3.mods.some((m) => m.val === -3)).toBe(true);
  });

  it("poder da carta reflete dano de veneno", () => {
    const envenenada = mk("servo", { veneno: 2 }); // 1/1, -2 = -1
    const s = mkState([envenenada]);
    
    aplicarVeneno(s);
    
    // 1 + (-2) = -1
    expect(power(envenenada, ctxOf(s))).toBe(-1);
  });

  it("veneno pode ser sobrescrito por nível maior", () => {
    const inimigo = mk("servo", { owner: 1, veneno: 1 });
    const s = mkState([inimigo]);
    
    marcarVeneno(s, inimigo, 2, "Hemsu");
    
    expect(inimigo.veneno).toBe(2);
  });

  it("veneno menor não sobrescreve nível maior", () => {
    const inimigo = mk("servo", { owner: 1, veneno: 3 });
    const s = mkState([inimigo]);
    
    marcarVeneno(s, inimigo, 1, "Sicário");
    
    expect(inimigo.veneno).toBe(3);
  });
});

/* ------------------------------ SEQER-MAU ------------------------------------ */
describe("Seqer-Mau, o Destruidor", () => {
  it("destrói 2 cartas envenenadas aleatórias da via", () => {
    const seqer = mk("seqer-mau");
    const env1 = mk("servo", { owner: 1, veneno: 1 });
    const env2 = mk("arqueiro", { owner: 1, veneno: 1 });
    const env3 = mk("lanceiro", { owner: 1, veneno: 2 });
    const s = mkState([seqer, env1, env2, env3]);
    
    resolveSeqerMau(s, seqer);
    
    const mortas = s.board.filter((c) => c.dying);
    expect(mortas).toHaveLength(2);
  });

  it("ignora cartas não-envenenadas", () => {
    const seqer = mk("seqer-mau");
    const nao_env = mk("servo", { owner: 1 });
    const s = mkState([seqer, nao_env]);
    
    const effect = resolveSeqerMau(s, seqer);
    
    expect(effect.kind).toBe("block");
    expect(effect.text).toBe("sem alvo");
  });

  it("destrói apenas 1 se houver apenas 1 envenenada", () => {
    const seqer = mk("seqer-mau");
    const env1 = mk("servo", { owner: 1, veneno: 2 });
    const s = mkState([seqer, env1]);
    
    resolveSeqerMau(s, seqer);
    
    const mortas = s.board.filter((c) => c.dying);
    expect(mortas).toHaveLength(1);
  });

  it("não destrói aliadas", () => {
    const seqer = mk("seqer-mau");
    const aliada_env = mk("servo", { owner: 0, veneno: 2 });
    const inimiga_env = mk("arqueiro", { owner: 1, veneno: 2 });
    const s = mkState([seqer, aliada_env, inimiga_env]);
    
    resolveSeqerMau(s, seqer);
    
    expect(aliada_env.dying).toBeFalsy();
    expect(inimiga_env.dying).toBeTruthy();
  });

  it("só destroi na mesma via", () => {
    const seqer = mk("seqer-mau", { lane: 0 });
    const env_outra = mk("servo", { owner: 1, lane: 1, veneno: 2 });
    const s = mkState([seqer, env_outra]);
    
    const effect = resolveSeqerMau(s, seqer);
    
    expect(effect.kind).toBe("block");
  });
});
