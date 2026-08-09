import {
  aplicarBencao, byKey, cartaTemEfeito, destroyList, emJogo, efeitoDe, pushLog,
} from "./engine.js";
import { defaultRng } from "./rng.js";

/* Efeitos que precisam acontecer DEPOIS que a carta recém-revelada terminou o
   próprio Ao Entrar. A Lâmina de Oferenda é o primeiro: a vítima entra, resolve
   o que tiver para resolver e só então é sacrificada pelo caminho normal de
   destruição, preservando Múmia, Bennu, Hiena, Osíris e demais reações de morte. */
export function resolvePostRevealEffects({ state, card, rng = defaultRng }) {
  if (!card?.revealed) return null;

  const candidatas = state.board.filter((fonte) => {
    if (fonte.owner !== card.owner || fonte.uid === card.uid || !emJogo(fonte)) return false;
    if (!fonte.aguardaSacrificio || !cartaTemEfeito(fonte, "armNextOwnSacrifice")) return false;
    const armadoEm = fonte.sacrificioArmadoEmPlays ?? fonte.entryPlays ?? -1;
    return (card.entryPlays ?? 0) > armadoEm;
  });
  if (candidatas.length === 0) return null;

  // A fonte armada há mais tempo tem precedência. Na prática uma segunda Lâmina
  // jogada depois da primeira vira a vítima da primeira; se morrer, sua própria
  // reserva desaparece junto com ela.
  candidatas.sort((a, b) =>
    (a.sacrificioArmadoEmPlays ?? a.entryPlays ?? 0) - (b.sacrificioArmadoEmPlays ?? b.entryPlays ?? 0)
    || a.uid - b.uid
  );
  const fonte = candidatas[0];
  const def = byKey[fonte.key];
  const effect = efeitoDe(def, "armNextOwnSacrifice") || {};
  fonte.aguardaSacrificio = false;
  fonte.sacrificioArmadoEmPlays = null;

  /* A próxima carta realmente consome a reserva. Se ela já saiu do campo como
     efêmera/Praga, não há corpo para destruir nem energia de sacrifício para
     distribuir. Isso evita transformar uma saída que NÃO é morte em morte. */
  if (!emJogo(card)) {
    pushLog(state, `${def.nome}: a próxima carta já deixou o campo — a oferenda foi consumida sem sacrifício.`);
    return { uid: fonte.uid, text: "☥ —", kind: "block", seq: state.effectSeq };
  }

  destroyList(state, [card]);

  const pool = state.board.filter((alvo) =>
    alvo.owner === fonte.owner && alvo.uid !== fonte.uid && emJogo(alvo)
  );
  const quantity = effect.quantity ?? 1;
  const value = effect.value ?? 1;
  const alvos = [];
  while (alvos.length < quantity && pool.length > 0) {
    alvos.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  for (const alvo of alvos) aplicarBencao(state, alvo, value, def.nome, { rng });

  const nomeVitima = byKey[card.key]?.nome || card.key;
  if (alvos.length === 0) {
    pushLog(state, `☥ ${def.nome} sacrificou ${nomeVitima}; não havia outras cartas válidas para receber Poder.`);
  } else {
    pushLog(state, `☥ ${def.nome} sacrificou ${nomeVitima} e concedeu +${value} para ${alvos[0] && byKey[alvos[0].key]?.nome || alvos[0]?.key}.`);
  }
  return {
    uid: fonte.uid,
    text: alvos.length ? `☥ +${value}` : "☥",
    kind: "sac",
    seq: state.effectSeq,
    destroyedUid: card.uid,
    buffedUids: alvos.map((a) => a.uid),
  };
}
