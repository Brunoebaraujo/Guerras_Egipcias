import { getEffect, registerEffect, resolveEffectPhase, listEffects } from "./registry.js";
import {
  aplicarBencao, byKey, pushLog, resolveConselheiro, resolveEscriba, resolveInvocar, resolveMacaco,
} from "../engine.js";

registerEffect("buffRandomAlly", {
  phase: "enter", priority: 100,
  target: { scope: "lane", relation: "ally", excludeSource: true, quantity: 1, mode: "random" },
  resolver: ({ state, source, definition, params, rng, targets }) => {
    const target = targets[0];
    if (!target) {
      pushLog(state, `${definition.nome}: sem aliado na via — efeito perdido.`);
      return { uid: source.uid, text: "sem alvo", kind: "block", seq: state.effectSeq };
    }
    aplicarBencao(state, target, params.value, definition.nome, { rng });
    pushLog(state, `${definition.nome} concedeu +${params.value} para ${byKey[target.key].nome}.`);
    return { uid: target.uid, text: `☀ +${params.value}`, kind: "buff", seq: state.effectSeq };
  },
});

registerEffect("buffNextDraw", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveEscriba(state, source, definition),
});

registerEffect("buffRandomHandCard", {
  phase: "enter", priority: 100,
  target: { scope: "hand", relation: "own", quantity: 1, mode: "random" },
  resolver: ({ state, source, definition, rng }) => resolveConselheiro(state, source, rng, definition),
});

registerEffect("summon", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveInvocar(state, source, definition),
});

registerEffect("moveAnimal", {
  phase: "enter", priority: 100,
  target: { scope: "board", relation: "own", type: "Animal", excludeSource: true, quantity: 1, mode: "random" },
  resolver: ({ state, source, definition, rng }) => resolveMacaco(state, source, rng, definition),
});

export { getEffect, resolveEffectPhase, listEffects };
