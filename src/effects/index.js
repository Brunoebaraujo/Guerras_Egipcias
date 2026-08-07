import { getEffect, registerEffect, resolveEffectPhase, listEffects } from "./registry.js";
import {
  aplicarBencao, byKey, descarregarPendentes, pushLog,
  resolveAnubis, resolveArmadura, resolveAssassino, resolveConselheiro,
  resolveDestroyAllOfTypeInLane, resolveDestroyOwnLane, resolveEscriba,
  resolveHeka, resolveInvocar, resolveKhnum, resolveMacaco, resolveSemerj,
  resolveSeqerMau, resolveSekhmet, resolveSet, resolveSobek, resolveAfogamento,
  resolveCabraDoNilo, resolveApis,
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

registerEffect("reserveNextReveal", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveHeka(state, source, definition),
});

registerEffect("scatterEnemies", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition, rng }) => {
    const { movidas } = resolveSet(state, source, rng, definition);
    return { uid: source.uid, text: movidas.length ? `⇄ ${movidas.length}` : "⇄ —", kind: movidas.length ? "debuff" : "block", seq: state.effectSeq };
  },
});

registerEffect("sacrificeLane", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition, params }) => params.absorb
    ? resolveDestroyOwnLane(state, source, true, definition)
    : resolveSobek(state, source),
});

registerEffect("summonSwarm", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveDestroyOwnLane(state, source, true, definition),
});

registerEffect("destroyLaneType", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, params }) => resolveDestroyAllOfTypeInLane(state, source, params.type),
});

registerEffect("fuseWithAlly", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, rng }) => resolveArmadura(state, source, rng),
});

registerEffect("destroyGlobalCost", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, params }) => resolveSekhmet(state, source, params.cost),
});

registerEffect("destroyLaneCosts", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveAfogamento(state, source, definition),
});

registerEffect("flushPendingBlessings", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, rng }) => {
    const { ondas } = descarregarPendentes(state, source, rng);
    return ondas ? { uid: source.uid, text: `✦ ${ondas}×`, kind: "buff", seq: state.effectSeq } : null;
  },
});

registerEffect("judgeLane", {
  phase: "enter", priority: 100,
  resolver: ({ state, source }) => {
    const { nivel, julgadas } = resolveAnubis(state, source);
    return { uid: source.uid, text: nivel === null ? "⚖ —" : `⚖ =${nivel}`, kind: julgadas.length ? "debuff" : "block", seq: state.effectSeq };
  },
});

registerEffect("growPerBlessedAlly", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveKhnum(state, source, definition),
});

registerEffect("poisonRandomEnemies", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition, rng }) => resolveAssassino(state, source, definition, rng),
});

registerEffect("replicatePoison", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveSemerj(state, source, definition),
});

registerEffect("triggerPoisonDamage", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveSeqerMau(state, source, definition),
});

registerEffect("echoLastEntry", {
  phase: "enter", priority: 100, copyable: false,
  resolver: () => null,
});

registerEffect("growPerLaneAnimal", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveCabraDoNilo(state, source, definition),
});

registerEffect("growPerBoardAnimal", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveApis(state, source, definition),
});

for (const [id, phase] of [
  ["auraAllOtherAllies", "continuous"],
  ["resetLaneToPrinted", "continuous"],
  ["growPerDeath", "continuous"],
  ["returnToHandOnDeath", "death"],
  ["blockEnemyEntryInLane", "continuous"],
  ["anthemType", "continuous"],
  ["moveOnceNextRound", "passive"],
  ["growPerLaterPlay", "continuous"],
  ["rebirthOnDeath", "death"],
  ["absorbDestroyedPower", "continuous"],
  ["protectLaneFromTargets", "continuous"],
  ["growWhenOwnAnimalDies", "death-reaction"],
  ["growPerFullLane", "continuous"],
  ["activateTransferPower", "activated"],
  ["resolvePlague", "enter"],
]) {
  registerEffect(id, { phase, resolver: () => null });
}

export { getEffect, resolveEffectPhase, listEffects };
