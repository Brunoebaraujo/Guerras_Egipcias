/* ==========================================================================
   Guerras Egípcias — Servidor multiplayer AUTORITATIVO (Fase 2).

   - HTTP: health check em GET / (o Render usa para saber que subiu).
   - WebSocket: lobby de salas (criar/listar/entrar) + PARTIDA real.

   REGRA DE OURO: o servidor NÃO reimplementa regra. Ele importa o mesmo
   match.js do cliente (fonte única de verdade, sobre o engine.js) e apenas
   arbitra: valida cada jogada com applyAction, conduz a revelação ritmada e
   emite a cada jogador um estado FILTRADO (sem a mão nem as jogadas ocultas
   do adversário). Assim não há como trapacear e as duas telas ficam em sincronia.

   Nunca chamamos resetUid() aqui: o contador de uid do engine é global e
   monotônico, então várias salas convivem sem colisão de ids.

   Protocolo — cliente -> servidor:
     { t:"hello", name }               define o nome, devolve salas
     { t:"createRoom" } / { t:"joinRoom", roomId } / { t:"leaveRoom" } / { t:"listRooms" }
     { t:"deckReady", deck:[12 keys] } informa o deck; quando ambos informam, a partida comeca
     { t:"act", action }               jogada de planejamento (place/pickup/move) do proprio assento
     { t:"ready" }                     "Pronto": trava a fase atual (revelar / proxima rodada)
     { t:"aim", targetUid } / { t:"skipAim" }   resolve a mira pendente (so o dono)
   Protocolo — servidor -> cliente:
     { t:"welcome", id, sig, cards }   assinatura da colecao: o cliente compara
                                       com a dele e avisa se as versoes diferem
     { t:"rooms", rooms }
     { t:"roomCreated", roomId }
     { t:"matchReady", roomId, seat, opponent }   sala cheia; envie deckReady
     { t:"gameState", seat, state, ready, oppConnected }  estado filtrado (a cada mudanca)
     { t:"opponentLeft" } / { t:"roomClosed" } / { t:"error", msg }
   ========================================================================== */

import http from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import { freshMatch, applyAction } from "../src/match.js";
import { CARD_KEYS, CONTENT_SIG } from "../src/engine.js";
import { deckValido } from "../src/deckLibrary.js";
import { filterStateForSeat } from "../src/net/filterState.js";
import { isPlanningActionType } from "../src/net/protocol.js";

const PORT = process.env.PORT || 8080;
const STEP_MS = Number(process.env.STEP_MS) || 850;
/* Pausa entre o fim da revelação e o começo da rodada seguinte. Mais longa que
   um passo de revelação de propósito: é o único momento em que os dois jogadores
   leem o tabuleiro resolvido antes de ele voltar a mudar. */
const ROUND_PAUSE_MS = Number(process.env.ROUND_PAUSE_MS) || 2200;
const MAX_PAYLOAD = 64 * 1024;
const MAX_CLIENTS = Number(process.env.MAX_CLIENTS) || 200;
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 100;
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS) || 2 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_MESSAGES = 60;
const DEFAULT_ORIGINS = ["https://brunoebaraujo.github.io", "http://localhost:5173", "http://127.0.0.1:5173"];
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(",")).split(",").map((x) => x.trim()).filter(Boolean));

/* --------------------------- BLINDAGEM DO PROCESSO ------------------------
   Este servidor atende TODAS as salas num processo só. Antes, qualquer exceção
   dentro de um handler derrubava o Node inteiro: uma carta desconhecida numa
   sala desconectava todo mundo e o Render levava ~1 min pra subir de novo.
   Agora nada escapa: cada handler roda dentro de `guard`, e o processo ainda
   tem uma última rede embaixo. Um bug estraga no máximo uma partida. */
process.on("uncaughtException", (e) => console.error("[uncaught]", e));
process.on("unhandledRejection", (e) => console.error("[unhandled]", e));

function guard(what, fn, onFail) {
  try { return fn(); }
  catch (e) {
    console.error(`[erro em ${what}]`, e && e.stack ? e.stack : e);
    try { onFail && onFail(e); } catch {}
    return undefined;
  }
}

