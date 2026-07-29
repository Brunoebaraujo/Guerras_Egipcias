/* ========================================================================== 
   Guerras Egípcias — Motor do jogo (puro, sem React).
   Tudo aqui opera sobre o objeto de estado `s` (plain object clonável) e
   é coberto por testes em engine.test.js. A UI (App.jsx) só orquestra.
   ========================================================================== */

export const GLYPH = {
  buff: "☀", debuff: "☾", sacrificio: "☥", reset: "⚖", silencio: "⊘",
  movimento: "⇄", crescimento: "⇑", fusao: "⛨", renascimento: "⟳", base: "𓂀",
};
export const ARCH_COLOR = {
  base: "text-stone-400", buff: "text-amber-300", debuff: "text-indigo-300",
  sacrificio: "text-emerald-300", reset: "text-rose-300", silencio: "text-rose-300",
  movimento: "text-sky-300", crescimento: "text-amber-300", fusao: "text-teal-300", renascimento: "text-amber-300",
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
  { key: "hathor", nome: "Hathor", tipo: "Divindade", custo: 2, poder: 2, arch: "buff",
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
  { key: "mumia", nome: "Múmia", tipo: "Criatura", custo: 1, poder: 2, arch: "sacrificio",
    trigger: "morrer", arte: "mumia",
    lore: "Os egípcios não mumificavam seus mortos para lembrar o passado, mas para prepará-los para o futuro. Se o corpo permanecesse intacto, a alma poderia retornar e erguer-se novamente. O corpo era preservado para que o Ka e o Ba pudessem reconhecê-lo após a morte.",
    texto: "Ao Morrer: volta à mão com o dobro do Poder atual (Faixa)." },
  { key: "enxame", nome: "Enxame de Gafanhotos", tipo: "Guerreiro", custo: 3, poder: 2, arch: "crescimento",
    trigger: "entrar", absorb: "swarm", arte: "enxame",
    lore: "Quando a oitava praga desceu sobre o Egito, o céu escureceu de asas e a terra foi devorada num só dia. Onde pousa um gafanhoto, logo há mil — a fome se multiplica mais depressa do que se pode contá-la.",
    texto: "Ao Entrar: crie 2 cópias desta carta no seu lado. As cópias são Guerreiros base sem efeito e copiam o Poder atual." },
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
  { key: "diluvio", nome: "Dilúvio de Hápi", tipo: "Fenômeno", custo: 5, poder: 7, arch: "sacrificio",
    trigger: "entrar", sacrificeAll: true, arte: "diluvio", arteFoco: "center 0%",
    lore: "Todo ano a cheia de Hápi engolia os campos, e nesse afogamento morava a promessa: o limo que a água deixava fazia o Egito florescer. O deus não distinguia amigo de plantação — arrastava tudo o que encontrava, para que da ruína nascesse a fartura.",
    texto: "Ao Entrar: destrói todas as suas outras cartas nesta via." },
  { key: "bennu", nome: "Bennu", tipo: "Criatura", custo: 1, poder: 0, arch: "renascimento",
    trigger: "morrer", arte: "bennu",
    lore: "Os antigos egípcios viam Bennu como a ave da criação e da renovação. Sua lenda inspirou, séculos depois, o mito da Fênix.",
    texto: "Ao Morrer: renasce na mesma rodada, em via aleatória, com +1 de Poder. +1 de energia no próximo turno." },
  { key: "renenutet", nome: "Renenutet", tipo: "Divindade", custo: 3, poder: 3, arch: "buff",
    trigger: "entrar", spreadOnBlessing: 2, arte: "renenutet", arteFoco: "center 0%",
    lore: "Renenutet dava à criança o seu ren — o nome verdadeiro — e fazia o grão render. Sem nome, nada existia; por isso ela alimentava e batizava no mesmo gesto.",
    texto: "Ao receber uma bênção permanente: +1 a duas outras cartas suas em jogo. Bênçãos recebidas fora de jogo resolvem ao entrar." },
  { key: "anubis", nome: "Anúbis", tipo: "Divindade", custo: 4, poder: 4, arch: "reset",
    trigger: "entrar", judgeLane: true, arte: "anubis", arteFoco: "center 0%",
    lore: "Anúbis pesava o coração do morto contra a pluma de Maat. Sua justiça não conhecia posição nem riqueza: diante da balança, todos os corações valiam pelo mesmo peso.",
    texto: "Ao Entrar: todas as outras cartas desta via têm o Poder base nivelado ao menor entre elas. Buffs permanentes somem; auras permanecem. O julgamento persiste." },
  { key: "amheh", nome: "Am-heh, o Devorador de Milhões", tipo: "Divindade", custo: 6, poder: 0, arch: "sacrificio",
    trigger: "continuo", arte: "amheh", arteFoco: "center 0%",
    lore: "No lago de fogo do Duat morava Am-heh, o Comedor da Eternidade — face de cão, fome sem fundo. Não julgava como Osíris nem pesava como Maat: simplesmente devorava, e do poder de cada destruído fazia o seu próprio.",
    texto: "Contínuo: absorve o Poder de cada carta destruída na partida, de qualquer lado (inclusive valores negativos)." },
  // Set das Pragas — a ÚNICA carta escolhível do set. Ela traz as outras dez.
  { key: "moises", nome: "Moisés, Portador das Pragas", tipo: "Divindade", custo: 1, poder: 0, arch: "crescimento",
    set: "pragas", abertura: true, outorga: "pragas",
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
  { key: "sangue", nome: "Águas em Sangue", tipo: "Praga", custo: 1, poder: 0, arch: "debuff", set: "pragas", praga: true,
    texto: "Uma carta inimiga aleatória em cada via ocupada recebe -1 de Poder.",
    lore: "Tudo no Egito media-se pelo Nilo: a colheita, o calendário, o imposto. Quando a água deixou de ser água, não faltou apenas bebida — faltou a régua com que o país se entendia." },
  { key: "ras", nome: "Praga das Rãs", tipo: "Praga", custo: 2, poder: 0, arch: "debuff", set: "pragas", praga: true,
    texto: "Crie uma Rã (1/1) num espaço vazio de uma via inimiga aleatória. A Rã pertence ao oponente.",
    lore: "Heket tinha cabeça de rã e presidia o nascimento: o animal era sinal de vida que se multiplica. A praga não trouxe nada de novo ao Egito — só devolveu o próprio símbolo em quantidade insuportável." },
  { key: "piolhos", nome: "Praga dos Piolhos", tipo: "Praga", custo: 1, poder: 0, arch: "debuff", set: "pragas", praga: true,
    texto: "Aumente em 1 o custo de uma carta aleatória na mão do adversário.",
    lore: "O sacerdote egípcio raspava o corpo inteiro e se lavava quatro vezes ao dia; impureza no corpo era impureza no rito. A terceira praga não feriu ninguém: apenas tornou todo o clero incapaz de servir." },
  { key: "moscas", nome: "Praga das Moscas", tipo: "Praga", custo: 2, poder: 0, arch: "debuff", set: "pragas", praga: true,
    texto: "Embaralhe duas Moscas (1/0) no deck do adversário.",
    lore: "O faraó condecorava seus bravos com a Mosca de Ouro, pingente entregue a quem não recuava em combate. Foi essa insígnia que a quarta praga cobriu de escárnio, enchendo o Egito de moscas que ninguém quis." },
  { key: "peste", nome: "Peste nos Animais", tipo: "Praga", custo: 3, poder: 0, arch: "sacrificio", set: "pragas", praga: true,
    texto: "Destrua todos os Animais inimigos na via em que esta Praga foi jogada.",
    lore: "Rebanho era riqueza contável: os escribas registravam cabeça por cabeça, e o touro Ápis era adorado vivo em Mênfis. Matar o gado do Egito esvaziava ao mesmo tempo o celeiro e o altar." },
  { key: "ulceras", nome: "Praga das Úlceras", tipo: "Praga", custo: 2, poder: 0, arch: "debuff", set: "pragas", praga: true,
    texto: "Escolha uma via. Uma carta inimiga aleatória nela recebe Úlceras: -1 de Poder no início de cada rodada enquanto permanecer em jogo.",
    lore: "O Papiro de Ebers dedica dezenas de receitas às feridas de pele — mel, gordura, malaquita moída. Contra a sexta praga nenhuma serviu, e a medicina mais antiga do mundo assistiu de mãos vazias." },
  { key: "granizo", nome: "Chuva de Granizo e Fogo", tipo: "Praga", custo: 3, poder: 0, arch: "sacrificio", set: "pragas", praga: true,
    texto: "Destrua uma carta inimiga aleatória de custo 1 em jogo. Depois, aumente em 1 o custo de uma carta aleatória na mão do adversário.",
    lore: "No Egito quase não chove, e granizo era coisa de que só se ouvia falar em terras estrangeiras. Cair gelo do céu não foi só destruição: foi a prova de que o céu havia trocado de dono." },
  { key: "gafanhotos", nome: "Nuvem de Gafanhotos", tipo: "Praga", custo: 3, poder: 0, arch: "debuff", set: "pragas", praga: true,
    texto: "Uma carta inimiga aleatória em cada via ocupada recebe -2 de Poder.",
    lore: "O Egito guardava grão para os anos magros, e era essa reserva que o tornava a potência do mundo antigo. A oitava praga não roubou o celeiro: comeu a safra que ainda estava de pé, antes que houvesse o que guardar." },
  { key: "trevas", nome: "Trevas sobre o Egito", tipo: "Praga", custo: 3, poder: 0, arch: "silencio", set: "pragas", praga: true,
    texto: "Na próxima rodada, as cartas dos dois lados permanecem ocultas. Na rodada seguinte, revele primeiro as atrasadas.",
    lore: "Todas as manhãs Rá vencia a serpente e o sol subia; era esse combate que garantia que o mundo continuasse existindo. Três dias de escuridão dispensaram qualquer discurso: diziam que Rá havia perdido." },
  { key: "primogenitos", nome: "Morte dos Primogênitos", tipo: "Praga", custo: 6, poder: 0, arch: "sacrificio", set: "pragas", praga: true,
    texto: "Destrua a carta inimiga de maior custo em jogo. Em caso de empate, escolha aleatória.",
    lore: "Era o filho mais velho que abria a boca do morto e lhe servia pão e cerveja pela eternidade; sem ele, o ka do pai passava fome para sempre. A décima praga não matou apenas herdeiros — condenou uma geração de pais à segunda morte." },
];

export const PRAGA_KEYS = PRAGAS.map((p) => p.key);

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
    lore: "A segunda praga subiu do Nilo e entrou nos fornos, nas camas e nas amassadeiras. Não matava ninguém: apenas ocupava cada palmo até não haver onde pisar." },
  { key: "token-mosca", nome: "Mosca", tipo: "Animal", custo: 1, poder: 0, arch: "base", set: "pragas", token: true,
    lore: "O enxame da quarta praga não devorava nem picava — apenas estava em toda parte, num zumbido que não deixava pensar. O Egito aprendeu que atrapalhar basta." },
];

