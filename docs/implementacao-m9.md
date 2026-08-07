# Implementação M9 — fronteiras de módulos

M9 reorganiza o código puro sem mudar regras, balanceamento, protocolo público ou apresentação.

## Estrutura

```text
src/
├── domain/     engine, regras, RNG, eventos, cartas e efeitos
├── match/      orquestrador, fases e pipeline de revelação
├── net/        protocolo e filtragem de estado por assento
├── storage/    biblioteca e persistência local de decks
└── ui atual    App, telas e componentes ainda existentes na raiz
```

## Compatibilidade

`engine.js`, `match.js`, `rng.js`, `events.js`, `rules.js`, `deckLibrary.js`, `collectionSchema.js` e `effects/index.js` continuam como fachadas públicas. Isso preserva consumidores atuais enquanto novos imports apontam para as fronteiras definitivas.

## Contratos

- `domain/` e `match/` não importam React nem usam APIs do navegador.
- O servidor continua consumindo a mesma API pública de `match` e `engine`.
- O filtro de informação privada vive em `net/filterState.js` e é testado isoladamente.
- A whitelist de ações de planejamento vive em `net/protocol.js` e é compartilhável.
- Regras estruturais possuem uma fonte única em `domain/rules.js`.
- O CI observa todos os novos diretórios compartilhados ao decidir o redeploy do servidor.

## Próximo passo

M10 poderá mover as telas para `ui/` e decompor `App.jsx` sem voltar a misturar apresentação, rede, persistência e regras.
