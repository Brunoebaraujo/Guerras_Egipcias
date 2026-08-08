# DUAT — Guerras Egípcias

Card game de tema egípcio no estilo Marvel Snap: 3 vias, 4 espaços por lado,
energia 1→6 em 6 rodadas, revelação simultânea por prioridade, vitória por
2 de 3 vias. Joga em **hotseat** (mesa compartilhada) ou **online** contra outro
jogador, com servidor autoritativo.

**Jogar:** https://brunoebaraujo.github.io/Guerras_Egipcias/

---

## Rodar localmente

```bash
npm ci --legacy-peer-deps
npm run dev            # http://localhost:5173

# multiplayer local (opcional, em outro terminal)
npm ci --prefix server
node server/index.js   # porta 8080 (ou $PORT)
```

## Verificar antes de commitar

```bash
npm run lint           # eslint (no-undef pega variável fora de escopo)
npm run typecheck      # tsc --checkJs sobre o JSDoc
npm test               # 650+ testes, ~11s
npm run test:server    # integração real: sobe o servidor e abre WebSockets
npm run assets:conferir # derivadas de arte em dia
npm run build
```

O CI (`.github/workflows/deploy.yml`) roda tudo isso mais os fluxos E2E em
Chromium. Push na `main` publica o Pages e redeploya o servidor no Render
**apenas quando `domain/`, `match/` ou `server/` mudam** — deploy do frontend
não derruba partidas online em curso.

---

## Arquitetura

Três camadas, com fronteiras verificadas por `src/architecture.test.js`.

| onde | o quê |
|---|---|
| `src/domain/engine.js` | `CARDS`/`PRAGAS`/`TOKENS`, `power()`, `destroyList()`, resolvers |
| `src/domain/effects/` | registry de efeitos, um arquivo por família |
| `src/domain/events.js` | barramento de eventos, com trava de profundidade |
| `src/domain/rng.js` | PRNG semeado (mulberry32) e Fisher-Yates |
| `src/domain/rules.js` | `DECK_SIZE`, `MAX_ROUND`, `VIAS` — fonte única |
| `src/domain/cards/schema.js` | `validarColecao()`, roda no CI |
| `src/match/index.js` | `freshMatch`, `applyAction(state, action) -> { state, error? }` |
| `src/match/phases.js` | tabela de transições e invariantes de fase |
| `src/ui/` | React. Só lê do domínio; nunca muta estado |
| `src/net/filterState.js` | filtro do estado por assento (lista de permissão) |
| `src/storage/` | biblioteca de decks (localStorage) e migrações |
| `server/index.js` | transporte, lobby, relógio da revelação |

`src/domain/` e `src/match/` são **puros**: sem React, sem DOM, sem I/O.

**O servidor importa o mesmo `src/match/` do cliente.** Não há regra duplicada,
e por isso não há como cliente e servidor divergirem.

### Invariantes que o CI protege

- `domain/` e `match/` não importam React nem tocam `window`
- `ui/` não importa resolvers do motor
- `validarColecao()` retorna zero erros
- mesma seed + mesmas ações → estado idêntico byte a byte
- o estado enviado ao cliente passa por **lista de permissão**
  (`src/net/filterState.js`): campo novo é invisível por padrão, e não vaza
  jogada oculta do adversário por esquecimento

---

## Adicionar uma carta

Uma carta é **dado**, não código. Se ela usa um efeito que já existe:

1. Acrescente a definição em `src/domain/engine.js` (`CARDS`):

```js
{ key: "hathor", nome: "Hathor", tipo: "Divindade", custo: 2, poder: 3,
  arch: "buff", trigger: "entrar", arte: "hathor",
  texto: "Ao Entrar: dê +3 a um aliado aleatório na via.",
  lore: "...",
  efeitos: [{ id: "buffRandomAlly", value: 3 }] }
```

2. Gere a arte 1000×1000 em `public/cartas/hathor.webp` e rode
   `npm run assets:resolucoes` (cria as derivadas 256/512 usadas pelo `srcset`).
   Commite as derivadas **e** `public/cartas/resolucoes.json`.

3. `npm test`. Pronto.

**`efeitos[]` é a única fonte dos parâmetros.** Não existe flag paralela: editar
`efeitos[].value` muda o jogo de verdade. Um `id` que não esteja no registry é
erro de validação, não um efeito silenciosamente inerte.

### Adicionar um efeito novo

Registre em `src/domain/effects/`, e nada em `match/` precisa mudar:

```js
registrarEfeito("buffRandomAlly", {
  fase: "enter",
  resolver: ({ state, card, definition, rng }) => { /* ... */ },
});
```

Fases declaradas no registry: `enter`, `continuous` (contribui para `power`),
`death`, `reaction`, `activated`, `passive`. As de morte chegam pelos eventos
`beforeDeath` e `afterDeaths`, emitidos por `destroyList` — com ordem
determinística e trava de profundidade (`MAX_EVENT_DEPTH = 16`) contra cadeias
infinitas do tipo "ao morrer, destrua um aliado".

Vários efeitos registram um resolver nulo de propósito: existem para serem
DESCOBERTOS (`cartaTemEfeito`) e validados, enquanto o comportamento vive num
handler de evento ou numa contribuição de poder.

### Balanceamento

Mudança de balanceamento vai em **commit separado** de mudança estrutural, com
justificativa. Para checar que um refactor não alterou o jogo, compare partidas
semeadas: mesma seed deve produzir o mesmo trace.

---

## Determinismo

A aleatoriedade vive no estado (`state.random`), não em `Math.random`. Isso é o
que permite reproduzir bug a partir da seed, simular balanceamento em massa e,
no futuro, replay e espectador. `Math.random` direto em `domain/` ou `match/`
é bug — use `rng` injetado e `shuffleWithRng` (Fisher-Yates; `sort(() => rng()
- 0.5)` é enviesado).

## Arte

- Mestra 1000×1000 WebP em `public/cartas/<chave>.webp`
- Derivadas 256/512 geradas por `npm run assets:resolucoes` (nunca ampliam)
- Caminho de arte **só** por `src/ui/arte.js` — usa `srcset` e
  `import.meta.env.BASE_URL` (o Pages serve de subdiretório; caminho absoluto
  quebra)
- `arteFoco: "center 0%"` para cartas com coroa/asas altas
- A moldura é `public/moldura.png`; posições em `%` no objeto `POS` de
  `src/Carta.jsx`; geometria do tabuleiro no objeto `BOARD` de
  `src/ui/game/DesktopGameComponents.jsx`

Detalhes de direção de arte: skill `guerras-arte-standards`.

## Multiplayer

- Servidor Node + `ws` em `server/index.js`, Render (free tier: ~1min de
  cold start na primeira conexão)
- `CONTENT_SIG` (hash da coleção) é trocado no handshake; versão divergente
  bloqueia a sala em vez de deixar dois jogadores com regras diferentes
- O servidor valida deck com `deckValido` — a validação do cliente é conforto,
  não confiança
- O relógio da revelação e da exibição de Praga é do servidor: cliente não
  conduz ritmo, senão um jogador corta a apresentação do outro

## Stack

Vite + React + Tailwind. Três dependências de produção (`react`, `react-dom`,
`ws`). Sem biblioteca de estado, UI ou utilidade — de propósito.
