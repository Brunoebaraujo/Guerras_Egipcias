import React from "react";

/* Carta emoldurada: arte (atrás da janela transparente) + moldura por cima +
   campos vivos posicionados sobre as zonas da moldura.
   As posições (%) foram medidas na moldura 1024x1536 e ficam em POS —
   ajuste fino aqui se algum número/texto não cair exatamente no lugar. */

const GLYPH = {
  base: "𓂀", buff: "☀", debuff: "☾", sacrificio: "☥", reset: "⚖",
  silencio: "⊘", movimento: "⇄", crescimento: "⇑", fusao: "⛨", renascimento: "⟳",
  animal: "𓃒",
};
const TINT = {
  base: "#5c4a2a", buff: "#7a5f1f", debuff: "#33335f", sacrificio: "#2a5238",
  reset: "#5f2a34", silencio: "#5f2a34", movimento: "#2a4a5f", crescimento: "#7a5f1f",
  fusao: "#2a5252", renascimento: "#7a5f1f", animal: "#3f4a20",
};

// Zonas da moldura (em % do tamanho da carta)
const POS = {
  window: { left: "15%", top: "12.4%", width: "69.7%", height: "38.3%" },
  cost:   { left: "12.7%", top: "10.1%" }, // centro do disco azul (validado por render)
  power:  { left: "87.3%", top: "10.1%" }, // centro do disco vermelho (validado por render)
  name:   { left: "27%", top: "5.8%", width: "46%", height: "5.6%" },
  typebar:{ left: "15%", top: "51.5%", width: "70%", height: "5.5%" },
  text:   { left: "12%", top: "60.5%", width: "76%", height: "29.5%" },
};

