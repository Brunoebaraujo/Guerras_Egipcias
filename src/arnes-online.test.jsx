// @vitest-environment jsdom
import { describe, expect, it, beforeAll } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { OnlineGame } from "./ui/multiplayer/Multiplayer.jsx";
import { freshMatch, applyAction, MAX_ROUND } from "./match.js";
import { filterStateForSeat } from "./net/filterState.js";
import { byKey } from "./engine.js";

/* ==========================================================================
   ARNÊS DA VISTA ONLINE.

   POR QUE ELE EXISTE. Um `ReferenceError` de uma linha (`MBanner` usado e
   nunca declarado) derrubava o tabuleiro no celular e sobreviveu a 739 testes.
   A razão é estrutural, não azar: todo teste de UI do repositório usa
   `renderToString` sobre um estado RECÉM-CRIADO. Isso deixa três buracos ao
   mesmo tempo —

     1. não roda `useEffect`, então tudo que só acontece depois da montagem
        (o showcase de Praga abrindo o zoom, por exemplo) nunca é exercido;
     2. não monta de verdade, então erro de render vira string e não exceção;
     3. não sai da rodada 1, e a maior parte dos estados interessantes — mira
        pendente, Trevas, adversário mirando, carta trocando de dono — só
        aparece no meio da partida.

   Este arquivo fecha os três: monta de verdade em jsdom, com efeitos, e
   repinta a CADA passo de partidas inteiras, pelos DOIS assentos, a partir do
   estado FILTRADO — que é exatamente o que o servidor manda para o cliente.

   POR QUE ELE SE VIGIA. O arnês anterior desta suíte ficava verde sem testar
   quase nada: parava na rodada 1 em quase toda semente, porque não tratava a
   pausa do showcase nem a mira, e ninguém conferia até onde ele chegava. Um
   arnês que degrada em silêncio é pior que arnês nenhum, porque compra
   confiança sem entregar cobertura. Por isso o bloco "o arnês exercita o que
   promete" no fim: ele falha se as partidas pararem de chegar à rodada 6 ou se
   os estados que justificam o arnês deixarem de aparecer.

   CUSTO. ~2s por semente. Se precisar de mais fundo numa investigação:
   ARNES_SEMENTES=40 npx vitest run src/arnes-online.test.jsx
   ========================================================================== */

/* Decks escolhidos para MAXIMIZAR estados incomuns, não para serem realistas:
   moises traz as Pragas (e com elas o showcase e as Trevas), sobek e assassino
   pedem mira, servo-mel e purificacao exercitam a fase de Fim de Rodada e a
   troca de dono. Ao acrescentar mecânica nova, é aqui que ela entra. */
const DECK_A = ["servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general",
                "colosso", "servo-mel", "purificacao", "amon", "sobek", "osiris"];
const DECK_B = ["mumia", "enxame", "assassino-medjay", "selo", "montu", "armadura",
                "escaravelho", "ammit", "sekhmet", "moises", "servo-mel", "purificacao"];

const SEMENTES = Number(process.env.ARNES_SEMENTES) || 8;
/* Larguras alternadas por semente: abaixo de 820 o OnlineGame usa o tabuleiro
   mobile, acima usa o desktop. Alternar cobre os dois ramos sem dobrar o custo. */
const LARGURA = (seed) => (seed % 2 ? 390 : 1280);

