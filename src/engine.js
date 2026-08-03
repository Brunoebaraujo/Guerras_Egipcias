/* ========================================================================== 
   Guerras Egípcias — Motor do jogo (puro, sem React).
   Tudo aqui opera sobre o objeto de estado `s` (plain object clonável) e
   é coberto por testes em engine.test.js. A UI (App.jsx) só orquestra.
   ========================================================================== */

export const GLYPH = {
  buff: "☀", debuff: "☾", sacrificio: "☥", reset: "⚖", silencio: "⊘",
  movimento: "⇄", crescimento: "⇑", fusao: "⛨", renascimento: "⟳", base: "𓂀",
  animal: "𓃒",
};
export const ARCH_COLOR = {
  base: "text-stone-400", buff: "text-amber-300", debuff: "text-indigo-300",
  sacrificio: "text-emerald-300", reset: "text-rose-300", silencio: "text-rose-300",
  movimento: "text-sky-300", crescimento: "text-amber-300", fusao: "text-teal-300", renascimento: "text-amber-300",
  animal: "text-lime-300",
};

export const CARDS = [
  // Base
  { key: "servo",     nome: "Servo do Templo",       tipo: "Guerreiro", custo: 0, poder: 1,  arch: "base", arte: "servo", arteFoco: "center 25%",
    lore: "Os templos eram os maiores empregadores do Egito e pagavam em pão e cerveja — moeda cunhada só chegaria ao Nilo mais de mil anos depois." },
  { key: "arqueiro",  nome: "Arqueiro Núbio",        tipo: "Guerreiro", custo: 1, poder: 3,  arch: "base", arte: "arqueiro",
    lore: "O Egito chamava a Núbia de Ta-Seti, \"a Terra do Arco\". Seus arqueiros eram tão temidos que o faraó preferiu alistá-los a enfrentá-los." },
  { key: "lanceiro",  nome: "Lanceiro do Nilo",      tipo: "Guerreiro", custo: 2, poder: 4,  arch: "base", arte: "lanceiro", arteFoco: "center 0%",
    lore: "A infantaria saía dos nomos, recrutada entre camponeses na entressafra. Lança de bronze e escudo de couro de boi: a espinha do exército por dois milênios." },
  { key: "carruagem", nome: "Carruagem de Guerra",   tipo: "Guerreiro", custo: 3, poder: 6,  arch: "base", arte: "carruagem",
    lore: "Os hicsos trouxeram o carro de guerra; o Egito o refez mais leve, com rodas de raios e o eixo recuado. Dois homens: um guia os cavalos, o outro atira." },
  { key: "guardareal",nome: "Guarda Real",           tipo: "Guerreiro", custo: 4, poder: 8,  arch: "base", arte: "guardareal", arteFoco: "center 0%",
    lore: "A khopesh, espada em foice, era arma e condecoração: o faraó a entregava em mãos aos que juravam guardar-lhe o corpo." },
  { key: "general",   nome: "General dos Exércitos", tipo: "Guerreiro", custo: 5, poder: 10, arch: "base", arte: "general",
    lore: "O título era imi-ra mesha, \"superintendente do exército\". Horemheb o portou antes de cingir a coroa: comandar tropas era caminho para o trono." },
  { key: "colosso",   nome: "Colosso de Mênfis",     tipo: "Guerreiro", custo: 6, poder: 14, arch: "base", arte: "colosso", arteFoco: "center 0%",
    lore: "O colosso de Ramsés ainda jaz em Mênfis, dez metros de calcário. Estátuas assim tinham culto próprio — o povo lhes rezava como intermediárias do rei." },
  // Efeito
  { key: "hathor", nome: "Hathor", tipo: "Divindade", custo: 2, poder: 3, arch: "buff",
    trigger: "entrar", needs: "ally", buffTarget: 3, arte: "hathor", arteFoco: "center 0%",
    lore: "Senhora do amor, da música e da alegria, Hathor tocava os corações e os fazia transbordar de coragem. Onde ela pousava a mão, o guerreiro esquecia o medo e lutava com o vigor de quem se sabe amado.",
    texto: "Ao Entrar: +3 de Poder a um aliado nesta via." },
  { key: "heka", nome: "Heka", tipo: "Divindade", custo: 2, poder: 1, arch: "buff",
    trigger: "entrar", buffNext: 3, arte: "heka",
    lore: "Heka é a magia que precede a criação — a força que anima o gesto dos deuses. Antes que qualquer poder se manifeste, Heka já o preparou.",
    texto: "Ao Entrar: sua próxima carta revelada nesta rodada entra com +3 de Poder permanente." },
  { key: "amon", nome: "Amon", tipo: "Divindade", custo: 5, poder: 5, arch: "buff",
    trigger: "continuo", arte: "amon",
    lore: "Rei dos deuses e senhor dos ventos, Amon ergue os exércitos do Egito sob a luz eterna do Sol.",
    texto: "Contínuo: +1 a todas as suas outras cartas em jogo (todas as vias)." },
  { key: "set", nome: "Set", tipo: "Divindade", custo: 5, poder: 5, arch: "debuff",
    trigger: "entrar", scatterEnemies: 2, arte: "set",
    lore: "Set matou Osíris e disputou o trono com Hórus por oitenta anos. Deus do deserto e da tempestade, era a força que desarruma o que Maat arruma.",
    texto: "Ao Entrar: duas cartas inimigas desta via são lançadas para vias aleatórias. Sem espaço, permanecem." },
  { key: "maat", nome: "Maat", tipo: "Divindade", custo: 4, poder: 3, arch: "reset",
    trigger: "continuo", arte: "maat", arteFoco: "center 0%",
    lore: "Maat é a filha de Rá e Hathor. Ela é irmã do faraó mítico, assegura o equilíbrio cósmico e é graças a ela que o mundo funciona perfeitamente.",
    texto: "Contínuo: nesta via, toda carta (dos dois lados) volta ao Poder impresso." },
  { key: "sobek", nome: "Sobek", tipo: "Criatura", custo: 2, poder: 2, arch: "sacrificio",
    trigger: "entrar", arte: "sobek", arteFoco: "center 0%",
    lore: "Senhor das águas do Nilo, Sobek era temido e cortejado: a mesma fome que devorava também fertilizava a terra. Os egípcios criavam crocodilos sagrados em lagos de templo, pois compreendiam que a força do deus se alimentava do que consumia.",
    texto: "Ao Entrar: destrua suas outras cartas nesta via; +1 por carta destruída." },
  { key: "osiris", nome: "Osíris", tipo: "Divindade", custo: 4, poder: 4, arch: "sacrificio",
    trigger: "continuo", arte: "osiris", arteFoco: "center 0%",
    lore: "Assassinado e esquartejado por Set, Osíris renasceu como senhor dos mortos e juiz do além. Deus que morreu para reinar sobre a morte, ele cresce com cada fim.",
    texto: "Contínuo: +2 para cada carta destruída na partida, de qualquer lado." },
  { key: "mumia", nome: "Múmia", tipo: "Criatura", custo: 1, poder: 1, arch: "sacrificio",
    trigger: "morrer", arte: "mumia",
    lore: "Os egípcios não mumificavam seus mortos para lembrar o passado, mas para prepará-los para o futuro. Se o corpo permanecesse intacto, a alma poderia retornar e erguer-se novamente. O corpo era preservado para que o Ka e o Ba pudessem reconhecê-lo após a morte.",
    texto: "Ao Morrer: volta à mão com o dobro do Poder atual (Faixa)." },
  { key: "enxame", nome: "Enxame de Gafanhotos", tipo: "Guerreiro · Animal", tipos: ["Guerreiro", "Animal"],
    custo: 3, poder: 2, arch: "crescimento",
    trigger: "entrar", absorb: "swarm", arte: "enxame",
    lore: "Quando a oitava praga desceu sobre o Egito, o céu escureceu de asas e a terra foi devorada num só dia. Onde pousa um gafanhoto, logo há mil — a fome se multiplica mais depressa do que se pode contá-la.",
    texto: "Ao Entrar: invoque 2 Gafanhotos nesta via, com o Poder atual desta carta. Guerreiro e Animal ao mesmo tempo: recebe Montu e o Domador." },
  { key: "assassino-medjay", nome: "Assassino Medjay", tipo: "Guerreiro", custo: 3, poder: 3, arch: "debuff", arte: "assassino-medjay",
    trigger: "entrar",
    destroyAllOfTypeInLane: "Divindade",
    texto: "Ao Entrar: destrói todas as Divindades nesta via.",
    lore: "Os Medjay protegiam as fronteiras do Egito, mas alguns eram treinados para missões mais sombrias: silenciar falsos milagres, profanar altares inimigos e lembrar até aos deuses que o faraó também tinha lâminas." },
  { key: "selo", nome: "Selo do Silêncio", tipo: "Magia", custo: 3, poder: 3, arch: "silencio",
    trigger: "continuo", block: true, arte: "selo",
    lore: "Gravado por sacerdotes que temiam as palavras de poder, o selo impõe um silêncio absoluto: onde é aposto, nenhum encantamento desperta e nenhum nome divino ecoa. Os feitiços inimigos morrem na garganta, calados antes de nascer.",
    texto: "Contínuo: cartas inimigas que revelarem nesta via não disparam Ao Entrar." },
  { key: "montu", nome: "Montu", tipo: "Divindade", custo: 3, poder: 1, arch: "buff",
    trigger: "continuo", anthemType: "Guerreiro", anthemVal: 2, arte: "montu", arteFoco: "center 0%",
    lore: "Deus-falcão da guerra de Tebas, Montu ardia no coração dos exércitos. Do faraó que se lançava valente à batalha, os egípcios diziam: combate como um Montu. Onde sua fúria pousava, guerreiros comuns lutavam como leões.",
    texto: "Contínuo: seus Guerreiros ganham +2 de Poder." },
  { key: "armadura", nome: "Armadura de Ptah", tipo: "Relíquia", custo: 2, poder: 3, arch: "fusao", arte: "armadura", arteFoco: "center 0%",
    trigger: "entrar", fuse: true,
    lore: "Ptah moldou o mundo com as próprias mãos, e em cada obra deixou parte de si. Sua armadura não protege um corpo: funde-se a ele, cedendo a têmpera divina do artífice a quem a vestir.",
    texto: "Ao Entrar: funde-se com um aliado aleatório nesta via, conferindo seu Poder a ele." },
  { key: "escaravelho", nome: "Escaravelho Alado", tipo: "Criatura", custo: 1, poder: 3, arch: "movimento",
    move: true, arte: "escaravelho", arteFoco: "center 0%",
    lore: "Khepri empurra o sol pelo céu a cada amanhecer, e assim o mundo se refaz. O escaravelho não pertence a lugar nenhum: alça voo, muda de rumo e recomeça onde for preciso — o Egito o gravava em amuletos justamente por essa promessa de eterno movimento.",
    texto: "Pode mover-se para outra via uma vez, a partir da rodada seguinte à sua entrada." },
  { key: "ammit", nome: "Ammit, a Devoradora", tipo: "Criatura", custo: 3, poder: 1, arch: "crescimento",
    trigger: "continuo", growPerPlay: true, arte: "ammit",
    lore: "À sombra da balança, Ammit aguardava o veredito: todo coração mais pesado que a pena de Maat era seu. Crocodilo, leão e hipopótamo num só corpo, sua fome jamais se saciava — quanto mais devorava, mais faminta e vasta se tornava.",
    texto: "Contínuo: +1 de Poder para cada carta que você colocar em jogo depois dela." },
  { key: "sekhmet", nome: "Sekhmet", tipo: "Divindade", custo: 3, poder: 4, arch: "debuff",
    trigger: "entrar", wipeCost: 1, arte: "sekhmet", arteFoco: "center 0%",
    lore: "Enviada por Rá para punir a humanidade, a leoa não conheceu saciedade: bebeu sangue até quase varrer os homens da terra. Só cessou quando os deuses inundaram os campos de cerveja tingida de vermelho, que ela confundiu com sangue e sorveu até dormir. Onde ela passa, os fracos viram cinza.",
    texto: "Ao Entrar: destrói todas as cartas de custo 1 em jogo (dos dois lados)." },
  { key: "apofis", nome: "Apófis", tipo: "Criatura", custo: 4, poder: 3, arch: "sacrificio", arte: "apofis",
    trigger: "entrar", absorb: true,
    lore: "Serpente do caos primordial, Apófis se enrosca nas trevas para engolir o sol a cada noite. Devora tudo o que encontra — até os seus — e de cada presa retira a força para o próximo bote.",
    texto: "Ao Entrar: destrói suas outras cartas nesta via e ganha o Poder total delas." },
  { key: "diluvio", nome: "Dilúvio de Hápi", tipo: "Fenômeno", custo: 5, poder: 5, arch: "sacrificio",
    trigger: "entrar", afogaCusto: [1, 2], arte: "diluvio", arteFoco: "center 0%",
    lore: "Todo ano a cheia de Hápi engolia os campos, e nesse afogamento morava a promessa: o limo que a água deixava fazia o Egito florescer. O deus não distinguia amigo de plantação — arrastava tudo o que encontrava, para que da ruína nascesse a fartura.",
    texto: "Ao Entrar: destrói todas as cartas de custo 1 ou 2 nesta via, dos dois lados — inclusive as suas. Não alcança quem estiver sob um Gato Egípcio." },
  { key: "bennu", nome: "Bennu", tipo: "Criatura", custo: 1, poder: 0, arch: "renascimento",
    trigger: "morrer", arte: "bennu",
    lore: "Os antigos egípcios viam Bennu como a ave da criação e da renovação. Sua lenda inspirou, séculos depois, o mito da Fênix.",
    texto: "Ao Morrer: renasce na mesma rodada, em via aleatória, com +1 de Poder. Mantém os bônus permanentes que tinha. +1 de energia no próximo turno." },
  { key: "renenutet", nome: "Renenutet", tipo: "Divindade", custo: 3, poder: 3, arch: "buff",
    trigger: "entrar", spreadOnBlessing: 2, arte: "renenutet", arteFoco: "center 0%",
    lore: "Renenutet dava à criança o seu ren — o nome verdadeiro — e fazia o grão render. Sem nome, nada existia; por isso ela alimentava e batizava no mesmo gesto.",
    texto: "Ao receber uma bênção permanente: +1 a duas outras cartas suas em jogo. Bênçãos recebidas fora de jogo resolvem ao entrar." },
  { key: "anubis", nome: "Anúbis", tipo: "Divindade", custo: 4, poder: 4, arch: "reset",
    trigger: "entrar", judgeLane: true, arte: "anubis", arteFoco: "center 0%",
    lore: "Anúbis pesava o coração do morto contra a pluma de Maat. Sua justiça não conhecia posição nem riqueza: diante da balança, todos os corações valiam pelo mesmo peso.",
    texto: "Ao Entrar: todas as outras cartas desta via têm o Poder base nivelado ao menor entre elas. Buffs permanentes somem; auras permanecem. O julgamento persiste." },
  { key: "khnum", nome: "Khnum, o Oleiro Divino", tipo: "Divindade", custo: 6, poder: 5, arch: "buff",
    trigger: "entrar", buffsPerBlessing: 1, arte: "khnum", arteFoco: "center 0%",
    lore: "Khnum, o deus oleiro que molda as almas dos deuses, reforja a si mesmo conforme trabalha em harmonia com seus pares abençoados. Sua forma se torna mais robusta, seu poder mais refinado — cada bênção que flui ao seu redor alimenta sua transformação divina.",
    texto: "Ao Entrar: ganha +1 de Poder para cada carta aliada com bênção revelada em jogo." },
  /* ASSASSINOS — Arquétipo de Veneno
     Veneno acumula em marcas independentes (uma carta pode ter [1,1,2]). O dano é a
     soma das marcas, aplicada no início de cada rodada seguinte. Senti marca 2 alvos;
     Semerj replica os venenos da via para outras vias; Seqer-Mau (finisher) repete
     imediatamente o dano de todas as cartas envenenadas do campo. */
  { key: "sicario", nome: "Sicário", tipo: "Guerreiro", custo: 1, poder: 1, arch: "debuff",
    trigger: "entrar", veneno: 1, arte: "sicario",
    lore: "Criminoso de rua que trabalha por migalhas. Sua faca é curta, seu veneno é letal.",
    texto: "Ao Entrar: marca uma carta inimiga aleatória nesta via com Veneno I (-1/rodada)." },
  { key: "senti", nome: "Senti, o Finalizador", tipo: "Guerreiro", custo: 2, poder: 2, arch: "debuff",
    trigger: "entrar", veneno: 1, venenoAlvos: 2, arte: "senti", arteFoco: "center 0%",
    lore: "Executor cuja função é semear a morte em dobro. Onde passa, dois caem em vez de um.",
    texto: "Ao Entrar: marca até 2 cartas inimigas aleatórias nesta via com Veneno I (-1/rodada cada)." },
  { key: "hemsu", nome: "Hemsu, o Golpeador", tipo: "Guerreiro", custo: 3, poder: 3, arch: "debuff",
    trigger: "entrar", veneno: 2, arte: "hemsu",
    lore: "Assassino treinado que acerta sempre na fraqueza. Seu veneno corrói corpo e espírito.",
    texto: "Ao Entrar: marca uma carta inimiga aleatória nesta via com Veneno II (-2/rodada)." },
  { key: "semerj", nome: "Semerj, o Executor", tipo: "Guerreiro", custo: 4, poder: 4, arch: "debuff",
    trigger: "entrar", replicaVeneno: true, arte: "semerj", arteFoco: "center 0%",
    lore: "Executor que propaga a peste. O veneno de uma via, ele espalha por todo o campo de batalha.",
    texto: "Ao Entrar: replica os venenos das cartas inimigas desta via para cartas inimigas de outras vias (1 por carta). Nulo se não houver venenos aqui ou cartas em outras vias." },
  { key: "akhu", nome: "Akhu, o Espírito", tipo: "Criatura", custo: 5, poder: 5, arch: "debuff",
    trigger: "entrar", veneno: 3, arte: "akhu", arteFoco: "center 0%",
    lore: "Espírito vingativo dos mortos, sem repouso. Seu veneno é a própria raiva dos séculos.",
    texto: "Ao Entrar: marca uma carta inimiga aleatória nesta via com Veneno III (-3/rodada)." },
  { key: "seqer-mau", nome: "Seqer-Mau, o Destruidor", tipo: "Criatura", custo: 6, poder: 6, arch: "debuff",
    trigger: "entrar", finalizador: true, arte: "seqer-mau", arteFoco: "center 0%",
    lore: "O grande assassino das eras. Quando surge, todo o veneno do campo ferve de uma só vez.",
    texto: "Ao Entrar: repete imediatamente o dano de veneno de todas as cartas inimigas envenenadas do campo (todas as vias)." },
  { key: "amheh", nome: "Am-heh, o Devorador de Milhões", tipo: "Divindade", custo: 6, poder: 0, arch: "sacrificio",
    trigger: "continuo", arte: "amheh", arteFoco: "center 0%",
    lore: "No lago de fogo do Duat morava Am-heh, o Comedor da Eternidade — face de cão, fome sem fundo. Não julgava como Osíris nem pesava como Maat: simplesmente devorava, e do poder de cada destruído fazia o seu próprio.",
    texto: "Contínuo: absorve o Poder de cada carta destruída na partida, de qualquer lado (inclusive valores negativos)." },
  /* KA ERRANTE — o ECO. Não tem efeito próprio: reexecuta o Ao Entrar da última
     carta revelada que ainda esteja em campo, como se ele fosse essa carta.
     A carta ecoada pode ser de QUALQUER lado — a fila de revelação é única, e é
     por isso que a carta ganha valor com prioridade contrária: quem revela
     depois escolhe entre os efeitos que acabou de ver. */
  { key: "ka-errante", nome: "Ka Errante", tipo: "Criatura", custo: 3, poder: 3, arch: "renascimento",
    trigger: "entrar", ecoUltimo: true, arte: "ka-errante",
    lore: "O ka nascia junto com a pessoa, duplo exato dela, e continuava a ter fome depois da morte: por isso as tumbas recebiam pão e cerveja todos os dias, e uma estátua guardada no serdab servia de corpo reserva caso o primeiro apodrecesse. Quando as oferendas cessavam, o ka não morria — saía a vagar, repetindo os gestos de quem já não estava ali.",
    texto: "Copia o último efeito ao entrar em jogo." },
  /* ------------------------------ ANIMAIS ---------------------------------
     Arquétipo de OCUPAÇÃO: corpo barato, pouco Poder por carta, presença nas
     três vias e finalizadores que escalam com o tabuleiro cheio. É o oposto
     mecânico do Guerreiro (poder concentrado, eficiência por carta, Montu).
     Animais NÃO recebem Montu, e a Peste nos Animais é a resposta natural
     ao arquétipo — foi ela que definiu `tipo: "Animal"` no motor. */
  { key: "cao", nome: "Cão do Deserto", tipo: "Animal", custo: 0, poder: 1, arch: "animal", arte: "cao",
    lore: "O tesem, de orelhas eretas e cauda enrolada, corre nas paredes dos túmulos desde antes das pirâmides. Não era símbolo de coisa alguma: era o bicho que ia à frente do caçador — e a quem se dava nome próprio. Abutiu, o cão de um faraó, tem o nome mais antigo de cão que se conhece." },
  { key: "cabra-nilo", nome: "Cabra do Nilo", tipo: "Animal", custo: 1, poder: 1, arch: "animal", arte: "cabra-nilo",
    trigger: "entrar", animalNaVia: 1,
    texto: "Ao Entrar: +1 de Poder para cada outro Animal seu nesta via.",
    lore: "A cabra dava leite onde a terra não sustentava vaca, e por isso era o gado de quem não tinha gado. Os escribas contavam bois cabeça por cabeça; cabra ninguém contava uma a uma — contava-se o rebanho." },
  { key: "ganso", nome: "Ganso Doméstico", tipo: "Animal", custo: 1, poder: 1, arch: "animal", arte: "ganso",
    trigger: "entrar", invocar: { key: "token-ganso", onde: "propria" },
    texto: "Ao Entrar: invoque um Ganso (0/1) nesta via.",
    lore: "Do ganso Gengen Wer, o Grande Grasnador, teria saído o ovo que continha o sol. Em terra, porém, o ganso do Nilo era o mais banal dos bens: engordado à força, salgado em jarras e oferecido aos milhares nos altares." },
  { key: "gato", nome: "Gato Egípcio", tipo: "Animal", custo: 2, poder: 2, arch: "animal", arte: "gato", arteFoco: "center 0%",
    trigger: "continuo", protegeVia: true,
    texto: "Contínuo: suas cartas nesta via não podem ser alvo escolhido por efeitos inimigos. Não impede efeitos globais nem de via inteira.",
    lore: "Matar um gato, ainda que sem querer, era crime capital: Diodoro conta que uma multidão linchou um romano por isso, em plena missão diplomática. O animal que guardava o celeiro dos ratos acabou guardado pela cidade inteira." },
  { key: "macaco", nome: "Macaco Sagrado", tipo: "Animal", custo: 2, poder: 4, arch: "animal", arte: "macaco",
    trigger: "entrar", moverAnimal: true,
    texto: "Ao Entrar: move outro Animal seu para outra via com espaço.",
    lore: "Babuínos vinham de Punt e viviam nos templos de Tot, com nome, ração e sepultura própria. Nas pinturas aparecem trepando em figueiras a mando dos donos: o Egito descobriu cedo que o macaco alcança o que o homem não alcança." },
  { key: "hiena", nome: "Hiena do Deserto", tipo: "Animal", custo: 2, poder: 2, arch: "animal", arte: "hiena",
    trigger: "continuo", ganhoPorAnimalMorto: 2,
    texto: "Contínuo: +2 de Poder permanente sempre que um Animal seu for destruído em campo.",
    lore: "Nos relevos do Império Antigo há hienas amarradas e alimentadas à força, como se engordam gansos: o Egito tentou criar a carniceira em cativeiro. Não deu certo — o bicho que prospera do que morre não se deixa domesticar." },
  { key: "garca", nome: "Garça do Nilo", tipo: "Animal", custo: 2, poder: 2, arch: "animal", arte: "garca",
    trigger: "continuo", bonusPorViaCheia: 3,
    texto: "Contínuo: +3 de Poder para cada via sua com os quatro espaços ocupados.",
    lore: "A garça pousa no primeiro monte de terra que emerge da cheia, e foi dessa imagem que os egípcios fizeram o relato da criação. Ela só desce quando já não sobra água: chega por último, e chega ao cheio." },
  { key: "rebanho", nome: "Rebanho de Cabras", tipo: "Animal", custo: 3, poder: 2, arch: "animal", arte: "rebanho",
    trigger: "entrar", invocar: { key: "token-cabra", onde: "outras" },
    texto: "Ao Entrar: invoque uma Cabra (0/1) em cada uma das outras duas vias.",
    lore: "O Censo do Gado marcava os anos do reinado: contava-se o rebanho do Egito inteiro e o número virava data. Rebanho não andava em fila — espalhava-se por onde houvesse mato, e era assim que se media a riqueza de um homem." },
  { key: "domador", nome: "Domador de Animais", tipo: "Humano", custo: 3, poder: 2, arch: "animal", arte: "domador", arteFoco: "center 25%",
    trigger: "continuo", anthemType: "Animal", anthemVal: 2,
    texto: "Contínuo: seus Animais ganham +2 de Poder.",
    lore: "Havia o pastor, o guardador de gansos, o tratador de babuínos — cada bicho com seu homem, e cada homem com o título gravado na parede do túmulo. No Egito, animal nenhum ficava selvagem por muito tempo: encontrava dono, nome e ração." },
  { key: "apis", nome: "Touro Ápis", tipo: "Animal", custo: 6, poder: 7, arch: "animal", arte: "apis",
    trigger: "entrar", bonusPorAnimal: 1,
    texto: "Ao Entrar: +1 de Poder para cada outro Animal revelado em jogo, dos dois lados.",
    lore: "Um só touro por vez era Ápis, escolhido por marcas no pelo: vivia em Mênfis servido como rei e, ao morrer, era mumificado e descia ao Serapeu num sarcófago de granito de setenta toneladas. Enquanto ele vivia, todo o resto do gado do Egito era apenas gado." },
  // Set das Pragas — a ÚNICA carta escolhível do set. Ela traz as outras dez.
  { key: "moises", nome: "Moisés, Portador das Pragas", tipo: "Divindade", custo: 1, poder: 0, arch: "crescimento",
    set: "pragas", abertura: true, outorga: "pragas",
    arte: "moises", arteFoco: "center 20%",
    lore: "Criado na corte que depois desafiaria, recebeu antes um nome egípcio — mose, \"filho\" — do que uma missão. Diante do faraó não apresentou exército algum: apresentou o Nilo, virado contra o Egito.",
    texto: "Começa na mão. A 1ª Praga diferente que resolver enquanto ele estiver em campo dá +1 de Poder; cada Praga diferente seguinte dobra seu Poder atual. Escolhê-lo adiciona as 10 Pragas ao seu deck." },
];

