# Guerras Egípcias VR — demo jogável 0.7.0

Partida local completa contra o bot Fácil da main, com seis rodadas. Usa os módulos originais de regras, efeitos, compra, energia, prioridade, fila de revelação, pontuação e resultado. Sem multiplayer ou contas.

## Jogar no Quest 2

Abra https://brunoebaraujo.github.io/Guerras_Egipcias/vr/?v=0.7.0 no navegador do Quest, confira **VR / 0.7.0** e pressione **Entrar em VR**.

1. Olhe para a frente ao iniciar. Confirme que vê o painel de posição; selecione **JOGAR** para fechá-lo.
2. Levante o controle esquerdo: o leque acompanha essa mão, com manopla egípcia em preto, ouro e azul.
3. Aponte o controle direito para uma carta e clique no gatilho. Leia o efeito no painel lateral.
4. Aponte para uma via iluminada e clique novamente. A carta ocupa automaticamente o primeiro espaço livre: cima esquerda, cima direita, baixo esquerda, baixo direita.
5. Clique numa carta sua recém-posicionada para recolhê-la. **REINICIAR JOGADA** devolve somente as jogadas ainda não reveladas desta rodada e reembolsa sua energia.
6. Pressione **FINALIZAR TURNO**. O bot planeja suas jogadas, as cartas são reveladas em ordem e os efeitos são aplicados pelo motor original. O painel à direita mostra a fila e a prioridade.
7. A próxima rodada começa automaticamente após a resolução. Após a sexta, aparecem vitória, derrota ou empate e o placar por via. O mesmo botão passa a ser **NOVA PARTIDA**.

O Poder atual aparece em um medalhão acima de cada carta na mesa. Os totais de cada via ficam em placas ovais flutuantes, sem mastros, nas duas cabeceiras. Rodada e energia acompanham a mão esquerda em um painel avançado logo abaixo do leque. Ao selecionar uma carta, ela sai do leque, passa para a mão direita, aumenta de tamanho e mostra na própria face seu custo, Poder e texto de efeito.

Selecione a cabeceira ou uma área livre da via do bot para abrir, diante do jogador, uma projeção vertical das cartas e dos Poderes daquela via. A projeção troca de via quando outra cabeceira adversária é selecionada e desaparece no próximo clique em qualquer outro lugar.

Escaravelho pode ser selecionado no tabuleiro e movido para outra via quando sua regra permitir. A interface também suporta escolha de alvos e pular alvo quando o motor solicitar. Os decks atuais usam predominantemente efeitos automáticos. As cartas ocultas do bot aparecem de costas e não expõem nome, arte ou poder na interface pública.

As mãos são modelos 3D leves de manoplas, ligados aos controles Touch; não há rastreamento óptico dos dedos. A mão direita é a única que ativa cartas e botões. Troca de mão ainda não está incluída. Incline o pulso esquerdo para ajustar o ângulo das cartas. A mão flutuante anterior permanece como fallback desktop ou na ausência do controle esquerdo.

## Desktop

Requer Node.js 20 ou superior. Não precisa instalar dependências:

```sh
node scripts/serve.mjs
```

Abra http://localhost:8080. Clique na carta e depois na via. Esc cancela seleção, R desfaz o planejamento atual, Enter finaliza o turno. A roda do mouse ajusta a câmera. Não abra index.html diretamente como arquivo.

## Regras e origem

Os 24 módulos em `dist/game-core/src/domain/` e `dist/game-core/src/match/` são cópias **sem alterações** do commit `30f6e39f75a9c4fcfdc1f987694dac3b0c7ae39f` da main de `Brunoebaraujo/Guerras_Egipcias`. `provenance.json` registra o SHA do commit e o SHA-256 de cada arquivo. O adaptador VR não redefine regras.

