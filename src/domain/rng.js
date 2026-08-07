// @ts-check

export const RNG_ALGORITHM = "mulberry32-v1";

export function normalizeSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  const text = String(seed ?? "guerras-egipcias");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function randomSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] >>> 0;
  }
  return (Date.now() ^ (globalThis.performance?.now?.() || 0)) >>> 0;
}

/** Cria um PRNG cujo estado pode ser serializado junto da partida. */
export function createRng(seedOrSnapshot) {
  const initial = typeof seedOrSnapshot === "object" && seedOrSnapshot
    ? seedOrSnapshot
    : { seed: normalizeSeed(seedOrSnapshot), state: normalizeSeed(seedOrSnapshot), calls: 0 };
  const seed = normalizeSeed(initial.seed);
  let state = normalizeSeed(initial.state ?? seed);
  let calls = Number.isInteger(initial.calls) ? initial.calls : 0;
  const rng = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    calls += 1;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.snapshot = () => ({ algorithm: RNG_ALGORITHM, seed, state, calls });
  return rng;
}

const systemGenerator = createRng(randomSeed());
export const defaultRng = () => systemGenerator();

export function shuffleWithRng(values, rng) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const pickOne = (values, rng) => values.length
  ? values[Math.floor(rng() * values.length)]
  : null;
