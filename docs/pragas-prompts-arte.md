# Set das Pragas — prompts de geração de arte

Onze imagens: as 10 Pragas + Moisés. Cada prompt = **bloco de estilo** (fixo) + **bloco de composição** (circular para as Pragas, retangular para o Moisés) + **bloco da carta**.

## Estado — set completo ✅

As onze artes estão integradas. `arteFoco` ficou vazio nas dez Pragas por geometria, não por esquecimento: a fonte é quadrada e o contêiner do medalhão também, então `object-fit: cover` encaixa exato e `objectPosition` não tem nada para deslocar. Só o Moisés precisa, porque a janela retangular da moldura é 1,213:1 e descarta 17,6% da altura.

| # | Carta | Arquivo | Recorte | `arteFoco` | Estado |
|---|-------|---------|---------|-----------|--------|
| 1 | Águas em Sangue | `sangue.webp` | circular | — | ✅ pronta |
| 2 | Praga das Rãs | `ras.webp` | circular | — | ✅ pronta |
| 3 | Praga dos Piolhos | `piolhos.webp` | circular | — | ✅ pronta |
| 4 | Praga das Moscas | `moscas.webp` | circular | — | ✅ pronta |
| 5 | Peste nos Animais | `peste.webp` | circular | — | ✅ pronta |
| 6 | Praga das Úlceras | `ulceras.webp` | circular | — | ✅ pronta |
| 7 | Chuva de Granizo e Fogo | `granizo.webp` | circular | — | ✅ pronta |
| 8 | Nuvem de Gafanhotos | `gafanhotos.webp` | circular | — | ✅ pronta |
| 9 | Trevas sobre o Egito | `trevas.webp` | circular | — | ✅ pronta |
| 10 | Morte dos Primogênitos | `primogenitos.webp` | circular | — | ✅ pronta |
| — | Moisés, Portador das Pragas | `moises.webp` | retangular | `center 20%` | ✅ pronta |

## Duas coisas medidas no navegador

**O recorte é feito pelo navegador, não por você.** A imagem entra quadrada em `public/cartas/` e o componente aplica `border-radius: 50%` com `object-fit: cover` — círculo inscrito no quadrado, sem distorção e sem zoom. Nunca é preciso recortar nada à mão, e a imagem original fica inteira no repositório.

**A arte aparece num círculo de cerca de 136 pixels**, e os 10% de baixo ficam cobertos pelo painel de regras. A primeira arte gerada (Águas em Sangue) trazia poços de pedra com figuras tirando água, pescadores e barcas de junco: detalhe bonito que simplesmente não existe nesse tamanho. Ela funcionou porque o assunto principal — a massa vermelha abrindo em Y — é enorme e central.

Todos os blocos abaixo já saíram calibrados por isso: **poucos elementos, grandes, reconhecíveis por silhueta**. Se um assunto só se entende com figuras miúdas, ele não vai se entender.

## Por que os prompts são assim

Cada bloco está ancorado na **identidade mecânica** da carta, não só na mitologia. Águas em Sangue não é "o Nilo vermelho" — é *dano pequeno que alcança as três frentes*. A Chuva de Granizo não é "gelo caindo" — é *só o que é barato morre*, e por isso uma tenda queima em primeiro plano enquanto um bloco de pedra maciça fica intacto atrás. Quem olha a carta tem que sentir o que ela faz.

---

## BLOCO DE ESTILO — cole em todos os onze

```
Ilustração digital pintada, fantasia histórica semi-realista, Egito Antigo.
Iluminação cinematográfica com contraste forte. Paleta dominante de ouro,
âmbar e areia, com as sombras em azul-lápis profundo. Pincelada e textura de
pintura visíveis; NÃO deve parecer render 3D limpo nem foto.

POUCOS ELEMENTOS, GRANDES. A arte será vista com cerca de 136 pixels. O
assunto principal precisa ocupar boa parte do quadro e ser reconhecível por
SILHUETA e MASSA DE COR, não por detalhe. Evite panoramas amplos, multidões de
figuras pequenas e minúcia decorativa: nesse tamanho viram borrão. No máximo
duas ou três figuras, e grandes.

NÃO incluir: texto, letras, números, hieróglifos legíveis, moldura, borda,
legenda, assinatura, marca d'água, elementos de interface, pessoas com roupas
modernas, objetos anacrônicos.
```

## BLOCO DE COMPOSIÇÃO — cole nas dez Pragas

```
Imagem quadrada, proporção 1:1.

COMPOSIÇÃO RADIAL E CENTRALIZADA. A imagem será RECORTADA EM CÍRCULO e os
quatro cantos serão descartados. Além disso, os 10% de baixo do círculo ficarão
cobertos. Portanto:
- o assunto principal fica no centro, ligeiramente ACIMA do meio do quadro;
- nada importante nos cantos nem na faixa inferior;
- deixe respiro nas bordas;
- a energia da cena irradia do centro para fora, ou converge para o centro.
```

## BLOCO DE COMPOSIÇÃO — cole apenas no Moisés

