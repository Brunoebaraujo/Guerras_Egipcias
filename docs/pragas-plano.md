# Set das Pragas — plano de implementação

Documento vivo. Consolida o PDF de design + as decisões tomadas em sessão.
Serve para retomar o trabalho de qualquer ponto sem reabrir as mesmas perguntas.

---

## 1. Decisões fechadas

| # | Questão | Decisão |
|---|---------|---------|
| 1 | Estatísticas dos tokens | **Rã: custo 1 / poder 1** (custo 1 de propósito, para ser alvo da Sekhmet). **Mosca: custo 1 / poder 0** |
| 2 | Dono da Rã | Pertence ao **oponente**, ocupando um slot dele |
| 3 | Onde mora o acúmulo de Moisés | Em `mods` — logo **Anúbis e Maat zeram** o acúmulo |
| 4 | Alcance de Trevas | **Global**: afeta os dois lados |
| 5 | Praga ocupa slot | **Sim**. Via cheia (4/4) não aceita Praga. Já é o comportamento do `place` |
| 6 | Mão de abertura | Moisés é **forçado** na mão inicial; as outras 3 são aleatórias |
| 7 | Praga 8 (Gafanhotos) | Efeito sobe para **-2 de Poder** por via (diferencia da Praga 1, que é -1 a custo 1). Nome sugerido: **Nuvem de Gafanhotos**, para não colidir com "Enxame de Gafanhotos" do set base |
| 8 | Praga 5 (Peste nos Animais) | Mantida como está. O tipo **Animal** vai crescer em sets futuros |
| 9 | Viabilidade do arquétipo | Por design, **não se sustenta sozinho**. O deck precisa de um segundo arquétipo (guerreiros) para contestar as outras duas vias |

### Consequências derivadas (registradas)

- **Moisés é custo 1 / poder 0.** Morre para Sekhmet e para a Praga 7 (Granizo) do adversário.
- A **Rã**, sendo custo 1, também morre para Sekhmet e pode ser destruída pelo Granizo do próprio jogador que a criou (ela é "carta inimiga").
- **Trevas na rodada 6**: o atraso é **ignorado** na última rodada. Equivale à "regra global de encerramento" do PDF sem exigir uma revelação forçada dentro de `finish` (o que quebraria a animação passo a passo do cliente).
- A duplicação de Moisés passa por `aplicarBencao` para manter o padrão do motor. Não há laço com Renenutet: quem espalha é ela **ao receber**, e Moisés não tem `spreadOnBlessing`.

### Decisões complementares

| # | Questão | Decisão |
|---|---------|---------|
| 10 | Selo do Silêncio vs. Praga | **Bloqueia.** O efeito de uma Praga é um "Ao Entrar" para todos os efeitos. A Praga é consumida mesmo assim (sai do campo), e **Moisés não recebe o Sinal** — praga sem efeito é praga que não aconteceu |
| 11 | Rã e o contador `plays` | **Incrementa** `plays` do oponente, alimentando a Ammit dele. É consequência de uma decisão do jogador que lançou a Praga, e faz parte do preço |
| 12 | Mão de abertura | **Confirmado:** Moisés + 3 aleatórias = 4 cartas, o tamanho atual (3 da abertura + a compra da rodada 1) |
| 13 | As Pragas são escolhíveis? | **Não.** Ficam fora da coleção. O jogador escolhe Moisés + 11 cartas = 12; ao começar a partida o jogo **acrescenta as 10 Pragas e embaralha** |
| 14 | Como o jogador as consulta? | Botão **Pragas** na Galeria — visualização apenas, sem seleção |
| 15 | Pragas não consomem a reserva da Heka | Uma carta sem Poder que deixa o campo comeria o +3 sem interação nenhuma. A reserva **espera** a próxima carta que fica — normalmente o Moisés, e aí as Pragas seguintes dobram o bônus. É o combo que o PDF descreve |

---

## 2. Lacunas estruturais do motor

O set não são "mais 10 cartas": são quatro mecânicas de fundação que o motor ainda não tem.

