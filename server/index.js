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
     { t:"welcome", id }
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

const PORT = process.env.PORT || 8080;
const STEP_MS = Number(process.env.STEP_MS) || 850;
const DECK_SIZE = 12;

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

/* ---------------------- FILTRAGEM POR JOGADOR --------------------------- */
function filterFor(state, seat) {
  const opp = 1 - seat;
  const s = JSON.parse(JSON.stringify(state));
  const oppHand = s.hand[opp].length;
  s.hand[opp] = [];
  s.oppHand = oppHand;
  s.board = s.board.filter((c) => c.owner === seat || c.revealed);
  s.deck = [Array(s.deck[0].length).fill(null), Array(s.deck[1].length).fill(null)];
  s.justDrew = seat === 0 ? [s.justDrew[0], []] : [[], s.justDrew[1]];
  s.log = (s.log || []).filter((l) => !/posicionou|recolheu/.test(l));
  return s;
}

function broadcastState(room) {
  const M = room.match;
  if (!M) return;
  for (const seat of [0, 1]) {
    const c = seatClient(room, seat);
    if (!c) continue;
    const oppConnected = !!seatClient(room, 1 - seat);
    send(c.ws, { t: "gameState", seat, state: filterFor(M.state, seat), ready: M.ready.slice(), oppConnected });
  }
}

// ---- ciclo da partida ---------------------------------------------------
function tryStartMatch(room) {
  const M = room.match;
  if (!M || M.state) return;
  if (!M.decks[0] || !M.decks[1]) return;
  M.state = freshMatch([M.decks[0], M.decks[1]]);
  M.ready = [false, false];
  broadcastState(room);
}

function startReveal(room) {
  const M = room.match;
  const r = applyAction(M.state, { t: "startReveal" });
  if (r.error) return;
  M.state = r.state;
  broadcastState(room);
  if (M.state.phase === "revealing") pumpReveal(room);
  else { M.ready = [false, false]; broadcastState(room); }
}

function pumpReveal(room) {
  const M = room.match;
  if (!M) return;
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
    M.ready = [false, false];
    broadcastState(room);
  }
}

function advanceRound(room) {
  const M = room.match;
  const r = applyAction(M.state, { t: "nextRound" });
  if (r.error) return;
  M.state = r.state;
  M.ready = [false, false];
  broadcastState(room);
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
      rooms: rooms.size, players: clients.size, uptime: Math.round(process.uptime()),
    }));
    return;
  }
  res.writeHead(404); res.end("not found");
});

// ---- WebSocket ----------------------------------------------------------
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const id = randomUUID();
  clients.set(id, { ws, name: "Jogador", roomId: null, seat: undefined });
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
  send(ws, { t: "welcome", id });
  send(ws, { t: "rooms", rooms: openRooms() });

  ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    const c = clients.get(id);
    if (!c) return;

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
        const deck = Array.isArray(m.deck) ? m.deck.slice(0, DECK_SIZE) : null;
        if (!deck || deck.length !== DECK_SIZE) { send(ws, { t: "error", msg: "Deck precisa de " + DECK_SIZE + " cartas." }); break; }
        room.match.decks[c.seat] = deck;
        tryStartMatch(room);
        break;
      }

      case "act": {
        const room = roomOf(c); const M = room ? room.match : null;
        if (!M || !M.state) break;
        if (M.state.phase !== "plan" || M.state.finished) { send(ws, { t: "error", msg: "Nao e fase de planejamento." }); break; }
        const a = m.action || {};
        if (!["place", "pickup", "move"].includes(a.t)) { send(ws, { t: "error", msg: "Acao invalida." }); break; }
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
  });

  ws.on("close", () => {
    leaveRoom(id);
    clients.delete(id);
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
wss.on("close", () => clearInterval(heartbeat));

server.listen(PORT, "0.0.0.0", () => {
  console.log("Guerras Egipcias — servidor (Fase 2) ouvindo na porta " + PORT);
});
