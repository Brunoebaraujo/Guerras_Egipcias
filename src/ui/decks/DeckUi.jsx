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
/* Nomes fixos no código — a fonte de verdade de CADA preset é a sobrescrita do
   jogador (ver `storage/presetLibrary.js`) quando ela existir; sem sobrescrita,
   cai aqui. Renomear ou remover uma chave de `DEFAULT_PRESETS` é seguro: uma
   sobrescrita órfã simplesmente para de aparecer (`effectivePresets`). */
export const DEFAULT_PRESETS = {
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
// Compat: código existente (e telas ainda não migradas) que lia `PRESETS`
// direto continua funcionando — mas sem refletir edições do jogador. Prefira
// sempre `presets` vindo do App (mesclado com as sobrescritas).
export const PRESETS = DEFAULT_PRESETS;
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


/* ==========================================================================
   EDITOR DE PRESETS — edita o conteúdo de um deck pré-configurado (Padrão,
   Exército, Sacrifício...) e salva localmente. Reaproveita a mesma grade
   virtualizada de seleção (`GradeSelecaoCartas`) dos construtores de deck; a
   diferença é que aqui um clique alterna a carta direto (adicionar/retirar),
   sem passar pelo modal de detalhe — o objetivo é edição rápida, não escolha
   cuidadosa carta a carta.

   `api` vem do App e encapsula a persistência (`storage/presetLibrary.js`):
     api.estadoDe(name)         -> "ok" | "desatualizado" | "invalido" | "inexistente"
     api.hasOverride(name)      -> bool
     api.salvar(name, cards)    -> { ok, error? }
     api.restaurar(name)        -> void (apaga a sobrescrita, volta ao padrão)
   ========================================================================== */
function PresetEditorModal({ presets, api, onClose }) {
  const nomes = Object.keys(presets);
  const [nome, setNome] = useState(nomes[0] || null);
  const [working, setWorking] = useState(() => (nome ? presets[nome].slice() : []));
  const [aviso, setAviso] = useState("");

  const trocarPreset = (n) => { setNome(n); setWorking(presets[n].slice()); setAviso(""); };

  const cheio = working.length >= DECK_SIZE;
  const toggle = (def) => {
    setAviso("");
    if (working.includes(def.key)) { setWorking(working.filter((k) => k !== def.key)); return; }
    if (cheio) { setAviso(`Preset cheio — ${DECK_SIZE} cartas (retire uma antes).`); return; }
    setWorking([...working, def.key]);
  };

  const overridden = nome ? api.hasOverride(nome) : false;
  const estado = nome ? api.estadoDe(nome) : "inexistente";
  const pronto = working.length === DECK_SIZE && new Set(working).size === DECK_SIZE;

  function salvar() {
    if (!nome || !pronto) return;
    const r = api.salvar(nome, working);
    if (r.error) { setAviso(r.error); return; }
    setAviso(`"${nome}" salvo — vale para deckbuilder e para bots que usarem este preset.`);
  }
  function restaurar() {
    if (!nome) return;
    api.restaurar(nome);
    setWorking(presets[nome].slice());
    setAviso(`"${nome}" restaurado ao padrão original.`);
  }

  const chip = { padding: "6px 10px", borderRadius: 8, border: "1px solid #44403c", background: "#292524", color: "#e7e5e4", fontSize: 12.5, cursor: "pointer" };
  const chipOff = { ...chip, opacity: 0.45, cursor: "not-allowed" };
  const accent = "#fbbf24";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 560, maxHeight: "88vh", display: "flex", flexDirection: "column",
        background: "#0c0a09", border: `1px solid ${accent}`, borderRadius: 14, overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid #292524" }}>
          <span style={{ fontWeight: 800, color: accent, fontSize: 15 }}>✎ Editar presets</span>
          <button onClick={onClose} aria-label="Fechar" style={{ marginLeft: "auto", ...chip, padding: "4px 11px", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* escolha de preset */}
        <div style={{ display: "flex", gap: 5, padding: "10px 14px 6px", overflowX: "auto", borderBottom: "1px solid #1c1917" }}>
          {nomes.map((n) => (
            <button key={n} onClick={() => trocarPreset(n)} style={{
              ...chip, whiteSpace: "nowrap",
              border: n === nome ? `1.5px solid ${accent}` : chip.border,
              color: n === nome ? accent : chip.color,
              fontWeight: n === nome ? 700 : 400,
            }}>{n}{api.hasOverride(n) ? " ✎" : ""}</button>
          ))}
        </div>

        {nome && (
          <>
            <div style={{ padding: "8px 14px 4px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#e7e5e4" }}>{nome}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: working.length === DECK_SIZE ? "#34d399" : working.length > DECK_SIZE ? "#fb7185" : "#a8a29e" }}>{working.length}/{DECK_SIZE}</span>
              {overridden && estado === "ok" && <span style={{ fontSize: 10.5, color: accent }} title="Este preset foi editado — vale a versão salva">✎ editado</span>}
              {estado === "desatualizado" && <span style={{ fontSize: 10.5, color: "#fbbf24" }} title="A coleção mudou desde que este preset foi editado — ele ainda joga, mas confira os números">⚠ desatualizado</span>}
              {estado === "invalido" && <span style={{ fontSize: 10.5, color: "#fb7185" }}>✕ não jogável</span>}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#78716c" }}>Toque numa carta para adicionar/retirar.</span>
            </div>

            <GradeSelecaoCartas selecionadas={working} accent={accent} colunas={COLUNAS.online} onEscolher={toggle} />

            {aviso && <div style={{ margin: "0 14px 8px", padding: "6px 9px", borderRadius: 8, background: "#1c1917", border: "1px solid #44403c", color: "#fcd34d", fontSize: 12 }}>{aviso}</div>}

            <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid #292524" }}>
              <button onClick={restaurar} disabled={!overridden} style={overridden ? { ...chip, color: "#fda4af", borderColor: "#7f1d1d" } : chipOff}>↺ Restaurar padrão</button>
              <button onClick={salvar} disabled={!pronto} style={pronto ? { ...chip, marginLeft: "auto", background: "#059669", color: "#0c0a09", border: "none", fontWeight: 700 } : { ...chipOff, marginLeft: "auto" }}>💾 Salvar preset</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeckMobile({
  build, setDeck, flash, startMatch, setScreen, setForceView, msg, libApi = LIB_API_STUB,
  presets = DEFAULT_PRESETS, presetApi = null, bot = null,
}) {
  const [side, setSide] = useState(0);
  const [detail, setDetail] = useState(null); // def da carta ampliada, ou null
  const [lib, setLib] = useState(null);        // {focusSave} — modal da biblioteca
  const [presetEditor, setPresetEditor] = useState(false);
  const [botPanel, setBotPanel] = useState(false);
  const cur = build[side];
  const ready = build[0].length === DECK_SIZE && build[1].length === DECK_SIZE;
  const readyBot = build[0].length === DECK_SIZE;
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
        {Object.keys(presets).map((name) => (
          <button key={name} onClick={() => setDeck(side, presets[name].slice())} style={chip}>{name}</button>
        ))}
        <button onClick={() => setDeck(side, shuffled(CARDS.map((c) => c.key)).slice(0, DECK_SIZE))} style={chip}>Aleatório</button>
        <button onClick={() => setDeck(side, [])} style={{ ...chip, color: "#a8a29e" }}>Limpar</button>
        {side === 1 && <button onClick={() => setDeck(1, build[0].slice())} style={chip}>Copiar A→B</button>}
      </div>
      {/* biblioteca de decks */}
      <div style={{ display: "flex", gap: 6, padding: "0 10px 6px" }}>
        <button onClick={() => setLib({ focusSave: true })} style={{ ...chip, flex: 1, background: "#065f46", color: "#d1fae5", border: "1px solid #047857" }}>💾 Salvar</button>
        <button onClick={() => setLib({ focusSave: false })} style={{ ...chip, flex: 1, background: "#3730a3", color: "#e0e7ff", border: "1px solid #4f46e5" }}>📂 Meus decks{libApi.decks.length ? ` (${libApi.decks.length})` : ""}</button>
        {presetApi && (
          <button onClick={() => setPresetEditor(true)} style={{ ...chip, flex: 1, background: "#78350f", color: "#fde68a", border: "1px solid #92400e" }}>✎ Editar presets</button>
        )}
      </div>
      {bot && (
        <div style={{ padding: "0 10px 6px" }}>
          <button onClick={() => setBotPanel((v) => !v)} style={{
            ...chip, width: "100%", background: botPanel ? "#86198f" : "#3b0764", color: "#f5d0fe", border: "1px solid #86198f",
          }}>🤖 vs Bot{botPanel ? " ▲" : " ▼"}</button>
          {botPanel && (
            <div style={{ marginTop: 6, padding: 8, borderRadius: 9, background: "#1c0a24", border: "1px solid #581c87" }}>
              <div style={{ fontSize: 11, color: "#e9d5ff", marginBottom: 6 }}>O Lado B ({SIDE_NAME[1]}) vira controlado pela máquina.</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                {bot.order.map((lvl) => {
                  const info = bot.levels[lvl];
                  const active = bot.level === lvl;
                  return (
                    <button key={lvl} onClick={() => info.disponivel && bot.setLevel(lvl)} disabled={!info.disponivel} style={{
                      ...chip,
                      background: !info.disponivel ? "#292524" : active ? "#c026d3" : "#292524",
                      color: !info.disponivel ? "#57534e" : active ? "#fdf4ff" : "#d6d3d1",
                      cursor: info.disponivel ? "pointer" : "not-allowed",
                      fontWeight: active ? 700 : 400,
                    }}>{info.label}{!info.disponivel ? " (em breve)" : ""}</button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                <button onClick={() => bot.setDeckChoice("aleatorio")} style={{
                  ...chip, background: bot.deckChoice === "aleatorio" ? "#c026d3" : "#292524", color: bot.deckChoice === "aleatorio" ? "#fdf4ff" : "#d6d3d1",
                }}>🎲 Aleatório</button>
                {Object.keys(presets).map((name) => (
                  <button key={name} onClick={() => bot.setDeckChoice(name)} style={{
                    ...chip, background: bot.deckChoice === name ? "#c026d3" : "#292524", color: bot.deckChoice === name ? "#fdf4ff" : "#d6d3d1",
                  }}>{name}</button>
                ))}
              </div>
              <button onClick={bot.start} disabled={!readyBot} style={{
                width: "100%", padding: "10px 8px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 13,
                background: readyBot ? "#c026d3" : "#292524", color: readyBot ? "#fdf4ff" : "#78716c", cursor: readyBot ? "pointer" : "not-allowed",
              }}>Iniciar contra Bot</button>
              {!readyBot && <div style={{ fontSize: 10.5, color: "#a8a29e", marginTop: 5 }}>Complete o deck do {SIDE_NAME[0]} primeiro.</div>}
            </div>
          )}
        </div>
      )}
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

      {presetEditor && presetApi && (
        <PresetEditorModal presets={presets} api={presetApi} onClose={() => setPresetEditor(false)} />
      )}
    </div>
  );
}

export { DeckMobile, PresetEditorModal };

/* ==========================================================================
   MONTAGEM DO DECK — MULTIPLAYER (deck único, antes de conectar).
   Mesma UX do single-player: tocar numa carta abre a versão ampliada com
   Adicionar/Retirar do deck e um X para fechar. Funciona em desktop e mobile.
   O deck do multiplayer é o Lado A (build[0]).
   ========================================================================== */
function MpDeck({ build, setDeck, flash, setScreen, msg, libApi = LIB_API_STUB, presets = DEFAULT_PRESETS, presetApi = null }) {
  const [detail, setDetail] = useState(null);
  const [lib, setLib] = useState(null);
  const [presetEditor, setPresetEditor] = useState(false);
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
        {Object.keys(presets).map((name) => (
          <button key={name} onClick={() => setDeck(0, presets[name].slice())} style={chip}>{name}</button>
        ))}
        <button onClick={() => setDeck(0, shuffled(CARDS.map((c) => c.key)).slice(0, DECK_SIZE))} style={chip}>Aleatório</button>
        <button onClick={() => setDeck(0, [])} style={{ ...chip, color: "#a8a29e" }}>Limpar</button>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 10px 6px" }}>
        <button onClick={() => setLib({ focusSave: true })} style={{ ...chip, flex: 1, background: "#065f46", color: "#d1fae5", border: "1px solid #047857" }}>💾 Salvar</button>
        <button onClick={() => setLib({ focusSave: false })} style={{ ...chip, flex: 1, background: "#3730a3", color: "#e0e7ff", border: "1px solid #4f46e5" }}>📂 Meus decks{libApi.decks.length ? ` (${libApi.decks.length})` : ""}</button>
        {presetApi && (
          <button onClick={() => setPresetEditor(true)} style={{ ...chip, flex: 1, background: "#78350f", color: "#fde68a", border: "1px solid #92400e" }}>✎ Editar presets</button>
        )}
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

      {presetEditor && presetApi && (
        <PresetEditorModal presets={presets} api={presetApi} onClose={() => setPresetEditor(false)} />
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
