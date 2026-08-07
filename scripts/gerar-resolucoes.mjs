#!/usr/bin/env node
/* ==========================================================================
   Gera as resoluções derivadas das artes de carta.

   A arte MESTRA continua em `public/cartas/<chave>.webp` (1000×1000). Deste
   arquivo saem duas reduções, usadas pelo `srcset`:

     public/cartas/256/<chave>.webp   miniatura de tabuleiro e de mão
     public/cartas/512/<chave>.webp   grade da galeria e carta ampliada

   Por que 3 e não 2: a mesma arte é exibida a ~45px (carta no tabuleiro) e a
   ~700px (zoom). Servir 1000px para a miniatura é gastar ~168KB para pintar
   2 mil pixels. Com o srcset o navegador escolhe — inclusive levando em conta
   a densidade da tela, que é o motivo de a miniatura pedir 256 e não 128.

   NUNCA AMPLIA. `>` no -resize faz o ImageMagick só reduzir: artes que já
   nascem menores que o alvo (hoje bennu e mumia) são copiadas como estão, em
   vez de virarem um upscale borrado.

   Idempotente: só regrava o derivado se a mestra for mais nova. Rodar de novo
   depois de acrescentar uma carta gera apenas a que falta.
   ========================================================================== */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origem = join(raiz, "public", "cartas");
const LARGURAS = [256, 512];
const QUALIDADE = 82;

const forcar = process.argv.includes("--forcar");
const conferir = process.argv.includes("--conferir");

const mestras = readdirSync(origem)
  .filter((nome) => nome.endsWith(".webp"))
  .map((nome) => ({ nome, caminho: join(origem, nome) }))
  .filter(({ caminho }) => statSync(caminho).isFile());

let geradas = 0;
let puladas = 0;
const faltando = [];

for (const largura of LARGURAS) {
  const destino = join(origem, String(largura));
  mkdirSync(destino, { recursive: true });

  for (const { nome, caminho } of mestras) {
    const saida = join(destino, nome);
    if (existsSync(saida) && !forcar && statSync(saida).mtimeMs >= statSync(caminho).mtimeMs) {
      puladas++;
      continue;
    }
    if (conferir) { faltando.push(`${largura}/${nome}`); continue; }
    execFileSync("convert", [
      caminho,
      "-resize", `${largura}x${largura}>`,   // `>` = só reduz, nunca amplia
      "-quality", String(QUALIDADE),
      "-define", "webp:lossless=false",
      saida,
    ]);
    geradas++;
  }
}

if (conferir) {
  if (faltando.length) {
    console.error(`Faltam ${faltando.length} derivada(s): ${faltando.slice(0, 8).join(", ")}${faltando.length > 8 ? "…" : ""}`);
    console.error("Rode `npm run assets:resolucoes` e commite o resultado.");
    process.exit(1);
  }
  console.log(`Todas as ${mestras.length * LARGURAS.length} derivadas estão presentes e atualizadas.`);
} else {
  console.log(`${geradas} derivada(s) gerada(s), ${puladas} já atualizada(s), a partir de ${mestras.length} arte(s) mestra(s).`);
}
