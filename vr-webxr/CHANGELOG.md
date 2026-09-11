# 0.2.0 — ergonomia e escolha de via

- Mesa 30 cm mais distante; o leque permanece próximo do jogador. Centralizar mantém esse afastamento.
- Clique em uma carta e depois em qualquer ponto da via do seu lado. Não é necessário arrastar ou apontar para um slot.
- Ordem automática: cima esquerda, cima direita, baixo esquerda, baixo direita, vista pelo jogador.
- A via sob o apontador fica realçada. Vias cheias não aceitam cartas; energia e bloqueio do turno continuam validados.
- Comando `play-lane` recebe `{ cardId, lane }`, com lane 0, 1 ou 2. O evento `card:played` inclui o slot resolvido pelo core.
- Nove testes automatizados passaram. A validação física desta atualização no Quest continua pendente.

No Quest, saia da sessão VR e recarregue a página. Confirme `VR / 0.2` antes de entrar novamente.
