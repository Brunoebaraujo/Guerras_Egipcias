import React from "react";

export default function MainMenu({ onSolo, onMultiplayer, onDecks, onGallery }) {
  return (
    <div style={{
      minHeight: "100dvh",
      width: "100%",
      backgroundImage: "url(/guerras-bg.webp)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      backgroundRepeat: "no-repeat",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      overflow: "hidden",
    }}>
      {/* Overlay escuro para melhorar legibilidade */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)",
        pointerEvents: "none",
      }} />

      {/* Buttons container - centered */}
      <div style={{
        position: "relative",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "24px",
        width: "100%",
        maxWidth: 380,
      }}>
        <button
          onClick={onSolo}
          style={{
            padding: "16px 28px",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            color: "#1f1f1f",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(251, 191, 36, 0.5)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 10px 28px rgba(251, 191, 36, 0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(251, 191, 36, 0.5)";
          }}
        >
          ⚔️ Solo (Hotseat)
        </button>

        <button
          onClick={onMultiplayer}
          style={{
            padding: "16px 28px",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            color: "#e0e7ff",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(124, 58, 237, 0.5)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 10px 28px rgba(124, 58, 237, 0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(124, 58, 237, 0.5)";
          }}
        >
          🌐 Multiplayer
        </button>

        <button
          onClick={onDecks}
          style={{
            padding: "16px 28px",
            fontSize: 16,
            fontWeight: 700,
            border: "none",
            borderRadius: 10,
            background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
            color: "#164e63",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(6, 182, 212, 0.5)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 10px 28px rgba(6, 182, 212, 0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(6, 182, 212, 0.5)";
          }}
        >
          🎴 Decks
        </button>
      </div>
    </div>
  );
}
