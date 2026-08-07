import React, { useState, useRef, useEffect } from "react";
import Carta from "../Carta.jsx";
import MainMenu from "../MainMenu.jsx";
import {
  CARDS, PRAGAS, OUTORGAS, byKey, GLYPH, ARCH_COLOR, SIDE_NAME, custoDe,
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
  BOARD, Chip, Tabuleiro, ZoomModal,
} from "./game/DesktopGameComponents.jsx";
import { GameMobile } from "./game/MobileGame.jsx";
import { DUAT_KEYFRAMES } from "./game/animations.js";
import { LIB_API_STUB, Lobby } from "./multiplayer/Multiplayer.jsx";

export { GameMobile } from "./game/MobileGame.jsx";
export { Lobby, OnlineGame } from "./multiplayer/Multiplayer.jsx";

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
const PRESETS = {
  "Padrão":     ["montu", "carruagem", "guardareal", "armadura", "escaravelho", "ammit", "enxame", "mumia", "sobek", "hathor", "set", "selo"],
  "Exército":   ["servo", "arqueiro", "escaravelho", "heka", "lanceiro", "carruagem", "enxame", "montu", "guardareal", "amon", "general", "colosso"],
  "Sacrifício": ["servo", "bennu", "mumia", "armadura", "heka", "sobek", "enxame", "sekhmet", "apofis", "osiris", "diluvio", "amheh"],
  "Controle":   ["anubis", "maat", "selo", "sekhmet", "amon", "hathor", "montu", "osiris", "guardareal", "colosso", "general", "set"],
  "Bênção":     ["renenutet", "hathor", "heka", "armadura", "servo", "arqueiro", "lanceiro", "carruagem", "guardareal", "escaravelho", "montu", "amon"],
  // Assassinos: envenena por marcas acumuladas; Semerj espalha e Seqer-Mau finaliza.
  "Assassinos": ["servo", "arqueiro", "sicario", "heka", "senti", "enxame", "hemsu", "montu", "semerj", "akhu", "general", "seqer-mau"],
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

/* ==========================================================================
   BIBLIOTECA DE DECKS — modal reutilizável (desktop e mobile).

   Estilos inline propositalmente: o mesmo componente serve as duas interfaces
   sem depender das classes Tailwind da tela desktop. Recebe o `api` centralizado
   no App (que persiste no localStorage) e opera sempre sobre um `side`.
   ========================================================================== */
const custoMedio = (cards) => {
  if (!cards.length) return 0;
  const soma = cards.reduce((t, k) => t + (byKey[k]?.custo || 0), 0);
  return Math.round((soma / cards.length) * 10) / 10;
};

function DeckLibraryModal({ api, side, sideLabel, accent = "#818cf8", cards, focusSave, onClose, onLoaded }) {
  const loadedId = api.loadedId[side];
  const loaded = api.decks.find((d) => d.id === loadedId) || null;
  const [nome, setNome] = useState(loaded ? loaded.name : "");
  const [renomeando, setRenomeando] = useState(null); // {id, valor}
  const [confirmar, setConfirmar] = useState(null);    // id aguardando confirmação de apagar
  const inputRef = useRef(null);
  useEffect(() => { if (focusSave && inputRef.current) inputRef.current.focus(); }, [focusSave]);

  const completo = cards.length === DECK_SIZE && new Set(cards).size === DECK_SIZE;
  const chip = { padding: "7px 10px", borderRadius: 8, border: "1px solid #44403c", background: "#292524", color: "#e7e5e4", fontSize: 12.5, cursor: "pointer" };
  const chipOff = { ...chip, opacity: 0.45, cursor: "not-allowed" };

  function salvarNovo() {
    if (!completo) return;
    if (api.salvar(side, nome)) { setNome(""); }
  }
  function atualizar() {
    if (!completo || !loaded) return;
    api.atualizar(side, loaded.id);
  }
  function confirmarRenome(id) {
    if (api.renomear(id, renomeando.valor)) setRenomeando(null);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 460, maxHeight: "88vh", display: "flex", flexDirection: "column",
        background: "#0c0a09", border: `1px solid ${accent}`, borderRadius: 14, overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid #292524" }}>
          <span style={{ fontWeight: 800, color: accent, fontSize: 15 }}>📂 Meus decks</span>
          <span style={{ fontSize: 12, color: "#78716c" }}>{api.decks.length}/{api.max} · {sideLabel}</span>
          <button onClick={onClose} aria-label="Fechar" style={{ marginLeft: "auto", ...chip, padding: "4px 11px", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* salvar o build atual */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #1c1917", background: "#131110" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#78716c", marginBottom: 7 }}>Salvar deck atual ({cards.length}/12)</div>
          <div style={{ display: "flex", gap: 7 }}>
            <input ref={inputRef} value={nome} onChange={(e) => setNome(e.target.value.slice(0, api.nameMax))}
              onKeyDown={(e) => { if (e.key === "Enter") salvarNovo(); }}
              placeholder="Nome do deck" maxLength={api.nameMax} style={{
                flex: 1, minWidth: 0, padding: "9px 11px", borderRadius: 8, border: "1px solid #44403c",
                background: "#1c1917", color: "#e7e5e4", fontSize: 13.5, outline: "none",
              }} />
            <button onClick={salvarNovo} disabled={!completo} style={completo ? { ...chip, background: "#059669", color: "#0c0a09", border: "none", fontWeight: 700 } : chipOff}>💾 Salvar</button>
          </div>
          {loaded && (
            <button onClick={atualizar} disabled={!completo} style={{ ...(completo ? chip : chipOff), marginTop: 8, width: "100%", background: completo ? "rgba(129,140,248,.14)" : undefined, borderColor: accent, color: accent }}>
              ⟳ Atualizar "{loaded.name}" com o deck atual
            </button>
          )}
          {!completo && <div style={{ fontSize: 11.5, color: "#a8a29e", marginTop: 7 }}>Complete 12 cartas para salvar.</div>}
        </div>

        {/* lista de decks salvos */}
        <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "8px 10px" }}>
          {api.decks.length === 0 && (
            <div style={{ textAlign: "center", color: "#78716c", fontSize: 13, padding: "26px 10px" }}>Nenhum deck salvo ainda.<br />Monte um deck e toque em 💾 Salvar.</div>
          )}
          {api.decks.map((d) => {
            const integro = deckIntegro(d);
            const isLoaded = d.id === loadedId;
            return (
              <div key={d.id} style={{
                border: isLoaded ? `1.5px solid ${accent}` : "1px solid #292524", borderRadius: 10,
                padding: "9px 11px", marginBottom: 7, background: isLoaded ? "rgba(129,140,248,.07)" : "#161311",
              }}>
                {renomeando?.id === d.id ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input autoFocus value={renomeando.valor} maxLength={api.nameMax}
                      onChange={(e) => setRenomeando({ id: d.id, valor: e.target.value.slice(0, api.nameMax) })}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmarRenome(d.id); if (e.key === "Escape") setRenomeando(null); }}
                      style={{ flex: 1, minWidth: 0, padding: "7px 9px", borderRadius: 7, border: `1px solid ${accent}`, background: "#1c1917", color: "#e7e5e4", fontSize: 13, outline: "none" }} />
                    <button onClick={() => confirmarRenome(d.id)} style={{ ...chip, background: "#059669", color: "#0c0a09", border: "none" }}>OK</button>
                    <button onClick={() => setRenomeando(null)} style={chip}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#e7e5e4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                      {isLoaded && <span style={{ fontSize: 10.5, color: accent, flex: "0 0 auto" }}>carregado</span>}
                      {!integro && <span style={{ fontSize: 10.5, color: "#fbbf24", flex: "0 0 auto" }} title="Incompatível com a coleção atual">⚠ desatualizado</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>{d.cards.length} cartas · custo médio {custoMedio(d.cards)}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      <button onClick={() => { api.carregar(side, d.id); onLoaded?.(); }} style={{ ...chip, background: "rgba(129,140,248,.16)", borderColor: accent, color: accent, fontWeight: 700 }}>📥 Carregar</button>
                      <button onClick={() => setRenomeando({ id: d.id, valor: d.name })} style={chip}>✎ Renomear</button>
                      <button onClick={() => api.duplicar(d.id)} style={chip}>⧉ Duplicar</button>
                      {confirmar === d.id ? (
                        <>
                          <button onClick={() => { api.apagar(side, d.id); setConfirmar(null); }} style={{ ...chip, background: "#9f1239", color: "#fecdd3", border: "none", fontWeight: 700 }}>Confirmar</button>
                          <button onClick={() => setConfirmar(null)} style={chip}>Cancelar</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmar(d.id)} style={{ ...chip, color: "#fda4af", borderColor: "#7f1d1d" }}>🗑 Apagar</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


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

/* ========================== BANNER DE VITÓRIA ==============================
   A frase não fica centrada no ARQUIVO, e sim no PAINEL DE PEDRA de dentro da
   moldura. São coisas diferentes: os escaravelhos das quinas sobem acima da
   moldura, então o miolo é assimétrico no eixo vertical (24,95% de margem em
   cima contra 10% embaixo). Centrar na imagem jogava o texto para fora — foi
   exatamente o que aconteceu na primeira versão.

   Os quatro números vieram de medição na arte (varredura das bandas de ouro e
   lápis), não de estimativa: painel de pedra em (249,368)-(1262,717) da imagem
   original, convertido para % do recorte. Se a arte for trocada, é aqui que se
   remede.

   O corpo do texto escala pelo COMPRIMENTO da frase, para "Lado A venceu" e
   "Vitória" ocuparem bem o mesmo painel sem uma estourar e a outra sumir. */
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

/* Animações compartilhadas entre a interface desktop e a mobile. */
// =================================== APP ===================================
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
function DeckMobile({ build, setDeck, flash, startMatch, setScreen, setForceView, msg, libApi = LIB_API_STUB }) {
  const [side, setSide] = useState(0);
  const [detail, setDetail] = useState(null); // def da carta ampliada, ou null
  const [lib, setLib] = useState(null);        // {focusSave} — modal da biblioteca
  const cur = build[side];
  const ready = build[0].length === DECK_SIZE && build[1].length === DECK_SIZE;
  const accent = side === 0 ? "#fcd34d" : "#7dd3fc";

  const addCard = (k) => {
    if (build[side].includes(k)) return;
    if (build[side].length >= DECK_SIZE) { flash(`Deck cheio — ${DECK_SIZE} cartas (retire uma antes).`); return; }
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
          const full = build[s].length === DECK_SIZE;
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
        <button onClick={() => setDeck(side, shuffled(CARDS.map((c) => c.key)).slice(0, DECK_SIZE))} style={chip}>Aleatório</button>
        <button onClick={() => setDeck(side, [])} style={{ ...chip, color: "#a8a29e" }}>Limpar</button>
        {side === 1 && <button onClick={() => setDeck(1, build[0].slice())} style={chip}>Copiar A→B</button>}
      </div>
      {/* biblioteca de decks */}
      <div style={{ display: "flex", gap: 6, padding: "0 10px 6px" }}>
        <button onClick={() => setLib({ focusSave: true })} style={{ ...chip, flex: 1, background: "#065f46", color: "#d1fae5", border: "1px solid #047857" }}>💾 Salvar</button>
        <button onClick={() => setLib({ focusSave: false })} style={{ ...chip, flex: 1, background: "#3730a3", color: "#e0e7ff", border: "1px solid #4f46e5" }}>📂 Meus decks{libApi.decks.length ? ` (${libApi.decks.length})` : ""}</button>
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
        const full = cur.length >= DECK_SIZE;
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

      {lib && (
        <DeckLibraryModal api={libApi} side={side} sideLabel={SIDE_NAME[side]} accent={accent}
          cards={cur} focusSave={lib.focusSave} onClose={() => setLib(null)} onLoaded={() => setLib(null)} />
      )}
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
function MpDeck({ build, setDeck, flash, setScreen, msg, libApi = LIB_API_STUB }) {
  const [detail, setDetail] = useState(null);
  const [lib, setLib] = useState(null);
  const cur = build[0];
  const full = cur.length === DECK_SIZE;
  const accent = "#818cf8";

  const addCard = (k) => {
    if (cur.includes(k)) return;
    if (cur.length >= DECK_SIZE) { flash(`Deck cheio — ${DECK_SIZE} cartas (retire uma antes).`); return; }
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
        <button onClick={() => setDeck(0, shuffled(CARDS.map((c) => c.key)).slice(0, DECK_SIZE))} style={chip}>Aleatório</button>
        <button onClick={() => setDeck(0, [])} style={{ ...chip, color: "#a8a29e" }}>Limpar</button>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 10px 6px" }}>
        <button onClick={() => setLib({ focusSave: true })} style={{ ...chip, flex: 1, background: "#065f46", color: "#d1fae5", border: "1px solid #047857" }}>💾 Salvar</button>
        <button onClick={() => setLib({ focusSave: false })} style={{ ...chip, flex: 1, background: "#3730a3", color: "#e0e7ff", border: "1px solid #4f46e5" }}>📂 Meus decks{libApi.decks.length ? ` (${libApi.decks.length})` : ""}</button>
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
        <span style={{ fontSize: 11, color: "#78716c" }}>{full ? "Deck pronto." : `Faltam ${Math.max(0, DECK_SIZE - cur.length)}.`}</span>
        <button onClick={() => { if (cur.length !== DECK_SIZE) { flash(`Seu deck precisa ter exatamente ${DECK_SIZE} cartas.`); return; } setScreen("lobby"); }} disabled={!full} style={{
          marginLeft: "auto", flex: "1 1 auto", maxWidth: 260, padding: "11px 10px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
          background: full ? "#4f46e5" : "#292524", color: full ? "#e0e7ff" : "#78716c", cursor: full ? "pointer" : "not-allowed",
        }}>Continuar → conectar</button>
      </div>

      {detail && (() => {
        const on = cur.includes(detail.key);
        const cheio = cur.length >= DECK_SIZE;
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

      {lib && (
        <DeckLibraryModal api={libApi} side={0} sideLabel="Seu deck" accent="#818cf8"
          cards={cur} focusSave={lib.focusSave} onClose={() => setLib(null)} onLoaded={() => setLib(null)} />
      )}
    </div>
  );
}

export { MpDeck };

/* ==========================================================================
   LOBBY MULTIPLAYER (Fase 1 — cliente).
   Conecta no servidor WebSocket, lista salas abertas, cria/entra em sala e
   mostra o emparelhamento. A partida em rede (Fase 2) entra depois.
   ========================================================================== */
