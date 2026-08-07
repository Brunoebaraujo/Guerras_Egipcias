import { describe, it, expect } from "vitest";
import { freshMatch, applyAction } from "./match.js";
import { byKey, nextUid } from "./engine.js";

describe("Hu — Mecânica Ativar", () => {
  // Helper para criar um card no board
  function addCardToBoard(s, key, owner, lane, revealed = false) {
    const card = {
      uid: nextUid(), key, owner, lane,
      printed: byKey[key].poder, baked: 0, mods: [], dying: false,
      revealed, pendentes: 0, custoMod: 0, venenos: [],
      entryPlays: s.plays[owner], enteredRound: s.round, moved: false,
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
    const huCard = addCardToBoard(s, "hu", 0, 0, false);
    const arqCard = addCardToBoard(s, "arqueiro", 0, 0, false);
    
    // Ativa Hu
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    expect(r.state.board.find(c => c.key === "hu").aguardandoProxima).toBe(true);
    
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
    const hathorCard = addCardToBoard(s, "hathor", 0, 0, true);
    const huCard = addCardToBoard(s, "hu", 0, 0, false);
    const arqCard = addCardToBoard(s, "arqueiro", 0, 1, false);
    
    // Hu recebe buff de Hathor: 3 + 3 = 6
    huCard.mods.push({ src: "Hathor", val: 3 });
    
    // Ativa Hu
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    expect(r.state.board.find(c => c.key === "hu").aguardandoProxima).toBe(true);
    
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
    
    const huCard = addCardToBoard(s, "hu", 0, 0, false);
    const arqCard = addCardToBoard(s, "arqueiro", 0, 0, false);
    
    // Ativa Hu
    let r = applyAction(s, { t: "toggleActivate", side: 0, uid: huCard.uid });
    
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
});
