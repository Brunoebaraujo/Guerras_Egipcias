#!/usr/bin/env node
/* ==========================================================================
   Gera as resoluções derivadas das artes de carta.

   A arte MESTRA continua em `public/cartas/<chave>.webp` (1000×1000). Dela
   saem duas reduções, usadas pelo `srcset`:

     public/cartas/256/<chave>.webp   miniatura de tabuleiro e de mão
     public/cartas/512/<chave>.webp   grade da galeria e carta ampliada

   Por que 3 e não 2: a mesma arte é exibida a ~45px (carta na via) e a ~700px
   (zoom). Servir 1000px para a miniatura é gastar ~168KB para pintar dois mil
   pixels. Com o srcset o navegador escolhe — inclusive pela densidade da tela,
   que é o motivo de a miniatura pedir 256 e não 128.

   NUNCA AMPLIA. O `>` no -resize faz o ImageMagick só reduzir: artes que já
   nascem menores que o alvo (hoje bennu e mumia) são copiadas como estão, em
   vez de virarem um upscale borrado.

   IDEMPOTÊNCIA POR HASH, NÃO POR DATA. A primeira versão comparava `mtime` e
   quebrou no CI: `git clone` reescreve o timestamp de todo arquivo, então a
   derivada aparecia "mais velha" que a mestra num checkout limpo e a
   verificação acusava tudo desatualizado. O manifesto grava o hash do conteúdo
   de cada mestra; é ele que diz o que precisa ser regerado, e isso independe
   de como o arquivo chegou ao disco.
   ========================================================================== */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origem = join(raiz, "public", "cartas");
const manifesto = join(origem, "resolucoes.json");
const LARGURAS = [256, 512];
const QUALIDADE = 82;

const forcar = process.argv.includes("--forcar");
const conferir = process.argv.includes("--conferir");

const hashDe = (caminho) => createHash("sha1").update(readFileSync(caminho)).digest("hex").slice(0, 16);

const mestras = readdirSync(origem).filter((nome) => nome.endsWith(".webp")).sort();

const anterior = existsSync(manifesto) ? JSON.parse(readFileSync(manifesto, "utf8")) : { artes: {} };
const atual = { larguras: LARGURAS, qualidade: QUALIDADE, artes: {} };

const pendentes = [];
for (const nome of mestras) {
  const hash = hashDe(join(origem, nome));
  atual.artes[nome] = hash;
  const mudou = anterior.artes?.[nome] !== hash;
  const faltando = LARGURAS.filter((w) => !existsSync(join(origem, String(w), nome)));
  if (forcar || mudou || faltando.length) pendentes.push({ nome, motivo: faltando.length ? "faltando" : "mestra mudou" });
}

/* Derivada órfã: a mestra saiu da coleção e a redução ficou para trás. Não
   quebra nada, mas vira peso morto no repositório e no deploy. */
const orfas = [];
for (const largura of LARGURAS) {
  const pasta = join(origem, String(largura));
  if (!existsSync(pasta)) continue;
  for (const nome of readdirSync(pasta)) {
    if (nome.endsWith(".webp") && !mestras.includes(nome)) orfas.push(`${largura}/${nome}`);
  }
}

if (conferir) {
  const problemas = [];
  if (pendentes.length) {
    problemas.push(`${pendentes.length} arte(s) sem derivada atualizada: `
      + pendentes.slice(0, 8).map((p) => `${p.nome} (${p.motivo})`).join(", ") + (pendentes.length > 8 ? "…" : ""));
  }
  if (orfas.length) problemas.push(`${orfas.length} derivada(s) órfã(s): ${orfas.slice(0, 8).join(", ")}`);
  if (problemas.length) {
    for (const p of problemas) console.error(p);
    console.error("Rode `npm run assets:resolucoes` e commite o resultado (inclusive resolucoes.json).");
    process.exit(1);
  }
  console.log(`${mestras.length} arte(s) mestra(s), ${mestras.length * LARGURAS.length} derivada(s) — tudo em dia.`);
  process.exit(0);
}

let geradas = 0;
for (const largura of LARGURAS) mkdirSync(join(origem, String(largura)), { recursive: true });
for (const { nome } of pendentes) {
  for (const largura of LARGURAS) {
    execFileSync("convert", [
      join(origem, nome),
      "-resize", `${largura}x${largura}>`,   // `>` = só reduz, nunca amplia
      "-quality", String(QUALIDADE),
      "-define", "webp:lossless=false",
      join(origem, String(largura), nome),
    ]);
    geradas++;
  }
}
writeFileSync(manifesto, `${JSON.stringify(atual, null, 2)}\n`);
console.log(`${geradas} derivada(s) gerada(s) a partir de ${pendentes.length} arte(s); ${mestras.length} mestra(s) no total.`);
if (orfas.length) console.log(`Atenção: ${orfas.length} derivada(s) órfã(s) sem mestra: ${orfas.join(", ")}`);