| Novidade | Estado atual | O que muda |
|----------|--------------|------------|
| **Carta efêmera** | A única saída do `board` é `dying`, que incrementa `deaths[]` e `destroyedPower[]` | Nova saída `consumida`, que **não conta como morte**. Sem isso, cada Praga alimenta Osíris (+2) e Am-heh de graça |
| **Tokens** | `CARDS` é a coleção, a fonte do `byKey` e a lista do deckbuilder | Separar `TOKENS`; `byKey` une os dois; galeria e deckbuilder continuam lendo só `CARDS`. Entra o tipo **Animal** |
| **Custo por instância** | Custo é sempre `byKey[key].custo`, lido em ~12 pontos | Helper `custoDe(carta)`; campo `custoMod` viajando mão → tabuleiro |
| **Efeito de início de rodada** | `nextRound` só faz energia, compra e prioridade | Hook de início de rodada (Úlceras) |
| **Revelação atrasada** | `buildRevealQueue` = prioridade → ordem de colocação | Fila passa a ordenar por `enteredRound` → prioridade → colocação. `enteredRound` **já existe**; a mudança é pequena |
| **Moldura em medalhão** | `Carta.jsx` tem `moldura.png` e o mapa `POS` fixos | Variante `formato: "praga"` com asset e `POS` próprios |

---

## 3. Moisés — o modelo de duplicação

O PDF exige que buffs externos (Heka, Hathor, Armadura de Ptah) **também sejam dobrados**. Isso colide com a invariante do motor: `power()` é a **soma** de `decomporPartes()`, e é isso que impede o número exibido de divergir da explicação.

**Solução adotada — dobrar é gravar uma parcela igual ao total atual:**

```
Praga diferente resolve
  → total = power(moises, ctx)
  → aplicarBencao(s, moises, total || 1, `Praga: ${nome}`)
```

- 1ª Praga: total 0 → parcela **+1** (regra especial do PDF)
- 2ª Praga: total 1 → +1 → **2**
- 3ª Praga: total 2 → +2 → **4**
- 4ª: → **8** · 5ª: → **16** · 6ª: → **32**

A duplicação sai de graça do modelo aditivo, o breakdown continua legível linha a linha e `power()` não muda.

**Preço aceito:** auras (Amon, Montu) entram **congeladas** na parcela. Se Amon morrer depois, a aura viva some mas a metade já congelada permanece. É coerente com o que Enxame e Apófis já fazem, e tematicamente correto — a praga dobrou o Poder daquele instante.

**Alternativa rejeitada:** multiplicador contínuo. Exigiria estágios multiplicativos em `decomporPartes` e quebraria a invariante soma-igual-a-total.

### Registro na carta

```js
moises.pragasVistas = ["sangue", "ras", ...]   // chaves, para "Praga diferente"
```

Vive no objeto da carta no `board`, então qualquer ressurreição futura preserva Poder e registro automaticamente — sem precisar de um cemitério de verdade agora.

**Regra de campo:** Moisés só registra a Praga se estiver `revealed && !dying` **no instante** em que a Praga resolve. Como a revelação segue a ordem de colocação, jogar a Praga antes de Moisés na sequência anula o Sinal. É expressão de habilidade, não bug.

---

## 4. Matemática do arquétipo

Energia **não acumula** (`energy = round`), então o orçamento é 1, 2, 3, 4, 5, 6 por rodada — 21 no total. O custo somado das 10 Pragas é **26**: jogar todas é impossível por construção.

### O que a outorga mudou

Com o deck de 12, a curva era quebrada: 9 cartas vistas de 12, controle quase total da compra, e um teto teórico de **128 de Poder numa via só** — que perdia de 2×1 justamente por concentrar tudo numa via.

A decisão #13 (deck de 12 → 22) **resolveu isso**. Agora são 9 cartas vistas de 22, com a compra fora do controle do jogador.

Simulação de 200.000 partidas, compra guloso-ótima (Praga inédita mais barata primeiro, para maximizar Sinais), Moisés na rodada 1, sem outros buffs:

| Poder final do Moisés | Frequência |
|---|---|
| 1 | 0,7% |
| 2 | 6,1% |
| 4 | 22,2% |
| **8** | **35,3%** |
| 16 | 26,8% |
| 32 | 8,1% |
| 64 | 0,7% |

- Média de Pragas compradas: **4,28**
- Média das suas 11 cartas escolhidas que aparecem: **4,72** — o suficiente para contestar as outras duas vias
- Mediana do Poder do Moisés: **8**