/* ======================= SET DAS PRAGAS — cartas outorgadas ==================
   As 10 Pragas NÃO são escolhíveis: ficam fora de CARDS, então nem a Galeria
   principal nem o deckbuilder as oferecem. Quem as traz é o Moisés — ele declara
   `outorga`, e ao começar a partida as 10 entram no deck e vão para o
   embaralhamento. Escolher Moisés custa 1 das 12 vagas e infla o deck para 22:
   é esse o preço do arquétipo, e é por isso que a curva dele é imprevisível.

   Reusam os arquétipos existentes (debuff, sacrificio, silencio) em vez de criar
   um glifo novo — a identidade visual do set virá da moldura em medalhão. */
export const PRAGAS = [
  { key: "sangue", ordem: 1, nome: "Águas em Sangue", tipo: "Praga", custo: 1, poder: 0, arch: "debuff", set: "pragas", praga: true,
    arte: "sangue",
    texto: "Uma carta inimiga aleatória em cada via ocupada recebe -1 de Poder.",
    lore: "Tudo no Egito media-se pelo Nilo: a colheita, o calendário, o imposto. Quando a água deixou de ser água, não faltou apenas bebida — faltou a régua com que o país se entendia." },
  { key: "ras", ordem: 2, nome: "Praga das Rãs", tipo: "Praga", custo: 2, poder: 0, arch: "debuff", set: "pragas", praga: true,
    arte: "ras",
    texto: "Crie uma Rã (1/1) num espaço vazio de uma via inimiga aleatória. A Rã pertence ao oponente.",
    lore: "Heket tinha cabeça de rã e presidia o nascimento: o animal era sinal de vida que se multiplica. A praga não trouxe nada de novo ao Egito — só devolveu o próprio símbolo em quantidade insuportável." },
  { key: "piolhos", ordem: 3, nome: "Praga dos Piolhos", tipo: "Praga", custo: 1, poder: 0, arch: "debuff", set: "pragas", praga: true,
    arte: "piolhos",
    texto: "Aumente em 1 o custo de uma carta aleatória na mão do adversário.",
    lore: "O sacerdote egípcio raspava o corpo inteiro e se lavava quatro vezes ao dia; impureza no corpo era impureza no rito. A terceira praga não feriu ninguém: apenas tornou todo o clero incapaz de servir." },
  { key: "moscas", ordem: 4, nome: "Praga das Moscas", tipo: "Praga", custo: 2, poder: 0, arch: "debuff", set: "pragas", praga: true,
    arte: "moscas",
    texto: "Embaralhe duas Moscas (1/0) no deck do adversário.",
    lore: "O faraó condecorava seus bravos com a Mosca de Ouro, pingente entregue a quem não recuava em combate. Foi essa insígnia que a quarta praga cobriu de escárnio, enchendo o Egito de moscas que ninguém quis." },
  { key: "peste", ordem: 5, nome: "Peste nos Animais", tipo: "Praga", custo: 3, poder: 0, arch: "sacrificio", set: "pragas", praga: true,
    arte: "peste",
    texto: "Destrua todos os Animais inimigos na via em que esta Praga foi jogada.",
    lore: "Rebanho era riqueza contável: os escribas registravam cabeça por cabeça, e o touro Ápis era adorado vivo em Mênfis. Matar o gado do Egito esvaziava ao mesmo tempo o celeiro e o altar." },
  { key: "ulceras", ordem: 6, nome: "Praga das Úlceras", tipo: "Praga", custo: 2, poder: 0, arch: "debuff", set: "pragas", praga: true,
    arte: "ulceras",
    texto: "Uma carta inimiga aleatória na via em que esta Praga foi jogada recebe Úlceras: -1 de Poder imediatamente e -1 no início de cada rodada enquanto permanecer em jogo.",
    lore: "O Papiro de Ebers dedica dezenas de receitas às feridas de pele — mel, gordura, malaquita moída. Contra a sexta praga nenhuma serviu, e a medicina mais antiga do mundo assistiu de mãos vazias." },
  { key: "granizo", ordem: 7, nome: "Chuva de Granizo e Fogo", tipo: "Praga", custo: 3, poder: 0, arch: "sacrificio", set: "pragas", praga: true,
    arte: "granizo",
    texto: "Destrua uma carta inimiga aleatória de custo 1 em jogo. Depois, aumente em 1 o custo de uma carta aleatória na mão do adversário.",
    lore: "No Egito quase não chove, e granizo era coisa de que só se ouvia falar em terras estrangeiras. Cair gelo do céu não foi só destruição: foi a prova de que o céu havia trocado de dono." },
  { key: "gafanhotos", ordem: 8, nome: "Nuvem de Gafanhotos", tipo: "Praga", custo: 3, poder: 0, arch: "debuff", set: "pragas", praga: true,
    arte: "gafanhotos",
    texto: "Uma carta inimiga aleatória em cada via ocupada recebe -2 de Poder.",
    lore: "O Egito guardava grão para os anos magros, e era essa reserva que o tornava a potência do mundo antigo. A oitava praga não roubou o celeiro: comeu a safra que ainda estava de pé, antes que houvesse o que guardar." },
  { key: "trevas", ordem: 9, nome: "Trevas sobre o Egito", tipo: "Praga", custo: 3, poder: 0, arch: "silencio", set: "pragas", praga: true,
    arte: "trevas",
    texto: "Na próxima rodada, as cartas dos dois lados permanecem ocultas. Na rodada seguinte, revele primeiro as atrasadas.",
    lore: "Todas as manhãs Rá vencia a serpente e o sol subia; era esse combate que garantia que o mundo continuasse existindo. Três dias de escuridão dispensaram qualquer discurso: diziam que Rá havia perdido." },
  { key: "primogenitos", ordem: 10, nome: "Morte dos Primogênitos", tipo: "Praga", custo: 6, poder: 0, arch: "sacrificio", set: "pragas", praga: true,
    arte: "primogenitos",
    texto: "Destrua a carta inimiga de maior custo em jogo. Em caso de empate, escolha aleatória.",
    lore: "Era o filho mais velho que abria a boca do morto e lhe servia pão e cerveja pela eternidade; sem ele, o ka do pai passava fome para sempre. A décima praga não matou apenas herdeiros — condenou uma geração de pais à segunda morte." },
];

