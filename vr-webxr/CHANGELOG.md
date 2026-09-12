# 0.9.0 — resultado em primeiro plano e inspeção livre

- O painel final subiu e agora é composto depois dos totais e poderes, cobrindo corretamente os elementos atrás dele.
- Qualquer carta da mão pode ser escolhida e lida, mesmo sem energia suficiente para jogá-la.
- Cartas indisponíveis permanecem selecionadas na mão direita; o jogador deve escolher outra carta ou finalizar o turno.
- É possível trocar diretamente a carta selecionada apontando para outra carta no leque.

# 0.2.0 — ergonomia e escolha de via

- Mesa 30 cm mais distante; o leque permanece próximo do jogador. Centralizar mantém esse afastamento.
- Clique em uma carta e depois em qualquer ponto da via do seu lado. Não é necessário arrastar ou apontar para um slot.
- Ordem automática: cima esquerda, cima direita, baixo esquerda, baixo direita, vista pelo jogador.
- A via sob o apontador fica realçada. Vias cheias não aceitam cartas; energia e bloqueio do turno continuam validados.
- Comando `play-lane` recebe `{ cardId, lane }`, com lane 0, 1 ou 2. O evento `card:played` inclui o slot resolvido pelo core.
- Nove testes automatizados passaram. A validação física desta atualização no Quest continua pendente.

No Quest, saia da sessão VR e recarregue a página. Confirme `VR / 0.2` antes de entrar novamente.
