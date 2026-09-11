# Publicação no repositório Guerras_Egipcias

URL do protótipo: https://brunoebaraujo.github.io/Guerras_Egipcias/vr/

Os arquivos servidos ficam em `public/vr/`, copiados automaticamente pelo build Vite do jogo. Execute o servidor e os testes a partir de `vr-webxr/`. Neste repositório, as referências a `dist/` no guia original abaixo correspondem a `../public/vr/`. A branch `codex/webxr-prototype-0.1` prepara essa inclusão; até sua integração em main, um novo deploy do jogo pode remover a publicação inicial em gh-pages. Nenhum workflow de publicação separado substitui o jogo principal.

# Guerras Egípcias VR — vertical slice 0.1

Protótipo WebXR em Three.js para ergonomia de mesa e interação com cartas. Funciona como página desktop com mouse e implementa sessão `immersive-vr` com controles do Quest. Sem multiplayer, combate, IA ou integração com contas.

## Abrir no computador

Requer Node.js 20 ou superior. Na pasta deste projeto:

```sh
node scripts/serve.mjs
```

Abra http://localhost:8080. Não abra `index.html` como arquivo: os módulos precisam de HTTP/HTTPS. Não é necessário instalar pacotes, compilar ou acessar uma CDN. O Three.js 0.170.0 está incluído em `dist/vendor/`, com licença MIT. Todo o site distribuível está em `dist/`.

## Controles

| Ação | Desktop | Quest com controles |
| --- | --- | --- |
| Selecionar / mover | Segurar o botão esquerdo e arrastar | Apontar e segurar gatilho ou botão de agarrar |
| Soltar / encaixar | Soltar sobre espaço azul | Soltar o botão sobre espaço azul |
| Alternativa ao arraste | Clicar na carta, depois no espaço | Aproximar controle da carta e agarrar |
| Cancelar | Esc ou soltar fora de espaço válido | Soltar fora de espaço válido |
| Reiniciar | Botão esquerdo da mesa, botão da página ou R | Apontar para REINICIAR JOGADA e apertar gatilho |
| Finalizar | Botão direito da mesa, botão da página ou Enter | Apontar para FINALIZAR TURNO e apertar gatilho |
| Ajustar altura | Controle deslizante ou MESA + / − | Botões MESA + / − à esquerda |
| Centralizar | Botão na mesa; roda ajusta distância | Olhar para a frente e selecionar CENTRALIZAR |

O arraste distante projeta a carta na superfície da mesa. Ao agarrar de perto, ela acompanha a posição do controle; aproxime-a do espaço para soltar. Só uma carta fica agarrada por vez, mesmo usando dois controles. Se apertar gatilho e agarrar juntos, solte ambos para concluir. Perda de foco, desconexão do controle e saída de VR devolvem a carta à mão.

A mesa se centraliza diante do olhar ao entrar em VR. Sua altura inicial fica aproximadamente 50 cm abaixo dos olhos, limitada a 55–115 cm do piso. É possível jogar sentado ou em pé. O leque fica no espaço diante do jogador; não segue automaticamente a cabeça nem usa rastreamento óptico das mãos. Para reposicionar o conjunto, use CENTRALIZAR. Não há locomoção artificial.

## Conteúdo da slice

- Templo simples, pirâmides, estátua de Anúbis e mesa de pedra escura com detalhes dourados.
- Rio Nilo separando os lados, 3 vias × 4 espaços × 2 lados = 24 espaços.
- Cinco cartas em leque: Anúbis, Guerreiro, Sacerdotisa, Escaravelho e Tempestade.
- Deck visível com 15 cartas restantes: contador estático porque esta slice não compra cartas.
- Energia inicial 6; uma jogada válida desconta somente o custo impresso na carta.
- Poder por via, nos dois lados. O oponente começa vazio e fica em zero; não existe IA.
- Espaços válidos destacados, destaque mais claro sob a carta e snap ao soltar.
- Anúbis invoca uma figura 3D holográfica em wireframe, sem efeito de combate.
- Finalizar turno bloqueia novas jogadas. Reiniciar restaura o cenário inteiro, incluindo energia e mão.