O arquétipo passou a ter variância real sem teto absurdo, e o custo dele deixou de ser só "concentrar numa via": passou a ser **perder o controle da própria compra**. Continua valendo a decisão #9 — as 11 vagas precisam de um segundo arquétipo.

---

## 5. Plano em fases

Parar entre cada fase, com testes verdes e push. As fases 1 e 2 são as que podem quebrar coisa antiga.

### Fase 0 — Galeria e metadados
Ordenação por custo, 4 colunas, helper `setDe(def)` (`"base"` por padrão) para destravar os filtros futuros sem tocar nas 26 cartas existentes.

### Fase 1 — Fundação efêmera (`engine.js` + `match.js`) ✅ concluída
- `consumirCarta(s, card)` — saída de campo sem morte. Reusa a marca `dying` (que os filtros e a animação já entendem) mas **não passa por `destroyList()`**. A garantia contra Osíris/Am-heh/Múmia/Bennu é **estrutural**, não uma varredura de call sites.
- `TOKENS` separado de `CARDS`: `token-ra` (1/1) e `token-mosca` (1/0), ambos tipo **Animal**. `byKey` une os dois; Galeria e deckbuilder continuam lendo só `CARDS`. Chaves prefixadas para não colidirem com um futuro **Rá**, o deus-sol.
- `custoDe(instancia)` — custo impresso + `custoMod`. Aplicado em: energia paga (`place`), devolução (`pickup`), **Sekhmet**, e nos 4 pontos de exibição da UI (mão desktop, mão mobile, MiniCard do tabuleiro, zoom). O `custoMod` viaja mão → tabuleiro → mão.
- `snapshotTabuleiro` distingue `(consumida)` de `(morrendo)` no log de partida.
- **27 testes novos** em `src/pragas.test.js`. Suíte: 93 → **120**.

Armadilha encontrada e corrigida: `dying = s.effectSeq` vira **falsy quando `effectSeq` é 0**. O motor só escapava disso porque `step` sempre incrementa antes de resolver. `consumirCarta` usa `s.effectSeq || 1`.

### Fase 2 — Moisés, a outorga e as 10 Pragas como cartas ✅ concluída
Em vez de testar Moisés contra um efeito falso, as 10 Pragas entraram como **cartas completas com efeito ainda vazio**. Isso torna a fase inteira jogável no navegador: a outorga, a diluição, o consumo e os Sinais já funcionam, e as Fases 3 e 4 só preenchem os efeitos.

- **Moisés** em `CARDS` (custo 1, Poder 0, tipo **Profeta** — de propósito: o Assassino Medjay caça Divindades, não profetas). Declara `abertura: true` e `outorga: "pragas"`.
- **`PRAGAS`** — as 10, fora de `CARDS`, com nome, custo, tipo `Praga`, texto e lore. `byKey` une coleção + pragas + tokens.
- **`expandirDeck(list)`** e o mapa `OUTORGAS` — genérico: qualquer arquétipo futuro que entregue um sub-deck só declara a sua outorga.
- **`puxarParaAbertura(deck)`** — cartas com `abertura: true` sobem ao topo depois do embaralhamento.
- **`registrarPraga(s, key)`** — os Sinais, por snapshot. Progressão 1, 2, 4, 8, 16, 32 verificada em teste.
- **Ramo das Pragas no `step`** — ordem do PDF: efeito → `consumirCarta` → Sinal. Selo do Silêncio bloqueia e a Praga é gasta sem Sinal.
- **UI** — aba "Pragas" na Galeria (só visualização, com nota explicativa), aviso `+10 Pragas outorgadas` nos três deckbuilders, e preset **"Pragas"** para playtest.
- **34 testes novos** em `src/moises.test.js`. Suíte: 120 → **154**.

Detalhe que caiu de graça: como Moisés é custo 1, ele morre para a **Sekhmet** e para a **Chuva de Granizo e Fogo** do adversário. E dobrar um Poder negativo piora a carta, então **debuffar Moisés é resposta legítima** — tem teste.

