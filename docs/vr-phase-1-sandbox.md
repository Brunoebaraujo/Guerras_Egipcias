# Guerras Egípcias VR — Fase 1: Sandbox Quest 2

## Objetivo

Provar o modo VR como um novo cliente do Guerras Egípcias, sem duplicar regras.

O Quest 2 será sempre um cliente conectado ao servidor — inclusive em partidas contra BOT. Nenhuma regra de carta será portada para C#.

## Arquitetura congelada

```text
Quest 2 / Unity
    |
    | WebSocket
    v
Servidor autoritativo
    |
    v
src/match + src/domain
```

O cliente VR será responsável por:

- tracking da cabeça e controles;
- apresentação do tabuleiro em 3D;
- seleção e interação espacial;
- animações e VFX;
- envio de intenções de jogo ao servidor;
- interpretação do estado filtrado recebido do servidor.

O cliente VR NÃO será responsável por:

- resolver efeitos;
- calcular poder;
- validar jogadas;
- embaralhar/comprar cartas;
- decidir resultado da partida;
- executar lógica do BOT.

## Stack da Fase 1

- Unity 6.3 LTS
- Universal Render Pipeline (URP)
- Unity OpenXR Plugin
- XR Plugin Management
- XR Interaction Toolkit
- Meta XR Core SDK apenas para recursos Quest que não sejam cobertos pelo OpenXR genérico
- Android/Meta Quest build target

## Escopo do Sandbox

A Fase 1 deve entregar uma cena simples com:

1. aplicação abrindo no Quest 2;
2. tracking 6DoF da cabeça;
3. controles esquerdo/direito rastreados;
4. mesa/tabuleiro à frente do jogador;
5. Rio Nilo no centro;
6. três vias;
7. quatro espaços 2x2 por via e por jogador;
8. lado do jogador e lado do oponente claramente separados;
9. escala confortável sentado;
10. 72 Hz como baseline de performance.

## Fora do escopo desta fase

- regras de cartas;
- mão jogável;
- flip/reveal;
- hologramas;
- HUD final;
- matchmaking;
- BOT operacional no Quest;
- multiplayer cross-platform completo;
- hand tracking.

## Layout de referência

Cada via possui 4 posições por jogador em matriz 2x2.

```text
                 OPONENTE

        VIA 1       VIA 2       VIA 3
       [ ][ ]       [ ][ ]       [ ][ ]
       [ ][ ]       [ ][ ]       [ ][ ]

================ RIO NILO ================

       [ ][ ]       [ ][ ]       [ ][ ]
       [ ][ ]       [ ][ ]       [ ][ ]
        VIA 1       VIA 2       VIA 3

                 JOGADOR
```

## Critérios de aceite

A Fase 1 só é considerada concluída quando um build real no Quest 2 comprovar:

- app inicia sem erro;
- headset acompanha cabeça corretamente;
- os dois controles aparecem e acompanham as mãos;
- jogador sentado enxerga todo o tabuleiro sem precisar se levantar;
- todas as 24 posições de carta estão claramente legíveis;
- três vias são imediatamente distinguíveis;
- Nilo divide os dois lados;
- frame rate permanece estável no sandbox;
- não existe regra de jogo implementada no cliente Unity.

## Decisões já tomadas

- Quest 2 é o hardware mínimo.
- VR será um modo adicional, não um fork do jogo.
- BOT no Quest também será server-side.
- Controllers são prioridade; hand tracking fica para uma fase posterior.
- OpenXR é a camada principal de XR.
- Quest-specific APIs devem ser isoladas para não contaminar o core multiplataforma.

## Pendências após o Sandbox

- definir contrato WebSocket C# ↔ protocolo atual;
- implementar modo BOT server-side para o cliente Quest;
- criar adaptador `gameState -> VRPresentationState`;
- criar event stream de apresentação para reveal/VFX nas fases posteriores.
