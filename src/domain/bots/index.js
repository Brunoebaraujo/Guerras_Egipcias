// @ts-check
/* ==========================================================================
   BOTS — registro de níveis.

   Um nível de bot é só `{ label, decide }`. `decide` segue sempre a mesma
   assinatura (`{ state, side, rng } -> action | null`), então o controller e a
   UI nunca precisam saber QUAL nível estão rodando — só chamam o que está
   registrado aqui. Isso é o que permite trocar a implementação de um nível
   sem tocar em mais nada além deste arquivo e de `decide.js`.

   "facil" agora tem heurística de verdade (Onda 2: gasta sempre a carta mais
   cara que cabe, sem sinergia nem preferência de via — ver `decideFacil` em
   `decide.js`). "medio" e "dificil" continuam de fora do registro: a UI
   mostra as três opções, mas só habilita a que já joga, para não prometer
   inteligência que ainda não existe.
   ========================================================================== */
import { decideFacil } from "./decide.js";

export const BOT_LEVELS = {
  facil: { label: "Fácil", decide: decideFacil, disponivel: true },
  medio: { label: "Médio", decide: null, disponivel: false },
  dificil: { label: "Difícil", decide: null, disponivel: false },
};

export const BOT_LEVEL_ORDER = ["facil", "medio", "dificil"];

export { decideFacil, decideRandomPlacement, legalPlacements } from "./decide.js";