### Fase 3 — As sete Pragas simples ✅ concluída
- **`PRAGA_EFEITOS`** em `engine.js`: mapa `key → resolvedor`, exposto por `resolvePraga(s, praga, rng)`. O `match.js` não sabe o que cada Praga faz — ele só garante a ordem do PDF (efeito → consumo → Sinal).
- **Sangue (-1)** e **Nuvem de Gafanhotos (-2)** compartilham `debuffPorVia`: uma vítima sorteada **por via**, e via vazia não desperdiça o efeito das outras. Debuff é `mods`, permanente.
- **Piolhos** e a segunda metade do **Granizo** compartilham `agravarCartaNaMao`: `custoMod += 1` na instância, que viaja para o tabuleiro e muda o que a Sekhmet e a Morte dos Primogênitos alcançam.
- **Moscas**: duas `token-mosca` inseridas em posições sorteadas independentes do deck inimigo.
- **Peste**: `resolveDestroyAllOfTypeInLane` ganhou a opção `{ escopo: "inimigos" }`. O padrão segue `"todos"`, então o **Assassino Medjay não mudou**.
- **Granizo**: destrói uma inimiga de custo **efetivo** 1 — alcança o Moisés adversário — e depois agrava a mão.
- **Morte dos Primogênitos**: maior custo efetivo, empate por sorteio.
- **37 testes novos** em `src/pragas-efeitos.test.js`. Suíte: 154 → **191**.

**Decisão de alcance registrada:** as Pragas atingem cartas **ainda por revelar**, filtrando apenas `!c.dying`. Não é uma escolha nova — é o critério que a Sekhmet, o Assassino Medjay e o `validTargets` já usavam; o motor nunca exigiu `revealed` para efeito nenhum. Consequência tática: quem tem prioridade acerta o que o oponente acabou de posicionar. Se algum dia isso for revisto, precisa ser revisto **no motor inteiro**, não só no set.

**Reversão da decisão sobre o tipo do Moisés:** ele é **Divindade**, não Profeta. O objetivo é justamente que o **Assassino Medjay** o alcance.

