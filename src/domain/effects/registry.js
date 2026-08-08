import { selectTargets } from "./targets.js";

const registry = new Map();

export function registerEffect(id, spec) {
  if (!id || typeof spec?.resolver !== "function") throw new Error(`efeito inválido: ${id}`);
  if (registry.has(id)) throw new Error(`efeito duplicado: ${id}`);
  registry.set(id, Object.freeze({
    phase: "enter",
    priority: 100,
    copyable: true,
    blockable: true,
    target: null,
    ...spec,
    id,
  }));
}

export const getEffect = (id) => registry.get(id) || null;
export const listEffects = () => [...registry.values()];

/* "Esta definição tem algum efeito que resolve na fase X?" — a pergunta que o
   maestro faz para montar a lista de fontes de uma fase que varre o tabuleiro
   (hoje só `endRound`), em vez de olhar `def.trigger`. A fase é declarada no
   REGISTRY, não na carta: uma carta que ganhe um segundo efeito de outra fase
   passa a aparecer nas duas varreduras sem precisar de flag nova. */
export const temEfeitoDeFase = (def, phase) =>
  (def?.efeitos || []).some((effect) => getEffect(effect.id)?.phase === phase);

export function resolveEffectPhase({ state, source, definition, phase, rng }) {
  const effects = (definition.efeitos || [])
    .map((params, index) => ({ params, index, spec: getEffect(params.id) }))
    .filter(({ spec }) => spec?.phase === phase)
    .sort((a, b) => a.spec.priority - b.spec.priority || a.index - b.index);
  let badge = null;
  for (const { params, spec } of effects) {
    const targets = spec.target ? selectTargets(state, source, spec.target, rng) : [];
    badge = spec.resolver({ state, source, definition, params, rng, targets }) ?? badge;
  }
  return badge;
}