export const PRAGA_KEYS = PRAGAS.map((p) => p.key);

/* Teto global de mão. Vive aqui e não em match.js porque destroyList() também
   precisa dele: mão cheia é ABSOLUTA, nada entra na mão por nenhum caminho.
   Compra não acontece, corrente não repõe, Múmia não volta. */
export const MAO_MAX = 7;

// Sub-decks outorgados por carta. `outorga: "pragas"` no Moisés significa: ao
// montar a partida, acrescente estas chaves ao deck de quem o escolheu.
export const OUTORGAS = { pragas: PRAGA_KEYS };
/* ---------------------------------- TOKENS ---------------------------------
   Cartas que NUNCA entram em deck nem aparecem na Galeria: só existem porque um
   efeito as criou. Ficam FORA de CARDS (que é a coleção jogável, lida pela
   Galeria e pelo deckbuilder) e DENTRO de byKey, que é a tabela de consulta de
   todo o motor. Ambas são custo 1 de propósito: a Sekhmet tem que alcançá-las. */
export const TOKENS = [
  { key: "token-ra", nome: "Rã", tipo: "Animal", custo: 1, poder: 1, arch: "base", set: "pragas", token: true,
    arte: "token-ra",
    lore: "A segunda praga subiu do Nilo e entrou nos fornos, nas camas e nas amassadeiras. Não matava ninguém: apenas ocupava cada palmo até não haver onde pisar." },
  { key: "token-mosca", nome: "Mosca", tipo: "Animal", custo: 1, poder: 0, arch: "base", set: "pragas", token: true,
    arte: "token-mosca",
    lore: "O enxame da quarta praga não devorava nem picava — apenas estava em toda parte, num zumbido que não deixava pensar. O Egito aprendeu que atrapalhar basta." },
  /* Fichas do arquétipo Animal. Custo 0, e não 1 como as duas de cima: as fichas
     das Pragas foram feitas alcançáveis pela Sekhmet de propósito, mas estas são
     o corpo barato de um arquétipo que JÁ é vulnerável à Peste nos Animais e a
     todo efeito de via. Somar a Sekhmet a isso seria cobrar duas vezes. */
  { key: "token-ganso", nome: "Ganso Doméstico", tipo: "Animal", custo: 0, poder: 1, arch: "animal", token: true, arte: "token-ganso",
    lore: "Ganso do Nilo nunca aparece sozinho nas pinturas: vem sempre em fila, e a fila é o ponto." },
  /* Ficha do Enxame. Custo 1, e não 0 como as duas acima: estas nascem com o
     Poder da carta-mãe (que pode vir alto depois de bênçãos), e um corpo que
     carrega Poder precisa ter resposta. Custo 1 mantém a Sekhmet como o preço
     de varrer um enxame — mesma razão da Rã e da Mosca. */
  { key: "token-gafanhoto", nome: "Gafanhoto", tipo: "Guerreiro · Animal", tipos: ["Guerreiro", "Animal"],
    custo: 1, poder: 2, arch: "crescimento", token: true, arte: "token-gafanhoto",
    lore: "Um gafanhoto sozinho é insignificante, e foi por isso que ninguém contou o primeiro. Quando se contou o milésimo, já não havia o que colher." },
  { key: "token-cabra", nome: "Cabra", tipo: "Animal", custo: 0, poder: 1, arch: "animal", token: true, arte: "token-cabra",
    lore: "Uma cabra come o que houver, dá leite e não pede pasto. Vinte cabras são um patrimônio." },
];

export const byKey = Object.fromEntries([...CARDS, ...PRAGAS, ...TOKENS].map((c) => [c.key, c]));

/* ------------------------------ NOME CURTO ---------------------------------
   Uma miniatura tem ~49px de largura. "Am-heh, o Devorador de Milhões" não cabe
   ali de jeito nenhum: quebrava em duas linhas e ainda truncava, e a faixa do
   nome comia a arte. Então cada carta ganha um NOME DE MINIATURA de uma palavra
   só — a palavra que identifica a carta — usado APENAS na mão e no tabuleiro.
   O nome completo continua no zoom, na carta grande e na montagem de deck.

   Fica numa tabela única, e não espalhado por 55 definições, porque é uma
   decisão de apresentação: quem for rebatizar alguma coisa mexe num lugar só e
   vê todas as escolhas lado a lado — que é como se percebe colisão.

   Só entram aqui as que MUDAM. Quem já é de uma palavra (Hathor, Sobek, Bennu,
   Anúbis...) cai no fallback para `nome` e não precisa de linha.

   Duas colisões resolvidas de propósito:
   - "Cabra do Nilo" e a ficha "Cabra" ficariam idênticas no tabuleiro, e o
     Rebanho de Cabras cria exatamente essas fichas. A CARTA leva "Cabra"; a
     FICHA vira "Cabrita" na miniatura (o nome real dela segue "Cabra").
   - A praga 8 é "Nuvem", e não "Gafanhotos", para não ficar encostada na ficha
     "Gafanhoto" e na carta "Enxame" — três coisas parecidas na mesma via. */
const NOME_CURTO = {
  // Guerreiros
  servo: "Servo", arqueiro: "Arqueiro", lanceiro: "Lanceiro", carruagem: "Carruagem",
  guardareal: "Guarda", general: "General", colosso: "Colosso",
  "assassino-medjay": "Medjay", enxame: "Enxame",
  // Assassinos
  sicario: "Sicário", senti: "Senti", hemsu: "Hemsu", semerj: "Semerj", akhu: "Akhu", "seqer-mau": "Seqer-Mau",
  // Divindades de nome composto
  amheh: "Am-heh", moises: "Moisés", khnum: "Khnum",
  // Criaturas e demais
  escaravelho: "Escaravelho", ammit: "Ammit", armadura: "Armadura",
  selo: "Silêncio", diluvio: "Dilúvio", "ka-errante": "Ka",
  // Animais
  cao: "Cão", "cabra-nilo": "Cabra", ganso: "Ganso", gato: "Gato",
  macaco: "Macaco", hiena: "Hiena", garca: "Garça", rebanho: "Rebanho",
  domador: "Domador", apis: "Ápis",
  // Pragas — o número da praga já aparece na plaqueta, então o nome pode ser curto
  sangue: "Sangue", ras: "Rãs", piolhos: "Piolhos", moscas: "Moscas",
  peste: "Peste", ulceras: "Úlceras", granizo: "Granizo", gafanhotos: "Nuvem",
  trevas: "Trevas", primogenitos: "Primogênitos",
  // Fichas
  "token-ganso": "Ganso", "token-cabra": "Cabrita",
};
for (const c of [...CARDS, ...PRAGAS, ...TOKENS]) c.nomeCurto = NOME_CURTO[c.key] || c.nome;

/* --------------------------- ASSINATURA DA COLEÇÃO -------------------------
   No multiplayer o servidor roda ESTE MESMO arquivo, mas o deploy dele é
   separado do deploy do site. Se um dos dois ficar para trás, o app manda uma
   carta que o servidor não conhece e a partida quebra — antes, quebrava calada.
   CONTENT_SIG é um resumo (hash FNV-1a) de toda a coleção: muda se uma carta
   entra, sai ou tem custo/poder alterado. Cliente e servidor trocam a
   assinatura no aperto de mão; se diferirem, o app avisa em vez de travar. */
export const CARD_KEYS = [...CARDS, ...PRAGAS, ...TOKENS].map((c) => c.key).sort();
export const CONTENT_SIG = (() => {
  const txt = [...CARDS, ...PRAGAS, ...TOKENS]
    .map((c) => `${c.key}:${c.custo}:${c.poder}`)
    .sort()
    .join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
})();

// Custo efetivo de uma INSTÂNCIA (item de mão ou carta de tabuleiro): o custo
// impresso mais os agravos gravados nela (Praga dos Piolhos, Chuva de Granizo).
// Todo lugar que DECIDE algo por custo — energia paga, devolução ao recolher,
// Sekhmet, Morte dos Primogênitos — tem que passar por aqui. Quem só EXIBE a
// coleção (Galeria, deckbuilder) pode continuar lendo def.custo, porque lá não
// existe instância.
export const custoDe = (c) => Math.max(0, byKey[c.key].custo + (c.custoMod || 0));

// Set ao qual a carta pertence. Cartas antigas não declaram nada e são "base";
// o Set das Pragas declarará set: "pragas". Existe para os filtros da Galeria
// sem precisar tocar nas 26 definições já escritas.
export const setDe = (def) => def.set || "base";
export const SIDE_NAME = ["Lado A (ouro)", "Lado B (lápis)"];

// ------------------------------- utilidades --------------------------------
let UID = 1;
export const nextUid = () => UID++;
export const resetUid = () => { UID = 1; };

export const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const coin = () => (Math.random() < 0.5 ? 0 : 1);
export const ctxOf = (s) => ({ board: s.board, deaths: s.deaths, plays: s.plays, destroyedPower: s.destroyedPower || [0, 0] });
export const pushLog = (s, m) => {
  s.log = [m, ...s.log].slice(0, 80);           // painel: recente primeiro, 80 linhas
  s.trace = [...(s.trace || []), m];            // exportacao: tudo, em ordem
};

