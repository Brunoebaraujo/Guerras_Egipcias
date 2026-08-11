import React, { useEffect, useRef } from "react";
import { ARCH_COLOR, GLYPH, SIDE_NAME, byKey, custoDe, laneScore } from "../../engine.js";
import { MiniCard, mBtnBig, mBtnSm } from "./DesktopGameComponents.jsx";
import { DUAT_KEYFRAMES, MOBILE_BW } from "./animations.js";
import { resultLabel } from "../matchPresentation.js";
import { ESPACO_ARTE, arteProps } from "../arte.js";

const BOARD_MOBILE = {
  art: "tabuleiro-mobile.webp",
  ar: 912 / 1245,             // largura/altura da arte
  laneX: [17.654, 50, 82.346],// % X do centro de cada via
  colDX: 7.018,               // % de afastamento das colunas esquerda/direita
  cardW: 12.61,               // % da largura de um slot
  rowY: { 1: [15.631, 30.728], 0: [69.165, 84.476] }, // % Y das duas linhas — [topo, baixo] por lado
  scoreY: { 1: 42.505, 0: 56.959 },                   // % Y dos discos de placar (B em cima, A embaixo)
};

/* Transforma as coordenadas do tabuleiro quando viewSeat=1:
   inverte a ordem dos lados para que o jogador sempre veja suas vias embaixo. */
function flipBoardConfig(config, viewSeat) {
  if (viewSeat !== 1) return config;
  return {
    ...config,
    rowY: { 0: config.rowY[1], 1: config.rowY[0] },
    scoreY: { 0: config.scoreY[1], 1: config.scoreY[0] },
  };
}

