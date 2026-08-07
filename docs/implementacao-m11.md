# M11 — Confiabilidade operacional

## Entregas

- Playwright cobre menu/partida local, persistência de decks e entrada no lobby em desktop e mobile.
- Smoke pós-deploy valida o site e o health do servidor com repetição durante a propagação.
- Protocolo v2 rejeita clientes incompatíveis, ordena respostas e deduplica comandos por `mid`.
- Sessões multiplayer usam token opaco e toleram desconexões de até 30 segundos, preservando assento e estado.
- Health expõe versão implantada, protocolo, assinatura, coleção, salas, jogadores e uptime.
- Servidor registra eventos JSON correlacionáveis por sala, partida e jogador.
- Cliente captura falhas globais e de renderização, mantendo os últimos diagnósticos no navegador.
- Pull requests executam lint, tipos, testes cliente/servidor, build e E2E antes de qualquer deploy.
- Workflow manual permite republicar um commit/tag estável no GitHub Pages.

## Proteção recomendada da main

Em Settings → Branches/Rulesets, exigir o check `verify` do workflow `Validar e publicar`, bloquear force-push e exigir branch atualizada antes do merge. Essa configuração pertence ao repositório GitHub e não é representada apenas por arquivos versionados.

## Ponto de recuperação

O estado anterior à M11 é o commit `e72ea48`.
