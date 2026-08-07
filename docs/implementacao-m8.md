# Implementação M8 — catálogo declarativo completo

M8 conclui a migração do despacho de regras para efeitos registrados. O comportamento e o balanceamento das cartas permanecem inalterados.

## Entregas

- Todas as cartas escolhíveis com `trigger` declaram `efeitos[]`.
- As dez Pragas recebem declaração uniforme e continuam usando seu registry especializado.
- `resolverEntrada()` não possui mais branches por flag ou chave de carta.
- Efeitos contínuos, de morte, passivos e ativados são descobertos por ID declarativo.
- Múmia, Bennu, Amon, Maat, Osíris, Am-heh, Ammit, Hiena, Garça, Montu, Domador, Gato, Escaravelho e Hu deixam de depender de comparações por chave nos pontos centrais.
- O schema valida lista, ID, duplicidade e presença de efeito para todo `trigger`.
- A seleção aleatória dos Assassinos usa o RNG semeado da partida e Fisher–Yates.

## Compatibilidade

Alguns campos legados permanecem temporariamente dentro das definições porque resolvers antigos ainda os leem como parâmetros. Eles não participam mais do despacho. A remoção desses aliases pode ser mecânica e isolada depois que cada resolver receber apenas `params`.

## Invariantes

- Adicionar uma carta com efeitos existentes não altera `match.js`.
- Um ID desconhecido ou ausente falha nos testes de catálogo/registry.
- Efeitos de entrada respeitam bloqueio, eco, prioridade e RNG da partida.
- Eventos de morte e contribuições contínuas mantêm ordem determinística.
