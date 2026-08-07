export const CLIENT_MESSAGE_TYPES = Object.freeze([
  "hello", "listRooms", "createRoom", "joinRoom", "leaveRoom",
  "deckReady", "act", "ready", "aim", "skipAim",
]);

export const SERVER_MESSAGE_TYPES = Object.freeze([
  "welcome", "rooms", "roomCreated", "matchReady", "gameState",
  "opponentLeft", "roomClosed", "error",
]);

export const PLANNING_ACTION_TYPES = Object.freeze([
  "place", "pickup", "move", "resetPlan", "toggleActivate",
]);

export const isPlanningActionType = (type) => PLANNING_ACTION_TYPES.includes(type);
