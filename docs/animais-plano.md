# Arquétipo Animal — decisões de implementação

Documento vivo. Registra o que foi decidido ao levar o documento de design para
dentro do motor, com atenção aos pontos em que a especificação e as regras já
existentes do projeto não coincidiam.

---

## 1. Identidade

| | Guerreiros | Animais |
|---|---|---|
| Poder por carta | alto | baixo |
| Quantidade | poucas | muitas, com fichas |
| Fortalecimento | Montu (+2 por Guerreiro) | Domador (+1 por Animal) |
| Escala | eficiência | ocupação: Garça e Ápis pagam por tabuleiro cheio |
| Fraqueza | remoção pontual | Peste nos Animais, Sekhmet, efeitos de via inteira |

Animais **não** recebem Montu, e Guerreiros **não** recebem o Domador: os hinos
apontam para um `tipo` só.

---

## 2. Decisões fechadas

| # | Questão | Decisão |
|---|---|---|
| 1 | Como se lê o arquétipo | Pelo `tipo` da definição (`tipo: "Animal"`), que já existia por causa da Peste nos Animais. Sem campo novo, sem sistema paralelo de tags |
| 2 | **Via cheia** | **Por lado: os 4 espaços de um jogador naquela via.** Ver §3 |
| 3 | Custo das fichas | **0**, ao contrário das fichas das Pragas (custo 1). Ver §4 |
| 4 | Quem conta como Animal em jogo | Só o que está **revelado e não morrendo**. Ver §5 |
| 5 | Alvo do Macaco Sagrado | **Sorteado**, sem pausa de mira. Ver §6 |
| 6 | O que a Aura do Gato bloqueia | Efeitos que **escolhem** uma carta, sorteio incluído. Não bloqueia global nem via inteira. Ver §7 |
| 7 | Aura do Domador | Contínua, recalculada a cada leitura — nunca vira bônus gravado. Dois Domadores acumulam |
| 8 | Bônus do Ápis | Gravado em `mods` na entrada: permanente, congelado, imune a mudanças posteriores |
| 8b | Bônus da Garça | **Contínuo**, recalculado a cada leitura. Ver §15 |
| 9 | Fichas alimentam a Ammit | **Sim** — `plays` incrementa. Mesma regra da Rã das Pragas |
| 10 | Hiena conta outra Hiena aliada destruída | **Sim.** Hiena é Animal |

---

## 3. Via cheia é por lado — e por quê

O documento de design sugere contar os oito espaços dos dois jogadores, mas abre
exceção explícita quando o projeto já tem uma definição oficial. E tem: a
mensagem `Via 2 cheia (4/4)` que o jogador vê ao tentar posicionar uma carta é
uma conta **por lado**, e a mesma conta governa Bennu, Rãs, Set e Enxame.

Duas razões práticas fecharam a questão:

- Com a regra dos oito espaços, a escala da Garça descrita no próprio documento
  (0 → 2, 1 → 5, 2 → 8, 3 → 11) é inalcançável: três vias cheias exigiriam 24
  cartas em campo. Por lado, os quatro degraus são todos jogáveis, e a carta
  vira o pagamento natural de um arquétipo que enche o tabuleiro.
  (Com a Garça contínua, §15, isso passou a valer ainda mais.)
- A conta estava repetida em cinco lugares do motor. Agora existe uma só:

```js
LANE_CAP = 4
ocupacaoDaVia(board, owner, lane)
viaCheia(board, owner, lane)
viasComEspaco(board, owner, exceto?)
contarViasCheias(board, owner)
```

Se um dia a Garça tiver que exigir os dois lados cheios, o único lugar a mudar é
`contarViasCheias()`.

---

## 4. Fichas custo 0

As fichas das Pragas (Rã, Mosca) são custo 1 **de propósito**, para que a Sekhmet
as alcance. As do arquétipo Animal são custo 0, seguindo o documento de design: o
arquétipo já é vulnerável à Peste nos Animais, ao Assassino Medjay e a qualquer
efeito de via inteira. Somar a Sekhmet a isso seria cobrar duas vezes pela mesma
fraqueza.

É uma decisão de balanceamento, não de arquitetura: trocar `custo: 0` por
`custo: 1` nas duas fichas basta para reverter.

---

## 5. Só o revelado tem tipo

