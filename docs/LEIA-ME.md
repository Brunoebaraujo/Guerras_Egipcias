# Sobre esta pasta

Notas **históricas** de implementação e design, guardadas pelo raciocínio que
registram — não pela descrição de estado atual.

A arquitetura vigente está no `README.md` da raiz. Onde um documento daqui
discordar do código, o código vence: vários descrevem a estrutura anterior à
extração de `src/domain/` e `src/match/` e ao registry de efeitos.

| arquivo | o que é |
|---|---|
| `implementacao-m*.md` | diários dos marcos de implementação, com decisões e alternativas descartadas |
| `multiplayer-notas.md` | design do multiplayer, extraído de um protótipo inicial |
| `operacao-e-rollback.md` | **operacional e atual**: sinais de saúde, diagnóstico e rollback |
| `pragas-plano.md`, `animais-plano.md` | desenho dos arquétipos |
| `*-prompts-arte.md` | prompts de arte por arquétipo (o padrão vivo está na skill `guerras-arte-standards`) |

Dois workflows de exemplo (`deploy.yml`, `exemplo-github-actions-deploy.yml.txt`)
foram removidos daqui: estavam obsoletos e o README antigo mandava copiá-los por
cima do pipeline real, o que apagaria lint, tipos, testes de servidor, E2E e o
deploy condicional do Render. O pipeline verdadeiro é
`.github/workflows/deploy.yml` e não tem cópia.
