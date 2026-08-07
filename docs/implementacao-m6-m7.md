# Implementação M6–M7

Esta onda conclui a fundação de previsibilidade do orquestrador da partida. Ela não muda balanceamento, regras de cartas ou apresentação.

## M6 — Máquina explícita de fases

- As fases válidas passam a ser constantes compartilhadas.
- Uma tabela declara as transições permitidas: planejamento → revelação, revelação → revelada e revelada → novo planejamento.
- O caso sem cartas pode avançar diretamente de planejamento para revelada.
- Transições impossíveis lançam erro imediatamente.
- `applyAction` rejeita estados que já chegam com invariantes estruturais quebradas.

## M7 — Pipeline de revelação

- A preparação, seleção da próxima carta e marcação da revelação são etapas nomeadas.
- O executor mantém ordem determinística e permite interrupção explícita.
- Fila esgotada encerra o pipeline antes da resolução de efeitos.
- A infraestrutura é independente de React e compartilhável entre cliente e servidor.

## Continuidade

Novas fases devem ser adicionadas à tabela antes de qualquer atribuição no estado. Novas operações anteriores à resolução de uma carta devem entrar como etapas nomeadas do pipeline, com teste de ordem e de interrupção.
