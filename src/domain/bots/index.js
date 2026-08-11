// @ts-check
/* ==========================================================================
   BOTS — registro de níveis.

   Um nível de bot é só `{ label, decide }`. `decide` segue sempre a mesma
   assinatura (`{ state, side, rng } -> action | null`), então o controller e a
   UI nunca precisam saber QUAL nível estão rodando — só chamam o que está
   registrado aqui. Isso é o que permite trocar a implementação de um nível
   (ex.: "fácil" ganhar heurística de verdade na Onda 2) sem tocar em mais
   nada.

   Hoje só "facil" está com decisão real (e mesmo essa é o placeholder
   aleatório da Onda 1 — a Onda 2 troca por uma heurística de curva/custo).
   "medio" e "dificil" ficam de fora do registro por enquanto: a UI mostra as
   três opções, mas só habilita a que já joga, para não prometer inteligência
   que ainda não existe.
   ========================================================================== */
import { decideRandomPlacement } from "./decide.js";

export const BOT_LEVELS = {
  facil: { label: "Fácil", decide: decideRandomPlacement, disponivel: true },
  medio: { label: "Médio", decide: null, disponivel: false },
  dificil: { label: "Difícil", decide: null, disponivel: false },
};

export const BOT_LEVEL_ORDER = ["facil", "medio", "dificil"];

export { decideRandomPlacement, legalPlacements } from "./decide.js";