// ---- estado em memoria --------------------------------------------------
const clients = new Map(); // id -> { ws, name, roomId, seat }
const rooms = new Map();   // roomId -> { id, host, guest, createdAt, match }

const openRooms = () =>
  [...rooms.values()]
    .filter((r) => r.guest === null)
    .map((r) => ({ id: r.id, host: clients.get(r.host)?.name || "?", createdAt: r.createdAt }));

const send = (ws, obj) => { if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); };
const broadcastRooms = () => {
  const payload = { t: "rooms", rooms: openRooms() };
  for (const c of clients.values()) if (!c.roomId) send(c.ws, payload);
};

const seatClient = (room, seat) => clients.get(seat === 0 ? room.host : room.guest);

function broadcastState(room) {
  const M = room.match;
  if (!M) return;
  for (const seat of [0, 1]) {
    const c = seatClient(room, seat);
    if (!c) continue;
    const oppConnected = !!seatClient(room, 1 - seat);
    send(c.ws, { t: "gameState", seat, state: filterStateForSeat(M.state, seat), ready: M.ready.slice(), oppConnected });
  }
}

/* Avisa os dois jogadores que a partida quebrou e encerra a sala com dignidade,
   em vez de deixar a tela congelada esperando um estado que nunca vem. */
function abortMatch(room, msg) {
  for (const seat of [0, 1]) {
    const c = seatClient(room, seat);
    if (c) send(c.ws, { t: "error", msg });
  }
  if (room.match) { clearTimeout(room.match.revealTimer); room.match.broken = true; }
}

// ---- ciclo da partida ---------------------------------------------------
function tryStartMatch(room) {
  const M = room.match;
  if (!M || M.state || M.broken) return;
  if (!M.decks[0] || !M.decks[1]) return;
  guard("tryStartMatch", () => {
    M.state = freshMatch([M.decks[0], M.decks[1]]);
    console.log(JSON.stringify({ event: "match_started", roomId: room.id, seed: M.state.random?.seed }));
    M.ready = [false, false];
    broadcastState(room);
  }, () => { M.state = null; abortMatch(room, "Não consegui iniciar a partida (erro no servidor). Saia da sala e tente de novo."); });
}

function startReveal(room) {
  const M = room.match;
  if (!M || !M.state || M.broken) return;
  guard("startReveal", () => {
    const r = applyAction(M.state, { t: "startReveal" });
    if (r.error) return;
    M.state = r.state;
    broadcastState(room);
    if (M.state.phase === "revealing") pumpReveal(room);
    else {
      /* Ninguém posicionou nada: a fila já nasce vazia e a fase pula direto para
         "revealed". Sem isto a partida ficava parada aqui, porque o botão que
         destravava esse estado deixou de existir. */
      M.ready = [false, false];
      broadcastState(room);
      clearTimeout(M.revealTimer);
      M.revealTimer = setTimeout(() => advanceRound(room), ROUND_PAUSE_MS);
    }
  }, () => abortMatch(room, "Erro ao revelar as cartas. Saia da sala e tente de novo."));
}

function pumpReveal(room) {
  const M = room.match;
  if (!M || !M.state || M.broken) return;
  guard("pumpReveal", () => {
    if (M.state.awaitingAim) { broadcastState(room); return; }
    if (M.state.phase !== "revealing") { M.ready = [false, false]; broadcastState(room); return; }
    const r = applyAction(M.state, { t: "step" });
    if (r.error) return;
    M.state = r.state;
    broadcastState(room);
    if (M.state.awaitingAim) return;
    if (M.state.phase === "revealing") {
      clearTimeout(M.revealTimer);
      M.revealTimer = setTimeout(() => pumpReveal(room), STEP_MS);
    } else {
      /* Fila vazia: a rodada emenda sozinha. Antes o servidor zerava `ready` e
         ficava esperando os DOIS jogadores clicarem "Pronto: próxima" — um
         clique que não decidia nada, e que ainda prendia quem já tinha visto
         tudo esperando o outro. A pausa é para o último efeito assentar na
         tela dos dois antes de a rodada virar; na rodada 6 o redutor desvia
         para `finish` e a partida encerra igual, sem clique. */
      M.ready = [false, false];
      broadcastState(room);
      clearTimeout(M.revealTimer);
      M.revealTimer = setTimeout(() => advanceRound(room), ROUND_PAUSE_MS);
    }
  }, () => abortMatch(room, "Erro no meio da revelação. Saia da sala e tente de novo."));
}