Identidade de arquétipo conta apenas cartas reveladas. Sem essa regra, a Cabra do
Nilo se somaria a um Cão que só revela depois dela, e o Ápis contaria cartas que
o oponente ainda pode recolher.

Efeitos de **destruição** seguem a regra antiga do motor (só `!dying`): quem some,
some oculto. Sekhmet, Medjay e Peste continuam alcançando cartas por revelar.

---

## 6. Macaco Sagrado: alvo sorteado

O documento descreve uma seleção interativa em dois passos (escolher o Animal,
depois a via). O motor tem uma pausa de mira (`awaitingAim`) que sustenta **um**
passo, numa via só, e hoje serve apenas à Hathor.

Optamos pelo sorteio, que é o padrão já estabelecido para movimento e para alvo
único no projeto — Set dispersa duas cartas sorteadas, Armadura de Ptah funde-se
com um aliado sorteado. Vantagem colateral: a revelação continua correndo sem
parar, o que importa no multiplayer, onde cada pausa é uma ida e volta ao
servidor.

Se a seleção interativa for desejada, o trabalho é: estender `awaitingAim` para
aceitar alvo em qualquer via, acrescentar um segundo passo de escolha de via, e
ensinar `isAimable` a distinguir os dois momentos.

---

## 7. A Aura do Gato Egípcio

A distinção que vale não é "efeito bom / efeito ruim", é **quem escolhe uma carta**.

**Bloqueia** (o efeito precisa apontar uma vítima):
Set, Águas em Sangue, Nuvem de Gafanhotos, Praga das Úlceras, Chuva de Granizo,
Morte dos Primogênitos, e qualquer mira inimiga futura.

**Não bloqueia** (varrem sem escolher):
Sekhmet (custo, tabuleiro inteiro), Assassino Medjay e Peste nos Animais (via
inteira), Maat, Anúbis, apuração de fim de partida.

**Sorteio conta como escolha.** Um efeito que sorteia precisa apontar uma carta
para resolver, e é exatamente esse apontar que o Gato impede.

A validação mora em `podeSerAlvo(board, alvo, fonte)` e entra **dentro dos
seletores de alvo** — `inimigasNoCampo` (que serve a todas as Pragas de alvo
único), `validTargets` e o pool do Set. Consequência importante: o alvo é
revalidado **no momento da resolução**, não só quando a interface pinta o realce.
A interface usa a mesma função (`isAimable` do `match.js`), então realce e
validação não podem divergir.

O Gato protege **todas** as cartas aliadas da sua via, de qualquer tipo, e a si
mesmo. Dois Gatos na mesma via não somam nada.

---

## 8. Hinos: Montu virou regra

O Montu era um caso especial escrito à mão dentro de `decomporPartes`. O Domador
tem a mesma forma, então a forma virou mecanismo:

```js
{ anthemType: "Animal", anthemVal: 2 }
```

Qualquer carta que declare esses dois campos vira fonte de hino. Fontes iguais
acumulam, cada uma aparece com o próprio nome na decomposição do Poder, e a fonte
nunca fortalece a si mesma. O Enxame de Gafanhotos, que copia auras visíveis para
as cópias, passou a ler o mesmo mecanismo — cartas de hino futuras não precisam
tocar nele.

---

## 9. A Hiena e o único caminho de morte

O bônus da Hiena mora dentro de `destroyList`, que é o único caminho de
destruição do motor. Isso dá de graça as regras negativas do documento: não conta
quem volta à mão, quem muda de via, nem quem sai do campo consumido (Praga) —
nada disso passa por lá.

Duas sutilezas de ordem:

- O bônus é aplicado **depois** das marcas de morte, para não entrar no
  `powerAtDeath` das vítimas (o Am-heh absorveria o bônus da Hiena).
- Uma Hiena que morre na mesma leva já está `dying` quando o gancho roda, e o
  filtro a exclui. É literalmente a regra "destruída junto não ganha o bônus
  depois de sair".

---

## 10. Ordem de resolução

A ordem pedida pelo documento já era a do motor, e continua sendo:

1. a carta ocupa o espaço (`place`);
2. revela (`step`);
3. auras passam a valer — automático, porque são recalculadas a cada leitura;
4. o efeito de entrada resolve;
5. o Poder é recalculado na próxima leitura.

É isso que faz o Ápis receber a Aura do Domador imediatamente, as fichas nascerem
já fortalecidas, e a Garça poder ser a quarta carta que fecha a própria via.

