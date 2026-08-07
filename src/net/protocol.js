export const CLIENT_MESSAGE_TYPES = Object.freeze([
  "hello", "listRooms", "createRoom", "joinRoom", "leaveRoom",
  "deckReady", "act", "ready", "aim", "skipAim",
]);

export const PROTOCOL_VERSION = 2;

export const SERVER_MESSAGE_TYPES = Object.freeze([
  "welcome", "rooms", "roomCreated", "matchReady", "gameState",
  "opponentLeft", "roomClosed", "session", "resumed", "error",
]);

export const PLANNING_ACTION_TYPES = Object.freeze([
  "place", "pickup", "move", "resetPlan", "toggleActivate",
]);

export const isPlanningActionType = (type) => PLANNING_ACTION_TYPES.includes(type);

export const isCompatibleProtocol = (version) => Number(version) === PROTOCOL_VERSION;

export function createSequenceGuard() {
  let last = 0;
  return (sequence) => {
    if (!Number.isSafeInteger(sequence) || sequence <= last) return false;
    last = sequence;
    return true;
  };
}

export function rememberMessageId(cache, id, limit = 256) {
  if (!id || cache.has(id)) return false;
  cache.add(id);
  if (cache.size > limit) cache.delete(cache.values().next().value);
  return true;
}
