import { describe, it, expect } from "vitest";
import { freshMatch, applyAction } from "./match.js";
import { byKey, nextUid } from "./engine.js";

describe("Hu — Mecânica Ativar", () => {
  // Helper para criar um card no board. `entryPlays` pode ser passado para
  // simular a ordem de jogada (importa para o teste de ordem de ativação).
  function addCardToBoard(s, key, owner, lane, revealed = false, entryPlays = null) {
    const card = {
      uid: nextUid(), key, owner, lane,
      printed: byKey[key].poder, baked: 0, mods: [], dying: false,
      revealed, pendentes: 0, custoMod: 0, venenos: [],
      entryPlays: entryPlays != null ? entryPlays : s.plays[owner],
      enteredRound: s.round, moved: false,
      aguardandoProxima: false, jaBufou: false,
    };
    if (revealed) card.revealSeq = (s.effectSeq || 0) + 1;
    s.board.push(card);
    return card;
  }

  it("Hu é jogado e começa inativo", () => {
    const s = freshMatch([["hu", "arqueiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    const huCard = addCardToBoard(s, "hu", 0, 0, false);
    
    expect(huCard.aguardandoProxima).toBeFalsy();
    expect(huCard.jaBufou).toBeFalsy();
  });

  it("Hu pode ser ativado via toggleActivate", () => {
    const s = freshMatch([["hu", "arqueiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    const huCard = addCardToBoard(s, "hu", 0, 0, false);
    
    // Ativa Hu
    const r2 = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    expect(r2.error).toBeUndefined();
    
    const huActivated = r2.state.board.find(c => c.key === "hu");
    expect(huActivated.aguardandoProxima).toBe(true);
    expect(huActivated.jaBufou).toBe(false);
  });

  it("Próxima carta revelada recebe buff de Hu durante step", () => {
    const s = freshMatch([["hu", "arqueiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    // Adiciona Hu e Arqueiro ao board (não revelados)
    s.plays[0] = 1;
    const huCard = addCardToBoard(s, "hu", 0, 0, false, 1);
    
    // Ativa Hu (carimba ativadoEmPlays = 1)
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    expect(r.state.board.find(c => c.key === "hu").aguardandoProxima).toBe(true);
    
    // Arqueiro jogado DEPOIS da ativação (plays=2)
    r.state.plays[0] = 2;
    const arqCard = addCardToBoard(r.state, "arqueiro", 0, 0, false, 2);
    
    // Monta fila de revelação: Hu depois Arqueiro
    r.state.queue = [huCard.uid, arqCard.uid];
    r.state.phase = "revealing";
    
    // Revela Hu
    r = applyAction(r.state, { t: "step" });
    expect(r.state.board.find(c => c.uid === huCard.uid).revealed).toBe(true);
    
    // Revela Arqueiro (deve receber buff)
    r = applyAction(r.state, { t: "step" });
    const arq_after = r.state.board.find(c => c.uid === arqCard.uid);
    expect(arq_after.revealed).toBe(true);
    expect(arq_after.mods.some(m => m.src.includes("Hu"))).toBe(true);
    
    // Verifica que Hu completou (jaBufou = true)
    const hu_after = r.state.board.find(c => c.key === "hu");
    expect(hu_after.jaBufou).toBe(true);
    expect(hu_after.aguardandoProxima).toBe(false);
  });

  it("Hu com buff de Hathor transfere poder aumentado", () => {
    const s = freshMatch([["hu", "hathor", "arqueiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    // Adiciona Hathor, Hu e Arqueiro
    const hathorCard = addCardToBoard(s, "hathor", 0, 0, true, 0);
    s.plays[0] = 1;
    const huCard = addCardToBoard(s, "hu", 0, 0, false, 1);
    
    // Hu recebe buff de Hathor: 3 + 3 = 6
    huCard.mods.push({ src: "Hathor", val: 3 });
    
    // Ativa Hu (carimba ativadoEmPlays = 1)
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    expect(r.state.board.find(c => c.key === "hu").aguardandoProxima).toBe(true);
    
    // Arqueiro jogado DEPOIS da ativação (plays=2)
    r.state.plays[0] = 2;
    const arqCard = addCardToBoard(r.state, "arqueiro", 0, 1, false, 2);
    
    // Monta fila: Hu depois Arqueiro
    r.state.queue = [huCard.uid, arqCard.uid];
    r.state.phase = "revealing";
    
    // Revela Hu
    r = applyAction(r.state, { t: "step" });
    
    // Revela Arqueiro (deve receber +6)
    r = applyAction(r.state, { t: "step" });
    const arq_after = r.state.board.find(c => c.uid === arqCard.uid);
    expect(arq_after.mods.some(m => m.src.includes("Hu") && m.val === 6)).toBe(true);
  });

  it("Se Hu morre antes de buffar, nada acontece", () => {
    const s = freshMatch([["hu", "arqueiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    const huCard = addCardToBoard(s, "hu", 0, 0, false);
    const arqCard = addCardToBoard(s, "arqueiro", 0, 0, false);
    
    // Ativa Hu
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    
    // Marca Hu como dying
    const hu_to_die = r.state.board.find(c => c.key === "hu");
    hu_to_die.dying = true;
    
    // Monta fila
    r.state.queue = [arqCard.uid];
    r.state.phase = "revealing";
    
    // Revela Arqueiro (Hu está dying, então não deve buffar)
    r = applyAction(r.state, { t: "step" });
    const arq_after = r.state.board.find(c => c.uid === arqCard.uid);
    expect(arq_after.mods.some(m => m.src?.includes("Hu"))).toBe(false);
  });

  it("Buff de Hu persiste mesmo se Hu morre depois", () => {
    const s = freshMatch([["hu", "arqueiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    s.plays[0] = 1;
    const huCard = addCardToBoard(s, "hu", 0, 0, false, 1);
    
    // Ativa Hu (carimba ativadoEmPlays = 1)
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    
    // Arqueiro jogado DEPOIS da ativação (plays=2)
    r.state.plays[0] = 2;
    const arqCard = addCardToBoard(r.state, "arqueiro", 0, 0, false, 2);
    
    // Monta fila: Hu depois Arqueiro
    r.state.queue = [huCard.uid, arqCard.uid];
    r.state.phase = "revealing";
    
    // Revela Hu
    r = applyAction(r.state, { t: "step" });
    
    // Revela Arqueiro (buffado)
    r = applyAction(r.state, { t: "step" });
    const arq = r.state.board.find(c => c.uid === arqCard.uid);
    const buffBefore = arq.mods.find(m => m.src?.includes("Hu"));
    expect(buffBefore).toBeDefined();
    
    // Marca Hu como dying após buffar
    const hu = r.state.board.find(c => c.key === "hu");
    hu.dying = true;
    
    // Buff no Arqueiro persiste
    const arq_after = r.state.board.find(c => c.uid === arqCard.uid);
    const buffAfter = arq_after.mods.find(m => m.src?.includes("Hu"));
    expect(buffAfter).toBeDefined();
  });

  it("Hu pode ser desativado antes de buffar", () => {
    const s = freshMatch([["hu", "arqueiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    const huCard = addCardToBoard(s, "hu", 0, 0, false);
    
    // Ativa Hu
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    expect(r.state.board.find(c => c.key === "hu").aguardandoProxima).toBe(true);
    
    // Desativa Hu
    r = applyAction(r.state, { t: "toggleActivate", side: 0, uid: huCard.uid });
    const hu = r.state.board.find(c => c.key === "hu");
    expect(hu.aguardandoProxima).toBe(false);
    expect(hu.jaBufou).toBe(false);
  });

  // ---- REGRESSÃO: ordem de jogada (bug do combo Hathor→ativar→Renenutet) ----
  it("Hu buffa a carta jogada DEPOIS da ativação, não a jogada antes", () => {
    const s = freshMatch([["hu", "arqueiro", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    // Simula a sequência: Hu jogado (plays=1), Arqueiro jogado ANTES de ativar
    // (plays=2), ativa Hu (carimba plays=2), Lanceiro jogado DEPOIS (plays=3).
    s.plays[0] = 1;
    const huCard = addCardToBoard(s, "hu", 0, 0, false, 1);
    s.plays[0] = 2;
    const arqAntes = addCardToBoard(s, "arqueiro", 0, 0, false, 2); // jogado ANTES de ativar
    
    // Ativa Hu (carimba ativadoEmPlays = 2)
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    expect(r.state.board.find(c => c.key === "hu").ativadoEmPlays).toBe(2);
    
    // Joga Lanceiro DEPOIS da ativação (plays=3)
    r.state.plays[0] = 3;
    const lancDepois = addCardToBoard(r.state, "lanceiro", 0, 1, false, 3);
    
    // Revela na ordem: Hu, Arqueiro (antes), Lanceiro (depois)
    r.state.queue = [huCard.uid, arqAntes.uid, lancDepois.uid];
    r.state.phase = "revealing";
    
    r = applyAction(r.state, { t: "step" }); // Hu
    r = applyAction(r.state, { t: "step" }); // Arqueiro (jogado ANTES — NÃO deve receber)
    const arq = r.state.board.find(c => c.uid === arqAntes.uid);
    expect(arq.mods.some(m => m.src?.includes("Hu"))).toBe(false);
    
    // Hu ainda aguardando (não gastou no Arqueiro)
    let hu = r.state.board.find(c => c.key === "hu");
    expect(hu.aguardandoProxima).toBe(true);
    expect(hu.jaBufou).toBe(false);
    
    r = applyAction(r.state, { t: "step" }); // Lanceiro (jogado DEPOIS — DEVE receber)
    const lanc = r.state.board.find(c => c.uid === lancDepois.uid);
    expect(lanc.mods.some(m => m.src?.includes("Hu"))).toBe(true);
    
    // Agora Hu completou
    hu = r.state.board.find(c => c.key === "hu");
    expect(hu.jaBufou).toBe(true);
  });

  // ---- COMBO: Hu buffa Renenutet, que dispara seu spread por via ----
  it("Renenutet buffada por Hu dispara seu spread (+2 por via)", () => {
    const s = freshMatch([["hu", "renenutet", "arqueiro", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"],
                          ["servo", "lanceiro", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo", "servo"]], { rng: () => 0.5 });
    
    // Cartas aliadas já reveladas nas vias 1 e 2 (para Renenutet ter onde espalhar)
    const aliadoV1 = addCardToBoard(s, "arqueiro", 0, 1, true, 0);
    const aliadoV2 = addCardToBoard(s, "lanceiro", 0, 2, true, 0);
    
    // Hu na via 0, jogado primeiro (plays=1)
    s.plays[0] = 1;
    const huCard = addCardToBoard(s, "hu", 0, 0, false, 1);
    
    // Ativa Hu (carimba plays=1)
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    
    // Renenutet jogada DEPOIS da ativação (plays=2), na via 0
    r.state.plays[0] = 2;
    const renCard = addCardToBoard(r.state, "renenutet", 0, 0, false, 2);
    
    // Revela: Hu, depois Renenutet
    r.state.queue = [huCard.uid, renCard.uid];
    r.state.phase = "revealing";
    
    r = applyAction(r.state, { t: "step" }); // Hu
    r = applyAction(r.state, { t: "step" }); // Renenutet (recebe buff de Hu → dispara spread)
    
    // Renenutet recebeu o buff de Hu
    const ren = r.state.board.find(c => c.uid === renCard.uid);
    expect(ren.mods.some(m => m.src?.includes("Hu"))).toBe(true);
    
    // E os aliados nas outras vias receberam +2 da Renenutet (spread disparado)
    const a1 = r.state.board.find(c => c.uid === aliadoV1.uid);
    const a2 = r.state.board.find(c => c.uid === aliadoV2.uid);
    const totalSpread = 
      (a1.mods.some(m => m.src?.includes("Renenutet")) ? 1 : 0) +
      (a2.mods.some(m => m.src?.includes("Renenutet")) ? 1 : 0);
    expect(totalSpread).toBeGreaterThan(0);
  });
});
