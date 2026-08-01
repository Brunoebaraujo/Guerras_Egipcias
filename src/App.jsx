import React, { useState, useRef, useEffect } from "react";
import Carta from "./Carta.jsx";
import {
  CARDS, PRAGAS, OUTORGAS, byKey, GLYPH, ARCH_COLOR, SIDE_NAME, custoDe,
  nextUid, resetUid, shuffled, coin, ctxOf, pushLog,
  power, laneScore, laneWins, matchResult, laneHasMaat, onEnterBlocked, validTargets, buildRevealQueue,
  resolveSobek, resolveDestroyOwnLane, resolveArmadura, resolveDestroyAllOfTypeInLane, resolveSekhmet,
  applyPendingBuff, resolveHeka, resolveBennuRebirth, aplicarBencao, descarregarPendentes,
  montarLogPartida, snapshotTabuleiro, decomporPartes, resolveSet, resolveAnubis,
  CONTENT_SIG, CARD_KEYS, laneProtegida,
} from "./engine.js";
import { freshMatch, applyAction, isAimable as podeMirar } from "./match.js";

/* ==========================================================================
   Guerras Egípcias — playtest (revelação simultânea com prioridade) sobre o tabuleiro
   ilustrado. O motor do jogo vive em engine.js (com testes); aqui fica só
   a orquestração e a interface.
   ========================================================================== */

const DECK_LIST = [
  "montu", "carruagem", "guardareal",
  "armadura", "escaravelho", "ammit", "enxame",
  "mumia", "sobek", "hathor", "set", "selo",
];
const START_HAND = 4;