```
Imagem quadrada, proporção 1:1. Enquadramento retangular normal, sem recorte
circular. Assunto centralizado, com a cabeça um pouco abaixo do topo do quadro
para não ser cortada pela moldura.
```

---

# 1 · Águas em Sangue (`sangue.webp`) ✅

**Mecânica:** dano pequeno que alcança **as três vias ao mesmo tempo**.

Já pronta. Prompt usado, para referência de traço:

```
Vista aérea do Nilo ao amanhecer. A água transformada em vermelho-sangue
espesso, espalhando-se do centro do quadro para fora em veios escuros que
alcançam TRÊS canais distintos, cada um seguindo para uma direção diferente.
Nas margens, pequenas figuras egípcias recuam dos poços e abandonam barcos de
junco encalhados. Peixes mortos aflorando. Palmeiras e casas de barro em
silhueta contra a luz baixa. A mancha vermelha domina o centro e a
contaminação alcança cada braço de água — nada foi poupado.
```

# 2 · Praga das Rãs (`ras.webp`)

**Mecânica:** não faz dano — **entope um espaço** no campo inimigo. A rã não mata: atrapalha.

```
UMA RÃ GRANDE em primeiro plano, escura e úmida, ocupando o centro do quadro e
boa parte da altura da imagem, empoleirada na borda de um grande jarro de
cerâmica egípcio. Ela olha para frente, imóvel, exatamente onde não deveria
estar. Atrás dela, desfocadas e maiores que o normal, mais duas rãs sobre um
pão partido e sobre a alça do jarro. Luz baixa de lamparina vinda da esquerda,
brilho úmido na pele do animal. Nenhuma figura humana, nenhum ferimento,
nenhuma violência: apenas uma presença grande e imóvel ocupando o lugar.
```

# 3 · Praga dos Piolhos (`piolhos.webp`)

**Mecânica:** não destrói nada — **encarece** e atrasa. Fica mais difícil fazer o que você ia fazer.

```
Retrato aproximado de um sacerdote egípcio de cabeça e corpo raspados, do peito
para cima, ocupando quase todo o quadro. A pele do crânio e dos ombros
avermelhada e irritada. Ele está TRAVADO NO MEIO DE UM GESTO ritual: uma das
mãos erguida à altura do rosto em oferenda, parada no ar, e a outra desviada
para coçar o próprio ombro. A expressão é de humilhação contida, não de dor.
Fundo escuro e simples, apenas o brilho quente de uma tocha fora do quadro.
Nada de cenário detalhado: só o homem, as duas mãos e o gesto interrompido.
```

# 4 · Praga das Moscas (`moscas.webp`)

**Mecânica:** **polui o futuro** do adversário — cartas mortas embaralhadas no deck dele.

```
Retrato aproximado de um escriba egípcio, cabeça e ombros ocupando o centro do
quadro, com os olhos semicerrados e o rosto virado de lado, tentando suportar.
Em primeiro plano, MUITO GRANDES e em foco nítido, três ou quatro moscas
enormes voando bem perto do observador, com asas translúcidas pegando a luz.
Atrás do escriba, o ar fica opaco de tanto enxame, escurecendo o fundo até
quase o preto. Uma mosca pousada na têmpora dele. Nada está ferido nem
destruído: tudo está inutilizado.
```

# 5 · Peste nos Animais (`peste.webp`)

**Mecânica:** apaga **uma categoria inteira, de uma vez**, numa frente só.

```
UM TOURO SAGRADO ENORME caído de lado, ocupando o centro do quadro e quase
toda a largura da imagem, ainda com as faixas de linho e o peitoral ritual de
ouro. Os olhos fechados, a cabeça no chão de pedra. À beira do quadro, apenas
as pernas de um segundo animal grande também caído, sugerindo que não foi só
ele. Ao fundo, pequeno e de pé, um único pastor de ombros curvados, em
silhueta. Luz dura de meio-dia, sombras curtas. Nenhum ferimento visível,
nenhum sangue: os animais simplesmente pararam, todos ao mesmo tempo.
```

# 6 · Praga das Úlceras (`ulceras.webp`)

**Mecânica:** **dano contínuo**. A carta não morre: apodrece um pouco a cada rodada.

```
Soldado egípcio ainda DE PÉ, enquadrado do peito para cima, ocupando quase todo
o quadro. A armadura de couro pendendo aberta de um ombro. Úlceras grandes e
claramente visíveis no ombro, no peito e no antebraço, em estágios
DIFERENTES entre si: umas recentes e vermelhas, outras já escuras e abertas. Ele
ainda segura a haste da lança com firmeza, e a expressão é de quem está
PIORANDO, não de quem está morrendo. Luz fria, esverdeada e doente, vinda de
cima. Fundo escuro e vazio. O assunto é deterioração em curso.
```

# 7 · Chuva de Granizo e Fogo (`granizo.webp`)

**Mecânica:** destrói **só o que é barato**, e encarece o resto.

