# Versão 0.3 — calibração no Quest

Abra https://brunoebaraujo.github.io/Guerras_Egipcias/vr/?v=0.3 e confirme VR / 0.3. Saia da sessão anterior e recarregue antes de entrar.

Ao entrar em VR, o painel **AJUSTAR POSIÇÃO** aparece à frente do olhar e não acompanha a mesa. Aponte o controle e clique no gatilho para usar os botões. **JOGAR** fecha o painel; pressione o analógico de qualquer controle para reabri-lo diante do olhar. Também existe **AJUSTAR POSIÇÃO** na mesa e na página desktop.

## Ajustes

- **MAIS LONGE / MAIS PERTO**: distância da borda próxima da mesa, em passos de 10 cm.
- **MESA ↓ / ↑**: altura em passos de 5 cm. A altura inicial é 80 cm; alinhar o olhar não muda esse valor.
- **MESA ← / →**, **GIRAR ← / →**: posição lateral e rotação da mesa.
- **VOCÊ ← / → / AVANÇA / RECUA**: deslocamento virtual do jogador em relação à mesa e cartas. Não modifica o tracking físico da cabeça; aplica a transformação inversa ao conteúdo interativo.
- **CARTAS LONGE / PERTO / ↓ / ↑**: posição do leque independente da mesa.
- **ALINHAR OLHAR**: define a posição física atual e a direção horizontal do olhar como nova referência. Mantém altura, distância e outros ajustes escolhidos.
- **PADRÃO**: restaura altura 80 cm, borda da mesa 55 cm à frente, cartas 45 cm à frente e 45 cm abaixo dos olhos.
- **SALVAR**: guarda as preferências somente neste navegador. **JOGAR**: fecha o painel e permite selecionar a carta e depois a via.

As cartas agora ficam à frente da referência do jogador. Na versão anterior, a compensação do afastamento deixava o centro do leque em Z positivo, atrás dessa referência. A altura também era recalculada pela altura da cabeça ao centralizar. Esses dois comportamentos foram removidos.

## Enviar coordenadas

Você pode enviar o código **GE03 …** mostrado no painel diretamente na conversa. Ele contém, em ordem: altura, distância da borda, lateral, rotação, deslocamento X do jogador, deslocamento Z do jogador, distância das cartas e distância vertical abaixo dos olhos. Os valores são multiplicados por 100, inclusive o ângulo, para um código compacto.

Para dados completos, saia do VR e, na mesma página e no mesmo aparelho, expanda **Coordenadas da posição**. Use **Copiar coordenadas** e cole na conversa, ou **Baixar JSON** e envie o arquivo. O relatório inclui parâmetros em metros/graus, altura dos olhos na calibração, origem física de referência e transformações locais da mesa e da mão. A origem da mesa é o pivô do tabuleiro, não seu centro geométrico; o centro está em Z = −1,05 m no espaço local da mesa.

Não existe conexão automática com esta conversa nem envio de telemetria. Abrir a página no computador não recupera os dados salvos no Quest. Para recuperar a configuração no próximo acesso ao mesmo navegador, pressione SALVAR antes de sair.

## Verificação

13 testes automatizados verificam posicionamento em diferentes orientações, independência de altura/distância, raycast dos botões e cartas, persistência, snap e fluxo de via. São testes matemáticos com canvas simulado. O conforto e o funcionamento físico dos controles desta versão precisam ser confirmados no Quest.
