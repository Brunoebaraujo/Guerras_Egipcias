import React, { useState, useRef, useEffect } from "react";
import Carta from "../Carta.jsx";
import MainMenu from "../MainMenu.jsx";
import {
  CARDS, PRAGAS, byKey, GLYPH, ARCH_COLOR, SIDE_NAME, custoDe,
  resetUid, shuffled, ctxOf,
  power, laneWins,
  montarLogPartida, decomporPartes,
} from "../engine.js";
import { freshMatch, applyAction, isAimable as podeMirar } from "../match.js";
import {
  loadStore, saveStore, addDeck, updateDeck, renameDeck, duplicateDeck, deleteDeck,
  deckIntegro, SCHEMA_V, MAX_DECKS, NAME_MAX,
} from "../deckLibrary.js";
import { DECK_SIZE } from "../rules.js";
import { useViewport } from "./hooks/useViewport.js";
import { resultLabel } from "./matchPresentation.js";
import { BannerVitoria } from "./game/BannerVitoria.jsx";
import {
  BOARD, Chip, Hand, Tabuleiro, ZoomModal,
} from "./game/DesktopGameComponents.jsx";
import { GameMobile } from "./game/MobileGame.jsx";
import { DUAT_KEYFRAMES } from "./game/animations.js";
import { Lobby } from "./multiplayer/Multiplayer.jsx";
import {
  AvisoOutorga, COLLECTION, DECK_LIST, DeckLibraryModal, DeckMobile, MpDeck,
  PRAGAS_ORDENADAS, PRESETS,
} from "./decks/DeckUi.jsx";
import {
  DIMENSOES_FILTRO, FILTROS_VAZIOS, FiltrosGaleria, GradeGaleria,
} from "./gallery/GalleryComponents.jsx";

export { GameMobile } from "./game/MobileGame.jsx";
export { Lobby, OnlineGame } from "./multiplayer/Multiplayer.jsx";
export { DeckMobile, MpDeck } from "./decks/DeckUi.jsx";

/* ==========================================================================
   Guerras Egípcias — playtest (revelação simultânea com prioridade) sobre o tabuleiro
   ilustrado. O motor do jogo vive em engine.js (com testes); aqui fica só
   a orquestração e a interface.
   ========================================================================== */