const PRESETS = {
  "Padrão":     ["montu", "carruagem", "guardareal", "armadura", "escaravelho", "ammit", "enxame", "mumia", "sobek", "hathor", "set", "selo"],
  "Exército":   ["servo", "arqueiro", "escaravelho", "heka", "lanceiro", "carruagem", "enxame", "montu", "guardareal", "amon", "general", "colosso"],
  "Sacrifício": ["servo", "bennu", "mumia", "armadura", "hathor", "sobek", "enxame", "sekhmet", "apofis", "osiris", "diluvio", "set"],
  "Controle":   ["anubis", "maat", "selo", "sekhmet", "amon", "hathor", "montu", "osiris", "guardareal", "colosso", "general", "set"],
  "Bênção":     ["renenutet", "hathor", "heka", "armadura", "servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "escaravelho", "montu", "amon"],
  // Moisés traz +10 Pragas: 12 escolhidas viram 22 embaralhadas. As outras 11
  // vagas seguram as duas vias que o Moisés não ocupa.
  "Pragas":     ["moises", "servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "general", "montu", "armadura", "hathor", "escaravelho", "selo"],
  // Ocupação: corpo barato nas três vias, Domador para somar e Ápis para fechar.
  "Animais":    ["cao", "cabra-nilo", "ganso", "gato", "macaco", "hiena", "garca", "rebanho", "domador", "apis", "amon", "escaravelho"],
};
const COLLECTION = [...CARDS].sort((a, b) => a.custo - b.custo || a.nome.localeCompare(b.nome));

/* Quantas cartas o deck ganha de brinde (Moisés → 10 Pragas). O deckbuilder
   precisa avisar: o jogador escolhe 12, mas joga com 22. */
const contarOutorgadas = (deck) =>
  deck.reduce((n, k) => n + (byKey[k]?.outorga ? (OUTORGAS[byKey[k].outorga] || []).length : 0), 0);

function AvisoOutorga({ deck, estilo = "web" }) {
  const extras = contarOutorgadas(deck);
  if (!extras) return null;
  const txt = `+${extras} Pragas outorgadas pelo Moisés — a partida começa com ${deck.length + extras} cartas embaralhadas.`;
  if (estilo === "web") return <div className="text-xs text-amber-300/90 mb-2">{txt}</div>;
  return <div style={{ fontSize: 11, color: "#fcd34d", padding: "0 10px 6px" }}>{txt}</div>;
}
const PRAGAS_ORDENADAS = [...PRAGAS].sort((a, b) => a.custo - b.custo || a.nome.localeCompare(b.nome));

const ARCH_NOME = {
  base: "Base", buff: "Bênção", debuff: "Maldição", sacrificio: "Sacrifício", reset: "Equilíbrio",
  silencio: "Silêncio", movimento: "Movimento", crescimento: "Crescimento", fusao: "Fusão", renascimento: "Renascimento",
  animal: "Animal",
};

/* Dimensões de filtro da Galeria. Para acrescentar uma nova — tipo, set, o que
   for — basta uma entrada aqui: os chips, a contagem e a filtragem saem de
   graça, e os valores oferecidos são só os que existem na aba aberta. */
const DIMENSOES_FILTRO = [
  { id: "custo", rotulo: "Energia", de: (c) => c.custo,
    ordenar: (a, b) => a - b, rotuloValor: (v) => `${v}⚡` },
  { id: "arch", rotulo: "Arquétipo", de: (c) => c.arch,
    ordenar: (a, b) => (ARCH_NOME[a] || a).localeCompare(ARCH_NOME[b] || b),
    rotuloValor: (v) => `${GLYPH[v] || ""} ${ARCH_NOME[v] || v}`.trim(),
    classeValor: (v) => ARCH_COLOR[v] || "" },
];
const FILTROS_VAZIOS = Object.fromEntries(DIMENSOES_FILTRO.map((d) => [d.id, []]));

/* Grade da Galeria: mede a si mesma e deriva colunas e largura de carta.
   É componente, e não hook dentro do App, de propósito: o ref precisa existir
   quando o efeito roda. Com o hook no App, na montagem a tela é "deck", o
   ref era null, o efeito saía cedo e — com dependências [] — nunca mais rodava,
   deixando a carta travada no valor inicial.
   A carta precisa de largura NUMÉRICA porque toda a tipografia dela é derivada
   dessa medida; por isso 3 colunas no celular exigem medir, não só um
   breakpoint de CSS. */
function GradeGaleria({ cartas, onAmpliar }) {
  const ref = useRef(null);
  const [grade, setGrade] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const w = el.clientWidth || 0;
      if (!w) return;
      const gap = w < 640 ? 8 : 16;
      const cols = w >= 1000 ? 4 : 3;
      setGrade({ cols, gap, cardW: Math.max(88, Math.min(300, Math.floor((w - gap * (cols - 1)) / cols))) });
    };
    medir();
    if (typeof ResizeObserver === "undefined") {          // jsdom não tem ResizeObserver
      window.addEventListener("resize", medir);
      return () => window.removeEventListener("resize", medir);
    }
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = grade || { cols: 3, gap: 8, cardW: 88 };   // primeiro quadro: nunca maior que a coluna
  return (
    <div ref={ref} style={{
      display: "grid", gridTemplateColumns: `repeat(${g.cols}, minmax(0, 1fr))`,
      gap: g.gap, justifyItems: "center",
    }}>
      {cartas.map((def) => (
        <button key={def.key} onClick={() => onAmpliar(def)} title={`${def.nome} — toque para ampliar`}
          style={{ background: "none", border: "none", padding: 0, cursor: "zoom-in", lineHeight: 0 }}>
          <Carta nome={def.nome} custo={def.custo} poder={def.poder} tipo={def.tipo}
            efeito={def.texto} lore={def.lore} arch={def.arch} arte={def.arte}
            arteFoco={def.arteFoco} ordem={def.ordem} width={g.cardW} />
        </button>
      ))}
    </div>
  );
}

function FiltrosGaleria({ lista, filtros, onAlternar, onLimpar, visiveis }) {
  const ativos = DIMENSOES_FILTRO.reduce((n, d) => n + filtros[d.id].length, 0);
  return (
    <div className="mb-4 rounded-md border border-stone-700 bg-stone-800/40 p-3">
      {DIMENSOES_FILTRO.map((d) => {
        const valores = [...new Set(lista.map(d.de))].sort(d.ordenar);
        return (
          <div key={d.id} className="flex flex-wrap items-center gap-1.5 mb-2 last:mb-0">
            <span className="text-xs text-stone-400 w-20 shrink-0">{d.rotulo}</span>
            {valores.map((v) => {
              const on = filtros[d.id].includes(v);
              return (
                <button key={String(v)} onClick={() => onAlternar(d.id, v)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    on ? "bg-amber-700 border-amber-500 text-amber-50"
                       : `bg-stone-900 border-stone-700 hover:border-stone-500 ${d.classeValor ? d.classeValor(v) : "text-stone-300"}`
                  }`}>{d.rotuloValor(v)}</button>
              );
            })}
          </div>
        );
      })}
      <div className="flex items-center gap-3 pt-1 text-xs text-stone-400">
        <span>{visiveis} de {lista.length} cartas</span>
        {ativos > 0 && (
          <button onClick={onLimpar} className="text-amber-300 hover:text-amber-200 underline">
            limpar filtros ({ativos})
          </button>
        )}
      </div>
    </div>
  );
}

/* Geometria do tabuleiro (tabuleiro.webp, 1535×1024) — tudo em % da imagem.
   Medido por análise de pixels; ajuste fino aqui se algo não cair no lugar. */
const BOARD = {
  ratio: "1535 / 1024",
  laneCx: [30.7, 49.5, 68.0],                       // centro das 3 vias
  zone: { w: 11.8, top: { y: 9.4, h: 25.4 }, bot: { y: 66.4, h: 24.5 } },
  circle: { d: 5.4, topCy: 39.1, botCy: 62.0 },     // discos de placar
};

/* Animações compartilhadas entre a interface desktop e a mobile. */
const DUAT_KEYFRAMES = `
  @keyframes duatPop { 0%{transform:scale(.7);opacity:.35} 60%{transform:scale(1.09)} 100%{transform:scale(1);opacity:1} }
  @keyframes duatFloat { 0%{opacity:0;transform:translate(-50%,3px)} 25%{opacity:1} 100%{opacity:0;transform:translate(-50%,-22px)} }
  @keyframes duatVanish { 0%{opacity:1;transform:scale(1)} 30%{opacity:.9;transform:scale(1.04)} 100%{opacity:0;transform:scale(.5) rotate(-8deg)} }
  @keyframes duatZoomIn { 0%{transform:scale(.85);opacity:0} 100%{transform:scale(1);opacity:1} }
  @keyframes duatCharge { 0%,100%{ box-shadow:0 0 3px 1px rgba(251,191,36,.5), 0 0 8px 2px rgba(251,191,36,.22) } 50%{ box-shadow:0 0 7px 2px rgba(251,191,36,.95), 0 0 17px 5px rgba(251,191,36,.5) } }
  .duat-pop { animation: duatPop .42s ease-out; }
  .duat-badge { animation: duatFloat .9s ease-out forwards; }
  .duat-vanish { animation: duatVanish .7s ease-in forwards; }
  .duat-zoom { animation: duatZoomIn .18s ease-out; }
  @keyframes duatBlessRing { 0%{ opacity:0; transform:scale(.82) } 18%{ opacity:.95 } 100%{ opacity:0; transform:scale(1.6) } }
  @keyframes duatBlessGlow { 0%,100%{ box-shadow:0 0 0 0 rgba(74,222,128,0) } 32%{ box-shadow:0 0 16px 6px rgba(74,222,128,.8) } }
  @keyframes duatBlessRise { 0%{ opacity:0; transform:translate(-50%,12px) scale(.65) } 18%{ opacity:1; transform:translate(-50%,0) scale(1.2) } 70%{ opacity:1; transform:translate(-50%,-14px) scale(1.05) } 100%{ opacity:0; transform:translate(-50%,-34px) scale(1) } }
  @keyframes duatBlessFonte { 0%{ opacity:0; transform:scale(.9) } 20%{ opacity:1 } 100%{ opacity:0; transform:scale(1.45) } }
  .duat-charge { animation: duatCharge 1.5s ease-in-out infinite; }
  .duat-bless-ring  { animation: duatBlessRing 1.15s cubic-bezier(.2,.7,.3,1) both; }
  .duat-bless-glow  { animation: duatBlessGlow 1.15s ease-out both; }
  .duat-bless-rise  { animation: duatBlessRise 1.5s ease-out both; }
  .duat-bless-fonte { animation: duatBlessFonte .95s ease-out both; }
  @keyframes duatDraw {
    0%   { opacity:0; transform:translateY(10px) scale(.9); box-shadow:0 0 0 0 rgba(251,191,36,0); }
    30%  { opacity:1; box-shadow:0 0 16px 6px rgba(251,191,36,.95), 0 0 34px 14px rgba(251,191,36,.5); }
    65%  { box-shadow:0 0 12px 4px rgba(251,191,36,.7), 0 0 24px 9px rgba(251,191,36,.32); }
    100% { opacity:1; transform:translateY(0) scale(1); box-shadow:0 0 0 0 rgba(251,191,36,0); }
  }
  .duat-draw { animation: duatDraw 1.15s ease-out; }
  @media (prefers-reduced-motion: reduce) { .duat-pop,.duat-badge,.duat-vanish,.duat-zoom,.duat-charge,.duat-draw,.duat-bless-ring,.duat-bless-glow,.duat-bless-rise,.duat-bless-fonte { animation: none; } }
`;

/* Largura de referência que alimenta as fontes proporcionais do MiniCard na
   grade mobile (MiniCard usa f(n)=max(8, bw*n/100)). */
const MOBILE_BW = 780;

/* Servidor multiplayer (Render). Pode ser sobrescrito no campo do lobby. */
const LOBBY_SERVER_DEFAULT = "wss://guerras-egipcias-server.onrender.com";
/* Aceita colar tanto a URL https:// (a que abre no navegador) quanto wss://. */
function normalizeWs(u) {
  let s = (u || "").trim().replace(/\/+$/, "");
  if (s.startsWith("https://")) s = "wss://" + s.slice(8);
  else if (s.startsWith("http://")) s = "ws://" + s.slice(7);
  else if (!/^wss?:\/\//.test(s)) s = "wss://" + s;
  return s;
}

/* Rótulo do resultado final, com o desempate por saldo de pontos. */
function resultLabel(g) {
  const r = matchResult(g);
  if (r.side === -1) return "Empate";
  return `Lado ${r.side === 0 ? "A" : "B"} venceu` + (r.tiebreak ? ` · saldo +${r.margin}` : "");
}

/* Largura de viewport, para escolher entre interface desktop e mobile. */
function useViewport() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return w;
}

// =================================== APP ===================================
export default function App() {
  // A orquestração da partida vive em match.js (redutor puro, compartilhado com
  // o servidor). Aqui só delegamos — nada de regra duplicada.
  const freshState = (lists = [DECK_LIST, DECK_LIST]) => freshMatch(lists);

  const [g, setG] = useState(() => freshState());
  const [screen, setScreen] = useState("deck");                 // "deck" | "game" | "galeria"
  const [build, setBuild] = useState([[...DECK_LIST], [...DECK_LIST]]);
  const [chosen, setChosen] = useState([DECK_LIST, DECK_LIST]);
  const [sel, setSel] = useState(null);       // {side, hid}
  const aim = g.awaitingAim;                  // mira pendente vive no ESTADO (match.js)
  const [moving, setMoving] = useState(null); // {uid, side, lane} — Escaravelho
  const [zoom, setZoom] = useState(null);     // {def, printed, baked, current, sub}
  const [msg, setMsg] = useState("");
  const [fast, setFast] = useState(false);
  const [galeriaAba, setGaleriaAba] = useState("colecao");      // "colecao" | "pragas"
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [cartaAmpliada, setCartaAmpliada] = useState(null);    // def da carta no zoom da Galeria
  const flashRef = useRef(null);

  // Interface: "auto" segue a largura da tela; o usuário pode forçar uma delas.
  const vw = useViewport();
  const [forceView, setForceView] = useState("auto");   // "auto" | "mobile" | "desktop"
  const isMobile = forceView === "auto" ? vw < 820 : forceView === "mobile";

  // O passo seguinte espera a animação terminar. Sem isso, uma distribuição de
  // bênçãos em varias ondas era cortada no meio pelo avanco automatico.
  function esperaRevelacao() {
    const b = g.blessings || [];
    if (!b.length) return fast ? 110 : 800;
    const ondas = Math.max(...b.map((x) => x.wave)) + 1;
    return fast ? 200 + 260 * ondas : 900 + 800 * ondas;
  }

  useEffect(() => {
    if (g.phase !== "revealing" || aim) return;
    const t = setTimeout(() => dispatch({ t: "step" }), esperaRevelacao());
    return () => clearTimeout(t);
  });

  const clone = (s) => JSON.parse(JSON.stringify(s));
  const commit = (s) => setG(s);
  function flash(t) { setMsg(t); clearTimeout(flashRef.current); flashRef.current = setTimeout(() => setMsg(""), 2600); }

  // Toda transição de partida passa por aqui: chama o redutor puro (match.js) e
  // só aplica se for legal. Ações ilegais viram um aviso na tela (flash).
  function dispatch(action) {
    const r = applyAction(g, action);
    if (r.error) { flash(r.error); return false; }
    commit(r.state);
    return true;
  }

  const planning = g.phase === "plan" && !g.finished;
  const isMovable = (c) =>
    planning && !aim && !c.dying && c.revealed && byKey[c.key].move && !c.moved && c.enteredRound < g.round;

  // ------------------------------- ZOOM -------------------------------------
  function zoomBoard(c) {
    const def = byKey[c.key];
    const cur = c.revealed ? power(c, ctxOf(g)) : null;
    /* Recolher pelo zoom, não pelo ✕ do canto: no tabuleiro remodelado aquele
       ✕ ficou pequeno demais para o toque. */
    const podeVoltar = planning && !aim && !moving && !c.revealed && !c.dying && c.enteredRound === g.round;
    setZoom({
      def, custo: custoDe(c), printed: c.printed, baked: c.baked || 0, current: cur,
      partes: c.revealed ? decomporPartes(c, ctxOf(g)) : null,
      sub: `Via ${c.lane + 1} · ${SIDE_NAME[c.owner]}` + (c.revealed ? "" : " · por revelar"),
      onReturn: podeVoltar ? () => { pickUp(c.uid); setZoom(null); } : null,
    });
  }
  function zoomHand(h) {
    const def = byKey[h.key];
    setZoom({ def, custo: custoDe(h), printed: h.printed, baked: h.baked || 0, current: null, sub: h.baked > 0 ? `Faixa da Múmia — volta valendo ${h.printed + h.baked}` : "na mão" });
  }

  // ----------------------------- PLANEJAR ----------------------------------
  function placeCard(side, lane) {
    if (!planning || aim || moving || !sel || sel.side !== side) return;
    if (dispatch({ t: "place", side, hid: sel.hid, lane })) setSel(null);
  }

  function resetPlan(side) {
    if (!planning || aim || moving) return;
    if (dispatch({ t: "resetPlan", side })) setSel(null);
  }

  function pickUp(cardUid) {
    if (!planning || aim || moving) return;
    const c = g.board.find((x) => x.uid === cardUid);
    if (!c || c.revealed) return;
    if (dispatch({ t: "pickup", side: c.owner, uid: cardUid })) setSel(null);
  }

  // ------------------------------ MOVIMENTO --------------------------------
  function startMove(c) {
    if (!isMovable(c)) return;
    setSel(null);
    setMoving(moving && moving.uid === c.uid ? null : { uid: c.uid, side: c.owner, lane: c.lane });
  }
  function moveTo(side, lane) {
    if (!moving || moving.side !== side) return;
    if (lane === moving.lane) { setMoving(null); return; }
    if (dispatch({ t: "move", side, uid: moving.uid, lane })) setMoving(null);
  }

  // ------------------------------ REVELAR ----------------------------------
  function startReveal() {
    if (!planning) return;
    setMoving(null); setSel(null);
    dispatch({ t: "startReveal" });
  }

  function applyAim(target) { dispatch({ t: "aim", targetUid: target.uid }); }
  function skipAim() { dispatch({ t: "skipAim" }); }
  // Regra de realce = regra de validação: a mesma função do match.js, para o
  // realce nunca oferecer um alvo que a ação "aim" vai recusar (Gato Egípcio).
  const isAimable = (c) => podeMirar(g, c);

  // ------------------------------ RODADAS ----------------------------------
  function nextRound() {
    if (g.phase !== "revealed") { flash("Revele as cartas antes de avançar."); return; }
    setSel(null); setMoving(null);
    dispatch({ t: "nextRound" });
  }
  function finish() { dispatch({ t: "finish" }); }
  function reset() { resetUid(); setSel(null); setMoving(null); setZoom(null); setMsg(""); setFast(false); setG(freshState(chosen)); }

  // ---------------------------- SELEÇÃO DE DECK ----------------------------
  const setDeck = (side, arr) => setBuild((b) => { const n = [b[0].slice(), b[1].slice()]; n[side] = arr; return n; });
  function toggleCard(side, k) {
    const cur = build[side];
    if (cur.includes(k)) setDeck(side, cur.filter((x) => x !== k));
    else if (cur.length < 12) setDeck(side, [...cur, k]);
    else flash("Deck cheio — 12 cartas (remova uma antes de trocar).");
  }
  const randomDeck = (side) => setDeck(side, shuffled(CARDS.map((c) => c.key)).slice(0, 12));
  function startMatch() {
    if (build[0].length !== 12 || build[1].length !== 12) { flash("Cada deck precisa ter exatamente 12 cartas."); return; }
    setChosen([build[0].slice(), build[1].slice()]);
    setG(freshState(build)); setSel(null); setMoving(null); setFast(false);
    setScreen("game");
  }

  const ctx = ctxOf(g);
  const wins = laneWins(g);

  // ============================ TELA: LOBBY ================================
  if (screen === "lobby") {
    return <Lobby onBack={() => setScreen("mpdeck")} deck={build[0].length === 12 ? build[0] : PRESETS["Padrão"]} />;
  }

  // ============================ TELA: GALERIA ==============================
  if (screen === "galeria") {
    const baseAba = galeriaAba === "colecao" ? COLLECTION : PRAGAS_ORDENADAS;
    const visiveis = baseAba.filter((c) =>
      DIMENSOES_FILTRO.every((d) => filtros[d.id].length === 0 || filtros[d.id].includes(d.de(c))));
    const alternarFiltro = (id, v) => setFiltros((f) => ({
      ...f, [id]: f[id].includes(v) ? f[id].filter((x) => x !== v) : [...f[id], v],
    }));
    const trocarAba = (id) => { setGaleriaAba(id); setFiltros(FILTROS_VAZIOS); };
    return (
      <div className="min-h-screen w-full bg-stone-900 text-stone-100 p-3 sm:p-5 font-sans">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-wrap items-center gap-3 justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-widest text-amber-200">𓂀 Guerras Egípcias <span className="text-stone-500 text-base font-normal tracking-normal">· Galeria de cartas</span></h1>
              <p className="text-xs text-stone-400">
                {galeriaAba === "colecao"
                  ? `${COLLECTION.length} cartas escolhíveis, ordenadas por custo.`
                  : `${PRAGAS.length} Pragas — não se escolhem: vêm de brinde com o Moisés e entram embaralhadas no deck.`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md overflow-hidden border border-stone-700">
                {[["colecao", "Coleção"], ["pragas", "Pragas"]].map(([id, rotulo]) => (
                  <button key={id} onClick={() => trocarAba(id)}
                    className={`px-3 py-2 text-sm ${galeriaAba === id ? "bg-amber-700 text-amber-100" : "bg-stone-800 hover:bg-stone-700 text-stone-300"}`}>{rotulo}</button>
                ))}
              </div>
              <button onClick={() => setScreen("deck")} className="px-3 py-2 rounded-md bg-stone-700 hover:bg-stone-600 text-sm">Voltar</button>
            </div>
          </header>
          {galeriaAba === "pragas" && (
            <div className="mb-4 rounded-md border border-amber-800/60 bg-amber-950/30 p-3 text-xs text-amber-200/90">
              As Pragas são <strong>cartas outorgadas</strong>: não ocupam vaga no deck e não podem ser escolhidas aqui.
              Ao colocar <strong>Moisés, Portador das Pragas</strong> no seu deck de 12, as 10 entram automaticamente no
              início da partida e o deck passa a ter 22 cartas embaralhadas. Cada Praga resolve seu efeito e deixa o
              campo sem ocupar espaço.
            </div>
          )}
          <FiltrosGaleria lista={baseAba} filtros={filtros} visiveis={visiveis.length}
            onAlternar={alternarFiltro} onLimpar={() => setFiltros(FILTROS_VAZIOS)} />

          <GradeGaleria cartas={visiveis} onAmpliar={setCartaAmpliada} />

          {visiveis.length === 0 && (
            <div className="text-center text-sm text-stone-400 py-10">
              Nenhuma carta com essa combinação de filtros.
            </div>
          )}

          {/* Zoom: a 3 colunas no celular a carta fica pequena para ler, então o
              toque tem que abrir uma versão legível. */}
          {cartaAmpliada && (
            <div onClick={() => setCartaAmpliada(null)} style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 50,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16,
            }}>
              <button onClick={() => setCartaAmpliada(null)} aria-label="Fechar" style={{
                position: "absolute", top: 14, right: 14, fontSize: 20, color: "#e7e5e4",
                background: "rgba(255,255,255,.08)", border: "1px solid #57534e",
                borderRadius: 8, lineHeight: 1, cursor: "pointer", padding: "4px 10px",
              }}>✕</button>
              <div onClick={(e) => e.stopPropagation()}>
                <Carta nome={cartaAmpliada.nome} custo={cartaAmpliada.custo} poder={cartaAmpliada.poder}
                  tipo={cartaAmpliada.tipo} efeito={cartaAmpliada.texto} lore={cartaAmpliada.lore}
                  arch={cartaAmpliada.arch} arte={cartaAmpliada.arte} arteFoco={cartaAmpliada.arteFoco}
                  ordem={cartaAmpliada.ordem} width={Math.min(330, (typeof window !== "undefined" ? window.innerWidth : 360) - 40)} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================ TELA: DECKS ================================
  if (screen === "mpdeck") {
    return <MpDeck build={build} setDeck={setDeck} flash={flash} setScreen={setScreen} msg={msg} />;
  }

  if (screen === "deck") {
    if (isMobile) return (
      <DeckMobile build={build} setDeck={setDeck} flash={flash} startMatch={startMatch}
        setScreen={setScreen} setForceView={setForceView} msg={msg} />
    );
    const ready = build[0].length === 12 && build[1].length === 12;
    const DeckPanel = (side) => {
      const cur = build[side];
      const full = cur.length === 12;
      return (
        <div key={side} className={`rounded-lg border ${side === 0 ? "border-amber-600" : "border-sky-600"} p-3`} style={{ backgroundColor: "#1c1a17" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-semibold tracking-wide ${side === 0 ? "text-amber-200" : "text-sky-200"}`}>{SIDE_NAME[side]}</h3>
            <span className={`text-sm font-bold ${full ? "text-emerald-400" : cur.length > 12 ? "text-rose-400" : "text-stone-300"}`}>{cur.length}/12</span>
          </div>
          <AvisoOutorga deck={cur} />
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.keys(PRESETS).map((name) => (
              <button key={name} onClick={() => setDeck(side, PRESETS[name].slice())}
                className="px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs">{name}</button>
            ))}
            <button onClick={() => randomDeck(side)} className="px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs">Aleatório</button>
            <button onClick={() => setDeck(side, [])} className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-xs text-stone-400">Limpar</button>
            {side === 1 && <button onClick={() => setDeck(1, build[0].slice())} className="px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs">Copiar A→B</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {COLLECTION.map((def) => {
              const on = cur.includes(def.key);
              const ring = on ? (side === 0 ? "border-amber-400 ring-2 ring-amber-400" : "border-sky-400 ring-2 ring-sky-400") : "border-stone-700 hover:border-stone-500";
              return (
                <button key={def.key} onClick={() => toggleCard(side, def.key)} title={def.texto || "Carta base (sem efeito)"}
                  className={`text-left rounded border p-1 bg-stone-800 ${ring} ${on ? "" : "opacity-80"}`}>
                  <div className={`text-xs ${ARCH_COLOR[def.arch]} overflow-hidden`}>{on ? "✓ " : ""}{GLYPH[def.arch]} {def.nome}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{def.custo}⚡ · P{def.poder} · {def.tipo}</div>
                </button>
              );
            })}
          </div>
        </div>
      );
    };
    return (
      <div className="min-h-screen w-full bg-stone-900 text-stone-100 p-3 sm:p-5 font-sans">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-wrap items-center gap-3 justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold tracking-widest text-amber-200">𓂀 Guerras Egípcias <span className="text-stone-500 text-base font-normal tracking-normal">· Montagem de decks</span></h1>
              <p className="text-xs text-stone-400">Cada lado escolhe 12 cartas (sem repetição). Ao iniciar, os decks são embaralhados.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setScreen("mpdeck")}
                className="px-3 py-2 rounded-md bg-indigo-700 hover:bg-indigo-600 text-sm text-indigo-50 font-semibold">⚔ Multiplayer</button>
              <button onClick={() => setScreen("galeria")}
                className="px-3 py-2 rounded-md bg-stone-700 hover:bg-stone-600 text-sm">Galeria</button>
              <button onClick={() => setForceView("mobile")} title="Ver a interface mobile"
                className="px-3 py-2 rounded-md bg-stone-800 hover:bg-stone-700 text-sm text-stone-300">📱</button>
              <button onClick={startMatch} disabled={!ready}
                className={`px-4 py-2 rounded-md font-semibold text-sm ${ready ? "bg-emerald-600 hover:bg-emerald-500 text-stone-900" : "bg-stone-700 text-stone-500 cursor-not-allowed"}`}>
                Embaralhar e iniciar
              </button>
            </div>
          </header>
          {msg && <div className="mb-3 px-3 py-2 rounded bg-rose-950 border border-rose-800 text-rose-200 text-sm">{msg}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[0, 1].map((s) => DeckPanel(s))}</div>
          <p className="text-xs text-stone-500 mt-3">Dica: comece de um preset e ajuste, ou monte do zero clicando nas cartas. {CARDS.length} cartas na coleção, 12 por deck.</p>
        </div>
      </div>
    );
  }

  // =============================== RENDER ==================================
  async function copiarLog() {
    const txt = montarLogPartida(g);
    try {
      await navigator.clipboard.writeText(txt);
      flash("Log copiado para a área de transferência.");
    } catch {
      baixarLog(); // sem permissão de clipboard: cai para download
    }
  }
  function baixarLog() {
    const txt = montarLogPartida(g);
    const url = URL.createObjectURL(new Blob([txt], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `duat-log-r${g.round}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Log baixado.");
  }

  if (isMobile) {
    return (
      <>
        <GameMobile
          g={g} ctx={ctx} wins={wins} planning={planning}
          sel={sel} setSel={setSel} aim={aim} moving={moving} msg={msg} fast={fast}
          startReveal={startReveal} setFast={setFast} nextRound={nextRound} reset={reset}
          setScreen={setScreen} setForceView={setForceView}
          placeCard={placeCard} pickUp={pickUp} resetPlan={resetPlan} startMove={startMove} moveTo={moveTo}
          applyAim={applyAim} skipAim={skipAim} isAimable={isAimable} isMovable={isMovable}
          zoomBoard={zoomBoard} zoomHand={zoomHand} copiarLog={copiarLog} baixarLog={baixarLog} />
        {zoom && <ZoomModal zoom={zoom} onClose={() => setZoom(null)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen w-full bg-stone-900 text-stone-100 p-3 sm:p-5 font-sans">
      <style>{DUAT_KEYFRAMES}</style>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center gap-3 justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-amber-200">
              𓂀 Guerras Egípcias <span className="text-stone-500 text-base font-normal tracking-normal">· playtest</span>
            </h1>
            <p className="text-xs text-stone-400">Revelação por prioridade · abre com 3 · compra 1/rodada · clique numa carta para ampliá-la</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Chip label="Rodada" value={`${g.round}/6`} />
            <Chip label="Energia A" value={g.energy[0]} tone="amber" />
            <Chip label="Energia B" value={g.energy[1]} tone="sky" />
            {planning && <button onClick={startReveal} className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-stone-900 font-semibold text-sm">Revelar</button>}
            {g.phase === "revealing" && <button onClick={() => setFast((f) => !f)} className={`px-3 py-2 rounded-md text-sm font-semibold ${fast ? "bg-sky-500 text-stone-900" : "bg-stone-700 hover:bg-stone-600"}`}>{fast ? "⏩ rápido" : "⏩ acelerar"}</button>}
            {g.phase === "revealed" && !g.finished && <button onClick={nextRound} className="px-3 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-stone-900 font-semibold text-sm">{g.round >= 6 ? "Finalizar partida" : "Próxima rodada"}</button>}
            <button onClick={reset} className="px-3 py-2 rounded-md bg-stone-700 hover:bg-stone-600 text-sm">Reiniciar</button>
            <button onClick={() => setScreen("deck")} className="px-3 py-2 rounded-md bg-stone-800 hover:bg-stone-700 text-sm text-stone-300">Decks</button>
            <button onClick={() => setForceView("mobile")} className="px-3 py-2 rounded-md bg-stone-800 hover:bg-stone-700 text-sm text-stone-300" title="Ver a interface mobile">📱</button>
          </div>
        </header>

        <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
          <span className={`px-2 py-1 rounded font-semibold ${planning ? "bg-stone-800 text-stone-200" : g.phase === "revealing" ? "bg-indigo-900 text-indigo-100" : "bg-emerald-900 text-emerald-100"}`}>
            {planning ? "Planejar" : g.phase === "revealing" ? "Revelando…" : "Revelado"}
          </span>
          <span className="text-stone-400">Prioridade:</span>
          <span className={`font-bold ${g.priority === 0 ? "text-amber-300" : "text-sky-300"}`}>{SIDE_NAME[g.priority]}</span>
          <span className="text-stone-500">({g.priorityReason})</span>
          {g.trevas === g.round && (
            <span className="px-2 py-1 rounded bg-indigo-950 border border-indigo-700 text-indigo-200 text-xs">
              ⊘ Trevas — as cartas desta rodada permanecem ocultas
            </span>
          )}
          <span className="ml-auto text-stone-400">Vias:</span>
          <span className="text-amber-300 font-bold">A {wins[0]}</span><span className="text-stone-600">×</span><span className="text-sky-300 font-bold">{wins[1]} B</span>
          {g.finished && <span className="px-3 py-1 rounded bg-stone-800 border border-amber-600 text-amber-200 font-semibold">{resultLabel(g)}</span>}
        </div>

        {msg && <div className="mb-3 px-3 py-2 rounded bg-rose-950 border border-rose-800 text-rose-200 text-sm">{msg}</div>}
        {moving && <div className="mb-3 px-3 py-2 rounded bg-sky-950 border border-sky-700 text-sky-100 text-sm">⇄ Movendo o Escaravelho — clique numa via do {SIDE_NAME[moving.side]} para onde levá-lo (ou clique nele de novo para cancelar).</div>}
        {aim && (
          <div className="mb-3 px-3 py-2 rounded bg-indigo-950 border border-indigo-700 text-indigo-100 text-sm flex items-center gap-3">
            <span>🎯 <b>{aim.srcNome}</b> ({SIDE_NAME[aim.side]}): escolha {aim.needs === "ally" ? "um aliado" : "uma carta inimiga"} na Via {aim.lane + 1}.</span>
            <button onClick={skipAim} className="ml-auto px-2 py-1 rounded bg-stone-700 hover:bg-stone-600 text-xs">Pular alvo</button>
          </div>
        )}

        <Hand side={0} tone="amber" g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} onZoom={zoomHand} />

        <div className="mt-3 overflow-x-auto rounded-xl">
          <Tabuleiro g={g} ctx={ctx} aim={aim} moving={moving} sel={sel} planning={planning}
            placeCard={placeCard} moveTo={moveTo} applyAim={applyAim} isAimable={isAimable}
            startMove={startMove} isMovable={isMovable} pickUp={pickUp} zoomBoard={zoomBoard} />
        </div>

        <div className="mt-3"><Hand side={1} tone="sky" g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} onZoom={zoomHand} /></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
          <div className="lg:col-span-2 rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-widest text-stone-400">Registro da partida</h3>
              <div className="flex gap-1">
                <button onClick={copiarLog} className="text-[10px] px-2 py-0.5 rounded border border-stone-600 text-stone-300 hover:bg-stone-700">Copiar</button>
                <button onClick={baixarLog} className="text-[10px] px-2 py-0.5 rounded border border-stone-600 text-stone-300 hover:bg-stone-700">Baixar</button>
              </div>
            </div>
            <div className="space-y-1 overflow-auto text-sm text-stone-300 pr-1" style={{ maxHeight: 220 }}>
              {g.log.map((l, i) => (<div key={i} className={i === 0 ? "text-stone-100" : "text-stone-400"}>{l}</div>))}
            </div>
          </div>
          <div className="rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17" }}>
            <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-2">Como jogar no tabuleiro</h3>
            <ul className="text-xs text-stone-400 space-y-1 list-disc pl-4">
              <li>Selecione uma carta na mão e clique na <b>área da via</b> (retângulo de pedra) para posicioná-la.</li>
              <li>O <b>disco claro</b> de cada via mostra a soma de poder daquele lado — o líder ganha um anel na cor do lado.</li>
              <li>Clique em qualquer carta (mão ou mesa) para <b>ampliá-la</b> com efeito e lore.</li>
              <li>Escaravelho ⇄: na rodada seguinte, clique nele e depois em outra via para movê-lo.</li>
              <li>⚖ na faixa do rio indica que a Maat prende a via ao poder impresso.</li>
            </ul>
          </div>
        </div>
      </div>

      {zoom && <ZoomModal zoom={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* ============================ TABULEIRO ILUSTRADO ========================= */
function Tabuleiro({ g, ctx, aim, moving, sel, planning, placeCard, moveTo, applyAim, isAimable, startMove, isMovable, pickUp, zoomBoard }) {
  const base = import.meta.env.BASE_URL;
  const ref = useRef(null);
  const [bw, setBw] = useState(900);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver((e) => setBw(e[0].contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const px = (pct) => (bw * pct) / 100;

  const zoneStyle = (lane, side) => {
    const z = BOARD.zone; const v = side === 0 ? z.top : z.bot;
    return { position: "absolute", left: `${BOARD.laneCx[lane] - z.w / 2}%`, top: `${v.y}%`, width: `${z.w}%`, height: `${v.h}%` };
  };

  return (
    <div ref={ref} className="relative w-full select-none" style={{
      aspectRatio: BOARD.ratio, minWidth: 720,
      backgroundImage: `url(${base}tabuleiro.webp)`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
      borderRadius: 12, boxShadow: "0 0 0 1px #44403c, 0 8px 30px rgba(0,0,0,.5)",
    }}>
      {[0, 1, 2].map((lane) => {
        const sA = laneScore(ctx, lane, 0), sB = laneScore(ctx, lane, 1);
        const winner = sA > sB ? 0 : sB > sA ? 1 : -1;
        const maat = laneHasMaat(g.board, lane);
        return (
          <React.Fragment key={lane}>
            {[0, 1].map((side) => (
              <LaneZone key={side} side={side} lane={lane} g={g} ctx={ctx} bw={bw} px={px}
                style={zoneStyle(lane, side)} aim={aim} moving={moving}
                canDrop={planning && sel && sel.side === side && !moving}
                onDrop={() => placeCard(side, lane)} onMoveHere={() => moveTo(side, lane)}
                onTarget={(c) => aim && isAimable(c) && applyAim(c)}
                onStartMove={startMove} isMovable={isMovable}
                onRemove={planning ? pickUp : null} aimable={isAimable} onZoom={zoomBoard}
                tone={side === 0 ? "amber" : "sky"} />
            ))}
            {/* Discos de placar (soma de poder da via, por lado) */}
            <ScoreDisc cx={BOARD.laneCx[lane]} cy={BOARD.circle.topCy} d={BOARD.circle.d} px={px} v={sA} tone="amber" lead={winner === 0} />
            <ScoreDisc cx={BOARD.laneCx[lane]} cy={BOARD.circle.botCy} d={BOARD.circle.d} px={px} v={sB} tone="sky" lead={winner === 1} />
            {/* Faixa do rio: identificação da via + estado */}
            <div style={{ position: "absolute", left: `${BOARD.laneCx[lane]}%`, top: "50.5%", transform: "translate(-50%,-50%)", zIndex: 4, pointerEvents: "none", textAlign: "center" }}>
              <div style={{
                background: "rgba(15,12,8,.62)", border: "1px solid rgba(247,233,192,.35)", borderRadius: 999,
                padding: `${px(0.25)}px ${px(0.9)}px`, color: "#f7e9c0", fontFamily: "Georgia, serif",
                fontSize: Math.max(10, px(1.05)), letterSpacing: 1, whiteSpace: "nowrap",
              }}>
                VIA {lane + 1}{maat ? " · ⚖" : winner >= 0 ? ` · ♛ ${winner === 0 ? "A" : "B"}` : ""}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ScoreDisc({ cx, cy, d, px, v, tone, lead }) {
  const ring = tone === "amber" ? "rgba(251,191,36,.95)" : "rgba(56,189,248,.95)";
  return (
    <div style={{
      position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%,-50%)",
      width: `${d}%`, aspectRatio: "1", borderRadius: "50%", zIndex: 4,
      display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
      boxShadow: lead ? `0 0 0 ${Math.max(2, px(0.22))}px ${ring}, 0 0 ${px(1.2)}px ${ring}` : "none",
      transition: "box-shadow .3s ease",
    }}>
      <span style={{
        fontFamily: "Georgia, serif", fontWeight: 800, color: "#3a2b12", lineHeight: 1,
        fontSize: Math.max(15, px(v >= 100 ? 1.9 : 2.5)),
        textShadow: "0 1px 0 rgba(255,255,255,.45)",
      }}>{v}</span>
    </div>
  );
}

function LaneZone({ side, lane, g, ctx, bw, px, style, aim, moving, canDrop, onDrop, onMoveHere, onTarget, onStartMove, isMovable, onRemove, aimable, onZoom, tone }) {
  const cards = g.board.filter((c) => c.lane === lane && c.owner === side);
  const canMoveHere = moving && moving.side === side && moving.lane !== lane;
  const active = canDrop || canMoveHere;
  const ringColor = tone === "amber" ? "rgba(251,191,36,.8)" : "rgba(56,189,248,.8)";
  const zoneClick = canMoveHere ? onMoveHere : canDrop ? onDrop : undefined;
  return (
    <div onClick={zoneClick} style={{ ...style, cursor: active ? "pointer" : "default", zIndex: 3 }}>
      <div style={{
        position: "absolute", inset: `-${px(0.35)}px`, borderRadius: px(0.8), pointerEvents: "none",
        boxShadow: active ? `inset 0 0 0 ${Math.max(2, px(0.2))}px ${ringColor}, 0 0 ${px(1)}px ${ringColor}` : "none",
        transition: "box-shadow .2s ease",
      }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: px(0.5), width: "100%", height: "100%", padding: px(0.35) }}>
        {[0, 1, 2, 3].map((slot) => {
          const c = cards[slot];
          if (!c) return <div key={slot} style={{ borderRadius: px(0.5), border: active ? `1px dashed ${ringColor}` : "1px dashed rgba(247,233,192,.06)" }} />;
          const canTarget = aim && aimable(c);
          const movable = isMovable(c);
          const isMoving = moving && moving.uid === c.uid;
          const reveal = g.lastReveal && g.lastReveal.uid === c.uid ? g.lastReveal.seq : null;
          const badge = g.effect && g.effect.uid === c.uid ? g.effect : null;
          const blessings = (g.blessings || []).filter((b) => b.uid === c.uid);
          // Heka revelada "carrega" o brilho enquanto o dono tiver reserva pendente.
          const charging = c.key === "heka" && c.revealed && !c.dying && !!(g.pendingBuff && g.pendingBuff[c.owner]);
          let onClick;
          if (c.dying) onClick = undefined;
          else if (canTarget) onClick = (e) => { e.stopPropagation(); onTarget(c); };
          else if (movable || isMoving) onClick = (e) => { e.stopPropagation(); onStartMove(c); };
          else onClick = (e) => { e.stopPropagation(); onZoom(c); };
          return (
            <MiniCard key={c.uid} c={c} ctx={ctx} bw={bw} canTarget={canTarget} movable={movable} isMoving={isMoving}
              reveal={reveal} badge={badge} blessings={blessings} dying={!!c.dying} charging={charging} onClick={onClick}
              onRemove={onRemove && !c.revealed && !c.dying ? (e) => { e.stopPropagation(); onRemove(c.uid); } : null} />
          );
        })}
      </div>
    </div>
  );
}

const BADGE_COLOR = { buff: "text-emerald-300", debuff: "text-rose-300", sac: "text-emerald-300", fuse: "text-teal-300", block: "text-stone-300", movimento: "text-sky-300" };
function EffectBadge({ badge, size }) {
  if (!badge) return null;
  return (
    <div key={badge.seq} className="duat-badge" style={{ position: "absolute", left: "50%", top: -4, fontSize: size, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,.85)", zIndex: 6 }}>
      <span className={BADGE_COLOR[badge.kind] || "text-stone-200"}>{badge.text}</span>
    </div>
  );
}

/* Carta em miniatura sobre o tabuleiro: arte de fundo quando existir. */
function MiniCard({ c, ctx, bw, canTarget, movable, isMoving, reveal, badge, blessings = [], dying, charging, onClick, onRemove }) {
  const base = import.meta.env.BASE_URL;
  const def = byKey[c.key];
  const f = (n) => Math.max(8, (bw * n) / 100);       // fontes proporcionais ao tabuleiro
  /* ESPAÇAMENTO ≠ FONTE. `f` tem piso de 8px porque fonte menor que isso não se
     lê. Aplicar esse mesmo piso a padding/gap era um defeito silencioso: numa
     carta de ~45px de largura, f(0.25) virava 8px de respiro por lado — 35% da
     carta gasta em margem, espremendo a arte. `u` escala de verdade. */
  const u = (n) => Math.max(1, (bw * n) / 100);
  const artSrc = def.arte ? `${base}cartas/${def.arte}.webp` : null;
  // Lado dono: ouro para A, lápis para B. Leitura de posse sem depender da posição.
  const ladoCor = c.owner === 0 ? "rgba(251,191,36,.62)" : "rgba(125,211,252,.62)";

  const common = {
    position: "relative", width: "100%", height: "100%", borderRadius: (bw * 0.5) / 100,
    overflow: "visible", cursor: "pointer",
  };
  const frame = {
    position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
  };

  if (!c.revealed) {
    const prov = c.printed + (c.baked || 0);
    return (
      <div onClick={onClick} className={dying ? "duat-vanish" : ""} style={common} title={`${def.nome} — por revelar`}>
        <EffectBadge badge={badge} size={f(1.05)} />
        <div style={{ ...frame, background: "rgba(20,15,8,.82)", border: `1px dashed ${ladoCor}`, padding: u(0.3) }}>
          {onRemove && <button onClick={onRemove} style={{ position: "absolute", top: 0, right: u(0.3), color: "#a8a29e", fontSize: f(1.1), zIndex: 7 }}>✕</button>}
          <div className={ARCH_COLOR[def.arch]} style={{ fontSize: f(1.2), lineHeight: 1, opacity: 0.7 }}>{GLYPH[def.arch]}</div>
          <div style={{ color: "#a8a29e", fontSize: f(0.85), lineHeight: 1.1, textAlign: "center", overflow: "hidden" }}>{def.nomeCurto}</div>
          <div style={{ color: "#78716c", fontSize: f(0.8), textAlign: "center" }}>oculta · {prov}</div>
        </div>
      </div>
    );
  }

  const ehPraga = def.tipo === "Praga";
  // Escudo discreto: esta carta está sob a Aura de um Gato Egípcio da via.
  const protegida = laneProtegida(ctx.board, c.owner, c.lane);
  const p = power(c, ctx);
  const refP = c.printed + (c.baked || 0);
  const maat = laneHasMaat(ctx.board, c.lane);
  const pColor = maat ? "#fcd34d" : p > refP ? "#4ade80" : p < refP ? "#f87171" : "#f5f5f4";
  const border =
    dying ? "1.5px solid #be123c"
    : canTarget ? "2px solid #818cf8"
    : isMoving ? "2px solid #38bdf8"
    : movable ? "1.5px solid #0ea5e9"
    : `1.5px solid ${ladoCor}`;

  return (
    <div onClick={onClick} className={dying ? "duat-vanish" : reveal ? "duat-pop" : ""} style={common} title={def.texto || def.nome}>
      {charging && <div className="duat-charge" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", zIndex: 5 }} />}
      {blessings.map((b, i) => {
        // A fonte pisca 0,18s antes dos alvos: origem primeiro, destino depois.
        const atraso = b.wave * 0.8 + (b.role === "fonte" ? 0 : 0.18);
        const d = `${atraso}s`;
        if (b.role === "fonte") return (
          <div key={`f${b.seq}-${b.wave}-${i}`} className="duat-bless-fonte"
            style={{ position: "absolute", inset: -3, borderRadius: "inherit", pointerEvents: "none", zIndex: 6,
                     border: "2px solid rgba(251,191,36,.95)", boxShadow: "0 0 12px 3px rgba(251,191,36,.55)", animationDelay: d }} />
        );
        return (
          <React.Fragment key={`a${b.seq}-${b.wave}-${i}`}>
            <div className="duat-bless-ring" style={{ position: "absolute", inset: -4, borderRadius: "inherit", pointerEvents: "none", zIndex: 6, border: "2.5px solid rgba(74,222,128,.95)", animationDelay: d }} />
            <div className="duat-bless-glow" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", zIndex: 6, animationDelay: d }} />
            <span className="duat-bless-rise" style={{ position: "absolute", left: "50%", top: "-4px", zIndex: 9, pointerEvents: "none", fontWeight: 900, fontSize: f(1.6), color: "#4ade80", textShadow: "0 0 6px rgba(74,222,128,.7), 0 1px 3px rgba(0,0,0,.95)", animationDelay: d }}>+1</span>
          </React.Fragment>
        );
      })}
      <EffectBadge badge={badge} size={f(1.05)} />
      <div style={{ ...frame, border, background: artSrc ? "#000" : "rgba(28,24,17,.9)", boxShadow: canTarget ? "0 0 10px rgba(129,140,248,.8)" : "0 2px 6px rgba(0,0,0,.55)" }}>
        {artSrc && <img src={artSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.92 }} />}
        {/* Véu: escuro no topo (para os glifos) e na base (para a faixa do nome).
            O miolo fica limpo — é o assunto da ilustração. */}
        {artSrc && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 54%, rgba(0,0,0,.5) 76%, rgba(0,0,0,.86) 100%)" }} />}

        {/* Topo: arquétipo e sinais de estado. O CUSTO saiu daqui de propósito —
            depois de revelada a carta, custo não é mais informação acionável;
            ele continua na mão e no zoom, que é onde decide alguma coisa. */}
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: u(0.25), padding: `${u(0.3)}px ${u(0.35)}px 0` }}>
          <span className={ARCH_COLOR[def.arch]} style={{ fontSize: f(1.0), lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>{GLYPH[def.arch]}</span>
          {protegida && <span title="Protegida pelo Gato Egípcio — efeitos inimigos não podem escolhê-la"
            style={{ color: "#bef264", fontSize: f(0.85), lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>⛨</span>}
          {movable && <span title="Pode ser movida nesta rodada"
            style={{ color: "#7dd3fc", fontSize: f(0.85), lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>⇄</span>}
          {c.ulceras && <span title="Ulcerada — perde 1 de Poder no início de cada rodada"
            style={{ color: "#fda4af", fontSize: f(0.85), lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>☠</span>}
        </div>

        {/* a arte respira: nada escrito por cima do miolo da ilustração */}
        <div style={{ flex: 1 }} />

        {/* FAIXA DO NOME — placa própria na base, fora da arte. Antes o nome caía
            no centro da ilustração, exatamente onde ela tem mais detalhe.
            Uma linha só: `nomeCurto` é sempre uma palavra, então não há o que
            quebrar, e a faixa de duas linhas devolveu altura para a arte. Nome
            comprido demais para a largura degrada em reticências, não em corte. */}
        <div style={{
          position: "relative", background: "rgba(8,6,4,.74)", borderTop: "1px solid rgba(247,233,192,.16)",
          padding: `${u(0.26)}px ${u(0.28)}px ${u(0.32)}px`, color: "#ece9e4",
          fontSize: f(0.82), lineHeight: 1.06, textAlign: "center", letterSpacing: -0.1,
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          textShadow: "0 1px 2px rgba(0,0,0,.9)",
        }}>{def.nomeCurto}</div>
      </div>

      {/* PODER — plaqueta opaca atravessando o canto superior direito. É o único
          número da carta em campo, então tem que ganhar de tudo o mais. */}
      <div style={{
        position: "absolute", right: -u(0.32), top: -u(0.32), zIndex: 8, pointerEvents: "none",
        minWidth: f(1.85), height: f(1.85), padding: `0 ${u(0.3)}px`, borderRadius: f(0.65),
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: ehPraga ? "#c8a24a" : "rgba(7,6,4,.94)",
        border: `1.5px solid ${ehPraga ? "rgba(43,32,16,.8)" : ladoCor}`,
        boxShadow: "0 1px 4px rgba(0,0,0,.85)",
        fontFamily: "Georgia, serif", fontWeight: 900, lineHeight: 1,
        color: ehPraga ? "#2b2010" : pColor, fontSize: f(1.2),
      }} title={ehPraga ? "Praga — resolve o efeito e deixa o campo" : "Poder"}>
        {/* Praga não tem Poder: mostra o número da praga, não um zero mentiroso. */}
        {ehPraga ? def.ordem : p}
      </div>
    </div>
  );
}

/* ============================ ZOOM DE CARTA =============================== */
const PART_COLOR = {
  base: "text-stone-300", acumulado: "text-amber-300", bencao: "text-emerald-300",
  inerte: "text-emerald-400/70", maldicao: "text-rose-300", continuo: "text-sky-300",
  maat: "text-yellow-300", julgado: "text-yellow-300",
};

function ZoomModal({ zoom, onClose }) {
  const { def, printed, baked, current, sub, partes, onReturn } = zoom;   // zoom.custo = custo efetivo
  const shown = current != null ? current : printed + (baked || 0);
  const w = Math.min(320, typeof window !== "undefined" ? window.innerWidth * 0.78 : 320);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" }}>
      <div className="duat-zoom" onClick={(e) => e.stopPropagation()} style={{ cursor: "default" }}>
        <Carta nome={def.nome} custo={zoom.custo != null ? zoom.custo : def.custo} poder={shown} tipo={def.tipo}
          efeito={def.texto} lore={def.lore} arch={def.arch} arte={def.arte} arteFoco={def.arteFoco} ordem={def.ordem} width={w} />
        <div className="text-center mt-2 text-sm text-stone-300" style={{ maxWidth: w }}>
          <div>{sub}</div>
          {onReturn && (
            <button onClick={onReturn}
              className="mt-2 w-full rounded border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20">
              ↩ Retornar para a mão
            </button>
          )}
          <div className="text-xs text-stone-400 mt-0.5">
            Impresso {def.poder}{baked > 0 ? ` · Faixa +${baked}` : ""}{current != null && current !== printed + baked ? ` · Atual ${current}` : ""}
          </div>
          {partes && partes.length > 1 && (
            <div className="mt-2 text-left rounded border border-stone-700 bg-stone-900/70 px-2 py-1.5" style={{ maxWidth: w }}>
              <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Composição do poder</div>
              {partes.map((p, i) => (
                <div key={i} className="flex justify-between gap-3 text-xs leading-5">
                  <span className={PART_COLOR[p.tipo]}>
                    {p.label}{p.tipo === "continuo" ? " · contínuo" : p.tipo === "inerte" ? " · inerte" : ""}
                  </span>
                  <span className={`tabular-nums ${PART_COLOR[p.tipo]}`}>
                    {p.tipo === "base" || p.tipo === "maat" ? p.val || "" : `${p.val > 0 ? "+" : ""}${p.val}`}
                  </span>
                </div>
              ))}
              <div className="flex justify-between gap-3 text-xs font-bold border-t border-stone-700 mt-1 pt-1">
                <span>Total</span><span className="tabular-nums">{shown}</span>
              </div>
            </div>
          )}
          <button onClick={onClose} className="mt-2 px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-xs">Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ Subcomponentes ============================== */
function Chip({ label, value, tone = "stone" }) {
  const t = tone === "amber" ? "text-amber-300" : tone === "sky" ? "text-sky-300" : "text-stone-200";
  return <div className="px-2 py-1 rounded-md bg-stone-800 border border-stone-700 text-xs"><span className="text-stone-500">{label} </span><span className={`font-bold ${t}`}>{value}</span></div>;
}

/* Carta da mao, no NIVEL DO MODULO — e nao dentro de Hand.
   Componente declarado dentro de outro componente ganha identidade nova a cada
   render do pai. O React compara os tipos, ve funcoes diferentes, e em vez de
   atualizar ele DESMONTA e REMONTA a subarvore inteira. Duas consequencias:
   o DOM de toda a mao era destruido e reconstruido a cada clique, e a animacao
   CSS `duat-draw` (o halo dourado da compra) recomecava do zero junto, porque
   animacao de CSS reinicia quando o elemento monta.
   Aqui em cima, a mao so e remontada quando uma carta entra ou sai dela — que
   e exatamente quando o halo DEVE tocar. */
function HandCard({ h, side, tone, g, sel, setSel, disabled, onZoom }) {
  const def = byKey[h.key];
  const isSel = !!sel && sel.side === side && sel.hid === h.hid;
  const custo = custoDe(h);
  const afford = g.energy[side] >= custo;
  const agravada = custo > def.custo;
  const faixa = h.baked > 0 ? ` · Faixa ${h.printed + h.baked}` : ` · P${h.printed}`;
  const drawn = g.justDrew?.[side]?.includes(h.hid);
  const ring = isSel ? (tone === "amber" ? "ring-2 ring-amber-400" : "ring-2 ring-sky-400") : "";
  return (
    <div className={`relative rounded border bg-stone-800 border-stone-700 ${ring} ${drawn ? "duat-draw" : ""} ${disabled ? "opacity-40" : afford ? "hover:border-stone-500" : "opacity-50"}`} style={{ width: 122 }}>
      <button disabled={disabled} onClick={() => setSel(isSel ? null : { side, hid: h.hid })} title={def.texto || "Carta base (sem efeito)"}
        className="text-left w-full p-1 pr-5">
        <div className={`text-xs ${ARCH_COLOR[def.arch]} overflow-hidden`}>{GLYPH[def.arch]} {def.nomeCurto}</div>
        <div className="text-xs text-stone-400 mt-0.5"><span className={agravada ? "text-rose-300 font-semibold" : ""}>{custo}⚡</span>{faixa}</div>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onZoom(h); }} title="Ampliar carta"
        className="absolute top-0.5 right-0.5 text-stone-500 hover:text-amber-300 text-xs leading-none p-0.5">🔍</button>
    </div>
  );
}

function Hand({ side, tone, g, sel, setSel, disabled, onZoom }) {
  const accent = tone === "amber" ? "border-amber-600 text-amber-200" : "border-sky-600 text-sky-200";
  const hand = g.hand[side];
  const returned = hand.filter((h) => h.baked > 0);
  const normal = hand.filter((h) => h.baked === 0);
  const isPrio = g.priority === side;
  const props = { side, tone, g, sel, setSel, disabled, onZoom };
  return (
    <div className={`rounded-lg border ${accent} p-3`} style={{ backgroundColor: "#1c1a17" }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-wide">{SIDE_NAME[side]} {isPrio && <span className="text-xs text-stone-400">· revela primeiro</span>}</h3>
        <span className="text-xs text-stone-400">energia {g.energy[side]} · deck {g.deck[side].length} · vistas {g.seen[side]} · mortes {g.deaths[side]}</span>
      </div>
      {returned.length > 0 && (
        <div className="mb-2">
          <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">Voltaram à mão</div>
          <div className="flex flex-wrap gap-1">{returned.map((h) => <HandCard key={h.hid} h={h} {...props} />)}</div>
        </div>
      )}
      <div className="text-xs uppercase tracking-widest text-stone-500 mb-1">Mão ({normal.length})</div>
      <div className="flex flex-wrap gap-1">
        {normal.length === 0 && <span className="text-xs text-stone-600">Mão vazia.</span>}
        {normal.map((h) => <HandCard key={h.hid} h={h} {...props} />)}
      </div>
    </div>
  );
}

/* ==========================================================================
   INTERFACE MOBILE — tela de jogo compacta (estilo "3 vias lado a lado").
   Reusa o mesmo estado e as mesmas ações do App, e os componentes de carta
   (MiniCard, ScoreDisc, EffectBadge). Nada de regra de jogo aqui.
   ========================================================================== */
const mBtnBig = { flex: "1 1 auto", padding: "11px 10px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" };
const mBtnSm = { flex: "0 0 auto", padding: "11px 12px", borderRadius: 9, border: "1px solid #44403c", background: "#292524", color: "#d6d3d1", fontSize: 14, cursor: "pointer" };
const mBtnGhost = { flex: "0 0 auto", padding: "4px 8px", borderRadius: 7, border: "1px solid #44403c", background: "#1c1917", color: "#a8a29e", fontSize: 13, cursor: "pointer" };

function MBanner({ tone, children }) {
  const map = {
    rose: ["#4c0519", "#9f1239", "#fecdd3"],
    sky: ["#082f49", "#0369a1", "#bae6fd"],
    indigo: ["#1e1b4b", "#4338ca", "#c7d2fe"],
    amber: ["#451a03", "#b45309", "#fde68a"],
  };
  const [bg, bd, fg] = map[tone] || map.rose;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 8px 4px", padding: "6px 9px", borderRadius: 8, background: bg, border: `1px solid ${bd}`, color: fg, fontSize: 12 }}>
      {children}
    </div>
  );
}

function MScore({ v, tone, lead }) {
  const ring = tone === "amber" ? "#fcd34d" : "#7dd3fc";
  const bg = tone === "amber" ? "rgba(251,191,36,.16)" : "rgba(56,189,248,.16)";
  const col = tone === "amber" ? "#fcd34d" : "#7dd3fc";
  return (
    <div style={{
      minWidth: 30, textAlign: "center", padding: "2px 9px", borderRadius: 999,
      background: bg, border: lead ? `2px solid ${ring}` : "1px solid rgba(120,113,108,.4)",
      color: lead ? col : "#f5f5f4", fontWeight: 800, fontSize: 19, fontFamily: "Georgia, serif",
      boxShadow: lead ? `0 0 8px ${ring}` : "none", transition: "box-shadow .3s ease", lineHeight: 1.15,
    }}>{v}</div>
  );
}

function MobileZone({ side, lane, g, ctx, planning, sel, aim, moving, placeCard, moveTo, applyAim, isAimable, isMovable, startMove, pickUp, zoomBoard }) {
  const cards = g.board.filter((c) => c.lane === lane && c.owner === side);
  const canDrop = planning && sel && sel.side === side && !moving && !aim;
  const canMoveHere = moving && moving.side === side && moving.lane !== lane;
  const active = canDrop || canMoveHere;
  const ring = side === 0 ? "rgba(251,191,36,.85)" : "rgba(56,189,248,.85)";
  const zoneClick = canMoveHere ? () => moveTo(side, lane) : canDrop ? () => placeCard(side, lane) : undefined;
  return (
    <div onClick={zoneClick} style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 3, padding: 3,
      borderRadius: 7, border: active ? `1px solid ${ring}` : "1px solid rgba(247,233,192,.10)",
      boxShadow: active ? `0 0 7px ${ring}` : "none", cursor: active ? "pointer" : "default",
      transition: "box-shadow .2s ease, border-color .2s ease",
    }}>
      {[0, 1, 2, 3].map((slot) => {
        const c = cards[slot];
        if (!c) return <div key={slot} style={{ aspectRatio: "5 / 7", borderRadius: 4, border: active ? `1px dashed ${ring}` : "1px dashed rgba(247,233,192,.06)" }} />;
        const canTarget = aim && isAimable(c);
        const movable = isMovable(c);
        const isMoving = moving && moving.uid === c.uid;
        const reveal = g.lastReveal && g.lastReveal.uid === c.uid ? g.lastReveal.seq : null;
        const badge = g.effect && g.effect.uid === c.uid ? g.effect : null;
        const blessings = (g.blessings || []).filter((b) => b.uid === c.uid);
        const charging = c.key === "heka" && c.revealed && !c.dying && !!(g.pendingBuff && g.pendingBuff[c.owner]);
        let onClick;
        if (c.dying) onClick = undefined;
        else if (canTarget) onClick = (e) => { e.stopPropagation(); applyAim(c); };
        else if (movable || isMoving) onClick = (e) => { e.stopPropagation(); startMove(c); };
        else onClick = (e) => { e.stopPropagation(); zoomBoard(c); };
        const onRemove = pickUp && !c.revealed && !c.dying ? (e) => { e.stopPropagation(); pickUp(c.uid); } : null;
        return (
          <div key={c.uid} style={{ aspectRatio: "5 / 7", position: "relative" }}>
            <MiniCard c={c} ctx={ctx} bw={MOBILE_BW} canTarget={canTarget} movable={movable} isMoving={isMoving}
              reveal={reveal} badge={badge} blessings={blessings} dying={!!c.dying} charging={charging}
              onClick={onClick} onRemove={onRemove} />
          </div>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   TABULEIRO COM ARTE (sobreposição).
   Renderiza a arte do tabuleiro (via <img>, que preserva proporção e cabe na
   tela) e posiciona por cima, em coordenadas percentuais, os 24 slots de carta
   (3 vias × 2 lados × 2×2) e os 6 placares (nos discos do rio, frente a frente).
   O `config` guarda as coordenadas — é o que se ajusta no render-and-inspect.
   Lados: topo = B (azul, side 1); base = A (âmbar, side 0).
   ========================================================================== */
/* A arte foi recortada em 44px de cada lado (de 1000x1333 para 912x1245): a
   moldura externa era DUPLA, e o filete de fora mais a margem escura comiam ~7%
   da altura no celular sem carregar informação nenhuma. Sobrou um filete só.
   As coordenadas abaixo foram RECALCULADAS a partir das antigas pela mesma
   transformação do recorte — não foram medidas de novo no olho. */
const BOARD_MOBILE = {
  art: "tabuleiro-mobile.webp",
  ar: 912 / 1245,             // largura/altura da arte
  laneX: [17.654, 50, 82.346],// % X do centro de cada via
  colDX: 7.018,               // % de afastamento das colunas esquerda/direita
  cardW: 12.61,               // % da largura de um slot
  rowY: { 1: [15.631, 30.728], 0: [69.165, 84.476] }, // % Y das duas linhas — [topo, baixo] por lado
  scoreY: { 1: 42.505, 0: 56.959 },                   // % Y dos discos de placar (B em cima, A embaixo)
};

function BoardArt({ config, g, ctx, planning, sel, aim, moving, placeCard, moveTo, applyAim, isAimable, isMovable, startMove, pickUp, zoomBoard }) {
  const base = import.meta.env.BASE_URL;
  const cardHpct = config.cardW * config.ar * (7 / 5); // altura do slot em % (mantém 5:7)
  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", maxHeight: "100%", lineHeight: 0 }}>
      <img src={`${base}${config.art}`} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", borderRadius: 10 }} />
      <div style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2].map((lane) =>
          [0, 1].map((side) => {
            const cards = g.board.filter((c) => c.lane === lane && c.owner === side);
            const canDrop = planning && sel && sel.side === side && !moving && !aim;
            const canMoveHere = moving && moving.side === side && moving.lane !== lane;
            const active = canDrop || canMoveHere;
            const ring = side === 0 ? "rgba(251,191,36,.9)" : "rgba(56,189,248,.9)";
            const zoneClick = canMoveHere ? () => moveTo(side, lane) : canDrop ? () => placeCard(side, lane) : undefined;
            const rows = config.rowY[side];
            const boxLeft = config.laneX[lane] - (config.colDX + config.cardW / 2);
            const boxW = config.colDX * 2 + config.cardW;
            const boxTop = Math.min(rows[0], rows[1]) - cardHpct / 2;
            const boxH = Math.abs(rows[1] - rows[0]) + cardHpct;
            return (
              <React.Fragment key={`${lane}-${side}`}>
                {/* zona de soltura (posicionar / mover para cá) */}
                <div onClick={zoneClick} style={{
                  position: "absolute", left: `${boxLeft}%`, top: `${boxTop}%`, width: `${boxW}%`, height: `${boxH}%`,
                  borderRadius: 8, border: active ? `2px solid ${ring}` : "none",
                  boxShadow: active ? `0 0 12px ${ring}` : "none", cursor: active ? "pointer" : "default",
                  transition: "box-shadow .2s ease", zIndex: active ? 3 : 1,
                }} />
                {/* cartas nos slots */}
                {[0, 1, 2, 3].map((slot) => {
                  const c = cards[slot];
                  const col = slot % 2, row = slot < 2 ? 0 : 1;
                  const x = config.laneX[lane] + (col === 0 ? -config.colDX : config.colDX);
                  const y = rows[row];
                  /* Slot vazio: a moldura de pedra está PINTADA na arte do tabuleiro,
                     então não dá para apagá-la por CSS — dá para abafá-la. Sem isto,
                     o olho é puxado para onde não há informação nenhuma. */
                  if (!c) return (
                    <div key={`v${slot}`} style={{
                      position: "absolute", left: `${x}%`, top: `${y}%`, width: `${config.cardW}%`,
                      aspectRatio: "5 / 7", transform: "translate(-50%,-50%)", zIndex: 2,
                      borderRadius: 5, background: "rgba(6,9,13,.5)", pointerEvents: "none",
                    }} />
                  );
                  const canTarget = aim && isAimable(c);
                  const movable = isMovable(c);
                  const isMoving = moving && moving.uid === c.uid;
                  const reveal = g.lastReveal && g.lastReveal.uid === c.uid ? g.lastReveal.seq : null;
                  const badge = g.effect && g.effect.uid === c.uid ? g.effect : null;
                  const blessings = (g.blessings || []).filter((b) => b.uid === c.uid);
                  const charging = c.key === "heka" && c.revealed && !c.dying && !!(g.pendingBuff && g.pendingBuff[c.owner]);
                  let onClick;
                  if (c.dying) onClick = undefined;
                  else if (canTarget) onClick = (e) => { e.stopPropagation(); applyAim(c); };
                  else if (movable || isMoving) onClick = (e) => { e.stopPropagation(); startMove(c); };
                  else onClick = (e) => { e.stopPropagation(); zoomBoard(c); };
                  const onRemove = pickUp && !c.revealed && !c.dying ? (e) => { e.stopPropagation(); pickUp(c.uid); } : null;
                  return (
                    <div key={c.uid} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: `${config.cardW}%`, aspectRatio: "5 / 7", transform: "translate(-50%,-50%)", zIndex: 4 }}>
                      <MiniCard c={c} ctx={ctx} bw={MOBILE_BW} canTarget={canTarget} movable={movable} isMoving={isMoving}
                        reveal={reveal} badge={badge} blessings={blessings} dying={!!c.dying} charging={charging}
                        onClick={onClick} onRemove={onRemove} />
                    </div>
                  );
                })}
                {/* placar no disco do rio */}
                {(() => {
                  const s = laneScore(ctx, lane, side);
                  const other = laneScore(ctx, lane, 1 - side);
                  const lead = s > other;
                  const col = side === 0 ? "#fcd34d" : "#7dd3fc";
                  return (
                    /* O total da via é o placar da partida: quem leva duas vias vence.
                       Era o número menor da tela. Agora é o maior, e a liderança se lê
                       pelo halo, não por uma diferença sutil de matiz. */
                    <div style={{
                      position: "absolute", left: `${config.laneX[lane]}%`, top: `${config.scoreY[side]}%`, transform: "translate(-50%,-50%)",
                      zIndex: 5, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center",
                      width: "clamp(28px, 5.6vw, 44px)", aspectRatio: "1", borderRadius: "50%",
                      boxShadow: lead ? `0 0 0 2px ${col}, 0 0 10px 2px ${col}88` : "none",
                      transition: "box-shadow .3s ease",
                    }}>
                      <span style={{
                        fontFamily: "Georgia, serif", fontWeight: 900, lineHeight: 1,
                        fontSize: s >= 100 ? "clamp(13px, 2.6vw, 20px)" : "clamp(16px, 3.4vw, 26px)",
                        color: lead ? col : "#241c10",
                        textShadow: lead
                          ? `0 0 7px ${col}, 0 1px 2px rgba(0,0,0,.95), 0 -1px 2px rgba(0,0,0,.85)`
                          : "0 1px 0 rgba(255,255,255,.5)",
                      }}>{s}</span>
                    </div>
                  );
                })()}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}

function MobileLane({ lane, g, ctx, planning, sel, aim, moving, placeCard, moveTo, applyAim, isAimable, isMovable, startMove, pickUp, zoomBoard }) {
  const sA = laneScore(ctx, lane, 0), sB = laneScore(ctx, lane, 1);
  const winner = sA > sB ? 0 : sB > sA ? 1 : -1;
  const maat = laneHasMaat(g.board, lane);
  const zprops = { lane, g, ctx, planning, sel, aim, moving, placeCard, moveTo, applyAim, isAimable, isMovable, startMove, pickUp, zoomBoard };
  return (
    <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
      <MobileZone side={1} {...zprops} />
      {/* Placar CENTRAL: os dois valores frente a frente, com a via no meio. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "1px 0" }}>
        <MScore v={sB} tone="sky" lead={winner === 1} />
        <div style={{
          textAlign: "center", fontSize: 9.5, color: "#f7e9c0", fontFamily: "Georgia, serif", letterSpacing: 0.3,
          background: "rgba(15,12,8,.62)", border: "1px solid rgba(247,233,192,.3)", borderRadius: 999,
          padding: "1px 6px", whiteSpace: "nowrap", lineHeight: 1.3,
        }}>VIA {lane + 1}{maat ? " ⚖" : winner >= 0 ? ` ♛${winner === 0 ? "A" : "B"}` : ""}</div>
        <MScore v={sA} tone="amber" lead={winner === 0} />
      </div>
      <MobileZone side={0} {...zprops} />
    </div>
  );
}

function MHandCard({ h, side, tone, g, sel, setSel, disabled, onZoom }) {
  const base = import.meta.env.BASE_URL;
  const def = byKey[h.key];
  const isSel = sel && sel.side === side && sel.hid === h.hid;
  const custo = custoDe(h);
  const afford = g.energy[side] >= custo;
  const accent = tone === "amber" ? "#fcd34d" : "#7dd3fc";
  const faixa = h.baked > 0 ? `Faixa ${h.printed + h.baked}` : `P${h.printed}`;
  const drawn = g.justDrew?.[side]?.includes(h.hid);
  const artSrc = def.arte ? `${base}cartas/${def.arte}.webp` : null;
  const ref = useRef(null);
  // Rola a carta recém-comprada para dentro da vista, para o halo dourado ser visto.
  useEffect(() => {
    if (drawn && ref.current) {
      try { ref.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); } catch {}
    }
  }, [drawn]);
  return (
    <div ref={ref} className={drawn ? "duat-draw" : ""} style={{
      position: "relative", flex: "1 1 0", minWidth: 0, maxWidth: 72, borderRadius: 8, background: "#1c1917",
      border: isSel ? `2px solid ${accent}` : "1px solid #44403c", opacity: disabled ? 0.5 : afford ? 1 : 0.55,
      overflow: "hidden",
    }}>
      <button disabled={disabled} onClick={() => setSel(isSel ? null : { side, hid: h.hid })}
        style={{ display: "block", textAlign: "left", width: "100%", padding: 0, background: "none", border: "none", cursor: disabled ? "default" : "pointer" }}>
        <div style={{ position: "relative", width: "100%", height: 40, background: "#000" }}>
          {artSrc
            ? <img src={artSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: def.arteFoco || "center", opacity: afford ? 1 : 0.7 }} />
            : <div className={ARCH_COLOR[def.arch]} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{GLYPH[def.arch]}</div>}
          <span style={{ position: "absolute", top: 2, left: 3, fontSize: 11, fontWeight: 800, color: custo > def.custo ? "#fda4af" : "#fde68a", textShadow: "0 1px 2px #000" }}>{custo}⚡</span>
        </div>
        <div style={{ padding: "3px 5px 4px" }}>
          <div className={ARCH_COLOR[def.arch]} style={{ fontSize: 10.5, lineHeight: 1.15, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{def.nomeCurto}</div>
          <div style={{ fontSize: 9.5, color: "#a8a29e", marginTop: 1 }}>{faixa}</div>
        </div>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onZoom(h); }} title="Ampliar"
        style={{ position: "absolute", top: 2, right: 2, fontSize: 11, color: "#e7e5e4", background: "rgba(0,0,0,.5)", borderRadius: 5, border: "none", cursor: "pointer", lineHeight: 1, padding: "2px 3px" }}>🔍</button>
    </div>
  );
}

function MHandRow({ side, tone, g, sel, setSel, disabled, onZoom, onResetPlan = null, online = false, isOpp = false, oppHand = 0 }) {
  const hand = g.hand[side];
  // Quantas cartas este lado posicionou nesta rodada e ainda não foram reveladas.
  const postos = g.board.filter((c) => c.owner === side && !c.revealed && !c.dying && c.enteredRound === g.round).length;
  const accent = tone === "amber" ? "#fcd34d" : "#7dd3fc";
  const isPrio = g.priority === side;
  const edge = side === 1 ? { borderBottom: `1px solid ${accent}44` } : { borderTop: `1px solid ${accent}44` };
  return (
    <div style={{ padding: "4px 8px", background: "#141210", ...edge }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{SIDE_NAME[side]}</span>
        {isPrio && <span style={{ fontSize: 9, color: "#78716c" }}>revela 1º</span>}
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#78716c" }}>⚡{g.energy[side]} · deck {g.deck[side].length} · † {g.deaths[side]}</span>
        {onResetPlan && (
          <button onClick={() => onResetPlan(side)} disabled={!postos} title="Devolve à mão tudo que você posicionou nesta rodada"
            style={{
              fontSize: 9.5, padding: "2px 6px", borderRadius: 5, lineHeight: 1.4,
              border: `1px solid ${postos ? "#a8a29e66" : "#44403c"}`,
              background: postos ? "rgba(168,162,158,.12)" : "transparent",
              color: postos ? "#d6d3d1" : "#57534e", cursor: postos ? "pointer" : "default",
            }}>↺ Reiniciar rodada</button>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2, alignItems: "stretch" }}>
        {online && isOpp
          ? <span style={{ fontSize: 11, color: "#a8a29e", padding: "6px 2px" }}>🂠 {oppHand} carta{oppHand === 1 ? "" : "s"} na mão (ocultas)</span>
          : <>
              {hand.length === 0 && <span style={{ fontSize: 11, color: "#57534e" }}>Mão vazia.</span>}
              {hand.map((h) => <MHandCard key={h.hid} h={h} side={side} tone={tone} g={g} sel={sel} setSel={setSel} disabled={disabled} onZoom={onZoom} />)}
            </>}
      </div>
    </div>
  );
}

function GameMobile(p) {
  const {
    g, ctx, wins, planning, sel, setSel, aim, moving, msg, fast,
    startReveal, setFast, nextRound, reset, setScreen, setForceView,
    placeCard, pickUp, resetPlan, startMove, moveTo, applyAim, skipAim, isAimable, isMovable,
    zoomBoard, zoomHand,
    online = false, seat = 0, myReady = false, oppReady = false, oppHand = 0,
  } = p;
  const disabled = !planning || !!aim || !!moving;
  const phaseLabel = planning ? "Planejar" : g.phase === "revealing" ? "Revelando…" : "Revelado";
  const phaseBg = planning ? "#1c1917" : g.phase === "revealing" ? "#1e1b4b" : "#064e3b";
  const laneProps = { g, ctx, planning, sel, aim, moving, placeCard, moveTo, applyAim, isAimable, isMovable, startMove, pickUp: planning ? pickUp : null, zoomBoard };
  return (
    <div style={{ minHeight: "100dvh", background: "#0c0a09", display: "flex", justifyContent: "center" }}>
    <div style={{ width: "100%", maxWidth: 720, minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0c0a09", color: "#e7e5e4", fontFamily: "ui-sans-serif, system-ui, sans-serif", borderLeft: "1px solid #1c1917", borderRight: "1px solid #1c1917" }}>
      <style>{DUAT_KEYFRAMES}</style>
      <style>{"body{background:#0c0a09;margin:0}"}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #292524", position: "sticky", top: 0, background: "#0c0a09", zIndex: 20 }}>
        <span style={{ fontWeight: 800, letterSpacing: 0.5, color: "#fde68a", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>𓂀 Guerras Egípcias</span>
        <span style={{ fontSize: 11, color: "#78716c", flex: "0 0 auto" }}>R {g.round}/6</span>
        <span style={{ marginLeft: "auto", fontSize: 13 }}>
          <b style={{ color: "#fcd34d" }}>A {wins[0]}</b> <span style={{ color: "#57534e" }}>×</span> <b style={{ color: "#7dd3fc" }}>{wins[1]} B</b>
        </span>
        {online
          ? <span style={{ fontSize: 11, color: seat === 0 ? "#fcd34d" : "#7dd3fc", flex: "0 0 auto", fontWeight: 700 }} title="Seu lado">você: {SIDE_NAME[seat]}</span>
          : <button onClick={() => setForceView("desktop")} style={mBtnGhost} title="Ver a interface desktop">🖥</button>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 12, flexWrap: "wrap" }}>
        <span style={{ padding: "2px 8px", borderRadius: 6, background: phaseBg, color: "#e7e5e4", fontWeight: 600 }}>{phaseLabel}</span>
        <span style={{ color: "#78716c" }}>Prioridade</span>
        <b style={{ color: g.priority === 0 ? "#fcd34d" : "#7dd3fc" }}>{SIDE_NAME[g.priority]}</b>
        <span style={{ marginLeft: "auto" }}><span style={{ color: "#78716c" }}>⚡ </span><b style={{ color: "#fcd34d" }}>{g.energy[0]}</b> <span style={{ color: "#57534e" }}>/</span> <b style={{ color: "#7dd3fc" }}>{g.energy[1]}</b></span>
      </div>

      {msg && <MBanner tone="rose">{msg}</MBanner>}
      {g.trevas === g.round && <MBanner tone="indigo">⊘ Trevas — as cartas desta rodada permanecem ocultas e só revelam na próxima.</MBanner>}
      {moving && <MBanner tone="sky">⇄ Movendo o Escaravelho — toque numa via do {SIDE_NAME[moving.side]}.</MBanner>}
      {aim && (
        <MBanner tone="indigo">
          <span>🎯 <b>{aim.srcNome}</b>: escolha {aim.needs === "ally" ? "um aliado" : "uma carta inimiga"} na Via {aim.lane + 1}.</span>
          <button onClick={skipAim} style={{ marginLeft: "auto", padding: "3px 8px", borderRadius: 6, border: "1px solid #4338ca", background: "#312e81", color: "#c7d2fe", fontSize: 11, cursor: "pointer" }}>Pular</button>
        </MBanner>
      )}
      {sel && planning && !aim && !moving && <MBanner tone="amber">Toque numa via do {SIDE_NAME[sel.side]} para posicionar {byKey[g.hand[sel.side].find((h) => h.hid === sel.hid)?.key]?.nome || "a carta"}.</MBanner>}

      <MHandRow side={1} tone="sky" g={g} sel={sel} setSel={setSel} disabled={disabled} onZoom={zoomHand}
        onResetPlan={planning && (!online || seat === 1) ? resetPlan : null}
        online={online} isOpp={online && seat !== 1} oppHand={oppHand} />

      <div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, minHeight: 0 }}>
        <BoardArt config={BOARD_MOBILE} {...laneProps} />
      </div>

      <MHandRow side={0} tone="amber" g={g} sel={sel} setSel={setSel} disabled={disabled} onZoom={zoomHand}
        onResetPlan={planning && (!online || seat === 0) ? resetPlan : null}
        online={online} isOpp={online && seat !== 0} oppHand={oppHand} />

      <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid #292524", position: "sticky", bottom: 0, background: "#0c0a09", zIndex: 20 }}>
        {planning && (online
          ? <button onClick={startReveal} disabled={myReady} style={{ ...mBtnBig, background: myReady ? "#292524" : "#059669", color: myReady ? "#a8a29e" : "#0c0a09" }}>{myReady ? "Aguardando adversário…" : "Pronto ✓"}</button>
          : <button onClick={startReveal} style={{ ...mBtnBig, background: "#059669", color: "#0c0a09" }}>Revelar</button>)}
        {g.phase === "revealing" && !online && <button onClick={() => setFast((f) => !f)} style={{ ...mBtnBig, background: fast ? "#0ea5e9" : "#292524", color: fast ? "#0c0a09" : "#e7e5e4" }}>{fast ? "⏩ rápido" : "⏩ acelerar"}</button>}
        {g.phase === "revealing" && online && <span style={{ ...mBtnBig, background: "#1e1b4b", color: "#c7d2fe", textAlign: "center" }}>Revelando…</span>}
        {g.phase === "revealed" && !g.finished && (online
          ? <button onClick={nextRound} disabled={myReady} style={{ ...mBtnBig, background: myReady ? "#292524" : "#d97706", color: myReady ? "#a8a29e" : "#0c0a09" }}>{myReady ? "Aguardando adversário…" : (g.round >= 6 ? "Pronto: finalizar ✓" : "Pronto: próxima ✓")}</button>
          : <button onClick={nextRound} style={{ ...mBtnBig, background: "#d97706", color: "#0c0a09" }}>{g.round >= 6 ? "Finalizar partida" : "Próxima rodada"}</button>)}
        {g.finished && <span style={{ ...mBtnBig, background: "#1c1917", color: "#fde68a", textAlign: "center", border: "1px solid #b45309" }}>{resultLabel(g)}</span>}
        {online
          ? <button onClick={reset} style={mBtnSm} title="Sair da partida">⏏</button>
          : <><button onClick={reset} style={mBtnSm} title="Reiniciar">↺</button>
            <button onClick={() => setScreen("deck")} style={mBtnSm}>Decks</button></>}
      </div>
    </div>
    </div>
  );
}

export { GameMobile };

/* ==========================================================================
   PARTIDA ONLINE (Fase 2 — cliente).
   Componente fino: NÃO tem regra própria. Recebe do Lobby o `send` (WebSocket)
   e o último `data` = { seat, state, ready, oppConnected } vindo do servidor,
   e reaproveita a mesma UI mobile (GameMobile). Cada ação vira uma mensagem;
   o estado exibido é o que o servidor devolve (já filtrado: sem a mão nem as
   jogadas ocultas do adversário). Só interajo no MEU assento.
   ========================================================================== */
function OnlineGame({ send, data, note, onLeave }) {
  const { seat, state: g, ready: readyArr = [false, false], oppConnected } = data;
  const [sel, setSel] = useState(null);
  const [moving, setMoving] = useState(null);
  const [zoom, setZoom] = useState(null);

  const myReady = !!readyArr[seat];
  const oppReady = !!readyArr[1 - seat];
  const planning = g.phase === "plan" && !g.finished;
  const rawAim = g.awaitingAim;
  const myAim = rawAim && rawAim.side === seat ? rawAim : null; // só resolvo a MINHA mira
  const ctx = ctxOf(g);
  const wins = laneWins(g);

  useEffect(() => { if (!planning) { setSel(null); setMoving(null); } }, [planning]);

  const sendAct = (action) => send({ t: "act", action });
  const placeCard = (side, lane) => {
    if (!planning || myAim || moving || side !== seat || !sel || sel.side !== seat) return;
    sendAct({ t: "place", hid: sel.hid, lane }); setSel(null);
  };
  const pickUp = (uid) => {
    if (!planning || myAim || moving) return;
    const c = g.board.find((x) => x.uid === uid);
    if (!c || c.revealed || c.owner !== seat) return;
    sendAct({ t: "pickup", uid }); setSel(null);
  };
  const resetPlan = (side) => {
    if (!planning || myAim || moving || side !== seat) return;
    sendAct({ t: "resetPlan" }); setSel(null);
  };
  const isMovable = (c) =>
    planning && !myAim && !c.dying && c.revealed && c.owner === seat &&
    byKey[c.key] && byKey[c.key].move && !c.moved && c.enteredRound < g.round;
  const startMove = (c) => {
    if (!isMovable(c)) return;
    setSel(null);
    setMoving(moving && moving.uid === c.uid ? null : { uid: c.uid, side: c.owner, lane: c.lane });
  };
  const moveTo = (side, lane) => {
    if (!moving || side !== seat || moving.side !== seat) return;
    if (lane === moving.lane) { setMoving(null); return; }
    sendAct({ t: "move", uid: moving.uid, lane }); setMoving(null);
  };
  const startReveal = () => { if (!planning || myReady) return; setSel(null); setMoving(null); send({ t: "ready" }); };
  const nextRound = () => { if (g.phase !== "revealed" || myReady) return; send({ t: "ready" }); };
  const applyAim = (target) => { if (!myAim) return; send({ t: "aim", targetUid: target.uid }); };
  const skipAim = () => { if (!myAim) return; send({ t: "skipAim" }); };
  const isAimable = (c) => !!myAim && podeMirar(g, c);
  function zoomBoard(c) {
    const def = byKey[c.key]; if (!def) return;
    const cur = c.revealed ? power(c, ctx) : null;
    setZoom({
      def, custo: custoDe(c), printed: c.printed, baked: c.baked || 0, current: cur,
      partes: c.revealed ? decomporPartes(c, ctx) : null,
      sub: `Via ${c.lane + 1} · ${SIDE_NAME[c.owner]}` + (c.revealed ? "" : " · por revelar"),
    });
  }
  function zoomHand(h) {
    const def = byKey[h.key]; if (!def) return;
    setZoom({ def, custo: custoDe(h), printed: h.printed, baked: h.baked || 0, current: null, sub: h.baked > 0 ? `Faixa da Múmia — volta valendo ${h.printed + h.baked}` : "na mão" });
  }

  const oppAiming = rawAim && rawAim.side !== seat;
  const msg = !oppConnected ? "⚠ Adversário desconectado." : oppAiming ? "🎯 O adversário está escolhendo um alvo…" : (note || "");

  return (
    <>
      <GameMobile
        online seat={seat} myReady={myReady} oppReady={oppReady} oppHand={g.oppHand || 0} oppConnected={oppConnected}
        g={g} ctx={ctx} wins={wins} planning={planning}
        sel={sel} setSel={setSel} aim={myAim} moving={moving} msg={msg} fast={false}
        startReveal={startReveal} setFast={() => {}} nextRound={nextRound} reset={onLeave}
        setScreen={onLeave} setForceView={() => {}}
        placeCard={placeCard} pickUp={pickUp} resetPlan={resetPlan} startMove={startMove} moveTo={moveTo}
        applyAim={applyAim} skipAim={skipAim} isAimable={isAimable} isMovable={isMovable}
        zoomBoard={zoomBoard} zoomHand={zoomHand} />
      {zoom && <ZoomModal zoom={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}

export { OnlineGame };

/* ==========================================================================
   MONTAGEM DE DECK — MOBILE.
   Grade de cartas (2 col). Tocar NÃO alterna: abre a carta ampliada (Carta)
   com stats/efeito/lore, X para fechar e botões Adicionar/Retirar do deck.
   Uma aba escolhe qual lado (A/B) está sendo editado.
   ========================================================================== */
function DeckMobile({ build, setDeck, flash, startMatch, setScreen, setForceView, msg }) {
  const [side, setSide] = useState(0);
  const [detail, setDetail] = useState(null); // def da carta ampliada, ou null
  const cur = build[side];
  const ready = build[0].length === 12 && build[1].length === 12;
  const accent = side === 0 ? "#fcd34d" : "#7dd3fc";

  const addCard = (k) => {
    if (build[side].includes(k)) return;
    if (build[side].length >= 12) { flash("Deck cheio — 12 cartas (retire uma antes)."); return; }
    setDeck(side, [...build[side], k]);
  };
  const removeCard = (k) => setDeck(side, build[side].filter((x) => x !== k));

  const chip = { flex: "0 0 auto", padding: "5px 9px", borderRadius: 7, border: "1px solid #44403c", background: "#292524", color: "#d6d3d1", fontSize: 12, cursor: "pointer" };

  // dimensão da carta ampliada: cabe na largura e na altura da tela (razão 1024/1536)
  const vw = typeof window !== "undefined" ? window.innerWidth : 380;
  const vh = typeof window !== "undefined" ? window.innerHeight : 720;
  const cardW = Math.min(300, vw - 64, Math.floor((vh - 190) / 1.5));

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0c0a09", color: "#e7e5e4", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #292524", position: "sticky", top: 0, background: "#0c0a09", zIndex: 20 }}>
        <span style={{ fontWeight: 800, letterSpacing: 0.5, color: "#fde68a", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>𓂀 Guerras Egípcias</span>
        <span style={{ fontSize: 11, color: "#78716c", flex: "0 0 auto" }}>Decks</span>
        <button onClick={() => setForceView("desktop")} style={{ ...chip, marginLeft: "auto" }} title="Ver a interface desktop">🖥</button>
      </div>

      {/* abas de lado */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px 4px" }}>
        {[0, 1].map((s) => {
          const a = s === 0 ? "#fcd34d" : "#7dd3fc";
          const active = s === side;
          const full = build[s].length === 12;
          return (
            <button key={s} onClick={() => setSide(s)} style={{
              flex: "1 1 0", padding: "8px 6px", borderRadius: 9, cursor: "pointer",
              border: active ? `2px solid ${a}` : "1px solid #44403c",
              background: active ? "rgba(255,255,255,.04)" : "#1c1917", color: "#e7e5e4", fontSize: 13,
            }}>
              <b style={{ color: a }}>{SIDE_NAME[s]}</b>{" "}
              <span style={{ color: full ? "#34d399" : build[s].length > 12 ? "#fb7185" : "#a8a29e", fontWeight: 700 }}>{build[s].length}/12</span>
            </button>
          );
        })}
      </div>

      {/* presets do lado atual */}
      <div style={{ display: "flex", gap: 5, padding: "2px 10px 6px", overflowX: "auto" }}>
        {Object.keys(PRESETS).map((name) => (
          <button key={name} onClick={() => setDeck(side, PRESETS[name].slice())} style={chip}>{name}</button>
        ))}
        <button onClick={() => setDeck(side, shuffled(CARDS.map((c) => c.key)).slice(0, 12))} style={chip}>Aleatório</button>
        <button onClick={() => setDeck(side, [])} style={{ ...chip, color: "#a8a29e" }}>Limpar</button>
        {side === 1 && <button onClick={() => setDeck(1, build[0].slice())} style={chip}>Copiar A→B</button>}
      </div>
      <AvisoOutorga deck={cur} estilo="mobile" />

      {msg && <div style={{ margin: "0 10px 6px", padding: "6px 9px", borderRadius: 8, background: "#4c0519", border: "1px solid #9f1239", color: "#fecdd3", fontSize: 12 }}>{msg}</div>}

      {/* grade de cartas — tocar abre a carta ampliada (não alterna) */}
      <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "2px 10px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {COLLECTION.map((def) => {
            const on = cur.includes(def.key);
            return (
              <button key={def.key} onClick={() => setDetail(def)} style={{
                textAlign: "left", padding: "8px 9px", borderRadius: 9, cursor: "pointer",
                background: "#1c1917", border: on ? `1.5px solid ${accent}` : "1px solid #44403c",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                  <span className={ARCH_COLOR[def.arch]} style={{ fontSize: 12.5, lineHeight: 1.2, flex: 1 }}>{GLYPH[def.arch]} {def.nome}</span>
                  {on && <span style={{ color: accent, fontSize: 13, fontWeight: 800 }}>✓</span>}
                </div>
                <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 3 }}>{def.custo}⚡ · P{def.poder} · {def.tipo}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* rodapé */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid #292524", position: "sticky", bottom: 0, background: "#0c0a09", zIndex: 20 }}>
        <button onClick={() => setScreen("galeria")} style={{ ...chip, padding: "11px 12px" }}>Galeria</button>
        <button onClick={() => setScreen("mpdeck")} style={{ ...chip, padding: "11px 12px", background: "#3730a3", color: "#e0e7ff", border: "1px solid #4f46e5" }}>⚔ Online</button>
        <button onClick={startMatch} disabled={!ready} style={{
          flex: "1 1 auto", padding: "11px 10px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
          background: ready ? "#059669" : "#292524", color: ready ? "#0c0a09" : "#78716c", cursor: ready ? "pointer" : "not-allowed",
        }}>Embaralhar e iniciar</button>
      </div>

      {/* carta ampliada */}
      {detail && (() => {
        const on = cur.includes(detail.key);
        const full = cur.length >= 12;
        return (
          <div onClick={() => setDetail(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", zIndex: 50,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16,
          }}>
            <div style={{ width: "100%", maxWidth: cardW, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: accent }}>Editando: {SIDE_NAME[side]}{on ? " · nesta lista" : ""}</span>
              <button onClick={(e) => { e.stopPropagation(); setDetail(null); }} aria-label="Fechar" style={{
                fontSize: 20, color: "#e7e5e4", background: "rgba(255,255,255,.08)", border: "1px solid #57534e",
                borderRadius: 8, lineHeight: 1, cursor: "pointer", padding: "4px 10px",
              }}>✕</button>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
              <Carta nome={detail.nome} custo={detail.custo} poder={detail.poder} tipo={detail.tipo}
                efeito={detail.texto} lore={detail.lore} arch={detail.arch} arte={detail.arte} arteFoco={detail.arteFoco} ordem={detail.ordem} width={cardW} />
            </div>

            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: cardW, display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => addCard(detail.key)} disabled={on || full} style={{
                flex: 1, padding: "12px 8px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
                background: on || full ? "#292524" : "#059669", color: on || full ? "#78716c" : "#0c0a09",
                cursor: on || full ? "not-allowed" : "pointer",
              }}>Adicionar ao deck</button>
              <button onClick={() => removeCard(detail.key)} disabled={!on} style={{
                flex: 1, padding: "12px 8px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
                background: !on ? "#292524" : "#9f1239", color: !on ? "#78716c" : "#fecdd3",
                cursor: !on ? "not-allowed" : "pointer",
              }}>Retirar do deck</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export { DeckMobile };

/* ==========================================================================
   MONTAGEM DO DECK — MULTIPLAYER (deck único, antes de conectar).
   Mesma UX do single-player: tocar numa carta abre a versão ampliada com
   Adicionar/Retirar do deck e um X para fechar. Funciona em desktop e mobile.
   O deck do multiplayer é o Lado A (build[0]).
   ========================================================================== */
function MpDeck({ build, setDeck, flash, setScreen, msg }) {
  const [detail, setDetail] = useState(null);
  const cur = build[0];
  const full = cur.length === 12;
  const accent = "#818cf8";

  const addCard = (k) => {
    if (cur.includes(k)) return;
    if (cur.length >= 12) { flash("Deck cheio — 12 cartas (retire uma antes)."); return; }
    setDeck(0, [...cur, k]);
  };
  const removeCard = (k) => setDeck(0, cur.filter((x) => x !== k));

  const chip = { flex: "0 0 auto", padding: "5px 9px", borderRadius: 7, border: "1px solid #44403c", background: "#292524", color: "#d6d3d1", fontSize: 12, cursor: "pointer" };
  const vw = typeof window !== "undefined" ? window.innerWidth : 380;
  const vh = typeof window !== "undefined" ? window.innerHeight : 720;
  const cardW = Math.min(300, vw - 64, Math.floor((vh - 190) / 1.5));

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0c0a09", color: "#e7e5e4", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #292524", position: "sticky", top: 0, background: "#0c0a09", zIndex: 20 }}>
        <span style={{ fontWeight: 800, letterSpacing: 0.5, color: "#c7d2fe", fontSize: 14 }}>⚔ Multiplayer</span>
        <span style={{ fontSize: 11, color: "#78716c" }}>monte seu deck</span>
        <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, color: full ? "#34d399" : cur.length > 12 ? "#fb7185" : "#d6d3d1" }}>{cur.length}/12</span>
      </div>

      <div style={{ display: "flex", gap: 5, padding: "8px 10px 6px", overflowX: "auto" }}>
        {Object.keys(PRESETS).map((name) => (
          <button key={name} onClick={() => setDeck(0, PRESETS[name].slice())} style={chip}>{name}</button>
        ))}
        <button onClick={() => setDeck(0, shuffled(CARDS.map((c) => c.key)).slice(0, 12))} style={chip}>Aleatório</button>
        <button onClick={() => setDeck(0, [])} style={{ ...chip, color: "#a8a29e" }}>Limpar</button>
      </div>
      <AvisoOutorga deck={cur} estilo="mobile" />

      {msg && <div style={{ margin: "0 10px 6px", padding: "6px 9px", borderRadius: 8, background: "#4c0519", border: "1px solid #9f1239", color: "#fecdd3", fontSize: 12 }}>{msg}</div>}

      <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "2px 10px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
          {COLLECTION.map((def) => {
            const on = cur.includes(def.key);
            return (
              <button key={def.key} onClick={() => setDetail(def)} style={{
                textAlign: "left", padding: "8px 9px", borderRadius: 9, cursor: "pointer",
                background: "#1c1917", border: on ? `1.5px solid ${accent}` : "1px solid #44403c",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                  <span className={ARCH_COLOR[def.arch]} style={{ fontSize: 12.5, lineHeight: 1.2, flex: 1 }}>{GLYPH[def.arch]} {def.nome}</span>
                  {on && <span style={{ color: accent, fontSize: 13, fontWeight: 800 }}>✓</span>}
                </div>
                <div style={{ fontSize: 11, color: "#a8a29e", marginTop: 3 }}>{def.custo}⚡ · P{def.poder} · {def.tipo}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "8px 10px", borderTop: "1px solid #292524", position: "sticky", bottom: 0, background: "#0c0a09", zIndex: 20 }}>
        <button onClick={() => setScreen("deck")} style={{ ...chip, padding: "11px 12px" }}>← Voltar</button>
        <span style={{ fontSize: 11, color: "#78716c" }}>{full ? "Deck pronto." : `Faltam ${Math.max(0, 12 - cur.length)}.`}</span>
        <button onClick={() => { if (cur.length !== 12) { flash("Seu deck precisa ter exatamente 12 cartas."); return; } setScreen("lobby"); }} disabled={!full} style={{
          marginLeft: "auto", flex: "1 1 auto", maxWidth: 260, padding: "11px 10px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
          background: full ? "#4f46e5" : "#292524", color: full ? "#e0e7ff" : "#78716c", cursor: full ? "pointer" : "not-allowed",
        }}>Continuar → conectar</button>
      </div>

      {detail && (() => {
        const on = cur.includes(detail.key);
        const cheio = cur.length >= 12;
        return (
          <div onClick={() => setDetail(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", zIndex: 50,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16,
          }}>
            <div style={{ width: "100%", maxWidth: cardW, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: accent }}>Seu deck{on ? " · nesta lista" : ""}</span>
              <button onClick={(e) => { e.stopPropagation(); setDetail(null); }} aria-label="Fechar" style={{
                fontSize: 20, color: "#e7e5e4", background: "rgba(255,255,255,.08)", border: "1px solid #57534e",
                borderRadius: 8, lineHeight: 1, cursor: "pointer", padding: "4px 10px",
              }}>✕</button>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Carta nome={detail.nome} custo={detail.custo} poder={detail.poder} tipo={detail.tipo}
                efeito={detail.texto} lore={detail.lore} arch={detail.arch} arte={detail.arte} arteFoco={detail.arteFoco} ordem={detail.ordem} width={cardW} />
            </div>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: cardW, display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => addCard(detail.key)} disabled={on || cheio} style={{
                flex: 1, padding: "12px 8px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
                background: on || cheio ? "#292524" : "#059669", color: on || cheio ? "#78716c" : "#0c0a09",
                cursor: on || cheio ? "not-allowed" : "pointer",
              }}>Adicionar ao deck</button>
              <button onClick={() => removeCard(detail.key)} disabled={!on} style={{
                flex: 1, padding: "12px 8px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
                background: !on ? "#292524" : "#9f1239", color: !on ? "#78716c" : "#fecdd3",
                cursor: !on ? "not-allowed" : "pointer",
              }}>Retirar do deck</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export { MpDeck };

/* ==========================================================================
   LOBBY MULTIPLAYER (Fase 1 — cliente).
   Conecta no servidor WebSocket, lista salas abertas, cria/entra em sala e
   mostra o emparelhamento. A partida em rede (Fase 2) entra depois.
   ========================================================================== */
function Lobby({ onBack, deck }) {
  const readLS = (k, d) => { try { return (typeof window !== "undefined" && localStorage.getItem(k)) || d; } catch { return d; } };
  const [serverUrl, setServerUrl] = useState(() => readLS("ge_server", LOBBY_SERVER_DEFAULT));
  const [name, setName] = useState(() => readLS("ge_name", ""));
  const [status, setStatus] = useState("desconectado"); // desconectado|conectando|conectado|erro
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [match, setMatch] = useState(null); // { roomId, seat, opponent }
  const [game, setGame] = useState(null);    // { seat, state, ready, oppConnected } — partida ao vivo
  const [note, setNote] = useState("");
  const [servidor, setServidor] = useState(null);   // { sig, cards } do aperto de mão
  const [travou, setTravou] = useState(false);      // o deck foi enviado e nada voltou
  const wsRef = useRef(null);
  const deckRef = useRef(deck);
  const timerRef = useRef(null);
  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const connected = status === "conectado";
  /* Servidor e site rodam o mesmo engine.js, mas têm deploys separados: o site
     é o GitHub Pages, o servidor é o Render. Se um ficar para trás, a partida
     não tem como funcionar — então descubro isso no aperto de mão, não no meio
     do jogo. `null` = servidor antigo, que nem manda assinatura. */
  const desatualizado = servidor && servidor.sig !== CONTENT_SIG;
  const semAssinatura = !!servidor && !servidor.sig;

  function connect() {
    const nm = name.trim() || "Jogador";
    try { localStorage.setItem("ge_server", serverUrl); localStorage.setItem("ge_name", nm); } catch {}
    setNote(""); setStatus("conectando"); setRooms([]); setMyRoom(null); setMatch(null); setGame(null);
    setServidor(null); setTravou(false); clearTimeout(timerRef.current);
    let ws;
    try { ws = new WebSocket(normalizeWs(serverUrl)); } catch { setStatus("erro"); setNote("URL inválida."); return; }
    wsRef.current = ws;
    ws.onopen = () => { setStatus("conectado"); ws.send(JSON.stringify({ t: "hello", name: nm })); };
    ws.onclose = () => { setStatus((s) => (s === "erro" ? s : "desconectado")); setRooms([]); setMyRoom(null); setMatch(null); setGame(null); };
    ws.onerror = () => { setStatus("erro"); setNote("Não consegui conectar. Confira a URL — e lembre que o servidor Free do Render pode levar ~1 min pra acordar; tente de novo."); };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === "welcome") setServidor({ sig: m.sig || null, cards: m.cards || 0 });
      else if (m.t === "rooms") setRooms(m.rooms || []);
      else if (m.t === "roomCreated") { setMyRoom(m.roomId); setNote(""); }
      else if (m.t === "matchReady") {
        setMatch({ roomId: m.roomId, seat: m.seat, opponent: m.opponent }); setMyRoom(null); setNote(""); setTravou(false);
        try { ws.send(JSON.stringify({ t: "deckReady", deck: deckRef.current })); } catch {}
        /* Se o servidor não devolver o estado inicial, a tela não pode ficar
           dizendo "preparando…" para sempre — era exatamente assim que a falha
           aparecia. Passados 12 s sem gameState, eu digo o que houve. */
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setTravou(true), 12000);
      }
      else if (m.t === "gameState") {
        clearTimeout(timerRef.current); setTravou(false);
        setGame({ seat: m.seat, state: m.state, ready: m.ready, oppConnected: m.oppConnected });
      }
      else if (m.t === "opponentLeft") { clearTimeout(timerRef.current); setMatch(null); setGame(null); setNote("O adversário saiu. Sua sala está aberta de novo."); }
      else if (m.t === "roomClosed") { clearTimeout(timerRef.current); setMatch(null); setMyRoom(null); setGame(null); setNote("O anfitrião fechou a sala."); }
      else if (m.t === "error") { clearTimeout(timerRef.current); setTravou(false); setNote(m.msg || "Erro."); }
    };
  }
  const send = (obj) => { try { wsRef.current?.send(JSON.stringify(obj)); } catch {} };
  const disconnect = () => { try { wsRef.current?.close(); } catch {} };
  useEffect(() => () => { try { wsRef.current?.close(); } catch {} }, []);

  // Partida ao vivo: substitui todo o lobby pela mesa online.
  if (game) {
    return <OnlineGame send={send} data={game} note={note}
      onLeave={() => { send({ t: "leaveRoom" }); setGame(null); setMatch(null); }} />;
  }

  const visibleRooms = rooms.filter((r) => r.id !== myRoom);
  const box = { width: "100%", maxWidth: 460, margin: "0 auto" };
  const field = { width: "100%", padding: "10px 12px", borderRadius: 9, background: "#1c1917", border: "1px solid #44403c", color: "#e7e5e4", fontSize: 14, boxSizing: "border-box" };
  const btn = (bg, fg) => ({ padding: "11px 14px", borderRadius: 9, border: "none", background: bg, color: fg, fontWeight: 700, fontSize: 14, cursor: "pointer" });
  const statusColor = { desconectado: "#78716c", conectando: "#fbbf24", conectado: "#34d399", erro: "#fb7185" }[status];

  return (
    /* O index.html usa viewport-fit=cover, então no iPhone a página começa
       DEBAIXO da barra de status (relógio, bateria). Sem o env(safe-area) o
       título e o botão Voltar ficavam escondidos atrás dela. */
    <div style={{ minHeight: "100dvh", background: "#0c0a09", color: "#e7e5e4", fontFamily: "ui-sans-serif, system-ui, sans-serif",
      padding: "14px", paddingTop: "calc(14px + env(safe-area-inset-top))", paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}>
      <div style={{ ...box, display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontWeight: 800, letterSpacing: 0.5, color: "#fde68a", fontSize: 18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>𓂀 Guerras Egípcias</span>
        <span style={{ fontSize: 11, color: "#818cf8", flex: "0 0 auto" }}>Multiplayer · beta</span>
        <button onClick={onBack} style={{ ...btn("#292524", "#d6d3d1"), marginLeft: "auto", padding: "7px 12px" }}>Voltar</button>
      </div>

      <div style={{ ...box, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: statusColor, display: "inline-block" }} />
          <span style={{ color: "#a8a29e" }}>{status}</span>
          {connected && <span style={{ color: "#78716c" }}>· como <b style={{ color: "#e7e5e4" }}>{name.trim() || "Jogador"}</b></span>}
          {connected && <button onClick={disconnect} style={{ ...btn("#292524", "#d6d3d1"), marginLeft: "auto", padding: "6px 10px", fontSize: 12 }}>Desconectar</button>}
        </div>

        {!connected && (
          <>
            <label style={{ fontSize: 12, color: "#a8a29e" }}>Seu nome
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bruno" maxLength={24} style={{ ...field, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, color: "#a8a29e" }}>Servidor
              <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="wss://...onrender.com" style={{ ...field, marginTop: 4, fontSize: 12 }} />
            </label>
            <button onClick={connect} disabled={status === "conectando"} style={btn(status === "conectando" ? "#292524" : "#4f46e5", "#eef2ff")}>
              {status === "conectando" ? "Conectando…" : "Conectar"}
            </button>
            <p style={{ fontSize: 11, color: "#78716c", margin: 0 }}>Se o servidor estiver dormindo (plano Free), a primeira conexão pode levar ~1 min. Se der erro, tente de novo.</p>
          </>
        )}

        {connected && (desatualizado || semAssinatura) && (
          <div style={{ padding: 12, borderRadius: 10, background: "#450a0a", border: "1px solid #b91c1c", color: "#fecaca", fontSize: 12, lineHeight: 1.5 }}>
            <b style={{ fontSize: 13 }}>⚠ Servidor desatualizado</b><br />
            {semAssinatura
              ? "O servidor está rodando uma versão anterior à da coleção atual."
              : `O servidor tem ${servidor.cards} cartas (assinatura ${servidor.sig}); este app tem ${CARD_KEYS.length} (${CONTENT_SIG}).`}
            {" "}Uma partida nessas condições quebra no meio, então o multiplayer está bloqueado.
            Refaça o deploy do serviço no Render (Manual Deploy → Clear build cache &amp; deploy) e reconecte.
          </div>
        )}

        {connected && match && (
          <div style={{ padding: 14, borderRadius: 12, background: "#1c1917", border: `1px solid ${travou ? "#b45309" : "#4f46e5"}`, textAlign: "center" }}>
            <div style={{ fontSize: 15, marginBottom: 6 }}>Emparelhado com <b>{match.opponent}</b>!</div>
            <div style={{ fontSize: 13, color: "#a8a29e" }}>Você é o <b style={{ color: match.seat === 0 ? "#fcd34d" : "#7dd3fc" }}>Lado {match.seat === 0 ? "A (ouro)" : "B (lápis)"}</b>.</div>
            {travou
              ? <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 8, lineHeight: 1.5 }}>
                  O servidor recebeu seu deck mas não devolveu a partida. Ou o adversário ainda não
                  entrou na tela do lobby, ou o servidor está numa versão diferente da do app. Saia da sala e tente de novo.
                </div>
              : <div style={{ fontSize: 12, color: "#818cf8", marginTop: 8 }}>Preparando a partida… (enviando seu deck)</div>}
            <button onClick={() => { clearTimeout(timerRef.current); send({ t: "leaveRoom" }); setMatch(null); setTravou(false); }} style={{ ...btn("#292524", "#d6d3d1"), marginTop: 12 }}>Sair da sala</button>
          </div>
        )}

        {connected && !match && myRoom && (
          <div style={{ padding: 14, borderRadius: 12, background: "#1c1917", border: "1px solid #44403c", textAlign: "center" }}>
            <div style={{ fontSize: 14 }}>Sala criada. Aguardando um adversário entrar…</div>
            <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>Quem abrir o site vai ver sua sala na lista.</div>
            <button onClick={() => { send({ t: "leaveRoom" }); setMyRoom(null); }} style={{ ...btn("#292524", "#d6d3d1"), marginTop: 12 }}>Cancelar</button>
          </div>
        )}

        {connected && !match && !myRoom && !desatualizado && !semAssinatura && (
          <>
            <button onClick={() => send({ t: "createRoom" })} style={btn("#059669", "#052e16")}>Criar sala</button>
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Salas abertas</div>
              {visibleRooms.length === 0 && <div style={{ fontSize: 13, color: "#57534e", padding: "10px 0" }}>Nenhuma sala aberta. Crie uma e espere alguém entrar.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleRooms.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, background: "#1c1917", border: "1px solid #44403c" }}>
                    <span style={{ fontSize: 14 }}>Sala de <b>{r.host}</b></span>
                    <button onClick={() => send({ t: "joinRoom", roomId: r.id })} style={{ ...btn("#4f46e5", "#eef2ff"), marginLeft: "auto", padding: "8px 14px" }}>Entrar</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {note && <div style={{ fontSize: 12, color: "#fbbf24", padding: "8px 10px", borderRadius: 8, background: "#1c1917", border: "1px solid #44403c" }}>{note}</div>}
      </div>
    </div>
  );
}

export { Lobby };