---

## 11. Arquivos tocados

| Arquivo | O que mudou |
|---|---|
| `src/engine.js` | 10 cartas + 2 fichas; arquétipo `animal` (glifo e cor); seletores de ocupação de via e de Animal; `podeSerAlvo` / `laneProtegida`; `hinosPara` generalizando o Montu; gancho da Hiena em `destroyList`; resolvedores `resolveInvocar`, `resolveCabraDoNilo`, `resolveGarca`, `resolveApis`, `resolveMacaco`, `invocarFicha`, `alimentarHienas` |
| `src/match.js` | despacho dos cinco Ao Entrar novos; `place` e `move` usando `viaCheia`; `isAimable` revalidando a proteção do Gato |
| `src/App.jsx` | nome do arquétipo na Galeria; preset "Animais"; escudo discreto nas cartas protegidas; cor de badge para movimento; as duas cópias locais de `isAimable` substituídas pela função do `match.js` |
| `src/Carta.jsx` | glifo e tom do arquétipo Animal na carta emoldurada |
| `src/animais.test.js` | **novo** — 83 testes |
| `docs/animais-plano.md` | este documento |

Nenhum arquivo foi criado além destes. Não há sistema paralelo de habilidades,
eventos ou auras: tudo reusa o que já existia.

---

## 12. Como rodar e testar

```
npm install
npm test          # 331 testes (248 antigos + 83 do arquétipo)
npm run dev       # playtest local
npm run build     # build de produção
```

Integração do servidor multiplayer (opcional, precisa de `ws` em `server/`):

```
STEP_MS=15 node server/match.integration.test.mjs
```

**Atenção ao multiplayer:** `CONTENT_SIG` muda quando a coleção muda, e o
servidor tem deploy separado. Publicar o site sem republicar o servidor faz o
aperto de mão acusar versões diferentes. Os dois precisam subir juntos.

---

## 13. Pendências conhecidas

- **Arte**: as 10 cartas e as 2 fichas entram sem `arte`, mostrando o glifo do
  arquétipo. Os prompts estão prontos em `docs/animais-prompts-arte.md`; falta
  gerar e integrar (mesmo fluxo das outras).
- **Macaco interativo**: hoje sorteia (§6).
- **Animações** pedidas pelo documento e ainda não feitas: crescimento da Hiena,
  pulso da Aura do Domador, destaque das vias cheias ao revelar a Garça. O
  escudo do Gato e o badge de movimento do Macaco já estão.
- **Balanceamento**: ver §14. Depois do primeiro ajuste, o suspeito nº 1 passou
  a ser o Domador; o Gato continua desligando sozinho seis efeitos inimigos por
  2 de energia.

---

## 14. Rebalanceamento — 1ª rodada

Três ajustes pedidos depois da implementação inicial:

| Carta | Antes | Depois |
|---|---|---|
| Ficha de Ganso | 0/0 | **0/1** |
| Cabra do Nilo | +1 se houver outro Animal seu na via | **+1 para cada** outro Animal seu na via (teto natural +3) |
| Domador de Animais | Aura +1 | **Aura +2** |

O escopo da Cabra não mudou: continua contando só Animais **seus**, **revelados**,
**naquela via**, e o bônus continua congelado na entrada.

**Medição.** Tabuleiro plausível de rodada 6 (20 de energia, 12 cartas, as três
vias cheias — Cão, Ganso + ficha, Cabra do Nilo, Cão, Rebanho + ficha, Domador,
Gato, Hiena, Garça, Ápis):

```
Via 1 [14]: Cão 3 | Ganso 2 | Ganso (ficha) 3 | Cabra do Nilo 6
Via 2 [28]: Cão 3 | Rebanho 4 | Domador 2 | Touro Ápis 19
Via 3 [21]: Cabra (ficha) 3 | Gato 4 | Hiena 4 | Garça 10
total: 63
```

Um deck de Guerreiros com a curva cheia (Arqueiro → Lanceiro → Montu →
Guarda Real → General → Colosso) fecha perto de **50** em 6 cartas. Os Animais
chegam a 63 em 12, o que é coerente com a identidade — mas o número a vigiar é
outro: naquele tabuleiro o **Domador sozinho responde por +22** (11 Animais × 2)
por 3 de energia, e dois Domadores dariam +44. É a maior alavanca do jogo hoje.

