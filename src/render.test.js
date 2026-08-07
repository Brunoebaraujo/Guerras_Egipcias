import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/* ==========================================================================
   Guarda de RENDER — protege contra remontagem desnecessária.

   Achado em partida: clicar em qualquer carta refazia a animação do halo
   dourado da compra. A causa não era a animação, era o React. `CardBtn` estava
   declarado DENTRO de `Hand`, e um componente declarado dentro de outro ganha
   identidade de função nova a cada render do pai. O React compara os tipos,
   vê funções diferentes, e em vez de atualizar ele DESMONTA e REMONTA a
   subárvore — jogando fora o DOM da mão inteira e reiniciando toda animação
   CSS junto, porque animação de CSS recomeça quando o elemento monta.

   O teste é estático de propósito. A alternativa seria montar a árvore e
   contar montagens, que é caro e frágil; o defeito, porém, é textual e dá para
   pegar lendo o arquivo. Vale para todo componente que alguém venha a escrever.
   ========================================================================== */
describe("nenhum componente é declarado dentro de outro", () => {
  const arquivos = ["src/ui/App.jsx", "src/Carta.jsx"];

  /* Uma linha como "  const Foo = (" ou "    const Foo = function" com QUALQUER
     indentação está dentro de outra função. Só é problema se o nome for usado
     como JSX (<Foo ... />) — se for chamado como função comum, Foo(x), não cria
     fronteira de componente e o React nem fica sabendo. */
  const aninhados = (src) => {
    const linhas = src.split("\n");
    const achados = [];
    linhas.forEach((linha, i) => {
      const m = linha.match(/^(\s+)const ([A-Z][A-Za-z0-9]*)\s*=\s*(\(|function)/);
      if (!m) return;
      const nome = m[2];
      const usadoComoJSX = linhas.some((l) => new RegExp(`<${nome}[\\s/>]`).test(l));
      if (usadoComoJSX) achados.push(`linha ${i + 1}: ${nome}`);
    });
    return achados;
  };

  for (const arq of arquivos) {
    it(`${arq} não declara componente aninhado usado como JSX`, () => {
      expect(aninhados(readFileSync(arq, "utf8"))).toEqual([]);
    });
  }

  it("a mão usa HandThumb do nível do módulo", () => {
    const src = readFileSync("src/ui/App.jsx", "utf8");
    expect(src).toMatch(/^function HandThumb\(/m);
    expect(src).toContain("<HandThumb key={h.hid}");
  });

  it("o halo da compra continua sendo uma animação de disparo único", () => {
    const src = readFileSync("src/ui/App.jsx", "utf8");
    const regra = src.split("\n").find((l) => l.includes(".duat-draw {"));
    expect(regra).toBeDefined();
    // Sem `infinite`: ela toca uma vez ao montar e para. Se um dia virar
    // infinita, o halo volta a piscar a partida toda.
    expect(regra).not.toContain("infinite");
  });
});
