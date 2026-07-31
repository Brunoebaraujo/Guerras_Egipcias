# Arquétipo Animal — prompts de geração de arte

Doze imagens: as 10 cartas + as 2 fichas. Cada prompt = **bloco de estilo** (fixo)
+ **bloco de composição** (fixo, retangular) + **bloco da carta**.

Diferente do Set das Pragas, aqui **não há moldura em medalhão**: as doze usam a
`moldura.png` normal, com janela retangular. Vale o mesmo bloco de composição do
Moisés, e nenhum recorte circular.

## Estado

| # | Carta | Arquivo | `arteFoco` previsto | Estado |
|---|-------|---------|--------------------|--------|
| 1 | Cão do Deserto | `cao.webp` | — | ⬜ a gerar |
| 2 | Cabra do Nilo | `cabra-nilo.webp` | — | ⬜ a gerar |
| 3 | Ganso Doméstico | `ganso.webp` | — | ⬜ a gerar |
| 4 | Gato Egípcio | `gato.webp` | — | ⬜ a gerar |
| 5 | Macaco Sagrado | `macaco.webp` | suspeito de `center 0%` | ⬜ a gerar |
| 6 | Hiena do Deserto | `hiena.webp` | — | ⬜ a gerar |
| 7 | Garça do Nilo | `garca.webp` | suspeito de `center 0%` | ⬜ a gerar |
| 8 | Rebanho de Cabras | `rebanho.webp` | — | ⬜ a gerar |
| 9 | Domador de Animais | `domador.webp` | suspeito de `center 0%` | ⬜ a gerar |
| 10 | Touro Ápis | `apis.webp` | **provável `center 0%`** (disco solar entre os chifres) | ⬜ a gerar |
| 11 | Ganso Doméstico (ficha) | `token-ganso.webp` | — | ⬜ a gerar |
| 12 | Cabra (ficha) | `token-cabra.webp` | — | ⬜ a gerar |

Os "suspeitos" são palpite, não decisão: quem decide é o render depois da
integração. O padrão continua sendo `arteFoco` vazio.

## A geometria que manda no enquadramento

A janela da moldura é **1,213:1**. Uma imagem quadrada entra por `object-fit:
cover`, então o navegador ajusta pela largura e **descarta 17,6% da altura** —
com `arteFoco` vazio, 8,8% em cima e 8,8% embaixo.

Traduzindo para quem gera: **a faixa de 10% do topo e a de 10% do rodapé vão
sumir**. Nada de cabeça, chifre, coroa ou disco encostando no topo do quadro. É
por isso que `arteFoco: "center 0%"` existe — ele prende a imagem pelo topo e
joga os 17,6% todos para baixo — mas depender dele é remendo: melhor a arte já
nascer com respiro.

A arte aparece com **cerca de 170 pixels de largura** na Galeria, e bem menos que
isso na miniatura do tabuleiro. Poucos elementos, grandes, legíveis por silhueta.

## Por que os prompts são assim

Cada bloco está ancorado na **identidade mecânica** da carta, não só no bicho.
O Cão do Deserto não é "um cão egípcio" — é *o corpo mais barato que existe, que
não faz nada além de ocupar o lugar*, e por isso ele está parado, alerta e sem
feito nenhum. A Hiena não é "uma hiena" — é *a carta que engorda com as suas
próprias perdas*, e por isso ela aparece gorda demais ao lado do que restou do
rebanho. Quem olha a carta tem que sentir o que ela faz.

## O que faz as doze parecerem uma família

Os Guerreiros são bronze e batalha; as Divindades são ouro e templo. Os Animais
precisam de um terceiro registro, e ele está no bloco de estilo: **câmera baixa,
à altura do bicho; luz de dia aberto; chão de terra, poeira e palha; nenhuma
arquitetura monumental, exceto onde o prompt pedir**. É o que vai fazer as doze
se reconhecerem como conjunto sem precisarem de moldura própria.

---

## BLOCO DE ESTILO — cole em todos os doze

```
Ilustração digital pintada, fantasia histórica semi-realista, Egito Antigo.
Iluminação cinematográfica com contraste forte. Paleta dominante de ouro,
âmbar e areia, com as sombras em azul-lápis profundo. Pincelada e textura de
pintura visíveis; NÃO deve parecer render 3D limpo nem foto.

REGISTRO DESTE CONJUNTO: câmera BAIXA, à altura do animal. Luz de dia aberto.
Chão de terra batida, poeira, palha e capim seco. Sem arquitetura monumental,
sem interior de templo, sem ouro cerimonial — salvo onde o bloco da carta pedir
explicitamente. Estes não são deuses nem soldados: são bichos de campo.

POUCOS ELEMENTOS, GRANDES. A arte será vista com cerca de 170 pixels de
largura. O assunto principal precisa ocupar boa parte do quadro e ser
reconhecível por SILHUETA e MASSA DE COR, não por detalhe. Evite panoramas
amplos, multidões de figuras pequenas e minúcia decorativa: nesse tamanho viram
borrão.

NÃO incluir: texto, letras, números, hieróglifos legíveis, moldura, borda,
legenda, assinatura, marca d'água, elementos de interface, pessoas com roupas
modernas, objetos anacrônicos.
```

