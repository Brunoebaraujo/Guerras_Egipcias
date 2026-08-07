# Implementação M0–M2

Baseline: `origin/main` em `58ee16a`, versão `0.3.0`, com 561 testes preexistentes passando no relatório de auditoria.

## Invariantes instalados

- O estado enviado pelo servidor é uma projeção por lista de permissão: `trace`, fila de revelação e reservas ocultas não atravessam a conexão.
- Todo deck é revalidado no servidor pela mesma função canônica usada pela biblioteca local.
- O assento de uma ação online sempre vem da conexão; nunca é confiado ao payload do cliente.
- Payload, origem, taxa de mensagens, clientes, salas e tempo de vida de salas têm limites explícitos.
- Erros de renderização exibem uma recuperação em vez de desmontar a aplicação numa tela branca.
- Definições da coleção são verificadas contra campos, chaves, números e arquétipos conhecidos.
- O schema da biblioteca de decks possui migração explícita; decks só são considerados atuais quando sua `CONTENT_SIG` coincide.
- Lint, checkJs incremental, testes do motor, integração do servidor e build bloqueiam o deploy.

## Comandos de verificação

```sh
npm run lint
npm run typecheck
npm test
npm run test:server
npm run build
```

O `checkJs` começa nos módulos de contrato novos e na persistência. A expansão para o motor e para a UI deve ocorrer junto da tipagem explícita de `Card`, `MatchState` e props, evitando supressões globais que apenas fariam o gate parecer verde.