function BoardArt({ config, g, ctx, planning, sel, aim, moving, placeCard, moveTo, applyAim, isAimable, isMovable, startMove, pickUp, zoomBoard, viewSeat = 0, hideSide = null }) {
  const displayConfig = flipBoardConfig(config, viewSeat);
  const base = import.meta.env.BASE_URL;
  const cardHpct = displayConfig.cardW * displayConfig.ar * (7 / 5); // altura do slot em % (mantém 5:7)
  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", maxHeight: "100%", lineHeight: 0 }}>
      <img src={`${base}${displayConfig.art}`} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", borderRadius: 10 }} />
      <div style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2].map((lane) =>
          [0, 1].map((side) => {
            const cards = g.board.filter((c) => c.lane === lane && c.owner === side
              && !(hideSide != null && c.owner === hideSide && !c.revealed));
            const canDrop = planning && sel && sel.side === side && !moving && !aim;
            const canMoveHere = moving && moving.side === side && moving.lane !== lane;
            const active = canDrop || canMoveHere;
            const ring = side === 0 ? "rgba(251,191,36,.9)" : "rgba(56,189,248,.9)";
            const zoneClick = canMoveHere ? () => moveTo(side, lane) : canDrop ? () => placeCard(side, lane) : undefined;
            const rows = displayConfig.rowY[side];
            const boxLeft = displayConfig.laneX[lane] - (displayConfig.colDX + displayConfig.cardW / 2);
            const boxW = displayConfig.colDX * 2 + displayConfig.cardW;
            const boxTop = Math.min(rows[0], rows[1]) - cardHpct / 2;
            const boxH = Math.abs(rows[1] - rows[0]) + cardHpct;
            return (
              <React.Fragment key={`${lane}-${side}`}>
                {/* zona de soltura (posicionar / mover para cá) */}
                <div onClick={zoneClick} style={{
                  position: "absolute", left: `${boxLeft}%`, top: `${boxTop}%`, width: `${boxW}%`, height: `${boxH}%`,
                  borderRadius: 8, border: active ? `2px solid ${ring}` : "none",
                  boxShadow: active ? `0 0 12px ${ring}` : "none", cursor: active ? "pointer" : "default",
                  transition: "box-shadow .2s ease", zIndex: active ? 3 : 1,
                }} />
                {/* cartas nos slots */}
                {[0, 1, 2, 3].map((slot) => {
                  const c = cards[slot];
                  const col = slot % 2, row = slot < 2 ? 0 : 1;
                  const x = displayConfig.laneX[lane] + (col === 0 ? -displayConfig.colDX : displayConfig.colDX);
                  const y = rows[row];
                  /* Slot vazio: a moldura de pedra está PINTADA na arte do tabuleiro,
                     então não dá para apagá-la por CSS — dá para abafá-la. Sem isto,
                     o olho é puxado para onde não há informação nenhuma. */
                  if (!c) return (
                    <div key={`v${slot}`} style={{
                      position: "absolute", left: `${x}%`, top: `${y}%`, width: `${displayConfig.cardW}%`,
                      aspectRatio: "5 / 7", transform: "translate(-50%,-50%)", zIndex: 2,
                      borderRadius: 5, background: "rgba(6,9,13,.5)", pointerEvents: "none",
                    }} />
                  );
                  const canTarget = aim && isAimable(c);
                  const movable = isMovable(c);
                  const isMoving = moving && moving.uid === c.uid;
                  const reveal = g.lastReveal && g.lastReveal.uid === c.uid ? g.lastReveal.seq : null;
                  const badge = g.effect && g.effect.uid === c.uid ? g.effect : null;
                  const blessings = (g.blessings || []).filter((b) => b.uid === c.uid);
                  const charging = c.key === "heka" && c.revealed && !c.dying && !!(g.pendingBuff && g.pendingBuff[c.owner]);
                  let onClick;
                  if (c.dying) onClick = undefined;
                  else if (canTarget) onClick = (e) => { e.stopPropagation(); applyAim(c); };
                  else if (movable || isMoving) onClick = (e) => { e.stopPropagation(); startMove(c); };
                  else onClick = (e) => { e.stopPropagation(); zoomBoard(c); };
                  const onRemove = pickUp && !c.revealed && !c.dying ? (e) => { e.stopPropagation(); pickUp(c.uid); } : null;
                  return (
                    <div key={c.uid} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: `${displayConfig.cardW}%`, aspectRatio: "5 / 7", transform: "translate(-50%,-50%)", zIndex: 4 }}>
                      <MiniCard c={c} ctx={ctx} bw={MOBILE_BW} canTarget={canTarget} movable={movable} isMoving={isMoving}
                        reveal={reveal} badge={badge} blessings={blessings} dying={!!c.dying} charging={charging}
                        onClick={onClick} onRemove={onRemove} />
                    </div>
                  );
                })}
                {/* placar no disco do rio */}
                {(() => {
                  const s = laneScore(ctx, lane, side);
                  const other = laneScore(ctx, lane, 1 - side);
                  const lead = s > other;
                  const col = side === 0 ? "#fcd34d" : "#7dd3fc";
                  return (
                    /* O total da via é o placar da partida: quem leva duas vias vence.
                       Era o número menor da tela. Agora é o maior, e a liderança se lê
                       pelo halo, não por uma diferença sutil de matiz. */
                    <div style={{
                      position: "absolute", left: `${displayConfig.laneX[lane]}%`, top: `${displayConfig.scoreY[side]}%`, transform: "translate(-50%,-50%)",
                      zIndex: 5, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center",
                      width: "clamp(28px, 5.6vw, 44px)", aspectRatio: "1", borderRadius: "50%",
                      boxShadow: lead ? `0 0 0 2px ${col}, 0 0 10px 2px ${col}88` : "none",
                      transition: "box-shadow .3s ease",
                    }}>
                      <span style={{
                        fontFamily: "Georgia, serif", fontWeight: 900, lineHeight: 1,
                        fontSize: s >= 100 ? "clamp(13px, 2.6vw, 20px)" : "clamp(16px, 3.4vw, 26px)",
                        color: lead ? col : "#241c10",
                        textShadow: lead
                          ? `0 0 7px ${col}, 0 1px 2px rgba(0,0,0,.95), 0 -1px 2px rgba(0,0,0,.85)`
                          : "0 1px 0 rgba(255,255,255,.5)",
                      }}>{s}</span>
                    </div>
                  );
                })()}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}

/* Faixa de aviso do tabuleiro mobile.

   ESTE COMPONENTE ESTAVA FALTANDO. Era usado em quatro pontos abaixo e nunca
   foi declarado nem importado, o que fazia `MBanner is not defined` derrubar a
   tela inteira pela barreira de erro. As três condições que o disparam são
   todas exclusivas do mobile e nenhuma acontece na primeira pintura — mira
   pendente, Trevas na rodada, e `msg`, que no online aparece quando o
   adversário está mirando ou cai a conexão. Por isso o defeito sobreviveu:
   quem joga no desktop nunca passa por aqui.

   Fica no nível do módulo, e não dentro de `GameMobile`, porque componente
   declarado dentro de outro ganha identidade nova a cada render e faz o React
   desmontar e remontar a subárvore (é a regra que `render.test.js` guarda).

   As cores acompanham o equivalente do desktop: índigo para estado de regra
   (Trevas, mira) e rosa para o que exige atenção (conexão). O `flex` com `gap`
   é o que faz o botão "Pular" da mira encostar à direita com `marginLeft:auto`,
   como o chamador espera. */
const TOM_FAIXA = {
  indigo: { background: "#1e1b4b", border: "#4338ca", color: "#c7d2fe" },
  rose:   { background: "#4c0519", border: "#9f1239", color: "#fecdd3" },
};

function MBanner({ tone = "indigo", children }) {
  const cor = TOM_FAIXA[tone] || TOM_FAIXA.indigo;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6, margin: "0 8px 4px",
      padding: "4px 8px", borderRadius: 6, fontSize: 11, lineHeight: 1.25,
      background: cor.background, border: `1px solid ${cor.border}`, color: cor.color,
    }}>
      {children}
    </div>
  );
}

