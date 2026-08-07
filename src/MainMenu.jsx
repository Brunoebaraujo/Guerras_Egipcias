import { useState, useEffect } from "react";

export default function MainMenu({ onSolo, onMultiplayer, onDecks }) {
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

  // Segunda tela: menu com 3 botões quadrados enfileirados verticalmente
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
      {/* Coluna dos 3 botões com labels */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
        maxWidth: 300,
        width: "100%",
      }}>
        {/* Solo (Hotseat) */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          width: "100%",
        }}>
          <button
            onClick={onSolo}
            style={{
              width: 160,
              height: 160,
              backgroundImage: `url(${base}btn-hotseat.webp)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: haloShadow,
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = haloShadowHi;
              hoverTransform(e);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = haloShadow;
              unhoverTransform(e);
            }}
            title="Solo (Hotseat)"
          />
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#fbbf24",
            textAlign: "center",
            textShadow: "0 0 8px rgba(251, 191, 36, 0.4)",
          }}>
            1v1 Hotseat
          </div>
        </div>

        {/* Multiplayer */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          width: "100%",
        }}>
          <button
            onClick={onMultiplayer}
            style={{
              width: 160,
              height: 160,
              backgroundImage: `url(${base}btn-multiplayer.webp)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: haloShadow,
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = haloShadowHi;
              hoverTransform(e);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = haloShadow;
              unhoverTransform(e);
            }}
            title="Multiplayer"
          />
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#06b6d4",
            textAlign: "center",
            textShadow: "0 0 8px rgba(6, 182, 212, 0.4)",
          }}>
            Multiplayer Online
          </div>
        </div>

        {/* Decks */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          width: "100%",
        }}>
          <button
            onClick={onDecks}
            style={{
              width: 160,
              height: 160,
              backgroundImage: `url(${base}btn-decks.webp)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: haloShadow,
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = haloShadowHi;
              hoverTransform(e);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = haloShadow;
              unhoverTransform(e);
            }}
            title="Decks"
          />
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#06b6d4",
            textAlign: "center",
            textShadow: "0 0 8px rgba(6, 182, 212, 0.4)",
          }}>
            Construir Decks
          </div>
        </div>
      </div>
    </div>
  );
}