/* --------------------------------------------------------------------------
   MOLDURA EM MEDALHÃO — as Pragas.

   O documento de design pede "medalhão circular ilustrado sobre painel
   retangular de regras". A distinção material é deliberada: as cartas da
   coleção são PAPIRO PINTADO (tinta escura sobre fundo claro, dentro da
   moldura.png); as Pragas são ESTELAS DE PEDRA — texto claro gravado em
   pedra escura. Praga não é um combatente que se joga na via: é um decreto.

   O anel do medalhão é ouro-lápis-ouro, que é o vocabulário material do
   próprio assunto (cloisonné egípcio: ouro com lápis-lazúli embutido).

   O conector é o elemento de assinatura, e carrega o NÚMERO da praga. Isso não
   é decoração: as dez pragas são uma sequência canônica, e a ordem é
   informação que o jogador reconhece.

   Pragas não têm Poder, então NÃO existe disco de Poder aqui. É metade da razão
   desta moldura existir.

   Toda a geometria é derivada de `width`, para a carta escalar em qualquer
   tamanho sem quebrar. u(n) = n × largura.
   -------------------------------------------------------------------------- */function CartaPraga({ nome, custo, ordem, tipo, efeito, lore, arch = "base", arte, arteFoco, width }) {
  const base = import.meta.env.BASE_URL;
  const u = (n) => n * width;
  const glyph = GLYPH[arch] || "𓂀";
  const tint = TINT[arch] || "#5c4a2a";
  const artSrc = arte ? base + "cartas/" + arte + ".webp" : null;

  const OURO = "#c8a24a", OURO_CLARO = "#f0dca4", LAPIS = "#1d2a55";
  const TINTA = "#eadfc4", TINTA_FRACA = "#b9a87f";

  /* Geometria. O painel de regras SOBREPÕE os 10% de baixo do medalhão, como o
     medalhão ritual pousado sobre a placa. O conector numerado fica em cima dos
     dois, na borda do painel, costurando as duas peças.
     Consequência assumida: 10% da altura do círculo fica coberta, então a arte
     precisa ter o assunto no centro — o que o bloco de composição já exige. */
  const D = u(0.62);                    // diâmetro do medalhão
  const topoMed = u(0.135);
  const sobrepor = D * 0.10;            // os 10% pedidos
  const topoPainel = topoMed + D - sobrepor;
  const DC = u(0.15);                   // conector
  const anelExterno = u(0.016), anelLapis = u(0.011);

  const nameSize = width * (nome.length > 24 ? 0.034 : nome.length > 14 ? 0.039 : 0.047);
  const efeitoSize = width * ((efeito || "").length > 110 ? 0.0335 : 0.038);
  const loreSize = width * ((lore || "").length > 140 ? 0.029 : 0.032);

  const disco = (d, conteudo, extra = {}) => (
    <div style={{
      width: d, height: d, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(circle at 35% 30%, ${OURO_CLARO}, ${OURO} 62%, #8a6b28)`,
      boxShadow: `0 ${u(0.006)}px ${u(0.014)}px rgba(0,0,0,.7), inset 0 0 ${u(0.01)}px rgba(255,255,255,.5)`,
      ...extra,
    }}>{conteudo}</div>
  );

  return (
    <div style={{
      position: "relative", width, aspectRatio: "1024 / 1536", userSelect: "none",
      borderRadius: u(0.045), overflow: "hidden",
      background: "linear-gradient(170deg, #241f19 0%, #16120e 45%, #0d0b08 100%)",
      border: `${u(0.007)}px solid ${OURO}`,
      boxShadow: `inset 0 0 ${u(0.06)}px rgba(0,0,0,.9)`,
      fontFamily: "Georgia, 'Times New Roman', serif",
    }}>
      {/* filete interno, a moldura da estela */}
      <div style={{ position: "absolute", inset: u(0.022), borderRadius: u(0.03), border: `${u(0.003)}px solid rgba(200,162,74,.38)`, pointerEvents: "none", zIndex: 4 }} />

      {/* MEDALHÃO — anel ouro / lápis / ouro */}
      <div style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)", top: topoMed, zIndex: 1,
        width: D, height: D, borderRadius: "50%", padding: anelExterno,
        background: `conic-gradient(from 210deg, #8a6b28, ${OURO_CLARO} 25%, ${OURO} 50%, #7d5f22 72%, ${OURO_CLARO} 100%)`,
        boxShadow: `0 ${u(0.01)}px ${u(0.03)}px rgba(0,0,0,.8)`,
      }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", padding: anelLapis, background: LAPIS }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: tint,
                        boxShadow: `inset 0 0 ${u(0.02)}px rgba(0,0,0,.75)` }}>
            {artSrc ? (
              <img src={artSrc} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: arteFoco || "center" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                            color: "rgba(255,255,255,.42)", fontSize: u(0.22) }}>{glyph}</div>
            )}
          </div>
        </div>
      </div>

      {/* PAINEL DE REGRAS — placa de pedra sobre o medalhão */}
      <div style={{
        position: "absolute", left: u(0.045), right: u(0.045), top: topoPainel, bottom: u(0.045), zIndex: 2,
        borderRadius: u(0.022), border: `${u(0.0035)}px solid rgba(200,162,74,.55)`,
        background: "linear-gradient(180deg, #2c2519 0%, #1c1711 40%, #12100c 100%)",
        boxShadow: `0 ${-u(0.008)}px ${u(0.024)}px rgba(0,0,0,.75), inset 0 ${u(0.004)}px 0 rgba(240,220,164,.16)`,
        display: "flex", flexDirection: "column", alignItems: "center",
        paddingTop: DC / 2 + u(0.028), paddingLeft: u(0.04), paddingRight: u(0.04), paddingBottom: u(0.035),
        overflow: "hidden",
      }}>
        {/* NOME */}
        <div style={{ width: "100%", minHeight: u(0.10), display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <span style={{ color: OURO_CLARO, fontWeight: 700, fontSize: nameSize, lineHeight: 1.1,
                         letterSpacing: u(0.004), textTransform: "uppercase" }}>{nome}</span>
        </div>

        {/* filete duplo + tipo: separa identidade de regras */}
        <div style={{ display: "flex", alignItems: "center", gap: u(0.03), width: "100%", marginTop: u(0.008) }}>
          <span style={{ flex: 1, height: u(0.004), background: `linear-gradient(90deg, transparent, ${OURO})` }} />
          <span style={{ color: OURO, fontSize: u(0.042), letterSpacing: u(0.012), textTransform: "uppercase", whiteSpace: "nowrap" }}>{tipo}</span>
          <span style={{ flex: 1, height: u(0.004), background: `linear-gradient(90deg, ${OURO}, transparent)` }} />
        </div>

        {/* TEXTO */}
        <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center",
                      gap: u(0.024), textAlign: "center", overflow: "hidden" }}>
          {efeito ? <span style={{ color: TINTA, fontSize: efeitoSize, lineHeight: 1.26, fontWeight: 600 }}>{efeito}</span> : null}
          {lore ? <span style={{ color: TINTA_FRACA, fontSize: loreSize, lineHeight: 1.24, fontStyle: "italic" }}>{lore}</span> : null}
        </div>
      </div>

      {/* CONECTOR — o número da praga, costurando medalhão e painel */}
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: topoPainel - DC / 2, zIndex: 3 }}>
        {disco(DC, <span style={{ color: "#2b2010", fontWeight: 800, fontSize: u(0.088), lineHeight: 1 }}>{ordem}</span>,
          { border: `${u(0.005)}px solid #16120e` })}
      </div>

      {/* custo à esquerda, glifo do arquétipo à direita — mesma leitura das outras cartas */}
      <div style={{ position: "absolute", left: u(0.045), top: u(0.038), zIndex: 5 }}>
        {disco(u(0.175), <span style={{ color: "#2b2010", fontWeight: 800, fontSize: u(0.105), lineHeight: 1 }}>{custo}</span>)}
      </div>
      <div style={{ position: "absolute", right: u(0.06), top: u(0.055), zIndex: 5,
                    fontSize: u(0.085), lineHeight: 1, opacity: 0.85, color: OURO }}>{glyph}</div>
    </div>
  );
}

