// @ts-check
/* ==========================================================================
   Matemática da janela de virtualização da Galeria.

   Vive fora do componente de propósito: é a parte que pode errar (fora do
   intervalo, folga negativa, coleção menor que a tela) e a única que precisa de
   teste. O componente fica só com a medição do DOM e a pintura, que o projeto
   já cobre por `renderToString`.

   Todas as medidas são em px e relativas à VIEWPORT — `topo` é o que
   `getBoundingClientRect().top` devolve, e por isso fica negativo conforme a
   grade sobe. Não importa quem rola (página, painel, modal): a conta é a mesma.
   ========================================================================== */

/** @typedef {{ primeira: number, ultima: number }} Janela */

/**
 * Intervalo de linhas a montar, com folga acima e abaixo da área visível.
 *
 * @param {object} m
 * @param {number} m.topo             topo da grade relativo à viewport (negativo ao rolar)
 * @param {number} m.alturaViewport   altura visível
 * @param {number} m.alturaLinha      altura de uma linha de cartas, com o gap
 * @param {number} m.totalLinhas      linhas da coleção filtrada
 * @param {number} [m.folgaTelas]     telas extras montadas de cada lado
 * @returns {Janela}
 */
export function calcularJanela({ topo, alturaViewport, alturaLinha, totalLinhas, folgaTelas = 1 }) {
  // Sem altura de linha não há como dividir: monta tudo em vez de dividir por
  // zero e devolver NaN, que apagaria a grade inteira.
  if (!Number.isFinite(alturaLinha) || alturaLinha <= 0) return { primeira: 0, ultima: totalLinhas };
  if (totalLinhas <= 0) return { primeira: 0, ultima: 0 };

  const folga = Math.max(0, alturaViewport * folgaTelas);
  const inicio = Math.floor((-topo - folga) / alturaLinha);
  const fim = Math.ceil((-topo + alturaViewport + folga) / alturaLinha);

  const primeira = Math.min(Math.max(0, inicio), totalLinhas);
  const ultima = Math.max(primeira, Math.min(totalLinhas, fim));
  return { primeira, ultima };
}

/** Duas janelas iguais não devem provocar re-render. */
export const mesmaJanela = (a, b) => !!a && !!b && a.primeira === b.primeira && a.ultima === b.ultima;

/**
 * Fatia a ser montada e o espaço reservado para o que ficou de fora.
 * @template T
 * @param {T[]} itens
 * @param {Janela} janela
 * @param {number} colunas
 * @param {number} alturaLinha
 */
export function fatiar(itens, janela, colunas, alturaLinha) {
  const totalLinhas = Math.ceil(itens.length / colunas);
  const { primeira, ultima } = janela;
  return {
    visiveis: itens.slice(primeira * colunas, ultima * colunas),
    acima: primeira * alturaLinha,
    abaixo: Math.max(0, (totalLinhas - ultima) * alturaLinha),
  };
}