- Decks fixos de 12 cartas: guerreiros/divindades para o jogador, animais para o bot.
- Abertura, compra e energia seguem a main: três cartas iniciais mais a compra da primeira rodada, uma energia na rodada 1. O leque cresce até o limite real de sete cartas.
- Totais consideram cartas reveladas e todos os modificadores/auras do motor.
- Vence quem ganhar mais vias; empate de vias usa o saldo de poder, conforme a main.
- Efeitos são resolvidos sem animações. Anúbis conserva apenas a entrada holográfica curta, que desaparece e deixa a carta plana.
- Cada nova partida usa uma semente; não há persistência da partida ao recarregar a página.

Para atualizar o espelho, a partir da pasta do protótipo, com um checkout confiável da main:

```sh
node scripts/sync-core.mjs ../main-game
node --test tests/*.test.mjs
```

O script também copia as 23 ilustrações usadas pelos decks. Atualizar o core exige revisar o contrato e rodar os testes antes de publicar.

## Integração

`dist/src/core.js` é o adaptador `MatchCore`: recebe intenções, chama `applyAction` original, executa o bot original e emite eventos `state:changed`, `intent`, `command:applied` e `command:rejected`. A cena consome somente o snapshot de apresentação.

`window.guerrasVR` oferece `command`, `getState`, `getPlacement`, `getMetrics` e `events`. O estado público omite mãos/decks privados do bot. Esta é uma demo local, não uma fronteira de segurança multiplayer.

- `scene.js`: ambiente, mesa, placares e holograma temporário.
- `cards.js`: pool fixo de 32 cartas, atlas e painéis de leitura/fila.
- `hands.js`: arte procedural das duas manoplas e seleção exclusiva pela direita.
- `main.js`: mouse, WebXR, montagem no grip esquerdo, ciclo de apresentação.
- `calibration.js` / `placement.js`: posição, centralização e exportação. Preserva as chaves de armazenamento da versão anterior.

## Conforto

Use **AJUSTAR POSIÇÃO** ou pressione o analógico para abrir o painel. Altura, distância, centralização e posição do oponente foram preservadas. **Usar posição baixa aprovada** aplica mesa a 40 cm. As opções de distância/altura das cartas controlam o fallback flutuante; em VR com controle esquerdo conectado o leque segue a mão.

## HTTPS local

WebXR precisa de contexto seguro. Para o Quest, prefira o link publicado acima. O endereço HTTP da rede local não habilita WebXR.

Com mkcert instalado, gere um certificado para o computador e seu IP:

```sh
mkdir .cert
mkcert -install
mkcert -key-file .cert/key.pem -cert-file .cert/cert.pem localhost 127.0.0.1 ::1 192.168.1.100
node scripts/serve.mjs --https
```

Substitua o IP pelo seu. Abra https://localhost:8443 no computador. O Quest precisa confiar na CA para abrir `https://IP:8443` como contexto seguro; instalar a CA só no computador não basta. Não publique chaves privadas. Se não houver um fluxo de certificado confiável no aparelho, use GitHub Pages.

## GitHub Pages ou outro host HTTPS

Todo o site está em `dist/`, incluindo engine, imagens e Three.js. Copie seu conteúdo para uma pasta do host, mantendo a estrutura. Os caminhos são relativos: pode ser `/vr/`.

Neste repositório, os arquivos de distribuição ficam em `public/vr/` na branch de trabalho e em `vr/` na branch `gh-pages`. Preserve os demais arquivos do jogo ao publicar. O PR precisa ser incorporado pelo fluxo normal antes que uma publicação futura da main preserve automaticamente `/vr/`.

## Verificação

```sh
node --test tests/*.test.mjs
```

Os testes verificam hashes do core, 40 partidas completas em comparação com execução direta do motor, fila, totais, resultado, reset, movimento do Escaravelho, limites, cartas ocultas, geometria, seleção pela direita e preservação da calibração. Testes geométricos não substituem teste físico no Quest.

Three.js r170 está incluído com licença MIT. Sem sombras, pós-processamento ou modelos externos de mãos. Arquitetura e manoplas usam instâncias; cartas compartilham atlas e material. A sessão solicita 72 Hz quando disponível. FPS e draw calls aparecem na mesa; 72 FPS no aparelho precisam ser medidos no Quest 2.
