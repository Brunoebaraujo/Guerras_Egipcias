import React, { useEffect, useRef, useState } from "react";
import Carta from "../../Carta.jsx";
import { ARCH_COLOR, GLYPH } from "../../engine.js";

const ARCH_NOME = {
  base: "Base", buff: "Bênção", debuff: "Maldição", sacrificio: "Sacrifício", reset: "Equilíbrio",
  silencio: "Silêncio", movimento: "Movimento", crescimento: "Crescimento", fusao: "Fusão", renascimento: "Renascimento",
  animal: "Animal",
};

/* Dimensões de filtro da Galeria. Para acrescentar uma nova — tipo, set, o que
   for — basta uma entrada aqui: os chips, a contagem e a filtragem saem de
   graça, e os valores oferecidos são só os que existem na aba aberta. */
export const DIMENSOES_FILTRO = [
  { id: "custo", rotulo: "Energia", de: (c) => c.custo,
    ordenar: (a, b) => a - b, rotuloValor: (v) => `${v}⚡` },
  { id: "arch", rotulo: "Arquétipo", de: (c) => c.arch,
    ordenar: (a, b) => (ARCH_NOME[a] || a).localeCompare(ARCH_NOME[b] || b),
    rotuloValor: (v) => `${GLYPH[v] || ""} ${ARCH_NOME[v] || v}`.trim(),
    classeValor: (v) => ARCH_COLOR[v] || "" },
];
export const FILTROS_VAZIOS = Object.fromEntries(DIMENSOES_FILTRO.map((d) => [d.id, []]));

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
export function GradeGaleria({ cartas, onAmpliar }) {
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

export function FiltrosGaleria({ lista, filtros, onAlternar, onLimpar, visiveis }) {
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

