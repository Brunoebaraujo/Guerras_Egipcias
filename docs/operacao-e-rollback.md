# Operação, diagnóstico e rollback

## Sinais de saúde

- Site: `https://brunoebaraujo.github.io/Guerras_Egipcias/`
- Servidor: `https://guerras-egipcias-server.onrender.com/health`
- O health informa `version`, `protocolVersion`, assinatura da coleção, salas, jogadores e uptime.
- Logs do servidor são JSON e podem ser filtrados por `event`, `roomId`, `matchId` e `playerId`.
- Os últimos erros do navegador ficam em `localStorage.ge_diagnostics`.

## Diagnóstico rápido

1. Confirmar que o workflow `Validar e publicar` terminou verde.
2. Comparar `protocolVersion`, `sig` e `cards` do health com o lobby.
3. Localizar `roomId`/`matchId` nos logs do Render.
4. Em falha de conexão, aguardar a recuperação automática por até 30 segundos antes de abandonar a sala.

## Rollback do site

1. Abrir Actions → `Rollback do site` → Run workflow.
2. Informar o SHA ou tag da última versão estável.
3. O workflow testa, recompila e republica esse conteúdo em `gh-pages`.
4. Confirmar o smoke do site após a propagação.

## Rollback do servidor

1. No Render, abrir o serviço multiplayer e escolher Deploys.
2. Selecionar o deploy estável anterior e usar `Rollback`/`Redeploy`.
3. Confirmar no `/health` que `version` e `protocolVersion` correspondem ao cliente publicado.
4. Se as versões forem incompatíveis, manter o multiplayer bloqueado até que site e servidor estejam alinhados.
