# 1.11.0 — captura da visão e hierarquia integral

- Os filtros, presets, **ALEATÓRIO** e **LIMPAR** sobem mais na mesa da câmara; **INICIAR PARTIDA** mantém sua posição aprovada.
- Totais das vias, painel da partida e resultado, Poderes individuais e contador do deck ficam atrás das duas mãos e de suas cartas.
- **FOTO EM 3S** aparece sob o deck na partida e ao lado de **INICIAR PARTIDA** na câmara.
- A captura usa a visão do headset após três segundos, tenta copiar o PNG e salva o arquivo quando a área de transferência não aceita imagens.

# 1.10.0 — controles contidos e cartas em primeiro plano

- Filtros, presets e ações sobem na superfície da mesa da câmara; **INICIAR PARTIDA** fica inteiramente dentro da pedra.
- **ALEATÓRIO** e **LIMPAR** recebem tipografia maior.
- Todos os botões da mesa de jogo passam para uma camada opaca inferior às manoplas e às cartas seguradas.

# 1.9.0 — retorno à câmara e profundidade das mãos

- Os painéis laterais dos decks ficam menores e acima da mesa de pedra, sem colisão visual.
- A partida ganha **VOLTAR À CÂMARA**, preservando os decks atuais para uma nova seleção sem sair do VR.
- A mão direita e a carta selecionada ocupam o primeiro plano; a mão esquerda e seu leque formam o plano seguinte.
- **REINICIAR JOGADA** e **FINALIZAR TURNO** usam tipografia maior para leitura no Quest 2.

# 1.8.0 — decks laterais e leque em camadas

- Os painéis dos decks saem da parede frontal: ficam à esquerda e à direita do jogador, girados 90° e voltados para o centro da câmara.
- Cada painel ordena suas cartas por custo crescente, preenchendo primeiro a coluna esquerda de cima para baixo e depois a direita.
- A projeção de inspeção desce mais 31 cm e fecha ao clicar fora dela ou depois de ADICIONAR/RETIRAR.
- O leque mantém o arco físico e usa uma ordem explícita de desenho, garantindo que cada carta nova permaneça sobre todas as anteriores.

# 1.7.0 — painéis de deck e foco integral

- O foco do laser cobre toda a superfície atingida em primeiro plano, além do ponto luminoso, e o feixe termina no contato.
- Enquanto uma carta está na mão direita, o laser ignora as cartas e alcança a mesa para acompanhar a via realçada.
- A câmara ganha um painel à esquerda para o deck do jogador e outro à direita para o deck do bot, com as 12 cartas escolhidas.
- Selecionar uma carta dos painéis apenas abre sua inspeção; RETIRAR continua sendo uma ação separada.
- A inspeção da câmara usa a mesma moldura e composição da partida e fica 39 cm mais baixa.
- O leque mantém a ordem de profundidade, mas volta a formar um arco suave em vez de uma escada vertical.

# 1.6.0 — leitura, apontador e ordem da mão

- O texto da carta ampliada fica centralizado e preto dentro da área reservada da moldura.
- O preset carregado recebe fundo e contorno luminosos; as oito listas e suas ordens foram conferidas com `DEFAULT_PRESETS` da versão desktop.
- O laser da mão direita termina na primeira superfície interativa e mostra um anel pulsante no ponto atingido.
- O leque cresce da esquerda para a direita e de baixo para cima; a carta comprada por último permanece na frente sem inverter a curva após a terceira carta.

# 1.5.0 — inspeção completa e cartas ativáveis

- A projeção da carta na câmara sobe para liberar o acesso aos filtros e presets; todos os controles da mesa ficam agrupados perto de INICIAR PARTIDA.
- Selecionar qualquer carta no tabuleiro abre uma versão ampliada com a moldura da edição desktop, arte, custo, Poder, tipo e texto completo.
- Cartas ocultas do bot continuam protegidas e aparecem com o verso egípcio na inspeção.
- Hu ganha o botão ATIVAR no corpo da carta após ser revelado. A ação usa o comando original do motor e o contrato também atende futuras cartas ativáveis.

# 1.4.0 — mesa de filtros e inspeção de cartas

- Os oito filtros de custo e os oito presets ficam sobre a mesa de pedra, todos visíveis ao mesmo tempo e com tipografia ampliada.
- O paredão passa a exibir oito cartas por linha, mantendo a rolagem vertical.
- Selecionar uma carta abre uma projeção central com arte, custo, poder, tipo e texto do efeito.
- O deck só muda pelos botões ADICIONAR e RETIRAR da projeção.

# 1.3.0 — coleção rolável e leitura da rodada

- O paredão mostra cinco cartas por linha e permite arrastar verticalmente a coleção com o controle direito.
- A rodada aparece em um letreiro grande e elevado, perpendicular ao Rio Nilo; a mão exibe somente a energia.
- O placar final compara as três vias em colunas e destaca o maior poder de cada uma.
- A projeção da via do bot também informa o poder total atual da via.

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
