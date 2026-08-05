import React, { useState, useEffect } from "react";

/* Tela inicial: a arte épica preenche o fundo e três botões flutuam sobre ela.
   O caminho da imagem PRECISA passar por import.meta.env.BASE_URL — no GitHub
   Pages o site vive em /Guerras_Egipcias/, então um "/guerras-bg.webp" cru
   apontaria para a raiz do domínio (404). É o mesmo motivo pelo qual a arte
   das cartas usa base + "cartas/...".

   Duas artes: retrato (mobile) e paisagem (desktop). A troca é por largura de
   viewport — a mesma fronteira que o App usa para escolher a interface. */
export default function MainMenu({ onSolo, onMultiplayer, onDecks }) {
  const base = import.meta.env.BASE_URL;

  // Largura da tela decide qual arte usar. 820px é a mesma fronteira do App.
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const isDesktop = w >= 820;
  const bg = base + (isDesktop ? "guerras-bg-desktop.webp" : "guerras-bg.webp");

  const btnBase = {
    padding: "14px 26px",
    fontSize: 16,
    fontWeight: 700,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    whiteSpace: "nowrap",
  };

  const hover = (e, shadow) => {
    e.currentTarget.style.transform = "translateY(-3px)";
    e.currentTarget.style.boxShadow = shadow;
  };
  const unhover = (e, shadow) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = shadow;
  };

  const soloShadow = "0 6px 20px rgba(251, 191, 36, 0.5)";
  const soloShadowHi = "0 10px 28px rgba(251, 191, 36, 0.7)";
  const mpShadow = "0 6px 20px rgba(124, 58, 237, 0.5)";
  const mpShadowHi = "0 10px 28px rgba(124, 58, 237, 0.7)";
  const deckShadow = "0 6px 20px rgba(6, 182, 212, 0.5)";
  const deckShadowHi = "0 10px 28px rgba(6, 182, 212, 0.7)";

  return (
    <div style={{
      minHeight: "100dvh",
      width: "100%",
      backgroundColor: "#000",
      backgroundImage: `url(${bg})`,
      backgroundSize: "contain",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    }}>
      {/* Véu escuro leve para os botões destacarem da arte */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 100%)",
        pointerEvents: "none",
      }} />

      {/* Botões centralizados verticalmente sobre a arte */}
      <div style={{
        position: "relative",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        width: "100%",
        maxWidth: 560,
        padding: "0 20px",
      }}>
        {/* Linha 1: Solo + Multiplayer lado a lado */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", width: "100%" }}>
          <button
            onClick={onSolo}
            style={{
              ...btnBase,
              backgroundImage: `url(${base}btn-hotseat.webp)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: "#fbbf24",
              boxShadow: soloShadow,
              flex: "1 1 200px",
              maxWidth: 260,
              position: "relative",
              overflow: "hidden",
              textShadow: "0 0 8px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6)",
              fontWeight: 800,
            }}
            onMouseEnter={(e) => hover(e, soloShadowHi)}
            onMouseLeave={(e) => unhover(e, soloShadow)}
          >
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.35)",
              pointerEvents: "none",
            }} />
            <span style={{ position: "relative", zIndex: 2 }}>⚔️ Solo (Hotseat)</span>
          </button>
          <button
            onClick={onMultiplayer}
            style={{
              ...btnBase,
              backgroundImage: `url(${base}btn-multiplayer.webp)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              color: "#06b6d4",
              boxShadow: mpShadow,
              flex: "1 1 200px",
              maxWidth: 260,
              position: "relative",
              overflow: "hidden",
              textShadow: "0 0 8px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6)",
              fontWeight: 800,
            }}
            onMouseEnter={(e) => hover(e, mpShadowHi)}
            onMouseLeave={(e) => unhover(e, mpShadow)}
          >
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.35)",
              pointerEvents: "none",
            }} />
            <span style={{ position: "relative", zIndex: 2 }}>🌐 Multiplayer</span>
          </button>
        </div>

        {/* Linha 2: Decks centralizado */}
        <button
          onClick={onDecks}
          style={{
            ...btnBase,
            backgroundImage: `url(${base}btn-decks.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "#06b6d4",
            boxShadow: deckShadow,
            width: "100%",
            maxWidth: 260,
            position: "relative",
            overflow: "hidden",
            textShadow: "0 0 8px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6)",
            fontWeight: 800,
          }}
          onMouseEnter={(e) => hover(e, deckShadowHi)}
          onMouseLeave={(e) => unhover(e, deckShadow)}
        >
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            pointerEvents: "none",
          }} />
          <span style={{ position: "relative", zIndex: 2 }}>🎴 Decks</span>
        </button>
      </div>
    </div>
  );
}