function MHandCard({ h, side, tone, g, sel, setSel, disabled, onZoom }) {
  const def = byKey[h.key];
  const isSel = sel && sel.side === side && sel.hid === h.hid;
  const custo = custoDe(h);
  const afford = g.energy[side] >= custo;
  const accent = tone === "amber" ? "#fcd34d" : "#7dd3fc";
  const faixa = (h.baked || 0) !== 0 ? `Faixa ${h.printed + h.baked}` : `P${h.printed}`;
  const drawn = g.justDrew?.[side]?.includes(h.hid);
  const art = arteProps(def.arte, { sizes: ESPACO_ARTE.tabuleiroMobile });
  const ref = useRef(null);
  // Rola a carta recém-comprada para dentro da vista, para o halo dourado ser visto.
  useEffect(() => {
    if (drawn && ref.current) {
      try { ref.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); } catch {}
    }
  }, [drawn]);
  return (
    <div ref={ref} className={drawn ? "duat-draw" : ""} style={{
      position: "relative", flex: "1 1 0", minWidth: 0, maxWidth: 68, borderRadius: 6, background: "#1c1917",
      border: isSel ? `2px solid ${accent}` : "1px solid #44403c", opacity: disabled ? 0.5 : afford ? 1 : 0.55,
      overflow: "hidden",
    }}>
      <button disabled={disabled} onClick={() => setSel(isSel ? null : { side, hid: h.hid })}
        style={{ display: "block", textAlign: "left", width: "100%", padding: 0, background: "none", border: "none", cursor: disabled ? "default" : "pointer" }}>
        <div style={{ position: "relative", width: "100%", height: 38, background: "#000" }}>
          {art
            ? <img {...art} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: def.arteFoco || "center", opacity: afford ? 1 : 0.7 }} />
            : <div className={ARCH_COLOR[def.arch]} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{GLYPH[def.arch]}</div>}
          <span style={{ position: "absolute", top: 2, left: 2, fontSize: 9, fontWeight: 800, color: custo > def.custo ? "#fda4af" : "#fde68a", textShadow: "0 1px 2px #000" }}>{custo}⚡</span>
        </div>
        <div style={{ padding: "2px 4px 3px" }}>
          <div className={ARCH_COLOR[def.arch]} style={{ fontSize: 10, lineHeight: 1.1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{def.nomeCurto}</div>
          <div style={{ fontSize: 8.5, color: "#a8a29e", marginTop: 0.5 }}>{faixa}</div>
        </div>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onZoom(h); }} title="Ampliar"
        style={{ position: "absolute", top: 1, right: 1, fontSize: 9, color: "#e7e5e4", background: "rgba(0,0,0,.5)", borderRadius: 3, border: "none", cursor: "pointer", lineHeight: 1, padding: "1px 2px" }}>🔍</button>
    </div>
  );
}

