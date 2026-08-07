export const MAX_EVENT_DEPTH = 16;
const handlers = new Map();

export function registerEventHandler(type, spec) {
  if (!type || !spec?.id || typeof spec.handle !== "function") throw new Error(`handler de evento inválido: ${type}`);
  const list = handlers.get(type) || [];
  if (list.some((item) => item.id === spec.id)) throw new Error(`handler duplicado: ${type}/${spec.id}`);
  list.push(Object.freeze({ priority: 100, when: () => true, ...spec }));
  list.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  handlers.set(type, list);
}

export function emitEvent(state, type, payload = {}) {
  const depth = state.__eventDepth || 0;
  if (depth >= MAX_EVENT_DEPTH) throw new Error(`limite de eventos excedido (${MAX_EVENT_DEPTH}): ${type}`);
  state.__eventDepth = depth + 1;
  state.eventSeq = (state.eventSeq || 0) + 1;
  const event = { type, seq: state.eventSeq, ...payload };
  const results = [];
  try {
    for (const handler of handlers.get(type) || []) {
      if (handler.when(event, state)) results.push(handler.handle(event, state));
    }
  } finally {
    if (depth === 0) delete state.__eventDepth;
    else state.__eventDepth = depth;
  }
  return { event, results };
}

export function collectEvent(type, payload = {}) {
  const values = [];
  const event = { type, ...payload };
  for (const handler of handlers.get(type) || []) {
    if (!handler.when(event, null)) continue;
    const result = handler.handle(event, null);
    if (Array.isArray(result)) values.push(...result);
    else if (result != null) values.push(result);
  }
  return values;
}

export const listEventHandlers = (type) => [...(handlers.get(type) || [])];