export default function Carta({
  nome, custo, poder, tipo, efeito, lore, arch = "base", arte, arteFoco, ordem, width = 240,
}) {
  // Pragas usam a moldura em medalhão: sem disco de Poder, com conector numerado.
  if (tipo === "Praga")
    return <CartaPraga nome={nome} custo={custo} ordem={ordem} tipo={tipo} efeito={efeito}
      lore={lore} arch={arch} arte={arte} arteFoco={arteFoco} width={width} />;

  const base = import.meta.env.BASE_URL;
  const glyph = GLYPH[arch] || "𓂀";
  const tint = TINT[arch] || "#5c4a2a";
  const artSrc = arte ? base + "cartas/" + arte + ".webp" : null;

  // Fonte do nome encolhe conforme o comprimento (nomes de 2 linhas cabem na placa)
  // A fonte grande (0.046) so e segura em nome de 1 linha: duas linhas a esse
// tamanho estouram a placa (teto vertical = 0.0389*width). Limiar em 11 ch.
  const nameSize = width * (nome.length > 24 ? 0.032 : nome.length > 11 ? 0.036 : 0.046);
  const efeitoSize = width * ((efeito || "").length > 90 ? 0.037 : 0.040);
  const loreSize = width * ((lore || "").length > 110 ? 0.031 : 0.035);

  const num = {
    position: "absolute", transform: "translate(-50%,-50%)", zIndex: 20,
    fontWeight: 800, color: "#f7e9c0", textShadow: "0 2px 4px rgba(0,0,0,.85)",
    fontSize: width * 0.105, lineHeight: 1, fontFamily: "Georgia, 'Times New Roman', serif",
  };

  return (
    <div style={{ position: "relative", width, aspectRatio: "1024 / 1536", userSelect: "none" }}>
      {/* Camada de arte (atrás da janela transparente da moldura) */}
      <div style={{ position: "absolute", ...POS.window, overflow: "hidden", zIndex: 0, background: tint }}>
        {artSrc ? (
          <img src={artSrc} alt={nome} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: arteFoco || "center" }} />
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
      <div style={{ position: "absolute", ...POS.name, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 3%", overflow: "hidden" }}>
        <span style={{ color: "#3a2b12", fontWeight: 800, fontFamily: "Georgia, serif", fontSize: nameSize, lineHeight: 1.08, letterSpacing: 0.2, textTransform: "uppercase" }}>{nome}</span>
      </div>

      {/* Tipo / categoria */}
      <div style={{ position: "absolute", ...POS.typebar, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#4a3618", fontWeight: 700, fontFamily: "Georgia, serif", fontSize: width * 0.044, letterSpacing: 0.6, textTransform: "uppercase" }}>{glyph} {tipo}</span>
      </div>

      {/* Efeito + Lore (papiro) */}
      <div style={{ position: "absolute", ...POS.text, zIndex: 20, display: "flex", flexDirection: "column", justifyContent: "center", gap: width * 0.016, textAlign: "center", color: "#3a2b12", fontFamily: "Georgia, serif", overflow: "hidden" }}>
        {efeito ? <span style={{ fontSize: efeitoSize, lineHeight: 1.22, fontWeight: 600 }}>{efeito}</span> : null}
        {lore ? <span style={{ fontSize: loreSize, lineHeight: 1.22, fontStyle: "italic", opacity: 0.85 }}>{lore}</span> : null}
      </div>
    </div>
  );
}