Contrapartida real: o mesmo tabuleiro perde uma via inteira para uma Peste nos
Animais e desmonta com Anúbis, que apaga todos os bônus gravados de Cabra, Garça
e Ápis de uma via só.


---

## 15. A Garça virou contínua

Encontrado em playtest: a Garça entrava cedo, o tabuleiro fechava nas rodadas
seguintes e ela ficava parada em 2. Estava correta segundo o documento original
("o bônus é calculado somente na entrada"), e a regra é que estava errada — uma
carta de arquétipo de ocupação não pode punir quem a joga antes de ocupar.

**Antes:** `trigger: "entrar"`, `resolveGarca` gravava o bônus em `mods`.
**Agora:** `trigger: "continuo"`, o bônus é uma parcela viva dentro de
`decomporPartes`, do lado do Amon, do Domador, do Osíris e da Ammit.

Quatro consequências, todas herdadas do contrato de aura do motor:

1. **Cresce em qualquer rodada.** É o que se pediu.
2. **Encolhe também.** Se o oponente abrir uma via sua — Sobek, Sekhmet,
   Primogênitos —, o +3 daquela via some junto. A carta ficou interativa: dá
   para responder a ela.
3. **A Maat desliga.** O curto-circuito da Maat em `decomporPartes` pega todas
   as auras, e agora pega esta.
4. **O Selo do Silêncio deixou de alcançá-la**, porque o Selo só bloqueia efeito
   de entrada. Trocou um algoz por outro.

Nada é gravado em `mods`, então o Anúbis também não tem o que apagar nela.

O Ápis **continua congelado na entrada** — de propósito. São dois pagamentos
diferentes pelo mesmo tabuleiro: o Ápis cobra pela foto do instante em que
chega, a Garça cobra pelo que o tabuleiro for. Se os dois fossem contínuos, o
arquétipo teria duas cartas com a mesma curva.


---

## 16. Tipo duplo e a ficha do Enxame

Três mudanças pedidas depois do playtest, todas no Enxame de Gafanhotos.

**1. Tipo duplo.** O motor comparava tipo com `===` em três lugares (hinos,
varredura por tipo, seletores de Animal). Agora tudo passa por uma função só:

```js
temTipo(carta, "Animal")   // le `tipos: [...]` se existir, senao cai em `tipo`
```

Cartas de um tipo só não mudaram nada: `tipo` continua sendo a string única, e é
ela que aparece na tarja. Quem tem mais de um declara `tipos: ["Guerreiro",
"Animal"]` e usa `tipo` só como rótulo legível — `"Guerreiro · Animal"`.

O que o Enxame ganhou e perdeu com isso:

| | Antes | Agora |
|---|---|---|
| Montu | +2 | +2 |
| Domador de Animais | — | **+2** |
| Peste nos Animais | imune | **destruído** |
| Touro Ápis, Cabra do Nilo, Hiena | não contava | **conta como Animal** |
| Assassino Medjay (Divindades) | imune | imune |

**2. As cópias viraram fichas.** Antes eram instâncias com a `key` da mãe, o que
dava a elas o nome, a arte e o texto da carta original — inclusive o "Ao Entrar:
crie 2 cópias", que elas não fazem. Agora existe `token-gafanhoto`, uma definição
própria, invocada por `invocarFicha` como qualquer outra ficha do jogo.

A herança de Poder não mudou: a ficha nasce com o Poder **visível** da mãe menos
as auras que ela própria vai receber sozinha. Como a ficha tem o mesmo tipo duplo,
recebe exatamente as mesmas auras, e a subtração continua exata.

**3. Custo 1 na ficha.** Diferente do Ganso e da Cabra (custo 0): estas nascem
carregando Poder, às vezes muito, e um corpo que carrega Poder precisa de
resposta. Custo 1 mantém a Sekhmet como o preço de varrer um enxame — a mesma
razão pela qual a Rã e a Mosca são custo 1. Efeito colateral bem-vindo: a
Morte dos Primogênitos, que caça o maior custo, deixa de ver as fichas como alvo
prioritário e vai atrás da carta-mãe.

**Tarja da moldura:** `"Guerreiro · Animal"` é quase o dobro do rótulo mais longo
que existia. A fonte da tarja passou a encolher quando o rótulo passa de 12
caracteres.
