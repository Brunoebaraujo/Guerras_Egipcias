import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = dirname(fileURLToPath(import.meta.url));

function filesUnder(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  }).filter((path) => /\.(js|jsx)$/.test(path) && !path.endsWith(".test.js"));
}

function importsOf(path) {
  return [...readFileSync(path, "utf8").matchAll(/^import\s.+?from\s+["'](.+?)["'];?$/gm)].map((match) => match[1]);
}

describe("fronteiras arquiteturais", () => {
  it("domain e match não dependem de React ou APIs de navegador", () => {
    for (const area of ["domain", "match"]) {
      for (const path of filesUnder(join(src, area))) {
        const code = readFileSync(path, "utf8");
        expect(importsOf(path).some((name) => name === "react" || name === "react-dom"), path).toBe(false);
        expect(/\b(window|document|localStorage)\b/.test(code), path).toBe(false);
      }
    }
  });

  it("match importa regras somente de domain", () => {
    for (const path of filesUnder(join(src, "match"))) {
      expect(importsOf(path).some((name) => name === "../engine.js" || name === "../rng.js"), path).toBe(false);
    }
  });
});
