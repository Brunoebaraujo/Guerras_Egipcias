import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { byKey, nextUid } from "./engine.js";
import { freshMatch, applyAction, autoReveal } from "./match.js";

/* ==========================================================================
   RODADA AUTOMÁTICA.

   O botão "Próxima rodada" não pedia decisão nenhuma: terminada a revelação só
   existia um caminho adiante, e clicar nele era cerimônia. Pior no online, onde
   exigia os DOIS jogadores — quem já tinha visto tudo ficava preso esperando.

   Agora emenda sozinho: no local por temporizador no cliente, no online pelo
   servidor logo após o último passo. Estes testes cobrem o que dá para cobrir
   sem relógio: que o redutor aceita a emenda em toda situação em que ela vai
   ser disparada, e que a interface não deixou botão órfão para trás.
   ========================================================================== */
function partida() {
  const lista = ["servo","arqueiro","lanceiro","carruagem","guardareal","general",
                 "colosso","hathor","heka","amon","sobek","osiris"];
  return freshMatch([lista, lista], { rng: () => 0.5 });
}

describe("a rodada emenda sem clique", () => {
  it("depois da revelação o estado aceita nextRound (é o que o temporizador dispara)", () => {
    let g = partida();
    const h = g.hand[0][0];
    g = applyAction(g, { t: "place", side: 0, hid: h.hid, lane: 0 }).state;
    g = applyAction(g, { t: "startReveal" }).state;
    g = autoReveal(g, { rng: () => 0.5 }).state;
    expect(g.phase).toBe("revealed");
    const r = applyAction(g, { t: "nextRound" }, { rng: () => 0.5 });
    expect(r.error).toBeFalsy();
    expect(r.state.phase).toBe("plan");
    expect(r.state.round).toBe(2);
  });

  /* O caso que quebrava a partida quando o botão sumiu: sem nada posicionado a
     fila nasce vazia e a fase pula direto para "revealed", sem nunca passar por
     "revealing". Se só o fim da revelação disparasse a emenda, travava aqui. */
  it("mão parada: a fila nasce vazia e a emenda continua válida", () => {
    let g = partida();
    g = applyAction(g, { t: "startReveal" }).state;
    expect(g.phase).toBe("revealed");
    const r = applyAction(g, { t: "nextRound" }, { rng: () => 0.5 });
    expect(r.error).toBeFalsy();
    expect(r.state.round).toBe(2);
  });

  it("na rodada 6 a emenda encerra a partida em vez de avançar", () => {
    let g = partida();
    g.round = 6;
    g = applyAction(g, { t: "startReveal" }).state;
    const r = applyAction(g, { t: "nextRound" }, { rng: () => 0.5 });
    expect(r.error).toBeFalsy();
    expect(r.state.finished).toBe(true);
    expect(r.state.round).toBe(6);
  });

  it("a emenda é recusada fora da fase revelada — o temporizador não pode furar fase", () => {
    const g = partida();               // fase "plan"
    expect(applyAction(g, { t: "nextRound" }).error).toBeTruthy();
  });
});

describe("a interface não deixou botão órfão", () => {
  const app = readFileSync("src/ui/App.jsx", "utf8");
  const srv = readFileSync("server/index.js", "utf8");

  it("nenhum botão de próxima rodada ou de finalizar sobrou", () => {
    expect(app).not.toContain("Próxima rodada");
    expect(app).not.toContain("Finalizar partida");
    expect(app).not.toContain("Pronto: próxima");
  });

  it("o cliente online não manda mais ready na fase revelada", () => {
    // Sobra um único "ready", o de confirmar as jogadas antes de revelar.
    expect(app.match(/send\(\{ t: "ready" \}\)/g) || []).toHaveLength(1);
  });

  it("o servidor agenda a rodada seguinte nos DOIS caminhos de saída", () => {
    // fila drenada em pumpReveal, e fila vazia desde o começo em startReveal
    expect(app.length).toBeGreaterThan(0);
    expect((srv.match(/advanceRound\(room\), ROUND_PAUSE_MS/g) || []).length).toBe(2);
  });
});
