import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { CARDS, byKey } from "./engine.js";
import { estadoDoDeck } from "./deckLibrary.js";
import { getEffect } from "./domain/effects/registry.js";
import "./domain/effects/index.js";

/* O README ficou anos descrevendo a arquitetura anterior: dizia que as cartas
   viviam em `App.jsx`, que a lógica estava em `src/engine.js` e que o projeto
   era "sem backend" — quando já havia um servidor multiplayer inteiro. Pior, ele
   mandava copiar um workflow obsoleto de `docs/` por cima do pipeline real.

   Documentação sem guarda envelhece em silêncio. Estes testes cobrem só o que é
   verificável por código: caminhos citados, comandos prometidos e o exemplo de
   carta. Prosa e explicação continuam por conta de quem escreve. */

const README = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const PKG = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

describe("README — caminhos citados existem", () => {
  const caminhos = [
    "src/domain/engine.js", "src/domain/events.js", "src/domain/rng.js",
    "src/domain/rules.js", "src/domain/cards/schema.js", "src/domain/effects",
    "src/match/index.js", "src/match/phases.js", "src/net/filterState.js",
    "src/architecture.test.js", "src/ui/arte.js", "src/Carta.jsx",
    "src/ui/game/DesktopGameComponents.jsx", "server/index.js",
    ".github/workflows/deploy.yml", "public/moldura.png",
  ];

  it.each(caminhos)("%s é citado e existe", (caminho) => {
    expect(README).toContain(caminho);
    expect(existsSync(new URL(`../${caminho}`, import.meta.url))).toBe(true);
  });

  it("não cita mais os caminhos da arquitetura anterior", () => {
    // `src/engine.js` e `src/match.js` ainda existem como shims de compat, mas
    // o README não deve apontar para eles como se fossem a implementação.
    expect(README).not.toContain("array `CARDS`) em `src/App.jsx`");
    expect(README).not.toMatch(/lógica de jogo vive em `src\/engine\.js`/);
    expect(README).not.toContain("Sem backend");
  });

  it("não ressuscita os workflows removidos de docs/", () => {
    expect(README).not.toContain("exemplo-github-actions-deploy");
    expect(existsSync(new URL("../docs/deploy.yml", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../docs/exemplo-github-actions-deploy.yml.txt", import.meta.url))).toBe(false);
  });
});

describe("README — comandos prometidos existem", () => {
  const citados = ["lint", "typecheck", "test", "test:server", "assets:conferir",
    "assets:resolucoes", "build", "dev"];

  it.each(citados)("npm run %s está no package.json", (script) => {
    expect(README).toContain(script);
    expect(PKG.scripts[script]).toBeTruthy();
  });
});

describe("README — o exemplo de carta é real", () => {
  /* O exemplo usa Hathor. Se ela mudar de custo, poder ou efeito e o README
     não acompanhar, quem seguir o passo a passo copia um dado errado. */
  it("Hathor no README bate com a definição no motor", () => {
    const hathor = byKey.hathor;
    expect(hathor).toBeTruthy();
    expect(README).toContain(`custo: ${hathor.custo}`);
    expect(README).toContain(`poder: ${hathor.poder}`);
    expect(README).toContain(`arch: "${hathor.arch}"`);
    expect(README).toContain(`{ id: "${hathor.efeitos[0].id}", value: ${hathor.efeitos[0].value} }`);
  });

  it("o efeito do exemplo está registrado — não é um id inventado", () => {
    expect(getEffect("buffRandomAlly")).toBeTruthy();
  });

  it("as fases citadas são as que o registry realmente usa", () => {
    const citadas = ["enter", "continuous", "death", "reaction", "activated", "passive"];
    for (const fase of citadas) expect(README).toContain(`\`${fase}\``);
  });
});

describe("README — números que envelhecem", () => {
  it("não crava a contagem de cartas em prosa", () => {
    // Um "66 cartas" no texto vira mentira na próxima carta adicionada.
    expect(README).not.toMatch(/\b\d{2,4} cartas na coleção\b/);
    expect(CARDS.length).toBeGreaterThan(0);
  });

  it("promete o mínimo de testes que a suíte cumpre", () => {
    const m = README.match(/(\d+)\+? testes/);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeLessThanOrEqual(653);   // atualize junto se cair
  });
});

describe("estadoDoDeck é o que o README descreve", () => {
  it("desatualizado continua jogável — o README não promete bloqueio", () => {
    const doze = CARDS.slice(0, 12).map((c) => c.key);
    expect(estadoDoDeck({ cards: doze, sig: "antiga" }).estado).toBe("desatualizado");
  });
});