/* ---------------------- OCUPAÇÃO DA VIA (fonte única) ----------------------
   Cada jogador tem QUATRO espaços por via (grade 2×2 do seu lado). A conta
   estava repetida em cinco lugares — place, Bennu, Rãs, Set, Enxame — e agora
   mora aqui. `!c.dying` faz parte da definição: quem está saindo já liberou o
   espaço, e é isso que permite Sobek destruir a via e a mesma rodada preencher.

   VIA CHEIA é POR LADO, e não pelos oito espaços dos dois lados juntos. Essa
   já era a definição oficial do motor (é a mensagem "Via 2 cheia (4/4)" que o
   jogador vê ao tentar posicionar), e é dela que a Garça do Nilo se alimenta.
   Se um dia a Garça tiver que exigir os dois lados cheios, o lugar de mudar é
   contarViasCheias() — e só ele. */
export const LANE_CAP = 4;
export const ocupacaoDaVia = (board, owner, lane) =>
  board.filter((c) => c.owner === owner && c.lane === lane && !c.dying).length;
export const viaCheia = (board, owner, lane) => ocupacaoDaVia(board, owner, lane) >= LANE_CAP;
export const viasComEspaco = (board, owner, exceto = null) =>
  [0, 1, 2].filter((l) => l !== exceto && !viaCheia(board, owner, l));
export const contarViasCheias = (board, owner) =>
  [0, 1, 2].filter((l) => viaCheia(board, owner, l)).length;

/* ------------------------------- ANIMAIS -----------------------------------
   O arquétipo é lido pelo `tipo` da definição — o mesmo campo que a Peste nos
   Animais já usava antes de existir um Animal escolhível. Fichas contam como
   Animais enquanto estiverem em campo, porque a ficha É uma carta de tabuleiro
   comum: só não existe fora dele.

   `revelado` é o critério, e vale para TUDO — contagem e destruição. Uma carta
   ainda oculta não está em jogo para efeito nenhum: não tem tipo, não conta,
   não pode ser atingida. Ver a REGRA DA REVELAÇÃO em `emJogo`. */
/* TIPO DUPLO. A maioria das cartas tem um tipo só, declarado em `tipo`, que é
   também o que aparece na tarja da moldura. Quem tem mais de um declara `tipos`,
   e aí `tipo` vira apenas o rótulo legível ("Guerreiro · Animal").
   TUDO que pergunta "isto é um X?" passa por aqui — hinos, Peste, Medjay,
   seletores de Animal, Hiena. É o que garante que um tipo novo não precise ser
   ensinado a cada efeito separadamente. */
export const temTipo = (c, tipo) => {
  const d = byKey[c.key];
  return d?.tipos ? d.tipos.includes(tipo) : d?.tipo === tipo;
};
/* ----------------------- REGRA DA REVELAÇÃO (única) -------------------------
   Uma carta só EXISTE para os efeitos das outras depois de revelada. Enquanto
   está de face para baixo ela ocupa o espaço da via e nada mais: não conta para
   arquétipo, não recebe bênção nem maldição, não pode ser destruída, movida ou
   escolhida como alvo.

   A regra é única e vale para os DOIS LADOS — inclusive para as cartas do
   próprio dono do efeito. Quem coloca Sobek e só depois um aliado na mesma via
   revela Sobek primeiro, e o aliado ainda oculto não é devorado.

   Consequência tática, que é o motivo da regra: a PRIORIDADE deixa de ser
   vantagem pura. Revelar antes significa agir sobre um tabuleiro menor — o lado
   que revela depois joga suas cartas a salvo dos Ao Entrar desta rodada, mas
   entrega a leitura do campo ao adversário. Dentro do seu próprio lado, a ordem
   de colocação vira decisão: alvo primeiro, efeito depois.

   TODO efeito que olha o tabuleiro passa por aqui. Exceção deliberada e única:
   `ocupacaoDaVia`, porque o espaço é ocupado no instante da colocação — do
   contrário a via aceitaria mais cartas do que cabe. */
export const emJogo = (c) => c.revealed && !c.dying;
export const animaisEmJogo = (board, { owner = null, lane = null, exceto = null } = {}) =>
  board.filter((c) =>
    emJogo(c) && temTipo(c, "Animal") &&
    (owner === null || c.owner === owner) &&
    (lane === null || c.lane === lane) &&
    (exceto === null || c.uid !== exceto));

/* --------------------- PROTEÇÃO DE ALVO (Gato Egípcio) ---------------------
   O Gato torna INALCANÇÁVEIS as cartas do seu dono na sua via — todas elas, de
   qualquer tipo, ele inclusive. A distinção que importa não é "quem faz mal" e
   sim "quem ESCOLHE uma carta":

     bloqueia  — Set (dispersa 2 sorteadas), Águas em Sangue, Gafanhotos,
                 Úlceras, Granizo, Primogênitos, e qualquer mira inimiga futura.
     não bloqueia — Sekhmet (varre um custo em todo o tabuleiro), Assassino
                 Medjay e Peste nos Animais (varrem uma via inteira sem
                 escolher), Maat, Anúbis, fim de partida.

   Sorteio CONTA como escolha: o efeito precisa apontar uma carta para resolver.
   É por isso que a proteção entra dentro dos seletores de alvo (não numa
   varredura à parte) — assim o alvo é revalidado no momento da resolução, e
   não só quando a interface pinta o realce. */
export const laneProtegida = (board, owner, lane) =>
  board.some((c) => c.key === "gato" && c.owner === owner && c.lane === lane && emJogo(c));

/* `ignoraDono` inverte a regra do dono para efeitos INDISCRIMINADOS — os que
   varrem a via sem separar amigo de inimigo, hoje só o Dilúvio de Hápi. Nesses,
   o Gato é abrigo contra a coisa em si, e não contra quem a invocou: a cheia não
   pergunta de quem é a carta, e o gato leva todo mundo para o alto.
   Fora daí a regra continua sendo "efeito próprio nunca é bloqueado", que é o
   que mantém a Hathor capaz de abençoar um aliado numa via com Gato. */
export function podeSerAlvo(board, alvo, fonte, { ignoraDono = false } = {}) {
  if (!alvo) return false;
  if (!fonte) return true;
  if (fonte.owner === alvo.owner && !ignoraDono) return true;
  return !laneProtegida(board, alvo.owner, alvo.lane);
}

// ----------------------------- motor de poder -------------------------------
export const laneHasMaat = (board, lane) =>
  board.some((c) => c.lane === lane && c.key === "maat" && c.revealed && !c.dying);

/* HINOS — auras contínuas que fortalecem um TIPO inteiro do próprio dono.
   Montu (+2 aos Guerreiros) era um caso especial escrito à mão; o Domador de
   Animais (+1 aos Animais) tem a mesma forma, então a forma virou regra: quem
   declara `anthemType` + `anthemVal` vira uma fonte de hino, e nada mais precisa
   ser tocado no motor. Fontes iguais ACUMULAM (dois Domadores dão +2) e cada
   fonte aparece com o próprio nome na decomposição do Poder.
   A fonte nunca fortalece a si mesma — hoje isso é automático (Montu é
   Divindade, o Domador é Humano), mas fica explícito para não virar armadilha
   se algum dia um hino apontar para o próprio tipo. */
export function hinosPara(board, card) {
  const soma = new Map();
  for (const c of board) {
    if (c.owner !== card.owner || !c.revealed || c.dying || c.uid === card.uid) continue;
    const d = byKey[c.key];
    if (!d?.anthemType || !temTipo(card, d.anthemType)) continue;
    soma.set(d.nome, (soma.get(d.nome) || 0) + d.anthemVal);
  }
  return [...soma].map(([label, val]) => ({ label, val }));
}

// Decompoe o poder em parcelas nomeadas. O power() abaixo e a SOMA disto, para
// que o numero exibido e a explicacao nunca possam divergir.
export function decomporPartes(card, ctx) {
  const { board, deaths, plays, destroyedPower } = ctx;
  // Anúbis grava card.judged: o base foi nivelado e os buffs permanentes caíram.
  const julgado = typeof card.judged === "number";
  const base = julgado ? card.judged : card.printed;
  const partes = [{ label: julgado ? "Base (julgado por Anúbis)" : "Impresso", val: base, tipo: julgado ? "julgado" : "base" }];
  if (laneHasMaat(board, card.lane)) {
    partes.push({ label: "Maat — reduzido ao impresso", val: card.printed - base, tipo: "maat" });
    return partes;
  }
  if (card.baked) partes.push({ label: "Faixa acumulada", val: card.baked, tipo: "acumulado" });
  // Buffs permanentes gravados ANTES do julgamento foram apagados; só sobrevivem
  // os mods marcados apos o julgamento (nao ha, hoje) — auras entram abaixo.
  for (const m of card.mods)
    partes.push({ label: m.src, val: m.val, tipo: m.inert ? "inerte" : m.val > 0 ? "bencao" : "maldicao" });

  const amons = board.filter((c) => c.owner === card.owner && c.key === "amon" && c.revealed && !c.dying && c.uid !== card.uid).length;
  if (amons) partes.push({ label: "Amon", val: amons, tipo: "continuo" });

  for (const h of hinosPara(board, card)) partes.push({ ...h, tipo: "continuo" });

  /* Garça do Nilo: CONTÍNUA, e não Ao Entrar. Ela reconta as vias a cada leitura,
     então cresce quando uma via sua fecha em qualquer rodada — e encolhe de novo
     se a via se abrir. É o mesmo contrato do Amon e do Domador: aura viva, nada
     gravado em `mods`. Consequências: a Maat continua desligando (o curto-circuito
     lá em cima pega todas as auras) e o Selo do Silêncio deixa de alcançá-la,
     porque o Selo só bloqueia efeito de entrada. */
  const porViaCheia = byKey[card.key]?.bonusPorViaCheia;
  if (porViaCheia) {
    const cheias = contarViasCheias(board, card.owner);
    if (cheias) partes.push({ label: `${byKey[card.key].nome} — ${cheias} via(s) cheia(s)`, val: porViaCheia * cheias, tipo: "continuo" });
  }

  if (card.key === "osiris") {
    const totalMortes = deaths[0] + deaths[1];
    if (totalMortes) partes.push({ label: "Osíris — mortes na partida", val: 2 * totalMortes, tipo: "continuo" });
  }

  if (card.key === "amheh") {
    const dp = destroyedPower || [0, 0];
    const absorvido = (dp[0] || 0) + (dp[1] || 0);
    if (absorvido) partes.push({ label: "Am-heh — Poder absorvido dos destruídos", val: absorvido, tipo: "continuo" });
  }

  if (card.key === "ammit") {
    const v = Math.max(0, plays[card.owner] - (card.entryPlays || 0));
    if (v) partes.push({ label: "Ammit — cartas jogadas após ela", val: v, tipo: "continuo" });
  }
  return partes;
}

export function power(card, ctx) {
  return decomporPartes(card, ctx).reduce((t, p) => t + p.val, 0);
}

export const laneScore = (ctx, lane, side) =>
  ctx.board.filter((c) => c.lane === lane && c.owner === side && c.revealed && !c.dying)
    .reduce((sum, c) => sum + power(c, ctx), 0);

export function laneWins(s) {
  const ctx = ctxOf(s); const w = [0, 0];
  for (let l = 0; l < 3; l++) {
    const a = laneScore(ctx, l, 0), b = laneScore(ctx, l, 1);
    if (a > b) w[0]++; else if (b > a) w[1]++;
  }
  return w;
}

/* Resultado da partida.
   1) Vence quem controla mais vias.
   2) Empatando em vias, decide o SALDO de pontos: a soma das diferenças de
      poder entre os lados em cada via (vias empatadas contribuem 0). Ou seja,
      a maior diferença de pontos nas vias não empatadas vence.
   3) Persistindo a igualdade, é empate.
   Retorna { side: 0|1|-1, tiebreak: bool, margin: number }. */
export function matchResult(s) {
  const w = laneWins(s);
  if (w[0] !== w[1]) return { side: w[0] > w[1] ? 0 : 1, tiebreak: false, margin: 0 };
  const ctx = ctxOf(s);
  let a = 0, b = 0;
  for (let l = 0; l < 3; l++) { a += laneScore(ctx, l, 0); b += laneScore(ctx, l, 1); }
  const diff = a - b;
  if (diff === 0) return { side: -1, tiebreak: false, margin: 0 };
  return { side: diff > 0 ? 0 : 1, tiebreak: true, margin: Math.abs(diff) };
}

/* ========================= ECO ESPIRITUAL (Ka Errante) =====================
   "A última carta revelada antes dele, que ainda esteja em jogo."

   A ORDEM é lida de `revealSeq`, um carimbo que o step() põe na carta no
   instante em que ela revela. Não dá para usar a ordem do `board` (ela é de
   COLOCAÇÃO, e a prioridade reordena a revelação) nem `s.lastReveal` (guarda
   só a imediatamente anterior, e ela pode ter morrido).

   Só recebe carimbo quem PASSA PELA REVELAÇÃO. Isso resolve de graça três
   casos que o documento pede:
     - fichas (Gafanhoto, Rã, Ganso, Cabra) nascem reveladas mas não foram
       reveladas: não são eco;
     - o Bennu que renasce é uma volta ao campo, não uma revelação;
     - a carta recolhida para a mão nunca chegou a revelar.

   "AINDA EM JOGO" é `emJogo()`. Quem foi destruído sai do board na purga do
   passo seguinte e, antes dela, está `dying` — os dois caminhos são cobertos.
   A Praga é excluída por NOME e não por `dying`: ela já sai do campo consumida,
   mas a regra é "Praga nunca é eco válido", e regra escrita não depende de
   coincidência de implementação. Excluída a Praga, a busca CONTINUA para trás.

   SÓ O PRÓPRIO LADO. A fila de revelação é única e entrelaça os dois jogadores,
   mas o eco é do SEU último efeito: a carta do adversário não é candidata e
   também não interrompe a busca — o Ka passa por cima dela e continua atrás.
   Sem isso, uma carta baunilha do oponente revelada no meio do caminho apagava
   o eco (achava, não tinha Ao Entrar, e o Ka entrava sem habilidade).

   Uma carta SUA sem Ao Entrar continua sendo um eco válido — ela é encontrada e
   simplesmente não produz efeito. É a diferença entre a regra 7 (achou, nada a
   copiar) e as regras 2 e 8 (nem chega a ser candidata). */
