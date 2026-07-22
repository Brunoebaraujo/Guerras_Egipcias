# Notas de design — Multiplayer (referência para o futuro)

> Documento de referência extraído de um protótipo inicial de servidor
> (`server/index.js`, jul/2026), escrito **antes** do `engine.js` amadurecer.
> O código daquele protótipo foi descartado; o que sobreviveu — e vale — são
> as decisões de arquitetura abaixo. Quando o modo online for construído de
> verdade, comece daqui.

---

## Stack do protótipo

- **Node + Socket.io** para a camada de rede (WebSocket com fallback).
- Servidor HTTP com endpoint `/health` para checagem de status.
- Porta `3001` (frontend Vite roda em `5173`); CORS liberado só para a origem do cliente.

## Regra de ouro que o protótipo VIOLOU (não repetir)

O protótipo mantinha um `CARD_DEFS` próprio, com os stats das cartas digitados à
mão dentro do servidor. Isso criou uma **segunda fonte de verdade** que já tinha
divergido do jogo real (faltavam cartas novas, stats defasados).

**No multiplayer de verdade:** as definições de carta e TODA a resolução de
regras (reveal, prioridade 1→3, efeitos, ramp de energia, vitória) devem vir do
`engine.js`. O servidor é apenas o *árbitro autoritativo* que chama o engine — ele
nunca reimplementa nem duplica regra. O protótipo só posicionava cartas e validava
energia/via; o reveal e os efeitos ficavam de fora. Isso é o que precisa ser
reescrito em cima do engine.

## Decisão-chave: servidor autoritativo com estado filtrado por jogador

O acerto mais importante do protótipo. Existiam duas visões do estado:

- **Estado público da sala** (`publicRoomState`): código da sala, status, quem é
  o host, e por jogador apenas `side`, `ready`, `connected` e a *contagem* do deck.
- **Estado privado por jogador** (`privateGameState`): a mão completa só do próprio
  jogador; do oponente vão apenas contagens (`opponentHandCount`, `opponentDeckCount`).

Regra: **o cliente nunca recebe a mão do oponente.** O servidor é a única fonte
autoritativa; o cliente só desenha o que o servidor mandou. Isso previne trapaça e
é a base de qualquer jogo de cartas com informação oculta.

## Protocolo de eventos (contrato cliente ↔ servidor)

Vocabulário de eventos já pensado — bom ponto de partida:

| Evento (cliente → servidor) | Payload | Resposta / efeito |
|---|---|---|
| `room:create` | — | `{ code, side }`; cria sala, host vira `side 0` |
| `room:join` | `{ code }` | `{ code, side }`; entra como `side 1`, status → `deck_select` |
| `deck:update` | `{ code, deck }` | guarda deck parcial (marca `ready = false`) |
| `deck:ready` | `{ code, deck }` | valida tamanho do deck e marca pronto |
| `game:get_state` | `{ code }` | devolve `privateGameState` do jogador |
| `game:play_card` | `{ code, cardId, lane }` | posiciona carta (delegar ao engine) |

| Evento (servidor → cliente) | Conteúdo |
|---|---|
| `room:state` | estado público da sala (broadcast) |
| `game:state` | estado privado, emitido individualmente por socket |

Fluxo de sala: `waiting` → (2º jogador entra) `deck_select` → (ambos `ready`)
`in_game`. Quando os dois estão prontos, o servidor cria o jogo e emite
`game:state` individual para cada um.

Salas guardadas em memória (`Map` por código de 6 caracteres), máx. 2 jogadores.
No `disconnect`, o jogador é marcado `connected: false` (não removido) — deixa
espaço para reconexão futura.

## Números de formato herdados do protótipo

- **Deck:** 12 cartas.
- **Mão inicial:** 4 cartas (compradas no início da partida).
- **Energia inicial:** 1 (o ramp 1→6 ao longo de 6 rodadas deve vir do engine).

*(Revisar esses números contra o balanceamento atual antes de fixar.)*

## O que herdar vs. reescrever

**Herdar:** o padrão autoritativo + estado filtrado por jogador; o vocabulário de
eventos; o fluxo de lobby (create → join → deck → ready → in_game); reconexão via
flag `connected`.

**Reescrever do zero, agora em cima do `engine.js`:** posicionamento e resolução
de jogada, reveal simultâneo com prioridade 1→3, aplicação de efeitos, ramp de
energia por rodada, e condição de vitória (2 de 3 vias). O engine já faz tudo isso
e é testado — o servidor deve chamá-lo, não recriá-lo.
