import React from "react";

/* Carta emoldurada: arte (atrás da janela transparente) + moldura por cima +
   campos vivos posicionados sobre as zonas da moldura.
   As posições (%) foram medidas na moldura 1024x1536 e ficam em POS —
   ajuste fino aqui se algum número/texto não cair exatamente no lugar. */

const GLYPH = {
  base: "𓂀", buff: "☀", debuff: "☾", sacrificio: "☥", reset: "⚖",
  silencio: "⊘", movimento: "⇄", crescimento: "⇑", fusao: "⛨", renascimento: "⟳",
};
const TINT = {
  base: "#5c4a2a", buff: "#7a5f1f", debuff: "#33335f", sacrificio: "#2a5238",
  reset: "#5f2a34", silencio: "#5f2a34", movimento: "#2a4a5f", crescimento: "#7a5f1f",
  fusao: "#2a5252", renascimento: "#7a5f1f",
};

// Zonas da moldura (em % do tamanho da carta)
const POS = {
  window: { left: "15%", top: "12.4%", width: "69.7%", height: "38.3%" },
  cost:   { left: "15.5%", top: "10.5%" }, // centro do disco azul
  power:  { left: "84.5%", top: "10.5%" }, // centro do disco vermelho
  name:   { left: "29%", top: "3%", width: "42%", height: "7.5%" },
  typebar:{ left: "15%", top: "51.5%", width: "70%", height: "5.5%" },
  text:   { left: "10%", top: "60%", width: "80%", height: "29%" },
};

export default function Carta({
  nome, custo, poder, tipo, efeito, lore, arch = "base", arte, width = 240,
}) {
  const base = import.meta.env.BASE_URL;
  const glyph = GLYPH[arch] || "𓂀";
  const tint = TINT[arch] || "#5c4a2a";
  const artSrc = arte ? base + "cartas/" + arte + ".webp" : null;

  const num = {
    position: "absolute", transform: "translate(-50%,-50%)", zIndex: 20,
    fontWeight: 800, color: "#f7e9c0", textShadow: "0 2px 4px rgba(0,0,0,.85)",
    fontSize: width * 0.125, lineHeight: 1, fontFamily: "Georgia, 'Times New Roman', serif",
  };

  return (
    <div style={{ position: "relative", width, aspectRatio: "1024 / 1536", userSelect: "none" }}>
      {/* Camada de arte (atrás da janela transparente da moldura) */}
      <div style={{ position: "absolute", ...POS.window, overflow: "hidden", zIndex: 0, background: tint }}>
        {artSrc ? (
          <img src={artSrc} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.5)", fontSize: width * 0.26 }}>
            {glyph}
          </div>
        )}
      </div>

      {/* Moldura por cima */}
      <img src={base + "moldura.png"} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 10, pointerEvents: "none" }} />

      {/* Números vivos (canto superior esquerdo = custo, direito = poder) */}
      <div style={{ ...num, left: POS.cost.left, top: POS.cost.top }}>{custo}</div>
      <div style={{ ...num, left: POS.power.left, top: POS.power.top }}>{poder}</div>

      {/* Nome */}
      <div style={{ position: "absolute", ...POS.name, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 2%" }}>
        <span style={{ color: "#3a2b12", fontWeight: 800, fontFamily: "Georgia, serif", fontSize: width * 0.05, lineHeight: 1.05, letterSpacing: 0.2, textTransform: "uppercase" }}>{nome}</span>
      </div>

      {/* Tipo / categoria */}
      <div style={{ position: "absolute", ...POS.typebar, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#4a3618", fontWeight: 700, fontFamily: "Georgia, serif", fontSize: width * 0.048, letterSpacing: 0.5, textTransform: "uppercase" }}>{glyph} {tipo}</span>
      </div>

      {/* Efeito + Lore (papiro) */}
      <div style={{ position: "absolute", ...POS.text, zIndex: 20, display: "flex", flexDirection: "column", gap: width * 0.018, textAlign: "center", color: "#3a2b12", fontFamily: "Georgia, serif", overflow: "hidden" }}>
        {efeito ? <span style={{ fontSize: width * 0.05, lineHeight: 1.18, fontWeight: 600 }}>{efeito}</span> : null}
        {lore ? <span style={{ fontSize: width * 0.045, lineHeight: 1.18, fontStyle: "italic", opacity: 0.85 }}>{lore}</span> : null}
      </div>
    </div>
  );
}
