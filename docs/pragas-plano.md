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

Números medidos contra o motor atual (energia **não acumula**: `energy = round`).

- Energia total nas 6 rodadas: `1+2+3+4+5+6 = 21`
- Custo somado das 10 Pragas: **26** (+1 de Moisés = 27) → **impossível jogar todas**
- Cartas vistas: 3 de abertura + 6 compras = **9 de 12**
- Teto teórico com curva perfeita: até 8 Pragas diferentes → **128 de Poder em uma via só**

Com 128 numa via e nada nas outras duas, o jogador **perde de 2×1**. Confirma a decisão #9: o set é um **pacote** (Moisés + 5–6 Pragas + 5–6 guerreiros), com Moisés parando realisticamente em **16–32**. Isso precisa estar escrito no documento de design, senão o primeiro playtest vai parecer que o arquétipo está quebrado quando na verdade está sem vias.

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

### Fase 2 — Moisés isolado
Registro `pragasVistas`, gravação por snapshot, regra de "só em campo", preservação do registro para ressurreição futura. **Sem nenhuma Praga ainda** — Moisés testado contra um efeito falso.

### Fase 3 — As sete Pragas simples
Sangue, Piolhos, Moscas, Peste, Granizo, Nuvem de Gafanhotos, Morte dos Primogênitos.
Todas reusam verbos existentes: `aplicarBencao` com valor negativo, `resolveDestroyAllOfTypeInLane` ganhando escopo de lado.

### Fase 4 — As três estruturais
- **Rãs** — criar token em slot inimigo vazio, via sorteada entre as que têm espaço
- **Úlceras** — hook de início de rodada; marca sobrevive a mudança de via, morre com a carta; não tica na rodada em que foi aplicada
- **Trevas** — fila de revelação em duas ondas; atraso ignorado na rodada 6

### Fase 5 — Moldura de medalhão
Variante no `Carta.jsx` + mapa `POS` novo. **Render-and-inspect antes de subir.** As Pragas não têm disco de Poder.

### Fase 6 — Arte
Dez prompts novos, no fluxo de sempre. Último de propósito: só vale desenhar depois que as regras pararem de mexer.

### Fase 7 — Filtros da Galeria
Custo, tipo, arquétipo e set.

---

## 6. Tabela de cartas (versão a implementar)

| # | Carta | Custo | Poder | Efeito |
|---|-------|-------|-------|--------|
| — | **Moisés, Portador das Pragas** | 1 | 0 | Começa na mão inicial. A 1ª Praga diferente enquanto em campo dá +1 de Poder. Cada Praga diferente seguinte **dobra** o Poder atual |
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
