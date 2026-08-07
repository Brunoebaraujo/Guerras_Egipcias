export const PIPELINE_STOP = Symbol("pipeline-stop");

/** Executa etapas nomeadas em ordem. Cada etapa pode encerrar o passo retornando PIPELINE_STOP. */
export function runRevealPipeline(context, stages) {
  const executed = [];
  for (const stage of stages) {
    if (!stage?.name || typeof stage.run !== "function") throw new Error("etapa de revelação inválida");
    executed.push(stage.name);
    if (stage.run(context) === PIPELINE_STOP) return { context, executed, stopped: true };
  }
  return { context, executed, stopped: false };
}
