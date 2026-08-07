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
