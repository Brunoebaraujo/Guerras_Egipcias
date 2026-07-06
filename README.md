# DUAT — Guerras Egípcias (playtest)

Protótipo jogável (hotseat) de card game de tema egípcio no estilo Marvel Snap:
3 vias, 4 espaços por lado, energia 1→6 em 6 rodadas, vitória por 2 de 3 vias.
Revelação por prioridade, montagem de decks, animações e cartas com arte.

## Novidades v0.3
- **Tabuleiro ilustrado** (`public/tabuleiro.webp`): as cartas são posicionadas
  nos quadrados de pedra de cada via e a **soma de poder aparece nos discos
  claros** (o líder da via ganha um anel na cor do lado). A geometria fica no
  objeto `BOARD` em `src/App.jsx` (percentuais — ajuste fino ali).
- **Ampliar carta**: clique em qualquer carta do tabuleiro (ou no 🔍 da mão)
  para vê-la em tamanho grande com custo, poder, efeito e lore.
- **Motor extraído**: toda a lógica de jogo vive em `src/engine.js` (puro, sem
  React) com testes formais em `src/engine.test.js` (`npm test`, vitest).
- **Deploy automático**: push na `main` roda testes, build e publica na branch
  `gh-pages` via GitHub Actions (`.github/workflows/deploy.yml`).

## Rodar localmente
```bash
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção em dist/
npm run preview  # serve o build localmente
```

## Cartas com arte
- Cada carta é um objeto em `src/App.jsx` (array `CARDS`). Campos de arte: `arte`
  (nome do arquivo em `public/cartas/<chave>.webp`) e `lore` (texto do papiro).
- A moldura fica em `public/moldura.png` (transparente na janela e nas bordas).
- O componente `src/Carta.jsx` compõe moldura + arte + campos vivos. As posições
  (discos, nome, papiro) estão no objeto `POS`, em %, fáceis de ajustar.
- Para adicionar uma carta nova: gere a ilustração quadrada, salve como
  `public/cartas/<chave>.webp` e preencha `arte:` (e `lore:`) na definição.
- Veja tudo na tela **Galeria** (botão na tela de montagem de decks). Amon já
  tem arte; as demais aparecem com placeholder.

## Publicar no GitHub Pages
O site é servido pela branch **`gh-pages`** (conteúdo de `dist/`). Para atualizar:
```bash
npm run build
cd dist
git init -q && git add -A && git commit -q -m "deploy"
git push -f https://github.com/Brunoebaraujo/Guerras_Egipcias.git HEAD:gh-pages
cd ..
```
Site: **https://brunoebaraujo.github.io/Guerras_Egipcias/**

> Para deploy automático a cada push, adicione o workflow em
> `docs/exemplo-github-actions-deploy.yml.txt` como `.github/workflows/deploy.yml`
> (precisa de um token com escopo `workflow`) e mude o Pages para "GitHub Actions".

## Stack
Vite + React + Tailwind CSS. Sem backend — estado local (hotseat).