export default function App() {
  // A orquestração da partida vive em match.js (redutor puro, compartilhado com
  // o servidor). Aqui só delegamos — nada de regra duplicada.
  const freshState = (lists = [DECK_LIST, DECK_LIST]) => freshMatch(lists);

  const [g, setG] = useState(() => freshState());
  const [screen, setScreen] = useState("menu");                 // "menu" | "deck" | "game" | "galeria" | "mpdeck" | "lobby"
  const [build, setBuild] = useState([[...DECK_LIST], [...DECK_LIST]]);
  const [chosen, setChosen] = useState([DECK_LIST, DECK_LIST]);
  // Biblioteca de decks (persistente em localStorage). Carrega uma vez na
  // montagem; toda mutação regrava e atualiza o estado. `libLoadedId` lembra,
  // por lado, de qual deck salvo veio o build atual — para o "Salvar" oferecer
  // atualizar em vez de sempre criar um novo.
  const [libDecks, setLibDecks] = useState(() => loadStore().decks);
  const [libLoadedId, setLibLoadedId] = useState([null, null]);
  const [libModal, setLibModal] = useState(null); // {side, focusSave} — modal da biblioteca (desktop)
  const [sel, setSel] = useState(null);       // {side, hid}
  const aim = g.awaitingAim;                  // mira pendente vive no ESTADO (match.js)
  const [moving, setMoving] = useState(null); // {uid, side, lane} — Escaravelho
  const [zoom, setZoom] = useState(null);     // {def, printed, baked, current, sub}
  /* O banner cobre o tabuleiro, então precisa sair do caminho: um toque o
     dispensa. Volta a valer sozinho quando uma partida nova começa. */
  const [bannerVisto, setBannerVisto] = useState(false);
  useEffect(() => { if (!g.finished) setBannerVisto(false); }, [g.finished]);
  const [msg, setMsg] = useState("");
  const [shownPlagueSeq, setShownPlagueSeq] = useState(null);  // Rastreia qual seq de praga já foi mostrada
  const [pausedForPlague, setPausedForPlague] = useState(false);  // Pausa revelação enquanto praga é mostrada
  const plagueTimerRef = useRef(null);  // Ref para o timeout da praga
  
  // Reset plague pause state on new round (but not shownPlagueSeq - it persists)
  useEffect(() => {
    setPausedForPlague(false);
  }, [g.round]);
  
  // Quando uma praga é revelada, mostra o zoom por 6 segundos (apenas uma vez por praga)
  useEffect(() => {
    if (g.lastPlagueRevealed && g.lastPlagueRevealed.seq !== shownPlagueSeq) {
      const plagueKey = g.lastPlagueRevealed.key;
      const plagueCard = byKey[plagueKey];
      if (plagueCard) {
        setPausedForPlague(true);  // Pausa a revelação automática
        setZoom({
          def: plagueCard,
          custo: plagueCard.custo,
          printed: plagueCard.poder,
          baked: 0,
          current: null,
          partes: null,
          sub: "Praga revelada",
          onReturn: null,
          isPlagueShowcase: true,  // Flag para identificar que é showcase de praga
        });
        setShownPlagueSeq(g.lastPlagueRevealed.seq);  // Marca que já mostrou essa praga
        
        // Auto-close after 6 seconds
        plagueTimerRef.current = setTimeout(() => {
          setZoom(null);
          setPausedForPlague(false);  // Despausa revelação
          plagueTimerRef.current = null;
        }, 6000);
        
        return () => {
          if (plagueTimerRef.current) {
            clearTimeout(plagueTimerRef.current);
            plagueTimerRef.current = null;
          }
        };
      }
    }
  }, [g.lastPlagueRevealed, shownPlagueSeq]);
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
    if (aim || pausedForPlague) return;  // Pausa se em mira ou mostrando praga
    /* A revelação se conduz sozinha: um passo por vez até a fila esvaziar. */
    if (g.phase === "revealing") {
      const t = setTimeout(() => dispatch({ t: "step" }), esperaRevelacao());
      return () => clearTimeout(t);
    }
    /* ...e emenda na rodada seguinte. O botão de avançar não pedia decisão
       nenhuma: no fim da revelação só existia um caminho, e clicar nele era
       cerimônia. A PAUSA, essa sim, é necessária — o último efeito precisa
       assentar na tela antes de a rodada virar. Na rodada 6 o próprio redutor
       desvia para `finish`, então a partida encerra sem clique também.
       Ao chegar em "plan" (ou com a partida encerrada) a condição deixa de
       valer e nada mais é agendado. */
    if (g.phase === "revealed" && !g.finished) {
      const t = setTimeout(() => nextRound(), fast ? 700 : 1800);
      return () => clearTimeout(t);
    }
  }, [aim, pausedForPlague, g.phase, g.finished, fast, g.blessings, g.round]);

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
      cardUid: c.uid, cardOwner: c.owner, aguardandoProxima: c.aguardandoProxima, jaBufou: c.jaBufou,
    });
  }
  function zoomHand(h) {
    const def = byKey[h.key];
    setZoom({ def, custo: custoDe(h), printed: h.printed, baked: h.baked || 0, current: null, sub: (h.baked || 0) !== 0 ? `Faixa da Múmia — volta valendo ${h.printed + h.baked}` : "na mão" });
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

  // Handler para fechar zoom e despausa se for praga
  function handleZoomClose() {
    setZoom(null);
    // Se for praga showcase, limpa o timeout e despausa
    if (zoom?.isPlagueShowcase && pausedForPlague) {
      if (plagueTimerRef.current) {
        clearTimeout(plagueTimerRef.current);
        plagueTimerRef.current = null;
      }
      setPausedForPlague(false);
    }
  }

  function toggleActivateHu(cardUid, side) {
    if (dispatch({ t: "toggleActivate", side, uid: cardUid })) {
      // Sucesso — zoom já será fechado
    }
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
  function reset() { resetUid(); setSel(null); setMoving(null); setZoom(null); setMsg(""); setFast(false); setG(freshState(chosen)); }

  // ---------------------------- SELEÇÃO DE DECK ----------------------------
  const setDeck = (side, arr) => setBuild((b) => { const n = [b[0].slice(), b[1].slice()]; n[side] = arr; return n; });
  function toggleCard(side, k) {
    const cur = build[side];
    if (cur.includes(k)) setDeck(side, cur.filter((x) => x !== k));
    else if (cur.length < DECK_SIZE) setDeck(side, [...cur, k]);
    else flash("Deck cheio — 12 cartas (remova uma antes de trocar).");
    // Editar as cartas desliga o "vínculo" com o deck salvo: o próximo Salvar
    // pergunta se atualiza, e ao editar manualmente o usuário sabe que mexeu.
  }
  const randomDeck = (side) => setDeck(side, shuffled(CARDS.map((c) => c.key)).slice(0, DECK_SIZE));

  /* ------------------------- BIBLIOTECA DE DECKS -------------------------- */
  // Persiste `decks` no localStorage e sincroniza o estado. Toda operação da
  // biblioteca passa por aqui, então a gravação é única e consistente.
  function persistLib(decks) { saveStore({ v: SCHEMA_V, decks }); setLibDecks(decks); }
  const libApi = {
    decks: libDecks,
    max: MAX_DECKS,
    nameMax: NAME_MAX,
    // Salva o build de um lado como deck novo.
    salvar(side, nome) {
      const { store, error } = addDeck({ v: SCHEMA_V, decks: libDecks }, { name: nome, cards: build[side] });
      if (error) { flash(error); return false; }
      persistLib(store.decks);
      setLibLoadedId((ids) => { const n = ids.slice(); n[side] = store.decks[store.decks.length - 1].id; return n; });
      flash(`Deck "${store.decks[store.decks.length - 1].name}" salvo.`);
      return true;
    },
    // Atualiza um deck salvo com o build atual do lado.
    atualizar(side, id) {
      const { store, error, deck } = updateDeck({ v: SCHEMA_V, decks: libDecks }, id, { cards: build[side] });
      if (error) { flash(error); return false; }
      persistLib(store.decks);
      flash(`Deck "${deck.name}" atualizado.`);
      return true;
    },
    renomear(id, nome) {
      const { store, error } = renameDeck({ v: SCHEMA_V, decks: libDecks }, id, nome);
      if (error) { flash(error); return false; }
      persistLib(store.decks);
      return true;
    },
    duplicar(id) {
      const { store, error } = duplicateDeck({ v: SCHEMA_V, decks: libDecks }, id);
      if (error) { flash(error); return false; }
      persistLib(store.decks);
      return true;
    },
    apagar(side, id) {
      const { store, error } = deleteDeck({ v: SCHEMA_V, decks: libDecks }, id);
      if (error) { flash(error); return false; }
      persistLib(store.decks);
      // Se o lado tinha esse deck carregado, solta o vínculo.
      setLibLoadedId((ids) => ids.map((x) => (x === id ? null : x)));
      return true;
    },
    // Carrega um deck salvo no lado indicado e marca o vínculo.
    carregar(side, id) {
      const deck = libDecks.find((d) => d.id === id);
      if (!deck) { flash("Deck não encontrado."); return false; }
      if (!deckIntegro(deck)) { flash("Este deck está incompatível com a coleção atual — edite antes de jogar."); }
      setDeck(side, deck.cards.slice());
      setLibLoadedId((ids) => { const n = ids.slice(); n[side] = id; return n; });
      flash(`Deck "${deck.name}" carregado.`);
      return true;
    },
    loadedId: libLoadedId,
  };

  function startMatch() {
    if (build[0].length !== DECK_SIZE || build[1].length !== DECK_SIZE) { flash(`Cada deck precisa ter exatamente ${DECK_SIZE} cartas.`); return; }
    setChosen([build[0].slice(), build[1].slice()]);
    setG(freshState(build)); setSel(null); setMoving(null); setFast(false);
    setScreen("game");
  }

  const ctx = ctxOf(g);
  const wins = laneWins(g);

  // ============================ TELA: MENU ==================================
  if (screen === "menu") {
    return (
      <MainMenu
        onSolo={() => {
          // Inicia Hotseat com Exército (Side A) vs Sacrifício (Side B)
          setChosen([PRESETS["Exército"], PRESETS["Sacrifício"]]);
          setG(freshState([PRESETS["Exército"], PRESETS["Sacrifício"]]));
          setScreen("game");
        }}
        onMultiplayer={() => setScreen("mpdeck")}
        onDecks={() => setScreen("deck")}
      />
    );
  }

  // ============================ TELA: LOBBY ================================
  if (screen === "lobby") {
    return <Lobby onBack={() => setScreen("mpdeck")} deck={build[0].length === DECK_SIZE ? build[0] : PRESETS["Padrão"]} />;
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
    return <MpDeck build={build} setDeck={setDeck} flash={flash} setScreen={setScreen} msg={msg} libApi={libApi} />;
  }

  if (screen === "deck") {
    if (isMobile) return (
      <DeckMobile build={build} setDeck={setDeck} flash={flash} startMatch={startMatch}
        setScreen={setScreen} setForceView={setForceView} msg={msg} libApi={libApi} />
    );
    const ready = build[0].length === DECK_SIZE && build[1].length === DECK_SIZE;
    const DeckPanel = (side) => {
      const cur = build[side];
      const full = cur.length === DECK_SIZE;
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
            <span className="w-px self-stretch bg-stone-700 mx-0.5" />
            <button onClick={() => setLibModal({ side, focusSave: true })} className="px-2 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-xs text-emerald-100">💾 Salvar</button>
            <button onClick={() => setLibModal({ side, focusSave: false })} className="px-2 py-1 rounded bg-indigo-800 hover:bg-indigo-700 text-xs text-indigo-100">📂 Meus decks{libDecks.length ? ` (${libDecks.length})` : ""}</button>
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
        {libModal && (
          <DeckLibraryModal api={libApi} side={libModal.side} sideLabel={SIDE_NAME[libModal.side]}
            accent={libModal.side === 0 ? "#fbbf24" : "#38bdf8"} cards={build[libModal.side]}
            focusSave={libModal.focusSave} onClose={() => setLibModal(null)} onLoaded={() => setLibModal(null)} />
        )}
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
          startReveal={startReveal} setFast={setFast} reset={reset}
          setScreen={setScreen} setForceView={setForceView}
          placeCard={placeCard} pickUp={pickUp} resetPlan={resetPlan} startMove={startMove} moveTo={moveTo}
          applyAim={applyAim} skipAim={skipAim} isAimable={isAimable} isMovable={isMovable}
          zoomBoard={zoomBoard} zoomHand={zoomHand} copiarLog={copiarLog} baixarLog={baixarLog} />
        {zoom && <ZoomModal zoom={zoom} onClose={handleZoomClose} onToggleActivate={toggleActivateHu} />}
        {!bannerVisto && <BannerVitoria g={g} online={false} onFechar={() => setBannerVisto(true)} />}
      </>
    );
  }

  return (
    <div className="w-full bg-stone-900 text-stone-100 font-sans" style={{ height: "100dvh", overflow: "hidden" }}>
      <style>{DUAT_KEYFRAMES}</style>
      {/* Layout de duas colunas: painel de controle à esquerda, tabuleiro à
          direita ocupando a altura toda. Sem scroll da página inteira — cada
          coluna gerencia o próprio transbordo. */}
      <div className="flex gap-3 p-3 sm:p-4" style={{ height: "100dvh", boxSizing: "border-box" }}>

        {/* ============ COLUNA ESQUERDA: painel de controle ============ */}
        <aside className="flex flex-col gap-3" style={{ width: 380, flex: "0 0 380px", height: "100%", minHeight: 0 }}>

          {/* 1. Cabeçalho + controles */}
          <div className="rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17", flex: "0 0 auto" }}>
            <div className="mb-2">
              <h1 className="text-xl font-bold tracking-widest text-amber-200">
                𓂀 Guerras Egípcias <span className="text-stone-500 text-sm font-normal tracking-normal">· playtest</span>
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">Revelação por prioridade · abre com 3 · compra 1/rodada · clique numa carta para ampliá-la</p>
            </div>

            {/* Estado + prioridade */}
            <div className="flex items-center gap-2 mb-2 text-sm flex-wrap">
              <span className={`px-2 py-1 rounded font-semibold ${planning ? "bg-stone-800 text-stone-200" : g.phase === "revealing" ? "bg-indigo-900 text-indigo-100" : "bg-emerald-900 text-emerald-100"}`}>
                {planning ? "Planejar" : g.phase === "revealing" ? "Revelando…" : "Revelado"}
              </span>
              <span className="text-stone-400">Prioridade:</span>
              <span className={`font-bold ${g.priority === 0 ? "text-amber-300" : "text-sky-300"}`}>{SIDE_NAME[g.priority]}</span>
              <span className="text-stone-500 text-xs">({g.priorityReason})</span>
            </div>
            {g.trevas === g.round && (
              <div className="mb-2 px-2 py-1 rounded bg-indigo-950 border border-indigo-700 text-indigo-200 text-xs">
                ⊘ Trevas — as cartas desta rodada permanecem ocultas
              </div>
            )}

            {/* Chips de rodada e energia */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Chip label="Rodada" value={`${g.round}/6`} />
              <Chip label="Energia A" value={g.energy[0]} tone="amber" />
              <Chip label="Energia B" value={g.energy[1]} tone="sky" />
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-2 flex-wrap">
              {planning && <button onClick={startReveal} className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-stone-900 font-semibold text-sm">Revelar</button>}
              {g.phase === "revealing" && <button onClick={() => setFast((f) => !f)} className={`px-3 py-2 rounded-md text-sm font-semibold ${fast ? "bg-sky-500 text-stone-900" : "bg-stone-700 hover:bg-stone-600"}`}>{fast ? "⏩ rápido" : "⏩ acelerar"}</button>}
              {g.phase === "revealed" && !g.finished && <span className="px-3 py-2 rounded-md bg-stone-800 text-amber-200 font-semibold text-sm">{g.round >= 6 ? "Encerrando…" : "Rodada resolvida…"}</span>}
              <button onClick={reset} className="px-3 py-2 rounded-md bg-stone-700 hover:bg-stone-600 text-sm">Reiniciar</button>
              <button onClick={() => setScreen("deck")} className="px-3 py-2 rounded-md bg-stone-800 hover:bg-stone-700 text-sm text-stone-300">Decks</button>
              <button onClick={() => setForceView("mobile")} className="px-3 py-2 rounded-md bg-stone-800 hover:bg-stone-700 text-sm text-stone-300" title="Ver a interface mobile">📱</button>
            </div>

            {/* Placar de vias */}
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-stone-400">Vias:</span>
              <span className="text-amber-300 font-bold">A {wins[0]}</span>
              <span className="text-stone-600">×</span>
              <span className="text-sky-300 font-bold">{wins[1]} B</span>
              {g.finished && <span className="px-2 py-0.5 rounded bg-stone-800 border border-amber-600 text-amber-200 font-semibold text-xs">{resultLabel(g)}</span>}
            </div>

            {/* Avisos contextuais (mira/movimento) */}
            {moving && <div className="mt-2 px-2 py-1.5 rounded bg-sky-950 border border-sky-700 text-sky-100 text-xs">⇄ Movendo o Escaravelho — clique numa via do {SIDE_NAME[moving.side]} para onde levá-lo (ou clique nele de novo para cancelar).</div>}
            {aim && (
              <div className="mt-2 px-2 py-1.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-100 text-xs flex items-center gap-2">
                <span>🎯 <b>{aim.srcNome}</b> ({SIDE_NAME[aim.side]}): escolha {aim.needs === "ally" ? "um aliado" : "uma carta inimiga"} na Via {aim.lane + 1}.</span>
                <button onClick={skipAim} className="ml-auto px-2 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-xs whitespace-nowrap">Pular alvo</button>
              </div>
            )}
            {msg && <div className="mt-2 px-2 py-1.5 rounded bg-rose-950 border border-rose-800 text-rose-200 text-xs">{msg}</div>}
          </div>

          {/* 2. Como jogar */}
          <div className="rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17", flex: "0 0 auto" }}>
            <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-2">Como jogar no tabuleiro</h3>
            <ul className="text-xs text-stone-400 space-y-1 list-disc pl-4">
              <li>Selecione uma carta na mão e clique na <b>área da via</b> (retângulo de pedra) para posicioná-la.</li>
              <li>O <b>disco claro</b> de cada via mostra a soma de poder daquele lado — o líder ganha um anel na cor do lado.</li>
              <li>Clique em qualquer carta (mão ou mesa) para <b>ampliá-la</b> com efeito e lore.</li>
              <li>Escaravelho ⇄: na rodada seguinte, clique nele e depois em outra via para movê-lo.</li>
              <li>⚖ na faixa do rio indica que a Maat prende a via ao poder impresso.</li>
            </ul>
          </div>

          {/* 3. Registro da partida — ocupa o resto e rola sozinho */}
          <div className="rounded-lg border border-stone-700 p-3 flex flex-col" style={{ backgroundColor: "#1c1a17", flex: "1 1 auto", minHeight: 0 }}>
            <div className="flex items-center justify-between mb-2" style={{ flex: "0 0 auto" }}>
              <h3 className="text-xs uppercase tracking-widest text-stone-400">Registro da partida</h3>
              <div className="flex gap-1">
                <button onClick={copiarLog} className="text-[10px] px-2 py-0.5 rounded border border-stone-600 text-stone-300 hover:bg-stone-700">Copiar</button>
                <button onClick={baixarLog} className="text-[10px] px-2 py-0.5 rounded border border-stone-600 text-stone-300 hover:bg-stone-700">Baixar</button>
              </div>
            </div>
            <div className="space-y-1 overflow-y-auto text-sm text-stone-300 pr-1" style={{ flex: "1 1 auto", minHeight: 0 }}>
              {g.log.map((l, i) => (<div key={i} className={i === 0 ? "text-stone-100" : "text-stone-400"}>{l}</div>))}
            </div>
          </div>
        </aside>

        {/* ============ COLUNA DO MEIO: mãos em grade ============
            Lado A no topo, Lado B na base — cada mão vira uma grade de
            miniaturas que rola sozinha se ficar longa. Tirar as mãos de cima e
            de baixo do tabuleiro devolve TODA a altura vertical para ele. */}
        <div className="flex flex-col gap-2" style={{ width: 232, flex: "0 0 232px", height: "100%", minHeight: 0 }}>
          <div className="flex flex-col" style={{ flex: "1 1 50%", minHeight: 0 }}>
            <Hand side={0} tone="amber" g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} onZoom={zoomHand} />
          </div>
          <div className="flex flex-col" style={{ flex: "1 1 50%", minHeight: 0 }}>
            <Hand side={1} tone="sky" g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} onZoom={zoomHand} />
          </div>
        </div>

        {/* ============ COLUNA DIREITA: tabuleiro em tela cheia ============ */}
        <main className="flex" style={{ flex: "1 1 auto", height: "100%", minHeight: 0, minWidth: 0, alignItems: "center", justifyContent: "center" }}>
          <div className="rounded-xl" style={{ width: "100%", height: "100%", minHeight: 0, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {/* O tabuleiro precisa de tamanho CONCRETO: as vias são posicionadas
                em absoluto, então o wrapper não ganha altura sozinho. Deriva a
                largura da altura disponível (height 100% + aspect-ratio) e limita
                pela largura com max-width, para caber nos dois eixos. */}
            <div style={{ height: "100%", aspectRatio: BOARD.ratio, maxWidth: "100%" }}>
              <Tabuleiro g={g} ctx={ctx} aim={aim} moving={moving} sel={sel} planning={planning}
                placeCard={placeCard} moveTo={moveTo} applyAim={applyAim} isAimable={isAimable}
                startMove={startMove} isMovable={isMovable} pickUp={pickUp} zoomBoard={zoomBoard} />
            </div>
          </div>
        </main>
      </div>

      {zoom && <ZoomModal zoom={zoom} onClose={handleZoomClose} onToggleActivate={toggleActivateHu} />}
      {!bannerVisto && <BannerVitoria g={g} online={false} onFechar={() => setBannerVisto(true)} />}
    </div>
  );
}

/* ============================ TABULEIRO ILUSTRADO ========================= */
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
