# 1.2.0 — coleção visual na câmara

- As cartas da coleção agora mostram a arte, o custo e o poder no paredão da câmara.
- Oito cartas menores aparecem por página para manter toda a seleção dentro do campo de visão.
- A troca de páginas ganhou botões maiores e também responde ao analógico direito.
- O botão INICIAR PARTIDA foi movido para a frente da mesa de pedra e ampliado.

# 1.1.0 — câmara de preparação em VR

- Entrar em VR antes da partida leva o jogador a uma câmara interna de pirâmide.
- Uma mesa de pedra sustenta a interface espacial para escolher o deck do jogador e o deck do bot.
- Presets e decks salvos são paginados; a coleção completa pode ser percorrida e editada com o controle direito.
- Os decks continuam exigindo 12 cartas únicas e ficam sincronizados com o fallback desktop.
- Ao confirmar, a câmara desaparece, o tabuleiro surge e o ajuste de posição é aberto antes da partida.

# 1.0.0 — escolha dos decks antes da partida

- A experiência abre diretamente na tela Construir deck, inspirada na tela da main e sem menu intermediário.
- Seu deck e o deck do bot são montados separadamente com as 65 cartas construíveis da coleção atual.
- Os oito presets da main, suas sobrescritas e decks salvos em `ge_decks` podem ser usados nos dois lados.
- O motor recebe os dois decks escolhidos e o bot joga somente com o deck definido para ele.
- A escolha fica salva no navegador e pode ser reaberta pelo botão Construir deck.

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
