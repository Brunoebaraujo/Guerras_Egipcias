import { describe, expect, it } from "vitest";
import { calcularJanela, fatiar, mesmaJanela } from "./janela.js";
import { ESPACO_ARTE, arteProps, arteUrl } from "../arte.js";

/* Coleção sintética grande de propósito: o ponto da virtualização não é o
   catálogo de hoje (66 cartas), é o de amanhã. Com 66 não daria para
   distinguir "monta a janela" de "monta tudo". */
const LINHA = 140;      // carta de 88px × 1,5 + gap de 8px, que é o caso do celular
const TELA = 600;

describe("calcularJanela", () => {
  it("no topo, monta a área visível mais uma tela de folga abaixo", () => {
    const j = calcularJanela({ topo: 0, alturaViewport: TELA, alturaLinha: LINHA, totalLinhas: 334 });
    expect(j.primeira).toBe(0);
    expect(j.ultima).toBe(Math.ceil((TELA * 2) / LINHA));   // visível + 1 tela de folga
  });

  it("com 1000 cartas, a janela é uma fração minúscula da coleção", () => {
    const totalLinhas = Math.ceil(1000 / 3);
    const j = calcularJanela({ topo: 0, alturaViewport: TELA, alturaLinha: LINHA, totalLinhas });
    expect(j.ultima - j.primeira).toBeLessThan(20);
    expect(totalLinhas).toBeGreaterThan(300);
  });

  it("rolando para o meio, a janela acompanha e deixa folga acima", () => {
    const j = calcularJanela({ topo: -10000, alturaViewport: TELA, alturaLinha: LINHA, totalLinhas: 334 });
    expect(j.primeira).toBeGreaterThan(0);
    expect(j.ultima).toBeGreaterThan(j.primeira);
    // a folga de cima existe: a primeira linha montada está acima da visível
    expect(j.primeira).toBeLessThan(Math.floor(10000 / LINHA));
  });

  it("nunca passa dos limites da coleção", () => {
    const fim = calcularJanela({ topo: -999999, alturaViewport: TELA, alturaLinha: LINHA, totalLinhas: 10 });
    expect(fim.primeira).toBeLessThanOrEqual(10);
    expect(fim.ultima).toBe(10);
    const antes = calcularJanela({ topo: 5000, alturaViewport: TELA, alturaLinha: LINHA, totalLinhas: 10 });
    expect(antes.primeira).toBe(0);
    expect(antes.ultima).toBeGreaterThanOrEqual(0);
  });

  it("coleção que cabe na tela é montada inteira", () => {
    const j = calcularJanela({ topo: 0, alturaViewport: TELA, alturaLinha: LINHA, totalLinhas: 3 });
    expect(j).toEqual({ primeira: 0, ultima: 3 });
  });

  it("coleção vazia não produz janela inválida", () => {
    expect(calcularJanela({ topo: 0, alturaViewport: TELA, alturaLinha: LINHA, totalLinhas: 0 }))
      .toEqual({ primeira: 0, ultima: 0 });
  });

  it("altura de linha inválida degrada para montar tudo, e não para NaN", () => {
    for (const alturaLinha of [0, -5, NaN, undefined]) {
      expect(calcularJanela({ topo: 0, alturaViewport: TELA, alturaLinha, totalLinhas: 42 }))
        .toEqual({ primeira: 0, ultima: 42 });
    }
  });
});

describe("fatiar", () => {
  const itens = Array.from({ length: 300 }, (_, i) => i);

  it("monta só a fatia e reserva o espaço do resto", () => {
    const { visiveis, acima, abaixo } = fatiar(itens, { primeira: 10, ultima: 20 }, 3, LINHA);
    expect(visiveis).toHaveLength(30);
    expect(visiveis[0]).toBe(30);
    expect(acima).toBe(10 * LINHA);
    expect(abaixo).toBe((100 - 20) * LINHA);
  });

  it("a altura reservada mais a montada equivale à grade inteira", () => {
    const janela = { primeira: 40, ultima: 55 };
    const { visiveis, acima, abaixo } = fatiar(itens, janela, 3, LINHA);
    const montada = (visiveis.length / 3) * LINHA;
    expect(acima + montada + abaixo).toBe(100 * LINHA);
  });

  it("no fim da lista não sobra espaço reservado abaixo", () => {
    expect(fatiar(itens, { primeira: 95, ultima: 100 }, 3, LINHA).abaixo).toBe(0);
  });
});

describe("mesmaJanela", () => {
  it("evita re-render quando a janela não mudou", () => {
    expect(mesmaJanela({ primeira: 1, ultima: 5 }, { primeira: 1, ultima: 5 })).toBe(true);
    expect(mesmaJanela({ primeira: 1, ultima: 5 }, { primeira: 2, ultima: 5 })).toBe(false);
    expect(mesmaJanela(null, { primeira: 1, ultima: 5 })).toBe(false);
  });
});

describe("arteProps — resolução servida", () => {
  it("oferece as três resoluções no srcset", () => {
    const props = arteProps("hathor", { sizes: ESPACO_ARTE.tabuleiro });
    expect(props.srcSet).toContain("cartas/256/hathor.webp 256w");
    expect(props.srcSet).toContain("cartas/512/hathor.webp 512w");
    expect(props.srcSet).toContain("cartas/hathor.webp 1000w");
  });

  it("é lazy por padrão — é isto que impede a Galeria de baixar tudo de uma vez", () => {
    expect(arteProps("hathor", { sizes: "120px" }).loading).toBe("lazy");
    expect(arteProps("hathor", { sizes: "120px", eager: true }).loading).toBe("eager");
  });

  it("sempre declara `sizes` — sem ele o navegador baixa a maior imagem", () => {
    for (const espaco of Object.values(ESPACO_ARTE)) expect(espaco).toBeTruthy();
    expect(arteProps("hathor", { sizes: ESPACO_ARTE.mao }).sizes).toBe(ESPACO_ARTE.mao);
  });

  it("carta sem arte não vira <img> quebrada", () => {
    expect(arteProps(null, { sizes: "120px" })).toBeNull();
    expect(arteProps(undefined, { sizes: "120px" })).toBeNull();
    expect(arteUrl(null)).toBeNull();
  });

  it("o caminho respeita o BASE_URL — absoluto quebraria sob o subdiretório do Pages", () => {
    const props = arteProps("hathor", { sizes: "120px" });
    expect(props.src.startsWith(import.meta.env.BASE_URL)).toBe(true);
    expect(props.src.startsWith("/cartas")).toBe(false);
  });
});
