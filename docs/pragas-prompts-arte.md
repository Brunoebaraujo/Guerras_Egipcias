# Set das Pragas — prompts de geração de arte

Onze imagens: as 10 Pragas + Moisés. Cada prompt = **bloco de estilo** (fixo, igual em todas) + **bloco de composição** (circular para as Pragas, retangular para o Moisés) + **bloco da carta**.

## Calibração feita na nº 1 ✅

A primeira (Águas em Sangue) foi gerada e integrada. O que ela ensinou, medido no navegador:

**O medalhão tem 131 pixels de diâmetro na Galeria.** Na primeira arte havia poços de pedra com figuras tirando água, pescadores, barcas de junco — detalhe bonito que simplesmente não existe nesse tamanho. Ela funcionou porque o assunto principal (a massa vermelha abrindo em Y) é grande e ocupa o centro.

Por isso o bloco de estilo abaixo ganhou a regra de **poucos elementos grandes**. Vale para os nove restantes: se o assunto precisa de figuras miúdas para ser entendido, ele não vai ser entendido.

Também confirmado: **o recorte é feito pelo navegador**, não por você. A imagem entra quadrada em `public/cartas/` e o componente aplica `border-radius: 50%` com `object-fit: cover` — círculo inscrito no quadrado, sem distorção e sem zoom. Você nunca precisa recortar nada à mão.

## Por que os prompts são assim

Cada bloco de carta está ancorado na **identidade mecânica**, não só na mitologia. Águas em Sangue não é "o Nilo vermelho" — é *dano pequeno que alcança as três frentes*, e a ilustração mostra isso em três braços de água. A Chuva de Granizo não é "gelo caindo" — é *só o que é barato morre*, e por isso as construções leves queimam enquanto a pedra maciça fica intacta ao fundo. Quem olha a carta tem que sentir o que ela faz.

## Nomes de arquivo

As Pragas são recortadas em **círculo**, então os quatro cantos são descartados. É a diferença mais importante em relação a tudo que você já gerou para este jogo.

| # | Carta | Arquivo | Recorte | `arteFoco` sugerido | Estado |
|---|-------|---------|---------|---------------------|--------|
| 1 | Águas em Sangue | `sangue.webp` | circular | — | ✅ pronta |
| 2 | Praga das Rãs | `ras.webp` | circular | — | — |
| 3 | Praga dos Piolhos | `piolhos.webp` | circular | — | — |
| 4 | Praga das Moscas | `moscas.webp` | circular | — | — |
| 5 | Peste nos Animais | `peste.webp` | circular | — | — |
| 6 | Praga das Úlceras | `ulceras.webp` | circular | — | — |
| 7 | Chuva de Granizo e Fogo | `granizo.webp` | circular | — | — |
| 8 | Nuvem de Gafanhotos | `gafanhotos.webp` | circular | — | — |
| 9 | Trevas sobre o Egito | `trevas.webp` | circular | — | — |
| 10 | Morte dos Primogênitos | `primogenitos.webp` | circular | — | — |
| — | Moisés, Portador das Pragas | `moises.webp` | retangular | `center 10%` | — |

Como o recorte é circular e centralizado, `arteFoco` deixa de ser necessário nas dez Pragas — o enquadramento já é radial por construção. Ele continua valendo para o Moisés, que usa a moldura normal.

---

## BLOCO DE ESTILO — cole em todos os onze

```
Ilustração digital pintada, fantasia histórica semi-realista, Egito Antigo.
Iluminação cinematográfica com contraste forte. Paleta dominante de ouro,
âmbar e areia, com as sombras em azul-lápis profundo. Pincelada e textura de
pintura visíveis; NÃO deve parecer render 3D limpo nem foto. Detalhe rico mas
legível, porque a imagem será vista pequena.

POUCOS ELEMENTOS, GRANDES. A imagem final será vista com cerca de 130 pixels
de diâmetro. O assunto principal deve ocupar boa parte do círculo central e
ser reconhecível por SILHUETA e MASSA DE COR, não por detalhe. Evite multidões
de figuras pequenas, panoramas amplos e minúcia decorativa: nesse tamanho
viram borrão. No máximo duas ou três figuras humanas, e grandes.

NÃO incluir: texto, letras, números, hieróglifos legíveis, moldura, borda,
legenda, assinatura, marca d'água, elementos de interface, pessoas com roupas
modernas, objetos anacrônicos.
```

## BLOCO DE COMPOSIÇÃO — cole nas dez Pragas