## BLOCO DE COMPOSIÇÃO — cole em todos os doze

```
Imagem quadrada, proporção 1:1. Enquadramento retangular normal, sem recorte
circular.

A imagem será CORTADA EM CIMA E EMBAIXO: cerca de 10% do topo e 10% do rodapé
serão descartados. Portanto:
- o assunto fica centralizado e um pouco ABAIXO do meio do quadro;
- o ponto mais alto do assunto (cabeça, chifre, orelha, bico) tem que ficar
  claramente abaixo do topo, com folga;
- nada importante encostando na borda inferior;
- deixe respiro nas quatro bordas.
```

---

# 1 · Cão do Deserto (`cao.webp`)

**Mecânica:** custo 0, Poder 1, efeito nenhum. É o corpo mais barato do jogo —
existe só para **ocupar um espaço**. A imagem não pode prometer feito algum.

```
UM ÚNICO CÃO DE CAÇA EGÍPCIO (tesem) de pé, de perfil, ocupando o centro do
quadro: magro, de pernas longas, orelhas eretas e triangulares, cauda enrolada
para cima em anel. Uma coleira larga de couro simples. Ele está PARADO,
plantado no chão de cascalho, com o corpo tenso e o focinho voltado para fora
do quadro — atento a alguma coisa que não vemos. Não corre, não ataca, não
caça: está de guarda num lugar vazio. Ao fundo, apenas duna baixa e céu claro
sem nada acontecendo. Luz seca de fim de tarde, sombra comprida no chão. A
imagem é sobre PRESENÇA e nada mais.
```

# 2 · Cabra do Nilo (`cabra-nilo.webp`)

**Mecânica:** +1 para **cada** Animal seu já naquela via. Ela não vale por si:
vale por quem já estava lá. A imagem precisa mostrar a chegada a um grupo.

```
UMA CABRA em primeiro plano ao centro, de pé sobre uma pedra baixa, corpo
inteiro visível, pelo áspero pegando a luz. Ela ACABOU DE CHEGAR e olha para
trás, para dentro do quadro. Atrás dela, muito próximas e ocupando toda a
largura do fundo, as ANCAS E OS DORSOS de outras três ou quatro cabras já
instaladas, grandes e desfocadas, formando uma massa contínua de pelo e chifre.
O rebanho é maior que ela e a envolve. Poeira dourada no ar. Chão de capim seco
à beira de um canal. A cabra da frente é pequena diante do que já estava ali —
e é disso que ela tira valor.
```

# 3 · Ganso Doméstico (`ganso.webp`)

**Mecânica:** uma carta, **dois corpos**. Ela entra e traz uma cópia junto. A
duplicação é o assunto — a simetria tem que ser óbvia.

```
DOIS GANSOS DO NILO IDÊNTICOS, lado a lado ao centro do quadro, de perfil e
voltados para a mesma direção, no mesmo passo e na mesma altura, como uma
imagem repetida. Plumagem parda e branca, bicos alaranjados, pescoços erguidos
na mesma curva. Nada mais no quadro além deles: chão de barro seco à margem do
rio e um fundo claro e simples de junco baixo. Luz da manhã, lateral, batendo
igual nos dois. Nenhuma figura humana, nenhum cercado. A REPETIÇÃO EXATA das
duas silhuetas é o assunto da imagem.
```

# 4 · Gato Egípcio (`gato.webp`)

**Mecânica:** Aura de **interdição**. Não faz nada acontecer — impede que
aconteça. Nada é ferido, nada é destruído: os efeitos inimigos simplesmente não
alcançam. A imagem não pode ter violência nem ação.

```
UM GATO EGÍPCIO SENTADO ao centro do quadro, de frente, imóvel, ereto e
simétrico, ocupando boa parte da altura da imagem. Pelo curto e escuro, olhos
grandes e claros ENCARANDO DIRETAMENTE O OBSERVADOR, sem piscar. Uma argola
simples de ouro numa das orelhas. Ele está sentado ATRAVESSADO NA FRENTE de
alguma coisa: logo atrás dele, desfocados e intactos, o contorno de uma pilha
de cestos de grão e a pata de um animal deitado, calmos. À frente dele, o chão
vazio. Luz baixa e quente vindo de trás do observador. Nenhum perigo visível,
nenhuma agressão, nenhum movimento: o gato não está lutando com nada. O que a
imagem diz é que NINGUÉM PASSA.
```