export function acharEcoAlvo(s, ka) {
  const limite = typeof ka.revealSeq === "number" ? ka.revealSeq : Infinity;
  const candidatas = s.board.filter(
    (c) => typeof c.revealSeq === "number" && c.revealSeq < limite && c.uid !== ka.uid
      && c.owner === ka.owner && emJogo(c) && !byKey[c.key]?.praga,
  );
  if (candidatas.length === 0) return null;
  return candidatas.reduce((a, b) => (b.revealSeq > a.revealSeq ? b : a));
}

/* O que É um "efeito de Entrada" para fins de cópia. Fora daqui ficam, por
   construção e não por lista: Contínuo (aura), Ao Morrer, e as cartas sem
   gatilho nenhum. E fica também o próprio Eco: dois Ka Errantes em campo se
   ecoariam em círculo, então o segundo encontra o primeiro e não copia nada. */
export const temEntradaCopiavel = (def) =>
  !!def && def.trigger === "entrar" && !def.praga && !def.ecoUltimo;

export const onEnterBlocked = (card, board) =>
  board.some((b) => b.revealed && !b.dying && byKey[b.key].block && b.lane === card.lane && b.owner !== card.owner);

export const validTargets = (card, needs, board) => {
  if (needs === "ally") return board.filter((c) => c.owner === card.owner && c.lane === card.lane && c.uid !== card.uid && emJogo(c));
  // Mira inimiga é escolha de alvo: passa pelo Gato Egípcio.
  if (needs === "enemy") return board.filter((c) => c.owner !== card.owner && c.lane === card.lane && emJogo(c) && podeSerAlvo(board, c, card));
  return [];
};

// --------------------------- ordem de revelação -----------------------------
// A fila de revelação obedece a duas regras, nesta ordem:
//   1. PRIORIDADE — o lado com prioridade revela TODAS as suas cartas antes de
//      o oponente começar. (`s.priority` = índice do lado que vai primeiro.)
//   2. ORDEM DE COLOCAÇÃO — dentro de cada lado, as cartas revelam na sequência
//      EXATA em que foram colocadas no tabuleiro, atravessando as vias. O board
//      já está em ordem de colocação (todo posicionamento faz push no fim, e
//      recolher+recolocar joga a carta para o fim da sequência), então basta
//      filtrar por dono preservando a ordem do array.
// NÃO há agrupamento por via: o entrelaçamento entre vias segue a sequência de
// jogo do jogador. Como a revelação também é a ordem de resolução dos efeitos,
// isso permite cadeias intencionais — p.ex. colocar um buff na Via 3 ANTES do
// Enxame na Via 1 para que o Enxame copie o Poder já buffado.
// TREVAS acrescentou uma TERCEIRA regra, ANTES das outras duas:
//   0. RODADA DE ENTRADA — cartas atrasadas por Trevas (de uma rodada anterior)
//      revelam em uma onda própria, inteira, antes das jogadas nesta rodada.
// Quando todas as pendentes são da mesma rodada — o caso normal — há uma única
// onda e o resultado é idêntico ao de antes.
export function buildRevealQueue(s) {
  const order = [s.priority, 1 - s.priority];
  const pendentes = s.board.filter((x) => !x.revealed);
  const ondas = [...new Set(pendentes.map((c) => c.enteredRound))].sort((a, b) => a - b);
  const queue = [];
  for (const rodada of ondas)
    for (const side of order)
      for (const c of pendentes.filter((x) => x.enteredRound === rodada && x.owner === side))
        queue.push(c.uid);
  return queue;
}

// --------------------- saída de campo SEM morte (Pragas) ---------------------
// Uma carta CONSUMIDA deixa o tabuleiro depois de fazer o que veio fazer — ela
// não foi destruída. Reusa a marca `dying`, que é a saída de campo que o resto
// do motor e a animação já entendem (filtros de via cheia, laneScore, alvos),
// mas NÃO passa por destroyList(). É isso que garante, POR CONSTRUÇÃO e não por
// varredura, que nada de morte dispare: deaths[], destroyedPower[] (Am-heh),
// Osíris, Múmia e Bennu ficam intocados. É assim que as Pragas saem do campo.
export function consumirCarta(s, card) {
  card.dying = s.effectSeq || 1;   // nunca 0: dying é lido como booleano nos filtros
  card.spent = true;
  return card;
}

// ------------------------------ destruição ----------------------------------
export function destroyList(s, victims) {
  const mumias = [];
  // Snapshot do Poder no momento da morte — ANTES de marcar 'dying', pois as
  // auras deixam de contar quem está morrendo. Alimenta o acumulador do Am-heh
  // (que absorve o Poder real de cada destruída, positivo ou negativo).
  const powerAtDeath = victims.map((v) => power(v, ctxOf(s)));
  victims.forEach((v, i) => {
    if (v.key === "mumia") mumias.push({ owner: v.owner, val: powerAtDeath[i] * 2, venenos: (v.venenos || []).slice() });
    if (v.key === "bennu") {
      s.pendingEnergy[v.owner] += 1;
      /* A ave leva TUDO o que estava escrito nela: a faixa acumulada, mais um, e
         os bênçãos/maldições permanentes gravados em `mods` — venham da Heka, da
         Hathor, da Armadura de Ptah ou de onde for. Morrer não limpa a carta;
         renascer não é voltar ao impresso. Cópia funda de propósito: a instância
         morta ainda vive no tabuleiro até a purga do fim da rodada, e as duas não
         podem compartilhar o mesmo array. */
      s.pendingReturn.push({
        owner: v.owner, lane: v.lane, printed: v.printed, baked: (v.baked || 0) + 1,
        mods: (v.mods || []).map((m) => ({ ...m })),
        venenos: (v.venenos || []).slice(),
      });
    }
  });
  if (!s.destroyedPower) s.destroyedPower = [0, 0];
  victims.forEach((v, i) => {
    v.dying = s.effectSeq;
    s.deaths[v.owner] += 1;
    s.destroyedPower[v.owner] += powerAtDeath[i];
  });
  /* Hiena: DEPOIS das marcas de morte, de propósito. Assim ela não entra no
     powerAtDeath das vítimas (o Am-heh absorveria o bônus dela) e, se a própria
     Hiena estiver na leva, já está `dying` e o filtro a exclui — que é a regra
     "destruída junto não ganha o bônus depois de sair". */
  alimentarHienas(s, victims);
  /* Mão cheia é absoluta: a Múmia dobrada não volta. Ela já foi contabilizada
     como destruída acima (deaths, destroyedPower, Am-heh, Osíris) — ficar na
     pilha de destruídas é literalmente não fazer nada além disso. Sai do array
     de retorno para o badge não anunciar uma carta que não chegou. */
  const voltaram = [];
  for (const r of mumias) {
    const mao = (s.hand[r.owner] ||= []);
    if (mao.length >= MAO_MAX) {
      pushLog(s, `✋ ${SIDE_NAME[r.owner]}: mão cheia (${MAO_MAX}) — a Múmia ficou na pilha de destruídas.`);
      continue;
    }
    /* `printed` sai da DEFINIÇÃO, não de um literal: a carta que volta é uma
       Múmia comum, e o excedente vira Faixa. Se o Poder impresso mudar de novo,
       nada aqui precisa ser tocado — antes havia um 2 fixo aqui que teria
       silenciosamente divergido da coleção. */
    const impresso = byKey["mumia"].poder;
    mao.push({ hid: nextUid(), key: "mumia", printed: impresso, baked: Math.max(0, r.val - impresso), venenos: r.venenos || [] });
    voltaram.push(r);
  }
  return voltaram;
}

// -------------------------- renascimento do Bennu ---------------------------
// Consome s.pendingReturn e recoloca cada Bennu AINDA NA MESMA RODADA, numa via
// sorteada entre as que tem espaco (pode calhar de ser a via de origem).
// rng injetavel para os testes.
export function resolveBennuRebirth(s, rng = Math.random) {
  if (!s.pendingReturn || s.pendingReturn.length === 0) return [];
  const nascidos = [];
  for (const r of s.pendingReturn) {
    const livres = viasComEspaco(s.board, r.owner);
    if (livres.length === 0) {
      pushLog(s, `\u27f3 Bennu nao renasceu \u2014 todas as vias do ${SIDE_NAME[r.owner]} estao cheias.`);
      continue;
    }
    const lane = livres[Math.floor(rng() * livres.length)];
    const card = {
      uid: nextUid(), key: "bennu", owner: r.owner, lane,
      printed: r.printed, baked: r.baked, mods: (r.mods || []).map((m) => ({ ...m })),
      venenos: (r.venenos || []).slice(),
      revealed: true, dying: false,
      entryPlays: s.plays[r.owner], enteredRound: s.round, moved: false,
    };
    s.board.push(card);
    nascidos.push(card);
    // Poder lido do tabuleiro depois de recolocada: inclui faixa, mods retidos e auras.
    pushLog(s, `\u27f3 Bennu renasceu na Via ${lane + 1} do ${SIDE_NAME[r.owner]} (Poder ${power(card, ctxOf(s))}).`);
  }
  s.pendingReturn = [];
  return nascidos;
}

// ------------------------------- bênçãos ------------------------------------
// Uma BENÇÃO é um bônus permanente e positivo vindo de OUTRA carta: fica gravado
// em `mods` e sobrevive à saída da fonte (Hathor, Heka, Armadura de Ptah).
// Efeitos "Contínuo:" (Amon, Montu, Osíris, Ammit, Maat) são recalculados a cada
// leitura de poder e somem com a fonte — não são bênçãos e não disparam nada.
// `inert` marca o bônus que a própria Renenutet espalha: ele nunca dispara
// gatilho, o que impede o laço entre duas cópias dela.

export function aplicarBencao(s, alvo, val, srcNome, { inert = false, rng = Math.random } = {}) {
  alvo.mods.push({ src: srcNome, val, inert });
  if (val <= 0 || inert) return [];
  return espalharSeAbencoada(s, alvo, rng);
}