/** PRNG da POLÍTICA de jogo, separado do rng da partida para não consumir a semente. */
function lcg(seed) {
  let x = seed >>> 0 || 1;
  return () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function percorrer(seed) {
  window.innerWidth = LARGURA(seed);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  /* O jsdom não tem ResizeObserver, e o tabuleiro desktop instancia um para
     medir a própria largura. É limitação do AMBIENTE, não defeito do app — em
     navegador ele existe em toda parte. O substituto não mede nada: o
     componente cai na largura padrão dele, que é o suficiente para pintar. */
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }

  const pol = lcg(seed * 7919 + 13);
  let g = freshMatch([DECK_A, DECK_B], { seed: `arnes-online-${seed}` });

  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const erros = [];
  const cob = { rodada: 0, pinturas: 0, recados: 0, showcases: 0, trevas: 0, moscas: 0 };

  /* `oppConnected` e `note` NÃO vêm do estado da partida: vêm da camada de
     conexão, e são justamente o que preenche `msg` — a faixa que derrubava o
     tabuleiro mobile. Variá-las é obrigatório; se o arnês pintasse sempre com
     a conexão boa e sem recado, esse ramo nunca seria exercido. */
  const pintar = (onde) => {
    for (const seat of [0, 1]) {
      const ciclo = cob.pinturas % 3;
      const oppConnected = ciclo !== 1;
      const note = ciclo === 2 ? "Aguardando o adversário…" : null;
      if (!oppConnected || note) cob.recados += 1;
      try {
        act(() => {
          root.render(React.createElement(OnlineGame, {
            send: () => {}, note, onLeave: () => {},
            data: { seat, state: filterStateForSeat(g, seat), ready: [false, false], oppConnected },
          }));
        });
        cob.pinturas += 1;
      } catch (e) {
        erros.push(`semente ${seed} · ${onde} · assento ${seat}: ${e.message}`);
      }
    }
  };

  pintar("início");
  for (let r = 1; r <= MAX_ROUND; r++) {
    /* Política GULOSA: gasta a energia toda, preferindo a carta mais cara que
       cabe. Uma política tímida (duas cartas baratas por rodada) nunca põe em
       jogo o que custa 3–4, e é justamente aí que moram a mira e a
       Purificação — os estados que o arnês precisa alcançar. */
    for (const side of [0, 1]) {
      for (let n = 0; n < 4; n++) {
        const pagaveis = g.hand[side].filter((h) => byKey[h.key].custo <= g.energy[side]);
        if (!pagaveis.length) break;
        const caras = [...pagaveis].sort((a, b) => byKey[b.key].custo - byKey[a.key].custo);
        const h = pol() < 0.75 ? caras[0] : caras[Math.floor(pol() * caras.length)];
        const res = applyAction(g, { t: "place", side, hid: h.hid, lane: Math.floor(pol() * 3) });
        if (!res.error) g = res.state; else break;
      }
    }
    pintar(`r${r} planejamento`);
    if (g.trevas === g.round) cob.trevas += 1;

    g = applyAction(g, { t: "startReveal" }).state;
    for (let i = 0; i < 90; i++) {
      pintar(`r${r} passo ${i}`);
      /* Os dois desvios que o arnês anterior não tratava, e que faziam a
         partida inteira parar na rodada 1. */
      if (g.awaitingPlagueShowcase) {
        cob.showcases += 1;
        const a = applyAction(g, { t: "ackPlagueShowcase" });
        if (a.error) break;
        g = a.state; continue;
      }
      /* Desvio mantido por robustez, não por cobertura: hoje `awaitingAim`
         NUNCA é preenchido pelo motor — a mira manual está desligada. Se
         alguém religá-la, o arnês já sabe responder em vez de travar. */
      if (g.awaitingAim) {
        const a = applyAction(g, { t: "skipAim" });
        if (a.error) break;
        g = a.state; continue;
      }
      const st = applyAction(g, { t: "step" });
      if (st.error || st.state === g) break;
      g = st.state;
      if (g.phase === "revealed") break;
    }
    pintar(`r${r} revelado`);

    const nx = applyAction(g, { t: "nextRound" });
    if (nx.error) break;
    g = nx.state;
    cob.moscas = Math.max(cob.moscas, g.board.filter((c) => c.key === "token-mosca").length);
    pintar(`r${r} pós-virada`);
    cob.rodada = r;
  }

  act(() => root.unmount());
  host.remove();
  return { erros, cob };
}

let corridas;
beforeAll(() => {
  corridas = Array.from({ length: SEMENTES }, (_, i) => percorrer(i + 1));
}, 120_000);

describe("a vista online monta em toda a partida, pelos dois assentos", () => {
  for (let i = 0; i < SEMENTES; i++) {
    it(`semente ${i + 1} (${LARGURA(i + 1) < 820 ? "mobile" : "desktop"})`, () => {
      expect(corridas[i].erros).toEqual([]);
    });
  }
});

/* ------------------------------------------------------------------------
   A GUARDA DO PRÓPRIO ARNÊS.

   Sem este bloco, qualquer mudança que faça as partidas travarem cedo — uma
   ação nova que o laço não saiba responder, um desvio como o showcase —
   transforma o arquivo inteiro num teste que passa sem exercitar nada. Foi
   exatamente o que aconteceu antes. Os pisos são folgados de propósito: eles
   detectam colapso, não flutuação.
   ------------------------------------------------------------------------ */
describe("o arnês exercita o que promete", () => {
  it("as partidas chegam ao fim, não param na rodada 1", () => {
    const finais = corridas.map((c) => c.cob.rodada);
    expect(Math.min(...finais)).toBe(MAX_ROUND);
  });

  it("monta muitas vezes por partida, não uma", () => {
    const porPartida = corridas.map((c) => c.cob.pinturas);
    expect(Math.min(...porPartida)).toBeGreaterThan(20);
  });

  it("alcança os estados de meio de partida que motivam o arnês", () => {
    const soma = (k) => corridas.reduce((t, c) => t + c.cob[k], 0);
    /* As três faixas de aviso do tabuleiro mobile, que são o motivo de este
       arquivo existir: Trevas vem do estado, o recado vem da conexão. */
    expect(soma("trevas"), "as Trevas nunca caíram").toBeGreaterThan(0);
    expect(soma("recados"), "nenhuma pintura com recado ou conexão caída").toBeGreaterThan(0);
    expect(soma("showcases"), "nenhum showcase de Praga exercitado").toBeGreaterThan(0);
  });

  it("cobre os dois tabuleiros, mobile e desktop", () => {
    const larguras = new Set(Array.from({ length: SEMENTES }, (_, i) => LARGURA(i + 1) < 820));
    expect(larguras.size, "todas as sementes caíram no mesmo tabuleiro").toBe(2);
  });

  /* A fase de Fim de Rodada tem de aparecer no tabuleiro, porque ela cria
     cartas DEPOIS da revelação — um momento em que a vista online nunca havia
     sido pintada antes deste arquivo. A troca de dono da Purificação NÃO é
     exigida aqui: ela depende de haver carta em Poder <= 0 na hora certa, o
     que jogo aleatório não garante. Quem cobre isso é purificacao.test.js,
     de forma dirigida — é o tipo de estado que se monta, não que se sorteia. */
  it("exercita a fase de Fim de Rodada", () => {
    const soma = (k) => corridas.reduce((t, c) => t + c.cob[k], 0);
    expect(soma("moscas"), "nenhuma Mosca chegou ao tabuleiro").toBeGreaterThan(0);
  });
});