# 5 · Macaco Sagrado (`macaco.webp`)

**Mecânica:** **realoca** um Animal seu de uma via para outra. Não fere, não
destrói: pega e leva. O assunto é transporte em curso.

```
UM BABUÍNO GRANDE em primeiro plano ao centro, de perfil, agachado sobre uma
mureta de barro, ocupando o centro do quadro. Ele está NO MEIO DE UM
CARREGAMENTO: segura firme, com as duas mãos e junto ao peito, um CABRITO
PEQUENO que se deixa levar, calmo e sem ferimento. O babuíno olha para frente,
na direção para onde vai, com o corpo já inclinado nesse sentido. À esquerda do
quadro, o chão de onde ele saiu; à direita, o chão para onde vai — dois
terrenos visivelmente diferentes, separados pela mureta. Luz clara de meio da
manhã. Nenhuma violência, nenhuma disputa: apenas uma coisa sendo levada de um
lugar para outro. Cuidado para que a cabeça do babuíno fique bem abaixo do topo
do quadro.
```

# 6 · Hiena do Deserto (`hiena.webp`)

**Mecânica:** ganha Poder **quando os seus próprios Animais morrem**. Ela lucra
com a perda do dono. A imagem tem que ser desconfortável sem ser explícita.

```
UMA HIENA GRANDE E VISIVELMENTE BEM ALIMENTADA em primeiro plano ao centro, de
perfil, ombros altos e pescoço grosso, o corpo pesado demais para o animal que
é. Pelo malhado e áspero, cabeça baixa e voltada para o observador, olhos
tranquilos. Ela está PARADA E SACIADA, não caçando. Atrás dela, ao fundo e
pequenos, apenas alguns CERCADOS DE MADEIRA VAZIOS e abertos, e uma corda solta
no chão de terra. Nenhum corpo, nenhum sangue, nenhuma carcaça, nada explícito:
o rebanho simplesmente não está mais lá. Luz dura de fim de tarde, poeira
suspensa. O contraste entre a gordura do animal e o vazio atrás dele é todo o
assunto.
```

# 7 · Garça do Nilo (`garca.webp`)

**Mecânica:** ganha +3 **por via sua já cheia**. Ela é a última a chegar e cobra
por tudo o que já está ocupado. A imagem é sobre pousar onde não há mais espaço.

```
UMA GARÇA GRANDE POUSANDO ao centro do quadro, asas ainda meio abertas e
freando, pernas esticadas para baixo tocando o chão. Plumagem clara pegando a
luz. Ela desce sobre um TERRENO JÁ TOTALMENTE OCUPADO: logo abaixo e ao redor
dela, em massa contínua e sem espaço livre, os dorsos e as cabeças de um
rebanho apinhado — cabras, gansos, um cão — todos grandes, todos colados uns
aos outros, cobrindo toda a parte de baixo do quadro. Não sobra chão à vista.
Luz baixa e dourada de fim de dia. A garça é a única coisa que ainda se move; o
resto já está no lugar. Cuidado para que a cabeça e o bico da garça fiquem bem
abaixo do topo do quadro, e as pontas das asas não encostem nas bordas.
```

# 8 · Rebanho de Cabras (`rebanho.webp`)

**Mecânica:** invoca uma Cabra em **cada uma das outras duas vias**. O assunto é
dispersão em frentes distintas — não uma multidão junta, e sim uma que se reparte.

```
UM REBANHO DE CABRAS SE REPARTINDO em três direções claramente distintas, visto
de baixo e de perto. Ao centro do quadro, DUAS OU TRÊS CABRAS GRANDES em
primeiro plano, cada uma virada para um lado diferente e já em movimento,
afastando-se uma da outra. Nos dois lados do quadro, mais adiante e menores,
outras cabras seguindo por caminhos que se abrem em leque na terra seca. Poeira
levantada por baixo dos cascos, marcando os três rastros separados. Nenhum
cercado, nenhuma figura humana, nenhum pastor. Luz de meio-dia, sombras curtas.
A imagem é sobre uma coisa só que vira três.
```

# 9 · Domador de Animais (`domador.webp`)

**Mecânica:** Humano, Poder 2 — fraco sozinho. O valor dele é a Aura de +2 em
**todos** os seus Animais. Na imagem ele não pode ser o herói: os animais são o
assunto, e ele é o motivo de eles estarem daquele jeito.

