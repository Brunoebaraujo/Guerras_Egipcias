/* ==========================================================================
   Guerras Egípcias — Servidor multiplayer (Fase 1: lobby).
   - HTTP: health check em GET / (o Render usa isso para saber que subiu).
   - WebSocket no mesmo porto: lobby de salas (criar / listar / entrar).
   Sem banco: as salas vivem em memória (suficiente para playtests).
   A partida em si (revelação autoritária) entra na Fase 2.

   Protocolo (mensagens JSON):
     cliente -> servidor:
       { t:"hello", name }        define o nome e devolve a lista de salas
       { t:"createRoom" }         cria uma sala e vira anfitrião
       { t:"joinRoom", roomId }   entra numa sala aberta
       { t:"leaveRoom" }          sai da sala atual
       { t:"listRooms" }          pede a lista de salas abertas
     servidor -> cliente:
       { t:"welcome", id }
       { t:"rooms", rooms:[{id,host,createdAt}] }   apenas salas abertas
       { t:"matchReady", roomId, seat, opponent }   quando a sala enche (2 jogadores)
       { t:"opponentLeft" }       o adversário saiu (sala reabre)
       { t:"roomClosed" }         o anfitrião fechou a sala
       { t:"error", msg }
   ========================================================================== */

import http from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";

const PORT = process.env.PORT || 8080;

// ---- estado em memória --------------------------------------------------
const clients = new Map(); // id -> { ws, name, roomId }
const rooms = new Map();   // roomId -> { id, host, guest, createdAt }

const openRooms = () =>
  [...rooms.values()]
    .filter((r) => r.guest === null)
    .map((r) => ({ id: r.id, host: clients.get(r.host)?.name || "?", createdAt: r.createdAt }));

const send = (ws, obj) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj)); };
const broadcastRooms = () => {
  const payload = { t: "rooms", rooms: openRooms() };
  for (const c of clients.values()) send(c.ws, payload);
};

function leaveRoom(id) {
  const c = clients.get(id);
  if (!c || !c.roomId) return;
  const room = rooms.get(c.roomId);
  c.roomId = null;
  if (!room) return;
  if (room.host === id) {
    // anfitrião saiu: fecha a sala e avisa o convidado
    if (room.guest) {
      const g = clients.get(room.guest);
      if (g) { g.roomId = null; send(g.ws, { t: "roomClosed" }); }
    }
    rooms.delete(room.id);
  } else if (room.guest === id) {
    // convidado saiu: sala reabre e o anfitrião é avisado
    room.guest = null;
    const h = clients.get(room.host);
    if (h) send(h.ws, { t: "opponentLeft" });
  }
  broadcastRooms();
}

// ---- HTTP (health check) ------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      ok: true,
      service: "Guerras Egípcias — servidor multiplayer",
      rooms: rooms.size,
      players: clients.size,
      uptime: Math.round(process.uptime()),
    }));
    return;
  }
  res.writeHead(404); res.end("not found");
});

// ---- WebSocket ----------------------------------------------------------
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const id = randomUUID();
  clients.set(id, { ws, name: "Jogador", roomId: null });
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
        if (c.roomId) { send(ws, { t: "error", msg: "Você já está numa sala." }); break; }
        const roomId = randomUUID().slice(0, 6);
        rooms.set(roomId, { id: roomId, host: id, guest: null, createdAt: Date.now() });
        c.roomId = roomId;
        send(ws, { t: "roomCreated", roomId });
        broadcastRooms();
        break;
      }

      case "joinRoom": {
        if (c.roomId) { send(ws, { t: "error", msg: "Você já está numa sala." }); break; }
        const room = rooms.get(m.roomId);
        if (!room) { send(ws, { t: "error", msg: "Sala não existe mais." }); break; }
        if (room.guest) { send(ws, { t: "error", msg: "Sala já está cheia." }); break; }
        if (room.host === id) { send(ws, { t: "error", msg: "Você é o anfitrião desta sala." }); break; }
        room.guest = id;
        c.roomId = room.id;
        const host = clients.get(room.host);
        // sala cheia: avisa os dois (seat 0 = anfitrião, seat 1 = convidado)
        if (host) send(host.ws, { t: "matchReady", roomId: room.id, seat: 0, opponent: c.name });
        send(ws, { t: "matchReady", roomId: room.id, seat: 1, opponent: host?.name || "?" });
        broadcastRooms();
        break;
      }

      case "leaveRoom":
        leaveRoom(id);
        break;

      default:
        break;
    }
  });

  ws.on("close", () => {
    leaveRoom(id);
    clients.delete(id);
  });
});

// keep-alive: derruba conexões mortas e evita que proxies fechem as ociosas
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
wss.on("close", () => clearInterval(heartbeat));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Guerras Egípcias — servidor ouvindo na porta ${PORT}`);
});
