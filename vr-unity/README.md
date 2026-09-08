# Guerras Egípcias VR — Unity client

Cliente VR do Guerras Egípcias. Este projeto é apenas apresentação/input e nunca deve reimplementar as regras existentes em `src/domain` e `src/match`.

## Versão base

- Unity 6.3 LTS (`6000.3.16f1` no bootstrap atual)
- URP 17.3
- OpenXR 1.15.1
- XR Interaction Toolkit 3.4
- XR Plugin Management 4.5.3
- Input System 1.16

## Antes de abrir

No Unity Hub, instale o Unity 6.3 LTS com:

- Android Build Support
- Android SDK & NDK Tools
- OpenJDK

O Quest 2 precisa estar em Developer Mode e conectado por USB-C para o primeiro deploy.

## Primeira abertura

1. No Unity Hub, use **Add > Add project from disk**.
2. Selecione a pasta `vr-unity` deste repositório.
3. Deixe o Package Manager restaurar os pacotes.
4. Abra **File > Build Profiles** e habilite/switch para **Meta Quest**. Se a opção Meta Quest não aparecer, use Android.
5. Em **Project Settings > XR Plug-in Management**, habilite **OpenXR** para Meta Quest.
6. No OpenXR Feature Group, habilite **Meta Quest Support**.
7. Configure o render mode para **Multi-View**.
8. Importe o **Meta XR Core SDK** pelo Package Manager/My Assets e rode **Meta > Tools > Project Setup Tool** para corrigir pendências específicas do Quest.

## XR Origin / controllers

O sandbox procedural do tabuleiro é criado automaticamente ao entrar em Play Mode, mas tracking e controladores dependem do rig XR da cena.

Para o primeiro teste:

1. Package Manager > XR Interaction Toolkit > Samples.
2. Importe **Starter Assets**.
3. Crie/salve `Assets/Scenes/Phase1Sandbox.unity`.
4. Adicione um **XR Origin (VR)** à cena usando o fluxo do XR Interaction Toolkit.
5. Posicione o jogador aproximadamente em `X=0, Y=0, Z=-1.35`, olhando para `+Z`.
6. O tampo do tabuleiro é criado a aproximadamente `Y=0.72 m`, pensado para experiência sentada.

## O que já é criado automaticamente

`BoardSandboxBuilder` gera em runtime:

- mesa 2,80 m × 1,72 m;
- Rio Nilo no centro;
- 3 vias;
- 2 matrizes 2x2 em cada via (jogador/oponente);
- 24 slots totais;
- separadores visuais de vias;
- referência de posição sentada do jogador.

Todos os elementos são primitives e materiais simples de propósito. Não há arte final nem lógica de gameplay nesta fase.

## Arquitetura de servidor

Regra fixa:

```text
Quest / Unity -> WebSocket -> servidor autoritativo -> src/match + src/domain
```

Inclusive contra BOT.

O Quest nunca deve:

- calcular efeito de carta;
- validar custo/energia;
- decidir RNG;
- calcular poder;
- determinar vencedor;
- executar IA do BOT.

A constante `VrServerPolicy.AllowLocalGameplayRules` deve permanecer `false`.

## Critério de conclusão da Fase 1

Não considerar a fase concluída apenas porque o projeto compila no Editor. É obrigatório comprovar em Quest 2:

- app abre;
- head tracking funciona;
- controles esquerdo/direito funcionam;
- tabuleiro inteiro é confortável sentado;
- 24 slots são legíveis;
- 3 vias e Nilo são claros;
- performance estável com baseline de 72 Hz.

## Próximo desenvolvimento após o primeiro build

1. ajustar escala/distância com o headset real;
2. criar interação de raycast nos slots;
3. congelar coordenadas finais do tabuleiro;
4. preparar contrato WebSocket C#;
5. só então iniciar a Fase 2 (mão e interação das cartas).