```
UM PASTOR EGÍPCIO de pé, de corpo inteiro, mas DESLOCADO PARA UM DOS LADOS do
quadro e um pouco atrás: homem simples de tanga de linho, ombros curtos,
cajado BAIXADO e apoiado no chão, sem gesto de comando, sem braço erguido. Em
primeiro plano e ocupando o centro e a maior parte da largura, TRÊS ANIMAIS
GRANDES — uma cabra, um ganso e um cão — de pé, de peito estufado, cabeças
erguidas e alinhadas na mesma direção, alertas e nítidos, visivelmente melhores
do que bichos soltos. Os animais estão à frente e maiores; o homem, atrás e
menor. Luz quente de fim de tarde vinda de trás dele, recortando a silhueta.
Nenhum chicote, nenhuma corda, nenhuma coerção: a presença dele basta.
```

# 10 · Touro Ápis (`apis.webp`)

**Mecânica:** custo 6, e ganha +1 **por cada outro Animal em jogo**. É o
finalizador que cobra pelo tabuleiro inteiro. A escala é o assunto — ele precisa
ser esmagadoramente maior que o resto.

> Única do conjunto que quebra o registro "sem ouro cerimonial": o Ápis era
> adorado vivo, com peitoral e insígnia. É proposital, e é o que o separa dos
> outros onze.

```
UM TOURO COLOSSAL de pé em primeiro plano, de perfil, ocupando quase toda a
largura e boa parte da altura do quadro: musculatura pesada, pelagem preta com
a marca branca em triângulo na testa, um peitoral largo de ouro e um pano
ritual sobre o dorso. Entre os chifres, UM DISCO SOLAR DE OURO. A cabeça está
baixada e voltada para o observador, chifres largos e abertos. Aos pés dele e
ao fundo, MUITO MENORES, um rebanho inteiro de cabras, gansos e cães em
silhueta, cobrindo o chão até o horizonte — dezenas de bichos pequenos que
existem só para dar a medida do tamanho dele. Poeira dourada levantada, luz
forte e lateral. A DESPROPORÇÃO entre o touro e tudo o que está atrás é o
assunto da imagem. IMPORTANTE: o disco solar entre os chifres tem que ficar
claramente abaixo do topo do quadro, com folga.
```

# 11 · Ganso Doméstico — ficha (`token-ganso.webp`)

**Mecânica:** 0/1, sem efeito. É a cópia. Deve parecer o irmão simplório da
carta nº 3: mesmo bicho, metade da presença.

```
UM ÚNICO GANSO DO NILO de perfil ao centro do quadro, de pé no barro raso da
margem, pescoço numa curva relaxada e bico voltado para baixo, bicando o chão.
Plumagem parda e branca, bico alaranjado. Corpo inteiro visível, ocupando o
centro sem ser imponente. Fundo simples de junco baixo e água parada refletindo
o céu claro. Luz suave da manhã. Nenhuma outra figura, nenhum drama, nenhuma
ação: um bicho comum fazendo coisa nenhuma.
```

# 12 · Cabra — ficha (`token-cabra.webp`)

**Mecânica:** 0/1, sem efeito. É o corpo avulso que o Rebanho espalha.

```
UMA ÚNICA CABRA de perfil ao centro do quadro, de pé sobre terra seca, corpo
inteiro visível, cabeça virada para o observador com a expressão vazia e calma
do animal. Pelo áspero e malhado, chifres curtos e curvos para trás, uma
sineta de barro pendurada no pescoço por um cordão. Fundo simples: capim
ralo, uma pedra baixa e céu claro. Luz de meio da manhã. Nenhum rebanho,
nenhuma figura humana, nenhum cercado. Sozinha e sem importância.
```

---

## Sugestão de ordem para gerar

Não é obrigatório, mas ajuda a calibrar o traço do conjunto antes de gastar as
doze: comece pelo **Cão do Deserto** (o mais simples — se ele sair no registro
certo, o resto herda) e depois vá para o **Touro Ápis** (o mais difícil, e o que
define o teto de escala). Com esses dois aprovados, os outros dez saem no mesmo
tom.

## Depois de gerar

Me manda as imagens como anexo, uma ou várias por vez, na ordem que quiser. Do
meu lado o fluxo é:

1. converto para WebP 1000×1000, mirando ~200 KB
2. gravo em `public/cartas/` com o nome de arquivo da tabela
3. adiciono `arte` (e `arteFoco`, se precisar) na definição em `src/engine.js`
4. rodo a suíte (335 testes) e o build
5. **render-and-inspect**: confiro o recorte real da janela 1,213:1 antes de
   decidir se a carta precisa de `arteFoco`
6. commit e push na `main`

Se alguma ficar com o assunto encostando no topo, eu aviso na etapa 5 e a gente
decide entre `center 0%` e regerar só aquela.
