// @ts-check
/* ==========================================================================
   BOTS — registro de níveis.

   Um nível de bot é só `{ label, decide }`. `decide` segue sempre a mesma
   assinatura (`{ state, side, rng } -> action | null`), então o controller e a
   UI nunca precisam saber QUAL nível estão rodando — só chamam o que está
   registrado aqui. Isso é o que permite trocar a implementação de um nível
   sem tocar em mais nada além deste arquivo e de `decide.js`.

   "facil" tem heurística de curva (Onda 2: gasta sempre a carta mais cara
   que cabe). "medio" agora joga de verdade também (Onda 4: avaliação de
   tabuleiro — ver `decideMedio` em `decide.js` e a nota em `evaluate.js`).
   "dificil" continua de fora do registro: a UI mostra as três opções, mas só
   habilita as que já jogam, para não prometer inteligência que ainda não
   existe.
   ========================================================================== */
import { decideFacil, decideMedio } from "./decide.js";

export const BOT_LEVELS = {
  facil: { label: "Fácil", decide: decideFacil, disponivel: true },
  medio: { label: "Médio", decide: decideMedio, disponivel: true },
  dificil: { label: "Difícil", decide: null, disponivel: false },
};

export const BOT_LEVEL_ORDER = ["facil", "medio", "dificil"];

export { decideFacil, decideMedio, legalPlacements } from "./decide.js";
