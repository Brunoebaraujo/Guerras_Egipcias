# Implementação M3–M5

Esta onda cria a infraestrutura para partidas reproduzíveis e para a migração incremental das regras do jogo, sem exigir uma reescrita completa do catálogo.

## M3 — Aleatoriedade determinística

- PRNG `mulberry32-v1` semeado, com snapshot serializável no estado da partida.
- Seed gerada no início da partida e registrada pelo servidor junto ao identificador da sala.
- Todas as decisões aleatórias do fluxo da partida usam o RNG da partida.
- IDs de cartas passam a vir de um contador local ao estado, evitando interferência entre partidas.
- Testes comprovam repetibilidade por seed e continuação idêntica após serialização.

## M4 — Registry de efeitos

- Registry central com ID único, fase e prioridade explícitas.
- Seleção declarativa de alvos, inclusive seleção aleatória pelo RNG da partida.
- Primeira migração vertical: Hathor, Ganso, Macaco, Escriba e Conselheiro.
- O caminho legado continua ativo para as demais cartas, permitindo migração gradual e segura.

## M5 — Eventos de domínio

- Barramento síncrono e determinístico, ordenado por prioridade e ID.
- Proteção contra recursão excessiva.
- Eventos `beforeDeath`, `afterDeaths` e `continuousPower` substituem acoplamentos centrais.
- Múmia, Bennu, Hiena e os modificadores contínuos existentes foram registrados como handlers.

## Critérios de continuidade

Novos efeitos devem preferir o registry declarativo. Novas reações entre cartas devem preferir eventos de domínio. A migração das regras legadas deve ser feita por grupos pequenos, sempre preservando testes de comportamento e determinismo.