export const byKey = Object.fromEntries([...CARDS, ...PRAGAS, ...TOKENS].map((c) => [c.key, c]));

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

// ----------------------------- motor de poder -------------------------------
export const laneHasMaat = (board, lane) =>
  board.some((c) => c.lane === lane && c.key === "maat" && c.revealed && !c.dying);

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

  const montus = board.filter((c) => c.owner === card.owner && c.key === "montu" && c.revealed && !c.dying).length;
  if (montus && byKey[card.key].tipo === "Guerreiro") partes.push({ label: "Montu", val: 2 * montus, tipo: "continuo" });

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

export const onEnterBlocked = (card, board) =>
  board.some((b) => b.revealed && !b.dying && byKey[b.key].block && b.lane === card.lane && b.owner !== card.owner);

export const validTargets = (card, needs, board) => {
  if (needs === "ally") return board.filter((c) => c.owner === card.owner && c.lane === card.lane && c.uid !== card.uid && !c.dying);
  if (needs === "enemy") return board.filter((c) => c.owner !== card.owner && c.lane === card.lane && !c.dying);
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
export function buildRevealQueue(s) {
  const order = [s.priority, 1 - s.priority];
  const queue = [];
  for (const side of order)
    for (const c of s.board.filter((x) => x.owner === side && !x.revealed))
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
    if (v.key === "mumia") mumias.push({ owner: v.owner, val: powerAtDeath[i] * 2 });
    if (v.key === "bennu") {
      s.pendingEnergy[v.owner] += 1;
      s.pendingReturn.push({ owner: v.owner, lane: v.lane, printed: v.printed, baked: (v.baked || 0) + 1 });
    }
  });
  if (!s.destroyedPower) s.destroyedPower = [0, 0];
  victims.forEach((v, i) => {
    v.dying = s.effectSeq;
    s.deaths[v.owner] += 1;
    s.destroyedPower[v.owner] += powerAtDeath[i];
  });
  for (const r of mumias) s.hand[r.owner].push({ hid: nextUid(), key: "mumia", printed: 2, baked: r.val - 2 });
  return mumias;
}

