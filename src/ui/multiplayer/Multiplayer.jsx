import React, { useEffect, useRef, useState } from "react";
import { CARD_KEYS, CONTENT_SIG, SIDE_NAME, byKey, cartaTemEfeito, ctxOf, custoDe, decomporPartes, laneWins, power } from "../../engine.js";
import { isAimable as podeMirar } from "../../match.js";
import { normalizeWs } from "../../net/wsUrl.js";
import { PROTOCOL_VERSION, createSequenceGuard, isCompatibleProtocol } from "../../net/protocol.js";
import { GameMobile } from "../game/MobileGame.jsx";
import { BannerVitoria } from "../game/BannerVitoria.jsx";
import { BOARD, Chip, Hand, Tabuleiro, ZoomModal } from "../game/DesktopGameComponents.jsx";
import { resultLabel } from "../matchPresentation.js";

/* Servidor multiplayer (Render). Pode ser sobrescrito no campo do lobby. */
const LOBBY_SERVER_DEFAULT = "wss://guerras-egipcias-server.onrender.com";
function OnlineGame({ send, data, note, onLeave }) {
  const { seat, state: g, ready: readyArr = [false, false], oppConnected } = data;
  const [sel, setSel] = useState(null);
  const [moving, setMoving] = useState(null);
  const [zoom, setZoom] = useState(null);
  /* O banner cobre o tabuleiro, então precisa sair do caminho: um toque o
     dispensa. Volta a valer sozinho quando uma partida nova começa. */
  const [bannerVisto, setBannerVisto] = useState(false);
  useEffect(() => { if (!g.finished) setBannerVisto(false); }, [g.finished]);

  /* SHOWCASE DE PRAGA — antes não existia aqui. A pausa vivia em `useState` do
     App, que o modo online não usa, então a Praga passava a 850ms sem destaque:
     uma mecânica inteira invisível no multiplayer.

     Agora a pausa está no estado e vem do servidor, que a cronometra. Este
     componente só REFLETE: abre o zoom enquanto `awaitingPlagueShowcase` durar
     e o fecha quando o servidor der o ack. Não há ack a partir daqui de
     propósito — um jogador fechando o zoom cortaria o showcase do outro, e um
     cliente travado congelaria a partida. Fechar é local, e o relógio é de lá. */
  const showcase = g.awaitingPlagueShowcase;
  useEffect(() => {
    if (!showcase) { setZoom((z) => (z?.isPlagueShowcase ? null : z)); return; }
    const def = byKey[showcase.key];
    if (!def) return;
    setZoom({
      def, custo: def.custo, printed: def.poder, baked: 0,
      current: null, partes: null, sub: "Praga revelada",
      onReturn: null, isPlagueShowcase: true,
    });
  }, [showcase?.seq, showcase]);

  const myReady = !!readyArr[seat];
  const oppReady = !!readyArr[1 - seat];
  const planning = g.phase === "plan" && !g.finished;
  const rawAim = g.awaitingAim;
  const myAim = rawAim && rawAim.side === seat ? rawAim : null; // só resolvo a MINHA mira
  const aim = myAim; // alias para compatibilidade com rendering desktop
  const ctx = ctxOf(g);
  const wins = laneWins(g);

  useEffect(() => { if (!planning) { setSel(null); setMoving(null); } }, [planning]);

  const sendAct = (action) => send({ t: "act", action });
  const placeCard = (side, lane) => {
    if (!planning || myAim || moving || side !== seat || !sel || sel.side !== seat) return;
    sendAct({ t: "place", hid: sel.hid, lane }); setSel(null);
  };
  const pickUp = (uid) => {
    if (!planning || myAim || moving) return;
    const c = g.board.find((x) => x.uid === uid);
    if (!c || c.revealed || c.owner !== seat) return;
    sendAct({ t: "pickup", uid }); setSel(null);
  };
  const resetPlan = (side) => {
    if (!planning || myAim || moving || side !== seat) return;
    sendAct({ t: "resetPlan" }); setSel(null);
  };
  const isMovable = (c) =>
    planning && !myAim && !c.dying && c.revealed && c.owner === seat &&
    byKey[c.key] && cartaTemEfeito(c, "moveOnceNextRound") && !c.moved && c.enteredRound < g.round;
  const startMove = (c) => {
    if (!isMovable(c)) return;
    setSel(null);
    setMoving(moving && moving.uid === c.uid ? null : { uid: c.uid, side: c.owner, lane: c.lane });
  };
  const moveTo = (side, lane) => {
    if (!moving || side !== seat || moving.side !== seat) return;
    if (lane === moving.lane) { setMoving(null); return; }
    sendAct({ t: "move", uid: moving.uid, lane }); setMoving(null);
  };
  const startReveal = () => { if (!planning || myReady) return; setSel(null); setMoving(null); send({ t: "ready" }); };
  const applyAim = (target) => { if (!myAim) return; send({ t: "aim", targetUid: target.uid }); };
  const skipAim = () => { if (!myAim) return; send({ t: "skipAim" }); };
  const isAimable = (c) => !!myAim && podeMirar(g, c);
  function zoomBoard(c) {
    const def = byKey[c.key]; if (!def) return;
    const cur = c.revealed ? power(c, ctx) : null;
    setZoom({
      def, custo: custoDe(c), printed: c.printed, baked: c.baked || 0, current: cur,
      partes: c.revealed ? decomporPartes(c, ctx) : null,
      sub: `Via ${c.lane + 1} · ${SIDE_NAME[c.owner]}` + (c.revealed ? "" : " · por revelar"),
    });
  }
  function zoomHand(h) {
    const def = byKey[h.key]; if (!def) return;
    setZoom({ def, custo: custoDe(h), printed: h.printed, baked: h.baked || 0, current: null, sub: (h.baked || 0) !== 0 ? `Faixa da Múmia — volta valendo ${h.printed + h.baked}` : "na mão" });
  }

  // Handler para fechar zoom
  const handleZoomClose = () => setZoom(null);
  const toggleActivateHu = (cardUid, side) => {
    if (side !== seat || !planning) return;
    sendAct({ t: "toggleActivate", uid: cardUid });
    setZoom(null);
  };

  const oppAiming = rawAim && rawAim.side !== seat;
  const msg = !oppConnected ? "⚠ Adversário desconectado." : oppAiming ? "🎯 O adversário está escolhendo um alvo…" : (note || "");

  // Detectar se deve usar desktop ou mobile
  const vw = typeof window !== "undefined" ? window.innerWidth : 640; // SSR: assume mobile por padrão
  const isMobile = vw < 820;

  if (isMobile) {
    return (
      <>
        <GameMobile
          online seat={seat} myReady={myReady} oppReady={oppReady} oppHand={g.oppHand || 0} oppConnected={oppConnected}
          g={g} ctx={ctx} wins={wins} planning={planning}
          sel={sel} setSel={setSel} aim={myAim} moving={moving} msg={msg} fast={false}
          startReveal={startReveal} setFast={() => {}} reset={onLeave}
          setScreen={onLeave} setForceView={() => {}}
          placeCard={placeCard} pickUp={pickUp} resetPlan={resetPlan} startMove={startMove} moveTo={moveTo}
          applyAim={applyAim} skipAim={skipAim} isAimable={isAimable} isMovable={isMovable}
          zoomBoard={zoomBoard} zoomHand={zoomHand} />
        {zoom && <ZoomModal zoom={zoom} onClose={handleZoomClose} onToggleActivate={toggleActivateHu} />}
        {!bannerVisto && <BannerVitoria g={g} online={true} mySeat={seat} onFechar={() => setBannerVisto(true)} />}
      </>
    );
  }

  // Desktop multiplayer: layout de 3 colunas como single player
  // Rotaciona as mãos: jogador sempre embaixo, adversário em cima
  const mySide = seat;
  const oppSide = 1 - seat;
  const topSide = oppSide;    // adversário no topo
  const bottomSide = mySide;  // jogador na base

  return (
    <div className="w-full bg-stone-900 text-stone-100 font-sans" style={{ height: "100dvh", overflow: "hidden" }}>
      <div className="flex gap-3 p-3 sm:p-4" style={{ height: "100dvh", boxSizing: "border-box" }}>

        {/* ============ COLUNA ESQUERDA: painel de controle ============ */}
        <aside className="flex flex-col gap-3" style={{ width: 380, flex: "0 0 380px", height: "100%", minHeight: 0 }}>
          <div className="rounded-lg border border-stone-700 p-3" style={{ backgroundColor: "#1c1a17", flex: "0 0 auto" }}>
            <div className="mb-2">
              <h1 className="text-xl font-bold tracking-widest text-amber-200">
                𓂀 Guerras Egípcias <span className="text-stone-500 text-sm font-normal tracking-normal">· multiplayer</span>
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">Você é {SIDE_NAME[seat]} · adversário: {!oppConnected ? "desconectado ⚠" : "conectado ✓"}</p>
            </div>

            <div className="flex items-center gap-2 mb-2 text-sm flex-wrap">
              <span className={`px-2 py-1 rounded font-semibold ${planning ? "bg-stone-800 text-stone-200" : g.phase === "revealing" ? "bg-indigo-900 text-indigo-100" : "bg-emerald-900 text-emerald-100"}`}>
                {planning ? "Planejar" : g.phase === "revealing" ? "Revelando…" : "Revelado"}
              </span>
              <span className="text-stone-400">Prioridade:</span>
              <span className={`font-bold ${g.priority === 0 ? "text-amber-300" : "text-sky-300"}`}>{SIDE_NAME[g.priority]}</span>
            </div>
            {g.trevas === g.round && (
              <div className="mb-2 px-2 py-1 rounded bg-indigo-950 border border-indigo-700 text-indigo-200 text-xs">
                ⊘ Trevas — cartas ocultas
              </div>
            )}

            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Chip label="Rodada" value={`${g.round}/6`} />
              <Chip label="Energia A" value={g.energy[0]} tone="amber" />
              <Chip label="Energia B" value={g.energy[1]} tone="sky" />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {planning && <button onClick={startReveal} disabled={myReady} className={`px-3 py-2 rounded-md text-stone-900 font-semibold text-sm ${myReady ? "bg-stone-700 text-stone-400" : "bg-emerald-600 hover:bg-emerald-500"}`}>{myReady ? "Aguardando…" : "Pronto ✓"}</button>}
              {g.phase === "revealing" && <span className="px-3 py-2 rounded-md bg-indigo-950 text-indigo-100 font-semibold text-sm">Revelando…</span>}
              {g.phase === "revealed" && !g.finished && <span className="px-3 py-2 rounded-md bg-stone-800 text-amber-200 font-semibold text-sm">{g.round >= 6 ? "Encerrando…" : "Seguindo…"}</span>}
              <button onClick={onLeave} className="px-3 py-2 rounded-md bg-stone-700 hover:bg-stone-600 text-sm">Sair</button>
            </div>

            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-stone-400">Vias:</span>
              <span className="text-amber-300 font-bold">A {wins[0]}</span>
              <span className="text-stone-600">×</span>
              <span className="text-sky-300 font-bold">{wins[1]} B</span>
              {g.finished && <span className="px-2 py-0.5 rounded bg-stone-800 border border-amber-600 text-amber-200 font-semibold text-xs">{resultLabel(g)}</span>}
            </div>

            {moving && <div className="mt-2 px-2 py-1.5 rounded bg-sky-950 border border-sky-700 text-sky-100 text-xs">⇄ Movendo — clique numa via do {SIDE_NAME[moving.side]}.</div>}
            {aim && (
              <div className="mt-2 px-2 py-1.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-100 text-xs flex items-center gap-2">
                <span>🎯 <b>{aim.srcNome}</b>: escolha {aim.needs === "ally" ? "um aliado" : "um inimigo"} na Via {aim.lane + 1}.</span>
                <button onClick={skipAim} className="ml-auto px-2 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-xs whitespace-nowrap">Pular</button>
              </div>
            )}
            {msg && <div className="mt-2 px-2 py-1.5 rounded bg-rose-950 border border-rose-800 text-rose-200 text-xs">{msg}</div>}
          </div>
        </aside>

        {/* ============ COLUNA DO MEIO: mãos rotacionadas ============
            Multiplayer: adversário em cima (topSide), jogador em baixo (bottomSide)
            Em single player seria lado 0 em cima, lado 1 em baixo. */}
        <div className="flex flex-col gap-2" style={{ width: 232, flex: "0 0 232px", height: "100%", minHeight: 0 }}>
          <div className="flex flex-col" style={{ flex: "1 1 50%", minHeight: 0 }}>
            {/* Adversário (topo) — mão filtrada pelo servidor (vazia) */}
            <Hand side={topSide} tone={topSide === 0 ? "amber" : "sky"} g={g} sel={sel} setSel={setSel} disabled={true} onZoom={zoomHand} />
          </div>
          <div className="flex flex-col" style={{ flex: "1 1 50%", minHeight: 0 }}>
            {/* Jogador (base) — suas cartas, só você pode jogar */}
            <Hand side={bottomSide} tone={bottomSide === 0 ? "amber" : "sky"} g={g} sel={sel} setSel={setSel} disabled={!planning || aim || moving} onZoom={zoomHand} />
          </div>
        </div>

        {/* ============ COLUNA DIREITA: tabuleiro ============ */}
        <main className="flex" style={{ flex: "1 1 auto", height: "100%", minHeight: 0, minWidth: 0, alignItems: "center", justifyContent: "center" }}>
          <div className="rounded-xl" style={{ width: "100%", height: "100%", minHeight: 0, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <div style={{ height: "100%", aspectRatio: BOARD.ratio, maxWidth: "100%" }}>
              {/* Tabuleiro com rotação: jogador sempre vê suas vias embaixo */}
              <Tabuleiro g={g} ctx={ctx} aim={aim} moving={moving} sel={sel} planning={planning}
                placeCard={placeCard} moveTo={moveTo} applyAim={applyAim} isAimable={isAimable}
                startMove={startMove} isMovable={isMovable} pickUp={pickUp} zoomBoard={zoomBoard}
                viewSeat={seat} />
            </div>
          </div>
        </main>
      </div>

      {zoom && <ZoomModal zoom={zoom} onClose={handleZoomClose} onToggleActivate={toggleActivateHu} />}
      {!bannerVisto && <BannerVitoria g={g} online={true} mySeat={seat} onFechar={() => setBannerVisto(true)} />}
    </div>
  );
}

export { OnlineGame };

function Lobby({ onBack, deck }) {
  const readLS = (k, d) => { try { return (typeof window !== "undefined" && localStorage.getItem(k)) || d; } catch { return d; } };
  const [serverUrl, setServerUrl] = useState(() => readLS("ge_server", LOBBY_SERVER_DEFAULT));
  const [name, setName] = useState(() => readLS("ge_name", ""));
  const [status, setStatus] = useState("desconectado"); // desconectado|conectando|conectado|erro
  const [rooms, setRooms] = useState([]);
  const [myRoom, setMyRoom] = useState(null);
  const [match, setMatch] = useState(null); // { roomId, seat, opponent }
  const [game, setGame] = useState(null);    // { seat, state, ready, oppConnected } — partida ao vivo
  const [note, setNote] = useState("");
  const [servidor, setServidor] = useState(null);   // { sig, cards } do aperto de mão
  const [travou, setTravou] = useState(false);      // o deck foi enviado e nada voltou
  const wsRef = useRef(null);
  const deckRef = useRef(deck);
  const timerRef = useRef(null);
  const reconnectRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const manualCloseRef = useRef(false);
  const sequenceGuardRef = useRef(createSequenceGuard());
  const resumeTokenRef = useRef(readLS("ge_resume_token", ""));
  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => () => { clearTimeout(timerRef.current); clearTimeout(reconnectRef.current); }, []);
  const connected = status === "conectado";
  /* Servidor e site rodam o mesmo engine.js, mas têm deploys separados: o site
     é o GitHub Pages, o servidor é o Render. Se um ficar para trás, a partida
     não tem como funcionar — então descubro isso no aperto de mão, não no meio
     do jogo. `null` = servidor antigo, que nem manda assinatura. */
  const desatualizado = servidor && servidor.sig !== CONTENT_SIG;
  const semAssinatura = !!servidor && !servidor.sig;

  function connect({ reconnecting = false } = {}) {
    const nm = name.trim() || "Jogador";
    try { localStorage.setItem("ge_server", serverUrl); localStorage.setItem("ge_name", nm); } catch {}
    manualCloseRef.current = false;
    if (!reconnecting) {
      setNote(""); setRooms([]); setMyRoom(null); setMatch(null); setGame(null);
      setServidor(null); setTravou(false); clearTimeout(timerRef.current);
      reconnectAttemptRef.current = 0;
    }
    setStatus(reconnecting ? "reconectando" : "conectando");
    let ws;
    try { ws = new WebSocket(normalizeWs(serverUrl)); } catch { setStatus("erro"); setNote("URL inválida."); return; }
    wsRef.current = ws;
    sequenceGuardRef.current = createSequenceGuard();
    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setStatus("conectado"); setNote("");
      ws.send(JSON.stringify({ t: "hello", name: nm, protocolVersion: PROTOCOL_VERSION, resumeToken: resumeTokenRef.current || undefined }));
    };
    ws.onclose = () => {
      if (manualCloseRef.current) { setStatus("desconectado"); return; }
      const attempt = ++reconnectAttemptRef.current;
      const delay = Math.min(10_000, 750 * (2 ** Math.min(attempt - 1, 4)));
      setStatus("reconectando"); setNote(`Conexão interrompida. Reconectando em ${Math.ceil(delay / 1000)}s…`);
      clearTimeout(reconnectRef.current);
      reconnectRef.current = setTimeout(() => connect({ reconnecting: true }), delay);
    };
    ws.onerror = () => { setNote("Conexão indisponível; a recuperação automática continuará tentando."); };
    ws.onmessage = (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      if (!isCompatibleProtocol(m.protocolVersion)) {
        manualCloseRef.current = true; setStatus("erro");
        setNote(`Versão de protocolo incompatível (cliente ${PROTOCOL_VERSION}, servidor ${m.protocolVersion || "?"}).`);
        ws.close(); return;
      }
      if (!sequenceGuardRef.current(m.seq)) return;
      if (m.t === "welcome") setServidor({ sig: m.sig || null, cards: m.cards || 0, version: m.version || "?", protocolVersion: m.protocolVersion });
      else if (m.t === "session") {
        resumeTokenRef.current = m.resumeToken || "";
        try { localStorage.setItem("ge_resume_token", resumeTokenRef.current); } catch {}
        if (m.resumed) setNote("Sessão recuperada.");
      }
      else if (m.t === "rooms") setRooms(m.rooms || []);
      else if (m.t === "roomCreated") { setMyRoom(m.roomId); setNote(""); }
      else if (m.t === "matchReady") {
        setMatch({ roomId: m.roomId, seat: m.seat, opponent: m.opponent }); setMyRoom(null); setNote(""); setTravou(false);
        try { ws.send(JSON.stringify({ t: "deckReady", deck: deckRef.current })); } catch {}
        /* Se o servidor não devolver o estado inicial, a tela não pode ficar
           dizendo "preparando…" para sempre — era exatamente assim que a falha
           aparecia. Passados 12 s sem gameState, eu digo o que houve. */
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setTravou(true), 12000);
      }
      else if (m.t === "gameState") {
        clearTimeout(timerRef.current); setTravou(false);
        setGame({ seat: m.seat, state: m.state, ready: m.ready, oppConnected: m.oppConnected });
      }
      else if (m.t === "opponentLeft") { clearTimeout(timerRef.current); setMatch(null); setGame(null); setNote("O adversário saiu. Sua sala está aberta de novo."); }
      else if (m.t === "roomClosed") { clearTimeout(timerRef.current); setMatch(null); setMyRoom(null); setGame(null); setNote("O anfitrião fechou a sala."); }
      else if (m.t === "error") { clearTimeout(timerRef.current); setTravou(false); setNote(m.msg || "Erro."); }
    };
  }
  const send = (obj) => {
    const mid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    try { wsRef.current?.send(JSON.stringify({ ...obj, mid, protocolVersion: PROTOCOL_VERSION })); } catch {}
  };
  const disconnect = () => {
    manualCloseRef.current = true; clearTimeout(reconnectRef.current);
    try { wsRef.current?.close(); } catch {}
    setRooms([]); setMyRoom(null); setMatch(null); setGame(null); setStatus("desconectado");
  };
  useEffect(() => () => { manualCloseRef.current = true; clearTimeout(reconnectRef.current); try { wsRef.current?.close(); } catch {} }, []);

  // Partida ao vivo: substitui todo o lobby pela mesa online.
  if (game) {
    return <OnlineGame send={send} data={game} note={note}
      onLeave={() => { send({ t: "leaveRoom" }); setGame(null); setMatch(null); }} />;
  }

  const visibleRooms = rooms.filter((r) => r.id !== myRoom);
  const box = { width: "100%", maxWidth: 460, margin: "0 auto" };
  const field = { width: "100%", padding: "10px 12px", borderRadius: 9, background: "#1c1917", border: "1px solid #44403c", color: "#e7e5e4", fontSize: 14, boxSizing: "border-box" };
  const btn = (bg, fg) => ({ padding: "11px 14px", borderRadius: 9, border: "none", background: bg, color: fg, fontWeight: 700, fontSize: 14, cursor: "pointer" });
  const statusColor = { desconectado: "#78716c", conectando: "#fbbf24", reconectando: "#fbbf24", conectado: "#34d399", erro: "#fb7185" }[status];

  return (
    /* O index.html usa viewport-fit=cover, então no iPhone a página começa
       DEBAIXO da barra de status (relógio, bateria). Sem o env(safe-area) o
       título e o botão Voltar ficavam escondidos atrás dela. */
    <div style={{ minHeight: "100dvh", background: "#0c0a09", color: "#e7e5e4", fontFamily: "ui-sans-serif, system-ui, sans-serif",
      padding: "14px", paddingTop: "calc(14px + env(safe-area-inset-top))", paddingBottom: "calc(14px + env(safe-area-inset-bottom))" }}>
      <div style={{ ...box, display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontWeight: 800, letterSpacing: 0.5, color: "#fde68a", fontSize: 18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>𓂀 Guerras Egípcias</span>
        <span style={{ fontSize: 11, color: "#818cf8", flex: "0 0 auto" }}>Multiplayer · beta</span>
        <button onClick={onBack} style={{ ...btn("#292524", "#d6d3d1"), marginLeft: "auto", padding: "7px 12px" }}>Voltar</button>
      </div>

      <div style={{ ...box, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: statusColor, display: "inline-block" }} />
          <span style={{ color: "#a8a29e" }}>{status}</span>
          {connected && <span style={{ color: "#78716c" }}>· como <b style={{ color: "#e7e5e4" }}>{name.trim() || "Jogador"}</b></span>}
          {connected && <button onClick={disconnect} style={{ ...btn("#292524", "#d6d3d1"), marginLeft: "auto", padding: "6px 10px", fontSize: 12 }}>Desconectar</button>}
        </div>

        {!connected && (
          <>
            <label style={{ fontSize: 12, color: "#a8a29e" }}>Seu nome
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bruno" maxLength={24} style={{ ...field, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, color: "#a8a29e" }}>Servidor
              <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="wss://...onrender.com" style={{ ...field, marginTop: 4, fontSize: 12 }} />
            </label>
            <button onClick={connect} disabled={status === "conectando"} style={btn(status === "conectando" ? "#292524" : "#4f46e5", "#eef2ff")}>
              {status === "conectando" ? "Conectando…" : "Conectar"}
            </button>
            <p style={{ fontSize: 11, color: "#78716c", margin: 0 }}>Se o servidor estiver dormindo (plano Free), a primeira conexão pode levar ~1 min. Se der erro, tente de novo.</p>
          </>
        )}

        {connected && (desatualizado || semAssinatura) && (
          <div style={{ padding: 12, borderRadius: 10, background: "#450a0a", border: "1px solid #b91c1c", color: "#fecaca", fontSize: 12, lineHeight: 1.5 }}>
            <b style={{ fontSize: 13 }}>⚠ Servidor desatualizado</b><br />
            {semAssinatura
              ? "O servidor está rodando uma versão anterior à da coleção atual."
              : `O servidor tem ${servidor.cards} cartas (assinatura ${servidor.sig}); este app tem ${CARD_KEYS.length} (${CONTENT_SIG}).`}
            {" "}Uma partida nessas condições quebra no meio, então o multiplayer está bloqueado.
            Refaça o deploy do serviço no Render (Manual Deploy → Clear build cache &amp; deploy) e reconecte.
          </div>
        )}

        {connected && match && (
          <div style={{ padding: 14, borderRadius: 12, background: "#1c1917", border: `1px solid ${travou ? "#b45309" : "#4f46e5"}`, textAlign: "center" }}>
            <div style={{ fontSize: 15, marginBottom: 6 }}>Emparelhado com <b>{match.opponent}</b>!</div>
            <div style={{ fontSize: 13, color: "#a8a29e" }}>Você é o <b style={{ color: match.seat === 0 ? "#fcd34d" : "#7dd3fc" }}>Lado {match.seat === 0 ? "A (ouro)" : "B (lápis)"}</b>.</div>
            {travou
              ? <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 8, lineHeight: 1.5 }}>
                  O servidor recebeu seu deck mas não devolveu a partida. Ou o adversário ainda não
                  entrou na tela do lobby, ou o servidor está numa versão diferente da do app. Saia da sala e tente de novo.
                </div>
              : <div style={{ fontSize: 12, color: "#818cf8", marginTop: 8 }}>Preparando a partida… (enviando seu deck)</div>}
            <button onClick={() => { clearTimeout(timerRef.current); send({ t: "leaveRoom" }); setMatch(null); setTravou(false); }} style={{ ...btn("#292524", "#d6d3d1"), marginTop: 12 }}>Sair da sala</button>
          </div>
        )}

        {connected && !match && myRoom && (
          <div style={{ padding: 14, borderRadius: 12, background: "#1c1917", border: "1px solid #44403c", textAlign: "center" }}>
            <div style={{ fontSize: 14 }}>Sala criada. Aguardando um adversário entrar…</div>
            <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>Quem abrir o site vai ver sua sala na lista.</div>
            <button onClick={() => { send({ t: "leaveRoom" }); setMyRoom(null); }} style={{ ...btn("#292524", "#d6d3d1"), marginTop: 12 }}>Cancelar</button>
          </div>
        )}

        {connected && !match && !myRoom && !desatualizado && !semAssinatura && (
          <>
            <button onClick={() => send({ t: "createRoom" })} style={btn("#059669", "#052e16")}>Criar sala</button>
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 12, color: "#a8a29e", marginBottom: 6 }}>Salas abertas</div>
              {visibleRooms.length === 0 && <div style={{ fontSize: 13, color: "#57534e", padding: "10px 0" }}>Nenhuma sala aberta. Crie uma e espere alguém entrar.</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleRooms.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 9, background: "#1c1917", border: "1px solid #44403c" }}>
                    <span style={{ fontSize: 14 }}>Sala de <b>{r.host}</b></span>
                    <button onClick={() => send({ t: "joinRoom", roomId: r.id })} style={{ ...btn("#4f46e5", "#eef2ff"), marginLeft: "auto", padding: "8px 14px" }}>Entrar</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {note && <div style={{ fontSize: 12, color: "#fbbf24", padding: "8px 10px", borderRadius: 8, background: "#1c1917", border: "1px solid #44403c" }}>{note}</div>}
      </div>
    </div>
  );
}

export { Lobby };
