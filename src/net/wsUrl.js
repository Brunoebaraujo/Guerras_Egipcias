export function normalizeWs(url) {
  let normalized = (url || "").trim().replace(/\/+$/, "");
  if (normalized.startsWith("https://")) normalized = "wss://" + normalized.slice(8);
  else if (normalized.startsWith("http://")) normalized = "ws://" + normalized.slice(7);
  else if (!/^wss?:\/\//.test(normalized)) normalized = "wss://" + normalized;
  return normalized;
}