// -------------------------- renascimento do Bennu ---------------------------
// Consome s.pendingReturn e recoloca cada Bennu AINDA NA MESMA RODADA, numa via
// sorteada entre as que tem espaco (pode calhar de ser a via de origem).
// rng injetavel para os testes.
export function resolveBennuRebirth(s, rng = Math.random) {
  if (!s.pendingReturn || s.pendingReturn.length === 0) return [];
  const nascidos = [];
  for (const r of s.pendingReturn) {
    const livres = [0, 1, 2].filter(
      (lane) => s.board.filter((c) => c.owner === r.owner && c.lane === lane && !c.dying).length < 4
    );
    if (livres.length === 0) {
      pushLog(s, `\u27f3 Bennu nao renasceu \u2014 todas as vias do ${SIDE_NAME[r.owner]} estao cheias.`);
      continue;
    }
    const lane = livres[Math.floor(rng() * livres.length)];
    const card = {
      uid: nextUid(), key: "bennu", owner: r.owner, lane,
      printed: r.printed, baked: r.baked, mods: [], revealed: true,
      entryPlays: s.plays[r.owner], enteredRound: s.round, moved: false,
    };
    s.board.push(card);
    nascidos.push(card);
    pushLog(s, `\u27f3 Bennu renasceu na Via ${lane + 1} do ${SIDE_NAME[r.owner]} (Poder ${r.printed + r.baked}).`);
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

   Alcance: as Pragas atingem cartas ainda por revelar, filtrando apenas
   `!c.dying`. É o mesmo critério que a Sekhmet, o Assassino Medjay e o
   validTargets já usam — o motor nunca exigiu `revealed` para efeito nenhum.
   Consequência tática: quem tem prioridade acerta as cartas que o oponente
   acabou de posicionar.
   ========================================================================== */

const sorteioUm = (arr, rng) => (arr.length ? arr[Math.floor(rng() * arr.length)] : null);

// Cartas do lado oposto ainda no tabuleiro, opcionalmente de uma via só.
const inimigasNoCampo = (s, praga, lane = null) =>
  s.board.filter((c) => c.owner !== praga.owner && !c.dying && (lane === null || c.lane === lane));

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
export function resolveSet(s, set, rng = Math.random) {
  const def = byKey[set.key];
  const pool = s.board.filter(
    (c) => c.owner !== set.owner && c.lane === set.lane && c.revealed && !c.dying
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
    const destinos = [0, 1, 2].filter(
      (l) => l !== v.lane &&
        s.board.filter((c) => c.owner === v.owner && c.lane === l && !c.dying).length < 4
    );
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
  const montu = s.board.filter((c) => c.owner === card.owner && c.key === "montu" && c.revealed && !c.dying).length * 2;
  return amon + montu;
}

export function resolveEnxame(s, card) {
  const def = byKey[card.key];
  const occupied = s.board.filter((c) => c.owner === card.owner && c.lane === card.lane && !c.dying).length;
  const copiesToCreate = Math.min(2, Math.max(0, 4 - occupied));
  if (copiesToCreate === 0) {
    pushLog(s, `${def.nome}: sem espaço na via para criar cópias.`);
    return { uid: card.uid, text: "sem espaço", kind: "block", seq: s.effectSeq };
  }

  const visiblePower = power(card, ctxOf(s));
  const printedForCopies = visiblePower - copyVisibleAuraBonus(s, card);
  for (let i = 0; i < copiesToCreate; i++) {
    s.plays[card.owner] += 1;
    s.board.push({
      uid: nextUid(), key: card.key, owner: card.owner, lane: card.lane,
      printed: printedForCopies, baked: 0, mods: [], revealed: true, dying: false,
      entryPlays: s.plays[card.owner], enteredRound: s.round, moved: false, baseCopy: true,
    });
  }
  pushLog(s, `${def.nome} criou ${copiesToCreate} cópia(s) com Poder ${visiblePower}.`);
  return { uid: card.uid, text: `+${copiesToCreate} cópias`, kind: "buff", seq: s.effectSeq };
}

// Destrói as OUTRAS cartas do próprio dono na via (Apófis absorve; Dilúvio só destrói).
export function resolveDestroyOwnLane(s, card, absorb) {
  if (card.key === "enxame") return resolveEnxame(s, card);
  const def = byKey[card.key];
  const victims = s.board.filter((c) => c.owner === card.owner && c.lane === card.lane && c.uid !== card.uid && !c.dying);
  if (victims.length === 0) { pushLog(s, `${def.nome}: nada para destruir na via.`); return { uid: card.uid, text: "sozinho", kind: "block", seq: s.effectSeq }; }
  let absorbed = 0;
  if (absorb) for (const v of victims) absorbed += power(v, ctxOf(s));
  const returns = destroyList(s, victims);
  if (absorb && absorbed > 0) { const self = s.board.find((c) => c.uid === card.uid); if (self) self.mods.push({ src: "Absorção", val: absorbed }); }
  pushLog(s, `${def.nome} destruiu ${victims.length} carta(s)` + (absorb ? ` e absorveu ${absorbed} de Poder.` : ".") + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
  return { uid: card.uid, text: absorb ? `＋${absorbed}` : `☥ ${victims.length}✕`, kind: "sac", seq: s.effectSeq };
}

export function resolveSobek(s, sobek) {
  const victims = s.board.filter((c) => c.owner === sobek.owner && c.lane === sobek.lane && c.uid !== sobek.uid);
  if (victims.length === 0) { pushLog(s, `Sobek entrou sozinho — nada a destruir.`); return { uid: sobek.uid, text: "sozinho", kind: "block", seq: s.effectSeq }; }
  const returns = destroyList(s, victims);
  const sk = s.board.find((c) => c.uid === sobek.uid);
  if (sk) sk.mods.push({ src: "Sobek", val: victims.length });
  pushLog(s, `Sobek destruiu ${victims.length} sua(s) → +${victims.length}.` + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
  return { uid: sobek.uid, text: `☥ +${victims.length}`, kind: "sac", seq: s.effectSeq };
}

export function resolveArmadura(s, arm) {
  const allies = s.board.filter((c) => c.owner === arm.owner && c.lane === arm.lane && c.uid !== arm.uid);
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
    if (c.dying) return false;
    if (c.lane !== card.lane) return false;
    if (c.uid === card.uid) return false;
    if (escopo === "inimigos" && c.owner === card.owner) return false;

    const def = byKey[c.key];
    return def.tipo === tipo;
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
  const victims = s.board.filter((c) => custoDe(c) === cost && c.uid !== card.uid);
  if (victims.length === 0) { pushLog(s, `Sekhmet: nenhuma carta de custo ${cost} em jogo.`); return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq }; }
  const returns = destroyList(s, victims);
  pushLog(s, `Sekhmet destruiu ${victims.length} carta(s) de custo ${cost}.` + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
  return { uid: card.uid, text: `☾ ${victims.length}✕`, kind: "debuff", seq: s.effectSeq };
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
export function resolveHeka(s, heka) {
  const def = byKey[heka.key];
  const val = def.buffNext;
  if (!s.pendingBuff) s.pendingBuff = [null, null];
  s.pendingBuff[heka.owner] = val;
  pushLog(s, `${def.nome}: +${val} reservado para sua próxima carta revelada (vale entre rodadas).`);
  return { uid: heka.uid, text: `☀ +${val}→`, kind: "buff", seq: s.effectSeq };
}
