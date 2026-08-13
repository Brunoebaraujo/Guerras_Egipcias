/* Ovo de Ammit + Ammit, a Devoradora — dupla de sacrifício/consumo. Módulo
   próprio (padrão de lamina-oferenda.js / sekhem.js / ladrao-de-ka.js) para
   não inchar ainda mais o catálogo monolítico de engine.js.

   FLUXO DO COMBO:
   1. Ovo de Ammit (1/1, custo 1) é jogado como fodder barato comum — igual a
      qualquer outra carta de sacrifício do arquétipo.
   2. Quando o Ovo morre — por sacrifício, combate de via, o que for — em vez
      de ir para a pilha de destruídas, ele volta para a MÃO do dono já como
      Ammit, a Devoradora. Isso usa o efeito `transformToHandOnDeath`,
      resolvido no mesmo canal `beforeDeath` que já atende Múmia/Bennu (ver
      handler "ovo-ammit-transform" e o loop generalizado em `destroyList()`,
      ambos em engine.js).
   3. Ammit, a Devoradora (4/0, custo 4) é uma FICHA — nunca aparece em deck
      nem na Galeria, só nasce do Ovo. Ao entrar, destrói todos os OUTROS
      aliados na via (`consumeOwnLane`, que reaproveita `resolveDestroyOwnLane`
      sem absorção de Poder — o Poder da Ammit fica fixo em 0, ela não escala
      com o que devora). Cada aliado destruído dispara seu próprio efeito de
      morte, o que faz da Ammit o gatilho que ativa vários sacrifícios
      pendentes de uma vez — o "botão de detonar" do arquétipo.

   Por que NÃO reusar o efeito "sacrificeLane" (Sobek/Apófis) para a Ammit:
   sem `absorb`, esse efeito despacha para `resolveSobek()`, que empilha
   +1 de Poder por vítima rotulado "Sobek" — nem o rótulo nem o ganho de
   Poder fazem sentido aqui. `consumeOwnLane` chama `resolveDestroyOwnLane()`
   direto, com `absorb: false`, que só destrói e não toca em Poder nenhum.

   CONVENÇÕES QUEBRADAS DE PROPÓSITO, E POR QUÊ:
   - `key: "ammit"` não tem o prefixo `token-` usado pelas demais fichas: ela
     REAPROVEITA a chave, a arte (`ammit.webp`) e a lore da carta antiga
     "Ammit, a Devoradora" (hoje renomeada para Heh, o Infinito — ver
     engine.js). Trocar a chave quebraria essa herança sem ganho nenhum.
   - Custo 4, não 1: assim como o token-gafanhoto (custo 3), fichas com efeito
     forte na entrada não seguem a convenção de custo 1 (alcance de Sekhmet /
     bênção de Nut) — aqui o design é deliberadamente caro e definitivo.

   PENDÊNCIA: Ovo de Ammit ainda não tem arte própria — o campo `arte` fica
   omitido de propósito até a arte ser gerada (evita referenciar um .webp que
   não existe). Adicionar `arte: "ovo-ammit"` quando o arquivo existir em
   public/cartas/. */

export const OVO_DE_AMMIT = {
  key: "ovo-ammit",
  nome: "Ovo de Ammit",
  nomeCurto: "Ovo",
  tipo: "Criatura",
  custo: 1,
  poder: 1,
  arch: "renascimento",
  trigger: "morrer",
  efeitos: [{ id: "transformToHandOnDeath", into: "ammit" }],
  texto: "Ao Morrer: volta para sua mão como Ammit, a Devoradora.",
  lore: "Antes da fome, o silêncio da casca. Tudo que Ammit viria a ser — crocodilo, leão, hipopótamo — já estava ali dentro, esperando a primeira morte para eclodir.",
};

export const AMMIT_DEVORADORA = {
  key: "ammit",
  nome: "Ammit, a Devoradora",
  nomeCurto: "Ammit",
  tipo: "Criatura",
  custo: 4,
  poder: 0,
  arch: "sacrificio",
  arte: "ammit",
  token: true,
  trigger: "entrar",
  efeitos: [{ id: "consumeOwnLane" }],
  texto: "Ao Entrar: destrói todos os outros aliados nesta via.",
  lore: "À sombra da balança, Ammit aguardava o veredito: todo coração mais pesado que a pena de Maat era seu. Crocodilo, leão e hipopótamo num só corpo, sua fome jamais se saciava — quanto mais devorava, mais faminta e vasta se tornava.",
};

export function registrarAmmitDevoradora(cards, tokens, byKey) {
  if (!byKey[OVO_DE_AMMIT.key]) {
    cards.push(OVO_DE_AMMIT);
    byKey[OVO_DE_AMMIT.key] = OVO_DE_AMMIT;
  }
  if (!byKey[AMMIT_DEVORADORA.key]) {
    tokens.push(AMMIT_DEVORADORA);
    byKey[AMMIT_DEVORADORA.key] = AMMIT_DEVORADORA;
  }
  return { ovo: OVO_DE_AMMIT, ammit: AMMIT_DEVORADORA };
}
