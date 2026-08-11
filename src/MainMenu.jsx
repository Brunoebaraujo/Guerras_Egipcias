import { useState, useEffect } from "react";

export default function MainMenu({ onSolo, onMultiplayer, onDecks, onBot }) {
  const base = import.meta.env.BASE_URL;
  const [showMenu, setShowMenu] = useState(false);

  // Largura da tela decide qual arte usar. 820px é a mesma fronteira do App.
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const isDesktop = w >= 820;
  const bg = base + (isDesktop ? "guerras-bg-desktop.webp" : "guerras-bg.webp");

  const hoverTransform = (e) => {
    e.currentTarget.style.transform = "scale(1.05)";
  };
  const unhoverTransform = (e) => {
    e.currentTarget.style.transform = "scale(1)";
  };

  // Halo dourado para os botões quadrados
  const haloShadow = "0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4), inset 0 0 10px rgba(251, 191, 36, 0.2)";
  const haloShadowHi = "0 0 30px rgba(251, 191, 36, 1), 0 0 60px rgba(251, 191, 36, 0.6), inset 0 0 15px rgba(251, 191, 36, 0.3)";
  // Halo magenta do botão do Bot — mesma moldura dos outros três, cor própria
  // pra identificar o modo "vs Bot" no resto da interface.
  const haloShadowBot = "0 0 20px rgba(217, 70, 239, 0.7), 0 0 40px rgba(217, 70, 239, 0.35), inset 0 0 10px rgba(217, 70, 239, 0.2)";
  const haloShadowBotHi = "0 0 30px rgba(217, 70, 239, 0.95), 0 0 60px rgba(217, 70, 239, 0.55), inset 0 0 15px rgba(217, 70, 239, 0.3)";

  if (!showMenu) {
    // Primeira tela: só fundo + botão "Iniciar"
    return (
      <div style={{
        height: "100dvh",
        width: "100%",
        backgroundColor: "#000",
        backgroundImage: `url(${bg})`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        position: "relative",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        paddingBottom: "120px",
        overflow: "hidden",
      }}>
        <button
          onClick={() => setShowMenu(true)}
          style={{
            padding: "10px 24px",
            fontSize: 18,
            fontWeight: 700,
            color: "#fbbf24",
            backgroundColor: "#000",
            border: "2px solid #fbbf24",
            borderRadius: 6,
            cursor: "pointer",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap",
            boxShadow: "0 0 10px rgba(251, 191, 36, 0.4)",
            position: "relative",
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 20px rgba(251, 191, 36, 0.8)";
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 0 10px rgba(251, 191, 36, 0.4)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Iniciar
        </button>
      </div>
    );
  }

  // Terceira tela: menu com 4 botões em grade 2×2 (2 colunas, 2 por coluna) —
  // encaixa sem rolagem na maioria dos aparelhos; a versão anterior empilhava
  // os 4 botões numa coluna só e estourava a tela em telas menores/3G.
  const itens = [
    {
      key: "solo", onClick: onSolo, title: "Solo (Hotseat)", label: "1v1 Hotseat",
      bg: `url(${base}btn-hotseat.webp)`, color: "#fbbf24", glow: haloShadow, glowHi: haloShadowHi,
    },
    {
      key: "mp", onClick: onMultiplayer, title: "Multiplayer", label: "Multiplayer Online",
      bg: `url(${base}btn-multiplayer.webp)`, color: "#06b6d4", glow: haloShadow, glowHi: haloShadowHi,
    },
    {
      key: "bot", onClick: onBot, title: "Jogar contra Bot", label: "Jogar contra Bot",
      bg: `url(${base}btn-bot.webp)`,
      color: "#e879f9", glow: haloShadowBot, glowHi: haloShadowBotHi,
    },
    {
      key: "decks", onClick: onDecks, title: "Decks", label: "Construir Decks",
      bg: `url(${base}btn-decks.webp)`, color: "#06b6d4", glow: haloShadow, glowHi: haloShadowHi,
    },
  ];

  return (
    <div style={{
      height: "100dvh",
      width: "100%",
      backgroundColor: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      padding: "20px",
      overflow: "hidden",
      boxSizing: "border-box",
    }}>
      {/* Grade 2×2 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(120px, 150px))",
        columnGap: 22,
        rowGap: 28,
        maxWidth: 340,
        width: "100%",
        justifyContent: "center",
      }}>
        {itens.map((item) => (
          <div key={item.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
            <button
              onClick={item.onClick}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                ...(item.emoji
                  ? { background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(36px, 12vw, 52px)" }
                  : { backgroundImage: item.bg, backgroundSize: "cover", backgroundPosition: "center" }),
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: item.glow,
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = item.glowHi;
                hoverTransform(e);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = item.glow;
                unhoverTransform(e);
              }}
              title={item.title}
            >
              {item.emoji}
            </button>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: item.color,
              textAlign: "center",
              textShadow: `0 0 8px ${item.color}66`,
            }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
