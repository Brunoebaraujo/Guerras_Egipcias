import { matchResult } from "../../engine.js";

const BANNER = { ar: 1277 / 537, painel: { left: 10.26, top: 24.95, width: 79.33, height: 64.99 } };

export function BannerVitoria({ g, online, mySeat, onFechar }) {
  if (!g?.finished) return null;
  const base = import.meta.env.BASE_URL;
  const r = matchResult(g);
  const empate = r.side === -1;

  let linhas, cor;
  if (empate) { linhas = ["Empate"]; cor = "#e7e5e4"; }
  else if (online) {
    const ganhei = r.side === mySeat;
    linhas = [ganhei ? "Vitória" : "Derrota"];
    cor = ganhei ? "#fbbf24" : "#f87171";
  } else {
    /* Duas linhas: "Lado A" em cima, "venceu" embaixo. Em uma linha só a frase
       não cabe na largura do painel — o miolo é largo, mas não tanto. */
    linhas = [`Lado ${r.side === 0 ? "A" : "B"}`, "venceu"];
    cor = "#fbbf24";
  }

  /* Corpo do texto: o MENOR entre o que cabe na largura (pela linha mais longa)
     e o que cabe na altura (pelo número de linhas). Tudo em fração da largura
     do banner, que é o único comprimento conhecido aqui.

     0.80 é a largura média de uma letra em Georgia 900 versalete, em `em`.
     A primeira tentativa usou 0.62 — valor de minúsculas — e a frase furou o
     painel pelos dois lados. Versalete é bem mais largo do que a intuição diz.

     O 0.88 e o 1.25 são folga deliberada. Sem eles "Vitória" enche a largura do
     painel EXATO, e qualquer diferença de métrica da fonte (outro sistema, um
     fallback entrando no lugar da Georgia) volta a encostar no ouro. */
  const L = "min(92vw, 860px)";
  const maiorLinha = Math.max(...linhas.map((t) => t.length));
  const painelW = BANNER.painel.width / 100;                       // fração da largura
  const painelH = (BANNER.painel.height / 100) / BANNER.ar;        // idem, via razão de aspecto
  const porLargura = (painelW * 0.88) / (0.80 * maiorLinha);
  const porAltura = painelH / (linhas.length * 1.25);
  const corpo = `calc(${L} * ${Math.min(porLargura, porAltura).toFixed(4)})`;

  return (
    <div onClick={onFechar} style={{
      position: "fixed", inset: 0, zIndex: 60, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(6,5,3,.55)", backdropFilter: "blur(1.5px)",
    }}>
      <div className="duat-banner" style={{ position: "relative", width: L, aspectRatio: `${BANNER.ar}` }}>
        {/* A moldura é <img>, e não background: assim o alfa do arquivo é o alfa
            na tela, sem nada opaco por baixo para o brilho colar. */}
        <img src={`${base}banner-vitoria.webp`} alt="" style={{ display: "block", width: "100%", height: "100%" }} />
        <div style={{
          position: "absolute",
          left: `${BANNER.painel.left}%`, top: `${BANNER.painel.top}%`,
          width: `${BANNER.painel.width}%`, height: `${BANNER.painel.height}%`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 1%",
        }}>
          {linhas.map((t) => (
            <span key={t} style={{
              fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 900,
              fontSize: corpo, lineHeight: 1.05, color: cor, whiteSpace: "nowrap",
              textTransform: "uppercase", letterSpacing: "0.02em",
              textShadow: `0 0 0.22em ${cor}88, 0 0.03em 0.06em rgba(0,0,0,.95)`,
            }}>{t}</span>
          ))}
        </div>
      </div>
      <span style={{ marginTop: 14, color: "#a8a29e", fontFamily: "Georgia, serif", fontSize: 13 }}>
        toque para ver o tabuleiro
      </span>
    </div>
  );
}