```
Duas coisas grandes e nada mais. Em primeiro plano ao centro, UMA TENDA de
lona e madeira desabando em chamas altas, já perdida. Imediatamente atrás
dela, ocupando toda a parte de cima do quadro, UM BLOCO DE TEMPLO EM PEDRA
MACIÇA, gigantesco e visivelmente INTACTO, sem uma marca, apenas iluminado em
laranja pelo incêndio à sua frente. Do alto, pedras de granizo e bolas de fogo
caindo JUNTAS do mesmo céu escuro, convergindo para o centro. O contraste entre
o frágil consumido e o sólido ileso é todo o assunto da imagem.
```

# 8 · Nuvem de Gafanhotos (`gafanhotos.webp`)

**Mecânica:** mesmo alcance do Sangue, **o dobro da força**. Voracidade, não contaminação.

```
DOIS GAFANHOTOS ENORMES em primeiro plano, em foco nítido e ocupando o centro
do quadro, agarrados a um caule de trigo já completamente pelado, mandíbulas
em movimento. Detalhe seco e quitinoso nas patas e nas asas, pegando a luz
dourada. Atrás deles, o enxame reduzido a uma MASSA escura e sem detalhe,
escurecendo todo o fundo do quadro como uma tempestade. Embaixo, terra nua e
caules quebrados. Nenhuma figura humana, nenhuma construção. O assunto é
consumo voraz visto de perto.
```

# 9 · Trevas sobre o Egito (`trevas.webp`)

**Mecânica:** **esconde a informação**. Ninguém vê o que está em jogo.

```
Ao centro exato do quadro, UM DISCO PERFEITAMENTE NEGRO E GRANDE, cercado por
uma coroa fina e branca de luz solar, ocupando a parte de cima da imagem.
Abaixo dele, apenas DUAS FIGURAS HUMANAS GRANDES, completamente em silhueta
preta e sem nenhum detalhe interno, imóveis, com os braços erguidos para o
disco. Não é possível dizer se são sacerdotes, soldados ou servos. Atrás, o
contorno vago e escuro de uma coluna. Nenhum rosto, nenhuma textura, nenhuma
cor além do preto e do resto de céu alaranjado nas bordas. A impossibilidade
de reconhecer o que se vê é o assunto.
```

# 10 · Morte dos Primogênitos (`primogenitos.webp`)

**Mecânica:** executa **a carta de maior valor** em jogo.

> Deliberadamente simbólica e sem nada explícito. Não gere figura de criança,
> corpo nem ferimento — além de ser o caminho respeitoso, é a imagem mais forte.

```
Câmara egípcia à noite. Ao centro do quadro, ocupando boa parte da imagem, UM
LEITO BAIXO DE MADEIRA RICAMENTE ENTALHADA E FOLHEADA A OURO, VAZIO, com o
lençol de linho branco afastado e amarrotado. Em primeiro plano, grande e em
foco, UMA LAMPARINA DE ÓLEO APAGADA, com um único fio de fumaça subindo. À
borda do quadro, uma figura adulta grande e escura, ajoelhada de costas ao pé
do leito, cabeça baixa. Fundo escuro, com apenas dois ou três brilhos de ouro
sugerindo a riqueza da casa. Nenhuma criança, nenhum corpo, nenhum ferimento,
nada explícito. A riqueza em volta comunica que o que foi tirado era o mais
valioso da casa.
```

# 11 · Moisés, Portador das Pragas (`moises.webp`)

**Mecânica:** entra com **Poder 0** e cresce exponencialmente. A carta é potencial, não força — então a imagem não pode mostrar milagre nenhum acontecendo ainda.

**Único com enquadramento retangular** (usa a `moldura.png` normal). Use o bloco de composição do Moisés, não o circular.

```
Um homem de meia-idade, barbado, de pele curtida pelo sol, vestindo apenas
roupas simples e gastas de pastor — lã crua, sandálias de couro, um manto
puído. Ele está de pé, sozinho, de corpo inteiro ao centro. Ao lado dele, UMA
ÚNICA COLUNA COLOSSAL de templo egípcio, coberta de relevo pintado, tão larga
quanto ele é alto e subindo muito além do topo do quadro. O cajado de madeira
na mão está BAIXADO, apoiado no chão. Nenhum milagre acontecendo, nenhuma luz
sobrenatural, nenhum gesto de poder, nenhuma multidão: apenas um homem pobre e
irredutível, com o olhar firme, ao lado de algo esmagadoramente maior que ele.
A DESPROPORÇÃO entre a figura e a coluna é o assunto da imagem. A cabeça um
pouco abaixo do topo do quadro.
```

---

## Depois de gerar

Me manda as imagens como anexo, uma ou várias por vez, na ordem que quiser. Do meu lado o fluxo é:

1. converto para WebP 1000×1000, mirando ~200 KB
2. gravo em `public/cartas/` com o nome de arquivo da tabela
3. adiciono `arte` (e `arteFoco`, se precisar) na definição em `src/engine.js`
4. rodo a suíte (225 testes) e o build
5. **render-and-inspect**: com recorte circular isso é obrigatório, porque é fácil um assunto bem enquadrado no quadrado perder a cabeça no círculo
6. commit e push na `main`

Se alguma ficar com o assunto perto da borda, eu aviso na etapa 5 e a gente regera só aquela.
