const STORAGE_KEY = "ge_diagnostics";
const MAX_ENTRIES = 20;

export function reportClientError(kind, error, context = {}) {
  const entry = {
    ts: new Date().toISOString(), kind,
    message: error?.message || String(error || "erro desconhecido"),
    stack: error?.stack || null,
    path: typeof location !== "undefined" ? location.pathname : null,
    ...context,
  };
  console.error(JSON.stringify({ event: "client_error", ...entry }));
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, entry].slice(-MAX_ENTRIES)));
  } catch {}
  return entry;
}

export function installGlobalErrorCapture(target = window) {
  const onError = (event) => reportClientError("window_error", event.error || event.message);
  const onRejection = (event) => reportClientError("unhandled_rejection", event.reason);
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}