function advanceRound(room) {
  const M = room.match;
  if (!M || !M.state || M.broken) return;
  guard("advanceRound", () => {
    const r = applyAction(M.state, { t: "nextRound" });
    if (r.error) return;
    M.state = r.state;
    M.ready = [false, false];
    broadcastState(room);
  }, () => abortMatch(room, "Erro ao avançar a rodada. Saia da sala e tente de novo."));
}

// ---- lobby --------------------------------------------------------------
function leaveRoom(id) {
  const c = clients.get(id);
  if (!c || !c.roomId) return;
  const room = rooms.get(c.roomId);
  c.roomId = null; c.seat = undefined;
  if (!room) return;
  if (room.match) clearTimeout(room.match.revealTimer);
  if (room.host === id) {
    if (room.guest) {
      const g = clients.get(room.guest);
      if (g) { g.roomId = null; g.seat = undefined; send(g.ws, { t: "roomClosed" }); }
    }
    rooms.delete(room.id);
  } else if (room.guest === id) {
    room.guest = null; room.match = null;
    const h = clients.get(room.host);
    if (h) { h.seat = undefined; send(h.ws, { t: "opponentLeft" }); }
  }
  broadcastRooms();
}

const roomOf = (c) => (c && c.roomId ? rooms.get(c.roomId) : null);

// ---- HTTP (health check) ------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      ok: true, service: "Guerras Egipcias — servidor multiplayer (Fase 2)",
      // sig/cards: abra esta URL no navegador e compare com o que o app mostra
      // no lobby. Se diferirem, o servidor está rodando um commit mais velho.
      sig: CONTENT_SIG, cards: CARD_KEYS.length,
      rooms: rooms.size, players: clients.size, uptime: Math.round(process.uptime()),
    }));
    return;
  }
  res.writeHead(404); res.end("not found");
});

// ---- WebSocket ----------------------------------------------------------
const wss = new WebSocketServer({
  server,
  maxPayload: MAX_PAYLOAD,
  verifyClient: ({ origin }, done) => {
    // Clientes de integração/CLI não enviam Origin; navegadores sempre enviam.
    done(!origin || ALLOWED_ORIGINS.has(origin), origin ? 403 : 401, "Origin não permitida");
  },
});