// Sorteia `n` alvos distintos entre as cartas do dono, em jogo, exceto a fonte.
function sortearAlvos(s, fonte, n, rng) {
  const pool = s.board.filter(
    (c) => c.owner === fonte.owner && c.uid !== fonte.uid && c.revealed && !c.dying
  );
  const escolhidos = [];
  while (escolhidos.length < n && pool.length > 0) {
    escolhidos.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return escolhidos;
}

// Uma onda de distribuição. Devolve os alvos tocados.
export function espalharBencao(s, fonte, rng = Math.random, wave = 0) {
  const def = byKey[fonte.key];
  const alvos = sortearAlvos(s, fonte, def.spreadOnBlessing, rng);
  for (const a of alvos) aplicarBencao(s, a, 1, def.nome, { inert: true });
  // Registra a onda para a animação. A fonte tambem entra, para que o olho veja
  // de onde a bencao partiu antes de ver onde ela chegou.
  s.blessings = (s.blessings || []).concat(
    alvos.length ? [{ uid: fonte.uid, wave, seq: s.effectSeq, role: "fonte" }] : [],
    alvos.map((a) => ({ uid: a.uid, wave, seq: s.effectSeq, role: "alvo" })),
  );
  if (alvos.length === 0) pushLog(s, `${def.nome}: nenhuma outra carta sua em jogo para abençoar.`);
  else pushLog(s, `${def.nome} abençoou ${alvos.map((a) => byKey[a.key].nome).join(" e ")} (+1).`);
  return alvos;
}

function espalharSeAbencoada(s, alvo, rng) {
  if (!byKey[alvo.key].spreadOnBlessing) return [];
  if (!alvo.revealed || alvo.dying) return [];
  return espalharBencao(s, alvo, rng);
}

// Descarrega os gatilhos acumulados fora de jogo: uma onda independente por
// gatilho, cada uma com sorteio próprio. Registra as ondas para a animação.
export function descarregarPendentes(s, card, rng = Math.random) {
  const n = card.pendentes || 0;
  card.pendentes = 0;
  let tocadas = 0;
  for (let i = 0; i < n; i++) tocadas += espalharBencao(s, card, rng, i).length;
  return { ondas: n, tocadas };
}

// --------------------------- Moisés e os Sinais ------------------------------
// Moisés registra cada Praga DIFERENTE que resolver enquanto ele estiver
// efetivamente em campo (revelado e não morrendo). A primeira dá +1; cada
// diferente seguinte DOBRA o Poder atual.
//
// Dobrar aqui é gravar uma parcela igual ao total atual. Assim a duplicação sai
// de graça do modelo aditivo e power() continua sendo exatamente a soma de
// decomporPartes() — a invariante que impede o número exibido de divergir da
// explicação. O preço aceito: auras (Amon, Montu) entram CONGELADAS na parcela;
// se a fonte morrer depois, a aura viva some mas a metade congelada fica. É o
// mesmo que o Enxame e o Apófis já fazem, e é fiel ao texto: a praga dobrou o
// Poder daquele instante.
//
// O registro vive no objeto da carta (`pragasVistas`), então qualquer
// ressurreição futura preserva Poder e Sinais sem precisar de um cemitério.
//
// Dobrar um Poder NEGATIVO piora a carta — é fiel a "dobra o Poder atual", e faz
// de debuffar Moisés uma resposta legítima ao arquétipo.
export function registrarPraga(s, pragaKey) {
  const nome = byKey[pragaKey].nome;
  const sinais = [];
  for (const m of s.board.filter((c) => c.key === "moises" && c.revealed && !c.dying)) {
    m.pragasVistas = m.pragasVistas || [];
    if (m.pragasVistas.includes(pragaKey)) {
      pushLog(s, `Moisés já presenciou ${nome} — o efeito resolve, mas não há novo Sinal.`);
      continue;
    }
    m.pragasVistas.push(pragaKey);
    const antes = power(m, ctxOf(s));
    const ganho = m.pragasVistas.length === 1 ? 1 : antes;   // 1º Sinal: +1. Depois: dobra.
    if (ganho !== 0) aplicarBencao(s, m, ganho, `Sinal: ${nome}`);
    const depois = power(m, ctxOf(s));
    pushLog(s, `\u2727 Moisés presenciou ${nome} (${m.pragasVistas.length}\u00ba Sinal): Poder ${antes} \u2192 ${depois}.`);
    sinais.push({ uid: m.uid, antes, depois });
  }
  return sinais;
}

/* ==========================================================================
   EFEITOS DAS PRAGAS

   Um mapa key → resolvedor. match.js chama resolvePraga() e não precisa saber
   de nada: a ordem do documento de design (efeito → consumo → Sinal do Moisés)
   fica lá; o QUE cada Praga faz fica aqui.

   Alcance: as Pragas obedecem à REGRA DA REVELAÇÃO como todo Ao Entrar — só
   atingem o que já revelou (`emJogo`). Quem tem prioridade dispara contra o
   tabuleiro da rodada anterior; as cartas que o oponente acabou de posicionar
   estão fora de alcance.
   ========================================================================== */

const sorteioUm = (arr, rng) => (arr.length ? arr[Math.floor(rng() * arr.length)] : null);

// Cartas do lado oposto ainda no tabuleiro, opcionalmente de uma via só.
// Toda Praga que ESCOLHE uma vítima (sorteada ou pelo maior custo) passa por
// aqui, então é aqui que a proteção do Gato Egípcio entra para todas de uma vez.
// A Peste nos Animais NÃO passa por aqui: ela varre a via inteira sem escolher,
// e continua sendo a resposta ao arquétipo Animal.
const inimigasNoCampo = (s, praga, lane = null) =>
  s.board.filter((c) => c.owner !== praga.owner && emJogo(c) && (lane === null || c.lane === lane)
    && podeSerAlvo(s.board, c, praga));

const semAlvo = (s, praga, motivo) => {
  pushLog(s, `${byKey[praga.key].nome}: ${motivo}`);
  return { uid: praga.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
};

// Águas em Sangue (-1) e Nuvem de Gafanhotos (-2): uma vítima sorteada POR VIA.
// Vias sem carta inimiga simplesmente não têm alvo — não desperdiçam o efeito
// das outras. Valor negativo não dispara gatilho de bênção.
function debuffPorVia(s, praga, val, rng) {
  const def = byKey[praga.key];
  const tocadas = [];
  for (let lane = 0; lane < 3; lane++) {
    const alvo = sorteioUm(inimigasNoCampo(s, praga, lane), rng);
    if (!alvo) continue;
    aplicarBencao(s, alvo, val, def.nome);
    tocadas.push(alvo);
  }
  if (tocadas.length === 0) return semAlvo(s, praga, "nenhuma carta inimiga em campo.");
  pushLog(s, `${def.nome}: ${val} em ${tocadas.map((c) => `${byKey[c.key].nome} (Via ${c.lane + 1})`).join(", ")}.`);
  return { uid: praga.uid, text: `☾ ${val}×${tocadas.length}`, kind: "debuff", seq: s.effectSeq };
}

// Agrava em 1 o custo de uma carta sorteada na mão do adversário. O agravo mora
// na INSTÂNCIA (custoMod) e viaja com ela para o tabuleiro, então também muda o
// que a Sekhmet e a Morte dos Primogênitos alcançam.
function agravarCartaNaMao(s, praga, rng) {
  const oponente = 1 - praga.owner;
  const alvo = sorteioUm(s.hand[oponente] || [], rng);
  if (!alvo) return null;
  alvo.custoMod = (alvo.custoMod || 0) + 1;
  pushLog(s, `${byKey[praga.key].nome}: ${byKey[alvo.key].nome} na mão do ${SIDE_NAME[oponente]} passa a custar ${custoDe(alvo)}.`);
  return alvo;
}

const PRAGA_EFEITOS = {
  sangue: (s, praga, rng) => debuffPorVia(s, praga, -1, rng),

  gafanhotos: (s, praga, rng) => debuffPorVia(s, praga, -2, rng),

  piolhos: (s, praga, rng) => {
    const alvo = agravarCartaNaMao(s, praga, rng);
    if (!alvo) return semAlvo(s, praga, "a mão do adversário está vazia.");
    return { uid: praga.uid, text: "☾ +1⚡", kind: "debuff", seq: s.effectSeq };
  },

  // Duas Moscas 1/0 embaralhadas no deck inimigo: cada compra dele passa a ter
  // chance de vir morta. Posição sorteada de forma independente.
  moscas: (s, praga, rng) => {
    const oponente = 1 - praga.owner;
    const deck = s.deck[oponente] || (s.deck[oponente] = []);
    for (let i = 0; i < 2; i++) deck.splice(Math.floor(rng() * (deck.length + 1)), 0, "token-mosca");
    pushLog(s, `${byKey[praga.key].nome}: 2 Moscas embaralhadas no deck do ${SIDE_NAME[oponente]} (${deck.length} cartas).`);
    return { uid: praga.uid, text: "☾ 2 moscas", kind: "debuff", seq: s.effectSeq };
  },

  peste: (s, praga) => resolveDestroyAllOfTypeInLane(s, praga, "Animal", { escopo: "inimigos" }),

  // Destrói uma inimiga de custo EFETIVO 1 e depois agrava a mão. Alcança o
  // Moisés adversário, que é custo 1.
  granizo: (s, praga, rng) => {
    const alvo = sorteioUm(inimigasNoCampo(s, praga).filter((c) => custoDe(c) === 1), rng);
    if (alvo) {
      const retornos = destroyList(s, [alvo]);
      pushLog(s, `${byKey[praga.key].nome} destruiu ${byKey[alvo.key].nome} (custo 1) na Via ${alvo.lane + 1}.`
        + (retornos.length ? ` Múmia(s): ${retornos.map((r) => r.val).join(", ")}.` : ""));
    } else {
      pushLog(s, `${byKey[praga.key].nome}: nenhuma carta inimiga de custo 1 em jogo.`);
    }
    const agravada = agravarCartaNaMao(s, praga, rng);
    if (!alvo && !agravada) return semAlvo(s, praga, "sem alvo em jogo e sem cartas na mão do adversário.");
    return { uid: praga.uid, text: alvo ? "☥ 1✕ +1⚡" : "☾ +1⚡", kind: alvo ? "sac" : "debuff", seq: s.effectSeq };
  },

  // Cria uma Rã 1/1 num slot vazio de uma via inimiga sorteada. A Rã é DO
  // OPONENTE: Poder 1 irrisório em troca de entupir um dos quatro espaços dele.
  // Ela incrementa `plays` do oponente e portanto alimenta a Ammit dele — é
  // consequência da decisão de quem lançou a Praga, e faz parte do preço.
  ras: (s, praga, rng) => {
    const oponente = 1 - praga.owner;
    const livres = viasComEspaco(s.board, oponente);
    if (livres.length === 0) return semAlvo(s, praga, `todas as vias do ${SIDE_NAME[oponente]} estão cheias.`);
    const lane = livres[Math.floor(rng() * livres.length)];
    s.plays[oponente] += 1;
    const ra = {
      uid: nextUid(), key: "token-ra", owner: oponente, lane,
      printed: byKey["token-ra"].poder, baked: 0, mods: [], revealed: true, dying: false,
      entryPlays: s.plays[oponente], enteredRound: s.round, moved: false, token: true,
    };
    s.board.push(ra);
    pushLog(s, `${byKey[praga.key].nome}: uma Rã brotou na Via ${lane + 1} do ${SIDE_NAME[oponente]}.`);
    return { uid: ra.uid, text: "＋Rã", kind: "debuff", seq: s.effectSeq };
  },

  // Marca uma inimiga da via ONDE A PRAGA FOI JOGADA. A colocação da carta é a
  // escolha da via — não precisa de uma pausa de mira nova para isso.
  // O primeiro tique é IMEDIATO, no próprio reveal, e os seguintes vêm de
  // aplicarUlceras() no nextRound. Sem o tique imediato a Praga não fazia nada
  // visível na rodada em que era jogada (lê como bug) e era lixo puro na
  // rodada 6, onde não existe rodada seguinte para cobrar.
  ulceras: (s, praga, rng) => {
    const alvo = sorteioUm(inimigasNoCampo(s, praga, praga.lane), rng);
    if (!alvo) return semAlvo(s, praga, `nenhuma carta inimiga na Via ${praga.lane + 1}.`);
    if (alvo.ulceras) {
      pushLog(s, `${byKey[praga.key].nome}: ${byKey[alvo.key].nome} já está ulcerada.`);
      return { uid: alvo.uid, text: "já ulcerada", kind: "block", seq: s.effectSeq };
    }
    alvo.ulceras = true;
    aplicarBencao(s, alvo, -1, "Úlceras");
    pushLog(s, `${byKey[praga.key].nome}: ${byKey[alvo.key].nome} (Via ${alvo.lane + 1}) recebeu Úlceras — -1 agora e -1 no início de cada rodada.`);
    return { uid: alvo.uid, text: "\u2620 -1 úlceras", kind: "debuff", seq: s.effectSeq };
  },

  // Agenda o atraso da PRÓXIMA rodada, para os dois lados. Quem consome
  // `s.trevas` é o startReveal do match.js — a Praga só marca a data.
  trevas: (s, praga) => {
    s.trevas = s.round + 1;
    pushLog(s, `${byKey[praga.key].nome}: na rodada ${s.trevas} as cartas dos dois lados permanecem ocultas.`);
    return { uid: praga.uid, text: `\u2298 R${s.trevas}`, kind: "debuff", seq: s.effectSeq };
  },

  // Destrói a inimiga de maior custo efetivo. Empate resolve por sorteio.
  primogenitos: (s, praga, rng) => {
    const pool = inimigasNoCampo(s, praga);
    if (pool.length === 0) return semAlvo(s, praga, "nenhuma carta inimiga em campo.");
    const teto = Math.max(...pool.map(custoDe));
    const empatadas = pool.filter((c) => custoDe(c) === teto);
    const alvo = sorteioUm(empatadas, rng);
    const retornos = destroyList(s, [alvo]);
    pushLog(s, `${byKey[praga.key].nome} destruiu ${byKey[alvo.key].nome} (custo ${teto}) na Via ${alvo.lane + 1}`
      + (empatadas.length > 1 ? ` — sorteada entre ${empatadas.length} empatadas.` : ".")
      + (retornos.length ? ` Múmia(s): ${retornos.map((r) => r.val).join(", ")}.` : ""));
    return { uid: praga.uid, text: `☥ custo ${teto}`, kind: "sac", seq: s.effectSeq };
  },
};

// Resolve o efeito de uma Praga. Devolve o badge da animação, ou null quando a
// Praga ainda não tem efeito implementado (Rãs, Úlceras e Trevas — Fase 4).
export function resolvePraga(s, praga, rng = Math.random) {
  const fn = PRAGA_EFEITOS[praga.key];
  return fn ? fn(s, praga, rng) : null;
}

// --------------------------- Úlceras: início de rodada -----------------------
// A marca `ulceras` vive no objeto da carta, então acompanha mudanças de via e
// desaparece com a carta — exatamente o que o documento pede. O desconto é um
// mod negativo por rodada, o que deixa cada tique visível na decomposição do
// Poder em vez de escondido num acumulador.
// Nota: Anúbis limpa `mods` e portanto cura o dano já acumulado, mas NÃO remove a
// marca — a carta volta a apodrecer na rodada seguinte.
export function aplicarUlceras(s) {
  const afetadas = s.board.filter((c) => c.ulceras && !c.dying);
  for (const c of afetadas) aplicarBencao(s, c, -1, "Úlceras");
  if (afetadas.length)
    pushLog(s, `\u2620 Úlceras: -1 em ${afetadas.map((c) => `${byKey[c.key].nome} (Via ${c.lane + 1}, ${SIDE_NAME[c.owner]})`).join(", ")}.`);
  return afetadas;
}

// --------------------- Veneno: marcação e dano por rodada ----------------------
// Veneno tem 3 níveis (1, 2, 3). Cada marca é INDEPENDENTE e se acumula: uma carta
// pode ter [1, 1, 2] (duas marcas de Veneno I + uma de Veneno II = -4 por rodada).
// A lista `venenos` vive no objeto da carta e acompanha mudanças de via; some com a morte.
// Ao marcar: apenas registra a marca. A cada rodada: soma todas as marcas e desconta.
export function marcarVeneno(s, alvo, nivel, assassinoNome) {
  if (!alvo || alvo.dying) return;
  if (!alvo.venenos) alvo.venenos = [];
  alvo.venenos.push(nivel);
  pushLog(s, `${assassinoNome} marcou ${byKey[alvo.key].nome} (Via ${alvo.lane + 1}) com Veneno ${nivel}.`);
}

// Soma total das marcas de veneno de uma carta.
export function totalVeneno(c) {
  return (c.venenos || []).reduce((a, b) => a + b, 0);
}

export function aplicarVeneno(s) {
  const afetadas = s.board.filter((c) => c.venenos && c.venenos.length > 0 && !c.dying);
  for (const c of afetadas) {
    aplicarBencao(s, c, -totalVeneno(c), `Veneno`);
  }
  if (afetadas.length)
    pushLog(s, `☠ Veneno: ${afetadas.map((c) => `${byKey[c.key].nome} (-${totalVeneno(c)})`).join(", ")}.`);
  // Cartas envenenadas na MÃO (Múmia que voltou carregando marcas) também sofrem
  // o dano por rodada — mas na mão não há `mods`, então o desconto vai para a
  // Faixa (`baked`), que pode ficar negativa. As marcas permanecem: o veneno
  // continua corroendo enquanto a carta esperar para ser rejogada.
  const naMao = [];
  for (const lado of [0, 1]) {
    for (const h of (s.hand[lado] || [])) {
      if (h.venenos && h.venenos.length > 0) {
        h.baked = (h.baked || 0) - totalVeneno(h);
        naMao.push(h);
      }
    }
  }
  if (naMao.length)
    pushLog(s, `☠ Veneno (mão): ${naMao.map((h) => `${byKey[h.key].nome} (-${totalVeneno(h)})`).join(", ")}.`);
  return afetadas;
}

// ------------------------ diagnostico / log de partida -----------------------
// Decompoe o poder de uma carta. E o que torna um bug visivel: mostra a origem
// de cada parcela em vez de so o total. Bonus marcados com * sao inertes.
export function decompor(c, ctx) {
  const partes = decomporPartes(c, ctx);
  const total = partes.reduce((t, p) => t + p.val, 0);
  const txt = partes.map((p) =>
    p.tipo === "base" ? `${p.val} impresso`
    : p.tipo === "maat" ? "Maat: reduzido ao impresso"
    : `${p.val > 0 ? "+" : ""}${p.val} ${p.label}${p.tipo === "inerte" ? "*" : p.tipo === "continuo" ? " (contínuo)" : ""}`
  );
  return `${total} = ${txt.join(" ")}`;
}

export function snapshotTabuleiro(s, titulo) {
  const ctx = ctxOf(s);
  const linhas = [titulo];
  for (let side = 0; side < 2; side++) {
    linhas.push(`  ${SIDE_NAME[side]} — energia ${s.energy[side]} | mão: ${s.hand[side].map((h) => byKey[h.key].nome).join(", ") || "vazia"}`);
    for (let lane = 0; lane < 3; lane++) {
      const cs = s.board.filter((c) => c.owner === side && c.lane === lane);
      const desc = cs.length
        ? cs.map((c) => `${byKey[c.key].nome}${c.revealed ? "" : " (oculta)"}${c.spent ? " (consumida)" : c.dying ? " (morrendo)" : ""} ${decompor(c, ctx)}`).join(" | ")
        : "—";
      linhas.push(`    Via ${lane + 1} [${laneScore(ctx, lane, side)}]: ${desc}`);
    }
  }
  return linhas.join("\n");
}

export function montarLogPartida(s) {
  const cab = [
    "===== Guerras Egípcias — log de partida =====",
    `gerado: ${new Date().toISOString()}`,
    `rodada ${s.round}/6 | fase ${s.phase}${s.finished ? " | ENCERRADA" : ""}`,
    `prioridade: ${SIDE_NAME[s.priority]} (${s.priorityReason})`,
    "* = bônus inerte (não dispara gatilhos)",
    "",
  ];
  return [
    ...cab,
    snapshotTabuleiro(s, "--- estado atual ---"),
    "",
    "--- trilha completa (ordem cronológica) ---",
    ...(s.trace || []),
    "",
  ].join("\n");
}

// ------------------------------ Set: dispersao ------------------------------
// Empurra ate N cartas inimigas da via do Set para outra via sorteada. Cada
// carta rola de forma independente, e falha sozinha se nao houver espaco.
// Nao consome o movimento proprio da carta: a vitima nao escolheu sair.
export function resolveSet(s, set, rng = Math.random, def = byKey[set.key]) {
  // Dispersar é escolher quem sai do lugar: o Gato Egípcio bloqueia.
  const pool = s.board.filter(
    (c) => c.owner !== set.owner && c.lane === set.lane && c.revealed && !c.dying
      && podeSerAlvo(s.board, c, set)
  );
  const vitimas = [];
  while (vitimas.length < def.scatterEnemies && pool.length > 0) {
    vitimas.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  if (vitimas.length === 0) {
    pushLog(s, `${def.nome}: nenhuma carta inimiga nesta via para dispersar.`);
    return { movidas: [], presas: [] };
  }
  const movidas = [], presas = [];
  for (const v of vitimas) {
    const destinos = viasComEspaco(s.board, v.owner, v.lane);
    if (destinos.length === 0) {
      presas.push(v);
      pushLog(s, `⇄ ${byKey[v.key].nome} resistiu — as outras vias do ${SIDE_NAME[v.owner]} estão cheias.`);
      continue;
    }
    const origem = v.lane;
    v.lane = destinos[Math.floor(rng() * destinos.length)];
    movidas.push({ uid: v.uid, de: origem, para: v.lane });
    pushLog(s, `⇄ ${def.nome} lançou ${byKey[v.key].nome} da Via ${origem + 1} para a Via ${v.lane + 1}.`);
  }
  return { movidas, presas };
}

// ------------------------------- Anúbis: julgamento -------------------------
// Nivela o Poder BASE de todas as outras cartas reveladas da via ao menor base
// entre elas, congelando o valor em card.judged e apagando os buffs permanentes
// (mods). Auras nao sao tocadas: recalculam por cima do novo base. O efeito e
// gravado, nao continuo — persiste se Anúbis morrer, e nao alcanca quem entrar
// depois. Anúbis nao se pesa: fica fora da medicao e do efeito.
export function resolveAnubis(s, anubis) {
  const via = s.board.filter(
    (c) => c.lane === anubis.lane && c.uid !== anubis.uid && c.revealed && !c.dying
  );
  if (via.length === 0) {
    pushLog(s, `⚖ Anúbis não encontrou corações para pesar nesta via.`);
    return { nivel: null, julgadas: [] };
  }
  const baseAtual = (c) => (typeof c.judged === "number" ? c.judged : c.printed);
  const nivel = Math.min(...via.map(baseAtual));
  const julgadas = [];
  for (const c of via) {
    c.judged = nivel;      // congela o base
    c.mods = [];           // buffs permanentes caem; auras nao vivem aqui
    julgadas.push(c.uid);
  }
  pushLog(s, `⚖ Anúbis pesou ${via.length} carta(s): Poder base nivelado a ${nivel}.`);
  return { nivel, julgadas };
}

function copyVisibleAuraBonus(s, card) {
  if (laneHasMaat(s.board, card.lane)) return 0;
  const amon = s.board.filter((c) => c.owner === card.owner && c.key === "amon" && c.revealed && !c.dying && c.uid !== card.uid).length;
  const hinos = hinosPara(s.board, card).reduce((t, h) => t + h.val, 0);
  return amon + hinos;
}

export function resolveEnxame(s, card, def = byKey[card.key]) {
  const occupied = ocupacaoDaVia(s.board, card.owner, card.lane);
  const copiesToCreate = Math.min(2, Math.max(0, LANE_CAP - occupied));
  if (copiesToCreate === 0) {
    pushLog(s, `${def.nome}: sem espaço na via para criar cópias.`);
    return { uid: card.uid, text: "sem espaço", kind: "block", seq: s.effectSeq };
  }

  /* As fichas nascem com o Poder VISÍVEL da mãe menos as auras que elas próprias
     já vão receber sozinhas — senão Montu e Domador entrariam duas vezes. Como a
     ficha tem o mesmo tipo duplo da mãe, ela recebe exatamente as mesmas auras,
     e a subtração continua exata. */
  const visiblePower = power(card, ctxOf(s));
  const printedForCopies = visiblePower - copyVisibleAuraBonus(s, card);
  let criadas = 0;
  for (let i = 0; i < copiesToCreate; i++) {
    const ficha = invocarFicha(s, { key: "token-gafanhoto", owner: card.owner, lane: card.lane });
    if (!ficha) break;                       // não deve acontecer: o espaço já foi conferido
    ficha.printed = printedForCopies;        // a ficha herda o Poder, não o impresso do molde
    ficha.baseCopy = true;
    criadas += 1;
  }
  pushLog(s, `${def.nome} invocou ${criadas} Gafanhoto(s) com Poder ${visiblePower}.`);
  return { uid: card.uid, text: `+${criadas} Gafanhotos`, kind: "buff", seq: s.effectSeq };
}

// Destrói as OUTRAS cartas do próprio dono na via (Apófis absorve; Dilúvio só destrói).
/* DILÚVIO DE HÁPI — afoga a via por FAIXA DE CUSTO, não por dono.
   A cheia não distinguia amigo de plantação: pega os dois lados, e pega as
   cartas baratas do próprio jogador junto. É o preço de jogá-la num tabuleiro
   de ocupação.

   Duas decisões que valem a leitura:

   1. O GATO EGÍPCIO PROTEGE, DOS DOIS LADOS. O Dilúvio lê o custo de cada carta
      e decide uma a uma — isso é escolher alvo, mesmo sem interface de mira.
      Por isso passa por `podeSerAlvo`, ao contrário da Sekhmet (varre um custo
      no tabuleiro inteiro) e da Peste (varre uma via inteira sem olhar carta).
      Quem aponta, é bloqueado.
      Aqui o Gato vale mesmo contra o Dilúvio do PRÓPRIO dono (`ignoraDono`):
      a cheia é indiscriminada, e o gato é abrigo contra a água, não contra o
      adversário. Cada lado é abrigado pelo Gato do seu lado.

   2. AFUNDA A SI MESMO se o custo entrar na faixa. Custo 5 impresso, mas
      Praga dos Piolhos e afins mexem em `custoDe`. Se o Dilúvio virar custo 2,
      ele é uma carta de custo 2 na via como qualquer outra — a água não sabe
      quem a invocou. */
export function resolveAfogamento(s, card, def = byKey[card.key]) {
  const [min, max] = def.afogaCusto;
  const victims = s.board.filter((c) => {
    if (c.lane !== card.lane || !emJogo(c)) return false;
    const cst = custoDe(c);
    if (cst < min || cst > max) return false;
    return podeSerAlvo(s.board, c, card, { ignoraDono: true });
  });
  if (victims.length === 0) {
    pushLog(s, `${def.nome}: nenhuma carta de custo ${min} a ${max} nesta via.`);
    return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }
  const proprias = victims.filter((c) => c.owner === card.owner).length;
  const returns = destroyList(s, victims);
  pushLog(s, `${def.nome} afogou ${victims.length} carta(s) de custo ${min}–${max} na Via ${card.lane + 1}`
    + (proprias ? ` (${proprias} sua(s))` : "") + "."
    + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
  return { uid: card.uid, text: `☥ ${victims.length}✕`, kind: "sac", seq: s.effectSeq };
}

export function resolveDestroyOwnLane(s, card, absorb, def = byKey[card.key]) {
  if (def.key === "enxame") return resolveEnxame(s, card, def);
  const victims = s.board.filter((c) => c.owner === card.owner && c.lane === card.lane && c.uid !== card.uid && emJogo(c));
  if (victims.length === 0) { pushLog(s, `${def.nome}: nada para destruir na via.`); return { uid: card.uid, text: "sozinho", kind: "block", seq: s.effectSeq }; }
  let absorbed = 0;
  if (absorb) for (const v of victims) absorbed += power(v, ctxOf(s));
  const returns = destroyList(s, victims);
  if (absorb && absorbed > 0) { const self = s.board.find((c) => c.uid === card.uid); if (self) self.mods.push({ src: "Absorção", val: absorbed }); }
  pushLog(s, `${def.nome} destruiu ${victims.length} carta(s)` + (absorb ? ` e absorveu ${absorbed} de Poder.` : ".") + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
  return { uid: card.uid, text: absorb ? `＋${absorbed}` : `☥ ${victims.length}✕`, kind: "sac", seq: s.effectSeq };
}

export function resolveSobek(s, sobek) {
  const victims = s.board.filter((c) => c.owner === sobek.owner && c.lane === sobek.lane && c.uid !== sobek.uid && emJogo(c));
  if (victims.length === 0) { pushLog(s, `Sobek entrou sozinho — nada a destruir.`); return { uid: sobek.uid, text: "sozinho", kind: "block", seq: s.effectSeq }; }
  const returns = destroyList(s, victims);
  const sk = s.board.find((c) => c.uid === sobek.uid);
  if (sk) sk.mods.push({ src: "Sobek", val: victims.length });
  pushLog(s, `Sobek destruiu ${victims.length} sua(s) → +${victims.length}.` + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
  return { uid: sobek.uid, text: `☥ +${victims.length}`, kind: "sac", seq: s.effectSeq };
}

export function resolveArmadura(s, arm) {
  const allies = s.board.filter((c) => c.owner === arm.owner && c.lane === arm.lane && c.uid !== arm.uid && emJogo(c));
  if (allies.length === 0) { pushLog(s, `Armadura de Ptah: sem aliado na via — permanece em campo (3).`); return { uid: arm.uid, text: "sem fusão", kind: "block", seq: s.effectSeq }; }
  const target = allies[Math.floor(Math.random() * allies.length)];
  const val = power(arm, ctxOf(s));
  // A Armadura e consumida pela fusao: precisa morrer ANTES de qualquer efeito
  // disparado pela bencao, senao ela entra no sorteio de alvos da Renenutet e
  // leva um +1 para o tumulo.
  arm.dying = s.effectSeq;
  aplicarBencao(s, target, val, "Armadura de Ptah");
  pushLog(s, `Armadura de Ptah fundiu-se com ${byKey[target.key].nome} (+${val}).`);
  return { uid: target.uid, text: `⛨ +${val}`, kind: "fuse", seq: s.effectSeq };
}

// `escopo` decide de quem são as vítimas: "todos" (padrão — é o Assassino Medjay,
// que limpa a via inteira, inclusive as suas) ou "inimigos" (a Peste nos Animais).
export function resolveDestroyAllOfTypeInLane(s, card, tipo, { escopo = "todos" } = {}) {
  const victims = s.board.filter((c) => {
    if (!emJogo(c)) return false;
    if (c.lane !== card.lane) return false;
    if (c.uid === card.uid) return false;
    if (escopo === "inimigos" && c.owner === card.owner) return false;

    const def = byKey[c.key];
    return temTipo(c, tipo);
  });

  if (victims.length === 0) {
    const alcance = escopo === "inimigos" ? `${tipo} inimiga` : tipo;
    pushLog(s, `${byKey[card.key].nome}: nenhuma ${alcance} encontrada na Via ${card.lane + 1}.`);
    return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }

  destroyList(s, victims);

  const names = victims.map((v) => byKey[v.key].nome).join(", ");
  pushLog(s, `${byKey[card.key].nome} destruiu ${tipo}(s) na Via ${card.lane + 1}: ${names}.`);

  return { uid: card.uid, text: `destruiu ${victims.length}`, kind: "debuff", seq: s.effectSeq };
}

export function resolveSekhmet(s, card, cost) {
  const victims = s.board.filter((c) => custoDe(c) === cost && c.uid !== card.uid && emJogo(c));
  if (victims.length === 0) { pushLog(s, `Sekhmet: nenhuma carta de custo ${cost} em jogo.`); return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq }; }
  const returns = destroyList(s, victims);
  pushLog(s, `Sekhmet destruiu ${victims.length} carta(s) de custo ${cost}.` + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
  return { uid: card.uid, text: `☾ ${victims.length}✕`, kind: "debuff", seq: s.effectSeq };
}

// ----------------------- Khnum: buff por cartas abençoadas ----------------------
// Ao entrar, Khnum ganha +1 de Poder para cada carta aliada que esteja:
// 1. Revelada (emJogo())
// 2. Com bênção de qualquer tipo: permanente (mods) ou aura (recalculada)
// A forma de detectar: power(card) > poder impresso
export function resolveKhnum(s, card, def = byKey[card.key]) {
  const ctx = ctxOf(s);
  const blessed = s.board.filter((c) => 
    c.owner === card.owner && 
    c.uid !== card.uid && 
    emJogo(c) && 
    power(c, ctx) > byKey[c.key].poder
  ).length;
  
  if (blessed === 0) {
    pushLog(s, `${def.nome}: nenhuma carta aliada abençoada em jogo.`);
    return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }
  aplicarBencao(s, card, blessed, def.nome);
  pushLog(s, `${def.nome} ganhou +${blessed} de Poder (${blessed} carta(s) abençoada(s)).`);
  return { uid: card.uid, text: `☀ +${blessed}`, kind: "buff", seq: s.effectSeq };
}

// -------------------------- Heka: buff do próximo ----------------------------
// A Heka não age no alvo na hora: ela RESERVA um buff (+buffNext) para a PRÓXIMA
// carta do próprio dono que revelar — e essa reserva PERSISTE ENTRE RODADAS. Se a
// Heka for jogada na rodada 2 e nenhuma carta sua revelar depois nesta rodada, o
// +3 fica guardado e é aplicado à sua próxima carta revelada na rodada 3, 4, etc.
// Só se perde se a partida acabar sem nenhuma carta sua revelar depois dela.
// Como a revelação segue a ordem de colocação atravessando as vias, isso permite
// "Heka na Via 3 antes do Enxame na Via 1" e propaga o bônus entre vias — inclusive
// às cópias do Enxame, pois o +3 é um marcador (mod) que resolveEnxame NÃO subtrai
// (só Amon/Montu são).

// Consome um buff pendente para a carta que acabou de revelar (se houver).
// Grava como mod permanente e devolve o valor aplicado (0 se nada).
export function applyPendingBuff(s, card) {
  const val = s.pendingBuff?.[card.owner];
  if (!val) return 0;
  aplicarBencao(s, card, val, "Heka");
  s.pendingBuff[card.owner] = null;
  return val;
}

// Ao revelar a Heka: reserva o buff para sua próxima carta revelada (agora ou em
// rodadas futuras). Sempre reserva — quem consome é applyPendingBuff, quando a
// próxima carta sua revelar.
export function resolveHeka(s, heka, def = byKey[heka.key]) {
  const val = def.buffNext;
  if (!s.pendingBuff) s.pendingBuff = [null, null];
  s.pendingBuff[heka.owner] = val;
  pushLog(s, `${def.nome}: +${val} reservado para sua próxima carta revelada (vale entre rodadas).`);
  return { uid: heka.uid, text: `☀ +${val}→`, kind: "buff", seq: s.effectSeq };
}

// ----------------------- Assassinos: marcar veneno ----------------------
// Marca `def.venenoAlvos` (padrão 1) cartas inimigas DISTINTAS aleatórias na via,
// cada uma com uma marca de nível `def.veneno`.
export function resolveAssassino(s, card, def = byKey[card.key]) {
  const pool = s.board.filter((c) => c.owner !== card.owner && c.lane === card.lane && emJogo(c));

  if (pool.length === 0) {
    pushLog(s, `${def.nome}: nenhuma carta inimiga nesta via.`);
    return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }

  const qtd = def.venenoAlvos || 1;
  const alvos = [...pool].sort(() => Math.random() - 0.5).slice(0, qtd);
  for (const alvo of alvos) marcarVeneno(s, alvo, def.veneno, def.nome);

  const suf = alvos.length > 1 ? `×${alvos.length}` : "";
  return { uid: card.uid, text: `☠ V${def.veneno}${suf}`, kind: "debuff", seq: s.effectSeq };
}

// ----------------------- Semerj: replicar venenos da via -----------------------
// Coleta TODAS as marcas de veneno das cartas inimigas na via em que foi jogado
// (na ordem em que aparecem) e as distribui para cartas inimigas de OUTRAS vias,
// 1 marca por carta, copiando o nível exato. Se não houver marcas na via de origem
// OU não houver cartas em outras vias, o efeito é nulo.
export function resolveSemerj(s, card, def = byKey[card.key]) {
  // 1. Coleta as marcas da via de origem (cartas inimigas), preservando ordem.
  const origem = s.board.filter((c) => c.lane === card.lane && c.owner !== card.owner && emJogo(c) && c.venenos && c.venenos.length > 0);
  const marcas = [];
  for (const c of origem) for (const n of c.venenos) marcas.push(n);

  if (marcas.length === 0) {
    pushLog(s, `${def.nome}: nenhuma carta envenenada nesta via — efeito nulo.`);
    return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }

  // 2. Alvos: cartas inimigas em OUTRAS vias (diferentes da origem), ordem por via.
  const alvos = s.board
    .filter((c) => c.lane !== card.lane && c.owner !== card.owner && emJogo(c))
    .sort((a, b) => a.lane - b.lane);

  if (alvos.length === 0) {
    pushLog(s, `${def.nome}: nenhuma carta inimiga em outras vias — efeito nulo.`);
    return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }

  // 3. Distribui 1 marca por carta, na ordem das marcas encontradas.
  const n = Math.min(marcas.length, alvos.length);
  for (let i = 0; i < n; i++) marcarVeneno(s, alvos[i], marcas[i], def.nome);

  pushLog(s, `${def.nome} replicou ${n} veneno(s) para outras vias.`);
  return { uid: card.uid, text: `☠ ${n}→`, kind: "debuff", seq: s.effectSeq };
}

// ----------------------- Seqer-Mau: repetir dano de veneno -----------------------
// Finisher do arquétipo: para cada carta inimiga envenenada do CAMPO INTEIRO,
// aplica IMEDIATAMENTE o dano total das suas marcas de veneno (um "tique" extra).
// As marcas permanecem, então continuam a apodrecer nas rodadas seguintes. Marcas
// recém-aplicadas nesta rodada (que ainda não tiquearam) também contam.
export function resolveSeqerMau(s, card, def = byKey[card.key]) {
  const envenenadas = s.board.filter((c) => c.venenos && c.venenos.length > 0 && c.owner !== card.owner && emJogo(c));

  if (envenenadas.length === 0) {
    pushLog(s, `${def.nome}: nenhuma carta inimiga envenenada no campo.`);
    return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }

  let totalDano = 0;
  for (const c of envenenadas) {
    const dano = totalVeneno(c);
    aplicarBencao(s, c, -dano, def.nome);
    totalDano += dano;
  }

  pushLog(s, `${def.nome} repetiu o veneno em ${envenenadas.length} carta(s), causando -${totalDano} no total.`);
  return { uid: card.uid, text: `☠ -${totalDano}`, kind: "debuff", seq: s.effectSeq };
}

/* ==========================================================================
   ARQUÉTIPO ANIMAL

   Cinco efeitos de entrada (Cabra, Ganso, Rebanho, Garça, Ápis, Macaco) e um
   gatilho de morte (Hiena). Nenhum deles inventa mecânica nova: todos usam os
   seletores de ocupação e de tipo declarados no topo do arquivo, e todo bônus
   é gravado por aplicarBencao — o mesmo caminho da Hathor e da Armadura, o que
   dá compatibilidade com a Renenutet de graça.

   O que NÃO existe aqui: contadores próprios de poder. O arquétipo inteiro se
   apoia no modelo aditivo de decomporPartes(), então nada pode divergir do
   número exibido na carta.
   ========================================================================== */

// ------------------------------- INVOCAÇÃO ----------------------------------
// Ficha é carta de tabuleiro comum: ocupa espaço, recebe hino e bênção, conta
// como Animal, morre normalmente. O que a distingue é não ter deck nem mão —
// ela só existe porque um efeito a criou, e some ao sair do campo.
// SEM ESPAÇO, SEM FICHA: a invocação falha sozinha, sem substituir ninguém.
export function invocarFicha(s, { key, owner, lane }) {
  if (viaCheia(s.board, owner, lane)) return null;
  s.plays[owner] += 1;            // ficha é carta colocada em jogo: alimenta a Ammit
  const ficha = {
    uid: nextUid(), key, owner, lane,
    printed: byKey[key].poder, baked: 0, mods: [], revealed: true, dying: false,
    entryPlays: s.plays[owner], enteredRound: s.round, moved: false, token: true,
  };
  s.board.push(ficha);
  return ficha;
}

// Ganso (uma ficha na própria via) e Rebanho de Cabras (uma em cada OUTRA via).
// Cada via é resolvida em separado: uma cheia não cancela a outra.
export function resolveInvocar(s, card, def = byKey[card.key]) {
  const { key, onde } = def.invocar;
  const nome = byKey[key].nome;
  const destinos = onde === "outras" ? [0, 1, 2].filter((l) => l !== card.lane) : [card.lane];
  const criadas = [], semEspaco = [];
  for (const lane of destinos) {
    const ficha = invocarFicha(s, { key, owner: card.owner, lane });
    if (ficha) criadas.push(ficha); else semEspaco.push(lane);
  }
  const recado = semEspaco.length ? ` Sem espaço na(s) Via(s) ${semEspaco.map((l) => l + 1).join(", ")}.` : "";
  if (criadas.length === 0) {
    pushLog(s, `${def.nome}: nenhuma ${nome} invocada —${recado || " sem espaço."}`);
    return { uid: card.uid, text: "sem espaço", kind: "block", seq: s.effectSeq };
  }
  pushLog(s, `${def.nome} invocou ${criadas.length}× ${nome} na(s) Via(s) ${criadas.map((c) => c.lane + 1).join(", ")}.${recado}`);
  return { uid: card.uid, text: `＋${criadas.length} ${nome}`, kind: "buff", seq: s.effectSeq };
}

// ----------------------------- Cabra do Nilo --------------------------------
// +1 por OUTRO Animal seu já revelado nesta via — só na própria via, só do
// próprio dono, e só uma vez, na entrada. O bônus é permanente: não some se a
// companhia sair, e não cresce se chegar mais gente depois.
// Teto natural: três companheiros num lado de via (4 espaços), logo +3.
export function resolveCabraDoNilo(s, cabra, def = byKey[cabra.key]) {
  const companhia = animaisEmJogo(s.board, { owner: cabra.owner, lane: cabra.lane, exceto: cabra.uid });
  if (companhia.length === 0) {
    pushLog(s, `${def.nome}: sozinha na Via ${cabra.lane + 1} — sem bônus.`);
    return { uid: cabra.uid, text: "sozinha", kind: "block", seq: s.effectSeq };
  }
  const ganho = companhia.length * def.animalNaVia;
  aplicarBencao(s, cabra, ganho, `${def.nome} — ${companhia.length} Animal(is) na via`);
  pushLog(s, `${def.nome}: ${companhia.length} Animal(is) seu(s) na Via ${cabra.lane + 1} → +${ganho}.`);
  return { uid: cabra.uid, text: `+${ganho}`, kind: "buff", seq: s.effectSeq };
}

// -------------------------------- Touro Ápis --------------------------------
// +1 por OUTRO Animal revelado em jogo, dos dois lados, fichas inclusive.
// Congelado na entrada: é uma fotografia do tabuleiro, não uma aura.
export function resolveApis(s, apis, def = byKey[apis.key]) {
  const outros = animaisEmJogo(s.board, { exceto: apis.uid });
  if (outros.length === 0) {
    pushLog(s, `${def.nome}: nenhum outro Animal em jogo — entra com o Poder impresso.`);
    return { uid: apis.uid, text: "só ele", kind: "block", seq: s.effectSeq };
  }
  const ganho = outros.length * def.bonusPorAnimal;
  aplicarBencao(s, apis, ganho, `${def.nome} — ${outros.length} Animal(is) em jogo`);
  pushLog(s, `${def.nome}: ${outros.length} outro(s) Animal(is) em jogo → +${ganho}.`);
  return { uid: apis.uid, text: `+${ganho}`, kind: "buff", seq: s.effectSeq };
}

// ------------------------------ Macaco Sagrado ------------------------------
// Move OUTRO Animal seu para outra via com espaço. O alvo e o destino são
// sorteados, seguindo o Set e a Armadura de Ptah: o motor resolve a revelação
// sem pausa de mira, e a pausa existe hoje só para a Hathor.
// Não consome o movimento próprio da carta movida (o Escaravelho continua com
// o dele) e não redispara o Ao Entrar de quem foi movido.
export function resolveMacaco(s, macaco, rng = Math.random, def = byKey[macaco.key]) {
  const candidatos = animaisEmJogo(s.board, { owner: macaco.owner, exceto: macaco.uid })
    .filter((c) => viasComEspaco(s.board, c.owner, c.lane).length > 0);
  if (candidatos.length === 0) {
    pushLog(s, `${def.nome}: nenhum Animal seu pode mudar de via.`);
    return { uid: macaco.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }
  const alvo = candidatos[Math.floor(rng() * candidatos.length)];
  const destinos = viasComEspaco(s.board, alvo.owner, alvo.lane);
  const origem = alvo.lane;
  alvo.lane = destinos[Math.floor(rng() * destinos.length)];
  pushLog(s, `⇄ ${def.nome} levou ${byKey[alvo.key].nome} da Via ${origem + 1} para a Via ${alvo.lane + 1}.`);
  return { uid: alvo.uid, text: `⇄ Via ${alvo.lane + 1}`, kind: "movimento", seq: s.effectSeq };
}

// ----------------------------- Hiena do Deserto -----------------------------
// +2 permanentes por Animal SEU destruído em campo, em qualquer via, fichas
// inclusive. Chamada de dentro de destroyList, que é o único caminho de morte
// do motor — por isso não conta quem volta à mão (Múmia), quem só muda de via,
// nem quem sai do campo consumido (Praga), que não passam por lá.
export function alimentarHienas(s, victims) {
  const mortos = victims.filter((v) => temTipo(v, "Animal"));
  if (mortos.length === 0) return [];
  const alimentadas = [];
  for (const h of s.board.filter((c) => c.key === "hiena" && c.revealed && !c.dying)) {
    const n = mortos.filter((m) => m.owner === h.owner && m.uid !== h.uid).length;
    if (n === 0) continue;
    const ganho = byKey[h.key].ganhoPorAnimalMorto * n;
    aplicarBencao(s, h, ganho, `Hiena — ${n} Animal(is) destruído(s)`);
    alimentadas.push({ uid: h.uid, ganho, n });
  }
  if (alimentadas.length)
    pushLog(s, `𓃒 Hiena do Deserto se alimentou: ${alimentadas.map((a) => `+${a.ganho}`).join(", ")}.`);
  return alimentadas;
}