### Fase 4 — As três estruturais ✅ concluída
- **Rãs** — token criado em via inimiga sorteada entre as que têm espaço. Entra revelada, pertence ao oponente e **incrementa o `plays` dele** (decisão #11), alimentando a Ammit adversária.
- **Úlceras** — marca `c.ulceras` no objeto da carta, então acompanha mudança de via e morre com a carta, sem código extra. `aplicarUlceras(s)` roda no fim do `nextRound`: um mod `-1` por rodada, para cada tique aparecer separado na decomposição do Poder.
- **Trevas** — `buildRevealQueue` ganhou uma **regra 0**: ondas por `enteredRound`, antes de prioridade e ordem de colocação. Com todas as pendentes na mesma rodada — o caso normal — há uma onda só e o resultado é byte a byte o de antes.
- **UI** — marca ☠ na carta ulcerada (o -1 silencioso por rodada precisava ser visível) e aviso da rodada escurecida no desktop e no mobile.
- **20 testes** em `src/trevas.test.js` + 14 em `pragas-efeitos.test.js`. Suíte: 191 → **225**.

**Simplificação registrada:** o PDF diz "Escolha uma via" nas Úlceras, mas a Praga **já é posicionada numa via** — a colocação da carta *é* a escolha. Adotei "na via em que esta Praga foi jogada", igual à Peste, e o texto da carta foi ajustado. Evita inventar uma pausa de mira de via, que o motor não tem.

**Bug de fronteira encontrado e fechado:** carta atrasada pelas Trevas continua `revealed: false` na rodada seguinte, e o `pickup` só exigia `!c.revealed` — o jogador poderia **recolher e reembolsar** cartas pagas na rodada anterior. `pickup` agora recusa quando `c.enteredRound < s.round`.

**Trevas na rodada 6:** a Praga agenda `s.trevas = round + 1`, que nunca casa. E se ela cair na rodada 5, o `startReveal` da rodada 6 ignora o atraso — é a "regra global de encerramento" do PDF, escrita assim para não forçar uma revelação dentro do `finish` e quebrar a animação passo a passo do cliente.

### Fase 5 — Moldura de medalhão ✅ concluída
Componente `CartaPraga` no `Carta.jsx`, acionado por `tipo === "Praga"`. Não usa o mapa `POS` nem a `moldura.png`: a geometria toda é **desenhada e derivada de `width`**, então escala em qualquer tamanho sem asset novo.

- **Medalhão circular** com anel ouro → lápis-lazúli → ouro. É o vocabulário material do próprio assunto (cloisonné egípcio), não ornamento genérico.
- **Conector numerado** — o elemento de assinatura. As dez pragas *são* uma sequência canônica, então a ordem carrega informação real que o jogador reconhece. Campo `ordem: 1..10` nas definições.
- **Sem disco de Poder.** É metade da razão desta moldura existir.
- **Distinção material deliberada:** as cartas da coleção são papiro pintado (tinta escura sobre fundo claro); as Pragas são **estelas de pedra** — texto claro gravado em pedra escura. Praga não é combatente que se joga na via: é decreto.
- **`MiniCard` do tabuleiro** deixou de mostrar Poder para Pragas — mostrava um `0` mentiroso. No lugar, o número da praga num disco dourado.

Verificado por render-and-inspect (Chromium headless sobre o `dist`): as dez cartas renderizam, e a checagem programática de `scrollHeight > clientHeight` não achou overflow em nenhuma — inclusive na Praga das Úlceras, que tem o texto mais longo do set, e na Morte dos Primogênitos, de número com dois dígitos.

**Trade-off registrado:** a moldura é **desenhada em CSS**, não pintada. Vantagem: existe agora, escala sozinha e não depende de asset. Se um dia a estética pedir uma moldura pintada no mesmo traço da `moldura.png`, ela entra como imagem de fundo do componente sem mexer no resto do layout.

### Fase 6 — Arte ⏳ próxima
Onze prompts novos (as 10 Pragas + Moisés), no fluxo de sempre. Último de propósito: só vale desenhar depois que as regras pararem de mexer — e elas pararam.

Particularidade do set: a arte é recortada em **círculo**, não em retângulo. Os prompts precisam pedir composição centralizada e radial, com o assunto longe das bordas, porque o `object-cover` circular corta os quatro cantos. `arteFoco` continua valendo para assunto alto.

### Fase 7 — Filtros da Galeria
Custo, tipo, arquétipo e set.

---

## 6. Tabela de cartas (versão a implementar)

| # | Carta | Custo | Poder | Efeito |
|---|-------|-------|-------|--------|
| — | **Moisés, Portador das Pragas** (Divindade) | 1 | 0 | Começa na mão inicial. A 1ª Praga diferente enquanto em campo dá +1 de Poder. Cada Praga diferente seguinte **dobra** o Poder atual |
| 1 | Águas Transformadas em Sangue | 1 | — | Uma carta inimiga aleatória em cada via ocupada recebe **-1** de Poder |
| 2 | Praga das Rãs | 2 | — | Crie uma **Rã (1/1, Animal)** num espaço vazio de uma via inimiga aleatória. A Rã pertence ao oponente |
| 3 | Praga dos Piolhos | 1 | — | Aumente em 1 o custo de uma carta aleatória na mão do adversário |
| 4 | Praga das Moscas | 2 | — | Embaralhe duas **Moscas (1/0, Animal)** no deck do adversário |
| 5 | Peste nos Animais | 3 | — | Destrua todos os Animais inimigos na via em que esta Praga foi jogada |
| 6 | Praga das Úlceras | 2 | — | Escolha uma via. Uma carta inimiga aleatória nela recebe Úlceras: **-1** de Poder no início de cada rodada enquanto permanecer em jogo |
| 7 | Chuva de Granizo e Fogo | 3 | — | Destrua uma carta inimiga aleatória de custo 1 em jogo. Depois, aumente em 1 o custo de uma carta aleatória na mão do adversário |
| 8 | **Nuvem de Gafanhotos** | 3 | — | Uma carta inimiga aleatória em cada via ocupada recebe **-2** de Poder |
| 9 | Trevas sobre o Egito | 3 | — | Na próxima rodada, as cartas dos **dois lados** permanecem ocultas. Na rodada seguinte, revele primeiro as atrasadas. Ignorado na rodada 6 |
| 10 | Morte dos Primogênitos | 6 | — | Destrua a carta inimiga de maior custo em jogo. Empate: escolha aleatória |

Custo lido sempre por `custoDe()` — as Pragas 3 e 7 alteram custos, e isso afeta Sekhmet e a Praga 10.