function MHandRow({ side, tone, g, sel, setSel, disabled, onZoom, onResetPlan = null, online = false, isOpp = false, oppHand = 0, hideSide = null }) {
  const hand = g.hand[side];
  // Quantas cartas este lado posicionou nesta rodada e ainda não foram reveladas.
  const postos = g.board.filter((c) => c.owner === side && !c.revealed && !c.dying && c.enteredRound === g.round).length;
  const accent = tone === "amber" ? "#fcd34d" : "#7dd3fc";
  const isPrio = g.priority === side;
  const edge = side === 1 ? { borderBottom: `1px solid ${accent}44` } : { borderTop: `1px solid ${accent}44` };

  // Mão escondida do jogador: multiplayer de verdade zera o array no cliente
  // (filterStateForSeat), então `hand.length` já é 0 e não precisamos contar
  // à parte — mas vs. Bot roda tudo local, com a mão real do Bot presente no
  // estado, então `hand.length` já dá a contagem certa sem precisar de prop.
  const escondida = (online && isOpp) || (hideSide != null && hideSide === side);
  if (escondida) {
    const count = online ? oppHand : hand.length;
    return (
      <div style={{ padding: "3px 8px", background: "#141210", ...edge }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{SIDE_NAME[side]}</span>
          {isPrio && <span style={{ fontSize: 9, color: "#78716c" }}>revela 1º</span>}
          <span style={{ marginLeft: "auto", fontSize: 9, color: "#78716c" }}>⚡{g.energy[side]} · deck {g.deck[side].length} · † {g.deaths[side]} · 🂠{count}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ padding: "2px 6px", background: "#141210", ...edge, display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9 }}>
        <span style={{ fontWeight: 700, color: accent }}>{SIDE_NAME[side]}</span>
        {isPrio && <span style={{ color: "#78716c" }}>revela 1º</span>}
        <span style={{ marginLeft: "auto", color: "#78716c" }}>⚡{g.energy[side]} · deck {g.deck[side].length} · † {g.deaths[side]}</span>
        {onResetPlan && (
          <button onClick={() => onResetPlan(side)} disabled={!postos} title="Reiniciar rodada"
            style={{
              fontSize: 8.5, padding: "1px 4px", borderRadius: 3, lineHeight: 1.2,
              border: `1px solid ${postos ? "#a8a29e66" : "#44403c"}`,
              background: postos ? "rgba(168,162,158,.12)" : "transparent",
              color: postos ? "#d6d3d1" : "#57534e", cursor: postos ? "pointer" : "default", whiteSpace: "nowrap",
            }}>↺</button>
        )}
      </div>
      <div style={{ display: "flex", gap: 3, overflowX: "auto", alignItems: "stretch" }}>
        {hand.length === 0 && <span style={{ fontSize: 10, color: "#57534e" }}>Mão vazia.</span>}
        {hand.map((h) => <MHandCard key={h.hid} h={h} side={side} tone={tone} g={g} sel={sel} setSel={setSel} disabled={disabled} onZoom={onZoom} />)}
      </div>
    </div>
  );
}