Os custos e poderes são dados de demonstração. A apresentação parte da imagem conceitual fornecida na conversa: preto e dourado, rio ciano, três vias, leque e guardião frontal. Não reproduz a arte detalhada da imagem, mantendo geometria e texturas leves.

## HTTPS local e acesso pelo Quest

WebXR exige contexto seguro e permissão iniciada por um clique. `http://localhost` é uma exceção segura no próprio aparelho, mas `http://192.168.x.x` não é. O localhost do Quest aponta para o Quest, não para o computador. Para testar sem configurar certificados no headset, a opção mais simples é publicar `dist/` em um host HTTPS.

Para HTTPS local, use [mkcert](https://github.com/FiloSottile/mkcert), já instalado no computador:

```sh
mkdir .cert
mkcert -install
mkcert -key-file .cert/key.pem -cert-file .cert/cert.pem localhost 127.0.0.1 ::1 192.168.1.100
node scripts/serve.mjs --https
```

Substitua `192.168.1.100` pelo IP real do computador. Abra https://localhost:8443 no computador. No Quest, conectado à mesma rede, abra `https://IP-DO-COMPUTADOR:8443`. Libere a porta 8443 no firewall da rede privada, se necessário.

O certificado também precisa ser confiável no Quest: a instalação de mkcert no computador não transfere essa confiança. Instale somente o certificado público da CA (`rootCA.pem`, localizado por `mkcert -CAROOT`) no aparelho por um procedimento compatível com sua versão do sistema. Se isso não estiver disponível, use o host HTTPS ou a alternativa USB abaixo. Ignorar o aviso de certificado não garante um contexto seguro para WebXR. Nunca distribua `rootCA-key.pem` ou a chave privada do servidor; a pasta `.cert/` é ignorada no Git e não faz parte do site.

Alternativa USB de desenvolvimento, com modo desenvolvedor e ADB configurados e o Quest autorizado:

```sh
node scripts/serve.mjs
# Em outro terminal:
adb reverse tcp:8080 tcp:8080
```

Abra http://localhost:8080 no navegador do Quest; o encaminhamento USB dá acesso ao servidor do computador pela exceção de localhost. Essa alternativa não é HTTPS e serve apenas ao teste de desenvolvimento. Para remover o encaminhamento: `adb reverse --remove tcp:8080`.

No navegador do Quest, selecione **Entrar em VR** e aceite a permissão. Abra a página diretamente, evitando iframes que não autorizem `xr-spatial-tracking`.

## Publicar no GitHub Pages

1. Crie um repositório separado e envie o conteúdo desta pasta, incluindo `dist/` e `.github/workflows/pages.yml`.
2. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**.
3. Envie para `main` ou execute **Actions → Publish WebXR sandbox → Run workflow**.
4. Aguarde o workflow terminar. Abra a URL fornecida pela etapa Deploy no Quest e selecione Entrar em VR.

Não há build ou instalação de dependências. Os imports e assets são relativos, então a página também funciona sob `/nome-do-repositorio/`. O workflow incluído pressupõe um repositório exclusivo para este protótipo; não substitua o workflow de publicação do jogo principal por ele.

Para outro host HTTPS estático, publique somente o conteúdo de `dist/`, com `index.html` como entrada e `.js` servido como JavaScript. Não configure fallback HTML para arquivos JavaScript ausentes. Os arquivos podem ser hospedados sem servidor de aplicação ou serviços de terceiros.

## Arquitetura e ligação futura com o game core

```text
mouse / controles WebXR / WebMCP opcional
                 ↓ intenções
             SandboxCore
                 ↓ eventos + estado
       cena Three.js / UI espacial
```

| Arquivo | Responsabilidade |
| --- | --- |
| `dist/src/core.js` | Estado local, validação mínima, custos, poder, comandos e eventos. Sem Three.js. |
| `dist/src/scene.js` | Geometria, atlas de texto, cartas, slots, holograma e sincronização visual. |
| `dist/src/main.js` | Sessão XR, mouse, seleção, movimento, encaixe, conforto e métricas. |
| `dist/src/webmcp.js` | Registro opcional de ferramentas no navegador quando a API está disponível. |
| `scripts/serve.mjs` | Servidor estático HTTP/HTTPS sem dependências. |

Exemplo no console do navegador:

```js
guerrasVR.events.addEventListener('intent', e => console.log(e.detail));
guerrasVR.events.addEventListener('card:played', e => console.log(e.detail));
guerrasVR.events.addEventListener('state:changed', e => console.log(e.detail));
guerrasVR.command('play-card', { cardId: 'anubis', slotId: 'p-1-0' });
guerrasVR.command('end-turn');
guerrasVR.command('reset');
guerrasVR.getState();
guerrasVR.getMetrics();
```

Os identificadores são `p-{via}-{célula}` e `o-{via}-{célula}`, com via 0–2 e célula 0–3. O core só permite jogar em `p-*`. Eventos: `intent`, `card:played`, `turn:ended`, `command:rejected`, `state:changed`. Payloads e snapshots são cópias. O adaptador hoje é síncrono: para um servidor, trocar por uma interface assíncrona, manter a carta pendente até a confirmação e aplicar snapshots autoritativos. Não basta conectar o evento a uma rede e tratar o estado local como verdade. Não existe rede de jogo implementada nesta versão.

## Performance e validação

Objetivo: 72 FPS no Quest 2. **Ainda não medido em um Quest 2 físico nesta entrega.** A solicitação de 72 Hz é feita apenas se a sessão anunciar suporte. O runtime pode escolher outra frequência. O contador espacial mostra cadência de frames, draw calls e triângulos reportados pelo renderer; não é um profiler de GPU.

- Arquitetura e molduras agrupadas com `InstancedMesh`; 24 slots em uma instância.
- Um atlas de texto 2048 × 2048, atualizado apenas quando conteúdo muda.
- Sem sombras, bloom, modelos importados, texturas fotográficas, física ou pós-processamento.
- Resolução XR em escala 1 e foveation 1 quando suportada. DPR desktop limitado a 1,5.
- Luz hemisférica e uma direcional. Holograma pequeno e simples.

Execute os testes:

```sh
node --test tests/*.test.mjs
```

Testes automatizados cobrem economia, jogadas inválidas, espaços ocupados, bloqueio do turno, reset, isolamento dos eventos, raycast matemático das cinco cartas e dos 24 slots, snap e holograma. O teste de cena usa um canvas de texto simulado: não valida rasterização, legibilidade, tracking ou performance real. O servidor HTTP e a sintaxe dos módulos foram verificados. Não foi realizada uma sessão imersiva nem QA visual em navegador nesta entrega. WebMCP é experimental, opcional e não foi validado em navegador compatível.

Roteiro de aceitação no Quest:

1. Entrar em VR sentado; confirmar mesa e leque confortáveis. Ajustar altura e centralizar.
2. Jogar Anúbis com cada controle em testes separados: holograma aparece e energia cai de 6 para 2.
3. Tentar Guerreiro com 2 de energia: permanece na mão. Jogar Sacerdotisa: energia chega a zero.
4. Reiniciar; soltar uma carta no rio, no lado adversário e fora da mesa: volta à mão.
5. Tentar um espaço ocupado. Finalizar durante seleção e tentar jogar depois: estado permanece consistente.
6. Sair e entrar em VR, desconectar um controle e voltar do menu do sistema durante um arraste.
7. Testar de pé, perto de cada canto da mesa, usando ambos os controles e agarrar de perto.
8. Observar o contador por 60 segundos com holograma ativo. Registrar quedas sustentadas abaixo de 72 FPS, legibilidade e conforto. Se houver quedas, reduzir a escala XR para 0,85 antes da próxima sessão e medir novamente.

## Decisão sobre o repositório existente

Foi consultado `Brunoebaraujo/Guerras_Egipcias`: existe `vr-unity/`, mas nenhuma pasta específica de protótipos WebXR. Este projeto foi entregue separado, sem modificar o repositório ou os arquivos sincronizados em `sources/`. A publicação não foi executada; os arquivos e o workflow estão prontos para essa etapa.

Referências técnicas: [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html), [MDN: requestSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession), [segurança WebXR](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security).
