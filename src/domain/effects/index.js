import { getEffect, registerEffect, resolveEffectPhase, listEffects, temEfeitoDeFase } from "./registry.js";
import {
  aplicarBencao, byKey, CARDS, TOKENS, descarregarPendentes, pushLog,
  resolveAnubis, resolveArmadura, resolveAssassino, resolveConselheiro,
  resolveDestroyAllOfTypeInLane, resolveDestroyOwnLane, resolveDestroyAllOwnLanes, resolveEscriba,
  resolveHeka, resolveInvocar, resolveKhnum, resolveMacaco, resolveSemerj,
  resolveSeqerMau, resolveSekhmet, resolveSet, resolveSobek, resolveAfogamento,
  resolveCabraDoNilo, resolveApis, resolveMosca, resolveServoDoMel, resolvePurificacao, resolveBlessAllCostOne,
} from "../engine.js";
import { registrarLaminaOferenda } from "../cards/lamina-oferenda.js";
import { registrarTechCards } from "../cards/tech-cards.js";
import { registrarSekhem } from "../cards/sekhem.js";
import { registrarLadraoDeKa } from "../cards/ladrao-de-ka.js";
import { registrarSia } from "../cards/sia.js";
import { registrarAmmitDevoradora } from "../cards/ammit-devoradora.js";

/* O catálogo histórico ainda vive em engine.js. Cartas novas podem ser
   registradas por módulo sem ampliar aquele arquivo monolítico; como este
   registry é carregado pelo match e pelo validador de coleção, CARDS e byKey
   recebem a definição antes de qualquer partida ou validação. */
registrarLaminaOferenda(CARDS, byKey);
registrarTechCards(CARDS, byKey);
registrarSekhem(CARDS, byKey);
registrarLadraoDeKa(CARDS, byKey);
registrarSia(CARDS, byKey);
registrarAmmitDevoradora(CARDS, TOKENS, byKey);

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

registerEffect("blessAllCostOne", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition, params }) => {
    const value = params?.value || 1;
    return resolveBlessAllCostOne(state, source, definition, value);
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

registerEffect("armNextOwnSacrifice", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => {
    source.aguardaSacrificio = true;
    source.sacrificioArmadoEmPlays = source.entryPlays ?? state.plays[source.owner];
    pushLog(state, `${definition.nome}: a próxima carta jogada por ${source.owner === 0 ? "Lado A" : "Lado B"} será oferecida.`);
    return { uid: source.uid, text: "☥ próxima", kind: "sac", seq: state.effectSeq };
  },
});

/* LADRÃO DE KA — reserva energia extra para o PRÓXIMO TURNO (não a rodada
   atual). Reusa `state.pendingEnergy[owner]`, o mesmo acumulador do Bennu
   (`rebirthOnDeath`/`nextEnergy`), consumido em `nextRound` (match/index.js):
   `s.energy[side] = s.round + s.pendingEnergy[side]`. Nenhuma mudança em
   match/ foi necessária — é só mais uma fonte somando no mesmo acumulador. */
registerEffect("grantNextRoundEnergy", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition, params }) => {
    const val = params?.value ?? 1;
    state.pendingEnergy[source.owner] += val;
    pushLog(state, `${definition.nome}: +${val} de energia reservado para o próximo turno.`);
    return { uid: source.uid, text: `⚡+${val}→`, kind: "buff", seq: state.effectSeq };
  },
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

registerEffect("sacrificeAllLanes", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition, params }) => 
    resolveDestroyAllOwnLanes(state, source, params.absorb, definition),
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

registerEffect("banishNonPositiveToEnemy", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition, rng }) => resolvePurificacao(state, source, definition, rng),
});

registerEffect("endRoundCurseLane", {
  phase: "endRound", priority: 100,
  resolver: ({ state, source, definition, rng }) => resolveMosca(state, source, definition, rng),
});

registerEffect("endRoundSummonPerIdleSide", {
  phase: "endRound", priority: 100,
  resolver: ({ state, source, definition, rng }) => resolveServoDoMel(state, source, definition, rng),
});

registerEffect("growPerBoardAnimal", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => resolveApis(state, source, definition),
});

/* Sia — versão automática do "armar" do Hu. Só marca o estado de espera;
   a entrega do Poder para a próxima carta jogada acontece na revelação
   seguinte, na mesma rotina generalizada que atende Hu (ver match/index.js,
   busca por `aguardandoProxima` dentro de `resolveCurrentCard`). */
registerEffect("autoTransferPowerNext", {
  phase: "enter", priority: 100,
  resolver: ({ state, source, definition }) => {
    source.aguardandoProxima = true;
    source.ativadoEmPlays = state.plays[source.owner];
    pushLog(state, `${definition.nome} guardou seu Poder para a próxima carta jogada.`);
    return null;
  },
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
  // Ovo de Ammit — comportamento real no handler "ovo-ammit-transform"
  // (beforeDeath, engine.js), mesmo padrão de returnToHandOnDeath/rebirthOnDeath.
  ["transformToHandOnDeath", "death"],
  ["absorbDestroyedPower", "continuous"],
  ["protectLaneFromTargets", "continuous"],
  ["protectCostOneFromDestruction", "continuous"],
  ["growWhenOwnAnimalDies", "death-reaction"],
  ["growPerFullLane", "continuous"],
  ["spreadBlessingPerLane", "reaction"],
  ["spreadBlessingOnReceive", "reaction"],
  ["activateTransferPower", "activated"],
  ["resolvePlague", "enter"],
  // Tech cards — nenhuma delas resolve nada no momento em que entra; o
  // comportamento é lido a cada leitura de Poder, via `auraSuprimida()` e
  // `debuffsSuspensosPara()` em engine.js. Ver src/domain/cards/tech-cards.js.
  ["suspendPowerDebuffs", "continuous"],
  ["suppressAuraInLane", "continuous"],
  // Sekhem — ver src/domain/cards/sekhem.js e o handler "sekhem-mirror" em
  // engine.js (continuousPower). Comportamento real fora do resolver, como
  // as demais fontes de aura.
  ["mirrorOwnPowerToAllies", "continuous"],
]) {
  registerEffect(id, { phase, resolver: () => null });
}

export { getEffect, resolveEffectPhase, listEffects, temEfeitoDeFase };
