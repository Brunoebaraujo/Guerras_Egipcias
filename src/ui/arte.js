/* ==========================================================================
   Fonte única do caminho das artes de carta.

   Antes, `base + "cartas/" + arte + ".webp"` estava copiado em cinco pontos
   (Carta, CartaPraga, MiniCard, HandThumb, tabuleiro mobile). Cada um servia a
   arte mestra de 1000px, inclusive para a miniatura de ~45px do tabuleiro.

   Agora existe um só lugar, e ele devolve um `srcset`: o navegador escolhe a
   resolução pelo espaço que a imagem realmente ocupa e pela densidade da tela.
   As derivadas são geradas por `scripts/gerar-resolucoes.mjs`.

   `sizes` é OBRIGATÓRIO e não tem padrão útil: sem ele o navegador assume a
   largura da viewport e baixa sempre a maior imagem, que é exatamente o que
   estamos tentando evitar. Por isso cada chamador declara o espaço que a arte
   ocupa — em px quando é fixo, em vw quando acompanha a tela.
   ========================================================================== */

const LARGURAS = [256, 512, 1000];

/** Caminho da arte mestra. Use `arteProps` para exibir; isto é para pré-carga. */
export function arteUrl(arte, largura = 1000) {
  if (!arte) return null;
  const base = import.meta.env.BASE_URL;
  return largura >= 1000 ? `${base}cartas/${arte}.webp` : `${base}cartas/${largura}/${arte}.webp`;
}

/**
 * Props de <img> para uma arte de carta.
 * @param {string|null|undefined} arte  chave do arquivo (sem extensão)
 * @param {{ sizes: string, eager?: boolean }} opcoes
 *   sizes  espaço ocupado pela arte, ex. "120px" ou "(max-width: 780px) 40vw, 300px"
 *   eager  true só para a arte que já está visível na primeira pintura (o zoom
 *          aberto). Todo o resto é lazy — é o que faz a Galeria não baixar a
 *          coleção inteira de uma vez.
 * @returns {null | { src: string, srcSet: string, sizes: string, loading: "lazy"|"eager", decoding: "async" }}
 */
export function arteProps(arte, { sizes, eager = false } = {}) {
  if (!arte) return null;
  const base = import.meta.env.BASE_URL;
  return {
    src: `${base}cartas/${arte}.webp`,   // fallback para navegador sem srcset
    srcSet: LARGURAS
      .map((w) => `${w >= 1000 ? `${base}cartas/${arte}.webp` : `${base}cartas/${w}/${arte}.webp`} ${w}w`)
      .join(", "),
    sizes,
    loading: eager ? "eager" : "lazy",
    decoding: "async",
  };
}

/* Espaços declarados uma vez, para os chamadores não inventarem números soltos
   e para que ajustar um layout signifique ajustar um lugar. */
export const ESPACO_ARTE = {
  tabuleiro: "120px",           // carta na via: ~45–90px, com folga para telas densas
  mao: "140px",                 // miniatura da mão
  tabuleiroMobile: "110px",
  galeria: "(max-width: 640px) 33vw, 300px",
  ampliada: "min(90vw, 520px)",
};