wss.on("connection", (ws) => {
  if (clients.size >= MAX_CLIENTS) { ws.close(1013, "Servidor lotado"); return; }
  const id = randomUUID();
  clients.set(id, { ws, name: "Jogador", roomId: null, seat: undefined, rate: { since: Date.now(), count: 0 } });
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  send(ws, { t: "welcome", id, sig: CONTENT_SIG, cards: CARD_KEYS.length });
  send(ws, { t: "rooms", rooms: openRooms() });

  ws.on("message", (raw) => guard("message", () => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    const c = clients.get(id);
    if (!c) return;
    const now = Date.now();
    if (now - c.rate.since >= RATE_WINDOW_MS) c.rate = { since: now, count: 0 };
    c.rate.count += 1;
    if (c.rate.count > RATE_MAX_MESSAGES) { ws.close(1008, "Muitas mensagens"); return; }

    switch (m.t) {
      case "hello":
        if (typeof m.name === "string" && m.name.trim()) c.name = m.name.trim().slice(0, 24);
        send(ws, { t: "rooms", rooms: openRooms() });
        break;

      case "listRooms":
        send(ws, { t: "rooms", rooms: openRooms() });
        break;

      case "createRoom": {
        if (c.roomId) { send(ws, { t: "error", msg: "Voce ja esta numa sala." }); break; }
        if (rooms.size >= MAX_ROOMS) { send(ws, { t: "error", msg: "Limite de salas atingido. Tente novamente em instantes." }); break; }
        const roomId = randomUUID().slice(0, 6);
        rooms.set(roomId, { id: roomId, host: id, guest: null, createdAt: Date.now(), match: null });
        c.roomId = roomId; c.seat = 0;
        send(ws, { t: "roomCreated", roomId });
        broadcastRooms();
        break;
      }

      case "joinRoom": {
        if (c.roomId) { send(ws, { t: "error", msg: "Voce ja esta numa sala." }); break; }
        const room = rooms.get(m.roomId);
        if (!room) { send(ws, { t: "error", msg: "Sala nao existe mais." }); break; }
        if (room.guest) { send(ws, { t: "error", msg: "Sala ja esta cheia." }); break; }
        if (room.host === id) { send(ws, { t: "error", msg: "Voce e o anfitriao desta sala." }); break; }
        room.guest = id; c.roomId = room.id; c.seat = 1;
        room.match = { decks: [null, null], state: null, ready: [false, false], revealTimer: null };
        const host = clients.get(room.host);
        if (host) send(host.ws, { t: "matchReady", roomId: room.id, seat: 0, opponent: c.name });
        send(ws, { t: "matchReady", roomId: room.id, seat: 1, opponent: host ? host.name : "?" });
        broadcastRooms();
        break;
      }

      case "leaveRoom":
        leaveRoom(id);
        break;

      case "deckReady": {
        const room = roomOf(c);
        if (!room || !room.match || c.seat === undefined) { send(ws, { t: "error", msg: "Sem partida ativa." }); break; }
        const deck = Array.isArray(m.deck) ? m.deck.slice() : null;
        const validation = deckValido(deck);
        if (!validation.ok) { send(ws, { t: "error", msg: validation.error }); break; }
        room.match.decks[c.seat] = deck;
        tryStartMatch(room);
        break;
      }

      case "act": {
        const room = roomOf(c); const M = room ? room.match : null;
        if (!M || !M.state) break;
        if (M.state.phase !== "plan" || M.state.finished) { send(ws, { t: "error", msg: "Nao e fase de planejamento." }); break; }
        const a = m.action || {};
        // resetPlan ("Reiniciar rodada") existe no match.js e o cliente online
        // já mandava — faltava aqui, então online a tecla não fazia nada.
        if (!isPlanningActionType(a.t)) { send(ws, { t: "error", msg: "Ação inválida: " + a.t }); break; }
        const action = { ...a, side: c.seat };
        const r = applyAction(M.state, action);
        if (r.error) { send(ws, { t: "error", msg: r.error }); break; }
        M.state = r.state;
        M.ready[c.seat] = false;
        broadcastState(room);
        break;
      }

      case "ready": {
        const room = roomOf(c); const M = room ? room.match : null;
        if (!M || !M.state) break;
        if (M.state.awaitingAim) break;
        if (M.state.phase === "plan") {
          M.ready[c.seat] = true;
          broadcastState(room);
          if (M.ready[0] && M.ready[1]) startReveal(room);
        } else if (M.state.phase === "revealed") {
          M.ready[c.seat] = true;
          broadcastState(room);
          if (M.ready[0] && M.ready[1]) advanceRound(room);
        }
        break;
      }

      case "aim":
      case "skipAim": {
        const room = roomOf(c); const M = room ? room.match : null;
        if (!M || !M.state || !M.state.awaitingAim) break;
        if (M.state.awaitingAim.side !== c.seat) { send(ws, { t: "error", msg: "A mira e do adversario." }); break; }
        const act = m.t === "aim" ? { t: "aim", targetUid: m.targetUid } : { t: "skipAim" };
        const r = applyAction(M.state, act);
        if (r.error) { send(ws, { t: "error", msg: r.error }); break; }
        M.state = r.state;
        broadcastState(room);
        pumpReveal(room);
        break;
      }

      default:
        break;
    }
  }, () => send(ws, { t: "error", msg: "Erro interno do servidor ao processar sua jogada." })));

  ws.on("close", () => guard("close", () => {
    leaveRoom(id);
    clients.delete(id);
  }));
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
wss.on("close", () => clearInterval(heartbeat));

const roomCleanup = setInterval(() => {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const room of rooms.values()) {
    if (room.createdAt < cutoff) {
      for (const id of [room.host, room.guest]) if (id) leaveRoom(id);
    }
  }
}, Math.min(ROOM_TTL_MS, 60_000));
wss.on("close", () => clearInterval(roomCleanup));

server.listen(PORT, "0.0.0.0", () => {
  console.log("Guerras Egipcias — servidor (Fase 2) ouvindo na porta " + PORT);
});
