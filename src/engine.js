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
  { key: "servo",     nome: "Servo do Templo",       tipo: "Guerreiro", custo: 0, poder: 1,  arch: "base" },
  { key: "arqueiro",  nome: "Arqueiro Núbio",        tipo: "Guerreiro", custo: 1, poder: 2,  arch: "base" },
  { key: "lanceiro",  nome: "Lanceiro do Nilo",      tipo: "Guerreiro", custo: 2, poder: 3,  arch: "base" },
  { key: "carruagem", nome: "Carruagem de Guerra",   tipo: "Guerreiro", custo: 3, poder: 5,  arch: "base" },
  { key: "guardareal",nome: "Guarda Real",           tipo: "Guerreiro", custo: 4, poder: 7,  arch: "base" },
  { key: "general",   nome: "General dos Exércitos", tipo: "Guerreiro", custo: 5, poder: 9,  arch: "base" },
  { key: "colosso",   nome: "Colosso de Mênfis",     tipo: "Guerreiro", custo: 6, poder: 12, arch: "base" },
  // Efeito
  { key: "hathor", nome: "Hathor", tipo: "Deusa", custo: 2, poder: 2, arch: "buff",
    trigger: "entrar", needs: "ally", texto: "Ao Entrar: +2 de Poder a um aliado nesta via." },
  { key: "amon", nome: "Amon", tipo: "Deus", custo: 5, poder: 5, arch: "buff",
    trigger: "continuo", arte: "amon",
    lore: "Rei dos deuses e senhor dos ventos, Amon ergue os exércitos do Egito sob a luz eterna do Sol.",
    texto: "Contínuo: +1 a todas as suas outras cartas em jogo (todas as vias)." },
  { key: "set", nome: "Set", tipo: "Deus", custo: 5, poder: 6, arch: "debuff",
    trigger: "entrar", needs: "enemy", texto: "Ao Entrar: −4 de Poder a uma carta inimiga nesta via." },
  { key: "maat", nome: "Maat", tipo: "Deusa", custo: 4, poder: 3, arch: "reset",
    trigger: "continuo", texto: "Contínuo: nesta via, toda carta (dos dois lados) volta ao Poder impresso." },
  { key: "sobek", nome: "Sobek", tipo: "Fera", custo: 2, poder: 2, arch: "sacrificio",
    trigger: "entrar", texto: "Ao Entrar: destrua suas outras cartas nesta via; +1 por carta destruída." },
  { key: "anubis", nome: "Anúbis", tipo: "Deus", custo: 4, poder: 4, arch: "sacrificio",
    trigger: "continuo", texto: "Contínuo: +2 para cada carta sua já destruída na partida." },
  { key: "mumia", nome: "Múmia", tipo: "Criatura", custo: 1, poder: 2, arch: "sacrificio",
    trigger: "morrer", arte: "mumia",
    lore: "Os egípcios não mumificavam seus mortos para lembrar o passado, mas para prepará-los para o futuro. Se o corpo permanecesse intacto, a alma poderia retornar e erguer-se novamente. O corpo era preservado para que o Ka e o Ba pudessem reconhecê-lo após a morte.",
    texto: "Ao Morrer: volta à mão com o dobro do Poder atual (Faixa)." },
  { key: "enxame", nome: "Enxame de Gafanhotos", tipo: "Guerreiro", custo: 3, poder: 2, arch: "crescimento",
    trigger: "entrar", absorb: "swarm", arte: "enxame",
    texto: "Ao Entrar: crie 2 cópias desta carta no seu lado. As cópias são Guerreiros base sem efeito e copiam o Poder atual." },
  { key: "selo", nome: "Selo do Silêncio", tipo: "Magia", custo: 3, poder: 3, arch: "silencio",
    trigger: "continuo", block: true, texto: "Contínuo: cartas inimigas que revelarem nesta via não disparam Ao Entrar." },
  { key: "montu", nome: "Montu", tipo: "Deus", custo: 3, poder: 1, arch: "buff",
    trigger: "continuo", anthemType: "Guerreiro", anthemVal: 2,
    texto: "Contínuo: seus Guerreiros ganham +2 de Poder." },
  { key: "armadura", nome: "Armadura de Ptah", tipo: "Relíquia", custo: 2, poder: 3, arch: "fusao",
    trigger: "entrar", fuse: true,
    texto: "Ao Entrar: funde-se com um aliado aleatório nesta via, conferindo seu Poder a ele." },
  { key: "escaravelho", nome: "Escaravelho Alado", tipo: "Criatura", custo: 1, poder: 3, arch: "movimento",
    move: true, texto: "Pode mover-se para outra via uma vez, a partir da rodada seguinte à sua entrada." },
  { key: "ammit", nome: "Ammit, a Devoradora", tipo: "Fera", custo: 3, poder: 1, arch: "crescimento",
    trigger: "continuo", growPerPlay: true,
    texto: "Contínuo: +1 de Poder para cada carta que você colocar em jogo depois dela." },
  { key: "sekhmet", nome: "Sekhmet", tipo: "Deusa", custo: 3, poder: 4, arch: "debuff",
    trigger: "entrar", wipeCost: 1,
    texto: "Ao Entrar: destrói todas as cartas de custo 1 em jogo (dos dois lados)." },
  { key: "apofis", nome: "Apófis", tipo: "Serpente", custo: 4, poder: 3, arch: "sacrificio",
    trigger: "entrar", absorb: true,
    texto: "Ao Entrar: destrói suas outras cartas nesta via e ganha o Poder total delas." },
  { key: "diluvio", nome: "Dilúvio de Hápi", tipo: "Fenômeno", custo: 5, poder: 7, arch: "sacrificio",
    trigger: "entrar", sacrificeAll: true,
    texto: "Ao Entrar: destrói todas as suas outras cartas nesta via." },
  { key: "bennu", nome: "Bennu", tipo: "Ave", custo: 1, poder: 0, arch: "renascimento",
    trigger: "morrer",
    texto: "Ao Morrer: +1 de energia no próximo turno e renasce no tabuleiro com +1 de Poder." },
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
  target.mods.push({ src: "Armadura", val });
  arm.dying = s.effectSeq;
  pushLog(s, `Armadura de Ptah fundiu-se com ${byKey[target.key].nome} (+${val}).`);
  return { uid: target.uid, text: `⛨ +${val}`, kind: "fuse", seq: s.effectSeq };
}

export function resolveSekhmet(s, card, cost) {
  const victims = s.board.filter((c) => byKey[c.key].custo === cost && c.uid !== card.uid);
  if (victims.length === 0) { pushLog(s, `Sekhmet: nenhuma carta de custo ${cost} em jogo.`); return { uid: card.uid, text: "sem alvo", kind: "block", seq: s.effectSeq }; }
  const returns = destroyList(s, victims);
  pushLog(s, `Sekhmet destruiu ${victims.length} carta(s) de custo ${cost}.` + (returns.length ? ` Múmia(s): ${returns.map((r) => r.val).join(", ")}.` : ""));
  return { uid: card.uid, text: `☾ ${victims.length}✕`, kind: "debuff", seq: s.effectSeq };
}
