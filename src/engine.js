/* ========================================================================== 
   DUAT — Motor do jogo (puro, sem React).
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
    texto: "Ao Entrar: +3 de Poder a um aliado nesta via." },
  { key: "heka", nome: "Heka", tipo: "Divindade", custo: 2, poder: 1, arch: "buff",
    trigger: "entrar", buffNext: 3, arte: "heka",
    lore: "Heka é a magia que precede a criação — a força que anima o gesto dos deuses. Antes que qualquer poder se manifeste, Heka já o preparou.",
    texto: "Ao Entrar: sua próxima carta revelada nesta rodada entra com +3 de Poder permanente." },
  { key: "amon", nome: "Amon", tipo: "Divindade", custo: 5, poder: 5, arch: "buff",
    trigger: "continuo", arte: "amon",
    lore: "Rei dos deuses e senhor dos ventos, Amon ergue os exércitos do Egito sob a luz eterna do Sol.",
    texto: "Contínuo: +1 a todas as suas outras cartas em jogo (todas as vias)." },
  { key: "set", nome: "Set", tipo: "Divindade", custo: 5, poder: 6, arch: "debuff",
    trigger: "entrar", needs: "enemy", buffTarget: -4,
    texto: "Ao Entrar: −4 de Poder a uma carta inimiga nesta via." },
  { key: "maat", nome: "Maat", tipo: "Divindade", custo: 4, poder: 3, arch: "reset",
    trigger: "continuo", texto: "Contínuo: nesta via, toda carta (dos dois lados) volta ao Poder impresso." },
  { key: "sobek", nome: "Sobek", tipo: "Criatura", custo: 2, poder: 2, arch: "sacrificio",
    trigger: "entrar", texto: "Ao Entrar: destrua suas outras cartas nesta via; +1 por carta destruída." },
  { key: "anubis", nome: "Anúbis", tipo: "Divindade", custo: 4, poder: 4, arch: "sacrificio",
    trigger: "continuo", texto: "Contínuo: +2 para cada carta sua já destruída na partida." },
  { key: "mumia", nome: "Múmia", tipo: "Criatura", custo: 1, poder: 2, arch: "sacrificio",
    trigger: "morrer", arte: "mumia",
    lore: "Os egípcios não mumificavam seus mortos para lembrar o passado, mas para prepará-los para o futuro. Se o corpo permanecesse intacto, a alma poderia retornar e erguer-se novamente. O corpo era preservado para que o Ka e o Ba pudessem reconhecê-lo após a morte.",
    texto: "Ao Morrer: volta à mão com o dobro do Poder atual (Faixa)." },
  { key: "enxame", nome: "Enxame de Gafanhotos", tipo: "Guerreiro", custo: 3, poder: 2, arch: "crescimento",
    trigger: "entrar", absorb: "swarm", arte: "enxame",
    texto: "Ao Entrar: crie 2 cópias desta carta no seu lado. As cópias são Guerreiros base sem efeito e copiam o Poder atual." },
  { key: "assassino-medjay", nome: "Assassino Medjay", tipo: "Guerreiro", custo: 3, poder: 3, arch: "debuff", arte: "assassino-medjay",
    trigger: "entrar",
    destroyAllOfTypeInLane: "Divindade",
    texto: "Ao Entrar: destrói todas as Divindades nesta via.",
    lore: "Os Medjay protegiam as fronteiras do Egito, mas alguns eram treinados para missões mais sombrias: silenciar falsos milagres, profanar altares inimigos e lembrar até aos deuses que o faraó também tinha lâminas." },
  { key: "selo", nome: "Selo do Silêncio", tipo: "Magia", custo: 3, poder: 3, arch: "silencio",
    trigger: "continuo", block: true, texto: "Contínuo: cartas inimigas que revelarem nesta via não disparam Ao Entrar." },
  { key: "montu", nome: "Montu", tipo: "Divindade", custo: 3, poder: 1, arch: "buff",
    trigger: "continuo", anthemType: "Guerreiro", anthemVal: 2,
    texto: "Contínuo: seus Guerreiros ganham +2 de Poder." },
  { key: "armadura", nome: "Armadura de Ptah", tipo: "Relíquia", custo: 2, poder: 3, arch: "fusao", arte: "armadura", arteFoco: "center 0%",
    trigger: "entrar", fuse: true,
    texto: "Ao Entrar: funde-se com um aliado aleatório nesta via, conferindo seu Poder a ele." },
  { key: "escaravelho", nome: "Escaravelho Alado", tipo: "Criatura", custo: 1, poder: 3, arch: "movimento",
    move: true, texto: "Pode mover-se para outra via uma vez, a partir da rodada seguinte à sua entrada." },
  { key: "ammit", nome: "Ammit, a Devoradora", tipo: "Criatura", custo: 3, poder: 1, arch: "crescimento",
    trigger: "continuo", growPerPlay: true,
    texto: "Contínuo: +1 de Poder para cada carta que você colocar em jogo depois dela." },
  { key: "sekhmet", nome: "Sekhmet", tipo: "Divindade", custo: 3, poder: 4, arch: "debuff",
    trigger: "entrar", wipeCost: 1,
    texto: "Ao Entrar: destrói todas as cartas de custo 1 em jogo (dos dois lados)." },
  { key: "apofis", nome: "Apófis", tipo: "Criatura", custo: 4, poder: 3, arch: "sacrificio", arte: "apofis",
    trigger: "entrar", absorb: true,
    texto: "Ao Entrar: destrói suas outras cartas nesta via e ganha o Poder total delas." },
  { key: "diluvio", nome: "Dilúvio de Hápi", tipo: "Fenômeno", custo: 5, poder: 7, arch: "sacrificio",
    trigger: "entrar", sacrificeAll: true,
    texto: "Ao Entrar: destrói todas as suas outras cartas nesta via." },
  { key: "bennu", nome: "Bennu", tipo: "Criatura", custo: 1, poder: 0, arch: "renascimento",
    trigger: "morrer", arte: "bennu",
    lore: "Os antigos egípcios viam Bennu como a ave da criação e da renovação. Sua lenda inspirou, séculos depois, o mito da Fênix.",
    texto: "Ao Morrer: renasce na mesma rodada, em via aleatória, com +1 de Poder. +1 de energia no próximo turno." },
  { key: "renenutet", nome: "Renenutet", tipo: "Divindade", custo: 3, poder: 3, arch: "buff",
    trigger: "entrar", spreadOnBlessing: 2, arte: "renenutet", arteFoco: "center 0%",
    lore: "Renenutet dava à criança o seu ren — o nome verdadeiro — e fazia o grão render. Sem nome, nada existia; por isso ela alimentava e batizava no mesmo gesto.",
    texto: "Ao receber uma bênção permanente: +1 a duas outras cartas suas em jogo. Bênçãos recebidas fora de jogo resolvem ao entrar." },
];
export const byKey = Object.fromEntries(CARDS.map((c) => [c.key, c]));
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
export const ctxOf = (s) => ({ board: s.board, deaths: s.deaths, plays: s.plays });
export const pushLog = (s, m) => { s.log = [m, ...s.log].slice(0, 80); };

// ----------------------------- motor de poder -------------------------------
export const laneHasMaat = (board, lane) =>
  board.some((c) => c.lane === lane && c.key === "maat" && c.revealed && !c.dying);

export function power(card, ctx) {
  const { board, deaths, plays } = ctx;
  if (laneHasMaat(board, card.lane)) return card.printed;
  let p = card.printed + (card.baked || 0);
  for (const m of card.mods) p += m.val;
  // Amon: +1 a todas as suas OUTRAS cartas
  p += board.filter((c) => c.owner === card.owner && c.key === "amon" && c.revealed && !c.dying && c.uid !== card.uid).length;
  // Montu: +2 aos seus Guerreiros
  const montus = board.filter((c) => c.owner === card.owner && c.key === "montu" && c.revealed && !c.dying).length;
  if (byKey[card.key].tipo === "Guerreiro") p += 2 * montus;
  // Anúbis: escala com mortes suas
  if (card.key === "anubis") p += 2 * deaths[card.owner];
  // Ammit: +1 por carta jogada por você após ela
  if (card.key === "ammit") p += Math.max(0, plays[card.owner] - (card.entryPlays || 0));
  return p;
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

// ------------------------------ destruição ----------------------------------
export function destroyList(s, victims) {
  const mumias = [];
  for (const v of victims) {
    if (v.key === "mumia") mumias.push({ owner: v.owner, val: power(v, ctxOf(s)) * 2 });
    if (v.key === "bennu") {
      s.pendingEnergy[v.owner] += 1;
      s.pendingReturn.push({ owner: v.owner, lane: v.lane, printed: v.printed, baked: (v.baked || 0) + 1 });
    }
  }
  for (const v of victims) { v.dying = s.effectSeq; s.deaths[v.owner] += 1; }
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
// Efeitos "Contínuo:" (Amon, Montu, Anúbis, Ammit, Maat) são recalculados a cada
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
  // Registra a onda para a animação: cada onda tem seu proprio atraso na tela.
  s.blessings = (s.blessings || []).concat(alvos.map((a) => ({ uid: a.uid, wave, seq: s.effectSeq })));
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
  aplicarBencao(s, target, val, "Armadura");
  arm.dying = s.effectSeq;
  pushLog(s, `Armadura de Ptah fundiu-se com ${byKey[target.key].nome} (+${val}).`);
  return { uid: target.uid, text: `⛨ +${val}`, kind: "fuse", seq: s.effectSeq };
}

export function resolveDestroyAllOfTypeInLane(s, card, tipo) {
  const victims = s.board.filter((c) => {
    if (c.dying) return false;
    if (c.lane !== card.lane) return false;
    if (c.uid === card.uid) return false;

    const def = byKey[c.key];
    return def.tipo === tipo;
  });

  if (victims.length === 0) {
    pushLog(s, `${byKey[card.key].nome}: nenhuma ${tipo} encontrada na Via ${card.lane + 1}.`);
    return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq };
  }

  destroyList(s, victims);

  const names = victims.map((v) => byKey[v.key].nome).join(", ");
  pushLog(s, `${byKey[card.key].nome} destruiu ${tipo}(s) na Via ${card.lane + 1}: ${names}.`);

  return { uid: card.uid, text: `destruiu ${victims.length}`, kind: "debuff", seq: s.effectSeq };
}

export function resolveSekhmet(s, card, cost) {
  const victims = s.board.filter((c) => byKey[c.key].custo === cost && c.uid !== card.uid);
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