function GameMobile(p) {
  const {
    g, ctx, wins, planning, sel, setSel, aim, moving, msg, fast,
    startReveal, setFast, reset, setScreen,
    placeCard, pickUp, resetPlan, startMove, moveTo, applyAim, skipAim, isAimable, isMovable,
    zoomBoard, zoomHand,
    online = false, seat = 0, myReady = false, oppHand = 0, hideSide = null,
  } = p;
  const disabled = !planning || !!aim || !!moving;
  const phaseLabel = planning ? "Planejar" : g.phase === "revealing" ? "Revelando…" : "Revelado";
  const phaseBg = planning ? "#1c1917" : g.phase === "revealing" ? "#1e1b4b" : "#064e3b";
  const laneProps = { g, ctx, planning, sel, aim, moving, placeCard, moveTo, applyAim, isAimable, isMovable, startMove, pickUp: planning ? pickUp : null, zoomBoard, hideSide };
  
  // Em multiplayer, rotaciona a vista: o jogador SEMPRE vê suas vias embaixo
  // seat=0 (A): lado 0 embaixo (normal)
  // seat=1 (B): lado 1 embaixo (rotacionado)
  const mySide = seat;
  const oppSide = 1 - seat;
  
  return (
    <div style={{ minHeight: "100dvh", background: "#0c0a09", display: "flex", justifyContent: "center" }}>
    <div style={{ width: "100%", maxWidth: 720, minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0c0a09", color: "#e7e5e4", fontFamily: "ui-sans-serif, system-ui, sans-serif", borderLeft: "1px solid #1c1917", borderRight: "1px solid #1c1917", overflow: "hidden" }}>
      <style>{DUAT_KEYFRAMES}</style>
      <style>{"body{background:#0c0a09;margin:0}"}</style>

      {/* Cabeçalho compacto: rodada, placar, assento */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderBottom: "1px solid #292524", position: "sticky", top: 0, background: "#0c0a09", zIndex: 20, fontSize: 11 }}>
        <span style={{ fontWeight: 800, letterSpacing: 0.5, color: "#fde68a", fontSize: 13, whiteSpace: "nowrap" }}>𓂀</span>
        <span style={{ color: "#78716c" }}>R {g.round}</span>
        <span style={{ marginLeft: "auto" }}>
          <b style={{ color: "#fcd34d" }}>A {wins[0]}</b> <span style={{ color: "#57534e" }}>×</span> <b style={{ color: "#7dd3fc" }}>{wins[1]} B</b>
        </span>
        {online && <span style={{ fontSize: 10, color: seat === 0 ? "#fcd34d" : "#7dd3fc", fontWeight: 700 }}>{SIDE_NAME[seat]}</span>}
      </div>

      {/* Info de fase e prioridade - uma única linha */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", fontSize: 10, color: "#78716c" }}>
        <span style={{ padding: "1px 6px", borderRadius: 4, background: phaseBg, color: "#e7e5e4", fontWeight: 600, fontSize: 9 }}>{phaseLabel}</span>
        <span>Prioridade <b style={{ color: g.priority === 0 ? "#fcd34d" : "#7dd3fc" }}>{g.priority === 0 ? "A" : "B"}</b></span>
        <span style={{ marginLeft: "auto" }}>⚡<b style={{ color: "#fcd34d" }}>{g.energy[0]}</b>/<b style={{ color: "#7dd3fc" }}>{g.energy[1]}</b></span>
      </div>

      {/* Em mobile, mostrar só mensagens críticas (conexão, trevas, mira).
          Mensagens contextuais (toque numa via, escaravelho) são removidas para ganhar espaço. */}
      {msg && <MBanner tone="rose">{msg}</MBanner>}
      {g.trevas === g.round && <MBanner tone="indigo">⊘ Trevas — cartas ocultas</MBanner>}
      {aim && (
        <MBanner tone="indigo">
          <span>🎯 <b>{aim.srcNome}</b>: escolha {aim.needs === "ally" ? "um aliado" : "um inimigo"} na Via {aim.lane + 1}.</span>
          <button onClick={skipAim} style={{ marginLeft: "auto", padding: "3px 8px", borderRadius: 6, border: "1px solid #4338ca", background: "#312e81", color: "#c7d2fe", fontSize: 11, cursor: "pointer" }}>Pular</button>
        </MBanner>
      )}

      {/* Multiplayer mobile: maximizar espaço do tabuleiro e cartas
          - Topo: Adversário (info compacta com ícone + número)
          - Meio: Tabuleiro (ocupa máximo de altura)
          - Fundo: Suas cartas (totalmente visíveis para jogar) */}
      {online ? (
        <>
          <MHandRow side={oppSide} tone={oppSide === 0 ? "amber" : "sky"} g={g} sel={sel} setSel={setSel} disabled={disabled} onZoom={zoomHand}
            onResetPlan={null}
            online={online} isOpp={true} oppHand={oppHand} hideSide={hideSide} />

          {/* Tabuleiro: flex máximo para ganhar espaço */}
          <div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px 4px", minHeight: 0 }}>
            <BoardArt config={BOARD_MOBILE} {...laneProps} viewSeat={seat} />
          </div>

          <MHandRow side={mySide} tone={mySide === 0 ? "amber" : "sky"} g={g} sel={sel} setSel={setSel} disabled={disabled} onZoom={zoomHand}
            onResetPlan={planning ? resetPlan : null}
            online={online} isOpp={false} oppHand={oppHand} hideSide={hideSide} />
        </>
      ) : (
        /* Single player: layout original */
        <>
          <MHandRow side={1} tone="sky" g={g} sel={sel} setSel={setSel} disabled={disabled} onZoom={zoomHand}
            onResetPlan={planning ? resetPlan : null}
            online={online} isOpp={false} oppHand={oppHand} hideSide={hideSide} />

          <div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, minHeight: 0 }}>
            <BoardArt config={BOARD_MOBILE} {...laneProps} />
          </div>

          <MHandRow side={0} tone="amber" g={g} sel={sel} setSel={setSel} disabled={disabled} onZoom={zoomHand}
            onResetPlan={planning ? resetPlan : null}
            online={online} isOpp={false} oppHand={oppHand} hideSide={hideSide} />
        </>
      )}

      <div style={{ display: "flex", gap: 4, padding: "4px 6px", borderTop: "1px solid #292524", position: "sticky", bottom: 0, background: "#0c0a09", zIndex: 20 }}>
        {planning && (online
          ? <button onClick={startReveal} disabled={myReady} style={{ ...mBtnBig, background: myReady ? "#292524" : "#059669", color: myReady ? "#a8a29e" : "#0c0a09", fontSize: 11 }}>{myReady ? "Aguardando…" : "Pronto ✓"}</button>
          : <button onClick={startReveal} style={{ ...mBtnBig, background: "#059669", color: "#0c0a09", fontSize: 11 }}>Revelar</button>)}
        {g.phase === "revealing" && !online && <button onClick={() => setFast((f) => !f)} style={{ ...mBtnBig, background: fast ? "#0ea5e9" : "#292524", color: fast ? "#0c0a09" : "#e7e5e4", fontSize: 11 }}>{fast ? "⏩ rápido" : "⏩ acelerar"}</button>}
        {g.phase === "revealing" && online && <span style={{ ...mBtnBig, background: "#1e1b4b", color: "#c7d2fe", textAlign: "center", fontSize: 11 }}>Revelando…</span>}
        {g.phase === "revealed" && !g.finished && (
          <span style={{ ...mBtnBig, background: "#1c1917", color: "#fde68a", textAlign: "center", border: "1px solid #78716c", fontSize: 10 }}>
            {g.round >= 6 ? "Encerrando…" : "Seguindo…"}
          </span>)}
        {g.finished && <span style={{ ...mBtnBig, background: "#1c1917", color: "#fde68a", textAlign: "center", border: "1px solid #b45309", fontSize: 10 }}>{resultLabel(g)}</span>}
        {online
          ? <button onClick={reset} style={mBtnSm} title="Sair da partida">⏲</button>
          : <><button onClick={reset} style={mBtnSm} title="Reiniciar">↺</button>
            <button onClick={() => setScreen("menu")} style={mBtnSm}>Início</button></>}
      </div>
    </div>
    </div>
  );
}


export { GameMobile };

/* ==========================================================================
   PARTIDA ONLINE (Fase 2 — cliente).
   Componente fino: NÃO tem regra própria. Recebe do Lobby o `send` (WebSocket)
   e o último `data` = { seat, state, ready, oppConnected } vindo do servidor,
   e reaproveita a mesma UI mobile (GameMobile). Cada ação vira uma mensagem;
   o estado exibido é o que o servidor devolve (já filtrado: sem a mão nem as
   jogadas ocultas do adversário). Só interajo no MEU assento.
   ========================================================================== */
