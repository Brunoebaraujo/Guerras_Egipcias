import { resolvePostRevealEffects } from "../domain/postRevealEffects.js";

export const PIPELINE_STOP = Symbol("pipeline-stop");

/** Executa etapas nomeadas em ordem. Cada etapa pode encerrar o passo retornando PIPELINE_STOP. */
export function runRevealPipeline(context, stages) {
  const executed = [];
  for (const stage of stages) {
    if (!stage?.name || typeof stage.run !== "function") throw new Error("etapa de revelação inválida");
    executed.push(stage.name);
    if (stage.run(context) === PIPELINE_STOP) return { context, executed, stopped: true };

    /* A resolução da própria carta vem antes dos efeitos que reagem à carta já
       revelada. A Lâmina de Oferenda usa exatamente esta janela: deixa o Ao
       Entrar terminar e só então sacrifica a carta. Centralizar a chamada aqui
       evita duplicar a regra nos vários ramos (Praga, efêmera, sem gatilho...). */
    if (stage.name === "resolver-efeito-da-carta" && context.card) {
      const post = resolvePostRevealEffects(context);
      if (post) context.state.effect = post;
    }
  }
  return { context, executed, stopped: false };
}