```
Imagem quadrada, proporção 1:1.

COMPOSIÇÃO RADIAL E CENTRALIZADA. A imagem será RECORTADA EM CÍRCULO: tudo o
que estiver nos quatro cantos será descartado. Portanto:
- o assunto principal fica no centro, dentro do círculo inscrito no quadrado;
- deixe respiro nas bordas, sem elementos importantes perto delas;
- nada de detalhe narrativo nos cantos;
- a energia da cena deve irradiar do centro para fora, ou convergir de fora
  para o centro.
```

## BLOCO DE COMPOSIÇÃO — cole apenas no Moisés

```
Imagem quadrada, proporção 1:1. Enquadramento retangular normal, sem recorte
circular. Assunto centralizado, com a cabeça um pouco abaixo do topo do quadro
para não ser cortada pela moldura.
```

---

# 1 · Águas em Sangue (`sangue.webp`)

**Mecânica:** dano pequeno que alcança **as três vias ao mesmo tempo**. Não é um golpe: é uma contaminação que chega a tudo.

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
Interior de uma casa egípcia de barro, à luz de lamparina. Rãs cobrindo cada
superfície disponível: empilhadas dentro dos jarros de cerâmica, sobre os pães
na mesa, nos degraus, no cesto de grãos, na beira do leito. Uma delas no
próprio pão partido. Ao centro, um pé humano descalço suspenso no ar, sem
encontrar chão livre onde pisar. A sensação é de ACÚMULO e obstrução, não de
violência — não há ferimento nem sangue, apenas o espaço tomado por completo.
```

# 3 · Praga dos Piolhos (`piolhos.webp`)

**Mecânica:** não destrói nada — **encarece** e atrasa. Fica mais difícil fazer o que você ia fazer.

```
Sacerdote egípcio de cabeça e corpo raspados, ajoelhado ao centro de um
santuário, com a pele irritada e avermelhada. Ele está TRAVADO NO MEIO DE UM
GESTO ritual: uma das mãos levantada em oferenda, a outra desviada para
coçar o antebraço. O incenso apagado, o vaso de libação intocado no chão, as
oferendas paradas onde foram deixadas. Luz de tocha lateral. A cena comunica
um rito interrompido por algo pequeno e humilhante — o trabalho não foi
destruído, apenas ficou impossível de completar agora.
```

# 4 · Praga das Moscas (`moscas.webp`)

**Mecânica:** **polui o futuro** do adversário — cartas mortas embaralhadas no deck dele.

```
Um escriba egípcio sentado de pernas cruzadas ao centro, tentando trabalhar
sobre um rolo de papiro, com o ar tão denso de moscas que o fundo quase
desaparece atrás delas. Enxame espesso convergindo de todas as direções para
o centro do quadro. As moscas cobrem o papiro, a paleta de tintas, o ombro do
escriba. Ao fundo, desfocado, um soldado com um pingente de mosca de ouro no
peito, coberto de moscas reais. Nada está destruído: tudo está inutilizado.
```

# 5 · Peste nos Animais (`peste.webp`)

**Mecânica:** apaga **uma categoria inteira, de uma vez**, numa frente só.

```
Pátio de templo egípcio ao meio-dia duro. Um rebanho inteiro caído no chão de
pedra, todos os animais ao mesmo tempo e na mesma direção — bois, cabras,
ovelhas — dispostos em círculo em torno do centro. No centro exato, um grande
touro sagrado ainda com as faixas e as insígnias rituais, caído de lado. Um
único pastor de pé entre eles, de costas curvadas, sozinho e intacto. A
simultaneidade é o assunto: não morreram um a um, morreram todos juntos.
```

# 6 · Praga das Úlceras (`ulceras.webp`)

**Mecânica:** **dano contínuo**. A carta não morre: apodrece um pouco a cada rodada.

```
Soldado egípcio ainda DE PÉ ao centro, meio despido da armadura de couro, que
pende de um ombro. Feridas e úlceras abrindo pelos antebraços, ombro e torso,
em estágios visivelmente diferentes — algumas recentes, outras já avançadas.
A expressão é de quem está PIORANDO, não de quem está morrendo: ele ainda
segura a lança. No chão ao lado, frascos de remédio e potes de unguento
abertos e inúteis. Luz fria e doente. O assunto é deterioração em curso, não
morte.
```

# 7 · Chuva de Granizo e Fogo (`granizo.webp`)

**Mecânica:** destrói **só o que é barato**, e encarece o resto.

```
Acampamento egípcio sob uma tempestade impossível: pedras de granizo e bolas
de fogo caindo JUNTAS do mesmo céu, do topo do quadro convergindo para o
centro. As construções LEVES — tendas de lona, cercados de junco, telheiros de
palha — já em chamas e desabando ao centro. Ao fundo, imponente e claramente
INTACTO, um bloco de templo em pedra maciça, sem um arranhão, apenas iluminado
pelo incêndio à sua frente. O contraste entre o frágil destruído e o sólido
ileso é o assunto da imagem.
```

# 8 · Nuvem de Gafanhotos (`gafanhotos.webp`)

**Mecânica:** mesmo alcance do Sangue, **o dobro da força**. Voracidade, não contaminação.

```
Campo de trigo egípcio sendo devorado. Uma nuvem densa de gafanhotos entrando
pelo centro do quadro em profundidade, vindo de longe na direção do
observador, escurecendo o céu atrás dela. Em primeiro plano, os caules já
completamente pelados e quebrados, terra nua aparecendo. No meio, a linha
exata em que a plantação ainda está de pé e começa a desaparecer. Alguns
gafanhotos grandes, em foco nítido, bem à frente. O assunto é CONSUMO
voraz e avançando — a safra sendo comida ainda em pé.
```

# 9 · Trevas sobre o Egito (`trevas.webp`)

**Mecânica:** **esconde a informação**. Ninguém vê o que está em jogo.

```
Eclipse total sobre um grande templo egípcio. Ao centro exato do quadro, um
disco perfeitamente negro cercado por uma coroa fina de luz solar. Abaixo,
figuras humanas COMPLETAMENTE EM SILHUETA, imóveis, algumas com os braços
erguidos, sem que seja possível distinguir quem é sacerdote, quem é soldado,
quem é servo. As colunas do templo também reduzidas a contornos. Nenhum rosto
identificável, nenhum detalhe legível — apenas formas escuras contra um
resto de céu. A impossibilidade de reconhecer o que se vê é o assunto.
```

# 10 · Morte dos Primogênitos (`primogenitos.webp`)

**Mecânica:** executa **a carta de maior valor** em jogo.

> Deliberadamente simbólica e sem nada explícito: leito vazio, lamparina
> apagada, luto. Não gere figura de criança morta — além de ser o caminho
> respeitoso, é a imagem mais forte das duas.

```
Câmara nobre egípcia à noite, visivelmente RICA: paredes de alabastro, móveis
folheados a ouro, vasos de alabastro, tecidos finos, um colar de ouro
esquecido sobre um banco. Ao centro exato do quadro, um leito baixo de madeira
entalhada, VAZIO, com o lençol de linho desarrumado e afastado. Ao lado, uma
lamparina de óleo APAGADA, um fio de fumaça ainda subindo. Uma figura adulta
ajoelhada ao pé do leito, de costas, cabeça baixa, em luto. Nenhuma figura de
criança, nenhum corpo, nenhum ferimento, nada explícito. A riqueza em volta
comunica que o que foi tirado era o mais valioso da casa.
```

# 11 · Moisés, Portador das Pragas (`moises.webp`)

**Mecânica:** entra com **Poder 0** e cresce exponencialmente. A carta é potencial, não força — então a imagem não deve mostrar milagre nenhum acontecendo ainda.

**Este é o único com enquadramento retangular** (usa a `moldura.png` normal). Use o bloco de composição do Moisés, não o circular.

```
Um homem de meia-idade, barbado, de pele curtida pelo sol, vestindo apenas
roupas simples e gastas de pastor — lã crua, sandálias de couro, um manto
puído. Ele está de pé, sozinho, diante da arquitetura monumental egípcia:
colunas colossais cobertas de relevo pintado que se erguem muito além do topo
do quadro, guardas de lança enfileirados e desfocados ao fundo. O cajado de
madeira na mão está BAIXADO, apoiado no chão. Nenhum milagre acontecendo,
nenhuma luz sobrenatural, nenhum gesto de poder: apenas um homem pobre e
irredutível diante de um império, com o olhar firme. A DESPROPORÇÃO entre a
figura pequena e a arquitetura gigantesca é o assunto da imagem. A cabeça um
pouco abaixo do topo do quadro.
```

---

## Depois de gerar

Me manda as imagens como anexo, na ordem que quiser, uma ou várias por vez. Do meu lado o fluxo é o de sempre:

1. converto para WebP 1000×1000, mirando ~200 KB
2. gravo em `public/cartas/` com o nome de arquivo da tabela
3. adiciono `arte` (e `arteFoco`, se precisar) na definição em `src/engine.js`
4. rodo a suíte (225 testes) e o build
5. render-and-inspect antes de subir — com o recorte circular isso passa a ser obrigatório, porque é fácil um assunto bem enquadrado no quadrado perder a cabeça no círculo
6. commit e push na `main`

Se alguma ficar com o assunto muito perto da borda, eu aviso na etapa 5 e a gente regera só aquela.
