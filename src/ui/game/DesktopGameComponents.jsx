import React, { useEffect, useRef, useState } from "react";
import Carta from "../../Carta.jsx";
import {
  ARCH_COLOR, GLYPH, SIDE_NAME, byKey, custoDe, laneHasMaat, laneProtegida, laneScore, power,
} from "../../engine.js";

/* Geometria do tabuleiro (tabuleiro.webp, 1535×1024) — tudo em % da imagem.
   Medido por análise de pixels; ajuste fino aqui se algo não cair no lugar. */
export const BOARD = {
  ratio: "1535 / 1024",
  laneCx: [30.7, 49.5, 68.0],                       // centro das 3 vias
  zone: { w: 11.8, top: { y: 9.4, h: 25.4 }, bot: { y: 66.4, h: 24.5 } },
  circle: { d: 5.4, topCy: 39.1, botCy: 62.0 },     // discos de placar
};

export function Tabuleiro({ g, ctx, aim, moving, sel, planning, placeCard, moveTo, applyAim, isAimable, startMove, isMovable, pickUp, zoomBoard }) {
  const base = import.meta.env.BASE_URL;
  const ref = useRef(null);
  const [bw, setBw] = useState(900);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver((e) => setBw(e[0].contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const px = (pct) => (bw * pct) / 100;

  const zoneStyle = (lane, side) => {
    const z = BOARD.zone; const v = side === 0 ? z.top : z.bot;
    return { position: "absolute", left: `${BOARD.laneCx[lane] - z.w / 2}%`, top: `${v.y}%`, width: `${z.w}%`, height: `${v.h}%` };
  };

  return (
    <div ref={ref} className="relative select-none" style={{
      width: "100%", height: "100%",
      backgroundImage: `url(${base}tabuleiro.webp)`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
      borderRadius: 12, boxShadow: "0 0 0 1px #44403c, 0 8px 30px rgba(0,0,0,.5)",
    }}>
      {[0, 1, 2].map((lane) => {
        const sA = laneScore(ctx, lane, 0), sB = laneScore(ctx, lane, 1);
        const winner = sA > sB ? 0 : sB > sA ? 1 : -1;
        const maat = laneHasMaat(g.board, lane);
        return (
          <React.Fragment key={lane}>
            {[0, 1].map((side) => (
              <LaneZone key={side} side={side} lane={lane} g={g} ctx={ctx} bw={bw} px={px}
                style={zoneStyle(lane, side)} aim={aim} moving={moving}
                canDrop={planning && sel && sel.side === side && !moving}
                onDrop={() => placeCard(side, lane)} onMoveHere={() => moveTo(side, lane)}
                onTarget={(c) => aim && isAimable(c) && applyAim(c)}
                onStartMove={startMove} isMovable={isMovable}
                onRemove={planning ? pickUp : null} aimable={isAimable} onZoom={zoomBoard}
                tone={side === 0 ? "amber" : "sky"} />
            ))}
            {/* Discos de placar (soma de poder da via, por lado) */}
            <ScoreDisc cx={BOARD.laneCx[lane]} cy={BOARD.circle.topCy} d={BOARD.circle.d} px={px} v={sA} tone="amber" lead={winner === 0} />
            <ScoreDisc cx={BOARD.laneCx[lane]} cy={BOARD.circle.botCy} d={BOARD.circle.d} px={px} v={sB} tone="sky" lead={winner === 1} />
            {/* Faixa do rio: identificação da via + estado */}
            <div style={{ position: "absolute", left: `${BOARD.laneCx[lane]}%`, top: "50.5%", transform: "translate(-50%,-50%)", zIndex: 4, pointerEvents: "none", textAlign: "center" }}>
              <div style={{
                background: "rgba(15,12,8,.62)", border: "1px solid rgba(247,233,192,.35)", borderRadius: 999,
                padding: `${px(0.25)}px ${px(0.9)}px`, color: "#f7e9c0", fontFamily: "Georgia, serif",
                fontSize: Math.max(10, px(1.05)), letterSpacing: 1, whiteSpace: "nowrap",
              }}>
                VIA {lane + 1}{maat ? " · ⚖" : winner >= 0 ? ` · ♛ ${winner === 0 ? "A" : "B"}` : ""}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* Tabuleiro com rotação para multiplayer: ajusta as zones baseado na perspectiva do jogador */
export function TabuleiroMultiplayer({ g, ctx, aim, moving, sel, planning, placeCard, moveTo, applyAim, isAimable, startMove, isMovable, pickUp, zoomBoard, viewSeat = 0 }) {
  const base = import.meta.env.BASE_URL;
  const ref = useRef(null);
  const [bw, setBw] = useState(900);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver((e) => setBw(e[0].contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const px = (pct) => (bw * pct) / 100;

  /* Em multiplayer, rotaciona as zones:
     - Se side === viewSeat (é você): coloca EMBAIXO (z.bot)
     - Se side !== viewSeat (é adversário): coloca EM CIMA (z.top)
     Isso garante que você sempre vê sua área embaixo, independente de qual lado você é. */

  const zoneStyle = (lane, side) => {
    const z = BOARD.zone;
    const v = side === viewSeat ? z.bot : z.top;
    return { position: "absolute", left: `${BOARD.laneCx[lane] - z.w / 2}%`, top: `${v.y}%`, width: `${z.w}%`, height: `${v.h}%` };
  };

  return (
    <div ref={ref} className="relative select-none" style={{
      width: "100%", height: "100%",
      backgroundImage: `url(${base}tabuleiro.webp)`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
      borderRadius: 12, boxShadow: "0 0 0 1px #44403c, 0 8px 30px rgba(0,0,0,.5)",
    }}>
      {[0, 1, 2].map((lane) => {
        const sA = laneScore(ctx, lane, 0), sB = laneScore(ctx, lane, 1);
        const winner = sA > sB ? 0 : sB > sA ? 1 : -1;
        const maat = laneHasMaat(g.board, lane);
        return (
          <React.Fragment key={lane}>
            {[0, 1].map((side) => (
              <LaneZone key={side} side={side} lane={lane} g={g} ctx={ctx} bw={bw} px={px}
                style={zoneStyle(lane, side)} aim={aim} moving={moving}
                canDrop={planning && sel && sel.side === side && !moving}
                onDrop={() => placeCard(side, lane)} onMoveHere={() => moveTo(side, lane)}
                onTarget={(c) => aim && isAimable(c) && applyAim(c)}
                onStartMove={startMove} isMovable={isMovable}
                onRemove={planning ? pickUp : null} aimable={isAimable} onZoom={zoomBoard}
                tone={side === 0 ? "amber" : "sky"} />
            ))}
            {/* Discos de placar — rotacionam com a perspectiva quando viewSeat=1 */}
            {(() => {
              const topCy = BOARD.circle.topCy;
              const botCy = BOARD.circle.botCy;
              // Quando viewSeat=1, inverte: Lado 0 embaixo (botCy), Lado 1 em cima (topCy)
              const cyForSide = (side) => viewSeat === 1 ? (side === 0 ? botCy : topCy) : (side === 0 ? topCy : botCy);
              return (
                <>
                  <ScoreDisc cx={BOARD.laneCx[lane]} cy={cyForSide(0)} d={BOARD.circle.d} px={px} v={sA} tone="amber" lead={winner === 0} />
                  <ScoreDisc cx={BOARD.laneCx[lane]} cy={cyForSide(1)} d={BOARD.circle.d} px={px} v={sB} tone="sky" lead={winner === 1} />
                </>
              );
            })()}
            <div style={{ position: "absolute", left: `${BOARD.laneCx[lane]}%`, top: "50.5%", transform: "translate(-50%,-50%)", zIndex: 4, pointerEvents: "none", textAlign: "center" }}>
              <div style={{
                background: "rgba(15,12,8,.62)", border: "1px solid rgba(247,233,192,.35)", borderRadius: 999,
                padding: `${px(0.25)}px ${px(0.9)}px`, color: "#f7e9c0", fontFamily: "Georgia, serif",
                fontSize: Math.max(10, px(1.05)), letterSpacing: 1, whiteSpace: "nowrap",
              }}>
                VIA {lane + 1}{maat ? " · ⚖" : winner >= 0 ? ` · ♛ ${winner === 0 ? "A" : "B"}` : ""}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function ScoreDisc({ cx, cy, d, px, v, tone, lead }) {
  const ring = tone === "amber" ? "rgba(251,191,36,.95)" : "rgba(56,189,248,.95)";
  return (
    <div style={{
      position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%,-50%)",
      width: `${d}%`, aspectRatio: "1", borderRadius: "50%", zIndex: 4,
      display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
      boxShadow: lead ? `0 0 0 ${Math.max(2, px(0.22))}px ${ring}, 0 0 ${px(1.2)}px ${ring}` : "none",
      transition: "box-shadow .3s ease",
    }}>
      <span style={{
        fontFamily: "Georgia, serif", fontWeight: 800, color: "#3a2b12", lineHeight: 1,
        fontSize: Math.max(15, px(v >= 100 ? 1.9 : 2.5)),
        textShadow: "0 1px 0 rgba(255,255,255,.45)",
      }}>{v}</span>
    </div>
  );
}

function LaneZone({ side, lane, g, ctx, bw, px, style, aim, moving, canDrop, onDrop, onMoveHere, onTarget, onStartMove, isMovable, onRemove, aimable, onZoom, tone }) {
  const cards = g.board.filter((c) => c.lane === lane && c.owner === side);
  const canMoveHere = moving && moving.side === side && moving.lane !== lane;
  const active = canDrop || canMoveHere;
  const ringColor = tone === "amber" ? "rgba(251,191,36,.8)" : "rgba(56,189,248,.8)";
  const zoneClick = canMoveHere ? onMoveHere : canDrop ? onDrop : undefined;
  return (
    <div onClick={zoneClick} style={{ ...style, cursor: active ? "pointer" : "default", zIndex: 3 }}>
      <div style={{
        position: "absolute", inset: `-${px(0.35)}px`, borderRadius: px(0.8), pointerEvents: "none",
        boxShadow: active ? `inset 0 0 0 ${Math.max(2, px(0.2))}px ${ringColor}, 0 0 ${px(1)}px ${ringColor}` : "none",
        transition: "box-shadow .2s ease",
      }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: px(0.5), width: "100%", height: "100%", padding: px(0.35) }}>
        {[0, 1, 2, 3].map((slot) => {
          const c = cards[slot];
          if (!c) return <div key={slot} style={{ borderRadius: px(0.5), border: active ? `1px dashed ${ringColor}` : "1px dashed rgba(247,233,192,.06)" }} />;
          const canTarget = aim && aimable(c);
          const movable = isMovable(c);
          const isMoving = moving && moving.uid === c.uid;
          const reveal = g.lastReveal && g.lastReveal.uid === c.uid ? g.lastReveal.seq : null;
          const badge = g.effect && g.effect.uid === c.uid ? g.effect : null;
          const blessings = (g.blessings || []).filter((b) => b.uid === c.uid);
          // Heka revelada "carrega" o brilho enquanto o dono tiver reserva pendente.
          const charging = c.key === "heka" && c.revealed && !c.dying && !!(g.pendingBuff && g.pendingBuff[c.owner]);
          let onClick;
          if (c.dying) onClick = undefined;
          else if (canTarget) onClick = (e) => { e.stopPropagation(); onTarget(c); };
          else if (movable || isMoving) onClick = (e) => { e.stopPropagation(); onStartMove(c); };
          else onClick = (e) => { e.stopPropagation(); onZoom(c); };
          return (
            <MiniCard key={c.uid} c={c} ctx={ctx} bw={bw} canTarget={canTarget} movable={movable} isMoving={isMoving}
              reveal={reveal} badge={badge} blessings={blessings} dying={!!c.dying} charging={charging} onClick={onClick}
              onRemove={onRemove && !c.revealed && !c.dying ? (e) => { e.stopPropagation(); onRemove(c.uid); } : null} />
          );
        })}
      </div>
    </div>
  );
}

const BADGE_COLOR = { buff: "text-emerald-300", debuff: "text-rose-300", sac: "text-emerald-300", fuse: "text-teal-300", block: "text-stone-300", movimento: "text-sky-300" };
function EffectBadge({ badge, size }) {
  if (!badge) return null;
  return (
    <div key={badge.seq} className="duat-badge" style={{ position: "absolute", left: "50%", top: -4, fontSize: size, fontWeight: 700, whiteSpace: "nowrap", pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,.85)", zIndex: 6 }}>
      <span className={BADGE_COLOR[badge.kind] || "text-stone-200"}>{badge.text}</span>
    </div>
  );
}

/* Carta em miniatura sobre o tabuleiro: arte de fundo quando existir. */
export function MiniCard({ c, ctx, bw, canTarget, movable, isMoving, reveal, badge, blessings = [], dying, charging, onClick, onRemove }) {
  const base = import.meta.env.BASE_URL;
  const def = byKey[c.key];
  const f = (n) => Math.max(8, (bw * n) / 100);       // fontes proporcionais ao tabuleiro
  /* ESPAÇAMENTO ≠ FONTE. `f` tem piso de 8px porque fonte menor que isso não se
     lê. Aplicar esse mesmo piso a padding/gap era um defeito silencioso: numa
     carta de ~45px de largura, f(0.25) virava 8px de respiro por lado — 35% da
     carta gasta em margem, espremendo a arte. `u` escala de verdade. */
  const u = (n) => Math.max(1, (bw * n) / 100);
  const artSrc = def.arte ? `${base}cartas/${def.arte}.webp` : null;
  // Lado dono: ouro para A, lápis para B. Leitura de posse sem depender da posição.
  const ladoCor = c.owner === 0 ? "rgba(251,191,36,.62)" : "rgba(125,211,252,.62)";

  const common = {
    position: "relative", width: "100%", height: "100%", borderRadius: (bw * 0.5) / 100,
    overflow: "visible", cursor: "pointer",
  };
  const frame = {
    position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden",
    display: "flex", flexDirection: "column", justifyContent: "space-between",
  };

  if (!c.revealed) {
    const prov = c.printed + (c.baked || 0);
    return (
      <div onClick={onClick} className={dying ? "duat-vanish" : ""} style={common} title={`${def.nome} — por revelar`}>
        <EffectBadge badge={badge} size={f(1.05)} />
        <div style={{ ...frame, background: "rgba(20,15,8,.82)", border: `1px dashed ${ladoCor}`, padding: u(0.3) }}>
          {onRemove && <button onClick={onRemove} style={{ position: "absolute", top: 0, right: u(0.3), color: "#a8a29e", fontSize: f(1.1), zIndex: 7 }}>✕</button>}
          <div className={ARCH_COLOR[def.arch]} style={{ fontSize: f(1.2), lineHeight: 1, opacity: 0.7 }}>{GLYPH[def.arch]}</div>
          <div style={{ color: "#a8a29e", fontSize: f(0.85), lineHeight: 1.1, textAlign: "center", overflow: "hidden" }}>{def.nomeCurto}</div>
          <div style={{ color: "#78716c", fontSize: f(0.8), textAlign: "center" }}>oculta · {prov}</div>
        </div>
      </div>
    );
  }

  const ehPraga = def.tipo === "Praga";
  // Escudo discreto: esta carta está sob a Aura de um Gato Egípcio da via.
  const protegida = laneProtegida(ctx.board, c.owner, c.lane);
  const p = power(c, ctx);
  const refP = c.printed + (c.baked || 0);
  const maat = laneHasMaat(ctx.board, c.lane);
  const pColor = maat ? "#fcd34d" : p > refP ? "#4ade80" : p < refP ? "#f87171" : "#f5f5f4";
  const border =
    dying ? "1.5px solid #be123c"
    : canTarget ? "2px solid #818cf8"
    : isMoving ? "2px solid #38bdf8"
    : movable ? "1.5px solid #0ea5e9"
    : `1.5px solid ${ladoCor}`;

  return (
    <div onClick={onClick} className={dying ? "duat-vanish" : reveal ? "duat-pop" : ""} style={common} title={def.texto || def.nome}>
      {charging && <div className="duat-charge" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", zIndex: 5 }} />}
      {blessings.map((b, i) => {
        // A fonte pisca 0,18s antes dos alvos: origem primeiro, destino depois.
        const atraso = b.wave * 0.8 + (b.role === "fonte" ? 0 : 0.18);
        const d = `${atraso}s`;
        if (b.role === "fonte") return (
          <div key={`f${b.seq}-${b.wave}-${i}`} className="duat-bless-fonte"
            style={{ position: "absolute", inset: -3, borderRadius: "inherit", pointerEvents: "none", zIndex: 6,
                     border: "2px solid rgba(251,191,36,.95)", boxShadow: "0 0 12px 3px rgba(251,191,36,.55)", animationDelay: d }} />
        );
        return (
          <React.Fragment key={`a${b.seq}-${b.wave}-${i}`}>
            <div className="duat-bless-ring" style={{ position: "absolute", inset: -4, borderRadius: "inherit", pointerEvents: "none", zIndex: 6, border: "2.5px solid rgba(74,222,128,.95)", animationDelay: d }} />
            <div className="duat-bless-glow" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", zIndex: 6, animationDelay: d }} />
            <span className="duat-bless-rise" style={{ position: "absolute", left: "50%", top: "-4px", zIndex: 9, pointerEvents: "none", fontWeight: 900, fontSize: f(1.6), color: "#4ade80", textShadow: "0 0 6px rgba(74,222,128,.7), 0 1px 3px rgba(0,0,0,.95)", animationDelay: d }}>+{b.val}</span>
          </React.Fragment>
        );
      })}
      <EffectBadge badge={badge} size={f(1.05)} />
      <div style={{ ...frame, border, background: artSrc ? "#000" : "rgba(28,24,17,.9)", boxShadow: canTarget ? "0 0 10px rgba(129,140,248,.8)" : "0 2px 6px rgba(0,0,0,.55)" }}>
        {artSrc && <img src={artSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.92 }} />}
        {/* Véu: escuro no topo (para os glifos) e na base (para a faixa do nome).
            O miolo fica limpo — é o assunto da ilustração. */}
        {artSrc && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 54%, rgba(0,0,0,.5) 76%, rgba(0,0,0,.86) 100%)" }} />}

        {/* Topo: arquétipo e sinais de estado. O CUSTO saiu daqui de propósito —
            depois de revelada a carta, custo não é mais informação acionável;
            ele continua na mão e no zoom, que é onde decide alguma coisa. */}
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: u(0.25), padding: `${u(0.3)}px ${u(0.35)}px 0` }}>
          <span className={ARCH_COLOR[def.arch]} style={{ fontSize: f(1.0), lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>{GLYPH[def.arch]}</span>
          {protegida && <span title="Protegida pelo Gato Egípcio — efeitos inimigos não podem escolhê-la"
            style={{ color: "#bef264", fontSize: f(0.85), lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>⛨</span>}
          {movable && <span title="Pode ser movida nesta rodada"
            style={{ color: "#7dd3fc", fontSize: f(0.85), lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>⇄</span>}
          {c.ulceras && <span title="Ulcerada — perde 1 de Poder no início de cada rodada"
            style={{ color: "#fda4af", fontSize: f(0.85), lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>☠</span>}
        </div>

        {/* a arte respira: nada escrito por cima do miolo da ilustração */}
        <div style={{ flex: 1 }} />

        {/* FAIXA DO NOME — placa própria na base, fora da arte. Antes o nome caía
            no centro da ilustração, exatamente onde ela tem mais detalhe.
            Uma linha só: `nomeCurto` é sempre uma palavra, então não há o que
            quebrar, e a faixa de duas linhas devolveu altura para a arte. Nome
            comprido demais para a largura degrada em reticências, não em corte. */}
        <div style={{
          position: "relative", background: "rgba(8,6,4,.74)", borderTop: "1px solid rgba(247,233,192,.16)",
          padding: `${u(0.26)}px ${u(0.28)}px ${u(0.32)}px`, color: "#ece9e4",
          fontSize: f(0.82), lineHeight: 1.06, textAlign: "center", letterSpacing: -0.1,
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          textShadow: "0 1px 2px rgba(0,0,0,.9)",
        }}>{def.nomeCurto}</div>
      </div>

      {/* PODER — plaqueta opaca atravessando o canto superior direito. É o único
          número da carta em campo, então tem que ganhar de tudo o mais. */}
      <div style={{
        position: "absolute", right: -u(0.32), top: -u(0.32), zIndex: 8, pointerEvents: "none",
        minWidth: f(1.85), height: f(1.85), padding: `0 ${u(0.3)}px`, borderRadius: f(0.65),
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: ehPraga ? "#c8a24a" : "rgba(7,6,4,.94)",
        border: `1.5px solid ${ehPraga ? "rgba(43,32,16,.8)" : ladoCor}`,
        boxShadow: "0 1px 4px rgba(0,0,0,.85)",
        fontFamily: "Georgia, serif", fontWeight: 900, lineHeight: 1,
        color: ehPraga ? "#2b2010" : pColor, fontSize: f(1.2),
      }} title={ehPraga ? "Praga — resolve o efeito e deixa o campo" : "Poder"}>
        {/* Praga não tem Poder: mostra o número da praga, não um zero mentiroso. */}
        {ehPraga ? def.ordem : p}
      </div>
    </div>
  );
}

/* ============================ ZOOM DE CARTA =============================== */
const PART_COLOR = {
  base: "text-stone-300", acumulado: "text-amber-300", bencao: "text-emerald-300",
  inerte: "text-emerald-400/70", maldicao: "text-rose-300", continuo: "text-sky-300",
  maat: "text-yellow-300", julgado: "text-yellow-300",
};

export function ZoomModal({ zoom, onClose, onToggleActivate }) {
  const { def, printed, baked, current, sub, partes, onReturn, cardUid, cardOwner, aguardandoProxima, jaBufou } = zoom;   // zoom.custo = custo efetivo
  const shown = current != null ? current : printed + (baked || 0);
  const w = Math.min(320, typeof window !== "undefined" ? window.innerWidth * 0.78 : 320);
  const isHu = def.ativavelPorJogador;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" }}>
      <div className="duat-zoom" onClick={(e) => e.stopPropagation()} style={{ cursor: "default" }}>
        <Carta nome={def.nome} custo={zoom.custo != null ? zoom.custo : def.custo} poder={shown} tipo={def.tipo}
          efeito={def.texto} lore={def.lore} arch={def.arch} arte={def.arte} arteFoco={def.arteFoco} ordem={def.ordem} width={w} />
        <div className="text-center mt-2 text-sm text-stone-300" style={{ maxWidth: w }}>
          <div>{sub}</div>
          {onReturn && (
            <button onClick={onReturn}
              className="mt-2 w-full rounded border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20">
              ↩ Retornar para a mão
            </button>
          )}
          {isHu && onToggleActivate && !jaBufou && (
            <button onClick={() => {
              onToggleActivate(cardUid, cardOwner);
              onClose();
            }}
              disabled={jaBufou}
              className="mt-2 w-full rounded border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
              {aguardandoProxima ? "✓ Desativar" : "○ Ativar"}
            </button>
          )}
          <div className="text-xs text-stone-400 mt-0.5">
            Impresso {def.poder}{(baked || 0) !== 0 ? ` · Faixa ${baked > 0 ? "+" : ""}${baked}` : ""}{current != null && current !== printed + baked ? ` · Atual ${current}` : ""}
          </div>
          {partes && partes.length > 1 && (
            <div className="mt-2 text-left rounded border border-stone-700 bg-stone-900/70 px-2 py-1.5" style={{ maxWidth: w }}>
              <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-1">Composição do poder</div>
              {partes.map((p, i) => (
                <div key={i} className="flex justify-between gap-3 text-xs leading-5">
                  <span className={PART_COLOR[p.tipo]}>
                    {p.label}{p.tipo === "continuo" ? " · contínuo" : p.tipo === "inerte" ? " · inerte" : ""}
                  </span>
                  <span className={`tabular-nums ${PART_COLOR[p.tipo]}`}>
                    {p.tipo === "base" || p.tipo === "maat" ? p.val || "" : `${p.val > 0 ? "+" : ""}${p.val}`}
                  </span>
                </div>
              ))}
              <div className="flex justify-between gap-3 text-xs font-bold border-t border-stone-700 mt-1 pt-1">
                <span>Total</span><span className="tabular-nums">{shown}</span>
              </div>
            </div>
          )}
          <button onClick={onClose} className="mt-2 px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-xs">Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ============================ Subcomponentes ============================== */
export function Chip({ label, value, tone = "stone" }) {
  const t = tone === "amber" ? "text-amber-300" : tone === "sky" ? "text-sky-300" : "text-stone-200";
  return <div className="px-2 py-1 rounded-md bg-stone-800 border border-stone-700 text-xs"><span className="text-stone-500">{label} </span><span className={`font-bold ${t}`}>{value}</span></div>;
}

/* Miniatura da carta na mão: arte de fundo + custo (canto esq. sup.) +
   poder (canto dir. sup.) + nome na base. Substitui o chip de texto por uma
   leitura visual mais rica quando há espaço (desktop). Cartas que voltaram à
   mão com Faixa ganham uma borda âmbar e mostram a faixa acumulada, para o
   jogador saber que aquela carta mudou — sem precisar de uma seção separada. */
function HandThumb({ h, side, tone, g, sel, setSel, disabled, onZoom }) {
  const base = import.meta.env.BASE_URL;
  const def = byKey[h.key];
  const isSel = !!sel && sel.side === side && sel.hid === h.hid;
  const custo = custoDe(h);
  const afford = g.energy[side] >= custo;
  const agravada = custo > def.custo;
  const faixa = (h.baked || 0) !== 0;           // voltou à mão com poder alterado
  const poderExib = h.printed + (h.baked || 0);
  const envenenada = h.venenos && h.venenos.length > 0;
  const drawn = g.justDrew?.[side]?.includes(h.hid);
  const artSrc = def.arte ? `${base}cartas/${def.arte}.webp` : null;
  const accent = tone === "amber" ? "#fbbf24" : "#7dd3fc";
  const ring = isSel ? `2px solid ${accent}` : faixa ? "1.5px solid #f59e0b" : envenenada ? "1.5px solid #a3e635" : "1px solid #44403c";

  return (
    <div className={`relative ${drawn ? "duat-draw" : ""}`} style={{
      width: "100%", aspectRatio: "92 / 128", borderRadius: 8, overflow: "hidden",
      border: ring, background: artSrc ? "#000" : "#1c1917",
      opacity: disabled ? 0.5 : afford ? 1 : 0.55,
      cursor: disabled ? "default" : "pointer",
      boxShadow: isSel ? `0 0 10px ${accent}` : "0 2px 6px rgba(0,0,0,.5)",
    }}>
      <button disabled={disabled} onClick={() => setSel(isSel ? null : { side, hid: h.hid })}
        title={def.texto || "Carta base (sem efeito)"}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", padding: 0, border: "none", background: "transparent", cursor: "inherit" }}>
        {artSrc && <img src={artSrc} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: def.arteFoco || "center", opacity: 0.92 }} />}
        {/* Véu escuro no topo e na base para os números e o nome lerem */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,.7) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 58%, rgba(0,0,0,.55) 78%, rgba(0,0,0,.88) 100%)" }} />

        {/* Custo (canto esq. sup.) */}
        <div style={{
          position: "absolute", top: 3, left: 3, minWidth: 18, height: 18, padding: "0 4px",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          borderRadius: 5, background: "rgba(7,6,4,.9)", border: `1px solid ${agravada ? "#fb7185" : "rgba(247,233,192,.35)"}`,
          fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 11, lineHeight: 1,
          color: agravada ? "#fda4af" : "#fde68a", textShadow: "0 1px 2px rgba(0,0,0,.9)",
        }}>{custo}⚡</div>

        {/* Poder (canto dir. sup.) */}
        <div style={{
          position: "absolute", top: 3, right: 3, minWidth: 18, height: 18, padding: "0 4px",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          borderRadius: 5, background: "rgba(7,6,4,.9)", border: `1px solid ${faixa ? "#f59e0b" : "rgba(247,233,192,.35)"}`,
          fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 11, lineHeight: 1,
          color: faixa ? "#fbbf24" : "#f5f5f4", textShadow: "0 1px 2px rgba(0,0,0,.9)",
        }} title={faixa ? `Faixa ${poderExib}` : `Poder ${poderExib}`}>{poderExib}</div>

        {/* Arquétipo (glifo) logo abaixo do custo */}
        <div className={ARCH_COLOR[def.arch]} style={{ position: "absolute", top: 24, left: 4, fontSize: 12, lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,.95)" }}>{GLYPH[def.arch]}</div>

        {/* Nome na base */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 4px 4px",
          color: "#ece9e4", fontSize: 11, lineHeight: 1.05, textAlign: "center", letterSpacing: -0.1,
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
          textShadow: "0 1px 2px rgba(0,0,0,.9)",
        }}>{def.nomeCurto}</div>
      </button>

      {/* Lupa para ampliar */}
      <button onClick={(e) => { e.stopPropagation(); onZoom(h); }} title="Ampliar carta"
        style={{ position: "absolute", bottom: 2, right: 2, zIndex: 3, color: "#d6d3d1", fontSize: 11, lineHeight: 1, padding: 2, background: "rgba(0,0,0,.4)", border: "none", borderRadius: 4, cursor: "pointer" }}>🔍</button>
    </div>
  );
}

export function Hand({ side, tone, g, sel, setSel, disabled, onZoom }) {
  const accent = tone === "amber" ? "border-amber-600 text-amber-200" : "border-sky-600 text-sky-200";
  const hand = g.hand[side];
  const isPrio = g.priority === side;
  const props = { side, tone, g, sel, setSel, disabled, onZoom };
  /* Fila única em grade: as cartas que voltaram à mão (Múmia com Faixa,
     envenenadas) entram junto com as demais. A distinção fica na borda/rótulo
     da própria miniatura, não numa seção separada. A grade rola sozinha quando
     há mais cartas do que cabe na metade da coluna. */
  return (
    <div className={`rounded-lg border ${accent} p-2 flex flex-col`} style={{ backgroundColor: "#1c1a17", height: "100%", minHeight: 0 }}>
      <div className="flex items-center justify-between mb-1.5 px-1" style={{ flex: "0 0 auto" }}>
        <h3 className="text-xs font-semibold tracking-wide">{SIDE_NAME[side]} {isPrio && <span className="text-[10px] text-stone-400">· revela 1º</span>}</h3>
      </div>
      <div className="text-[10px] text-stone-500 px-1 mb-1" style={{ flex: "0 0 auto" }}>
        E{g.energy[side]} · deck {g.deck[side].length} · vistas {g.seen[side]} · mortes {g.deaths[side]}
      </div>
      <div className="grid gap-1.5 px-1 overflow-y-auto" style={{ gridTemplateColumns: "repeat(3, 1fr)", flex: "1 1 auto", minHeight: 0, alignContent: "start" }}>
        {hand.length === 0 && <span className="text-xs text-stone-600 py-2 col-span-3">Mão vazia.</span>}
        {hand.map((h) => <HandThumb key={h.hid} h={h} {...props} />)}
      </div>
    </div>
  );
}

/* ==========================================================================
   INTERFACE MOBILE — tela de jogo compacta (estilo "3 vias lado a lado").
   Reusa o mesmo estado e as mesmas ações do App, e os componentes de carta
   (MiniCard, ScoreDisc, EffectBadge). Nada de regra de jogo aqui.
   ========================================================================== */
export const mBtnBig = { flex: "1 1 auto", padding: "11px 10px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" };
export const mBtnSm = { flex: "0 0 auto", padding: "11px 12px", borderRadius: 9, border: "1px solid #44403c", background: "#292524", color: "#d6d3d1", fontSize: 14, cursor: "pointer" };
