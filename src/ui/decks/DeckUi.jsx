import React, { memo, useEffect, useRef, useState } from "react";
import Carta from "../../Carta.jsx";
import { ARCH_COLOR, CARDS, GLYPH, OUTORGAS, PRAGAS, SIDE_NAME, byKey, shuffled } from "../../engine.js";
import { MAX_DECKS, NAME_MAX, estadoDoDeck } from "../../deckLibrary.js";
import { DECK_SIZE } from "../../rules.js";
import { calcularJanela, fatiar, mesmaJanela } from "../janela.js";

export const LIB_API_STUB = {
  decks: [], loadedId: [null, null], max: MAX_DECKS, nameMax: NAME_MAX,
  salvar: () => false, atualizar: () => false, renomear: () => false,
  duplicar: () => false, apagar: () => false, carregar: () => false,
};

export const DECK_LIST = [
  "montu", "carruagem", "guardareal",
  "armadura", "escaravelho", "ammit", "enxame",
  "mumia", "sobek", "hathor", "set", "selo",
];
export const PRESETS = {
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
export const COLLECTION = [...CARDS].sort((a, b) => a.custo - b.custo || a.nome.localeCompare(b.nome));

/* Quantas cartas o deck ganha de brinde (Moisés → 10 Pragas). O deckbuilder
   precisa avisar: o jogador escolhe 12, mas joga com 22. */
const contarOutorgadas = (deck) =>
  deck.reduce((n, k) => n + (byKey[k]?.outorga ? (OUTORGAS[byKey[k].outorga] || []).length : 0), 0);

/**
 * Grade de seleção de cartas das telas mobile de deck.
 *
 * `DeckMobile` (solo) e `MpDeck` (online) tinham esta grade duplicada linha por
 * linha — a única diferença real eram as colunas: duas fixas no solo, encaixe
 * automático no online. Toda mudança de aparência da carta na lista precisava
 * ser feita nos dois lugares, e nada garantia que fossem.
 *
 * A grade do desktop (App.jsx) NÃO entrou aqui de propósito: ela usa Tailwind e
 * alterna a carta no clique, enquanto estas usam estilo inline e abrem um modal
 * de detalhe. São interações diferentes, não a mesma tela duas vezes — juntá-las
 * seria impor um sistema de estilo ao outro, com risco de reescrita e nenhum
 * ganho de correção.
 */
/* Uma carta da grade. Isolada e memoizada porque a grade re-renderiza a cada
   seleção: sem isto, escolher UMA carta reconstrói o botão de todas as outras. */
const CartaDaGrade = memo(function CartaDaGrade({ def, on, accent, onEscolher }) {
  return (
    <button onClick={() => onEscolher(def)} style={{
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
});

/* Layout DECLARATIVO, não string de CSS. A virtualização precisa saber quantas
   COLUNAS existem para fatiar por linha, e `repeat(auto-fill, ...)` não conta:
   quem resolve o encaixe é o navegador. Declarando a largura mínima, a contagem
   sai da largura medida — e o template CSS sai da contagem, então layout e
   fatiamento nunca discordam. */
const COLUNAS = {
  solo: { fixas: 2 },
  online: { minPx: 150 },
};
const GAP = 8;
/* Altura de uma linha, medida do botão real na primeira pintura. O palpite só
   vale até a medição chegar; errar para BAIXO é o lado seguro, porque monta
   linhas a mais e não deixa buraco branco. */
const ALTURA_LINHA_PALPITE = 56;

/**
 * Grade de seleção de cartas das telas mobile de deck.
 *
 * `DeckMobile` (solo) e `MpDeck` (online) tinham esta grade duplicada linha por
 * linha — a única diferença real eram as colunas.
 *
 * A grade do desktop (App.jsx) NÃO entrou aqui de propósito: ela usa Tailwind e
 * alterna a carta no clique, enquanto estas usam estilo inline e abrem um modal
 * de detalhe. São interações diferentes, não a mesma tela duas vezes.
 *
 * VIRTUALIZADA porque o custo de montar era linear na coleção: medido a 4,0ms
 * por render com 51 cartas, o que projeta ~24ms a 300 e ~79ms a 1000 — e a
 * grade re-renderiza a cada carta escolhida, então isso vira atraso no clique.
 * Reaproveita a mesma conta de janela da Galeria (`../janela.js`).
 */
function GradeSelecaoCartas({ cartas = COLLECTION, selecionadas, accent, colunas, onEscolher }) {
  const ref = useRef(null);
  const primeiroRef = useRef(null);
  const [medida, setMedida] = useState(null);   // { colunas, alturaLinha }
  const [janela, setJanela] = useState(null);   // null = monta tudo

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const w = el.clientWidth || 0;
      if (!w) return;
      const cols = colunas.fixas || Math.max(1, Math.floor((w + GAP) / (colunas.minPx + GAP)));
      const alt = (primeiroRef.current?.offsetHeight || 0) + GAP;
      setMedida((atual) => {
        const proxima = { colunas: cols, alturaLinha: alt > GAP ? alt : ALTURA_LINHA_PALPITE };
        return atual && atual.colunas === proxima.colunas && atual.alturaLinha === proxima.alturaLinha
          ? atual : proxima;
      });
    };
    medir();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", medir);
      return () => window.removeEventListener("resize", medir);
    }
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [colunas]);

  const cols = medida?.colunas || colunas.fixas || 2;
  const alturaLinha = medida?.alturaLinha || ALTURA_LINHA_PALPITE;
  const totalLinhas = Math.ceil(cartas.length / cols);

  useEffect(() => {
    const el = ref.current;
    if (!el || !medida || typeof IntersectionObserver === "undefined") return;
    let pendente = false;
    const recalcular = () => {
      pendente = false;
      const proxima = calcularJanela({
        topo: el.getBoundingClientRect().top,
        alturaViewport: window.innerHeight || 800,
        alturaLinha, totalLinhas,
      });
      setJanela((atual) => (mesmaJanela(atual, proxima) ? atual : proxima));
    };
    const agendar = () => { if (pendente) return; pendente = true; requestAnimationFrame(recalcular); };
    recalcular();
    /* Captura: quem rola aqui é o contêiner da grade, e scroll não borbulha. */
    window.addEventListener("scroll", agendar, { capture: true, passive: true });
    window.addEventListener("resize", agendar, { passive: true });
    return () => {
      window.removeEventListener("scroll", agendar, { capture: true });
      window.removeEventListener("resize", agendar);
    };
  }, [medida, alturaLinha, totalLinhas]);

  const { visiveis, acima, abaixo } = janela
    ? fatiar(cartas, janela, cols, alturaLinha)
    : { visiveis: cartas, acima: 0, abaixo: 0 };

  /* Até a medição chegar, o template é o ORIGINAL — inclusive `auto-fill`, que o
     navegador resolve sozinho. Assim a primeira pintura não muda de aparência:
     antes desta virtualização a grade online encaixava por largura mínima, e
     cair para um número fixo por um quadro seria um salto visível de layout. */
  const template = medida
    ? `repeat(${cols}, minmax(0, 1fr))`
    : colunas.fixas
      ? `repeat(${colunas.fixas}, minmax(0, 1fr))`
      : `repeat(auto-fill, minmax(${colunas.minPx}px, 1fr))`;

  return (
    <div ref={ref} style={{ flex: "1 1 auto", overflowY: "auto", padding: "2px 10px 8px" }}>
      <div style={{ display: "grid", gridTemplateColumns: template, gap: GAP }}>
        {acima > 0 && <div aria-hidden="true" style={{ gridColumn: "1 / -1", height: acima }} />}
        {visiveis.map((def, i) => (
          <div key={def.key} ref={i === 0 ? primeiroRef : null} style={{ display: "grid" }}>
            <CartaDaGrade def={def} on={selecionadas.includes(def.key)} accent={accent} onEscolher={onEscolher} />
          </div>
        ))}
        {abaixo > 0 && <div aria-hidden="true" style={{ gridColumn: "1 / -1", height: abaixo }} />}
      </div>
    </div>
  );
}

export function AvisoOutorga({ deck, estilo = "web" }) {
  const extras = contarOutorgadas(deck);
  if (!extras) return null;
  const txt = `+${extras} Pragas outorgadas pelo Moisés — a partida começa com ${deck.length + extras} cartas embaralhadas.`;
  if (estilo === "web") return <div className="text-xs text-amber-300/90 mb-2">{txt}</div>;
  return <div style={{ fontSize: 11, color: "#fcd34d", padding: "0 10px 6px" }}>{txt}</div>;
}
export const PRAGAS_ORDENADAS = [...PRAGAS].sort((a, b) => a.custo - b.custo || a.nome.localeCompare(b.nome));

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

export function DeckLibraryModal({ api, side, sideLabel, accent = "#818cf8", cards, focusSave, onClose, onLoaded }) {
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
            const { estado: estadoDeck } = estadoDoDeck(d);
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
                      {/* Dois selos distintos: "desatualizado" é aviso (joga),
                          "não jogável" é impedimento (falta carta ou repete). */}
                      {estadoDeck === "desatualizado" && <span style={{ fontSize: 10.5, color: "#fbbf24", flex: "0 0 auto" }} title="A coleção mudou desde que este deck foi salvo — ele ainda joga, mas confira os números">⚠ desatualizado</span>}
                      {estadoDeck === "invalido" && <span style={{ fontSize: 10.5, color: "#fb7185", flex: "0 0 auto" }} title="Este deck não é jogável: edite antes de usar">✕ não jogável</span>}
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
      <GradeSelecaoCartas selecionadas={cur} accent={accent} colunas={COLUNAS.solo} onEscolher={setDetail} />

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
              <button onClick={() => { addCard(detail.key); setDetail(null); }} disabled={on || full} style={{
                flex: 1, padding: "12px 8px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
                background: on || full ? "#292524" : "#059669", color: on || full ? "#78716c" : "#0c0a09",
                cursor: on || full ? "not-allowed" : "pointer",
              }}>Adicionar ao deck</button>
              <button onClick={() => { removeCard(detail.key); setDetail(null); }} disabled={!on} style={{
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

      <GradeSelecaoCartas selecionadas={cur} accent={accent} colunas={COLUNAS.online} onEscolher={setDetail} />

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
              <button onClick={() => { addCard(detail.key); setDetail(null); }} disabled={on || cheio} style={{
                flex: 1, padding: "12px 8px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14,
                background: on || cheio ? "#292524" : "#059669", color: on || cheio ? "#78716c" : "#0c0a09",
                cursor: on || cheio ? "not-allowed" : "pointer",
              }}>Adicionar ao deck</button>
              <button onClick={() => { removeCard(detail.key); setDetail(null); }} disabled={!on} style={{
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
