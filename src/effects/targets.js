import { emJogo, temTipo } from "../engine.js";

export function selectTargets(state, source, spec, rng) {
  let pool = spec.scope === "hand"
    ? [...(state.hand[source.owner] || [])]
    : state.board.filter(emJogo);
  if (spec.scope === "lane") pool = pool.filter((card) => card.lane === source.lane);
  if (spec.relation === "ally" || spec.relation === "own") pool = pool.filter((card) => (card.owner ?? source.owner) === source.owner);
  if (spec.relation === "enemy") pool = pool.filter((card) => card.owner !== source.owner);
  if (spec.excludeSource) pool = pool.filter((card) => card.uid !== source.uid);
  if (spec.type) pool = pool.filter((card) => temTipo(card, spec.type));
  if (spec.key) pool = pool.filter((card) => card.key === spec.key);
  const quantity = Math.max(0, spec.quantity ?? pool.length);
  if (spec.mode !== "random") return pool.slice(0, quantity);
  const selected = [];
  while (pool.length && selected.length < quantity) {
    selected.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return selected;
}
