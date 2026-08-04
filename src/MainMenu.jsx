import React from "react";

export default function MainMenu({ onSolo, onMultiplayer, onDecks, onGallery }) {
  return (
    <div style={{
      minHeight: "100dvh",
      width: "100%",
      backgroundImage: "url(/guerras-bg.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
      position: "relative",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      overflow: "hidden",
    }}>
      {/* Overlay escuro para melhorar legibilidade */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)",
        pointerEvents: "none",
      }} />

      {/* Logo no topo */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "24px 16px",
        textAlign: "center",
        zIndex: 10,
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#fde68a",
          margin: 0,
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          letterSpacing: 1,
        }}>𓂀 GUERRAS EGÍPCIAS</h1>
      </div>

      {/* Buttons container */}
      <div style={{
        position: "relative",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "24px",
        marginBottom: "40px",
        width: "100%",
        maxWidth: 320,
      }}>
        <button
          onClick={onSolo}
          style={{
            padding: "16px 24px",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            color: "#1f1f1f",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(251, 191, 36, 0.4)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(251, 191, 36, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(251, 191, 36, 0.4)";
          }}
        >
          ⚔️ Solo (Hotseat)
        </button>

        <button
          onClick={onMultiplayer}
          style={{
            padding: "16px 24px",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            color: "#e0e7ff",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(124, 58, 237, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(124, 58, 237, 0.4)";
          }}
        >
          🌐 Multiplayer
        </button>

        <button
          onClick={onDecks}
          style={{
            padding: "16px 24px",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
            color: "#164e63",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(6, 182, 212, 0.4)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(6, 182, 212, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(6, 182, 212, 0.4)";
          }}
        >
          🎴 Decks
        </button>

        <button
          onClick={onGallery}
          style={{
            padding: "16px 24px",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
            color: "#fdf2f8",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(236, 72, 153, 0.4)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(236, 72, 153, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(236, 72, 153, 0.4)";
          }}
        >
          📖 Galeria
        </button>
      </div>
    </div>
  );
}
