const appUrl = process.env.SMOKE_APP_URL;
const healthUrl = process.env.SMOKE_HEALTH_URL;

if (!appUrl) throw new Error("SMOKE_APP_URL não configurada");

async function fetchOk(url, label) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
  return response;
}

const app = await fetchOk(appUrl, "aplicação");
const html = await app.text();
if (!html.includes("Guerras Egípcias")) throw new Error("aplicação: conteúdo esperado ausente");

if (healthUrl) {
  const health = await fetchOk(healthUrl, "servidor");
  const body = await health.json();
  if (!body.ok || !body.version || !body.protocolVersion) {
    throw new Error("servidor: health sem versão/protocolo");
  }
}

console.log(JSON.stringify({ ok: true, appUrl, healthUrl: healthUrl || null }));
