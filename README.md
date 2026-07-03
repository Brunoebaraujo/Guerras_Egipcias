# DUAT — Guerras Egípcias (playtest)

Protótipo jogável (hotseat) de um jogo de cartas de tema egípcio, no estilo
Marvel Snap: 3 vias, 4 espaços por lado, energia 1→6 em 6 rodadas, vitória por
controlar 2 de 3 vias. Revelação por prioridade, com montagem de decks,
animações de revelação/efeitos e cartas de sacrifício/combo.

## Rodar localmente
```bash
npm install
npm run dev      # abre o servidor de desenvolvimento (Vite)
npm run build    # gera a versão de produção em dist/
npm run preview  # serve o build de produção localmente
```

## Publicar no GitHub Pages
O deploy é automático via GitHub Actions (`.github/workflows/deploy.yml`) a cada
push na branch `main`. Basta habilitar o Pages uma vez:

1. No repositório: **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Faça um push na `main` (ou rode o workflow em **Actions → Deploy para GitHub Pages → Run workflow**).

O site ficará em: **https://brunoebaraujo.github.io/Guerras_Egipcias/**

> Observação: o `base` no `vite.config.js` está fixado em `/Guerras_Egipcias/`
> (nome do repositório). Se renomear o repositório, ajuste esse valor.

## Stack
Vite + React + Tailwind CSS. Sem backend — todo o estado é local (hotseat).
